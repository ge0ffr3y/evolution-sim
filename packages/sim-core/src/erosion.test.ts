import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

/** One patch of ground, nobody on it: we set the plants and the soil health by hand and watch what a tick does. */
const PATCH: Partial<SimConfig> = {
  worldWidth: 16,
  worldHeight: 16,
  foodCellSize: 16,
  fertilityScale: 1,
  fertilityVariation: 0,
  speedMax: 4,
  senseRangeMax: 3,
  initialOrganisms: 0,
  initialFoodFraction: 0,
  foodRegrowPerTick: 0.2,
  foodCap: 100,
  initialNutrientPerCell: 1000,
  erosionRate: 0.01,
  erosionBelow: 0.1,
  erosionRecoverAbove: 0.5,
  erosionRecovery: 0.005,
  erosionMin: 0.4,
};

describe("erosion", () => {
  it("is off by default: no soil health array", () => {
    expect(new Simulation(1, { ...PATCH, erosionRate: 0 }).soilHealth).toHaveLength(0);
  });

  it("ground that stays bare loses health every tick, down to the floor and no further", () => {
    const sim = new Simulation(1, PATCH);
    expect(sim.soilHealth[0]).toBe(1);
    sim.food[0] = 0;
    sim.step();
    expect(sim.soilHealth[0]).toBeCloseTo(0.99, 6);
    for (let t = 0; t < 100; t++) {
      sim.food[0] = 0;
      sim.step();
    }
    expect(sim.soilHealth[0]).toBeCloseTo(0.4, 6);
  });

  it("ground that is well covered recovers, up to 1 and no further", () => {
    const sim = new Simulation(1, PATCH);
    sim.soilHealth[0] = 0.5;
    sim.food[0] = 80;
    sim.step();
    expect(sim.soilHealth[0]).toBeCloseTo(0.505, 6);
    sim.soilHealth[0] = 0.999;
    sim.food[0] = 80;
    sim.step();
    expect(sim.soilHealth[0]).toBe(1);
  });

  it("ground between the two lines neither wears nor recovers", () => {
    const sim = new Simulation(1, PATCH);
    sim.soilHealth[0] = 0.7;
    sim.food[0] = 30; // between 10% and 50% of the 100 it could hold at full health
    sim.step();
    expect(sim.soilHealth[0]).toBeCloseTo(0.7, 6);
  });

  it("plants regrow in proportion to soil health", () => {
    const regrowth = (health: number): number => {
      const sim = new Simulation(1, { ...PATCH, erosionRate: 1e-9, erosionRecovery: 0 });
      sim.soilHealth[0] = health;
      sim.food[0] = 30;
      sim.step();
      return sim.food[0]! - 30;
    };
    const healthy = regrowth(1);
    expect(healthy).toBeGreaterThan(0);
    expect(regrowth(0.5) / healthy).toBeCloseTo(0.5, 5);
  });

  it("a lower ceiling stops growth but never deletes plants that are already standing", () => {
    const sim = new Simulation(1, { ...PATCH, erosionRate: 1e-9, erosionRecovery: 0 });
    sim.soilHealth[0] = 0.5; // the ceiling is now 50
    sim.food[0] = 80;
    const matter0 = sim.matterAudit().total;
    sim.step();
    expect(sim.food[0]).toBeCloseTo(80, 6);
    expect(sim.matterAudit().total).toBeCloseTo(matter0, 9);
    sim.food[0] = 40;
    sim.run(300); // regrowth at half health is slow, so give it time to fill up
    expect(sim.food[0]!).toBeLessThanOrEqual(50 + 1e-6); // it fills up to the new ceiling and stops
    expect(sim.food[0]!).toBeGreaterThan(49);
  });

  it("rejects settings that make no sense", () => {
    expect(() => new Simulation(1, { ...PATCH, erosionRate: 2 })).toThrow(/erosionRate/);
    expect(() => new Simulation(1, { ...PATCH, erosionBelow: 0.6 })).toThrow(/erosionBelow/);
    expect(() => new Simulation(1, { ...PATCH, erosionMin: 0 })).toThrow(/erosionMin/);
    expect(() => new Simulation(1, { ...PATCH, erosionRecovery: -1 })).toThrow(/erosionRecovery/);
  });

  it("in a real world it conserves energy and matter, is deterministic, and saves and reloads exactly", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 300, erosionRate: 0.0005, erosionRecovery: 0.0002, mutationRateMin: 0.02, initialMutationRate: 0.02 } as Partial<SimConfig>;
    const a = new Simulation(7, config);
    const b = new Simulation(7, config);
    const energy0 = a.energyAudit().total;
    const matter0 = a.matterAudit().total;
    a.run(3000);
    b.run(3000);
    const L = a.ledger;
    const burned = L.basalBurned + L.movementBurned + L.sensingBurned + L.attackBurned + L.armorBurned + L.brainBurned;
    const expected = energy0 + L.sunlightIn - burned - L.digestionLoss - L.decayLoss;
    expect(Math.abs(a.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
    expect(Math.abs(a.matterAudit().total - matter0) / matter0).toBeLessThan(1e-9);
    expect(Math.min(...a.soilHealth)).toBeLessThan(1); // some ground really wore away
    expect(a.fingerprint()).toBe(b.fingerprint());
    const loaded = Simulation.load(a.save());
    expect(Array.from(loaded.soilHealth)).toEqual(Array.from(a.soilHealth));
    a.run(500);
    loaded.run(500);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
  }, 60_000);

  it("a world saved without erosion still loads", () => {
    const plain = new Simulation(3, { worldWidth: 64, worldHeight: 64, initialOrganisms: 50 });
    plain.run(200);
    const loaded = Simulation.load(plain.save());
    expect(loaded.soilHealth).toHaveLength(0);
    plain.run(50);
    loaded.run(50);
    expect(loaded.fingerprint()).toBe(plain.fingerprint());
  }, 60_000);
});
