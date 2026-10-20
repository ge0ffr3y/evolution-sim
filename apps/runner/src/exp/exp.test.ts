import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Simulation } from "@evo/sim-core";
import { checkExperiment, jobsOf, type Experiment } from "./experiment";
import { runJob, statusOf } from "./job";
import { sampleWorld, MEASURES } from "./measures";
import { makespan, planMachines } from "./estimate";
import { buildLaunchRequest, buildUserData } from "./cloud";

const repoRoot = resolve(import.meta.dirname, "..", "..", "..", "..");
const folders: string[] = [];
afterEach(() => {
  for (const f of folders.splice(0)) rmSync(f, { recursive: true, force: true });
});

/** A small, quick experiment in a temporary folder. */
function tiny(extra: Record<string, unknown> = {}): Experiment {
  const folder = mkdtempSync(join(tmpdir(), "evo-exp-"));
  folders.push(folder);
  return checkExperiment(
    {
      name: "tiny-test",
      question: "Does the runner save, resume and extend exactly?",
      base: "default",
      ticks: 600,
      seeds: "1-2",
      sampleEvery: 50,
      checkpointEvery: 200,
      arms: { control: { worldWidth: 128, worldHeight: 128, initialOrganisms: 80 }, crowded: { worldWidth: 128, worldHeight: 128, initialOrganisms: 160 } },
      measures: ["population", "classes", "dietSpread", "kills", "traits"],
      ...extra,
    },
    folder,
    repoRoot,
  );
}

describe("experiment files", () => {
  it("a good file passes, and every arm runs on every seed", () => {
    const exp = tiny();
    expect(jobsOf(exp).map((j) => j.id)).toEqual(["control-s1", "control-s2", "crowded-s1", "crowded-s2"]);
    expect(exp.armConfigs.control!.initialOrganisms).toBe(80);
  });

  it("mistakes are caught before anything runs", () => {
    expect(() => tiny({ colour: "blue" })).toThrow(/Unknown experiment field "colour"/);
    expect(() => tiny({ measures: ["population", "happiness"] })).toThrow(/Unknown measure "happiness"/);
    expect(() => tiny({ arms: { control: { moveCostCoef: 1 } } })).toThrow(/arm "control".*moveCostCoef/);
    expect(() => tiny({ arms: { control: { terrainMode: 7 } } })).toThrow(/arm "control".*terrainMode/);
    expect(() => tiny({ base: "no-such-world" })).toThrow(/not a preset/);
    expect(() => tiny({ question: "?" })).toThrow(/question/);
    expect(() => tiny({ lane: "long", seeds: "1-5" })).toThrow(/at most 8 worlds/);
  });
});

describe("measures", () => {
  it("recording never changes what happens", () => {
    const plain = new Simulation(3, { worldWidth: 128, worldHeight: 128, initialOrganisms: 120 });
    const watched = new Simulation(3, { worldWidth: 128, worldHeight: 128, initialOrganisms: 120 });
    const all = Object.keys(MEASURES);
    for (let t = 0; t < 400; t++) {
      plain.step();
      watched.step();
      if (t % 25 === 0) sampleWorld(watched, all);
    }
    expect(watched.fingerprint()).toBe(plain.fingerprint());
  });
});

