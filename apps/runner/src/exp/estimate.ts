import { jobsOf } from "./experiment";
import { Simulation } from "@evo/sim-core";
import type { Experiment, Job } from "./experiment";
import { readProgress, readResult } from "./job";

/**
 * Machines the runner may use (Graviton: every vCPU is a whole core, which suits one-core-per-world
 * runs). Prices are on-demand in us-west-2 as of 2026-10-20 and are only a fallback: the launch
 * reads the live price. `speed` is how fast one core runs the sim compared with one laptop (M2)
 * core, from the speed test of 2026-10-20 (experiments/speed-c7g and speed-c8g: four grand worlds,
 * 300,000 ticks, all cores busy on each machine): c7g 0.66, c8g 0.84, the same within 0.03 on every
 * seed. Per unit of work c8g is about 13% cheaper as well as faster.
 */
export interface MachineFamily {
  family: "c7g" | "c8g" | "t4g";
  pricePerVcpuHour: number;
  speed: number;
}
export const FAMILIES: MachineFamily[] = [
  { family: "c7g", pricePerVcpuHour: 2.32 / 64, speed: 0.66 },
  { family: "c8g", pricePerVcpuHour: 2.552 / 64, speed: 0.84 },
];
/** Machine sizes; `only` limits a size to the families that come in it (c7g stops at 64 cores). */
export const SIZES: { size: string; vcpus: number; memoryGb: number; only?: MachineFamily["family"][] }[] = [
  { size: "large", vcpus: 2, memoryGb: 4 },
  { size: "xlarge", vcpus: 4, memoryGb: 8 },
  { size: "2xlarge", vcpus: 8, memoryGb: 16 },
  { size: "4xlarge", vcpus: 16, memoryGb: 32 },
  { size: "8xlarge", vcpus: 32, memoryGb: 64 },
  { size: "12xlarge", vcpus: 48, memoryGb: 96 },
  { size: "16xlarge", vcpus: 64, memoryGb: 128 },
  { size: "24xlarge", vcpus: 96, memoryGb: 192, only: ["c8g"] },
  { size: "48xlarge", vcpus: 192, memoryGb: 384, only: ["c8g"] },
];
/**
 * The fallback for the most cores this AWS account may run at once on C-family machines (the quota
 * "Running On-Demand Standard instances"). A launch reads the real quota when the runner's AWS user
 * is allowed to (servicequotas:GetServiceQuota), and uses this only when it cannot.
 */
export const MAX_VCPUS = 32;
/** Allowance for populations growing during a run (worlds get slower as they fill up). */
export const SAFETY_MARGIN = 1.5;
/** Booting, installing Node and the project, and the final upload. */
export const SETUP_MINUTES = 8;
/** Memory one world needs at most (a full grand world with brains), in GB. */
export const GB_PER_WORLD = 0.6;
/** At most this many arms get a timing trial; the rest are scaled from them by world area. */
export const TRIAL_ARMS = 4;
/** A machine whose finish is within this share of the fastest option counts as "about as quick". */
export const SPEED_TOLERANCE = 1.15;

export interface MachineOption {
  type: string;
  vcpus: number;
  workers: number;
  pricePerHour: number;
  wallHours: number;
  cost: number;
}

export interface Estimate {
  /** Seconds each unfinished job still needs on one laptop core. */
  jobSeconds: { job: Job; seconds: number }[];
  coreHours: number;
  longestJobHours: number;
  options: MachineOption[];
  pick: MachineOption;
}

/** How much faster than a laptop core a core of this machine is (1 for the laptop or anything unknown). */
export function speedOf(machine: string | undefined): number {
  const family = machine?.split(".")[0];
  return FAMILIES.find((f) => f.family === family)?.speed ?? 1;
}

/** How fast each arm runs here (in laptop terms: speeds measured in the cloud are converted back), in ticks per second: from earlier runs if there are any, else a short trial. */
export function measureSpeeds(exp: Experiment, jobs: Job[], trialTicks = 1500): Record<string, number> {
  const speeds: Record<string, number> = {};
  for (const arm of Object.keys(exp.arms)) {
    const seen = jobs
      .filter((j) => j.arm === arm)
      .map((j) => {
        const r = readResult(exp, j) ?? readProgress(exp, j);
        return r ? r.ticksPerSecond / speedOf(r.machine) : 0;
      })
      .filter((tps) => tps > 0);
    if (seen.length) {
      speeds[arm] = Math.min(...seen); // the slowest seen, to be safe
      continue;
    }
    // With many arms (the audit's 500+), time only a few and scale the rest by world area, which
    // is what mostly sets the speed; timing every arm would keep the laptop busy for many minutes.
    const area = (a: string): number => (exp.armConfigs[a]!.worldWidth ?? 256) * (exp.armConfigs[a]!.worldHeight ?? 256);
    const timed = Object.keys(speeds).filter((a) => speeds[a]! > 0);
    if (timed.length >= TRIAL_ARMS) {
      const sameSize = timed.find((a) => area(a) === area(arm));
      const ref = sameSize ?? timed[0]!;
      speeds[arm] = (speeds[ref]! * area(ref)) / area(arm);
      continue;
    }
    // A short trial run: a little warm-up, then time a stretch.
    const sim = new Simulation(exp.seedList[0]!, exp.armConfigs[arm]!);
    sim.run(Math.min(300, exp.ticks));
    const ticks = Math.max(1, Math.min(trialTicks, exp.ticks));
    const started = performance.now();
    sim.run(ticks);
    const seconds = (performance.now() - started) / 1000;
    speeds[arm] = ticks / Math.max(seconds, 1e-3);
  }
  return speeds;
}

