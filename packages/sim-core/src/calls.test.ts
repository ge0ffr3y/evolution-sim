import { describe, expect, it } from "vitest";
import { CONN_MAX, INPUT, OUTPUT, OUTPUT_START, setConnection, soft } from "./brain";
import { DEFAULT_CONFIG, makeConfig, type SimConfig } from "./config";
import { GENE, GENE_COUNT, traitToGene, type GeneName } from "./genome";
import { Simulation } from "./simulation";
import { snapshotFromBytes, snapshotToBytes } from "./snapshot";

// Phase 11, calls and hearing: a call output, and four hearing inputs.

function stage(extra: Partial<SimConfig> = {}): Partial<SimConfig> {
  return {
    worldWidth: 128,
    worldHeight: 128,
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
    initialSpeed: 0.1,
    speedMin: 0.01,
    mutationRateMin: 0,
    mutationRateMax: 0,
    initialMutationRate: 0,
    metaMutationStd: 0,
    attackMin: 0,
    attackMax: 0,
    calls: 1,
    callRange: 20,
    ...extra,
  };
}

const CALL = OUTPUT_START + OUTPUT.call;
const LOUD = soft(10); // a caller wired bias -> call at weight 10

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

/** Organism 0 listens at (64, 64) facing east; organism `caller` calls (bias -> call). */
function setUp(callerAt: [number, number], extra: Partial<SimConfig> = {}, caller = 1) {
  const sim = new Simulation(1, stage(extra));
  const listener = caller === 1 ? 0 : 1;
  place(sim, listener, 64, 64);
  place(sim, caller, callerAt[0], callerAt[1]);
  wire(sim, caller, INPUT.bias, CALL, 10);
  sim.traceId = sim.id[listener]!;
  return { sim, listener };
}

/** What the listener heard on its last thought. */
function heard(sim: Simulation, listener: number): number[] {
  sim.step();
  return sim.describe(sim.indexOfId(sim.id[listener]!)).brain!.activity!.inputs;
}

describe("call settings", () => {
  it("are off by default, and checked", () => {
    expect(DEFAULT_CONFIG.calls).toBe(0);
    expect(() => makeConfig({ calls: 1 })).toThrow(/calls needs brains/);
    expect(() => makeConfig({ brainMode: 2, callRange: 0 })).toThrow(/callRange/);
  });

  it("without calls nothing is heard", () => {
    const { sim, listener } = setUp([70, 64], { calls: 0 });
    heard(sim, listener);
    const inputs = heard(sim, listener);
    for (const k of [INPUT.hearLoud, INPUT.hearAhead, INPUT.hearSide, INPUT.hearKin]) expect(inputs[k]).toBe(0);
  });
});

describe("hearing a call", () => {
  it("is heard one tick late, from the right direction, fading with distance", () => {
    const { sim, listener } = setUp([70, 64]);
    expect(heard(sim, listener)[INPUT.hearLoud]).toBe(0); // the call is made this tick, heard from the next
    const inputs = heard(sim, listener);
    const reach = LOUD * 20;
    expect(inputs[INPUT.hearLoud]).toBeCloseTo(LOUD * (1 - Math.hypot(sim.x[1]! - sim.x[0]!, sim.y[1]! - sim.y[0]!) / reach), 3);
    expect(inputs[INPUT.hearAhead]).toBeGreaterThan(0.95);
    expect(Math.abs(inputs[INPUT.hearSide]!)).toBeLessThan(0.2);
  });

  it("from the side the eyes call left (+y when facing +x), and a nearer call sounds louder", () => {
    const side = setUp([64, 70]);
    heard(side.sim, side.listener);
    expect(heard(side.sim, side.listener)[INPUT.hearSide]).toBeGreaterThan(0.95);
    const near = setUp([66, 64]);
    heard(near.sim, near.listener);
    const far = setUp([76, 64]);
    heard(far.sim, far.listener);
    expect(heard(near.sim, near.listener)[INPUT.hearLoud]).toBeGreaterThan(heard(far.sim, far.listener)[INPUT.hearLoud]!);
  });

  it("is not heard beyond loudness x callRange", () => {
    const { sim, listener } = setUp([64 + 25, 64]);
    heard(sim, listener);
    expect(heard(sim, listener)[INPUT.hearLoud]).toBe(0);
  });

  it("tells how like its own colour the caller is", () => {
    const { sim, listener } = setUp([70, 64]);
    setGene(sim, 0, "hue", 0.2);
    setGene(sim, 1, "hue", 0.7);
    heard(sim, listener);
    expect(heard(sim, listener)[INPUT.hearKin]).toBeCloseTo(-1, 5);
  });

  it("does not depend on which of the two is processed first", () => {
    const a = setUp([70, 64], {}, 1);
    const b = setUp([70, 64], {}, 0);
    heard(a.sim, a.listener);
    heard(b.sim, b.listener);
    expect(heard(a.sim, a.listener)[INPUT.hearLoud]).toBeCloseTo(heard(b.sim, b.listener)[INPUT.hearLoud]!, 12);
  });

  it("calling costs callCost x loudness a tick on the sensing line", () => {
    const loud = setUp([70, 64], { callCost: 0.01 });
    loud.sim.step();
    const before = loud.sim.ledger.sensingBurned;
    loud.sim.step();
    const quiet = new Simulation(1, stage({ callCost: 0.01 }));
    quiet.step();
    const qBefore = quiet.ledger.sensingBurned;
    quiet.step();
    const extra = loud.sim.ledger.sensingBurned - before - (quiet.ledger.sensingBurned - qBefore);
    expect(extra).toBeCloseTo(0.01 * LOUD, 4);
  });
});

describe("calls in a world", () => {
  const WORLD = { worldWidth: 128, worldHeight: 128, initialOrganisms: 150, brainMode: 2, calls: 1, brainAddConnectionProb: 0.4 };

  it("keep the energy books balanced", () => {
    const sim = new Simulation(20, WORLD);
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
    const a = new Simulation(21, WORLD);
    const b = new Simulation(21, WORLD);
    a.run(1200);
    b.run(1200);
    expect(a.fingerprint()).toBe(b.fingerprint());
    const loaded = Simulation.load(snapshotFromBytes(snapshotToBytes(a.save())));
    a.run(600);
    loaded.run(600);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
    const plain = new Simulation(22, { ...WORLD, calls: 0 });
    plain.run(500);
    const vocal = Simulation.load(plain.save(), { changes: { calls: 1 } });
    vocal.run(300);
    expect(vocal.count).toBeGreaterThan(0);
  }, 60_000);
});
