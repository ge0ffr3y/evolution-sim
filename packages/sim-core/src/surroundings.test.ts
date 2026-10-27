import { describe, expect, it } from "vitest";
import { INPUT } from "./brain";
import { smoothWave } from "./climate";
import { DEFAULT_CONFIG, makeConfig, type SimConfig } from "./config";
import { GENE, GENE_COUNT, traitToGene, type GeneName } from "./genome";
import { Simulation } from "./simulation";
import { snapshotFromBytes, snapshotToBytes } from "./snapshot";

// Phase 11, surroundings (worldSenses): crowding, ground tremor, daylight and a compass.

function stage(extra: Partial<SimConfig> = {}): Partial<SimConfig> {
  return {
    worldWidth: 64,
    worldHeight: 64,
    initialOrganisms: 2,
    maxOrganisms: 30,
    brainMode: 2,
    brainFounderReflex: 0,
    brainEvery: 1,
    brainTurnNoise: 0,
    foodRegrowPerTick: 0,
    initialFoodFraction: 0,
    reproThresholdPerSize: 1e9,
    initialEnergyFraction: 1e-4,
    initialSpeed: 0.5,
    speedMin: 0.1,
    mutationRateMin: 0,
    mutationRateMax: 0,
    initialMutationRate: 0,
    metaMutationStd: 0,
    attackMin: 0,
    attackMax: 0,
    worldSenses: 1,
    ...extra,
  };
}

function setGene(sim: Simulation, i: number, gene: GeneName, trait: number): void {
  sim.genes[i * GENE_COUNT + GENE[gene]] = traitToGene(trait, sim.ranges[gene]);
  sim.express(i);
}

function place(sim: Simulation, i: number, x: number, y: number, hx = 1, hy = 0): void {
  sim.x[i] = x;
  sim.y[i] = y;
  sim.headingX[i] = hx;
  sim.headingY[i] = hy;
}

/** What organism 0's brain sensed on its last thought, after one tick. */
function sensed(sim: Simulation): number[] {
  sim.traceId = sim.id[0]!;
  sim.step();
  return sim.describe(sim.indexOfId(sim.traceId)).brain!.activity!.inputs;
}

describe("surroundings settings", () => {
  it("are off by default, and checked", () => {
    expect(DEFAULT_CONFIG.worldSenses).toBe(0);
    expect(() => makeConfig({ worldSenses: 1 })).toThrow(/worldSenses needs brains/);
    expect(() => makeConfig({ brainMode: 2, crowdHalf: 0 })).toThrow(/crowdHalf/);
  });

  it("without them all five read 0", () => {
    const sim = new Simulation(1, stage({ worldSenses: 0, dayLength: 100 }));
    const inputs = sensed(sim);
    for (const k of [INPUT.crowding, INPUT.tremor, INPUT.light, INPUT.compassNorth, INPUT.compassEast]) expect(inputs[k]).toBe(0);
  });
});

describe("crowding and tremor", () => {
  it("crowding counts every animal within crowdRange, whatever its size or where it stands", () => {
    const sim = new Simulation(1, stage({ initialOrganisms: 6, crowdRange: 8, crowdHalf: 5 }));
    place(sim, 0, 32, 32);
    for (const [i, x, y] of [[1, 36, 32], [2, 28, 32], [3, 32, 36], [4, 30, 30], [5, 50, 50]] as const) place(sim, i, x, y);
    for (let i = 1; i < 6; i++) setGene(sim, i, "speed", 0.1);
    expect(sensed(sim)[INPUT.crowding]).toBeCloseTo(4 / (4 + 5), 2); // the one at (50, 50) is too far
  });

  it("tremor comes only from bigger animals that move, more for bigger and faster ones, from any side", () => {
    const tremor = (size: number, speed: number) => {
      const sim = new Simulation(1, stage());
      place(sim, 0, 32, 32);
      place(sim, 1, 26, 32); // behind it: no need to see
      setGene(sim, 1, "size", size);
      setGene(sim, 1, "speed", speed);
      return sensed(sim)[INPUT.tremor]!;
    };
    expect(tremor(0.6, 2)).toBe(0); // smaller: no tremor
    expect(tremor(2.5, 1)).toBeGreaterThan(0);
    expect(tremor(2.5, 2)).toBeGreaterThan(tremor(2.5, 1));
    expect(tremor(3, 1)).toBeGreaterThan(tremor(2, 1));
  });
});

describe("daylight and compass", () => {
  it("daylight follows the day's wave; 0 in a world without days", () => {
    const sim = new Simulation(1, stage({ initialOrganisms: 1, dayLength: 100 }));
    for (let t = 0; t < 30; t++) sim.step();
    const inputs = sensed(sim);
    // It thought during the last tick, at the tick count before that step.
    expect(inputs[INPUT.light]).toBeCloseTo(smoothWave((sim.tick - 1) / 100 + 0.25), 9);
    expect(sensed(new Simulation(1, stage({ initialOrganisms: 1, dayLength: 0 })))[INPUT.light]).toBe(0);
  });

  it("the compass says how much it faces north (the top of the map) and east", () => {
    const facing = (hx: number, hy: number) => {
      const sim = new Simulation(1, stage({ initialOrganisms: 1, initialSpeed: 0.1, speedMin: 0.01 }));
      place(sim, 0, 32, 32, hx, hy);
      const inputs = sensed(sim);
      return [inputs[INPUT.compassNorth]!, inputs[INPUT.compassEast]!];
    };
    const [n1, e1] = facing(0, -1);
    expect(n1).toBeCloseTo(1, 1);
    expect(e1).toBeCloseTo(0, 1);
    const [n2, e2] = facing(1, 0);
    expect(n2).toBeCloseTo(0, 1);
    expect(e2).toBeCloseTo(1, 1);
  });
});

describe("surroundings in a world", () => {
  const WORLD = { worldWidth: 128, worldHeight: 128, initialOrganisms: 150, brainMode: 2, worldSenses: 1, climateMode: 1, dayLength: 150, brainAddConnectionProb: 0.4 };

  it("play out the same every time, carry on exactly after a save, and switch on for an older save", () => {
    const a = new Simulation(18, WORLD);
    const b = new Simulation(18, WORLD);
    a.run(1200);
    b.run(1200);
    expect(a.fingerprint()).toBe(b.fingerprint());
    const loaded = Simulation.load(snapshotFromBytes(snapshotToBytes(a.save())));
    a.run(600);
    loaded.run(600);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
    const plain = new Simulation(19, { ...WORLD, worldSenses: 0 });
    plain.run(500);
    const aware = Simulation.load(plain.save(), { changes: { worldSenses: 1 } });
    aware.run(300);
    expect(aware.count).toBeGreaterThan(0);
  }, 60_000);
});
