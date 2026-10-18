import { describe, expect, it } from "vitest";
import { CONN_MAX, HIDDEN_START, INPUT_COUNT, OUTPUT_START, crossoverBrains, setConnection } from "./brain";
import { GENE, GENE_COUNT } from "./genome";
import { Rng } from "./rng";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

/** A quiet 64x64 world for hand-built scenes: no food growth, no mutation, nobody ready unless we make them so. */
function scene(extra: Partial<SimConfig> = {}): Partial<SimConfig> {
  return {
    worldWidth: 64,
    worldHeight: 64,
    initialOrganisms: 4,
    maxOrganisms: 100,
    sexualReproduction: 1,
    mateRange: 6,
    mateDistance: 0.25,
    foodRegrowPerTick: 0,
    initialFoodFraction: 0,
    initialEnergyFraction: 0.1,
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

function ready(sim: Simulation, i: number, x: number, y: number): void {
  sim.x[i] = x;
  sim.y[i] = y;
  sim.energy[i] = sim.threshold[i]! * 1.2;
}

describe("sexual reproduction", () => {
  it("two ready, nearby, compatible organisms have ONE baby, each paying half the usual energy", () => {
    const sim = new Simulation(1, scene());
    ready(sim, 0, 30, 30);
    ready(sim, 1, 33, 30);
    const before = [sim.energy[0]!, sim.energy[1]!];
    const pop = sim.count;
    sim.step();
    expect(sim.count).toBe(pop + 1);
    expect(sim.totalBirths).toBe(1);
    const baby = sim.count - 1;
    expect(sim.parentId[baby]).toBe(sim.id[0]);
    expect(sim.parent2Id[baby]).toBe(sim.id[1]);
    // Each parent handed over about half of fraction x energy (a little energy also went on upkeep).
    const given = (i: number): number => before[i]! - sim.energy[i]!;
    expect(given(0)).toBeGreaterThan(0);
    expect(given(0)).toBeLessThan(0.5 * sim.config.offspringEnergyFraction * before[0]! * 1.2);
    expect(sim.describe(baby).otherParentId).toBe(sim.id[1]);
  });

  it("a baby's genes each come from one parent or the other", () => {
    const sim = new Simulation(2, scene());
    for (let g = 0; g < GENE_COUNT; g++) {
      sim.genes[0 * GENE_COUNT + g] = 0.2;
      sim.genes[1 * GENE_COUNT + g] = 0.3; // close enough to be compatible
    }
    ready(sim, 0, 30, 30);
    ready(sim, 1, 31, 30);
    sim.step();
    const baby = sim.count - 1;
    const fromA = [];
    for (let g = 0; g < GENE_COUNT; g++) {
      const v = sim.genes[baby * GENE_COUNT + g]!;
      expect([0.2, 0.3].some((x) => Math.abs(v - x) < 1e-6), `gene ${g} = ${v}`).toBe(true);
      fromA.push(Math.abs(v - 0.2) < 1e-6);
    }
    // Not all from the same parent (10 fair coin flips: all equal is 1 in 512).
    expect(fromA.some((x) => x) && fromA.some((x) => !x)).toBe(true);
  });

  it("organisms too far apart do not mate, and wait with their energy", () => {
    const sim = new Simulation(1, scene({ mateRange: 6 }));
    ready(sim, 0, 10, 10);
    ready(sim, 1, 40, 40);
    const pop = sim.count;
    sim.step();
    expect(sim.count).toBe(pop);
    expect(sim.energy[0]).toBeGreaterThan(sim.threshold[0]!); // still holding everything, ready for a partner
  });

  it("genetically incompatible organisms do not mate, however close", () => {
    const sim = new Simulation(1, scene({ mateDistance: 0.2 }));
    sim.genes[0 * GENE_COUNT + GENE.diet] = 0;
    sim.genes[1 * GENE_COUNT + GENE.diet] = 1;
    sim.genes[1 * GENE_COUNT + GENE.armor] = 1;
    sim.genes[1 * GENE_COUNT + GENE.size] = 1;
    sim.genes[1 * GENE_COUNT + GENE.speed] = 1;
    sim.express(0);
    sim.express(1);
    ready(sim, 0, 30, 30);
    ready(sim, 1, 31, 30);
    const pop = sim.count;
    sim.step();
    expect(sim.count).toBe(pop);
  });

  it("with three ready neighbors, one pair mates and the odd one waits", () => {
    const sim = new Simulation(1, scene());
    ready(sim, 0, 30, 30);
    ready(sim, 1, 31, 30);
    ready(sim, 2, 32, 30);
    const pop = sim.count;
    sim.step();
    expect(sim.count).toBe(pop + 1);
  });

  it("a lone ready organism does not reproduce at all (nobody to mate with)", () => {
    const sim = new Simulation(1, scene());
    ready(sim, 0, 30, 30);
    const pop = sim.count;
    sim.run(20);
    expect(sim.count).toBeLessThanOrEqual(pop); // (starvation could only lower it)
    expect(sim.totalBirths).toBe(0);
  });

  it("is off by default, and then the original one-parent births are used", () => {
    const sim = new Simulation(1, scene({ sexualReproduction: 0 }));
    ready(sim, 0, 30, 30);
    const pop = sim.count;
    sim.step();
    expect(sim.count).toBe(pop + 1);
    expect(sim.parent2Id).toHaveLength(0);
    expect(sim.describe(sim.count - 1).otherParentId).toBe(0);
  });

  it("energy and matter are still conserved to better than a part in a billion, and it is deterministic", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 150, sexualReproduction: 1, mateRange: 8, brainMode: 2, brainAddConnectionProb: 0.3 };
    const a = new Simulation(5, config);
    const b = new Simulation(5, config);
    const energy0 = a.energyAudit().total;
    const matter0 = a.matterAudit().total;
    for (let block = 0; block < 4; block++) {
      a.run(500);
      b.run(500);
      const L = a.ledger;
      const burned = L.basalBurned + L.movementBurned + L.sensingBurned + L.attackBurned + L.armorBurned + L.brainBurned;
      const expected = energy0 + L.sunlightIn - burned - L.digestionLoss - L.decayLoss;
      expect(Math.abs(a.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
      expect(Math.abs(a.matterAudit().total - matter0) / matter0).toBeLessThan(1e-9);
    }
    expect(a.fingerprint()).toBe(b.fingerprint());
    expect(a.totalBirths).toBeGreaterThan(50);
    // Some organisms really do have two parents.
    let withTwo = 0;
    for (let i = 0; i < a.count; i++) if (a.parent2Id[i] !== 0) withTwo++;
    expect(withTwo).toBeGreaterThan(0);
  }, 120_000);

  it("a sexual population with fussy mating splits into groups that stay apart", () => {
    // Two clusters of organisms far apart in gene space: with fussy mating they never interbreed.
    const sim = new Simulation(3, scene({ initialOrganisms: 40, mateDistance: 0.15, mateRange: 12, foodRegrowPerTick: 0.1, initialFoodFraction: 1, initialEnergyFraction: 0.9, speciesEvery: 25, speciesSampleEvery: 100, speciesProbation: 100 }));
    for (let i = 0; i < 40; i++) {
      const high = i % 2 === 0;
      sim.genes[i * GENE_COUNT + GENE.size] = high ? 0.8 : 0.15;
      sim.genes[i * GENE_COUNT + GENE.armor] = high ? 0.8 : 0.1;
      sim.genes[i * GENE_COUNT + GENE.speed] = high ? 0.7 : 0.3;
      sim.express(i);
    }
    sim.run(600);
    // Nobody in between: every organism's size gene is near one of the two clusters.
    let between = 0;
    for (let i = 0; i < sim.count; i++) {
      const size = sim.genes[i * GENE_COUNT + GENE.size]!;
      if (size > 0.35 && size < 0.6) between++;
    }
    expect(between).toBe(0);
  }, 60_000);
});

describe("brain crossover", () => {
  const rng = (seed = 1): Rng => new Rng(seed);
  function brain(): { from: Uint8Array; to: Uint8Array; weight: Float32Array } {
    return { from: new Uint8Array(CONN_MAX * 3), to: new Uint8Array(CONN_MAX * 3), weight: new Float32Array(CONN_MAX * 3) };
  }
  const OUT = OUTPUT_START;

  it("fixed layout: every connection's strength comes from one parent or the other", () => {
    const b = brain();
    for (let c = 0; c < 30; c++) {
      b.from[c] = c % INPUT_COUNT;
      b.to[c] = HIDDEN_START;
      b.weight[c] = 1;
      b.from[CONN_MAX + c] = c % INPUT_COUNT;
      b.to[CONN_MAX + c] = HIDDEN_START;
      b.weight[CONN_MAX + c] = -1;
    }
    const n = crossoverBrains(1, rng(), b.from, b.to, b.weight, 0, 30, CONN_MAX, 30, 2 * CONN_MAX);
    expect(n).toBe(30);
    let plus = 0;
    for (let c = 0; c < n; c++) {
      const w = b.weight[2 * CONN_MAX + c]!;
      expect(Math.abs(w)).toBe(1);
      if (w > 0) plus++;
    }
    expect(plus).toBeGreaterThan(5);
    expect(plus).toBeLessThan(25);
  });

  it("evolvable layout: all hidden units come from a single parent, never a mix", () => {
    let fromA = 0;
    let fromB = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const b = brain();
      // Parent A uses hidden unit 0 (weight 1); parent B uses hidden unit 1 (weight 2).
      let na = setConnection(b.from, b.to, b.weight, 0, 0, 3, HIDDEN_START, 1);
      na = setConnection(b.from, b.to, b.weight, 0, na, HIDDEN_START, OUT, 1);
      let nb = setConnection(b.from, b.to, b.weight, CONN_MAX, 0, 4, HIDDEN_START + 1, 2);
      nb = setConnection(b.from, b.to, b.weight, CONN_MAX, nb, HIDDEN_START + 1, OUT, 2);
      const n = crossoverBrains(2, rng(seed), b.from, b.to, b.weight, 0, na, CONN_MAX, nb, 2 * CONN_MAX);
      const hidden = new Set<number>();
      for (let c = 0; c < n; c++) {
        const f = b.from[2 * CONN_MAX + c]!;
        const t = b.to[2 * CONN_MAX + c]!;
        if (f >= HIDDEN_START && f < OUT) hidden.add(f);
        if (t >= HIDDEN_START && t < OUT) hidden.add(t);
      }
      expect(hidden.size).toBe(1);
      if (hidden.has(HIDDEN_START)) fromA++;
      else fromB++;
    }
    expect(fromA).toBeGreaterThan(10);
    expect(fromB).toBeGreaterThan(10);
  });

  it("evolvable layout: shared direct connections take either strength; ones only one parent has are passed on about half the time", () => {
    let shared = 0;
    let sharedFromA = 0;
    let onlyA = 0;
    const trials = 400;
    for (let seed = 1; seed <= trials; seed++) {
      const b = brain();
      let na = setConnection(b.from, b.to, b.weight, 0, 0, 1, OUT, 1); // both have 1->OUT
      na = setConnection(b.from, b.to, b.weight, 0, na, 2, OUT, 1); // only A has 2->OUT
      const nb = setConnection(b.from, b.to, b.weight, CONN_MAX, 0, 1, OUT, -1);
      const n = crossoverBrains(2, rng(seed), b.from, b.to, b.weight, 0, na, CONN_MAX, nb, 2 * CONN_MAX);
      for (let c = 0; c < n; c++) {
        const key = `${b.from[2 * CONN_MAX + c]}>${b.to[2 * CONN_MAX + c]}`;
        const w = b.weight[2 * CONN_MAX + c]!;
        if (key === `1>${OUT}`) {
          shared++;
          if (w === 1) sharedFromA++;
          else expect(w).toBe(-1);
        } else if (key === `2>${OUT}`) {
          onlyA++;
          expect(w).toBe(1);
        }
      }
    }
    expect(shared).toBe(trials); // a connection both parents have always survives
    expect(sharedFromA / trials).toBeGreaterThan(0.4);
    expect(sharedFromA / trials).toBeLessThan(0.6);
    expect(onlyA / trials).toBeGreaterThan(0.4);
    expect(onlyA / trials).toBeLessThan(0.6);
  });

  it("never writes more than the brain can hold", () => {
    const b = brain();
    let na = 0;
    let nb = 0;
    for (let h = 0; h < 7; h++) for (let i = 0; i < INPUT_COUNT; i++) na = setConnection(b.from, b.to, b.weight, 0, na, i, HIDDEN_START + h, 1);
    for (let i = 0; i < INPUT_COUNT; i++) for (let o = 0; o < 3; o++) nb = setConnection(b.from, b.to, b.weight, CONN_MAX, nb, i, OUT + o, 1);
    for (let seed = 1; seed <= 20; seed++) {
      const n = crossoverBrains(2, rng(seed), b.from, b.to, b.weight, 0, na, CONN_MAX, nb, 2 * CONN_MAX);
      expect(n).toBeLessThanOrEqual(CONN_MAX);
    }
  });
});

describe("rare large mutations", () => {
  it("with probability 1, a baby differs from its parent in several genes by a lot; with probability 0, only by the normal tiny steps", () => {
    const measure = (prob: number): number => {
      const sim = new Simulation(1, scene({ sexualReproduction: 0, mutationRateMin: 0.0, mutationRateMax: 0.0, macroMutationProb: prob, macroMutationStd: 0.5, macroMutationGenes: 3, initialOrganisms: 1 }));
      let total = 0;
      for (let trial = 0; trial < 20; trial++) {
        ready(sim, 0, 30, 30);
        const parentGenes = Array.from(sim.genes.slice(0, GENE_COUNT));
        const pop = sim.count;
        sim.step();
        if (sim.count <= pop) continue;
        const baby = sim.count - 1;
        for (let g = 0; g < GENE_COUNT; g++) total += Math.abs(sim.genes[baby * GENE_COUNT + g]! - parentGenes[g]!);
        // Put the baby out of the way so it does not interfere.
        sim.energy[baby] = 0;
        sim.step();
      }
      return total;
    };
    expect(measure(0)).toBeLessThan(1e-6);
    expect(measure(1)).toBeGreaterThan(1);
  });
});

describe("saving a sexual world", () => {
  it("a reloaded sexual world carries on exactly like the original", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 120, sexualReproduction: 1, mateRange: 8, brainMode: 2, brainAddConnectionProb: 0.3, macroMutationProb: 0.05 };
    const original = new Simulation(8, config);
    original.run(1000);
    const loaded = Simulation.load(original.save());
    original.run(800);
    loaded.run(800);
    expect(loaded.fingerprint()).toBe(original.fingerprint());
  }, 60_000);
});
