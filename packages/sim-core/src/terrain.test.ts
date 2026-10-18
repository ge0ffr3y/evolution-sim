import { describe, expect, it } from "vitest";
import { BIOME } from "./terrain";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

const WORLD: Partial<SimConfig> = { worldWidth: 128, worldHeight: 128, initialOrganisms: 120, terrainMode: 1 };

/** How many separate pieces of dry land there are (the world wraps around at the edges). */
function landPieces(sim: Simulation): number {
  const gw = sim.gridWidth;
  const gh = sim.gridHeight;
  const seen = new Uint8Array(gw * gh);
  let pieces = 0;
  for (let start = 0; start < gw * gh; start++) {
    if (sim.passable[start] === 0 || seen[start] === 1) continue;
    pieces++;
    const stack = [start];
    seen[start] = 1;
    while (stack.length > 0) {
      const cell = stack.pop()!;
      const cx = cell % gw;
      const cy = Math.floor(cell / gw);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const next = ((cy + dy + gh) % gh) * gw + ((cx + dx + gw) % gw);
        if (sim.passable[next] === 1 && seen[next] === 0) {
          seen[next] = 1;
          stack.push(next);
        }
      }
    }
  }
  return pieces;
}

function share(sim: Simulation, biome: number): number {
  let n = 0;
  for (let k = 0; k < sim.biome.length; k++) if (sim.biome[k] === biome) n++;
  return n / sim.biome.length;
}

