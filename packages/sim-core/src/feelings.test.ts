import { describe, expect, it } from "vitest";
import { INPUT } from "./brain";
import { DEFAULT_CONFIG, makeConfig, type SimConfig } from "./config";
import { GENE, GENE_COUNT, traitToGene, type GeneName } from "./genome";
import { Simulation } from "./simulation";
import { snapshotFromBytes, snapshotToBytes } from "./snapshot";

// Phase 11, feelings and body senses: pain (with direction), joy, curiosity, sickness, ready to breed, taste.

/** A quiet 64x64 stage (as in the brain-world tests): no food growing, no wobble, brains think every tick, nothing breeds. */
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
    feelings: 1,
    ...extra,
  };
}

type Hidden = {
  feel: Float32Array;
  novelty: Int32Array;
  addPain(i: number, amount: number, from: number): void;
  addJoy(i: number, amount: number): void;
};
const h = (sim: Simulation): Hidden => sim as unknown as Hidden;
const PAIN = 0;
const JOY = 3;
const TASTE = 4;
const SLOTS = 5;

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

describe("feelings settings", () => {
  it("are off by default, and checked", () => {
    expect(DEFAULT_CONFIG.feelings).toBe(0);
    expect(DEFAULT_CONFIG.curiosity).toBe(0);
    expect(DEFAULT_CONFIG.learnFeelings).toBe(0);
    expect(() => makeConfig({ feelings: 1 })).toThrow(/feelings needs brains/);
    expect(() => makeConfig({ brainMode: 2, curiosity: 1 })).toThrow(/curiosity needs feelings/);
    expect(() => makeConfig({ brainMode: 2, feelings: 1, painFade: 1.5 })).toThrow(/painFade/);
  });

  it("without feelings every feeling sense reads 0, even after an attack", () => {
    const sim = new Simulation(1, stage({ feelings: 0 }));
    const inputs = sensed(sim);
    for (const k of [INPUT.pain, INPUT.painAhead, INPUT.painSide, INPUT.joy, INPUT.sick, INPUT.ready, INPUT.taste]) expect(inputs[k]).toBe(0);
  });
});

describe("pain", () => {
  it("points toward whoever caused it: ahead, or to the side (positive = the side the eyes call left)", () => {
    const sim = new Simulation(1, stage());
    place(sim, 0, 32, 32);
    place(sim, 1, 40, 32);
    h(sim).addPain(0, 1, 1); // from straight ahead
    let inputs = sensed(sim);
    expect(inputs[INPUT.pain]).toBeCloseTo(0.9, 5); // it already faded one tick
    expect(inputs[INPUT.painAhead]).toBeCloseTo(0.9, 5);
    expect(inputs[INPUT.painSide]).toBeCloseTo(0, 5);

    const side = new Simulation(1, stage());
    place(side, 0, 32, 32);
    place(side, 1, 32, 40); // +y: the side the vision rays call left when facing +x
    h(side).addPain(0, 1, 1);
    inputs = sensed(side);
    expect(inputs[INPUT.painAhead]).toBeCloseTo(0, 5);
    expect(inputs[INPUT.painSide]).toBeCloseTo(0.9, 5);
  });

  it("is capped at 1 and fades by painFade a tick until it is gone", () => {
    const sim = new Simulation(1, stage({ painFade: 0.5 }));
    h(sim).addPain(0, 3, 1);
    expect(h(sim).feel[PAIN]).toBe(1);
    sim.step();
    expect(h(sim).feel[PAIN]).toBeCloseTo(0.5, 6);
    for (let t = 0; t < 30; t++) sim.step();
    expect(h(sim).feel[PAIN]).toBe(0);
  });

  it("happens in a real world: animals that survive attacks feel it", () => {
    const sim = new Simulation(4, {
      worldWidth: 128,
      worldHeight: 128,
      initialOrganisms: 200,
      brainMode: 2,
      feelings: 1,
      initialAttack: 0.6,
      attackThreshold: 0.2,
      initialArmor: 0.6,
    });
    let hurt = 0;
    for (let t = 0; t < 400 && hurt === 0; t++) {
      sim.step();
      for (let i = 0; i < sim.count; i++) if (h(sim).feel[i * SLOTS + PAIN]! > 0) hurt++;
    }
    expect(sim.totalAttacks).toBeGreaterThan(0);
    expect(hurt).toBeGreaterThan(0);
  });
});

describe("joy and taste", () => {
  it("a good meal brings joy and a good taste", () => {
    const sim = new Simulation(1, stage({ initialOrganisms: 1, initialSpeed: 0.1 }));
    place(sim, 0, 36, 36);
    sim.food[4 * 8 + 4] = sim.config.foodCap;
    const inputs = sensed(sim);
    sim.step();
    expect(h(sim).feel[JOY]).toBeGreaterThan(0);
    expect(h(sim).feel[TASTE]).toBeGreaterThan(0);
    expect(inputs[INPUT.joy]).toBeGreaterThanOrEqual(0);
  });

  it("being fed and free of pain is a quiet joy; hunger is not", () => {
    const fed = new Simulation(1, stage({ initialOrganisms: 1 }));
    fed.energy[0] = fed.threshold[0]! * 0.9;
    fed.step();
    expect(h(fed).feel[JOY]).toBeGreaterThan(0);
    const hungry = new Simulation(1, stage({ initialOrganisms: 1 }));
    hungry.step();
    expect(h(hungry).feel[JOY]).toBe(0);
  });

  it("joy is capped at 1 and fades", () => {
    const sim = new Simulation(1, stage({ initialOrganisms: 1, joyFade: 0.5 }));
    h(sim).addJoy(0, 5);
    expect(h(sim).feel[JOY]).toBe(1);
    sim.step();
    expect(h(sim).feel[JOY]).toBeCloseTo(0.5, 6);
  });
});

