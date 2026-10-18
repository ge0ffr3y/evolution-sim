import { describe, expect, it } from "vitest";
import { GENE, GENE_COUNT } from "./genome";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

const BOND_SLOTS = 6;

function quiet(extra: Partial<SimConfig> = {}): Partial<SimConfig> {
  return {
    worldWidth: 64,
    worldHeight: 64,
    initialOrganisms: 2,
    maxOrganisms: 200,
    multicellular: 1,
    cellTypes: 1,
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

/** Set cell i to a type and re-work its traits. */
function setType(sim: Simulation, i: number, type: number): void {
  sim.cellType[i] = type;
  sim.express(i);
}

describe("cell types", () => {
  it("are off by default: no type arrays, and the body-plan genes are not mutated", () => {
    const sim = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 20, multicellular: 1 });
    expect(sim.cellType).toHaveLength(0);
    const before = sim.genes[GENE.plan1]!;
    sim.run(300);
    expect(sim.genes[GENE.plan1]).toBe(before);
    expect(() => new Simulation(1, { cellTypes: 1 })).toThrow(/needs multicellular/);
  });

  it("each specialist is better than a generalist at one job and worse at the others", () => {
    const sim = new Simulation(1, quiet());
    const base = { speed: sim.speed[0]!, bite: sim.plantBite[0]!, defense: sim.defense[0]!, sense: sim.senseRange[0]!, upkeep: sim.basalCost[0]! };
    const c = sim.config;
    setType(sim, 0, 1); // feeder
    expect(sim.plantBite[0]).toBeCloseTo(base.bite * c.typeFeederBite, 6);
    expect(sim.speed[0]).toBeCloseTo(base.speed * c.typeFeederSpeed, 6);
    setType(sim, 0, 2); // mover
    expect(sim.speed[0]).toBeCloseTo(base.speed * c.typeMoverSpeed, 6);
    expect(sim.plantBite[0]).toBeCloseTo(base.bite * c.typeMoverBite, 6);
    setType(sim, 0, 3); // photosynthesizer
    expect(sim.plantBite[0]).toBeCloseTo(base.bite * c.typePhotoBite, 6);
    expect(sim.speed[0]).toBeCloseTo(base.speed * c.typePhotoSpeed, 6);
    setType(sim, 0, 4); // armor
    expect(sim.defense[0]).toBeCloseTo(base.defense * c.typeArmorDefense, 6);
    expect(sim.speed[0]).toBeCloseTo(base.speed * c.typeArmorSpeed, 6);
    expect(sim.basalCost[0]).toBeCloseTo(base.upkeep * c.typeArmorUpkeep, 6);
    setType(sim, 0, 5); // sensor
    expect(sim.senseRange[0]).toBeCloseTo(base.sense + c.typeSensorRange, 6);
    expect(sim.plantBite[0]).toBeCloseTo(base.bite * c.typeSensorBite, 6);
    setType(sim, 0, 0); // back to a generalist: exactly as before
    expect(sim.speed[0]).toBeCloseTo(base.speed, 6);
    expect(sim.plantBite[0]).toBeCloseTo(base.bite, 6);
  });

  it("a bonded baby's type comes from the body-plan gene for how many bonds its parent had", () => {
    const born = (plan: number, parentBonds: number): number => {
      const sim = new Simulation(1, quiet({ initialOrganisms: 3, initialBond: 1 }));
      sim.genes[0 * GENE_COUNT + GENE.plan1] = plan === 1 ? 0.5 : 0; // type 3
      sim.genes[0 * GENE_COUNT + GENE.plan2] = plan === 2 ? 0.9 : 0; // type 5
      sim.genes[0 * GENE_COUNT + GENE.plan3] = plan === 3 ? 0.7 : 0; // type 4
      // Give the parent the asked-for number of bonds to other (parked) cells.
      for (let b = 0; b < parentBonds; b++) {
        const other = 1 + b;
        sim.bondTo[0 * BOND_SLOTS + b] = other;
        sim.bondTo[other * BOND_SLOTS] = 0;
      }
      for (let i = 0; i < 3; i++) sim.x[i] = 10 + i * 20;
      sim.energy[0] = sim.threshold[0]! * 2;
      sim.nutrient.fill(1000);
      sim.energy[1] = sim.energy[2] = 1;
      const pop = sim.count;
      (sim as unknown as { step(): void }).step();
      return sim.cellType[pop]!; // the first baby
    };
    expect(born(1, 0)).toBe(3);
    expect(born(2, 1)).toBe(5);
    expect(born(3, 2)).toBe(4);
  });

  it("specialized cells are sterile: only generalist cells reproduce", () => {
    const babies = (type: number): number => {
      const sim = new Simulation(1, quiet({ initialOrganisms: 1 }));
      setType(sim, 0, type);
      sim.energy[0] = sim.threshold[0]! * 2;
      sim.nutrient.fill(1000);
      sim.step();
      return sim.count - 1;
    };
    expect(babies(0)).toBe(1);
    for (const type of [1, 2, 3, 4, 5]) expect(babies(type)).toBe(0);
  });

  it("a specialist left with no bonds goes back to being a generalist", () => {
    const sim = new Simulation(1, quiet({ initialOrganisms: 3, bondShare: 0 })); // (no sharing, so the feeder really does die)
    const plain = new Simulation(1, quiet({ initialOrganisms: 1 })).speed[0]!;
    // Cell 0 (armor) is bonded to cell 1 (feeder); cell 2 is a bystander.
    sim.bondTo[0 * BOND_SLOTS] = 1;
    sim.bondTo[1 * BOND_SLOTS] = 0;
    setType(sim, 0, 4);
    setType(sim, 1, 1);
    expect(sim.speed[0]).toBeCloseTo(plain * sim.config.typeArmorSpeed, 6);
    sim.energy[0] = 100;
    sim.energy[1] = 0; // the feeder dies this tick, so the armor cell is left alone
    sim.energy[2] = 100;
    sim.step();
    expect(sim.count).toBe(2);
    for (let i = 0; i < sim.count; i++) {
      expect(sim.cellType[i]).toBe(0);
      expect(sim.speed[i]).toBeCloseTo(plain, 6);
    }
  });

  it("a baby that floats off alone is always a generalist", () => {
    const sim = new Simulation(1, quiet({ initialOrganisms: 1, initialBond: 0 }));
    sim.genes[GENE.plan1] = 0.9;
    sim.energy[0] = sim.threshold[0]! * 2;
    sim.nutrient.fill(1000);
    sim.step();
    expect(sim.count).toBe(2);
    expect(sim.cellType[1]).toBe(0);
  });

  it("a photosynthesizing cell collects sunlight, which the ledger counts, scaled by how sunny it is", () => {
    const collect = (extra: Partial<SimConfig> = {}): { gain: number; sun: number } => {
      const sim = new Simulation(1, quiet({ initialOrganisms: 1, ...extra }));
      setType(sim, 0, 3);
      sim.energy[0] = 20;
      // The same cell type, but one that collects nothing, so the difference is exactly the sunlight.
      const noSun = new Simulation(1, quiet({ initialOrganisms: 1, typePhotoGain: 0, ...extra }));
      setType(noSun, 0, 3);
      noSun.energy[0] = 20;
      sim.step();
      noSun.step();
      return { gain: sim.energy[0]! - noSun.energy[0]!, sun: sim.ledger.sunlightIn };
    };
    const open = collect();
    expect(open.gain).toBeGreaterThan(0.01);
    expect(open.sun).toBeCloseTo(open.gain, 3); // the energy that came in is in the sunlight line of the ledger
    // A dimmer world gives less.
    const dim = collect({ climateMode: 1, latitudeLight: 0.9, latitudeCooling: 0.7, baseTemperature: 0.4 });
    expect(dim.gain).toBeLessThan(open.gain);
  });

  it("a bonded neighbor's armor protects a cell: its defense counts for the cell next to it", () => {
    const sim = new Simulation(1, quiet({ initialOrganisms: 3, colonyDefenseShare: 0.5 }));
    sim.bondTo[0 * BOND_SLOTS] = 1;
    sim.bondTo[1 * BOND_SLOTS] = 0;
    setType(sim, 1, 4); // an armored neighbor
    const alone = (sim as unknown as { defendedBy(i: number): number }).defendedBy(2);
    const protectedCell = (sim as unknown as { defendedBy(i: number): number }).defendedBy(0);
    expect(alone).toBeCloseTo(sim.defense[2]!, 9);
    expect(protectedCell).toBeCloseTo(sim.defense[0]! + 0.5 * sim.defense[1]!, 9);
    expect(protectedCell).toBeGreaterThan(alone * 1.4);
  });

  it("body-plan genes do not make species: founders with random plans are one species", () => {
    const sim = new Simulation(1, quiet({ initialOrganisms: 60, speciesEvery: 10, speciesProbation: 100, speciesSampleEvery: 100 }));
    let low = 1;
    let high = 0;
    for (let i = 0; i < sim.count; i++) {
      low = Math.min(low, sim.genes[i * GENE_COUNT + GENE.plan1]!);
      high = Math.max(high, sim.genes[i * GENE_COUNT + GENE.plan1]!);
    }
    expect(high - low).toBeGreaterThan(0.5); // the founders really do differ in their plans
    sim.run(300);
    expect(sim.speciesRecords).toHaveLength(1);
  });

  it("energy and matter are conserved (including the sunlight collected by photosynthesizers), the run is deterministic, and a saved world carries on exactly", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 150, multicellular: 1, cellTypes: 1, initialBond: 0.5, bondShare: 0.2, climateMode: 1 } as Partial<SimConfig>;
    const a = new Simulation(5, config);
    const b = new Simulation(5, config);
    const energy0 = a.energyAudit().total;
    const matter0 = a.matterAudit().total;
    let types = new Set<number>();
    for (let block = 0; block < 4; block++) {
      a.run(500);
      b.run(500);
      const L = a.ledger;
      const burned = L.basalBurned + L.movementBurned + L.sensingBurned + L.attackBurned + L.armorBurned + L.brainBurned;
      const expected = energy0 + L.sunlightIn - burned - L.digestionLoss - L.decayLoss;
      expect(Math.abs(a.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
      expect(Math.abs(a.matterAudit().total - matter0) / matter0).toBeLessThan(1e-9);
      types = new Set([...types, ...Array.from(a.cellType.slice(0, a.count))]);
    }
    expect(a.fingerprint()).toBe(b.fingerprint());
    expect(types.size).toBeGreaterThanOrEqual(4); // several kinds of cell really were made
    const loaded = Simulation.load(a.save());
    expect(Array.from(loaded.cellType.slice(0, a.count))).toEqual(Array.from(a.cellType.slice(0, a.count)));
    a.run(600);
    loaded.run(600);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
  }, 120_000);

  it("rejects settings that make no sense", () => {
    expect(() => new Simulation(1, quiet({ typeFeederBite: -1 }))).toThrow(/typeFeederBite/);
  });
});

