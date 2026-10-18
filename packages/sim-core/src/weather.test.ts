import { describe, expect, it } from "vitest";
import { GENE, GENE_COUNT } from "./genome";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

/** A quiet world: no food, no breeding, no mutation. */
function quiet(extra: Partial<SimConfig> = {}): Partial<SimConfig> {
  return {
    worldWidth: 128,
    worldHeight: 128,
    initialOrganisms: 1,
    maxOrganisms: 50,
    foodRegrowPerTick: 0,
    initialFoodFraction: 0,
    reproThresholdPerSize: 1e9,
    initialEnergyFraction: 0.5,
    mutationRateMin: 0,
    mutationRateMax: 0,
    initialMutationRate: 0,
    metaMutationStd: 0,
    speciesEvery: 0,
    turnStd: 0,
    ...extra,
  };
}

const climate = { climateMode: 1 } as Partial<SimConfig>;

describe("weather fronts", () => {
  it("add a bounded, patchy anomaly on top of the climate, and are off by default", () => {
    const plain = new Simulation(5, quiet(climate));
    const wet = new Simulation(5, quiet({ ...climate, weatherAmplitude: 0.2 }));
    let maxDiff = 0;
    let differing = 0;
    for (let k = 0; k < plain.temperature.length; k++) {
      const d = wet.temperature[k]! - plain.temperature[k]!;
      maxDiff = Math.max(maxDiff, Math.abs(d));
      if (Math.abs(d) > 0.01) differing++;
    }
    expect(maxDiff).toBeLessThanOrEqual(0.2 + 1e-9);
    expect(maxDiff).toBeGreaterThan(0.1);
    expect(differing).toBeGreaterThan(plain.temperature.length / 2);
    expect(() => new Simulation(1, quiet({ weatherAmplitude: 0.2 }))).toThrow(/needs a climate/);
    expect(() => new Simulation(1, quiet({ ...climate, weatherAmplitude: 0.2, weatherScale: 5 }))).toThrow(/weatherScale/);
  });

  it("drift east: after the drift time the pattern has moved one cell", () => {
    const sim = new Simulation(5, quiet({ ...climate, weatherAmplitude: 0.2, weatherDriftTicks: 10, weatherDriftYTicks: 0, weatherMorphPeriod: 0 }));
    const gw = sim.gridWidth;
    const before = Array.from(sim.temperature);
    sim.run(11);
    // Cell (x, y) now holds what cell (x - 1, y) held.
    for (const cell of [gw + 5, 3 * gw + 7, 5 * gw + 1]) {
      expect(sim.temperature[cell]!).toBeCloseTo(before[cell - 1]!, 9);
    }
  });

  it("the same seed gives the same weather, and a different seed a different one", () => {
    const a = new Simulation(5, quiet({ ...climate, weatherAmplitude: 0.2 }));
    const b = new Simulation(5, quiet({ ...climate, weatherAmplitude: 0.2 }));
    const c = new Simulation(6, quiet({ ...climate, weatherAmplitude: 0.2 }));
    expect(Array.from(a.temperature)).toEqual(Array.from(b.temperature));
    expect(Array.from(a.temperature)).not.toEqual(Array.from(c.temperature));
  });
});

describe("harsh and mild years", () => {
  it("every year is alike without variability; with it, summers differ from year to year", () => {
    const winter = (variability: number, year: number): number => {
      const sim = new Simulation(5, quiet({ ...climate, yearLength: 1000, seasonTempSwing: 0.4, yearVariability: variability }));
      sim.run(year * 1000 + 251); // a quarter of the way through the year is the peak of summer
      return sim.temperature[0]!;
    };
    const steady = [0, 1, 2, 3].map((y) => winter(0, y));
    for (const v of steady) expect(v).toBeCloseTo(steady[0]!, 9);
    const varied = [0, 1, 2, 3, 4, 5].map((y) => winter(0.5, y));
    expect(Math.max(...varied) - Math.min(...varied)).toBeGreaterThan(0.02);
    expect(() => new Simulation(1, quiet({ yearVariability: 0.5 }))).toThrow(/yearVariability/);
  });
});

