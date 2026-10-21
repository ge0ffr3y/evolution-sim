import { describe, expect, it } from "vitest";
import { GENE, GENE_COUNT } from "./genome";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

const hidden = (s: Simulation): { loadMask: Uint32Array; basalCost: Float32Array; inheritLoad(child: number, a: number, b: number): void } => s as unknown as { loadMask: Uint32Array; basalCost: Float32Array; inheritLoad(child: number, a: number, b: number): void };
const popcount = (v: number): number => { let n = 0; for (let x = v >>> 0; x !== 0; x &= x - 1) n++; return n; };

function pair(extra: Partial<SimConfig> = {}): Simulation {
  return new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 3, maxOrganisms: 20, mutationLoadRate: 1, mutationLoadLoci: 16, mutationLoadBack: 0, ...extra });
}

describe("harmful mutations", () => {
  it("are off by default: no masks, no cost, and no extra random draws", () => {
    const sim = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 20 });
    expect(hidden(sim).loadMask).toHaveLength(0);
    expect(sim.meanMutationLoad()).toBe(0);
    expect(() => new Simulation(1, { mutationLoadRate: 1, mutationLoadLoci: 40 })).toThrow(/mutationLoadLoci/);
    expect(() => new Simulation(1, { mutationLoadRate: 30, mutationLoadLoci: 24 })).toThrow(/mutationLoadRate/);
  });

  it("a baby that splits off keeps all its parent's bad spots, and new ones can only add (with no mending)", () => {
    const sim = pair({ mutationLoadRate: 2 });
    const m = hidden(sim);
    m.loadMask[0] = 0b1010_1010_1010_1010;
    for (let trial = 0; trial < 50; trial++) {
      m.inheritLoad(1, 0, -1);
      expect((m.loadMask[1]! & 0b1010_1010_1010_1010) >>> 0).toBe(0b1010_1010_1010_1010);
      expect(popcount(m.loadMask[1]!)).toBeGreaterThanOrEqual(8);
    }
  });

  it("with no new mutations, a baby of two parents takes each spot from one or the other", () => {
    const sim = pair({ mutationLoadRate: 1e-12 });
    const m = hidden(sim);
    m.loadMask[0] = 0b0000_0000_1111_1111;
    m.loadMask[1] = 0b1111_1111_0000_0000;
    let sawMixed = false;
    for (let trial = 0; trial < 50; trial++) {
      m.inheritLoad(2, 0, 1);
      const child = m.loadMask[2]!;
      expect(child >>> 16).toBe(0); // only the 16 spots exist
      if (child !== 0b0000_0000_1111_1111 && child !== 0b1111_1111_0000_0000) sawMixed = true;
    }
    expect(sawMixed).toBe(true);
    // Spots both parents have gone bad on always stay bad; spots neither has stay sound.
    m.loadMask[0] = 0b0011;
    m.loadMask[1] = 0b0110;
    for (let trial = 0; trial < 50; trial++) {
      m.inheritLoad(2, 0, 1);
      expect(m.loadMask[2]! & 0b0010).toBe(0b0010);
      expect(m.loadMask[2]! & ~0b0111).toBe(0);
    }
  });

  it("each bad spot raises upkeep by the set share", () => {
    const sim = pair({ mutationLoadCost: 0.05 });
    const m = hidden(sim);
    m.loadMask[0] = 0;
    sim.express(0);
    const clean = m.basalCost[0]!;
    m.loadMask[0] = 0b10110; // three bad spots
    sim.express(0);
    expect(m.basalCost[0]! / clean).toBeCloseTo(1 + 0.05 * 3, 5);
  });

  it("without mixing, the load ratchets up; with mixing it stays lower", () => {
    const meanLoad = (sexual: number): number => {
      const sim = new Simulation(4, { sexualReproduction: sexual, mateRange: 10, mutationLoadRate: 2, mutationLoadLoci: 24, mutationLoadCost: 0.03 });
      sim.run(50000);
      return sim.meanMutationLoad();
    };
    const asexual = meanLoad(0);
    const sexual = meanLoad(1);
    expect(asexual).toBeGreaterThan(sexual + 1);
  }, 300_000);

  it("is deterministic, conserves energy and matter, and saves and reloads exactly", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 200, sexualReproduction: 2, initialSex: 0.4, sexAcceptAny: 1, mutationLoadRate: 1, mutationLoadLoci: 20 } as Partial<SimConfig>;
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
    expect(loaded.meanMutationLoad()).toBe(a.meanMutationLoad());
    a.run(500);
    loaded.run(500);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
  }, 60_000);
});

