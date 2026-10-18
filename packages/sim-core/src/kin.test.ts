import { describe, expect, it } from "vitest";
import { INPUT } from "./brain";
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

function place(sim: Simulation, i: number, x: number, y: number, hx = 1, hy = 0): void {
  sim.x[i] = x;
  sim.y[i] = y;
  sim.headingX[i] = hx;
  sim.headingY[i] = hy;
}

describe("kin recognition", () => {
  /** A big armed meat eater and a small plant eater on the same spot. Returns the kills after a few ticks. */
  function kills(extra: Partial<SimConfig>): number {
    const sim = new Simulation(1, quiet({ initialSize: 1, attackMax: 2, ...extra }));
    setGenes(sim, 0, 0.3);
    setGenes(sim, 1, 0.3);
    sim.genes[0 * GENE_COUNT + GENE.attack] = 1;
    sim.genes[0 * GENE_COUNT + GENE.diet] = 0.9;
    sim.genes[0 * GENE_COUNT + GENE.size] = traitToGene(1.5, sim.ranges.size);
    sim.genes[1 * GENE_COUNT + GENE.size] = traitToGene(0.5, sim.ranges.size);
    sim.genes[1 * GENE_COUNT + GENE.attack] = 0;
    sim.genes[1 * GENE_COUNT + GENE.armor] = 0;
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

  it("without it, a hungry meat eater attacks whatever is smallest and nearest", () => {
    expect(kills({})).toBeGreaterThan(0);
  });

  it("with it, nobody attacks a relative (genetically close), however easy the target", () => {
    // The two differ by about 0.3 (root-mean-square) in their genes: kin at kinDistance 0.5...
    expect(kills({ kinDistance: 0.5 })).toBe(0);
    // ...but strangers at kinDistance 0.1: attacked as before.
    expect(kills({ kinDistance: 0.1 })).toBeGreaterThan(0);
  });

  it("is off by default and rejects nonsense", () => {
    expect(() => new Simulation(1, { kinDistance: 2 })).toThrow(/kinDistance/);
    expect(() => new Simulation(1, { herdBonus: 1 })).toThrow(/needs kinDistance/);
  });
});

describe("the selfish herd", () => {
  function herd(relatives: number, extra: Partial<SimConfig> = {}): number {
    const sim = new Simulation(1, quiet({ initialOrganisms: 1 + relatives + 3, kinDistance: 0.2, herdBonus: 2, herdRange: 8, herdCap: 4, ...extra }));
    for (let i = 0; i < sim.count; i++) setGenes(sim, i, 0.4);
    place(sim, 0, 30, 30);
    for (let k = 1; k <= relatives; k++) place(sim, k, 30 + k * 0.5, 31); // relatives, close by
    for (let k = relatives + 1; k < sim.count; k++) {
      setGenes(sim, k, 0.9); // strangers (genetically far away) right next to it
      place(sim, k, 30.5, 29.5);
    }
    (sim as unknown as { hash: { rebuild(x: Float32Array, y: Float32Array, n: number): void } }).hash.rebuild(sim.x, sim.y, sim.count);
    return (sim as unknown as { herdFactor(i: number): number }).herdFactor(0);
  }

  it("a lone animal is not helped; relatives close by make it harder to kill, up to a cap", () => {
    expect(herd(0)).toBe(1);
    expect(herd(2)).toBeCloseTo(1 + (2 * 2) / 4, 9);
    expect(herd(4)).toBeCloseTo(3, 9);
    expect(herd(6)).toBeCloseTo(3, 9); // never more than the cap
  });

  it("strangers do not count, and neither do relatives out of range", () => {
    const sim = new Simulation(1, quiet({ initialOrganisms: 3, kinDistance: 0.2, herdBonus: 2, herdRange: 5, herdCap: 4 }));
    for (let i = 0; i < 3; i++) setGenes(sim, i, 0.4);
    setGenes(sim, 2, 0.9);
    place(sim, 0, 30, 30);
    place(sim, 1, 40, 30); // a relative, but 10 away (range is 5)
    place(sim, 2, 31, 30); // a stranger, close
    (sim as unknown as { hash: { rebuild(x: Float32Array, y: Float32Array, n: number): void } }).hash.rebuild(sim.x, sim.y, sim.count);
    expect((sim as unknown as { herdFactor(i: number): number }).herdFactor(0)).toBe(1);
  });

  it("is off by default: the factor is always 1", () => {
    expect(herd(5, { herdBonus: 0 })).toBe(1);
  });
});

describe("brain senses for relatives, comfort and water", () => {
  function stage(extra: Partial<SimConfig> = {}): Partial<SimConfig> {
    return quiet({ initialOrganisms: 1, brainMode: 2, brainFounderReflex: 0, brainEvery: 1, brainTurnNoise: 0, brainVisionRange: 0, maxOrganisms: 40, ...extra });
  }
  function seen(sim: Simulation): number[] {
    sim.traceId = sim.id[0]!;
    sim.step();
    return sim.describe(sim.indexOfId(sim.traceId)).brain!.activity!.inputs;
  }

  it("relatives: how many are near (up to the cap), and which way the herd lies", () => {
    const sim = new Simulation(1, stage({ initialOrganisms: 4, kinDistance: 0.2, herdRange: 10, herdCap: 4 }));
    for (let i = 0; i < 4; i++) setGenes(sim, i, 0.4);
    place(sim, 0, 30, 30); // faces east
    place(sim, 1, 34, 30); // ahead
    place(sim, 2, 30, 34); // to the left (+y)
    setGenes(sim, 3, 0.95);
    place(sim, 3, 30, 26); // a stranger on the right: ignored
    const inputs = seen(sim);
    expect(inputs[INPUT.kinDensity]).toBeCloseTo(2 / 4, 5);
    expect(inputs[INPUT.kinAhead]).toBeCloseTo(0.5, 1);
    expect(inputs[INPUT.kinSide]).toBeCloseTo(0.5, 1);
  });

  it("relatives: nothing sensed when kin recognition is off or nobody is near", () => {
    const off = new Simulation(1, stage({ initialOrganisms: 2 }));
    place(off, 0, 30, 30);
    place(off, 1, 32, 30);
    expect(seen(off)[INPUT.kinDensity]).toBe(0);
    const alone = new Simulation(1, stage({ initialOrganisms: 2, kinDistance: 0.2 }));
    place(alone, 0, 10, 10);
    place(alone, 1, 50, 50);
    expect(seen(alone)[INPUT.kinDensity]).toBe(0);
  });

  it("comfort: positive when it is hotter than the organism likes, negative when colder, 0 without the thermal gene", () => {
    const make = (pref: number): number => {
      const sim = new Simulation(1, stage({ climateMode: 1, thermalCostCoeff: 0.0001 }));
      sim.genes[GENE.thermal] = pref;
      sim.express(0);
      place(sim, 0, 32, 32); // the equator: warm
      return seen(sim)[INPUT.comfort]!;
    };
    expect(make(0.1)).toBeGreaterThan(0.5); // likes cold, standing somewhere hot
    expect(make(0.9)).toBeLessThan(-0.05);
    const none = new Simulation(1, stage({ climateMode: 1 }));
    expect(seen(none)[INPUT.comfort]).toBe(0);
  });

  it("water ahead: 1 when it is right there, 0.5 a bit further, 0 when the way is clear or there is no terrain", () => {
    const flat = { terrainMode: 1, terrainWaterFraction: 0, terrainMountainFraction: 0, terrainDesertFraction: 0, terrainForestFraction: 0, terrainBarrierWidth: 1 } as Partial<SimConfig>;
    // The channel in the middle is the column of cells x = 32 to 40.
    const look = (x: number): number => {
      const sim = new Simulation(1, stage(flat));
      place(sim, 0, x, 20);
      return seen(sim)[INPUT.barrier]!;
    };
    expect(look(27)).toBe(1); // 5 units short of the water: within 6 (0.75 of a cell)
    expect(look(22)).toBe(0.5); // 10 short: within 14
    expect(look(15)).toBe(0);
    const none = new Simulation(1, stage());
    place(none, 0, 27, 20);
    expect(seen(none)[INPUT.barrier]).toBe(0);
  });

  it("a world with all of it on is still deterministic and conserves energy and matter", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 150, brainMode: 2, brainAddConnectionProb: 0.3, kinDistance: 0.2, herdBonus: 1, climateMode: 1, thermalCostCoeff: 1, terrainMode: 1, sexualReproduction: 1, mateRange: 10 } as Partial<SimConfig>;
    const a = new Simulation(4, config);
    const b = new Simulation(4, config);
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
  }, 120_000);
});
