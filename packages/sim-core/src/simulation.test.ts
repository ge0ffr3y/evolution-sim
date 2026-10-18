import { describe, expect, it } from "vitest";
import { makeConfig } from "./config";
import { GENE, GENES, GENE_COUNT, traitToGene } from "./genome";
import { Simulation } from "./simulation";

/** A smaller world so tests stay fast. Behavior is the same, just fewer organisms. */
const SMALL = { worldWidth: 128, worldHeight: 128, initialOrganisms: 60 } as const;

describe("determinism", () => {
  it("seed 42 for 10,000 ticks gives the exact same world twice", () => {
    const a = new Simulation(42);
    const b = new Simulation(42);
    a.run(10_000);
    b.run(10_000);
    expect(a.fingerprint()).toBe(b.fingerprint());
    expect(a.stats()).toEqual(b.stats());
  }, 120_000);

  it("different seeds give different worlds", () => {
    const a = new Simulation(42, SMALL);
    const b = new Simulation(43, SMALL);
    a.run(500);
    b.run(500);
    expect(a.fingerprint()).not.toBe(b.fingerprint());
  });

  it("the fingerprint changes as time passes", () => {
    const sim = new Simulation(5, SMALL);
    const before = sim.fingerprint();
    sim.step();
    expect(sim.fingerprint()).not.toBe(before);
  });

  it("running in one go or in chunks gives the same result", () => {
    const a = new Simulation(9, SMALL);
    const b = new Simulation(9, SMALL);
    a.run(1500);
    for (let i = 0; i < 15; i++) b.run(100);
    expect(a.fingerprint()).toBe(b.fingerprint());
  });

  it("is deterministic with every feature switched on (sensing, uneven land, contest, fighting, scavenging)", () => {
    const features = {
      ...SMALL,
      initialSenseRange: 6,
      steerGain: 2,
      fertilityVariation: 0.7,
      fertilityScale: 4,
      contestStrength: 2,
      initialDiet: 0.5,
      initialAttack: 1,
      herbivoreAttackPenalty: 0,
      attackAttemptCost: 0.05,
    };
    const a = new Simulation(17, features);
    const b = new Simulation(17, features);
    a.run(3000);
    b.run(3000);
    expect(a.fingerprint()).toBe(b.fingerprint());
  });
});

