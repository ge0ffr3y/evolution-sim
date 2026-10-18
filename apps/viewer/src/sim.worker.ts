import { GENES, Simulation, SpatialHash, type GeneName } from "@evo/sim-core";
import type { FrameMessage, HistogramSample, HistoryPoint, InspectedState, ToWorker, WorldInfo } from "./protocol";

// The simulation runs here, off the main thread, so the page stays smooth.
// Real-time clocks are fine in this file: they only decide how many ticks to
// run per second. The simulation itself never sees them.

/** Record a chart sample every this many ticks. */
const SAMPLE_EVERY = 10;
/** Take a trait histogram every this many ticks. */
const HISTOGRAM_EVERY = 1000;
const HISTOGRAM_BINS = 24;
/** Send a picture of the world to the page at most this often. */
const FRAME_INTERVAL_MS = 33;
/** In "as fast as possible" mode, run for about this long between frames. */
const MAX_SPEED_BUDGET_MS = 14;
/** Never try to catch up by more than this many ticks in one go. */
const MAX_TICKS_PER_LOOP = 5000;
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
let needsFrame = false;
let sendCapacity = false;
let points: HistoryPoint[] = [];
let histograms: HistogramSample[] = [];
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
  });
}

function recordHistograms(s: Simulation): void {
  const counts = {} as Record<GeneName, Uint32Array>;
  for (const gene of GENES) counts[gene] = s.histogram(gene, HISTOGRAM_BINS);
  histograms.push({ tick: s.tick, counts });
}

function advance(s: Simulation, ticks: number): void {
  for (let t = 0; t < ticks; t++) {
    s.step();
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

function worldInfo(s: Simulation): WorldInfo {
  return {
    width: s.config.worldWidth,
    height: s.config.worldHeight,
    gridWidth: s.gridWidth,
    gridHeight: s.gridHeight,
    foodCap: s.config.foodCap,
    overlayScale: { nutrient: s.config.initialNutrientPerCell, corpse: 30, detritus: 12 },
    ranges: s.ranges,
    histogramBins: HISTOGRAM_BINS,
    histogramEvery: HISTOGRAM_EVERY,
  };
}

function postFrame(s: Simulation): void {
  const n = s.count;
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
  const capacity = sendCapacity ? s.foodCapacity.slice() : null;

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
    capacity,
    points,
    histograms,
    inspected: inspect(s),
    events: s.events,
  };
  points = [];
  histograms = [];
  sendCapacity = false;
  needsFrame = false;
  lastFrame = performance.now();

  const transfer: Transferable[] = [
    x.buffer, y.buffer, speed.buffer, size.buffer, sense.buffer, hue.buffer, diet.buffer, energyFraction.buffer,
    food.buffer, nutrient.buffer, corpse.buffer, detritus.buffer,
  ];
  if (capacity) transfer.push(capacity.buffer);
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

  if (sim && needsFrame && now - lastFrame >= FRAME_INTERVAL_MS) postFrame(sim);
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

self.onmessage = (event: MessageEvent<ToWorker>) => {
  const message = event.data;
  switch (message.type) {
    case "reset":
      resetId++;
      sim = new Simulation(message.seed, message.config);
      hash = null;
      extinct = false;
      owedTicks = 0;
      points = [];
      histograms = [];
      selectedId = null;
      lastInspected = null;
      sendCapacity = true;
      recordPoint(sim);
      recordHistograms(sim);
      needsFrame = true;
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
          lastInspected = null;
          needsFrame = true;
        }
      }
      break;
    case "clearInspect":
      selectedId = null;
      lastInspected = null;
      needsFrame = true;
      break;
  }
};

setInterval(loop, 16);
