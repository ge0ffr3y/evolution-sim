import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { jobsOf, type Experiment } from "./experiment";
import { readResult, type JobResult } from "./job";

/**
 * The comparison report: every arm against the control, seed by seed. The same seed gives the
 * same map and the same founders in every arm, so each arm's result is compared with the
 * control's on the same seed (a paired comparison), which cancels much of the luck of the draw.
 *
 * For each measure it gives the average change, a 95% range for it, and the change in units of
 * the control's seed-to-seed spread ("noise units"). Red flags, decided before any run, go at the
 * top (see docs/plans/phase-9-grand-world-audit.md).
 */

/** The run-level numbers the red flags and the headline tables look at. Every other number is in the spreadsheet file. */
export const KEY_MEASURES: [string, string][] = [
  ["meanPopulationLate", "population"],
  ["lowestPopulation", "lowest population"],
  ["deathsPerAnimalPer1000Late", "deaths per animal per 1,000 ticks"],
  ["starvedShareLate", "share of deaths by starving"],
  ["hungryShareLate", "share hungry"],
  ["cost_total_late", "cost per animal per tick"],
  ["costShare_load_late", "share of costs from harmful mutations"],
  ["mutationLoadLate", "harmful mutations per animal"],
  ["dietMeanLate", "average diet gene"],
  ["dietMaxEver", "highest diet gene ever"],
  ["meatShareOfFoodLate", "meat in the diet"],
  ["killsPer1000TicksLate", "kills per 1,000 ticks"],
  ["trophicLevelsLate", "feeding levels"],
  ["twoParentShareLate", "births with two parents"],
  ["sexGeneLate", "sex gene"],
  ["speciesAliveLate", "species alive"],
  ["shannonLate", "species diversity (Shannon)"],
  ["colonyShareLate", "share of cells in colonies"],
  ["sickShareLate", "share sick"],
  ["brainConnectionsLate", "brain connections"],
  ["plantFillLate", "plants standing (share of capacity)"],
  ["wornShareLate", "worn ground"],
  ["pinnedGenesLate", "genes pinned at a limit"],
];

/** Two-sided 95% t values by degrees of freedom (seeds minus one). */
const T95 = [NaN, 12.71, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042];
const t95 = (df: number): number => (df < T95.length ? T95[df]! : 1.96);

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]): number => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) * (x - m), 0) / (xs.length - 1));
};

export interface Comparison {
  arm: string;
  key: string;
  seeds: number;
  armMean: number;
  controlMean: number;
  /** Average of (arm - control) over the seeds both have. */
  change: number;
  /** 95% range for the change (paired t interval). */
  low: number;
  high: number;
  /** The change in units of the control's seed-to-seed spread (null when the control does not vary). */
  noiseUnits: number | null;
}

/** Compare one arm with the control on one measure, seed by seed. */
export function compare(arm: string, key: string, armRuns: Map<number, JobResult>, controlRuns: Map<number, JobResult>): Comparison | null {
  const pairs: [number, number][] = [];
  for (const [seed, r] of armRuns) {
    const c = controlRuns.get(seed);
    const a = r.summary[key];
    const b = c?.summary[key];
    if (typeof a === "number" && typeof b === "number" && Number.isFinite(a) && Number.isFinite(b)) pairs.push([a, b]);
  }
  if (pairs.length === 0) return null;
  const diffs = pairs.map(([a, b]) => a - b);
  const change = mean(diffs);
  const half = pairs.length > 1 ? (t95(pairs.length - 1) * sd(diffs)) / Math.sqrt(pairs.length) : NaN;
  const controlValues = [...controlRuns.values()].map((r) => r.summary[key]).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const spread = sd(controlValues);
  return {
    arm,
    key,
    seeds: pairs.length,
    armMean: mean(pairs.map((p) => p[0])),
    controlMean: mean(pairs.map((p) => p[1])),
    change,
    low: change - half,
    high: change + half,
    noiseUnits: spread > 0 ? change / spread : change === 0 ? 0 : null,
  };
}

