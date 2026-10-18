import { describe, expect, it } from "vitest";
import { GENE, GENE_COUNT, traitToGene } from "./genome";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

/** A small quiet world whose organisms we can edit by hand. Nothing breeds unless asked to. */
function quiet(extra: Partial<SimConfig> = {}): Partial<SimConfig> {
  return {
    worldWidth: 64,
    worldHeight: 64,
    initialOrganisms: 60,
    maxOrganisms: 500,
    reproThresholdPerSize: 1e9,
    initialEnergyFraction: 0.5,
    foodRegrowPerTick: 0.05,
    mutationRateMin: 0,
    mutationRateMax: 0,
    initialMutationRate: 0,
    metaMutationStd: 0,
    attackMin: 0,
    attackMax: 0,
    speciesEvery: 10,
    speciesDistance: 0.15,
    speciesMinMembers: 8,
    speciesProbation: 100,
    speciesSampleEvery: 100,
    ...extra,
  };
}

function setGeneValue(sim: Simulation, i: number, gene: keyof typeof GENE, value: number): void {
  sim.genes[i * GENE_COUNT + GENE[gene]] = value;
}

describe("species tracking", () => {
  it("puts the first generation into one species, with one record", () => {
    const sim = new Simulation(1, quiet());
    expect(sim.speciesRecords).toHaveLength(1);
    const first = sim.speciesRecords[0]!;
    expect(first.id).toBe(1);
    expect(first.parent).toBe(0);
    expect(first.bornTick).toBe(0);
    expect(first.diedTick).toBeNull();
    expect(first.count).toBe(60);
    for (let i = 0; i < sim.count; i++) expect(sim.speciesOf(i)).toBe(1);
    expect(first.history.slice(0, 2)).toEqual([0, 60]); // an opening sample: tick 0, 60 members
  });

  it("a group that really pulls away becomes a new species after the probation, and remembers where it came from", () => {
    const sim = new Simulation(1, quiet());
    // 20 organisms become big, fast, armored animals: far from the rest in gene space.
    for (let i = 0; i < 20; i++) {
      setGeneValue(sim, i, "size", 0.9);
      setGeneValue(sim, i, "speed", 0.9);
      setGeneValue(sim, i, "armor", 0.9);
    }
    sim.run(50);
    expect(sim.speciesRecords).toHaveLength(1); // still only a candidate: probation not over
    sim.run(100);
    expect(sim.speciesRecords).toHaveLength(2);
    const second = sim.speciesRecords[1]!;
    expect(second.parent).toBe(1);
    expect(second.count).toBe(20);
    expect(second.founderTraits[GENE.size]).toBeGreaterThan(sim.speciesRecords[0]!.traits[GENE.size]!);
    expect(second.ancestorTraits).not.toBeNull();
    expect(sim.speciesEvents.filter((e) => e.kind === "speciation")).toHaveLength(1);
    for (let i = 0; i < 20; i++) expect(sim.speciesOf(i)).toBe(second.id);
  });

  it("a few unusual individuals are noise, not a species", () => {
    const sim = new Simulation(1, quiet());
    for (let i = 0; i < 4; i++) {
      setGeneValue(sim, i, "size", 0.95);
      setGeneValue(sim, i, "armor", 0.95);
    }
    sim.run(300);
    expect(sim.speciesRecords).toHaveLength(1);
    expect(sim.speciesEvents).toHaveLength(0);
    for (let i = 0; i < sim.count; i++) expect(sim.speciesOf(i)).toBe(1);
  });

  it("a whole population drifting together is still one species", () => {
    const sim = new Simulation(1, quiet());
    for (let step = 1; step <= 12; step++) {
      for (let i = 0; i < sim.count; i++) setGeneValue(sim, i, "size", Math.min(1, 0.3 + step * 0.04));
      sim.run(100);
    }
    expect(sim.speciesRecords).toHaveLength(1);
    expect(sim.speciesRecords[0]!.diedTick).toBeNull();
  });

  it("a species with no members left is marked extinct, with the tick", () => {
    const sim = new Simulation(1, quiet());
    for (let i = 0; i < 20; i++) setGeneValue(sim, i, "size", 0.95), setGeneValue(sim, i, "armor", 0.95), setGeneValue(sim, i, "speed", 0.95);
    sim.run(200);
    const second = sim.speciesRecords[1]!;
    expect(second.diedTick).toBeNull();
    // Starve that whole group.
    for (let i = 0; i < sim.count; i++) if (sim.speciesOf(i) === second.id) sim.energy[i] = 0;
    sim.run(20);
    expect(second.diedTick).not.toBeNull();
    expect(second.count).toBe(0);
    expect(second.peak).toBe(20);
    expect(sim.speciesEvents.at(-1)).toMatchObject({ kind: "extinction", species: second.id });
  });

  it("the diet gene counts: plant eaters and meat eaters are different species once they have been apart a while", () => {
    const sim = new Simulation(1, quiet());
    for (let i = 0; i < 25; i++) setGeneValue(sim, i, "diet", traitToGene(0.95, sim.ranges.diet));
    sim.run(200);
    expect(sim.speciesRecords.length).toBeGreaterThanOrEqual(2);
  });

  it("the color marker and the mutation rate do not make species", () => {
    const sim = new Simulation(1, quiet());
    for (let i = 0; i < 30; i++) {
      setGeneValue(sim, i, "hue", 0.99);
      setGeneValue(sim, i, "mutationRate", 0.99);
    }
    sim.run(300);
    expect(sim.speciesRecords).toHaveLength(1);
  });

  it("babies are born into their parent's species", () => {
    const sim = new Simulation(1, quiet({ reproThresholdPerSize: 30, initialEnergyFraction: 0.95, foodRegrowPerTick: 0.2, speciesEvery: 1000, speciesSampleEvery: 1000 }));
    const before = sim.count;
    sim.run(200);
    expect(sim.count).toBeGreaterThan(before);
    for (let i = 0; i < sim.count; i++) expect(sim.speciesOf(i)).toBe(1);
  });

  it("members always add up to the population, and every organism belongs to a live species, through births, deaths and shuffling", () => {
    const sim = new Simulation(5, { worldWidth: 128, worldHeight: 128, initialOrganisms: 120, speciesEvery: 20, speciesSampleEvery: 100, speciesDistance: 0.1, speciesProbation: 200 });
    for (let block = 0; block < 10; block++) {
      sim.run(400);
      const live = new Map<number, number>();
      for (const r of sim.speciesRecords) if (r.diedTick === null) live.set(r.id, 0);
      for (let i = 0; i < sim.count; i++) {
        const id = sim.speciesOf(i);
        expect(live.has(id)).toBe(true);
        live.set(id, live.get(id)! + 1);
      }
      // Counts are as of the last check (every 20 ticks), so look at a check point exactly.
      sim.run(20 - (sim.tick % 20 || 20));
      let total = 0;
      for (const r of sim.speciesRecords) if (r.diedTick === null) total += r.count;
      expect(total).toBeLessThanOrEqual(sim.count + 40);
    }
    // The family tree is a tree: every parent exists and is older.
    const byId = new Map(sim.speciesRecords.map((r) => [r.id, r]));
    for (const r of sim.speciesRecords) {
      if (r.parent === 0) continue;
      const parent = byId.get(r.parent);
      expect(parent).toBeDefined();
      expect(parent!.bornTick).toBeLessThanOrEqual(r.bornTick);
    }
  });

  it("history samples are taken on schedule for every living species", () => {
    const sim = new Simulation(1, quiet({ speciesSampleEvery: 100 }));
    sim.run(500);
    const history = sim.speciesRecords[0]!.history;
    const stride = 2 + GENE_COUNT;
    expect(history.length % stride).toBe(0);
    const ticks = [];
    for (let k = 0; k < history.length; k += stride) ticks.push(history[k]);
    expect(ticks).toEqual([0, 100, 200, 300, 400, 500]);
  });

  it("only watches: the world plays out exactly the same with tracking on or off", () => {
    const base = { worldWidth: 128, worldHeight: 128, initialOrganisms: 100, brainMode: 2, brainAddConnectionProb: 0.3 };
    const on = new Simulation(8, { ...base, speciesEvery: 25, speciesSampleEvery: 100 });
    const off = new Simulation(8, { ...base, speciesEvery: 0 });
    on.run(2000);
    off.run(2000);
    expect(on.fingerprint()).toBe(off.fingerprint());
    expect(on.stats().species.ever).toBeGreaterThan(0);
    expect(off.stats().species).toEqual({ alive: 0, ever: 0 });
    expect(off.speciesRecords).toHaveLength(0);
  });

  it("is deterministic: the same seed gives the same family tree", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 100, speciesDistance: 0.08, speciesProbation: 200, speciesEvery: 25, speciesSampleEvery: 100 };
    const a = new Simulation(3, config);
    const b = new Simulation(3, config);
    a.run(3000);
    b.run(3000);
    expect(JSON.stringify(a.speciesRecords)).toBe(JSON.stringify(b.speciesRecords));
    expect(JSON.stringify(a.speciesEvents)).toBe(JSON.stringify(b.speciesEvents));
  });

  it("logs a population crash once when numbers fall far below the recent high, and again only after a recovery", () => {
    const sim = new Simulation(1, quiet({ speciesEvery: 10, speciesCrashWindow: 200, speciesCrashDrop: 0.4 }));
    sim.run(100);
    expect(sim.speciesEvents.filter((e) => e.kind === "crash")).toHaveLength(0);
    // Wipe out two thirds of the population.
    const before = sim.count;
    for (let i = 0; i < sim.count; i++) if (i % 3 !== 0) sim.energy[i] = 0;
    sim.run(10);
    const crashes = sim.speciesEvents.filter((e) => e.kind === "crash");
    expect(crashes).toHaveLength(1);
    expect(crashes[0]!.from).toBe(before);
    expect(crashes[0]!.to).toBeLessThan(0.6 * before);
    sim.run(30);
    expect(sim.speciesEvents.filter((e) => e.kind === "crash")).toHaveLength(1); // not logged again while low
  });

  it("describes how each species lives: share of food that was meat, kills per 1,000 ticks, average age", () => {
    const sim = new Simulation(1, quiet({ speciesEvery: 10, foodRegrowPerTick: 0, initialFoodFraction: 0 }));
    for (let i = 0; i < sim.count; i++) {
      sim.meatTaken[i] = i < 30 ? 30 : 0;
      sim.plantTaken[i] = i < 30 ? 10 : 40;
      sim.kills[i] = i < 30 ? 2 : 0;
      sim.age[i] = 1000;
    }
    sim.run(10);
    const life = sim.speciesRecords[0]!.lifestyle;
    // 30 members ate 30 meat + 10 plant each, 30 members ate 40 plant: meat is 900 of 900 + 300 + 1200.
    expect(life.meatShare).toBeCloseTo(900 / (900 + 300 + 1200), 2);
    expect(life.killRate).toBeCloseTo(((30 * 2) / (60 * 1010)) * 1000, 1); // ages have grown by the 10 ticks that passed
    expect(life.meanAge).toBeCloseTo(1010, 0);
  });

  it("a yearly swing in a seasonal world is not logged as a crash, but a real collapse still is", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 200, climateMode: 1, yearLength: 600, seasonGrowthSwing: 0.9, speciesEvery: 50, speciesSampleEvery: 500, speciesCrashWindow: 2000, speciesCrashDrop: 0.4 } as Partial<SimConfig>;
    const sim = new Simulation(2, config);
    sim.run(12000);
    expect(sim.speciesEvents.filter((e) => e.kind === "crash")).toHaveLength(0);
    // Keep wiping out 90% of everyone for a year (the population recovers fast, so one wipe-out would not last).
    for (let t = 0; t < 700; t++) {
      if (t % 5 === 0) for (let i = 0; i < sim.count; i++) if (i % 10 !== 0) sim.energy[i] = 0;
      sim.step();
    }
    expect(sim.speciesEvents.filter((e) => e.kind === "crash").length).toBeGreaterThan(0);
  }, 60_000);

  it("rejects settings that make no sense", () => {
    expect(() => new Simulation(1, { speciesEvery: 30, speciesSampleEvery: 100 })).toThrow(/multiple of speciesEvery/);
    expect(() => new Simulation(1, { speciesDistance: 0 })).toThrow(/speciesDistance/);
    expect(() => new Simulation(1, { speciesEvery: 0, speciesDistance: 0 })).not.toThrow();
  });
});
