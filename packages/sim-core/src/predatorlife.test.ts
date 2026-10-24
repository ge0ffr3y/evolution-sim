import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";
import { DEFAULT_CONFIG } from "./config";
import { GENE, GENE_COUNT } from "./genome";

// Phase 9 predator life: the gut (food is digested over time), rest, and prey condition. All off by default.

type Hidden = {
  digest(i: number, mass: number, energy: number): number;
  kill(attacker: number, prey: number): void;
  defendedBy(prey: number, attacker?: number): number;
  weakness(i: number): number;
  rested: Float32Array;
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
    const tired = new Simulation(4, { ...base, restSaving: 0.5, restBelow: 2 }); // founders go at normal pace (1): half the full saving
    const awake = new Simulation(4, base);
    tired.step();
    awake.step();
    for (let i = 0; i < tired.count; i++) expect(h(tired).rested[i]).toBeCloseTo((2 - tired.moveScale[i]!) / 2, 6); // graded by pace
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

describe("fighting back", () => {
  type F = { defendedBy(prey: number, attacker?: number): number; defense: Float32Array; attackPower: Float32Array };
  it("is off by default; on, an armed animal's weapons count toward its defense", () => {
    const make = (fightBack: number): Simulation => new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 2, speciesEvery: 0, fightBack });
    expect(DEFAULT_CONFIG.fightBack).toBe(0);
    expect(() => make(-1)).toThrow(/fightBack/);
    const off = make(0);
    const on = make(2);
    for (const sim of [off, on]) {
      sim.genes[GENE.attack] = 0.8; // animal 0 is armed
      sim.express(0);
    }
    const x = (sim: Simulation): F => sim as unknown as F;
    expect(x(off).defendedBy(0, 1)).toBeCloseTo(x(off).defense[0]!, 9); // (herds are off: a factor of 1)
    expect(x(on).defendedBy(0, 1)).toBeCloseTo(x(on).defense[0]! + 2 * x(on).attackPower[0]!, 9);
  });
});

describe("hunters pick the easiest prey in reach (preyChoice)", () => {
  type P = { considerPrey: (index: number, distSq: number) => void; pickAttacker: number; pickBest: number; pickBestDistSq: number; pickBestDefense: number; pickSizeLimit: number };
  const pick = (sim: Simulation, candidates: [number, number][]): number => {
    const x = sim as unknown as P;
    x.pickAttacker = 0;
    x.pickBest = -1;
    x.pickBestDistSq = Infinity;
    x.pickBestDefense = Infinity;
    x.pickSizeLimit = 100;
    for (const [index, distSq] of candidates) x.considerPrey(index, distSq);
    return x.pickBest;
  };
  // Hunter 0; prey 1 right beside it but well fed and grown; prey 2 further off and newborn (weak).
  const world = (extra: Partial<SimConfig> = {}): Simulation => {
    const sim = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 3, speciesEvery: 0, preyCondition: 1, ...extra });
    sim.energy[1] = sim.threshold[1]!;
    sim.age[1] = 1000;
    sim.energy[2] = sim.threshold[2]!;
    sim.age[2] = 0;
    return sim;
  };

  it("by default a hunter takes the nearest", () => {
    expect(DEFAULT_CONFIG.preyChoice).toBe(0);
    expect(pick(world(), [[1, 1], [2, 4]])).toBe(1);
    expect(() => world({ preyChoice: 2 })).toThrow(/preyChoice/);
  });

  it("with preyChoice 1 it takes the easiest, even if further off", () => {
    expect(pick(world({ preyChoice: 1 }), [[1, 1], [2, 4]])).toBe(2);
  });
});

