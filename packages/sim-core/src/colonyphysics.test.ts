import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";
import { GENE, GENE_COUNT } from "./genome";
import { INPUT } from "./brain";

const SLOTS = 6; // bond slots per cell (BOND_SLOTS in simulation.ts)

/** A few cells side by side, nothing growing and nobody breeding, so single ticks can be checked. */
function stage(extra: Partial<SimConfig> = {}): Partial<SimConfig> {
  return {
    worldWidth: 64,
    worldHeight: 64,
    initialOrganisms: 4,
    maxOrganisms: 40,
    foodRegrowPerTick: 0,
    initialFoodFraction: 0,
    reproThresholdPerSize: 1e9,
    initialEnergyFraction: 0.9,
    speciesEvery: 0,
    multicellular: 1,
    initialBond: 0,
    ...extra,
  };
}

/** Bond cells a and b (in both directions) and put them next to each other. */
function bond(sim: Simulation, a: number, b: number): void {
  const free = (i: number): number => {
    for (let k = 0; k < SLOTS; k++) if (sim.bondTo[i * SLOTS + k]! < 0) return k;
    throw new Error("no free bond slot");
  };
  sim.bondTo[a * SLOTS + free(a)] = b;
  sim.bondTo[b * SLOTS + free(b)] = a;
}

function chain(sim: Simulation, count: number): void {
  for (let i = 0; i < count; i++) {
    sim.x[i] = 30 + i;
    sim.y[i] = 30;
    sim.speed[i] = 0;
  }
  for (let i = 0; i + 1 < count; i++) bond(sim, i, i + 1);
}

type Hidden = {
  colonyCount: Uint16Array;
  colonyMass: Float32Array;
  updateColonies(n: number): void;
  considerPrey: (index: number, distSq: number) => void;
  pickAttacker: number;
  pickBest: number;
  pickBestDistSq: number;
  pickSizeLimit: number;
  sharedThreatX: Float32Array;
  sharedThreatY: Float32Array;
  sharedThreatNear: Float32Array;
};
const hidden = (sim: Simulation): Hidden => sim as unknown as Hidden;

describe("colony physics (O3)", () => {
  it("are off by default", () => {
    const sim = new Simulation(1, stage());
    expect(hidden(sim).colonyCount).toHaveLength(0);
  });

  it("a colony's size is the size of all its cells together", () => {
    const sim = new Simulation(1, stage({ colonyProtect: 1 }));
    chain(sim, 3);
    hidden(sim).updateColonies(sim.count);
    expect(hidden(sim).colonyCount[0]).toBe(3);
    expect(hidden(sim).colonyMass[1]).toBeCloseTo(sim.size[0]! + sim.size[1]! + sim.size[2]!, 5);
    expect(hidden(sim).colonyCount[3]).toBe(1);
  });

  it("size protects: a hunter that could take one cell passes up a cell of a colony too big for it", () => {
    const pick = (protect: number): number => {
      const sim = new Simulation(1, stage({ colonyProtect: protect, colonyScaleSaving: protect === 1 ? 0 : 0.0001 }));
      chain(sim, 3);
      const h = hidden(sim);
      h.updateColonies(sim.count);
      h.pickAttacker = 3;
      h.pickBest = -1;
      h.pickBestDistSq = Infinity;
      h.pickSizeLimit = sim.size[0]! * 1.5; // bigger than one cell, smaller than three
      h.considerPrey(0, 1);
      return h.pickBest;
    };
    expect(pick(0)).toBe(0);
    expect(pick(1)).toBe(-1);
  });

  it("economies of scale: each cell of a 4-cell colony costs saving x (1 - 4^-1/8) less to keep", () => {
    const upkeep = (saving: number): number => {
      const sim = new Simulation(1, stage({ colonyScaleSaving: saving, colonyProtect: saving > 0 ? 0 : 1 }));
      chain(sim, 4);
      sim.step();
      return sim.ledger.basalBurned;
    };
    const plain = upkeep(0);
    const cheaper = upkeep(0.5);
    expect(cheaper / plain).toBeCloseTo(1 - 0.5 * (1 - 1 / Math.sqrt(Math.sqrt(Math.sqrt(4)))), 6);
  });
});

