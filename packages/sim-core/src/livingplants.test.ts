import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";
import { DEFAULT_CONFIG } from "./config";
import { GENE } from "./genome";

// Living plants, step 1: plants that evolve (plantEvolution). Off by default.

type Hidden = { seedPlants(): void; foodCapacity: Float64Array; gridWidth: number; activeGene: boolean[] };
const h = (sim: Simulation): Hidden => sim as unknown as Hidden;

/** A small world with a climate, seasons and three fixed kinds of plant. */
const seasonal = (extra: Partial<SimConfig> = {}): Partial<SimConfig> => ({
  worldWidth: 128, worldHeight: 128, initialOrganisms: 150, speciesEvery: 0, climateMode: 1, yearLength: 600, plantTypes: 3, plantTypeScale: 4, ...extra,
});

describe("plants that evolve: settings", () => {
  it("are off by default, and checked", () => {
    expect(DEFAULT_CONFIG.plantEvolution).toBe(0);
    expect(new Simulation(1, { worldWidth: 64, worldHeight: 64 }).plantChem).toHaveLength(0);
    expect(() => new Simulation(1, { plantEvolution: 2 })).toThrow(/plantEvolution/);
    expect(() => new Simulation(1, { plantEvolution: 1, plantSeedEvery: 0 })).toThrow(/plantSeedEvery/);
    expect(() => new Simulation(1, { plantEvolution: 1, plantSeedRate: 2 })).toThrow(/plantSeedRate/);
    expect(() => new Simulation(1, { plantEvolution: 1, plantMutateChem: 0.8 })).toThrow(/plantMutateChem/);
  });

  it("put the palate gene in use, even with one kind of plant", () => {
    expect(h(new Simulation(1, { worldWidth: 64, worldHeight: 64 })).activeGene[GENE.palate]).toBe(false);
    expect(h(new Simulation(1, { worldWidth: 64, worldHeight: 64, plantEvolution: 1 })).activeGene[GENE.palate]).toBe(true);
  });
});

describe("plants that evolve: a start that changes nothing", () => {
  it("start as today's kinds: chemistry, season and warmth follow each cell's kind", () => {
    const sim = new Simulation(2, seasonal({ plantEvolution: 1 }));
    const kinds = sim.plantKindMap();
    for (let cell = 0; cell < kinds.length; cell++) {
      expect(sim.plantChem[cell]).toBe(kinds[cell]! / 2);
      expect(sim.plantSeason[cell]).toBeCloseTo(kinds[cell]! / 3, 12);
      expect(sim.plantWarm[cell]).toBeCloseTo(sim.config.plantTempOptimum + (kinds[cell]! - 1) * sim.config.plantTypeTempSpread, 12);
    }
  });

  it("with no seeding, a world with plants that evolve plays out exactly as one with fixed kinds", () => {
    const fixed = new Simulation(3, seasonal());
    const evolving = new Simulation(3, seasonal({ plantEvolution: 1, plantSeedRate: 0 }));
    fixed.run(600);
    evolving.run(600);
    expect(evolving.count).toBe(fixed.count);
    for (let cell = 0; cell < fixed.food.length; cell++) expect(evolving.food[cell]).toBe(fixed.food[cell]);
    for (let i = 0; i < fixed.count; i++) {
      expect(evolving.x[i]).toBe(fixed.x[i]);
      expect(evolving.energy[i]).toBe(fixed.energy[i]);
    }
  }, 60_000);
});