/**
 * Speeds without a trial on this computer: the slowest speed seen in another experiment's finished runs (converted to
 * laptop terms), used for every arm. For worlds like ones already run in the cloud; --hours still fixes the hard stop.
 */
export function speedsFrom(exp: Experiment, other: Experiment): Record<string, number> {
  const seen = jobsOf(other)
    .map((j) => readResult(other, j))
    .filter((r): r is NonNullable<typeof r> => r !== null && r.ticksPerSecond > 0)
    .map((r) => r.ticksPerSecond / speedOf(r.machine));
  if (!seen.length) throw new Error(`${other.name} has no finished runs here to take speeds from (fetch it first)`);
  const slowest = Math.min(...seen);
  return Object.fromEntries(Object.keys(exp.arms).map((arm) => [arm, slowest]));
}

/** The time to finish a set of jobs on `workers` cores, longest first (a good, simple schedule). */
export function makespan(seconds: number[], workers: number): number {
  const loads = new Array<number>(Math.max(1, workers)).fill(0);
  for (const s of [...seconds].sort((a, b) => b - a)) {
    let least = 0;
    for (let k = 1; k < loads.length; k++) if (loads[k]! < loads[least]!) least = k;
    loads[least] = loads[least]! + s;
  }
  return Math.max(...loads);
}

/** Every machine size the lane allows, what it would take and cost, and the pick: the cheapest that finishes about as quickly as the fastest. */
export function planMachines(exp: Experiment, jobSeconds: number[], families: MachineFamily[] = FAMILIES, maxVcpus = MAX_VCPUS): { options: MachineOption[]; pick: MachineOption } {
  const options: MachineOption[] = [];
  const sizes = SIZES.filter((s) => s.vcpus <= (exp.lane === "long" ? Math.min(8, maxVcpus) : maxVcpus));
  if (sizes.length === 0) throw new Error(`No machine fits in the ${maxVcpus} cores free right now (other experiments are using the rest). Wait for one to finish.`);
  for (const f of families) {
    for (const s of sizes) {
      if (s.only && !s.only.includes(f.family)) continue;
      // One world per core. The uploads every 5 minutes are light enough to share the cores (the first cloud runs showed no slowdown).
      const byCores = s.vcpus;
      const byMemory = Math.max(1, Math.floor((s.memoryGb - 1) / GB_PER_WORLD));
      const workers = Math.min(byCores, byMemory, Math.max(1, jobSeconds.length));
      const seconds = makespan(jobSeconds.map((x) => (x * SAFETY_MARGIN) / f.speed), workers) + SETUP_MINUTES * 60;
      const pricePerHour = f.pricePerVcpuHour * s.vcpus;
      const wallHours = seconds / 3600;
      options.push({ type: `${f.family}.${s.size}`, vcpus: s.vcpus, workers, pricePerHour: round(pricePerHour, 4), wallHours: round(wallHours, 2), cost: round(pricePerHour * wallHours, 2) });
    }
  }
  const fastest = Math.min(...options.map((o) => o.wallHours));
  const quick = options.filter((o) => o.wallHours <= fastest * SPEED_TOLERANCE);
  const pick = quick.reduce((best, o) => (o.cost < best.cost ? o : best), quick[0]!);
  options.sort((a, b) => a.cost - b.cost);
  return { options, pick };
}

const round = (x: number, places: number): number => Math.round(x * 10 ** places) / 10 ** places;

/** The full estimate for the unfinished part of an experiment. */
export function estimate(exp: Experiment, jobs: Job[], speeds: Record<string, number>, families: MachineFamily[] = FAMILIES, maxVcpus = MAX_VCPUS): Estimate {
  const jobSeconds = jobs.map((job) => {
    const r = readResult(exp, job);
    const p = readProgress(exp, job);
    const from = r && r.extinctAt === null ? r.tick : (p?.tick ?? 0);
    const remaining = r && (r.tick >= exp.ticks || r.extinctAt !== null) ? 0 : Math.max(0, exp.ticks - from);
    return { job, seconds: remaining / speeds[job.arm]! };
  });
  const todo = jobSeconds.filter((j) => j.seconds > 0).map((j) => j.seconds);
  const plan = planMachines(exp, todo.length ? todo : [0], families, maxVcpus);
  return {
    jobSeconds,
    coreHours: round(todo.reduce((a, b) => a + b, 0) / 3600, 2),
    longestJobHours: round((todo.length ? Math.max(...todo) : 0) / 3600, 2),
    ...plan,
  };
}
