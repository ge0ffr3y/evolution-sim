import type { SimConfig } from "./config";
import type { Rng } from "./rng";

/**
 * Organism brains: small feed-forward neural networks.
 *
 * A brain is a list of connections (from node, to node, weight). Nodes are numbered:
 *   inputs   0 .. INPUT_COUNT-1           what the organism senses
 *   hidden   INPUT_COUNT .. +HIDDEN_MAX-1 optional thinking units (a single layer)
 *   outputs  after the hidden slots       what the organism does
 * Allowed connections are input->hidden, input->output and hidden->output, so a
 * brain can never loop back on itself.
 *
 * Mode 1 ("fixed layout"): every possible input->hidden and hidden->output
 * connection exists from birth, and only the weights evolve.
 * Mode 2 ("evolvable layout"): brains start empty, and mutations can add or remove
 * connections and hidden units (the NEAT idea, without crossover or speciation,
 * which arrive with sexual reproduction in Phase 5).
 *
 * Weights are small enough to ignore (below brainPruneBelow) are treated as absent:
 * they cost nothing and do nothing, so evolution has a reason to keep brains lean.
 *
 * Only exact arithmetic is used here (no exp, tanh, pow), so every browser
 * computes identical brains.
 */

/**
 * Vision: rays across the forward cone. Each ray reports two things it can see: the
 * nearest organism no bigger than a hunter could handle (something I could overpower),
 * and the nearest bigger one (something that could overpower me). For each, how close it
 * is, and how meaty its diet looks.
 */
export const RAY_COUNT = 5;
export const RAY_CHANNELS = 4; // smaller: how near, how meaty; larger: how near, how meaty
const VISION_INPUTS = RAY_COUNT * RAY_CHANNELS;

/**
 * Input numbering. Everything from smellPlantAhead up to (not including) energy is a
 * smell; everything from energy on is the body sensing itself.
 */
export const INPUT = {
  visionStart: 0,
  smellPlantAhead: VISION_INPUTS,
  smellPlantSide: VISION_INPUTS + 1,
  smellMeatAhead: VISION_INPUTS + 2,
  smellMeatSide: VISION_INPUTS + 3,
  smellPreyAhead: VISION_INPUTS + 4,
  smellPreySide: VISION_INPUTS + 5,
  smellHunterAhead: VISION_INPUTS + 6,
  smellHunterSide: VISION_INPUTS + 7,
  plantHere: VISION_INPUTS + 8,
  meatHere: VISION_INPUTS + 9,
  energy: VISION_INPUTS + 10,
  age: VISION_INPUTS + 11,
  diet: VISION_INPUTS + 12,
  bias: VISION_INPUTS + 13,
  noise: VISION_INPUTS + 14,
} as const;
export const INPUT_COUNT = VISION_INPUTS + 15;

export const HIDDEN_MAX = 12;
export const HIDDEN_START = INPUT_COUNT;
export const OUTPUT_START = INPUT_COUNT + HIDDEN_MAX;
export const OUTPUT = { turn: 0, speed: 1, attack: 2 } as const;
export const OUTPUT_COUNT = 3;
export const NODE_COUNT = OUTPUT_START + OUTPUT_COUNT;

/**
 * Most connections one brain can hold. A fully wired fixed-layout brain needs
 * hidden x (INPUT_COUNT + OUTPUT_COUNT) of them (304 for 8 hidden units).
 */
export const CONN_MAX = 320;
/** Weights are kept within this range. */
export const WEIGHT_LIMIT = 4;

/** Human-readable labels for the brain viewer. */
export function inputLabel(index: number): string {
  if (index < VISION_INPUTS) {
    const ray = Math.floor(index / RAY_CHANNELS);
    const channel = index % RAY_CHANNELS;
    const where = ["far right", "right", "ahead", "left", "far left"][ray]!;
    const what = ["smaller: near", "smaller: meaty", "bigger: near", "bigger: meaty"][channel]!;
    return `see ${where} ${what}`;
  }
  const names: Record<number, string> = {
    [INPUT.smellPlantAhead]: "smell plants: ahead",
    [INPUT.smellPlantSide]: "smell plants: left",
    [INPUT.smellMeatAhead]: "smell meat: ahead",
    [INPUT.smellMeatSide]: "smell meat: left",
    [INPUT.smellPreyAhead]: "plant-eater trail: ahead",
    [INPUT.smellPreySide]: "plant-eater trail: left",
    [INPUT.smellHunterAhead]: "meat-eater trail: ahead",
    [INPUT.smellHunterSide]: "meat-eater trail: left",
    [INPUT.plantHere]: "plants here",
    [INPUT.meatHere]: "meat here",
    [INPUT.energy]: "energy",
    [INPUT.age]: "age",
    [INPUT.diet]: "my diet (meaty)",
    [INPUT.bias]: "bias",
    [INPUT.noise]: "noise",
  };
  return names[index] ?? `input ${index}`;
}

export const OUTPUT_LABELS = ["turn left", "speed", "attack"] as const;

