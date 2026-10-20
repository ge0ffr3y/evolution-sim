import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

type Books = { energy: number; matter: number; ledger: Simulation["ledger"] };
const bookmark = (sim: Simulation): Books => ({ energy: sim.energyAudit().total, matter: sim.matterAudit().total, ledger: { ...sim.ledger } });

/** Since the bookmark, energy and matter both balance to a billionth. */
function expectBooksBalance(sim: Simulation, from: Books): void {
  const L = sim.ledger;
  const B = from.ledger;
  const burned = (x: Simulation["ledger"]): number => x.basalBurned + x.movementBurned + x.sensingBurned + x.attackBurned + x.armorBurned + x.brainBurned;
  const expected = from.energy + (L.sunlightIn - B.sunlightIn) - (burned(L) - burned(B)) - (L.digestionLoss - B.digestionLoss) - (L.decayLoss - B.decayLoss);
  expect(Math.abs(sim.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
  expect(Math.abs(sim.matterAudit().total - from.matter) / from.matter).toBeLessThan(1e-9);
}

/** One animal alone on one big patch of plants, for watching single ticks. */
const PATCH: Partial<SimConfig> = {
  worldWidth: 16,
  worldHeight: 16,
  foodCellSize: 16,
  fertilityScale: 1,
  fertilityVariation: 0,
  speedMax: 4,
  senseRangeMax: 3,
  initialOrganisms: 1,
  initialFoodFraction: 1,
  initialNutrientPerCell: 100,
  nutrientMode: 1,
  speciesEvery: 0,
};

describe("nutrients through food", () => {
  it("is off by default: no stores, and the matter audit shows none", () => {
    const sim = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 20 });
    expect(sim.nutrientStore).toHaveLength(0);
    sim.run(50);
    expect(sim.matterAudit().stores).toBe(0);
  });

  it("founders start with a store taken from the soil under them", () => {
    const sim = new Simulation(1, { ...PATCH, founderNutrient: 2 });
    expect(sim.nutrientStore[0]).toBeCloseTo(2 * sim.bodyMatter[0]!, 12);
    expect(sim.nutrient[0]).toBeCloseTo(100 - 2 * sim.bodyMatter[0]!, 12);
  });

  it("eating puts a share of the plant into the store, the rest becomes dung, and some of the store is lost as dung each tick", () => {
    const sim = new Simulation(1, { ...PATCH, plantAssimilation: 0.1, nutrientTurnover: 0.01, founderNutrient: 0, nutrientStoreCap: 100 });
    const detritus0 = sim.detritus[0]!;
    const plants0 = sim.food[0]!;
    sim.step();
    const eaten = plants0 - sim.food[0]! + (sim.ledger.sunlightIn / sim.config.energyPerFood); // plants regrew a little after the meal
    const kept = sim.nutrientStore[0]!;
    expect(kept).toBeGreaterThan(0);
    expect(kept).toBeCloseTo(eaten * 0.1 * 0.99, 9);
    // Everything else it ate (and the turnover) went onto the ground; a little detritus has rotted to soil this tick.
    const toGround = eaten - kept;
    expect(sim.detritus[0]! - detritus0).toBeCloseTo(toGround * (1 - sim.config.detritusMineralizeRate) - detritus0 * sim.config.detritusMineralizeRate, 9);
  });

  it("a store above the cap spills out at once", () => {
    const sim = new Simulation(1, { ...PATCH, nutrientStoreCap: 2, nutrientTurnover: 0 });
    sim.nutrientStore[0] = 50;
    sim.step();
    expect(sim.nutrientStore[0]).toBeCloseTo(2 * sim.bodyMatter[0]!, 12);
  });

  it("babies are built from the parent's store, not the soil; a parent with too little store cannot breed", () => {
    const ready = (store: number, soil: number): Simulation => {
      const sim = new Simulation(1, { ...PATCH, initialNutrientPerCell: soil, founderNutrient: 0, provisionShare: 0.25, nutrientTurnover: 0, nutrientStoreCap: 1000 });
      sim.energy[0] = sim.threshold[0]! * 1.5;
      sim.nutrientStore[0] = store;
      return sim;
    };
    // Plenty in the store, bare soil: a baby is born, and the soil is not touched by the birth.
    const fed = ready(10, 0);
    fed.step();
    expect(fed.totalBirths).toBe(1);
    const body = fed.bodyMatter[1]!;
    // The parent paid the body, then gave a quarter of what was left.
    expect(fed.nutrientStore[1]).toBeCloseTo((10 + (fed.nutrientStore[0]! + fed.nutrientStore[1]! + body - 10) - body) * 0.25, 1);
    expect(fed.nutrientStore[0]! + fed.nutrientStore[1]!).toBeLessThan(10 - body + 1); // (plus a little eaten this tick)
    // An empty store on rich soil: no baby, and it is counted as short of matter.
    const lean = ready(0, 1000);
    lean.step();
    expect(lean.totalBirths).toBe(0);
    expect(lean.blockedBirthsSoil).toBe(1);
  });

  it("a well-fed parent's baby starts with more store than a lean parent's baby", () => {
    const babyStore = (parentStore: number): number => {
      const sim = new Simulation(1, { ...PATCH, founderNutrient: 0, provisionShare: 0.25, nutrientTurnover: 0, nutrientStoreCap: 1000, plantAssimilation: 0 });
      sim.energy[0] = sim.threshold[0]! * 1.5;
      sim.nutrientStore[0] = parentStore;
      sim.step();
      return sim.nutrientStore[1]!;
    };
    expect(babyStore(20)).toBeGreaterThan(babyStore(2) * 5);
  });

  it("an animal short of nutrient pays more upkeep, in proportion to how short it is", () => {
    const upkeep = (store: number): number => {
      const sim = new Simulation(1, { ...PATCH, initialFoodFraction: 0, foodRegrowPerTick: 0, nutrientTurnover: 0, deficiencyBelow: 1, deficiencyCost: 0.4 });
      sim.nutrientStore[0] = store * sim.bodyMatter[0]!;
      sim.step();
      return sim.ledger.basalBurned;
    };
    const full = upkeep(1);
    expect(upkeep(0) / full).toBeCloseTo(1.4, 6);
    expect(upkeep(0.5) / full).toBeCloseTo(1.2, 6);
  });

  it("a dead animal's store goes into its corpse with its body", () => {
    const sim = new Simulation(4, { worldWidth: 128, worldHeight: 128, initialOrganisms: 300, speciesEvery: 0, nutrientMode: 1, catastropheKind: 3, catastropheAt: 20, meteorRadius: 30 });
    sim.run(20);
    const matterBefore = sim.matterAudit();
    sim.step(); // the meteor lands at the start of tick 20
    const matterAfter = sim.matterAudit();
    // The stores of the dead are no longer counted as stores, and nothing was lost.
    expect(matterAfter.stores).toBeLessThan(matterBefore.stores);
    expect(matterAfter.total).toBeCloseTo(matterBefore.total, 9);
  });

  it("the books balance exactly over a long run, in a plain world and in a world with everything that kills or feeds", () => {
    const worlds: Partial<SimConfig>[] = [
      { worldWidth: 128, worldHeight: 128, initialOrganisms: 300, speciesEvery: 0, nutrientMode: 1 },
      {
        worldWidth: 192,
        worldHeight: 192,
        initialOrganisms: 600,
        speciesEvery: 0,
        nutrientMode: 1,
        terrainMode: 1,
        climateMode: 1,
        yearLength: 2000,
        diseaseTransmission: 0.3,
        sexualReproduction: 2,
        litterMax: 3,
        toxinStrength: 0.5,
        fatDepositRate: 0.2,
        multicellular: 1,
        cellTypes: 1,
        initialBond: 0.3,
        typePhotoGain: 0.05,
        evFireEvery: 600,
        evVolcanoEvery: 1500,
        evMeteorEvery: 1500,
        evFloodEvery: 1500,
        evStormEvery: 800,
      },
    ];
    for (const config of worlds) {
      const sim = new Simulation(7, config);
      sim.run(20);
      const books = bookmark(sim);
      sim.run(3000);
      expect(sim.count).toBeGreaterThan(0);
      expect(sim.matterAudit().stores).toBeGreaterThan(0);
      expectBooksBalance(sim, books);
    }
  });

  it("is repeatable, and a world saved mid-run carries on exactly", () => {
    const config: Partial<SimConfig> = { worldWidth: 128, worldHeight: 128, initialOrganisms: 300, speciesEvery: 0, nutrientMode: 1, sexualReproduction: 2 };
    const a = new Simulation(9, config);
    a.run(800);
    const b = Simulation.load(a.save());
    a.run(600);
    b.run(600);
    expect(b.fingerprint()).toBe(a.fingerprint());
    const c = new Simulation(9, config);
    c.run(1400);
    expect(c.fingerprint()).toBe(a.fingerprint());
  });

  it("check the settings", () => {
    expect(() => new Simulation(1, { nutrientMode: 2 })).toThrow(/nutrientMode/);
    expect(() => new Simulation(1, { nutrientMode: 1, plantAssimilation: 1.5 })).toThrow(/plantAssimilation/);
    expect(() => new Simulation(1, { nutrientMode: 1, nutrientStoreCap: 0 })).toThrow(/nutrientStoreCap/);
  });
});