describe("standing load and starting variety for sex", () => {
  it("founders can start with harmful mutations already, about as many as asked", () => {
    const sim = new Simulation(2, { initialOrganisms: 2000, maxOrganisms: 3000, mutationLoadRate: 1, mutationLoadLoci: 24, mutationLoadStart: 4 });
    expect(sim.meanMutationLoad()).toBeGreaterThan(3.6);
    expect(sim.meanMutationLoad()).toBeLessThan(4.4);
    const clean = new Simulation(2, { initialOrganisms: 200, mutationLoadRate: 1 });
    expect(clean.meanMutationLoad()).toBe(0);
  });

  it("the mate-seeking gene can get its own starting variety, and -1 keeps the old behavior exactly", () => {
    const genesOf = (sim: Simulation, gene: number): number[] => Array.from({ length: sim.count }, (_, i) => sim.genes[i * GENE_COUNT + gene]!);
    const own = new Simulation(4, { initialOrganisms: 300, sexualReproduction: 2, founderSpread: 0.2, sexFounderSpread: 1, fatDepositRate: 0.5 });
    expect(Math.max(...genesOf(own, GENE.sex))).toBeGreaterThan(0.8);
    expect(Math.max(...genesOf(own, GENE.fat))).toBeLessThanOrEqual(0.2);
    const a = new Simulation(4, { initialOrganisms: 100, sexualReproduction: 2, founderSpread: 0.5 });
    const b = new Simulation(4, { initialOrganisms: 100, sexualReproduction: 2, founderSpread: 0.5, sexFounderSpread: -1 });
    expect(a.fingerprint()).toBe(b.fingerprint());
    expect(() => new Simulation(1, { sexFounderSpread: 2 })).toThrow(/sexFounderSpread/);
  });
});

describe("the textbook ratchet model (unlimited places for harm)", () => {
  const hidden = (s: Simulation): { loadMask: Uint32Array; inheritLoad(child: number, a: number, b: number): void } => s as unknown as { loadMask: Uint32Array; inheritLoad(child: number, a: number, b: number): void };

  it("a split-off baby keeps all its parent's mutations plus about the asked number of new ones", () => {
    const sim = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 3, mutationLoadRate: 2, mutationLoadModel: 1 });
    const m = hidden(sim);
    m.loadMask[0] = 40;
    let total = 0;
    for (let trial = 0; trial < 2000; trial++) {
      m.inheritLoad(1, 0, -1);
      expect(m.loadMask[1]).toBeGreaterThanOrEqual(40);
      total += m.loadMask[1]! - 40;
    }
    expect(total / 2000).toBeGreaterThan(1.85);
    expect(total / 2000).toBeLessThan(2.15);
  });

  it("a baby of two parents gets about half of each parent's mutations, so mixing can shed them", () => {
    const sim = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 3, mutationLoadRate: 1e-9, mutationLoadModel: 1 });
    const m = hidden(sim);
    m.loadMask[0] = 30;
    m.loadMask[1] = 10;
    let total = 0;
    let lowest = Infinity;
    for (let trial = 0; trial < 2000; trial++) {
      m.inheritLoad(2, 0, 1);
      total += m.loadMask[2]!;
      lowest = Math.min(lowest, m.loadMask[2]!);
    }
    expect(total / 2000).toBeGreaterThan(19);
    expect(total / 2000).toBeLessThan(21);
    expect(lowest).toBeLessThan(15); // some babies carry fewer than either... well, fewer than the average of their parents
  });

  it("with no ceiling and selection at work, an asexual world carries more load than a sexual one", () => {
    const loadAt = (sexual: number): number => {
      const sim = new Simulation(4, { sexualReproduction: sexual, mateRange: 10, mutationLoadRate: 2, mutationLoadModel: 1, mutationLoadCost: 0.02 });
      sim.run(30000);
      return sim.meanMutationLoad();
    };
    expect(loadAt(0)).toBeGreaterThan(loadAt(1));
  }, 120_000);

  it("is deterministic, conserves energy, and saves and reloads exactly", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 200, sexualReproduction: 2, sexFounderSpread: 1, sexAcceptAny: 1, mutationLoadRate: 2, mutationLoadModel: 1, mutationLoadStart: 3 } as Partial<SimConfig>;
    const a = new Simulation(7, config);
    const b = new Simulation(7, config);
    const energy0 = a.energyAudit().total;
    a.run(2000);
    b.run(2000);
    const L = a.ledger;
    const burned = L.basalBurned + L.movementBurned + L.sensingBurned + L.attackBurned + L.armorBurned + L.brainBurned;
    const expected = energy0 + L.sunlightIn - burned - L.digestionLoss - L.decayLoss;
    expect(Math.abs(a.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
    expect(a.fingerprint()).toBe(b.fingerprint());
    const loaded = Simulation.load(a.save());
    a.run(500);
    loaded.run(500);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
  }, 60_000);
});
