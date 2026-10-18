import { describe, expect, it } from "vitest";
import { GENE, GENE_COUNT } from "./genome";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

const BOND_SLOTS = 6;

/** A quiet world for hand-built colonies: no food growth, nobody breeds unless we make them. */
function quiet(extra: Partial<SimConfig> = {}): Partial<SimConfig> {
  return {
    worldWidth: 64,
    worldHeight: 64,
    initialOrganisms: 1,
    maxOrganisms: 200,
    multicellular: 1,
    foodRegrowPerTick: 0,
    initialFoodFraction: 0,
    reproThresholdPerSize: 1e9,
    initialEnergyFraction: 0.5,
    mutationRateMin: 0,
    mutationRateMax: 0,
    initialMutationRate: 0,
    metaMutationStd: 0,
    attackMin: 0,
    attackMax: 0,
    speciesEvery: 0,
    ...extra,
  };
}

/** Every bond is stored in both cells, nothing points past the living cells, and nobody is bonded to itself or twice to the same cell. */
function checkBonds(sim: Simulation): void {
  for (let i = 0; i < sim.count; i++) {
    const seen = new Set<number>();
    for (let k = 0; k < BOND_SLOTS; k++) {
      const p = sim.bondTo[i * BOND_SLOTS + k]!;
      if (p < 0) continue;
      expect(p, `cell ${i} slot ${k}`).toBeLessThan(sim.count);
      expect(p).not.toBe(i);
      expect(seen.has(p)).toBe(false);
      seen.add(p);
      let back = false;
      for (let m = 0; m < BOND_SLOTS; m++) if (sim.bondTo[p * BOND_SLOTS + m] === i) back = true;
      expect(back, `bond ${i} -> ${p} has no way back`).toBe(true);
    }
  }
}

/** Make a ready parent whose babies always (or never) stay attached. */
function breeder(bond: number, extra: Partial<SimConfig> = {}): Simulation {
  const sim = new Simulation(1, quiet({ initialBond: bond, ...extra }));
  sim.energy[0] = sim.threshold[0]! * 2;
  sim.nutrient.fill(1000);
  return sim;
}

/** A chain of `length` cells a bond-length apart, all bonded in a line, built by hand. */
function chain(sim: Simulation, length: number): void {
  const rest = sim.config.bondRestLength;
  for (let i = 0; i < length; i++) {
    sim.x[i] = 20 + i * rest;
    sim.y[i] = 30;
    sim.energy[i] = 10;
    if (i > 0) {
      sim.bondTo[i * BOND_SLOTS] = i - 1;
      const slot = i - 1 === 0 ? 0 : 1;
      sim.bondTo[(i - 1) * BOND_SLOTS + slot] = i;
    }
  }
}

