import { describe, expect, it } from "vitest";
import { GENE, GENE_COUNT } from "./genome";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

/** A quiet world: no food, no breeding, no mutation. Organisms stay where we put them (speed is tiny). */
function quiet(extra: Partial<SimConfig> = {}): Partial<SimConfig> {
  return {
    worldWidth: 64,
    worldHeight: 64,
    initialOrganisms: 30,
    maxOrganisms: 200,
    foodRegrowPerTick: 0,
    initialFoodFraction: 0,
    reproThresholdPerSize: 1e9,
    initialEnergyFraction: 0.6,
    initialSpeed: 0.1,
    speedMin: 0.1,
    speedMax: 0.1,
    turnStd: 0,
    mutationRateMin: 0,
    mutationRateMax: 0,
    initialMutationRate: 0,
    metaMutationStd: 0,
    attackMin: 0,
    attackMax: 0,
    speciesEvery: 0,
    diseaseTransmission: 0.5,
    diseaseContactRange: 4,
    diseaseWidth: 0.15,
    diseaseDuration: 40,
    diseaseImmunity: 100,
    diseaseCost: 1,
    diseaseIntroEvery: 100000000,
    diseaseMutationProb: 0,
    ...extra,
  };
}

/** Put every organism in a tight knot in the middle of the world. */
function huddle(sim: Simulation): void {
  for (let i = 0; i < sim.count; i++) {
    sim.x[i] = 30 + (i % 6) * 0.8;
    sim.y[i] = 30 + Math.floor(i / 6) * 0.8;
  }
}

function infect(sim: Simulation, j: number): void {
  (sim as unknown as { newStrainIn(j: number): void }).newStrainIn(j);
}

/** Give each organism its own, evenly spread genes (a varied population) or the same genes (a monoculture). */
function setDiversity(sim: Simulation, varied: boolean): void {
  for (let i = 0; i < sim.count; i++) {
    for (let g = 0; g < GENE_COUNT; g++) {
      const base = 0.5;
      sim.genes[i * GENE_COUNT + g] = varied && g !== GENE.hue && g !== GENE.mutationRate ? ((i * 0.37 + g * 0.11) % 1) : base;
    }
    sim.express(i);
    sim.energy[i] = 1000; // plenty to last the whole test (and far below the energy that makes an organism reproduce in this world)
  }
}

