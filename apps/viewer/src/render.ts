import type { FrameMessage } from "./protocol";

/** What the dot colors mean. */
export type ColorBy = "diet" | "speed" | "size" | "hue" | "energy" | "sense";

/** What the map background shows. */
export type Overlay = "plants" | "nutrients" | "corpses" | "detritus" | "trails";

export const OVERLAYS: readonly { id: Overlay; label: string }[] = [
  { id: "plants", label: "Plants" },
  { id: "nutrients", label: "Soil nutrients" },
  { id: "corpses", label: "Corpses" },
  { id: "detritus", label: "Detritus" },
  { id: "trails", label: "Scent trails (brains only)" },
];

export const COLOR_MODES: readonly { id: ColorBy; label: string; legendLow: string; legendHigh: string }[] = [
  { id: "diet", label: "Diet", legendLow: "eats plants", legendHigh: "eats meat" },
  { id: "speed", label: "Speed", legendLow: "slow", legendHigh: "fast (2+)" },
  { id: "size", label: "Body size", legendLow: "small", legendHigh: "large (2.5+)" },
  { id: "hue", label: "Color gene", legendLow: "", legendHigh: "(no effect on survival)" },
  { id: "energy", label: "Energy", legendLow: "empty", legendHigh: "ready to reproduce" },
  { id: "sense", label: "Sense range", legendLow: "none", legendHigh: "far (8+)" },
];

const PALETTE_SIZE = 48;

/** Slow = blue, fast = red/orange. Precomputed so drawing thousands of dots stays cheap. */
const RAINBOW = Array.from({ length: PALETTE_SIZE }, (_, i) => {
  const t = i / (PALETTE_SIZE - 1);
  return `hsl(${Math.round(215 - t * 205)} 85% 60%)`;
});

/** Plant eater = green, mixed diet = yellow, meat eater = red. */
const DIET = Array.from({ length: PALETTE_SIZE }, (_, i) => {
  const t = i / (PALETTE_SIZE - 1);
  return `hsl(${Math.round(125 - t * 125)} 85% 58%)`;
});

/** Empty = dark, full = bright yellow-green. */
const ENERGY = Array.from({ length: PALETTE_SIZE }, (_, i) => {
  const t = i / (PALETTE_SIZE - 1);
  return `hsl(${Math.round(30 + t * 90)} 85% ${Math.round(22 + t * 45)}%)`;
});

/** A full color wheel for the neutral color gene. */
const WHEEL = Array.from({ length: PALETTE_SIZE }, (_, i) => `hsl(${Math.round((i / PALETTE_SIZE) * 360)} 80% 62%)`);

function pick(palette: readonly string[], t: number): string {
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  return palette[Math.round(clamped * (PALETTE_SIZE - 1))]!;
}

/** Color for one organism under the chosen mode. */
export function organismColor(mode: ColorBy, frame: FrameMessage, i: number): string {
  switch (mode) {
    case "diet":
      return pick(DIET, frame.diet[i]!);
    case "speed":
      return pick(RAINBOW, frame.speed[i]! / 2);
    case "size":
      return pick(RAINBOW, (frame.size[i]! - frame.world.ranges.size.min) / 2.2);
    case "hue":
      return pick(WHEEL, frame.hue[i]!);
    case "energy":
      return pick(ENERGY, frame.energyFraction[i]!);
    case "sense":
      return pick(RAINBOW, frame.sense[i]! / 8);
  }
}

