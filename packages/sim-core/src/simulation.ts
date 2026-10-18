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
import { SpatialHash } from "./spatial-hash";

/**
 * Running totals of every energy flow since the start.
 *
 * Energy enters the living world in exactly one way: sunlight, captured by plants
 * (sunlightIn). It leaves in exactly two ways: as heat from living (the "burned"
 * entries), and as heat lost in digesting and in rotting. Everything else is just
 * energy changing hands. The tests check that these books always balance.
 */
export interface EnergyLedger {
  /** Sunlight captured by plants as they grow. The only source of energy. */
  sunlightIn: number;
  /** Energy taken out of plants by plant eaters (before digestion losses). */
  plantEaten: number;
  /** Energy taken out of corpses by meat eaters (before digestion losses). */
  meatEaten: number;
  /** Heat lost because digestion is never perfect. */
  digestionLoss: number;
  /** Heat lost as corpses rot. */
  decayLoss: number;
  /** Heat from upkeep (staying alive). */
  basalBurned: number;
  /** Heat from moving. */
  movementBurned: number;
  /** Heat from sensing. */
  sensingBurned: number;
  /** Heat from keeping weapons ready and making attacks. */
  attackBurned: number;
  /** Heat from carrying armor. */
  armorBurned: number;
}

export interface TraitSummary {
  mean: number;
  /** Standard deviation: how spread out the population is on this trait. */
  sd: number;
}

/** How many organisms eat what, judged by their diet gene. */
export interface DietClasses {
  herbivores: number;
  omnivores: number;
  carnivores: number;
}

/** Notable firsts in the history of a run. */
export type SimEventKind = "firstScavenger" | "firstKill" | "firstPredator" | "firstCarnivore";

export interface SimEvent {
  tick: number;
  kind: SimEventKind;
  /** The organism that triggered it. */
  organismId: number;
  text: string;
}

/** Everything that is made of matter, so the tests can check that none is created or destroyed. */
export interface MatterAudit {
  soilNutrient: number;
  plants: number;
  corpses: number;
  detritus: number;
  bodies: number;
  total: number;
}

/** Everything that holds energy, for the same purpose. */
export interface EnergyAudit {
  /** Energy organisms carry around to spend. */
  stores: number;
  /** Energy locked into living bodies. */
  bodies: number;
  plants: number;
  corpses: number;
  total: number;
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
  /** Deaths caused by another organism, and total deaths from starvation. */
  totalKills: number;
  totalStarved: number;
  /** Births that could not happen because the soil had no nutrients for the baby. */
  blockedBirths: number;
  traits: Record<GeneName, TraitSummary>;
  classes: DietClasses;
  /** Matter in the soil, as rotting meat, and as detritus. */
  totalNutrient: number;
  totalCorpseMatter: number;
  totalDetritus: number;
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
  costs: { basal: number; movement: number; sensing: number; attack: number; armor: number };
  /** Lifetime energy gained from plants and from meat, and kills made. */
  plantTaken: number;
  meatTaken: number;
  kills: number;
}

/** Wrap a whole-number cell coordinate around a grid of `size` cells. */
function wrapCell(cell: number, size: number): number {
  return ((cell % size) + size) % size;
}

function sumOf(array: Float64Array): number {
  let total = 0;
  for (let i = 0; i < array.length; i++) total += array[i]!;
  return total;
}

// Eight compass directions an organism with sensing looks in (unit vectors).
const SQRT_HALF = 0.7071067811865476;
const DIR_X = [1, SQRT_HALF, 0, -SQRT_HALF, -1, -SQRT_HALF, 0, SQRT_HALF];
const DIR_Y = [0, SQRT_HALF, 1, SQRT_HALF, 0, -SQRT_HALF, -1, -SQRT_HALF];

/** Diet cutoffs for the display classes. */
const HERBIVORE_BELOW = 0.25;
const CARNIVORE_ABOVE = 0.75;
/** What counts as "survives mostly on meat": age, total intake and meat share of that intake. */
const CARNIVORE_MIN_AGE = 300;
const CARNIVORE_MIN_INTAKE = 50;
const CARNIVORE_MIN_MEAT_SHARE = 0.7;
const SCAVENGER_MIN_MEAT = 10;
const PREDATOR_MIN_KILLS = 3;
/** How often (in ticks) the slower event checks run. */
const EVENT_CHECK_EVERY = 10;

