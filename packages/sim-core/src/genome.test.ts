import { describe, expect, it } from "vitest";
import { CONFIG_KEYS, DEFAULT_CONFIG, makeConfig, parseConfigOverrides } from "./config";
import { GENE, GENES, GENE_COUNT, expressGenes, geneToTrait, traitRanges, traitToGene } from "./genome";
import { parsePreset } from "./presets";
import { Simulation } from "./simulation";

const SMALL = { worldWidth: 128, worldHeight: 128, initialOrganisms: 60 } as const;

describe("genome mapping", () => {
  const ranges = traitRanges(makeConfig());

  it("has one gene per trait and a consistent position table", () => {
    expect(GENE_COUNT).toBe(GENES.length);
    GENES.forEach((name, index) => expect(GENE[name]).toBe(index));
  });

  it("maps gene 0 to the minimum and gene 1 to the maximum of every trait", () => {
    for (const name of GENES) {
      expect(geneToTrait(0, ranges[name])).toBe(ranges[name].min);
      expect(geneToTrait(1, ranges[name])).toBe(ranges[name].max);
    }
  });

  it("round-trips: trait -> gene -> trait", () => {
    for (const name of GENES) {
      const { min, max } = ranges[name];
      for (const fraction of [0, 0.1, 0.5, 0.9, 1]) {
        const value = min + fraction * (max - min);
        expect(geneToTrait(traitToGene(value, ranges[name]), ranges[name])).toBeCloseTo(value, 9);
      }
    }
  });

  it("clamps out-of-range traits to a valid gene", () => {
    expect(traitToGene(-100, ranges.size)).toBe(0);
    expect(traitToGene(100, ranges.size)).toBe(1);
  });

  it("expresses a full genome into named traits", () => {
    const genes = [0, 1, 0.5, 0, 0.25, 1, 0.5, 1, 0];
    const traits = expressGenes(genes, 0, ranges);
    expect(traits.size).toBe(ranges.size.min);
    expect(traits.speed).toBe(ranges.speed.max);
    expect(traits.hue).toBe(0.25);
    expect(traits.mutationRate).toBe(ranges.mutationRate.max);
    expect(traits.diet).toBe(0.5);
    expect(traits.attack).toBe(ranges.attack.max);
    expect(traits.armor).toBe(ranges.armor.min);
  });
});

describe("genes in a running simulation", () => {
  it("starts everyone with identical bodies and a random color", () => {
    const sim = new Simulation(1, SMALL);
    const hues = new Set<number>();
    for (let i = 0; i < sim.count; i++) {
      expect(sim.size[i]).toBeCloseTo(sim.config.initialSize, 5);
      expect(sim.speed[i]).toBeCloseTo(sim.config.initialSpeed, 5);
      expect(sim.metabolism[i]).toBeCloseTo(sim.config.initialMetabolism, 5);
      hues.add(sim.genes[i * GENE_COUNT + GENE.hue]!);
    }
    expect(hues.size).toBeGreaterThan(50);
  });

  it("keeps every gene between 0 and 1 and every trait inside its range", () => {
    const sim = new Simulation(2, { ...SMALL, mutationRateMin: 0.05, mutationRateMax: 0.4, initialMutationRate: 0.3 });
    sim.run(2500);
    expect(sim.count).toBeGreaterThan(0);
    let bad = 0;
    for (let i = 0; i < sim.count; i++) {
      for (let k = 0; k < GENE_COUNT; k++) {
        const g = sim.genes[i * GENE_COUNT + k]!;
        if (!(g >= 0 && g <= 1)) bad++;
      }
      for (const name of GENES) {
        const v = sim.traitOf(name, i);
        const { min, max } = sim.ranges[name];
        if (!(v >= min - 1e-6 && v <= max + 1e-6)) bad++;
      }
    }
    expect(bad).toBe(0);
  });

  it("children differ from their parents by small amounts, scaled by the mutation rate", () => {
    const sim = new Simulation(3, { ...SMALL, initialOrganisms: 1, initialEnergyFraction: 0.999 });
    sim.step();
    expect(sim.count).toBe(2);
    for (let k = 0; k < GENE_COUNT; k++) {
      const parent = sim.genes[k]!;
      const child = sim.genes[GENE_COUNT + k]!;
      // Six standard deviations is the most the mutation function can produce.
      const limit = k === GENE.mutationRate ? 6 * sim.config.metaMutationStd : 6 * sim.mutationRate[0]!;
      expect(Math.abs(child - parent)).toBeLessThanOrEqual(limit + 1e-6);
    }
  });

  it("with the mutation rate pinned near zero, children are essentially copies", () => {
    const sim = new Simulation(4, {
      ...SMALL,
      initialOrganisms: 1,
      initialEnergyFraction: 0.999,
      mutationRateMin: 0,
      mutationRateMax: 0,
      initialMutationRate: 0,
      metaMutationStd: 0,
    });
    sim.step();
    expect(sim.count).toBe(2);
    for (let k = 0; k < GENE_COUNT; k++) expect(sim.genes[GENE_COUNT + k]).toBe(sim.genes[k]);
  });

  it("works out per-tick costs from traits using the documented formulas", () => {
    const sim = new Simulation(5, { ...SMALL, initialOrganisms: 1, initialSize: 2, initialSpeed: 1.5, initialSenseRange: 8, initialMetabolism: 1.2 });
    const c = sim.config;
    const sizeToThreeQuarters = Math.sqrt(2) * Math.sqrt(Math.sqrt(2));
    expect(sim.basalCost[0]).toBeCloseTo(c.basalCostCoeff * 1.2 * sizeToThreeQuarters, 5);
    expect(sim.moveCost[0]).toBeCloseTo(c.moveCostCoeff * 2 * 1.5 * 1.5, 5);
    expect(sim.senseCost[0]).toBeCloseTo(c.senseCostCoeff * 8, 5);
    expect(sim.threshold[0]).toBeCloseTo(c.reproThresholdPerSize * 2, 5);
  });
});

