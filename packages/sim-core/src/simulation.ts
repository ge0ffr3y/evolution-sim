import { makeConfig, type SimConfig } from "./config";
import { Rng } from "./rng";

/** A summary of the world at one moment, used for charts and CSV output. */
export interface SimStats {
  tick: number;
  population: number;
  totalFood: number;
  meanSpeed: number;
  meanSize: number;
  meanEnergy: number;
  /** Births and deaths since the simulation started. */
  totalBirths: number;
  totalDeaths: number;
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/**
 * The world and everything alive in it.
 *
 * Organisms are stored as "struct of arrays": one typed array per property, so
 * organism number i is described by x[i], y[i], energy[i] and so on. This is
 * much faster than one object per organism once there are thousands of them.
 *
 * One call to step() is one tick. Everything is driven by the seeded Rng, so
 * the same seed and config always produce exactly the same history.
 */
export class Simulation {
  readonly config: SimConfig;
  readonly seed: number;

  /** Number of ticks completed so far. */
  tick = 0;
  /** Number of organisms currently alive. They occupy indices 0 to count-1. */
  count = 0;
  totalBirths = 0;
  totalDeaths = 0;

  // Food grid
  readonly gridWidth: number;
  readonly gridHeight: number;
  readonly food: Float32Array;

  // Organism arrays (struct of arrays)
  readonly id: Uint32Array;
  readonly parentId: Uint32Array;
  readonly x: Float32Array;
  readonly y: Float32Array;
  /** Heading stored as a unit vector, so no trigonometry is needed. */
  readonly headingX: Float32Array;
  readonly headingY: Float32Array;
  readonly energy: Float32Array;
  readonly age: Uint32Array;
  readonly speed: Float32Array;
  readonly size: Float32Array;

  private readonly rng: Rng;
  private nextId = 1;
  /** Indices of organisms that are ready to reproduce this tick. */
  private readonly parents: Uint32Array;

  constructor(seed: number, overrides: Partial<SimConfig> = {}) {
    this.config = makeConfig(overrides);
    this.seed = seed;
    this.rng = new Rng(seed);

    const c = this.config;
    this.gridWidth = c.worldWidth / c.foodCellSize;
    this.gridHeight = c.worldHeight / c.foodCellSize;
    this.food = new Float32Array(this.gridWidth * this.gridHeight).fill(c.foodCap * c.initialFoodFraction);

    const n = c.maxOrganisms;
    this.id = new Uint32Array(n);
    this.parentId = new Uint32Array(n);
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
    this.headingX = new Float32Array(n);
    this.headingY = new Float32Array(n);
    this.energy = new Float32Array(n);
    this.age = new Uint32Array(n);
    this.speed = new Float32Array(n);
    this.size = new Float32Array(n);
    this.parents = new Uint32Array(n);

    for (let i = 0; i < c.initialOrganisms; i++) {
      this.spawn(
        0,
        this.rng.range(0, c.worldWidth),
        this.rng.range(0, c.worldHeight),
        c.initialSpeed,
        c.initialSize,
        c.reproThresholdPerSize * c.initialSize * c.initialEnergyFraction,
      );
    }
  }

  /** Add one organism at the end of the arrays. Returns false if the world is full. */
  private spawn(parent: number, x: number, y: number, speed: number, size: number, energy: number): boolean {
    if (this.count >= this.config.maxOrganisms) return false;
    const i = this.count++;
    this.id[i] = this.nextId++;
    this.parentId[i] = parent;
    this.x[i] = x;
    this.y[i] = y;

    // Random heading: pick a random direction vector and shrink it to length 1.
    let hx = this.rng.gaussian();
    let hy = this.rng.gaussian();
    let len = Math.sqrt(hx * hx + hy * hy);
    if (len === 0) {
      hx = 1;
      hy = 0;
      len = 1;
    }
    this.headingX[i] = hx / len;
    this.headingY[i] = hy / len;

    this.energy[i] = energy;
    this.age[i] = 0;
    this.speed[i] = speed;
    this.size[i] = size;
    return true;
  }

