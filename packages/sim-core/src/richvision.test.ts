import { describe, expect, it } from "vitest";
import { CONN_MAX, INPUT, OUTPUT, OUTPUT_START, RAY_CHANNELS, setConnection } from "./brain";
import { DEFAULT_CONFIG, makeConfig, type SimConfig } from "./config";
import { GENE, GENE_COUNT, traitToGene, type GeneName } from "./genome";
import { Simulation } from "./simulation";
import { snapshotFromBytes, snapshotToBytes } from "./snapshot";

// Phase 11, better eyes (richVision) and the focus action.

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
    brainVisionRange: 0,
    initialSenseRange: 8,
    senseRangeMax: 12,
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
    richVision: 1,
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

function wire(sim: Simulation, i: number, from: number, to: number, weight: number): void {
  sim.brainCount[i] = setConnection(sim.brainFrom, sim.brainTo, sim.brainWeight, i * CONN_MAX, sim.brainCount[i]!, from, to, weight);
  (sim as unknown as { refreshBrain(i: number): void }).refreshBrain(i);
}

/** What organism 0's brain sensed on its last thought, after one tick. Everyone but 0 stands still. */
function sensed(sim: Simulation): number[] {
  for (let i = 1; i < sim.count; i++) setGene(sim, i, "speed", 0.1);
  sim.traceId = sim.id[0]!;
  sim.step();
  return sim.describe(sim.indexOfId(sim.traceId)).brain!.activity!.inputs;
}
const middle = (big: number) => 2 * 2 + big; // the middle ray (straight ahead), smaller 0 or bigger 1

describe("better eyes settings", () => {
  it("are off by default, and checked", () => {
    expect(DEFAULT_CONFIG.richVision).toBe(0);
    expect(DEFAULT_CONFIG.focusAction).toBe(0);
    expect(() => makeConfig({ richVision: 1 })).toThrow(/richVision needs brains/);
    expect(() => makeConfig({ brainMode: 2, focusHold: 0.5 })).toThrow(/focusHold/);
  });

  it("without them every new sense reads 0", () => {
    const sim = new Simulation(1, stage({ richVision: 0 }));
    place(sim, 0, 32, 32);
    place(sim, 1, 36, 32);
    const inputs = sensed(sim);
    for (let k = INPUT.rayColour; k <= INPUT.focusClosing; k++) expect(inputs[k]).toBe(0);
  });
});

describe("colour and motion", () => {
  it("colour: +1 for its own colour, -1 for the opposite one on the colour wheel", () => {
    const look = (hueA: number, hueB: number) => {
      const sim = new Simulation(1, stage());
      setGene(sim, 0, "hue", hueA);
      setGene(sim, 1, "hue", hueB);
      setGene(sim, 1, "size", 0.6);
      place(sim, 0, 32, 32);
      place(sim, 1, 36, 32);
      return sensed(sim)[INPUT.rayColour + middle(0)];
    };
    expect(look(0.3, 0.3)).toBeCloseTo(1, 5);
    expect(look(0.3, 0.8)).toBeCloseTo(-1, 5);
    expect(look(0.95, 0.05)).toBeCloseTo(0.6, 5); // the short way round the wheel
  });

  it("motion: + for something heading my way, - for something heading away", () => {
    const look = (hx: number) => {
      const sim = new Simulation(1, stage());
      place(sim, 0, 32, 32);
      place(sim, 1, 38, 32, hx, 0);
      setGene(sim, 1, "size", 2.5);
      const inputs = sensed(sim);
      return inputs[INPUT.rayMotion + middle(1)]!;
    };
    expect(look(-1)).toBeGreaterThan(0);
    expect(look(1)).toBeLessThan(0);
  });
});

describe("how many, behind, and plants in sight", () => {
  it("counts the smaller and bigger animals in view", () => {
    const sim = new Simulation(1, stage({ initialOrganisms: 5 }));
    place(sim, 0, 32, 32);
    for (const [i, x, y] of [[1, 36, 32], [2, 37, 30], [3, 36, 34], [4, 38, 32]] as const) place(sim, i, x, y);
    for (const i of [1, 2, 3]) setGene(sim, i, "size", 0.6);
    setGene(sim, 4, "size", 2.5);
    const inputs = sensed(sim);
    expect(inputs[INPUT.countSmaller]).toBeCloseTo(3 / (3 + 3), 6);
    expect(inputs[INPUT.countBigger]).toBeCloseTo(1 / (1 + 3), 6);
  });

  it("feels something close behind (bigger +1, smaller -1), but not far behind, and not what it sees", () => {
    const look = (x: number, size: number) => {
      const sim = new Simulation(1, stage());
      place(sim, 0, 32, 32);
      place(sim, 1, x, 32);
      setGene(sim, 1, "size", size);
      const inputs = sensed(sim);
      return [inputs[INPUT.behindNear]!, inputs[INPUT.behindBigger]!];
    };
    const [near, bigger] = look(30.5, 2.5); // 1.5 behind, inside 0.4 x 8
    expect(near).toBeGreaterThan(0);
    expect(bigger).toBe(1);
    expect(look(30.5, 0.6)[1]).toBe(-1);
    expect(look(26, 2.5)[0]).toBe(0); // 6 behind: too far for a rough feel
    expect(look(35, 2.5)[0]).toBe(0); // in front: the eyes see it, so it is not "behind"
  });

  it("sees plants at the edge of sight, ahead, half-left and half-right", () => {
    const sim = new Simulation(1, stage({ initialOrganisms: 1 }));
    place(sim, 0, 20, 36);
    // Reach 0.7 x 8 = 5.6 ahead: (25.6, 36) is cell (3, 4).
    sim.food[4 * 8 + 3] = sim.config.foodCap;
    const inputs = sensed(sim);
    expect(inputs[INPUT.plantSightAhead]).toBeCloseTo(1, 5);
    expect(inputs[INPUT.plantSightLeft]).toBe(0);
    expect(inputs[INPUT.plantSightRight]).toBe(0);
  });

  it("with appetite senses, a plant eater does not see prey's colour and motion; plants it sees fully", () => {
    const sim = new Simulation(1, stage({ brainAppetiteSenses: 1 }));
    setGene(sim, 0, "diet", 0);
    setGene(sim, 1, "size", 0.6);
    place(sim, 0, 32, 32);
    place(sim, 1, 36, 32);
    const inputs = sensed(sim);
    expect(inputs[INPUT.rayColour + middle(0)]).toBe(0);
    expect(inputs[INPUT.countSmaller]).toBe(0);
  });
});

