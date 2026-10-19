import { describe, expect, it } from "vitest";
import { GENE, GENE_COUNT } from "./genome";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

function quiet(extra: Partial<SimConfig> = {}): Partial<SimConfig> {
  return {
    worldWidth: 64,
    worldHeight: 64,
    initialOrganisms: 1,
    maxOrganisms: 50,
    foodRegrowPerTick: 0,
    initialFoodFraction: 0,
    initialEnergyFraction: 3, // everyone starts above the energy needed to reproduce
    mutationRateMin: 0,
    mutationRateMax: 0,
    initialMutationRate: 0,
    metaMutationStd: 0,
    speciesEvery: 0,
    turnStd: 0,
    attackMin: 0,
    attackMax: 0,
    sexualReproduction: 2,
    initialSex: 1, // every ready animal looks for a mate
    sexAcceptAny: 1,
    ...extra,
  };
}

describe("facultative sex", () => {
  it("a lone mate-seeker waits forever by default, but with a wait limit gives up and splits in two", () => {
    const forever = new Simulation(1, quiet());
    forever.nutrient.fill(1000);
    forever.run(200);
    expect(forever.totalBirths).toBe(0);
    const patient = new Simulation(1, quiet({ sexWaitLimit: 50 }));
    patient.nutrient.fill(1000);
    while (patient.totalBirths === 0 && patient.tick < 200) patient.step();
    expect(patient.tick).toBeGreaterThanOrEqual(50); // it waited out the limit first
    expect(patient.tick).toBeLessThan(60);
    expect(patient.sexualBirths).toBe(0); // and then split in two
  });
});

describe("taking a mate that is not ready to reproduce on its own", () => {
  function pair(fraction: number): Simulation {
    const sim = new Simulation(1, quiet({ initialOrganisms: 2, mateReadyFraction: fraction }));
    sim.nutrient.fill(1000);
    for (let i = 0; i < 2; i++) for (let g = 0; g < GENE_COUNT; g++) sim.genes[i * GENE_COUNT + g] = 0.4;
    sim.genes[GENE.sex] = 1;
    for (let i = 0; i < 2; i++) {
      sim.express(i);
      sim.speed[i] = 0;
      sim.x[i] = 30 + i;
      sim.y[i] = 30;
    }
    sim.energy[1] = 0.7 * sim.threshold[1]!; // well fed, but not ready itself
    sim.step();
    return sim;
  }
  it("by default a mate must be ready itself; with a lower bar a well-fed neighbor will do", () => {
    expect(pair(1).sexualBirths).toBe(0);
    expect(pair(0.6).sexualBirths).toBeGreaterThan(0);
  });
});

describe("synergy between harmful mutations", () => {
  it("each bad spot costs more than the last", () => {
    const sim = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 2, mutationLoadRate: 1, mutationLoadCost: 0.02, mutationLoadSynergy: 0.01 });
    const h = sim as unknown as { loadMask: Uint32Array; basalCost: Float32Array };
    h.loadMask[0] = 0;
    sim.express(0);
    const clean = h.basalCost[0]!;
    h.loadMask[0] = 0b1111; // four bad spots
    sim.express(0);
    expect(h.basalCost[0]! / clean).toBeCloseTo(1 + 0.02 * 4 + 0.01 * 16, 5);
  });
});

describe("facultative sex and easier mates together", () => {
  it("are deterministic, conserve energy and matter, and a saved world carries on exactly", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 200, sexualReproduction: 2, sexAcceptAny: 1, sexFounderSpread: 1, sexWaitLimit: 150, mateReadyFraction: 0.6, mutationLoadRate: 1, mutationLoadSynergy: 0.005, mutationLoadStart: 2 } as Partial<SimConfig>;
    const a = new Simulation(7, config);
    const b = new Simulation(7, config);
    const energy0 = a.energyAudit().total;
    const matter0 = a.matterAudit().total;
    a.run(2500);
    b.run(2500);
    const L = a.ledger;
    const burned = L.basalBurned + L.movementBurned + L.sensingBurned + L.attackBurned + L.armorBurned + L.brainBurned;
    const expected = energy0 + L.sunlightIn - burned - L.digestionLoss - L.decayLoss;
    expect(Math.abs(a.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
    expect(Math.abs(a.matterAudit().total - matter0) / matter0).toBeLessThan(1e-9);
    expect(a.sexualBirths).toBeGreaterThan(0);
    expect(a.fingerprint()).toBe(b.fingerprint());
    const loaded = Simulation.load(a.save());
    a.run(500);
    loaded.run(500);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
  }, 60_000);
});
