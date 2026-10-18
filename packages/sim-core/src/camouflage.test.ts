import { describe, expect, it } from "vitest";
import { INPUT } from "./brain";
import { GENE, GENE_COUNT, traitToGene } from "./genome";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

function quiet(extra: Partial<SimConfig> = {}): Partial<SimConfig> {
  return {
    worldWidth: 64,
    worldHeight: 64,
    initialOrganisms: 2,
    maxOrganisms: 100,
    foodRegrowPerTick: 0,
    initialFoodFraction: 0,
    reproThresholdPerSize: 1e9,
    initialEnergyFraction: 0.5,
    mutationRateMin: 0,
    mutationRateMax: 0,
    initialMutationRate: 0,
    metaMutationStd: 0,
    speciesEvery: 0,
    camouflageMode: 1,
    ...extra,
  };
}

function internals(sim: Simulation): { detects(viewer: number, target: number): boolean } {
  return sim as unknown as { detects(viewer: number, target: number): boolean };
}

/** Put organism `target` at (30, 30) with a given color, relative to the background there. `offset` is how far round the color wheel (0 to 0.5) it is from the background. */
function colored(sim: Simulation, target: number, offset: number): void {
  sim.x[target] = 30;
  sim.y[target] = 30;
  const bg = sim.background[Math.floor(30 / 8) * sim.gridWidth + Math.floor(30 / 8)]!;
  let hue = bg + offset;
  if (hue >= 1) hue -= 1;
  sim.genes[target * GENE_COUNT + GENE.hue] = hue;
}

describe("the background color", () => {
  it("is off by default", () => {
    const sim = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 5 });
    expect(sim.background).toHaveLength(0);
    expect(sim.searchHue).toHaveLength(0);
  });

  it("covers the whole color wheel in smooth patches, the same for the same seed whatever else is on", () => {
    const a = new Simulation(3, quiet({ worldWidth: 256, worldHeight: 256 }));
    const b = new Simulation(3, quiet({ worldWidth: 256, worldHeight: 256, brainMode: 2, sexualReproduction: 1 }));
    expect(Array.from(a.background)).toEqual(Array.from(b.background));
    let lo = 1;
    let hi = 0;
    let rough = 0;
    for (let k = 0; k < a.background.length; k++) {
      lo = Math.min(lo, a.background[k]!);
      hi = Math.max(hi, a.background[k]!);
      if (k % a.gridWidth !== 0) rough = Math.max(rough, Math.abs(a.background[k]! - a.background[k - 1]!));
    }
    expect(lo).toBeLessThan(0.05);
    expect(hi).toBeGreaterThan(0.95);
    expect(rough).toBeLessThan(0.3); // neighbors never jump across the whole wheel
    expect(Array.from(new Simulation(4, quiet({ worldWidth: 256, worldHeight: 256 })).background)).not.toEqual(Array.from(a.background));
  });
});

