import { describe, expect, it } from "vitest";
import { GENE, GENE_COUNT, traitToGene } from "./genome";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

/** One food cell, nothing growing, no movement noise: a tiny stage to test one rule at a time. */
const STAGE: Partial<SimConfig> = {
  worldWidth: 16,
  worldHeight: 16,
  foodCellSize: 16,
  fertilityScale: 1,
  fertilityVariation: 0,
  foodRegrowPerTick: 0,
  initialFoodFraction: 0,
  maxOrganisms: 50,
  initialOrganisms: 1,
  turnStd: 0,
  steerGain: 0,
  speedMax: 4,
  initialSpeed: 0.1,
  senseRangeMax: 3,
  reproThresholdPerSize: 1e9,
  initialEnergyFraction: 1e-4,
  mutationRateMin: 0,
  mutationRateMax: 0,
  initialMutationRate: 0,
  metaMutationStd: 0,
};

function setGene(sim: Simulation, i: number, gene: keyof typeof GENE, trait: number): void {
  sim.genes[i * GENE_COUNT + GENE[gene]] = traitToGene(trait, sim.ranges[gene]);
  sim.express(i);
}

describe("diet", () => {
  it("a plant eater cannot eat meat, and a meat eater cannot eat plants", () => {
    const sim = new Simulation(1, { ...STAGE, initialOrganisms: 2, initialFoodFraction: 1 });
    setGene(sim, 0, "diet", 0);
    setGene(sim, 1, "diet", 1);
    sim.corpseMatter[0] = 5;
    sim.corpseEnergy[0] = 50;
    sim.run(5);
    expect(sim.meatTaken[0]).toBe(0);
    expect(sim.plantTaken[0]).toBeGreaterThan(0);
    expect(sim.plantTaken[1]).toBe(0);
    expect(sim.meatTaken[1]).toBeGreaterThan(0);
  });

  it("a meat eater gains the energy in the meat it eats, and the matter ends up as detritus", () => {
    const sim = new Simulation(2, { ...STAGE, meatDecayRate: 0, detritusMineralizeRate: 0, basalCostCoeff: 0, moveCostCoeff: 0, senseCostCoeff: 0 });
    setGene(sim, 0, "diet", 1);
    sim.corpseMatter[0] = 4;
    sim.corpseEnergy[0] = 80; // 20 energy per unit of matter
    const before = sim.energy[0]!;
    const bite = sim.meatBite[0]!; // mass it can eat per tick
    sim.step();
    expect(bite).toBeGreaterThan(0);
    // A full-time meat eater digests meat at full efficiency.
    expect(sim.energy[0]! - before).toBeCloseTo(bite * 20, 6);
    expect(sim.corpseMatter[0]).toBeCloseTo(4 - bite, 9);
    expect(sim.corpseEnergy[0]).toBeCloseTo(80 - bite * 20, 9);
    expect(sim.detritus[0]).toBeGreaterThan(0);
  });

  it("generalists digest every food worse than specialists do", () => {
    const sim = new Simulation(3, { ...STAGE, initialOrganisms: 3, dietSpecialization: 0.6 });
    setGene(sim, 0, "diet", 0);
    setGene(sim, 1, "diet", 0.5);
    setGene(sim, 2, "diet", 1);
    expect(sim.plantEff[0]).toBeCloseTo(1, 6);
    expect(sim.plantEff[1]).toBeCloseTo(0.7, 6);
    expect(sim.plantEff[2]).toBeCloseTo(0.4, 6);
    expect(sim.meatEff[2]).toBeCloseTo(1, 6);
    expect(sim.meatEff[1]).toBeCloseTo(0.7, 6);
    expect(sim.meatEff[0]).toBeCloseTo(0.4, 6);
  });

  it("the energy lost to imperfect digestion is counted", () => {
    const sim = new Simulation(4, { ...STAGE, initialFoodFraction: 1, dietSpecialization: 0.6 });
    setGene(sim, 0, "diet", 0.5);
    sim.run(20);
    expect(sim.ledger.digestionLoss).toBeGreaterThan(0);
    expect(sim.ledger.digestionLoss).toBeCloseTo(sim.ledger.plantEaten * 0.3 + sim.ledger.meatEaten * 0.3, 6);
  });
});

