import type { Simulation } from "@evo/sim-core";

/**
 * Draws one picture of the world as an indexed-color image (each pixel is a
 * number pointing into PALETTE), ready to be written into a GIF.
 *
 * Palette layout: 0-15 are the ground (dark to bright green as plants grow),
 * 16-47 are organisms from plant eater (green) to meat eater (red).
 */
const FOOD_SHADES = 16;
const DIET_SHADES = 32;
const DIET_START = FOOD_SHADES;

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  // h in degrees, s and l in 0-1. Standard conversion; only used to build the palette.
  const k = (n: number): number => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number): number => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}

export const PALETTE: number[][] = [
  ...Array.from({ length: FOOD_SHADES }, (_, i) => {
    const t = i / (FOOD_SHADES - 1);
    return [Math.round(14 + t * 8), Math.round(18 + t * 105), Math.round(22 + t * 30)];
  }),
  ...Array.from({ length: DIET_SHADES }, (_, i) => hslToRgb(125 - (i / (DIET_SHADES - 1)) * 125, 0.85, 0.58)),
];

/** Paint organisms and plants into `pixels` (size x size, one palette index per pixel). */
export function drawFrame(sim: Simulation, size: number, pixels: Uint8Array): void {
  const { worldWidth, worldHeight, foodCellSize } = sim.config;
  const scaleX = size / worldWidth;
  const scaleY = size / worldHeight;

  // Ground: brightness shows how much plant food is standing in each cell.
  let maxCapacity = 1;
  for (let cell = 0; cell < sim.foodCapacity.length; cell++) maxCapacity = Math.max(maxCapacity, sim.foodCapacity[cell]!);
  const cellPxX = foodCellSize * scaleX;
  const cellPxY = foodCellSize * scaleY;
  for (let py = 0; py < size; py++) {
    const cy = Math.min(sim.gridHeight - 1, Math.floor(py / cellPxY));
    for (let px = 0; px < size; px++) {
      const cx = Math.min(sim.gridWidth - 1, Math.floor(px / cellPxX));
      const amount = Math.min(sim.food[cy * sim.gridWidth + cx]! / maxCapacity, 1);
      pixels[py * size + px] = Math.round(amount * (FOOD_SHADES - 1));
    }
  }

  // Organisms: filled discs, sized by body size, colored by diet.
  for (let i = 0; i < sim.count; i++) {
    const radius = Math.max(2, scaleX * (0.7 + 0.8 * Math.sqrt(sim.size[i]!)));
    const color = DIET_START + Math.round(sim.diet[i]! * (DIET_SHADES - 1));
    const cx = sim.x[i]! * scaleX;
    const cy = sim.y[i]! * scaleY;
    const r2 = radius * radius;
    const x0 = Math.max(0, Math.floor(cx - radius));
    const x1 = Math.min(size - 1, Math.ceil(cx + radius));
    const y0 = Math.max(0, Math.floor(cy - radius));
    const y1 = Math.min(size - 1, Math.ceil(cy + radius));
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const dx = px + 0.5 - cx;
        const dy = py + 0.5 - cy;
        if (dx * dx + dy * dy <= r2) pixels[py * size + px] = color;
      }
    }
  }
}
