import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";
import { snapshotFromBytes, snapshotToBytes } from "./snapshot";
import { GENE, GENE_COUNT } from "./genome";
import { HIDDEN_MAX, INPUT, INPUT_COUNT, LEARN_SLOTS, OUTPUT, OUTPUT_COUNT, OUTPUT_START, applyLearning, carryMemory, evaluateBrain, learnedWeights, updateTraces } from "./brain";
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
  placeMemory: 1,
  initialPlaceMemory: 0.3,
  brainMemory: 1,
  workingMemory: 1,
  initialWorkingMemory: 0.3,
};

type Inside = { memState: Float32Array; wmCells: Uint8Array; learnDelta: Float32Array; learnTrace: Float32Array; learnPrevE: Float64Array; brainCost: Float32Array; age: Uint32Array; traceInputs: Float64Array; placeVal: Float32Array; placeSlots: Uint8Array; placeX: Float32Array };
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

describe("working memory (pure function)", () => {
  it("each usable cell is overwritten or held as its gate says; the rest are cleared", () => {
    const memory = Float32Array.from([1, 1, 1, 1]);
    const outputs = new Float64Array(OUTPUT_COUNT);
    for (let k = 0; k < 4; k++) outputs[OUTPUT.memory0 + k] = -1; // what the brain writes now
    outputs[OUTPUT.gate0] = 0; // gate 0: overwrite (as every brain did before gates)
    outputs[OUTPUT.gate1] = -1; // fully at hold: keep keepMax of the old value
    outputs[OUTPUT.gate2] = -0.5; // half hold (but this cell is beyond the brain's capacity)
    carryMemory(memory, 0, outputs, 2, 0.8);
    expect([...memory].map((v) => +v.toFixed(5))).toEqual([-1, 0.6, 0, 0]); // 0.8 x 1 + 0.2 x -1 = 0.6
    outputs[OUTPUT.gate0] = 0.7; // above 0 also overwrites
    outputs[OUTPUT.gate1] = -0.5; // keep 0.4 of 0.6, add 0.6 of -1
    carryMemory(memory, 0, outputs, 4, 0.8);
    expect([...memory].map((v) => +v.toFixed(5))).toEqual([-1, -0.36, -0.6, -1]);
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
  }, 60_000);

  it("place memory: the gene sets how many places, animals remember good meals, memories are saved, and the sense points to the best one elsewhere", () => {
    const sim = new Simulation(8, learners);
    sim.run(1500);
    const s = inside(sim);
    let remembering = 0;
    for (let i = 0; i < sim.count; i++) {
      const gene = sim.genes[i * GENE_COUNT + GENE.placeMemory]!;
      const expected = gene > 0 ? Math.min(4, Math.ceil(gene * 4)) : 0;
      expect(s.placeSlots[i]).toBe(expected);
      let filled = 0;
      for (let j = 0; j < 4; j++) if (s.placeVal[i * 4 + j]! > 0) filled++;
      expect(filled).toBeLessThanOrEqual(expected);
      if (filled > 0) remembering++;
      if (s.age[i] === 0) expect(filled).toBe(0); // a newborn remembers nowhere
    }
    expect(remembering).toBeGreaterThan(sim.count / 4);
    // Remembered places are saved and loaded exactly.
    const before = Float32Array.from(s.placeVal);
    const quiet = Simulation.load(snapshotFromBytes(snapshotToBytes(sim.save())));
    expect(Array.from(inside(quiet).placeVal.slice(0, quiet.count * 4))).toEqual(Array.from(before.slice(0, sim.count * 4)));
    // The sense: find an animal with a remembered place away from where it stands, and watch it think.
    let watched = -1;
    for (let i = 0; i < sim.count && watched < 0; i++) {
      for (let j = 0; j < s.placeSlots[i]!; j++) {
        const dx = s.placeX[i * 4 + j]! - sim.x[i]!;
        if (s.placeVal[i * 4 + j]! > 0 && Math.abs(dx) > 20 && Math.abs(dx) < 100) watched = i;
      }
    }
    expect(watched).toBeGreaterThanOrEqual(0);
    sim.traceId = sim.describe(watched).id;
    sim.run(2);
    const inputs = s.traceInputs;
    const d = inputs[INPUT.placeDistance]!;
    expect(Math.abs(inputs[INPUT.placeAhead]!) + Math.abs(inputs[INPUT.placeSide]!) + d).toBeGreaterThan(0);
    expect(d).toBeLessThanOrEqual(1);
  }, 60_000);

  it("the remembering rule: store, refresh, fade, and replace the weakest when full", () => {
    const sim = new Simulation(8, { ...learners, placeFade: 0.5, placeMinMeal: 0.01, placeMergeRadius: 8 });
    const s = sim as unknown as Inside & { rememberPlace(i: number, meal: number): void; placeY: Float32Array };
    s.placeSlots[0] = 2;
    s.placeVal.fill(0, 0, 4);
    const at = (x: number, y: number): void => {
      sim.x[0] = x;
      sim.y[0] = y;
    };
    at(10, 10);
    s.rememberPlace(0, 0.4); // first good meal: remembered
    expect(s.placeVal[0]).toBeCloseTo(0.4, 6);
    expect(s.placeX[0]).toBe(10);
    at(12, 10);
    s.rememberPlace(0, 0.1); // a smaller meal at the same place: the memory only fades
    expect(s.placeVal[0]).toBeCloseTo(0.2, 6);
    expect(s.placeX[0]).toBe(10);
    at(60, 10);
    s.rememberPlace(0, 0.3); // somewhere else: the second slot
    expect(s.placeVal[1]).toBeCloseTo(0.3, 6);
    at(100, 100);
    s.rememberPlace(0, 0.005); // too small to remember: both just fade
    expect(s.placeVal[0]).toBeCloseTo(0.05, 6);
    expect(s.placeVal[1]).toBeCloseTo(0.15, 6);
    s.rememberPlace(0, 0.12); // full: replaces the weakest (the first place)
    expect([s.placeX[0], s.placeY[0]]).toEqual([100, 100]);
    expect(s.placeVal[0]).toBeCloseTo(0.12, 6);
    expect(s.placeX[1]).toBe(60);
  });

  it("each place an animal can remember costs upkeep on the brain line", () => {
    const sim = new Simulation(8, { ...learners, placeCostCoeff: 0.01 });
    sim.run(300);
    const s = inside(sim);
    for (let i = 0; i < sim.count; i++) expect(s.brainCost[i]!).toBeGreaterThanOrEqual(0.01 * s.placeSlots[i]! + sim.config.brainBaseCost - 1e-7);
  }, 60_000);

  it("working memory: the gene sets how many cells a brain can use, the rest stay at 0, and each cell costs upkeep", () => {
    const sim = new Simulation(8, { ...learners, wmCostCoeff: 0.01 });
    sim.run(800);
    const s = inside(sim);
    let partial = 0;
    for (let i = 0; i < sim.count; i++) {
      const gene = sim.genes[i * GENE_COUNT + GENE.workingMemory]!;
      const cells = gene > 0 ? Math.min(4, Math.ceil(gene * 4)) : 0;
      expect(s.wmCells[i]).toBe(cells);
      for (let k = cells; k < 4; k++) expect(s.memState[i * 4 + k]).toBe(0);
      if (cells < 4) partial++;
      expect(s.brainCost[i]!).toBeGreaterThanOrEqual(0.01 * cells + sim.config.brainBaseCost - 1e-7);
    }
    expect(partial).toBeGreaterThan(0);
  }, 60_000);

  it("barren ground: below barrenBelow nothing holds or grows plants, so only oases have food", () => {
    const sim = new Simulation(3, { worldWidth: 256, worldHeight: 256, initialOrganisms: 100, fertilityVariation: 0.9, fertilityScale: 4, barrenBelow: 1.5 });
    const s = sim as unknown as { foodCapacity: Float64Array; foodRegrow: Float64Array };
    let growing = 0;
    for (let c = 0; c < s.foodCapacity.length; c++) {
      const fertility = s.foodCapacity[c]! / sim.config.foodCap;
      if (fertility > 0) {
        growing++;
        expect(fertility).toBeGreaterThanOrEqual(1.5);
        expect(s.foodRegrow[c]! / sim.config.foodRegrowPerTick).toBeCloseTo(fertility, 9);
      } else {
        expect(s.foodRegrow[c]).toBe(0);
        expect(sim.food[c]).toBe(0);
      }
    }
    expect(growing / s.foodCapacity.length).toBeGreaterThan(0.05);
    expect(growing / s.foodCapacity.length).toBeLessThan(0.3);
    sim.run(500);
    for (let c = 0; c < s.foodCapacity.length; c++) if (s.foodCapacity[c] === 0) expect(sim.food[c]).toBe(0);
  }, 60_000);

  it("the place reflex: founders turn toward the best remembered place elsewhere", () => {
    const sim = new Simulation(8, { ...learners, placeReflex: 1 });
    const found = sim.describe(0).brain!.links.some((l) => l.from === INPUT.placeSide && l.to === OUTPUT_START + OUTPUT.turn && l.weight > 0);
    expect(found).toBe(true);
    const plain = new Simulation(8, learners);
    expect(plain.describe(0).brain!.links.some((l) => l.from === INPUT.placeSide)).toBe(false);
  });

  it("with learning off, nothing is kept for it", () => {
    const sim = new Simulation(8, { ...learners, brainLearning: 0, learnSenses: 0, placeMemory: 0, workingMemory: 0 });
    expect(inside(sim).learnDelta.length).toBe(0);
    expect(inside(sim).learnPrevE.length).toBe(0);
    expect(inside(sim).placeVal.length).toBe(0);
    expect(inside(sim).wmCells.length).toBe(0);
  });
});