describe("plants that evolve: seeding", () => {
  /** A world with no animals and every cell full, so nothing changes until the test makes a bare cell. */
  const field = (extra: Partial<SimConfig> = {}): Simulation => {
    const sim = new Simulation(4, { worldWidth: 64, worldHeight: 64, initialOrganisms: 0, initialFoodFraction: 1, plantEvolution: 1, plantSeedRate: 1, plantMutateChem: 0, plantMutateSeason: 0, plantMutateWarm: 0, ...extra });
    sim.plantChem.fill(0.9);
    return sim;
  };

  it("ground eaten bare takes seed from a neighbour standing tall; full ground and its own genome stay as they are", () => {
    const sim = field();
    const gw = h(sim).gridWidth;
    const bare = 3 * gw + 3;
    sim.food[bare] = 0;
    sim.plantChem[bare] = 0.1;
    const full = 5 * gw + 5;
    sim.plantChem[full] = 0.2;
    const foodBefore = Array.from(sim.food);
    h(sim).seedPlants();
    expect(sim.plantChem[bare]).toBe(0.9); // every neighbour is full and holds 0.9: certain to be reseeded
    expect(sim.plantChem[full]).toBe(0.2); // full ground takes no seed
    expect(Array.from(sim.food)).toEqual(foodBefore); // only the label changes: no plant mass moves
  });

  it("bare ground with only bare neighbours takes no seed", () => {
    const sim = field();
    const gw = h(sim).gridWidth;
    const bare = 3 * gw + 3;
    for (const cell of [bare, bare + 1, bare - 1, bare + gw, bare - gw]) sim.food[cell] = 0;
    sim.plantChem[bare] = 0.1;
    h(sim).seedPlants();
    expect(sim.plantChem[bare]).toBe(0.1);
  });

  it("a seed mutates by at most the set amounts; chemistry stays from 0 to 1 and season wraps round the year", () => {
    const sim = field({ plantMutateChem: 0.05, plantMutateSeason: 0.05, plantMutateWarm: 0.05 });
    sim.plantChem.fill(0.99);
    sim.plantSeason.fill(0.99);
    const warm = sim.plantWarm[0]!;
    for (let cell = 0; cell < sim.food.length; cell += 2) sim.food[cell] = 0; // a checkerboard-ish pattern of bare cells
    h(sim).seedPlants();
    let changed = 0;
    for (let cell = 0; cell < sim.food.length; cell++) {
      expect(sim.plantChem[cell]).toBeGreaterThanOrEqual(0.94 - 1e-12);
      expect(sim.plantChem[cell]).toBeLessThanOrEqual(1);
      expect(sim.plantSeason[cell]).toBeGreaterThanOrEqual(0);
      expect(sim.plantSeason[cell]).toBeLessThan(1);
      expect(Math.abs(sim.plantWarm[cell]! - warm)).toBeLessThanOrEqual(0.05 + 1e-12);
      if (sim.plantChem[cell] !== 0.99) changed++;
    }
    expect(changed).toBeGreaterThan(0);
  });
});

