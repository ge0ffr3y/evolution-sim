import { describe, expect, it } from "vitest";
import {
  CONN_MAX,
  HIDDEN_MAX,
  HIDDEN_START,
  INPUT,
  INPUT_COUNT,
  NODE_COUNT,
  NODE_LIMIT,
  OLD_HIDDEN_MAX,
  OUTPUT,
  OUTPUT_COUNT,
  OUTPUT_START,
  evaluateBrain,
  measureBrain,
  mutateBrain,
  renumberOldNode,
  soft,
} from "./brain";
import { DEFAULT_CONFIG, makeConfig } from "./config";
import { Rng } from "./rng";
import { Simulation } from "./simulation";
import { snapshotFromBytes, snapshotToBytes } from "./snapshot";

// Phase 11, deeper brains: room for 64 thinking units (brainHiddenMax) and units feeding units (brainDepth).

const TURN = OUTPUT_START + OUTPUT.turn;
const unit = (h: number): number => HIDDEN_START + h;

/** A hand-wired brain: [from, to, weight] triples. */
function brain(links: [number, number, number][]) {
  const from = new Uint8Array(CONN_MAX);
  const to = new Uint8Array(CONN_MAX);
  const weight = new Float32Array(CONN_MAX);
  links.forEach(([f, t, w], k) => {
    from[k] = f;
    to[k] = t;
    weight[k] = w;
  });
  return { from, to, weight, count: links.length };
}

/** Think once with these inputs (bias 1, everything else 0 unless given); returns the hidden and output values. */
function think(b: ReturnType<typeof brain>, state: Float32Array | null) {
  const inputs = new Float64Array(INPUT_COUNT);
  inputs[INPUT.bias] = 1;
  const hidden = new Float64Array(HIDDEN_MAX);
  const outputs = new Float64Array(OUTPUT_COUNT);
  evaluateBrain(b.from, b.to, b.weight, 0, b.count, 0.05, inputs, hidden, outputs, 0, state, 0);
  return { hidden: Array.from(hidden), outputs: Array.from(outputs) };
}

describe("deeper brain settings", () => {
  it("are off by default (16 units, no depth), and checked", () => {
    expect(DEFAULT_CONFIG.brainHiddenMax).toBe(16);
    expect(DEFAULT_CONFIG.brainDepth).toBe(0);
    expect(() => makeConfig({ brainMode: 2, brainHiddenMax: HIDDEN_MAX + 1 })).toThrow(/brainHiddenMax/);
    expect(() => makeConfig({ brainMode: 1, brainDepth: 1 })).toThrow(/brainDepth/);
  });

  it("every node number still fits in a byte", () => {
    expect(NODE_COUNT).toBeLessThanOrEqual(NODE_LIMIT);
  });
});

