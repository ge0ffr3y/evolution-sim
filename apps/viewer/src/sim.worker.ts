import { Simulation } from "@evo/sim-core";
import type { FrameMessage, HistoryPoint, ToWorker } from "./protocol";

// The simulation runs here, off the main thread, so the page stays smooth.
// Real-time clocks are fine in this file: they only decide how many ticks to
// run per second. The simulation itself never sees them.

/** Record a chart sample every this many ticks. */
const SAMPLE_EVERY = 10;
/** Send a picture of the world to the page at most this often. */
const FRAME_INTERVAL_MS = 33;
/** In "as fast as possible" mode, run for about this long between frames. */
const MAX_SPEED_BUDGET_MS = 14;
/** Never try to catch up by more than this many ticks in one go. */
const MAX_TICKS_PER_LOOP = 5000;

let sim: Simulation | null = null;
let resetId = 0;
let running = false;
let extinct = false;
let ticksPerSecond = 60;
let owedTicks = 0;
let lastLoop = performance.now();
let lastFrame = 0;
let needsFrame = false;
let points: HistoryPoint[] = [];

function recordPoint(s: Simulation): void {
  const stats = s.stats();
  points.push({
    tick: stats.tick,
    population: stats.population,
    totalFood: stats.totalFood,
    meanSpeed: stats.meanSpeed,
    meanSize: stats.meanSize,
  });
}

function advance(s: Simulation, ticks: number): void {
  for (let t = 0; t < ticks; t++) {
    s.step();
    if (s.tick % SAMPLE_EVERY === 0) recordPoint(s);
    if (s.count === 0) {
      extinct = true;
      running = false;
      recordPoint(s);
      break;
    }
  }
  needsFrame = true;
}

function postFrame(s: Simulation): void {
  const n = s.count;
  // Copy the live arrays (the simulation keeps using them) and hand the copies over.
  const x = s.x.slice(0, n);
  const y = s.y.slice(0, n);
  const speed = s.speed.slice(0, n);
  const size = s.size.slice(0, n);
  const food = s.food.slice();

  const message: FrameMessage = {
    type: "frame",
    resetId,
    seed: s.seed,
    running,
    extinct,
    stats: s.stats(),
    world: {
      width: s.config.worldWidth,
      height: s.config.worldHeight,
      gridWidth: s.gridWidth,
      gridHeight: s.gridHeight,
      foodCap: s.config.foodCap,
    },
    count: n,
    x,
    y,
    speed,
    size,
    food,
    points,
  };
  points = [];
  needsFrame = false;
  lastFrame = performance.now();
  // The options form of postMessage works in both a worker and the DOM typings.
  self.postMessage(message, { transfer: [x.buffer, y.buffer, speed.buffer, size.buffer, food.buffer] });
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

self.onmessage = (event: MessageEvent<ToWorker>) => {
  const message = event.data;
  switch (message.type) {
    case "reset":
      resetId++;
      sim = new Simulation(message.seed);
      extinct = false;
      owedTicks = 0;
      points = [];
      recordPoint(sim);
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
  }
};

setInterval(loop, 16);
