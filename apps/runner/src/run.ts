import {
  GENES,
  Simulation,
  parseConfigOverrides,
  type BehaviorStats,
  type SimConfig,
  type SimEvent,
  type SimEventKind,
  type SimStats,
} from "@evo/sim-core";

/** Columns of the per-run stats CSV, in order. */
export const CSV_COLUMNS: readonly string[] = [
  "tick",
  "population",
  "herbivores",
  "omnivores",
  "carnivores",
  "totalFood",
  "totalNutrient",
  "totalCorpseMatter",
  "totalDetritus",
  "totalEnergy",
  "meanEnergy",
  "totalBirths",
  "totalDeaths",
  "totalKills",
  "totalStarved",
  "blockedBirths",
  "totalAttacks",
  "brainHidden",
  "brainConnections",
  "brainHiddenHerbivores",
  "brainConnectionsHerbivores",
  "brainHiddenCarnivores",
  "brainConnectionsCarnivores",
  "chaseTurn",
  "chaseSamples",
  "fleeTurn",
  "fleeSamples",
  "speciesAlive",
  "speciesEver",
  ...GENES.flatMap((gene) => [`mean_${gene}`, `sd_${gene}`]),
  "sunlightIn",
  "plantEaten",
  "meatEaten",
  "digestionLoss",
  "decayLoss",
  "basalBurned",
  "movementBurned",
  "sensingBurned",
  "attackBurned",
  "armorBurned",
  "brainBurned",
];

export const HIST_COLUMNS = ["tick", "trait", "bin", "binMin", "binMax", "count"] as const;

export interface RunOptions {
  /** Continue a world that already exists (for example one loaded from a save) instead of starting a new one. */
  sim?: Simulation;
  seed: number;
  ticks: number;
  /** Record one row of stats every this many ticks. */
  every: number;
  /** Measure how purposefully organisms turn every this many ticks (0 turns it off). */
  behaviorEvery?: number;
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
  /** Recent average of the behavior measurements at the end of the run (0.5 = random turning). */
  behavior: BehaviorStats;
  /** Notable firsts: the first kill, the first carnivore, and so on. */
  events: SimEvent[];
  /** True if everyone died before the requested number of ticks. */
  extinct: boolean;
  /** The world as it ended up (so it can be saved or carried on). */
  sim: Simulation;
}

function fmt(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(5);
}

function statsRow(s: SimStats, b: BehaviorStats): string {
  const values: number[] = [
    s.tick,
    s.population,
    s.classes.herbivores,
    s.classes.omnivores,
    s.classes.carnivores,
    s.totalFood,
    s.totalNutrient,
    s.totalCorpseMatter,
    s.totalDetritus,
    s.totalEnergy,
    s.meanEnergy,
    s.totalBirths,
    s.totalDeaths,
    s.totalKills,
    s.totalStarved,
    s.blockedBirths,
    s.totalAttacks,
    s.brain.all.hidden,
    s.brain.all.connections,
    s.brain.herbivores.hidden,
    s.brain.herbivores.connections,
    s.brain.carnivores.hidden,
    s.brain.carnivores.connections,
    b.chase,
    b.chaseSamples,
    b.flee,
    b.fleeSamples,
    s.species.alive,
    s.species.ever,
  ];
  for (const gene of GENES) values.push(s.traits[gene].mean, s.traits[gene].sd);
  const L = s.ledger;
  values.push(L.sunlightIn, L.plantEaten, L.meatEaten, L.digestionLoss, L.decayLoss);
  values.push(L.basalBurned, L.movementBurned, L.sensingBurned, L.attackBurned, L.armorBurned, L.brainBurned);
  return values.map(fmt).join(",");
}

/** How many recent behavior measurements to average. */
const BEHAVIOR_WINDOW = 40;

function averageBehavior(samples: readonly BehaviorStats[]): BehaviorStats {
  let chase = 0;
  let chaseN = 0;
  let flee = 0;
  let fleeN = 0;
  for (const b of samples) {
    chase += b.chase * b.chaseSamples;
    chaseN += b.chaseSamples;
    flee += b.flee * b.fleeSamples;
    fleeN += b.fleeSamples;
  }
  return {
    chase: chaseN > 0 ? chase / chaseN : 0.5,
    chaseSamples: chaseN,
    flee: fleeN > 0 ? flee / fleeN : 0.5,
    fleeSamples: fleeN,
  };
}

