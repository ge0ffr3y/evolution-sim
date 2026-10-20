import { describe, expect, it } from "vitest";
import {
  CONN_MAX,
  HIDDEN_MAX,
  HIDDEN_START,
  INPUT,
  INPUT_COUNT,
  OUTPUT,
  OUTPUT_COUNT,
  OUTPUT_START,
  RAY_CHANNELS,
  evaluateBrain,
  initFixedBrain,
  measureBrain,
  mutateBrain,
  setConnection,
  soft,
} from "./brain";
import { makeConfig } from "./config";
import { Rng } from "./rng";

const TURN = OUTPUT_START + OUTPUT.turn;
const SPEED = OUTPUT_START + OUTPUT.speed;

function blankBrain(): { from: Uint8Array; to: Uint8Array; weight: Float32Array } {
  return { from: new Uint8Array(CONN_MAX), to: new Uint8Array(CONN_MAX), weight: new Float32Array(CONN_MAX) };
}

describe("soft (the squashing function)", () => {
  it("stays between -1 and 1, is odd, and increases", () => {
    expect(soft(0)).toBe(0);
    for (const x of [0.1, 0.5, 1, 3, 10, 1000]) {
      expect(soft(x)).toBeGreaterThan(0);
      expect(soft(x)).toBeLessThan(1);
      expect(soft(-x)).toBe(-soft(x));
    }
    expect(soft(2)).toBeGreaterThan(soft(1));
    expect(soft(1)).toBe(0.5);
  });
});

describe("evaluating a brain", () => {
  const inputs = new Float64Array(INPUT_COUNT);
  const hidden = new Float64Array(HIDDEN_MAX);
  const outputs = new Float64Array(OUTPUT_COUNT);

  it("an empty brain outputs zero", () => {
    const b = blankBrain();
    evaluateBrain(b.from, b.to, b.weight, 0, 0, 0.05, inputs, hidden, outputs);
    expect([...outputs]).toEqual(new Array(OUTPUT_COUNT).fill(0));
  });

  it("a direct input->output connection gives soft(input x weight)", () => {
    const b = blankBrain();
    const n = setConnection(b.from, b.to, b.weight, 0, 0, INPUT.energy, TURN, 2);
    inputs.fill(0);
    inputs[INPUT.energy] = 0.5;
    evaluateBrain(b.from, b.to, b.weight, 0, n, 0.05, inputs, hidden, outputs);
    expect(outputs[OUTPUT.turn]).toBeCloseTo(soft(1), 12);
    expect(outputs[OUTPUT.speed]).toBe(0);
  });

  it("goes through a hidden unit: input -> hidden -> output", () => {
    const b = blankBrain();
    let n = setConnection(b.from, b.to, b.weight, 0, 0, INPUT.energy, HIDDEN_START, 3);
    n = setConnection(b.from, b.to, b.weight, 0, n, HIDDEN_START, SPEED, 2);
    inputs.fill(0);
    inputs[INPUT.energy] = 1;
    evaluateBrain(b.from, b.to, b.weight, 0, n, 0.05, inputs, hidden, outputs);
    expect(hidden[0]).toBeCloseTo(soft(3), 12);
    expect(outputs[OUTPUT.speed]).toBeCloseTo(soft(soft(3) * 2), 12);
  });

  it("adds up several inputs, and negative weights subtract", () => {
    const b = blankBrain();
    let n = setConnection(b.from, b.to, b.weight, 0, 0, INPUT.energy, TURN, 1);
    n = setConnection(b.from, b.to, b.weight, 0, n, INPUT.age, TURN, -2);
    inputs.fill(0);
    inputs[INPUT.energy] = 1;
    inputs[INPUT.age] = 0.5;
    evaluateBrain(b.from, b.to, b.weight, 0, n, 0.05, inputs, hidden, outputs);
    expect(outputs[OUTPUT.turn]).toBe(soft(0)); // 1 - 1 = 0
  });

  it("ignores connections weaker than the prune threshold", () => {
    const b = blankBrain();
    const n = setConnection(b.from, b.to, b.weight, 0, 0, INPUT.energy, TURN, 0.04);
    inputs.fill(0);
    inputs[INPUT.energy] = 1;
    evaluateBrain(b.from, b.to, b.weight, 0, n, 0.05, inputs, hidden, outputs);
    expect(outputs[OUTPUT.turn]).toBe(0);
  });

  it("reads the brain stored at an offset, so many brains can share one array", () => {
    const b = blankBrain();
    const big = { from: new Uint8Array(CONN_MAX * 3), to: new Uint8Array(CONN_MAX * 3), weight: new Float32Array(CONN_MAX * 3) };
    const n = setConnection(big.from, big.to, big.weight, CONN_MAX * 2, 0, INPUT.energy, TURN, 1);
    inputs.fill(0);
    inputs[INPUT.energy] = 1;
    evaluateBrain(big.from, big.to, big.weight, CONN_MAX * 2, n, 0.05, inputs, hidden, outputs);
    expect(outputs[OUTPUT.turn]).toBe(0.5);
    void b;
  });
});

