import { GENES, SAMPLE_STRIDE, Simulation, SpatialHash, snapshotFromBytes, snapshotToBytes, type BehaviorStats, type GeneName, type SpeciesRecord } from "@evo/sim-core";
import type { FrameMessage, HistogramSample, HistoryPoint, InspectedState, IntervenedMessage, LoadFailedMessage, SavedMessage, SpotlightKind, SpotlightMessage, ToWorker, WorldInfo } from "./protocol";

// The simulation runs here, off the main thread, so the page stays smooth.
// Real-time clocks are fine in this file: they only decide how many ticks to
// run per second. The simulation itself never sees them.

/** Record a chart sample every this many ticks. */
const SAMPLE_EVERY = 10;
/** Take a trait histogram every this many ticks. */
const HISTOGRAM_EVERY = 1000;
const HISTOGRAM_BINS = 24;
/** How often a picture of the world is sent to the page: about 30 a second, or as set by a "frameRate" message. */
let frameIntervalMs = 33;
/** The family tree is big, so it goes out about once a second (and right after a restart). */
const SPECIES_INTERVAL_MS = 1000;
/** Species history is thinned to about this many samples so the tree message stays small in long runs. */
const MAX_HISTORY_SAMPLES = 300;
/** In "as fast as possible" mode, run for about this long between frames. */
const MAX_SPEED_BUDGET_MS = 14;
/** Never try to catch up by more than this many ticks in one go. */
const MAX_TICKS_PER_LOOP = 5000;
/** Measure how purposefully organisms turn every this many ticks, and average over the last few measurements. */
const BEHAVIOR_EVERY = 100;
const BEHAVIOR_WINDOW = 30;
/** Clicking selects an organism only if it is within this many world units. */
const PICK_RADIUS = 4;

let sim: Simulation | null = null;
let hash: SpatialHash | null = null;
let resetId = 0;
let running = false;
let extinct = false;
let ticksPerSecond = 60;
let owedTicks = 0;
let lastLoop = performance.now();
let lastFrame = 0;
let lastSpeciesSent = -Infinity;
let needsFrame = false;
let sendCapacity = false;
let points: HistoryPoint[] = [];
let histograms: HistogramSample[] = [];
let behaviorSamples: BehaviorStats[] = [];
let measuringBehavior = false;
let selectedId: number | null = null;
let lastInspected: InspectedState | null = null;

function recordPoint(s: Simulation): void {
  const stats = s.stats();
  const L = stats.ledger;
  points.push({
    tick: stats.tick,
    population: stats.population,
    herbivores: stats.classes.herbivores,
    omnivores: stats.classes.omnivores,
    carnivores: stats.classes.carnivores,
    totalFood: stats.totalFood,
    totalKills: stats.totalKills,
    meanSize: stats.traits.size.mean,
    meanSpeed: stats.traits.speed.mean,
    meanSense: stats.traits.senseRange.mean,
    meanMetabolism: stats.traits.metabolism.mean,
    sunlightIn: L.sunlightIn,
    plantEaten: L.plantEaten,
    meatEaten: L.meatEaten,
    digestionLoss: L.digestionLoss,
    decayLoss: L.decayLoss,
    basalBurned: L.basalBurned,
    movementBurned: L.movementBurned,
    sensingBurned: L.sensingBurned,
    attackBurned: L.attackBurned,
    armorBurned: L.armorBurned,
    brainBurned: L.brainBurned,
    hiddenHerbivores: stats.brain.herbivores.hidden,
    connectionsHerbivores: stats.brain.herbivores.connections,
    hiddenCarnivores: stats.brain.carnivores.hidden,
    connectionsCarnivores: stats.brain.carnivores.connections,
    colonyShare: stats.population > 0 ? stats.colonies.cells / stats.population : 0,
    colonyMeanSize: stats.colonies.meanSize,
    colonyMeanTypes: stats.colonies.meanTypes,
    colonySymmetry: stats.colonies.symmetry,
  });
}

