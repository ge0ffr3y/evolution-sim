import { describe, expect, it } from "vitest";
import { GENE, GENE_COUNT } from "./genome";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

const BASE: Partial<SimConfig> = {
  worldWidth: 64,
  worldHeight: 64,
  initialOrganisms: 1,
  initialFoodFraction: 0,
  foodRegrowPerTick: 0,
  speciesEvery: 0,
  mutationRateMin: 0,
  mutationRateMax: 0,
  initialMutationRate: 0,
  metaMutationStd: 0,
};

/** What one organism pays in upkeep (the basal line of the ledger) in one tick at a given age. */
function upkeepAtAge(age: number, extra: Partial<SimConfig> = {}, lifespanGene?: number): number {
  const sim = new Simulation(1, { ...BASE, agingCoeff: 2, ...extra });
  if (lifespanGene !== undefined) sim.genes[GENE.lifespan] = lifespanGene;
  sim.express(0);
  sim.age[0] = age;
  sim.energy[0] = 20; // below the energy that makes an organism reproduce
  sim.step();
  return sim.ledger.basalBurned;
}

describe("aging", () => {
  it("is off by default: no lifespan arrays, and the gene is not mutated", () => {
    const sim = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 50, foodRegrowPerTick: 0.3, initialFoodFraction: 1, initialEnergyFraction: 0.9 });
    expect(sim.lifespan).toHaveLength(0);
    sim.run(500);
    const founder = sim.genes[GENE.lifespan]!;
    for (let i = 0; i < sim.count; i++) expect(sim.genes[i * GENE_COUNT + GENE.lifespan]).toBe(founder);
  });

  it("costs nothing extra before the prime, then rises with the square of how far past it", () => {
    const lifespan = 8000;
    const young = upkeepAtAge(100);
    const prime = upkeepAtAge(lifespan * 0.5 - 2);
    expect(prime).toBeCloseTo(young, 6);
    const base = young;
    // A quarter, a half and all of the way from the prime to the lifespan: extra = coeff x basal x worn^2.
    const quarter = upkeepAtAge(lifespan * 0.5 + 0.25 * lifespan * 0.5) - base;
    const half = upkeepAtAge(lifespan * 0.5 + 0.5 * lifespan * 0.5) - base;
    const full = upkeepAtAge(lifespan) - base;
    expect(full).toBeCloseTo(2 * base, 3); // at the lifespan: agingCoeff (2) x normal upkeep extra
    expect(half / full).toBeCloseTo(0.25, 2);
    expect(quarter / full).toBeCloseTo(0.0625, 2);
  });

  it("a longer lifespan costs more upkeep every tick, even when young", () => {
    const short = upkeepAtAge(10, {}, 0);
    const long = upkeepAtAge(10, {}, 1);
    expect(long).toBeGreaterThan(short);
    expect(long / short).toBeCloseTo(1.3, 3); // agingRepairCoeff 0.3 at the longest lifespan
  });

  it("old organisms really die of it: with strong aging nobody lives much past their lifespan", () => {
    const sim = new Simulation(2, { worldWidth: 128, worldHeight: 128, initialOrganisms: 200, agingCoeff: 30, initialLifespan: 1500, lifespanMin: 1500, lifespanMax: 1500, foodRegrowPerTick: 0.3, initialFoodFraction: 1, speciesEvery: 0 });
    sim.run(6000);
    let oldest = 0;
    for (let i = 0; i < sim.count; i++) oldest = Math.max(oldest, sim.age[i]!);
    expect(sim.count).toBeGreaterThan(20);
    expect(oldest).toBeLessThan(3000); // twice the lifespan is already hopeless
    const free = new Simulation(2, { worldWidth: 128, worldHeight: 128, initialOrganisms: 200, foodRegrowPerTick: 0.3, initialFoodFraction: 1, speciesEvery: 0 });
    free.run(6000);
    let oldestFree = 0;
    for (let i = 0; i < free.count; i++) oldestFree = Math.max(oldestFree, free.age[i]!);
    expect(oldestFree).toBeGreaterThan(oldest);
  }, 60_000);

  it("rejects settings that make no sense", () => {
    expect(() => new Simulation(1, { agingCoeff: -1 })).toThrow(/agingCoeff/);
    expect(() => new Simulation(1, { agingPrimeFraction: 1 })).toThrow(/agingPrimeFraction/);
    expect(() => new Simulation(1, { initialLifespan: 10 })).toThrow(/initial lifespan/);
  });
});

