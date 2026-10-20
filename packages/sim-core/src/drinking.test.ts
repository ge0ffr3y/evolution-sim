import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";
import { BIOME } from "./terrain";
import { INPUT } from "./brain";

const WORLD: Partial<SimConfig> = { worldWidth: 256, worldHeight: 256, initialOrganisms: 1, maxOrganisms: 40, speciesEvery: 0, terrainMode: 1, drinking: 1, reproThresholdPerSize: 1e9, initialEnergyFraction: 0.5 };

/** Put organism 0 at the middle of a cell, standing still. */
function placeAt(sim: Simulation, cell: number): void {
  const cs = sim.config.foodCellSize;
  const cx = cell % sim.gridWidth;
  sim.x[0] = (cx + 0.5) * cs;
  sim.y[0] = ((cell - cx) / sim.gridWidth + 0.5) * cs;
  sim.speed[0] = 0;
}

/** A land cell with no water within two cells, and a land cell next to water. */
function findCells(sim: Simulation): { dry: number; shore: number } {
  const gw = sim.gridWidth;
  const gh = sim.gridHeight;
  const water = (cx: number, cy: number): boolean => sim.biome[((cy + gh) % gh) * gw + ((cx + gw) % gw)] === BIOME.water;
  let dry = -1;
  let shore = -1;
  for (let cy = 0; cy < gh; cy++) {
    for (let cx = 0; cx < gw; cx++) {
      if (water(cx, cy)) continue;
      let near = 0;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (water(cx + dx, cy + dy)) near++;
      if (near === 0 && dry < 0) dry = cy * gw + cx;
      if ((water(cx + 1, cy) || water(cx - 1, cy) || water(cx, cy + 1) || water(cx, cy - 1)) && shore < 0) shore = cy * gw + cx;
    }
  }
  return { dry, shore };
}

describe("drinking", () => {
  it("is off by default", () => {
    expect(new Simulation(1, { terrainMode: 1 }).hydration).toHaveLength(0);
  });

  it("away from water an animal grows thirsty at the set rate; next to water it drinks its fill", () => {
    const sim = new Simulation(1, WORLD);
    const { dry, shore } = findCells(sim);
    placeAt(sim, dry);
    expect(sim.hydration[0]).toBe(1);
    sim.run(100);
    expect(sim.hydration[0]).toBeCloseTo(1 - 100 * sim.config.thirstRate, 5);
    placeAt(sim, shore);
    sim.step();
    expect(sim.hydration[0]).toBe(1);
  });

  it("heat makes thirst come faster", () => {
    const thirstAfter = (heat: number): number => {
      const sim = new Simulation(1, { ...WORLD, climateMode: 1, thirstHeat: heat, thirstHeatAbove: 0 });
      placeAt(sim, findCells(sim).dry);
      sim.run(100);
      return 1 - sim.hydration[0]!;
    };
    expect(thirstAfter(2)).toBeGreaterThan(thirstAfter(0) * 1.5);
  });

  it("a dehydrated animal pays more upkeep, up to the full extra when it has no water left", () => {
    const upkeep = (water: number): number => {
      const sim = new Simulation(1, { ...WORLD, thirstRate: 1e-12, dehydrationCost: 2, thirstBelow: 0.5 });
      placeAt(sim, findCells(sim).dry);
      sim.hydration[0] = water;
      sim.step();
      return sim.ledger.basalBurned;
    };
    const fine = upkeep(1);
    expect(upkeep(0) / fine).toBeCloseTo(3, 4);
    expect(upkeep(0.25) / fine).toBeCloseTo(2, 4);
  });

  it("brains feel thirst", () => {
    const sim = new Simulation(1, { ...WORLD, brainMode: 2, brainEvery: 1 });
    placeAt(sim, findCells(sim).dry);
    sim.hydration[0] = 0.3;
    sim.traceId = sim.id[0]!;
    sim.step();
    expect(sim.describe(0).brain!.activity!.inputs[INPUT.thirst]).toBeCloseTo(0.7, 6); // (it thinks before this tick's thirst is counted)
  });

  it("the books balance exactly with drinking in a climate-biome world, and a saved world carries on exactly", () => {
    const config: Partial<SimConfig> = { worldWidth: 256, worldHeight: 256, initialOrganisms: 400, speciesEvery: 0, terrainMode: 2, climateMode: 1, yearLength: 2000, drinking: 1, brainMode: 2, brainAddConnectionProb: 0.3 };
    const a = new Simulation(3, config);
    a.run(20);
    const e0 = a.energyAudit().total;
    const m0 = a.matterAudit().total;
    const L0 = { ...a.ledger };
    a.run(1000);
    const copy = Simulation.load(a.save());
    a.run(600);
    copy.run(600);
    expect(copy.fingerprint()).toBe(a.fingerprint());
    const L = a.ledger;
    const burned = (x: typeof L): number => x.basalBurned + x.movementBurned + x.sensingBurned + x.attackBurned + x.armorBurned + x.brainBurned;
    const expected = e0 + (L.sunlightIn - L0.sunlightIn) - (burned(L) - burned(L0)) - (L.digestionLoss - L0.digestionLoss) - (L.decayLoss - L0.decayLoss);
    expect(Math.abs(a.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
    expect(Math.abs(a.matterAudit().total - m0) / m0).toBeLessThan(1e-9);
    expect(a.stats().hydration.mean).toBeGreaterThan(0);
  }, 60_000);

  it("check the settings", () => {
    expect(() => new Simulation(1, { drinking: 1 })).toThrow(/drinking needs terrain/);
    expect(() => new Simulation(1, { terrainMode: 1, drinking: 1, thirstRate: 0 })).toThrow(/thirstRate/);
  });
});