describe("world rules (checked every tick of a long run)", () => {
  it("keeps every organism inside the world, with sane, finite numbers", () => {
    const sim = new Simulation(7, { ...SMALL, initialSenseRange: 4, fertilityVariation: 0.6, fertilityScale: 4, initialDiet: 0.4, initialAttack: 0.8, herbivoreAttackPenalty: 0, attackAttemptCost: 0.05 });
    const c = sim.config;
    // Count problems in a plain loop (calling expect millions of times is slow),
    // keeping the first few descriptions so a failure says what went wrong.
    const problems: string[] = [];
    const report = (tick: number, i: number, what: string): void => {
      if (problems.length < 5) problems.push(`tick ${tick}, organism ${i}: ${what}`);
    };

    for (let t = 0; t < 3000; t++) {
      sim.step();
      for (let i = 0; i < sim.count; i++) {
        const x = sim.x[i]!;
        const y = sim.y[i]!;
        const length = Math.sqrt(sim.headingX[i]! * sim.headingX[i]! + sim.headingY[i]! * sim.headingY[i]!);
        if (!(x >= 0 && x < c.worldWidth && y >= 0 && y < c.worldHeight)) report(t, i, "outside the world");
        if (!(sim.energy[i]! > 0 && Number.isFinite(sim.energy[i]!))) report(t, i, "bad energy");
        if (!(Math.abs(length - 1) < 1e-3)) report(t, i, "heading is not a unit vector");
        if (sim.killed[i] !== 0) report(t, i, "a killed organism is still in the list");
        for (const name of GENES) {
          const v = sim.traitOf(name, i);
          const { min, max } = sim.ranges[name];
          if (!(v >= min - 1e-6 && v <= max + 1e-6)) report(t, i, `${name} out of its limits`);
        }
      }
      for (let cell = 0; cell < sim.food.length; cell++) {
        const f = sim.food[cell]!;
        if (!(f >= 0 && f <= sim.foodCapacity[cell]! + 1e-9)) report(t, cell, `food ${f} outside 0..capacity`);
        for (const [name, array] of [["nutrient", sim.nutrient], ["corpse matter", sim.corpseMatter], ["corpse energy", sim.corpseEnergy], ["detritus", sim.detritus]] as const) {
          if (!(array[cell]! >= -1e-12)) report(t, cell, `${name} went negative`);
        }
      }
    }
    expect(problems).toEqual([]);
  }, 60_000);

  it("never exceeds the maximum population", () => {
    const sim = new Simulation(3, { ...SMALL, maxOrganisms: 100, initialOrganisms: 90 });
    for (let t = 0; t < 2000; t++) {
      sim.step();
      expect(sim.count).toBeLessThanOrEqual(100);
    }
  });

  it("gives every organism a unique id and a valid parent", () => {
    const sim = new Simulation(11, SMALL);
    sim.run(2000);
    const ids = new Set<number>();
    for (let i = 0; i < sim.count; i++) {
      ids.add(sim.id[i]!);
      expect(sim.parentId[i]).toBeLessThan(sim.id[i]!);
    }
    expect(ids.size).toBe(sim.count);
  });

  it("keeps the books straight: population = start + births - deaths", () => {
    const sim = new Simulation(13, SMALL);
    sim.run(3000);
    const s = sim.stats();
    expect(s.population).toBe(sim.config.initialOrganisms + s.totalBirths - s.totalDeaths);
  });
});

