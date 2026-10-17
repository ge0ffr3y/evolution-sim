import { makeConfig, type SimConfig } from "./config";
import {
  GENE,
  GENES,
  GENE_COUNT,
  clamp01,
  traitRanges,
  traitToGene,
  type GeneName,
  type TraitRange,
  type Traits,
} from "./genome";
import { Rng } from "./rng";

/**
 * Running totals of every energy flow since the start. Energy only enters the
 * living world by being eaten (and plants only get it from the sun, counted as
 * foodRegrown), and only leaves by being burned on upkeep, movement or sensing.
 * The tests check that these books always balance.
 */
export interface EnergyLedger {
  /** Energy organisms gained by eating food. */
  foodEaten: number;
  /** Food that grew back on the grid (the sun's contribution), in food units. */
  foodRegrown: number;
  /** Energy burned on upkeep (staying alive). */
  basalBurned: number;
  /** Energy burned on moving. */
  movementBurned: number;
  /** Energy burned on sensing. */
  sensingBurned: number;
}

export interface TraitSummary {
  mean: number;
  /** Standard deviation: how spread out the population is on this trait. */
  sd: number;
}

/** A summary of the world at one moment, used for charts and CSV output. */
export interface SimStats {
  tick: number;
  population: number;
  totalFood: number;
  /** Energy stored inside living organisms. */
  totalEnergy: number;
  meanEnergy: number;
  /** Births and deaths since the simulation started. */
  totalBirths: number;
  totalDeaths: number;
  traits: Record<GeneName, TraitSummary>;
  ledger: EnergyLedger;
}

/** Everything about one organism, for the inspector panel. */
export interface OrganismSnapshot {
  id: number;
  parentId: number;
  age: number;
  energy: number;
  /** Energy at which it will reproduce. */
  threshold: number;
  x: number;
  y: number;
  genes: number[];
  traits: Traits;
  /** Energy burned per tick on each activity. */
  costs: { basal: number; movement: number; sensing: number };
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Wrap a whole-number cell coordinate around a grid of `size` cells. */
function wrapCell(cell: number, size: number): number {
  return ((cell % size) + size) % size;
}

// Eight compass directions an organism with sensing looks in (unit vectors).
const SQRT_HALF = 0.7071067811865476;
const DIR_X = [1, SQRT_HALF, 0, -SQRT_HALF, -1, -SQRT_HALF, 0, SQRT_HALF];
const DIR_Y = [0, SQRT_HALF, 1, SQRT_HALF, 0, -SQRT_HALF, -1, -SQRT_HALF];

/**
 * The world and everything alive in it.
 *
 * Organisms are stored as "struct of arrays": one typed array per property, so
 * organism number i is described by x[i], y[i], energy[i] and so on. This is
 * much faster than one object per organism once there are thousands of them.
 *
 * Each organism's traits (size, speed, ...) come from its genes. They are
 * worked out once, at birth, along with the energy it costs to live each tick,
 * so the per-tick loop is mostly simple arithmetic on cached numbers.
 *
 * One call to step() is one tick. Everything is driven by the seeded Rng, so
 * the same seed and config always produce exactly the same history.
 */
export class Simulation {
  readonly config: SimConfig;
  readonly seed: number;
  readonly ranges: Record<GeneName, TraitRange>;

  /** Number of ticks completed so far. */
  tick = 0;
  /** Number of organisms currently alive. They occupy indices 0 to count-1. */
  count = 0;
  totalBirths = 0;
  totalDeaths = 0;
  readonly ledger: EnergyLedger = {
    foodEaten: 0,
    foodRegrown: 0,
    basalBurned: 0,
    movementBurned: 0,
    sensingBurned: 0,
  };

  // Food grid. Stored in 64-bit numbers so the energy books balance very precisely.
  readonly gridWidth: number;
  readonly gridHeight: number;
  readonly food: Float64Array;
  /** Most food each cell can hold (varies across the land when fertilityVariation > 0). */
  readonly foodCapacity: Float64Array;
  /** Food each cell regrows per tick. */
  readonly foodRegrow: Float64Array;
  /**
   * Scratch space for sharing food. First it holds the total claim of the
   * organisms in each cell, then (after the cell is divided up) the amount
   * actually eaten there this tick.
   */
  private readonly demand: Float64Array;
  /** Food available per unit of claim in each cell. */
  private readonly share: Float64Array;