describe("corpses, rot and recycling", () => {
  it("a body that starves leaves a corpse holding its body matter and energy", () => {
    const sim = new Simulation(5, { ...STAGE, meatDecayRate: 0, initialEnergyFraction: 0 });
    sim.energy[0] = 1e-9;
    const bodyMatter = sim.bodyMatter[0]!;
    const bodyEnergy = sim.bodyEnergy[0]!;
    sim.step();
    expect(sim.count).toBe(0);
    expect(sim.totalStarved).toBe(1);
    expect(sim.corpseMatter[0]).toBeCloseTo(bodyMatter, 6);
    expect(sim.corpseEnergy[0]).toBeCloseTo(bodyEnergy, 6);
  });

  it("corpses rot at the configured rate: energy is lost as heat, matter becomes detritus", () => {
    const sim = new Simulation(6, { ...STAGE, initialOrganisms: 0, meatDecayRate: 0.05, detritusMineralizeRate: 0 });
    sim.corpseMatter[0] = 10;
    sim.corpseEnergy[0] = 100;
    sim.run(20);
    const kept = 0.95 ** 20; // (test code may use the power operator)
    expect(sim.corpseEnergy[0]).toBeCloseTo(100 * kept, 6);
    expect(sim.corpseMatter[0]).toBeCloseTo(10 * kept, 6);
    expect(sim.ledger.decayLoss).toBeCloseTo(100 * (1 - kept), 6);
    expect(sim.detritus[0]).toBeCloseTo(10 * (1 - kept), 6);
  });

  it("detritus turns back into soil nutrient, closing the loop", () => {
    const sim = new Simulation(7, { ...STAGE, initialOrganisms: 0, meatDecayRate: 0.2, detritusMineralizeRate: 0.1, initialNutrientPerCell: 5 });
    sim.corpseMatter[0] = 10;
    sim.corpseEnergy[0] = 40;
    sim.run(400);
    // Everything that was a corpse is soil again.
    expect(sim.corpseMatter[0]).toBeLessThan(1e-6);
    expect(sim.detritus[0]).toBeLessThan(1e-6);
    expect(sim.nutrient[0]).toBeCloseTo(15, 5);
  });

  it("an eaten corpse stops rotting as much: the matter it held is excreted rather than lost", () => {
    const sim = new Simulation(8, { ...STAGE, meatDecayRate: 0, detritusMineralizeRate: 0 });
    setGene(sim, 0, "diet", 1);
    sim.corpseMatter[0] = 1;
    sim.corpseEnergy[0] = 8;
    const matter = sim.matterAudit().total;
    sim.run(10);
    expect(sim.matterAudit().total).toBeCloseTo(matter, 9);
  });
});

describe("plants need soil nutrients", () => {
  it("plants do not grow in soil with no nutrient", () => {
    const sim = new Simulation(9, { ...STAGE, initialOrganisms: 0, foodRegrowPerTick: 0.2, initialNutrientPerCell: 0 });
    sim.run(200);
    expect(sim.food[0]).toBe(0);
    expect(sim.ledger.sunlightIn).toBe(0);
  });

  it("growing takes nutrient out of the soil, one unit of nutrient per unit of food", () => {
    const sim = new Simulation(10, { ...STAGE, initialOrganisms: 0, foodRegrowPerTick: 0.2, initialNutrientPerCell: 8, foodCap: 5 });
    const before = sim.nutrient[0]! + sim.food[0]!;
    sim.run(300);
    expect(sim.food[0]).toBeCloseTo(5, 6);
    expect(sim.nutrient[0]! + sim.food[0]!).toBeCloseTo(before, 9);
    expect(sim.nutrient[0]).toBeCloseTo(3, 6);
    expect(sim.ledger.sunlightIn).toBeCloseTo(5 * sim.config.energyPerFood, 6);
  });

  it("plants grow more slowly in poor soil than in rich soil", () => {
    const grown = (nutrient: number): number => {
      const sim = new Simulation(11, { ...STAGE, initialOrganisms: 0, foodRegrowPerTick: 0.2, initialNutrientPerCell: nutrient, foodCap: 100 });
      sim.run(5);
      return sim.food[0]!;
    };
    expect(grown(50)).toBeGreaterThan(grown(1) * 2);
  });

  it("a baby cannot be born where the soil has no nutrient to build its body", () => {
    const sim = new Simulation(12, { ...STAGE, reproThresholdPerSize: 30, initialNutrientPerCell: 0, basalCostCoeff: 0, moveCostCoeff: 0, senseCostCoeff: 0 });
    sim.energy[0] = sim.threshold[0]! * 2;
    sim.run(5);
    expect(sim.count).toBe(1);
    expect(sim.blockedBirths).toBeGreaterThan(0);
    expect(sim.totalBirths).toBe(0);

    // Add some nutrient and the very next attempt succeeds.
    sim.nutrient[0] = 10;
    sim.step();
    expect(sim.count).toBe(2);
    expect(sim.totalBirths).toBe(1);
  });

  it("a newborn's body is built from the soil: nutrient drops by the body's matter", () => {
    const sim = new Simulation(13, { ...STAGE, reproThresholdPerSize: 30, initialNutrientPerCell: 20, basalCostCoeff: 0, moveCostCoeff: 0, senseCostCoeff: 0, detritusMineralizeRate: 0 });
    sim.energy[0] = sim.threshold[0]! * 2;
    sim.step();
    expect(sim.count).toBe(2);
    expect(sim.nutrient[0]).toBeCloseTo(20 - sim.bodyMatter[1]!, 9);
  });
});