describe("being noticed", () => {
  const rate = (offset: number, extra: Partial<SimConfig> = {}, prepare?: (sim: Simulation) => void): number => {
    let seen = 0;
    const trials = 2000;
    const sim = new Simulation(1, quiet({ initialOrganisms: 2, ...extra }));
    colored(sim, 1, offset);
    prepare?.(sim);
    for (let k = 0; k < trials; k++) {
      sim.tick = k * sim.config.camoGlance; // a fresh glance each time
      sim.id[0] = 1 + (k % 7);
      sim.id[1] = 100 + k;
      if (internals(sim).detects(0, 1)) seen++;
    }
    return seen / trials;
  };

  it("a perfect match is noticed only camoDetectMin of the time; a complete mismatch is always noticed", () => {
    expect(rate(0)).toBeGreaterThan(0.15);
    expect(rate(0)).toBeLessThan(0.26);
    expect(rate(0.5)).toBe(1);
    expect(rate(0.25)).toBeGreaterThan(0.5);
    expect(rate(0.25)).toBeLessThan(0.7);
  });

  it("a hidden animal stays hidden for a whole glance period, then rolls again", () => {
    const sim = new Simulation(1, quiet({ camoGlance: 50 }));
    colored(sim, 1, 0);
    let findingTick = -1;
    for (let id = 100; id < 400 && findingTick < 0; id++) {
      sim.id[1] = id;
      sim.tick = 0;
      if (!internals(sim).detects(0, 1)) {
        // Hidden at tick 0: hidden for the whole of its period, then free to be found.
        for (let t = 0; t < 50; t++) {
          sim.tick = t;
          expect(internals(sim).detects(0, 1)).toBe(false);
        }
        findingTick = id;
      }
    }
    expect(findingTick).toBeGreaterThan(0);
  });

  it("a hunter that has eaten a color notices that color more (and others about as before)", () => {
    const base = rate(0.15);
    const learned = rate(0.15, { camoLearning: 2 }, (sim) => {
      sim.hasImage[0] = 1;
      sim.searchHue[0] = sim.genes[1 * GENE_COUNT + GENE.hue]!; // it has eaten exactly this color
    });
    const other = rate(0.15, { camoLearning: 2 }, (sim) => {
      sim.hasImage[0] = 1;
      let h = sim.genes[1 * GENE_COUNT + GENE.hue]! + 0.5;
      if (h >= 1) h -= 1;
      sim.searchHue[0] = h; // it has eaten the opposite color
    });
    expect(learned).toBeGreaterThan(base * 1.5);
    expect(other).toBeLessThan(learned);
    expect(other).toBeLessThanOrEqual(base + 0.02);
  });

  it("a kill teaches the hunter the color, moving its remembered color toward each new meal", () => {
    const sim = new Simulation(1, quiet({ initialOrganisms: 3, camoLearnRate: 0.5 }));
    sim.genes[1 * GENE_COUNT + GENE.hue] = 0.2;
    sim.genes[2 * GENE_COUNT + GENE.hue] = 0.4;
    const kill = (prey: number): void => (sim as unknown as { kill(a: number, p: number): void }).kill(0, prey);
    expect(sim.hasImage[0]).toBe(0);
    kill(1);
    expect(sim.hasImage[0]).toBe(1);
    expect(sim.searchHue[0]).toBeCloseTo(0.2, 6);
    kill(2);
    expect(sim.searchHue[0]).toBeCloseTo(0.3, 6); // half way
  });

  it("the color wheel wraps: 0.95 and 0.05 are close", () => {
    const sim = new Simulation(1, quiet({ camoLearnRate: 1, camoLearning: 2 }));
    sim.hasImage[0] = 1;
    sim.searchHue[0] = 0.95;
    sim.genes[GENE.hue + GENE_COUNT] = 0.05;
    sim.x[1] = 30;
    sim.y[1] = 30;
    // Place the background so the target is a middling match, then check the boost applies across the seam.
    let seen = 0;
    for (let k = 0; k < 1000; k++) {
      sim.tick = k * sim.config.camoGlance;
      sim.id[1] = 100 + k;
      if (internals(sim).detects(0, 1)) seen++;
    }
    const sim2 = new Simulation(1, quiet({ camoLearning: 2 }));
    sim2.genes[GENE.hue + GENE_COUNT] = 0.05;
    sim2.x[1] = 30;
    sim2.y[1] = 30;
    let seenWithout = 0;
    for (let k = 0; k < 1000; k++) {
      sim2.tick = k * sim2.config.camoGlance;
      sim2.id[1] = 100 + k;
      if (internals(sim2).detects(0, 1)) seenWithout++;
    }
    expect(seen).toBeGreaterThan(seenWithout);
  });
});

