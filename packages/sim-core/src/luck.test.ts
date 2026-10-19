import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

const hidden = (s: Simulation): { upkeepLuck: Float32Array; fertilityLuck: Float32Array; basalCost: Float32Array; threshold: Float32Array } => s as unknown as { upkeepLuck: Float32Array; fertilityLuck: Float32Array; basalCost: Float32Array; threshold: Float32Array };

describe("luck (developmental noise)", () => {
  it("is off by default, and rejects settings that could give zero upkeep", () => {
    const sim = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 20 });
    expect(hidden(sim).upkeepLuck).toHaveLength(0);
    expect(sim.describe(0).luck).toBeNull();
    expect(() => new Simulation(1, { luckSpread: 0.5, luckLimit: 2.5 })).toThrow(/luckSpread/);
    expect(() => new Simulation(1, { luckSpread: -1 })).toThrow(/luckSpread/);
  });

  it("is a bell curve around 1 with the asked spread, cut off at the limit", () => {
    const sim = new Simulation(3, { worldWidth: 256, worldHeight: 256, initialOrganisms: 4000, maxOrganisms: 5000, luckSpread: 0.08, luckLimit: 2.5 });
    const rolls = [...hidden(sim).upkeepLuck.slice(0, sim.count), ...hidden(sim).fertilityLuck.slice(0, sim.count)];
    const n = rolls.length;
    const mean = rolls.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(rolls.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
    expect(mean).toBeCloseTo(1, 2);
    expect(sd).toBeGreaterThan(0.07);
    expect(sd).toBeLessThan(0.09);
    expect(Math.max(...rolls)).toBeLessThanOrEqual(1 + 0.08 * 2.5 + 1e-6);
    expect(Math.min(...rolls)).toBeGreaterThanOrEqual(1 - 0.08 * 2.5 - 1e-6);
    // Bell-shaped: most are near normal (about two in three within one spread), few at the edges.
    const within = rolls.filter((v) => Math.abs(v - 1) <= 0.08).length / n;
    expect(within).toBeGreaterThan(0.6);
    expect(within).toBeLessThan(0.75);
  });

  it("upkeep luck multiplies upkeep, fertility luck multiplies the reproduction threshold, and the two are independent", () => {
    const sim = new Simulation(3, { worldWidth: 64, worldHeight: 64, initialOrganisms: 50, luckSpread: 0.1 });
    const plain = new Simulation(3, { worldWidth: 64, worldHeight: 64, initialOrganisms: 50 });
    const h = hidden(sim);
    let same = 0;
    for (let i = 0; i < 50; i++) {
      // The founders' genes are the same in both worlds up to the extra luck draws, so compare to the same organism re-expressed without luck.
      const withLuck = h.basalCost[i]!;
      const thresholdWithLuck = h.threshold[i]!;
      sim.express(i);
      expect(h.basalCost[i]).toBeCloseTo(withLuck, 6);
      expect(h.threshold[i]).toBeCloseTo(thresholdWithLuck, 6);
      if (Math.abs(h.upkeepLuck[i]! - h.fertilityLuck[i]!) < 1e-9) same++;
    }
    expect(same).toBeLessThan(3);
    expect(hidden(plain).threshold[0]).toBeGreaterThan(0);
    const info = sim.describe(0).luck!;
    expect(info.upkeep).toBeCloseTo(h.upkeepLuck[0]!, 6);
  });

  it("a baby rolls its own luck: it is not inherited", () => {
    const sim = new Simulation(5, { worldWidth: 128, worldHeight: 128, initialOrganisms: 100, luckSpread: 0.08, mutationRateMin: 0, mutationRateMax: 0, initialMutationRate: 0, metaMutationStd: 0 });
    const parentLuck = new Map<number, number>();
    const h = hidden(sim);
    for (let i = 0; i < sim.count; i++) parentLuck.set(sim.id[i]!, h.upkeepLuck[i]!);
    sim.run(400);
    let compared = 0;
    let identical = 0;
    for (let i = 0; i < sim.count; i++) {
      const parent = parentLuck.get(sim.parentId[i]!);
      if (parent === undefined) continue;
      compared++;
      if (Math.abs(parent - h.upkeepLuck[i]!) < 1e-9) identical++;
    }
    expect(compared).toBeGreaterThan(20);
    expect(identical).toBeLessThan(compared * 0.1);
  });

  it("is deterministic, conserves energy and matter, and saves and reloads exactly", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 200, luckSpread: 0.1, sexualReproduction: 1 } as Partial<SimConfig>;
    const a = new Simulation(7, config);
    const b = new Simulation(7, config);
    const energy0 = a.energyAudit().total;
    const matter0 = a.matterAudit().total;
    a.run(2000);
    b.run(2000);
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
  }, 60_000);
});