/**
 * The world and everything alive in it.
 *
 * Organisms are stored as "struct of arrays": one typed array per property, so
 * organism number i is described by x[i], y[i], energy[i] and so on. This is
 * much faster than one object per organism once there are thousands of them.
 *
 * Each organism's traits come from its genes. They are worked out once, at birth,
 * along with the energy it costs to live each tick, so the per-tick loop is mostly
 * simple arithmetic on cached numbers.
 *
 * Two things are conserved, and both are checked by tests:
 *  - ENERGY flows one way: sun -> plants -> eaters -> heat.
 *  - MATTER goes round in a loop: soil nutrient -> plants -> (eaten, excreted) ->
 *    detritus -> soil nutrient, and soil -> bodies -> corpses -> detritus -> soil.
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
  totalKills = 0;
  totalStarved = 0;
  blockedBirths = 0;
  readonly events: SimEvent[] = [];
  readonly ledger: EnergyLedger = {
    sunlightIn: 0,
    plantEaten: 0,
    meatEaten: 0,
    digestionLoss: 0,
    decayLoss: 0,
    basalBurned: 0,
    movementBurned: 0,
    sensingBurned: 0,
    attackBurned: 0,
    armorBurned: 0,
  };

  // The land. Everything here is stored in 64-bit numbers so the books balance very precisely.
  readonly gridWidth: number;
  readonly gridHeight: number;
  /** Plant food standing in each cell. */
  readonly food: Float64Array;
  /** Most plant food each cell can hold (varies across the land when fertilityVariation > 0). */
  readonly foodCapacity: Float64Array;
  /** The fastest each cell's plants can grow per tick (sunlight-limited). */
  readonly foodRegrow: Float64Array;
  /** Soil nutrient in each cell. Plants need it to grow. */
  readonly nutrient: Float64Array;
  /** Dead bodies lying in each cell: how much matter, and how much energy they still hold. */
  readonly corpseMatter: Float64Array;
  readonly corpseEnergy: Float64Array;
  /** Waste and rotted corpses that will turn back into nutrient. */
  readonly detritus: Float64Array;

  // Scratch space for sharing food (see step()).
  private readonly plantClaim: Float64Array;
  private readonly meatClaim: Float64Array;
  private readonly plantShare: Float64Array;
  private readonly meatShare: Float64Array;
  private readonly meatDensity: Float64Array;

  // Per-organism data
  readonly id: Uint32Array;
  readonly parentId: Uint32Array;
  readonly age: Uint32Array;
  readonly kills: Uint32Array;
  readonly x: Float32Array;
  readonly y: Float32Array;
  /** Heading stored as a unit vector, so no trigonometry is needed. */
  readonly headingX: Float32Array;
  readonly headingY: Float32Array;
  readonly energy: Float64Array;
  /** Lifetime energy gained from plants and from meat. */
  readonly plantTaken: Float64Array;
  readonly meatTaken: Float64Array;
  /** GENE_COUNT numbers per organism: organism i's genes are genes[i*GENE_COUNT ...]. */
  readonly genes: Float32Array;
  /** 1 if it was killed this tick. */
  readonly killed: Uint8Array;
  /** 1 if it made an attack this tick. */
  readonly attempted: Uint8Array;
  /** Ticks left before it can attack again (after a kill). */
  readonly resting: Uint16Array;

  // Traits worked out from the genes at birth
  readonly size: Float32Array;
  readonly speed: Float32Array;
  readonly senseRange: Float32Array;
  readonly metabolism: Float32Array;
  readonly mutationRate: Float32Array;
  readonly diet: Float32Array;
  readonly attack: Float32Array;
  readonly armor: Float32Array;

  // Costs and limits worked out from the traits at birth
  readonly basalCost: Float32Array;
  readonly moveCost: Float32Array;
  readonly senseCost: Float32Array;
  readonly attackCost: Float32Array;
  readonly attemptCost: Float32Array;
  readonly armorCost: Float32Array;
  /** Most plant food and most meat it can eat in one tick (mass, not energy). */
  readonly plantBite: Float32Array;
  readonly meatBite: Float32Array;
  /** Its claim on scarce plants and scarce meat (see contestStrength). */
  readonly plantWeight: Float32Array;
  readonly meatWeight: Float32Array;
  /** How much of the energy in plants and in meat it can actually use. */
  readonly plantEff: Float32Array;
  readonly meatEff: Float32Array;
  /** Strength of its attacks, how hard it is to kill, and how far it can reach. */
  readonly attackPower: Float32Array;
  readonly defense: Float32Array;
  readonly reach: Float32Array;
  /** Energy and matter locked into its body. */
  readonly bodyEnergy: Float32Array;
  readonly bodyMatter: Float32Array;
  /** Energy at which it reproduces. */
  readonly threshold: Float32Array;

  private readonly rng: Rng;
  private readonly hash: SpatialHash;
  private nextId = 1;
  /** Which food cell each organism stood in this tick. */
  private readonly cellOf: Uint32Array;
  /** Indices of organisms that are ready to reproduce this tick. */
  private readonly parents: Uint32Array;

  // State for the "find the nearest prey" search, kept here so the search callback allocates nothing.
  private pickAttacker = 0;
  private pickBest = -1;
  private pickBestDistSq = Infinity;
  private pickSizeLimit = 0;
  private readonly considerPrey = (index: number, distSq: number): void => {
    if (index === this.pickAttacker || this.killed[index] === 1 || this.size[index]! > this.pickSizeLimit) return;
    if (distSq < this.pickBestDistSq || (distSq === this.pickBestDistSq && index < this.pickBest)) {
      this.pickBest = index;
      this.pickBestDistSq = distSq;
    }
  };

  private seenScavenger = false;
  private seenKill = false;
  private seenPredator = false;
  private seenCarnivore = false;

  // Arrays that must all move together when an organism is shuffled to a new slot.
  private readonly float32Fields: Float32Array[];
  private readonly float64Fields: Float64Array[];
  private readonly uint32Fields: Uint32Array[];
  private readonly uint8Fields: Uint8Array[];
  private readonly uint16Fields: Uint16Array[];

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
    this.nutrient = new Float64Array(cells).fill(c.initialNutrientPerCell);
    this.corpseMatter = new Float64Array(cells);
    this.corpseEnergy = new Float64Array(cells);
    this.detritus = new Float64Array(cells);
    this.plantClaim = new Float64Array(cells);
    this.meatClaim = new Float64Array(cells);
    this.plantShare = new Float64Array(cells);
    this.meatShare = new Float64Array(cells);
    this.meatDensity = new Float64Array(cells);

    const n = c.maxOrganisms;
    this.hash = new SpatialHash(c.worldWidth, c.worldHeight, c.foodCellSize, n);
    this.cellOf = new Uint32Array(n);
    this.parents = new Uint32Array(n);

    this.id = new Uint32Array(n);
    this.parentId = new Uint32Array(n);
    this.age = new Uint32Array(n);
    this.kills = new Uint32Array(n);
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
    this.headingX = new Float32Array(n);
    this.headingY = new Float32Array(n);
    this.energy = new Float64Array(n);
    this.plantTaken = new Float64Array(n);
    this.meatTaken = new Float64Array(n);
    this.genes = new Float32Array(n * GENE_COUNT);
    this.killed = new Uint8Array(n);
    this.attempted = new Uint8Array(n);
    this.resting = new Uint16Array(n);
    this.size = new Float32Array(n);
    this.speed = new Float32Array(n);
    this.senseRange = new Float32Array(n);
    this.metabolism = new Float32Array(n);
    this.mutationRate = new Float32Array(n);
    this.diet = new Float32Array(n);
    this.attack = new Float32Array(n);
    this.armor = new Float32Array(n);
    this.basalCost = new Float32Array(n);
    this.moveCost = new Float32Array(n);
    this.senseCost = new Float32Array(n);
    this.attackCost = new Float32Array(n);
    this.attemptCost = new Float32Array(n);
    this.armorCost = new Float32Array(n);
    this.plantBite = new Float32Array(n);
    this.meatBite = new Float32Array(n);
    this.plantWeight = new Float32Array(n);
    this.meatWeight = new Float32Array(n);
    this.plantEff = new Float32Array(n);
    this.meatEff = new Float32Array(n);
    this.attackPower = new Float32Array(n);
    this.defense = new Float32Array(n);
    this.reach = new Float32Array(n);
    this.bodyEnergy = new Float32Array(n);
    this.bodyMatter = new Float32Array(n);
    this.threshold = new Float32Array(n);

    this.float32Fields = [
      this.x, this.y, this.headingX, this.headingY, this.size, this.speed, this.senseRange, this.metabolism,
      this.mutationRate, this.diet, this.attack, this.armor, this.basalCost, this.moveCost, this.senseCost,
      this.attackCost, this.attemptCost, this.armorCost, this.plantBite, this.meatBite, this.plantWeight,
      this.meatWeight, this.plantEff, this.meatEff, this.attackPower, this.defense, this.reach,
      this.bodyEnergy, this.bodyMatter, this.threshold,
    ];
    this.float64Fields = [this.energy, this.plantTaken, this.meatTaken];
    this.uint32Fields = [this.id, this.parentId, this.age, this.kills];
    this.uint8Fields = [this.killed, this.attempted];
    this.uint16Fields = [this.resting];

    // First generation: identical plant-eating, unarmed bodies with a random color each.
    const founder: number[] = new Array<number>(GENE_COUNT).fill(0);
    founder[GENE.size] = traitToGene(c.initialSize, this.ranges.size);
    founder[GENE.speed] = traitToGene(c.initialSpeed, this.ranges.speed);
    founder[GENE.senseRange] = traitToGene(c.initialSenseRange, this.ranges.senseRange);
    founder[GENE.metabolism] = traitToGene(c.initialMetabolism, this.ranges.metabolism);
    founder[GENE.mutationRate] = traitToGene(c.initialMutationRate, this.ranges.mutationRate);
    founder[GENE.diet] = traitToGene(c.initialDiet, this.ranges.diet);
    founder[GENE.attack] = traitToGene(c.initialAttack, this.ranges.attack);
    founder[GENE.armor] = traitToGene(c.initialArmor, this.ranges.armor);
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
    this.kills[i] = 0;
    this.energy[i] = 0;
    this.plantTaken[i] = 0;
    this.meatTaken[i] = 0;
    this.killed[i] = 0;
    this.attempted[i] = 0;
    this.resting[i] = 0;
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
    const at = (gene: GeneName): number => r[gene].min + genes[g + GENE[gene]]! * (r[gene].max - r[gene].min);

    const size = at("size");
    const speed = at("speed");
    const sense = at("senseRange");
    const metabolism = at("metabolism");
    const mutation = at("mutationRate");
    const diet = at("diet");
    const attack = at("attack");
    const armor = at("armor");

    this.size[i] = size;
    this.speed[i] = speed;
    this.senseRange[i] = sense;
    this.metabolism[i] = metabolism;
    this.mutationRate[i] = mutation;
    this.diet[i] = diet;
    this.attack[i] = attack;
    this.armor[i] = armor;

    // size^0.75 is built from square roots: the Math.pow function is not
    // guaranteed to give identical results in every browser.
    const sizeToThreeQuarters = Math.sqrt(size) * Math.sqrt(Math.sqrt(size));
    this.basalCost[i] = c.basalCostCoeff * metabolism * sizeToThreeQuarters;
    this.moveCost[i] = c.moveCostCoeff * size * speed * speed * (1 + c.armorMoveFactor * armor);
    this.senseCost[i] = c.senseCostCoeff * sense;
    const fightingPenalty = 1 + c.herbivoreAttackPenalty * (1 - diet);
    this.attackCost[i] = c.attackCostCoeff * attack * size * fightingPenalty;
    this.attemptCost[i] = c.attackAttemptCost * size * fightingPenalty;
    this.armorCost[i] = c.armorCostCoeff * armor * size;

    // Eating. The diet gene splits appetite between plants (diet 0) and meat (diet 1),
    // and a specialist digests its own food better than a generalist does.
    const eatingSize = (1 - c.biteSizeBlend) * sizeToThreeQuarters + c.biteSizeBlend * size;
    const bite = c.biteRate * metabolism * eatingSize;
    // Claim on scarce food: bite (strength 0), bite squared (1) or bite cubed (2),
    // blending smoothly in between.
    const k = c.contestStrength;
    const weight = k <= 1 ? bite * (1 - k + k * bite) : bite * bite * (2 - k + (k - 1) * bite);
    this.plantBite[i] = bite * (1 - diet);
    this.meatBite[i] = bite * diet;
    this.plantWeight[i] = weight * (1 - diet);
    this.meatWeight[i] = weight * diet;
    this.plantEff[i] = 1 - c.dietSpecialization * diet;
    this.meatEff[i] = 1 - c.dietSpecialization * (1 - diet);

    // Fighting.
    this.attackPower[i] = attack * size;
    this.defense[i] = (armor + c.armorBase) * size;
    this.reach[i] = c.reachBase + c.reachPerSize * size;

    // Bodies.
    this.bodyEnergy[i] = c.bodyEnergyPerSize * size;
    this.bodyMatter[i] = c.bodyMatterPerSize * size;
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

  /** Record a notable first, once. */
  private logEvent(kind: SimEventKind, organismId: number, text: string): void {
    this.events.push({ tick: this.tick, kind, organismId, text });
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
    const n = this.count;
    const steerLean = c.steerGain / (8 * c.foodCap);
    const energyPerFood = c.energyPerFood;
    const ledger = this.ledger;
    let attackers = 0;

    // Pass 1: every organism senses, turns and moves.
    for (let i = 0; i < n; i++) {
      const x0 = this.x[i]!;
      const y0 = this.y[i]!;
      let hx = this.headingX[i]!;
      let hy = this.headingY[i]!;
      this.attempted[i] = 0;
      if (this.resting[i]! > 0) this.resting[i] = this.resting[i]! - 1;

      // Sense: an organism that can sense looks in eight directions and leans
      // toward the richer plant food. (Temporary: brains replace this in Phase 4.)
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

      this.cellOf[i] = Math.floor(ny / cs) * gw + Math.floor(nx / cs);
      if (this.attack[i]! >= c.attackThreshold) attackers++;
    }

    // Predation: each armed organism picks the nearest prey in reach (that is not
    // too big for it) and tries to kill it. A kill leaves a corpse right there.
    if (attackers > 0) {
      this.hash.rebuild(this.x, this.y, n);
      for (let i = 0; i < n; i++) {
        if (this.attack[i]! < c.attackThreshold || this.killed[i] === 1 || this.resting[i]! > 0) continue;
        this.pickAttacker = i;
        this.pickBest = -1;
        this.pickBestDistSq = Infinity;
        this.pickSizeLimit = this.size[i]! * c.preyMaxSizeRatio;
        this.hash.forEachNear(this.x[i]!, this.y[i]!, this.reach[i]!, this.considerPrey);
        const prey = this.pickBest;
        if (prey < 0) continue;
        this.attempted[i] = 1;
        const power = this.attackPower[i]!;
        const odds = power / (power + this.defense[prey]!);
        if (this.rng.next() < odds) this.kill(i, prey);
      }
    }

    // Everyone still alive registers how much plant food and meat they want in their cell.
    const plantClaim = this.plantClaim;
    const meatClaim = this.meatClaim;
    for (let i = 0; i < n; i++) {
      if (this.killed[i] === 1) continue;
      const cell = this.cellOf[i]!;
      plantClaim[cell] = plantClaim[cell]! + this.plantWeight[i]!;
      meatClaim[cell] = meatClaim[cell]! + this.meatWeight[i]!;
    }

    // Each cell works out how much food and meat there is per unit of claim. If
    // there is plenty, everyone can eat their fill; if it is scarce, claims are
    // met in proportion (see contestStrength). Nothing depends on the order
    // organisms are processed in.
    const plantShare = this.plantShare;
    const meatShare = this.meatShare;
    const meatDensity = this.meatDensity;
    for (let cell = 0; cell < food.length; cell++) {
      const wantedPlants = plantClaim[cell]!;
      const wantedMeat = meatClaim[cell]!;
      plantShare[cell] = wantedPlants > 0 ? food[cell]! / wantedPlants : 0;
      meatShare[cell] = wantedMeat > 0 ? this.corpseMatter[cell]! / wantedMeat : 0;
      meatDensity[cell] = this.corpseMatter[cell]! > 0 ? this.corpseEnergy[cell]! / this.corpseMatter[cell]! : 0;
      // From here on these two arrays count what is actually eaten in each cell.
      plantClaim[cell] = 0;
      meatClaim[cell] = 0;
    }

    // Pass 2: each organism that is still alive eats its share, pays for upkeep,
    // moving, sensing and fighting (if it cannot pay in full it spends everything
    // it has left and dies), and notes whether it is ready to reproduce.
    let parentCount = 0;
    let basalBurned = 0;
    let movementBurned = 0;
    let sensingBurned = 0;
    let attackBurned = 0;
    let armorBurned = 0;
    let plantEnergyTaken = 0;
    let meatEnergyTaken = 0;
    let digestionLoss = 0;
    for (let i = 0; i < n; i++) {
      if (this.killed[i] === 1) continue;
      const cell = this.cellOf[i]!;

      const plantMass = Math.min(this.plantBite[i]!, this.plantWeight[i]! * plantShare[cell]!);
      const meatMass = Math.min(this.meatBite[i]!, this.meatWeight[i]! * meatShare[cell]!);
      plantClaim[cell] = plantClaim[cell]! + plantMass;
      meatClaim[cell] = meatClaim[cell]! + meatMass;
      const plantRaw = plantMass * energyPerFood;
      const meatRaw = meatMass * meatDensity[cell]!;
      const plantGain = plantRaw * this.plantEff[i]!;
      const meatGain = meatRaw * this.meatEff[i]!;
      plantEnergyTaken += plantRaw;
      meatEnergyTaken += meatRaw;
      digestionLoss += plantRaw - plantGain + (meatRaw - meatGain);
      this.plantTaken[i] = this.plantTaken[i]! + plantGain;
      this.meatTaken[i] = this.meatTaken[i]! + meatGain;
      let energy = this.energy[i]! + plantGain + meatGain;

      if (!this.seenScavenger && this.meatTaken[i]! >= SCAVENGER_MIN_MEAT) {
        this.seenScavenger = true;
        this.logEvent("firstScavenger", this.id[i]!, `Organism #${this.id[i]!} lived mostly off a corpse: the first scavenger`);
      }

      const basal = this.basalCost[i]!;
      const move = this.moveCost[i]!;
      const sensing = this.senseCost[i]!;
      const fighting = this.attackCost[i]! + (this.attempted[i] === 1 ? this.attemptCost[i]! : 0);
      const armoring = this.armorCost[i]!;
      const cost = basal + move + sensing + fighting + armoring;
      if (energy > cost) {
        energy -= cost;
        basalBurned += basal;
        movementBurned += move;
        sensingBurned += sensing;
        attackBurned += fighting;
        armorBurned += armoring;
      } else {
        const fraction = cost > 0 ? energy / cost : 0;
        basalBurned += basal * fraction;
        movementBurned += move * fraction;
        sensingBurned += sensing * fraction;
        attackBurned += fighting * fraction;
        armorBurned += armoring * fraction;
        energy = 0;
      }
      this.energy[i] = energy;
      this.age[i]!++;

      if (energy >= this.threshold[i]!) this.parents[parentCount++] = i;
    }

    // The land: eaten food and meat come off the ground (the matter they held is
    // excreted as detritus), corpses rot, detritus turns back into soil, and
    // plants grow from soil nutrient and sunlight.
    let decayLoss = 0;
    let sunlightIn = 0;
    const nutrient = this.nutrient;
    const corpseMatter = this.corpseMatter;
    const corpseEnergy = this.corpseEnergy;
    const detritus = this.detritus;
    const meatDecay = c.meatDecayRate;
    const mineralize = c.detritusMineralizeRate;
    const halfSat = c.nutrientHalfSaturation;
    for (let cell = 0; cell < food.length; cell++) {
      // Eaten plants.
      const eatenPlants = plantClaim[cell]!;
      plantClaim[cell] = 0;
      const plantsTaken = eatenPlants < food[cell]! ? eatenPlants : food[cell]!;
      food[cell] = food[cell]! - plantsTaken;
      let waste = plantsTaken;

      // Eaten meat (the corpse loses the same fraction of its matter and its energy).
      const eatenMeat = meatClaim[cell]!;
      meatClaim[cell] = 0;
      if (eatenMeat > 0 && corpseMatter[cell]! > 0) {
        const taken = eatenMeat < corpseMatter[cell]! ? eatenMeat : corpseMatter[cell]!;
        const fraction = taken / corpseMatter[cell]!;
        corpseEnergy[cell] = corpseEnergy[cell]! * (1 - fraction);
        corpseMatter[cell] = corpseMatter[cell]! - taken;
        waste += taken;
      }

      // Rot: the corpse's energy is lost as heat, its matter becomes detritus.
      if (corpseMatter[cell]! > 0 || corpseEnergy[cell]! > 0) {
        const rottedEnergy = corpseEnergy[cell]! * meatDecay;
        const rottedMatter = corpseMatter[cell]! * meatDecay;
        corpseEnergy[cell] = corpseEnergy[cell]! - rottedEnergy;
        corpseMatter[cell] = corpseMatter[cell]! - rottedMatter;
        decayLoss += rottedEnergy;
        waste += rottedMatter;
      }

      // Detritus slowly becomes soil nutrient again.
      const detritusHere = detritus[cell]! + waste;
      const mineralized = detritusHere * mineralize;
      detritus[cell] = detritusHere - mineralized;
      let soil = nutrient[cell]! + mineralized;

      // Plants grow, limited by sunlight (the rate), nutrient, and room.
      const room = this.foodCapacity[cell]! - food[cell]!;
      const potential = (this.foodRegrow[cell]! * soil) / (soil + halfSat);
      let growth = potential < soil ? potential : soil;
      if (growth > room) growth = room > 0 ? room : 0;
      food[cell] = food[cell]! + growth;
      soil -= growth;
      nutrient[cell] = soil;
      sunlightIn += growth * energyPerFood;
    }

    // Births: each parent hands a share of its energy to a slightly mutated child.
    // A newborn's body is built from the soil it is born on, so a barren patch
    // cannot support babies, and the baby's body also locks away some energy.
    for (let p = 0; p < parentCount; p++) {
      const parent = this.parents[p]!;
      const savedNextId = this.nextId;
      const child = this.spawn(this.id[parent]!, this.x[parent]!, this.y[parent]!);
      if (child < 0) break;
      this.inheritGenes(child, parent);
      this.express(child);
      const cell = this.cellOf[parent]!;
      const given = this.energy[parent]! * c.offspringEnergyFraction;
      const store = given - this.bodyEnergy[child]!;
      if (nutrient[cell]! < this.bodyMatter[child]! || store < 0) {
        // Cannot afford this baby right now: undo it. The parent keeps its energy and tries again later.
        this.count--;
        this.nextId = savedNextId;
        this.blockedBirths++;
        continue;
      }
      nutrient[cell] = nutrient[cell]! - this.bodyMatter[child]!;
      this.energy[parent] = this.energy[parent]! - given;
      this.energy[child] = store;
      this.totalBirths++;
    }

    // Deaths: remove everyone who was killed or ran out of energy by moving the
    // last organism into the gap. (Order changes, but deterministically.) A body
    // that starved becomes a corpse; one that was killed already left its corpse.
    let alive = this.count;
    let i = 0;
    let starved = 0;
    while (i < alive) {
      if (this.killed[i] === 1) {
        alive--;
        if (i !== alive) this.moveOrganism(alive, i);
      } else if (this.energy[i]! <= 0) {
        const cell = this.cellOf[i]!;
        corpseEnergy[cell] = corpseEnergy[cell]! + this.bodyEnergy[i]!;
        corpseMatter[cell] = corpseMatter[cell]! + this.bodyMatter[i]!;
        starved++;
        alive--;
        if (i !== alive) this.moveOrganism(alive, i);
      } else {
        i++;
      }
    }
    this.totalDeaths += this.count - alive;
    this.totalStarved += starved;
    this.count = alive;

    ledger.sunlightIn += sunlightIn;
    ledger.plantEaten += plantEnergyTaken;
    ledger.meatEaten += meatEnergyTaken;
    ledger.digestionLoss += digestionLoss;
    ledger.decayLoss += decayLoss;
    ledger.basalBurned += basalBurned;
    ledger.movementBurned += movementBurned;
    ledger.sensingBurned += sensingBurned;
    ledger.attackBurned += attackBurned;
    ledger.armorBurned += armorBurned;

    this.tick++;
    if (this.tick % EVENT_CHECK_EVERY === 0) this.checkSlowEvents();
  }

  /** `attacker` kills `prey`: the prey's body and whatever energy it carried become a corpse. */
  private kill(attacker: number, prey: number): void {
    const cell = this.cellOf[prey]!;
    this.corpseEnergy[cell] = this.corpseEnergy[cell]! + this.bodyEnergy[prey]! + this.energy[prey]!;
    this.corpseMatter[cell] = this.corpseMatter[cell]! + this.bodyMatter[prey]!;
    this.energy[prey] = 0;
    this.killed[prey] = 1;
    this.kills[attacker] = this.kills[attacker]! + 1;
    this.resting[attacker] = this.config.killCooldown;
    this.totalKills++;
    if (!this.seenKill) {
      this.seenKill = true;
      this.logEvent("firstKill", this.id[attacker]!, `Organism #${this.id[attacker]!} killed #${this.id[prey]!}: the first kill`);
    }
  }

  /** Checks for notable firsts that need a look at the whole population. */
  private checkSlowEvents(): void {
    if (this.seenPredator && this.seenCarnivore) return;
    for (let i = 0; i < this.count; i++) {
      if (!this.seenPredator && this.kills[i]! >= PREDATOR_MIN_KILLS) {
        this.seenPredator = true;
        this.logEvent("firstPredator", this.id[i]!, `Organism #${this.id[i]!} has made ${this.kills[i]!} kills: the first predator`);
      }
      if (!this.seenCarnivore && this.age[i]! >= CARNIVORE_MIN_AGE) {
        const total = this.plantTaken[i]! + this.meatTaken[i]!;
        if (total >= CARNIVORE_MIN_INTAKE && this.meatTaken[i]! / total >= CARNIVORE_MIN_MEAT_SHARE) {
          this.seenCarnivore = true;
          this.logEvent(
            "firstCarnivore",
            this.id[i]!,
            `Organism #${this.id[i]!} has lived ${this.age[i]!} ticks on ${Math.round((this.meatTaken[i]! / total) * 100)}% meat: the first carnivore`,
          );
        }
      }
    }
  }

  private moveOrganism(from: number, to: number): void {
    for (const field of this.float32Fields) field[to] = field[from]!;
    for (const field of this.float64Fields) field[to] = field[from]!;
    for (const field of this.uint32Fields) field[to] = field[from]!;
    for (const field of this.uint8Fields) field[to] = field[from]!;
    for (const field of this.uint16Fields) field[to] = field[from]!;
    this.cellOf[to] = this.cellOf[from]!;
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
      case "diet":
        return this.diet[i]!;
      case "attack":
        return this.attack[i]!;
      case "armor":
        return this.armor[i]!;
    }
  }

  stats(): SimStats {
    const n = this.count;
    const sums = new Float64Array(GENE_COUNT);
    const sumsSq = new Float64Array(GENE_COUNT);
    let energySum = 0;
    let herbivores = 0;
    let carnivores = 0;
    for (let i = 0; i < n; i++) {
      energySum += this.energy[i]!;
      for (let k = 0; k < GENE_COUNT; k++) {
        const v = this.traitOf(GENES[k]!, i);
        sums[k] = sums[k]! + v;
        sumsSq[k] = sumsSq[k]! + v * v;
      }
      const d = this.diet[i]!;
      if (d < HERBIVORE_BELOW) herbivores++;
      else if (d > CARNIVORE_ABOVE) carnivores++;
    }
    const traits = {} as Record<GeneName, TraitSummary>;
    for (let k = 0; k < GENE_COUNT; k++) {
      const mean = n > 0 ? sums[k]! / n : 0;
      const variance = n > 0 ? Math.max(0, sumsSq[k]! / n - mean * mean) : 0;
      traits[GENES[k]!] = { mean, sd: Math.sqrt(variance) };
    }

    return {
      tick: this.tick,
      population: n,
      totalFood: sumOf(this.food),
      totalEnergy: energySum,
      meanEnergy: n > 0 ? energySum / n : 0,
      totalBirths: this.totalBirths,
      totalDeaths: this.totalDeaths,
      totalKills: this.totalKills,
      totalStarved: this.totalStarved,
      blockedBirths: this.blockedBirths,
      traits,
      classes: { herbivores, omnivores: n - herbivores - carnivores, carnivores },
      totalNutrient: sumOf(this.nutrient),
      totalCorpseMatter: sumOf(this.corpseMatter),
      totalDetritus: sumOf(this.detritus),
      ledger: { ...this.ledger },
    };
  }

  /** Add up all the matter in the world, in every form. It should never change. */
  matterAudit(): MatterAudit {
    let bodies = 0;
    for (let i = 0; i < this.count; i++) bodies += this.bodyMatter[i]!;
    const soilNutrient = sumOf(this.nutrient);
    const plants = sumOf(this.food);
    const corpses = sumOf(this.corpseMatter);
    const detritus = sumOf(this.detritus);
    return { soilNutrient, plants, corpses, detritus, bodies, total: soilNutrient + plants + corpses + detritus + bodies };
  }

  /** Add up all the energy in the world, in every form that can be eaten or spent. */
  energyAudit(): EnergyAudit {
    let stores = 0;
    let bodies = 0;
    for (let i = 0; i < this.count; i++) {
      stores += this.energy[i]!;
      bodies += this.bodyEnergy[i]!;
    }
    const plants = sumOf(this.food) * this.config.energyPerFood;
    const corpses = sumOf(this.corpseEnergy);
    return { stores, bodies, plants, corpses, total: stores + bodies + plants + corpses };
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
      costs: {
        basal: this.basalCost[i]!,
        movement: this.moveCost[i]!,
        sensing: this.senseCost[i]!,
        attack: this.attackCost[i]!,
        armor: this.armorCost[i]!,
      },
      plantTaken: this.plantTaken[i]!,
      meatTaken: this.meatTaken[i]!,
      kills: this.kills[i]!,
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
    mix(this.totalKills);
    mix(this.blockedBirths);
    mix(this.events.length);
    for (const word of this.rng.getState()) mix(word);

    const n = this.count;
    mixInts(this.id, n);
    mixInts(this.parentId, n);
    mixInts(this.age, n);
    mixInts(this.kills, n);
    mixBits(this.x, n);
    mixBits(this.y, n);
    mixBits(this.headingX, n);
    mixBits(this.headingY, n);
    mixBits(this.energy, n);
    mixBits(this.plantTaken, n);
    mixBits(this.meatTaken, n);
    mixBits(this.genes, n * GENE_COUNT);
    mixBits(this.food, this.food.length);
    mixBits(this.nutrient, this.nutrient.length);
    mixBits(this.corpseMatter, this.corpseMatter.length);
    mixBits(this.corpseEnergy, this.corpseEnergy.length);
    mixBits(this.detritus, this.detritus.length);
    return hash;
  }
}