describe("colony complexity", () => {
  /** Lay out cells at given positions, all bonded in a chain (the bonds do not matter for these measures except to make one colony). */
  function colony(positions: [number, number][], types: number[]): Simulation {
    const sim = new Simulation(1, quiet({ initialOrganisms: positions.length, bondShare: 0, bondAlign: 0 }));
    positions.forEach(([x, y], i) => {
      sim.x[i] = 20 + x;
      sim.y[i] = 30 + y;
      sim.cellType[i] = types[i]!;
      if (i > 0) {
        sim.bondTo[i * BOND_SLOTS] = i - 1;
        sim.bondTo[(i - 1) * BOND_SLOTS + (i - 1 === 0 ? 0 : 1)] = i;
      }
    });
    return sim;
  }

  it("a straight line is perfectly symmetric, and the stats count its cells and cell types", () => {
    const sim = colony([[0, 0], [1.5, 0], [3, 0], [4.5, 0], [6, 0]], [0, 1, 1, 3, 4]);
    const stats = sim.stats().colonies;
    expect(stats.count).toBe(1);
    expect(stats.cells).toBe(5);
    expect(stats.maxSize).toBe(5);
    expect(stats.meanTypes).toBe(4); // types 0, 1, 3 and 4
    expect(stats.maxTypes).toBe(4);
    expect(stats.symmetry).toBeCloseTo(1, 9);
  });

  it("a body with a lopsided arm is less symmetric than one with a mirrored pair, and a mirrored pair of different types is not symmetric", () => {
    const lopsided = colony([[0, 0], [1.5, 0], [3, 0], [1.5, 1.5]], [0, 0, 0, 0]);
    const mirrored = colony([[0, 0], [1.5, 1.2], [1.5, -1.2], [3, 0]], [0, 0, 0, 0]);
    const mismatched = colony([[0, 0], [1.5, 1.2], [1.5, -1.2], [3, 0]], [0, 1, 2, 0]);
    expect(mirrored.stats().colonies.symmetry).toBeCloseTo(1, 9);
    expect(lopsided.stats().colonies.symmetry).toBeLessThan(0.9);
    expect(mismatched.stats().colonies.symmetry).toBeCloseTo(0.5, 9); // the two end cells match themselves, the mirrored pair does not
  });

  it("is zero without colonies, and symmetry only counts colonies of three or more cells", () => {
    const pair = colony([[0, 0], [1.5, 0]], [0, 1]);
    expect(pair.stats().colonies.symmetry).toBe(0);
    expect(pair.stats().colonies.count).toBe(1);
    const alone = new Simulation(1, quiet({ initialOrganisms: 3 }));
    expect(alone.stats().colonies).toEqual({ count: 0, cells: 0, meanSize: 0, maxSize: 0, meanTypes: 0, maxTypes: 0, symmetry: 0, mixed: 0 });
  });

  it("works across the wrap-around edge of the world", () => {
    const sim = colony([[0, 0], [1.5, 0], [3, 0]], [0, 0, 0]);
    for (let i = 0; i < 3; i++) sim.x[i] = (62.5 + i * 1.5) % 64; // the line crosses x = 64 to 0
    expect(sim.stats().colonies.symmetry).toBeCloseTo(1, 9);
  });
});