/** CSS gradient for the legend swatch of a mode. */
export function legendGradient(mode: ColorBy): string {
  const palette = mode === "hue" ? WHEEL : mode === "energy" ? ENERGY : mode === "diet" ? DIET : RAINBOW;
  const stops = [0, 0.25, 0.5, 0.75, 1].map((t) => pick(palette, t));
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

/** Draws the food grid and the organisms onto a canvas. */
export class WorldRenderer {
  colorBy: ColorBy = "diet";
  overlay: Overlay = "plants";

  private readonly ctx: CanvasRenderingContext2D;
  private readonly foodCanvas = document.createElement("canvas");
  private readonly foodCtx: CanvasRenderingContext2D;
  private foodImage: ImageData | null = null;
  private readonly trailCanvas = document.createElement("canvas");
  private readonly trailCtx: CanvasRenderingContext2D;
  private trailImage: ImageData | null = null;
  /** Most food each cell can hold, so rich and barren land look different even when full. */
  private capacity: Float64Array | null = null;
  private maxCapacity = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    const foodCtx = this.foodCanvas.getContext("2d");
    const trailCtx = this.trailCanvas.getContext("2d");
    if (!ctx || !foodCtx || !trailCtx) throw new Error("This browser cannot draw on a canvas");
    this.ctx = ctx;
    this.foodCtx = foodCtx;
    this.trailCtx = trailCtx;
  }

  /** Match the canvas's pixel size to how big it is on screen (sharp on high-DPI screens). */
  fitToScreen(): void {
    const ratio = window.devicePixelRatio || 1;
    const size = Math.round(this.canvas.clientWidth * ratio);
    if (size > 0 && (this.canvas.width !== size || this.canvas.height !== size)) {
      this.canvas.width = size;
      this.canvas.height = size;
    }
  }

  draw(frame: FrameMessage): void {
    this.fitToScreen();
    const { ctx, canvas } = this;
    const { world } = frame;

    if (frame.capacity) {
      this.capacity = frame.capacity;
      this.maxCapacity = Math.max(...frame.capacity, 1);
    }

    ctx.imageSmoothingEnabled = false;
    if (this.overlay === "trails" && frame.preyScent.length > 0) {
      this.drawTrails(frame);
      ctx.drawImage(this.trailCanvas, 0, 0, canvas.width, canvas.height);
    } else {
      this.drawFood(frame);
      ctx.drawImage(this.foodCanvas, 0, 0, canvas.width, canvas.height);
    }

    const scaleX = canvas.width / world.width;
    const scaleY = canvas.height / world.height;
    for (let i = 0; i < frame.count; i++) {
      // Dot area grows with body size.
      const radius = scaleX * (0.35 + 0.45 * Math.sqrt(frame.size[i]!));
      ctx.fillStyle = organismColor(this.colorBy, frame, i);
      ctx.beginPath();
      ctx.arc(frame.x[i]! * scaleX, frame.y[i]! * scaleY, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // A ring around the organism being inspected.
    const inspected = frame.inspected;
    if (inspected && inspected.alive) {
      const px = inspected.snapshot.x * scaleX;
      const py = inspected.snapshot.y * scaleY;
      ctx.lineWidth = Math.max(2, scaleX * 0.5);
      ctx.strokeStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(px, py, scaleX * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /** Scent trails on their own finer grid: plant-eater scent in green, meat-eater scent in red. */
  private drawTrails(frame: FrameMessage): void {
    const { scentWidth, scentHeight } = frame.world;
    if (this.trailCanvas.width !== scentWidth || this.trailCanvas.height !== scentHeight) {
      this.trailCanvas.width = scentWidth;
      this.trailCanvas.height = scentHeight;
      this.trailImage = this.trailCtx.createImageData(scentWidth, scentHeight);
    }
    const data = this.trailImage!.data;
    // Shade each trail relative to how much of it there is overall (at least a few
    // passing animals' worth), so a crowded world does not wash out into one color and
    // the few meat-eater trails still stand out.
    let preyTotal = 0;
    let hunterTotal = 0;
    for (let k = 0; k < frame.preyScent.length; k++) {
      preyTotal += frame.preyScent[k]!;
      hunterTotal += frame.hunterScent[k]!;
    }
    const cells = Math.max(frame.preyScent.length, 1);
    const preyFull = Math.max(frame.world.overlayScale.scent, (4 * preyTotal) / cells);
    const hunterFull = Math.max(frame.world.overlayScale.scent, (4 * hunterTotal) / cells);
    for (let k = 0; k < frame.preyScent.length; k++) {
      const prey = Math.min(Math.sqrt(frame.preyScent[k]! / preyFull), 1);
      const hunter = Math.min(Math.sqrt(frame.hunterScent[k]! / hunterFull), 1);
      const o = k * 4;
      data[o] = Math.round(14 + hunter * 220);
      data[o + 1] = Math.round(18 + prey * 150 + hunter * 30);
      data[o + 2] = Math.round(22 + prey * 40);
      data[o + 3] = 255;
    }
    this.trailCtx.putImageData(this.trailImage!, 0, 0);
  }

  private drawFood(frame: FrameMessage): void {
    const { gridWidth, gridHeight, foodCap, overlayScale } = frame.world;
    if (this.foodCanvas.width !== gridWidth || this.foodCanvas.height !== gridHeight) {
      this.foodCanvas.width = gridWidth;
      this.foodCanvas.height = gridHeight;
      this.foodImage = this.foodCtx.createImageData(gridWidth, gridHeight);
    }
    const data = this.foodImage!.data;
    const capacity = this.capacity;
    const overlay = this.overlay;
    for (let cell = 0; cell < frame.food.length; cell++) {
      // A faint base tint shows how fertile the land underneath is.
      const fertility = capacity ? capacity[cell]! / this.maxCapacity : 1;
      const o = cell * 4;
      let r = 14 + fertility * 10;
      let g = 18 + fertility * 22;
      let b = 22 + fertility * 6;
      if (overlay === "plants") {
        const amount = Math.min(frame.food[cell]! / Math.max(this.maxCapacity, foodCap), 1);
        g += amount * 100;
        b += amount * 24;
      } else if (overlay === "nutrients") {
        const amount = Math.min(frame.nutrient[cell]! / overlayScale.nutrient, 1);
        r += amount * 120;
        g += amount * 70;
        b += amount * 10;
      } else if (overlay === "corpses") {
        const amount = Math.min(Math.sqrt(frame.corpse[cell]! / overlayScale.corpse), 1);
        r += amount * 200;
        g += amount * 20;
      } else {
        const amount = Math.min(frame.detritus[cell]! / overlayScale.detritus, 1);
        r += amount * 90;
        g += amount * 60;
        b += amount * 110;
      }
      data[o] = Math.round(r);
      data[o + 1] = Math.round(g);
      data[o + 2] = Math.round(b);
      data[o + 3] = 255;
    }
    this.foodCtx.putImageData(this.foodImage!, 0, 0);
  }
}