describe("jobs: saving, resuming and extending", () => {
  it("a job stopped part-way and started again gives exactly the same result as one that ran straight through", async () => {
    const straight = tiny();
    const job = jobsOf(straight)[0]!;
    const a = (await runJob(straight, job))!;

    const interrupted = tiny();
    let calls = 0;
    expect(await runJob(interrupted, job, { shouldStop: () => ++calls === 333 })).toBeNull();
    expect(statusOf(interrupted, [job])[0]!.state).toBe("saved");
    const b = (await runJob(interrupted, job))!;
    expect(b.fingerprint).toBe(a.fingerprint);
    expect(b.rows).toEqual(a.rows);
    expect(b.summary).toEqual(a.summary);
  });

  it("a saved checkpoint by wall time (not on a tick boundary) resumes exactly too", async () => {
    const straight = tiny();
    const job = jobsOf(straight)[1]!;
    const a = (await runJob(straight, job))!;
    const timed = tiny();
    let fakeMinutes = 0;
    let calls = 0;
    // Pretend 40 minutes pass every 100 steps, so it saves at odd ticks; then stop and resume.
    expect(await runJob(timed, job, { clock: () => (fakeMinutes += 0.4), shouldStop: () => ++calls === 457 })).toBeNull();
    const b = (await runJob(timed, job))!;
    expect(b.fingerprint).toBe(a.fingerprint);
    expect(b.rows).toEqual(a.rows);
  });

  it("a finished job is not run again, and can be extended to a longer run that matches a straight long run", async () => {
    const short = tiny({ ticks: 300 });
    const job = jobsOf(short)[2]!;
    const first = (await runJob(short, job))!;
    expect((await runJob(short, job))!.fingerprint).toBe(first.fingerprint); // already done: returned as is
    short.ticks = 600;
    const extended = (await runJob(short, job))!;
    const long = (await runJob(tiny(), job))!;
    expect(extended.fingerprint).toBe(long.fingerprint);
    expect(extended.rows).toEqual(long.rows);
  });

  it("refuses to extend results whose saved world is missing, rather than quietly starting over", async () => {
    const exp = tiny({ ticks: 300 });
    const job = jobsOf(exp)[0]!;
    await runJob(exp, job);
    // As after a cloud fetch without --with-checkpoints: the result is here, the saved world is not.
    rmSync(join(exp.folder, "results", `${job.id}.ckpt.evosnap`));
    rmSync(join(exp.folder, "results", `${job.id}.rows.json`));
    exp.ticks = 600;
    await expect(runJob(exp, job)).rejects.toThrow(/reach tick 300 but the saved world here is at tick 0/);
  });
});

describe("estimates", () => {
  it("longest-first scheduling: the time to finish on N cores", () => {
    expect(makespan([3, 3, 3, 3], 4)).toBe(3);
    expect(makespan([3, 3, 3, 3], 2)).toBe(6);
    expect(makespan([5, 1, 1, 1, 1, 1], 2)).toBe(5);
  });

  it("picks a small machine for a few long runs and a big one for many short ones", () => {
    const exp = tiny();
    const fewLong = planMachines({ ...exp, lane: "long" }, new Array(8).fill(10 * 3600));
    expect(fewLong.pick.vcpus).toBe(8);
    const manyShort = planMachines(exp, new Array(120).fill(1800));
    expect(manyShort.pick.vcpus).toBeGreaterThanOrEqual(32);
    for (const o of manyShort.options) expect(o.type).toMatch(/^c[78]g\./);
  });
});

describe("cloud requests (checked without touching AWS)", () => {
  const userData = buildUserData({ bucket: "evolution-sim-results-123", region: "us-west-2", name: "tiny-test", runId: "20261020T120000", workers: 7, ticks: null, hardStopMinutes: 120, nodeVersion: "v22.22.3", machine: "c7g.4xlarge" });

  it("the machine's start-up script has a hard stop, uploads results, and shuts down when done", () => {
    expect(userData).toContain("shutdown -h +130");
    expect(userData).toContain("export EVO_MACHINE=c7g.4xlarge");
    expect(userData).toContain("sleep 7200");
    expect(userData).toContain("s3://$BUCKET/$NAME/results");
    expect(userData).toContain("npm run exp -- run experiments/$NAME --jobs 7");
    expect(userData.trim().endsWith("shutdown -h now")).toBe(true);
  });

  it("the launch request is on demand, terminates on shutdown, is tagged, and uses the results-only role", () => {
    const req = buildLaunchRequest({ imageId: "ami-1", instanceType: "c7g.4xlarge", userData, name: "tiny-test", runId: "r1" });
    expect(req.InstanceInitiatedShutdownBehavior).toBe("terminate");
    expect(req).not.toHaveProperty("InstanceMarketOptions");
    expect(req.IamInstanceProfile).toEqual({ Name: "evolution-sim-instance" });
    const tags = (req.TagSpecifications as { Tags: { Key: string; Value: string }[] }[])[0]!.Tags;
    expect(tags).toContainEqual({ Key: "Project", Value: "evolution-sim" });
    expect(Buffer.from(req.UserData as string, "base64").toString()).toBe(userData);
  });
});
