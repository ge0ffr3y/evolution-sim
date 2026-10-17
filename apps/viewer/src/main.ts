import "./style.css";
import { GENES, parsePreset, type GeneName, type Preset } from "@evo/sim-core";
import { Charts } from "./charts";
import { FlowTracker } from "./flows";
import { HEATMAP_TRAITS, Heatmap } from "./heatmap";
import type { FrameMessage, InspectedState, ToWorker } from "./protocol";
import { COLOR_MODES, WorldRenderer, legendGradient, type ColorBy } from "./render";

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
const DEFAULT_PRESET_ID = "default";

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element #${id}`);
  return found as T;
}

// --- Presets: every JSON file in the repo's configs/ folder is bundled in ---
interface PresetEntry {
  id: string;
  preset: Preset;
}

const presetFiles = import.meta.glob("../../../configs/*.json", { eager: true, import: "default" }) as Record<string, unknown>;
const presets: PresetEntry[] = Object.entries(presetFiles)
  .map(([path, json]) => {
    const id = path.split("/").pop()!.replace(/\.json$/, "");
    return { id, preset: parsePreset(json, id) };
  })
  .sort((a, b) => (a.id === DEFAULT_PRESET_ID ? -1 : b.id === DEFAULT_PRESET_ID ? 1 : a.preset.name.localeCompare(b.preset.name)));

function findPreset(id: string | null): PresetEntry {
  return presets.find((p) => p.id === id) ?? presets.find((p) => p.id === DEFAULT_PRESET_ID) ?? presets[0]!;
}

// --- Elements ---
const canvas = el<HTMLCanvasElement>("world");
const playButton = el<HTMLButtonElement>("play");
const speedsBox = el<HTMLDivElement>("speeds");
const seedForm = el<HTMLFormElement>("seed-form");
const seedInput = el<HTMLInputElement>("seed");
const randomButton = el<HTMLButtonElement>("random-seed");
const presetSelect = el<HTMLSelectElement>("preset");
const presetDescription = el<HTMLParagraphElement>("preset-description");
const colorSelect = el<HTMLSelectElement>("color-by");
const notice = el<HTMLParagraphElement>("notice");

const renderer = new WorldRenderer(canvas);
const charts = new Charts(el("chart-pop"), el("chart-traits"));
const heatmap = new Heatmap(el("heatmap"));
const flows = new FlowTracker();
const worker = new Worker(new URL("./sim.worker.ts", import.meta.url), { type: "module" });

function send(message: ToWorker): void {
  worker.postMessage(message);
}

// --- State ---
let running = true;
let currentResetId = -1;
let currentSeed = DEFAULT_SEED;
let currentPreset = findPreset(null);
let latestFrame: FrameMessage | null = null;
let frameDirty = false;
let chartsDirty = false;
let speedIndex = DEFAULT_SPEED_INDEX;
// For the "ticks per second" readout.
let lastRateTick = 0;
let lastRateTime = performance.now();

// --- Seed and preset (kept in the address bar so a run can be shared) ---
function readSeedFromUrl(): number {
  const raw = new URLSearchParams(window.location.search).get("seed");
  const value = raw === null ? NaN : Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : DEFAULT_SEED;
}

function restart(seed: number, preset: PresetEntry): void {
  currentSeed = seed;
  currentPreset = preset;
  seedInput.value = String(seed);
  presetSelect.value = preset.id;
  presetDescription.textContent = preset.preset.description;

  const url = new URL(window.location.href);
  url.searchParams.set("seed", String(seed));
  if (preset.id === DEFAULT_PRESET_ID) url.searchParams.delete("preset");
  else url.searchParams.set("preset", preset.id);
  window.history.replaceState(null, "", url);

  clearHistory();
  lastRateTick = 0;
  lastRateTime = performance.now();
  send({ type: "reset", seed, config: preset.preset.config });
  send({ type: running ? "play" : "pause" });
}