describe("energy conservation", () => {
  // Every feature on, with fighting and scavenging forced to happen, and a
  // non-trivial food-to-energy exchange rate so that a mistake in any
  // conversion would show up.
  const everything = {
    worldWidth: 128,
    worldHeight: 128,
    initialOrganisms: 200,
    initialSenseRange: 6,
    steerGain: 2,
    fertilityVariation: 0.5,
    fertilityScale: 4,
    contestStrength: 1.5,
    energyPerFood: 1.3,
  };

  /** Make a few founders armed meat-eaters and a few armored, so every kind of flow happens. */
  function armSome(sim: Simulation): Simulation {
    for (let i = 0; i < sim.count; i++) {
      if (i % 25 === 0) {
        sim.genes[i * GENE_COUNT + GENE.attack] = 0.3;
        sim.genes[i * GENE_COUNT + GENE.diet] = 0.8;
      } else if (i % 25 === 1) {
        sim.genes[i * GENE_COUNT + GENE.armor] = 0.4;
      }
      sim.express(i);
    }
    return sim;
  }

  function burned(l: Simulation["ledger"]): number {
    return l.basalBurned + l.movementBurned + l.sensingBurned + l.attackBurned + l.armorBurned;
  }

  it("energy in organisms, bodies, plants and corpses = start + sunshine - heat lost, at every checkpoint", () => {
    const sim = armSome(new Simulation(21, everything));
    const startTotal = sim.energyAudit().total;

    for (let block = 1; block <= 8; block++) {
      sim.run(500);
      const L = sim.ledger;
      const expected = startTotal + L.sunlightIn - burned(L) - L.digestionLoss - L.decayLoss;
      const actual = sim.energyAudit().total;
      expect(Math.abs(actual - expected) / expected).toBeLessThan(1e-9);
    }
    // Make sure the test really exercised every kind of flow.
    const end = sim.stats();
    expect(end.totalBirths).toBeGreaterThan(50);
    expect(end.totalKills).toBeGreaterThan(20);
    expect(end.totalStarved).toBeGreaterThan(0);
    const L = end.ledger;
    for (const [name, value] of Object.entries(L)) expect(value, name).toBeGreaterThan(0);
  }, 60_000);

  it("sunlight is the only source: with no sun and no plants, energy can only go down", () => {
    const sim = new Simulation(25, { ...SMALL, foodRegrowPerTick: 0, initialFoodFraction: 0 });
    let previous = sim.energyAudit().total;
    for (let t = 0; t < 1500; t++) {
      sim.step();
      const now = sim.energyAudit().total;
      expect(now).toBeLessThanOrEqual(previous + 1e-9);
      previous = now;
    }
    expect(sim.ledger.sunlightIn).toBe(0);
  });

  it("burn totals only ever grow", () => {
    const sim = armSome(new Simulation(22, everything));
    let previous = 0;
    for (let t = 0; t < 1500; t++) {
      sim.step();
      const total = burned(sim.ledger);
      expect(total).toBeGreaterThanOrEqual(previous);
      previous = total;
    }
  });

  it("with no food at all, the energy organisms start with is exactly what they burn before dying", () => {
    const sim = new Simulation(23, { ...SMALL, initialFoodFraction: 0, foodRegrowPerTick: 0, initialSenseRange: 4 });
    const startEnergy = sim.stats().totalEnergy;
    sim.run(3000);
    const s = sim.stats();
    expect(s.population).toBe(0);
    expect(Math.abs(burned(s.ledger) - startEnergy) / startEnergy).toBeLessThan(1e-9);
    expect(s.ledger.plantEaten).toBe(0);
  });

  it("a birth moves energy and matter from parent and soil into a child without creating any", () => {
    const sim = new Simulation(24, {
      ...SMALL,
      initialOrganisms: 1,
      foodRegrowPerTick: 0,
      initialFoodFraction: 0,
      basalCostCoeff: 0,
      moveCostCoeff: 0,
      senseCostCoeff: 0,
      meatDecayRate: 0,
      detritusMineralizeRate: 0,
    });
    // With no food, no costs and no decay, the only thing that can happen is the split.
    sim.step();
    expect(sim.count).toBe(1); // below the threshold: no birth yet

    const parentEnergy = sim.threshold[0]! * 1.5;
    sim.energy[0] = parentEnergy;
    const energyBefore = sim.energyAudit().total;
    const matterBefore = sim.matterAudit().total;
    sim.step();
    expect(sim.count).toBe(2);
    expect(sim.energyAudit().total).toBeCloseTo(energyBefore, 9);
    expect(sim.matterAudit().total).toBeCloseTo(matterBefore, 9);
    // The child got half of what the parent had, minus the energy locked into its body.
    expect(sim.energy[1]).toBeCloseTo(parentEnergy * sim.config.offspringEnergyFraction - sim.bodyEnergy[1]!, 5);
  });
});

describe("matter conservation", () => {
  const everything = {
    worldWidth: 128,
    worldHeight: 128,
    initialOrganisms: 200,
    initialSenseRange: 6,
    fertilityVariation: 0.5,
    fertilityScale: 4,
  };

  it("soil + plants + corpses + detritus + bodies stays constant through births, kills, rot and growth", () => {
    const sim = new Simulation(31, everything);
    // A few founders are armed meat-eaters, so kills, corpses and scavenging all happen.
    for (let i = 0; i < sim.count; i += 25) {
      sim.genes[i * GENE_COUNT + GENE.attack] = 0.3;
      sim.genes[i * GENE_COUNT + GENE.diet] = 0.8;
      sim.express(i);
    }
    const start = sim.matterAudit().total;
    for (let block = 1; block <= 8; block++) {
      sim.run(500);
      const audit = sim.matterAudit();
      expect(Math.abs(audit.total - start) / start).toBeLessThan(1e-9);
    }
    const end = sim.stats();
    expect(end.totalKills).toBeGreaterThan(20);
    expect(end.totalStarved).toBeGreaterThan(0);
    expect(end.totalCorpseMatter).toBeGreaterThan(0);
    expect(end.totalDetritus).toBeGreaterThan(0);
  }, 60_000);

  it("holds for the default world too, where nutrients matter more", () => {
    const sim = new Simulation(32, { ...SMALL, initialNutrientPerCell: 12 });
    const start = sim.matterAudit().total;
    sim.run(4000);
    expect(Math.abs(sim.matterAudit().total - start) / start).toBeLessThan(1e-9);
  }, 60_000);
});

