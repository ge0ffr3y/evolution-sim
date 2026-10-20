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
export const BIOME = { water: 0, plains: 1, forest: 2, desert: 3, mountain: 4, tundra: 5, boreal: 6, savanna: 7, tropical: 8, swamp: 9 } as const;
/**
 * Names for the viewer. With climate biomes (terrainMode 2) plains are grassland, forest is
 * temperate forest and mountains are highlands; the last five appear only there.
 */
export const BIOME_NAMES = ["water", "plains (grassland)", "forest (temperate)", "desert", "mountains (highlands)", "tundra", "boreal forest", "savanna", "tropical forest", "swamp"] as const;
export const BIOME_COUNT = 10;

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

/** The land's bones: water, mountains and plain land from height noise, plus a moisture noise map (the same for both terrain modes). */
function landShape(c: SimConfig, seed: number, gw: number, gh: number, channels: boolean): { biome: Uint8Array; moisture: Float64Array } {
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
  if (channels) addChannels(c, biome, gw, gh);
  return { biome, moisture };
}

/** Optional water channels: two straight strips of water that cut the world into two halves (the world wraps around, so it takes two cuts). */
function addChannels(c: SimConfig, biome: Uint8Array, gw: number, gh: number): void {
  const width = c.terrainBarrierWidth;
  if (width <= 0) return;
  for (let cy = 0; cy < gh; cy++) {
    for (let d = 0; d < width; d++) {
      biome[cy * gw + d] = BIOME.water;
      biome[cy * gw + (Math.floor(gw / 2) + d)] = BIOME.water;
    }
  }
}

/**
 * Climate biomes (terrainMode 2), first step: the same water and mountains as the five-biome
 * terrain, every other cell left as plain land to be given a biome once the climate is known,
 * plus the moisture noise (0 to 1) used for each cell's wetness.
 */
export function generateClimateBase(c: SimConfig, seed: number, gw: number, gh: number): { biome: Uint8Array; moistureNoise: Float64Array } {
  const shape = landShape(c, seed, gw, gh, true);
  // Stretch the noise to cover 0 to 1 fully (smoothed noise bunches up around the middle).
  const noise = shape.moisture;
  let lo = Infinity;
  let hi = -Infinity;
  for (let k = 0; k < noise.length; k++) {
    if (noise[k]! < lo) lo = noise[k]!;
    if (noise[k]! > hi) hi = noise[k]!;
  }
  const span = hi - lo > 1e-9 ? hi - lo : 1;
  for (let k = 0; k < noise.length; k++) noise[k] = (noise[k]! - lo) / span;
  return { biome: shape.biome, moistureNoise: noise };
}

/** How wet the climate belt at this latitude is (polar: 0 at the equator to 1 at the poles): a rainy equator, dry subtropics, rainy temperate lands, dry poles. */
export function rainBelt(c: SimConfig, polar: number): number {
  const at = [0, 0.22, 0.45, 1]; // (how far from the equator each belt lies: 0 equator, 1 pole)
  const wet = [c.moistureBandEquator, c.moistureBandSubtropic, c.moistureBandTemperate, c.moistureBandPolar];
  for (let k = 1; k < at.length; k++) {
    if (polar <= at[k]!) {
      const f = (polar - at[k - 1]!) / (at[k]! - at[k - 1]!);
      return wet[k - 1]! + (wet[k]! - wet[k - 1]!) * f;
    }
  }
  return wet[at.length - 1]!;
}

/** Which climate biome a land cell gets from its average temperature and its moisture (a Whittaker-style table). */
export function climateBiome(c: SimConfig, temperature: number, moisture: number): number {
  if (temperature < c.biomeColdBelow) return BIOME.tundra;
  if (moisture >= c.biomeSwampAbove) return BIOME.swamp;
  if (temperature < c.biomeCoolBelow) return moisture >= c.biomeWetAbove ? BIOME.boreal : BIOME.plains;
  if (temperature < c.biomeHotAbove) return moisture < c.biomeDryBelow ? BIOME.desert : moisture < c.biomeWetAbove ? BIOME.plains : BIOME.forest;
  return moisture < c.biomeDryBelow ? BIOME.desert : moisture < c.biomeWetAbove ? BIOME.savanna : BIOME.tropical;
}