describe("config", () => {
  it("accepts a valid override object", () => {
    expect(parseConfigOverrides({ moveCostCoeff: 0.05, foodCap: 12 })).toEqual({ moveCostCoeff: 0.05, foodCap: 12 });
  });

  it("rejects unknown names, non-numbers and non-objects", () => {
    expect(() => parseConfigOverrides({ moveCost: 1 })).toThrow(/Unknown config setting/);
    expect(() => parseConfigOverrides({ foodCap: "lots" })).toThrow(/needs a number/);
    expect(() => parseConfigOverrides({ foodCap: Number.NaN })).toThrow(/needs a number/);
    expect(() => parseConfigOverrides([1, 2])).toThrow(/object/);
    expect(() => parseConfigOverrides(null)).toThrow(/object/);
  });

  it("lists every default setting as a known key", () => {
    expect(CONFIG_KEYS.sort()).toEqual(Object.keys(DEFAULT_CONFIG).sort());
  });

  it("rejects settings that do not make sense", () => {
    expect(() => makeConfig({ initialSize: 99 })).toThrow(/initial size/);
    expect(() => makeConfig({ sizeMin: 5, sizeMax: 1 })).toThrow(/sizeMin exceeds sizeMax/);
    expect(() => makeConfig({ fertilityScale: 5 })).toThrow(/divide the food grid evenly/);
    expect(() => makeConfig({ fertilityVariation: 1.2 })).toThrow(/fertilityVariation/);
    expect(() => makeConfig({ contestStrength: 3 })).toThrow(/contestStrength/);
    expect(() => makeConfig({ senseRangeMax: 200 })).toThrow(/half the world/);
  });
});

describe("presets", () => {
  it("reads a labeled preset", () => {
    const preset = parsePreset({ name: "Costly movement", description: "Moving is 5x pricier", config: { moveCostCoeff: 0.05 } });
    expect(preset).toEqual({ name: "Costly movement", description: "Moving is 5x pricier", config: { moveCostCoeff: 0.05 } });
  });

  it("reads a bare list of changes", () => {
    expect(parsePreset({ foodCap: 20 }, "mine")).toEqual({ name: "mine", description: "", config: { foodCap: 20 } });
  });

  it("rejects typos and malformed presets", () => {
    expect(() => parsePreset({ name: "x", config: { moveCost: 1 } })).toThrow(/Unknown config setting/);
    expect(() => parsePreset({ name: "x", config: {}, extra: 1 })).toThrow(/Unknown preset field/);
    expect(() => parsePreset({ name: 5, config: {} })).toThrow(/name must be text/);
    expect(() => parsePreset("hello")).toThrow(/JSON object/);
  });
});