function clearHistory(): void {
  charts.clear();
  heatmap.clear();
  flows.clear();
  renderInspector(null);
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
  restart(value, currentPreset);
});

randomButton.addEventListener("click", () => {
  // Choosing a starting seed is a UI action, so ordinary randomness is fine here.
  // The simulation itself only ever uses the seeded generator.
  restart(Math.floor(Math.random() * 1_000_000), currentPreset);
});

for (const { id, preset } of presets) {
  const option = document.createElement("option");
  option.value = id;
  option.textContent = preset.name;
  presetSelect.append(option);
}
presetSelect.addEventListener("change", () => restart(currentSeed, findPreset(presetSelect.value)));

for (const mode of COLOR_MODES) {
  const option = document.createElement("option");
  option.value = mode.id;
  option.textContent = mode.label;
  colorSelect.append(option);
}

function renderLegend(): void {
  const mode = COLOR_MODES.find((m) => m.id === renderer.colorBy)!;
  el("legend-low").textContent = mode.legendLow;
  el("legend-high").textContent = mode.legendHigh;
  el("legend-swatch").style.background = legendGradient(mode.id);
}

colorSelect.addEventListener("change", () => {
  renderer.colorBy = colorSelect.value as ColorBy;
  renderLegend();
  frameDirty = true;
});

function showNotice(text: string | null): void {
  notice.hidden = text === null;
  notice.textContent = text ?? "";
}

// --- Trait-over-time tabs ---
const tabsBox = el<HTMLDivElement>("heatmap-tabs");
function renderTabs(): void {
  tabsBox.replaceChildren();
  for (const { id, label } of HEATMAP_TRAITS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.setAttribute("aria-pressed", String(id === heatmap.trait));
    button.addEventListener("click", () => {
      heatmap.trait = id;
      heatmap.redraw();
      renderTabs();
    });
    tabsBox.append(button);
  }
}

// --- Inspector ---
canvas.addEventListener("click", (event) => {
  const frame = latestFrame;
  if (!frame) return;
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * frame.world.width;
  const y = ((event.clientY - rect.top) / rect.height) * frame.world.height;
  send({ type: "inspectAt", x, y });
});

el("insp-clear").addEventListener("click", () => {
  send({ type: "clearInspect" });
  renderInspector(null);
});

const GENE_LABELS: Record<GeneName, string> = {
  size: "Size",
  speed: "Speed",
  senseRange: "Sense range",
  metabolism: "Metabolism",
  hue: "Color",
  mutationRate: "Mutation rate",
};

function traitText(gene: GeneName, value: number): string {
  if (gene === "mutationRate") return value.toFixed(4);
  return value.toFixed(2);
}

function renderInspector(state: InspectedState | null): void {
  el("inspector-empty").hidden = state !== null;
  el("inspector").hidden = state === null;
  if (!state) return;
  const s = state.snapshot;

  el("insp-title").textContent = `Organism #${s.id}`;
  el("insp-status").textContent = state.alive
    ? "Alive."
    : `Died of hunger around tick ${state.diedAtTick?.toLocaleString("en-US") ?? "?"}. Showing its last known state.`;
  el("insp-age").textContent = `${s.age.toLocaleString("en-US")} ticks`;
  el("insp-parent").textContent = s.parentId === 0 ? "none (first generation)" : `#${s.parentId}`;

  const fraction = Math.max(0, Math.min(1, s.energy / s.threshold));
  el("insp-energy-text").textContent = `${s.energy.toFixed(1)} of ${s.threshold.toFixed(1)} to reproduce`;
  el("insp-energy-bar").style.width = `${fraction * 100}%`;

  const list = el("insp-genes");
  list.replaceChildren();
  GENES.forEach((gene, index) => {
    const item = document.createElement("li");
    const name = document.createElement("span");
    name.className = "gene-name";
    name.textContent = GENE_LABELS[gene];
    const bar = document.createElement("div");
    bar.className = "bar";
    const fill = document.createElement("div");
    fill.className = "bar-fill";
    fill.style.width = `${s.genes[index]! * 100}%`;
    bar.append(fill);
    const value = document.createElement("span");
    value.className = "gene-value";
    value.textContent = traitText(gene, s.traits[gene]);
    item.append(name, bar, value);
    list.append(item);
  });

  const c = s.costs;
  el("insp-costs").textContent =
    `upkeep ${c.basal.toFixed(4)}, movement ${c.movement.toFixed(4)}, sensing ${c.sensing.toFixed(4)} ` +
    `(total ${(c.basal + c.movement + c.sensing).toFixed(4)})`;
}

