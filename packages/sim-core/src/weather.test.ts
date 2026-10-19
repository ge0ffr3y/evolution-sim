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

describe("the fat gene (a separate reserve)", () => {
  const fatConfig = { fatDepositRate: 0.5, fatDepositAbove: 0.6, fatEfficiency: 0.8, fatDrawBelow: 0.35, fatDrawRate: 0.1, fatCap: 1, fatMoveCost: 0.5, fatUpkeep: 0.2 };
  const hidden = (s: Simulation): { fatStore: Float64Array } => s as unknown as { fatStore: Float64Array };

  function oneStep(gene: number, energyFraction: number, store = 0, extra: Partial<SimConfig> = {}): Simulation {
    const sim = new Simulation(1, quiet({ ...fatConfig, ...extra }));
    sim.genes[GENE.fat] = gene;
    sim.express(0);
    sim.energy[0] = energyFraction * sim.threshold[0]!;
    hidden(sim).fatStore[0] = store * sim.threshold[0]!;
    sim.step();
    return sim;
  }

  it("is off by default (no store, no gene use)", () => {
    const sim = new Simulation(1, quiet());
    expect(hidden(sim).fatStore).toHaveLength(0);
  });

  it("banks a share of the surplus above the deposit line, losing some as heat", () => {
    const sim = new Simulation(1, quiet(fatConfig));
    sim.genes[GENE.fat] = 1;
    sim.express(0);
    const need = sim.threshold[0]!;
    sim.energy[0] = 0.9 * need;
    const lossBefore = sim.ledger.digestionLoss;
    sim.step();
    const deposited = 0.5 * (0.9 - 0.6) * need; // fat gene 1 x rate 0.5 x the excess
    expect(hidden(sim).fatStore[0]!).toBeCloseTo(deposited * 0.8, 4);
    expect(sim.ledger.digestionLoss - lossBefore).toBeCloseTo(deposited * 0.2, 4);
  });

  it("a little fat banks a little: the deposit is proportional to the gene, and zero at 0", () => {
    const store = (gene: number): number => hidden(oneStep(gene, 0.9)).fatStore[0]!;
    expect(store(0)).toBe(0);
    expect(store(0.5) / store(1)).toBeCloseTo(0.5, 3);
  });

  it("draws the reserve back when hungry, at full value, and never below zero", () => {
    const sim = oneStep(1, 0.2, 0.5);
    const need = sim.threshold[0]!;
    expect(hidden(sim).fatStore[0]! / need).toBeCloseTo(0.5 - 0.1, 3);
    const nearlyEmpty = oneStep(1, 0.2, 0.03);
    expect(hidden(nearlyEmpty).fatStore[0]!).toBe(0);
  });

  it("never banks more than the cap", () => {
    const sim = oneStep(1, 0.95, 0.99);
    expect(hidden(sim).fatStore[0]! / sim.threshold[0]!).toBeLessThanOrEqual(1 + 1e-6);
  });

  it("carrying fat costs movement and upkeep", () => {
    const lean = oneStep(0, 0.5, 0);
    const fat = oneStep(0, 0.5, 0.5);
    expect(fat.ledger.movementBurned / lean.ledger.movementBurned).toBeCloseTo(1 + 0.5 * 0.5, 3);
    expect(fat.ledger.basalBurned / lean.ledger.basalBurned).toBeCloseTo(1 + 0.2 * 0.5, 3);
  });

  it("a body that dies leaves its fat in the corpse, so no energy is lost", () => {
    const sim = new Simulation(1, quiet({ ...fatConfig, fatDrawRate: 0 }));
    sim.express(0);
    sim.energy[0] = 1e-9; // it cannot pay its upkeep
    hidden(sim).fatStore[0] = 3;
    const before = sim.energyAudit().total;
    sim.step();
    expect(sim.count).toBe(0);
    const L = sim.ledger;
    const burned = L.basalBurned + L.movementBurned + L.sensingBurned + L.attackBurned + L.armorBurned + L.brainBurned;
    expect(sim.energyAudit().total).toBeCloseTo(before - burned - L.digestionLoss - L.decayLoss + L.sunlightIn, 6);
    expect(sim.energyAudit().corpses).toBeGreaterThan(3);
  });
});

describe("torpor", () => {
  function oneStep(torpor: number, extra: Partial<SimConfig> = {}): { moved: number; basal: number; movement: number } {
    const sim = new Simulation(1, quiet({ ...climate, torporSaving: 0.6, torporBelowGrowth: 10, torporUpkeep: 0.1, ...extra }));
    sim.genes[GENE.torpor] = torpor;
    sim.express(0);
    const x0 = sim.x[0]!;
    const y0 = sim.y[0]!;
    sim.step();
    return { moved: Math.hypot(sim.x[0]! - x0, sim.y[0]! - y0), basal: sim.ledger.basalBurned, movement: sim.ledger.movementBurned };
  }
  it("is graded: the more torpor, the slower it moves, the less it spends on moving and on upkeep", () => {
    const awake = oneStep(0);
    const some = oneStep(0.3);
    const deep = oneStep(1);
    expect(awake.moved).toBeGreaterThan(0);
    expect(some.moved / awake.moved).toBeCloseTo(0.7, 3);
    expect(deep.moved).toBe(0);
    expect(some.movement / awake.movement).toBeCloseTo(0.7 * 0.7, 3);
    expect(some.basal / awake.basal).toBeCloseTo((1 + 0.1 * 0.3) * (1 - 0.6 * 0.3), 5);
    expect(deep.basal / awake.basal).toBeCloseTo((1 + 0.1) * (1 - 0.6), 5);
  });
  it("only a deeply dormant organism cannot attack", () => {
    const sim = (torpor: number): Simulation => {
      const s = new Simulation(1, quiet({ ...climate, torporSaving: 0.6, torporBelowGrowth: 10, torporSleepAt: 0.5 }));
      s.genes[GENE.torpor] = torpor;
      s.express(0);
      s.step();
      return s;
    };
    expect((sim(0.3) as unknown as { resting: Uint16Array }).resting[0]).toBe(0);
    expect((sim(0.8) as unknown as { resting: Uint16Array }).resting[0]).toBeGreaterThan(0);
  });
  it("it only happens where plants are not growing", () => {
    expect(oneStep(1, { torporBelowGrowth: 0 }).moved).toBeGreaterThan(0);
  });
  it("needs a climate", () => {
    expect(() => new Simulation(1, quiet({ torporSaving: 0.5 }))).toThrow(/needs a climate/);
    expect(() => new Simulation(1, quiet({ ...climate, torporSaving: 0.5, torporSleepAt: 0 }))).toThrow(/torporSleepAt/);
  });
});

describe("weather, harsh years, fat and torpor together", () => {
  it("are deterministic, conserve energy and matter, and a saved world carries on exactly", () => {
    const config = {
      worldWidth: 128, worldHeight: 128, initialOrganisms: 200, climateMode: 1, yearLength: 1500, thermalCostCoeff: 1,
      weatherAmplitude: 0.15, yearVariability: 0.4, fatDepositRate: 0.5, initialFat: 0.3, torporSaving: 0.5, initialTorpor: 0.3,
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
