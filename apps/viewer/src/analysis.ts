import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import "./style.css";

/**
 * The experiment results page. It reads small summaries written by `npm run exp -- export`
 * (public/experiments/*.json) and draws two charts: every setup compared on one measure (each
 * world as a dot, the average with its 95% range, and the change against the control, paired
 * seed by seed), and a measure over time (each setup's average across its worlds).
 */

interface Run {
  arm: string;
  seed: number;
  tick: number;
  extinctAt: number | null;
  summary: Record<string, number | null>;
}
interface Exported {
  name: string;
  question: string;
  base: string;
  baseChanges: Record<string, number>;
  ticks: number;
  seeds: string;
  control: string;
  arms: Record<string, Record<string, number>>;
  summaryMeasures: [string, string][];
  seriesMeasures: [string, string][];
  runs: Run[];
  series: Record<string, { tick: number[]; mean: Record<string, (number | null)[]>; low: Record<string, (number | null)[]>; high: Record<string, (number | null)[]> }>;
}

const BASE = import.meta.env.BASE_URL;
const COLORS = ["#c9d1d9", "#4cc2ff", "#f2a65a", "#7ee787", "#ff7b72", "#d2a8ff", "#e3b341", "#56d4dd", "#ffa198", "#a5d6ff", "#bbdd88", "#f778ba"];
/** Two-sided 95% t values by degrees of freedom (seeds minus one). */
const T95 = [NaN, 12.71, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06];
const t95 = (df: number): number => (df < T95.length ? T95[df]! : 1.96);
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]): number => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) * (x - m), 0) / (xs.length - 1));
};
const fmt = (x: number): string => {
  const a = Math.abs(x);
  if (a !== 0 && (a < 0.001 || a >= 1e6)) return x.toExponential(2);
  return x.toLocaleString("en-US", { maximumFractionDigits: a >= 100 ? 0 : a >= 1 ? 2 : 3 });
};

const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const experimentSelect = el<HTMLSelectElement>("experiment");
const measureSelect = el<HTMLSelectElement>("measure");
const seriesSelect = el<HTMLSelectElement>("series");
const bandsBox = el<HTMLInputElement>("bands");

let data: Exported | null = null;
let timeChart: uPlot | null = null;

/** Arms in display order: the control first, then as in the experiment file. */
function armOrder(d: Exported): string[] {
  return [d.control, ...Object.keys(d.arms).filter((a) => a !== d.control)];
}
const colorOf = (d: Exported, arm: string): string => COLORS[armOrder(d).indexOf(arm) % COLORS.length]!;

function describeChanges(changes: Record<string, number>): string {
  const entries = Object.entries(changes);
  return entries.length ? entries.map(([k, v]) => `${k} ${v}`).join(", ") : "no changes (the base world)";
}