/** Run one simulation headless and collect its stats as CSV text. */
export function runToCsv(options: RunOptions): RunResult {
  const { seed, ticks, every, overrides, onProgress } = options;
  const histEvery = options.histEvery ?? 0;
  const bins = options.bins ?? 20;
  const behaviorEvery = options.behaviorEvery ?? 100;
  if (!Number.isInteger(ticks) || ticks < 0) throw new Error("ticks must be a whole number, 0 or more");
  if (!Number.isInteger(every) || every < 1) throw new Error("every must be a whole number, 1 or more");
  if (!Number.isInteger(histEvery) || histEvery < 0) throw new Error("histEvery must be a whole number, 0 or more");
  if (!Number.isInteger(bins) || bins < 1) throw new Error("bins must be a whole number, 1 or more");
  if (!Number.isInteger(behaviorEvery) || behaviorEvery < 0) throw new Error("behaviorEvery must be a whole number, 0 or more");

  const sim = options.sim ?? new Simulation(seed, overrides);
  const behaviorSamples: BehaviorStats[] = [];
  const behavior = (): BehaviorStats => averageBehavior(behaviorSamples);
  const lines: string[] = [CSV_COLUMNS.join(","), statsRow(sim.stats(), behavior())];
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
    // Now and then, watch one tick closely to see how purposefully organisms turn.
    const measure = behaviorEvery > 0 && (t - 1) % behaviorEvery === 0 && sim.count > 0;
    if (measure) sim.behaviorBefore();
    sim.step();
    if (measure) {
      behaviorSamples.push(sim.behaviorAfter());
      if (behaviorSamples.length > BEHAVIOR_WINDOW) behaviorSamples.shift();
    }
    const atInterval = t % every === 0 || t === ticks;
    if (atInterval) lines.push(statsRow(sim.stats(), behavior()));
    if (histEvery > 0 && (t % histEvery === 0 || t === ticks)) recordHistograms();
    if (onProgress && t % progressStep === 0) onProgress(t / ticks);
    if (sim.count === 0) {
      // Record the moment of extinction (unless this tick was just recorded) and stop.
      if (!atInterval) lines.push(statsRow(sim.stats(), behavior()));
      extinct = true;
      break;
    }
  }

  return {
    csv: lines.join("\n") + "\n",
    histCsv: histLines.length > 0 ? histLines.join("\n") + "\n" : "",
    rows: lines.length - 1,
    final: sim.stats(),
    behavior: behavior(),
    events: [...sim.events],
    extinct,
    sim,
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
  herbivores: number;
  omnivores: number;
  carnivores: number;
  totalKills: number;
  /** How many attacks were tried (kills / attacks = success rate), and brain size and behavior at the end. */
  totalAttacks: number;
  brainConnectionsHerbivores: number;
  brainConnectionsCarnivores: number;
  chaseTurn: number;
  fleeTurn: number;
  /** Species alive at the end, and how many there have ever been. */
  speciesAlive: number;
  speciesEver: number;
  /** Tick of each notable first, or null if it never happened. */
  firsts: Record<SimEventKind, number | null>;
  /** Mean of each trait at the end. */
  means: Record<string, number>;
}

const EVENT_KINDS: SimEventKind[] = ["firstScavenger", "firstKill", "firstPredator", "firstCarnivore"];

export function summarize(seed: number, result: RunResult): SeedSummary {
  const means: Record<string, number> = {};
  for (const gene of GENES) means[gene] = result.final.traits[gene].mean;
  const firsts = {} as Record<SimEventKind, number | null>;
  for (const kind of EVENT_KINDS) firsts[kind] = result.events.find((e) => e.kind === kind)?.tick ?? null;
  return {
    seed,
    extinct: result.extinct,
    tick: result.final.tick,
    population: result.final.population,
    herbivores: result.final.classes.herbivores,
    omnivores: result.final.classes.omnivores,
    carnivores: result.final.classes.carnivores,
    totalKills: result.final.totalKills,
    totalAttacks: result.final.totalAttacks,
    brainConnectionsHerbivores: result.final.brain.herbivores.connections,
    brainConnectionsCarnivores: result.final.brain.carnivores.connections,
    chaseTurn: result.behavior.chase,
    fleeTurn: result.behavior.flee,
    speciesAlive: result.final.species.alive,
    speciesEver: result.final.species.ever,
    firsts,
    means,
  };
}

export interface FoodWebSummary {
  /** Seeds that survived to the end. */
  survivors: number;
  /** How many seeds ever produced each kind of first, and the median tick at which it happened. */
  emerged: Record<SimEventKind, { seeds: number; medianTick: number | null }>;
  /** Seeds that end with a real carnivore population (at least this many). */
  withCarnivoresAtEnd: number;
  carnivoreThreshold: number;
}

/** How many seeds grew a food web, and how fast. */
export function foodWebSummary(summaries: readonly SeedSummary[], carnivoreThreshold = 20): FoodWebSummary {
  const emerged = {} as FoodWebSummary["emerged"];
  for (const kind of EVENT_KINDS) {
    const ticks = summaries.map((s) => s.firsts[kind]).filter((t): t is number => t !== null).sort((a, b) => a - b);
    emerged[kind] = { seeds: ticks.length, medianTick: ticks.length > 0 ? ticks[Math.floor(ticks.length / 2)]! : null };
  }
  return {
    survivors: summaries.filter((s) => !s.extinct).length,
    emerged,
    withCarnivoresAtEnd: summaries.filter((s) => !s.extinct && s.carnivores >= carnivoreThreshold).length,
    carnivoreThreshold,
  };
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
