import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";
import { snapshotFromBytes, snapshotToBytes } from "./snapshot";
import { GENE, GENE_COUNT } from "./genome";
import { HIDDEN_MAX, INPUT, INPUT_COUNT, LEARN_SLOTS, OUTPUT, OUTPUT_COUNT, OUTPUT_START, applyLearning, evaluateBrain, learnedWeights, updateTraces } from "./brain";
import type { SimConfig } from "./config";

/** A small brainy world with learning and its senses on, seasons for the time-of-year sense, and a starting spread of the learning gene. */
const learners: Partial<SimConfig> = {
  worldWidth: 128,
  worldHeight: 128,
  initialOrganisms: 150,
  brainMode: 2,
  brainFounderReflex: 1,
  climateMode: 1,
  yearLength: 2000,
  brainLearning: 1,
  learnSenses: 1,
  initialLearning: 0.3,
  founderSpread: 0.6,
  learnRateMax: 0.2,
};

type Inside = { learnDelta: Float32Array; learnTrace: Float32Array; learnPrevE: Float64Array; brainCost: Float32Array; age: Uint32Array; traceInputs: Float64Array };
const inside = (sim: Simulation): Inside => sim as unknown as Inside;

describe("the learning rule (pure functions)", () => {
  it("thinks with inherited plus learned weights, for the first LEARN_SLOTS connections only", () => {
    const n = LEARN_SLOTS + 2;
    const weight = new Float32Array(n).fill(1);
    const delta = new Float32Array(LEARN_SLOTS).fill(0.5);
    const out = new Float32Array(n);
    learnedWeights(weight, 0, n, delta, 0, out);
    expect(out[0]).toBe(1.5);
    expect(out[LEARN_SLOTS - 1]).toBe(1.5);
    expect(out[LEARN_SLOTS]).toBe(1); // beyond the learnable connections: inherited only
  });

  it("strengthens what was active before a better-than-usual outcome, weakens it after a worse one, and caps the change", () => {
    const delta = new Float32Array(3);
    const trace = Float32Array.from([1, -0.5, 0]);
    applyLearning(delta, trace, 0, 3, 0.1, 2);
    expect([...delta].map((d) => +d.toFixed(5))).toEqual([0.1, -0.05, 0]);
    applyLearning(delta, trace, 0, 3, -0.1, 2);
    expect([...delta].map((d) => Math.abs(+d.toFixed(5)))).toEqual([0, 0, 0]);
    applyLearning(delta, trace, 0, 3, 100, 2);
    expect([...delta]).toEqual([2, -2, 0]); // both capped at the limit
  });

  it("keeps a fading record of how active each connection's two ends were together", () => {
    const from = Uint8Array.from([INPUT.bias]);
    const to = Uint8Array.from([OUTPUT_START + OUTPUT.turn]);
    const trace = Float32Array.from([1]);
    const inputs = new Float64Array(INPUT_COUNT);
    inputs[INPUT.bias] = 1;
    const outputs = new Float64Array(OUTPUT_COUNT);
    outputs[OUTPUT.turn] = 0.5;
    updateTraces(from, to, 0, 1, trace, 0, 0.8, inputs, new Float64Array(HIDDEN_MAX), outputs);
    expect(trace[0]).toBeCloseTo(0.8 * 1 + 1 * 0.5, 6);
  });

  it("a hand-built brain wired the wrong way round learns the right way from reward alone", () => {
    // One connection: cue -> turn, starting with the wrong sign. Each step the cue is +1 or -1, and
    // turning the same way as the cue is rewarded (+1), the other way punished (-1). The order of
    // events is the simulation's: learn from the last outcome, think, record activity.
    const from = Uint8Array.from([INPUT.energy]);
    const to = Uint8Array.from([OUTPUT_START + OUTPUT.turn]);
    const weight = Float32Array.from([-0.3]);
    const delta = new Float32Array(LEARN_SLOTS);
    const trace = new Float32Array(LEARN_SLOTS);
    const working = new Float32Array(1);
    const inputs = new Float64Array(INPUT_COUNT);
    const hidden = new Float64Array(HIDDEN_MAX);
    const outputs = new Float64Array(OUTPUT_COUNT);
    let reward = 0;
    let usual = 0;
    let rightLate = 0;
    for (let step = 0; step < 400; step++) {
      const surprise = Math.max(-1, Math.min(1, reward - usual));
      usual += 0.05 * (reward - usual);
      applyLearning(delta, trace, 0, 1, 0.1 * surprise, 2);
      inputs[INPUT.energy] = step % 2 === 0 ? 1 : -1;
      learnedWeights(weight, 0, 1, delta, 0, working);
      evaluateBrain(from, to, working, 0, 1, 0.05, inputs, hidden, outputs);
      updateTraces(from, to, 0, 1, trace, 0, 0.8, inputs, hidden, outputs);
      const right = Math.sign(outputs[OUTPUT.turn]!) === Math.sign(inputs[INPUT.energy]!);
      reward = right ? 1 : -1;
      if (step >= 300 && right) rightLate++;
    }
    expect(weight[0]! + delta[0]!).toBeGreaterThan(0.5); // it now turns with the cue
    expect(rightLate).toBe(100);
  });
});

