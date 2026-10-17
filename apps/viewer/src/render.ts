import type { FrameMessage } from "./protocol";

/** What the dot colors mean. */
export type ColorBy = "speed" | "size" | "hue" | "energy" | "sense";

export const COLOR_MODES: readonly { id: ColorBy; label: string; legendLow: string; legendHigh: string }[] = [
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
  const palette = mode === "hue" ? WHEEL : mode === "energy" ? ENERGY : RAINBOW;
  const stops = [0, 0.25, 0.5, 0.75, 1].map((t) => pick(palette, t));
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

/** Draws the food grid and the organisms onto a canvas. */
export class WorldRenderer {
  colorBy: ColorBy = "speed";

  private readonly ctx: CanvasRenderingContext2D;
  private readonly foodCanvas = document.createElement("canvas");
  private readonly foodCtx: CanvasRenderingContext2D;
  private foodImage: ImageData | null = null;
  /** Most food each cell can hold, so rich and barren land look different even when full. */
  private capacity: Float64Array | null = null;
  private maxCapacity = 1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    const foodCtx = this.foodCanvas.getContext("2d");
    if (!ctx || !foodCtx) throw new Error("This browser cannot draw on a canvas");
    this.ctx = ctx;
    this.foodCtx = foodCtx;
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

    this.drawFood(frame);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.foodCanvas, 0, 0, canvas.width, canvas.height);

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

  private drawFood(frame: FrameMessage): void {
    const { gridWidth, gridHeight, foodCap } = frame.world;
    if (this.foodCanvas.width !== gridWidth || this.foodCanvas.height !== gridHeight) {
      this.foodCanvas.width = gridWidth;
      this.foodCanvas.height = gridHeight;
      this.foodImage = this.foodCtx.createImageData(gridWidth, gridHeight);
    }
    const data = this.foodImage!.data;
    const capacity = this.capacity;
    for (let cell = 0; cell < frame.food.length; cell++) {
      // Brightness shows food on the ground against the most any cell could hold;
      // a faint base tint shows how fertile the land underneath is.
      const fertility = capacity ? capacity[cell]! / this.maxCapacity : 1;
      const amount = Math.min(frame.food[cell]! / Math.max(this.maxCapacity, foodCap), 1);
      const o = cell * 4;
      data[o] = Math.round(14 + fertility * 10);
      data[o + 1] = Math.round(18 + fertility * 22 + amount * 100);
      data[o + 2] = Math.round(22 + fertility * 6 + amount * 24);
      data[o + 3] = 255;
    }
    this.foodCtx.putImageData(this.foodImage!, 0, 0);
  }
}