describe("food", () => {
  it("regrows to the cap and never beyond", () => {
    const sim = new Simulation(1, { ...SMALL, initialOrganisms: 0, initialFoodFraction: 0 });
    sim.run(6000);
    for (let cell = 0; cell < sim.food.length; cell++) expect(sim.food[cell]).toBeCloseTo(sim.foodCapacity[cell]!, 3);
  });

  it("is eaten by organisms and turned into energy", () => {
    const sim = new Simulation(2, { ...SMALL, foodRegrowPerTick: 0 });
    const before = sim.stats().totalFood;
    sim.run(200);
    expect(sim.stats().totalFood).toBeLessThan(before);
    expect(sim.ledger.plantEaten).toBeGreaterThan(0);
  });

  it("uneven land: every cell stays within its own capacity, and cells really differ", () => {
    const sim = new Simulation(3, { ...SMALL, fertilityVariation: 0.8, fertilityScale: 4 });
    const caps = Array.from(sim.foodCapacity);
    expect(Math.max(...caps)).toBeGreaterThan(sim.config.foodCap * 1.3);
    expect(Math.min(...caps)).toBeLessThan(sim.config.foodCap * 0.7);
    for (const cap of caps) {
      expect(cap).toBeGreaterThanOrEqual(sim.config.foodCap * 0.2 - 1e-9);
      expect(cap).toBeLessThanOrEqual(sim.config.foodCap * 1.8 + 1e-9);
    }
  });

  it("uneven land differs from seed to seed, and is identical when the seed repeats", () => {
    const land = (seed: number): number[] => Array.from(new Simulation(seed, { ...SMALL, fertilityVariation: 0.8 }).foodCapacity);
    expect(land(1)).toEqual(land(1));
    expect(land(1)).not.toEqual(land(2));
  });

  it("flat land has exactly the same capacity everywhere", () => {
    const sim = new Simulation(4, { ...SMALL, fertilityVariation: 0 });
    for (const cap of sim.foodCapacity) expect(cap).toBe(sim.config.foodCap);
  });
});