/** Recent average of the behavior measurements: 0.5 means turning at random. */
function recentBehavior(): BehaviorStats {
  let chaseSum = 0;
  let chaseN = 0;
  let fleeSum = 0;
  let fleeN = 0;
  for (const b of behaviorSamples) {
    chaseSum += b.chase * b.chaseSamples;
    chaseN += b.chaseSamples;
    fleeSum += b.flee * b.fleeSamples;
    fleeN += b.fleeSamples;
  }
  return {
    chase: chaseN > 0 ? chaseSum / chaseN : 0.5,
    chaseSamples: chaseN,
    flee: fleeN > 0 ? fleeSum / fleeN : 0.5,
    fleeSamples: fleeN,
  };
}

function recordHistograms(s: Simulation): void {
  const counts = {} as Record<GeneName, Uint32Array>;
  for (const gene of GENES) counts[gene] = s.histogram(gene, HISTOGRAM_BINS);
  histograms.push({ tick: s.tick, counts });
}

function advance(s: Simulation, ticks: number): void {
  for (let t = 0; t < ticks; t++) {
    // Every so often, watch one tick closely to see whether hunters turn toward prey and prey away from threats.
    if (s.tick % BEHAVIOR_EVERY === 0 && s.count > 0) {
      s.behaviorBefore();
      measuringBehavior = true;
    }
    s.step();
    if (measuringBehavior) {
      measuringBehavior = false;
      behaviorSamples.push(s.behaviorAfter());
      if (behaviorSamples.length > BEHAVIOR_WINDOW) behaviorSamples.shift();
    }
    if (s.tick % SAMPLE_EVERY === 0) recordPoint(s);
    if (s.tick % HISTOGRAM_EVERY === 0) recordHistograms(s);
    if (s.count === 0) {
      extinct = true;
      running = false;
      recordPoint(s);
      break;
    }
  }
  needsFrame = true;
}

/** Look up the selected organism; if it has died, keep showing its last known state. */
function inspect(s: Simulation): InspectedState | null {
  if (selectedId === null) return null;
  const index = s.indexOfId(selectedId);
  if (index >= 0) {
    lastInspected = { snapshot: s.describe(index), alive: true, diedAtTick: null };
  } else if (lastInspected && lastInspected.alive) {
    lastInspected = { snapshot: lastInspected.snapshot, alive: false, diedAtTick: s.tick };
  }
  return lastInspected;
}

/**
 * Spotlight: pick a living organism of the asked-for kind. Picking among equals uses ordinary
 * randomness: this is a choice about what to show, made outside the simulation, so it never changes what happens.
 */
function spotlightPick(s: Simulation, kind: SpotlightKind): { index: number; reason: string } | null {
  const n = s.count;
  if (n === 0) return null;
  const anyOf = (indices: number[]): number => indices[Math.floor(Math.random() * indices.length)]!;
  const fmt = (x: number): string => x.toLocaleString("en-US");
  switch (kind) {
    case "random": {
      const index = Math.floor(Math.random() * n);
      return { index, reason: "Picked at random" };
    }
    case "meatEater": {
      const eaters: number[] = [];
      for (let i = 0; i < n; i++) if (s.diet[i]! > 0.75) eaters.push(i);
      if (!eaters.length) return null;
      const index = anyOf(eaters);
      return { index, reason: `A meat eater (diet ${s.diet[index]!.toFixed(2)}), one of ${fmt(eaters.length)}` };
    }
    case "oldest": {
      let best = 0;
      for (let i = 1; i < n; i++) if (s.age[i]! > s.age[best]!) best = i;
      return { index: best, reason: `The oldest alive: ${fmt(s.age[best]!)} ticks old` };
    }
    case "topHunter": {
      let best = 0;
      for (let i = 1; i < n; i++) if (s.kills[i]! > s.kills[best]!) best = i;
      if (s.kills[best] === 0) return null;
      return { index: best, reason: `The top hunter alive: ${fmt(s.kills[best]!)} kills` };
    }
    case "newSpecies": {
      if (s.species.length === 0) return null;
      let newest: { id: number; bornTick: number } | null = null;
      for (const r of s.speciesRecords) if (r.diedTick === null && r.count > 0 && (!newest || r.bornTick > newest.bornTick)) newest = { id: r.id, bornTick: r.bornTick };
      if (!newest) return null;
      const members: number[] = [];
      for (let i = 0; i < n; i++) if (s.species[i] === newest.id) members.push(i);
      if (!members.length) return null;
      return { index: anyOf(members), reason: `From the newest species, #${newest.id} (split off at tick ${fmt(newest.bornTick)})` };
    }
  }
}

