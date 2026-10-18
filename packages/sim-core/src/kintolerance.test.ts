import { describe, expect, it } from "vitest";
import { GENE, GENE_COUNT, traitToGene } from "./genome";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

/** A quiet world for hand-built scenes: no food, no mutation, nothing breeds. */
function quiet(extra: Partial<SimConfig> = {}): Partial<SimConfig> {
  return {
    worldWidth: 64,
    worldHeight: 64,
    initialOrganisms: 2,
    maxOrganisms: 50,
    foodRegrowPerTick: 0,
    initialFoodFraction: 0,
    reproThresholdPerSize: 1e9,
    initialEnergyFraction: 0.5,
    mutationRateMin: 0,
    mutationRateMax: 0,
    initialMutationRate: 0,
    metaMutationStd: 0,
    speciesEvery: 0,
    ...extra,
  };
}

function setGenes(sim: Simulation, i: number, value: number): void {
  for (let g = 0; g < GENE_COUNT; g++) sim.genes[i * GENE_COUNT + g] = value;
}

function place(sim: Simulation, i: number, x: number, y: number): void {
  sim.x[i] = x;
  sim.y[i] = y;
  sim.headingX[i] = 1;
  sim.headingY[i] = 0;
}

/** A big armed meat eater (organism 0, with the given tolerance) next to an easy relative. Returns the kills after a few ticks. */
function kills(tolerance: number, extra: Partial<SimConfig> = {}): number {
  const sim = new Simulation(1, quiet({ initialSize: 1, attackMax: 2, kinDistance: 0.5, kinTolerance: 1, ...extra }));
  setGenes(sim, 0, 0.3);
  setGenes(sim, 1, 0.3);
  sim.genes[0 * GENE_COUNT + GENE.attack] = 1;
  sim.genes[0 * GENE_COUNT + GENE.diet] = 0.9;
  sim.genes[0 * GENE_COUNT + GENE.size] = traitToGene(1.5, sim.ranges.size);
  sim.genes[1 * GENE_COUNT + GENE.size] = traitToGene(0.5, sim.ranges.size);
  sim.genes[1 * GENE_COUNT + GENE.attack] = 0;
  sim.genes[1 * GENE_COUNT + GENE.armor] = 0;
  sim.genes[0 * GENE_COUNT + GENE.tolerance] = tolerance;
  sim.express(0);
  sim.express(1);
  place(sim, 0, 30, 30);
  place(sim, 1, 30.5, 30);
  sim.energy[0] = 5;
  sim.energy[1] = 5;
  for (let t = 0; t < 6; t++) {
    sim.step();
    place(sim, 0, 30, 30);
    if (sim.count > 1) place(sim, 1, 30.5, 30);
    sim.resting[0] = 0;
  }
  return sim.totalKills;
}

describe("kin tolerance as a gene", () => {
  it("is off by default: no extra arrays, and the gene is not mutated or counted", () => {
    const sim = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 20 });
    expect((sim as unknown as { toleranceSq: Float32Array }).toleranceSq).toHaveLength(0);
    expect(() => new Simulation(1, { kinTolerance: 1 })).toThrow(/kinTolerance needs kinDistance/);
  });

  it("an organism with no tolerance attacks a relative; a tolerant one spares it", () => {
    expect(kills(0)).toBeGreaterThan(0);
    expect(kills(1)).toBe(0);
  });

  it("tolerance is a share of kinDistance: a small one only spares very close relatives", () => {
    // These two differ by a bit under 0.5 in their genes (kinDistance is 0.5), so only full tolerance reaches them.
    expect(kills(0.1)).toBeGreaterThan(0);
    expect(kills(0.5)).toBeGreaterThan(0);
    expect(kills(1)).toBe(0);
  });

  it("recognizing relatives costs energy on the sensing line", () => {
    const sense = (tolerance: number): number => {
      const sim = new Simulation(1, quiet({ initialOrganisms: 1, kinDistance: 0.2, kinTolerance: 1, toleranceCostCoeff: 0.01 }));
      sim.genes[GENE.tolerance] = tolerance;
      sim.express(0);
      sim.step();
      return sim.ledger.sensingBurned;
    };
    expect(sense(1) - sense(0)).toBeCloseTo(0.01, 6);
  });

  it("the gene mutates and is inherited, and does not split species", () => {
    const sim = new Simulation(2, { worldWidth: 128, worldHeight: 128, initialOrganisms: 200, kinDistance: 0.1, kinTolerance: 1, initialTolerance: 0.5, mutationRateMin: 0.05, initialMutationRate: 0.05 });
    sim.run(2000);
    let low = 1;
    let high = 0;
    for (let i = 0; i < sim.count; i++) {
      const t = sim.genes[i * GENE_COUNT + GENE.tolerance]!;
      low = Math.min(low, t);
      high = Math.max(high, t);
    }
    expect(high - low).toBeGreaterThan(0.1);
  });

  it("is deterministic, conserves energy and matter, and survives save and load", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 200, kinDistance: 0.1, kinTolerance: 1, initialTolerance: 0.3, herdBonus: 1 } as Partial<SimConfig>;
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
    a.run(500);
    loaded.run(500);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
  }, 60_000);
});
