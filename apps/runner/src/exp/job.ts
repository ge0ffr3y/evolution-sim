import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Simulation, snapshotFromBytes, snapshotToBytes } from "@evo/sim-core";
import { sampleWorld, summarizeRun, type Row } from "./measures";
import type { Experiment, Job } from "./experiment";
import { invade } from "./invasion";

/**
 * One job = one arm on one seed. It records the measures every `sampleEvery` ticks and saves the
 * world (a checkpoint, with the rows so far) every `checkpointEvery` ticks and every
 * `checkpointMinutes` of wall time. A job that is started again carries on from its checkpoint;
 * because saving and loading are exact, that gives the same answer as a run that never stopped.
 * When it finishes it keeps its last checkpoint, so the run can later be extended.
 */
export interface JobResult {
  arm: string;
  seed: number;
  /** The tick the run reached (the experiment's length, or earlier if everything died). */
  tick: number;
  targetTicks: number;
  extinctAt: number | null;
  /** Wall time of the last stretch of running, and its speed (only for estimates; never affects results). */
  wallSeconds: number;
  ticksPerSecond: number;
  /** Where it ran: a cloud machine type such as "c7g.xlarge", or "local". */
  machine?: string;
  fingerprint: number;
  summary: Record<string, number | null>;
  rows: Row[];
}

export interface JobProgress {
  tick: number;
  targetTicks: number;
  ticksPerSecond: number;
  updatedAt: string;
  state: "running" | "done" | "stopped" | "extinct";
  machine?: string;
}

/** The machine this process runs on (a cloud machine's start-up script sets EVO_MACHINE). */
export const thisMachine = (): string => process.env["EVO_MACHINE"] ?? "local";

export const resultsDir = (exp: Experiment): string => join(exp.folder, "results");
/** How many ticks a job runs between instants in which it can notice a stop signal. */
const YIELD_EVERY = 200;
const file = (exp: Experiment, job: Job, ending: string): string => join(resultsDir(exp), `${job.id}.${ending}`);

/** Write a file so that a crash mid-write never leaves half a file behind. */
function writeAtomic(path: string, data: string | Uint8Array): void {
  const temp = `${path}.tmp`;
  writeFileSync(temp, data);
  renameSync(temp, path);
}

export function readResult(exp: Experiment, job: Job): JobResult | null {
  const path = file(exp, job, "result.json");
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as JobResult) : null;
}

export function readProgress(exp: Experiment, job: Job): JobProgress | null {
  const path = file(exp, job, "progress.json");
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as JobProgress) : null;
}

/** Is this job finished for the experiment's current length? */
export function isDone(exp: Experiment, job: Job): boolean {
  const r = readResult(exp, job);
  return r !== null && (r.tick >= exp.ticks || r.extinctAt !== null);
}

export interface RunJobOptions {
  /** Stop early (after saving) when this returns true; used when the machine is told to shut down. */
  shouldStop?: () => boolean;
  /** For tests: pretend the wall clock says this many minutes have passed since the last checkpoint. */
  clock?: () => number;
  onProgress?: (p: JobProgress) => void;
}

/**
 * Run (or resume, or extend) one job. Returns its result, or null if it was told to stop first.
 * It pauses for an instant every few hundred ticks so that a stop signal (which Node only delivers
 * between pieces of work) is noticed quickly; that never changes the results.
 */