/** A smooth squashing function between -1 and 1, built from exact arithmetic only. */
export function soft(x: number): number {
  return x / (1 + (x < 0 ? -x : x));
}

/**
 * Run one brain. Connection `c` of the brain stored at `base` is
 * (from[base+c], to[base+c], weight[base+c]). Fills `hidden` and `outputs`.
 */
export function evaluateBrain(
  from: Uint8Array,
  to: Uint8Array,
  weight: Float32Array,
  base: number,
  count: number,
  prune: number,
  inputs: Float64Array,
  hidden: Float64Array,
  outputs: Float64Array,
): void {
  hidden.fill(0);
  outputs.fill(0);
  // Pass 1: everything feeding a hidden unit comes from an input.
  for (let c = 0; c < count; c++) {
    const w = weight[base + c]!;
    if (w < prune && w > -prune) continue;
    const target = to[base + c]!;
    if (target < OUTPUT_START) hidden[target - HIDDEN_START] = hidden[target - HIDDEN_START]! + inputs[from[base + c]!]! * w;
  }
  for (let h = 0; h < HIDDEN_MAX; h++) hidden[h] = soft(hidden[h]!);
  // Pass 2: outputs gather from inputs and from hidden units.
  for (let c = 0; c < count; c++) {
    const w = weight[base + c]!;
    if (w < prune && w > -prune) continue;
    const target = to[base + c]!;
    if (target >= OUTPUT_START) {
      const source = from[base + c]!;
      const value = source < INPUT_COUNT ? inputs[source]! : hidden[source - HIDDEN_START]!;
      outputs[target - OUTPUT_START] = outputs[target - OUTPUT_START]! + value * w;
    }
  }
  for (let o = 0; o < OUTPUT_COUNT; o++) outputs[o] = soft(outputs[o]!);
}

export interface BrainSize {
  /** Hidden units that have something coming in and something going out. */
  hidden: number;
  /** Connections that are strong enough to count. */
  connections: number;
}

/** Count a brain's working parts, ignoring connections too weak to matter. */
export function measureBrain(from: Uint8Array, to: Uint8Array, weight: Float32Array, base: number, count: number, prune: number): BrainSize {
  let hasIn = 0;
  let hasOut = 0;
  let connections = 0;
  for (let c = 0; c < count; c++) {
    const w = weight[base + c]!;
    if (w < prune && w > -prune) continue;
    connections++;
    const source = from[base + c]!;
    const target = to[base + c]!;
    if (target < OUTPUT_START) hasIn |= 1 << (target - HIDDEN_START);
    if (source >= HIDDEN_START && source < OUTPUT_START) hasOut |= 1 << (source - HIDDEN_START);
  }
  let hidden = 0;
  for (let h = 0; h < HIDDEN_MAX; h++) if ((hasIn & hasOut & (1 << h)) !== 0) hidden++;
  return { hidden, connections };
}

/** Fill a brain with every possible input->hidden and hidden->output connection, all at weight zero. */
export function initFixedBrain(from: Uint8Array, to: Uint8Array, weight: Float32Array, base: number, hiddenUnits: number): number {
  let c = 0;
  for (let h = 0; h < hiddenUnits; h++) {
    for (let i = 0; i < INPUT_COUNT; i++) {
      from[base + c] = i;
      to[base + c] = HIDDEN_START + h;
      weight[base + c] = 0;
      c++;
    }
  }
  for (let h = 0; h < hiddenUnits; h++) {
    for (let o = 0; o < OUTPUT_COUNT; o++) {
      from[base + c] = HIDDEN_START + h;
      to[base + c] = OUTPUT_START + o;
      weight[base + c] = 0;
      c++;
    }
  }
  return c;
}

/** The brain a newborn would have if it were wired by hand, for tests and experiments. */
export function setConnection(from: Uint8Array, to: Uint8Array, weight: Float32Array, base: number, count: number, source: number, target: number, w: number): number {
  for (let c = 0; c < count; c++) {
    if (from[base + c] === source && to[base + c] === target) {
      weight[base + c] = w;
      return count;
    }
  }
  if (count >= CONN_MAX) return count;
  from[base + count] = source;
  to[base + count] = target;
  weight[base + count] = w;
  return count + 1;
}

function clampWeight(w: number): number {
  return w > WEIGHT_LIMIT ? WEIGHT_LIMIT : w < -WEIGHT_LIMIT ? -WEIGHT_LIMIT : w;
}

/** Which hidden units are used by at least one connection (bit mask). */
function hiddenInUse(from: Uint8Array, to: Uint8Array, base: number, count: number): number {
  let mask = 0;
  for (let c = 0; c < count; c++) {
    const source = from[base + c]!;
    const target = to[base + c]!;
    if (source >= HIDDEN_START && source < OUTPUT_START) mask |= 1 << (source - HIDDEN_START);
    if (target >= HIDDEN_START && target < OUTPUT_START) mask |= 1 << (target - HIDDEN_START);
  }
  return mask;
}