describe("injury from failed attacks (attackInjury)", () => {
  type I = { hurt: Float64Array; defense: Float32Array; attackPower: Float32Array };
  const x = (sim: Simulation): I => sim as unknown as I;
  // Two armed animals on the same spot that cannot move and cannot be killed (huge defense): every attack fails.
  const duel = (attackInjury: number): Simulation => {
    const sim = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 2, speciesEvery: 0, attackInjury });
    const G = GENE_COUNT;
    sim.genes[GENE.attack] = 0.9;
    sim.genes[G + GENE.attack] = 0.5;
    sim.genes[GENE.speed] = 0;
    sim.genes[G + GENE.speed] = 0;
    sim.genes[G + GENE.size] = sim.genes[GENE.size]!; // the same size, so each can attack the other
    sim.express(0);
    sim.express(1);
    sim.x[1] = sim.x[0]!;
    sim.y[1] = sim.y[0]!;
    x(sim).defense[0] = 1e9;
    x(sim).defense[1] = 1e9;
    sim.energy[0] = sim.threshold[0]! * 0.5;
    sim.energy[1] = sim.threshold[1]! * 0.5;
    return sim;
  };

  it("is off by default and checked", () => {
    expect(DEFAULT_CONFIG.attackInjury).toBe(0);
    expect(() => new Simulation(1, { attackInjury: 1.5 })).toThrow(/attackInjury/);
  });

  it("a failed attack costs injury x breeding energy x the prey's share of attack power, paid as fighting", () => {
    const off = duel(0);
    const on = duel(0.2);
    const p0 = x(on).attackPower[0]!;
    const p1 = x(on).attackPower[1]!;
    const burnedBefore = on.ledger.attackBurned;
    off.step();
    on.step();
    const expected0 = 0.2 * on.threshold[0]! * (p1 / (p0 + p1));
    const expected1 = 0.2 * on.threshold[1]! * (p0 / (p0 + p1));
    expect(x(on).hurt[0]).toBeCloseTo(expected0, 6);
    expect(x(on).hurt[1]).toBeCloseTo(expected1, 6);
    expect(x(on).hurt[0]).toBeLessThan(x(on).hurt[1]!); // the weaker one gets hurt more
    // Everything else is the same (no extra random numbers), so the difference in energy is exactly the injury.
    expect(off.energy[0]! - on.energy[0]!).toBeCloseTo(expected0, 4);
    expect(on.ledger.attackBurned - burnedBefore - (off.ledger.attackBurned - burnedBefore)).toBeCloseTo(expected0 + expected1, 4);
  });
});

describe("young that move away (natalDispersal)", () => {
  const birth = (natalDispersal: number): { sim: Simulation; dx: number; dy: number; child: number } => {
    const sim = new Simulation(3, { worldWidth: 128, worldHeight: 128, initialOrganisms: 1, speciesEvery: 0, natalDispersal });
    sim.energy[0] = 2 * sim.threshold[0]!;
    sim.step();
    expect(sim.count).toBe(2);
    const W = 128;
    let dx = sim.x[1]! - sim.x[0]!;
    let dy = sim.y[1]! - sim.y[0]!;
    if (dx > W / 2) dx -= W;
    else if (dx < -W / 2) dx += W;
    if (dy > W / 2) dy -= W;
    else if (dy < -W / 2) dy += W;
    return { sim, dx, dy, child: 1 };
  };

  it("is off by default and checked: a baby is born on its parent's spot", () => {
    expect(DEFAULT_CONFIG.natalDispersal).toBe(0);
    expect(() => new Simulation(1, { worldWidth: 64, worldHeight: 64, natalDispersal: 40 })).toThrow(/natalDispersal/);
    const { dx, dy } = birth(0);
    expect(Math.abs(dx) + Math.abs(dy)).toBe(0);
  });

  it("on: the baby starts natalDispersal away, along the heading it was born with", () => {
    const { sim, dx, dy, child } = birth(6);
    expect(Math.sqrt(dx * dx + dy * dy)).toBeCloseTo(6, 4);
    expect(dx / 6).toBeCloseTo(sim.headingX[child]!, 4);
    expect(dy / 6).toBeCloseTo(sim.headingY[child]!, 4);
  });
});

describe("the books with injury and young that move away", () => {
  it("balance exactly, and a saved world carries on exactly", () => {
    const config: Partial<SimConfig> = { worldWidth: 128, worldHeight: 128, initialOrganisms: 250, speciesEvery: 0, initialAttack: 0.5, initialDiet: 0.6, gutMode: 1, preyCondition: 0.5, attackInjury: 0.3, natalDispersal: 5, nutrientMode: 2, sexualReproduction: 1, sexAcceptAny: 1 };
    const sim = new Simulation(12, config);
    sim.run(20);
    const e0 = sim.energyAudit().total;
    const m0 = sim.matterAudit().total;
    const L0 = { ...sim.ledger };
    sim.run(2000);
    const L = sim.ledger;
    expect(sim.count).toBeGreaterThan(0);
    expect(L.attackBurned - L0.attackBurned).toBeGreaterThan(0);
    const burned = (y: typeof L): number => y.basalBurned + y.movementBurned + y.sensingBurned + y.attackBurned + y.armorBurned + y.brainBurned;
    const expected = e0 + (L.sunlightIn - L0.sunlightIn) - (burned(L) - burned(L0)) - (L.digestionLoss - L0.digestionLoss) - (L.decayLoss - L0.decayLoss);
    expect(Math.abs(sim.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
    expect(Math.abs(sim.matterAudit().total - m0) / m0).toBeLessThan(1e-9);
    const copy = Simulation.load(sim.save());
    sim.run(300);
    copy.run(300);
    expect(copy.fingerprint()).toBe(sim.fingerprint());
  }, 120_000);
});