export interface ReportInput {
  exp: Experiment;
  control: string;
  /** results by arm, then by seed */
  results: Map<string, Map<number, JobResult>>;
}

export function collectResults(exp: Experiment): Map<string, Map<number, JobResult>> {
  const results = new Map<string, Map<number, JobResult>>();
  for (const job of jobsOf(exp)) {
    const r = readResult(exp, job);
    if (!r || (r.tick < exp.ticks && r.extinctAt === null)) continue;
    r.rows = []; // the report needs only each run's summary; dropping the rows keeps a 2,000-run experiment in memory
    if (!results.has(job.arm)) results.set(job.arm, new Map());
    results.get(job.arm)!.set(job.seed, r);
  }
  return results;
}

const fmt = (x: number | null | undefined, places = 3): string => {
  if (x === null || x === undefined || Number.isNaN(x)) return "-";
  const a = Math.abs(x);
  if (a !== 0 && (a < 0.001 || a >= 100000)) return x.toExponential(2);
  return Number(x.toFixed(a >= 100 ? 0 : a >= 10 ? 1 : places)).toLocaleString("en-US");
};
const label = (key: string): string => KEY_MEASURES.find(([k]) => k === key)?.[1] ?? key;

/** The command that reproduces one arm on one seed in a single headless run. */
export function reproduce(exp: Experiment, arm: string, seed: number): string {
  const changes = { ...exp.baseChanges, ...(exp.arms[arm] ?? {}) };
  const sets = Object.entries(changes).map(([k, v]) => ` --set ${k}=${v}`).join("");
  return `npm run sim -- --config configs/${exp.base}.json${sets} --seed ${seed} --ticks ${exp.ticks}`;
}