  /** Advance the world by one tick. */
  step(): void {
    const c = this.config;
    const W = c.worldWidth;
    const H = c.worldHeight;
    const n = this.count;
    let parentCount = 0;

    // Start from a different organism each tick, so nobody always gets first
    // pick of the food in a shared cell. This is deterministic (it depends only
    // on the tick number), not random.
    const start = n > 0 ? this.tick % n : 0;

    for (let k = 0; k < n; k++) {
      let i = start + k;
      if (i >= n) i -= n;

      // 1. Wander: turn a little at random, then move forward.
      const turn = this.rng.gaussian() * c.turnStd;
      const cosT = 1 - (turn * turn) / 2;
      const sinT = turn - (turn * turn * turn) / 6;
      let hx = this.headingX[i]! * cosT - this.headingY[i]! * sinT;
      let hy = this.headingX[i]! * sinT + this.headingY[i]! * cosT;
      // The turn above is approximate, so shrink the heading back to length 1.
      const inv = 1 / Math.sqrt(hx * hx + hy * hy);
      hx *= inv;
      hy *= inv;
      this.headingX[i] = hx;
      this.headingY[i] = hy;

      const speed = this.speed[i]!;
      let nx = this.x[i]! + hx * speed;
      let ny = this.y[i]! + hy * speed;
      // Wrap around the edges (the world is a torus).
      nx -= Math.floor(nx / W) * W;
      ny -= Math.floor(ny / H) * H;
      nx = Math.fround(nx);
      ny = Math.fround(ny);
      // Rounding to 32 bits can land exactly on the far edge; fold it back to 0.
      if (nx >= W) nx = 0;
      if (ny >= H) ny = 0;
      this.x[i] = nx;
      this.y[i] = ny;

      // 2. Eat whatever food is in this cell, up to one bite.
      const cell =
        Math.floor(ny / c.foodCellSize) * this.gridWidth + Math.floor(nx / c.foodCellSize);
      const size = this.size[i]!;
      const available = this.food[cell]!;
      const bite = Math.min(available, c.biteRate * size);
      this.food[cell] = available - bite;

      // 3. Pay for living and moving. Bigger and faster costs more.
      let energy =
        this.energy[i]! +
        bite * c.energyPerFood -
        c.basalCostPerSize * size -
        c.moveCostPerSizeSpeedSq * size * speed * speed;
      this.energy[i] = energy;
      this.age[i]!++;

      // 4. Note who is ready to split. (Deaths are handled after the loop.)
      if (energy >= c.reproThresholdPerSize * size) {
        this.parents[parentCount++] = i;
      }
    }

    // Births: each parent hands a share of its energy to a slightly mutated child.
    for (let p = 0; p < parentCount; p++) {
      const i = this.parents[p]!;
      const given = this.energy[i]! * c.offspringEnergyFraction;
      const speed = clamp(this.speed[i]! + this.rng.gaussian() * c.mutationStdSpeed, c.speedMin, c.speedMax);
      const size = clamp(this.size[i]! + this.rng.gaussian() * c.mutationStdSize, c.sizeMin, c.sizeMax);
      if (this.spawn(this.id[i]!, this.x[i]!, this.y[i]!, speed, size, given)) {
        this.energy[i] = this.energy[i]! - given;
        this.totalBirths++;
      }
    }

    // Deaths: remove everyone out of energy, keeping the others in their existing order.
    let write = 0;
    const total = this.count;
    for (let read = 0; read < total; read++) {
      if (this.energy[read]! > 0) {
        if (write !== read) this.moveOrganism(read, write);
        write++;
      }
    }
    this.totalDeaths += total - write;
    this.count = write;

    // Plants regrow, up to the cap.
    const food = this.food;
    for (let cell = 0; cell < food.length; cell++) {
      const grown = food[cell]! + c.foodRegrowPerTick;
      food[cell] = grown > c.foodCap ? c.foodCap : grown;
    }

    this.tick++;
  }

  private moveOrganism(from: number, to: number): void {
    this.id[to] = this.id[from]!;
    this.parentId[to] = this.parentId[from]!;
    this.x[to] = this.x[from]!;
    this.y[to] = this.y[from]!;
    this.headingX[to] = this.headingX[from]!;
    this.headingY[to] = this.headingY[from]!;
    this.energy[to] = this.energy[from]!;
    this.age[to] = this.age[from]!;
    this.speed[to] = this.speed[from]!;
    this.size[to] = this.size[from]!;
  }

  /** Run several ticks in a row. */
  run(ticks: number): void {
    for (let t = 0; t < ticks; t++) this.step();
  }

  stats(): SimStats {
    const n = this.count;
    let speedSum = 0;
    let sizeSum = 0;
    let energySum = 0;
    for (let i = 0; i < n; i++) {
      speedSum += this.speed[i]!;
      sizeSum += this.size[i]!;
      energySum += this.energy[i]!;
    }
    let totalFood = 0;
    for (let cell = 0; cell < this.food.length; cell++) totalFood += this.food[cell]!;

    return {
      tick: this.tick,
      population: n,
      totalFood,
      meanSpeed: n > 0 ? speedSum / n : 0,
      meanSize: n > 0 ? sizeSum / n : 0,
      meanEnergy: n > 0 ? energySum / n : 0,
      totalBirths: this.totalBirths,
      totalDeaths: this.totalDeaths,
    };
  }

  /**
   * A single number summarizing the entire state of the world. Two runs with
   * the same seed and config must produce the same fingerprint at the same tick.
   * Used by the determinism test.
   */
  fingerprint(): number {
    let hash = 0x811c9dc5; // FNV-1a hash
    const mix = (value: number): void => {
      hash = Math.imul(hash ^ value, 0x01000193) >>> 0;
    };
    const mixFloats = (array: Float32Array, length: number): void => {
      const bits = new Uint32Array(array.buffer, array.byteOffset, length);
      for (let i = 0; i < length; i++) mix(bits[i]!);
    };
    const mixInts = (array: Uint32Array, length: number): void => {
      for (let i = 0; i < length; i++) mix(array[i]!);
    };

    mix(this.tick);
    mix(this.count);
    mix(this.nextId);
    mix(this.totalBirths);
    mix(this.totalDeaths);
    for (const word of this.rng.getState()) mix(word);

    const n = this.count;
    mixInts(this.id, n);
    mixInts(this.parentId, n);
    mixInts(this.age, n);
    mixFloats(this.x, n);
    mixFloats(this.y, n);
    mixFloats(this.headingX, n);
    mixFloats(this.headingY, n);
    mixFloats(this.energy, n);
    mixFloats(this.speed, n);
    mixFloats(this.size, n);
    mixFloats(this.food, this.food.length);
    return hash;
  }
}
