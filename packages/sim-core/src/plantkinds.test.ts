import { describe, expect, it } from "vitest";
import { INPUT, OUTPUT, OUTPUT_START, setConnection } from "./brain";
import { GENE, GENE_COUNT } from "./genome";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

function quiet(extra: Partial<SimConfig> = {}): Partial<SimConfig> {
  return {
    worldWidth: 128,
    worldHeight: 128,
    initialOrganisms: 1,
    maxOrganisms: 200,
    foodRegrowPerTick: 0,
    initialFoodFraction: 0,
    reproThresholdPerSize: 1e9,
    initialEnergyFraction: 0.5,
    mutationRateMin: 0,
    mutationRateMax: 0,
    initialMutationRate: 0,
    metaMutationStd: 0,
    speciesEvery: 0,
    turnStd: 0,
    ...extra,
  };
}

const internals = (sim: Simulation): { plantTypeOf: Uint8Array } => sim as unknown as { plantTypeOf: Uint8Array };

describe("kinds of plant", () => {
  it("are off by default, and reject nonsense", () => {
    const sim = new Simulation(1, quiet());
    expect(internals(sim).plantTypeOf).toHaveLength(0);
    expect(() => new Simulation(1, { plantTypes: 7 })).toThrow(/plantTypes/);
    expect(() => new Simulation(1, { plantTypes: 3, plantTypeScale: 5 })).toThrow(/plantTypeScale/);
    expect(() => new Simulation(1, { plantTypes: 3 })).toThrow(/needs a climate/);
    expect(() => new Simulation(1, { plantTypes: 3, plantTypePhase: 0 })).not.toThrow();
  });

  it("each cell grows one kind, in patches, with about the same number of cells of each", () => {
    for (const kinds of [3, 5]) {
      const sim = new Simulation(2, quiet({ plantTypes: kinds, plantTypePhase: 0 }));
      const map = internals(sim).plantTypeOf;
      const counts = new Array<number>(kinds).fill(0);
      for (const k of map) counts[k]!++;
      for (const n of counts) expect(Math.abs(n - map.length / kinds)).toBeLessThan(map.length * 0.05);
      // Patches: most neighbors share the kind (random assignment would give 1 / kinds).
      const gw = sim.gridWidth;
      let same = 0;
      let pairs = 0;
      for (let cell = 0; cell < map.length - 1; cell++) {
        if ((cell + 1) % gw === 0) continue;
        pairs++;
        if (map[cell] === map[cell + 1]) same++;
      }
      expect(same / pairs).toBeGreaterThan(0.6);
    }
  });

  it("the same seed gives the same map, and another seed a different one", () => {
    const a = new Simulation(2, quiet({ plantTypes: 3, plantTypePhase: 0 }));
    const b = new Simulation(2, quiet({ plantTypes: 3, plantTypePhase: 0 }));
    const c = new Simulation(3, quiet({ plantTypes: 3, plantTypePhase: 0 }));
    expect(Array.from(internals(a).plantTypeOf)).toEqual(Array.from(internals(b).plantTypeOf));
    expect(Array.from(internals(a).plantTypeOf)).not.toEqual(Array.from(internals(c).plantTypeOf));
  });

  function gained(palate: number, kind: number): number {
    const sim = new Simulation(1, quiet({ plantTypes: 3, plantTypePhase: 0, plantPalateWidth: 0.5, plantPalateFloor: 0.1 }));
    sim.genes[GENE.palate] = palate;
    sim.genes[GENE.diet] = 0;
    sim.express(0);
    sim.x[0] = 30;
    sim.y[0] = 30;
    sim.speed[0] = 0;
    const cell = Math.floor(30 / sim.config.foodCellSize) * sim.gridWidth + Math.floor(30 / sim.config.foodCellSize);
    internals(sim).plantTypeOf[cell] = kind;
    sim.food[cell] = 50;
    sim.step();
    return sim.plantTaken[0]!;
  }

  it("an animal digests its favorite kind best, and falls off in a straight line to a floor", () => {
    const best = gained(0, 0);
    expect(best).toBeGreaterThan(0);
    expect(gained(0.25, 0) / best).toBeCloseTo(0.5, 4); // half a kind-spacing away: half as well
    expect(gained(0.5, 0) / best).toBeCloseTo(0.1, 4); // a whole kind-spacing (0.5) away: the floor
    expect(gained(1, 0) / best).toBeCloseTo(0.1, 4);
    expect(gained(1, 2) / best).toBeCloseTo(1, 4); // the last kind suits the last palate
    expect(gained(0.5, 1) / best).toBeCloseTo(1, 4);
  });

  it("being good at one kind costs you the others: no palate digests two neighboring kinds both better than half as well", () => {
    const best = gained(0, 0);
    for (let step = 0; step <= 20; step++) {
      const palate = step / 20;
      const worstOfTwo = Math.min(gained(palate, 0), gained(palate, 1)) / best;
      expect(worstOfTwo).toBeLessThanOrEqual(0.5 + 1e-6);
    }
    // The middle palate is the best compromise between the first two kinds, and it is worse at the third.
    expect(gained(0.25, 2)).toBeCloseTo(best * 0.1, 5);
  });

  it("brains smell plants in proportion to how well they can digest them", () => {
    const smelled = (palate: number): number => {
      const sim = new Simulation(1, quiet({ plantTypes: 3, plantTypePhase: 0, brainMode: 2, brainFounderReflex: 0, brainEvery: 1, brainVisionRange: 0 }));
      sim.brainCount[0] = setConnection(sim.brainFrom, sim.brainTo, sim.brainWeight, 0, 0, INPUT.bias, OUTPUT_START + OUTPUT.speed, 1);
      (sim as unknown as { refreshBrain(i: number): void }).refreshBrain(0);
      sim.genes[GENE.palate] = palate;
      sim.x[0] = 30;
      sim.y[0] = 30;
      sim.speed[0] = 0;
      const cell = Math.floor(30 / sim.config.foodCellSize) * sim.gridWidth + Math.floor(30 / sim.config.foodCellSize);
      internals(sim).plantTypeOf[cell] = 0;
      sim.food[cell] = sim.config.foodCap;
      sim.traceId = sim.id[0]!;
      sim.step();
      return sim.describe(0).brain!.activity!.inputs[INPUT.plantHere]!;
    };
    expect(smelled(0)).toBeGreaterThan(smelled(0.25));
    expect(smelled(0.25)).toBeGreaterThan(smelled(1));
  });

  it("with seasons, each kind peaks at a different time of the year", () => {
    const sim = new Simulation(2, quiet({ plantTypes: 3, climateMode: 1, yearLength: 1200, seasonGrowthSwing: 1, plantTypePhase: 1, baseTemperature: 0.65, latitudeCooling: 0, plantTempTolerance: 5 }));
    const map = internals(sim).plantTypeOf;
    const peak: number[] = [0, 0, 0];
    const best: number[] = [-1, -1, -1];
    for (let t = 0; t < 1200; t++) {
      sim.step();
      for (let kind = 0; kind < 3; kind++) {
        const cell = map.indexOf(kind);
        if (sim.growthFactor[cell]! > best[kind]!) {
          best[kind] = sim.growthFactor[cell]!;
          peak[kind] = t;
        }
      }
    }
    // The peaks are spread a third of a year (400 ticks) apart.
    const gap = (a: number, b: number): number => { const d = Math.abs(a - b); return Math.min(d, 1200 - d); };
    expect(gap(peak[0]!, peak[1]!)).toBeGreaterThan(300);
    expect(gap(peak[0]!, peak[1]!)).toBeLessThan(500);
    expect(gap(peak[1]!, peak[2]!)).toBeGreaterThan(300);
  });
});

