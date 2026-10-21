import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

/** A small world with as many upkeep parts switched on as possible, so every branch of costBreakdown is used. */
const busy: Partial<SimConfig> = {
  worldWidth: 128,
  worldHeight: 128,
  initialOrganisms: 200,
  foodRegrowPerTick: 0.12,
  terrainMode: 1,
  climateMode: 1,
  thermalCostCoeff: 1.5,
  brainMode: 2,
  chemicals: 1,
  chemBodyEffects: 1,
  agingCoeff: 3,
  diseaseTransmission: 0.5,
  diseaseIntroEvery: 300,
  mutationLoadRate: 3,
  mutationLoadModel: 1,
  mutationLoadMend: 0.15,
  luckSpread: 0.08,
  torporSaving: 0.7,
  fatDepositRate: 0.3,
  multicellular: 1,
  cellTypes: 1,
  initialBond: 0.3,
  colonyScaleSaving: 0.3,
  drinking: 1,
  nutrientMode: 1,
};

const burned = (s: Simulation): number => {
  const L = s.ledger;
  return L.basalBurned + L.movementBurned + L.sensingBurned + L.attackBurned + L.armorBurned + L.brainBurned;
};

describe("cost breakdown (read only)", () => {
  it("its parts add up to the upkeep, and the activities to the total", () => {
    const sim = new Simulation(4, busy);
    sim.run(1500);
    const c = sim.costBreakdown();
    const parts = c.body + c.repair + c.torporGene + c.load + c.luck + c.toxinGene + c.colonySaving + c.signal + c.thirst + c.deficiency + c.wear + c.sickness + c.stressCalm + c.fat + c.torporRest + c.thermal;
    expect(parts).toBeCloseTo(c.upkeep, 12);
    expect(c.upkeep + c.movement + c.sensing + c.attack + c.armor + c.brain).toBeCloseTo(c.total, 12);
    // The parts that this world switches on are actually seen.
    for (const part of ["body", "repair", "load", "thermal", "thirst", "deficiency", "sickness", "fat", "brain", "movement"] as const) expect(c[part]).toBeGreaterThan(0);
    expect(c.colonySaving).toBeLessThan(0);
    expect(c.luck).not.toBe(0);
  }, 60_000);

  it("predicts what the ledger then books, to within 1%", () => {
    const sim = new Simulation(4, busy);
    sim.run(1500);
    let predicted = 0;
    const before = burned(sim);
    for (let t = 0; t < 100; t++) {
      predicted += sim.costBreakdown().total * sim.count;
      sim.step();
    }
    expect(predicted / (burned(sim) - before)).toBeCloseTo(1, 2);
  }, 60_000);

  it("changes nothing in the world", () => {
    const a = new Simulation(4, busy);
    const b = new Simulation(4, busy);
    for (let t = 0; t < 300; t++) {
      a.step();
      b.step();
      if (t % 10 === 0) b.costBreakdown();
    }
    expect(b.fingerprint()).toBe(a.fingerprint());
  }, 60_000);
});
