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
  stamina: VISION_INPUTS + 13,
  kinDensity: VISION_INPUTS + 14,
  kinAhead: VISION_INPUTS + 15,
  kinSide: VISION_INPUTS + 16,
  comfort: VISION_INPUTS + 17,
  barrier: VISION_INPUTS + 18,
  /** Where home is: ahead (+) or behind (-), to the left (+) or right (-), and how far (0 at home, 1 far). */
  homeAhead: VISION_INPUTS + 19,
  homeSide: VISION_INPUTS + 20,
  homeDistance: VISION_INPUTS + 21,
  /** What the brain wrote into its memory last time it thought (four values that persist between thoughts). */
  memory0: VISION_INPUTS + 22,
  memory1: VISION_INPUTS + 23,
  memory2: VISION_INPUTS + 24,
  memory3: VISION_INPUTS + 25,
  /** Internal chemical signals (see the chemicals settings): reward, stress, bonding and calm. */
  chemReward: VISION_INPUTS + 26,
  chemStress: VISION_INPUTS + 27,
  chemBond: VISION_INPUTS + 28,
  chemCalm: VISION_INPUTS + 29,
  /** How full its own nutrient store is (-1 empty, +1 full; 0 without nutrient mode). */
  nutrientStore: VISION_INPUTS + 30,
  /** How rich in nutrient the plants are here (0 to 1), and which way they get richer (nutrient mode 2). */
  plantRichHere: VISION_INPUTS + 31,
  plantRichAhead: VISION_INPUTS + 32,
  plantRichSide: VISION_INPUTS + 33,
  /** How damaged the ground is here (overgrazing, fouling, erosion: 0 healthy, 1 ruined), and which way it gets worse. */
  damageHere: VISION_INPUTS + 34,
  damageAhead: VISION_INPUTS + 35,
  damageSide: VISION_INPUTS + 36,
  /** Where the nearest water is: ahead (+) or behind (-), to the left (+) or right (-), and how far (0 next to it, 1 far). */
  waterAhead: VISION_INPUTS + 37,
  waterSide: VISION_INPUTS + 38,
  waterDistance: VISION_INPUTS + 39,
  /** How thirsty it is (0 to 1; 0 in worlds without drinking). */
  thirst: VISION_INPUTS + 40,
  /**
   * Colony senses (shared along bonds by the signaling gene): the nearest threat a bonded
   * neighbor sees (ahead, left, how near) and which way it smells food (ahead, left, how strong).
   */
  colonyThreatAhead: VISION_INPUTS + 41,
  colonyThreatSide: VISION_INPUTS + 42,
  colonyThreatNear: VISION_INPUTS + 43,
  colonyFoodAhead: VISION_INPUTS + 44,
  colonyFoodSide: VISION_INPUTS + 45,
  colonyFoodNear: VISION_INPUTS + 46,
  /**
   * Learning senses (Phase 8f, learnSenses): how energy changed since the last thought (the reward,
   * -1 to 1), how much better or worse that was than usual (surprise), the time of year (two waves a
   * quarter of a year apart, so together they say where in the year it is), and what the brain did
   * last time (its turn and speed outputs).
   */
  energyChange: VISION_INPUTS + 47,
  surprise: VISION_INPUTS + 48,
  yearA: VISION_INPUTS + 49,
  yearB: VISION_INPUTS + 50,
  lastTurn: VISION_INPUTS + 51,
  lastSpeed: VISION_INPUTS + 52,
  /** The best feeding place it remembers (place memory, a later Phase 8f step): ahead, to the left, how far. 0 until then. */
  placeAhead: VISION_INPUTS + 53,
  placeSide: VISION_INPUTS + 54,
  placeDistance: VISION_INPUTS + 55,
  bias: VISION_INPUTS + 56,
  noise: VISION_INPUTS + 57,
} as const;
export const INPUT_COUNT = VISION_INPUTS + 58;
/**
 * Every brain layout so far, oldest first, so a saved world from any of them can be renumbered.
 * Each step inserted its new inputs at `insertedAt` (where the bias input was), so nodes below
 * that keep their number and the rest move up by the number of inputs added.
 */
