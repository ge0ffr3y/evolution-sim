import { describe, expect, it } from "vitest";
import { makeConfig } from "./config";
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
  }, 60_000);

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
});

describe("world rules (checked every tick of a long run)", () => {
  it("keeps every organism inside the world, with sane, finite numbers", () => {
    const sim = new Simulation(7, SMALL);
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
        if (!(sim.speed[i]! >= c.speedMin && sim.speed[i]! <= c.speedMax)) report(t, i, "speed out of limits");
        if (!(sim.size[i]! >= c.sizeMin && sim.size[i]! <= c.sizeMax)) report(t, i, "size out of limits");
        if (!(Math.abs(length - 1) < 1e-3)) report(t, i, "heading is not a unit vector");
      }
      for (let cell = 0; cell < sim.food.length; cell++) {
        const f = sim.food[cell]!;
        if (!(f >= 0 && f <= c.foodCap)) report(t, cell, `food ${f} outside 0..cap`);
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

describe("food", () => {
  it("regrows to the cap and never beyond", () => {
    const sim = new Simulation(1, { ...SMALL, initialOrganisms: 0, initialFoodFraction: 0 });
    sim.run(5000);
    const cap = sim.config.foodCap;
    for (let cell = 0; cell < sim.food.length; cell++) expect(sim.food[cell]).toBeCloseTo(cap, 3);
  });

  it("is eaten by organisms and turned into energy", () => {
    const sim = new Simulation(2, { ...SMALL, foodRegrowPerTick: 0 });
    const before = sim.stats().totalFood;
    sim.run(200);
    expect(sim.stats().totalFood).toBeLessThan(before);
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
      basalCostPerSize: 0,
      moveCostPerSizeSpeedSq: 0,
    });
    sim.step();
    expect(sim.count).toBe(2);
    expect(sim.parentId[1]).toBe(sim.id[0]);
    // Parent kept the other half, so the two energies are about equal.
    expect(Math.abs(sim.energy[0]! - sim.energy[1]!)).toBeLessThan(0.5);
  });

  it("children inherit traits with only small changes", () => {
    const sim = new Simulation(8, { ...SMALL, initialOrganisms: 1, initialEnergyFraction: 0.999, basalCostPerSize: 0 });
    sim.step();
    expect(sim.count).toBe(2);
    expect(Math.abs(sim.speed[1]! - sim.speed[0]!)).toBeLessThan(0.5);
    expect(Math.abs(sim.size[1]! - sim.size[0]!)).toBeLessThan(0.5);
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

describe("Phase 1 behavior: a population that settles and evolves", () => {
  it("settles near a carrying capacity instead of exploding or dying out, for several seeds", () => {
    for (const seed of [1, 2, 3, 4]) {
      const sim = new Simulation(seed);
      const samples: number[] = [];
      for (let t = 1; t <= 6000; t++) {
        sim.step();
        if (t > 3000 && t % 100 === 0) samples.push(sim.count);
      }
      const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
      expect(Math.min(...samples)).toBeGreaterThan(0);
      expect(sim.count).toBeLessThan(sim.config.maxOrganisms);
      // Steady: the population stays within 25% of its own average.
      expect(Math.min(...samples)).toBeGreaterThan(mean * 0.75);
      expect(Math.max(...samples)).toBeLessThan(mean * 1.25);
    }
  }, 120_000);

  it("shows evolution: average size drifts measurably over a long run", () => {
    const sim = new Simulation(21, SMALL);
    const startSize = sim.stats().meanSize;
    sim.run(20_000);
    const end = sim.stats();
    expect(end.population).toBeGreaterThan(0);
    expect(Math.abs(end.meanSize - startSize) / startSize).toBeGreaterThan(0.1);
  }, 120_000);
});
