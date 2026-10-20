import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

/** One patch of ground, nobody on it: we set the plants and the damage by hand and watch what a tick does. */
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
  overgrazeDamage: 0.01,
  overgrazeBelow: 0.15,
  overgrazeHeal: 0.002,
  overgrazePenalty: 0.7,
};

const grazing = (sim: Simulation): number => sim.grazing[0]!;

describe("overgrazing", () => {
  it("is off by default: no damage array, and growth is untouched", () => {
    const sim = new Simulation(1, { ...PATCH, overgrazeDamage: 0 });
    expect(sim.grazing).toHaveLength(0);
  });

  it("a cell with the plants eaten below the line gains damage every tick, up to a cap of 1", () => {
    const sim = new Simulation(1, PATCH);
    sim.food[0] = 0;
    sim.step();
    expect(grazing(sim)).toBeCloseTo(0.01, 6);
    sim.food[0] = 0;
    sim.step();
    expect(grazing(sim)).toBeCloseTo(0.02, 6);
    for (let t = 0; t < 200; t++) {
      sim.food[0] = 0;
      sim.step();
    }
    expect(grazing(sim)).toBe(1);
  });

  it("a cell with plenty of plants heals, and never goes below zero", () => {
    const sim = new Simulation(1, PATCH);
    sim.grazing[0] = 0.5;
    sim.food[0] = 90;
    sim.step();
    expect(grazing(sim)).toBeCloseTo(0.5 - 0.002, 6);
    sim.grazing[0] = 0.001;
    sim.food[0] = 90;
    sim.step();
    expect(grazing(sim)).toBe(0);
  });

  it("damaged ground regrows more slowly, by exactly the penalty at full damage", () => {
    const regrowth = (damage: number): number => {
      const sim = new Simulation(1, { ...PATCH, overgrazeDamage: 1e-9, overgrazeHeal: 0 }); // stays as set
      sim.food[0] = 50;
      sim.grazing[0] = damage;
      sim.step();
      return sim.food[0]! - 50;
    };
    const clean = regrowth(0);
    expect(clean).toBeGreaterThan(0);
    expect(regrowth(1) / clean).toBeCloseTo(1 - 0.7, 5);
    expect(regrowth(0.5) / clean).toBeCloseTo(1 - 0.35, 5);
  });

  it("a patch that was eaten bare is slow to recover afterwards, which an untouched patch is not", () => {
    const recovered = (grazedBare: boolean): number => {
      const sim = new Simulation(1, PATCH);
      if (grazedBare) for (let t = 0; t < 100; t++) { sim.food[0] = 0; sim.step(); }
      sim.food[0] = 0;
      sim.grazing[0] = grazedBare ? sim.grazing[0]! : 0;
      sim.run(30);
      return sim.food[0]!;
    };
    expect(recovered(false)).toBeGreaterThan(recovered(true) * 1.3);
  });

  it("rejects settings that make no sense", () => {
    expect(() => new Simulation(1, { ...PATCH, overgrazeDamage: 2 })).toThrow(/overgrazeDamage/);
    expect(() => new Simulation(1, { ...PATCH, overgrazeBelow: 1.5 })).toThrow(/overgrazeBelow/);
    expect(() => new Simulation(1, { ...PATCH, overgrazePenalty: -1 })).toThrow(/overgrazePenalty/);
  });

  it("in a real world with animals it conserves energy and matter, is deterministic, and saves and reloads exactly", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 300, overgrazeDamage: 0.01, overgrazePenalty: 0.8, mutationRateMin: 0.02, initialMutationRate: 0.02 } as Partial<SimConfig>;
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
    expect(Math.max(...a.grazing)).toBeGreaterThan(0); // some ground really was damaged
    expect(a.fingerprint()).toBe(b.fingerprint());
    const loaded = Simulation.load(a.save());
    expect(Array.from(loaded.grazing)).toEqual(Array.from(a.grazing));
    a.run(500);
    loaded.run(500);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
  }, 60_000);

  it("a world saved without overgrazing still loads", () => {
    const plain = new Simulation(3, { worldWidth: 64, worldHeight: 64, initialOrganisms: 50 });
    plain.run(200);
    const loaded = Simulation.load(plain.save());
    expect(loaded.grazing).toHaveLength(0);
    plain.run(50);
    loaded.run(50);
    expect(loaded.fingerprint()).toBe(plain.fingerprint());
  }, 60_000);
});
