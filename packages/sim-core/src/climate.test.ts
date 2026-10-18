import { describe, expect, it } from "vitest";
import { polarness, smoothWave } from "./climate";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

/** A quiet world with no animals: only the plants and the climate. */
const PLANTS: Partial<SimConfig> = { worldWidth: 128, worldHeight: 128, initialOrganisms: 1, climateMode: 1, initialFoodFraction: 0, speciesEvery: 0, fertilityVariation: 0, initialEnergyFraction: 1 };

function rowOf(sim: Simulation, fraction: number): number {
  return Math.floor(fraction * sim.gridHeight) * sim.gridWidth; // first cell of a row
}

describe("smoothWave and polarness", () => {
  it("runs from -1 up to +1 and back with period 1, passing 0 at a quarter and three quarters", () => {
    expect(smoothWave(0)).toBe(-1);
    expect(smoothWave(0.25)).toBeCloseTo(0, 12);
    expect(smoothWave(0.5)).toBe(1);
    expect(smoothWave(0.75)).toBeCloseTo(0, 12);
    expect(smoothWave(1)).toBe(-1);
    for (let k = 0; k < 200; k++) {
      const p = k / 37.3;
      expect(smoothWave(p)).toBeGreaterThanOrEqual(-1);
      expect(smoothWave(p)).toBeLessThanOrEqual(1);
      expect(smoothWave(p + 3)).toBeCloseTo(smoothWave(p), 9);
    }
  });

  it("is 0 at the equator (the middle of the world) and 1 at the edges", () => {
    expect(polarness(15, 32)).toBeLessThan(0.05);
    expect(polarness(16, 32)).toBeLessThan(0.05);
    expect(polarness(0, 32)).toBeGreaterThan(0.95);
    expect(polarness(31, 32)).toBeGreaterThan(0.95);
  });
});