describe("the fat gene", () => {
  function expressed(fat: number): Simulation {
    const sim = new Simulation(1, quiet({ fatMax: 2, fatMoveCost: 0.5, fatUpkeep: 0.2 }));
    sim.genes[GENE.fat] = fat;
    sim.express(0);
    return sim;
  }
  it("a fat body banks more before reproducing, and costs more to move and keep", () => {
    const lean = expressed(0);
    const fat = expressed(1);
    expect(fat.stats().meanEnergy).toBeDefined();
    const internals = (s: Simulation): { threshold: Float32Array; moveCost: Float32Array; basalCost: Float32Array } => s as unknown as { threshold: Float32Array; moveCost: Float32Array; basalCost: Float32Array };
    expect(internals(fat).threshold[0]! / internals(lean).threshold[0]!).toBeCloseTo(3, 5);
    expect(internals(fat).moveCost[0]! / internals(lean).moveCost[0]!).toBeCloseTo(1.5, 5);
    expect(internals(fat).basalCost[0]! / internals(lean).basalCost[0]!).toBeCloseTo(1.2, 5);
  });
  it("is off by default", () => {
    const sim = new Simulation(1, quiet());
    sim.genes[GENE.fat] = 1;
    sim.express(0);
    const lean = new Simulation(1, quiet());
    lean.express(0);
    expect((sim as unknown as { threshold: Float32Array }).threshold[0]).toBe((lean as unknown as { threshold: Float32Array }).threshold[0]);
  });
});

describe("torpor", () => {
  function oneStep(torpor: number, extra: Partial<SimConfig> = {}): { moved: number; basal: number } {
    const sim = new Simulation(1, quiet({ ...climate, torporSaving: 0.6, torporBelowGrowth: 10, torporUpkeep: 0.1, ...extra }));
    sim.genes[GENE.torpor] = torpor;
    sim.express(0);
    const x0 = sim.x[0]!;
    const y0 = sim.y[0]!;
    sim.step();
    return { moved: Math.hypot(sim.x[0]! - x0, sim.y[0]! - y0), basal: sim.ledger.basalBurned };
  }
  it("a dormant organism does not move and burns less; one without the gene carries on", () => {
    const awake = oneStep(0);
    const asleep = oneStep(1);
    expect(awake.moved).toBeGreaterThan(0);
    expect(asleep.moved).toBe(0);
    expect(asleep.basal / awake.basal).toBeCloseTo((1 + 0.1) * (1 - 0.6), 5);
  });
  it("it only happens where plants are not growing", () => {
    expect(oneStep(1, { torporBelowGrowth: 0 }).moved).toBeGreaterThan(0);
  });
  it("needs a climate", () => {
    expect(() => new Simulation(1, quiet({ torporSaving: 0.5 }))).toThrow(/needs a climate/);
  });
});

describe("weather, harsh years, fat and torpor together", () => {
  it("are deterministic, conserve energy and matter, and a saved world carries on exactly", () => {
    const config = {
      worldWidth: 128, worldHeight: 128, initialOrganisms: 200, climateMode: 1, yearLength: 1500, thermalCostCoeff: 1,
      weatherAmplitude: 0.15, yearVariability: 0.4, fatMax: 1.5, initialFat: 0.3, torporSaving: 0.5, initialTorpor: 0.3,
      mutationRateMin: 0.02, initialMutationRate: 0.02,
    } as Partial<SimConfig>;
    const a = new Simulation(8, config);
    const b = new Simulation(8, config);
    const energy0 = a.energyAudit().total;
    const matter0 = a.matterAudit().total;
    a.run(2500);
    b.run(2500);
    const L = a.ledger;
    const burned = L.basalBurned + L.movementBurned + L.sensingBurned + L.attackBurned + L.armorBurned + L.brainBurned;
    const expected = energy0 + L.sunlightIn - burned - L.digestionLoss - L.decayLoss;
    expect(Math.abs(a.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
    expect(Math.abs(a.matterAudit().total - matter0) / matter0).toBeLessThan(1e-9);
    expect(a.fingerprint()).toBe(b.fingerprint());
    let fatSpread = 0;
    for (let i = 1; i < a.count; i++) fatSpread = Math.max(fatSpread, Math.abs(a.genes[i * GENE_COUNT + GENE.fat]! - a.genes[GENE.fat]!));
    expect(fatSpread).toBeGreaterThan(0);
    const loaded = Simulation.load(a.save());
    a.run(500);
    loaded.run(500);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
  }, 60_000);
});

describe("harsh years never make plants shrink", () => {
  it("even when the swing is stretched past what plants can take, growth just stops", () => {
    const sim = new Simulation(5, quiet({ ...climate, yearLength: 1000, seasonGrowthSwing: 1, yearVariability: 1 }));
    for (let year = 0; year < 30; year++) {
      sim.run(1000);
      for (let k = 0; k < sim.growthFactor.length; k++) expect(sim.growthFactor[k]!).toBeGreaterThanOrEqual(0);
    }
  });
});
