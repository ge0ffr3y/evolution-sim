import { GENES, Simulation, parseConfigOverrides, type SimConfig, type SimStats } from "@evo/sim-core";

/** Columns of the per-run stats CSV, in order. */
export const CSV_COLUMNS: readonly string[] = [
  "tick",
  "population",
  "totalFood",
  "totalEnergy",
  "meanEnergy",
  "totalBirths",
  "totalDeaths",
  ...GENES.flatMap((gene) => [`mean_${gene}`, `sd_${gene}`]),
  "foodEaten",
  "foodRegrown",
  "basalBurned",
  "movementBurned",
  "sensingBurned",
];

export const HIST_COLUMNS = ["tick", "trait", "bin", "binMin", "binMax", "count"] as const;

export interface RunOptions {
  seed: number;
  ticks: number;
  /** Record one row of stats every this many ticks. */
  every: number;
  /** Record trait histograms every this many ticks (0 turns histograms off). */
  histEvery?: number;
  /** Number of bins per trait histogram. */
  bins?: number;
  overrides?: Partial<SimConfig>;
  /** Called with a 0-1 progress fraction about every 10%. */
  onProgress?: (fraction: number) => void;
}

export interface RunResult {
  csv: string;
  /** Long-format histogram CSV: one row per (tick, trait, bin). Empty if histograms were off. */
  histCsv: string;
  rows: number;
  final: SimStats;
  /** True if everyone died before the requested number of ticks. */
  extinct: boolean;
}

function fmt(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(5);
}

function statsRow(s: SimStats): string {
  const values: number[] = [s.tick, s.population, s.totalFood, s.totalEnergy, s.meanEnergy, s.totalBirths, s.totalDeaths];
  for (const gene of GENES) values.push(s.traits[gene].mean, s.traits[gene].sd);
  const L = s.ledger;
  values.push(L.foodEaten, L.foodRegrown, L.basalBurned, L.movementBurned, L.sensingBurned);
  return values.map(fmt).join(",");
}

/** Run one simulation headless and collect its stats as CSV text. */
export function runToCsv(options: RunOptions): RunResult {
  const { seed, ticks, every, overrides, onProgress } = options;
  const histEvery = options.histEvery ?? 0;
  const bins = options.bins ?? 20;
  if (!Number.isInteger(ticks) || ticks < 0) throw new Error("ticks must be a whole number, 0 or more");
  if (!Number.isInteger(every) || every < 1) throw new Error("every must be a whole number, 1 or more");
  if (!Number.isInteger(histEvery) || histEvery < 0) throw new Error("histEvery must be a whole number, 0 or more");
  if (!Number.isInteger(bins) || bins < 1) throw new Error("bins must be a whole number, 1 or more");

  const sim = new Simulation(seed, overrides);
  const lines: string[] = [CSV_COLUMNS.join(","), statsRow(sim.stats())];
  const histLines: string[] = histEvery > 0 ? [HIST_COLUMNS.join(",")] : [];
  const progressStep = Math.max(1, Math.floor(ticks / 10));

  const recordHistograms = (): void => {
    for (const gene of GENES) {
      const counts = sim.histogram(gene, bins);
      const { min, max } = sim.ranges[gene];
      for (let bin = 0; bin < bins; bin++) {
        const lo = min + ((max - min) * bin) / bins;
        const hi = min + ((max - min) * (bin + 1)) / bins;
        histLines.push([sim.tick, gene, bin, fmt(lo), fmt(hi), counts[bin]].join(","));
      }
    }
  };
  if (histEvery > 0) recordHistograms();

  let extinct = false;
  for (let t = 1; t <= ticks; t++) {
    sim.step();
    const atInterval = t % every === 0 || t === ticks;
    if (atInterval) lines.push(statsRow(sim.stats()));
    if (histEvery > 0 && (t % histEvery === 0 || t === ticks)) recordHistograms();
    if (onProgress && t % progressStep === 0) onProgress(t / ticks);
    if (sim.count === 0) {
      // Record the moment of extinction (unless this tick was just recorded) and stop.
      if (!atInterval) lines.push(statsRow(sim.stats()));
      extinct = true;
      break;
    }
  }

  return {
    csv: lines.join("\n") + "\n",
    histCsv: histLines.length > 0 ? histLines.join("\n") + "\n" : "",
    rows: lines.length - 1,
    final: sim.stats(),
    extinct,
  };
}

/** Turn repeated `name=value` strings into config overrides, rejecting unknown names. */
export function parseOverrides(pairs: readonly string[]): Partial<SimConfig> {
  const overrides: Record<string, number> = {};
  for (const pair of pairs) {
    const [name, raw, ...rest] = pair.split("=");
    if (!name || raw === undefined || rest.length > 0) throw new Error(`--set expects name=value, got "${pair}"`);
    if (raw.trim() === "") throw new Error(`Setting "${name}" needs a number, got "${raw}"`);
    overrides[name] = Number(raw);
  }
  return parseConfigOverrides(overrides);
}

/** Read seeds like "1-20", "3,7,11" or "1-5,9". */
export function parseSeedList(text: string): number[] {
  const seeds: number[] = [];
  for (const part of text.split(",")) {
    const range = /^(\d+)-(\d+)$/.exec(part.trim());
    if (range) {
      const from = Number(range[1]);
      const to = Number(range[2]);
      if (to < from) throw new Error(`Seed range "${part}" runs backwards`);
      if (to - from > 10_000) throw new Error(`Seed range "${part}" is too large`);
      for (let s = from; s <= to; s++) seeds.push(s);
    } else if (/^\d+$/.test(part.trim())) {
      seeds.push(Number(part.trim()));
    } else {
      throw new Error(`Cannot read "${part}" as a seed or a range like 1-20`);
    }
  }
  if (seeds.length === 0) throw new Error("No seeds given");
  return [...new Set(seeds)];
}

/** One seed's end state, as printed by a child process and collected by a sweep. */
export interface SeedSummary {
  seed: number;
  extinct: boolean;
  tick: number;
  population: number;
  /** Mean of each trait at the end. */
  means: Record<string, number>;
}

export function summarize(seed: number, result: RunResult): SeedSummary {
  const means: Record<string, number> = {};
  for (const gene of GENES) means[gene] = result.final.traits[gene].mean;
  return { seed, extinct: result.extinct, tick: result.final.tick, population: result.final.population, means };
}

export interface SweepSpread {
  /** How many seeds survived to the end. */
  survivors: number;
  /** For each trait: the mean and standard deviation of the per-seed end means. */
  traits: Record<string, { mean: number; sd: number; min: number; max: number }>;
}

/** How different the seeds ended up from each other, per trait. */
export function spreadAcrossSeeds(summaries: readonly SeedSummary[]): SweepSpread {
  const alive = summaries.filter((s) => !s.extinct);
  const traits: SweepSpread["traits"] = {};
  for (const gene of GENES) {
    const values = alive.map((s) => s.means[gene]!);
    const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const variance = values.length > 0 ? values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length : 0;
    traits[gene] = {
      mean,
      sd: Math.sqrt(variance),
      min: values.length > 0 ? Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
    };
  }
  return { survivors: alive.length, traits };
}
