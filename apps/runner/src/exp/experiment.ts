import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Simulation, makeConfig, parsePreset, parseConfigOverrides, type SimConfig } from "@evo/sim-core";
import { MEASURES, expandMeasures } from "./measures";
import { parseSeedList } from "../run";

/**
 * An experiment file (experiments/<name>/experiment.json): one question, a base world, the
 * setups ("arms") to compare, the seeds every arm runs on, and what to measure. Everything is
 * checked before anything runs, so a typo costs seconds, not an hour of machine time.
 */
export interface ExperimentFile {
  name: string;
  /** Written down before the run, so we know in advance what would count as an answer. */
  question: string;
  /** A preset from configs/ (default: the standard world). */
  base?: string;
  ticks: number;
  /** Seeds, e.g. "1-8" or "3,7,11". Every arm runs on every seed. */
  seeds: string;
  /** Record the measures every this many ticks (default: 200 samples over the run). */
  sampleEvery?: number;
  /** Save the world every this many ticks (default: ten times over the run)... */
  checkpointEvery?: number;
  /** ...and at least every this many minutes of wall time (default 30), so long runs lose little if anything fails. */
  checkpointMinutes?: number;
  /** Changes made to the base world in every arm (e.g. the audit's baseline: the grand world with 15% mending). */
  baseChanges?: Record<string, number>;
  /** Each arm is a set of changes to the base world. Include a control (usually {}). */
  arms: Record<string, Record<string, number>>;
  measures: string[];
  /** "sweep" (many jobs on a big machine, the default) or "long" (up to 8 long jobs on a small machine). */
  lane?: "sweep" | "long";
}

export interface Experiment extends Required<Omit<ExperimentFile, "base">> {
  base: string;
  folder: string;
  seedList: number[];
  /** The full config overrides for each arm: the base preset plus the arm's changes. */
  armConfigs: Record<string, Partial<SimConfig>>;
}

export interface Job {
  arm: string;
  seed: number;
  /** File-name stem for everything this job writes. */
  id: string;
}

const NAME = /^[a-z0-9][a-z0-9-]*$/;

/** Read and check an experiment, given its folder or its experiment.json. */
export function loadExperiment(path: string, repoRoot: string): Experiment {
  const file = path.endsWith(".json") ? path : join(path, "experiment.json");
  if (!existsSync(file)) throw new Error(`No experiment file at ${file}`);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${file} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  return checkExperiment(raw, resolve(file, ".."), repoRoot);
}