describe("disease", () => {
  it("is off by default: no disease arrays, no strains", () => {
    const sim = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 20 });
    expect(sim.infection).toHaveLength(0);
    expect(sim.stats().disease).toEqual({ infected: 0, strains: 0, totalInfections: 0 });
  });

  it("an infection spreads through a monoculture, but a genetically varied population mostly escapes", () => {
    const outbreak = (varied: boolean): number => {
      // A mild pathogen in a small huddle: it takes off in a monoculture, but a varied crowd mostly resists.
      const sim = new Simulation(3, quiet({ diseaseTransmission: 0.05, diseaseContactRange: 3 }));
      setDiversity(sim, varied);
      huddle(sim);
      infect(sim, 0);
      sim.run(8); // the early spread
      return sim.totalInfections;
    };
    const mono = outbreak(false);
    const varied = outbreak(true);
    expect(mono).toBeGreaterThan(15); // most of the 30 caught it within a few ticks
    expect(varied).toBeLessThan(mono * 0.5);
  });

  it("needs contact: far-apart organisms never infect each other", () => {
    const sim = new Simulation(3, quiet({ initialOrganisms: 2 }));
    setDiversity(sim, false);
    sim.x[0] = 10;
    sim.y[0] = 10;
    sim.x[1] = 50;
    sim.y[1] = 50;
    infect(sim, 0);
    sim.run(60);
    expect(sim.totalInfections).toBe(1);
  });

  it("sickness costs upkeep, lasts the set time, and then the organism is immune for a while", () => {
    const sim = new Simulation(3, quiet({ initialOrganisms: 1 }));
    sim.energy[0] = 20; // below the energy that makes an organism reproduce
    const healthy = new Simulation(3, quiet({ initialOrganisms: 1, diseaseTransmission: 0 }));
    healthy.energy[0] = 20;
    healthy.step();
    const normal = healthy.ledger.basalBurned;
    infect(sim, 0);
    sim.step();
    expect(sim.ledger.basalBurned).toBeCloseTo(normal * 2, 6); // diseaseCost 1: double upkeep
    expect(sim.sickFor[0]).toBe(39);
    sim.run(39);
    expect(sim.sickFor[0]).toBe(0);
    expect(sim.infection[0]).toBe(0);
    expect(sim.immuneFor[0]).toBeGreaterThan(90);
  });

  it("an immune organism cannot be reinfected, and can be again after the immunity runs out", () => {
    const sim = new Simulation(3, quiet({ initialOrganisms: 2, diseaseDuration: 5, diseaseImmunity: 50, diseaseTransmission: 1 }));
    setDiversity(sim, false);
    huddle(sim);
    sim.immuneFor[1] = 50;
    infect(sim, 0);
    sim.run(40);
    expect(sim.totalInfections).toBe(1); // organism 1 was protected throughout the first outbreak
    sim.run(30);
    huddle(sim); // (they wander a little)
    infect(sim, 0); // a fresh infection after its own immunity has faded
    sim.run(20);
    expect(sim.totalInfections).toBeGreaterThan(2);
  });

  it("a strain adapts to the organisms it infects: its target moves toward its new host", () => {
    const sim = new Simulation(3, quiet({ initialOrganisms: 2, diseaseTransmission: 1, diseaseMutationProb: 1, diseaseDrift: 0.5, diseaseWidth: 5 }));
    setDiversity(sim, false);
    for (let g = 0; g < GENE_COUNT; g++) sim.genes[0 * GENE_COUNT + g] = 0.2;
    for (let g = 0; g < GENE_COUNT; g++) sim.genes[1 * GENE_COUNT + g] = 0.6;
    huddle(sim);
    infect(sim, 0); // its target is organism 0's genes (0.2)
    sim.step();
    expect(sim.infection[1]).toBeGreaterThan(0);
    const strains = (sim as unknown as { strains: Float64Array[] }).strains;
    expect(strains).toHaveLength(2); // the original and the adapted one
    for (const value of strains[1]!) expect(value).toBeCloseTo(0.2 + 0.5 * (0.6 - 0.2), 5); // half way to the host
  });

  it("stats count the sick and the strains", () => {
    const sim = new Simulation(3, quiet());
    setDiversity(sim, false);
    huddle(sim);
    infect(sim, 0);
    infect(sim, 7);
    const d = sim.stats().disease;
    expect(d.infected).toBe(2);
    expect(d.strains).toBe(2);
  });

  it("strains nobody carries any more are forgotten, and the rest stay correctly numbered", () => {
    const sim = new Simulation(3, quiet({ initialOrganisms: 4 }));
    setDiversity(sim, false);
    const internals = sim as unknown as { strains: Float64Array[]; compactStrains(n: number): void };
    for (let k = 0; k < 10; k++) internals.strains.push(new Float64Array(8).fill(k / 10));
    sim.infection[0] = 3;
    sim.sickFor[0] = 10;
    sim.infection[2] = 8;
    sim.sickFor[2] = 10;
    internals.compactStrains(sim.count);
    expect(internals.strains).toHaveLength(2);
    expect(sim.infection[0]).toBe(1);
    expect(sim.infection[2]).toBe(2);
    expect(internals.strains[0]![0]).toBeCloseTo(0.2, 9);
    expect(internals.strains[1]![0]).toBeCloseTo(0.7, 9);
  });

  it("new strains arrive from outside at about the asked rate", () => {
    const sim = new Simulation(5, quiet({ diseaseIntroEvery: 100, diseaseTransmission: 0.0001, diseaseDuration: 5, diseaseImmunity: 0 }));
    sim.run(5000);
    expect(sim.totalInfections).toBeGreaterThan(25);
    expect(sim.totalInfections).toBeLessThan(80);
  });

  it("energy and matter are conserved, the run is deterministic, and a world saved mid-epidemic carries on exactly", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 200, diseaseTransmission: 0.3, diseaseIntroEvery: 500, diseaseMutationProb: 0.1, brainMode: 2, brainAddConnectionProb: 0.3 } as Partial<SimConfig>;
    // (Seed 6: a world where the disease does arrive in time. With seed 5 under the Phase 8e brain layout, no strain happened to arrive in 2,000 ticks.)
    const a = new Simulation(6, config);
    const b = new Simulation(6, config);
    const energy0 = a.energyAudit().total;
    const matter0 = a.matterAudit().total;
    for (let block = 0; block < 4; block++) {
      a.run(500);
      b.run(500);
      const L = a.ledger;
      const burned = L.basalBurned + L.movementBurned + L.sensingBurned + L.attackBurned + L.armorBurned + L.brainBurned;
      const expected = energy0 + L.sunlightIn - burned - L.digestionLoss - L.decayLoss;
      expect(Math.abs(a.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
      expect(Math.abs(a.matterAudit().total - matter0) / matter0).toBeLessThan(1e-9);
    }
    expect(a.fingerprint()).toBe(b.fingerprint());
    expect(a.totalInfections).toBeGreaterThan(10);
    const loaded = Simulation.load(a.save());
    expect(loaded.totalInfections).toBe(a.totalInfections);
    a.run(800);
    loaded.run(800);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
  }, 120_000);

  it("rejects settings that make no sense", () => {
    expect(() => new Simulation(1, { diseaseTransmission: 2 })).toThrow(/diseaseTransmission/);
    expect(() => new Simulation(1, { diseaseTransmission: 0.1, diseaseDuration: 0 })).toThrow(/diseaseDuration/);
    expect(() => new Simulation(1, { diseaseTransmission: 0.1, diseaseWidth: 0 })).toThrow(/diseaseWidth/);
  });
});
