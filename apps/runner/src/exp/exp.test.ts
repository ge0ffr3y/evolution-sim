import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Simulation } from "@evo/sim-core";
import { checkExperiment, jobsOf, type Experiment } from "./experiment";
import { runJob, statusOf } from "./job";
import { sampleWorld, summarizeRun, MEASURES, lastQuarterTrend } from "./measures";
import { draftSettings, dosesExperiment, armName } from "./audit";
import { compare } from "./report";
import { exportExperiment, writeExport } from "./export";
import type { JobResult } from "./job";
import { makespan, planMachines } from "./estimate";
import { buildLaunchRequest, buildUserData, costCeilingProblem, hardStopFor, remainingWorst, vcpusOf } from "./cloud";

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

  it("recording never changes what happens in a busy world either (brains, disease, colonies, climate)", () => {
    const busy = { worldWidth: 128, worldHeight: 128, initialOrganisms: 150, terrainMode: 1, climateMode: 1, thermalCostCoeff: 1.5, brainMode: 2, diseaseTransmission: 0.5, diseaseIntroEvery: 100, multicellular: 1, cellTypes: 1, initialBond: 0.3, mutationLoadRate: 3, mutationLoadModel: 1, overgrazeDamage: 0.003, fouling: 0.01, erosionRate: 1e-5 };
    const plain = new Simulation(5, busy);
    const watched = new Simulation(5, busy);
    const all = Object.keys(MEASURES);
    for (let t = 0; t < 300; t++) {
      plain.step();
      watched.step();
      if (t % 25 === 0) sampleWorld(watched, all);
    }
    expect(watched.fingerprint()).toBe(plain.fingerprint());
  }, 60_000);

  it("dominance and land-mass difference stay in range, and the mixed-eater timing is summarized", () => {
    const sim = new Simulation(4, { worldWidth: 256, worldHeight: 256, initialOrganisms: 300, terrainMode: 1, terrainWaterFraction: 0.4, speciesEvery: 100 });
    sim.run(3000);
    const row = sampleWorld(sim, ["dominance", "landMasses", "classes"]);
    expect(row.dominance).toBeGreaterThan(0);
    expect(row.dominance).toBeLessThanOrEqual(1);
    expect(row.populatedLandMasses).toBeGreaterThanOrEqual(1);
    if (!Number.isNaN(row.landMassDifference)) {
      expect(row.landMassDifference).toBeGreaterThanOrEqual(0);
      expect(row.landMassDifference).toBeLessThanOrEqual(1);
    }
    const summary = summarizeRun([row, { ...row, tick: 3100, mixedEaters: 7 }], sim, ["classes"]);
    expect(summary.firstMixedEatersAt).toBe(row.mixedEaters! >= 5 ? row.tick : 3100);
  }, 60_000);

  it("the end-of-run trend is the change over the last quarter, relative to its level", () => {
    // Flat for three quarters, then rising from 100 to 130 over the last quarter: about +26% of its average there (115).
    const rows = Array.from({ length: 41 }, (_, k) => ({ tick: k * 100, population: k < 30 ? 100 : 100 + (k - 30) * 3 }));
    expect(lastQuarterTrend(rows, "population")).toBeCloseTo(0.26, 1);
    expect(lastQuarterTrend(rows.map((r) => ({ ...r, population: 50 })), "population")).toBe(0);
  });

  it('"all" records every measure that is not opt-in, and baseChanges reach every arm', () => {
    const exp = tiny({ measures: ["all"], baseChanges: { foodRegrowPerTick: 0.1 } });
    expect(exp.measures).toEqual(Object.keys(MEASURES).filter((name) => !MEASURES[name]!.optIn));
    expect(exp.armConfigs.control!.foodRegrowPerTick).toBe(0.1);
    expect(exp.armConfigs.crowded!.foodRegrowPerTick).toBe(0.1);
    expect(exp.armConfigs.crowded!.initialOrganisms).toBe(160);
  });
});