describe("thinking with depth", () => {
  it("a unit feeding a later unit passes on this thought's value (a chain of two)", () => {
    const chain = brain([
      [INPUT.bias, unit(0), 1],
      [unit(0), unit(1), 2],
      [unit(1), TURN, 1],
    ]);
    const { hidden, outputs } = think(chain, new Float32Array(HIDDEN_MAX));
    expect(hidden[0]).toBeCloseTo(soft(1), 12);
    expect(hidden[1]).toBeCloseTo(soft(2 * soft(1)), 12);
    expect(outputs[OUTPUT.turn]).toBeCloseTo(soft(soft(2 * soft(1))), 12);
    // Without depth, a unit only listens to inputs, as before Phase 11.
    expect(think(chain, null).outputs[OUTPUT.turn]).toBe(0);
  });

  it("a unit feeding an earlier unit (or itself) passes on its value from the previous thought (a loop)", () => {
    const back = brain([
      [INPUT.bias, unit(1), 1],
      [unit(1), unit(0), 2],
      [unit(0), TURN, 1],
    ]);
    const state = new Float32Array(HIDDEN_MAX);
    expect(think(back, state).outputs[OUTPUT.turn]).toBe(0); // nothing remembered yet
    expect(state[1]).toBeCloseTo(soft(1), 6);
    expect(think(back, state).outputs[OUTPUT.turn]).toBeCloseTo(soft(soft(2 * Math.fround(soft(1)))), 6);

    const self = brain([
      [INPUT.bias, unit(0), 1],
      [unit(0), unit(0), 1],
      [unit(0), TURN, 1],
    ]);
    const kept = new Float32Array(HIDDEN_MAX);
    expect(think(self, kept).hidden[0]).toBeCloseTo(soft(1), 6);
    expect(think(self, kept).hidden[0]).toBeCloseTo(soft(1 + Math.fround(soft(1))), 6);
  });

  it("with no unit-to-unit connections, depth thinks exactly as before", () => {
    const rng = new Rng(11);
    for (let trial = 0; trial < 50; trial++) {
      const links: [number, number, number][] = [];
      for (let k = 0; k < 30; k++) {
        const kind = rng.int(3);
        const w = rng.range(-3, 3);
        if (kind === 0) links.push([rng.int(INPUT_COUNT), OUTPUT_START + rng.int(OUTPUT_COUNT), w]);
        else if (kind === 1) links.push([rng.int(INPUT_COUNT), unit(rng.int(HIDDEN_MAX)), w]);
        else links.push([unit(rng.int(HIDDEN_MAX)), OUTPUT_START + rng.int(OUTPUT_COUNT), w]);
      }
      const b = brain(links);
      const inputs = new Float64Array(INPUT_COUNT).map(() => rng.range(-1, 1));
      const run = (state: Float32Array | null) => {
        const hidden = new Float64Array(HIDDEN_MAX);
        const outputs = new Float64Array(OUTPUT_COUNT);
        evaluateBrain(b.from, b.to, b.weight, 0, b.count, 0.05, inputs, hidden, outputs, 0, state, 0);
        return [...hidden, ...outputs];
      };
      expect(run(new Float32Array(HIDDEN_MAX))).toEqual(run(null));
    }
  });

  it("counts a unit that only feeds other units as a working unit when it has a way in and a way out", () => {
    const b = brain([
      [INPUT.bias, unit(0), 1],
      [unit(0), unit(5), 1],
      [unit(5), TURN, 1],
    ]);
    expect(measureBrain(b.from, b.to, b.weight, 0, b.count, 0.05)).toEqual({ hidden: 2, connections: 3 });
  });
});

describe("growing deeper brains", () => {
  const grow = (extra: object, births: number) => {
    const c = makeConfig({ brainMode: 2, brainAddConnectionProb: 0.9, brainAddNodeProb: 0.6, brainRemoveConnectionProb: 0, brainRemoveNodeProb: 0, brainWeightMutationProb: 0, ...extra });
    const rng = new Rng(5);
    const b = brain([[INPUT.bias, TURN, 1]]);
    let count = b.count;
    for (let k = 0; k < births; k++) count = mutateBrain(2, rng, c, b.from, b.to, b.weight, 0, count);
    let unitToUnit = 0;
    let highest = -1;
    for (let k = 0; k < count; k++) {
      const f = b.from[k]!;
      const t = b.to[k]!;
      if (f >= HIDDEN_START && f < OUTPUT_START && t >= HIDDEN_START && t < OUTPUT_START) unitToUnit++;
      for (const n of [f, t]) if (n >= HIDDEN_START && n < OUTPUT_START) highest = Math.max(highest, n - HIDDEN_START);
    }
    return { unitToUnit, highest };
  };

  it("without depth, mutations never join two units, and never pass the 16-unit limit", () => {
    const g = grow({}, 400);
    expect(g.unitToUnit).toBe(0);
    expect(g.highest).toBeLessThan(16);
  });

  it("with depth, mutations join units and can use up to brainHiddenMax of them", () => {
    const g = grow({ brainDepth: 1, brainHiddenMax: 40 }, 400);
    expect(g.unitToUnit).toBeGreaterThan(0);
    expect(g.highest).toBeGreaterThanOrEqual(16);
    expect(g.highest).toBeLessThan(40);
  });
});

