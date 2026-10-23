import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";
import { GENE } from "./genome";
import { DEFAULT_CONFIG } from "./config";

// Three optional settings that could make a meat-eating life pay (Phase 9, carnivore screen).

const small = (extra: Partial<SimConfig> = {}): Simulation =>
  new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 2, speciesEvery: 0, ...extra });

describe("carnivory settings", () => {
  it("are all off by default and must lie between 0 and 1", () => {
    expect(DEFAULT_CONFIG.meatColdKeep).toBe(0);
    expect(DEFAULT_CONFIG.preyHungerDefense).toBe(0);
    expect(DEFAULT_CONFIG.weaponGrazeLoss).toBe(0);
    expect(() => small({ meatColdKeep: 1.5 })).toThrow(/meatColdKeep/);
    expect(() => small({ preyHungerDefense: -0.1 })).toThrow(/preyHungerDefense/);
    expect(() => small({ weaponGrazeLoss: 2 })).toThrow(/weaponGrazeLoss/);
  });
});

describe("meat keeps in the cold", () => {
  // A climate world with nobody in it, so only rot changes the corpses.
  const rotShares = (keep: number): { share: number; expected: number }[] => {
    const sim = new Simulation(4, { worldWidth: 128, worldHeight: 128, initialOrganisms: 0, speciesEvery: 0, climateMode: 1, meatColdKeep: keep });
    sim.step();
    const cells = sim.corpseMatter.length;
    for (let cell = 0; cell < cells; cell++) {
      sim.corpseMatter[cell] = 1;
      sim.corpseEnergy[cell] = 10;
    }
    sim.step();
    const c = sim.config;
    const out: { share: number; expected: number }[] = [];
    for (let cell = 0; cell < cells; cell += 97) {
      let cold = (c.plantTempOptimum - sim.temperature[cell]!) / c.plantTempTolerance;
      cold = cold < 0 ? 0 : cold > 1 ? 1 : cold;
      out.push({ share: 1 - sim.corpseEnergy[cell]! / 10, expected: c.meatDecayRate * (1 - keep * cold) });
    }
    return out;
  };

  it("is off by default: meat rots at the same rate everywhere", () => {
    for (const { share } of rotShares(0)) expect(share).toBeCloseTo(DEFAULT_CONFIG.meatDecayRate, 12);
  });

  it("slows rot in proportion to how cold it is", () => {
    const shares = rotShares(0.8);
    for (const { share, expected } of shares) expect(share).toBeCloseTo(expected, 12);
    // The world has both warm and cold places, so the rates really differ.
    const values = shares.map((s) => s.share);
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThan(0.001);
  });
});

describe("hungry prey defend less", () => {
  type Hidden = { defendedBy(prey: number): number };
  const defense = (sim: Simulation, fed: number): number => {
    sim.energy[1] = fed * sim.threshold[1]!;
    return (sim as unknown as Hidden).defendedBy(1);
  };

  it("is off by default: hunger makes no difference", () => {
    const sim = small();
    expect(defense(sim, 0)).toBe(defense(sim, 1));
  });

  it("a starving animal defends at (1 - setting) of a well-fed one's strength", () => {
    const sim = small({ preyHungerDefense: 0.6 });
    const full = defense(sim, 1);
    expect(defense(sim, 2)).toBe(full); // fed counts only up to 1
    expect(defense(sim, 0) / full).toBeCloseTo(0.4, 6);
    expect(defense(sim, 0.5) / full).toBeCloseTo(0.7, 6);
  });
});

describe("weapons get in the way of grazing", () => {
  type Bites = { plantBite: Float32Array; meatBite: Float32Array; plantWeight: Float32Array };
  const bites = (loss: number, attackGene: number): Bites => {
    const sim = small({ weaponGrazeLoss: loss });
    sim.genes[GENE.diet] = 0.2;
    sim.genes[GENE.attack] = attackGene;
    sim.express(0);
    const b = sim as unknown as Bites;
    return { plantBite: b.plantBite.slice(0, 1), meatBite: b.meatBite.slice(0, 1), plantWeight: b.plantWeight.slice(0, 1) };
  };

  it("is off by default: weapons cost no grazing", () => {
    expect(bites(0, 1).plantBite[0]).toBe(bites(0, 0).plantBite[0]);
  });

  it("shrinks only plant bites, by the setting times the attack gene", () => {
    const unarmed = bites(0.5, 0);
    const armed = bites(0.5, 0.8);
    expect(armed.plantBite[0]! / unarmed.plantBite[0]!).toBeCloseTo(1 - 0.5 * 0.8, 6);
    expect(armed.plantWeight[0]! / unarmed.plantWeight[0]!).toBeCloseTo(1 - 0.5 * 0.8, 6);
    expect(armed.meatBite[0]).toBe(unarmed.meatBite[0]);
  });
});