/** Check an experiment's contents and work out every arm's config. Throws a plain-English error on the first problem. */
export function checkExperiment(raw: unknown, folder: string, repoRoot: string): Experiment {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("An experiment must be a JSON object");
  const e = raw as Record<string, unknown>;
  const known = ["name", "question", "base", "baseChanges", "ticks", "seeds", "sampleEvery", "checkpointEvery", "checkpointMinutes", "arms", "measures", "lane"];
  for (const key of Object.keys(e)) if (!known.includes(key)) throw new Error(`Unknown experiment field "${key}" (expected one of: ${known.join(", ")})`);

  if (typeof e.name !== "string" || !NAME.test(e.name)) throw new Error("name must be lower-case letters, digits and dashes, e.g. \"meat-eating-long\"");
  if (typeof e.question !== "string" || e.question.trim().length < 10) throw new Error("question must say, in a sentence, what the experiment is meant to find out");
  const ticks = e.ticks;
  if (typeof ticks !== "number" || !Number.isInteger(ticks) || ticks < 1) throw new Error("ticks must be a whole number of 1 or more");
  if (typeof e.seeds !== "string") throw new Error("seeds must be text such as \"1-8\" or \"3,7,11\"");
  const seedList = parseSeedList(e.seeds);

  const whole = (name: string, value: unknown, fallback: number, min: number): number => {
    if (value === undefined) return fallback;
    if (typeof value !== "number" || !Number.isInteger(value) || value < min) throw new Error(`${name} must be a whole number of ${min} or more`);
    return value;
  };
  const sampleEvery = whole("sampleEvery", e.sampleEvery, Math.max(1, Math.floor(ticks / 200)), 1);
  const checkpointEvery = whole("checkpointEvery", e.checkpointEvery, Math.max(1, Math.floor(ticks / 10)), 1);
  const checkpointMinutes = whole("checkpointMinutes", e.checkpointMinutes, 30, 1);
  const lane = e.lane ?? "sweep";
  if (lane !== "sweep" && lane !== "long") throw new Error("lane must be \"sweep\" or \"long\"");

  const base = e.base ?? "default";
  if (typeof base !== "string") throw new Error("base must be the name of a preset in configs/, e.g. \"grand-world\"");
  const presetFile = join(repoRoot, "configs", `${base}.json`);
  if (!existsSync(presetFile)) throw new Error(`base "${base}" is not a preset (no configs/${base}.json)`);
  const preset = parsePreset(JSON.parse(readFileSync(presetFile, "utf8")), base);
  let baseChanges: Partial<SimConfig> = {};
  if (e.baseChanges !== undefined) {
    try {
      baseChanges = parseConfigOverrides(e.baseChanges);
    } catch (error) {
      throw new Error(`baseChanges: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (typeof e.arms !== "object" || e.arms === null || Array.isArray(e.arms) || Object.keys(e.arms).length === 0) throw new Error("arms must be an object with at least one arm, e.g. { \"control\": {} }");
  const arms = e.arms as Record<string, unknown>;
  const armConfigs: Record<string, Partial<SimConfig>> = {};
  for (const [arm, changes] of Object.entries(arms)) {
    if (!NAME.test(arm)) throw new Error(`arm name "${arm}" must be lower-case letters, digits and dashes`);
    let parsed: Partial<SimConfig>;
    try {
      parsed = parseConfigOverrides(changes);
    } catch (error) {
      throw new Error(`arm "${arm}": ${error instanceof Error ? error.message : String(error)}`);
    }
    const config = { ...preset.config, ...baseChanges, ...parsed };
    try {
      makeConfig(config); // the same checks the simulation itself runs
    } catch (error) {
      throw new Error(`arm "${arm}": ${error instanceof Error ? error.message : String(error)}`);
    }
    armConfigs[arm] = config;
  }

  if (!Array.isArray(e.measures) || e.measures.length === 0) throw new Error(`measures must list what to record, from: ${Object.keys(MEASURES).join(", ")}`);
  for (const m of e.measures) if (typeof m !== "string" || !(m in MEASURES || m === "all")) throw new Error(`Unknown measure "${String(m)}" (available: all, ${Object.keys(MEASURES).join(", ")})`);
  if (lane === "long" && seedList.length * Object.keys(arms).length > 8) throw new Error("the long lane runs at most 8 worlds at once (arms x seeds); use the sweep lane for more");

  return {
    name: e.name,
    question: e.question,
    base,
    baseChanges: baseChanges as Record<string, number>,
    ticks,
    seeds: e.seeds,
    sampleEvery,
    checkpointEvery,
    checkpointMinutes,
    arms: arms as Record<string, Record<string, number>>,
    measures: expandMeasures(e.measures as string[]),
    lane,
    folder,
    seedList,
    armConfigs,
  };
}

/** Build every arm's world (first seed) and run a few ticks, to catch an arm that cannot start before any machine is paid for. */
export function buildArms(exp: Experiment): string[] {
  const failures: string[] = [];
  for (const [arm, config] of Object.entries(exp.armConfigs)) {
    try {
      new Simulation(exp.seedList[0]!, config).run(5);
    } catch (error) {
      failures.push(`${arm}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return failures;
}

/** Every (arm, seed) pair, in a fixed order. */
export function jobsOf(exp: Experiment): Job[] {
  const jobs: Job[] = [];
  for (const arm of Object.keys(exp.arms)) for (const seed of exp.seedList) jobs.push({ arm, seed, id: `${arm}-s${seed}` });
  return jobs;
}
