import { describe, expect, it } from "vitest";
import { GENE, GENE_COUNT } from "./genome";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

const BASE: Partial<SimConfig> = {
  worldWidth: 128,
  worldHeight: 128,
  initialOrganisms: 1,
  climateMode: 1,
  thermalCostCoeff: 1,
  thermalTolerance: 0.1,
  initialFoodFraction: 0,
  foodRegrowPerTick: 0,
  speciesEvery: 0,
  mutationRateMin: 0,
  mutationRateMax: 0,
  initialMutationRate: 0,
  metaMutationStd: 0,
};

/** How much energy one organism pays in a tick, as a function of its preferred temperature. */
function upkeep(pref: number, extra: Partial<SimConfig> = {}): { paid: number; basalBurned: number; here: number } {
  const sim = new Simulation(1, { ...BASE, ...extra });
  sim.genes[GENE.thermal] = pref;
  sim.express(0);
  sim.x[0] = 64;
  sim.y[0] = 64; // the middle of the world: the warm equator
  sim.energy[0] = 20; // below the energy that makes an organism reproduce, so none of it is handed to a baby
  const before = sim.energy[0]!;
  sim.step();
  const here = sim.temperature[Math.floor(sim.y[0]! / 8) * sim.gridWidth + Math.floor(sim.x[0]! / 8)]!;
  return { paid: before - sim.energy[0]!, basalBurned: sim.ledger.basalBurned, here };
}

describe("the thermal gene", () => {
  it("is inert unless there is a climate and a thermal cost: not mutated, no per-organism arrays", () => {
    const sim = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 60, climateMode: 1, foodRegrowPerTick: 0.3, initialFoodFraction: 1, initialEnergyFraction: 0.9 });
    expect(sim.thermalPref).toHaveLength(0);
    sim.run(900);
    const founder = sim.genes[GENE.thermal]!;
    for (let i = 0; i < sim.count; i++) expect(sim.genes[i * GENE_COUNT + GENE.thermal]).toBe(founder);
    expect(sim.totalBirths).toBeGreaterThan(20);
  });

  it("needs a climate to mean anything", () => {
    expect(() => new Simulation(1, { thermalCostCoeff: 1 })).toThrow(/needs a climate/);
  });

  it("costs nothing at the preferred temperature or within the tolerance, and grows with the square of the mismatch beyond it", () => {
    const here = upkeep(0.5).here;
    const comfortable = upkeep(here).paid;
    const nearly = upkeep(here + 0.09).paid; // inside the 0.1 tolerance
    expect(nearly).toBeCloseTo(comfortable, 6);
    const mild = upkeep(here + 0.2).paid - comfortable; // 0.1 past the tolerance
    const harsh = upkeep(here + 0.4).paid - comfortable; // 0.3 past
    expect(mild).toBeGreaterThan(0);
    expect(harsh / mild).toBeCloseTo(9, 1);
    // The same mismatch in the cold direction costs the same.
    expect(upkeep(here - 0.2).paid - comfortable).toBeCloseTo(mild, 6);
  });

  it("is counted as upkeep in the energy ledger", () => {
    const here = upkeep(0.5).here;
    const base = upkeep(here);
    const cold = upkeep(here - 0.4);
    expect(cold.basalBurned).toBeGreaterThan(base.basalBurned);
    expect(cold.basalBurned - base.basalBurned).toBeCloseTo(cold.paid - base.paid, 6);
  });

  it("a bigger body pays more for the same mismatch", () => {
    const paidBy = (size: number): number => {
      const sim = new Simulation(1, BASE);
      sim.genes[GENE.thermal] = 0;
      sim.genes[GENE.size] = size;
      sim.express(0);
      sim.x[0] = 64;
      sim.y[0] = 64;
      sim.energy[0] = 20;
      sim.step();
      return sim.ledger.basalBurned - sim.basalCost[0]!;
    };
    expect(paidBy(0.9)).toBeGreaterThan(paidBy(0.3) * 2);
  });

  it("sorts the world by latitude: where it is cold the survivors prefer the cold, and where it is warm they prefer the warm", () => {
    const sim = new Simulation(3, {
      worldWidth: 128,
      worldHeight: 128,
      initialOrganisms: 600,
      climateMode: 1,
      thermalCostCoeff: 3,
      attackMin: 0,
      attackMax: 0,
      speciesEvery: 0,
      foodRegrowPerTick: 0.12,
      initialSpeed: 0.3,
      speedMax: 0.6,
    });
    // Start with every preference equally common, spread over the whole world.
    for (let i = 0; i < sim.count; i++) {
      sim.genes[i * GENE_COUNT + GENE.thermal] = (i % 10) / 9;
      sim.express(i);
    }
    sim.run(500);
    let coldSum = 0;
    let coldN = 0;
    let warmSum = 0;
    let warmN = 0;
    for (let i = 0; i < sim.count; i++) {
      const pref = sim.thermalPref[i]!;
      const row = sim.y[i]! / sim.config.worldHeight;
      if (row < 0.2 || row > 0.8) {
        coldSum += pref;
        coldN++;
      } else if (row > 0.3 && row < 0.7) {
        warmSum += pref;
        warmN++;
      }
    }
    expect(coldN).toBeGreaterThan(20);
    expect(warmN).toBeGreaterThan(20);
    expect(warmSum / warmN).toBeGreaterThan(coldSum / coldN + 0.08);
  }, 60_000);

  it("species notice it: a group with a very different preferred temperature becomes its own species", () => {
    const sim = new Simulation(1, { ...BASE, initialOrganisms: 40, speciesEvery: 10, speciesProbation: 100, speciesSampleEvery: 100, speciesMinMembers: 8, speciesDistance: 0.15, thermalCostCoeff: 0.0001, initialEnergyFraction: 0.5, foodRegrowPerTick: 0.05, initialFoodFraction: 1 });
    for (let i = 0; i < 20; i++) sim.genes[i * GENE_COUNT + GENE.thermal] = 0.95;
    for (let i = 20; i < 40; i++) sim.genes[i * GENE_COUNT + GENE.thermal] = 0.05;
    sim.run(250);
    expect(sim.speciesRecords.length).toBeGreaterThanOrEqual(2);
  });

  it("energy and matter are conserved, it is deterministic, and a saved world carries on exactly", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 120, climateMode: 1, yearLength: 600, thermalCostCoeff: 1, terrainMode: 1, brainMode: 2, brainAddConnectionProb: 0.3, sexualReproduction: 1, mateRange: 10 };
    const a = new Simulation(5, config);
    const b = new Simulation(5, config);
    const energy0 = a.energyAudit().total;
    const matter0 = a.matterAudit().total;
    for (let block = 0; block < 3; block++) {
      a.run(500);
      b.run(500);
      const L = a.ledger;
      const burned = L.basalBurned + L.movementBurned + L.sensingBurned + L.attackBurned + L.armorBurned + L.brainBurned;
      const expected = energy0 + L.sunlightIn - burned - L.digestionLoss - L.decayLoss;
      expect(Math.abs(a.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
      expect(Math.abs(a.matterAudit().total - matter0) / matter0).toBeLessThan(1e-9);
    }
    expect(a.fingerprint()).toBe(b.fingerprint());
    const loaded = Simulation.load(a.save());
    a.run(600);
    loaded.run(600);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
  }, 120_000);
});