function worldInfo(s: Simulation): WorldInfo {
  return {
    width: s.config.worldWidth,
    height: s.config.worldHeight,
    gridWidth: s.gridWidth,
    gridHeight: s.gridHeight,
    foodCap: s.config.foodCap,
    overlayScale: { nutrient: s.config.initialNutrientPerCell, corpse: 30, detritus: 12, scent: 8 * s.config.scentDeposit },
    scentWidth: s.scentWidth,
    scentHeight: s.scentHeight,
    ranges: s.ranges,
    histogramBins: HISTOGRAM_BINS,
    histogramEvery: HISTOGRAM_EVERY,
    brainMode: s.config.brainMode,
    multicellular: s.config.multicellular === 1,
    diseaseOn: s.config.diseaseTransmission > 0,
    camouflageOn: s.config.camouflageMode === 1,
    nutrientOn: s.config.nutrientMode >= 1,
    drinkOn: s.config.drinking === 1,
    plantKinds: s.config.plantTypes,
    plantEvolution: s.config.plantEvolution === 1,
    sexGeneOn: s.config.sexualReproduction === 2,
    climateMode: s.config.climateMode,
    yearLength: s.config.yearLength,
    dayLength: s.config.dayLength,
  };
}

/** Copy the family tree for sending, keeping only about MAX_HISTORY_SAMPLES samples of each history. */
function speciesForSending(s: Simulation): SpeciesRecord[] {
  return s.speciesRecords.map((record) => {
    const samples = record.history.length / SAMPLE_STRIDE;
    const step = Math.max(1, Math.ceil(samples / MAX_HISTORY_SAMPLES));
    let history = record.history;
    if (step > 1) {
      history = [];
      for (let k = 0; k < samples; k += step) history.push(...record.history.slice(k * SAMPLE_STRIDE, (k + 1) * SAMPLE_STRIDE));
      // Always keep the latest sample so the branch reaches the present.
      const last = samples - 1;
      if ((last % step) !== 0) history.push(...record.history.slice(last * SAMPLE_STRIDE, (last + 1) * SAMPLE_STRIDE));
    }
    return { ...record, history };
  });
}

