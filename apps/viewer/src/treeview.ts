import { GENE, SAMPLE_STRIDE, type SpeciesRecord } from "@evo/sim-core";

/**
 * The family tree: time runs left to right, every species gets a row, and a branch's
 * thickness shows how many members it has. A thin line joins a branch to the species it
 * split from. Branch color is the species' average diet (green = plants, red = meat).
 * Extinct branches taper to a point and end in a cross.
 */

const ROW_HEIGHT = 16;
const MAX_BAND = 14;
const LEFT_PAD = 8;
const RIGHT_PAD = 14;
const TOP_PAD = 14;

interface Point {
  tick: number;
  count: number;
  diet: number;
}

interface Layout {
  records: SpeciesRecord[];
  rows: Map<number, number>;
}

/** Parents above their children; siblings in the order they appeared. */
export function layoutTree(records: readonly SpeciesRecord[]): Layout {
  const byId = new Map(records.map((r) => [r.id, r]));
  const children = new Map<number, SpeciesRecord[]>();
  const roots: SpeciesRecord[] = [];
  for (const record of records) {
    if (record.parent !== 0 && byId.has(record.parent)) {
      const list = children.get(record.parent) ?? [];
      list.push(record);
      children.set(record.parent, list);
    } else {
      roots.push(record);
    }
  }
  const order: SpeciesRecord[] = [];
  const visit = (record: SpeciesRecord): void => {
    order.push(record);
    for (const child of (children.get(record.id) ?? []).sort((a, b) => a.bornTick - b.bornTick)) visit(child);
  };
  for (const root of roots.sort((a, b) => a.bornTick - b.bornTick)) visit(root);
  const rows = new Map<number, number>();
  order.forEach((record, index) => rows.set(record.id, index));
  return { records: order, rows };
}

/** The points a branch is drawn through: its start, every recorded sample, and where it ends. */
function pointsOf(record: SpeciesRecord, now: number): Point[] {
  const diet = GENE.diet;
  const points: Point[] = [];
  const h = record.history;
  const first = h.length >= SAMPLE_STRIDE ? h[1]! : record.count;
  points.push({ tick: record.bornTick, count: first, diet: record.founderTraits[diet]! });
  for (let k = 0; k + SAMPLE_STRIDE <= h.length; k += SAMPLE_STRIDE) {
    if (h[k]! <= record.bornTick) continue;
    points.push({ tick: h[k]!, count: h[k + 1]!, diet: h[k + 2 + diet]! });
  }
  const last = points[points.length - 1]!;
  if (record.diedTick !== null) {
    points.push({ tick: record.diedTick, count: 0, diet: last.diet });
  } else if (now > last.tick) {
    points.push({ tick: now, count: record.count, diet: record.traits[diet]! });
  }
  return points;
}

function dietColor(diet: number): string {
  const t = Math.max(0, Math.min(1, diet));
  return `hsl(${Math.round(125 - t * 125)} 70% 52%)`;
}

export class TreeView {
  private records: SpeciesRecord[] = [];
  private layout: Layout = { records: [], rows: new Map() };
  private now = 1;
  selected: number | null = null;
  onSelect: (id: number | null) => void = () => {};

  constructor(private readonly canvas: HTMLCanvasElement) {
    canvas.addEventListener("click", (event) => this.click(event));
  }

  setData(records: SpeciesRecord[], now: number): void {
    this.records = records;
    this.layout = layoutTree(records);
    this.now = Math.max(now, 1);
    this.draw();
  }

  private xOf(tick: number, width: number): number {
    return LEFT_PAD + (tick / this.now) * (width - LEFT_PAD - RIGHT_PAD);
  }

  private click(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const y = ((event.clientY - rect.top) / rect.height) * this.canvas.clientHeight;
    const row = Math.floor((y - TOP_PAD) / ROW_HEIGHT);
    const record = this.layout.records[row];
    this.selected = record ? record.id : null;
    this.onSelect(this.selected);
    this.draw();
  }

  draw(): void {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(this.canvas.parentElement?.clientWidth ?? 600, 320);
    const rows = this.layout.records.length;
    const height = Math.max(120, TOP_PAD + rows * ROW_HEIGHT + 8);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Time axis along the top.
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillStyle = "#8b98a5";
    ctx.strokeStyle = "#26313b";
    ctx.lineWidth = 1;
    const ticks = niceTicks(this.now, 6);
    for (const tick of ticks) {
      const x = this.xOf(tick, width);
      ctx.beginPath();
      ctx.moveTo(x, TOP_PAD - 4);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.textAlign = "left";
      ctx.fillText(tick >= 1000 ? `${tick / 1000}k` : String(tick), x + 3, 9);
    }
    if (rows === 0) {
      ctx.fillStyle = "#8b98a5";
      ctx.fillText("Collecting the first species...", LEFT_PAD, TOP_PAD + 14);
      return;
    }

    const peak = Math.max(1, ...this.records.map((r) => r.peak));
    const rowY = (id: number): number => TOP_PAD + (this.layout.rows.get(id) ?? 0) * ROW_HEIGHT + ROW_HEIGHT / 2;
    const half = (count: number): number => Math.max(0.6, (Math.sqrt(count / peak) * MAX_BAND) / 2);

    // Lines from each species to its parent come first so branches sit on top.
    ctx.strokeStyle = "#566370";
    ctx.lineWidth = 1;
    for (const record of this.layout.records) {
      if (!this.layout.rows.has(record.parent)) continue;
      const x = this.xOf(record.bornTick, width);
      ctx.beginPath();
      ctx.moveTo(x, rowY(record.parent));
      ctx.lineTo(x, rowY(record.id));
      ctx.stroke();
    }

    for (const record of this.layout.records) {
      const y = rowY(record.id);
      const points = pointsOf(record, this.now);
      for (let k = 0; k + 1 < points.length; k++) {
        const a = points[k]!;
        const b = points[k + 1]!;
        const xa = this.xOf(a.tick, width);
        const xb = Math.max(this.xOf(b.tick, width), xa + 0.5);
        const ha = half(a.count);
        const hb = half(b.count);
        ctx.fillStyle = dietColor((a.diet + b.diet) / 2);
        ctx.beginPath();
        ctx.moveTo(xa, y - ha);
        ctx.lineTo(xb, y - hb);
        ctx.lineTo(xb, y + hb);
        ctx.lineTo(xa, y + ha);
        ctx.closePath();
        ctx.fill();
      }
      const start = this.xOf(record.bornTick, width);
      const end = this.xOf(points[points.length - 1]!.tick, width);
      if (record.diedTick !== null) {
        ctx.strokeStyle = "#ff5d73";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(end - 3, y - 3);
        ctx.lineTo(end + 3, y + 3);
        ctx.moveTo(end - 3, y + 3);
        ctx.lineTo(end + 3, y - 3);
        ctx.stroke();
      }
      if (record.id === this.selected) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(start - 1, y - ROW_HEIGHT / 2 + 1, Math.max(end - start, 4) + 2, ROW_HEIGHT - 2);
      }
      ctx.fillStyle = "#e6edf3";
      ctx.textAlign = end + 34 > width ? "right" : "left";
      ctx.fillText(`#${record.id}`, end + 34 > width ? end - 6 : end + 8, y + 3);
    }
  }
}

/** A handful of round tick marks between 0 and max. */
function niceTicks(max: number, wanted: number): number[] {
  const rough = max / wanted;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? rough;
  const ticks: number[] = [];
  for (let t = 0; t <= max; t += step) ticks.push(Math.round(t));
  return ticks;
}