  // Per-organism data
  readonly id: Uint32Array;
  readonly parentId: Uint32Array;
  readonly age: Uint32Array;
  readonly x: Float32Array;
  readonly y: Float32Array;
  /** Heading stored as a unit vector, so no trigonometry is needed. */
  readonly headingX: Float32Array;
  readonly headingY: Float32Array;
  readonly energy: Float64Array;
  /** GENE_COUNT numbers per organism: organism i's genes are genes[i*GENE_COUNT ...]. */
  readonly genes: Float32Array;

  // Traits worked out from the genes at birth
  readonly size: Float32Array;
  readonly speed: Float32Array;
  readonly senseRange: Float32Array;
  readonly metabolism: Float32Array;
  readonly mutationRate: Float32Array;

  // Costs and limits worked out from the traits at birth
  readonly basalCost: Float32Array;
  readonly moveCost: Float32Array;
  readonly senseCost: Float32Array;
  /** Most food it can eat in one tick. */
  readonly biteMax: Float32Array;
  /** Its claim on scarce food (see contestStrength). */
  readonly eatWeight: Float32Array;
  /** Energy at which it reproduces. */
  readonly threshold: Float32Array;

  private readonly rng: Rng;
  private nextId = 1;
  /** Indices of organisms that are ready to reproduce this tick. */
  private readonly parents: Uint32Array;
  /** Which food cell each organism stood in this tick. */
  private readonly cellOf: Uint32Array;

  constructor(seed: number, overrides: Partial<SimConfig> = {}) {
    this.config = makeConfig(overrides);
    this.seed = seed;
    this.rng = new Rng(seed);
    this.ranges = traitRanges(this.config);

    const c = this.config;
    this.gridWidth = c.worldWidth / c.foodCellSize;
    this.gridHeight = c.worldHeight / c.foodCellSize;
    const cells = this.gridWidth * this.gridHeight;
    this.foodCapacity = new Float64Array(cells).fill(c.foodCap);
    this.foodRegrow = new Float64Array(cells).fill(c.foodRegrowPerTick);
    if (c.fertilityVariation > 0) this.makeFertilityMap();
    this.food = new Float64Array(cells);
    for (let cell = 0; cell < cells; cell++) this.food[cell] = this.foodCapacity[cell]! * c.initialFoodFraction;
    this.demand = new Float64Array(cells);
    this.share = new Float64Array(cells);

    const n = c.maxOrganisms;
    this.cellOf = new Uint32Array(n);
    this.id = new Uint32Array(n);
    this.parentId = new Uint32Array(n);
    this.age = new Uint32Array(n);
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
    this.headingX = new Float32Array(n);
    this.headingY = new Float32Array(n);
    this.energy = new Float64Array(n);
    this.genes = new Float32Array(n * GENE_COUNT);
    this.size = new Float32Array(n);
    this.speed = new Float32Array(n);
    this.senseRange = new Float32Array(n);
    this.metabolism = new Float32Array(n);
    this.mutationRate = new Float32Array(n);
    this.basalCost = new Float32Array(n);
    this.moveCost = new Float32Array(n);
    this.senseCost = new Float32Array(n);
    this.biteMax = new Float32Array(n);
    this.eatWeight = new Float32Array(n);
    this.threshold = new Float32Array(n);
    this.parents = new Uint32Array(n);

    // First generation: identical bodies with a random color each.
    const founder: number[] = new Array<number>(GENE_COUNT).fill(0);
    founder[GENE.size] = traitToGene(c.initialSize, this.ranges.size);
    founder[GENE.speed] = traitToGene(c.initialSpeed, this.ranges.speed);
    founder[GENE.senseRange] = traitToGene(c.initialSenseRange, this.ranges.senseRange);
    founder[GENE.metabolism] = traitToGene(c.initialMetabolism, this.ranges.metabolism);
    founder[GENE.mutationRate] = traitToGene(c.initialMutationRate, this.ranges.mutationRate);
    for (let i = 0; i < c.initialOrganisms; i++) {
      const index = this.spawn(0, this.rng.range(0, c.worldWidth), this.rng.range(0, c.worldHeight));
      for (let g = 0; g < GENE_COUNT; g++) this.genes[index * GENE_COUNT + g] = founder[g]!;
      this.genes[index * GENE_COUNT + GENE.hue] = this.rng.next();
      this.express(index);
      this.energy[index] = this.threshold[index]! * c.initialEnergyFraction;
    }
  }