describe("learning in a world", () => {
  it("is deterministic: the same seed gives the same world", () => {
    const a = new Simulation(8, learners);
    const b = new Simulation(8, learners);
    a.run(1500);
    b.run(1500);
    expect(b.fingerprint()).toBe(a.fingerprint());
  }, 60_000);

  it("animals actually learn, newborns start with nothing learned, and the learning gene is in play", () => {
    const sim = new Simulation(8, learners);
    sim.run(1500);
    const s = inside(sim);
    let learned = 0;
    let newborns = 0;
    for (let i = 0; i < sim.count; i++) {
      let size = 0;
      for (let k = 0; k < LEARN_SLOTS; k++) size += Math.abs(s.learnDelta[i * LEARN_SLOTS + k]!);
      if (size > 0.01) learned++;
      if (s.age[i] === 0) {
        newborns++;
        expect(size).toBe(0);
      }
    }
    expect(learned).toBeGreaterThan(sim.count / 10);
    expect(newborns).toBeGreaterThanOrEqual(0);
    let gene = 0;
    for (let i = 0; i < sim.count; i++) gene += sim.genes[i * GENE_COUNT + GENE.learning]!;
    expect(gene / sim.count).toBeGreaterThan(0);
  }, 60_000);

  it("learning costs upkeep in proportion to the gene, on the brain line", () => {
    const sim = new Simulation(8, { ...learners, learnCostCoeff: 0.01 });
    sim.run(300);
    const s = inside(sim);
    for (let i = 0; i < sim.count; i++) expect(s.brainCost[i]!).toBeGreaterThanOrEqual(0.01 * sim.genes[i * GENE_COUNT + GENE.learning]! + sim.config.brainBaseCost - 1e-7);
  }, 60_000);

  it("keeps the energy books exact", () => {
    const sim = new Simulation(9, { ...learners, shareRate: 0.4, shareKinOnly: 0, litterMax: 3 });
    const start = sim.energyAudit().total;
    for (let block = 0; block < 4; block++) {
      sim.run(400);
      const L = sim.ledger;
      const expected = start + L.sunlightIn - (L.basalBurned + L.movementBurned + L.sensingBurned + L.attackBurned + L.armorBurned + L.brainBurned) - L.digestionLoss - L.decayLoss;
      expect(Math.abs(sim.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
    }
  }, 60_000);

  it("saving and loading part-way gives exactly the same future, learned changes included", () => {
    const straight = new Simulation(10, learners);
    straight.run(1600);
    const first = new Simulation(10, learners);
    first.run(800);
    const resumed = Simulation.load(snapshotFromBytes(snapshotToBytes(first.save())));
    resumed.run(800);
    expect(resumed.fingerprint()).toBe(straight.fingerprint());
    expect(Array.from(inside(resumed).learnDelta.slice(0, resumed.count * LEARN_SLOTS))).toEqual(Array.from(inside(straight).learnDelta.slice(0, straight.count * LEARN_SLOTS)));
  }, 60_000);

  it("offers the learning senses: reward, time of year and last action", () => {
    const sim = new Simulation(8, learners);
    sim.run(600);
    const watched = sim.describe(0).id;
    sim.traceId = watched;
    sim.run(2);
    const inputs = inside(sim).traceInputs;
    expect(Math.abs(inputs[INPUT.yearA]!) + Math.abs(inputs[INPUT.yearB]!)).toBeGreaterThan(0);
    for (const k of [INPUT.energyChange, INPUT.surprise, INPUT.lastTurn, INPUT.lastSpeed]) {
      expect(inputs[k]!).toBeGreaterThanOrEqual(-1);
      expect(inputs[k]!).toBeLessThanOrEqual(1);
    }
    expect(inputs[INPUT.placeAhead]).toBe(0); // place memory is not built yet
  }, 60_000);

  it("with learning off, nothing is kept for it", () => {
    const sim = new Simulation(8, { ...learners, brainLearning: 0, learnSenses: 0 });
    expect(inside(sim).learnDelta.length).toBe(0);
    expect(inside(sim).learnPrevE.length).toBe(0);
  });
});