describe("predation", () => {
  /** Two organisms in reach of each other: organism 0 can attack, organism 1 is the prey. */
  function duel(seed: number, options: { attack?: number; armor?: number; preySize?: number; hunterSize?: number; config?: Partial<SimConfig> } = {}): Simulation {
    const sim = new Simulation(seed, {
      ...STAGE,
      initialOrganisms: 2,
      attackThreshold: 0.05,
      herbivoreAttackPenalty: 0,
      attackAttemptCost: 0,
      attackCostCoeff: 0,
      meatDecayRate: 0,
      detritusMineralizeRate: 0,
      ...options.config,
    });
    sim.x[0] = 8;
    sim.y[0] = 8;
    sim.x[1] = 8.5;
    sim.y[1] = 8;
    setGene(sim, 0, "attack", options.attack ?? 1);
    setGene(sim, 0, "size", options.hunterSize ?? 1);
    setGene(sim, 1, "armor", options.armor ?? 0);
    setGene(sim, 1, "size", options.preySize ?? 1);
    // Keep both from starving or breeding during the test.
    sim.energy[0] = 1000;
    sim.energy[1] = 1000;
    return sim;
  }

  function killRate(options: Parameters<typeof duel>[1], trials = 300): number {
    let kills = 0;
    for (let seed = 1; seed <= trials; seed++) {
      const sim = duel(seed, options);
      sim.step();
      kills += sim.totalKills;
    }
    return kills / trials;
  }

  it("success odds are attack power / (attack power + defense), here 1 / (1 + 0.25) = 0.8", () => {
    const rate = killRate({});
    expect(rate).toBeGreaterThan(0.72);
    expect(rate).toBeLessThan(0.88);
  });

  it("armor makes prey much harder to kill", () => {
    // Armor 2 -> defense 2.25 -> odds 1 / 3.25 = 0.31
    const rate = killRate({ armor: 2 });
    expect(rate).toBeGreaterThan(0.22);
    expect(rate).toBeLessThan(0.4);
  });

  it("a bigger attacker has better odds against the same prey", () => {
    expect(killRate({ hunterSize: 1.2, preySize: 1 })).toBeGreaterThan(killRate({ hunterSize: 1, preySize: 1 }) - 0.02);
  });

  it("an organism with no attack never kills anything", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const sim = duel(seed, { attack: 0 });
      sim.run(20);
      expect(sim.totalKills).toBe(0);
    }
  });

  it("prey that is too big for the attacker is left alone", () => {
    // preyMaxSizeRatio is 1.25 by default: a size-2 body is out of reach for a size-1 attacker.
    for (let seed = 1; seed <= 100; seed++) {
      const sim = duel(seed, { preySize: 2, hunterSize: 1 });
      sim.step();
      expect(sim.totalKills).toBe(0);
    }
  });

  it("prey out of reach is safe", () => {
    const sim = duel(1);
    sim.x[1] = 14;
    sim.step();
    expect(sim.totalKills).toBe(0);
  });

  it("a kill removes the prey, credits the killer, and leaves a corpse with the prey's body and energy", () => {
    // Find a seed where the kill happens (odds 0.8).
    for (let seed = 1; seed <= 50; seed++) {
      const sim = duel(seed);
      const preyEnergy = sim.energy[1]!;
      const preyBodyEnergy = sim.bodyEnergy[1]!;
      const preyBodyMatter = sim.bodyMatter[1]!;
      const preyId = sim.id[1]!;
      sim.step();
      if (sim.totalKills === 0) continue;
      expect(sim.count).toBe(1);
      expect(sim.indexOfId(preyId)).toBe(-1);
      expect(sim.kills[0]).toBe(1);
      expect(sim.corpseMatter[0]).toBeCloseTo(preyBodyMatter, 6);
      expect(sim.corpseEnergy[0]).toBeCloseTo(preyBodyEnergy + preyEnergy, 4);
      return;
    }
    throw new Error("no kill happened in 50 tries, which is essentially impossible at 80% odds");
  });

  it("after a kill the attacker must rest before attacking again", () => {
    const sim = new Simulation(3, {
      ...STAGE,
      initialOrganisms: 12,
      maxOrganisms: 50,
      attackAttemptCost: 0,
      attackCostCoeff: 0,
      herbivoreAttackPenalty: 0,
      killCooldown: 30,
      meatDecayRate: 0,
    });
    for (let i = 0; i < 12; i++) {
      sim.x[i] = 8 + (i % 4) * 0.3;
      sim.y[i] = 8 + Math.floor(i / 4) * 0.3;
      sim.energy[i] = 1000;
    }
    setGene(sim, 0, "attack", 2);
    setGene(sim, 0, "size", 2);
    sim.run(30);
    // One hunter, a 30-tick cooldown: at most one kill in the first 30 ticks.
    expect(sim.totalKills).toBe(1);
    sim.run(5);
    expect(sim.totalKills).toBe(2);
  });

  it("attacking costs energy, and costs more for plant specialists than for meat eaters", () => {
    const cost = (diet: number): number => {
      const sim = duel(1, { config: { attackAttemptCost: 1, attackCostCoeff: 0.1, herbivoreAttackPenalty: 4 } });
      setGene(sim, 0, "diet", diet);
      return sim.attackCost[0]! + sim.attemptCost[0]!;
    };
    expect(cost(0)).toBeCloseTo(cost(1) * 5, 5);
    expect(cost(0.5)).toBeCloseTo(cost(1) * 3, 5);
  });

  it("a killed organism's matter and energy are not lost: they all show up in the corpse", () => {
    const sim = duel(2);
    const matter = sim.matterAudit().total;
    const energy = sim.energyAudit().total;
    sim.step();
    const burned = sim.ledger.basalBurned + sim.ledger.movementBurned + sim.ledger.sensingBurned + sim.ledger.attackBurned + sim.ledger.armorBurned;
    expect(sim.matterAudit().total).toBeCloseTo(matter, 9);
    expect(sim.energyAudit().total).toBeCloseTo(energy - burned - sim.ledger.digestionLoss - sim.ledger.decayLoss + sim.ledger.sunlightIn, 6);
  });
});

