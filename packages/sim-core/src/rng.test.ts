import { describe, expect, it } from "vitest";
import { Rng } from "./rng";

function sequence(seed: number, count: number): number[] {
  const rng = new Rng(seed);
  return Array.from({ length: count }, () => rng.next());
}

describe("Rng determinism", () => {
  it("gives the exact same numbers for the same seed", () => {
    expect(sequence(42, 1000)).toEqual(sequence(42, 1000));
  });

  it("produces the hand-checked xoshiro128** values for a known starting state", () => {
    // Worked out by hand from the algorithm for the starting state [1, 2, 3, 4].
    const rng = new Rng(0);
    rng.setState([1, 2, 3, 4]);
    expect([rng.nextUint32(), rng.nextUint32(), rng.nextUint32()]).toEqual([11520, 0, 5927040]);
  });

  it("gives different numbers for different seeds", () => {
    expect(sequence(42, 20)).not.toEqual(sequence(43, 20));
  });

  it("works with seed 0 and negative or fractional seeds without getting stuck", () => {
    for (const seed of [0, -1, 1.5, 2 ** 32, 2 ** 40]) {
      const values = sequence(seed, 50);
      expect(new Set(values).size).toBeGreaterThan(40);
    }
  });

  it("can save and restore its state and continue identically", () => {
    const rng = new Rng(7);
    for (let i = 0; i < 100; i++) rng.next();
    const saved = rng.getState();
    const expected = Array.from({ length: 50 }, () => rng.next());

    const other = new Rng(999);
    other.setState(saved);
    const actual = Array.from({ length: 50 }, () => other.next());
    expect(actual).toEqual(expected);
  });
});

describe("Rng output ranges", () => {
  it("next() stays in [0, 1)", () => {
    const rng = new Rng(1);
    for (let i = 0; i < 10000; i++) {
      const x = rng.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("range() stays inside its bounds", () => {
    const rng = new Rng(2);
    for (let i = 0; i < 10000; i++) {
      const x = rng.range(-5, 5);
      expect(x).toBeGreaterThanOrEqual(-5);
      expect(x).toBeLessThan(5);
    }
  });

  it("int() returns whole numbers below the limit and hits every value", () => {
    const rng = new Rng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      const n = rng.int(6);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(6);
      seen.add(n);
    }
    expect(seen.size).toBe(6);
  });
});

describe("Rng statistics (sanity checks)", () => {
  it("next() has a mean near 0.5", () => {
    const rng = new Rng(11);
    let sum = 0;
    const n = 100000;
    for (let i = 0; i < n; i++) sum += rng.next();
    expect(sum / n).toBeGreaterThan(0.49);
    expect(sum / n).toBeLessThan(0.51);
  });

  it("gaussian() has roughly the requested mean and spread", () => {
    const rng = new Rng(12);
    const n = 100000;
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const x = rng.gaussian(10, 2);
      sum += x;
      sumSq += x * x;
    }
    const mean = sum / n;
    const std = Math.sqrt(sumSq / n - mean * mean);
    expect(mean).toBeGreaterThan(9.95);
    expect(mean).toBeLessThan(10.05);
    expect(std).toBeGreaterThan(1.95);
    expect(std).toBeLessThan(2.05);
  });

  it("chance() fires at about the requested rate", () => {
    const rng = new Rng(13);
    let hits = 0;
    const n = 100000;
    for (let i = 0; i < n; i++) if (rng.chance(0.25)) hits++;
    expect(hits / n).toBeGreaterThan(0.24);
    expect(hits / n).toBeLessThan(0.26);
  });
});