export const BRAIN_LAYOUTS: readonly { inputs: number; slots: number; insertedAt: number }[] = [
  { inputs: VISION_INPUTS + 32, slots: 512, insertedAt: 0 }, // Phase 8b
  { inputs: VISION_INPUTS + 43, slots: 576, insertedAt: VISION_INPUTS + 30 }, // Phase 8e O1/O2: nutrient, ground, water, thirst
  { inputs: VISION_INPUTS + 49, slots: 640, insertedAt: VISION_INPUTS + 41 }, // Phase 8e O3: colony senses
  { inputs: VISION_INPUTS + 58, slots: 704, insertedAt: VISION_INPUTS + 47 }, // Phase 8f: learning senses and place memory
];
/** The node number in today's layout of a node saved with an older layout (identified by its input count). */
export function renumberOldNode(node: number, savedInputs: number): number {
  let n = node;
  for (let k = 1; k < BRAIN_LAYOUTS.length; k++) {
    const step = BRAIN_LAYOUTS[k]!;
    if (savedInputs >= step.inputs) continue;
    if (n >= step.insertedAt) n += step.inputs - BRAIN_LAYOUTS[k - 1]!.inputs;
  }
  return n;
}
/** Memory cells: the brain's last four memory outputs come back as inputs next time it thinks. */
export const MEMORY_COUNT = 4;

export const HIDDEN_MAX = 16;
export const HIDDEN_START = INPUT_COUNT;
export const OUTPUT_START = INPUT_COUNT + HIDDEN_MAX;
export const OUTPUT = { turn: 0, speed: 1, attack: 2, memory0: 3, memory1: 4, memory2: 5, memory3: 6 } as const;
export const OUTPUT_COUNT = 7;
export const NODE_COUNT = OUTPUT_START + OUTPUT_COUNT;

/**
 * Most connections one brain can hold. A fully wired fixed-layout brain needs
 * hidden x (INPUT_COUNT + OUTPUT_COUNT) of them (680 for 8 hidden units).
 */
export const CONN_MAX = 704;
/**
 * Learning (Phase 8f) keeps a record of recent activity and a learned change for this many of a
 * brain's connections (its first ones). Evolved brains use 8 to 12, so this is plenty, and it keeps
 * the memory a full world needs small.
 */
export const LEARN_SLOTS = 64;
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
    [INPUT.stamina]: "stamina left",
    [INPUT.kinDensity]: "relatives nearby",
    [INPUT.kinAhead]: "relatives: ahead",
    [INPUT.kinSide]: "relatives: left",
    [INPUT.comfort]: "too hot (+) or cold (-)",
    [INPUT.barrier]: "water ahead",
    [INPUT.homeAhead]: "home: ahead",
    [INPUT.homeSide]: "home: left",
    [INPUT.homeDistance]: "home: how far",
    [INPUT.memory0]: "memory 1",
    [INPUT.memory1]: "memory 2",
    [INPUT.memory2]: "memory 3",
    [INPUT.memory3]: "memory 4",
    [INPUT.chemReward]: "reward signal",
    [INPUT.chemStress]: "stress signal",
    [INPUT.chemBond]: "bonding signal",
    [INPUT.chemCalm]: "calm signal",
    [INPUT.nutrientStore]: "my nutrient store",
    [INPUT.plantRichHere]: "rich plants here",
    [INPUT.plantRichAhead]: "richer plants: ahead",
    [INPUT.plantRichSide]: "richer plants: left",
    [INPUT.damageHere]: "damaged ground here",
    [INPUT.damageAhead]: "worse ground: ahead",
    [INPUT.damageSide]: "worse ground: left",
    [INPUT.waterAhead]: "water: ahead",
    [INPUT.waterSide]: "water: left",
    [INPUT.waterDistance]: "water: how far",
    [INPUT.thirst]: "thirst",
    [INPUT.colonyThreatAhead]: "colony threat: ahead",
    [INPUT.colonyThreatSide]: "colony threat: left",
    [INPUT.colonyThreatNear]: "colony threat: how near",
    [INPUT.colonyFoodAhead]: "colony food: ahead",
    [INPUT.colonyFoodSide]: "colony food: left",
    [INPUT.colonyFoodNear]: "colony food: how strong",
    [INPUT.energyChange]: "energy change (reward)",
    [INPUT.surprise]: "surprise",
    [INPUT.yearA]: "time of year 1",
    [INPUT.yearB]: "time of year 2",
    [INPUT.lastTurn]: "last turn",
    [INPUT.lastSpeed]: "last speed",
    [INPUT.placeAhead]: "best place: ahead",
    [INPUT.placeSide]: "best place: left",
    [INPUT.placeDistance]: "best place: how far",
    [INPUT.bias]: "bias",
    [INPUT.noise]: "noise",
  };
  return names[index] ?? `input ${index}`;
}