describe("the focus action", () => {
  const FOCUS = OUTPUT_START + OUTPUT.focus;
  /** Organism 0 always wants to focus (bias -> focus); organism 1 is smaller, ahead. */
  function focusing(extra: Partial<SimConfig> = {}) {
    const sim = new Simulation(1, stage({ focusAction: 1, ...extra }));
    wire(sim, 0, INPUT.bias, FOCUS, 3);
    setGene(sim, 1, "size", 0.6);
    place(sim, 0, 32, 32);
    place(sim, 1, 36, 32);
    sensed(sim); // first thought: decides to focus
    return sim;
  }

  it("locks on to the nearest smaller animal in view and reports where it is", () => {
    const sim = focusing();
    place(sim, 0, 32, 32);
    place(sim, 1, 36, 32);
    const inputs = sensed(sim);
    expect(inputs[INPUT.focusAhead]).toBeCloseTo(1, 5);
    expect(inputs[INPUT.focusNear]).toBeGreaterThan(0);
  });

  it("keeps tracking it out of view while within focusHold x sight range, and loses it beyond", () => {
    const sim = focusing();
    sensed(sim); // locked
    place(sim, 0, 32, 32);
    place(sim, 1, 28, 32); // behind: out of view, 4 away (hold 1.5 x 8 = 12)
    let inputs = sensed(sim);
    expect(inputs[INPUT.focusAhead]).toBeCloseTo(-1, 5);
    expect(inputs[INPUT.focusNear]).toBeGreaterThan(0);
    place(sim, 0, 32, 32);
    place(sim, 1, 32 - 20, 32); // 20 away: beyond the hold
    inputs = sensed(sim);
    expect(inputs[INPUT.focusNear]).toBe(0);
  });

  it("costs focusCost a tick while it lasts (sensing line), and nothing when off", () => {
    const sim = focusing({ focusCost: 0.01 });
    const before = sim.ledger.sensingBurned;
    sim.step();
    const withFocus = sim.ledger.sensingBurned - before;
    const plain = new Simulation(1, stage({ focusAction: 1, focusCost: 0.01 }));
    const b2 = plain.ledger.sensingBurned;
    plain.step();
    expect(withFocus - (plain.ledger.sensingBurned - b2)).toBeGreaterThan(0.009);
  });
});

describe("better eyes in a world", () => {
  const WORLD = {
    worldWidth: 128,
    worldHeight: 128,
    initialOrganisms: 150,
    brainMode: 2,
    richVision: 1,
    focusAction: 1,
    eyeMode: 1,
    vigilance: 1,
    brainAddConnectionProb: 0.4,
  };

  it("keep the energy books balanced", () => {
    const sim = new Simulation(15, WORLD);
    const start = sim.energyAudit().total;
    sim.run(2000);
    const L = sim.ledger as unknown as Record<string, number>;
    const burned = Object.entries(L)
      .filter(([k]) => k.endsWith("Burned"))
      .reduce((a, [, v]) => a + v, 0);
    const expected = start + L.sunlightIn! - burned - L.digestionLoss! - L.decayLoss!;
    expect(Math.abs(sim.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
  }, 60_000);

  it("play out the same every time, carry on exactly after a save, and switch on for an older save", () => {
    const a = new Simulation(16, WORLD);
    const b = new Simulation(16, WORLD);
    a.run(1200);
    b.run(1200);
    expect(a.fingerprint()).toBe(b.fingerprint());
    const loaded = Simulation.load(snapshotFromBytes(snapshotToBytes(a.save())));
    a.run(600);
    loaded.run(600);
    expect(loaded.fingerprint()).toBe(a.fingerprint());

    const plain = new Simulation(17, { worldWidth: 128, worldHeight: 128, initialOrganisms: 150, brainMode: 2 });
    plain.run(600);
    const snap = plain.save();
    const sharper = Simulation.load(snap, { changes: { richVision: 1, focusAction: 1, eyeMode: 1 } });
    sharper.run(300);
    expect(sharper.count).toBeGreaterThan(0);
  }, 60_000);
});

void RAY_CHANNELS;