  /**
   * Make the land uneven: random fertility values on a coarse lattice, smoothly
   * blended between lattice points, so there are broad rich and barren patches.
   * Uses only exact arithmetic, so every browser draws the same landscape.
   */
  private makeFertilityMap(): void {
    const c = this.config;
    const gw = this.gridWidth;
    const gh = this.gridHeight;
    const scale = c.fertilityScale;
    const lw = gw / scale;
    const lh = gh / scale;
    const lattice = new Float64Array(lw * lh);
    for (let k = 0; k < lattice.length; k++) lattice[k] = this.rng.next();

    for (let cy = 0; cy < gh; cy++) {
      const v = cy / scale;
      const ly = Math.floor(v);
      const ty = v - ly;
      const sy = ty * ty * (3 - 2 * ty);
      for (let cx = 0; cx < gw; cx++) {
        const u = cx / scale;
        const lx = Math.floor(u);
        const tx = u - lx;
        const sx = tx * tx * (3 - 2 * tx);
        const x1 = (lx + 1) % lw;
        const y1 = (ly + 1) % lh;
        const top = lattice[ly * lw + lx]! * (1 - sx) + lattice[ly * lw + x1]! * sx;
        const bottom = lattice[y1 * lw + lx]! * (1 - sx) + lattice[y1 * lw + x1]! * sx;
        const noise = top * (1 - sy) + bottom * sy; // 0 to 1
        const fertility = 1 + c.fertilityVariation * (2 * noise - 1);
        this.foodCapacity[cy * gw + cx] = c.foodCap * fertility;
        this.foodRegrow[cy * gw + cx] = c.foodRegrowPerTick * fertility;
      }
    }
  }

  /**
   * Add one organism at the end of the arrays and return its index, or -1 if
   * the world is full. The caller sets its genes, calls express(), and sets its energy.
   */
  private spawn(parent: number, x: number, y: number): number {
    if (this.count >= this.config.maxOrganisms) return -1;
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

    this.age[i] = 0;
    this.energy[i] = 0;
    return i;
  }

  /**
   * Work out organism i's traits, per-tick costs and limits from its genes.
   * Called automatically at birth. Call it again after editing an organism's
   * genes by hand (tests and future tools do this).
   */
  express(i: number): void {
    const c = this.config;
    const r = this.ranges;
    const g = i * GENE_COUNT;
    const genes = this.genes;

    const size = r.size.min + genes[g + GENE.size]! * (r.size.max - r.size.min);
    const speed = r.speed.min + genes[g + GENE.speed]! * (r.speed.max - r.speed.min);
    const sense = r.senseRange.min + genes[g + GENE.senseRange]! * (r.senseRange.max - r.senseRange.min);
    const metabolism = r.metabolism.min + genes[g + GENE.metabolism]! * (r.metabolism.max - r.metabolism.min);
    const mutation = r.mutationRate.min + genes[g + GENE.mutationRate]! * (r.mutationRate.max - r.mutationRate.min);

    this.size[i] = size;
    this.speed[i] = speed;
    this.senseRange[i] = sense;
    this.metabolism[i] = metabolism;
    this.mutationRate[i] = mutation;

    // size^0.75 is built from square roots: the Math.pow function is not
    // guaranteed to give identical results in every browser.
    const sizeToThreeQuarters = Math.sqrt(size) * Math.sqrt(Math.sqrt(size));
    this.basalCost[i] = c.basalCostCoeff * metabolism * sizeToThreeQuarters;
    this.moveCost[i] = c.moveCostCoeff * size * speed * speed;
    this.senseCost[i] = c.senseCostCoeff * sense;
    const eatingSize = (1 - c.biteSizeBlend) * sizeToThreeQuarters + c.biteSizeBlend * size;
    const bite = c.biteRate * metabolism * eatingSize;
    this.biteMax[i] = bite;
    // Claim on scarce food: bite (strength 0), bite squared (1) or bite cubed (2),
    // blending smoothly in between.
    const k = c.contestStrength;
    this.eatWeight[i] =
      k <= 1 ? bite * (1 - k + k * bite) : bite * bite * (2 - k + (k - 1) * bite);
    this.threshold[i] = c.reproThresholdPerSize * size;
  }