export const OUTPUT_LABELS = ["turn left", "speed", "attack", "write memory 1", "write memory 2", "write memory 3", "write memory 4"] as const;

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
  /** Where this brain's weights start in `weight`, if not at `base` (a learning brain passes its own working copy). */
  weightBase = base,
): void {
  hidden.fill(0);
  outputs.fill(0);
  // Pass 1: everything feeding a hidden unit comes from an input.
  for (let c = 0; c < count; c++) {
    const w = weight[weightBase + c]!;
    if (w < prune && w > -prune) continue;
    const target = to[base + c]!;
    if (target < OUTPUT_START) hidden[target - HIDDEN_START] = hidden[target - HIDDEN_START]! + inputs[from[base + c]!]! * w;
  }
  for (let h = 0; h < HIDDEN_MAX; h++) hidden[h] = soft(hidden[h]!);
  // Pass 2: outputs gather from inputs and from hidden units.
  for (let c = 0; c < count; c++) {
    const w = weight[weightBase + c]!;
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

/**
 * Learning, part 1: the weights a learning brain actually thinks with are its inherited weights
 * plus what it has learned (for its first LEARN_SLOTS connections). Written into `out` from 0.
 */
export function learnedWeights(weight: Float32Array, base: number, count: number, delta: Float32Array, deltaBase: number, out: Float32Array): void {
  const learnable = count < LEARN_SLOTS ? count : LEARN_SLOTS;
  for (let c = 0; c < count; c++) out[c] = c < learnable ? weight[base + c]! + delta[deltaBase + c]! : weight[base + c]!;
}

/**
 * Learning, part 2, before a thought: each connection changes by `step` (learning rate times
 * surprise) times its record of recent activity, so whatever was active just before a better
 * (or worse) than usual outcome is strengthened (or weakened). Capped at plus or minus `limit`.
 */
export function applyLearning(delta: Float32Array, trace: Float32Array, at: number, count: number, step: number, limit: number): void {
  const learnable = count < LEARN_SLOTS ? count : LEARN_SLOTS;
  for (let c = 0; c < learnable; c++) {
    const d = delta[at + c]! + step * trace[at + c]!;
    delta[at + c] = d > limit ? limit : d < -limit ? -limit : d;
  }
}

/**
 * Learning, part 3, after a thought: each connection's record of recent activity fades by `keep`
 * and adds how active its two ends were together this time (source value times target value).
 */
export function updateTraces(from: Uint8Array, to: Uint8Array, base: number, count: number, trace: Float32Array, at: number, keep: number, inputs: Float64Array, hidden: Float64Array, outputs: Float64Array): void {
  const learnable = count < LEARN_SLOTS ? count : LEARN_SLOTS;
  for (let c = 0; c < learnable; c++) {
    const source = from[base + c]!;
    const target = to[base + c]!;
    const pre = source < INPUT_COUNT ? inputs[source]! : hidden[source - HIDDEN_START]!;
    const post = target < OUTPUT_START ? hidden[target - HIDDEN_START]! : outputs[target - OUTPUT_START]!;
    trace[at + c] = trace[at + c]! * keep + pre * post;
  }
}

/**
 * Working memory (Phase 8f): after a thought, each usable memory cell keeps `keep` of its old value
 * and takes the rest from what the brain writes now. Cells the brain cannot use are cleared.
 */
export function carryMemory(memory: Float32Array, at: number, outputs: Float64Array, cells: number, keep: number): void {
  for (let k = 0; k < MEMORY_COUNT; k++) {
    memory[at + k] = k < cells ? keep * memory[at + k]! + (1 - keep) * outputs[OUTPUT.memory0 + k]! : 0;
  }
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

/** True for a connection that involves a hidden unit (as its source or its target). */
function touchesHidden(source: number, target: number): boolean {
  return (source >= HIDDEN_START && source < OUTPUT_START) || (target >= HIDDEN_START && target < OUTPUT_START);
}

/**
 * Make a child's brain from two parents' brains (written into the child's slot at `outBase`).
 *
 * Fixed layout (mode 1): every brain has the same connections, so each connection's strength
 * comes from one parent or the other, chosen at random.
 *
 * Evolvable layout (mode 2): the thinking units are not numbered consistently between
 * lineages (unit 3 in one family may do something quite different from unit 3 in another),
 * so mixing them could produce nonsense. The child therefore gets ALL of its hidden units and
 * their connections from one randomly chosen parent. The direct sense-to-action connections
 * are mixed: a connection both parents have takes either one's strength, and one only a
 * single parent has is passed on half the time.
 *
 * Returns the number of connections written. Mutation is applied afterwards by the caller.
 */
export function crossoverBrains(
  mode: number,
  rng: Rng,
  from: Uint8Array,
  to: Uint8Array,
  weight: Float32Array,
  baseA: number,
  countA: number,
  baseB: number,
  countB: number,
  outBase: number,
): number {
  if (mode === 1 && countA === countB) {
    for (let c = 0; c < countA; c++) {
      const fromA = rng.next() < 0.5;
      const base = fromA ? baseA : baseB;
      from[outBase + c] = from[base + c]!;
      to[outBase + c] = to[base + c]!;
      weight[outBase + c] = weight[base + c]!;
    }
    return countA;
  }
  const donorIsA = rng.next() < 0.5;
  const donorBase = donorIsA ? baseA : baseB;
  const donorCount = donorIsA ? countA : countB;
  let count = 0;
  for (let c = 0; c < donorCount && count < CONN_MAX; c++) {
    if (!touchesHidden(from[donorBase + c]!, to[donorBase + c]!)) continue;
    from[outBase + count] = from[donorBase + c]!;
    to[outBase + count] = to[donorBase + c]!;
    weight[outBase + count] = weight[donorBase + c]!;
    count++;
  }
  // Direct connections, keyed by (source, target). Map keeps insertion order, so this is deterministic.
  const direct = new Map<number, { a: number | null; b: number | null }>();
  const gather = (base: number, n: number, isA: boolean): void => {
    for (let c = 0; c < n; c++) {
      const source = from[base + c]!;
      const target = to[base + c]!;
      if (touchesHidden(source, target)) continue;
      const key = source * 256 + target;
      const entry = direct.get(key) ?? { a: null, b: null };
      if (isA) entry.a = weight[base + c]!;
      else entry.b = weight[base + c]!;
      direct.set(key, entry);
    }
  };
  gather(baseA, countA, true);
  gather(baseB, countB, false);
  for (const [key, entry] of direct) {
    let w: number;
    if (entry.a !== null && entry.b !== null) w = rng.next() < 0.5 ? entry.a : entry.b;
    else if (rng.next() < 0.5) w = (entry.a ?? entry.b)!;
    else continue;
    if (count >= CONN_MAX) break;
    from[outBase + count] = Math.floor(key / 256);
    to[outBase + count] = key % 256;
    weight[outBase + count] = w;
    count++;
  }
  return count;
}