describe("sharing scarce food", () => {
  /**
   * One food cell, two organisms of different size, very little food, and no
   * births or deaths. Returns how much each one ate in a single tick.
   */
  function intakeOfTwo(contestStrength: number): [number, number] {
    const sim = new Simulation(1, {
      worldWidth: 8,
      worldHeight: 8,
      foodCellSize: 8,
      fertilityScale: 1,
      fertilityVariation: 0,
      initialOrganisms: 2,
      maxOrganisms: 10,
      initialSize: 1,
      initialFoodFraction: 0.01, // 0.1 units of food: far less than either wants
      foodRegrowPerTick: 0,
      steerGain: 0,
      senseRangeMax: 3,
      reproThresholdPerSize: 1e9,
      initialEnergyFraction: 1e-3,
      contestStrength,
      biteSizeBlend: 1,
    });
    // Make organism 1 twice the size of organism 0.
    sim.genes[GENE_COUNT + GENE.size] = traitToGene(2, sim.ranges.size);
    sim.express(1);
    const before = [sim.energy[0]!, sim.energy[1]!];
    const costs = [0, 1].map((i) => sim.basalCost[i]! + sim.moveCost[i]! + sim.senseCost[i]! + sim.attackCost[i]! + sim.armorCost[i]!);
    sim.step();
    return [sim.energy[0]! - before[0]! + costs[0]!, sim.energy[1]! - before[1]! + costs[1]!];
  }

  it("shares in proportion to eating power when contest strength is 0", () => {
    const [small, big] = intakeOfTwo(0);
    expect(big / small).toBeCloseTo(2, 5); // twice the size, twice the appetite, twice the food
  });

  it("gives the bigger eater a disproportionate share when contest strength is 1", () => {
    const [small, big] = intakeOfTwo(1);
    expect(big / small).toBeCloseTo(4, 5); // weight is appetite squared
  });

  it("is even more lopsided when contest strength is 2", () => {
    const [small, big] = intakeOfTwo(2);
    expect(big / small).toBeCloseTo(8, 5); // weight is appetite cubed
  });

  it("never hands out more food than the cell holds", () => {
    for (const strength of [0, 1, 2]) {
      const [a, b] = intakeOfTwo(strength);
      expect(a + b).toBeCloseTo(0.1, 9);
    }
  });

  it("does not depend on the order organisms are listed in", () => {
    // Turn noise is switched off so that movement uses no random numbers (which
    // are handed out in list order); that isolates the food-sharing step.
    const config = { ...SMALL, turnStd: 0 };
    const a = new Simulation(5, config);
    a.run(300);
    // Reverse the order of everyone and run one more tick: the food left on the
    // ground must come out the same, because sharing is order-independent.
    const b = new Simulation(5, config);
    b.run(300);
    const reverse = (array: { length: number; [i: number]: number }, width = 1): void => {
      const n = b.count;
      for (let i = 0; i < Math.floor(n / 2); i++) {
        for (let w = 0; w < width; w++) {
          const p = i * width + w;
          const q = (n - 1 - i) * width + w;
          const tmp = array[p]!;
          array[p] = array[q]!;
          array[q] = tmp;
        }
      }
    };
    for (const arr of [
      b.id, b.parentId, b.age, b.kills, b.x, b.y, b.headingX, b.headingY, b.energy, b.plantTaken, b.meatTaken,
      b.killed, b.attempted, b.resting, b.size, b.speed, b.senseRange, b.metabolism, b.mutationRate, b.diet,
      b.attack, b.armor, b.basalCost, b.moveCost, b.senseCost, b.attackCost, b.attemptCost, b.armorCost,
      b.plantBite, b.meatBite, b.plantWeight, b.meatWeight, b.plantEff, b.meatEff, b.attackPower, b.defense,
      b.reach, b.bodyEnergy, b.bodyMatter, b.threshold,
    ]) {
      reverse(arr as unknown as { length: number; [i: number]: number });
    }
    reverse(b.genes as unknown as { length: number; [i: number]: number }, GENE_COUNT);
    a.step();
    b.step();
    for (let cell = 0; cell < a.food.length; cell++) expect(b.food[cell]).toBeCloseTo(a.food[cell]!, 9);
  });
});

describe("sensing", () => {
  /** Average distance from a food-rich spot after a short time, for organisms that start nearby. */
  function meanDistanceToFood(senseRange: number): number {
    let total = 0;
    const trials = 40;
    for (let seed = 1; seed <= trials; seed++) {
      const sim = new Simulation(seed, {
        worldWidth: 64,
        worldHeight: 64,
        foodCellSize: 8,
        fertilityScale: 1,
        fertilityVariation: 0,
        initialOrganisms: 1,
        maxOrganisms: 4,
        initialSpeed: 0.5,
        initialSenseRange: senseRange,
        steerGain: 3,
        foodRegrowPerTick: 0,
        biteRate: 1e-9, // eating must not use up the food we are measuring against
        reproThresholdPerSize: 1e9,
        initialEnergyFraction: 0.5,
        mutationRateMin: 0,
        mutationRateMax: 0,
        initialMutationRate: 0,
      });
      sim.food.fill(0);
      sim.food[4 * 8 + 4] = sim.config.foodCap; // the cell centered at (36, 36)
      sim.x[0] = 20; // two cells to the west
      sim.y[0] = 36;
      sim.run(80);
      const dx = Math.abs(sim.x[0]! - 36);
      const dy = Math.abs(sim.y[0]! - 36);
      total += Math.sqrt(Math.min(dx, 64 - dx) ** 2 + Math.min(dy, 64 - dy) ** 2);
    }
    return total / trials;
  }

  it("an organism that can sense ends up much closer to nearby food than one that cannot", () => {
    const blind = meanDistanceToFood(0);
    const sighted = meanDistanceToFood(12);
    expect(sighted).toBeLessThan(blind * 0.6);
  });
});

