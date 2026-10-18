import { describe, expect, it } from "vitest";
import { INPUT, OUTPUT, OUTPUT_START, setConnection } from "./brain";
import { GENE, GENE_COUNT } from "./genome";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

function stage(extra: Partial<SimConfig> = {}): Partial<SimConfig> {
  return {
    worldWidth: 64,
    worldHeight: 64,
    initialOrganisms: 1,
    maxOrganisms: 40,
    foodRegrowPerTick: 0,
    initialFoodFraction: 0,
    reproThresholdPerSize: 1e9,
    initialEnergyFraction: 0.5,
    mutationRateMin: 0,
    mutationRateMax: 0,
    initialMutationRate: 0,
    metaMutationStd: 0,
    speciesEvery: 0,
    brainMode: 2,
    brainFounderReflex: 0,
    brainEvery: 1,
    brainTurnNoise: 0,
    brainVisionRange: 0,
    chemicals: 1,
    ...extra,
  };
}

function wire(sim: Simulation, index: number, from: number, to: number, weight: number): void {
  const base = index * 512;
  sim.brainCount[index] = setConnection(sim.brainFrom, sim.brainTo, sim.brainWeight, base, sim.brainCount[index]!, from, to, weight);
  (sim as unknown as { refreshBrain(i: number): void }).refreshBrain(index);
}

function thought(sim: Simulation, index = 0): number[] {
  sim.traceId = sim.id[index]!;
  sim.step();
  return sim.describe(sim.indexOfId(sim.traceId)).brain!.activity!.inputs;
}

const internals = (sim: Simulation): { chemHit: Uint8Array; chem: Float32Array; brainCost: Float32Array } => sim as unknown as { chemHit: Uint8Array; chem: Float32Array; brainCost: Float32Array };

describe("chemical signals", () => {
  it("are off by default, and need brains", () => {
    const sim = new Simulation(1, stage({ chemicals: 0 }));
    wire(sim, 0, INPUT.bias, OUTPUT_START + OUTPUT.speed, 1);
    const inputs = thought(sim);
    for (let k = 0; k < 4; k++) expect(inputs[INPUT.chemReward + k]).toBe(0);
    expect(() => new Simulation(1, { chemicals: 1 })).toThrow(/chemicals need brains/);
  });

  it("reward jumps when the organism eats, then fades", () => {
    const sim = new Simulation(1, stage());
    wire(sim, 0, INPUT.bias, OUTPUT_START + OUTPUT.speed, 1);
    sim.speed[0] = 0;
    sim.genes[GENE.diet] = 0;
    sim.express(0);
    sim.x[0] = 30;
    sim.y[0] = 30;
    sim.speed[0] = 0;
    const cell = Math.floor(30 / sim.config.foodCellSize) * sim.gridWidth + Math.floor(30 / sim.config.foodCellSize);
    sim.food[cell] = 50;
    expect(thought(sim)[INPUT.chemReward]).toBe(0); // it has not eaten yet
    const justAte = thought(sim)[INPUT.chemReward]!;
    expect(justAte).toBeGreaterThan(0);
    sim.food.fill(0);
    let later = justAte;
    for (let t = 0; t < 40; t++) later = thought(sim)[INPUT.chemReward]!;
    expect(later).toBeLessThan(justAte * 0.5);
  });

  it("stress jumps when attacked, and when starving, and falls away afterwards", () => {
    const sim = new Simulation(1, stage());
    wire(sim, 0, INPUT.bias, OUTPUT_START + OUTPUT.speed, 1);
    expect(thought(sim)[INPUT.chemStress]).toBe(0);
    internals(sim).chemHit[0] = 1;
    expect(thought(sim)[INPUT.chemStress]).toBeCloseTo(0.5, 5);
    const hit = thought(sim)[INPUT.chemStress]!;
    expect(hit).toBeCloseTo(0.5 * 0.95, 4);
    // Starving: well under the energy it needs to reproduce.
    sim.energy[0] = 0.01 * sim.threshold[0]!;
    expect(thought(sim)[INPUT.chemStress]).toBeGreaterThan(hit);
  });

  it("an attack on the organism raises its stress, hit or miss", () => {
    const sim = new Simulation(1, stage({ initialOrganisms: 2, initialSize: 1, attackMax: 2, brainAttackGate: 0 }));
    for (let i = 0; i < 2; i++) for (let g = 0; g < GENE_COUNT; g++) sim.genes[i * GENE_COUNT + g] = 0.3;
    sim.genes[GENE.attack] = 1;
    sim.genes[GENE.diet] = 0.9;
    sim.genes[GENE_COUNT + GENE.attack] = 0;
    sim.genes[GENE_COUNT + GENE.armor] = 1; // a tough prey, so it may well survive
    sim.genes[GENE_COUNT + GENE.size] = 0.1;
    sim.express(0);
    sim.express(1);
    wire(sim, 0, INPUT.bias, OUTPUT_START + OUTPUT.attack, 4);
    wire(sim, 1, INPUT.bias, OUTPUT_START + OUTPUT.speed, 1);
    sim.energy[0] = 5;
    sim.energy[1] = 5;
    for (let i = 0; i < 2; i++) {
      sim.x[i] = 30 + 0.3 * i;
      sim.y[i] = 30;
      sim.speed[i] = 0;
    }
    sim.step();
    expect(sim.totalAttacks).toBeGreaterThan(0);
    if (sim.count > 1) expect(internals(sim).chemHit[1]).toBe(1);
  });

  it("bonding rises with relatives close by, and not when alone", () => {
    const together = new Simulation(1, stage({ initialOrganisms: 3, kinDistance: 0.3 }));
    const alone = new Simulation(1, stage({ initialOrganisms: 1, kinDistance: 0.3 }));
    for (const sim of [together, alone]) {
      for (let i = 0; i < sim.count; i++) for (let g = 0; g < GENE_COUNT; g++) sim.genes[i * GENE_COUNT + g] = 0.4;
      wire(sim, 0, INPUT.bias, OUTPUT_START + OUTPUT.speed, 1);
      for (let i = 0; i < sim.count; i++) {
        sim.x[i] = 30 + i;
        sim.y[i] = 30;
        sim.speed[i] = 0;
      }
    }
    thought(together);
    thought(alone);
    expect(thought(together)[INPUT.chemBond]).toBeGreaterThan(0);
    expect(thought(alone)[INPUT.chemBond]).toBe(0);
  });

  it("calm settles higher in a well-fed organism than in a starving one", () => {
    const calm = (energyFraction: number): number => {
      const sim = new Simulation(1, stage());
      wire(sim, 0, INPUT.bias, OUTPUT_START + OUTPUT.speed, 1);
      sim.speed[0] = 0;
      let value = 0;
      for (let t = 0; t < 150; t++) {
        sim.energy[0] = energyFraction * sim.threshold[0]!;
        value = thought(sim)[INPUT.chemCalm]!;
      }
      return value;
    };
    expect(calm(0.9)).toBeGreaterThan(0.6);
    expect(calm(0.05)).toBeLessThan(0.1);
  });

  it("reading a chemical signal costs a little extra upkeep; not reading one does not", () => {
    const sim = new Simulation(1, stage({ initialOrganisms: 2, chemicalsCost: 0.01 }));
    wire(sim, 0, INPUT.chemReward, OUTPUT_START + OUTPUT.speed, 1);
    wire(sim, 1, INPUT.bias, OUTPUT_START + OUTPUT.speed, 1);
    expect(internals(sim).brainCost[0]! - internals(sim).brainCost[1]!).toBeCloseTo(0.01, 6);
  });

  it("are deterministic, conserve energy and matter, and a saved world carries on exactly", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 150, brainMode: 2, chemicals: 1, kinDistance: 0.1, brainAddConnectionProb: 0.3, foodRegrowPerTick: 0.05 } as Partial<SimConfig>;
    const a = new Simulation(5, config);
    const b = new Simulation(5, config);
    const energy0 = a.energyAudit().total;
    const matter0 = a.matterAudit().total;
    a.run(2000);
    b.run(2000);
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
  }, 90_000);
});

