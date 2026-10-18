/**
 * Climate helpers. Everything here uses only exact arithmetic (no sin or cos), so every
 * browser computes the same seasons.
 */

/**
 * A smooth wave with period 1 that runs between -1 and +1: -1 at phase 0, 0 at 0.25,
 * +1 at 0.5, 0 at 0.75 and back to -1 at 1. (A triangle wave with its corners rounded off.)
 */
export function smoothWave(phase: number): number {
  const q = phase - Math.floor(phase);
  const w = q < 0.5 ? q * 2 : 2 - q * 2;
  return 2 * (w * w * (3 - 2 * w)) - 1;
}

/**
 * How far a row of cells is from the equator (the middle of the world) toward the cold edges:
 * 0 in the middle, 1 at the top and bottom edges. (The world wraps around, so both edges are
 * "poles".)
 */
export function polarness(row: number, rows: number): number {
  const d = (row + 0.5) / rows - 0.5;
  return (d < 0 ? -d : d) * 2;
}