describe("multicellularity: bonds and colonies", () => {
  it("is off by default: no bond arrays, and the bonding gene is not mutated", () => {
    const sim = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 30, foodRegrowPerTick: 0.3, initialFoodFraction: 1, initialEnergyFraction: 0.9 });
    expect(sim.bondTo).toHaveLength(0);
    sim.run(500);
    for (let i = 0; i < sim.count; i++) expect(sim.genes[i * GENE_COUNT + GENE.bond]).toBe(0);
    expect(sim.stats().colonies).toEqual({ count: 0, cells: 0, meanSize: 0, maxSize: 0 });
  });

  it("a baby stays attached with the chance given by its parent's bonding gene: always at 1, never at 0", () => {
    const stay = breeder(1);
    stay.step();
    expect(stay.count).toBe(2);
    expect(stay.bondTo[0 * BOND_SLOTS]).toBe(1);
    expect(stay.bondTo[1 * BOND_SLOTS]).toBe(0);
    checkBonds(stay);
    const leave = breeder(0);
    leave.step();
    expect(leave.count).toBe(2);
    expect(leave.bondTo[0]).toBe(-1);
    // About half the time at 0.5.
    let bonded = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const sim = new Simulation(seed, quiet({ initialBond: 0.5 }));
      sim.energy[0] = sim.threshold[0]! * 2;
      sim.nutrient.fill(1000);
      sim.step();
      if (sim.bondTo[0] !== -1) bonded++;
    }
    expect(bonded).toBeGreaterThan(70);
    expect(bonded).toBeLessThan(130);
  });

  it("a newborn sits one bond-length from its parent", () => {
    const sim = breeder(1);
    sim.step();
    const dx = sim.x[1]! - sim.x[0]!;
    const dy = sim.y[1]! - sim.y[0]!;
    expect(Math.sqrt(dx * dx + dy * dy)).toBeGreaterThan(sim.config.bondRestLength * 0.5);
    expect(Math.sqrt(dx * dx + dy * dy)).toBeLessThan(sim.config.bondRestLength * 1.6);
  });

  it("a cell holds at most bondLinksMax bonds and a colony at most colonyMax cells; extra babies float off alone", () => {
    const sim = new Simulation(2, quiet({ initialBond: 1, bondLinksMax: 2, colonyMax: 5, foodRegrowPerTick: 0.4, initialFoodFraction: 1, reproThresholdPerSize: 30, initialEnergyFraction: 0.95, initialOrganisms: 1 }));
    sim.nutrient.fill(1000);
    sim.run(1500);
    checkBonds(sim);
    const sizes = sim.colonySizes();
    expect(sim.count).toBeGreaterThan(10);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(5);
    expect(Math.max(...sizes)).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < sim.count; i++) {
      let links = 0;
      for (let k = 0; k < BOND_SLOTS; k++) if (sim.bondTo[i * BOND_SLOTS + k]! >= 0) links++;
      expect(links).toBeLessThanOrEqual(2);
    }
  });

  it("bonds stay correct when cells die and others are shuffled into their places", () => {
    const sim = new Simulation(3, quiet({ initialBond: 0.8, foodRegrowPerTick: 0.4, initialFoodFraction: 1, reproThresholdPerSize: 30, initialEnergyFraction: 0.95, initialOrganisms: 40 }));
    sim.nutrient.fill(1000);
    for (let block = 0; block < 12; block++) {
      sim.run(150);
      checkBonds(sim);
      // Kill a few cells at random places (the last one too).
      for (let i = 0; i < sim.count; i += 4) sim.energy[i] = 0;
      sim.step();
      checkBonds(sim);
    }
    expect(sim.totalDeaths).toBeGreaterThan(20);
  }, 60_000);

  it("springs hold a stretched colony together near the bond length", () => {
    const sim = new Simulation(1, quiet({ initialOrganisms: 5, initialSpeed: 0.1, speedMin: 0.1, speedMax: 0.1, bondAlign: 0, bondShare: 0 }));
    chain(sim, 5);
    // Pull the far end away.
    sim.x[4] = sim.x[4]! + 4;
    for (let t = 0; t < 40; t++) {
      for (let i = 0; i < 5; i++) sim.energy[i] = 1e6; // nobody starves during the test
      sim.step();
    }
    for (let i = 1; i < 5; i++) {
      const dx = sim.x[i]! - sim.x[i - 1]!;
      const dy = sim.y[i]! - sim.y[i - 1]!;
      expect(Math.sqrt(dx * dx + dy * dy)).toBeLessThan(sim.config.bondRestLength * 1.5);
    }
  });

  it("bonded cells turn toward their neighbors' heading, and a lone cell keeps its own", () => {
    const sim = new Simulation(1, quiet({ initialOrganisms: 3, bondAlign: 0.5, bondShare: 0, turnStd: 0 }));
    chain(sim, 2);
    sim.x[2] = 50;
    sim.y[2] = 50;
    sim.headingX[0] = 1;
    sim.headingY[0] = 0;
    sim.headingX[1] = 0;
    sim.headingY[1] = 1;
    sim.headingX[2] = -1;
    sim.headingY[2] = 0;
    for (let t = 0; t < 10; t++) {
      for (let i = 0; i < 3; i++) sim.energy[i] = 1e6;
      sim.step();
    }
    const angle = (i: number): number => Math.atan2(sim.headingY[i]!, sim.headingX[i]!);
    expect(Math.abs(angle(0) - angle(1))).toBeLessThan(0.6); // started a quarter turn apart
    expect(sim.headingX[2]).toBeLessThan(0.3); // the lone cell has only its own random wobble
  });

  it("bonded cells share energy: they move toward equal, and the total never changes", () => {
    const sim = new Simulation(1, quiet({ initialOrganisms: 3, bondShare: 0.5, bondAlign: 0, foodRegrowPerTick: 0 }));
    chain(sim, 3);
    sim.energy[0] = 20;
    sim.energy[1] = 2;
    sim.energy[2] = 2;
    // Look at the sharing step on its own.
    (sim as unknown as { shareEnergy(n: number): void }).shareEnergy(3);
    expect(sim.energy[0]! + sim.energy[1]! + sim.energy[2]!).toBeCloseTo(24, 12);
    expect(sim.energy[0]).toBeLessThan(20);
    expect(sim.energy[1]).toBeGreaterThan(2);
    for (let k = 0; k < 40; k++) (sim as unknown as { shareEnergy(n: number): void }).shareEnergy(3);
    expect(sim.energy[0]).toBeCloseTo(8, 3);
    expect(sim.energy[2]).toBeCloseTo(8, 3);
  });

  it("a starving cell is kept alive by its fed neighbor", () => {
    const alive = (share: number): boolean => {
      const sim = new Simulation(1, quiet({ initialOrganisms: 2, bondShare: share, bondAlign: 0, foodRegrowPerTick: 0 }));
      chain(sim, 2);
      sim.energy[0] = 1e4;
      sim.energy[1] = 0.05;
      sim.run(60);
      return sim.count === 2;
    };
    expect(alive(0)).toBe(false);
    expect(alive(0.3)).toBe(true);
  });

  it("colony statistics count colonies of two or more cells", () => {
    const sim = new Simulation(1, quiet({ initialOrganisms: 6, bondAlign: 0, bondShare: 0 }));
    chain(sim, 3); // cells 0-2 are a colony; 3 and 4 are bonded to each other; 5 is alone
    sim.bondTo[3 * BOND_SLOTS] = 4;
    sim.bondTo[4 * BOND_SLOTS] = 3;
    const stats = sim.stats().colonies;
    expect(stats.count).toBe(2);
    expect(stats.cells).toBe(5);
    expect(stats.maxSize).toBe(3);
    expect(stats.meanSize).toBeCloseTo(2.5, 9);
    expect(Array.from(sim.colonySizes())).toEqual([3, 3, 3, 2, 2, 1]);
  });

  it("works with terrain: nothing ends up in water", () => {
    const sim = new Simulation(4, quiet({ initialOrganisms: 3, terrainMode: 1, terrainWaterFraction: 0.3, initialBond: 1, foodRegrowPerTick: 0.4, initialFoodFraction: 1, reproThresholdPerSize: 30, initialEnergyFraction: 0.95 }));
    sim.nutrient.fill(1000);
    for (let block = 0; block < 6; block++) {
      sim.run(200);
      for (let i = 0; i < sim.count; i++) expect(sim.passable[Math.floor(sim.y[i]! / 8) * sim.gridWidth + Math.floor(sim.x[i]! / 8)]).toBe(1);
    }
    checkBonds(sim);
  }, 60_000);

  it("energy and matter are conserved, the run is deterministic, and a colony world saved mid-run carries on exactly", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 150, multicellular: 1, initialBond: 0.5, bondShare: 0.2, sexualReproduction: 1, mateRange: 10 } as Partial<SimConfig>;
    const a = new Simulation(5, config);
    const b = new Simulation(5, config);
    const energy0 = a.energyAudit().total;
    const matter0 = a.matterAudit().total;
    for (let block = 0; block < 4; block++) {
      a.run(500);
      b.run(500);
      checkBonds(a);
      const L = a.ledger;
      const burned = L.basalBurned + L.movementBurned + L.sensingBurned + L.attackBurned + L.armorBurned + L.brainBurned;
      const expected = energy0 + L.sunlightIn - burned - L.digestionLoss - L.decayLoss;
      expect(Math.abs(a.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
      expect(Math.abs(a.matterAudit().total - matter0) / matter0).toBeLessThan(1e-9);
    }
    expect(a.fingerprint()).toBe(b.fingerprint());
    expect(a.stats().colonies.count).toBeGreaterThan(0);
    const loaded = Simulation.load(a.save());
    expect(Array.from(loaded.bondTo.slice(0, a.count * BOND_SLOTS))).toEqual(Array.from(a.bondTo.slice(0, a.count * BOND_SLOTS)));
    a.run(600);
    loaded.run(600);
    checkBonds(loaded);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
  }, 120_000);

  it("rejects settings that make no sense", () => {
    expect(() => new Simulation(1, { multicellular: 1, brainMode: 2 })).toThrow(/do not support brains/);
    expect(() => new Simulation(1, { multicellular: 1, bondLinksMax: 9 })).toThrow(/bondLinksMax/);
    expect(() => new Simulation(1, { multicellular: 1, bondStiffness: 2 })).toThrow(/bondStiffness/);
    expect(() => new Simulation(1, { multicellular: 2 })).toThrow(/multicellular/);
  });
});
