import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { buildArms, jobsOf, loadExperiment, type Experiment, type Job } from "./experiment";
import { resultsDir, runJob, statusOf } from "./job";
import { estimate, measureSpeeds, type Estimate } from "./estimate";
import { MEASURES } from "./measures";
import { cloudCommand } from "./cloud";
import { draftSettings, dosesExperiment, type SettingsList } from "./audit";
import { collectResults, writeReport } from "./report";

const USAGE = `Evolution Sim experiments

  npm run exp -- check    <experiment folder>   check the experiment file and list its jobs (--build: also build every arm's world)
  npm run exp -- estimate <experiment folder>   how long it will take and what it would cost in the cloud
  npm run exp -- run      <experiment folder>   run it here, resuming anything unfinished [--jobs N] [--ticks N]
  npm run exp -- status   <experiment folder>   what is done, running and left
  npm run exp -- measures                       list the measures an experiment can record
  npm run exp -- report   <experiment folder>   compare every arm with the control (--control <arm>, default "control"): writes report.md

  npm run exp -- settings <preset> --out <file> [--changes name=value,name=value]
                                                draft the audit's list of settings (which are turned down and up, and how)
  npm run exp -- make-doses <list file> <folder> [--ticks 100000] [--seeds 1-4]
                                                write the down-and-up experiment from a reviewed list

  npm run exp -- cloud launch <folder> [--confirm] [--type c7g.4xlarge] [--ticks N]
  npm run exp -- cloud status
  npm run exp -- cloud fetch  <folder>
  npm run exp -- cloud stop   [<folder>]

--ticks N runs (or extends) the experiment to N ticks instead of the length in its file.
Nothing is ever launched in the cloud without --confirm.`;

const here = process.env["INIT_CWD"] ?? process.cwd();
const repoRoot = resolve(import.meta.dirname, "..", "..", "..", "..");

function fail(message: string): never {
  console.error(`Error: ${message}\n\n${USAGE}`);
  process.exit(1);
}

/** Read "--name value" options from the arguments (anything else is a positional argument). */
export function readOptions(args: string[]): { positional: string[]; options: Record<string, string | true> } {
  const positional: string[] = [];
  const options: Record<string, string | true> = {};
  for (let k = 0; k < args.length; k++) {
    const a = args[k]!;
    if (a.startsWith("--")) {
      const next = args[k + 1];
      if (next !== undefined && !next.startsWith("--")) {
        options[a.slice(2)] = next;
        k++;
      } else options[a.slice(2)] = true;
    } else positional.push(a);
  }
  return { positional, options };
}

