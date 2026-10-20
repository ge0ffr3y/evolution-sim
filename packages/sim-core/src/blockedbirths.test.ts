import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

/** One organism on one patch of ground, free to try to reproduce every tick, with no upkeep to confuse the energy. */
const STAGE: Partial<SimConfig> = {
  worldWidth: 16,
  worldHeight: 16,
  foodCellSize: 16,
  fertilityScale: 1,
  fertilityVariation: 0,
  foodRegrowPerTick: 0,
  initialFoodFraction: 0,
  maxOrganisms: 50,
  initialOrganisms: 1,
  turnStd: 0,
  steerGain: 0,
  speedMax: 4,
  initialSpeed: 0.1,
  senseRangeMax: 3,
  reproThresholdPerSize: 30,
  basalCostCoeff: 0,
  moveCostCoeff: 0,
  senseCostCoeff: 0,
  mutationRateMin: 0,
  mutationRateMax: 0,
  initialMutationRate: 0,
  metaMutationStd: 0,
  speciesEvery: 0,
};

/** An organism with plenty of energy, trying to reproduce for a few ticks. */
function attempt(extra: Partial<SimConfig>): Simulation {
  const sim = new Simulation(12, { ...STAGE, ...extra });
  sim.energy[0] = sim.threshold[0]! * 2;
  sim.run(5);
  return sim;
}

describe("births blocked, split by cause", () => {
  it("poor soil with plenty of energy: all of it is counted as soil", () => {
    const sim = attempt({ initialNutrientPerCell: 0 });
    expect(sim.blockedBirths).toBeGreaterThan(0);
    expect(sim.blockedBirthsSoil).toBe(sim.blockedBirths);
    expect(sim.blockedBirthsEnergy).toBe(0);
    expect(sim.blockedBirthsBoth).toBe(0);
  });

  it("rich soil but a share of energy too small to pay for each baby's body: all of it is counted as energy", () => {
    // A litter of 12 splits what the parent hands over 12 ways, which is less than one baby's body costs.
    const sim = attempt({ initialNutrientPerCell: 1000, litterMax: 12, initialLitter: 12 });
    expect(sim.blockedBirths).toBeGreaterThan(0);
    expect(sim.blockedBirthsEnergy).toBe(sim.blockedBirths);
    expect(sim.blockedBirthsSoil).toBe(0);
    expect(sim.blockedBirthsBoth).toBe(0);
  });

  it("no soil and too little energy: counted as both, once per attempt", () => {
    const sim = attempt({ initialNutrientPerCell: 0, litterMax: 12, initialLitter: 12 });
    expect(sim.blockedBirths).toBeGreaterThan(0);
    expect(sim.blockedBirthsBoth).toBe(sim.blockedBirths);
    expect(sim.blockedBirthsSoil).toBe(0);
    expect(sim.blockedBirthsEnergy).toBe(0);
  });

  it("a birth that goes ahead counts as none of them", () => {
    const sim = attempt({ initialNutrientPerCell: 1000 });
    expect(sim.totalBirths).toBeGreaterThan(0);
    expect(sim.blockedBirths).toBe(0);
  });

  it("the three always add up to the total, in a real world that blocks births for both reasons", () => {
    const sim = new Simulation(3, { initialOrganisms: 300, initialNutrientPerCell: 2, litterMax: 6, initialLitter: 3, sexualReproduction: 1 });
    sim.run(1500);
    const stats = sim.stats();
    expect(stats.blockedBirths).toBeGreaterThan(0);
    expect(stats.blockedBirthsSoil + stats.blockedBirthsEnergy + stats.blockedBirthsBoth).toBe(stats.blockedBirths);
  });

  it("survive saving and loading, and the world carries on the same", () => {
    const sim = new Simulation(5, { initialOrganisms: 200, initialNutrientPerCell: 3 });
    sim.run(1000);
    const loaded = Simulation.load(sim.save());
    expect(loaded.blockedBirthsSoil).toBe(sim.blockedBirthsSoil);
    expect(loaded.blockedBirthsEnergy).toBe(sim.blockedBirthsEnergy);
    expect(loaded.blockedBirthsBoth).toBe(sim.blockedBirthsBoth);
    sim.run(300);
    loaded.run(300);
    expect(loaded.fingerprint()).toBe(sim.fingerprint());
    expect(loaded.blockedBirthsSoil).toBe(sim.blockedBirthsSoil);
  }, 60_000);
});