describe("brain size", () => {
  it("counts only connections that matter, and hidden units with both an input and an output", () => {
    const b = blankBrain();
    let n = setConnection(b.from, b.to, b.weight, 0, 0, INPUT.energy, HIDDEN_START, 1);
    n = setConnection(b.from, b.to, b.weight, 0, n, HIDDEN_START, TURN, 1); // hidden 0 is fully wired
    n = setConnection(b.from, b.to, b.weight, 0, n, INPUT.age, HIDDEN_START + 1, 1); // hidden 1 has no way out
    n = setConnection(b.from, b.to, b.weight, 0, n, INPUT.age, SPEED, 0.01); // too weak to count
    expect(measureBrain(b.from, b.to, b.weight, 0, n, 0.05)).toEqual({ hidden: 1, connections: 3 });
  });

  it("a fixed-layout brain has every input->hidden and hidden->output connection, all at zero", () => {
    const b = blankBrain();
    const n = initFixedBrain(b.from, b.to, b.weight, 0, 8);
    expect(n).toBe(8 * INPUT_COUNT + 8 * OUTPUT_COUNT);
    expect(n).toBeLessThanOrEqual(CONN_MAX);
    for (let c = 0; c < n; c++) expect(b.weight[c]).toBe(0);
    expect(measureBrain(b.from, b.to, b.weight, 0, n, 0.05)).toEqual({ hidden: 0, connections: 0 });
  });

  it("input count matches the documented layout", () => {
    expect(INPUT_COUNT).toBe(5 * RAY_CHANNELS + 49);
  });
});