function load(folder: string | undefined, ticks: string | true | undefined): Experiment {
  if (!folder) fail("which experiment? Give its folder, e.g. experiments/meat-eating-long");
  let exp: Experiment;
  try {
    exp = loadExperiment(resolve(here, folder), repoRoot);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  if (typeof ticks === "string") {
    const n = Number(ticks);
    if (!Number.isInteger(n) || n < 1) fail("--ticks must be a whole number of 1 or more");
    exp.ticks = n;
  }
  return exp;
}

const hours = (h: number): string => (h < 1 ? `${Math.round(h * 60)} min` : `${h.toFixed(1)} h`);

export function describeEstimate(est: Estimate): string {
  const lines = [
    `Work left: ${est.coreHours} core-hours; the longest single run needs ${hours(est.longestJobHours)} (it cannot be split across cores).`,
    `Cheapest machine that finishes about as fast as the fastest: ${est.pick.type} (${est.pick.vcpus} cores, ${est.pick.workers} worlds at once): about ${hours(est.pick.wallHours)}, about $${est.pick.cost.toFixed(2)} at $${est.pick.pricePerHour.toFixed(2)}/hour on demand.`,
    "Other options (cheapest first):",
    ...est.options.slice(0, 6).map((o) => `  ${o.type.padEnd(14)} ${String(o.workers).padStart(3)} at once  ${hours(o.wallHours).padStart(8)}  $${o.cost.toFixed(2)}`),
    "(Includes a 1.5x allowance for populations growing, and about 8 minutes of setup. Prices are a fallback table until the live price is read at launch.)",
  ];
  return lines.join("\n");
}

/** Run every unfinished job here, several at a time, each in its own process. */
async function runHere(exp: Experiment, jobs: Job[], workers: number, ticks: string | true | undefined): Promise<void> {
  const todo = statusOf(exp, jobs).filter((s) => s.state !== "done" && s.state !== "extinct").map((s) => s.job);
  console.log(`${exp.name}: ${jobs.length} jobs, ${jobs.length - todo.length} already finished, ${todo.length} to run (${Math.min(workers, todo.length)} at a time).`);
  const children = new Set<ReturnType<typeof spawn>>();
  let stopping = false;
  const stop = (): void => {
    stopping = true;
    console.log("Stopping: every running job saves its progress first...");
    for (const child of children) child.kill("SIGTERM");
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);

  // A status file for anyone watching (it is uploaded with the results on a cloud machine).
  const writeStatus = (): void => {
    const lines = statusOf(exp, jobs);
    // Written to a temporary file and renamed, so an upload never catches it half-written.
    const path = join(resultsDir(exp), "status.json");
    writeFileSync(`${path}.tmp`, JSON.stringify({ updatedAt: new Date().toISOString(), ticks: exp.ticks, jobs: lines.map((l) => ({ id: l.job.id, state: l.state, tick: l.tick, ticksPerSecond: l.ticksPerSecond })) }));
    renameSync(`${path}.tmp`, path);
  };
  mkdirSync(resultsDir(exp), { recursive: true });
  writeStatus();
  const timer = setInterval(writeStatus, 30000);
  const queue = [...todo];
  let finished = 0;
  const failures: string[] = [];
  const runOne = (job: Job): Promise<void> =>
    new Promise((done) => {
      const args = [...process.execArgv, process.argv[1]!, "job", exp.folder, job.arm, String(job.seed)];
      if (typeof ticks === "string") args.push("--ticks", ticks);
      const child = spawn(process.execPath, args, { stdio: ["ignore", "inherit", "pipe"] });
      children.add(child);
      let err = "";
      child.stderr!.on("data", (chunk: Buffer) => (err += chunk.toString()));
      child.on("close", (code) => {
        children.delete(child);
        finished++;
        if (code !== 0 && !stopping) failures.push(`${job.id}: ${err.trim().split("\n").at(-1) ?? `exit ${code}`}`);
        done();
      });
    });
  const pool = Array.from({ length: Math.max(1, Math.min(workers, todo.length)) }, async () => {
    for (let job = queue.shift(); job !== undefined && !stopping; job = queue.shift()) await runOne(job);
  });
  await Promise.all(pool);
  clearInterval(timer);
  writeStatus();
  if (failures.length) {
    console.error(`${failures.length} job(s) failed:\n  ${failures.join("\n  ")}`);
    process.exit(1);
  }
  console.log(stopping ? "Stopped; progress saved. Run the same command again to carry on." : `All done (${finished} jobs this time).`);
}

function printStatus(exp: Experiment, jobs: Job[]): void {
  const lines = statusOf(exp, jobs);
  const count = (state: string): number => lines.filter((l) => l.state === state).length;
  console.log(`${exp.name} (${exp.ticks.toLocaleString("en-US")} ticks per job): ${count("done")} done, ${count("extinct")} died out, ${count("saved")} part-way (running now, or paused at their last save), ${count("waiting")} not started.`);
  for (const l of lines) {
    const pct = Math.round((100 * l.tick) / exp.ticks);
    const speed = l.ticksPerSecond ? `, ${l.ticksPerSecond} ticks/s` : "";
    const when = l.updatedAt ? `, last saved ${l.updatedAt.replace("T", " ").slice(0, 16)} UTC` : "";
    console.log(`  ${l.job.id.padEnd(24)} ${l.state.padEnd(8)} tick ${l.tick.toLocaleString("en-US")} (${pct}%)${speed}${l.state === "saved" ? when : ""}`);
  }
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  const { positional, options } = readOptions(rest);
  switch (command) {
    case "check": {
      const exp = load(positional[0], options.ticks);
      const jobs = jobsOf(exp);
      console.log(`${exp.name}: OK. "${exp.question}"`);
      console.log(`  base world ${exp.base}, ${exp.ticks.toLocaleString("en-US")} ticks, ${Object.keys(exp.arms).length} arms x ${exp.seedList.length} seeds = ${jobs.length} jobs (${exp.lane} lane)`);
      console.log(`  sample every ${exp.sampleEvery} ticks; save every ${exp.checkpointEvery} ticks or ${exp.checkpointMinutes} minutes`);
      console.log(`  measures: ${exp.measures.join(", ")}`);
      if (options.build === true) {
        const failures = buildArms(exp);
        console.log(failures.length ? `  ${failures.length} arm(s) cannot start:\n    ${failures.join("\n    ")}` : `  every arm's world builds and runs`);
        if (failures.length) process.exit(1);
      }
      return;
    }
    case "estimate": {
      const exp = load(positional[0], options.ticks);
      const jobs = jobsOf(exp);
      console.log("Measuring how fast each arm runs (a short trial on this machine)...");
      console.log(describeEstimate(estimate(exp, jobs, measureSpeeds(exp, jobs))));
      return;
    }
    case "run": {
      const exp = load(positional[0], options.ticks);
      const workers = typeof options.jobs === "string" ? Number(options.jobs) : Math.max(1, availableParallelism() - 1);
      if (!Number.isInteger(workers) || workers < 1) fail("--jobs must be a whole number of 1 or more");
      await runHere(exp, jobsOf(exp), workers, options.ticks);
      return;
    }
    case "status": {
      const exp = load(positional[0], options.ticks);
      printStatus(exp, jobsOf(exp));
      return;
    }
    case "measures": {
      for (const [name, m] of Object.entries(MEASURES)) console.log(`  ${name.padEnd(20)} ${m.describe}`);
      return;
    }
    case "report": {
      const exp = load(positional[0], options.ticks);
      const control = typeof options.control === "string" ? options.control : "control";
      if (!(control in exp.arms)) fail(`there is no arm called "${control}" (arms: ${Object.keys(exp.arms).join(", ")}); choose one with --control`);
      const { flags } = writeReport({ exp, control, results: collectResults(exp) });
      console.log(`Wrote ${relative(here, join(exp.folder, "report.md"))} (${flags} red flags) and results/comparisons.csv.`);
      return;
    }
    case "settings": {
      const base = positional[0];
      if (!base || typeof options.out !== "string") fail("settings needs a preset name and --out <file>");
      const changes: Record<string, number> = {};
      if (typeof options.changes === "string") {
        for (const pair of options.changes.split(",")) {
          const [name, value] = pair.split("=");
          if (!name || value === undefined || Number.isNaN(Number(value))) fail(`--changes: "${pair}" is not name=value`);
          changes[name] = Number(value);
        }
      }
      const list = draftSettings(repoRoot, base, changes);
      const out = resolve(here, options.out);
      writeFileSync(out, `${JSON.stringify(list, null, 2)}\n`);
      const tested = list.settings.filter((x) => x.test);
      const arms = tested.reduce((n, x) => n + (x.down ? 1 : 0) + (x.up ? 1 : 0), 0);
      console.log(`${list.settings.length} settings: ${tested.length} turned down and up (${arms} arms), ${list.settings.length - tested.length} not. Written to ${options.out}.`);
      const reasons = new Map<string, number>();
      for (const x of list.settings) if (!x.test) reasons.set(x.reason, (reasons.get(x.reason) ?? 0) + 1);
      for (const [reason, n] of [...reasons].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)}  ${reason}`);
      return;
    }
    case "make-doses": {
      const [listFile, folder] = positional;
      if (!listFile || !folder) fail("make-doses needs the settings list file and the experiment folder to write");
      const list = JSON.parse(readFileSync(resolve(here, listFile), "utf8")) as SettingsList;
      const dir = resolve(here, folder);
      const file = join(dir, "experiment.json");
      if (existsSync(file) && options.force !== true) fail(`${folder}/experiment.json already exists (add --force to replace it)`);
      const ticks = typeof options.ticks === "string" ? Number(options.ticks) : 100000;
      const seeds = typeof options.seeds === "string" ? options.seeds : "1-4";
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, `${JSON.stringify(dosesExperiment(list, { name: basename(dir), ticks, seeds }), null, 2)}\n`);
      const exp = load(folder, undefined); // check it like any other experiment
      console.log(`Wrote ${folder}/experiment.json: ${Object.keys(exp.arms).length} arms x ${exp.seedList.length} seeds = ${jobsOf(exp).length} jobs of ${ticks.toLocaleString("en-US")} ticks.`);
      return;
    }
    case "job": {
      // Internal: one job, started by "run" in its own process.
      const exp = loadExperiment(positional[0]!, repoRoot);
      if (typeof options.ticks === "string") exp.ticks = Number(options.ticks);
      const job = jobsOf(exp).find((j) => j.arm === positional[1] && j.seed === Number(positional[2]));
      if (!job) throw new Error(`No job ${positional[1]} seed ${positional[2]}`);
      let stop = false;
      process.on("SIGTERM", () => (stop = true));
      process.on("SIGINT", () => (stop = true));
      // If the process that started this job is gone (killed), save and stop rather than run on unwatched.
      const parent = process.ppid;
      let steps = 0;
      const orphaned = (): boolean => ++steps % 500 === 0 && process.ppid !== parent;
      const result = await runJob(exp, job, { shouldStop: () => stop || orphaned() });
      console.log(result ? `  ${job.id}: ${result.extinctAt !== null ? `died out at tick ${result.extinctAt}` : `finished tick ${result.tick}`}` : `  ${job.id}: paused at its last save`);
      return;
    }
    case "cloud": {
      await cloudCommand(positional, options, { here, repoRoot, load: (folder, ticks) => load(folder, ticks), describeEstimate });
      return;
    }
    default:
      console.log(USAGE);
  }
}

if (process.argv[1] && import.meta.filename === resolve(process.argv[1])) {
  try {
    await main();
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