describe("the books still balance with all three on", () => {
  it("conserves energy and matter exactly in a climate world with hunting", () => {
    const sim = new Simulation(3, {
      worldWidth: 128, worldHeight: 128, initialOrganisms: 300, speciesEvery: 0, climateMode: 1,
      initialAttack: 0.5, initialDiet: 0.3, meatColdKeep: 0.8, preyHungerDefense: 0.6, weaponGrazeLoss: 0.5,
    });
    sim.run(20);
    const e0 = sim.energyAudit().total;
    const m0 = sim.matterAudit().total;
    const L0 = { ...sim.ledger };
    sim.run(3000);
    const L = sim.ledger;
    expect(L.attackBurned - L0.attackBurned).toBeGreaterThan(0); // hunting really happened
    expect(sim.count).toBeGreaterThan(0);
    const burned = (x: typeof L): number => x.basalBurned + x.movementBurned + x.sensingBurned + x.attackBurned + x.armorBurned + x.brainBurned;
    const expected = e0 + (L.sunlightIn - L0.sunlightIn) - (burned(L) - burned(L0)) - (L.digestionLoss - L0.digestionLoss) - (L.decayLoss - L0.decayLoss);
    expect(Math.abs(sim.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
    expect(Math.abs(sim.matterAudit().total - m0) / m0).toBeLessThan(1e-9);
  }, 60_000);
});

describe("spare your own parent and young", () => {
  type Hidden = {
    considerPrey: (index: number, distSq: number) => void;
    pickAttacker: number;
    pickBest: number;
    pickBestDistSq: number;
    pickSizeLimit: number;
    parentId: Uint32Array;
    parent2Id: Uint32Array;
  };
  // Three animals: 0 is the hunter; 1 and 2 are strangers until the test makes one of them family.
  const picks = (sim: Simulation, target: number): boolean => {
    const h = sim as unknown as Hidden;
    h.pickAttacker = 0;
    h.pickBest = -1;
    h.pickBestDistSq = Infinity;
    h.pickSizeLimit = 100;
    h.considerPrey(target, 1);
    return h.pickBest === target;
  };
  const world = (extra: Partial<SimConfig> = {}): Simulation =>
    new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 3, speciesEvery: 0, ...extra });

  it("is off by default: a hunter attacks its own young like anyone else", () => {
    const sim = world();
    (sim as unknown as Hidden).parentId[1] = sim.id[0]!;
    expect(picks(sim, 1)).toBe(true);
  });

  it("spares its own child and its own parent, and still attacks a stranger", () => {
    const sim = world({ spareFamily: 1 });
    const h = sim as unknown as Hidden;
    h.parentId[1] = sim.id[0]!; // 1 is the hunter's child
    expect(picks(sim, 1)).toBe(false);
    expect(picks(sim, 2)).toBe(true);
    h.parentId[1] = 0;
    h.parentId[0] = sim.id[2]!; // 2 is the hunter's parent
    expect(picks(sim, 2)).toBe(false);
    expect(picks(sim, 1)).toBe(true);
  });

  it("with sex, spares the young it fathered as a second parent too", () => {
    const sim = world({ spareFamily: 1, sexualReproduction: 1 });
    (sim as unknown as Hidden).parent2Id[1] = sim.id[0]!;
    expect(picks(sim, 1)).toBe(false);
  });

  it("must be 0 or 1", () => {
    expect(DEFAULT_CONFIG.spareFamily).toBe(0);
    expect(() => world({ spareFamily: 0.5 })).toThrow(/spareFamily/);
  });

  it("the books still balance in a hunting world with it on", () => {
    const sim = new Simulation(5, { worldWidth: 128, worldHeight: 128, initialOrganisms: 300, speciesEvery: 0, initialAttack: 0.5, initialDiet: 0.3, spareFamily: 1 });
    sim.run(20);
    const e0 = sim.energyAudit().total;
    const m0 = sim.matterAudit().total;
    const L0 = { ...sim.ledger };
    sim.run(2000);
    const L = sim.ledger;
    expect(sim.count).toBeGreaterThan(0);
    const burned = (x: typeof L): number => x.basalBurned + x.movementBurned + x.sensingBurned + x.attackBurned + x.armorBurned + x.brainBurned;
    const expected = e0 + (L.sunlightIn - L0.sunlightIn) - (burned(L) - burned(L0)) - (L.digestionLoss - L0.digestionLoss) - (L.decayLoss - L0.decayLoss);
    expect(Math.abs(sim.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
    expect(Math.abs(sim.matterAudit().total - m0) / m0).toBeLessThan(1e-9);
  }, 60_000);
});