describe("the audit's settings list and its experiment", () => {
  const list = draftSettings(repoRoot, "grand-world", { mutationLoadMend: 0.15 });

  it("covers every setting, and gives a reason for each one it does not test", () => {
    expect(list.settings.length).toBeGreaterThan(400);
    for (const s of list.settings) {
      if (s.test) expect(s.down ?? s.up).not.toBeNull();
      else expect(s.reason.length).toBeGreaterThan(5);
    }
    const byKey = new Map(list.settings.map((s) => [s.key, s]));
    expect(byKey.get("brainMode")!.test).toBe(false); // a switch
    expect(byKey.get("speciesEvery")!.test).toBe(false); // only watches
    expect(byKey.get("biomeGrowthDesert")!.test).toBe(false); // climate biomes are off in this world
    const noDrift = draftSettings(repoRoot, "grand-world", { climateDriftPeriod: 0 });
    expect(noDrift.settings.find((x) => x.key === "climateDriftAmplitude")!.test).toBe(false); // drift needs a cycle length
    expect(byKey.get("basalCostCoeff")!.down).toEqual({ basalCostCoeff: 0.025 });
    expect(byKey.get("chemDecay")!.down).toEqual({ chemDecay: 0.9 }); // half as long, not half the share
    expect(byKey.get("worldSize")!.up).toEqual({ worldWidth: 1024, worldHeight: 1024, initialOrganisms: 2400 });
  });

  it("makes a valid experiment with a control and a down and an up arm per setting", () => {
    const folder = mkdtempSync(join(tmpdir(), "evo-doses-"));
    folders.push(folder);
    const raw = dosesExperiment(list, { name: "doses-test", ticks: 1000, seeds: "1-2" });
    const exp = checkExperiment(raw, folder, repoRoot);
    expect(exp.arms.control).toEqual({});
    expect(exp.arms[armName("basalCostCoeff", "up")]).toEqual({ basalCostCoeff: 0.1 });
    expect(exp.armConfigs.control!.mutationLoadMend).toBe(0.15);
    const tested = list.settings.filter((s) => s.test);
    expect(Object.keys(exp.arms).length).toBe(1 + tested.reduce((n, s) => n + (s.down ? 1 : 0) + (s.up ? 1 : 0), 0));
  });
});

describe("exporting for the analysis page", () => {
  it("writes each run's key results and each arm's average timeline, and indexes it", async () => {
    const exp = tiny({ ticks: 400, measures: ["all"] });
    for (const job of jobsOf(exp)) await runJob(exp, job);
    const data = exportExperiment(exp, "control");
    expect(data.runs.length).toBe(4);
    expect(Object.keys(data.series).sort()).toEqual(["control", "crowded"]);
    expect(data.series.control!.tick[0]).toBe(0);
    expect(data.series.control!.mean.population!.length).toBe(data.series.control!.tick.length);
    expect(typeof data.runs[0]!.summary.meanPopulationLate).toBe("number");
    const out = join(exp.folder, "public");
    writeExport(data, out);
    writeExport(data, out); // a second export of the same experiment replaces its entry
    const index = JSON.parse(readFileSync(join(out, "index.json"), "utf8")) as { name: string }[];
    expect(index.map((e) => e.name)).toEqual(["tiny-test"]);
  }, 60_000);
});

describe("the comparison report", () => {
  const run = (seed: number, value: number): JobResult => ({ arm: "a", seed, tick: 10, targetTicks: 10, extinctAt: null, wallSeconds: 1, ticksPerSecond: 1, fingerprint: 0, summary: { x: value }, rows: [] });

  it("compares seed by seed: the average change and its 95% range", () => {
    const arm = new Map([[1, run(1, 12)], [2, run(2, 14)], [3, run(3, 16)]]);
    const control = new Map([[1, run(1, 10)], [2, run(2, 11)], [3, run(3, 12)]]);
    const c = compare("a", "x", arm, control)!;
    expect(c.change).toBeCloseTo(3, 10); // changes 2, 3, 4
    expect(c.high - c.change).toBeCloseTo((4.303 * 1) / Math.sqrt(3), 3); // t(2) x sd 1 / sqrt(3)
    expect(c.noiseUnits).toBeCloseTo(3, 10); // control spread is 1
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
    const tagged = buildLaunchRequest({ imageId: "ami-1", instanceType: "c8g.8xlarge", userData, name: "tiny-test", runId: "r1", hardStopMinutes: 90 });
    expect((tagged.TagSpecifications as { Tags: { Key: string; Value: string }[] }[])[0]!.Tags).toContainEqual({ Key: "HardStopMinutes", Value: "90" });
  });

  it("a running machine's remaining worst cost runs to its backstop (hard stop plus 10 minutes), then nothing", () => {
    const launched = "2026-10-21T00:00:00.000Z";
    const t0 = Date.parse(launched);
    expect(remainingWorst({ launched, hardStopMinutes: 50 }, 1.2, t0)).toBeCloseTo(1.2, 9); // 60 minutes left at $1.20/hour
    expect(remainingWorst({ launched, hardStopMinutes: 50 }, 1.2, t0 + 30 * 60000)).toBeCloseTo(0.6, 9);
    expect(remainingWorst({ launched, hardStopMinutes: 50 }, 1.2, t0 + 90 * 60000)).toBe(0);
    expect(vcpusOf("c8g.8xlarge")).toBe(32);
  });

  it("plans only machines that fit in the cores left free by running experiments", () => {
    const exp = tiny();
    const plan = planMachines(exp, new Array(120).fill(1800), undefined, 16);
    for (const o of plan.options) expect(o.vcpus).toBeLessThanOrEqual(16);
    expect(() => planMachines(exp, [100], undefined, 1)).toThrow(/No machine fits/);
  });
});

