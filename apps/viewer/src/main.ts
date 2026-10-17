import "./style.css";
import { Charts } from "./charts";
import type { FrameMessage, ToWorker } from "./protocol";
import { WorldRenderer } from "./render";

const DEFAULT_SEED = 42;
/** Speed buttons: label and simulation ticks per real second. */
const SPEEDS: readonly { label: string; ticksPerSecond: number }[] = [
  { label: "0.5×", ticksPerSecond: 30 },
  { label: "1×", ticksPerSecond: 60 },
  { label: "4×", ticksPerSecond: 240 },
  { label: "16×", ticksPerSecond: 960 },
  { label: "Max", ticksPerSecond: Infinity },
];
const DEFAULT_SPEED_INDEX = 1;
const CHART_REFRESH_MS = 250;

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element #${id}`);
  return found as T;
}

const canvas = el<HTMLCanvasElement>("world");
const playButton = el<HTMLButtonElement>("play");
const speedsBox = el<HTMLDivElement>("speeds");
const seedForm = el<HTMLFormElement>("seed-form");
const seedInput = el<HTMLInputElement>("seed");
const randomButton = el<HTMLButtonElement>("random-seed");
const notice = el<HTMLParagraphElement>("notice");

const renderer = new WorldRenderer(canvas);
const charts = new Charts(el("chart-pop"), el("chart-traits"));
const worker = new Worker(new URL("./sim.worker.ts", import.meta.url), { type: "module" });

function send(message: ToWorker): void {
  worker.postMessage(message);
}

// --- State ---
let running = true;
let currentResetId = -1;
let latestFrame: FrameMessage | null = null;
let frameDirty = false;
let chartsDirty = false;
let speedIndex = DEFAULT_SPEED_INDEX;
// For the "ticks per second" readout.
let lastRateTick = 0;
let lastRateTime = performance.now();

// --- Seed (also kept in the address bar so a run can be shared) ---
function readSeedFromUrl(): number {
  const raw = new URLSearchParams(window.location.search).get("seed");
  const value = raw === null ? NaN : Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : DEFAULT_SEED;
}

function restart(seed: number): void {
  seedInput.value = String(seed);
  const url = new URL(window.location.href);
  url.searchParams.set("seed", String(seed));
  window.history.replaceState(null, "", url);
  charts.clear();
  lastRateTick = 0;
  lastRateTime = performance.now();
  send({ type: "reset", seed });
  send({ type: running ? "play" : "pause" });
}

// --- Controls ---
function renderPlayButton(): void {
  playButton.textContent = running ? "Pause" : "Play";
}

playButton.addEventListener("click", () => {
  running = !running;
  renderPlayButton();
  send({ type: running ? "play" : "pause" });
});

function renderSpeedButtons(): void {
  speedsBox.replaceChildren();
  SPEEDS.forEach((speed, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = speed.label;
    button.setAttribute("aria-pressed", String(index === speedIndex));
    button.addEventListener("click", () => {
      speedIndex = index;
      send({ type: "speed", ticksPerSecond: speed.ticksPerSecond });
      renderSpeedButtons();
    });
    speedsBox.append(button);
  });
}

seedForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = Number(seedInput.value);
  if (!Number.isInteger(value) || value < 0) {
    showNotice("Seed must be a whole number, 0 or higher.");
    return;
  }
  showNotice(null);
  restart(value);
});

randomButton.addEventListener("click", () => {
  // Choosing a starting seed is a UI action, so ordinary randomness is fine here.
  // The simulation itself only ever uses the seeded generator.
  restart(Math.floor(Math.random() * 1_000_000));
});

function showNotice(text: string | null): void {
  notice.hidden = text === null;
  notice.textContent = text ?? "";
}

// --- Worker frames ---
worker.onmessage = (event: MessageEvent<FrameMessage>) => {
  const frame = event.data;
  if (frame.resetId !== currentResetId) {
    // First frame after a restart: start the charts fresh.
    currentResetId = frame.resetId;
    charts.clear();
  }
  charts.add(frame.points);
  chartsDirty = true;
  latestFrame = frame;
  frameDirty = true;

  if (frame.extinct) {
    running = false;
    renderPlayButton();
    showNotice(`Everyone died out at tick ${frame.stats.tick}. Try another seed.`);
  } else if (notice.textContent?.startsWith("Everyone")) {
    showNotice(null);
  }
};

// --- Drawing ---
const format = {
  int: new Intl.NumberFormat("en-US"),
  fixed: (value: number, digits: number): string => value.toFixed(digits),
};

function setText(id: string, text: string): void {
  const node = document.getElementById(id);
  if (node && node.textContent !== text) node.textContent = text;
}

function updateStats(frame: FrameMessage): void {
  const s = frame.stats;
  setText("stat-tick", format.int.format(s.tick));
  setText("stat-pop", format.int.format(s.population));
  setText("stat-food", format.int.format(Math.round(s.totalFood)));
  setText("stat-speed", format.fixed(s.meanSpeed, 3));
  setText("stat-size", format.fixed(s.meanSize, 3));
  setText("stat-energy", format.fixed(s.meanEnergy, 1));
  setText("stat-births", format.int.format(s.totalBirths));
  setText("stat-deaths", format.int.format(s.totalDeaths));
}

function updateRate(frame: FrameMessage): void {
  const now = performance.now();
  if (now - lastRateTime < 500) return;
  const ticks = frame.stats.tick - lastRateTick;
  const rate = ticks >= 0 ? (ticks * 1000) / (now - lastRateTime) : 0;
  setText("stat-tps", format.int.format(Math.round(rate)));
  lastRateTick = frame.stats.tick;
  lastRateTime = now;
}

function paint(): void {
  if (latestFrame && frameDirty) {
    frameDirty = false;
    renderer.draw(latestFrame);
    updateStats(latestFrame);
    updateRate(latestFrame);
  }
  requestAnimationFrame(paint);
}

setInterval(() => {
  if (chartsDirty) {
    chartsDirty = false;
    charts.redraw();
  }
}, CHART_REFRESH_MS);

window.addEventListener("resize", () => {
  frameDirty = true;
});

// --- Go ---
renderPlayButton();
renderSpeedButtons();
send({ type: "speed", ticksPerSecond: SPEEDS[DEFAULT_SPEED_INDEX]!.ticksPerSecond });
restart(readSeedFromUrl());
requestAnimationFrame(paint);
