import type { FrameMessage } from "./protocol";

/** Speeds at or above this look fully "fast" (red) in the picture. */
const SPEED_COLOR_MAX = 2;
const PALETTE_SIZE = 48;

/** Slow = blue, fast = red/orange. Precomputed so drawing thousands of dots stays cheap. */
const PALETTE = Array.from({ length: PALETTE_SIZE }, (_, i) => {
  const t = i / (PALETTE_SIZE - 1);
  return `hsl(${Math.round(215 - t * 205)} 85% 60%)`;
});

export function speedColor(speed: number): string {
  const t = Math.min(Math.max(speed / SPEED_COLOR_MAX, 0), 1);
  return PALETTE[Math.round(t * (PALETTE_SIZE - 1))]!;
}

/** Draws the food grid and the organisms onto a canvas. */
export class WorldRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly foodCanvas = document.createElement("canvas");
  private readonly foodCtx: CanvasRenderingContext2D;
  private foodImage: ImageData | null = null;

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

    this.drawFood(frame);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.foodCanvas, 0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / world.width;
    const scaleY = canvas.height / world.height;
    for (let i = 0; i < frame.count; i++) {
      // Dot area grows with body size.
      const radius = scaleX * (0.35 + 0.45 * Math.sqrt(frame.size[i]!));
      ctx.fillStyle = speedColor(frame.speed[i]!);
      ctx.beginPath();
      ctx.arc(frame.x[i]! * scaleX, frame.y[i]! * scaleY, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawFood(frame: FrameMessage): void {
    const { gridWidth, gridHeight, foodCap } = frame.world;
    if (this.foodCanvas.width !== gridWidth || this.foodCanvas.height !== gridHeight) {
      this.foodCanvas.width = gridWidth;
      this.foodCanvas.height = gridHeight;
      this.foodImage = this.foodCtx.createImageData(gridWidth, gridHeight);
    }
    const image = this.foodImage!;
    const data = image.data;
    for (let cell = 0; cell < frame.food.length; cell++) {
      const amount = Math.min(frame.food[cell]! / foodCap, 1);
      const o = cell * 4;
      data[o] = 14;
      data[o + 1] = Math.round(22 + amount * 110);
      data[o + 2] = Math.round(26 + amount * 30);
      data[o + 3] = 255;
    }
    this.foodCtx.putImageData(image, 0, 0);
  }
}