describe("invasions (a ready-made group arrives part-way)", () => {
  const meatEaters = { atTick: 400, every: 10, genes: { diet: 0.95, attack: 0.6 } };

  it("mistakes in the invasion are caught before anything runs", () => {
    expect(() => tiny({ invasion: { ...meatEaters, atTick: 600 } })).toThrow(/atTick/);
    expect(() => tiny({ invasion: { ...meatEaters, every: 0 } })).toThrow(/every/);
    expect(() => tiny({ invasion: { ...meatEaters, genes: { size: 0.5 } } })).toThrow(/size/);
    expect(() => tiny({ invasion: { ...meatEaters, genes: { claws: 0.5 } } })).toThrow(/unknown gene/);
    expect(() => tiny({ invasion: { ...meatEaters, genes: { diet: 1.5 } } })).toThrow(/between 0 and 1/);
    expect(tiny().invasion).toBeNull();
  });

  it("changes only the chosen animals' genes, and makes or destroys no energy or matter", async () => {
    const { invade } = await import("./invasion");
    const sim = new Simulation(2, { worldWidth: 128, worldHeight: 128, initialOrganisms: 200 });
    sim.run(50);
    const e0 = sim.energyAudit().total;
    const m0 = sim.matterAudit().total;
    const { changed } = invade(sim, meatEaters);
    expect(changed).toBeGreaterThan(5);
    expect(sim.energyAudit().total).toBe(e0);
    expect(sim.matterAudit().total).toBe(m0);
    let matching = 0;
    for (let i = 0; i < sim.count; i++) if (sim.id[i]! % 10 === 0) matching += sim.diet[i] === Math.fround(0.95) ? 1 : 0;
    expect(matching).toBe(changed);
  });

  it("bigger invaders pay for their bigger bodies from their own energy and nutrient store, so the books balance", async () => {
    const { invade } = await import("./invasion");
    const world = { worldWidth: 128, worldHeight: 128, initialOrganisms: 300, nutrientMode: 2 } as const;
    const sim = new Simulation(2, world);
    sim.run(300);
    const sizes = new Map<number, number>();
    for (let i = 0; i < sim.count; i++) sizes.set(sim.id[i]!, sim.size[i]!);
    const e0 = sim.energyAudit().total;
    const m0 = sim.matterAudit().total;
    const { changed, enlarged } = invade(sim, { ...meatEaters, sizeFactor: 2 });
    expect(enlarged).toBeGreaterThan(0);
    expect(enlarged).toBeLessThanOrEqual(changed);
    expect(Math.abs(sim.energyAudit().total - e0) / e0).toBeLessThan(1e-12);
    expect(Math.abs(sim.matterAudit().total - m0) / m0).toBeLessThan(1e-12);
    let bigger = 0;
    for (let i = 0; i < sim.count; i++) {
      const before = sizes.get(sim.id[i]!)!;
      if (sim.id[i]! % 10 !== 0) expect(sim.size[i]).toBe(before); // only the chosen ones change
      else if (sim.size[i]! > before) {
        bigger++;
        expect(sim.size[i]! / before).toBeCloseTo(2, 4);
      }
    }
    expect(bigger).toBe(enlarged);
    // Without nutrient stores there is nothing to build the bigger body from.
    expect(() => invade(new Simulation(2, { worldWidth: 64, worldHeight: 64, initialOrganisms: 20 }), { ...meatEaters, sizeFactor: 2 })).toThrow(/nutrientMode/);
    expect(() => tiny({ invasion: { ...meatEaters, sizeFactor: 5 } })).toThrow(/sizeFactor/);
  });

  it("a job stopped before the invasion and resumed matches one that ran straight through, and the invasion shows", async () => {
    const straight = tiny({ invasion: meatEaters });
    const job = jobsOf(straight)[0]!;
    const a = (await runJob(straight, job))!;
    const plain = (await runJob(tiny(), job))!;
    expect(a.fingerprint).not.toBe(plain.fingerprint);
    expect(a.rows.find((r) => r.tick === 450)!.dietOver75).toBeGreaterThan(0.05);

    const interrupted = tiny({ invasion: meatEaters });
    let calls = 0;
    expect(await runJob(interrupted, job, { shouldStop: () => ++calls === 250 })).toBeNull();
    const b = (await runJob(interrupted, job))!;
    expect(b.fingerprint).toBe(a.fingerprint);
    expect(b.rows).toEqual(a.rows);
  });
});

