import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";
import { DEFAULT_CONFIG } from "./config";
import { BRAIN_LAYOUTS, INPUT, INPUT_COUNT, renumberOldNode } from "./brain";
import { GENE } from "./genome";

// The fat rework (Phase 9): fat passed to young, fat left out of relatedness, and a brain sense of the fat reserve.

type Hidden = { fatStore: Float64Array; mateMask: number[] };
const hidden = (sim: Simulation): Hidden => sim as unknown as Hidden;

/** One organism with a brain that cannot breed, so its senses can be read tick by tick (as in senses.test.ts). */
const stage = (extra: Partial<SimConfig> = {}): Partial<SimConfig> => ({
  worldWidth: 128, worldHeight: 128, initialOrganisms: 1, maxOrganisms: 40, reproThresholdPerSize: 1e9, initialEnergyFraction: 0.5,
  mutationRateMin: 0, mutationRateMax: 0, initialMutationRate: 0, metaMutationStd: 0, speciesEvery: 0, brainMode: 2, brainEvery: 1, ...extra,
});
const thought = (sim: Simulation): number[] => {
  sim.traceId = sim.id[0]!;
  sim.step();
  return sim.describe(sim.indexOfId(sim.traceId)).brain!.activity!.inputs;
};

describe("fat rework settings", () => {
  it("are off by default (no fat passed to young, fat counts toward relatedness as before) and checked", () => {
    expect(DEFAULT_CONFIG.fatProvision).toBe(0);
    expect(DEFAULT_CONFIG.fatRelated).toBe(1);
    expect(() => new Simulation(1, { fatProvision: 1.5 })).toThrow(/fatProvision/);
    expect(() => new Simulation(1, { fatRelated: 0.5 })).toThrow(/fatRelated/);
  });
});

describe("the fat-reserve sense", () => {
  it("sits just before the constant and the noise, and a world saved with the previous layout renumbers onto today's", () => {
    expect(INPUT.fatReserve).toBe(BRAIN_LAYOUTS.at(-1)!.insertedAt);
    expect(INPUT.bias).toBe(INPUT_COUNT - 2);
    const previous = BRAIN_LAYOUTS.at(-2)!;
    expect(renumberOldNode(previous.inputs - 2, previous.inputs)).toBe(INPUT.bias); // the old bias lands on today's bias
    expect(renumberOldNode(previous.inputs - 3, previous.inputs)).toBe(INPUT.placeDistance); // nodes before the insert stay put
    expect(renumberOldNode(previous.inputs, previous.inputs)).toBe(INPUT_COUNT); // the old first hidden unit on today's
  });

  it("reads 0 without fat, and how full the reserve is with it", () => {
    expect(thought(new Simulation(1, stage()))[INPUT.fatReserve]).toBe(0);
    // No drawing, so the reserve stays where it is set while the sense is read.
    const sim = new Simulation(1, stage({ fatDepositRate: 0.5, fatDrawRate: 0 }));
    hidden(sim).fatStore[0] = 0.25 * sim.config.fatCap * sim.threshold[0]!;
    expect(thought(sim)[INPUT.fatReserve]).toBeCloseTo(0.25, 6);
  });
});

describe("fat passed to young", () => {
  const world = (extra: Partial<SimConfig> = {}): Simulation =>
    new Simulation(7, { worldWidth: 128, worldHeight: 128, initialOrganisms: 200, speciesEvery: 0, fatDepositRate: 0.5, initialFat: 0.5, fatDepositAbove: 0.6, ...extra });
  const newbornFat = (sim: Simulation, ticks: number): { born: number; withFat: number } => {
    let born = 0;
    let withFat = 0;
    for (let t = 0; t < ticks; t++) {
      sim.step();
      for (let i = 0; i < sim.count; i++) {
        if (sim.age[i] !== 0) continue;
        born++;
        if (hidden(sim).fatStore[i]! > 0) withFat++;
      }
    }
    return { born, withFat };
  };

  it("off: newborns start with no fat", () => {
    const r = newbornFat(world(), 1500);
    expect(r.born).toBeGreaterThan(20);
    expect(r.withFat).toBe(0);
  }, 60_000);

  it("on: newborns of parents with fat start with some", () => {
    const r = newbornFat(world({ fatProvision: 0.5 }), 1500);
    expect(r.born).toBeGreaterThan(20);
    expect(r.withFat).toBeGreaterThan(r.born / 4);
  }, 60_000);

  it("the books still balance with fat passed to young, with one parent and with two", () => {
    for (const sex of [0, 1]) {
      const sim = world({ fatProvision: 0.5, sexualReproduction: sex });
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
    }
  }, 120_000);
});

describe("fat and relatedness", () => {
  it("the fat gene counts toward relatedness by default, and not with fatRelated 0", () => {
    const counted = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 2, fatDepositRate: 0.5 });
    const left = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 2, fatDepositRate: 0.5, fatRelated: 0 });
    expect(hidden(counted).mateMask).toContain(GENE.fat);
    expect(hidden(left).mateMask).not.toContain(GENE.fat);
    expect(hidden(left).mateMask.length).toBe(hidden(counted).mateMask.length - 1);
  });
});
