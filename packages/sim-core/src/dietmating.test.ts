import { describe, expect, it } from "vitest";
import { GENE, GENE_COUNT } from "./genome";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

/** A quiet world for hand-built scenes (as in sex.test.ts): no food growth, no mutation, nobody ready unless we make them so. */
function scene(extra: Partial<SimConfig> = {}): Partial<SimConfig> {
  return {
    worldWidth: 64,
    worldHeight: 64,
    initialOrganisms: 3,
    maxOrganisms: 100,
    sexualReproduction: 1,
    mateRange: 6,
    mateDistance: 0.6,
    foodRegrowPerTick: 0,
    initialFoodFraction: 0,
    initialEnergyFraction: 0.1,
    mutationRateMin: 0,
    mutationRateMax: 0,
    initialMutationRate: 0,
    metaMutationStd: 0,
    attackMin: 0,
    attackMax: 0,
    speciesEvery: 0,
    ...extra,
  };
}

function ready(sim: Simulation, i: number, x: number, y: number, diet: number): void {
  sim.genes[i * GENE_COUNT + GENE.diet] = diet;
  sim.express(i);
  sim.x[i] = x;
  sim.y[i] = y;
  sim.energy[i] = sim.threshold[i]! * 1.2;
}

describe("mating by diet", () => {
  it("by default any diet will do", () => {
    const sim = new Simulation(1, scene({ initialOrganisms: 2 }));
    ready(sim, 0, 30, 30, 0.1);
    ready(sim, 1, 31, 30, 0.6);
    sim.step();
    expect(sim.totalBirths).toBe(1);
  });

  it("with a diet limit, eaters too different refuse each other; similar ones still pair", () => {
    const pair = (a: number, b: number): number => {
      const sim = new Simulation(1, scene({ initialOrganisms: 2, mateDietLimit: 0.2 }));
      ready(sim, 0, 30, 30, a);
      ready(sim, 1, 31, 30, b);
      sim.step();
      return sim.totalBirths;
    };
    expect(pair(0.1, 0.6)).toBe(0);
    expect(pair(0.5, 0.6)).toBe(1);
  });

  it("with matePreference 3 a hunter picks the most similar eater, not the nearest", () => {
    const sim = new Simulation(1, scene({ matePreference: 3 }));
    ready(sim, 0, 30, 30, 0.6); // a would-be hunter...
    ready(sim, 1, 31, 30, 0.1); // ...next to a plant eater...
    ready(sim, 2, 35, 30, 0.55); // ...and a little further from another hunter
    sim.step();
    const baby = sim.count - 1;
    expect([sim.parentId[baby], sim.parent2Id[baby]]).toEqual([sim.id[0], sim.id[2]]);
  });

  it("check the setting", () => {
    expect(() => new Simulation(1, { mateDietLimit: 0 })).toThrow(/mateDietLimit/);
    expect(() => new Simulation(1, { matePreference: 4 })).toThrow(/matePreference/);
  });
});