function postFrame(s: Simulation): void {
  const n = s.count;
  const sendSpecies = performance.now() - lastSpeciesSent >= SPECIES_INTERVAL_MS;
  if (sendSpecies) lastSpeciesSent = performance.now();
  // Copy the live arrays (the simulation keeps using them) and hand the copies over.
  const x = s.x.slice(0, n);
  const y = s.y.slice(0, n);
  const speed = s.speed.slice(0, n);
  const size = s.size.slice(0, n);
  const sense = s.senseRange.slice(0, n);
  const hue = new Float32Array(n);
  const diet = s.diet.slice(0, n);
  const energyFraction = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    hue[i] = s.traitOf("hue", i);
    energyFraction[i] = s.energy[i]! / s.threshold[i]!;
  }
  const food = s.food.slice();
  const nutrient = s.nutrient.slice();
  const corpse = s.corpseEnergy.slice();
  const detritus = s.detritus.slice();
  const grazing = s.grazing.length > 0 ? s.grazing.slice() : null;
  const foul = s.foul.length > 0 ? s.foul.slice() : null;
  const soilHealth = s.soilHealth.length > 0 ? s.soilHealth.slice() : null;
  const eventMap = s.eventsEnabled ? s.eventMap() : null;
  let plantQuality: Float32Array | null = null;
  if (s.plantQ.length > 0) {
    plantQuality = new Float32Array(s.plantQ.length);
    for (let cell = 0; cell < s.plantQ.length; cell++) plantQuality[cell] = s.plantQ[cell]! / s.config.plantQualityMax;
  }
  const preyScent = Float32Array.from(s.preyScent);
  const hunterScent = Float32Array.from(s.hunterScent);
  const capacity = sendCapacity ? s.foodCapacity.slice() : null;
  const terrain = sendCapacity && s.biome.length > 0 ? s.biome.slice() : null;
  const moisture = sendCapacity && s.moistureBase.length > 0 ? s.moistureBase.slice() : null;
  const ice = s.iced.length > 0 ? s.iced.slice() : null;
  const hydration = s.hydration.length > 0 ? s.hydration.slice(0, n) : null;
  const background = sendCapacity && s.background.length > 0 ? s.background.slice() : null;
  const plantKindMap = sendCapacity && s.config.plantTypes > 1 ? s.plantKindMap().slice() : null;
  // Plants that evolve change all the time, so their genomes go with every frame.
  const plantGenome = s.plantChem.length > 0 ? { chem: Float32Array.from(s.plantChem), warm: Float32Array.from(s.plantWarm), toxin: s.plantToxin.length > 0 ? Float32Array.from(s.plantToxin) : null } : null;
  let toxicity: Float32Array | null = null;
  if (s.config.toxinStrength > 0) {
    toxicity = new Float32Array(n);
    for (let i = 0; i < n; i++) toxicity[i] = s.traitOf("toxicity", i);
  }
  let dietBalance: Float32Array | null = null;
  if (s.dietA.length > 0) {
    dietBalance = new Float32Array(n);
    for (let i = 0; i < n; i++) dietBalance[i] = Math.min(s.dietA[i]!, s.dietB[i]!, s.dietC[i]!);
  }
  let nutrientStore: Float32Array | null = null;
  if (s.config.nutrientMode >= 1) {
    nutrientStore = new Float32Array(n);
    const cap = s.config.nutrientStoreCap;
    for (let i = 0; i < n; i++) nutrientStore[i] = Math.min(1, s.nutrientStore[i]! / (cap * s.bodyMatter[i]!));
  }
  let palate: Float32Array | null = null;
  if (s.config.plantTypes > 1 || s.config.plantEvolution === 1) {
    palate = new Float32Array(n);
    for (let i = 0; i < n; i++) palate[i] = s.traitOf("palate", i);
  }
  let bonds: Uint32Array | null = null;
  let colonySize: Uint16Array | null = null;
  if (s.config.multicellular === 1) {
    colonySize = s.colonySizes();
    const pairs: number[] = [];
    for (let i = 0; i < n; i++) for (let k = 0; k < 6; k++) {
      const p = s.bondTo[i * 6 + k]!;
      if (p > i) pairs.push(i, p);
    }
    bonds = Uint32Array.from(pairs);
  }
  let health: Uint8Array | null = null;
  if (s.infection.length > 0) {
    health = new Uint8Array(n);
    for (let i = 0; i < n; i++) health[i] = s.sickFor[i]! > 0 ? 1 : s.immuneFor[i]! > 0 ? 2 : 0;
  }
  const climate = s.temperature.length > 0 ? { temperature: Float32Array.from(s.temperature), growth: Float32Array.from(s.growthFactor) } : null;

  const message: FrameMessage = {
    type: "frame",
    resetId,
    seed: s.seed,
    running,
    extinct,
    stats: s.stats(),
    world: worldInfo(s),
    count: n,
    x,
    y,
    speed,
    size,
    sense,
    hue,
    diet,
    energyFraction,
    food,
    nutrient,
    corpse,
    detritus,
    grazing,
    foul,
    soilHealth,
    eventMap,
    plantQuality,
    preyScent,
    hunterScent,
    capacity,
    terrain,
    moisture,
    ice,
    hydration,
    bonds,
    colonySize,
    cellType: s.cellType.length > 0 ? s.cellType.slice(0, n) : null,
    background,
    plantKindMap,
    plantGenome,
    palate,
    toxicity,
    nutrientStore,
    dietBalance,
    health,
    climate,
    points,
    histograms,
    inspected: inspect(s),
    events: s.events,
    behavior: recentBehavior(),
    species: sendSpecies ? speciesForSending(s) : null,
    speciesEvents: sendSpecies ? s.speciesEvents.slice() : null,
    worldEvents: sendSpecies ? s.worldEvents.slice() : null,
  };
  points = [];
  histograms = [];
  sendCapacity = false;
  needsFrame = false;
  lastFrame = performance.now();

  const transfer: Transferable[] = [
    x.buffer, y.buffer, speed.buffer, size.buffer, sense.buffer, hue.buffer, diet.buffer, energyFraction.buffer,
    food.buffer, nutrient.buffer, corpse.buffer, detritus.buffer, preyScent.buffer, hunterScent.buffer,
  ];
  if (grazing) transfer.push(grazing.buffer);
  if (foul) transfer.push(foul.buffer);
  if (soilHealth) transfer.push(soilHealth.buffer);
  if (eventMap) transfer.push(eventMap.buffer);
  if (plantQuality) transfer.push(plantQuality.buffer);
  if (capacity) transfer.push(capacity.buffer);
  if (terrain) transfer.push(terrain.buffer);
  if (moisture) transfer.push(moisture.buffer);
  if (ice) transfer.push(ice.buffer);
  if (hydration) transfer.push(hydration.buffer);
  if (background) transfer.push(background.buffer);
  if (plantKindMap) transfer.push(plantKindMap.buffer);
  if (plantGenome) transfer.push(plantGenome.chem.buffer, plantGenome.warm.buffer);
  if (plantGenome?.toxin) transfer.push(plantGenome.toxin.buffer);
  if (palate) transfer.push(palate.buffer);
  if (toxicity) transfer.push(toxicity.buffer);
  if (nutrientStore) transfer.push(nutrientStore.buffer);
  if (dietBalance) transfer.push(dietBalance.buffer);
  if (bonds) transfer.push(bonds.buffer);
  if (colonySize) transfer.push(colonySize.buffer);
  if (message.cellType) transfer.push(message.cellType.buffer);
  if (health) transfer.push(health.buffer);
  if (climate) transfer.push(climate.temperature.buffer, climate.growth.buffer);
  // The options form of postMessage works in both a worker and the DOM typings.
  self.postMessage(message, { transfer });
}

