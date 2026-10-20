import { GENE, GENE_COUNT, GENES, type Simulation, type SimStats } from "@evo/sim-core";

/**
 * Things an experiment can record. Each measure only READS the world (a test checks that recording
 * never changes what happens). Every sample is worked out from the world as it stands, never from
 * earlier samples, so a run that is saved and resumed records exactly what an unbroken run would.
 * Counters that grow over the run (kills, births) are recorded as running totals; rates are
 * worked out afterwards from the rows.
 */
export type Row = Record<string, number>;

export interface SampleContext {
  sim: Simulation;
  /** The world's own summary, worked out once per sample and shared by every measure. */
  stats(): SimStats;
}

export interface Measure {
  describe: string;
  sample(ctx: SampleContext): Row;
  /** Run-level numbers from the recorded rows (and the finished world). */
  summarize?(rows: Row[], sim: Simulation): Record<string, number | null>;
}

/** Reading a few internal arrays the simulation keeps for itself (read only). */
type Internals = {
  loadOn: boolean;
  badSpots(i: number): number;
  iced: Uint8Array;
  biome: Uint8Array;
  thermalPref: Float32Array;
  foodCapacity: Float64Array;
  activeGene: boolean[];
};
const inside = (sim: Simulation): Internals => sim as unknown as Internals;

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
/** The rows from the second half of the run (when the world has settled). */
const lateRows = (rows: Row[]): Row[] => rows.slice(Math.floor(rows.length / 2));
const lateMean = (rows: Row[], key: string): number | null => {
  const values = lateRows(rows).map((r) => r[key]).filter((v): v is number => v !== undefined && !Number.isNaN(v));
  return values.length ? round(mean(values)) : null;
};
const round = (x: number, places = 4): number => Math.round(x * 10 ** places) / 10 ** places;
/** Change per 1,000 ticks of a running total over the second half. */
const lateRate = (rows: Row[], key: string): number | null => {
  const late = lateRows(rows);
  if (late.length < 2) return null;
  const first = late[0]!;
  const last = late[late.length - 1]!;
  const span = last.tick! - first.tick!;
  return span > 0 ? round(((last[key]! - first[key]!) / span) * 1000, 3) : null;
};

/** Gini coefficient: 0 = perfectly even, toward 1 = all in a few places. */
function gini(values: number[]): number {
  const v = [...values].sort((a, b) => a - b);
  let sum = 0;
  let weighted = 0;
  v.forEach((x, i) => {
    sum += x;
    weighted += (i + 1) * x;
  });
  return sum > 0 ? (2 * weighted) / (v.length * sum) - (v.length + 1) / v.length : 0;
}

/** Share of a trait's variation that lies between groups (0 = groups alike, 1 = groups entirely different). */
function between(groups: Map<number, number[]>): number {
  const all = [...groups.values()].flat();
  if (all.length < 2) return NaN;
  const m = mean(all);
  let total = 0;
  let betweenSum = 0;
  for (const x of all) total += (x - m) ** 2;
  for (const g of groups.values()) betweenSum += g.length * (mean(g) - m) ** 2;
  return total > 0 ? betweenSum / total : 0;
}

const gene = (sim: Simulation, i: number, g: number): number => sim.genes[i * GENE_COUNT + g]!;