describe("energy and life", () => {
  it("starving organisms die", () => {
    const sim = new Simulation(4, { ...SMALL, initialFoodFraction: 0, foodRegrowPerTick: 0 });
    sim.run(2000);
    expect(sim.count).toBe(0);
    expect(sim.totalDeaths).toBe(SMALL.initialOrganisms);
    expect(sim.totalBirths).toBe(0);
  });

  it("a well-fed organism reproduces, and the child gets half the parent's energy", () => {
    const sim = new Simulation(6, {
      ...SMALL,
      initialOrganisms: 1,
      initialEnergyFraction: 0.999,
      basalCostCoeff: 0,
      moveCostCoeff: 0,
    });
    sim.step();
    expect(sim.count).toBe(2);
    expect(sim.parentId[1]).toBe(sim.id[0]);
    // The child got half of the parent's energy, minus what is locked into its body.
    expect(Math.abs(sim.energy[0]! - sim.energy[1]! - sim.bodyEnergy[1]!)).toBeLessThan(0.5);
  });

  it("a bigger body needs more energy to reproduce", () => {
    const sim = new Simulation(7, { ...SMALL, initialOrganisms: 1 });
    const small = sim.threshold[0]!;
    const big = new Simulation(7, { ...SMALL, initialOrganisms: 1, initialSize: 3 }).threshold[0]!;
    expect(big).toBeCloseTo(small * 3, 5);
  });
});

describe("inspecting organisms", () => {
  it("describes an organism with its genes, traits, costs and ancestry", () => {
    const sim = new Simulation(8, { ...SMALL, initialSize: 1.5 });
    sim.run(1200);
    const i = sim.count - 1;
    const snapshot = sim.describe(i);
    expect(snapshot.id).toBe(sim.id[i]);
    expect(snapshot.genes).toHaveLength(GENE_COUNT);
    expect(snapshot.traits.size).toBeCloseTo(sim.size[i]!, 6);
    expect(snapshot.costs.basal).toBeGreaterThan(0);
    expect(snapshot.parentId).toBeLessThan(snapshot.id);
    expect(sim.indexOfId(snapshot.id)).toBe(i);
  });

  it("reports -1 for an organism that is no longer alive", () => {
    const sim = new Simulation(9, SMALL);
    expect(sim.indexOfId(999_999)).toBe(-1);
  });
});

describe("histograms and summaries", () => {
  it("counts every organism exactly once", () => {
    const sim = new Simulation(10, SMALL);
    sim.run(1500);
    for (const name of GENES) {
      const counts = sim.histogram(name, 12);
      expect(counts).toHaveLength(12);
      expect(counts.reduce((a, b) => a + b, 0)).toBe(sim.count);
    }
  });

  it("reports means and spreads consistent with the raw numbers", () => {
    const sim = new Simulation(12, SMALL);
    sim.run(1500);
    const s = sim.stats();
    let sum = 0;
    for (let i = 0; i < sim.count; i++) sum += sim.speed[i]!;
    expect(s.traits.speed.mean).toBeCloseTo(sum / sim.count, 9);
    expect(s.traits.speed.sd).toBeGreaterThanOrEqual(0);
    expect(s.traits.hue.mean).toBeGreaterThan(0);
    expect(s.traits.hue.mean).toBeLessThan(1);
  });
});

describe("config checks", () => {
  it("rejects a world that does not divide into food cells", () => {
    expect(() => makeConfig({ worldWidth: 100, foodCellSize: 8 })).toThrow(/multiple of foodCellSize/);
  });

  it("rejects more starting organisms than the maximum", () => {
    expect(() => makeConfig({ initialOrganisms: 500, maxOrganisms: 100 })).toThrow(/exceeds maxOrganisms/);
  });
});