function loop(): void {
  const now = performance.now();
  const elapsed = Math.min(now - lastLoop, 100) / 1000;
  lastLoop = now;

  if (sim && running) {
    if (ticksPerSecond === Infinity) {
      while (running && performance.now() - now < MAX_SPEED_BUDGET_MS) advance(sim, 5);
    } else {
      owedTicks += ticksPerSecond * elapsed;
      const ticks = Math.min(Math.floor(owedTicks), MAX_TICKS_PER_LOOP);
      owedTicks -= Math.floor(owedTicks);
      if (ticks > 0) advance(sim, ticks);
    }
  }

  if (sim && needsFrame && now - lastFrame >= frameIntervalMs) postFrame(sim);
}

/** Pick the living organism closest to a point, or null if none is near enough. */
function pickNear(s: Simulation, x: number, y: number): number | null {
  if (!hash) hash = new SpatialHash(s.config.worldWidth, s.config.worldHeight, s.config.foodCellSize, s.config.maxOrganisms);
  hash.rebuild(s.x, s.y, s.count);
  let best = -1;
  let bestDistSq = Infinity;
  hash.forEachNear(x, y, PICK_RADIUS, (index, distSq) => {
    if (distSq < bestDistSq) {
      best = index;
      bestDistSq = distSq;
    }
  });
  return best >= 0 ? s.id[best]! : null;
}

