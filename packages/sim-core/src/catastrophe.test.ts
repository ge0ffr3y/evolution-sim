import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

const CLIMATE: Partial<SimConfig> = { worldWidth: 128, worldHeight: 128, initialOrganisms: 150, climateMode: 1, speciesEvery: 0, initialFoodFraction: 0.5 };

/** The temperature at the equator, tick by tick. */
function equatorTemps(sim: Simulation, ticks: number): number[] {
  const cell = Math.floor(sim.gridHeight / 2) * sim.gridWidth;
  const out: number[] = [];
  for (let t = 0; t < ticks; t++) {
    sim.step();
    out.push(sim.temperature[cell]!);
  }
  return out;
}

describe("catastrophes", () => {
  it("are off by default and a plain world has no world events", () => {
    const sim = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 30 });
    sim.run(300);
    expect(sim.worldEvents).toHaveLength(0);
  });

  it("an ice age cools the whole world, worst in the middle of it, then the temperature recovers", () => {
    const plain = equatorTemps(new Simulation(1, CLIMATE), 1000);
    const ice = new Simulation(1, { ...CLIMATE, catastropheKind: 1, catastropheAt: 200, catastropheLength: 600, iceAgeCooling: 0.3 });
    const temps = equatorTemps(ice, 1000);
    expect(temps[100]).toBeCloseTo(plain[100]!, 9); // before it
    expect(plain[499]! - temps[499]!).toBeCloseTo(0.3, 2); // the worst, half way through (tick 500)
    expect(plain[300]! - temps[300]!).toBeGreaterThan(0.05); // building up
    expect(plain[300]! - temps[300]!).toBeLessThan(0.28);
    expect(temps[950]).toBeCloseTo(plain[950]!, 9); // over
    expect(ice.worldEvents.map((e) => e.kind)).toEqual(["iceAge", "recovery"]);
    expect(ice.worldEvents[0]!.tick).toBe(200);
    expect(ice.worldEvents[1]!.tick).toBe(800);
  });

  it("an ice age really does hurt: much less sunlight is turned into plants", () => {
    const sun = (extra: Partial<SimConfig>): number => {
      const sim = new Simulation(2, { ...CLIMATE, initialOrganisms: 1, foodCap: 1e6, foodRegrowPerTick: 0.5, initialFoodFraction: 0, ...extra });
      sim.run(700);
      return sim.ledger.sunlightIn;
    };
    expect(sun({ catastropheKind: 1, catastropheAt: 1, catastropheLength: 600, iceAgeCooling: 0.5 })).toBeLessThan(sun({}) * 0.8);
  });

  it("a drought cuts plant growth, then growth recovers", () => {
    const sim = new Simulation(1, { ...CLIMATE, catastropheKind: 2, catastropheAt: 100, catastropheLength: 400, droughtSeverity: 0.8, initialOrganisms: 1 });
    const cell = Math.floor(sim.gridHeight / 2) * sim.gridWidth;
    const growth: number[] = [];
    for (let t = 0; t < 700; t++) {
      sim.step();
      growth.push(sim.growthFactor[cell]!);
    }
    expect(growth[50]).toBeGreaterThan(0.5);
    expect(growth[299]!).toBeLessThan(growth[50]! * 0.35); // the worst, half way through
    expect(growth[650]).toBeCloseTo(growth[50]!, 6); // recovered
    expect(sim.worldEvents.map((e) => e.kind)).toEqual(["drought", "recovery"]);
  });

  it("a meteor kills everything in a circle and nothing outside it, destroys the plants there, and the books still balance exactly", () => {
    const sim = new Simulation(4, { worldWidth: 128, worldHeight: 128, initialOrganisms: 400, speciesEvery: 0, catastropheKind: 3, catastropheAt: 50, meteorRadius: 30, initialFoodFraction: 1 });
    const energy0 = sim.energyAudit().total;
    const matter0 = sim.matterAudit().total;
    sim.run(50);
    const before = sim.count;
    sim.step(); // the meteor lands at the start of tick 50
    const strike = sim.worldEvents[0]!;
    expect(strike.kind).toBe("meteor");
    const killed = Number(/: (\d+) organisms/.exec(strike.text)![1]);
    expect(killed).toBeGreaterThan(5);
    expect(sim.count).toBeLessThan(before - killed + 60); // (the survivors may also have had babies this tick)
    // Where it landed, plants are gone.
    const match = /near \((\d+), (\d+)\)/.exec(strike.text)!;
    const cx = Math.floor(Number(match[1]) / 8);
    const cy = Math.floor(Number(match[2]) / 8);
    expect(sim.food[cy * sim.gridWidth + cx]).toBeLessThan(0.5 * sim.config.foodCap);
    // Energy and matter are conserved: nothing was created or destroyed except as heat and detritus.
    const L = sim.ledger;
    const burned = L.basalBurned + L.movementBurned + L.sensingBurned + L.attackBurned + L.armorBurned + L.brainBurned;
    const expected = energy0 + L.sunlightIn - burned - L.digestionLoss - L.decayLoss;
    expect(Math.abs(sim.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
    expect(Math.abs(sim.matterAudit().total - matter0) / matter0).toBeLessThan(1e-9);
  });

  it("random catastrophes happen at about the asked rate, are the same every time for a seed, and different seeds differ", () => {
    const config = { ...CLIMATE, initialOrganisms: 40, catastropheKind: 4, catastropheEvery: 800, catastropheLength: 200 };
    const run = (seed: number): string => {
      const sim = new Simulation(seed, config);
      sim.run(20000);
      return JSON.stringify(sim.worldEvents.map((e) => [e.tick, e.kind]));
    };
    const a = run(5);
    expect(run(5)).toBe(a);
    expect(run(6)).not.toBe(a);
    const starts = (JSON.parse(a) as [number, string][]).filter(([, kind]) => kind !== "recovery").length;
    expect(starts).toBeGreaterThan(5); // about 20000 / (800 + the time each one lasts) ~ 15
    expect(starts).toBeLessThan(40);
  }, 60_000);

  it("world events survive saving and loading, and a catastrophe in progress carries on exactly", () => {
    const config = { ...CLIMATE, catastropheKind: 1, catastropheAt: 300, catastropheLength: 800, brainMode: 2, brainAddConnectionProb: 0.3 };
    const sim = new Simulation(8, config);
    sim.run(600); // half way through the ice age
    const loaded = Simulation.load(sim.save());
    expect(JSON.stringify(loaded.worldEvents)).toBe(JSON.stringify(sim.worldEvents));
    sim.run(700);
    loaded.run(700);
    expect(loaded.fingerprint()).toBe(sim.fingerprint());
    expect(loaded.worldEvents.map((e) => e.kind)).toEqual(["iceAge", "recovery"]);
  }, 60_000);

  it("does not change worlds that do not use it", () => {
    const a = new Simulation(3, { worldWidth: 128, worldHeight: 128, initialOrganisms: 80 });
    const b = new Simulation(3, { worldWidth: 128, worldHeight: 128, initialOrganisms: 80, catastropheKind: 0, catastropheAt: 500 });
    a.run(1000);
    b.run(1000);
    expect(a.fingerprint()).toBe(b.fingerprint());
  });

  it("rejects settings that make no sense", () => {
    expect(() => new Simulation(1, { catastropheKind: 1 })).toThrow(/need a climate/);
    expect(() => new Simulation(1, { catastropheKind: 4 })).toThrow(/need a climate/);
    expect(() => new Simulation(1, { catastropheKind: 3, meteorRadius: 0 })).toThrow(/meteorRadius/);
    expect(() => new Simulation(1, { catastropheKind: 7 })).toThrow(/catastropheKind/);
    expect(() => new Simulation(1, { catastropheKind: 3 })).not.toThrow();
  });
});
