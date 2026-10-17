import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";

/**
 * "No free lunch": change one cost and the evolved traits must move in the
 * predictable direction, in every seed, not just on average.
 */
const WORLD = { worldWidth: 192, worldHeight: 192, initialOrganisms: 180 } as const;
const TICKS = 20_000;
const SEEDS = [1, 2, 3];
const CHEAP = 0.002;
const COSTLY = 0.05;

function evolve(seed: number, moveCostCoeff: number): Simulation {
  const sim = new Simulation(seed, { ...WORLD, moveCostCoeff });
  sim.run(TICKS);
  expect(sim.count).toBeGreaterThan(0);
  return sim;
}

describe("trade-offs: changing one cost shifts the evolved traits", () => {
  it("expensive movement evolves much slower organisms than cheap movement, in every seed", () => {
    for (const seed of SEEDS) {
      const cheap = evolve(seed, CHEAP).stats().traits.speed.mean;
      const costly = evolve(seed, COSTLY).stats().traits.speed.mean;
      expect(costly).toBeLessThan(cheap * 0.5);
    }
  }, 120_000);

  it("the speed histogram itself moves: costly-movement populations sit in the slowest bins", () => {
    const slowShare = (moveCostCoeff: number): number => {
      const sim = evolve(7, moveCostCoeff);
      const bins = sim.histogram("speed", 10); // each bin is a tenth of the allowed speed range
      return (bins[0]! + bins[1]!) / sim.count; // the two slowest bins (speeds under about 0.9)
    };
    expect(slowShare(COSTLY)).toBeGreaterThan(slowShare(CHEAP) + 0.4);
  }, 60_000);

  it("expensive movement also makes organisms rely more on sensing (they sniff instead of roam)", () => {
    // Averaged over seeds, because sensing varies a lot between runs.
    const meanSense = (cost: number): number =>
      SEEDS.reduce((total, seed) => total + evolve(seed, cost).stats().traits.senseRange.mean, 0) / SEEDS.length;
    expect(meanSense(COSTLY)).toBeGreaterThan(meanSense(CHEAP));
  }, 120_000);
});