describe("firsts are recorded", () => {
  it("logs the first kill once, with its tick", () => {
    const sim = new Simulation(1, {
      worldWidth: 64,
      worldHeight: 64,
      initialOrganisms: 120,
      initialAttack: 1,
      initialDiet: 0.5,
      herbivoreAttackPenalty: 0,
      attackAttemptCost: 0.02,
    });
    sim.run(300);
    const kills = sim.events.filter((e) => e.kind === "firstKill");
    expect(kills).toHaveLength(1);
    expect(kills[0]!.tick).toBeLessThan(300);
    expect(sim.totalKills).toBeGreaterThan(1);
    expect(kills[0]!.text).toContain("first kill");
  });

  it("records nothing about hunting in a world where nobody can hunt", () => {
    const sim = new Simulation(2, { worldWidth: 64, worldHeight: 64, initialOrganisms: 60, attackMax: 0, attackMin: 0, initialAttack: 0 });
    sim.run(800);
    expect(sim.events.filter((e) => e.kind === "firstKill")).toHaveLength(0);
    expect(sim.totalKills).toBe(0);
  });

  it("notices a scavenger when well-fed meat eaters live off the corpses of starved ones", () => {
    const sim = new Simulation(3, {
      worldWidth: 64,
      worldHeight: 64,
      initialOrganisms: 150,
      initialDiet: 1,
      dietMin: 1,
      dietMax: 1,
      initialFoodFraction: 0,
      foodRegrowPerTick: 0,
    });
    // Most starve within a few ticks and leave corpses; ten are well fed and eat them.
    for (let i = 0; i < sim.count; i++) sim.energy[i] = i < 10 ? sim.threshold[i]! * 0.8 : 0.1;
    sim.run(150);
    expect(sim.totalStarved).toBeGreaterThan(100);
    expect(sim.events.some((e) => e.kind === "firstScavenger")).toBe(true);
  });
});