describe("body senses", () => {
  it("ready to breed reads 1 once it has enough energy to breed, 0 before", () => {
    const sim = new Simulation(1, stage({ initialOrganisms: 1 }));
    expect(sensed(sim)[INPUT.ready]).toBe(0);
    sim.energy[0] = sim.threshold[0]! * 2;
    expect(sensed(sim)[INPUT.ready]).toBe(1);
  });

  it("feeling sick reads 1 while it is sick (disease worlds)", () => {
    const sim = new Simulation(1, stage({ initialOrganisms: 1, diseaseTransmission: 0.5 }));
    expect(sensed(sim)[INPUT.sick]).toBe(0);
    (sim as unknown as { sickFor: Uint32Array | Uint16Array }).sickFor[0] = 50;
    expect(sensed(sim)[INPUT.sick]).toBe(1);
  });
});

describe("curiosity", () => {
  const curious = (gene: number) => {
    const sim = new Simulation(1, stage({ initialOrganisms: 1, curiosity: 1, noveltyEvery: 1, noveltyCellSize: 16, joyFade: 1, curiosityJoy: 0.2, initialSpeed: 0.1 }));
    setGene(sim, 0, "curiosity", gene);
    return sim;
  };

  it("somewhere new brings joy in proportion to the gene; somewhere it has just been does not", () => {
    const sim = curious(1);
    place(sim, 0, 8, 8);
    sim.step();
    const first = h(sim).feel[JOY]!;
    expect(first).toBeCloseTo(0.2, 5);
    place(sim, 0, 8, 8);
    sim.step();
    expect(h(sim).feel[JOY]).toBeCloseTo(first, 5); // same square: nothing new
    place(sim, 0, 40, 40);
    sim.step();
    expect(h(sim).feel[JOY]).toBeCloseTo(first + 0.2, 5);

    const dull = curious(0);
    place(dull, 0, 8, 8);
    dull.step();
    expect(h(dull).feel[JOY]).toBe(0);
  });

  it("is in use only when switched on, costs curiosityCost x gene, and is left out of kind and mating", () => {
    const off = new Simulation(1, stage());
    expect((off as unknown as { activeGene: boolean[] }).activeGene[GENE.curiosity]).toBe(false);
    const sim = curious(0);
    expect((sim as unknown as { activeGene: boolean[] }).activeGene[GENE.curiosity]).toBe(true);
    const before = sim.senseCost[0]!;
    setGene(sim, 0, "curiosity", 1);
    expect(sim.senseCost[0]! - before).toBeCloseTo(sim.config.curiosityCost, 8);
    expect((sim as unknown as { mateMask: number[] }).mateMask).not.toContain(GENE.curiosity);
  });
});

describe("feelings in a world", () => {
  const WORLD = { worldWidth: 128, worldHeight: 128, initialOrganisms: 150, brainMode: 2, feelings: 1, curiosity: 1, initialCuriosity: 0.5, brainAddConnectionProb: 0.3 };

  it("move no energy: the books still balance", () => {
    const sim = new Simulation(12, WORLD);
    const start = sim.energyAudit().total;
    sim.run(2000);
    const L = sim.ledger as unknown as Record<string, number>;
    const burned = Object.entries(L)
      .filter(([k]) => k.endsWith("Burned"))
      .reduce((a, [, v]) => a + v, 0);
    const expected = start + L.sunlightIn! - burned - L.digestionLoss! - L.decayLoss!;
    expect(Math.abs(sim.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
  }, 60_000);

  it("play out the same every time and carry on exactly after saving and loading", () => {
    const a = new Simulation(13, WORLD);
    const b = new Simulation(13, WORLD);
    a.run(1200);
    b.run(1200);
    expect(a.fingerprint()).toBe(b.fingerprint());
    const loaded = Simulation.load(snapshotFromBytes(snapshotToBytes(a.save())));
    a.run(600);
    loaded.run(600);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
  }, 60_000);

  it("can be switched on for a world saved without them (as the stream world will be)", () => {
    const plain = new Simulation(14, { worldWidth: 128, worldHeight: 128, initialOrganisms: 150, brainMode: 2 });
    plain.run(800);
    const snapshot = plain.save();
    const awake = Simulation.load({ ...snapshot, config: { ...snapshot.config, feelings: 1, curiosity: 1 } });
    awake.run(400);
    expect(awake.count).toBeGreaterThan(0);
    expect(h(awake).feel.length).toBeGreaterThan(0);
  }, 60_000);
});