function showInfo(d: Exported): void {
  el("question").textContent = d.question;
  const died = d.runs.filter((r) => r.extinctAt !== null).length;
  el("facts").textContent = `Base world: ${d.base}${Object.keys(d.baseChanges).length ? ` (${describeChanges(d.baseChanges)})` : ""}. ${d.ticks.toLocaleString("en-US")} ticks per world, seeds ${d.seeds}, ${d.runs.length} worlds in all${died ? `, ${died} died out` : ""}. Control: ${d.control}.`;
  const list = el("setups");
  list.replaceChildren(
    ...armOrder(d).map((arm) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="swatch-dot" style="background:${colorOf(d, arm)}"></span><strong>${arm}</strong>: ${describeChanges(d.arms[arm]!)}`;
      return li;
    }),
  );
}

/** The compare chart, drawn as SVG so it can be saved as an image. */
function drawCompare(d: Exported, key: string): void {
  const box = el("compare");
  const arms = armOrder(d);
  const label = d.summaryMeasures.find(([k]) => k === key)?.[1] ?? key;
  const valuesOf = (arm: string): { seed: number; v: number }[] =>
    d.runs.filter((r) => r.arm === arm && typeof r.summary[key] === "number").map((r) => ({ seed: r.seed, v: r.summary[key] as number }));
  const all = arms.flatMap((a) => valuesOf(a).map((x) => x.v));
  if (!all.length) {
    box.innerHTML = `<p class="muted">No values for "${label}" in this experiment.</p>`;
    return;
  }
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const pad = (hi - lo) * 0.06;
  lo -= pad;
  hi += pad;
  const width = Math.max(560, box.clientWidth || 900);
  const labelW = 170;
  const changeW = 230;
  const plotW = width - labelW - changeW - 20;
  const rowH = 38;
  const top = 28;
  const height = top + arms.length * rowH + 30;
  const x = (v: number): number => labelW + ((v - lo) / (hi - lo)) * plotW;
  const control = new Map(valuesOf(d.control).map((p) => [p.seed, p.v]));
  const parts: string[] = [];
  parts.push(`<rect width="${width}" height="${height}" fill="#161d24"/>`);
  parts.push(`<text x="${labelW}" y="16" fill="#8b98a5" font-size="12">${label}</text>`);
  parts.push(`<text x="${labelW + plotW + 14}" y="16" fill="#8b98a5" font-size="12">change against ${d.control}</text>`);
  // Axis ticks.
  for (let k = 0; k <= 4; k++) {
    const v = lo + ((hi - lo) * k) / 4;
    const px = x(v);
    parts.push(`<line x1="${px}" y1="${top - 6}" x2="${px}" y2="${height - 24}" stroke="#222b34"/>`);
    parts.push(`<text x="${px}" y="${height - 8}" fill="#8b98a5" font-size="11" text-anchor="middle">${fmt(v)}</text>`);
  }
  arms.forEach((arm, row) => {
    const y = top + row * rowH + rowH / 2;
    const color = colorOf(d, arm);
    const pts = valuesOf(arm);
    const died = d.runs.filter((r) => r.arm === arm && r.extinctAt !== null).length;
    parts.push(`<text x="${labelW - 10}" y="${y + 4}" fill="#e6edf3" font-size="13" text-anchor="end">${arm}${died ? ` (${died} died)` : ""}</text>`);
    pts.forEach((p, k) => {
      const jitter = ((k % 5) - 2) * 3;
      parts.push(`<circle cx="${x(p.v)}" cy="${y + jitter}" r="2.6" fill="${color}" fill-opacity="0.45"/>`);
    });
    if (pts.length) {
      const vs = pts.map((p) => p.v);
      const m = mean(vs);
      const half = vs.length > 1 ? (t95(vs.length - 1) * sd(vs)) / Math.sqrt(vs.length) : 0;
      parts.push(`<line x1="${x(m - half)}" y1="${y}" x2="${x(m + half)}" y2="${y}" stroke="${color}" stroke-width="3"/>`);
      parts.push(`<circle cx="${x(m)}" cy="${y}" r="6" fill="${color}" stroke="#0f1419" stroke-width="1.5"/>`);
      // The change against the control, paired seed by seed.
      let text = "";
      if (arm === d.control) text = `average ${fmt(m)}`;
      else {
        const diffs = pts.filter((p) => control.has(p.seed)).map((p) => p.v - control.get(p.seed)!);
        if (diffs.length > 1) {
          const dm = mean(diffs);
          const dh = (t95(diffs.length - 1) * sd(diffs)) / Math.sqrt(diffs.length);
          const base = mean([...control.values()]);
          const pct = base !== 0 ? ` (${dm >= 0 ? "+" : ""}${Math.round((dm / Math.abs(base)) * 100)}%)` : "";
          const holds = dm - dh > 0 || dm + dh < 0;
          text = `${dm >= 0 ? "+" : ""}${fmt(dm)}${pct}${holds ? " holds up" : ""}`;
        }
      }
      parts.push(`<text x="${labelW + plotW + 14}" y="${y + 4}" fill="${arm === d.control ? "#8b98a5" : "#e6edf3"}" font-size="12">${text}</text>`);
    }
  });
  box.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="system-ui, sans-serif">${parts.join("")}</svg>`;
}

/** The over-time chart: each setup's average across its worlds, with an optional lowest-to-highest band. */
function drawTimeline(d: Exported, key: string): void {
  const box = el("timeline");
  timeChart?.destroy();
  box.replaceChildren();
  const arms = armOrder(d);
  const ticks = arms.reduce((a, arm) => (d.series[arm]!.tick.length > a.length ? d.series[arm]!.tick : a), [] as number[]);
  const align = (arm: string, values: (number | null)[]): (number | null)[] => {
    const own = d.series[arm]!.tick;
    const at = new Map(own.map((t, k) => [t, values[k] ?? null]));
    return ticks.map((t) => at.get(t) ?? null);
  };
  const columns: (number | null)[][] = [ticks];
  const series: uPlot.Series[] = [{ label: "tick" }];
  const bands: uPlot.Band[] = [];
  for (const arm of arms) {
    const color = colorOf(d, arm);
    columns.push(align(arm, d.series[arm]!.mean[key] ?? []));
    series.push({ label: arm, stroke: color, width: arm === d.control ? 2.5 : 1.8 });
    if (bandsBox.checked) {
      const hiIdx = columns.length;
      columns.push(align(arm, d.series[arm]!.high[key] ?? []));
      series.push({ label: `${arm} highest`, stroke: color, width: 0.5, dash: [3, 3], points: { show: false } });
      columns.push(align(arm, d.series[arm]!.low[key] ?? []));
      series.push({ label: `${arm} lowest`, stroke: color, width: 0.5, dash: [3, 3], points: { show: false } });
      bands.push({ series: [hiIdx, hiIdx + 1], fill: `${color}22` });
    }
  }
  const width = Math.max(560, box.clientWidth || 900);
  timeChart = new uPlot(
    {
      width,
      height: 320,
      series,
      bands,
      scales: { x: { time: false } },
      axes: [
        { stroke: "#8b98a5", grid: { stroke: "#222b34" }, ticks: { stroke: "#222b34" } },
        { stroke: "#8b98a5", grid: { stroke: "#222b34" }, ticks: { stroke: "#222b34" }, size: 60 },
      ],
      legend: { live: true },
    },
    columns as uPlot.AlignedData,
    box,
  );
}

function download(name: string, url: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
}

/** Save the compare chart: the SVG drawn onto a canvas, then saved as a PNG. */
function saveCompare(): void {
  const svg = el("compare").querySelector("svg");
  if (!svg || !data) return;
  const image = new Image();
  const blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = svg.width.baseVal.value * 2;
    canvas.height = svg.height.baseVal.value * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 2);
    ctx.drawImage(image, 0, 0);
    URL.revokeObjectURL(url);
    download(`${data!.name}-${measureSelect.value}.png`, canvas.toDataURL("image/png"));
  };
  image.src = url;
}

function saveTimeline(): void {
  if (!timeChart || !data) return;
  // uPlot draws on a transparent canvas: paint the page background behind it first.
  const src = timeChart.ctx.canvas;
  const canvas = document.createElement("canvas");
  canvas.width = src.width;
  canvas.height = src.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#161d24";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(src, 0, 0);
  download(`${data.name}-${seriesSelect.value}-over-time.png`, canvas.toDataURL("image/png"));
}

function fillSelect(select: HTMLSelectElement, options: [string, string][], keep?: string): void {
  select.replaceChildren(
    ...options.map(([value, label]) => {
      const o = document.createElement("option");
      o.value = value;
      o.textContent = label;
      return o;
    }),
  );
  if (keep && options.some(([v]) => v === keep)) select.value = keep;
}

async function loadExperiment(file: string): Promise<void> {
  const response = await fetch(`${BASE}experiments/${file}`);
  data = (await response.json()) as Exported;
  showInfo(data);
  fillSelect(measureSelect, data.summaryMeasures.filter(([k]) => data!.runs.some((r) => typeof r.summary[k] === "number")), measureSelect.value || "meanPopulationLate");
  fillSelect(seriesSelect, data.seriesMeasures.filter(([k]) => Object.values(data!.series).some((s) => (s.mean[k] ?? []).some((v) => v !== null))), seriesSelect.value || "population");
  drawCompare(data, measureSelect.value);
  drawTimeline(data, seriesSelect.value);
}

async function start(): Promise<void> {
  let index: { name: string; question: string; file: string }[] = [];
  try {
    index = (await (await fetch(`${BASE}experiments/index.json`)).json()) as typeof index;
  } catch {
    el("question").textContent = "No experiments have been exported yet (npm run exp -- export <folder>).";
    return;
  }
  fillSelect(experimentSelect, index.map((e) => [e.file, e.name]));
  const wanted = new URLSearchParams(location.search).get("experiment");
  if (wanted && index.some((e) => e.name === wanted)) experimentSelect.value = `${wanted}.json`;
  experimentSelect.addEventListener("change", () => void loadExperiment(experimentSelect.value));
  measureSelect.addEventListener("change", () => data && drawCompare(data, measureSelect.value));
  seriesSelect.addEventListener("change", () => data && drawTimeline(data, seriesSelect.value));
  bandsBox.addEventListener("change", () => data && drawTimeline(data, seriesSelect.value));
  el("save-compare").addEventListener("click", saveCompare);
  el("save-time").addEventListener("click", saveTimeline);
  window.addEventListener("resize", () => {
    if (!data) return;
    drawCompare(data, measureSelect.value);
    drawTimeline(data, seriesSelect.value);
  });
  if (index.length) await loadExperiment(experimentSelect.value);
}

void start();
