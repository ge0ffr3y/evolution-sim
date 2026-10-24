import "./style.css";
import { GENE, GENES, parsePreset, type GeneName, type Preset, type SimConfig, type SimEvent, type SpeciesEvent, type SpeciesRecord, type WorldEvent } from "@evo/sim-core";
import { drawBrain } from "./brainview";
import { Charts } from "./charts";
import { ComplexityChart } from "./complexitychart";
import { FlowTracker } from "./flows";
import { HEATMAP_TRAITS, Heatmap } from "./heatmap";
import { readLink, writeLink } from "./links";
import type { FrameMessage, FromWorker, InspectedState, ToWorker } from "./protocol";
import { COLOR_MODES, OVERLAYS, WorldRenderer, legendGradient, type ColorBy, type Overlay } from "./render";
import { TreeView } from "./treeview";

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
/** The world a visitor sees first (the owner's choice for v1.0): the grand world. */
const DEFAULT_PRESET_ID = "grand-world";

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
const copyLinkButton = el<HTMLButtonElement>("copy-link");
const linkSettings = el<HTMLParagraphElement>("link-settings");
const presetSelect = el<HTMLSelectElement>("preset");
const presetDescription = el<HTMLParagraphElement>("preset-description");
const colorSelect = el<HTMLSelectElement>("color-by");
const overlaySelect = el<HTMLSelectElement>("overlay");
const notice = el<HTMLParagraphElement>("notice");

const renderer = new WorldRenderer(canvas);

// Family tree state (declared early: clearHistory below uses it).
const tree = new TreeView(el<HTMLCanvasElement>("tree-canvas"));
let speciesRecords: SpeciesRecord[] = [];
let speciesEventList: SpeciesEvent[] = [];
let worldEventList: WorldEvent[] = [];
let firstsList: readonly SimEvent[] = [];
let timelineKey = "";
const charts = new Charts(el("chart-pop"), el("chart-traits"), el("chart-web"), el("chart-brain"));
const heatmap = new Heatmap(el("heatmap"));
const flows = new FlowTracker();
const complexity = new ComplexityChart(el("chart-complexity"));
const worker = new Worker(new URL("./sim.worker.ts", import.meta.url), { type: "module" });

function send(message: ToWorker): void {
  worker.postMessage(message);
}

// --- State ---
let running = true;
let currentResetId = -1;
let currentSeed = DEFAULT_SEED;
let currentPreset = findPreset(null);
/** Settings changed by a shared link, on top of the preset (empty for an ordinary preset). */
let currentSettings: Partial<SimConfig> = {};
let latestFrame: FrameMessage | null = null;
let frameDirty = false;
let chartsDirty = false;
let speedIndex = DEFAULT_SPEED_INDEX;
// For the "ticks per second" readout.
let lastRateTick = 0;
let lastRateTime = performance.now();

// --- Seed, preset and changed settings (kept in the address bar so a run can be shared exactly) ---
function restart(seed: number, preset: PresetEntry, settings: Partial<SimConfig> = {}): void {
  currentSeed = seed;
  currentPreset = preset;
  currentSettings = settings;
  seedInput.value = String(seed);
  presetSelect.value = preset.id;
  presetDescription.textContent = preset.preset.description;
  const changed = Object.entries(settings);
  linkSettings.hidden = changed.length === 0;
  linkSettings.textContent = changed.length ? `Changed by this link: ${changed.map(([name, value]) => `${name} ${value}`).join(", ")}.` : "";

  window.history.replaceState(null, "", writeLink(new URL(window.location.href), seed, preset.id, settings));

  clearHistory();
  lastRateTick = 0;
  lastRateTime = performance.now();
  send({ type: "reset", seed, config: { ...preset.preset.config, ...settings } });
  send({ type: running ? "play" : "pause" });
}