describe("the approved cost ceiling", () => {
  it("a launch needs the approved figure, and is refused when the launch-time worst case is above it", () => {
    expect(costCeilingProblem(1.2, undefined)).toMatch(/--max-cost/);
    expect(costCeilingProblem(1.2, true)).toMatch(/--max-cost/);
    expect(costCeilingProblem(1.2, "cheap")).toMatch(/number of dollars/);
    expect(costCeilingProblem(2.02, "1.25")).toMatch(/Refusing.*2\.02.*1\.25/);
    expect(costCeilingProblem(1.2, "1.25")).toBeNull();
  });
});

describe("the hard stop", () => {
  it("is the planned time with room to spare, or exactly --hours", () => {
    expect(hardStopFor(1, undefined)).toBe(78);
    expect(hardStopFor(2.6, "1.5")).toBe(90);
    expect(() => hardStopFor(1, "0")).toThrow(/--hours/);
    expect(() => hardStopFor(1, true)).toThrow(/--hours/);
    expect(() => hardStopFor(1, "20")).toThrow(/--hours/);
  });
});

describe("the diet ledger (opt-in, watches every tick)", () => {
  const hunting = { worldWidth: 128, worldHeight: 128, initialOrganisms: 200, initialAttack: 0.5, initialDiet: 0.3 };

  it("is left out of 'all', and recording it never changes what happens", async () => {
    expect(tiny({ measures: ["all"] }).measures).not.toContain("dietLedger");
    expect(tiny({ measures: ["all", "dietLedger"] }).measures).toContain("dietLedger");
    const plain = tiny({ arms: { control: hunting }, measures: ["population"] });
    const watched = tiny({ arms: { control: hunting }, measures: ["population", "dietLedger"] });
    const job = jobsOf(plain)[0]!;
    expect((await runJob(watched, job))!.fingerprint).toBe((await runJob(plain, job))!.fingerprint);
  });

  it("covers every animal (band shares add to 1), and records births, deaths and costs", async () => {
    const exp = tiny({ arms: { control: hunting }, measures: ["population", "dietLedger"], sampleEvery: 100 });
    const r = (await runJob(exp, jobsOf(exp)[0]!))!;
    let births = 0;
    let deaths = 0;
    for (const row of r.rows.slice(1)) {
      let share = 0;
      for (let b = 0; b < 4; b++) {
        const t = row[`ld${b}_share`]!;
        share += Number.isNaN(t) ? 0 : t;
      }
      expect(share).toBeCloseTo(1, 4);
    }
    // Rates are per animal per 1,000 ticks; turn them back into counts with each window's animal-ticks.
    const rows = r.rows;
    for (let k = 1; k < rows.length; k++) {
      const ticks = rows[k]!.tick! - rows[k - 1]!.tick!;
      const animalTicks = ((rows[k - 1]!.population! + rows[k]!.population!) / 2) * ticks;
      for (let b = 0; b < 4; b++) {
        const share = rows[k]![`ld${b}_share`]!;
        if (Number.isNaN(share) || share === 0) continue;
        births += (rows[k]![`ld${b}_births`]! / 1000) * share * animalTicks;
        deaths += (rows[k]![`ld${b}_deaths`]! / 1000) * share * animalTicks;
      }
    }
    expect(births).toBeGreaterThan(0);
    expect(deaths).toBeGreaterThan(0);
    expect(r.summary.ld0_costLate).toBeGreaterThan(0);
  });
});

describe("repeating invasions", () => {
  it("arrive at atTick and every repeatEvery ticks after, until `until`, and resume exactly", async () => {
    const { invasionDue } = await import("./invasion");
    const inv = { atTick: 100, every: 10, genes: { diet: 0.95 }, repeatEvery: 50, until: 220 };
    const due = [];
    for (let t = 0; t <= 400; t++) if (invasionDue(inv, t)) due.push(t);
    expect(due).toEqual([100, 150, 200]);
    expect(() => tiny({ invasion: { ...inv, repeatEvery: 0 } })).toThrow(/repeatEvery/);
    expect(() => tiny({ invasion: { ...inv, until: 50 } })).toThrow(/until/);
    const straight = tiny({ invasion: { atTick: 150, every: 10, genes: { diet: 0.95 }, repeatEvery: 100 } });
    const job = jobsOf(straight)[0]!;
    const a = (await runJob(straight, job))!;
    const interrupted = tiny({ invasion: { atTick: 150, every: 10, genes: { diet: 0.95 }, repeatEvery: 100 } });
    let calls = 0;
    expect(await runJob(interrupted, job, { shouldStop: () => ++calls === 300 })).toBeNull();
    expect((await runJob(interrupted, job))!.fingerprint).toBe(a.fingerprint);
  });
});
