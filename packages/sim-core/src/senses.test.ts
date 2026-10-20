import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";
import { BRAIN_LAYOUTS, CONN_MAX, HIDDEN_MAX, INPUT, INPUT_COUNT, OUTPUT_COUNT, renumberOldNode } from "./brain";

/** One organism with a brain on a quiet patch (no breeding, no mutation), so its senses can be read tick by tick. */
function stage(extra: Partial<SimConfig> = {}): Partial<SimConfig> {
  return {
    worldWidth: 128,
    worldHeight: 128,
    initialOrganisms: 1,
    maxOrganisms: 40,
    reproThresholdPerSize: 1e9,
    initialEnergyFraction: 0.5,
    mutationRateMin: 0,
    mutationRateMax: 0,
    initialMutationRate: 0,
    metaMutationStd: 0,
    speciesEvery: 0,
    brainMode: 2,
    brainEvery: 1,
    ...extra,
  };
}

/** The organism's inputs at its next thought (a watched organism senses everything). */
function thought(sim: Simulation, index = 0): number[] {
  sim.traceId = sim.id[index]!;
  sim.step();
  return sim.describe(sim.indexOfId(sim.traceId)).brain!.activity!.inputs;
}

describe("Phase 8e brain senses", () => {
  it("the layout: the Phase 8e senses sit before the constant and the noise, and the layout history ends at today's", () => {
    expect(INPUT.nutrientStore).toBe(BRAIN_LAYOUTS[1]!.insertedAt);
    expect(INPUT.colonyThreatAhead).toBe(BRAIN_LAYOUTS[2]!.insertedAt);
    expect(INPUT.bias).toBe(INPUT_COUNT - 2);
    expect(BRAIN_LAYOUTS.at(-1)!.inputs).toBe(INPUT_COUNT);
    expect(BRAIN_LAYOUTS.at(-1)!.slots).toBe(CONN_MAX);
    // The old bias input lands on today's bias, and the old first hidden unit on today's.
    expect(renumberOldNode(BRAIN_LAYOUTS[0]!.inputs - 2, BRAIN_LAYOUTS[0]!.inputs)).toBe(INPUT.bias);
    expect(renumberOldNode(BRAIN_LAYOUTS[1]!.inputs - 2, BRAIN_LAYOUTS[1]!.inputs)).toBe(INPUT.bias);
    expect(renumberOldNode(BRAIN_LAYOUTS[0]!.inputs, BRAIN_LAYOUTS[0]!.inputs)).toBe(INPUT_COUNT);
  });

  it("are all zero in a world without the features they read", () => {
    const inputs = thought(new Simulation(1, stage()));
    for (const k of [INPUT.nutrientStore, INPUT.plantRichHere, INPUT.plantRichAhead, INPUT.plantRichSide, INPUT.damageHere, INPUT.damageAhead, INPUT.damageSide, INPUT.waterAhead, INPUT.waterSide, INPUT.waterDistance, INPUT.thirst]) {
      expect(inputs[k]).toBe(0);
    }
  });

  it("nutrient store: -1 when empty, +1 when full", () => {
    const sim = new Simulation(1, stage({ nutrientMode: 1, nutrientTurnover: 0, plantAssimilation: 0, initialFoodFraction: 0 }));
    sim.nutrientStore[0] = 0;
    expect(thought(sim)[INPUT.nutrientStore]).toBeCloseTo(-1, 6);
    sim.nutrientStore[0] = sim.config.nutrientStoreCap * sim.bodyMatter[0]!;
    expect(thought(sim)[INPUT.nutrientStore]).toBeCloseTo(1, 6);
  });

  it("plant richness: how rich the plants are here, and which way they get richer", () => {
    const sim = new Simulation(1, stage({ nutrientMode: 2 }));
    const cs = sim.config.foodCellSize;
    const cx = Math.floor(sim.x[0]! / cs);
    const cy = Math.floor(sim.y[0]! / cs);
    const gw = sim.gridWidth;
    sim.headingX[0] = 1; // facing east
    sim.headingY[0] = 0;
    sim.speed[0] = 0;
    sim.plantQ.fill(0.5);
    sim.plantQ[cy * gw + ((cx + 1) % gw)] = 2; // richer to the east
    const inputs = thought(sim);
    expect(inputs[INPUT.plantRichHere]).toBeGreaterThan(0.2);
    expect(inputs[INPUT.plantRichAhead]).toBeGreaterThan(0.5);
  });

  it("damaged ground: worn soil here reads as damage", () => {
    const sim = new Simulation(1, stage({ erosionRate: 0.0001 }));
    const cs = sim.config.foodCellSize;
    const here = Math.floor(sim.y[0]! / cs) * sim.gridWidth + Math.floor(sim.x[0]! / cs);
    sim.speed[0] = 0;
    sim.soilHealth.fill(1);
    sim.soilHealth[here] = 0.6;
    expect(thought(sim)[INPUT.damageHere]).toBeCloseTo(0.4, 2);
  });

  it("water: points toward the nearest water, and says how far it is", () => {
    const sim = new Simulation(2, stage({ terrainMode: 1 }));
    const inputs = thought(sim);
    // Somewhere on land, so water is some distance away, in some direction (a unit vector).
    const ahead = inputs[INPUT.waterAhead]!;
    const side = inputs[INPUT.waterSide]!;
    expect(Math.abs(ahead * ahead + side * side - 1)).toBeLessThan(1e-6);
    expect(inputs[INPUT.waterDistance]).toBeGreaterThan(0);
    // Turn to face the way the water lies, and "ahead" becomes nearly 1.
    const hx = sim.headingX[0]!;
    const hy = sim.headingY[0]!;
    sim.headingX[0] = hx * ahead - hy * side;
    sim.headingY[0] = hy * ahead + hx * side;
    sim.speed[0] = 0;
    expect(thought(sim)[INPUT.waterAhead]).toBeGreaterThan(0.95);
  });

  it("a world saved with the oldest brain layout (Phase 8b) loads with every connection renumbered", () => {
    const sim = new Simulation(3, { worldWidth: 128, worldHeight: 128, initialOrganisms: 80, brainMode: 2, brainAddConnectionProb: 0.5, speciesEvery: 0 });
    sim.run(300);
    const snapshot = sim.save();
    const n = sim.count;
    const from = snapshot.arrays.brainFrom as Uint8Array;
    const to = snapshot.arrays.brainTo as Uint8Array;
    const weight = snapshot.arrays.brainWeight as Float32Array;
    // Rebuild it the way an older save looked: old numbering, old slot count, no new senses in use.
    const OLD = BRAIN_LAYOUTS[0]!;
    const OLD_CONN_MAX = OLD.slots;
    const toOld = new Map<number, number>();
    for (let old = 0; old < OLD.inputs + HIDDEN_MAX + OUTPUT_COUNT; old++) toOld.set(renumberOldNode(old, OLD.inputs), old);
    const oldFrom = new Uint8Array(n * OLD_CONN_MAX);
    const oldTo = new Uint8Array(n * OLD_CONN_MAX);
    const oldWeight = new Float32Array(n * OLD_CONN_MAX);
    const count = new Uint16Array(n);
    const expected: string[][] = [];
    for (let i = 0; i < n; i++) {
      const list: string[] = [];
      for (let k = 0; k < sim.brainCount[i]!; k++) {
        const f = from[i * CONN_MAX + k]!;
        if (!toOld.has(f)) continue; // reads a new sense: did not exist then
        const slot = i * OLD_CONN_MAX + count[i]!;
        oldFrom[slot] = toOld.get(f)!;
        oldTo[slot] = toOld.get(to[i * CONN_MAX + k]!)!;
        oldWeight[slot] = weight[i * CONN_MAX + k]!;
        list.push(`${f}>${to[i * CONN_MAX + k]}:${weight[i * CONN_MAX + k]}`);
        count[i]!++;
      }
      expected.push(list);
    }
    // The brain counts live in the saved 16-bit fields: put the old counts where brainCount is saved.
    const u16 = Object.keys(snapshot.arrays).filter((key) => key.startsWith("u16."));
    const countKey = u16.find((key) => {
      const a = snapshot.arrays[key] as Uint16Array;
      for (let i = 0; i < n; i++) if (a[i] !== sim.brainCount[i]) return false;
      return true;
    })!;
    const state = { ...snapshot.state };
    delete state.brainLayout;
    const old = { ...snapshot, state, arrays: { ...snapshot.arrays, brainFrom: oldFrom, brainTo: oldTo, brainWeight: oldWeight, [countKey]: count } };
    const loaded = Simulation.load(old);
    for (let i = 0; i < n; i++) {
      const list: string[] = [];
      for (let k = 0; k < loaded.brainCount[i]!; k++) list.push(`${loaded.brainFrom[i * CONN_MAX + k]}>${loaded.brainTo[i * CONN_MAX + k]}:${loaded.brainWeight[i * CONN_MAX + k]}`);
      expect(list).toEqual(expected[i]);
    }
  });
});