  /** Give a new organism (at index `child`) a mutated copy of its parent's genes. */
  private inheritGenes(child: number, parent: number): void {
    const meta = this.config.metaMutationStd;
    const rate = this.mutationRate[parent]!;
    for (let k = 0; k < GENE_COUNT; k++) {
      const std = k === GENE.mutationRate ? meta : rate;
      this.genes[child * GENE_COUNT + k] = clamp01(this.genes[parent * GENE_COUNT + k]! + this.rng.gaussian() * std);
    }
  }

  /** Advance the world by one tick. */
  step(): void {
    const c = this.config;
    const W = c.worldWidth;
    const H = c.worldHeight;
    const cs = c.foodCellSize;
    const gw = this.gridWidth;
    const gh = this.gridHeight;
    const food = this.food;
    const demand = this.demand;
    const share = this.share;
    const n = this.count;
    const steerLean = c.steerGain / (8 * c.foodCap);

    // Pass 1: every organism senses, turns and moves, then registers how much
    // it wants to eat in the cell it ended up in.
    for (let i = 0; i < n; i++) {
      const x0 = this.x[i]!;
      const y0 = this.y[i]!;
      let hx = this.headingX[i]!;
      let hy = this.headingY[i]!;

      // Sense: an organism that can sense looks in eight directions and leans
      // toward the richer food. (Temporary: brains replace this in Phase 4.)
      const sense = this.senseRange[i]!;
      if (sense > 0) {
        const here = food[Math.floor(y0 / cs) * gw + Math.floor(x0 / cs)]!;
        let gx = 0;
        let gy = 0;
        for (let d = 0; d < 8; d++) {
          const cx = wrapCell(Math.floor((x0 + DIR_X[d]! * sense) / cs), gw);
          const cy = wrapCell(Math.floor((y0 + DIR_Y[d]! * sense) / cs), gh);
          const diff = food[cy * gw + cx]! - here;
          gx += DIR_X[d]! * diff;
          gy += DIR_Y[d]! * diff;
        }
        hx += gx * steerLean;
        hy += gy * steerLean;
      }

      // Wander: turn a little at random, then move forward.
      const turn = this.rng.gaussianFast() * c.turnStd;
      const cosT = 1 - (turn * turn) / 2;
      const sinT = turn - (turn * turn * turn) / 6;
      const rx = hx * cosT - hy * sinT;
      const ry = hx * sinT + hy * cosT;
      // The turn above is approximate, so shrink the heading back to length 1.
      const lengthSq = rx * rx + ry * ry;
      if (lengthSq > 0) {
        const inv = 1 / Math.sqrt(lengthSq);
        hx = rx * inv;
        hy = ry * inv;
      }
      this.headingX[i] = hx;
      this.headingY[i] = hy;

      const speed = this.speed[i]!;
      let nx = x0 + hx * speed;
      let ny = y0 + hy * speed;
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

      const cell = Math.floor(ny / cs) * gw + Math.floor(nx / cs);
      this.cellOf[i] = cell;
      demand[cell] = demand[cell]! + this.eatWeight[i]!;
    }

    // Food: each cell works out how much food there is per unit of claim. If
    // there is plenty, everyone can eat their fill; if it is scarce, claims
    // are met in proportion (see contestStrength). Nothing depends on the
    // order organisms are processed in.
    for (let cell = 0; cell < food.length; cell++) {
      const claimed = demand[cell]!;
      share[cell] = claimed > 0 ? food[cell]! / claimed : 0;
      demand[cell] = 0; // from here on it counts what is actually eaten
    }

    // Pass 2: each organism gains its share of the food, pays for upkeep,
    // moving and sensing (if it cannot pay in full it spends everything it has
    // left and dies), and notes whether it is ready to reproduce.
    let parentCount = 0;
    let basalBurned = 0;
    let movementBurned = 0;
    let sensingBurned = 0;
    const energyPerFood = c.energyPerFood;
    for (let i = 0; i < n; i++) {
      const cell = this.cellOf[i]!;
      const fair = this.eatWeight[i]! * share[cell]!;
      const bite = this.biteMax[i]!;
      const intake = fair < bite ? fair : bite;
      demand[cell] = demand[cell]! + intake;
      let energy = this.energy[i]! + intake * energyPerFood;

      const basal = this.basalCost[i]!;
      const move = this.moveCost[i]!;
      const sensing = this.senseCost[i]!;
      const cost = basal + move + sensing;
      if (energy > cost) {
        energy -= cost;
        basalBurned += basal;
        movementBurned += move;
        sensingBurned += sensing;
      } else {
        const fraction = cost > 0 ? energy / cost : 0;
        basalBurned += basal * fraction;
        movementBurned += move * fraction;
        sensingBurned += sensing * fraction;
        energy = 0;
      }
      this.energy[i] = energy;
      this.age[i]!++;

      if (energy >= this.threshold[i]!) this.parents[parentCount++] = i;
    }

    // Take the eaten food off the grid, then the plants regrow.
    let eaten = 0;
    let regrown = 0;
    for (let cell = 0; cell < food.length; cell++) {
      const consumed = demand[cell]!;
      demand[cell] = 0;
      eaten += consumed;
      const left = food[cell]! - consumed;
      const remaining = left > 0 ? left : 0; // guards against tiny rounding below zero
      const grown = remaining + this.foodRegrow[cell]!;
      const cap = this.foodCapacity[cell]!;
      if (grown > cap) {
        regrown += cap - remaining;
        food[cell] = cap;
      } else {
        regrown += this.foodRegrow[cell]!;
        food[cell] = grown;
      }
    }

    // Births: each parent hands a share of its energy to a slightly mutated child.
    for (let p = 0; p < parentCount; p++) {
      const parent = this.parents[p]!;
      const child = this.spawn(this.id[parent]!, this.x[parent]!, this.y[parent]!);
      if (child < 0) break;
      this.inheritGenes(child, parent);
      this.express(child);
      const given = this.energy[parent]! * c.offspringEnergyFraction;
      this.energy[parent] = this.energy[parent]! - given;
      this.energy[child] = given;
      this.totalBirths++;
    }

    // Deaths: remove everyone who ran out of energy by moving the last
    // organism into the gap. (Order changes, but deterministically.)
    let alive = this.count;
    let i = 0;
    while (i < alive) {
      if (this.energy[i]! <= 0) {
        alive--;
        if (i !== alive) this.moveOrganism(alive, i);
      } else {
        i++;
      }
    }
    this.totalDeaths += this.count - alive;
    this.count = alive;

    const ledger = this.ledger;
    ledger.foodEaten += eaten * energyPerFood;
    ledger.foodRegrown += regrown;
    ledger.basalBurned += basalBurned;
    ledger.movementBurned += movementBurned;
    ledger.sensingBurned += sensingBurned;

    this.tick++;
  }

