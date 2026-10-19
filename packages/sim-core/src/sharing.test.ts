import { describe, expect, it } from "vitest";
import { GENE, GENE_COUNT } from "./genome";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

function quiet(extra: Partial<SimConfig> = {}): Partial<SimConfig> {
  return {
    worldWidth: 64,
    worldHeight: 64,
    initialOrganisms: 4,
    maxOrganisms: 50,
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
    attackMin: 0,
    attackMax: 0,
    kinDistance: 0.5,
    ...extra,
  };
}

/** Everyone gets the same genes (so they are all relatives), sits where we put them, and has the energy we give. Returns each animal's energy after one tick, with and without sharing. */
function scene(shareConfig: Partial<SimConfig>, energies: number[], places: [number, number][], tweak?: (sim: Simulation) => void): { shared: number[]; plain: number[]; sim: Simulation; plainSim: Simulation } {
  const build = (extra: Partial<SimConfig>): Simulation => {
    const sim = new Simulation(1, quiet({ initialOrganisms: energies.length, ...extra }));
    for (let i = 0; i < energies.length; i++) {
      for (let g = 0; g < GENE_COUNT; g++) sim.genes[i * GENE_COUNT + g] = 0.4;
      sim.genes[i * GENE_COUNT + GENE.generosity] = i === 0 ? 1 : 0; // only animal 0 is generous
      sim.express(i);
      sim.speed[i] = 0;
      sim.x[i] = places[i]![0];
      sim.y[i] = places[i]![1];
      sim.energy[i] = energies[i]! * sim.threshold[i]!;
    }
    tweak?.(sim);
    sim.step();
    return sim;
  };
  const sim = build({ shareRate: 0.5, ...shareConfig });
  // The comparison world is identical but has sharing switched off.
  const off = build({ shareRate: 0 });
  return { shared: Array.from({ length: energies.length }, (_, i) => sim.energy[i]! / sim.threshold[i]!), plain: Array.from({ length: energies.length }, (_, i) => off.energy[i]! / off.threshold[i]!), sim, plainSim: off };
}

const near: [number, number][] = [[30, 30], [31, 30], [30, 31], [29, 30]];

describe("sharing food", () => {
  it("is off by default and rejects nonsense", () => {
    const sim = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 10 });
    expect(sim.totalShared).toBe(0);
    expect(() => new Simulation(1, { shareRate: 0.5 })).toThrow(/needs kinDistance/);
    expect(() => new Simulation(1, { shareRate: 0.5, kinDistance: 0.1, shareRecipients: 9 })).toThrow(/shareRecipients/);
    expect(() => new Simulation(1, { shareRate: 2 })).toThrow(/shareRate/);
  });

  it("a generous animal with spare energy gives a share to its hungry relative, who gets most of it; the rest is heat", () => {
    const { shared, plain, sim } = scene({ shareRecipients: 1 }, [0.9, 0.2], [[30, 30], [31, 30]]);
    const threshold = sim.threshold[0]!;
    const gift = 0.5 * (0.9 - 0.6) * threshold;
    expect((plain[0]! - shared[0]!) * threshold).toBeCloseTo(gift, 5);
    expect((shared[1]! - plain[1]!) * threshold).toBeCloseTo(gift * 0.9, 5);
    expect(sim.totalShared).toBeCloseTo(gift, 5);
  });

  it("an animal with no generosity gives nothing, and neither does one with no spare energy", () => {
    const stingy = scene({ shareRecipients: 1 }, [0.9, 0.2], [[30, 30], [31, 30]], (s) => {
      s.genes[GENE.generosity] = 0;
      s.express(0);
    });
    expect(stingy.shared[1]).toBeCloseTo(stingy.plain[1]!, 6);
    const poor = scene({ shareRecipients: 1 }, [0.5, 0.2], [[30, 30], [31, 30]]);
    expect(poor.shared[1]).toBeCloseTo(poor.plain[1]!, 6);
  });

  it("serves the hungriest neighbors first, up to the number allowed, and skips the well fed", () => {
    const { shared, plain } = scene({ shareRecipients: 2 }, [0.95, 0.15, 0.4, 0.3, 0.95], [[30, 30], [31, 30], [30, 31], [29, 30], [30, 29]]);
    expect(shared[1]! - plain[1]!).toBeGreaterThan(0); // hungriest
    expect(shared[3]! - plain[3]!).toBeGreaterThan(0); // next hungriest
    expect(shared[2]).toBeCloseTo(plain[2]!, 6); // served only two
    expect(shared[4]).toBeCloseTo(plain[4]!, 6); // already well fed
  });

  it("can serve the youngest first instead", () => {
    const { shared, plain } = scene({ shareRecipients: 1, shareTarget: 1 }, [0.9, 0.2, 0.2], [[30, 30], [31, 30], [30, 31]], (s) => {
      s.age[1] = 500;
      s.age[2] = 3;
    });
    expect(shared[2]! - plain[2]!).toBeGreaterThan(0);
    expect(shared[1]).toBeCloseTo(plain[1]!, 6);
  });

  it("only reaches neighbors within range", () => {
    const { shared, plain } = scene({ shareRecipients: 1, shareRange: 3 }, [0.9, 0.2], [[30, 30], [50, 50]]);
    expect(shared[1]).toBeCloseTo(plain[1]!, 6);
  });

  it("with kin-only sharing a stranger gets nothing; with sharing for anyone, the stranger does", () => {
    const stranger = (s: Simulation): void => {
      for (let g = 0; g < GENE_COUNT; g++) s.genes[GENE_COUNT + g] = 0.95;
      s.genes[GENE_COUNT + GENE.generosity] = 0;
      s.express(1);
    };
    const kinOnly = scene({ shareRecipients: 1, kinDistance: 0.1 }, [0.9, 0.2], [[30, 30], [31, 30]], stranger);
    expect(kinOnly.shared[1]).toBeCloseTo(kinOnly.plain[1]!, 6);
    const anyone = scene({ shareRecipients: 1, kinDistance: 0.1, shareKinOnly: 0 }, [0.9, 0.2], [[30, 30], [31, 30]], stranger);
    expect(anyone.shared[1]! - anyone.plain[1]!).toBeGreaterThan(0);
  });

  it("is deterministic, conserves energy and matter, and a saved world carries on exactly", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 200, kinDistance: 0.1, shareRate: 0.4, founderSpread: 0.8, mutationRateMin: 0.02, initialMutationRate: 0.02 } as Partial<SimConfig>;
    const a = new Simulation(7, config);
    const b = new Simulation(7, config);
    const energy0 = a.energyAudit().total;
    const matter0 = a.matterAudit().total;
    a.run(2500);
    b.run(2500);
    const L = a.ledger;
    const burned = L.basalBurned + L.movementBurned + L.sensingBurned + L.attackBurned + L.armorBurned + L.brainBurned;
    const expected = energy0 + L.sunlightIn - burned - L.digestionLoss - L.decayLoss;
    expect(Math.abs(a.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
    expect(Math.abs(a.matterAudit().total - matter0) / matter0).toBeLessThan(1e-9);
    expect(a.totalShared).toBeGreaterThan(0);
    expect(a.fingerprint()).toBe(b.fingerprint());
    const loaded = Simulation.load(a.save());
    expect(loaded.totalShared).toBe(a.totalShared);
    a.run(500);
    loaded.run(500);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
  }, 90_000);
});