describe("chemical body effects", () => {
  function run(extra: Partial<SimConfig>, stressResponse: number, calmResponse: number, hit = false): { moved: number; basal: number } {
    const sim = new Simulation(1, stage({ chemBodyEffects: 1, chemCalmRate: 0, chemDecay: 0, ...extra }));
    wire(sim, 0, INPUT.bias, OUTPUT_START + OUTPUT.speed, 1);
    sim.genes[GENE.stressResponse] = stressResponse;
    sim.genes[GENE.calmResponse] = calmResponse;
    sim.express(0);
    sim.x[0] = 30;
    sim.y[0] = 30;
    sim.headingX[0] = 1;
    sim.headingY[0] = 0;
    if (hit) internals(sim).chemHit[0] = 1;
    sim.step();
    return { moved: Math.hypot(sim.x[0]! - 30, sim.y[0]! - 30), basal: sim.ledger.basalBurned };
  }

  it("stress, scaled by the gene, speeds the organism up and raises its upkeep", () => {
    const calmOnly = { chemCalmSaving: 0, chemCalmSlow: 0 };
    const none = run(calmOnly, 0, 0, true);
    const full = run(calmOnly, 1, 0, true);
    // A hit sets stress to chemStressHit (0.5); full response: 1 + 0.5 x 0.5 faster and the same more upkeep.
    expect(full.moved / none.moved).toBeCloseTo(1.25, 3);
    expect(full.basal / none.basal).toBeCloseTo(1.25, 3);
    const half = run(calmOnly, 0.5, 0, true);
    expect(half.moved / none.moved).toBeCloseTo(1.125, 3);
  });

  it("calm, scaled by the gene, saves upkeep and slows the organism down", () => {
    const stressOff = { chemStressSpeed: 0, chemStressUpkeep: 0 };
    const none = run(stressOff, 0, 0);
    const full = run(stressOff, 0, 1);
    // A newborn starts at calm 0.5, so a full response saves 0.3 x 0.5 of upkeep and is 0.3 x 0.5 slower.
    expect(full.moved / none.moved).toBeCloseTo(1 - 0.15, 3);
    expect(full.basal / none.basal).toBeCloseTo(1 - 0.15, 3);
  });

  it("the genes do nothing when body effects are off", () => {
    const off = run({ chemBodyEffects: 0 }, 1, 1, true);
    const base = run({ chemBodyEffects: 0 }, 0, 0, true);
    expect(off.moved).toBeCloseTo(base.moved, 9);
    expect(off.basal).toBeCloseTo(base.basal, 9);
    expect(() => new Simulation(1, { brainMode: 2, chemBodyEffects: 1 })).toThrow(/needs chemicals/);
  });

  it("a world with them is deterministic, conserves energy and matter, and a saved world carries on exactly", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 150, brainMode: 2, chemicals: 1, chemBodyEffects: 1, founderSpread: 0.7, kinDistance: 0.1, brainAddConnectionProb: 0.3, foodRegrowPerTick: 0.05 } as Partial<SimConfig>;
    const a = new Simulation(5, config);
    const b = new Simulation(5, config);
    const energy0 = a.energyAudit().total;
    const matter0 = a.matterAudit().total;
    a.run(2000);
    b.run(2000);
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
  }, 90_000);
});