describe("terrain", () => {
  it("is off by default: no terrain arrays, an open plain", () => {
    const sim = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 20 });
    expect(sim.biome).toHaveLength(0);
    expect(sim.passable).toHaveLength(0);
  });

  it("gives the requested share of water and mountains, and every biome shows up", () => {
    const sim = new Simulation(3, { ...WORLD, worldWidth: 256, worldHeight: 256, terrainScale: 4, terrainWaterFraction: 0.3, terrainMountainFraction: 0.1 });
    expect(share(sim, BIOME.water)).toBeCloseTo(0.3, 1);
    expect(share(sim, BIOME.mountain)).toBeCloseTo(0.1, 1);
    for (const biome of [BIOME.plains, BIOME.forest, BIOME.desert]) expect(share(sim, biome)).toBeGreaterThan(0.03);
  });

  it("the same seed always draws the same map, whatever else is switched on, and different seeds differ", () => {
    const a = new Simulation(5, WORLD);
    const b = new Simulation(5, { ...WORLD, initialOrganisms: 30, brainMode: 2, sexualReproduction: 1 });
    expect(Array.from(a.biome)).toEqual(Array.from(b.biome));
    const c = new Simulation(6, WORLD);
    expect(Array.from(c.biome)).not.toEqual(Array.from(a.biome));
  });

  it("water cells grow no plants and hold no nutrient; other biomes grow plants at their own rate", () => {
    const sim = new Simulation(2, { ...WORLD, fertilityVariation: 0 });
    const cap = sim.config.foodCap;
    const seen = new Set<number>();
    for (let k = 0; k < sim.biome.length; k++) {
      const biome = sim.biome[k]!;
      seen.add(biome);
      const factor = [0, 1, sim.config.terrainGrowthForest, sim.config.terrainGrowthDesert, sim.config.terrainGrowthMountain][biome]!;
      expect(sim.foodCapacity[k]).toBeCloseTo(cap * factor, 9);
      if (biome === BIOME.water) expect(sim.nutrient[k]).toBe(0);
    }
    expect(seen.size).toBe(5);
  });

  it("water channels cut the world into exactly two pieces of land; without them it is one", () => {
    const flat = { ...WORLD, terrainWaterFraction: 0, terrainMountainFraction: 0, terrainDesertFraction: 0, terrainForestFraction: 0 };
    expect(landPieces(new Simulation(1, flat))).toBe(1);
    const split = new Simulation(1, { ...flat, terrainBarrierWidth: 1 });
    expect(landPieces(split)).toBe(2);
    // The two channels are the right width and in the right place.
    const gw = split.gridWidth;
    for (let cy = 0; cy < split.gridHeight; cy++) {
      expect(split.biome[cy * gw]).toBe(BIOME.water);
      expect(split.biome[cy * gw + gw / 2]).toBe(BIOME.water);
      expect(split.biome[cy * gw + 1]).toBe(BIOME.plains);
    }
  });

  it("founders and babies are always on dry land, and nobody ever ends up in water", () => {
    const sim = new Simulation(4, { ...WORLD, terrainWaterFraction: 0.4, speciesEvery: 0 });
    const onLand = (): void => {
      for (let i = 0; i < sim.count; i++) {
        const cell = Math.floor(sim.y[i]! / 8) * sim.gridWidth + Math.floor(sim.x[i]! / 8);
        expect(sim.passable[cell], `organism ${i} at ${sim.x[i]}, ${sim.y[i]}`).toBe(1);
      }
    };
    onLand();
    for (let block = 0; block < 6; block++) {
      sim.run(300);
      onLand();
    }
    expect(sim.totalBirths).toBeGreaterThan(50);
  });

  it("water stops an organism at the shore and turns it around", () => {
    const flat = { worldWidth: 64, worldHeight: 64, initialOrganisms: 1, terrainMode: 1, terrainWaterFraction: 0, terrainMountainFraction: 0, terrainDesertFraction: 0, terrainForestFraction: 0, terrainBarrierWidth: 1, turnStd: 0, initialSpeed: 1, speedMin: 1, speedMax: 1, foodRegrowPerTick: 0, initialFoodFraction: 0, speciesEvery: 0 } as Partial<SimConfig>;
    const sim = new Simulation(1, flat);
    // The channel is the first column of cells (x from 0 to 8) and the column at x = 32..40. Walk east from x = 20.
    sim.x[0] = 20;
    sim.y[0] = 20;
    sim.headingX[0] = 1;
    sim.headingY[0] = 0;
    let furthest = 0;
    let turnedBack = false;
    for (let t = 0; t < 40; t++) {
      sim.step();
      furthest = Math.max(furthest, sim.x[0]!);
      if (sim.headingX[0]! < 0) turnedBack = true;
      expect(sim.x[0]!).toBeLessThan(32); // never reaches the water that starts at x = 32
      expect(sim.x[0]!).toBeGreaterThanOrEqual(8); // nor the water on the left (the first cell, x from 0 to 8)
    }
    expect(furthest).toBeGreaterThan(28);
    expect(turnedBack).toBe(true);
  });

  it("moving through mountains costs more energy, and forest and desert cost what the settings say", () => {
    const run = (biome: number): number => {
      const sim = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 1, terrainMode: 1, terrainWaterFraction: 0, terrainMountainFraction: 0, terrainDesertFraction: 0, terrainForestFraction: 0, foodRegrowPerTick: 0, initialFoodFraction: 0, speciesEvery: 0 });
      sim.biome.fill(biome);
      sim.passable.fill(1);
      sim.terrainMove.fill([1, 1, sim.config.terrainMoveForest, sim.config.terrainMoveDesert, sim.config.terrainMoveMountain][biome]!);
      const before = sim.energy[0]!;
      sim.step();
      return before - sim.energy[0]!;
    };
    const plains = run(BIOME.plains);
    const mountain = run(BIOME.mountain);
    // Upkeep is the same everywhere; only the movement part is multiplied.
    expect(mountain).toBeGreaterThan(plains);
    const extraMountain = mountain - plains;
    const extraForest = run(BIOME.forest) - plains;
    expect(extraMountain / extraForest).toBeCloseTo((3 - 1) / (1.4 - 1), 3);
  });

  it("energy and matter are still conserved to better than a part in a billion, and it is deterministic", () => {
    const config = { ...WORLD, brainMode: 2, brainAddConnectionProb: 0.3 };
    const a = new Simulation(7, config);
    const b = new Simulation(7, config);
    const energy0 = a.energyAudit().total;
    const matter0 = a.matterAudit().total;
    for (let block = 0; block < 4; block++) {
      a.run(500);
      b.run(500);
      const L = a.ledger;
      const burned = L.basalBurned + L.movementBurned + L.sensingBurned + L.attackBurned + L.armorBurned + L.brainBurned;
      const expected = energy0 + L.sunlightIn - burned - L.digestionLoss - L.decayLoss;
      expect(Math.abs(a.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
      expect(Math.abs(a.matterAudit().total - matter0) / matter0).toBeLessThan(1e-9);
    }
    expect(a.fingerprint()).toBe(b.fingerprint());
  }, 120_000);

  it("a reloaded world keeps its map, even when branched with a different seed", () => {
    const sim = new Simulation(8, WORLD);
    sim.run(400);
    const same = Simulation.load(sim.save());
    const branch = Simulation.load(sim.save(), { seed: 999 });
    expect(Array.from(same.biome)).toEqual(Array.from(sim.biome));
    expect(Array.from(branch.biome)).toEqual(Array.from(sim.biome));
    expect(Array.from(branch.passable)).toEqual(Array.from(sim.passable));
    sim.run(400);
    same.run(400);
    expect(same.fingerprint()).toBe(sim.fingerprint());
  }, 60_000);

  it("rejects settings that make no sense", () => {
    expect(() => new Simulation(1, { ...WORLD, terrainScale: 5 })).toThrow(/terrainScale/);
    expect(() => new Simulation(1, { ...WORLD, terrainWaterFraction: 0.7, terrainMountainFraction: 0.4 })).toThrow(/cover the whole world/);
    expect(() => new Simulation(1, { ...WORLD, terrainBarrierWidth: 5 })).toThrow(/terrainBarrierWidth/);
    expect(() => new Simulation(1, { ...WORLD, terrainMode: 2 })).toThrow(/terrainMode/);
  });
});