describe("climate", () => {
  it("is off by default: no climate arrays, and plants grow the same everywhere", () => {
    const sim = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 5 });
    expect(sim.temperature).toHaveLength(0);
    expect(sim.growthFactor).toHaveLength(0);
  });

  it("is warmest at the equator and colder toward the top and bottom edges, equally at both", () => {
    const sim = new Simulation(1, PLANTS);
    const mid = sim.temperature[rowOf(sim, 0.5)]!;
    const top = sim.temperature[0]!;
    const bottom = sim.temperature[(sim.gridHeight - 1) * sim.gridWidth]!;
    expect(mid).toBeGreaterThan(top + 0.3);
    expect(top).toBeCloseTo(bottom, 9);
    expect(mid).toBeCloseTo(sim.config.baseTemperature, 1);
  });

  it("plants grow fastest near the equator and slowest at the cold edges", () => {
    const sim = new Simulation(1, PLANTS);
    expect(sim.growthFactor[rowOf(sim, 0.5)]).toBeGreaterThan(sim.growthFactor[0]! * 1.5);
    expect(sim.growthFactor[0]).toBeGreaterThanOrEqual(0);
  });

  it("mountains are colder than the plains around them", () => {
    const sim = new Simulation(2, { ...PLANTS, terrainMode: 1, terrainWaterFraction: 0, terrainMountainFraction: 0.1 });
    // Compare two cells in the same row, one mountain, one not (same latitude, same everything else).
    let found = 0;
    for (let row = 0; row < sim.gridHeight && found === 0; row++) {
      let mountain = -1;
      let other = -1;
      for (let cx = 0; cx < sim.gridWidth; cx++) {
        const cell = row * sim.gridWidth + cx;
        if (sim.biome[cell] === 4) mountain = cell;
        else if (sim.biome[cell] === 1) other = cell;
      }
      if (mountain >= 0 && other >= 0) {
        expect(sim.temperature[other]! - sim.temperature[mountain]!).toBeCloseTo(sim.config.mountainCooling, 9);
        found++;
      }
    }
    expect(found).toBe(1);
  });

  it("seasons: temperature and plant growth swing with the year, and a whole year later they are back where they started", () => {
    const sim = new Simulation(1, { ...PLANTS, yearLength: 400 });
    const cell = rowOf(sim, 0.5);
    const start = [sim.temperature[cell]!, sim.growthFactor[cell]!];
    const temps: number[] = [];
    const growth: number[] = [];
    for (let t = 0; t < 400; t++) {
      sim.step();
      temps.push(sim.temperature[cell]!);
      growth.push(sim.growthFactor[cell]!);
    }
    expect(Math.max(...temps) - Math.min(...temps)).toBeCloseTo(2 * 0.15 * 0.5, 1); // the swing at the equator is half the full amount
    expect(Math.max(...growth)).toBeGreaterThan(Math.min(...growth) * 1.2);
    sim.step();
    expect(sim.temperature[cell]).toBeCloseTo(temps[0]!, 6); // 401 ticks in: the same as tick 1
    void start;
  });

  it("the swing is bigger at the cold edges than at the equator", () => {
    const sim = new Simulation(1, { ...PLANTS, yearLength: 400 });
    const range = (cell: number): number => {
      let lo = Infinity;
      let hi = -Infinity;
      const s = new Simulation(1, { ...PLANTS, yearLength: 400 });
      for (let t = 0; t < 400; t++) {
        s.step();
        lo = Math.min(lo, s.temperature[cell]!);
        hi = Math.max(hi, s.temperature[cell]!);
      }
      return hi - lo;
    };
    expect(range(0)).toBeGreaterThan(range(rowOf(sim, 0.5)));
  });

  it("day and night: plants grow less at night, with a cycle of dayLength ticks", () => {
    const sim = new Simulation(1, { ...PLANTS, dayLength: 100, dayNightDepth: 0.6, latitudeLight: 0, latitudeCooling: 0, mountainCooling: 0, baseTemperature: 0.65 });
    const cell = 0;
    const factors: number[] = [];
    for (let t = 0; t < 200; t++) {
      sim.step();
      factors.push(sim.growthFactor[cell]!);
    }
    expect(Math.max(...factors)).toBeCloseTo(1, 1); // full daylight
    expect(Math.min(...factors)).toBeCloseTo(0.4, 1); // night: 60% dimmer
    expect(factors[0]).toBeCloseTo(factors[100]!, 6); // one day later, the same
  });

  it("climate drift: the whole world slowly warms and cools", () => {
    const sim = new Simulation(1, { ...PLANTS, climateDriftPeriod: 4000, climateDriftAmplitude: 0.2 });
    const cell = rowOf(sim, 0.5);
    sim.run(1000); // a quarter of the way round: at its warmest turn point
    const warm = sim.temperature[cell]!;
    sim.run(2000);
    const cold = sim.temperature[cell]!;
    expect(warm - cold).toBeGreaterThan(0.35);
  });

  it("more sunshine means more plants, which means more energy entering the world (the ledger counts it)", () => {
    const sunIn = (extra: Partial<SimConfig>): number => {
      const sim = new Simulation(1, { ...PLANTS, initialOrganisms: 1, foodCap: 1e6, foodRegrowPerTick: 0.5, ...extra });
      sim.run(300);
      return sim.ledger.sunlightIn;
    };
    const summer = sunIn({ yearLength: 4000 }); // starts in spring and warms up
    const polar = sunIn({ yearLength: 4000, latitudeCooling: 0.8 }); // much colder everywhere
    expect(summer).toBeGreaterThan(polar);
    expect(polar).toBeGreaterThan(0);
  });

  it("energy and matter are still conserved, and it is deterministic and survives saving", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 120, climateMode: 1, yearLength: 500, dayLength: 90, climateDriftPeriod: 3000, terrainMode: 1, brainMode: 2, brainAddConnectionProb: 0.3 };
    const a = new Simulation(5, config);
    const b = new Simulation(5, config);
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
    const loaded = Simulation.load(a.save());
    a.run(700);
    loaded.run(700);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
    expect(Array.from(loaded.temperature)).toEqual(Array.from(a.temperature));
  }, 120_000);

  it("rejects settings that make no sense", () => {
    expect(() => new Simulation(1, { climateMode: 1, plantTempTolerance: 0 })).toThrow(/plantTempTolerance/);
    expect(() => new Simulation(1, { climateMode: 1, yearLength: -5 })).toThrow(/yearLength/);
    expect(() => new Simulation(1, { climateMode: 2 })).toThrow(/climateMode/);
  });
});