function clearHistory(): void {
  shownEvents = -1;
  renderEvents([]);
  charts.clear();
  complexity.clear();
  heatmap.clear();
  flows.clear();
  renderInspector(null);
  resetTree();
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
  restart(value, currentPreset, currentSettings);
});

randomButton.addEventListener("click", () => {
  // Choosing a starting seed is a UI action, so ordinary randomness is fine here.
  // The simulation itself only ever uses the seeded generator.
  restart(Math.floor(Math.random() * 1_000_000), currentPreset, currentSettings);
});

copyLinkButton.addEventListener("click", () => {
  // The address already holds the seed, the world and any changed settings.
  const link = window.location.href;
  const done = (text: string): void => {
    copyLinkButton.textContent = text;
    window.setTimeout(() => (copyLinkButton.textContent = "Copy link"), 1500);
  };
  if (navigator.clipboard) navigator.clipboard.writeText(link).then(() => done("Copied"), () => window.prompt("Copy this link:", link));
  else window.prompt("Copy this link:", link);
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

for (const overlay of OVERLAYS) {
  const option = document.createElement("option");
  option.value = overlay.id;
  option.textContent = overlay.label;
  overlaySelect.append(option);
}
overlaySelect.addEventListener("change", () => {
  renderer.overlay = overlaySelect.value as Overlay;
  frameDirty = true;
});

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
  diet: "Diet (0=plants, 1=meat)",
  attack: "Attack",
  armor: "Armor",
  size: "Size",
  speed: "Speed",
  senseRange: "Sense range",
  metabolism: "Metabolism",
  hue: "Color",
  mutationRate: "Mutation rate",
  stamina: "Stamina (sprint reserve)",
  thermal: "Preferred temperature",
  lifespan: "Lifespan (ticks)",
  litter: "Litter size (babies)",
  bond: "Bonding (chance a baby stays attached)",
  plan1: "Body plan: first bond",
  plan2: "Body plan: second bond",
  plan3: "Body plan: later bonds",
  stick: "Stickiness (bonds with strangers)",
  tolerance: "Tolerance of relatives",
  sex: "Mate-seeking (chance of looking for a mate)",
  fat: "Fat (energy banked before reproducing)",
  torpor: "Torpor (dormancy when plants stop growing)",
  palate: "Palate (which kind of plant it digests best)",
  stressResponse: "Stress response (how strongly stress acts on the body)",
  calmResponse: "Calm response (how strongly calm acts on the body)",
  generosity: "Generosity (share of spare energy given to hungry neighbors)",
  toxicity: "Toxicity (how poisonous the body is to eat)",
  signal: "Signaling (shares what it senses with bonded cells)",
  learning: "Learning (how fast its brain changes with experience during its life)",
  placeMemory: "Place memory (how many good feeding places it can remember)",
  workingMemory: "Working memory (how many memory cells it can use; the brain decides what to hold)",
  pickiness: "Pickiness (turns down mates that eat differently, when it has a choice)",
  eye: "Eye (wide and short at 0, today's at 0.5, narrow, far and sharp at 1)",
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
  el("insp-parent").textContent =
    s.parentId === 0 ? "none (first generation)" : s.otherParentId !== 0 ? `#${s.parentId} and #${s.otherParentId}` : `#${s.parentId}`;

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
    `upkeep ${c.basal.toFixed(3)}, movement ${c.movement.toFixed(3)}, sensing ${c.sensing.toFixed(3)}, ` +
    `weapons ${c.attack.toFixed(3)}, armor ${c.armor.toFixed(3)}, brain ${c.brain.toFixed(3)} ` +
    `(total ${(c.basal + c.movement + c.sensing + c.attack + c.armor + c.brain).toFixed(3)})`;
  const brainBlock = el("insp-brain-block");
  if (s.brain) {
    brainBlock.hidden = false;
    el("insp-brain-summary").textContent = `${s.brain.connections} connections, ${s.brain.hidden} thinking units, ${s.brain.cost.toFixed(4)} energy per tick`;
    drawBrain(el<HTMLCanvasElement>("brain-canvas"), s.brain);
  } else {
    brainBlock.hidden = true;
  }
  const eaten = s.plantTaken + s.meatTaken;
  const health = s.health;
  const bits: string[] = [];
  if (health.sickFor > 0) bits.push(`Sick for ${format.int.format(health.sickFor)} more ticks (strain ${health.strain})`);
  else if (health.immuneFor > 0) bits.push(`Immune for ${format.int.format(health.immuneFor)} more ticks`);
  if (s.lifespan > 0) bits.push(`Lifespan ${format.int.format(Math.round(s.lifespan))} ticks (age ${format.int.format(s.age)})`);
  if (s.litter > 1.001) bits.push(`Litter size ${s.litter.toFixed(1)}`);
  if (s.luck) bits.push(`Luck: upkeep ${s.luck.upkeep.toFixed(2)}x, reproduction threshold ${s.luck.fertility.toFixed(2)}x (below 1 is lucky)`);
  el("insp-health").textContent = bits.join(". ");
  el("insp-ate").textContent =
    eaten > 0
      ? `Lifetime food energy: ${Math.round((s.plantTaken / eaten) * 100)}% plants, ${Math.round((s.meatTaken / eaten) * 100)}% meat. Kills: ${s.kills}.`
      : `Has not eaten yet. Kills: ${s.kills}.`;
}

// --- Energy flows ---
const FLOW_PARTS = [
  { key: "basalPerTick", label: "Upkeep", color: "#4cc2ff" },
  { key: "movementPerTick", label: "Movement", color: "#ffb454" },
  { key: "sensingPerTick", label: "Sensing", color: "#c792ea" },
  { key: "fightingPerTick", label: "Fighting", color: "#ff5d73" },
  { key: "armorPerTick", label: "Armor", color: "#8b98a5" },
  { key: "brainPerTick", label: "Thinking", color: "#f0e68c" },
  { key: "digestionPerTick", label: "Digestion loss", color: "#7bd88f" },
  { key: "rotPerTick", label: "Rotting", color: "#a67c52" },
] as const;

function renderFlows(): void {
  const recent = flows.recent();
  const intro = el("flows-intro");
  const bar = el("flows-bar");
  const legend = el("flows-legend");
  if (!recent) {
    intro.textContent = "Collecting data...";
    bar.hidden = true;
    legend.hidden = true;
    return;
  }
  const heat = FLOW_PARTS.reduce((sum, part) => sum + recent[part.key], 0);
  const eaten = recent.plantEatenPerTick + recent.meatEatenPerTick;
  intro.textContent =
    `Sunlight is the only energy source: ${recent.sunPerTick.toFixed(1)} per tick captured by plants. ` +
    `Eaten: ${recent.plantEatenPerTick.toFixed(1)} from plants, ${recent.meatEatenPerTick.toFixed(1)} from corpses (${eaten > 0 ? Math.round((recent.meatEatenPerTick / eaten) * 100) : 0}% meat). ` +
    `Lost as heat: ${heat.toFixed(1)} per tick.`;

  bar.hidden = false;
  legend.hidden = false;
  bar.replaceChildren(
    ...FLOW_PARTS.map((part) => {
      const segment = document.createElement("div");
      segment.title = part.label;
      segment.style.background = part.color;
      segment.style.width = `${heat > 0 ? (recent[part.key] / heat) * 100 : 0}%`;
      return segment;
    }),
  );
  legend.replaceChildren(
    ...FLOW_PARTS.map((part) => {
      const item = document.createElement("li");
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = part.color;
      const text = document.createElement("span");
      const value = recent[part.key];
      text.textContent = `${part.label}: ${heat > 0 ? Math.round((value / heat) * 100) : 0}% of heat lost (${value.toFixed(2)} per tick)`;
      item.append(dot, text);
      return item;
    }),
  );
}

// --- Notable firsts ---
let shownEvents = 0;
function renderEvents(events: readonly SimEvent[]): void {
  if (events.length === shownEvents) return;
  shownEvents = events.length;
  el("events-empty").hidden = events.length > 0;
  el("events-list").replaceChildren(
    ...events.map((event) => {
      const item = document.createElement("li");
      const tick = document.createElement("span");
      tick.className = "event-tick";
      tick.textContent = `tick ${event.tick.toLocaleString("en-US")}`;
      const text = document.createElement("span");
      text.textContent = event.text;
      item.append(tick, text);
      return item;
    }),
  );
}

// --- Family tree and timeline ---

function dietWord(diet: number): string {
  return diet < 0.25 ? "plant eaters" : diet > 0.75 ? "meat eaters" : "mixed feeders";
}

const COMPARED_GENES: readonly GeneName[] = ["size", "speed", "senseRange", "metabolism", "diet", "attack", "armor", "stamina", "thermal", "lifespan", "litter", "bond"];

function renderSpeciesDetail(id: number | null): void {
  const box = el<HTMLDivElement>("species-detail");
  const record = speciesRecords.find((r) => r.id === id);
  if (!record) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  const parent = speciesRecords.find((r) => r.id === record.parent);
  const status = record.diedTick === null ? `alive, ${format.int.format(record.count)} members now` : `extinct at tick ${format.int.format(record.diedTick)}`;
  const title = document.createElement("strong");
  title.textContent = `Species #${record.id}`;
  const lines = document.createElement("p");
  lines.className = "hint";
  lines.textContent =
    `${parent ? `Split from #${parent.id}` : "A first-generation species"} at tick ${format.int.format(record.bornTick)}. ` +
    `${status[0]!.toUpperCase()}${status.slice(1)}. Most members at once: ${format.int.format(record.peak)}. Mostly ${dietWord(record.traits[GENE.diet]!)}.`;
  const life = document.createElement("p");
  life.className = "hint";
  life.textContent =
    `How its members live: ${Math.round(record.lifestyle.meatShare * 100)}% of the energy they have eaten came from meat; ` +
    `${record.lifestyle.killRate.toFixed(2)} kills per 1,000 ticks lived; average age ${format.int.format(Math.round(record.lifestyle.meanAge))} ticks.`;
  const table = document.createElement("table");
  const head = table.createTHead().insertRow();
  for (const text of ["Trait", parent ? `#${parent.id} when it split` : "", "Founders", record.diedTick === null ? "Now" : "At the end"]) {
    const th = document.createElement("th");
    th.textContent = text;
    head.append(th);
  }
  const body = table.createTBody();
  for (const gene of COMPARED_GENES) {
    const index = GENES.indexOf(gene);
    const ancestor = record.ancestorTraits?.[index];
    const founder = record.founderTraits[index]!;
    const now = record.traits[index]!;
    if ((gene === "stamina" || gene === "thermal" || gene === "lifespan" || gene === "litter" || gene === "bond") && Math.abs(founder - now) < 1e-9 && (ancestor === undefined || Math.abs(ancestor - founder) < 1e-9)) continue;
    const row = body.insertRow();
    row.insertCell().textContent = GENE_LABELS[gene];
    row.insertCell().textContent = ancestor === undefined ? "" : traitText(gene, ancestor);
    const foundCell = row.insertCell();
    foundCell.textContent = traitText(gene, founder);
    if (ancestor !== undefined && Math.abs(founder - ancestor) > 0.05 * Math.max(Math.abs(ancestor), 0.2)) foundCell.className = founder > ancestor ? "up" : "down";
    row.insertCell().textContent = traitText(gene, now);
  }
  const note = document.createElement("p");
  note.className = "hint";
  note.textContent = parent ? "Green or red marks a trait that differed noticeably from the ancestor at the moment of the split." : "";
  box.replaceChildren(title, lines, life, table, note);
}

tree.onSelect = (id) => renderSpeciesDetail(id);

/** Forget the old world's family tree (the simulation was restarted). */
function resetTree(): void {
  speciesRecords = [];
  speciesEventList = [];
  worldEventList = [];
  firstsList = [];
  timelineKey = "";
  tree.selected = null;
  tree.setData([], 1);
  renderSpeciesDetail(null);
  renderTimeline();
}

function renderTimeline(): void {
  const key = `${firstsList.length}/${speciesEventList.length}/${worldEventList.length}`;
  if (key === timelineKey) return;
  timelineKey = key;
  interface Entry {
    tick: number;
    text: string;
  }
  const entries: Entry[] = firstsList.map((e) => ({ tick: e.tick, text: e.text }));
  for (const e of speciesEventList) {
    const record = speciesRecords.find((r) => r.id === e.species);
    if (e.kind === "speciation") {
      entries.push({ tick: e.tick, text: `New species #${e.species} splits from #${e.parent}${record ? ` (${dietWord(record.founderTraits[GENE.diet]!)})` : ""}` });
    } else if (e.kind === "extinction") {
      entries.push({ tick: e.tick, text: `Species #${e.species} goes extinct${record ? ` after peaking at ${format.int.format(record.peak)} members` : ""}` });
    } else {
      entries.push({ tick: e.tick, text: `Population crash: from ${format.int.format(e.from ?? 0)} down to ${format.int.format(e.to ?? 0)}` });
    }
  }
  for (const e of worldEventList) entries.push({ tick: e.tick, text: e.text });
  entries.sort((a, b) => b.tick - a.tick);
  el("timeline-list").replaceChildren(
    ...entries.slice(0, 300).map((entry) => {
      const item = document.createElement("li");
      const tick = document.createElement("span");
      tick.className = "event-tick";
      tick.textContent = `tick ${format.int.format(entry.tick)}`;
      const text = document.createElement("span");
      text.textContent = entry.text;
      item.append(tick, text);
      return item;
    }),
  );
}

// --- Saving and loading worlds ---
function downloadSave(bytes: Uint8Array, seed: number, tick: number): void {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/octet-stream" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `evolution-sim-seed${seed}-tick${tick}.evosnap`;
  link.click();
  URL.revokeObjectURL(link.href);
}

const loadFile = el<HTMLInputElement>("load-file");
el("save-world").addEventListener("click", () => send({ type: "save" }));
el("load-world").addEventListener("click", () => loadFile.click());
loadFile.addEventListener("change", async () => {
  const file = loadFile.files?.[0];
  loadFile.value = "";
  if (!file) return;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const branch = el<HTMLInputElement>("load-branch").checked;
  showNotice(null);
  clearHistory();
  lastRateTick = 0;
  lastRateTime = performance.now();
  send({ type: "load", bytes, branchSeed: branch ? Math.floor(Math.random() * 1_000_000) : undefined });
  send({ type: running ? "play" : "pause" });
  presetDescription.textContent = `Loaded from the file ${file.name}${branch ? ", carried on with a different random future" : ""}. The charts start from the moment you loaded it; the family tree keeps the whole history.`;
});

// --- Worker frames ---
worker.onmessage = (event: MessageEvent<FromWorker>) => {
  const message = event.data;
  if (message.type === "saved") {
    downloadSave(message.bytes, message.seed, message.tick);
    return;
  }
  if (message.type === "loadFailed") {
    showNotice(`Could not load that file: ${message.message}`);
    return;
  }
  const frame = message;
  if (frame.resetId !== currentResetId) {
    // First frame after a restart: start the charts fresh.
    currentResetId = frame.resetId;
    clearHistory();
    heatmap.setWorld(frame.world);
    el("brain-chart-block").hidden = frame.world.brainMode === 0;
    el("complexity-chart-block").hidden = !frame.world.multicellular;
  }
  renderer.setLand(frame);
  charts.add(frame.points);
  complexity.add(frame.points);
  flows.add(frame.points);
  heatmap.add(frame.histograms);
  chartsDirty = true;
  latestFrame = frame;
  frameDirty = true;

  renderInspector(frame.inspected);
  renderEvents(frame.events);
  firstsList = frame.events;
  if (frame.species) {
    speciesRecords = frame.species;
    speciesEventList = frame.speciesEvents ?? [];
    worldEventList = frame.worldEvents ?? [];
    tree.setData(frame.species, frame.stats.tick);
    renderSpeciesDetail(tree.selected);
    timelineKey = "";
    renderTimeline();
  }

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
  setText("stat-classes", `${s.classes.herbivores} / ${s.classes.omnivores} / ${s.classes.carnivores}`);
  setText("stat-species", `${s.species.alive} / ${s.species.ever}`);
  const w = frame.world;
  el("stat-colonies-box").hidden = !w.multicellular;
  if (w.multicellular) setText("stat-colonies", `${s.colonies.count} / ${format.int.format(s.colonies.cells)} / ${s.colonies.maxSize}`);
  el("stat-sexual-box").hidden = !w.sexGeneOn;
  if (w.sexGeneOn) setText("stat-sexual", s.totalBirths > 0 ? `${Math.round((100 * s.sexualBirths) / s.totalBirths)}%` : "-");
  el("stat-disease-box").hidden = !w.diseaseOn;
  if (w.diseaseOn) setText("stat-disease", `${format.int.format(s.disease.infected)} / ${s.disease.strains}`);
  el("stat-climate-box").hidden = w.climateMode === 0 || (w.yearLength === 0 && w.dayLength === 0);
  if (w.climateMode === 1) {
    const parts: string[] = [];
    if (w.yearLength > 0) {
      const f = (s.tick % w.yearLength) / w.yearLength;
      const season = f < 0.125 || f >= 0.875 ? "spring" : f < 0.375 ? "summer" : f < 0.625 ? "autumn" : "winter";
      parts.push(`year ${Math.floor(s.tick / w.yearLength) + 1}, ${season}`);
    }
    if (w.dayLength > 0) parts.push((s.tick % w.dayLength) / w.dayLength < 0.5 ? "day" : "night");
    setText("stat-climate", parts.join(", "));
  }
  setText("stat-kills", format.int.format(s.totalKills));
  el("stat-water-box").hidden = !w.drinkOn;
  if (w.drinkOn) setText("stat-water", `${format.fixed(s.hydration.mean, 2)} / ${Math.round(s.hydration.dehydrated * 100)}%`);
  el("stat-nutrient-box").hidden = !w.nutrientOn;
  if (w.nutrientOn) setText("stat-nutrient", `${format.fixed(s.nutrientStore.mean, 2)} / ${Math.round(s.nutrientStore.deficient * 100)}%`);
  setText("stat-blocked", `${format.int.format(s.blockedBirthsSoil)} / ${format.int.format(s.blockedBirthsEnergy)} / ${format.int.format(s.blockedBirthsBoth)}`);
  const b = frame.behavior;
  setText("stat-chase", b.chaseSamples >= 10 ? `${Math.round(b.chase * 100)}% (random = 50%)` : "-");
  setText("stat-flee", b.fleeSamples >= 10 ? `${Math.round(b.flee * 100)}% (random = 50%)` : "-");
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
    complexity.redraw();
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
{
  // Start from the address: seed, world and any settings a shared link changes.
  const link = readLink(window.location.search, (id) => findPreset(id).preset.config);
  if (link.problem) showNotice(`This link's changed settings could not be used (${link.problem}), so the world starts as the preset.`);
  restart(link.seed ?? DEFAULT_SEED, findPreset(link.presetId), link.settings);
}
requestAnimationFrame(paint);
