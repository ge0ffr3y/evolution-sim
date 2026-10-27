import { describe, expect, it } from "vitest";
import { INPUT, RAY_CHANNELS } from "./brain";
import { DEFAULT_CONFIG, makeConfig, type SimConfig } from "./config";
import { GENE, GENE_COUNT, traitToGene, type GeneName } from "./genome";
import { Simulation } from "./simulation";

// Phase 11, tuning the appetite senses: a floor under each appetite (brainAppetiteFloor) and the attention
// gene (preyAttention). Both off by default.

/** A quiet 64x64 stage (as in the brain-world tests): no food growing, no wobble, brains think every tick, nothing breeds. */
function stage(extra: Partial<SimConfig> = {}): Partial<SimConfig> {
  return {
    worldWidth: 64,
    worldHeight: 64,
    initialOrganisms: 2,
    maxOrganisms: 30,
    brainMode: 2,
    brainFounderReflex: 0,
    brainEvery: 1,
    brainTurnNoise: 0,
    brainVisionRange: 0,
    initialSenseRange: 8,
    senseRangeMax: 12,
    foodRegrowPerTick: 0,
    initialFoodFraction: 0,
    reproThresholdPerSize: 1e9,
    initialEnergyFraction: 1e-4,
    initialSpeed: 0.5,
    speedMin: 0.1,
    mutationRateMin: 0,
    mutationRateMax: 0,
    initialMutationRate: 0,
    metaMutationStd: 0,
    attackMin: 0,
    attackMax: 0,
    ...extra,
  };
}

function setGene(sim: Simulation, i: number, gene: GeneName, trait: number): void {
  sim.genes[i * GENE_COUNT + GENE[gene]] = traitToGene(trait, sim.ranges[gene]);
  sim.express(i);
}

/** Organism 0 (with the given diet) looks east at a smaller animal 4 units ahead, beside richer plants; what it senses. */
function look(diet: number, extra: Partial<SimConfig>, attention?: number): number[] {
  const sim = new Simulation(1, stage(extra));
  setGene(sim, 0, "diet", diet);
  if (attention !== undefined) setGene(sim, 0, "attention", attention);
  sim.x[0] = 36;
  sim.y[0] = 36;
  sim.headingX[0] = 1;
  sim.headingY[0] = 0;
  sim.x[1] = 40;
  sim.y[1] = 36;
  sim.headingX[1] = 0;
  sim.headingY[1] = 1;
  setGene(sim, 1, "speed", 0.1);
  setGene(sim, 1, "size", 0.6);
  sim.food[4 * 8 + 5] = 8; // plants richer to the east (ahead)
  sim.traceId = sim.id[0]!;
  sim.step();
  return sim.describe(sim.indexOfId(sim.traceId)).brain!.activity!.inputs;
}
const inUse = (sim: Simulation): boolean[] => (sim as unknown as { activeGene: boolean[] }).activeGene;
const PREY_NEAR = 2 * RAY_CHANNELS; // the middle ray, "smaller: near"

describe("appetite tuning settings", () => {
  it("are off by default, and checked", () => {
    expect(DEFAULT_CONFIG.brainAppetiteFloor).toBe(0);
    expect(DEFAULT_CONFIG.preyAttention).toBe(0);
    expect(() => makeConfig({ brainAppetiteFloor: 1.5 })).toThrow(/brainAppetiteFloor/);
    expect(() => makeConfig({ brainMode: 2, preyAttention: 1 })).toThrow(/brainAppetiteSenses/);
    expect(() => makeConfig({ brainMode: 2, brainAppetiteSenses: 1, preyAttention: 2 })).toThrow(/preyAttention/);
  });
});

describe("the appetite floor", () => {
  const raw = look(0, { brainAppetiteSenses: 0 });

  it("with no floor, a plant eater sees no prey and a meat eater smells no plants (today)", () => {
    expect(raw[PREY_NEAR]).toBeGreaterThan(0);
    expect(look(0, { brainAppetiteSenses: 1 })[PREY_NEAR]).toBe(0);
    expect(look(1, { brainAppetiteSenses: 1 })[INPUT.smellPlantAhead]).toBe(0);
  });

  it("a floor lets every animal notice every food at least that strongly, rising with appetite", () => {
    const plantEater = look(0, { brainAppetiteSenses: 1, brainAppetiteFloor: 0.4 });
    expect(plantEater[PREY_NEAR]).toBeCloseTo(0.4 * raw[PREY_NEAR]!, 6);
    expect(plantEater[INPUT.smellPlantAhead]).toBeCloseTo(raw[INPUT.smellPlantAhead]!, 6); // full plant appetite
    const meatEater = look(1, { brainAppetiteSenses: 1, brainAppetiteFloor: 0.4 });
    expect(meatEater[PREY_NEAR]).toBeCloseTo(raw[PREY_NEAR]!, 6);
    expect(meatEater[INPUT.smellPlantAhead]).toBeCloseTo(0.4 * raw[INPUT.smellPlantAhead]!, 6);
    const mixed = look(0.5, { brainAppetiteSenses: 1, brainAppetiteFloor: 0.4 });
    expect(mixed[PREY_NEAR]).toBeCloseTo((0.4 + 0.6 * 0.5) * raw[PREY_NEAR]!, 6);
  });

  it("does nothing when the appetite senses are off", () => {
    expect(look(0, { brainAppetiteSenses: 0, brainAppetiteFloor: 0.4 })).toEqual(raw);
  });
});

describe("the attention gene", () => {
  const raw = look(0, { brainAppetiteSenses: 0 });
  const on = { brainAppetiteSenses: 1, preyAttention: 1 };

  it("at 0 a plant eater sees prey as today; at 1 fully; in between, in proportion", () => {
    expect(look(0, on, 0)[PREY_NEAR]).toBe(0);
    expect(look(0, on, 1)[PREY_NEAR]).toBeCloseTo(raw[PREY_NEAR]!, 6);
    expect(look(0, on, 0.25)[PREY_NEAR]).toBeCloseTo(0.25 * raw[PREY_NEAR]!, 6);
  });

  it("adds to the floor and the diet, and leaves plant smell alone", () => {
    const both = look(0.5, { ...on, brainAppetiteFloor: 0.2 }, 0.5);
    const base = 0.2 + 0.8 * 0.5;
    expect(both[PREY_NEAR]).toBeCloseTo((base + (1 - base) * 0.5) * raw[PREY_NEAR]!, 6);
    expect(look(1, on, 1)[INPUT.smellPlantAhead]).toBe(0);
  });

  it("is in use only when switched on, costs attentionCost x gene on the sensing line, and is left out of kind and mating", () => {
    const off = new Simulation(1, stage({ brainAppetiteSenses: 1 }));
    expect(inUse(off)[GENE.attention]).toBe(false);
    const sim = new Simulation(1, stage({ ...on, attentionCost: 0.002 }));
    expect(inUse(sim)[GENE.attention]).toBe(true);
    setGene(sim, 0, "attention", 0);
    const before = sim.senseCost[0]!;
    setGene(sim, 0, "attention", 0.5);
    expect(sim.senseCost[0]! - before).toBeCloseTo(0.001, 6);
    expect((sim as unknown as { mateMask: number[] }).mateMask).not.toContain(GENE.attention);
  });

  it("founders start at initialAttention", () => {
    const sim = new Simulation(1, stage({ ...on, initialAttention: 0.3 }));
    expect(sim.genes[GENE.attention]).toBeCloseTo(0.3, 6);
  });
});
