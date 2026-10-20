import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

/** One patch of ground with one animal standing still on it, and nothing else going on. */
const PATCH: Partial<SimConfig> = {
  worldWidth: 16,
  worldHeight: 16,
  foodCellSize: 16,
  fertilityScale: 1,
  fertilityVariation: 0,
  speedMax: 4,
  senseRangeMax: 3,
  initialOrganisms: 1,
  initialSpeed: 0.1,
  initialFoodFraction: 0,
  foodRegrowPerTick: 0.2,
  foodCap: 100,
  initialNutrientPerCell: 1000,
  reproThresholdPerSize: 1e9,
  basalCostCoeff: 0,
  moveCostCoeff: 0,
  senseCostCoeff: 0,
  mutationRateMin: 0,
  mutationRateMax: 0,
  initialMutationRate: 0,
  metaMutationStd: 0,
  speciesEvery: 0,
  fouling: 0.01,
  foulDecay: 0.1,
  foulFree: 0,
  foulGrowthEffect: 0.5,
  foulDiseaseEffect: 0.5,
};

/** Four patches of ground (so there is an average to compare with). */
const FOUR: Partial<SimConfig> = { ...PATCH, worldWidth: 32, worldHeight: 32 };

describe("fouling", () => {
  it("is off by default: no index, and the settings are rejected when nonsense", () => {
    const sim = new Simulation(1, { ...PATCH, fouling: 0 });
    expect(sim.foul).toHaveLength(0);
    expect(() => new Simulation(1, { ...PATCH, foulDecay: 0 })).toThrow(/foulDecay/);
    expect(() => new Simulation(1, { ...PATCH, foulGrowthEffect: -1 })).toThrow(/foulFree/);
    expect(() => new Simulation(1, { ...PATCH, fouling: -1 })).toThrow(/fouling/);
  });

  it("an animal fouls the ground it stands on in proportion to its size, and the fouling then fades", () => {
    const sim = new Simulation(1, PATCH);
    sim.x[0] = 5;
    sim.y[0] = 5;
    sim.speed[0] = 0;
    sim.step();
    const size = sim.size[0]!;
    // Deposit (fouling x size), then the fade (foulDecay) is applied once in the same tick.
    expect(sim.foul[0]).toBeCloseTo(0.01 * size * 0.9, 6);
    const first = sim.foul[0]!;
    sim.step();
    expect(sim.foul[0]).toBeCloseTo((first + 0.01 * size) * 0.9, 6);
    // With nobody there it only fades.
    sim.energy[0] = 0;
    const lonely = new Simulation(1, { ...PATCH, initialOrganisms: 0 });
    lonely.foul[0] = 4;
    lonely.step();
    expect(lonely.foul[0]).toBeCloseTo(4 * 0.9, 6);
  });

  it("settles where deposit and fading balance, so two animals foul twice as much as one", () => {
    const settled = (animals: number): number => {
      const sim = new Simulation(1, { ...PATCH, initialOrganisms: animals, foulGrowthEffect: 0, maxOrganisms: 20 });
      for (let i = 0; i < animals; i++) {
        sim.x[i] = 5;
        sim.y[i] = 5;
        sim.speed[i] = 0;
        sim.energy[i] = 1e6;
      }
      sim.run(200);
      return sim.foul[0]!;
    };
    expect(settled(2) / settled(1)).toBeCloseTo(2, 2);
  });

  it("ground much more crowded than the average grows plants more slowly, by 1 / (1 + effect x how many times the average, beyond the free level)", () => {
    // Cell 0 is the crowded one; the other three are clean, so the average is a quarter of cell 0.
    const grown = (foul: number, free: number): number => {
      const sim = new Simulation(1, { ...FOUR, initialOrganisms: 0, fouling: 1e-9, foulDecay: 1e-9, foulFree: free });
      sim.foul[0] = foul;
      sim.food[0] = 10;
      sim.step();
      return sim.food[0]! - 10;
    };
    const clean = grown(0, 0);
    // Cell 0 is 4 times the average of the four cells.
    expect(grown(4, 0) / clean).toBeCloseTo(1 / (1 + 0.5 * 4), 5);
    // Up to the free level (4 here) there is no effect at all.
    expect(grown(4, 4)).toBeCloseTo(clean, 6);
    expect(grown(4, 3) / clean).toBeCloseTo(1 / (1 + 0.5 * 1), 5);
  });

  it("an evenly crowded world has nothing crowded in it: every cell is just average", () => {
    const sim = new Simulation(1, { ...FOUR, initialOrganisms: 0, fouling: 1e-9, foulDecay: 1e-9, foulFree: 1.5 });
    const growth = (): number => {
      sim.food[0] = 10;
      sim.step();
      return sim.food[0]! - 10;
    };
    sim.foul.fill(0);
    const clean = growth();
    sim.foul.fill(7);
    expect(growth()).toBeCloseTo(clean, 6); // even at a very high level, because everywhere is the same
  });

  it("disease passes on more easily where the ground is much more crowded than average", () => {
    const infections = (crowded: boolean): number => {
      let total = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const sim = new Simulation(seed, { ...PATCH, worldWidth: 64, worldHeight: 64, foodCellSize: 8, initialOrganisms: 2, maxOrganisms: 5, diseaseTransmission: 0.1, diseaseWidth: 5, diseaseContactRange: 4, diseaseDuration: 3, diseaseImmunity: 1, foulFree: 0, foulDiseaseEffect: 1, fouling: 1e-9, foulDecay: 1e-9 });
        for (let i = 0; i < 2; i++) {
          sim.x[i] = 30 + i;
          sim.y[i] = 30;
          sim.speed[i] = 0;
          sim.energy[i] = 1e6;
        }
        (sim as unknown as { newStrainIn(j: number): void }).newStrainIn(0);
        sim.foul.fill(0);
        // Crowded: the cell the animals stand on is far above the average. Not crowded: the whole world is equally fouled.
        if (crowded) sim.foul[Math.floor(30 / 8) * sim.gridWidth + Math.floor(30 / 8)] = 64;
        else sim.foul.fill(1);
        sim.step();
        total += sim.totalInfections;
      }
      return total;
    };
    expect(infections(true)).toBeGreaterThan(infections(false));
  });

  it("in a real world with crowds it conserves energy and matter, is deterministic, and saves and reloads exactly", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 300, fouling: 0.02, foulFree: 1, diseaseTransmission: 0.3, mutationRateMin: 0.02, initialMutationRate: 0.02 } as Partial<SimConfig>;
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
    expect(Math.max(...a.foul)).toBeGreaterThan(0.2);
    expect(a.fingerprint()).toBe(b.fingerprint());
    const loaded = Simulation.load(a.save());
    expect(Array.from(loaded.foul)).toEqual(Array.from(a.foul));
    a.run(500);
    loaded.run(500);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
  }, 60_000);

  it("a world saved without fouling still loads", () => {
    const plain = new Simulation(3, { worldWidth: 64, worldHeight: 64, initialOrganisms: 50 });
    plain.run(200);
    const loaded = Simulation.load(plain.save());
    expect(loaded.foul).toHaveLength(0);
    plain.run(50);
    loaded.run(50);
    expect(loaded.fingerprint()).toBe(plain.fingerprint());
  }, 60_000);
});