  private moveOrganism(from: number, to: number): void {
    this.id[to] = this.id[from]!;
    this.parentId[to] = this.parentId[from]!;
    this.age[to] = this.age[from]!;
    this.x[to] = this.x[from]!;
    this.y[to] = this.y[from]!;
    this.headingX[to] = this.headingX[from]!;
    this.headingY[to] = this.headingY[from]!;
    this.energy[to] = this.energy[from]!;
    this.size[to] = this.size[from]!;
    this.speed[to] = this.speed[from]!;
    this.senseRange[to] = this.senseRange[from]!;
    this.metabolism[to] = this.metabolism[from]!;
    this.mutationRate[to] = this.mutationRate[from]!;
    this.basalCost[to] = this.basalCost[from]!;
    this.moveCost[to] = this.moveCost[from]!;
    this.senseCost[to] = this.senseCost[from]!;
    this.biteMax[to] = this.biteMax[from]!;
    this.eatWeight[to] = this.eatWeight[from]!;
    this.threshold[to] = this.threshold[from]!;
    const a = from * GENE_COUNT;
    const b = to * GENE_COUNT;
    for (let k = 0; k < GENE_COUNT; k++) this.genes[b + k] = this.genes[a + k]!;
  }

  /** Run several ticks in a row. */
  run(ticks: number): void {
    for (let t = 0; t < ticks; t++) this.step();
  }

