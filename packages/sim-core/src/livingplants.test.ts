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