/** Start showing a new world (fresh or loaded): forget everything about the old one. */
function startWorld(newSim: Simulation): void {
  lastSpeciesSent = -Infinity;
  resetId++;
  sim = newSim;
  hash = null;
  extinct = false;
  owedTicks = 0;
  points = [];
  histograms = [];
  selectedId = null;
  lastInspected = null;
  behaviorSamples = [];
  measuringBehavior = false;
  sendCapacity = true;
  recordPoint(sim);
  recordHistograms(sim);
  needsFrame = true;
}

self.onmessage = (event: MessageEvent<ToWorker>) => {
  const message = event.data;
  switch (message.type) {
    case "reset":
      startWorld(new Simulation(message.seed, message.config));
      break;
    case "save":
      if (sim) {
        const bytes = snapshotToBytes(sim.save());
        self.postMessage({ type: "saved", bytes, tick: sim.tick, seed: sim.seed } satisfies SavedMessage, { transfer: [bytes.buffer] });
      }
      break;
    case "load":
      try {
        const snapshot = snapshotFromBytes(message.bytes);
        startWorld(Simulation.load(snapshot, message.branchSeed === undefined ? {} : { seed: message.branchSeed }));
      } catch (error) {
        self.postMessage({ type: "loadFailed", message: error instanceof Error ? error.message : String(error) } satisfies LoadFailedMessage);
      }
      break;
    case "play":
      if (!extinct) running = true;
      needsFrame = true;
      break;
    case "pause":
      running = false;
      needsFrame = true;
      break;
    case "speed":
      ticksPerSecond = message.ticksPerSecond;
      owedTicks = 0;
      break;
    case "inspectAt":
      if (sim) {
        const picked = pickNear(sim, message.x, message.y);
        // Clicking empty space keeps the current selection; clicking an organism selects it.
        if (picked !== null) {
          selectedId = picked;
          sim.traceId = picked; // record what its brain is thinking
          lastInspected = null;
          needsFrame = true;
        }
      }
      break;
    case "frameRate":
      // Fewer pictures a second means less work making and drawing them (the simulation's speed is unchanged).
      frameIntervalMs = Math.round(1000 / Math.min(60, Math.max(1, message.framesPerSecond)));
      break;
    case "intervene": {
      // Messages are handled between batches of ticks, so the nudge lands cleanly before the next tick.
      const result = sim ? sim.intervene(message.kind) : { ok: false, text: "There is no world yet." };
      self.postMessage({ type: "intervened", requestId: message.requestId, kind: message.kind, ...result } satisfies IntervenedMessage);
      needsFrame = true;
      break;
    }
    case "spotlight": {
      const pick = sim ? spotlightPick(sim, message.kind) : null;
      if (sim && pick) {
        selectedId = sim.id[pick.index]!;
        sim.traceId = selectedId; // record what its brain is thinking
        lastInspected = null;
        needsFrame = true;
      }
      const reply: SpotlightMessage = { type: "spotlight", kind: message.kind, id: sim && pick ? sim.id[pick.index]! : null, reason: pick ? pick.reason : "" };
      postMessage(reply);
      break;
    }
    case "clearInspect":
      if (sim) sim.traceId = 0;
      selectedId = null;
      lastInspected = null;
      needsFrame = true;
      break;
  }
};

setInterval(loop, 16);