  /** The value of one trait for organism i (hue is the raw 0 to 1 gene). */
  traitOf(name: GeneName, i: number): number {
    switch (name) {
      case "size":
        return this.size[i]!;
      case "speed":
        return this.speed[i]!;
      case "senseRange":
        return this.senseRange[i]!;
      case "metabolism":
        return this.metabolism[i]!;
      case "mutationRate":
        return this.mutationRate[i]!;
      case "hue":
        return this.genes[i * GENE_COUNT + GENE.hue]!;
    }
  }

  stats(): SimStats {
    const n = this.count;
    const sums = new Float64Array(GENE_COUNT);
    const sumsSq = new Float64Array(GENE_COUNT);
    let energySum = 0;
    for (let i = 0; i < n; i++) {
      energySum += this.energy[i]!;
      for (let k = 0; k < GENE_COUNT; k++) {
        const v = this.traitOf(GENES[k]!, i);
        sums[k] = sums[k]! + v;
        sumsSq[k] = sumsSq[k]! + v * v;
      }
    }
    const traits = {} as Record<GeneName, TraitSummary>;
    for (let k = 0; k < GENE_COUNT; k++) {
      const mean = n > 0 ? sums[k]! / n : 0;
      const variance = n > 0 ? Math.max(0, sumsSq[k]! / n - mean * mean) : 0;
      traits[GENES[k]!] = { mean, sd: Math.sqrt(variance) };
    }

    let totalFood = 0;
    for (let cell = 0; cell < this.food.length; cell++) totalFood += this.food[cell]!;

    return {
      tick: this.tick,
      population: n,
      totalFood,
      totalEnergy: energySum,
      meanEnergy: n > 0 ? energySum / n : 0,
      totalBirths: this.totalBirths,
      totalDeaths: this.totalDeaths,
      traits,
      ledger: { ...this.ledger },
    };
  }

  /** How many organisms fall in each of `bins` equal slices of a trait's range. */
  histogram(name: GeneName, bins: number): Uint32Array {
    const counts = new Uint32Array(bins);
    const { min, max } = this.ranges[name];
    const span = max - min;
    if (span <= 0) return counts;
    for (let i = 0; i < this.count; i++) {
      const bin = Math.floor(((this.traitOf(name, i) - min) / span) * bins);
      const clamped = bin < 0 ? 0 : bin >= bins ? bins - 1 : bin;
      counts[clamped] = counts[clamped]! + 1;
    }
    return counts;
  }

  /** Index of the organism with this id, or -1 if it is not alive. */
  indexOfId(id: number): number {
    for (let i = 0; i < this.count; i++) if (this.id[i] === id) return i;
    return -1;
  }

  /** Everything about organism i, for the inspector. */
  describe(i: number): OrganismSnapshot {
    const genes: number[] = [];
    for (let k = 0; k < GENE_COUNT; k++) genes.push(this.genes[i * GENE_COUNT + k]!);
    const traits = {} as Traits;
    for (const name of GENES) traits[name] = this.traitOf(name, i);
    return {
      id: this.id[i]!,
      parentId: this.parentId[i]!,
      age: this.age[i]!,
      energy: this.energy[i]!,
      threshold: this.threshold[i]!,
      x: this.x[i]!,
      y: this.y[i]!,
      genes,
      traits,
      costs: { basal: this.basalCost[i]!, movement: this.moveCost[i]!, sensing: this.senseCost[i]! },
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
    // Hash the raw bits of each number (a 64-bit number is two 32-bit words).
    const mixBits = (array: Float32Array | Float64Array, count: number): void => {
      const words = array instanceof Float64Array ? count * 2 : count;
      const bits = new Uint32Array(array.buffer, array.byteOffset, words);
      for (let i = 0; i < words; i++) mix(bits[i]!);
    };
    const mixInts = (array: Uint32Array, count: number): void => {
      for (let i = 0; i < count; i++) mix(array[i]!);
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
    mixBits(this.x, n);
    mixBits(this.y, n);
    mixBits(this.headingX, n);
    mixBits(this.headingY, n);
    mixBits(this.energy, n);
    mixBits(this.genes, n * GENE_COUNT);
    mixBits(this.food, this.food.length);
    return hash;
  }
}
