import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { jobsOf, type Experiment } from "./experiment";
import { readResult } from "./job";
import { KEY_MEASURES } from "./report";

/**
 * Export an experiment for the viewer's analysis page: a small JSON file with each run's key
 * results and a thinned timeline of key measures, written where the viewer serves static files
 * (apps/viewer/public/experiments), plus an index of every exported experiment. The raw results
 * (hundreds of MB) stay on the laptop and in S3; this file is what the published site shows.
 */

/** Run-level results the page can compare (beyond the report's key measures). */
const EXTRA_SUMMARY: [string, string][] = [
  ["speciesEver", "species ever"],
  ["mixedEatersLate", "mixed eaters"],
  ["shareOfTimeWith5PlusMixedEaters", "share of time with 5+ mixed eaters"],
  ["firstMixedEatersAt", "first tick with 5+ mixed eaters"],
  ["meatEatersLate", "meat eaters"],
  ["dietOver50Late", "share with diet above 0.5"],
  ["dominanceLate", "share of animals in the biggest species"],
  ["bigSpeciesLate", "species with 10%+ of the animals"],
  ["landMassDifferenceLate", "difference between land masses"],
  ["populatedLandMassesLate", "populated land masses"],
];

/** Timeline measures: raw columns of the rows, plus two worked out from running totals. */
const SERIES: [string, string][] = [
  ["population", "population"],
  ["speciesAlive", "species alive"],
  ["shannon", "species diversity (Shannon)"],
  ["mixedEaters", "mixed eaters"],
  ["meatEaters", "meat eaters"],
  ["dietMean", "average diet gene"],
  ["dietMax", "highest diet gene"],
  ["dominance", "share in the biggest species"],
  ["landMassDifference", "difference between land masses"],
  ["sickShare", "share sick"],
  ["colonyShare", "share of cells in colonies"],
  ["plantFill", "plants standing"],
  ["wornShare", "worn ground"],
  ["meanAge", "average age"],
  ["mutationLoad", "harmful mutations per animal"],
  ["cost_total", "cost per animal per tick"],
  ["twoParentShare", "births with two parents (share)"],
  ["killsPer1000", "kills per 1,000 ticks"],
];

const POINTS = 100;
const round = (x: number): number => (Number.isFinite(x) ? Number(x.toPrecision(5)) : x);

export interface ExportedExperiment {
  name: string;
  question: string;
  base: string;
  baseChanges: Record<string, number>;
  ticks: number;
  seeds: string;
  control: string;
  arms: Record<string, Record<string, number>>;
  summaryMeasures: [string, string][];
  seriesMeasures: [string, string][];
  runs: { arm: string; seed: number; tick: number; extinctAt: number | null; summary: Record<string, number | null> }[];
  /** For each arm, each timeline measure as the average across its seeds, and the lowest and highest seed, at each sampled tick (seeds that died out drop out). */
  series: Record<string, { tick: number[]; mean: Record<string, (number | null)[]>; low: Record<string, (number | null)[]>; high: Record<string, (number | null)[]> }>;
}

export function exportExperiment(exp: Experiment, control: string): ExportedExperiment {
  const summaryMeasures: [string, string][] = [...KEY_MEASURES, ...EXTRA_SUMMARY];
  const runs: ExportedExperiment["runs"] = [];
  const perArm = new Map<string, Record<string, (number | null)[]>[]>();
  for (const job of jobsOf(exp)) {
    const r = readResult(exp, job);
    if (!r || (r.tick < exp.ticks && r.extinctAt === null)) continue;
    const summary: Record<string, number | null> = {};
    for (const [key] of summaryMeasures) {
      const v = r.summary[key];
      summary[key] = typeof v === "number" ? round(v) : null;
    }
    // Rates between samples from running totals, then thin the timeline to about POINTS samples.
    const rows = r.rows;
    const derived = rows.map((row, k) => {
      const prev = rows[k - 1];
      if (!prev) return { twoParentShare: NaN, killsPer1000: NaN };
      const born = (row.births ?? 0) - (prev.births ?? 0);
      const dt = row.tick! - prev.tick!;
      return {
        twoParentShare: born > 0 ? ((row.twoParentBirths ?? 0) - (prev.twoParentBirths ?? 0)) / born : NaN,
        killsPer1000: dt > 0 ? (((row.kills ?? 0) - (prev.kills ?? 0)) / dt) * 1000 : NaN,
      };
    });
    const step = Math.max(1, Math.ceil(rows.length / POINTS));
    const picks: number[] = [];
    for (let k = 0; k < rows.length; k += step) picks.push(k);
    if (picks.at(-1) !== rows.length - 1) picks.push(rows.length - 1);
    const series: Record<string, (number | null)[]> = { tick: picks.map((k) => rows[k]!.tick!) };
    for (const [key] of SERIES) {
      series[key] = picks.map((k) => {
        const v = key in derived[k]! ? (derived[k] as Record<string, number>)[key]! : rows[k]![key];
        return typeof v === "number" && Number.isFinite(v) ? round(v) : null;
      });
    }
    runs.push({ arm: job.arm, seed: job.seed, tick: r.tick, extinctAt: r.extinctAt, summary });
    if (!perArm.has(job.arm)) perArm.set(job.arm, []);
    perArm.get(job.arm)!.push(series);
  }
  // Average each arm's seeds tick by tick (every seed samples at the same ticks; one that died out stops early).
  const series: ExportedExperiment["series"] = {};
  for (const [arm, list] of perArm) {
    const longest = list.reduce((a, b) => (b.tick!.length > a.tick!.length ? b : a));
    const ticks = longest.tick as number[];
    const out = { tick: ticks, mean: {} as Record<string, (number | null)[]>, low: {} as Record<string, (number | null)[]>, high: {} as Record<string, (number | null)[]> };
    for (const [key] of SERIES) {
      out.mean[key] = [];
      out.low[key] = [];
      out.high[key] = [];
      for (let p = 0; p < ticks.length; p++) {
        const values = list.map((sr) => (sr.tick![p] === ticks[p] ? sr[key]![p] : null)).filter((v): v is number => v !== null && v !== undefined);
        out.mean[key]!.push(values.length ? round(values.reduce((a, b) => a + b, 0) / values.length) : null);
        out.low[key]!.push(values.length ? round(Math.min(...values)) : null);
        out.high[key]!.push(values.length ? round(Math.max(...values)) : null);
      }
    }
    series[arm] = out;
  }
  return { name: exp.name, question: exp.question, base: exp.base, baseChanges: exp.baseChanges, ticks: exp.ticks, seeds: exp.seeds, control, arms: exp.arms, summaryMeasures, seriesMeasures: SERIES, runs, series };
}

/** Write the export and add (or update) it in the index the analysis page reads. */
export function writeExport(data: ExportedExperiment, outDir: string): string {
  mkdirSync(outDir, { recursive: true });
  const file = `${data.name}.json`;
  writeFileSync(join(outDir, file), JSON.stringify(data));
  const indexPath = join(outDir, "index.json");
  const index: { name: string; question: string; file: string }[] = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, "utf8")) : [];
  const entry = { name: data.name, question: data.question, file };
  const at = index.findIndex((e) => e.name === data.name);
  if (at >= 0) index[at] = entry;
  else index.push(entry);
  writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  return join(outDir, file);
}