describe("founder spread", () => {
  const genesOf = (sim: Simulation, gene: number): number[] => Array.from({ length: sim.count }, (_, i) => sim.genes[i * GENE_COUNT + gene]!);
  it("gives the founders a spread of values for the newer genes that are on, and leaves the rest alone", () => {
    const sim = new Simulation(4, { initialOrganisms: 100, founderSpread: 0.6, sexualReproduction: 2, kinDistance: 0.1, kinTolerance: 1, fatDepositRate: 0.5 });
    for (const gene of [GENE.tolerance, GENE.sex, GENE.fat]) {
      const values = genesOf(sim, gene);
      expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.3);
      expect(Math.max(...values)).toBeLessThanOrEqual(0.6);
    }
    for (const gene of [GENE.torpor, GENE.palate]) expect(new Set(genesOf(sim, gene)).size).toBe(1); // not switched on: untouched
    const plain = new Simulation(4, { initialOrganisms: 100, sexualReproduction: 2 });
    expect(new Set(genesOf(plain, GENE.sex)).size).toBe(1);
    expect(() => new Simulation(1, { founderSpread: 2 })).toThrow(/founderSpread/);
  });
});

describe("kinds of plant together with the rest", () => {
  it("are deterministic, conserve energy and matter, and a saved world carries on exactly", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 200, plantTypes: 4, climateMode: 1, yearLength: 1500, founderSpread: 0.5, mutationRateMin: 0.02, initialMutationRate: 0.02, brainMode: 2, foodRegrowPerTick: 0.05 } as Partial<SimConfig>;
    const a = new Simulation(8, config);
    const b = new Simulation(8, config);
    const energy0 = a.energyAudit().total;
    const matter0 = a.matterAudit().total;
    a.run(2500);
    b.run(2500);
    const L = a.ledger;
    const burned = L.basalBurned + L.movementBurned + L.sensingBurned + L.attackBurned + L.armorBurned + L.brainBurned;
    const expected = energy0 + L.sunlightIn - burned - L.digestionLoss - L.decayLoss;
    expect(Math.abs(a.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
    expect(Math.abs(a.matterAudit().total - matter0) / matter0).toBeLessThan(1e-9);
    expect(a.fingerprint()).toBe(b.fingerprint());
    const loaded = Simulation.load(a.save());
    a.run(500);
    loaded.run(500);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
  }, 90_000);
});
