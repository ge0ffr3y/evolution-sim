import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";
import { GENE, GENE_COUNT } from "./genome";

type Hidden = {
  considerPrey: (index: number, distSq: number) => void;
  detects(viewer: number, target: number): boolean;
  pickAttacker: number;
  pickBest: number;
  pickBestDistSq: number;
  pickSizeLimit: number;
};
const hidden = (sim: Simulation): Hidden => sim as unknown as Hidden;

describe("hunger overrides kin restraint", () => {
  const world = (extra: Partial<SimConfig> = {}): Simulation => new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 2, speciesEvery: 0, kinDistance: 0.05, ...extra });
  const picks = (sim: Simulation, fed: number): boolean => {
    for (let g = 0; g < GENE_COUNT; g++) sim.genes[GENE_COUNT + g] = sim.genes[g]!; // the two are identical: close relatives
    sim.energy[0] = fed * sim.threshold[0]!;
    const h = hidden(sim);
    h.pickAttacker = 0;
    h.pickBest = -1;
    h.pickBestDistSq = Infinity;
    h.pickSizeLimit = 100;
    h.considerPrey(1, 1);
    return h.pickBest === 1;
  };

  it("is off by default: a relative is spared however hungry the animal is", () => {
    expect(picks(world(), 0.05)).toBe(false);
  });

  it("a well-fed animal still spares a relative; a starving one does not", () => {
    expect(picks(world({ kinHungerBelow: 0.5 }), 0.9)).toBe(false);
    expect(picks(world({ kinHungerBelow: 0.5 }), 0)).toBe(true);
  });

  it("in between, the closeness it respects shrinks with hunger", () => {
    const sim = world({ kinHungerBelow: 0.5 });
    // A relative a little way off in genes: spared when barely hungry, attacked when quite hungry.
    for (let g = 0; g < GENE_COUNT; g++) sim.genes[GENE_COUNT + g] = sim.genes[g]!;
    sim.genes[GENE_COUNT + GENE.size] = sim.genes[GENE.size]! + 0.1; // a small genetic difference
    const h = hidden(sim);
    const tryAt = (fed: number): boolean => {
      sim.energy[0] = fed * sim.threshold[0]!;
      h.pickAttacker = 0;
      h.pickBest = -1;
      h.pickBestDistSq = Infinity;
      h.pickSizeLimit = 100;
      h.considerPrey(1, 1);
      return h.pickBest === 1;
    };
    expect(tryAt(0.49)).toBe(false);
    expect(tryAt(0.05)).toBe(true);
  });
});

describe("a committed hunter's eye", () => {
  const noticed = (eye: number, diet: number): number => {
    const sim = new Simulation(2, { worldWidth: 128, worldHeight: 128, initialOrganisms: 300, speciesEvery: 0, camouflageMode: 1, camoHunterEye: eye });
    sim.genes[GENE.diet] = diet;
    let seen = 0;
    for (let j = 1; j < sim.count; j++) if (hidden(sim).detects(0, j)) seen++;
    return seen / (sim.count - 1);
  };

  it("is off by default, and a plant eater's eye is unchanged by it", () => {
    expect(noticed(0, 1)).toBe(noticed(0, 0));
    expect(noticed(1, 0)).toBe(noticed(0, 0));
  });

  it("a full meat eater with the strongest eye notices everything; half as committed, it misses fewer than a plant eater", () => {
    expect(noticed(1, 1)).toBe(1);
    expect(noticed(1, 0.5)).toBeGreaterThan(noticed(0, 0));
    expect(noticed(1, 0.5)).toBeLessThan(1);
  });

  it("with both on, a grand-style world repeats exactly and a saved world carries on exactly", () => {
    const config: Partial<SimConfig> = { worldWidth: 192, worldHeight: 192, initialOrganisms: 300, speciesEvery: 0, camouflageMode: 1, kinDistance: 0.05, herdBonus: 0.3, kinHungerBelow: 0.5, camoHunterEye: 0.8 };
    const a = new Simulation(4, config);
    a.run(1500);
    const copy = Simulation.load(a.save());
    a.run(800);
    copy.run(800);
    expect(copy.fingerprint()).toBe(a.fingerprint());
    const again = new Simulation(4, config);
    again.run(2300);
    expect(again.fingerprint()).toBe(a.fingerprint());
  }, 60_000);

  it("check the settings", () => {
    expect(() => new Simulation(1, { kinHungerBelow: 1.5 })).toThrow(/kinHungerBelow/);
    expect(() => new Simulation(1, { camoHunterEye: -0.1 })).toThrow(/camoHunterEye/);
  });
});