/** For each biome (by number), its plant growth, movement cost, how easily animals there are seen, and how easily disease spreads. */
export function climateBiomeTable(c: SimConfig): { growth: number[]; move: number[]; seen: number[]; disease: number[] } {
  return {
    growth: [0, c.biomeGrowthGrassland, c.biomeGrowthTemperateForest, c.biomeGrowthDesert, c.biomeGrowthHighlands, c.biomeGrowthTundra, c.biomeGrowthBoreal, c.biomeGrowthSavanna, c.biomeGrowthTropical, c.biomeGrowthSwamp],
    move: [1, c.biomeMoveGrassland, c.biomeMoveTemperateForest, c.biomeMoveDesert, c.biomeMoveHighlands, c.biomeMoveTundra, c.biomeMoveBoreal, c.biomeMoveSavanna, c.biomeMoveTropical, c.biomeMoveSwamp],
    seen: [1, c.biomeSeenGrassland, c.biomeSeenTemperateForest, c.biomeSeenDesert, c.biomeSeenHighlands, c.biomeSeenTundra, c.biomeSeenBoreal, c.biomeSeenSavanna, c.biomeSeenTropical, c.biomeSeenSwamp],
    disease: [1, c.biomeDiseaseGrassland, c.biomeDiseaseTemperateForest, c.biomeDiseaseDesert, c.biomeDiseaseHighlands, c.biomeDiseaseTundra, c.biomeDiseaseBoreal, c.biomeDiseaseSavanna, c.biomeDiseaseTropical, c.biomeDiseaseSwamp],
  };
}

/** A biome for every cell (the five-biome terrain, terrainMode 1). */
export function generateBiomes(c: SimConfig, seed: number, gw: number, gh: number): Uint8Array {
  // (The channels are cut last here, after desert and forest are chosen, as they always were, so older worlds stay identical.)
  const { biome, moisture } = landShape(c, seed, gw, gh, false);
  const cells = gw * gh;

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
  addChannels(c, biome, gw, gh);
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

/**
 * A smooth map of weather anomalies, between -1 (cold and gloomy) and +1 (warm and bright), from
 * its own random stream. `salt` makes a second, different map from the same seed.
 */
export function generateWeatherMap(seed: number, gw: number, gh: number, scale: number, salt: number): Float32Array {
  const rng = new Rng((seed ^ salt) >>> 0);
  const noise = layeredNoise(rng, gw, gh, scale);
  let lo = Infinity;
  let hi = -Infinity;
  for (let k = 0; k < noise.length; k++) {
    if (noise[k]! < lo) lo = noise[k]!;
    if (noise[k]! > hi) hi = noise[k]!;
  }
  const span = hi - lo > 1e-9 ? hi - lo : 1;
  const out = new Float32Array(gw * gh);
  for (let k = 0; k < noise.length; k++) out[k] = ((noise[k]! - lo) / span) * 2 - 1;
  return out;
}

/**
 * Which kind of plant grows in each cell: smooth patches from their own random stream, with
 * the same number of cells of each kind (the type boundaries are quantiles of the noise).
 */
export function generatePlantTypes(seed: number, gw: number, gh: number, scale: number, kinds: number): Uint8Array {
  const rng = new Rng((seed ^ 0x6b43a9b5) >>> 0);
  const noise = layeredNoise(rng, gw, gh, scale);
  const sorted = Float64Array.from(noise).sort();
  const out = new Uint8Array(gw * gh);
  for (let k = 0; k < noise.length; k++) {
    let type = 0;
    for (let j = 1; j < kinds; j++) if (noise[k]! >= sorted[Math.min(sorted.length - 1, Math.floor((j * sorted.length) / kinds))]!) type = j;
    out[k] = type;
  }
  return out;
}
