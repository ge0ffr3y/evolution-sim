import { describe, expect, it } from "vitest";
import { Rng } from "./rng";
import { SpatialHash } from "./spatial-hash";

const W = 128;
const H = 96;

/** The slow, obviously-correct way to find neighbors: check everyone. */
function bruteForce(xs: Float32Array, ys: Float32Array, count: number, px: number, py: number, r: number): number[] {
  const found: number[] = [];
  for (let i = 0; i < count; i++) {
    let dx = Math.abs(xs[i]! - px);
    let dy = Math.abs(ys[i]! - py);
    if (dx > W / 2) dx = W - dx;
    if (dy > H / 2) dy = H - dy;
    if (dx * dx + dy * dy <= r * r) found.push(i);
  }
  return found.sort((a, b) => a - b);
}

function randomPoints(seed: number, count: number): { xs: Float32Array; ys: Float32Array } {
  const rng = new Rng(seed);
  const xs = new Float32Array(count);
  const ys = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    xs[i] = rng.range(0, W);
    ys[i] = rng.range(0, H);
  }
  return { xs, ys };
}

function search(hash: SpatialHash, px: number, py: number, r: number): number[] {
  const found: number[] = [];
  hash.forEachNear(px, py, r, (i) => found.push(i));
  return found.sort((a, b) => a - b);
}

describe("SpatialHash", () => {
  it("finds exactly the same neighbors as checking everyone, for many random searches", () => {
    const count = 500;
    const { xs, ys } = randomPoints(1, count);
    const hash = new SpatialHash(W, H, 8, count);
    hash.rebuild(xs, ys, count);

    const rng = new Rng(2);
    for (let q = 0; q < 300; q++) {
      const px = rng.range(0, W);
      const py = rng.range(0, H);
      const r = rng.range(0.5, 40);
      expect(search(hash, px, py, r)).toEqual(bruteForce(xs, ys, count, px, py, r));
    }
  });

  it("finds neighbors across the wraparound edges", () => {
    const xs = new Float32Array([1, W - 1, W / 2]);
    const ys = new Float32Array([1, H - 1, H / 2]);
    const hash = new SpatialHash(W, H, 8, 3);
    hash.rebuild(xs, ys, 3);
    // Organism 0 is at the top-left corner; organism 1 is just past the opposite corner.
    expect(search(hash, 1, 1, 4)).toEqual([0, 1]);
    expect(search(hash, W - 1, H - 1, 4)).toEqual([0, 1]);
    expect(search(hash, W / 2, H / 2, 4)).toEqual([2]);
  });

  it("handles a search bigger than the whole world without listing anyone twice", () => {
    const count = 100;
    const { xs, ys } = randomPoints(3, count);
    const hash = new SpatialHash(W, H, 8, count);
    hash.rebuild(xs, ys, count);
    const found = search(hash, 10, 10, 500);
    expect(found).toEqual(Array.from({ length: count }, (_, i) => i));
  });

  it("only indexes the organisms it is told about, and can be rebuilt", () => {
    const { xs, ys } = randomPoints(4, 50);
    const hash = new SpatialHash(W, H, 8, 50);
    hash.rebuild(xs, ys, 50);
    expect(search(hash, 0, 0, 1000)).toHaveLength(50);
    hash.rebuild(xs, ys, 10);
    expect(search(hash, 0, 0, 1000)).toHaveLength(10);
    hash.rebuild(xs, ys, 0);
    expect(search(hash, 0, 0, 1000)).toHaveLength(0);
  });

  it("returns results in the same order every time", () => {
    const { xs, ys } = randomPoints(5, 200);
    const hash = new SpatialHash(W, H, 8, 200);
    hash.rebuild(xs, ys, 200);
    const order = (): number[] => {
      const found: number[] = [];
      hash.forEachNear(60, 40, 25, (i) => found.push(i));
      return found;
    };
    expect(order()).toEqual(order());
  });

  it("rejects a world that does not divide into buckets", () => {
    expect(() => new SpatialHash(100, 100, 8, 10)).toThrow(/multiple of cellSize/);
  });
});
