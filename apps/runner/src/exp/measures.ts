import { GENE, GENE_COUNT, GENES, INPUT, LEARN_SLOTS, OUTPUT, OUTPUT_START, type CostBreakdown, type Simulation, type SimStats } from "@evo/sim-core";

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
  food: Float64Array;
  grazing: Float32Array;
  foul: Float32Array;
  soilHealth: Float32Array;
  ash: Float32Array;
  cellType: Uint8Array;
  bondCount(i: number): number;
  bondsOn: boolean;
  energy: Float32Array | Float64Array;
  threshold: Float32Array;
  age: Uint32Array;
  learnDelta: Float32Array;
  placeVal: Float32Array;
  placeSlots: Uint8Array;
  wmCells: Uint8Array;
  plantTaken: Float32Array | Float64Array;
  meatTaken: Float32Array | Float64Array;
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

/** Late-half rate of a running total per 1,000 ticks, divided by the late-half average population. */
const perAnimal = (rows: Row[], key: string): number | null => {
  const rate = lateRate(rows, key);
  const pop = lateMean(rows, "population");
  return rate !== null && pop ? round(rate / pop, 5) : null;
};
const share = (part: number | null, whole: number | null): number | null => (part !== null && whole ? round(part / whole, 4) : null);
/** Mean of an array over the cells that can grow plants (land), or over every cell when there is no terrain. */
function landMean(values: ArrayLike<number>, capacity: Float64Array): number {
  let sum = 0;
  let n = 0;
  for (let c = 0; c < values.length; c++) {
    if (capacity[c]! <= 0) continue;
    sum += values[c]!;
    n++;
  }
  return n ? sum / n : 0;
}
const COST_PARTS: (keyof CostBreakdown)[] = ["body", "repair", "torporGene", "load", "luck", "toxinGene", "colonySaving", "signal", "thirst", "deficiency", "wear", "sickness", "stressCalm", "fat", "torporRest", "thermal", "upkeep", "movement", "sensing", "attack", "armor", "brain", "total"];
const LEDGER_LINES: [string, keyof SimStats["ledger"]][] = [
  ["in_sunlight", "sunlightIn"],
  ["eaten_plants", "plantEaten"],
  ["eaten_meat", "meatEaten"],
  ["lost_digestion", "digestionLoss"],
  ["lost_decay", "decayLoss"],
  ["burned_upkeep", "basalBurned"],
  ["burned_movement", "movementBurned"],
  ["burned_sensing", "sensingBurned"],
  ["burned_attack", "attackBurned"],
  ["burned_armor", "armorBurned"],
  ["burned_brain", "brainBurned"],
];

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

  costs: {
    describe: "what the average organism pays per tick, split into every part of upkeep (body, harmful mutations, aging, heat and cold, sickness...) plus movement, sensing, weapons, armor and brain",
    sample: ({ sim }) => {
      const c = sim.costBreakdown();
      const out: Row = {};
      for (const k of COST_PARTS) out[`cost_${k}`] = round(c[k], 6);
      return out;
    },
    summarize: (rows) => {
      const out: Record<string, number | null> = {};
      const total = lateMean(rows, "cost_total");
      for (const k of COST_PARTS) {
        const v = lateMean(rows, `cost_${k}`);
        out[`cost_${k}_late`] = v === null ? null : round(v, 6);
        if (k !== "total") out[`costShare_${k}_late`] = share(v, total);
      }
      return out;
    },
  },

  energyBudget: {
    describe: "the energy ledger as running totals: sunlight in, plants and meat eaten, digestion and decay losses, and energy burned on each activity",
    sample: ({ stats }) => {
      const L = stats().ledger;
      const out: Row = {};
      for (const [name, key] of LEDGER_LINES) out[name] = round(L[key], 3);
      return out;
    },
    summarize: (rows) => {
      const out: Record<string, number | null> = {};
      for (const [name] of LEDGER_LINES) out[`${name}_perAnimalPer1000_late`] = perAnimal(rows, name);
      const plants = lateRate(rows, "eaten_plants");
      const meat = lateRate(rows, "eaten_meat");
      out.meatShareOfFoodLate = plants !== null && meat !== null ? share(meat, plants + meat) : null;
      out.digestionLossShareLate = plants !== null && meat !== null ? share(lateRate(rows, "lost_digestion"), plants + meat) : null;
      return out;
    },
  },

  deaths: {
    describe: "deaths so far by cause: killed by another organism, starved (every cost, including old age, sickness and harmful mutations, ends this way) and killed by a disaster",
    sample: ({ sim }) => ({ deaths: sim.totalDeaths, deathsKilled: sim.totalKills, deathsStarved: sim.totalStarved, deathsDisaster: sim.totalDeaths - sim.totalKills - sim.totalStarved }),
    summarize: (rows) => {
      const all = lateRate(rows, "deaths");
      return {
        deathsPerAnimalPer1000Late: perAnimal(rows, "deaths"),
        killedShareLate: share(lateRate(rows, "deathsKilled"), all),
        starvedShareLate: share(lateRate(rows, "deathsStarved"), all),
        disasterShareLate: share(lateRate(rows, "deathsDisaster"), all),
      };
    },
  },

  births: {
    describe: "births so far, and births that could not happen, by cause (no soil nutrient for the body, not enough energy, or both)",
    sample: ({ sim, stats }) => {
      const s = stats();
      return { births: sim.totalBirths, blockedSoil: s.blockedBirthsSoil, blockedEnergy: s.blockedBirthsEnergy, blockedBoth: s.blockedBirthsBoth };
    },
    summarize: (rows) => {
      const born = lateRate(rows, "births");
      return {
        birthsPerAnimalPer1000Late: perAnimal(rows, "births"),
        blockedSoilPerBirthLate: share(lateRate(rows, "blockedSoil"), born),
        blockedEnergyPerBirthLate: share(lateRate(rows, "blockedEnergy"), born),
        blockedBothPerBirthLate: share(lateRate(rows, "blockedBoth"), born),
      };
    },
  },

  condition: {
    describe: "how the living are doing: average age, and the share that are hungry (under a quarter of the energy they need to breed)",
    sample: ({ sim }) => {
      const s = inside(sim);
      let age = 0;
      let hungry = 0;
      for (let i = 0; i < sim.count; i++) {
        age += s.age[i]!;
        if (s.energy[i]! < 0.25 * s.threshold[i]!) hungry++;
      }
      return sim.count ? { meanAge: round(age / sim.count, 1), hungryShare: round(hungry / sim.count, 4) } : { meanAge: 0, hungryShare: 0 };
    },
    summarize: (rows) => ({ meanAgeLate: lateMean(rows, "meanAge"), hungryShareLate: lateMean(rows, "hungryShare") }),
  },

  genesAtLimits: {
    describe: "for every gene in use, the share of organisms within 0.05 of its lower and upper limit (a gene pinned at a limit usually means a cost or benefit is set wrong)",
    sample: ({ sim }) => {
      const active = inside(sim).activeGene;
      const out: Row = {};
      GENES.forEach((name, k) => {
        if (!active[k]) return;
        let low = 0;
        let high = 0;
        for (let i = 0; i < sim.count; i++) {
          const v = gene(sim, i, k);
          if (v <= 0.05) low++;
          else if (v >= 0.95) high++;
        }
        out[`low_${name}`] = sim.count ? round(low / sim.count, 4) : 0;
        out[`high_${name}`] = sim.count ? round(high / sim.count, 4) : 0;
      });
      return out;
    },
    summarize: (rows) => {
      const out: Record<string, number | null> = {};
      const keys = Object.keys(rows[0] ?? {}).filter((k) => k.startsWith("low_") || k.startsWith("high_"));
      let pinned = 0;
      for (const k of keys) {
        const v = lateMean(rows, k);
        out[`${k}_late`] = v;
        if (v !== null && v > 0.5) pinned++;
      }
      out.pinnedGenesLate = pinned;
      return out;
    },
  },

  disease: {
    describe: "share of organisms sick now, strains alive, and infections so far (needs disease)",
    sample: ({ sim, stats }) => {
      const d = stats().disease;
      return { sickShare: sim.count ? round(d.infected / sim.count, 4) : 0, strains: d.strains, infections: d.totalInfections };
    },
    summarize: (rows) => ({ sickShareLate: lateMean(rows, "sickShare"), strainsLate: lateMean(rows, "strains"), infectionsPerAnimalPer1000Late: perAnimal(rows, "infections") }),
  },

  brains: {
    describe: "average brain size: thinking units and working connections (needs brains)",
    sample: ({ stats }) => {
      const b = stats().brain.all;
      return { brainHidden: round(b.hidden, 3), brainConnections: round(b.connections, 2) };
    },
    summarize: (rows) => ({ brainHiddenLate: lateMean(rows, "brainHidden"), brainConnectionsLate: lateMean(rows, "brainConnections") }),
  },

  colonyMakeup: {
    describe: "among cells in colonies, the share of each cell type (generalist, feeder, mover, photosynthesizer, armor, sensor; needs cell types)",
    sample: ({ sim }) => {
      const s = inside(sim);
      const counts = [0, 0, 0, 0, 0, 0];
      let inColony = 0;
      for (let i = 0; i < sim.count && s.bondsOn; i++) {
        if (s.bondCount(i) === 0) continue;
        inColony++;
        counts[s.cellType.length ? s.cellType[i]! : 0]!++; // without cell types every cell is a generalist
      }
      const names = ["generalist", "feeder", "mover", "photo", "armor", "sensor"];
      const out: Row = {};
      names.forEach((n, k) => (out[`cells_${n}`] = inColony ? round(counts[k]! / inColony, 4) : 0));
      return out;
    },
    summarize: (rows) => {
      const out: Record<string, number | null> = {};
      for (const n of ["generalist", "feeder", "mover", "photo", "armor", "sensor"]) out[`cells_${n}_late`] = lateMean(rows, `cells_${n}`);
      return out;
    },
  },

  landHealth: {
    describe: "the land: how full the plants are, soil nutrient, grazing damage, fouling, soil health and the share of worn ground (soil health under 0.5), volcanic ash, and where the world's matter sits",
    sample: ({ sim }) => {
      const s = inside(sim);
      const cap = s.foodCapacity;
      let food = 0;
      let room = 0;
      let worn = 0;
      let land = 0;
      for (let c = 0; c < cap.length; c++) {
        if (cap[c]! <= 0) continue;
        land++;
        food += s.food[c]!;
        room += cap[c]!;
        if (s.soilHealth.length && s.soilHealth[c]! < 0.5) worn++;
      }
      const m = sim.matterAudit();
      return {
        plantFill: room ? round(food / room, 4) : 0,
        soilNutrientMean: round(landMean(sim.nutrient, cap), 4),
        grazingMean: s.grazing.length ? round(landMean(s.grazing, cap), 4) : 0,
        foulMean: s.foul.length ? round(landMean(s.foul, cap), 4) : 0,
        soilHealthMean: s.soilHealth.length ? round(landMean(s.soilHealth, cap), 4) : 1,
        wornShare: land && s.soilHealth.length ? round(worn / land, 4) : 0,
        ashMean: s.ash.length ? round(landMean(s.ash, cap), 4) : 0,
        matterInSoil: round(m.soilNutrient / m.total, 4),
        matterInPlants: round(m.plants / m.total, 4),
        matterInCorpses: round(m.corpses / m.total, 4),
        matterInDetritus: round(m.detritus / m.total, 4),
        matterInBodies: round((m.bodies + m.stores) / m.total, 4),
      };
    },
    summarize: (rows) => {
      const out: Record<string, number | null> = {};
      for (const k of ["plantFill", "soilNutrientMean", "grazingMean", "foulMean", "soilHealthMean", "wornShare", "ashMean", "matterInSoil", "matterInPlants", "matterInCorpses", "matterInDetritus", "matterInBodies"]) out[`${k}Late`] = lateMean(rows, k);
      return out;
    },
  },

  learning: {
    describe: "learning during life: how much the average brain has learned, food gathered per tick by age (young under 250 ticks, middle 250 to 1,000, old over 1,000; rising with age is the sign of learning), and place memory (places it can hold, places remembered)",
    sample: ({ sim }) => {
      const s = inside(sim);
      let learned = 0;
      const sums = [0, 0, 0];
      const counts = [0, 0, 0];
      for (let i = 0; i < sim.count; i++) {
        if (s.learnDelta.length) for (let k = 0; k < LEARN_SLOTS; k++) learned += Math.abs(s.learnDelta[i * LEARN_SLOTS + k]!);
        const age = s.age[i]!;
        if (age < 50) continue; // too young to say
        const band = age < 250 ? 0 : age < 1000 ? 1 : 2;
        sums[band] = sums[band]! + (s.plantTaken[i]! + s.meatTaken[i]!) / age;
        counts[band] = counts[band]! + 1;
      }
      const rate = (b: number): number => (counts[b]! ? round(sums[b]! / counts[b]!, 5) : NaN);
      // Place memory: how many places animals can hold, and how many they actually remember.
      let capacity = 0;
      let filled = 0;
      if (s.placeSlots.length) {
        for (let i = 0; i < sim.count; i++) {
          capacity += s.placeSlots[i]!;
          for (let j = 0; j < 4; j++) if (s.placeVal[i * 4 + j]! > 0) filled++;
        }
      }
      return {
        learnedChange: sim.count ? round(learned / sim.count, 4) : 0,
        intakeYoung: rate(0),
        intakeMiddle: rate(1),
        intakeOld: rate(2),
        placeCapacity: sim.count ? round(capacity / sim.count, 3) : 0,
        placesFilled: sim.count ? round(filled / sim.count, 3) : 0,
        memoryCells: s.wmCells.length && sim.count ? round(s.wmCells.subarray(0, sim.count).reduce((a, b) => a + b, 0) / sim.count, 3) : NaN, // (only the living: the array is sized for the most animals a world can hold)
      };
    },
    summarize: (rows) => {
      const young = lateMean(rows, "intakeYoung");
      const old = lateMean(rows, "intakeOld");
      return { memoryCellsLate: lateMean(rows, "memoryCells"), placeCapacityLate: lateMean(rows, "placeCapacity"), placesFilledLate: lateMean(rows, "placesFilled"), learnedChangeLate: lateMean(rows, "learnedChange"), intakeYoungLate: young, intakeMiddleLate: lateMean(rows, "intakeMiddle"), intakeOldLate: old, intakeOldOverYoungLate: young && old !== null ? round(old / young, 4) : null };
    },
  },

  brainUse: {
    describe: "how often evolved brains are wired to memory, home and the learning senses, against inputs that are always 0 in this world (the baseline for wiring by chance): working connections per input; and connections into working memory's hold gates, per gate",
    sample: ({ sim }) => {
      const c = sim.config;
      const groups: Record<string, number[]> = {
        memory: [INPUT.memory0, INPUT.memory1, INPUT.memory2, INPUT.memory3],
        home: [INPUT.homeAhead, INPUT.homeSide, INPUT.homeDistance],
        learnSenses: [INPUT.energyChange, INPUT.surprise, INPUT.yearA, INPUT.yearB, INPUT.lastTurn, INPUT.lastSpeed],
        place: [INPUT.placeAhead, INPUT.placeSide, INPUT.placeDistance],
      };
      // Inputs that read 0 for everyone in this world: any wiring to them is chance (or drift).
      const zero: number[] = [];
      if (!(c.signaling === 1 && c.multicellular === 1)) zero.push(INPUT.colonyThreatAhead, INPUT.colonyThreatSide, INPUT.colonyThreatNear, INPUT.colonyFoodAhead, INPUT.colonyFoodSide, INPUT.colonyFoodNear);
      if (c.drinking === 0) zero.push(INPUT.thirst);
      if (c.nutrientMode === 0) zero.push(INPUT.nutrientStore);
      if (c.nutrientMode < 2) zero.push(INPUT.plantRichHere, INPUT.plantRichAhead, INPUT.plantRichSide);
      groups.baseline = zero;
      const out: Row = {};
      if (c.brainMode === 0 || sim.count === 0) return out;
      const counts: Record<string, number> = {};
      // Working memory's hold gates (outputs): connections into them, per brain and per gate.
      const gates = [OUTPUT.gate0, OUTPUT.gate1, OUTPUT.gate2, OUTPUT.gate3].map((o) => OUTPUT_START + o);
      let intoGates = 0;
      for (let i = 0; i < sim.count; i++) {
        const links = sim.describe(i).brain?.links ?? [];
        for (const l of links) {
          for (const [g, ins] of Object.entries(groups)) if (ins.includes(l.from)) counts[g] = (counts[g] ?? 0) + 1;
          if (gates.includes(l.to)) intoGates++;
        }
      }
      for (const [g, ins] of Object.entries(groups)) out[`wired_${g}`] = ins.length ? round((counts[g] ?? 0) / sim.count / ins.length, 4) : NaN;
      out.wired_gates = round(intoGates / sim.count / gates.length, 4);
      return out;
    },
    summarize: (rows) => {
      const out: Record<string, number | null> = {};
      for (const g of ["memory", "home", "learnSenses", "place", "baseline", "gates"]) out[`wired_${g}_late`] = lateMean(rows, `wired_${g}`);
      return out;
    },
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

/**
 * Measures whose drift over a run matters (a slow meltdown, worn ground). For each one recorded,
 * the summary gets trend_<key>: how much it changed across the last quarter of the run, as a
 * share of its level then (from a straight-line fit, so one odd sample does not decide it).
 * Near 0 means it has settled.
 */
export const TREND_KEYS = ["learnedChange", "population", "mutationLoad", "dietMean", "dietMax", "sexGene", "colonyShare", "sickShare", "wornShare", "soilHealthMean", "foulMean", "grazingMean", "plantFill", "shannon", "brainConnections", "cost_total", "cost_load", "hungryShare"];

/** Change across the last quarter of the rows (straight-line fit), relative to the mean level there. */
export function lastQuarterTrend(rows: Row[], key: string): number | null {
  const last = rows.slice(Math.floor((rows.length * 3) / 4)).filter((r) => r[key] !== undefined && !Number.isNaN(r[key]));
  if (last.length < 4) return null;
  const xs = last.map((r) => r.tick!);
  const ys = last.map((r) => r[key]!);
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  for (let k = 0; k < xs.length; k++) {
    sxy += (xs[k]! - mx) * (ys[k]! - my);
    sxx += (xs[k]! - mx) * (xs[k]! - mx);
  }
  if (sxx === 0 || my === 0) return null;
  const span = xs[xs.length - 1]! - xs[0]!;
  return round(((sxy / sxx) * span) / Math.abs(my), 4);
}

/** Run-level summary numbers for the chosen measures, plus the end-of-run trends. */
export function summarizeRun(rows: Row[], sim: Simulation, measures: string[]): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const name of measures) {
    const m = MEASURES[name]!;
    if (m.summarize) Object.assign(out, m.summarize(rows, sim));
  }
  for (const key of TREND_KEYS) if (rows.length && key in rows[0]!) out[`trend_${key}`] = lastQuarterTrend(rows, key);
  return out;
}

/** The measure names an experiment asked for, with "all" standing for every measure. */
export function expandMeasures(names: string[]): string[] {
  return names.includes("all") ? Object.keys(MEASURES) : names;
}