describe("litter size", () => {
  /** A ready parent alone in a rich world: how many babies does one birth make? */
  function birth(litter: number, extra: Partial<SimConfig> = {}): Simulation {
    const sim = new Simulation(1, { ...BASE, litterMax: 4, initialLitter: litter, ...extra });
    sim.energy[0] = sim.threshold[0]! * 2;
    sim.nutrient.fill(1000);
    sim.step();
    return sim;
  }

  it("is off by default: one baby per birth, and no litter arrays", () => {
    const sim = new Simulation(1, { ...BASE });
    expect(sim.litter).toHaveLength(0);
    sim.energy[0] = sim.threshold[0]! * 2;
    sim.step();
    expect(sim.count).toBe(2);
  });

  it("a litter gene of 3 makes 3 babies, and 1 makes one", () => {
    expect(birth(1).count).toBe(2);
    expect(birth(3).count).toBe(4);
  });

  it("the parent pays the same total however many babies there are, split between them", () => {
    const paid = (litter: number): number => {
      const sim = new Simulation(1, { ...BASE, litterMax: 4, initialLitter: litter });
      sim.energy[0] = sim.threshold[0]! * 2;
      sim.nutrient.fill(1000);
      const before = sim.energy[0]!;
      sim.step();
      return before - sim.energy[0]!;
    };
    expect(paid(3)).toBeCloseTo(paid(1), 3);
    // Each baby of a bigger litter starts with less.
    const one = birth(1);
    const three = birth(3);
    expect(three.energy[1]!).toBeLessThan(one.energy[1]!);
  });

  it("a fractional litter is rounded up or down at random, in the right proportion", () => {
    let total = 0;
    const trials = 300;
    for (let seed = 1; seed <= trials; seed++) {
      const sim = new Simulation(seed, { ...BASE, litterMax: 4, initialLitter: 1.5 });
      sim.energy[0] = sim.threshold[0]! * 2;
      sim.nutrient.fill(1000);
      sim.step();
      total += sim.count - 1;
    }
    expect(total / trials).toBeGreaterThan(1.35);
    expect(total / trials).toBeLessThan(1.65);
  });

  it("a baby that cannot afford its own body is not born: very big litters shrink to what the energy allows", () => {
    const sim = birth(4, { litterMax: 40, initialLitter: 40 });
    expect(sim.count).toBeLessThan(41);
    expect(sim.blockedBirths).toBeGreaterThan(0);
  });

  it("works with sexual reproduction too (the litter is the average of the parents')", () => {
    const sim = new Simulation(1, { ...BASE, initialOrganisms: 2, sexualReproduction: 1, litterMax: 4, initialLitter: 3, mateRange: 10 });
    for (const i of [0, 1]) {
      sim.energy[i] = sim.threshold[i]! * 2;
      sim.x[i] = 30 + i;
      sim.y[i] = 30;
    }
    sim.nutrient.fill(1000);
    sim.step();
    expect(sim.count).toBe(2 + 3);
  });

  it("energy and matter are conserved and the run is deterministic, with both features on and a save in the middle", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 150, agingCoeff: 3, litterMax: 3, initialLitter: 2, initialLifespan: 4000, brainMode: 2, brainAddConnectionProb: 0.3, sexualReproduction: 1, mateRange: 10 };
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
    a.run(600);
    loaded.run(600);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
  }, 120_000);

  it("rejects settings that make no sense", () => {
    expect(() => new Simulation(1, { litterMin: 0.5 })).toThrow(/litterMin/);
    expect(() => new Simulation(1, { litterMax: 3, initialLitter: 5 })).toThrow(/initial litter/);
  });
});
