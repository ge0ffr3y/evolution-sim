import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";
import { DEFAULT_CONFIG } from "./config";

// Phase 9 predator life: the gut (food is digested over time), rest, and prey condition. All off by default.

type Hidden = {
  digest(i: number, mass: number, energy: number): number;
  kill(attacker: number, prey: number): void;
  defendedBy(prey: number, attacker?: number): number;
  weakness(i: number): number;
  rested: Uint8Array;
  sickFor: Uint16Array;
  cellOf: Uint32Array;
};
const h = (sim: Simulation): Hidden => sim as unknown as Hidden;

describe("predator-life settings", () => {
  it("are all off by default, and checked", () => {
    expect(DEFAULT_CONFIG.gutMode).toBe(0);
    expect(DEFAULT_CONFIG.restSaving).toBe(0);
    expect(DEFAULT_CONFIG.preyCondition).toBe(0);
    expect(() => new Simulation(1, { gutMode: 2 })).toThrow(/gutMode/);
    expect(() => new Simulation(1, { restSaving: 0.5 })).toThrow(/brains/);
    expect(() => new Simulation(1, { preyCondition: 2 })).toThrow(/preyCondition/);
  });
});

describe("the gut", () => {
  const world = (extra: Partial<SimConfig> = {}): Simulation =>
    new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 2, speciesEvery: 0, gutMode: 1, ...extra });

  it("releases a meal as energy over time, at gutDigestRate x metabolism x size a tick", () => {
    const sim = world();
    const rate = sim.config.gutDigestRate * sim.metabolism[0]! * sim.size[0]!;
    const first = h(sim).digest(0, 1, 10 * rate); // a dense meal: ten ticks' worth
    expect(first).toBeCloseTo(rate, 9);
    expect(sim.gutEnergy[0]).toBeCloseTo(9 * rate, 9);
    expect(sim.gutMass[0]).toBeCloseTo(0.9, 9); // the food leaves in step with its energy
    let total = first;
    for (let t = 0; t < 20; t++) total += h(sim).digest(0, 0, 0);
    expect(total).toBeCloseTo(10 * rate, 9); // all of it, and no more
    expect(sim.gutEnergy[0]).toBe(0);
    expect(sim.gutMass[0]).toBe(0);
  });

  it("a full stomach eats nothing", () => {
    const sim = world({ initialOrganisms: 1 });
    sim.gutMass[0] = sim.config.gutCapacity * sim.bodyMatter[0]!;
    sim.gutEnergy[0] = 1;
    const before = sim.plantTaken[0]!;
    sim.step();
    expect(sim.plantTaken[0]).toBe(before);
  });

  it("the food left in a stomach goes into the carcass", () => {
    const sim = world();
    sim.gutEnergy[1] = 3;
    sim.gutMass[1] = 0.5;
    const cell = h(sim).cellOf[1]!;
    const before = sim.corpseEnergy[cell]!;
    const body = sim.bodyEnergy[1]! + sim.energy[1]!;
    h(sim).kill(0, 1);
    expect(sim.corpseEnergy[cell]! - before).toBeCloseTo(body + 3, 9);
    expect(sim.gutEnergy[1]).toBe(0);
  });
});

describe("prey condition", () => {
  const world = (extra: Partial<SimConfig> = {}): Simulation =>
    new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 2, speciesEvery: 0, youngTicks: 100, ...extra });

  it("weakness is the worst of hunger, sickness, age past its prime and youth", () => {
    const sim = world({ diseaseTransmission: 0.5, agingCoeff: 1 });
    const x = h(sim);
    sim.age[1] = 1000;
    sim.energy[1] = sim.threshold[1]!; // well fed, grown up, not old yet
    if (sim.age[1]! > 0.5 * sim.lifespan[1]!) sim.age[1] = Math.floor(0.1 * sim.lifespan[1]!) + 100;
    expect(x.weakness(1)).toBe(0);
    sim.energy[1] = 0.25 * sim.threshold[1]!;
    expect(x.weakness(1)).toBeCloseTo(0.75, 6); // hungry
    sim.energy[1] = sim.threshold[1]!;
    sim.age[1] = 25;
    expect(x.weakness(1)).toBeCloseTo(0.75, 6); // young
    sim.age[1] = 1000;
    x.sickFor[1] = 5;
    expect(x.weakness(1)).toBe(1); // sick
  });

  it("weak prey defend less (1 - preyCondition x weakness); off by default", () => {
    const off = world();
    off.age[1] = 0;
    expect(h(off).defendedBy(1, 0)).toBe(h(off).defendedBy(1));
    const sim = world({ preyCondition: 0.5 });
    sim.energy[1] = sim.threshold[1]!;
    sim.age[1] = 1000;
    const strong = h(sim).defendedBy(1, 0);
    sim.age[1] = 0; // a newborn
    expect(h(sim).defendedBy(1, 0) / strong).toBeCloseTo(0.5, 6);
  });
});

describe("rest", () => {
  it("an animal that barely moves and eats nothing pays less upkeep, and the books show it", () => {
    const base: Partial<SimConfig> = { worldWidth: 64, worldHeight: 64, initialOrganisms: 30, speciesEvery: 0, brainMode: 2, initialFoodFraction: 0, foodRegrowPerTick: 0 };
    const tired = new Simulation(4, { ...base, restSaving: 0.5, restBelow: 1.5 }); // everyone below 1.5 (founders go at normal pace, 1) counts as resting
    const awake = new Simulation(4, base);
    tired.step();
    awake.step();
    let rested = 0;
    for (let i = 0; i < tired.count; i++) rested += h(tired).rested[i]!;
    expect(rested).toBeGreaterThan(0);
    expect(tired.ledger.basalBurned).toBeLessThan(awake.ledger.basalBurned);
    expect(tired.costBreakdown().torporRest).toBeLessThan(0); // counted as a saving from rest
  });
});

describe("the books with all three on", () => {
  it("balance exactly, and a saved world carries on exactly", () => {
    const config: Partial<SimConfig> = { worldWidth: 128, worldHeight: 128, initialOrganisms: 250, speciesEvery: 0, brainMode: 2, initialAttack: 0.5, initialDiet: 0.4, gutMode: 1, restSaving: 0.4, preyCondition: 0.5, nutrientMode: 2, fatDepositRate: 0.5, initialFat: 0.3 };
    const sim = new Simulation(11, config);
    sim.run(20);
    const e0 = sim.energyAudit().total;
    const m0 = sim.matterAudit().total;
    const L0 = { ...sim.ledger };
    sim.run(2000);
    const L = sim.ledger;
    expect(sim.count).toBeGreaterThan(0);
    expect(L.attackBurned - L0.attackBurned).toBeGreaterThan(0);
    const burned = (x: typeof L): number => x.basalBurned + x.movementBurned + x.sensingBurned + x.attackBurned + x.armorBurned + x.brainBurned;
    const expected = e0 + (L.sunlightIn - L0.sunlightIn) - (burned(L) - burned(L0)) - (L.digestionLoss - L0.digestionLoss) - (L.decayLoss - L0.decayLoss);
    expect(Math.abs(sim.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
    expect(Math.abs(sim.matterAudit().total - m0) / m0).toBeLessThan(1e-9);
    const copy = Simulation.load(sim.save());
    sim.run(300);
    copy.run(300);
    expect(copy.fingerprint()).toBe(sim.fingerprint());
  }, 120_000);
});