describe("deep brains in a world", () => {
  const DEEP = {
    worldWidth: 128,
    worldHeight: 128,
    initialOrganisms: 100,
    brainMode: 2,
    brainDepth: 1,
    brainHiddenMax: 32,
    brainAddConnectionProb: 0.6,
    brainAddNodeProb: 0.3,
  };

  it("plays out the same every time, and carries on exactly after saving and loading mid-thought", () => {
    const a = new Simulation(8, DEEP);
    const b = new Simulation(8, DEEP);
    a.run(1500);
    b.run(1500);
    expect(a.fingerprint()).toBe(b.fingerprint());
    const loaded = Simulation.load(snapshotFromBytes(snapshotToBytes(a.save())));
    a.run(800);
    loaded.run(800);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
    // Brains did grow unit-to-unit wiring in this world.
    let unitToUnit = 0;
    for (let i = 0; i < a.count; i++) {
      for (let k = 0; k < a.brainCount[i]!; k++) {
        const f = a.brainFrom[i * CONN_MAX + k]!;
        const t = a.brainTo[i * CONN_MAX + k]!;
        if (f >= HIDDEN_START && f < OUTPUT_START && t >= HIDDEN_START && t < OUTPUT_START) unitToUnit++;
      }
    }
    expect(unitToUnit).toBeGreaterThan(0);
    // The census sees the chains and loops.
    const census = a.stats().brain;
    expect(census.deepest).toBeGreaterThanOrEqual(2);
    expect(census.loopShare).toBeGreaterThanOrEqual(0);
    expect(census.loopShare).toBeLessThanOrEqual(1);
    expect(new Simulation(8, { ...DEEP, brainDepth: 0 }).stats().brain.loopShare).toBe(0);
  }, 60_000);

  it("a world saved before Phase 11 (16 units) loads with its actions renumbered, and depth can be switched on", () => {
    // Actions used to come straight after 16 units; they now come after 64. Senses and units keep their numbers.
    expect(renumberOldNode(INPUT.bias, INPUT_COUNT, OLD_HIDDEN_MAX)).toBe(INPUT.bias);
    expect(renumberOldNode(HIDDEN_START + 3, INPUT_COUNT, OLD_HIDDEN_MAX)).toBe(HIDDEN_START + 3);
    expect(renumberOldNode(INPUT_COUNT + OLD_HIDDEN_MAX + OUTPUT.speed, INPUT_COUNT, OLD_HIDDEN_MAX)).toBe(OUTPUT_START + OUTPUT.speed);

    const plain = { worldWidth: 128, worldHeight: 128, initialOrganisms: 100, brainMode: 2 };
    const sim = new Simulation(3, plain);
    sim.run(1000);
    const snapshot = sim.save();
    // Make it look like an older save: actions numbered after 16 units, no record of the room for units.
    const old = (n: number): number => (n >= OUTPUT_START ? n - (HIDDEN_MAX - OLD_HIDDEN_MAX) : n);
    const from = (snapshot.arrays.brainFrom as Uint8Array).map(old);
    const to = (snapshot.arrays.brainTo as Uint8Array).map(old);
    const state = { ...(snapshot.state as Record<string, unknown>), brainLayout: [INPUT_COUNT, CONN_MAX] };
    const older = { ...snapshot, state, arrays: { ...snapshot.arrays, brainFrom: from, brainTo: to } };
    const loaded = Simulation.load(older);
    sim.run(500);
    loaded.run(500);
    expect(loaded.fingerprint()).toBe(sim.fingerprint());
    // The same older save with depth switched on loads too, every unit starting from 0.
    const deeper = Simulation.load(older, { changes: { brainDepth: 1, brainHiddenMax: 32 } });
    deeper.run(300);
    expect(deeper.count).toBeGreaterThan(0);
  }, 60_000);
});