describe("mutating brains", () => {
  const rng = (seed = 1): Rng => new Rng(seed);

  it("fixed layout: only weights change, never the wiring, and weights stay in range", () => {
    const c = makeConfig({ brainMode: 1, brainWeightMutationProb: 0.5, brainWeightMutationStd: 5 });
    const b = blankBrain();
    const n = initFixedBrain(b.from, b.to, b.weight, 0, 8);
    const from = b.from.slice();
    const to = b.to.slice();
    const r = rng();
    let count = n;
    for (let i = 0; i < 50; i++) count = mutateBrain(1, r, c, b.from, b.to, b.weight, 0, count);
    expect(count).toBe(n);
    expect(b.from).toEqual(from);
    expect(b.to).toEqual(to);
    expect(Math.max(...b.weight)).toBeLessThanOrEqual(4);
    expect(Math.min(...b.weight)).toBeGreaterThanOrEqual(-4);
    expect(b.weight.some((w) => w !== 0)).toBe(true);
  });

  it("with the mutation chance at zero, a copy stays identical", () => {
    const c = makeConfig({ brainMode: 2, brainWeightMutationProb: 0, brainAddConnectionProb: 0, brainAddNodeProb: 0, brainRemoveConnectionProb: 0, brainRemoveNodeProb: 0 });
    const b = blankBrain();
    let n = setConnection(b.from, b.to, b.weight, 0, 0, INPUT.energy, TURN, 1.3);
    const before = [...b.weight.slice(0, n)];
    n = mutateBrain(2, rng(), c, b.from, b.to, b.weight, 0, n);
    expect(n).toBe(1);
    expect([...b.weight.slice(0, n)]).toEqual(before);
  });

  it("evolvable layout: brains grow connections and hidden units over generations, and only legal kinds", () => {
    const c = makeConfig({ brainMode: 2, brainAddConnectionProb: 0.5, brainAddNodeProb: 0.4, brainRemoveConnectionProb: 0.05, brainRemoveNodeProb: 0.02 });
    const b = blankBrain();
    let n = 0;
    const r = rng(7);
    for (let g = 0; g < 400; g++) n = mutateBrain(2, r, c, b.from, b.to, b.weight, 0, n);
    expect(n).toBeGreaterThan(5);
    const size = measureBrain(b.from, b.to, b.weight, 0, n, c.brainPruneBelow);
    expect(size.hidden).toBeGreaterThan(0);
    for (let k = 0; k < n; k++) {
      const from = b.from[k]!;
      const to = b.to[k]!;
      const inputToHidden = from < INPUT_COUNT && to >= HIDDEN_START && to < OUTPUT_START;
      const inputToOutput = from < INPUT_COUNT && to >= OUTPUT_START;
      const hiddenToOutput = from >= HIDDEN_START && from < OUTPUT_START && to >= OUTPUT_START;
      expect(inputToHidden || inputToOutput || hiddenToOutput).toBe(true);
    }
  });

  it("never exceeds the connection or hidden-unit limits, and never duplicates a connection", () => {
    const c = makeConfig({ brainMode: 2, brainAddConnectionProb: 1, brainAddNodeProb: 1, brainRemoveConnectionProb: 0, brainRemoveNodeProb: 0, brainPruneBelow: 0 });
    const b = blankBrain();
    let n = 0;
    const r = rng(3);
    for (let g = 0; g < 2000; g++) n = mutateBrain(2, r, c, b.from, b.to, b.weight, 0, n);
    expect(n).toBeLessThanOrEqual(CONN_MAX);
    const seen = new Set<number>();
    for (let k = 0; k < n; k++) {
      const key = b.from[k]! * 256 + b.to[k]!;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      expect(b.to[k]!).toBeLessThan(OUTPUT_START + OUTPUT_COUNT);
    }
    expect(measureBrain(b.from, b.to, b.weight, 0, n, 0).hidden).toBeLessThanOrEqual(HIDDEN_MAX);
  });

  it("splitting a connection keeps the brain's behavior (source->hidden at weight 1, hidden->target carries the old weight)", () => {
    const c = makeConfig({ brainMode: 2, brainWeightMutationProb: 0, brainAddConnectionProb: 0, brainAddNodeProb: 1, brainRemoveConnectionProb: 0, brainRemoveNodeProb: 0 });
    const b = blankBrain();
    let n = setConnection(b.from, b.to, b.weight, 0, 0, INPUT.energy, TURN, 2);
    n = mutateBrain(2, rng(), c, b.from, b.to, b.weight, 0, n);
    expect(n).toBe(2);
    const inputs = new Float64Array(INPUT_COUNT);
    inputs[INPUT.energy] = 0.5;
    const hidden = new Float64Array(HIDDEN_MAX);
    const outputs = new Float64Array(OUTPUT_COUNT);
    evaluateBrain(b.from, b.to, b.weight, 0, n, 0.05, inputs, hidden, outputs);
    // Through the new hidden unit, the sign and rough size of the output survive.
    expect(outputs[OUTPUT.turn]).toBeGreaterThan(0.3);
  });

  it("removing a hidden unit removes every connection attached to it", () => {
    const c = makeConfig({ brainMode: 2, brainWeightMutationProb: 0, brainAddConnectionProb: 0, brainAddNodeProb: 0, brainRemoveConnectionProb: 0, brainRemoveNodeProb: 1 });
    const b = blankBrain();
    let n = setConnection(b.from, b.to, b.weight, 0, 0, INPUT.energy, HIDDEN_START, 1);
    n = setConnection(b.from, b.to, b.weight, 0, n, HIDDEN_START, TURN, 1);
    n = setConnection(b.from, b.to, b.weight, 0, n, INPUT.age, SPEED, 1); // unrelated, should survive
    n = mutateBrain(2, rng(), c, b.from, b.to, b.weight, 0, n);
    expect(n).toBe(1);
    expect(b.to[0]).toBe(SPEED);
  });

  it("is deterministic: the same seed makes the same mutations", () => {
    const c = makeConfig({ brainMode: 2, brainAddConnectionProb: 0.5, brainAddNodeProb: 0.3 });
    const run = (): number[] => {
      const b = blankBrain();
      let n = 0;
      const r = rng(11);
      for (let g = 0; g < 100; g++) n = mutateBrain(2, r, c, b.from, b.to, b.weight, 0, n);
      return [n, ...b.weight.slice(0, n), ...b.from.slice(0, n), ...b.to.slice(0, n)];
    };
    expect(run()).toEqual(run());
  });
});