function removeConnection(from: Uint8Array, to: Uint8Array, weight: Float32Array, base: number, count: number, index: number): number {
  const last = count - 1;
  from[base + index] = from[base + last]!;
  to[base + index] = to[base + last]!;
  weight[base + index] = weight[base + last]!;
  return last;
}

function hasConnection(from: Uint8Array, to: Uint8Array, base: number, count: number, source: number, target: number): boolean {
  for (let c = 0; c < count; c++) if (from[base + c] === source && to[base + c] === target) return true;
  return false;
}

/**
 * Mutate a freshly copied brain. In mode 1 only weights change. In mode 2 the
 * layout can change too. Returns the new connection count.
 */
export function mutateBrain(
  mode: number,
  rng: Rng,
  c: SimConfig,
  from: Uint8Array,
  to: Uint8Array,
  weight: Float32Array,
  base: number,
  countIn: number,
): number {
  let count = countIn;
  // Nudge some weights.
  const probability = c.brainWeightMutationProb;
  for (let i = 0; i < count; i++) {
    if (rng.next() < probability) {
      // Sometimes a mutation simply deletes the connection; otherwise it nudges the weight.
      weight[base + i] = rng.next() < c.brainWeightZeroProb ? 0 : clampWeight(weight[base + i]! + rng.gaussian() * c.brainWeightMutationStd);
    }
  }
  if (mode !== 2) return count;

  // Add a connection between two things that may legally be connected.
  if (rng.next() < c.brainAddConnectionProb && count < CONN_MAX) {
    const used = hiddenInUse(from, to, base, count);
    // Pick a kind: input->output, input->hidden, or hidden->output (the last two need a hidden unit in use).
    const kinds: number[] = [0];
    if (used !== 0) kinds.push(1, 2);
    const kind = kinds[rng.int(kinds.length)]!;
    let source = 0;
    let target = 0;
    const usedList: number[] = [];
    for (let h = 0; h < HIDDEN_MAX; h++) if ((used & (1 << h)) !== 0) usedList.push(h);
    if (kind === 0) {
      source = rng.int(INPUT_COUNT);
      target = OUTPUT_START + rng.int(OUTPUT_COUNT);
    } else if (kind === 1) {
      source = rng.int(INPUT_COUNT);
      target = HIDDEN_START + usedList[rng.int(usedList.length)]!;
    } else {
      source = HIDDEN_START + usedList[rng.int(usedList.length)]!;
      target = OUTPUT_START + rng.int(OUTPUT_COUNT);
    }
    if (!hasConnection(from, to, base, count, source, target)) {
      from[base + count] = source;
      to[base + count] = target;
      weight[base + count] = clampWeight(rng.gaussian() * c.brainWeightMutationStd * 2);
      count++;
    }
  }

  // Add a hidden unit by splitting an input->output connection in two (the NEAT way).
  if (rng.next() < c.brainAddNodeProb && count + 2 <= CONN_MAX) {
    const used = hiddenInUse(from, to, base, count);
    let free = -1;
    for (let h = 0; h < HIDDEN_MAX; h++) {
      if ((used & (1 << h)) === 0) {
        free = h;
        break;
      }
    }
    const direct: number[] = [];
    for (let i = 0; i < count; i++) if (to[base + i]! >= OUTPUT_START && from[base + i]! < INPUT_COUNT) direct.push(i);
    if (free >= 0 && direct.length > 0) {
      const index = direct[rng.int(direct.length)]!;
      const source = from[base + index]!;
      const target = to[base + index]!;
      const w = weight[base + index]!;
      // The old connection becomes source -> hidden (weight 1), plus a new hidden -> target carrying the old weight.
      to[base + index] = HIDDEN_START + free;
      weight[base + index] = 1;
      from[base + count] = HIDDEN_START + free;
      to[base + count] = target;
      weight[base + count] = w;
      count++;
      void source;
    }
  }

  // Remove a connection.
  if (rng.next() < c.brainRemoveConnectionProb && count > 0) {
    count = removeConnection(from, to, weight, base, count, rng.int(count));
  }

  // Remove a hidden unit and everything wired to it.
  if (rng.next() < c.brainRemoveNodeProb) {
    const used = hiddenInUse(from, to, base, count);
    const usedList: number[] = [];
    for (let h = 0; h < HIDDEN_MAX; h++) if ((used & (1 << h)) !== 0) usedList.push(h);
    if (usedList.length > 0) {
      const node = HIDDEN_START + usedList[rng.int(usedList.length)]!;
      let i = 0;
      while (i < count) {
        if (from[base + i] === node || to[base + i] === node) count = removeConnection(from, to, weight, base, count, i);
        else i++;
      }
    }
  }

  // Tidy up: drop connections that have faded to nothing, and orphaned hidden units.
  const prune = c.brainPruneBelow;
  let i = 0;
  while (i < count) {
    const w = weight[base + i]!;
    if (w < prune && w > -prune) count = removeConnection(from, to, weight, base, count, i);
    else i++;
  }
  return count;
}