describe("plants that evolve: the books and saving", () => {
  it("balance exactly with animals grazing, and a saved world carries on exactly", () => {
    const config = seasonal({ plantEvolution: 1, initialOrganisms: 250, nutrientMode: 2, plantMutateChem: 0.05, plantMutateWarm: 0.05 });
    const sim = new Simulation(5, config);
    sim.run(20);
    const e0 = sim.energyAudit().total;
    const m0 = sim.matterAudit().total;
    const L0 = { ...sim.ledger };
    sim.run(1500);
    const L = sim.ledger;
    expect(sim.count).toBeGreaterThan(0);
    const burned = (y: typeof L): number => y.basalBurned + y.movementBurned + y.sensingBurned + y.attackBurned + y.armorBurned + y.brainBurned;
    const expected = e0 + (L.sunlightIn - L0.sunlightIn) - (burned(L) - burned(L0)) - (L.digestionLoss - L0.digestionLoss) - (L.decayLoss - L0.decayLoss);
    expect(Math.abs(sim.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
    expect(Math.abs(sim.matterAudit().total - m0) / m0).toBeLessThan(1e-9);
    // Plants did evolve: some cells moved away from the three starting chemistries.
    const start = new Set([0, 0.5, 1]);
    expect(Array.from(sim.plantChem).some((x) => !start.has(x))).toBe(true);
    const copy = Simulation.load(sim.save());
    sim.run(300);
    copy.run(300);
    expect(copy.fingerprint()).toBe(sim.fingerprint());
    for (let cell = 0; cell < sim.plantChem.length; cell++) expect(copy.plantChem[cell]).toBe(sim.plantChem[cell]);
  }, 120_000);
});

describe("poisonous plants (plantToxins)", () => {
  type T = { plantHarm(i: number, cell: number): number; plantWorth(i: number, cell: number): number; cellOf: Uint32Array; seedPlants(): void; gridWidth: number };
  const t = (sim: Simulation): T => sim as unknown as T;

  it("are off by default and need plants that evolve", () => {
    expect(DEFAULT_CONFIG.plantToxins).toBe(0);
    expect(new Simulation(1, { worldWidth: 64, worldHeight: 64, plantEvolution: 1 }).plantToxin).toHaveLength(0);
    expect(() => new Simulation(1, { plantToxins: 1 })).toThrow(/plantEvolution/);
    expect(() => new Simulation(1, { plantEvolution: 1, plantToxins: 1, plantToxinGrowthCost: 2 })).toThrow(/plantToxinGrowthCost/);
  });

  it("harm = plantToxinHarm x toxin x mismatch: nothing to an animal whose palate matches, full harm at plantPalateWidth away", () => {
    const sim = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 1, plantEvolution: 1, plantToxins: 1, plantToxinHarm: 0.8, plantPalateWidth: 0.5 });
    const cell = t(sim).cellOf[0]!;
    sim.plantToxin[cell] = 0.5;
    sim.genes[GENE.palate] = 0.3;
    sim.plantChem[cell] = sim.genes[GENE.palate]!; // (genes are stored in single precision)
    expect(t(sim).plantHarm(0, cell)).toBe(0);
    sim.genes[GENE.palate] = 0.55; // half of plantPalateWidth away
    expect(t(sim).plantHarm(0, cell)).toBeCloseTo(0.8 * 0.5 * ((sim.genes[GENE.palate]! - sim.plantChem[cell]!) / 0.5), 12);
    sim.genes[GENE.palate] = 1;
    expect(t(sim).plantHarm(0, cell)).toBeCloseTo(0.8 * 0.5, 12);
    // Smell and steering see the poison: worth = how well it digests them, less the harm.
    expect(t(sim).plantWorth(0, cell)).toBeLessThan(0);
  });

  it("an animal that eats poison pays for it on the upkeep line; one adapted to the plant does not", () => {
    const meal = (palate: number, toxin: number): { energy: number; basal: number } => {
      const sim = new Simulation(2, { worldWidth: 64, worldHeight: 64, initialOrganisms: 1, speciesEvery: 0, initialFoodFraction: 1, plantEvolution: 1, plantSeedRate: 0, plantToxins: 1, plantInitialToxin: toxin, plantInitialChem: 0.2, mutationRateMin: 0, mutationRateMax: 0, initialMutationRate: 0, metaMutationStd: 0, reproThresholdPerSize: 1e9 });
      sim.genes[GENE.palate] = palate;
      sim.express(0);
      const before = sim.ledger.basalBurned;
      sim.step();
      return { energy: sim.energy[0]!, basal: sim.ledger.basalBurned - before };
    };
    const clean = meal(1, 0);
    const poisoned = meal(1, 0.8);
    expect(poisoned.basal).toBeGreaterThan(clean.basal);
    expect(poisoned.energy).toBeLessThan(clean.energy);
    expect(meal(Math.fround(0.2), 0.8).basal).toBeCloseTo(meal(Math.fround(0.2), 0).basal, 6); // its palate matches: almost no harm (single-precision genes)
  });

  it("making toxin slows a plant's growth", () => {
    const grown = (toxin: number): number => {
      const sim = new Simulation(3, { worldWidth: 64, worldHeight: 64, initialOrganisms: 0, initialFoodFraction: 0, plantEvolution: 1, plantSeedRate: 0, plantToxins: 1, plantInitialToxin: toxin, plantToxinGrowthCost: 0.3 });
      sim.run(20);
      return sim.food.reduce((a, b) => a + b, 0);
    };
    expect(grown(1) / grown(0)).toBeCloseTo(0.7, 2);
  });

  it("toxin is inherited through seeds, with mutation, and stays from 0 to 1", () => {
    const sim = new Simulation(4, { worldWidth: 64, worldHeight: 64, initialOrganisms: 0, initialFoodFraction: 1, plantEvolution: 1, plantSeedRate: 1, plantToxins: 1, plantInitialToxin: 0.99, plantMutateToxin: 0.05 });
    for (let cell = 0; cell < sim.food.length; cell += 2) sim.food[cell] = 0;
    t(sim).seedPlants();
    let changed = 0;
    for (const x of sim.plantToxin) {
      expect(x).toBeGreaterThanOrEqual(0.94 - 1e-12);
      expect(x).toBeLessThanOrEqual(1);
      if (x !== 0.99) changed++;
    }
    expect(changed).toBeGreaterThan(0);
  });

  it("the books balance with poisonous plants, and a saved world carries on exactly", () => {
    const config = seasonal({ plantEvolution: 1, plantToxins: 1, plantInitialToxin: 0.3, plantMutateToxin: 0.05, initialOrganisms: 250, nutrientMode: 2, brainMode: 2 });
    const sim = new Simulation(6, config);
    sim.run(20);
    const e0 = sim.energyAudit().total;
    const m0 = sim.matterAudit().total;
    const L0 = { ...sim.ledger };
    sim.run(1500);
    const L = sim.ledger;
    expect(sim.count).toBeGreaterThan(0);
    const burned = (y: typeof L): number => y.basalBurned + y.movementBurned + y.sensingBurned + y.attackBurned + y.armorBurned + y.brainBurned;
    const expected = e0 + (L.sunlightIn - L0.sunlightIn) - (burned(L) - burned(L0)) - (L.digestionLoss - L0.digestionLoss) - (L.decayLoss - L0.decayLoss);
    expect(Math.abs(sim.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
    expect(Math.abs(sim.matterAudit().total - m0) / m0).toBeLessThan(1e-9);
    const copy = Simulation.load(sim.save());
    sim.run(300);
    copy.run(300);
    expect(copy.fingerprint()).toBe(sim.fingerprint());
    for (let cell = 0; cell < sim.plantToxin.length; cell++) expect(copy.plantToxin[cell]).toBe(sim.plantToxin[cell]);
  }, 120_000);
});

describe("dietary nutrients (dietNutrients)", () => {
  type D = { dietStep(i: number, cell: number, plantGain: number, meatGain: number): number; cellOf: Uint32Array; basalCost: Float32Array };
  const d = (sim: Simulation): D => sim as unknown as D;
  /** One animal in a world with plants that evolve, its reserves set by hand. */
  const one = (extra: Partial<SimConfig> = {}): Simulation =>
    new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 1, speciesEvery: 0, plantEvolution: 1, dietNutrients: 1, dietPlantSkew: 0.8, dietNutrientUse: 0.001, dietNutrientFill: 1, dietShortBelow: 0.5, dietShortCost: 0.5, ...extra });

  it("are off by default and need kinds of plant", () => {
    expect(DEFAULT_CONFIG.dietNutrients).toBe(0);
    expect(new Simulation(1, { worldWidth: 64, worldHeight: 64 }).dietA).toHaveLength(0);
    expect(() => new Simulation(1, { worldWidth: 64, worldHeight: 64, dietNutrients: 1 })).toThrow(/several kinds of plant/);
    expect(() => new Simulation(1, { worldWidth: 64, worldHeight: 64, plantEvolution: 1, dietNutrients: 1, dietPlantSkew: 2 })).toThrow(/dietPlantSkew/);
  });

  it("newborns start at dietNutrientStart", () => {
    const sim = one({ dietNutrientStart: 0.7 });
    expect([sim.dietA[0], sim.dietB[0], sim.dietC[0]]).toEqual([0.7, 0.7, 0.7]);
  });

  it("a plant's mix follows its chemistry: chemistry 0 is rich in the first nutrient, 0.5 in the second, 1 in the third", () => {
    for (const [chem, rich] of [[0, 0], [0.5, 1], [1, 2]] as const) {
      const sim = one();
      const cell = d(sim).cellOf[0]!;
      sim.plantChem[cell] = chem;
      sim.dietA[0] = sim.dietB[0] = sim.dietC[0] = 0.5;
      d(sim).dietStep(0, cell, 0.1 * sim.threshold[0]!, 0); // a tenth of a breeding's worth of plant
      const got = [sim.dietA[0]!, sim.dietB[0]!, sim.dietC[0]!];
      for (let k = 0; k < 3; k++) {
        const content = 0.2 + (k === rich ? 2.4 : 0); // an even 20%, plus 80% x 3 for the nutrient its chemistry is rich in
        expect(got[k]).toBeCloseTo(0.5 - 0.001 + 0.1 * content, 12);
      }
    }
  });

  it("meat tops up all three evenly", () => {
    const sim = one({ dietMeatRichness: 1 });
    sim.dietA[0] = 0.2;
    sim.dietB[0] = 0.3;
    sim.dietC[0] = 0.4;
    d(sim).dietStep(0, d(sim).cellOf[0]!, 0, 0.1 * sim.threshold[0]!);
    expect(sim.dietA[0]).toBeCloseTo(0.2 - 0.001 + 0.1, 12);
    expect(sim.dietB[0]).toBeCloseTo(0.3 - 0.001 + 0.1, 12);
    expect(sim.dietC[0]).toBeCloseTo(0.4 - 0.001 + 0.1, 12);
  });

  it("running short costs extra upkeep, graded: nothing when every reserve is above dietShortBelow, the full dietShortCost when all are empty", () => {
    const sim = one();
    const cell = d(sim).cellOf[0]!;
    const basal = d(sim).basalCost[0]!;
    sim.dietA[0] = sim.dietB[0] = sim.dietC[0] = 0.9;
    expect(d(sim).dietStep(0, cell, 0, 0)).toBe(0);
    sim.dietA[0] = sim.dietB[0] = sim.dietC[0] = 0;
    expect(d(sim).dietStep(0, cell, 0, 0)).toBeCloseTo(0.5 * basal, 12);
    sim.dietA[0] = 0.25 + 0.001; // half short in one nutrient (after this tick's use), the others full
    sim.dietB[0] = sim.dietC[0] = 1;
    expect(d(sim).dietStep(0, cell, 0, 0)).toBeCloseTo((0.5 * basal * 0.5) / 3, 12);
  });

  it("the books balance with dietary nutrients (and fixed kinds of plant), and a saved world carries on exactly", () => {
    const config = seasonal({ dietNutrients: 1, initialOrganisms: 250, nutrientMode: 2, dietNutrientUse: 0.003 });
    const sim = new Simulation(7, config);
    sim.run(20);
    const e0 = sim.energyAudit().total;
    const m0 = sim.matterAudit().total;
    const L0 = { ...sim.ledger };
    sim.run(1500);
    const L = sim.ledger;
    expect(sim.count).toBeGreaterThan(0);
    let short = 0;
    for (let i = 0; i < sim.count; i++) if (Math.min(sim.dietA[i]!, sim.dietB[i]!, sim.dietC[i]!) < 0.5) short++;
    expect(short).toBeGreaterThan(0); // someone has run short of a nutrient
    const burned = (y: typeof L): number => y.basalBurned + y.movementBurned + y.sensingBurned + y.attackBurned + y.armorBurned + y.brainBurned;
    const expected = e0 + (L.sunlightIn - L0.sunlightIn) - (burned(L) - burned(L0)) - (L.digestionLoss - L0.digestionLoss) - (L.decayLoss - L0.decayLoss);
    expect(Math.abs(sim.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
    expect(Math.abs(sim.matterAudit().total - m0) / m0).toBeLessThan(1e-9);
    const copy = Simulation.load(sim.save());
    sim.run(300);
    copy.run(300);
    expect(copy.fingerprint()).toBe(sim.fingerprint());
  }, 120_000);
});