export async function runJob(exp: Experiment, job: Job, options: RunJobOptions = {}): Promise<JobResult | null> {
  mkdirSync(resultsDir(exp), { recursive: true });
  const clock = options.clock ?? (() => performance.now() / 60000);
  const measures = exp.measures;
  const target = exp.ticks;

  const done = readResult(exp, job);
  if (done && (done.tick >= target || done.extinctAt !== null)) return done;

  // Start from the latest checkpoint if there is one, otherwise from scratch.
  let sim: Simulation;
  let rows: Row[];
  const checkpoint = file(exp, job, "ckpt.evosnap");
  if (existsSync(checkpoint)) {
    sim = Simulation.load(snapshotFromBytes(new Uint8Array(readFileSync(checkpoint))));
    const saved = JSON.parse(readFileSync(file(exp, job, "rows.json"), "utf8")) as { tick: number; rows: Row[] };
    if (saved.tick !== sim.tick) throw new Error(`${job.id}: the saved rows (tick ${saved.tick}) do not match the checkpoint (tick ${sim.tick})`);
    rows = saved.rows;
  } else {
    sim = new Simulation(job.seed, exp.armConfigs[job.arm]!);
    rows = [sampleWorld(sim, measures)];
  }
  // Results fetched from the cloud without their saved worlds can be further on than the world here.
  // Carrying on from the older world would quietly redo (and overwrite) that work, so refuse instead.
  const reached = Math.max(done?.tick ?? 0, readProgress(exp, job)?.tick ?? 0);
  if (reached > sim.tick) {
    throw new Error(
      `${job.id}: its results reach tick ${reached} but the saved world here is at tick ${sim.tick}. ` +
        "To carry it on, download the saved worlds too (npm run exp -- cloud fetch <folder> --with-checkpoints); to start it over, delete its files in results/.",
    );
  }

  const save = (): void => {
    // Rows first, then the world: if the world is saved, its rows are always there too.
    writeAtomic(file(exp, job, "rows.json"), JSON.stringify({ tick: sim.tick, rows }));
    writeAtomic(checkpoint, snapshotToBytes(sim.save()));
  };
  const progress = (state: JobProgress["state"], ticksPerSecond: number): void => {
    const p: JobProgress = { tick: sim.tick, targetTicks: target, ticksPerSecond, updatedAt: new Date().toISOString(), state, machine: thisMachine() };
    writeAtomic(file(exp, job, "progress.json"), JSON.stringify(p));
    options.onProgress?.(p);
  };

  const startedAt = performance.now();
  const startTick = sim.tick;
  let lastSave = clock();
  const speed = (): number => {
    const seconds = (performance.now() - startedAt) / 1000;
    return seconds > 0 ? Math.round((sim.tick - startTick) / seconds) : 0;
  };
  progress("running", 0);

  let sinceYield = 0;
  while (sim.tick < target && sim.count > 0) {
    if (++sinceYield >= YIELD_EVERY) {
      sinceYield = 0;
      await new Promise((resolve) => setImmediate(resolve));
    }
    sim.step();
    const t = sim.tick;
    // A run resumed from a save after this tick already has the invasion in its saved world.
    if (exp.invasion && t === exp.invasion.atTick) invade(sim, exp.invasion);
    if (t % exp.sampleEvery === 0 || sim.count === 0) rows.push(sampleWorld(sim, measures));
    const due = t % exp.checkpointEvery === 0 || clock() - lastSave >= exp.checkpointMinutes;
    if (due) {
      save();
      lastSave = clock();
      progress("running", speed());
    }
    if (options.shouldStop?.()) {
      save();
      progress("stopped", speed());
      return null;
    }
  }

  // Finished (or everyone died). Keep the last checkpoint so the run can be extended later.
  if (rows.at(-1)!.tick !== sim.tick) rows.push(sampleWorld(sim, measures));
  save();
  const extinctAt = sim.count === 0 ? sim.tick : null;
  const result: JobResult = {
    arm: job.arm,
    seed: job.seed,
    tick: sim.tick,
    targetTicks: target,
    extinctAt,
    wallSeconds: Math.round((performance.now() - startedAt) / 1000),
    ticksPerSecond: speed(),
    machine: thisMachine(),
    fingerprint: sim.fingerprint(),
    summary: summarizeRun(rows, sim, measures),
    rows,
  };
  writeAtomic(file(exp, job, "result.json"), JSON.stringify(result));
  progress(extinctAt === null ? "done" : "extinct", result.ticksPerSecond);
  return result;
}

export interface StatusLine {
  job: Job;
  /** "saved": part-way, with its progress saved (it may be running now, or paused). */
  state: "done" | "extinct" | "saved" | "waiting";
  tick: number;
  ticksPerSecond: number;
  updatedAt?: string;
}

/** What has finished, what is under way and what has not started. */
export function statusOf(exp: Experiment, jobs: Job[]): StatusLine[] {
  return jobs.map((job) => {
    const result = readResult(exp, job);
    if (result && (result.tick >= exp.ticks || result.extinctAt !== null)) {
      return { job, state: result.extinctAt !== null ? "extinct" : "done", tick: result.tick, ticksPerSecond: result.ticksPerSecond };
    }
    const p = readProgress(exp, job);
    if (p) return { job, state: "saved", tick: p.tick, ticksPerSecond: p.ticksPerSecond, updatedAt: p.updatedAt };
    return { job, state: "waiting", tick: 0, ticksPerSecond: 0 };
  });
}

/** Every file a run leaves behind, for tidying up in tests. */
export function resultFiles(exp: Experiment): string[] {
  return existsSync(resultsDir(exp)) ? readdirSync(resultsDir(exp)) : [];
}
