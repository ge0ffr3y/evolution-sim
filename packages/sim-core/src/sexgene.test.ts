import { describe, expect, it } from "vitest";
import { GENE, GENE_COUNT } from "./genome";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

const world = (extra: Partial<SimConfig> = {}): Partial<SimConfig> => ({ initialOrganisms: 200, mateRange: 8, ...extra });

describe("sex as a gene", () => {
  it("is off by default and rejects nonsense", () => {
    const sim = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 20 });
    expect(sim.sexualBirths).toBe(0);
    expect(() => new Simulation(1, { sexualReproduction: 3 })).toThrow(/sexualReproduction/);
    expect(() => new Simulation(1, { sexualReproduction: 2, initialSex: 2 })).toThrow(/initialSex/);
  });

  it("with nobody looking for a mate, every birth is a split in two", () => {
    const sim = new Simulation(3, world({ sexualReproduction: 2, initialSex: 0, mutationRateMin: 0, initialMutationRate: 0, metaMutationStd: 0 }));
    sim.run(3000);
    expect(sim.totalBirths).toBeGreaterThan(100);
    expect(sim.sexualBirths).toBe(0);
  });

  it("with everyone looking for a mate, nearly every birth has two parents", () => {
    const sim = new Simulation(3, world({ sexualReproduction: 2, initialSex: 1, mutationRateMin: 0, initialMutationRate: 0, metaMutationStd: 0 }));
    sim.run(3000);
    expect(sim.totalBirths).toBeGreaterThan(50);
    expect(sim.sexualBirths).toBe(sim.totalBirths);
  });

  it("a mixed population has both kinds of births", () => {
    const sim = new Simulation(3, world({ sexualReproduction: 2, initialSex: 0.5, mutationRateMin: 0, initialMutationRate: 0, metaMutationStd: 0 }));
    sim.run(3000);
    const share = sim.sexualBirths / sim.totalBirths;
    expect(share).toBeGreaterThan(0.1);
    expect(share).toBeLessThan(0.9);
  });

  it("the gene mutates and is inherited", () => {
    const sim = new Simulation(2, world({ sexualReproduction: 2, initialSex: 0.5, mutationRateMin: 0.05, initialMutationRate: 0.05 }));
    sim.run(2000);
    let low = 1;
    let high = 0;
    for (let i = 0; i < sim.count; i++) {
      const g = sim.genes[i * GENE_COUNT + GENE.sex]!;
      low = Math.min(low, g);
      high = Math.max(high, g);
    }
    expect(high - low).toBeGreaterThan(0.1);
  });

  it("is deterministic, conserves energy and matter, and a saved world carries on exactly", () => {
    const config = world({ sexualReproduction: 2, initialSex: 0.3, initialOrganisms: 200, diseaseTransmission: 0.2, diseaseIntroEvery: 400 });
    const a = new Simulation(7, config);
    const b = new Simulation(7, config);
    const energy0 = a.energyAudit().total;
    const matter0 = a.matterAudit().total;
    a.run(1500);
    b.run(1500);
    const L = a.ledger;
    const burned = L.basalBurned + L.movementBurned + L.sensingBurned + L.attackBurned + L.armorBurned + L.brainBurned;
    const expected = energy0 + L.sunlightIn - burned - L.digestionLoss - L.decayLoss;
    expect(Math.abs(a.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
    expect(Math.abs(a.matterAudit().total - matter0) / matter0).toBeLessThan(1e-9);
    expect(a.fingerprint()).toBe(b.fingerprint());
    const loaded = Simulation.load(a.save());
    expect(loaded.sexualBirths).toBe(a.sexualBirths);
    a.run(500);
    loaded.run(500);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
  }, 60_000);
});

describe("sex as a gene: accepting any ready neighbor as a mate", () => {
  it("lets a rare mate-seeker reproduce, where strict pairing leaves it waiting", () => {
    const share = (accept: number): number => {
      const sim = new Simulation(3, world({ sexualReproduction: 2, initialSex: 0.05, sexAcceptAny: accept, mutationRateMin: 0, initialMutationRate: 0, metaMutationStd: 0 }));
      sim.run(3000);
      return sim.sexualBirths / Math.max(1, sim.totalBirths);
    };
    expect(share(1)).toBeGreaterThan(share(0));
  });

  it("is deterministic, conserves energy and survives save and load", () => {
    const config = world({ sexualReproduction: 2, initialSex: 0.3, sexAcceptAny: 1, initialOrganisms: 200 });
    const a = new Simulation(9, config);
    const b = new Simulation(9, config);
    const energy0 = a.energyAudit().total;
    a.run(1500);
    b.run(1500);
    const L = a.ledger;
    const burned = L.basalBurned + L.movementBurned + L.sensingBurned + L.attackBurned + L.armorBurned + L.brainBurned;
    const expected = energy0 + L.sunlightIn - burned - L.digestionLoss - L.decayLoss;
    expect(Math.abs(a.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
    expect(a.fingerprint()).toBe(b.fingerprint());
    expect(a.sexualBirths).toBeGreaterThan(0);
    const loaded = Simulation.load(a.save());
    a.run(500);
    loaded.run(500);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
  }, 60_000);
});