// --- Energy flows ---
const FLOW_COLORS = { upkeep: "#4cc2ff", movement: "#ffb454", sensing: "#c792ea" } as const;

function renderFlows(): void {
  const recent = flows.recent();
  const intro = el("flows-intro");
  const bar = el("flows-bar");
  const legend = el("flows-legend");
  if (!recent) {
    intro.hidden = false;
    intro.textContent = "Collecting data...";
    bar.hidden = true;
    legend.hidden = true;
    return;
  }
  const burned = recent.basalPerTick + recent.movementPerTick + recent.sensingPerTick;
  intro.hidden = false;
  intro.textContent = `Food energy eaten: ${recent.intakePerTick.toFixed(1)} per tick. Energy burned: ${burned.toFixed(1)} per tick (the gap goes into new organisms).`;

  const parts: [string, string, number][] = [
    ["Upkeep", FLOW_COLORS.upkeep, recent.basalPerTick],
    ["Movement", FLOW_COLORS.movement, recent.movementPerTick],
    ["Sensing", FLOW_COLORS.sensing, recent.sensingPerTick],
  ];
  bar.hidden = false;
  legend.hidden = false;
  bar.replaceChildren(
    ...parts.map(([label, color, value]) => {
      const segment = document.createElement("div");
      segment.title = label;
      segment.style.background = color;
      segment.style.width = `${burned > 0 ? (value / burned) * 100 : 0}%`;
      return segment;
    }),
  );
  legend.replaceChildren(
    ...parts.map(([label, color, value]) => {
      const item = document.createElement("li");
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = color;
      const text = document.createElement("span");
      text.textContent = `${label}: ${burned > 0 ? Math.round((value / burned) * 100) : 0}% of spending (${value.toFixed(2)} per tick)`;
      item.append(dot, text);
      return item;
    }),
  );
}

// --- Worker frames ---
worker.onmessage = (event: MessageEvent<FrameMessage>) => {
  const frame = event.data;
  if (frame.resetId !== currentResetId) {
    // First frame after a restart: start the charts fresh.
    currentResetId = frame.resetId;
    clearHistory();
    heatmap.setWorld(frame.world);
  }
  charts.add(frame.points);
  flows.add(frame.points);
  heatmap.add(frame.histograms);
  chartsDirty = true;
  latestFrame = frame;
  frameDirty = true;

  renderInspector(frame.inspected);

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
  setText("stat-energy", format.fixed(s.meanEnergy, 1));
  setText("stat-size", format.fixed(s.traits.size.mean, 2));
  setText("stat-speed", format.fixed(s.traits.speed.mean, 2));
  setText("stat-sense", format.fixed(s.traits.senseRange.mean, 2));
  setText("stat-metab", format.fixed(s.traits.metabolism.mean, 2));
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
    heatmap.redraw();
    renderFlows();
  }
}, CHART_REFRESH_MS);

window.addEventListener("resize", () => {
  frameDirty = true;
});

// --- Go ---
renderPlayButton();
renderSpeedButtons();
renderTabs();
renderLegend();
renderInspector(null);
send({ type: "speed", ticksPerSecond: SPEEDS[DEFAULT_SPEED_INDEX]!.ticksPerSecond });
restart(readSeedFromUrl(), findPreset(new URLSearchParams(window.location.search).get("preset")));
requestAnimationFrame(paint);
