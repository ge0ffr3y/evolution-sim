/**
 * Seeded random number generator (xoshiro128**).
 *
 * This is the ONLY source of randomness the simulation may use.
 * Same seed in -> exactly the same sequence out, on every machine.
 */

/** The four 32-bit numbers that make up the generator's internal state. */
export type RngState = readonly [number, number, number, number];

/** SplitMix32: turns one seed number into well-mixed numbers to fill the state. */
function splitmix32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x9e3779b9) >>> 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t ^= t >>> 15;
    t = Math.imul(t, 0x735a2d97);
    t ^= t >>> 15;
    return t >>> 0;
  };
}

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

/** One over the standard deviation of the sum of four random bytes. */
const GAUSSIAN_FAST_SCALE = 1 / Math.sqrt((4 * (256 * 256 - 1)) / 12);

export class Rng {
  private s0: number;
  private s1: number;
  private s2: number;
  private s3: number;

  constructor(seed: number) {
    const mix = splitmix32(seed);
    this.s0 = mix();
    this.s1 = mix();
    this.s2 = mix();
    this.s3 = mix();
  }

  /** Next random 32-bit unsigned integer. */
  nextUint32(): number {
    const result = (Math.imul(rotl(Math.imul(this.s1, 5), 7), 9) >>> 0);
    const t = (this.s1 << 9) >>> 0;

    this.s2 ^= this.s0;
    this.s3 ^= this.s1;
    this.s1 ^= this.s2;
    this.s0 ^= this.s3;
    this.s2 ^= t;
    this.s3 = rotl(this.s3, 11);

    this.s0 >>>= 0;
    this.s1 >>>= 0;
    this.s2 >>>= 0;
    this.s3 >>>= 0;
    return result;
  }

  /** Random number in [0, 1). */
  next(): number {
    return this.nextUint32() / 4294967296;
  }

  /** Random number in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Random whole number from 0 up to (but not including) maxExclusive. */
  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  /** True with the given probability (0 to 1). */
  chance(probability: number): boolean {
    return this.next() < probability;
  }

  /**
   * Approximately normal (bell-curve) random number. Handy for small mutations.
   *
   * Sums 12 uniform numbers (the Irwin-Hall method) instead of using log/cos,
   * because Math.log and Math.cos can differ in the last digit between browsers.
   * Plain addition is exact everywhere, so every browser gets the same history.
   * Output is limited to within 6 standard deviations of the mean.
   */
  gaussian(mean = 0, stdDev = 1): number {
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += this.next();
    return mean + stdDev * (sum - 6);
  }

  /**
   * A cheap, rough bell curve for noise that is needed for every organism every
   * tick. It uses ONE random 32-bit number, split into four bytes that are added
   * together (so it stays within about 3.5 standard deviations and has 8-bit
   * resolution). Profiling showed the random-number generator was a third of the
   * whole simulation's run time, and this is a quarter of the cost of drawing
   * four separate uniform numbers. Only exact arithmetic is used.
   */
  gaussianFast(mean = 0, stdDev = 1): number {
    const word = this.nextUint32();
    const sum = (word & 255) + ((word >>> 8) & 255) + ((word >>> 16) & 255) + (word >>> 24);
    // Four bytes (0-255) sum to a mean of 510 with variance 4 * (256^2 - 1) / 12.
    return mean + stdDev * (sum - 510) * GAUSSIAN_FAST_SCALE;
  }

  /** Copy of the internal state, so a run can be saved and resumed exactly. */
  getState(): RngState {
    return [this.s0, this.s1, this.s2, this.s3];
  }

  /** Restore a state previously returned by getState(). */
  setState(state: RngState): void {
    [this.s0, this.s1, this.s2, this.s3] = state;
  }
}