export const MEASURES: Record<string, Measure> = {
  population: {
    describe: "how many organisms are alive",
    sample: ({ sim }) => ({ population: sim.count }),
    summarize: (rows) => ({
      meanPopulationLate: lateMean(rows, "population"),
      lowestPopulation: rows.length ? Math.min(...rows.map((r) => r.population!)) : null,
    }),
  },

  classes: {
    describe: "plant eaters, mixed eaters and meat eaters (by diet gene: under 0.25, between, over 0.75)",
    sample: ({ stats }) => {
      const c = stats().classes;
      return { plantEaters: c.herbivores, mixedEaters: c.omnivores, meatEaters: c.carnivores };
    },
    summarize: (rows) => {
      const late = lateRows(rows);
      return {
        meatEatersLate: lateMean(rows, "meatEaters"),
        shareOfTimeWith5PlusMeatEaters: late.length ? round(late.filter((r) => r.meatEaters! >= 5).length / late.length, 3) : null,
      };
    },
  },

  trophicLevels: {
    describe: "how many feeding levels are present (plant eaters, mixed eaters, meat eaters with at least 5 members each)",
    sample: ({ stats }) => {
      const c = stats().classes;
      return { trophicLevels: (c.herbivores >= 5 ? 1 : 0) + (c.omnivores >= 5 ? 1 : 0) + (c.carnivores >= 5 ? 1 : 0) };
    },
    summarize: (rows) => ({ trophicLevelsLate: lateMean(rows, "trophicLevels") }),
  },

  species: {
    describe: "species alive and ever, and Shannon diversity of the living species (needs species tracking)",
    sample: ({ sim, stats }) => {
      const s = stats().species;
      const counts = new Map<number, number>();
      for (let i = 0; i < sim.count; i++) {
        const sp = sim.speciesOf(i);
        if (sp > 0) counts.set(sp, (counts.get(sp) ?? 0) + 1);
      }
      let n = 0;
      for (const k of counts.values()) n += k;
      let h = 0;
      for (const k of counts.values()) h -= (k / n) * Math.log(k / n);
      return { speciesAlive: s.alive, speciesEver: s.ever, shannon: n > 0 ? round(h) : 0 };
    },
    summarize: (rows) => ({ speciesAliveLate: lateMean(rows, "speciesAlive"), shannonLate: lateMean(rows, "shannon"), speciesEver: rows.at(-1)?.speciesEver ?? null }),
  },

  dietSpread: {
    describe: "average and highest diet gene, and the share above 0.25, 0.5 and 0.75",
    sample: ({ sim }) => {
      const n = sim.count;
      let sum = 0;
      let max = 0;
      let over25 = 0;
      let over50 = 0;
      let over75 = 0;
      for (let i = 0; i < n; i++) {
        const d = gene(sim, i, GENE.diet);
        sum += d;
        if (d > max) max = d;
        if (d > 0.25) over25++;
        if (d > 0.5) over50++;
        if (d > 0.75) over75++;
      }
      return n ? { dietMean: round(sum / n), dietMax: round(max), dietOver25: round(over25 / n), dietOver50: round(over50 / n), dietOver75: round(over75 / n) } : { dietMean: 0, dietMax: 0, dietOver25: 0, dietOver50: 0, dietOver75: 0 };
    },
    summarize: (rows) => ({ dietMeanLate: lateMean(rows, "dietMean"), dietMaxEver: rows.length ? Math.max(...rows.map((r) => r.dietMax!)) : null, dietOver50Late: lateMean(rows, "dietOver50") }),
  },

  kills: {
    describe: "kills and attacks so far (running totals)",
    sample: ({ sim }) => ({ kills: sim.totalKills, attacks: sim.totalAttacks }),
    summarize: (rows) => {
      const k = lateRate(rows, "kills");
      const a = lateRate(rows, "attacks");
      return { killsPer1000TicksLate: k, attackSuccessLate: k !== null && a ? round(k / a, 3) : null };
    },
  },

  sex: {
    describe: "births so far, births with two parents so far, and the average sex gene",
    sample: ({ sim }) => {
      let sum = 0;
      for (let i = 0; i < sim.count; i++) sum += gene(sim, i, GENE.sex);
      return { births: sim.totalBirths, twoParentBirths: sim.sexualBirths, sexGene: sim.count ? round(sum / sim.count) : 0 };
    },
    summarize: (rows) => {
      const b = lateRate(rows, "births");
      const two = lateRate(rows, "twoParentBirths");
      return { twoParentShareLate: b ? round(two! / b, 3) : null, sexGeneLate: lateMean(rows, "sexGene") };
    },
  },

  mutationLoad: {
    describe: "average number of harmful mutations per organism (needs mutationLoadRate)",
    sample: ({ sim }) => {
      const s = inside(sim);
      if (!s.loadOn || sim.count === 0) return { mutationLoad: 0 };
      let sum = 0;
      for (let i = 0; i < sim.count; i++) sum += s.badSpots(i);
      return { mutationLoad: round(sum / sim.count, 3) };
    },
    summarize: (rows) => ({ mutationLoadLate: lateMean(rows, "mutationLoad") }),
  },

  colonies: {
    describe: "share of cells in colonies, average colony size, largest colony",
    sample: ({ stats, sim }) => {
      const c = stats().colonies;
      return { colonyShare: sim.count ? round(c.cells / sim.count) : 0, colonyMeanSize: round(c.meanSize, 3), colonyLargest: c.maxSize };
    },
    summarize: (rows) => {
      const first = rows.find((r) => r.colonyLargest! >= 4);
      return { colonyShareLate: lateMean(rows, "colonyShare"), firstColonyOf4AtTick: first ? first.tick! : null };
    },
  },

  firsts: {
    describe: "when the first kill, predator, scavenger and meat eater appeared",
    sample: ({ sim }) => ({ notableFirsts: sim.events.length }),
    summarize: (_rows, sim) => {
      const at = (kind: string): number | null => sim.events.find((e) => e.kind === kind)?.tick ?? null;
      return { firstKillAt: at("firstKill"), firstPredatorAt: at("firstPredator"), firstScavengerAt: at("firstScavenger"), firstCarnivoreAt: at("firstCarnivore") };
    },
  },

  shortages: {
    describe: "nutrient store and water: averages and the share running short (needs nutrientMode / drinking)",
    sample: ({ stats }) => {
      const s = stats();
      return { nutrientStore: round(s.nutrientStore.mean, 3), nutrientShort: round(s.nutrientStore.deficient, 3), water: round(s.hydration.mean, 3), dehydrated: round(s.hydration.dehydrated, 3) };
    },
    summarize: (rows) => ({ nutrientShortLate: lateMean(rows, "nutrientShort"), dehydratedLate: lateMean(rows, "dehydrated") }),
  },

  land: {
    describe: "ice cover (climate biomes) and how unevenly soil nutrient is spread (Gini)",
    sample: ({ sim }) => {
      const s = inside(sim);
      let ice = 0;
      for (let c = 0; c < s.iced.length; c++) ice += s.iced[c]!;
      const soil: number[] = [];
      for (let c = 0; c < sim.nutrient.length; c++) if (s.foodCapacity[c]! > 0) soil.push(sim.nutrient[c]!);
      return { iceCells: ice, soilGini: round(gini(soil), 3) };
    },
    summarize: (rows) => ({ iceCellsMax: rows.length ? Math.max(...rows.map((r) => r.iceCells!)) : null, soilGiniLate: lateMean(rows, "soilGini") }),
  },

  disasters: {
    describe: "how many of each kind of world event has happened so far",
    sample: ({ sim }) => {
      const out: Row = {};
      for (const e of sim.worldEvents) if (e.kind !== "recovery") out[`event_${e.kind}`] = (out[`event_${e.kind}`] ?? 0) + 1;
      return out;
    },
  },

  biomeSpecialization: {
    describe: "how much temperature preference and palate differ between biomes (0 = alike, 1 = entirely different)",
    sample: ({ sim }) => {
      const s = inside(sim);
      if (s.biome.length === 0) return { biomeThermal: NaN, biomePalate: NaN };
      const cs = sim.config.foodCellSize;
      const thermal = new Map<number, number[]>();
      const palate = new Map<number, number[]>();
      for (let i = 0; i < sim.count; i++) {
        const b = s.biome[Math.floor(sim.y[i]! / cs) * sim.gridWidth + Math.floor(sim.x[i]! / cs)]!;
        if (s.thermalPref.length) (thermal.get(b) ?? thermal.set(b, []).get(b)!).push(s.thermalPref[i]!);
        (palate.get(b) ?? palate.set(b, []).get(b)!).push(gene(sim, i, GENE.palate));
      }
      return { biomeThermal: round(between(thermal), 3), biomePalate: round(between(palate), 3) };
    },
    summarize: (rows) => ({ biomeThermalLate: lateMean(rows, "biomeThermal"), biomePalateLate: lateMean(rows, "biomePalate") }),
  },

  traits: {
    describe: "the average of every gene that is in use",
    sample: ({ sim, stats }) => {
      const t = stats().traits;
      const active = inside(sim).activeGene;
      const out: Row = {};
      GENES.forEach((g, k) => {
        if (active[k]) out[`mean_${g}`] = round(t[g].mean);
      });
      return out;
    },
  },
};

/** Record every chosen measure for the world as it stands now. */
export function sampleWorld(sim: Simulation, measures: string[]): Row {
  let cached: SimStats | null = null;
  const ctx: SampleContext = { sim, stats: () => (cached ??= sim.stats()) };
  const row: Row = { tick: sim.tick };
  for (const name of measures) Object.assign(row, MEASURES[name]!.sample(ctx));
  return row;
}

/** Run-level summary numbers for the chosen measures. */
export function summarizeRun(rows: Row[], sim: Simulation, measures: string[]): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const name of measures) {
    const m = MEASURES[name]!;
    if (m.summarize) Object.assign(out, m.summarize(rows, sim));
  }
  return out;
}