describe("shared senses (O3 signaling)", () => {
  const brainy = (extra: Partial<SimConfig> = {}): Partial<SimConfig> => stage({ signaling: 1, initialSignal: 1, brainMode: 2, brainEvery: 1, brainVisionRange: 0, ...extra });

  it("a cell hears what a bonded neighbor shared, scaled by both genes, turned into ahead and left", () => {
    const sim = new Simulation(1, brainy({ bondAlign: 0 })); // (no heading alignment, so the heading stays exactly east)
    chain(sim, 2);
    sim.genes[0 * GENE_COUNT + GENE.signal] = 1;
    sim.genes[1 * GENE_COUNT + GENE.signal] = 0.5;
    sim.headingX[0] = 1;
    sim.headingY[0] = 0;
    const h = hidden(sim);
    h.sharedThreatX[1] = 1; // the neighbor saw a threat to the east...
    h.sharedThreatY[1] = 0;
    h.sharedThreatNear[1] = 0.8; // ...quite close
    sim.traceId = sim.id[0]!;
    sim.step();
    const inputs = sim.describe(0).brain!.activity!.inputs;
    expect(inputs[INPUT.colonyThreatNear]).toBeCloseTo(0.4, 5);
    expect(inputs[INPUT.colonyThreatAhead]).toBeCloseTo(1, 5);
    expect(inputs[INPUT.colonyThreatSide]).toBeCloseTo(0, 5);
  });

  it("a neighbor without the gene shares nothing, and a cell without bonds hears nothing", () => {
    const sim = new Simulation(1, brainy());
    chain(sim, 2);
    sim.genes[1 * GENE_COUNT + GENE.signal] = 0;
    hidden(sim).sharedThreatNear[1] = 0.9;
    sim.traceId = sim.id[0]!;
    sim.step();
    expect(sim.describe(0).brain!.activity!.inputs[INPUT.colonyThreatNear]).toBe(0);
  });

  it("each bond costs signalCost x gene per tick", () => {
    const upkeep = (gene: number): number => {
      const sim = new Simulation(1, brainy({ signalCost: 0.01 }));
      chain(sim, 3);
      for (let i = 0; i < 4; i++) sim.genes[i * GENE_COUNT + GENE.signal] = gene;
      sim.step();
      return sim.ledger.basalBurned;
    };
    // Cells 0 and 2 have one bond each, cell 1 has two: four bond-ends in all.
    expect(upkeep(0.5) - upkeep(0)).toBeCloseTo(4 * 0.01 * 0.5, 6);
  });

  it("with everything on, the books balance exactly, the run repeats and a saved world carries on exactly", () => {
    const config: Partial<SimConfig> = { worldWidth: 192, worldHeight: 192, initialOrganisms: 300, speciesEvery: 0, multicellular: 1, initialBond: 0.4, cellTypes: 1, brainMode: 2, brainAddConnectionProb: 0.3, signaling: 1, initialSignal: 0.5, colonyProtect: 1, colonyScaleSaving: 0.3, evMeteorEvery: 500 };
    const a = new Simulation(7, config);
    a.run(20);
    const e0 = a.energyAudit().total;
    const m0 = a.matterAudit().total;
    const L0 = { ...a.ledger };
    a.run(1200);
    const copy = Simulation.load(a.save());
    a.run(600);
    copy.run(600);
    expect(copy.fingerprint()).toBe(a.fingerprint());
    const L = a.ledger;
    const burned = (x: typeof L): number => x.basalBurned + x.movementBurned + x.sensingBurned + x.attackBurned + x.armorBurned + x.brainBurned;
    const expected = e0 + (L.sunlightIn - L0.sunlightIn) - (burned(L) - burned(L0)) - (L.digestionLoss - L0.digestionLoss) - (L.decayLoss - L0.decayLoss);
    expect(Math.abs(a.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
    expect(Math.abs(a.matterAudit().total - m0) / m0).toBeLessThan(1e-9);
    const again = new Simulation(7, config);
    again.run(1820);
    expect(again.fingerprint()).toBe(a.fingerprint());
  }, 60_000);

  it("check the settings", () => {
    expect(() => new Simulation(1, { signaling: 1, multicellular: 1 })).toThrow(/signaling needs brains/);
    expect(() => new Simulation(1, { colonyProtect: 1 })).toThrow(/need colonies/);
  });
});