describe("what noticing changes", () => {
  it("hunters kill well-matched prey far less often than prey that stand out", () => {
    const kills = (offset: number): number => {
      let total = 0;
      for (let seed = 1; seed <= 40; seed++) {
        const sim = new Simulation(seed, quiet({ initialOrganisms: 2, attackMax: 2, camoGlance: 10, camoLearning: 0 }));
        for (let g = 0; g < GENE_COUNT; g++) sim.genes[g] = 0.3;
        sim.genes[0 * GENE_COUNT + GENE.attack] = 1;
        sim.genes[0 * GENE_COUNT + GENE.diet] = 0.9;
        sim.genes[0 * GENE_COUNT + GENE.size] = traitToGene(1.5, sim.ranges.size);
        for (let g = 0; g < GENE_COUNT; g++) sim.genes[GENE_COUNT + g] = 0.3;
        sim.genes[GENE_COUNT + GENE.size] = traitToGene(0.5, sim.ranges.size);
        sim.genes[GENE_COUNT + GENE.attack] = 0;
        sim.genes[GENE_COUNT + GENE.armor] = 0;
        sim.express(0);
        sim.express(1);
        colored(sim, 1, offset);
        sim.x[0] = 30;
        sim.y[0] = 30;
        sim.energy[0] = 5;
        sim.energy[1] = 5;
        for (let t = 0; t < 8; t++) {
          sim.step();
          sim.x[0] = 30;
          sim.y[0] = 30;
          if (sim.count > 1) {
            sim.x[1] = 30.5;
            sim.y[1] = 30;
          }
          sim.resting[0] = 0;
        }
        total += sim.totalKills;
      }
      return total;
    };
    expect(kills(0.5)).toBeGreaterThan(kills(0) * 2);
  }, 60_000);

  it("brains do not see well-hidden animals, and see exposed ones", () => {
    const seen = (offset: number): number => {
      let count = 0;
      for (let seed = 1; seed <= 30; seed++) {
        const sim = new Simulation(seed, quiet({ initialOrganisms: 2, brainMode: 2, brainFounderReflex: 0, brainEvery: 1, brainTurnNoise: 0, brainVisionRange: 8, camoGlance: 10 }));
        colored(sim, 1, offset);
        sim.x[0] = 24;
        sim.y[0] = 30;
        sim.headingX[0] = 1;
        sim.headingY[0] = 0;
        sim.x[1] = 30;
        sim.y[1] = 30;
        sim.traceId = sim.id[0]!;
        sim.step();
        const inputs = sim.describe(sim.indexOfId(sim.traceId)).brain!.activity!.inputs;
        // Any ray reporting something close ahead.
        for (let ray = 0; ray < 5; ray++) if (inputs[INPUT.visionStart + ray * 4]! > 0 || inputs[INPUT.visionStart + ray * 4 + 2]! > 0) count++;
      }
      return count;
    };
    expect(seen(0.5)).toBe(30);
    expect(seen(0)).toBeLessThan(15);
  }, 60_000);

  it("matePreference 2: an organism picks the mate whose color is closest, even if another is nearer", () => {
    const build = (): Simulation => {
      const sim = new Simulation(1, quiet({ initialOrganisms: 3, camouflageMode: 0, sexualReproduction: 1, matePreference: 2, mateRange: 10, mateDistance: 1 }));
      for (let i = 0; i < 3; i++) {
        for (let g = 0; g < GENE_COUNT; g++) sim.genes[i * GENE_COUNT + g] = 0.4;
        sim.express(i);
        sim.energy[i] = sim.threshold[i]! * 1.2;
      }
      sim.genes[0 * GENE_COUNT + GENE.hue] = 0.97;
      sim.genes[1 * GENE_COUNT + GENE.hue] = 0.5; // nearer, but the opposite color
      sim.genes[2 * GENE_COUNT + GENE.hue] = 0.02; // further, but almost the same color (round the seam)
      sim.x[0] = 30;
      sim.y[0] = 30;
      sim.x[1] = 31;
      sim.y[1] = 30;
      sim.x[2] = 35;
      sim.y[2] = 30;
      sim.nutrient.fill(1000);
      return sim;
    };
    const sim = build();
    sim.step();
    const baby = sim.count - 1;
    expect([sim.parentId[baby], sim.parent2Id[baby]]).toEqual([sim.id[0], sim.id[2]]);
  });

  it("works with everything else: deterministic, conserves energy and matter, and saves and loads exactly", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 150, camouflageMode: 1, brainMode: 2, brainAddConnectionProb: 0.3, sexualReproduction: 1, matePreference: 2, mateRange: 10 } as Partial<SimConfig>;
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
    const loaded = Simulation.load(a.save());
    expect(Array.from(loaded.background)).toEqual(Array.from(a.background));
    a.run(600);
    loaded.run(600);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
  }, 120_000);

  it("rejects settings that make no sense", () => {
    expect(() => new Simulation(1, { camouflageMode: 1, camoScale: 5 })).toThrow(/camoScale/);
    expect(() => new Simulation(1, { camouflageMode: 1, camoDetectMin: 2 })).toThrow(/camoDetectMin/);
    expect(() => new Simulation(1, { matePreference: 3 })).toThrow(/matePreference/);
  });
});