/** Write report.md (readable, red flags first; committed) into the experiment folder, and comparisons.csv (every measure; large, so kept with the raw results) into its results folder. */
export function writeReport(input: ReportInput): { markdown: string; csv: string; flags: number } {
  const { exp, control, results } = input;
  const controlRuns = results.get(control);
  if (!controlRuns || controlRuns.size === 0) throw new Error(`No finished runs of the control arm "${control}" yet`);
  const arms = Object.keys(exp.arms).filter((a) => a !== control);
  const allKeys = new Set<string>();
  for (const runs of results.values()) for (const r of runs.values()) for (const k of Object.keys(r.summary)) allKeys.add(k);

  const comparisons: Comparison[] = [];
  for (const arm of arms) {
    const runs = results.get(arm);
    if (!runs) continue;
    for (const key of allKeys) {
      const c = compare(arm, key, runs, controlRuns);
      if (c) comparisons.push(c);
    }
  }
  const byArmKey = new Map(comparisons.map((c) => [`${c.arm}|${c.key}`, c]));
  const get = (arm: string, key: string): Comparison | undefined => byArmKey.get(`${arm}|${key}`);
  const strong = (c: Comparison | undefined, units: number): boolean => !!c && c.noiseUnits !== null && Math.abs(c.noiseUnits) >= units && c.seeds > 1 && (c.low > 0 || c.high < 0);

  const lines: string[] = [];
  const jobsDone = [...results.values()].reduce((n, m) => n + m.size, 0);
  lines.push(`# ${exp.name}: comparison report`, "");
  lines.push(`**Question:** ${exp.question}`, "");
  lines.push(`Base world \`${exp.base}\`${Object.keys(exp.baseChanges).length ? ` with ${Object.entries(exp.baseChanges).map(([k, v]) => `\`${k}\` ${v}`).join(", ")}` : ""}; ${exp.ticks.toLocaleString("en-US")} ticks; seeds ${exp.seeds}; ${arms.length} arms against \`${control}\`; ${jobsDone} of ${jobsOf(exp).length} runs finished.`, "");
  lines.push("How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.", "");

  // The control: what normal looks like.
  lines.push(`## The control (\`${control}\`): what normal looks like`, "");
  lines.push("| Measure | Average | Spread between seeds | Lowest | Highest |", "|---|---|---|---|---|");
  for (const [key, name] of KEY_MEASURES) {
    const values = [...controlRuns.values()].map((r) => r.summary[key]).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (!values.length) continue;
    lines.push(`| ${name} | ${fmt(mean(values))} | ${fmt(sd(values))} | ${fmt(Math.min(...values))} | ${fmt(Math.max(...values))} |`);
  }
  const controlPinned = [...allKeys].filter((k) => (k.startsWith("low_") || k.startsWith("high_")) && mean([...controlRuns.values()].map((r) => (r.summary[k] as number) ?? 0)) > 0.5);
  if (controlPinned.length) lines.push("", `Genes pinned at a limit in the control (over half the animals within 0.05 of it): ${controlPinned.map((k) => `\`${k.replace("_late", "")}\``).join(", ")}.`);
  const controlTrends = [...allKeys].filter((k) => k.startsWith("trend_")).map((k) => ({ k, v: [...controlRuns.values()].map((r) => r.summary[k]).filter((x): x is number => typeof x === "number") })).filter((t) => t.v.length > 1 && Math.abs(mean(t.v)) > 0.1 && (Math.min(...t.v) > 0 || Math.max(...t.v) < 0));
  if (controlTrends.length) lines.push("", `Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): ${controlTrends.map((t) => `${t.k.replace("trend_", "")} (${fmt(mean(t.v) * 100, 0)}%)`).join(", ")}.`);
  lines.push("");

  // Red flags.
  let flags = 0;
  const flag = (section: string[], text: string): void => {
    section.push(text);
    flags++;
  };
  const collapse: string[] = [];
  const tooGood: string[] = [];
  const cliffs: string[] = [];
  const bothWays: string[] = [];
  const runaway: string[] = [];
  const pinned: string[] = [];
  const controlPop = mean([...controlRuns.values()].map((r) => (r.summary.meanPopulationLate as number) ?? 0));
  for (const arm of arms) {
    const runs = results.get(arm);
    if (!runs) continue;
    const firstSeed = [...runs.keys()][0]!;
    const extinct = [...runs.values()].filter((r) => r.extinctAt !== null);
    const pop = mean([...runs.values()].map((r) => (r.summary.meanPopulationLate as number) ?? 0));
    if (extinct.length) flag(collapse, `- **${arm}**: died out on ${extinct.length} of ${runs.size} seeds (at tick ${extinct.map((r) => r.extinctAt!.toLocaleString("en-US")).join(", ")}). Reproduce: \`${reproduce(exp, arm, extinct[0]!.seed)}\``);
    else if (pop < 0.2 * controlPop) flag(collapse, `- **${arm}**: population ${fmt(pop)} against ${fmt(controlPop)}. Reproduce: \`${reproduce(exp, arm, firstSeed)}\``);
    if (pop > 2 * controlPop) flag(tooGood, `- **${arm}**: population ${fmt(pop)} against ${fmt(controlPop)}: check the energy ledger for an exploit. Reproduce: \`${reproduce(exp, arm, firstSeed)}\``);
    const big = KEY_MEASURES.map(([k]) => get(arm, k)).filter((c): c is Comparison => strong(c, 3));
    if (big.length) flag(cliffs, `- **${arm}**: ${big.map((c) => `${label(c.key)} ${fmt(c.controlMean)} → ${fmt(c.armMean)} (${fmt(c.noiseUnits, 1)} noise units)`).join("; ")}`);
    for (const k of [...allKeys].filter((x) => x.startsWith("trend_"))) {
      const c = get(arm, k);
      const values = [...runs.values()].map((r) => r.summary[k]).filter((x): x is number => typeof x === "number");
      if (c && values.length > 1 && Math.abs(mean(values)) > 0.1 && (Math.min(...values) > 0 || Math.max(...values) < 0) && strong(c, 2)) flag(runaway, `- **${arm}**: ${k.replace("trend_", "")} still changing by ${fmt(mean(values) * 100, 0)}% over the last quarter (control ${fmt(c.controlMean * 100, 0)}%)`);
    }
    const newlyPinned = [...allKeys].filter((k) => (k.startsWith("low_") || k.startsWith("high_")) && !controlPinned.includes(k) && mean([...runs.values()].map((r) => (r.summary[k] as number) ?? 0)) > 0.5);
    const freed = controlPinned.filter((k) => mean([...runs.values()].map((r) => (r.summary[k] as number) ?? 0)) < 0.25);
    if (newlyPinned.length || freed.length) flag(pinned, `- **${arm}**: ${newlyPinned.length ? `newly pinned ${newlyPinned.map((k) => `\`${k.replace("_late", "")}\``).join(", ")}` : ""}${newlyPinned.length && freed.length ? "; " : ""}${freed.length ? `freed ${freed.map((k) => `\`${k.replace("_late", "")}\``).join(", ")}` : ""}`);
  }
  // Pairs of arms (name-down / name-up) that move a measure the same way: a sign of a threshold or a peak inside the range.
  for (const arm of arms.filter((a) => a.endsWith("-down"))) {
    const twin = `${arm.slice(0, -5)}-up`;
    if (!results.has(twin)) continue;
    for (const [key] of KEY_MEASURES) {
      const d = get(arm, key);
      const u = get(twin, key);
      if (strong(d, 2) && strong(u, 2) && Math.sign(d!.change) === Math.sign(u!.change)) flag(bothWays, `- **${arm.slice(0, -5)}**: ${label(key)} moves the same way both down and up (${fmt(d!.noiseUnits, 1)} and ${fmt(u!.noiseUnits, 1)} noise units): the control's value may sit at a peak or a valley`);
    }
  }
  lines.push(`## Red flags (${flags})`, "");
  const section = (title: string, rule: string, items: string[]): void => {
    lines.push(`### ${title} (${items.length})`, "", `*${rule}*`, "");
    lines.push(...(items.length ? items : ["None."]), "");
  };
  section("Collapse", "Any seed died out, or the population fell below a fifth of the control's.", collapse);
  section("Too good to be true", "The population more than doubled: check the energy ledger for an exploit before believing it.", tooGood);
  section("Big changes", "A key measure moved by 3 or more noise units, with a 95% range that excludes no change.", cliffs);
  section("Same way both directions", "Turning a setting down and up both move a measure the same way (2+ noise units each).", bothWays);
  section("Still drifting", "A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.", runaway);
  section("Pinned genes", "A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.", pinned);

  // Biggest effects on each key measure.
  lines.push("## Biggest effects on each key measure", "", "The arms that moved each measure most (in noise units, with the 95% range excluding no change).", "");
  for (const [key, name] of KEY_MEASURES) {
    const ranked = arms.map((a) => get(a, key)).filter((c): c is Comparison => strong(c, 1)).sort((a, b) => Math.abs(b.noiseUnits!) - Math.abs(a.noiseUnits!)).slice(0, 8);
    if (!ranked.length) continue;
    lines.push(`**${name}** (control ${fmt(ranked[0]!.controlMean)}): ${ranked.map((c) => `${c.arm} ${fmt(c.armMean)} (${c.noiseUnits! > 0 ? "+" : ""}${fmt(c.noiseUnits, 1)})`).join(", ")}`, "");
  }

  // Arms that changed nothing.
  const quiet = arms.filter((a) => results.has(a) && !KEY_MEASURES.some(([k]) => strong(get(a, k), 1)));
  lines.push(`## No clear effect (${quiet.length})`, "", "*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*", "");
  lines.push(quiet.length ? quiet.map((a) => `\`${a}\``).join(", ") : "None.", "");

  const csv = ["arm,measure,seeds,arm_mean,control_mean,change,low95,high95,noise_units", ...comparisons.map((c) => [c.arm, c.key, c.seeds, c.armMean, c.controlMean, c.change, c.low, c.high, c.noiseUnits ?? ""].join(","))].join("\n");
  const markdown = lines.join("\n");
  writeFileSync(join(exp.folder, "report.md"), `${markdown}\n`);
  writeFileSync(join(exp.folder, "results", "comparisons.csv"), `${csv}\n`);
  return { markdown, csv, flags };
}
