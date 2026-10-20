import { describe, expect, it } from "vitest";
import { CONN_MAX, INPUT, OUTPUT, OUTPUT_START, setConnection } from "./brain";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

const BOND_SLOTS = 6;

function quiet(extra: Partial<SimConfig> = {}): Partial<SimConfig> {
  return {
    worldWidth: 128,
    worldHeight: 128,
    initialOrganisms: 2,
    maxOrganisms: 200,
    multicellular: 1,
    brainMode: 2,
    brainFounderReflex: 0,
    brainEvery: 1,
    brainTurnNoise: 0,
    foodRegrowPerTick: 0,
    initialFoodFraction: 0,
    reproThresholdPerSize: 1e9,
    initialEnergyFraction: 0.5,
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

function wire(sim: Simulation, index: number, from: number, to: number, weight: number): void {
  sim.brainCount[index] = setConnection(sim.brainFrom, sim.brainTo, sim.brainWeight, index * CONN_MAX, sim.brainCount[index]!, from, to, weight);
  (sim as unknown as { refreshBrain(i: number): void }).refreshBrain(index);
}

describe("colonies of cells with brains", () => {
  it("are allowed now", () => {
    expect(() => new Simulation(1, quiet())).not.toThrow();
  });

  it("two bonded cells whose brains want to go different ways are held together by the bond", () => {
    const sim = new Simulation(1, quiet({ bondShare: 0 }));
    const rest = sim.config.bondRestLength;
    sim.x[0] = 60;
    sim.y[0] = 60;
    sim.x[1] = 60 + rest;
    sim.y[1] = 60;
    sim.bondTo[0] = 1;
    sim.bondTo[BOND_SLOTS] = 0;
    for (const i of [0, 1]) {
      sim.energy[i] = 1000;
      wire(sim, i, INPUT.bias, OUTPUT_START + OUTPUT.speed, 1);
    }
    wire(sim, 0, INPUT.bias, OUTPUT_START + OUTPUT.turn, 1); // one keeps turning left...
    wire(sim, 1, INPUT.bias, OUTPUT_START + OUTPUT.turn, -1); // ...the other right
    let farthest = 0;
    for (let t = 0; t < 300; t++) {
      sim.step();
      let dx = Math.abs(sim.x[1]! - sim.x[0]!);
      let dy = Math.abs(sim.y[1]! - sim.y[0]!);
      if (dx > 64) dx = 128 - dx; // the world wraps around
      if (dy > 64) dy = 128 - dy;
      farthest = Math.max(farthest, Math.hypot(dx, dy));
    }
    expect(sim.count).toBe(2);
    expect(farthest).toBeLessThan(rest * 3);
  });

  it("a world of them is deterministic, keeps its bonds consistent, conserves energy and matter, and saves and reloads exactly", () => {
    const config = quiet({
      initialOrganisms: 150, initialBond: 0.5, cellTypes: 1, foodRegrowPerTick: 0.03, initialFoodFraction: 1, reproThresholdPerSize: 20,
      brainAddConnectionProb: 0.3, brainMemory: 1, chemicals: 1, homeMode: 2,
    });
    const a = new Simulation(11, config);
    const b = new Simulation(11, config);
    const energy0 = a.energyAudit().total;
    const matter0 = a.matterAudit().total;
    a.run(2500);
    b.run(2500);
    for (let i = 0; i < a.count; i++) {
      for (let k = 0; k < BOND_SLOTS; k++) {
        const p = a.bondTo[i * BOND_SLOTS + k]!;
        if (p < 0) continue;
        expect(p).toBeLessThan(a.count);
        let back = false;
        for (let m = 0; m < BOND_SLOTS; m++) if (a.bondTo[p * BOND_SLOTS + m] === i) back = true;
        expect(back).toBe(true);
      }
    }
    const L = a.ledger;
    const burned = L.basalBurned + L.movementBurned + L.sensingBurned + L.attackBurned + L.armorBurned + L.brainBurned;
    const expected = energy0 + L.sunlightIn - burned - L.digestionLoss - L.decayLoss;
    expect(Math.abs(a.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
    expect(Math.abs(a.matterAudit().total - matter0) / matter0).toBeLessThan(1e-9);
    expect(a.fingerprint()).toBe(b.fingerprint());
    expect(a.stats().colonies.count).toBeGreaterThan(0);
    const loaded = Simulation.load(a.save());
    a.run(500);
    loaded.run(500);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
  }, 120_000);
});
