import type { SimConfig } from "./config";
import { Rng } from "./rng";

/**
 * Terrain: the land is cut into the same square cells as the plant grid, and every cell gets
 * a biome. Water is a hard barrier (nothing can enter it and plants do not grow there).
 * The other biomes change how fast plants grow and how much it costs to move.
 *
 * The map comes from smooth noise (exact arithmetic only, so every browser draws the same
 * world) with its own random-number stream derived from the world's seed, so the same
 * seed always gives the same continents whatever else is switched on.
 */
export const BIOME = { water: 0, plains: 1, forest: 2, desert: 3, mountain: 4 } as const;
export const BIOME_NAMES = ["water", "plains", "forest", "desert", "mountains"] as const;
export const BIOME_COUNT = 5;

/** Smooth random values between 0 and 1 over a gw x gh grid that wraps around at the edges. */
function smoothNoise(rng: Rng, gw: number, gh: number, scale: number): Float64Array {
  const lw = gw / scale;
  const lh = gh / scale;
  const lattice = new Float64Array(lw * lh);
  for (let k = 0; k < lattice.length; k++) lattice[k] = rng.next();
  const out = new Float64Array(gw * gh);
  for (let cy = 0; cy < gh; cy++) {
    const v = cy / scale;
    const ly = Math.floor(v);
    const ty = v - ly;
    const sy = ty * ty * (3 - 2 * ty);
    for (let cx = 0; cx < gw; cx++) {
      const u = cx / scale;
      const lx = Math.floor(u);
      const tx = u - lx;
      const sx = tx * tx * (3 - 2 * tx);
      const x1 = (lx + 1) % lw;
      const y1 = (ly + 1) % lh;
      const top = lattice[ly * lw + lx]! * (1 - sx) + lattice[ly * lw + x1]! * sx;
      const bottom = lattice[y1 * lw + lx]! * (1 - sx) + lattice[y1 * lw + x1]! * sx;
      out[cy * gw + cx] = top * (1 - sy) + bottom * sy;
    }
  }
  return out;
}

/** Two layers of noise: broad features and finer detail (the finer layer only if the grid allows it). */
function layeredNoise(rng: Rng, gw: number, gh: number, scale: number): Float64Array {
  const broad = smoothNoise(rng, gw, gh, scale);
  const half = scale / 2;
  if (!Number.isInteger(half) || half < 1 || gw % half !== 0 || gh % half !== 0) return broad;
  const fine = smoothNoise(rng, gw, gh, half);
  for (let k = 0; k < broad.length; k++) broad[k] = broad[k]! * 0.7 + fine[k]! * 0.3;
  return broad;
}

/** The value below which a given fraction of the values lie (0 means nothing is below it). */
function lowCut(values: number[], fraction: number): number {
  if (fraction <= 0 || values.length === 0) return -Infinity;
  const sorted = Float64Array.from(values).sort();
  return sorted[Math.min(sorted.length - 1, Math.floor(fraction * sorted.length))]!;
}

/** The value above which a given fraction of the values lie. */
function highCut(values: number[], fraction: number): number {
  if (fraction <= 0 || values.length === 0) return Infinity;
  const sorted = Float64Array.from(values).sort();
  return sorted[Math.max(0, sorted.length - 1 - Math.floor(fraction * sorted.length))]!;
}

/** A biome for every cell. */
export function generateBiomes(c: SimConfig, seed: number, gw: number, gh: number): Uint8Array {
  const rng = new Rng((seed ^ 0x7e44a1b3) >>> 0);
  const cells = gw * gh;
  const elevation = layeredNoise(rng, gw, gh, c.terrainScale);
  const moisture = layeredNoise(rng, gw, gh, c.terrainScale);
  const biome = new Uint8Array(cells).fill(BIOME.plains);

  const all = Array.from(elevation);
  const waterLine = lowCut(all, c.terrainWaterFraction);
  const mountainLine = highCut(all, c.terrainMountainFraction);
  for (let k = 0; k < cells; k++) {
    if (elevation[k]! < waterLine) biome[k] = BIOME.water;
    else if (elevation[k]! > mountainLine) biome[k] = BIOME.mountain;
  }

  // Among the cells that are neither water nor mountain, the driest become desert and the wettest forest.
  const landMoisture: number[] = [];
  for (let k = 0; k < cells; k++) if (biome[k] === BIOME.plains) landMoisture.push(moisture[k]!);
  const dryLine = lowCut(landMoisture, c.terrainDesertFraction);
  const wetLine = highCut(landMoisture, c.terrainForestFraction);
  for (let k = 0; k < cells; k++) {
    if (biome[k] !== BIOME.plains) continue;
    if (moisture[k]! < dryLine) biome[k] = BIOME.desert;
    else if (moisture[k]! > wetLine) biome[k] = BIOME.forest;
  }

  // Optional water channels: two straight strips of water that cut the world into two halves
  // (the world wraps around, so it takes two cuts).
  const width = c.terrainBarrierWidth;
  if (width > 0) {
    for (let cy = 0; cy < gh; cy++) {
      for (let d = 0; d < width; d++) {
        biome[cy * gw + d] = BIOME.water;
        biome[cy * gw + (Math.floor(gw / 2) + d)] = BIOME.water;
      }
    }
  }
  return biome;
}

/** How fast plants grow in each biome, relative to plains. */
export function growthMultipliers(c: SimConfig): number[] {
  return [0, 1, c.terrainGrowthForest, c.terrainGrowthDesert, c.terrainGrowthMountain];
}

/** How much more (or less) energy it costs to move in each biome, relative to plains. */
export function moveMultipliers(c: SimConfig): number[] {
  return [1, 1, c.terrainMoveForest, c.terrainMoveDesert, c.terrainMoveMountain];
}

/** The background color of every cell (0 to 1 around the color wheel): smooth patches, from the seed. */
export function generateBackground(seed: number, gw: number, gh: number, scale: number): Float32Array {
  const rng = new Rng((seed ^ 0x2c1b3c6d) >>> 0);
  const noise = layeredNoise(rng, gw, gh, scale);
  const out = new Float32Array(gw * gh);
  // Stretch the noise so it covers the whole color wheel, not just the middle of it.
  let lo = Infinity;
  let hi = -Infinity;
  for (let k = 0; k < noise.length; k++) {
    if (noise[k]! < lo) lo = noise[k]!;
    if (noise[k]! > hi) hi = noise[k]!;
  }
  const span = hi - lo > 1e-9 ? hi - lo : 1;
  for (let k = 0; k < noise.length; k++) out[k] = Math.min(0.999999, (noise[k]! - lo) / span);
  return out;
}
