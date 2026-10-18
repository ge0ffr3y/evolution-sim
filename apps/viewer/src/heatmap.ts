import type { GeneName } from "@evo/sim-core";
import type { HistogramSample, WorldInfo } from "./protocol";

/** Keep at most this many columns; older detail is thinned out. */
const MAX_COLUMNS = 800;
const HEIGHT = 190;
const MARGIN = { left: 46, right: 8, top: 8, bottom: 24 };

export const HEATMAP_TRAITS: readonly { id: GeneName; label: string }[] = [
  { id: "diet", label: "Diet" },
  { id: "attack", label: "Attack" },
  { id: "armor", label: "Armor" },
  { id: "size", label: "Size" },
  { id: "speed", label: "Speed" },
  { id: "senseRange", label: "Sense range" },
  { id: "metabolism", label: "Metabolism" },
  { id: "mutationRate", label: "Mutation rate" },
  { id: "hue", label: "Color gene" },
  { id: "thermal", label: "Preferred temperature" },
  { id: "lifespan", label: "Lifespan" },
  { id: "litter", label: "Litter size" },
  { id: "bond", label: "Bonding" },
  { id: "tolerance", label: "Tolerance of relatives" },
  { id: "sex", label: "Mate-seeking" },
  { id: "fat", label: "Fat" },
  { id: "torpor", label: "Torpor" },
  { id: "palate", label: "Palate (kind of plant)" },
  { id: "stressResponse", label: "Stress response" },
  { id: "calmResponse", label: "Calm response" },
];

/**
 * A picture of how a trait's distribution changes over time: time runs left to
 * right, the trait's value runs bottom to top, and brighter means more
 * organisms there. One column per histogram snapshot.
 */
export class Heatmap {
  trait: GeneName = "diet";

  private readonly canvas = document.createElement("canvas");
  private readonly ctx: CanvasRenderingContext2D;
  private samples: HistogramSample[] = [];
  private stride = 1;
  private seen = 0;
  private world: WorldInfo | null = null;

  constructor(private readonly container: HTMLElement) {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot draw on a canvas");
    this.ctx = ctx;
    this.canvas.className = "heatmap-canvas";
    container.append(this.canvas);
    new ResizeObserver(() => this.redraw()).observe(container);
  }

  clear(): void {
    this.samples = [];
    this.stride = 1;
    this.seen = 0;
    this.redraw();
  }

  setWorld(world: WorldInfo): void {
    this.world = world;
  }

  add(samples: readonly HistogramSample[]): void {
    for (const sample of samples) {
      if (this.seen++ % this.stride !== 0) continue;
      this.samples.push(sample);
      if (this.samples.length > MAX_COLUMNS) {
        this.samples = this.samples.filter((_, i) => i % 2 === 0);
        this.stride *= 2;
      }
    }
  }

  redraw(): void {
    const { canvas, ctx } = this;
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(this.container.clientWidth, 280);
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(HEIGHT * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(HEIGHT * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${HEIGHT}px`;
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, HEIGHT);

    const plotW = width - MARGIN.left - MARGIN.right;
    const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
    ctx.fillStyle = "#0b0f13";
    ctx.fillRect(MARGIN.left, MARGIN.top, plotW, plotH);

    const world = this.world;
    const samples = this.samples;
    if (world && samples.length > 0) {
      const bins = world.histogramBins;
      const columnW = plotW / Math.max(samples.length, 1);
      for (let c = 0; c < samples.length; c++) {
        const counts = samples[c]!.counts[this.trait];
        let peak = 1;
        for (let b = 0; b < bins; b++) if (counts[b]! > peak) peak = counts[b]!;
        for (let b = 0; b < bins; b++) {
          const share = counts[b]! / peak; // brightest bin in each column = 1
          if (share === 0) continue;
          const t = Math.sqrt(share);
          ctx.fillStyle = `hsl(${Math.round(235 - t * 200)} 85% ${Math.round(14 + t * 50)}%)`;
          const y = MARGIN.top + plotH - ((b + 1) / bins) * plotH;
          ctx.fillRect(MARGIN.left + c * columnW, y, Math.ceil(columnW) + 0.5, plotH / bins + 0.5);
        }
      }
    }

    // Axes: the trait's range on the left, tick numbers underneath.
    ctx.fillStyle = "#8b98a5";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "right";
    if (world) {
      const { min, max } = world.ranges[this.trait];
      const fmt = (v: number): string => (Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(2));
      ctx.fillText(fmt(max), MARGIN.left - 6, MARGIN.top + 10);
      ctx.fillText(fmt((min + max) / 2), MARGIN.left - 6, MARGIN.top + plotH / 2 + 4);
      ctx.fillText(fmt(min), MARGIN.left - 6, MARGIN.top + plotH);
    }
    ctx.textAlign = "left";
    ctx.fillText(samples.length > 0 ? `tick ${samples[0]!.tick.toLocaleString("en-US")}` : "tick", MARGIN.left, HEIGHT - 6);
    ctx.textAlign = "right";
    if (samples.length > 0) ctx.fillText(`tick ${samples.at(-1)!.tick.toLocaleString("en-US")}`, width - MARGIN.right, HEIGHT - 6);
  }
}
