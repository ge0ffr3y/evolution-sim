import { makeConfig, type SimConfig } from "./config";
import {
  CORE_GENE_COUNT,
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
import { polarness, smoothWave } from "./climate";
import { BIOME, generateBackground, generateBiomes, generatePlantTypes, generateWeatherMap, growthMultipliers, moveMultipliers } from "./terrain";
import { SNAPSHOT_FORMAT, type SimSnapshot, type SnapshotArray } from "./snapshot";
import { SpeciesTracker, type SpeciesEvent, type SpeciesRecord } from "./species";
import {
  CONN_MAX,
  HIDDEN_MAX,
  HIDDEN_START,
  INPUT,
  INPUT_COUNT,
  NODE_COUNT,
  OUTPUT,
  OUTPUT_COUNT,
  MEMORY_COUNT,
  OUTPUT_START,
  RAY_CHANNELS,
  RAY_COUNT,
  evaluateBrain,
  initFixedBrain,
  setConnection,
  measureBrain,
  mutateBrain,
  crossoverBrains,
} from "./brain";
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
  /** Heat from thinking. */
  brainBurned: number;
}

/** How big evolved brains are, on average. */
export interface BrainStats {
  /** Averages over everyone in each group: hidden units and working connections. */
  all: { hidden: number; connections: number };
  herbivores: { hidden: number; connections: number };
  carnivores: { hidden: number; connections: number };
}

/** One brain, for the brain viewer: its working connections and (if traced) what it is thinking right now. */
export interface BrainSnapshot {
  hidden: number;
  connections: number;
  cost: number;
  links: { from: number; to: number; weight: number }[];
  /** Latest activations of the traced organism, or null if it has not thought yet. */
  activity: { inputs: number[]; hidden: number[]; outputs: number[] } | null;
}

/**
 * How purposefully organisms turn. Among hunters that can see prey off to one side, the
 * fraction whose heading rotated toward it over one tick; among plant eaters that can see
 * a threat off to one side, the fraction whose heading rotated away from it. Turning at
 * random scores 0.5 on both, so anything above 0.5 is purposeful (and it works for worlds
 * without brains too, as the control).
 */
export interface BehaviorStats {
  chase: number;
  chaseSamples: number;
  flee: number;
  fleeSamples: number;
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

/**
 * How complex the colonies are: how many there are (groups of two or more bonded cells), how many cells
 * are in them, their average and largest size, how many different cell types a colony has (average and
 * most), and how symmetrical their bodies are (0 to 1, for colonies of three or more cells).
 */
export interface ColonyStats {
  count: number;
  cells: number;
  meanSize: number;
  maxSize: number;
  meanTypes: number;
  maxTypes: number;
  symmetry: number;
  /** Colonies made of cells from more than one species (0 when species tracking is off). */
  mixed: number;
}

/** Things that happen to the whole world: catastrophes and their ends. */
export interface WorldEvent {
  tick: number;
  kind: "iceAge" | "drought" | "meteor" | "recovery";
  text: string;
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
  /** Births with two parents. */
  sexualBirths: number;
  totalDeaths: number;
  /** Deaths caused by another organism, and total deaths from starvation. */
  totalKills: number;
  totalStarved: number;
  /** Births that could not happen because the soil had no nutrients for the baby. */
  blockedBirths: number;
  /** Attacks tried, and how many killed (so kills / attacks is the success rate). */
  totalAttacks: number;
  brain: BrainStats;
  /** Species alive now, and how many there have ever been (0 when tracking is off). */
  species: { alive: number; ever: number };
  /** Colonies (groups of two or more bonded cells): how many, how many cells are in one, and the average and largest size. */
  colonies: ColonyStats;
  /** Disease: organisms sick now, strains alive in them, and infections so far (all 0 without disease). */
  disease: { infected: number; strains: number; totalInfections: number };
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
  /** The second parent, when organisms reproduce sexually (0 otherwise). */
  otherParentId: number;
  age: number;
  energy: number;
  /** Energy at which it will reproduce. */
  threshold: number;
  x: number;
  y: number;
  genes: number[];
  traits: Traits;
  /** Energy burned per tick on each activity. */
  costs: { basal: number; movement: number; sensing: number; attack: number; armor: number; brain: number };
  /** This organism's luck multipliers on upkeep and on its reproduction threshold (null when luck is off). */
  luck: { upkeep: number; fertility: number } | null;
  /** Its brain, if the world has brains. */
  brain: BrainSnapshot | null;
  /** Disease (all 0 without it): ticks of sickness and of immunity left, and which strain it carries. */
  health: { sickFor: number; immuneFor: number; strain: number };
  /** Its cell type (0 generalist, 1 feeder, 2 mover, 3 photosynthesizer, 4 armor, 5 sensor) and how many cells are bonded to it. */
  cellType: number;
  bonds: number;
  /** Lifespan in ticks (0 without aging) and litter size (1 without the litter gene). */
  lifespan: number;
  litter: number;
  /** Lifetime energy gained from plants and from meat, and kills made. */
  plantTaken: number;
  meatTaken: number;
  kills: number;
}

/** Wrap a whole-number cell coordinate around a grid of `size` cells. */
function wrapCell(cell: number, size: number): number {
  return ((cell % size) + size) % size;
}

function clampUnit(value: number): number {
  return value < -1 ? -1 : value > 1 ? 1 : value;
}

/** How much corpse energy in a cell counts as "full strength" for smelling and display. */
const MEAT_SMELL_FULL = 30;
/** A trail difference this big (in ticks' worth of one organism's scent) reads as full strength. */
const SCENT_FULL = 4;
/** The kinds of input a brain can listen to (see brainSenses). */
const SENSE_VISION = 1;
const SENSE_SMELL = 2;
const SENSE_BODY = 4;
const SENSE_SOCIAL = 8;
/** Room for this many bonds per cell (the config can allow fewer). */
const BOND_SLOTS = 6;

/** A fixed scramble of two whole numbers into a number between 0 and 1 (so "random" things such as a year's harshness need no random stream). */
function unitHash(a: number, b: number): number {
  let h = Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
/** Strength of the founders' plant-smell reflex. */
const FOUNDER_REFLEX_WEIGHT = 1.5;
/** The founders' chase reflex: turning strength per ray away from the middle, and the speed-up when prey is dead ahead. */
const CHASE_REFLEX_TURN = 0.8;
const CHASE_REFLEX_SPEED = 0.5;
/** Distance within which behavior is judged (world units), so every world is measured the same way. */
const BEHAVIOR_RANGE = 6;
/** How old (in ticks) an organism must be for its age input to read "old". */
const AGE_FULL = 2000;

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
  /** Births that came from two parents (with sexualReproduction 2 only part of all births do). */
  sexualBirths = 0;
  totalDeaths = 0;
  totalKills = 0;
  totalStarved = 0;
  blockedBirths = 0;
  totalAttacks = 0;
  readonly events: SimEvent[] = [];
  /** Catastrophes and their ends (a separate list, so it never disturbs the notable firsts). */
  readonly worldEvents: WorldEvent[] = [];
  /** The catastrophe going on now (0 none, 1 ice age, 2 drought) and when it began and ends. */
  private catKind = 0;
  private catStart = 0;
  private catEnd = 0;
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
    brainBurned: 0,
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
  /**
   * Terrain (only when terrainMode is 1): each cell's biome (see terrain.ts), whether it can be
   * entered, and what it costs to move there relative to plains.
   */
  readonly biome: Uint8Array;
  readonly passable: Uint8Array;
  readonly terrainMove: Float64Array;
  private readonly terrainOn: boolean;
  /**
   * Climate (only when climateMode is 1). The fixed parts are worked out once: how cold each cell is
   * (latitude, mountains), how much it swings with the seasons, and how much sunlight it gets.
   * The current temperature and plant growth factor of every cell are recomputed at the start of
   * every tick (they depend on the time of day, the season and the climate drift).
   */
  readonly temperature: Float64Array;
  readonly growthFactor: Float64Array;
  private readonly climateOn: boolean;
  private readonly tempBase: Float64Array;
  private readonly tempSwing: Float64Array;
  private readonly lightBase: Float64Array;
  /**
   * Scent trails (laid only when brains are on): how much plant-eater and meat-eater scent
   * is in each square of a finer grid. It fades every tick, so it marks recent passage.
   */
  readonly scentWidth: number;
  readonly scentHeight: number;
  readonly preyScent: Float64Array;
  readonly hunterScent: Float64Array;
  private readonly scentOn: boolean;

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

  // Brains (empty unless brainMode > 0). Organism i's brain occupies slots i*CONN_MAX .. +CONN_MAX-1.
  readonly brainFrom: Uint8Array;
  readonly brainTo: Uint8Array;
  readonly brainWeight: Float32Array;
  readonly brainCount: Uint16Array;
  /** Working size of the brain (hidden units that matter, connections strong enough to count). */
  readonly brainHidden: Uint8Array;
  readonly brainConnections: Uint16Array;
  /** Energy per tick it costs to keep this brain. */
  readonly brainCost: Float32Array;
  /** Which senses its brain actually listens to (see SENSE_*): everything else is skipped when it thinks. */
  readonly brainSenses: Uint8Array;
  /** What the brain last decided: turn (-1..1), speed (-1..1) and how willing it is to attack (-1..1). */
  readonly outTurn: Float32Array;
  readonly outSpeed: Float32Array;
  readonly outAttack: Float32Array;
  /** Movement this tick relative to normal speed (0 = standing still, 1 = normal, 2 = flat out). */
  readonly moveScale: Float32Array;

  /** The second parent of each organism (sexual reproduction only; 0 for none). */
  readonly parent2Id: Uint32Array;
  private readonly sexOn: boolean;
  /** Sex as a gene (sexualReproduction 2): each organism's choice for its next birth: 0 not decided, 1 split in two, 2 look for a mate. */
  private readonly sexGeneOn: boolean;
  private readonly sexMode: Uint8Array;
  /** The ready organisms that chose to look for a mate this tick (a scratch list). */
  private readonly sexParents: Uint32Array;
  /** And the ones that chose to split in two, plus who was taken as a mate this tick (so they do not also split). */
  private readonly soloParents: Uint32Array;
  /** When each mate-seeker decided to look (for facultative sex), and the animals well fed enough to be taken as a mate this tick. */
  private readonly mateSince: Uint32Array;
  private readonly partnerList: Uint32Array;
  private readonly matedNow: Uint8Array;
  /** Scratch for pairing up mates: who is ready, the pairs found, and the genes that count toward compatibility. */
  private readonly ready: Uint8Array;
  private readonly pairs: Uint32Array;
  private readonly mateMask: number[];
  /** Kin recognition: how close genetically counts as a relative (squared; 0 = off), and scratch for counting relatives. */
  private readonly kinLimitSq: number;
  /** With kinTolerance: each organism's own squared closeness limit for not attacking a relative (cached from its gene). */
  private readonly kinToleranceOn: boolean;
  /** Brain memory (what each brain wrote last time, MEMORY_COUNT numbers per organism) and the place each organism calls home. */
  private readonly memoryOn: boolean;
  private readonly memState: Float32Array;
  /** Chemical signals: four per organism (reward, stress, bond, calm), plus what has happened to the organism since it last thought. */
  private readonly chemOn: boolean;
  private readonly bodyChemOn: boolean;
  private readonly chem: Float32Array;
  private readonly chemIntake: Float32Array;
  private readonly chemHit: Uint8Array;
  private readonly homeX: Float32Array;
  private readonly homeY: Float32Array;
  /** With homeMode 3: how good a meal the remembered place gave (as a share of reproduction energy in one tick; it fades). */
  private readonly homeValue: Float32Array;
  /** Weather fronts: two fixed smooth maps (blended and drifted over time), and whether the fat and torpor genes are in use. */
  private readonly weatherOn: boolean;
  /** Kinds of plant: which kind grows in each cell (fixed from the seed), and the seasonal wave each kind follows this tick. */
  private readonly plantKinds: number;
  private readonly plantTypeOf: Uint8Array;
  private readonly kindGrowth: Float64Array;
  private readonly kindOptimum: Float64Array;
  private readonly weatherA: Float32Array;
  private readonly weatherB: Float32Array;
  private readonly fatOn: boolean;
  /** Harmful mutations: which of the genome's spots have gone bad, one bit each (model 0), or simply how many harmful mutations it carries (model 1). */
  private readonly loadOn: boolean;
  /** Luck: multipliers (around 1) on each organism's upkeep and on its reproduction threshold, rolled at birth. */
  private readonly giveOn: boolean;
  /** Sharing food: the energy each animal gains or gives this tick, and the few neediest neighbors found for the animal being looked at. */
  private readonly giftDelta: Float64Array;
  private readonly giftPick = new Int32Array(4);
  private readonly giftKey = new Float64Array(4);
  private giftCount = 0;
  private giftGiver = 0;
  /** Energy handed from one animal to another since the world began (before the share lost as heat). */
  totalShared = 0;
  private readonly luckOn: boolean;
  private readonly upkeepLuck: Float32Array;
  private readonly fertilityLuck: Float32Array;
  private readonly loadMask: Uint32Array;
  /** Energy held in the fat reserve (counted in the energy audit; it goes into the corpse when the body dies). */
  private readonly fatStore: Float64Array;
  private readonly torporOn: boolean;
  /** Who is dormant this tick (worked out fresh every tick; not saved). */
  private readonly torpid: Float32Array;
  private readonly toleranceSq: Float32Array;
  private kinCount = 0;
  private kinVx = 0;
  private kinVy = 0;
  private herdSelf = 0;
  private mateSelf = 0;
  private mateBest = -1;
  private mateBestDistSq = Infinity;
  private mateBestScore = Infinity;

  /** Which species each organism belongs to (0 when species tracking is off). See species.ts. */
  readonly species: Uint32Array;
  private readonly tracker: SpeciesTracker | null;

  /** Sprint reserve now, its size (from the stamina gene) and its upkeep per tick. Used only with sprintFatigue. */
  readonly stamina: Float32Array;
  readonly staminaMax: Float32Array;
  readonly staminaCost: Float32Array;
  private readonly staminaOn: boolean;
  /** Preferred temperature, and the cost scale, of each organism (only when the thermal gene is in use). */
  readonly thermalPref: Float32Array;
  private readonly thermalScale: Float32Array;
  private readonly thermalOn: boolean;
  /**
   * Disease (only when diseaseTransmission is above 0): for each organism, which strain it carries (0 =
   * healthy), how many ticks of sickness are left and how many ticks of immunity. A strain is just the
   * genes it "targets" (one number per gene that counts toward kinship).
   */
  readonly infection: Uint16Array;
  readonly sickFor: Uint16Array;
  readonly immuneFor: Uint16Array;
  private readonly pending: Uint16Array;
  private strains: Float64Array[] = [];
  totalInfections = 0;
  private readonly diseaseOn: boolean;
  private diseaseHost = 0;
  /**
   * Camouflage (only when camouflageMode is 1): the background color of every cell, and, for each
   * hunter, the color of what it last ate (its "search image"), if it has eaten anything.
   */
  readonly background: Float32Array;
  readonly searchHue: Float32Array;
  readonly hasImage: Uint8Array;
  private readonly camoOn: boolean;
  /**
   * Multicellularity (only when multicellular is 1): the cells each cell is bonded to, as indices
   * (-1 = empty slot, BOND_SLOTS slots per cell). Every bond is stored in both cells, and the
   * indices are kept right when cells are shuffled around as others die.
   */
  readonly bondTo: Int32Array;
  private readonly bondsOn: boolean;
  private readonly alignX: Float64Array;
  private readonly alignY: Float64Array;
  private readonly shareDelta: Float64Array;
  private readonly visitMark: Uint32Array;
  private visitStamp = 0;
  private colonyRoot = new Int32Array(0);
  /** Cell types (only when cellTypes is 1): the type of each cell (0 generalist ... 5 sensor) and the sunlight a photosynthesizing cell collects each tick. */
  readonly cellType: Uint8Array;
  private readonly photoGain: Float32Array;
  private readonly typeOn: boolean;
  private readonly colonyStack: Int32Array;
  /** Lifespan (ticks) and litter size of each organism (only when those genes are in use). */
  readonly lifespan: Float32Array;
  readonly litter: Float32Array;
  private readonly agingOn: boolean;
  private readonly litterOn: boolean;
  /** Which genes are doing anything in this world (the rest are copied as they are, never mutated). */
  private readonly activeGene: boolean[];
  /** Who has first claim on the meat in each cell, and until which tick. Used only with killOwnershipTicks. */
  readonly corpseOwner: Uint32Array;
  readonly corpseOwnerUntil: Uint32Array;
  private readonly guardOn: boolean;

  /** Set to an organism's id to record what its brain is thinking (for the brain viewer). */
  traceId = 0;
  private readonly traceInputs = new Float64Array(INPUT_COUNT);
  private readonly traceHidden = new Float64Array(HIDDEN_MAX);
  private readonly traceOutputs = new Float64Array(OUTPUT_COUNT);
  private traceValid = false;

  // Scratch space for one brain's thinking.
  private readonly thinkInputs = new Float64Array(INPUT_COUNT);
  private readonly thinkHidden = new Float64Array(HIDDEN_MAX);
  private readonly thinkOutputs = new Float64Array(OUTPUT_COUNT);
  // Vision: the nearest thing seen along each ray, and the viewer's position and heading.
  private readonly rayDistSmall = new Float64Array(RAY_COUNT);
  private readonly rayTargetSmall = new Int32Array(RAY_COUNT);
  private readonly rayDistLarge = new Float64Array(RAY_COUNT);
  private readonly rayTargetLarge = new Int32Array(RAY_COUNT);
  private visSizeLimit = 0;
  private visSelf = 0;
  private visX = 0;
  private visY = 0;
  private visHx = 0;
  private visHy = 0;

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
    if (this.camoOn && !this.detects(this.pickAttacker, index)) return; // never noticed it
    // Nobody attacks a relative (or, with kinTolerance, nobody tolerant enough to count the target as one).
    const limitSq = this.kinToleranceOn ? this.toleranceSq[this.pickAttacker]! : this.kinLimitSq;
    if (limitSq > 0 && this.geneDistanceSq(this.pickAttacker, index) <= limitSq) return;
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
    this.terrainOn = c.terrainMode === 1;
    this.biome = new Uint8Array(this.terrainOn ? cells : 0);
    this.passable = new Uint8Array(this.terrainOn ? cells : 0);
    this.terrainMove = new Float64Array(this.terrainOn ? cells : 0);
    if (this.terrainOn) this.applyTerrain(generateBiomes(c, seed, this.gridWidth, this.gridHeight));
    this.climateOn = c.climateMode === 1;
    const climateCells = this.climateOn ? cells : 0;
    this.temperature = new Float64Array(climateCells);
    this.growthFactor = new Float64Array(climateCells).fill(1);
    this.tempBase = new Float64Array(climateCells);
    this.tempSwing = new Float64Array(climateCells);
    this.lightBase = new Float64Array(climateCells);
    this.plantKinds = c.plantTypes;
    this.plantTypeOf = c.plantTypes > 1 ? generatePlantTypes(seed, this.gridWidth, this.gridHeight, c.plantTypeScale, c.plantTypes) : new Uint8Array(0);
    this.kindGrowth = new Float64Array(c.plantTypes);
    this.kindOptimum = new Float64Array(c.plantTypes);
    this.weatherOn = this.climateOn && c.weatherAmplitude > 0;
    this.weatherA = this.weatherOn ? generateWeatherMap(seed, this.gridWidth, this.gridHeight, c.weatherScale, 0x51f3a7c9) : new Float32Array(0);
    this.weatherB = this.weatherOn ? generateWeatherMap(seed, this.gridWidth, this.gridHeight, c.weatherScale, 0x1d8e4b27) : new Float32Array(0);
    if (this.climateOn) this.setUpClimate();
    this.food = new Float64Array(cells);
    for (let cell = 0; cell < cells; cell++) this.food[cell] = this.foodCapacity[cell]! * c.initialFoodFraction;
    this.nutrient = new Float64Array(cells).fill(c.initialNutrientPerCell);
    if (this.terrainOn) for (let cell = 0; cell < cells; cell++) if (this.biome[cell] === BIOME.water) this.nutrient[cell] = 0;
    this.corpseMatter = new Float64Array(cells);
    this.corpseEnergy = new Float64Array(cells);
    this.detritus = new Float64Array(cells);
    this.scentWidth = c.worldWidth / c.scentCellSize;
    this.scentHeight = c.worldHeight / c.scentCellSize;
    this.scentOn = c.brainMode > 0 && c.scentDeposit > 0;
    const scentCells = this.scentOn ? this.scentWidth * this.scentHeight : 0;
    this.preyScent = new Float64Array(scentCells);
    this.hunterScent = new Float64Array(scentCells);
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

    const brainSlots = c.brainMode > 0 ? n * CONN_MAX : 0;
    const brainOrganisms = c.brainMode > 0 ? n : 0;
    this.brainFrom = new Uint8Array(brainSlots);
    this.brainTo = new Uint8Array(brainSlots);
    this.brainWeight = new Float32Array(brainSlots);
    this.brainCount = new Uint16Array(brainOrganisms);
    this.brainHidden = new Uint8Array(brainOrganisms);
    this.brainConnections = new Uint16Array(brainOrganisms);
    this.brainCost = new Float32Array(brainOrganisms);
    this.brainSenses = new Uint8Array(brainOrganisms);
    this.outTurn = new Float32Array(brainOrganisms);
    this.outSpeed = new Float32Array(brainOrganisms);
    this.outAttack = new Float32Array(brainOrganisms);
    this.moveScale = new Float32Array(brainOrganisms);
    this.staminaOn = c.brainMode > 0 && c.sprintFatigue === 1;
    this.thermalOn = c.climateMode === 1 && c.thermalCostCoeff > 0;
    this.thermalPref = new Float32Array(this.thermalOn ? n : 0);
    this.thermalScale = new Float32Array(this.thermalOn ? n : 0);
    this.camoOn = c.camouflageMode === 1;
    this.background = this.camoOn ? generateBackground(seed, this.gridWidth, this.gridHeight, c.camoScale) : new Float32Array(0);
    this.searchHue = new Float32Array(this.camoOn ? n : 0);
    this.hasImage = new Uint8Array(this.camoOn ? n : 0);
    this.bondsOn = c.multicellular === 1;
    this.typeOn = this.bondsOn && c.cellTypes === 1;
    this.cellType = new Uint8Array(this.typeOn ? n : 0);
    this.photoGain = new Float32Array(this.typeOn ? n : 0);
    this.bondTo = new Int32Array(this.bondsOn ? n * BOND_SLOTS : 0).fill(-1);
    this.alignX = new Float64Array(this.bondsOn ? n : 0);
    this.alignY = new Float64Array(this.bondsOn ? n : 0);
    this.shareDelta = new Float64Array(this.bondsOn ? n : 0);
    this.visitMark = new Uint32Array(this.bondsOn ? n : 0);
    this.colonyStack = new Int32Array(this.bondsOn ? n : 0);
    this.diseaseOn = c.diseaseTransmission > 0;
    this.infection = new Uint16Array(this.diseaseOn ? n : 0);
    this.sickFor = new Uint16Array(this.diseaseOn ? n : 0);
    this.immuneFor = new Uint16Array(this.diseaseOn ? n : 0);
    this.pending = new Uint16Array(this.diseaseOn ? n : 0);
    this.agingOn = c.agingCoeff > 0;
    this.litterOn = c.litterMax > 1;
    this.lifespan = new Float32Array(this.agingOn ? n : 0);
    this.litter = new Float32Array(this.litterOn ? n : 0);
    this.activeGene = GENES.map(
      (_, k) =>
        k < CORE_GENE_COUNT ||
        (k === GENE.stamina && this.staminaOn) ||
        (k === GENE.thermal && this.thermalOn) ||
        (k === GENE.lifespan && this.agingOn) ||
        (k === GENE.litter && this.litterOn) ||
        (k === GENE.bond && this.bondsOn) ||
        ((k === GENE.plan1 || k === GENE.plan2 || k === GENE.plan3) && this.typeOn) ||
        (k === GENE.stick && this.bondsOn && c.contactBonding === 1) ||
        (k === GENE.tolerance && c.kinTolerance === 1) ||
        (k === GENE.sex && c.sexualReproduction === 2) ||
        (k === GENE.fat && c.fatDepositRate > 0) ||
        (k === GENE.torpor && this.climateOn && c.torporSaving > 0) ||
        (k === GENE.palate && c.plantTypes > 1) ||
        (k === GENE.generosity && c.shareRate > 0) ||
        ((k === GENE.stressResponse || k === GENE.calmResponse) && c.brainMode > 0 && c.chemicals === 1 && c.chemBodyEffects === 1),
    );
    this.kinLimitSq = c.kinDistance * c.kinDistance;
    this.giveOn = c.shareRate > 0;
    this.giftDelta = new Float64Array(this.giveOn ? n : 0);
    this.luckOn = c.luckSpread > 0;
    this.upkeepLuck = new Float32Array(this.luckOn ? n : 0);
    this.fertilityLuck = new Float32Array(this.luckOn ? n : 0);
    this.loadOn = c.mutationLoadRate > 0;
    this.loadMask = new Uint32Array(this.loadOn ? n : 0);
    this.fatOn = c.fatDepositRate > 0;
    this.fatStore = new Float64Array(this.fatOn ? n : 0);
    this.torporOn = this.climateOn && c.torporSaving > 0;
    this.torpid = new Float32Array(this.torporOn ? n : 0);
    this.memoryOn = c.brainMode > 0 && c.brainMemory === 1;
    this.memState = new Float32Array(this.memoryOn ? n * MEMORY_COUNT : 0);
    this.chemOn = c.brainMode > 0 && c.chemicals === 1;
    this.bodyChemOn = this.chemOn && c.chemBodyEffects === 1;
    this.chem = new Float32Array(this.chemOn ? n * 4 : 0);
    this.chemIntake = new Float32Array(this.chemOn ? n : 0);
    this.chemHit = new Uint8Array(this.chemOn ? n : 0);
    this.homeX = new Float32Array(c.brainMode > 0 && c.homeMode > 0 ? n : 0);
    this.homeY = new Float32Array(c.brainMode > 0 && c.homeMode > 0 ? n : 0);
    this.homeValue = new Float32Array(c.brainMode > 0 && c.homeMode === 3 ? n : 0);
    this.kinToleranceOn = c.kinTolerance === 1;
    this.toleranceSq = new Float32Array(this.kinToleranceOn ? n : 0);
    this.sexOn = c.sexualReproduction >= 1;
    this.sexGeneOn = c.sexualReproduction === 2;
    this.sexMode = new Uint8Array(this.sexGeneOn ? n : 0);
    this.sexParents = new Uint32Array(this.sexGeneOn ? n : 0);
    this.soloParents = new Uint32Array(this.sexGeneOn ? n : 0);
    this.mateSince = new Uint32Array(this.sexGeneOn ? n : 0);
    this.partnerList = new Uint32Array(this.sexGeneOn ? n : 0);
    this.matedNow = new Uint8Array(this.sexGeneOn ? n : 0);
    this.parent2Id = new Uint32Array(this.sexOn ? n : 0);
    this.ready = new Uint8Array(this.sexOn ? n : 0);
    this.pairs = new Uint32Array(this.sexOn ? n : 0);
    // Compatibility looks at the same genes species do: not the color marker or the mutation rate.
    this.mateMask = [];
    for (const name of GENES) {
      if (name === "hue" || name === "mutationRate") continue;
      if (!this.activeGene[GENE[name]]) continue;
      // The bonding and body-plan genes describe how a body is built, not what kind of organism it is.
      if (name === "bond" || name === "plan1" || name === "plan2" || name === "plan3" || name === "stick") continue;
      // How tolerant an organism is of relatives is a behavior setting, not part of what kind of organism it is.
      if (name === "tolerance" || name === "sex" || name === "stressResponse" || name === "calmResponse" || name === "generosity") continue;
      this.mateMask.push(GENE[name]);
    }
    this.species = new Uint32Array(c.speciesEvery > 0 ? n : 0);
    // Species, like compatibility, ignore tolerance of relatives: it is a behavior setting, not a kind of body.
    const speciesGenes = this.activeGene.map((on, k) => on && k !== GENE.tolerance && k !== GENE.sex && k !== GENE.stressResponse && k !== GENE.calmResponse && k !== GENE.generosity);
    this.tracker = c.speciesEvery > 0 ? new SpeciesTracker(c, this.ranges, speciesGenes) : null;
    const staminaOrganisms = this.staminaOn ? n : 0;
    this.stamina = new Float32Array(staminaOrganisms);
    this.staminaMax = new Float32Array(staminaOrganisms);
    this.staminaCost = new Float32Array(staminaOrganisms);
    this.guardOn = c.killOwnershipTicks > 0;
    const guardCells = this.guardOn ? cells : 0;
    this.corpseOwner = new Uint32Array(guardCells);
    this.corpseOwnerUntil = new Uint32Array(guardCells);

    this.float32Fields = [
      this.x, this.y, this.headingX, this.headingY, this.size, this.speed, this.senseRange, this.metabolism,
      this.mutationRate, this.diet, this.attack, this.armor, this.basalCost, this.moveCost, this.senseCost,
      this.attackCost, this.attemptCost, this.armorCost, this.plantBite, this.meatBite, this.plantWeight,
      this.meatWeight, this.plantEff, this.meatEff, this.attackPower, this.defense, this.reach,
      this.bodyEnergy, this.bodyMatter, this.threshold,
    ];
    if (c.brainMode > 0) {
      this.float32Fields.push(this.brainCost, this.outTurn, this.outSpeed, this.outAttack, this.moveScale);
    }
    if (this.staminaOn) this.float32Fields.push(this.stamina, this.staminaMax, this.staminaCost);
    if (this.thermalOn) this.float32Fields.push(this.thermalPref, this.thermalScale);
    if (this.agingOn) this.float32Fields.push(this.lifespan);
    if (this.litterOn) this.float32Fields.push(this.litter);
    if (this.kinToleranceOn) this.float32Fields.push(this.toleranceSq);
    if (this.homeX.length > 0) this.float32Fields.push(this.homeX, this.homeY);
    if (this.homeValue.length > 0) this.float32Fields.push(this.homeValue);

    if (this.chemOn) this.float32Fields.push(this.chemIntake);
    this.float64Fields = [this.energy, this.plantTaken, this.meatTaken];
    if (this.fatOn) this.float64Fields.push(this.fatStore);
    this.uint32Fields = [this.id, this.parentId, this.age, this.kills];
    if (this.tracker) this.uint32Fields.push(this.species);
    if (this.sexOn) this.uint32Fields.push(this.parent2Id);
    this.uint8Fields = [this.killed, this.attempted];
    if (this.typeOn) {
      this.uint8Fields.push(this.cellType);
      this.float32Fields.push(this.photoGain);
    }
    if (this.camoOn) {
      this.uint8Fields.push(this.hasImage);
      this.float32Fields.push(this.searchHue);
    }
    if (this.sexGeneOn) this.uint8Fields.push(this.sexMode);
    if (this.loadOn) this.uint32Fields.push(this.loadMask);
    if (this.luckOn) this.float32Fields.push(this.upkeepLuck, this.fertilityLuck);
    if (this.sexGeneOn) this.uint32Fields.push(this.mateSince);
    if (this.chemOn) this.uint8Fields.push(this.chemHit);
    this.uint16Fields = [this.resting];
    if (this.diseaseOn) this.uint16Fields.push(this.infection, this.sickFor, this.immuneFor);
    if (c.brainMode > 0) {
      this.uint16Fields.push(this.brainCount, this.brainConnections);
      this.uint8Fields.push(this.brainHidden, this.brainSenses);
    }

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
    founder[GENE.stamina] = traitToGene(c.initialStamina, this.ranges.stamina);
    founder[GENE.thermal] = traitToGene(c.initialThermal, this.ranges.thermal);
    founder[GENE.lifespan] = traitToGene(c.initialLifespan, this.ranges.lifespan);
    founder[GENE.litter] = traitToGene(c.initialLitter, this.ranges.litter);
    founder[GENE.bond] = c.initialBond;
    founder[GENE.stick] = c.initialStick;
    founder[GENE.tolerance] = c.initialTolerance;
    founder[GENE.sex] = c.initialSex;
    founder[GENE.fat] = c.initialFat;
    founder[GENE.torpor] = c.initialTorpor;
    founder[GENE.palate] = c.initialPalate;
    founder[GENE.stressResponse] = c.initialStressResponse;
    founder[GENE.calmResponse] = c.initialCalmResponse;
    founder[GENE.generosity] = c.initialShare;
    for (let i = 0; i < c.initialOrganisms; i++) {
      let fx = this.rng.range(0, c.worldWidth);
      let fy = this.rng.range(0, c.worldHeight);
      // With terrain, founders start on dry land.
      while (this.terrainOn && this.passable[Math.floor(fy / c.foodCellSize) * this.gridWidth + Math.floor(fx / c.foodCellSize)] === 0) {
        fx = this.rng.range(0, c.worldWidth);
        fy = this.rng.range(0, c.worldHeight);
      }
      const index = this.spawn(0, fx, fy);
      for (let g = 0; g < GENE_COUNT; g++) this.genes[index * GENE_COUNT + g] = founder[g]!;
      this.genes[index * GENE_COUNT + GENE.hue] = this.rng.next();
      if (c.founderSpread > 0 || c.sexFounderSpread > 0) {
        // Standing variety: the newer genes that are switched on start a random amount above their starting value.
        // (The mate-seeking gene can have its own amount, sexFounderSpread; -1 means it follows founderSpread.)
        for (const gene of [GENE.tolerance, GENE.sex, GENE.fat, GENE.torpor, GENE.palate, GENE.stressResponse, GENE.calmResponse, GENE.generosity]) {
          const spread = gene === GENE.sex && c.sexFounderSpread >= 0 ? c.sexFounderSpread : c.founderSpread;
          if (this.activeGene[gene] && spread > 0) this.genes[index * GENE_COUNT + gene] = clamp01(this.genes[index * GENE_COUNT + gene]! + spread * this.rng.next());
        }
      }
      if (this.loadOn && c.mutationLoadStart > 0) {
        // Standing load: real populations already carry harmful mutations, so founders can start with some.
        if (c.mutationLoadModel === 1) {
          this.loadMask[index] = this.newHarm(c.mutationLoadStart);
        } else {
          const chance = c.mutationLoadStart / c.mutationLoadLoci;
          let mask = 0;
          for (let j = 0; j < c.mutationLoadLoci; j++) if (this.rng.next() < chance) mask |= 1 << j;
          this.loadMask[index] = mask >>> 0;
        }
      }
      if (this.typeOn) for (const plan of [GENE.plan1, GENE.plan2, GENE.plan3]) this.genes[index * GENE_COUNT + plan] = this.rng.next();
      this.express(index);
      this.initBrain(index);
      this.energy[index] = this.threshold[index]! * c.initialEnergyFraction;
    }
    this.tracker?.start(this.count, this.genes, this.species);
  }

  /** Work out the fixed parts of the climate: how cold, how seasonal and how sunny each cell is. */
  private setUpClimate(): void {
    const c = this.config;
    const gw = this.gridWidth;
    const gh = this.gridHeight;
    for (let cy = 0; cy < gh; cy++) {
      const polar = polarness(cy, gh);
      for (let cx = 0; cx < gw; cx++) {
        const cell = cy * gw + cx;
        const mountain = this.terrainOn && this.biome[cell] === BIOME.mountain ? c.mountainCooling : 0;
        this.tempBase[cell] = c.baseTemperature - c.latitudeCooling * polar - mountain;
        this.tempSwing[cell] = c.seasonTempSwing * (0.5 + 0.5 * polar);
        this.lightBase[cell] = 1 - c.latitudeLight * polar;
      }
    }
    this.updateClimate();
  }

  /** Recompute every cell's temperature and plant growth factor for the current tick. */
  private updateClimate(): void {
    const c = this.config;
    const t = this.tick;
    let yearMult = 1;
    if (c.yearVariability > 0) {
      // Harsh and mild years: a fixed scramble of the year number stretches or shrinks that year's swing.
      const year = Math.floor(t / c.yearLength);
      yearMult = 1 + c.yearVariability * (2 * unitHash(year, this.seed) - 1);
    }
    const season = (c.yearLength > 0 ? smoothWave(t / c.yearLength + 0.25) : 0) * yearMult;
    const daylight = c.dayLength > 0 ? 1 - c.dayNightDepth * (1 - (smoothWave(t / c.dayLength + 0.25) + 1) / 2) : 1;
    const drift = c.climateDriftPeriod > 0 ? c.climateDriftAmplitude * smoothWave(t / c.climateDriftPeriod + 0.25) : 0;
    // A catastrophe in progress builds up and fades smoothly, worst in the middle.
    let cooling = 0;
    let dryness = 1;
    if (this.catKind !== 0 && t < this.catEnd) {
      const p = (t - this.catStart) / (this.catEnd - this.catStart);
      const hump = 4 * p * (1 - p);
      if (this.catKind === 1) cooling = c.iceAgeCooling * hump;
      else dryness = 1 - c.droughtSeverity * hump;
    }
    // (A harsh year can push the swing past what plants can take: growth stops, it never goes negative.)
    const swungGrowth = 1 + c.seasonGrowthSwing * season;
    const seasonGrowth = (swungGrowth > 0 ? swungGrowth : 0) * dryness;
    const optimum = c.plantTempOptimum;
    const tolerance = c.plantTempTolerance;
    // Kinds of plant: each peaks at a different time of year and likes a slightly different temperature.
    const kinds = this.plantKinds;
    if (kinds > 1) {
      for (let j = 0; j < kinds; j++) {
        const wave = c.yearLength > 0 ? smoothWave(t / c.yearLength + 0.25 - (j / kinds) * c.plantTypePhase) * yearMult : 0;
        const swung = 1 + c.seasonGrowthSwing * wave;
        this.kindGrowth[j] = (swung > 0 ? swung : 0) * dryness;
        this.kindOptimum[j] = optimum + (j - (kinds - 1) / 2) * c.plantTypeTempSpread;
      }
    }
    // Weather: the two weather maps shift east and south as time passes and are blended, so fronts move and change shape.
    let shiftX = 0;
    let shiftY = 0;
    let blend = 0;
    const gw = this.gridWidth;
    const gh = this.gridHeight;
    if (this.weatherOn) {
      if (c.weatherDriftTicks > 0) shiftX = Math.floor(t / c.weatherDriftTicks) % gw;
      if (c.weatherDriftYTicks > 0) shiftY = Math.floor(t / c.weatherDriftYTicks) % gh;
      if (c.weatherMorphPeriod > 0) blend = (smoothWave(t / c.weatherMorphPeriod + 0.25) + 1) / 2;
    }
    for (let cell = 0; cell < this.temperature.length; cell++) {
      let weather = 0;
      if (this.weatherOn) {
        const cx = cell % gw;
        const cy = (cell - cx) / gw;
        const from = ((cy - shiftY + gh) % gh) * gw + ((cx - shiftX + gw) % gw);
        weather = c.weatherAmplitude * (this.weatherA[from]! * (1 - blend) + this.weatherB[from]! * blend);
      }
      const temp = this.tempBase[cell]! + this.tempSwing[cell]! * season + drift - cooling + weather;
      this.temperature[cell] = temp;
      const kind = kinds > 1 ? this.plantTypeOf[cell]! : 0;
      const off = (temp - (kinds > 1 ? this.kindOptimum[kind]! : optimum)) / tolerance;
      const comfort = 1 - off * off;
      this.growthFactor[cell] = comfort > 0 ? this.lightBase[cell]! * daylight * (kinds > 1 ? this.kindGrowth[kind]! : seasonGrowth) * comfort : 0;
    }
  }

  /** Start, end or ignore a catastrophe this tick, according to the schedule and the dice. */
  private catastropheCheck(): void {
    const c = this.config;
    const t = this.tick;
    if (this.catKind !== 0 && t >= this.catEnd) {
      this.worldEvents.push({ tick: t, kind: "recovery", text: this.catKind === 1 ? "The ice age ends" : "The drought ends" });
      this.catKind = 0;
    }
    let start = c.catastropheAt > 0 && t === c.catastropheAt;
    // Random ones: a fresh roll every tick (only when enabled, so other worlds draw no extra random numbers).
    if (!start && c.catastropheEvery > 0 && this.catKind === 0 && this.rng.next() < 1 / c.catastropheEvery) start = true;
    if (!start || this.catKind !== 0) return;
    const kind = c.catastropheKind === 4 ? 1 + this.rng.int(3) : c.catastropheKind;
    if (kind === 3) {
      this.meteorStrike();
      return;
    }
    this.catKind = kind;
    this.catStart = t;
    this.catEnd = t + c.catastropheLength;
    this.worldEvents.push({
      tick: t,
      kind: kind === 1 ? "iceAge" : "drought",
      text: kind === 1 ? `An ice age begins: up to ${c.iceAgeCooling} colder everywhere for ${c.catastropheLength} ticks` : `A drought begins: plant growth falls by up to ${Math.round(c.droughtSeverity * 100)}% for ${c.catastropheLength} ticks`,
    });
  }

  /**
   * A meteor lands somewhere at random: every organism within the radius dies (its body and
   * whatever energy it carried become a corpse), and the plants in the crater are destroyed (their
   * matter becomes detritus and their energy is lost as heat, so the books still balance).
   */
  private meteorStrike(): void {
    const c = this.config;
    const W = c.worldWidth;
    const H = c.worldHeight;
    const x0 = this.rng.range(0, W);
    const y0 = this.rng.range(0, H);
    const r2 = c.meteorRadius * c.meteorRadius;
    const near = (x: number, y: number): boolean => {
      let dx = x - x0;
      let dy = y - y0;
      if (dx > W / 2) dx -= W;
      else if (dx < -W / 2) dx += W;
      if (dy > H / 2) dy -= H;
      else if (dy < -H / 2) dy += H;
      return dx * dx + dy * dy <= r2;
    };
    const cs = c.foodCellSize;
    let killed = 0;
    for (let i = 0; i < this.count; i++) {
      if (this.killed[i] === 1 || !near(this.x[i]!, this.y[i]!)) continue;
      const cell = Math.floor(this.y[i]! / cs) * this.gridWidth + Math.floor(this.x[i]! / cs);
      this.corpseEnergy[cell] = this.corpseEnergy[cell]! + this.bodyEnergy[i]! + this.energy[i]! + (this.fatOn ? this.fatStore[i]! : 0);
      this.corpseMatter[cell] = this.corpseMatter[cell]! + this.bodyMatter[i]!;
      this.energy[i] = 0;
      this.killed[i] = 1;
      killed++;
    }
    for (let cy = 0; cy < this.gridHeight; cy++) {
      for (let cx = 0; cx < this.gridWidth; cx++) {
        if (!near((cx + 0.5) * cs, (cy + 0.5) * cs)) continue;
        const cell = cy * this.gridWidth + cx;
        this.detritus[cell] = this.detritus[cell]! + this.food[cell]!;
        this.ledger.decayLoss += this.food[cell]! * c.energyPerFood;
        this.food[cell] = 0;
      }
    }
    this.worldEvents.push({ tick: this.tick, kind: "meteor", text: `A meteor strikes near (${Math.round(x0)}, ${Math.round(y0)}): ${killed} organisms killed` });
  }

  /** Fill in the terrain arrays from a biome map, and scale plant growth by biome. */
  private applyTerrain(biome: Uint8Array): void {
    const c = this.config;
    const growth = growthMultipliers(c);
    const move = moveMultipliers(c);
    this.biome.set(biome);
    for (let cell = 0; cell < biome.length; cell++) {
      const kind = biome[cell]!;
      this.passable[cell] = kind === BIOME.water ? 0 : 1;
      this.terrainMove[cell] = move[kind]!;
      this.foodCapacity[cell] = this.foodCapacity[cell]! * growth[kind]!;
      this.foodRegrow[cell] = this.foodRegrow[cell]! * growth[kind]!;
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
    if (this.sexOn) this.parent2Id[i] = 0;
    if (this.sexGeneOn) this.sexMode[i] = 0;
    if (this.fatOn) this.fatStore[i] = 0;
    if (this.loadOn) this.loadMask[i] = 0;
    if (this.luckOn) {
      this.upkeepLuck[i] = this.rollLuck();
      this.fertilityLuck[i] = this.rollLuck();
    }
    if (this.memoryOn) this.memState.fill(0, i * MEMORY_COUNT, (i + 1) * MEMORY_COUNT);
    if (this.chemOn) {
      this.chem.fill(0, i * 4, i * 4 + 4);
      this.chem[i * 4 + 3] = 0.5; // a newborn starts out neither calm nor stressed
      this.chemIntake[i] = 0;
      this.chemHit[i] = 0;
    }
    if (this.homeX.length > 0) {
      this.homeX[i] = x;
      this.homeY[i] = y;
      if (this.homeValue.length > 0) this.homeValue[i] = 0;
    }
    if (this.bondsOn) this.bondTo.fill(-1, i * BOND_SLOTS, (i + 1) * BOND_SLOTS);
    if (this.typeOn) this.cellType[i] = 0;
    if (this.camoOn) this.hasImage[i] = 0;
    if (this.diseaseOn) {
      this.infection[i] = 0;
      this.sickFor[i] = 0;
      this.immuneFor[i] = 0;
    }
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
    if (this.config.brainMode > 0) {
      this.outTurn[i] = 0;
      this.outSpeed[i] = 0;
      this.outAttack[i] = 0;
      this.moveScale[i] = 1;
    }
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
    // A specialized cell is better than a generalist at one job and worse at the others.
    let speedFactor = 1;
    let biteFactor = 1;
    let defenseFactor = 1;
    let upkeepFactor = 1;
    let senseBonus = 0;
    let photo = 0;
    if (this.typeOn) {
      switch (this.cellType[i]) {
        case 1:
          biteFactor = c.typeFeederBite;
          speedFactor = c.typeFeederSpeed;
          break;
        case 2:
          speedFactor = c.typeMoverSpeed;
          biteFactor = c.typeMoverBite;
          break;
        case 3:
          photo = c.typePhotoGain;
          biteFactor = c.typePhotoBite;
          speedFactor = c.typePhotoSpeed;
          break;
        case 4:
          defenseFactor = c.typeArmorDefense;
          speedFactor = c.typeArmorSpeed;
          upkeepFactor = c.typeArmorUpkeep;
          break;
        case 5:
          senseBonus = c.typeSensorRange;
          biteFactor = c.typeSensorBite;
          speedFactor = c.typeSensorSpeed;
          break;
      }
    }
    const speed = at("speed") * speedFactor;
    const sense = at("senseRange") + senseBonus;
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
    this.basalCost[i] = c.basalCostCoeff * metabolism * sizeToThreeQuarters * upkeepFactor;
    if (this.typeOn) this.photoGain[i] = photo * sizeToThreeQuarters;
    this.moveCost[i] = c.moveCostCoeff * size * speed * speed * (1 + c.armorMoveFactor * armor);
    this.senseCost[i] = c.senseCostCoeff * sense;
    if (this.kinToleranceOn) {
      const tolerance = genes[g + GENE.tolerance]!;
      // The circle of relatives this organism spares is its tolerance times the most kinDistance allows.
      this.toleranceSq[i] = tolerance * tolerance * this.kinLimitSq;
      this.senseCost[i] = this.senseCost[i]! + c.toleranceCostCoeff * tolerance;
    }
    const fightingPenalty = 1 + c.herbivoreAttackPenalty * (1 - diet);
    this.attackCost[i] = c.attackCostCoeff * attack * size * fightingPenalty;
    this.attemptCost[i] = c.attackAttemptCost * size * fightingPenalty;
    this.armorCost[i] = c.armorCostCoeff * armor * size;
    if (this.staminaOn) {
      const reserve = at("stamina");
      this.staminaMax[i] = reserve;
      this.staminaCost[i] = c.staminaCostCoeff * reserve * size;
      // A newborn starts with a full reserve; re-expressing a living organism keeps what it has (up to the new size).
      this.stamina[i] = this.age[i] === 0 ? reserve : Math.min(this.stamina[i]!, reserve);
    }

    if (this.agingOn) {
      this.lifespan[i] = at("lifespan");
      // Keeping a long-lived body in repair costs upkeep all the time.
      this.basalCost[i] = this.basalCost[i]! * (1 + c.agingRepairCoeff * genes[g + GENE.lifespan]!);
    }
    if (this.litterOn) this.litter[i] = at("litter");
    if (this.thermalOn) {
      this.thermalPref[i] = at("thermal");
      this.thermalScale[i] = c.thermalCostCoeff * sizeToThreeQuarters;
    }

    // Eating. The diet gene splits appetite between plants (diet 0) and meat (diet 1),
    // and a specialist digests its own food better than a generalist does.
    const eatingSize = (1 - c.biteSizeBlend) * sizeToThreeQuarters + c.biteSizeBlend * size;
    const bite = c.biteRate * metabolism * eatingSize * biteFactor;
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
    this.defense[i] = (armor + c.armorBase) * size * defenseFactor;
    this.reach[i] = c.reachBase + c.reachPerSize * size;

    // Bodies.
    this.bodyEnergy[i] = c.bodyEnergyPerSize * size;
    this.bodyMatter[i] = c.bodyMatterPerSize * size;
    this.threshold[i] = c.reproThresholdPerSize * size;
    if (this.luckOn) this.threshold[i] = this.threshold[i]! * this.fertilityLuck[i]!;
    if (this.loadOn && c.mutationLoadFertility > 0) this.threshold[i] = this.threshold[i]! * (1 + c.mutationLoadFertility * this.badSpots(i));
    if (this.torporOn) this.basalCost[i] = this.basalCost[i]! * (1 + c.torporUpkeep * genes[g + GENE.torpor]!);
    if (this.loadOn) {
      const spots = this.badSpots(i);
      this.basalCost[i] = this.basalCost[i]! * (1 + c.mutationLoadCost * spots + c.mutationLoadSynergy * spots * spots);
    }
    if (this.luckOn) this.basalCost[i] = this.basalCost[i]! * this.upkeepLuck[i]!;
  }

  /** Give a new organism (at index `child`) a mutated copy of its parent's genes. */
  private inheritGenes(child: number, parent: number): void {
    const meta = this.config.metaMutationStd;
    const rate = this.mutationRate[parent]!;
    for (let k = 0; k < GENE_COUNT; k++) {
      // A gene that is not doing anything in this world (see activeGene) is copied without a random
      // draw, which keeps worlds without it identical to how they played out before it existed.
      if (!this.activeGene[k]) {
        this.genes[child * GENE_COUNT + k] = this.genes[parent * GENE_COUNT + k]!;
        continue;
      }
      const std = k === GENE.mutationRate ? meta : rate;
      this.genes[child * GENE_COUNT + k] = clamp01(this.genes[parent * GENE_COUNT + k]! + this.rng.gaussian() * std);
    }
  }

  /** How different two organisms are, genetically: root-mean-square difference over the genes that count (squared). */
  private geneDistanceSq(i: number, j: number): number {
    const g = this.genes;
    let sum = 0;
    for (const k of this.mateMask) {
      const d = g[i * GENE_COUNT + k]! - g[j * GENE_COUNT + k]!;
      sum += d * d;
    }
    return sum / this.mateMask.length;
  }

  /** One roll of luck: a bell curve around 1, cut off a set number of spreads either way. */
  private rollLuck(): number {
    const c = this.config;
    let z = this.rng.gaussian();
    if (z > c.luckLimit) z = c.luckLimit;
    else if (z < -c.luckLimit) z = -c.luckLimit;
    return 1 + c.luckSpread * z;
  }

  /** A random number of new harmful mutations averaging `mean` (many small independent chances, which is close to the usual Poisson count). */
  private newHarm(mean: number): number {
    if (mean <= 0) return 0;
    const trials = Math.max(8, Math.ceil(mean * 8));
    const chance = mean / trials;
    let count = 0;
    for (let t = 0; t < trials; t++) if (this.rng.next() < chance) count++;
    return count;
  }

  /** How many of organism i's spots have gone bad. */
  private badSpots(i: number): number {
    if (this.config.mutationLoadModel === 1) return this.loadMask[i]!;
    let v = this.loadMask[i]!;
    let count = 0;
    while (v !== 0) {
      v &= v - 1;
      count++;
    }
    return count;
  }

  /** The average number of bad spots per organism (0 when harmful mutations are off). */
  meanMutationLoad(): number {
    if (!this.loadOn || this.count === 0) return 0;
    let sum = 0;
    for (let i = 0; i < this.count; i++) sum += this.badSpots(i);
    return sum / this.count;
  }

  /** Hand down the harmful mutations: all of one parent's, or a mix of two parents' (each spot from one or the other), then new ones. */
  private inheritLoad(child: number, a: number, b: number): void {
    const c = this.config;
    if (c.mutationLoadModel === 1) {
      // Unlimited places for harm: a split-off baby keeps all its parent's mutations; a baby of two parents gets each one with a 50/50 chance.
      let count = 0;
      if (b >= 0) {
        for (let k = this.loadMask[a]!; k > 0; k--) if (this.rng.next() < 0.5) count++;
        for (let k = this.loadMask[b]!; k > 0; k--) if (this.rng.next() < 0.5) count++;
      } else {
        count = this.loadMask[a]!;
      }
      this.loadMask[child] = count + this.newHarm(c.mutationLoadRate);
      return;
    }
    const loci = c.mutationLoadLoci;
    const fromA = this.loadMask[a]!;
    let mask = fromA;
    if (b >= 0) {
      const fromB = this.loadMask[b]!;
      mask = 0;
      for (let j = 0; j < loci; j++) {
        const bit = 1 << j;
        if (((this.rng.next() < 0.5 ? fromA : fromB) & bit) !== 0) mask |= bit;
      }
    }
    const chance = c.mutationLoadRate / loci;
    for (let j = 0; j < loci; j++) {
      const bit = 1 << j;
      if ((mask & bit) !== 0) {
        if (this.rng.next() < c.mutationLoadBack) mask &= ~bit;
      } else if (this.rng.next() < chance) {
        mask |= bit;
      }
    }
    this.loadMask[child] = mask >>> 0;
  }

  /** Mix two parents' genes (each gene comes from one or the other) and mutate the result. */
  private inheritGenesFromTwo(child: number, a: number, b: number): void {
    const meta = this.config.metaMutationStd;
    const rate = (this.mutationRate[a]! + this.mutationRate[b]!) / 2;
    for (let k = 0; k < GENE_COUNT; k++) {
      if (!this.activeGene[k]) {
        this.genes[child * GENE_COUNT + k] = this.genes[a * GENE_COUNT + k]!;
        continue;
      }
      const donor = this.rng.next() < 0.5 ? a : b;
      const std = k === GENE.mutationRate ? meta : rate;
      this.genes[child * GENE_COUNT + k] = clamp01(this.genes[donor * GENE_COUNT + k]! + this.rng.gaussian() * std);
    }
  }

  /** Rare large mutations: now and then a few genes jump by a lot at once. */
  private macroMutate(child: number): void {
    const c = this.config;
    if (c.macroMutationProb <= 0 || this.rng.next() >= c.macroMutationProb) return;
    for (let j = 0; j < c.macroMutationGenes; j++) {
      const k = this.mateMask[this.rng.int(this.mateMask.length)]!;
      const at = child * GENE_COUNT + k;
      this.genes[at] = clamp01(this.genes[at]! + this.rng.gaussian() * c.macroMutationStd);
    }
  }

  /** Give organism i its starting brain (empty, or fully wired with zero weights, depending on the mode). */
  private initBrain(i: number): void {
    const c = this.config;
    if (c.brainMode === 0) return;
    const base = i * CONN_MAX;
    let count = c.brainMode === 1 ? initFixedBrain(this.brainFrom, this.brainTo, this.brainWeight, base, c.brainHidden) : 0;
    if (c.brainFounderReflex > 0) {
      // Founders start with a reflex: turn toward the side where plants are richer.
      count = setConnection(this.brainFrom, this.brainTo, this.brainWeight, base, count, INPUT.smellPlantSide, OUTPUT_START + OUTPUT.turn, FOUNDER_REFLEX_WEIGHT);
    }
    if (c.brainFounderReflex > 1) {
      // And a pull toward things smaller than themselves: turn toward them, and speed up when one is dead ahead.
      const turn = OUTPUT_START + OUTPUT.turn;
      for (let ray = 0; ray < RAY_COUNT; ray++) {
        const strength = (ray - (RAY_COUNT - 1) / 2) * CHASE_REFLEX_TURN; // right rays turn right (negative), left rays turn left
        if (strength !== 0) count = setConnection(this.brainFrom, this.brainTo, this.brainWeight, base, count, INPUT.visionStart + ray * RAY_CHANNELS, turn, strength);
      }
      count = setConnection(this.brainFrom, this.brainTo, this.brainWeight, base, count, INPUT.visionStart + 2 * RAY_CHANNELS, OUTPUT_START + OUTPUT.speed, CHASE_REFLEX_SPEED);
    }
    this.brainCount[i] = count;
    this.refreshBrain(i);
  }

  /** Give a new organism a mutated copy of its parent's brain. */
  private inheritBrain(child: number, parent: number): void {
    const c = this.config;
    if (c.brainMode === 0) return;
    const parentBase = parent * CONN_MAX;
    const childBase = child * CONN_MAX;
    const count = this.brainCount[parent]!;
    this.brainFrom.copyWithin(childBase, parentBase, parentBase + count);
    this.brainTo.copyWithin(childBase, parentBase, parentBase + count);
    this.brainWeight.copyWithin(childBase, parentBase, parentBase + count);
    this.brainCount[child] = mutateBrain(c.brainMode, this.rng, c, this.brainFrom, this.brainTo, this.brainWeight, childBase, count);
    this.refreshBrain(child);
  }

  /** Give a new organism a mixed copy of both parents' brains (see crossoverBrains), then mutate it. */
  private inheritBrainFromTwo(child: number, a: number, b: number): void {
    const c = this.config;
    if (c.brainMode === 0) return;
    const childBase = child * CONN_MAX;
    const count = crossoverBrains(c.brainMode, this.rng, this.brainFrom, this.brainTo, this.brainWeight, a * CONN_MAX, this.brainCount[a]!, b * CONN_MAX, this.brainCount[b]!, childBase);
    this.brainCount[child] = mutateBrain(c.brainMode, this.rng, c, this.brainFrom, this.brainTo, this.brainWeight, childBase, count);
    this.refreshBrain(child);
  }

  /** Work out how big organism i's brain really is, and what it costs to run. */
  private refreshBrain(i: number): void {
    const c = this.config;
    const size = measureBrain(this.brainFrom, this.brainTo, this.brainWeight, i * CONN_MAX, this.brainCount[i]!, c.brainPruneBelow);
    this.brainHidden[i] = size.hidden;
    this.brainConnections[i] = size.connections;
    // Work out which kinds of input any working connection reads, so thinking can skip the rest.
    let senses = 0;
    let readsChem = false;
    const base = i * CONN_MAX;
    for (let k = 0; k < this.brainCount[i]!; k++) {
      const w = this.brainWeight[base + k]!;
      if (w < c.brainPruneBelow && w > -c.brainPruneBelow) continue;
      const source = this.brainFrom[base + k]!;
      if (source >= INPUT_COUNT) continue; // hidden units read other inputs, which are counted on their own
      if (source >= INPUT.chemReward && source <= INPUT.chemCalm) readsChem = true;
      if (source < INPUT.smellPlantAhead) senses |= SENSE_VISION;
      else if (source < INPUT.energy) senses |= SENSE_SMELL;
      else if (source >= INPUT.kinDensity && source <= INPUT.kinSide) senses |= SENSE_SOCIAL;
      else senses |= SENSE_BODY;
    }
    this.brainSenses[i] = senses;
    this.brainCost[i] = c.brainBaseCost + c.brainCostPerNeuron * size.hidden + c.brainCostPerConnection * size.connections + (readsChem && this.chemOn ? c.chemicalsCost : 0);
  }

  /** Which kind of plant grows in each cell (empty when there is only one kind). Fixed for the whole run. */
  plantKindMap(): Uint8Array {
    return this.plantTypeOf;
  }

  /** How well organism i digests the plants growing in a cell: 1 for its favorite kind, falling to the floor (kinds are spaced evenly from 0 to 1). */
  private palateMatch(i: number, cell: number): number {
    const c = this.config;
    const position = this.plantTypeOf[cell]! / (this.plantKinds - 1);
    const distance = Math.abs(this.genes[i * GENE_COUNT + GENE.palate]! - position);
    const match = 1 - distance / c.plantPalateWidth;
    return match > c.plantPalateFloor ? match : c.plantPalateFloor;
  }

  /** Move organism i's four chemical signals (reward, stress, bond, calm) on by one thought. */
  private updateChemicals(i: number): void {
    const c = this.config;
    const at = i * 4;
    const decay = c.chemDecay;
    const energyFraction = Math.min(this.energy[i]! / this.threshold[i]!, 1);
    // Reward: food just eaten.
    const reward = this.chem[at]! * decay + (c.chemRewardGain * this.chemIntake[i]!) / this.threshold[i]!;
    // Stress: being attacked, being very hungry, being sick.
    let stress = this.chem[at + 1]! * decay;
    if (this.chemHit[i] === 1) stress += c.chemStressHit;
    if (energyFraction < c.chemHungerBelow) stress += (c.chemStressHunger * (c.chemHungerBelow - energyFraction)) / c.chemHungerBelow;
    if (this.diseaseOn && this.sickFor[i]! > 0) stress += c.chemStressSick;
    // Bonding: relatives close by (or bonded neighbors).
    let company = 0;
    if (this.kinLimitSq > 0) {
      this.visSelf = i;
      this.visX = this.x[i]!;
      this.visY = this.y[i]!;
      this.kinCount = 0;
      this.kinVx = 0;
      this.kinVy = 0;
      this.hash.forEachNear(this.visX, this.visY, c.herdRange, this.seeKin);
      company = Math.min(1, this.kinCount / c.herdCap);
    }
    if (this.bondsOn) company = Math.max(company, this.bondCount(i) / BOND_SLOTS);
    const bond = this.chem[at + 2]! * decay + c.chemBondGain * company;
    // Calm: well fed and not stressed.
    const clampedStress = stress > 1 ? 1 : stress;
    const calm = this.chem[at + 3]! + c.chemCalmRate * (energyFraction * (1 - clampedStress) - this.chem[at + 3]!);
    this.chem[at] = reward > 1 ? 1 : reward;
    this.chem[at + 1] = clampedStress;
    this.chem[at + 2] = bond > 1 ? 1 : bond;
    this.chem[at + 3] = calm;
    this.chemIntake[i] = 0;
    this.chemHit[i] = 0;
  }

  /** Used while sensing relatives: count the genetically close ones in range and add up the directions to them. */
  private readonly seeKin = (index: number, distSq: number): void => {
    if (index === this.visSelf || this.killed[index] === 1 || distSq <= 0) return;
    if (this.geneDistanceSq(this.visSelf, index) > this.kinLimitSq) return;
    const W = this.config.worldWidth;
    const H = this.config.worldHeight;
    let dx = this.x[index]! - this.visX;
    let dy = this.y[index]! - this.visY;
    if (dx > W / 2) dx -= W;
    else if (dx < -W / 2) dx += W;
    if (dy > H / 2) dy -= H;
    else if (dy < -H / 2) dy += H;
    const inv = 1 / Math.sqrt(dx * dx + dy * dy);
    this.kinCount++;
    this.kinVx += dx * inv;
    this.kinVy += dy * inv;
  };

  /** Used while counting a prey animal's herd (see herdFactor). */
  private readonly countHerd = (index: number, distSq: number): void => {
    if (index === this.herdSelf || this.killed[index] === 1 || distSq <= 0) return;
    if (this.geneDistanceSq(this.herdSelf, index) <= this.kinLimitSq) this.kinCount++;
  };

  /** How much this cell can resist an attack: its own defense (and herd, if on), plus a share of its bonded neighbors' defense. */
  private defendedBy(prey: number): number {
    let defense = this.defense[prey]! * this.herdFactor(prey);
    const share = this.config.colonyDefenseShare;
    if (this.bondsOn && share > 0) {
      for (let k = 0; k < BOND_SLOTS; k++) {
        const partner = this.bondTo[prey * BOND_SLOTS + k]!;
        if (partner >= 0) defense += share * this.defense[partner]!;
      }
    }
    return defense;
  }

  /** How much harder this animal is to kill because of the relatives around it (1 = alone, or herding is off). */
  private herdFactor(prey: number): number {
    const c = this.config;
    if (c.herdBonus <= 0) return 1;
    this.herdSelf = prey;
    this.kinCount = 0;
    this.hash.forEachNear(this.x[prey]!, this.y[prey]!, c.herdRange, this.countHerd);
    const crowd = this.kinCount < c.herdCap ? this.kinCount : c.herdCap;
    return 1 + (c.herdBonus * crowd) / c.herdCap;
  }

  /** What an organism notices when something is within sight: sorts it into the vision ray it falls in. */
  private readonly seeOther = (index: number, distSq: number): void => {
    if (index === this.visSelf || this.killed[index] === 1) return;
    if (this.camoOn && !this.detects(this.visSelf, index)) return; // well hidden
    const W = this.config.worldWidth;
    const H = this.config.worldHeight;
    let dx = this.x[index]! - this.visX;
    let dy = this.y[index]! - this.visY;
    if (dx > W / 2) dx -= W;
    else if (dx < -W / 2) dx += W;
    if (dy > H / 2) dy -= H;
    else if (dy < -H / 2) dy += H;
    const forward = dx * this.visHx + dy * this.visHy;
    if (forward <= 0) return; // behind me
    const side = this.visHx * dy - this.visHy * dx; // positive = to my left
    const across = side < 0 ? -side : side;
    // Five rays, each 30 degrees wide: straight ahead, and two on each side. The cut-offs are
    // the tangents of 15, 45 and 75 degrees, so no trigonometry is needed.
    let ray: number;
    if (across < 0.2679491924311227 * forward) ray = 2;
    else if (across < forward) ray = side > 0 ? 3 : 1;
    else if (across < 3.732050807568877 * forward) ray = side > 0 ? 4 : 0;
    else return;
    // Is it something a hunter of my size could handle, or something bigger?
    if (this.size[index]! <= this.visSizeLimit) {
      if (distSq < this.rayDistSmall[ray]!) {
        this.rayDistSmall[ray] = distSq;
        this.rayTargetSmall[ray] = index;
      }
    } else if (distSq < this.rayDistLarge[ray]!) {
      this.rayDistLarge[ray] = distSq;
      this.rayTargetLarge[ray] = index;
    }
  };

  /**
   * Organism i looks, smells and feels, runs its brain, and remembers what it decided.
   * Everyone does this before anyone moves, so every brain sees the same world.
   */
  private think(i: number): void {
    const c = this.config;
    const inputs = this.thinkInputs;
    const senses = this.brainSenses[i]!;
    const traced = this.id[i] === this.traceId;
    // A brain with no working connections decides nothing (every output is zero), and a
    // brain only needs the senses it is wired to. Skipping the rest changes no result,
    // only saves time. (An organism being watched in the viewer senses everything.)
    if (senses === 0 && !traced) {
      this.outTurn[i] = 0;
      this.outSpeed[i] = 0;
      this.outAttack[i] = 0;
      return;
    }
    const seeing = (senses & SENSE_VISION) !== 0 || traced;
    const smelling = (senses & SENSE_SMELL) !== 0 || traced;
    inputs.fill(0);
    const x = this.x[i]!;
    const y = this.y[i]!;
    const hx = this.headingX[i]!;
    const hy = this.headingY[i]!;
    const range = c.brainVisionRange + this.senseRange[i]!;
    const cs = c.foodCellSize;
    const gw = this.gridWidth;
    const gh = this.gridHeight;

    // Sight: for each ray, the nearest thing, how close, how big compared to me, how meaty it looks.
    if (seeing && range > 0.25) {
      this.rayDistSmall.fill(Infinity);
      this.rayTargetSmall.fill(-1);
      this.rayDistLarge.fill(Infinity);
      this.rayTargetLarge.fill(-1);
      this.visSizeLimit = this.size[i]! * c.preyMaxSizeRatio;
      this.visSelf = i;
      this.visX = x;
      this.visY = y;
      this.visHx = hx;
      this.visHy = hy;
      this.hash.forEachNear(x, y, range, this.seeOther);
      for (let k = 0; k < RAY_COUNT; k++) {
        const slot = INPUT.visionStart + k * RAY_CHANNELS;
        const smaller = this.rayTargetSmall[k]!;
        if (smaller >= 0) {
          inputs[slot] = 1 - Math.sqrt(this.rayDistSmall[k]!) / range;
          inputs[slot + 1] = this.diet[smaller]! * 2 - 1;
        }
        const larger = this.rayTargetLarge[k]!;
        if (larger >= 0) {
          inputs[slot + 2] = 1 - Math.sqrt(this.rayDistLarge[k]!) / range;
          inputs[slot + 3] = this.diet[larger]! * 2 - 1;
        }
      }
    }

    // Smell: which way do plants and corpses get stronger? (Compared across the four neighboring cells.)
    if (smelling) {
      const cx = Math.floor(x / cs);
      const cy = Math.floor(y / cs);
      const here = cy * gw + cx;
      const east = cy * gw + ((cx + 1) % gw);
      const west = cy * gw + ((cx + gw - 1) % gw);
      const south = ((cy + 1) % gh) * gw + cx;
      const north = ((cy + gh - 1) % gh) * gw + cx;
      const plantScale = 1 / c.foodCap;
      // With kinds of plant, what an animal smells is food it can digest.
      const kinds = this.plantKinds > 1;
      const gxPlant = (this.food[east]! * (kinds ? this.palateMatch(i, east) : 1) - this.food[west]! * (kinds ? this.palateMatch(i, west) : 1)) * plantScale;
      const gyPlant = (this.food[south]! * (kinds ? this.palateMatch(i, south) : 1) - this.food[north]! * (kinds ? this.palateMatch(i, north) : 1)) * plantScale;
      inputs[INPUT.smellPlantAhead] = clampUnit(gxPlant * hx + gyPlant * hy);
      inputs[INPUT.smellPlantSide] = clampUnit(hx * gyPlant - hy * gxPlant);
      const meatScale = 1 / MEAT_SMELL_FULL;
      const gxMeat = (this.corpseEnergy[east]! - this.corpseEnergy[west]!) * meatScale;
      const gyMeat = (this.corpseEnergy[south]! - this.corpseEnergy[north]!) * meatScale;
      inputs[INPUT.smellMeatAhead] = clampUnit(gxMeat * hx + gyMeat * hy);
      inputs[INPUT.smellMeatSide] = clampUnit(hx * gyMeat - hy * gxMeat);
      inputs[INPUT.plantHere] = Math.min(1, this.food[here]! * (kinds ? this.palateMatch(i, here) : 1) * plantScale);
      inputs[INPUT.meatHere] = Math.min(1, this.corpseEnergy[here]! * meatScale);

      // Trails: which way does plant-eater and meat-eater scent get fresher?
      if (this.scentOn) {
        const ss = c.scentCellSize;
        const sw = this.scentWidth;
        const sh = this.scentHeight;
        const sx = Math.floor(x / ss);
        const sy = Math.floor(y / ss);
        const sEast = sy * sw + ((sx + 1) % sw);
        const sWest = sy * sw + ((sx + sw - 1) % sw);
        const sSouth = ((sy + 1) % sh) * sw + sx;
        const sNorth = ((sy + sh - 1) % sh) * sw + sx;
        const scentScale = 1 / (c.scentDeposit * SCENT_FULL);
        const prey = this.preyScent;
        const gxPrey = (prey[sEast]! - prey[sWest]!) * scentScale;
        const gyPrey = (prey[sSouth]! - prey[sNorth]!) * scentScale;
        inputs[INPUT.smellPreyAhead] = clampUnit(gxPrey * hx + gyPrey * hy);
        inputs[INPUT.smellPreySide] = clampUnit(hx * gyPrey - hy * gxPrey);
        const hunter = this.hunterScent;
        const gxHunter = (hunter[sEast]! - hunter[sWest]!) * scentScale;
        const gyHunter = (hunter[sSouth]! - hunter[sNorth]!) * scentScale;
        inputs[INPUT.smellHunterAhead] = clampUnit(gxHunter * hx + gyHunter * hy);
        inputs[INPUT.smellHunterSide] = clampUnit(hx * gyHunter - hy * gxHunter);
      }
    }

    // Appetite shapes perception (optional): food signals are only as loud as the appetite
    // for that food. Threat signals are left alone.
    if (c.brainAppetiteSenses === 1) {
      const meat = this.diet[i]!;
      const plant = 1 - meat;
      for (let k = 0; k < RAY_COUNT; k++) {
        const slot = INPUT.visionStart + k * RAY_CHANNELS;
        inputs[slot] = inputs[slot]! * meat;
        inputs[slot + 1] = inputs[slot + 1]! * meat;
      }
      inputs[INPUT.smellPreyAhead] = inputs[INPUT.smellPreyAhead]! * meat;
      inputs[INPUT.smellPreySide] = inputs[INPUT.smellPreySide]! * meat;
      inputs[INPUT.smellMeatAhead] = inputs[INPUT.smellMeatAhead]! * meat;
      inputs[INPUT.smellMeatSide] = inputs[INPUT.smellMeatSide]! * meat;
      inputs[INPUT.meatHere] = inputs[INPUT.meatHere]! * meat;
      inputs[INPUT.smellPlantAhead] = inputs[INPUT.smellPlantAhead]! * plant;
      inputs[INPUT.smellPlantSide] = inputs[INPUT.smellPlantSide]! * plant;
      inputs[INPUT.plantHere] = inputs[INPUT.plantHere]! * plant;
    }

    // Relatives nearby: how many, and which way the herd lies.
    if (this.kinLimitSq > 0 && ((senses & SENSE_SOCIAL) !== 0 || traced)) {
      this.visSelf = i;
      this.visX = x;
      this.visY = y;
      this.kinCount = 0;
      this.kinVx = 0;
      this.kinVy = 0;
      this.hash.forEachNear(x, y, c.herdRange, this.seeKin);
      const count = this.kinCount;
      inputs[INPUT.kinDensity] = Math.min(1, count / c.herdCap);
      if (count > 0) {
        inputs[INPUT.kinAhead] = clampUnit((this.kinVx * hx + this.kinVy * hy) / count);
        inputs[INPUT.kinSide] = clampUnit((hx * this.kinVy - hy * this.kinVx) / count);
      }
    }
    // Comfort: is it hotter (+) or colder (-) here than this organism likes?
    if (this.thermalOn) {
      const here = Math.floor(y / cs) * gw + Math.floor(x / cs);
      inputs[INPUT.comfort] = clampUnit((this.temperature[here]! - this.thermalPref[i]!) / 0.5);
    }
    // Water ahead: 1 if it is within three quarters of a cell, 0.5 if within a cell and three quarters more.
    if (this.terrainOn) {
      const W = c.worldWidth;
      const H = c.worldHeight;
      const blockedAt = (d: number): boolean => {
        let px = x + hx * d;
        let py = y + hy * d;
        px -= Math.floor(px / W) * W;
        py -= Math.floor(py / H) * H;
        return this.passable[Math.floor(py / cs) * gw + Math.floor(px / cs)] === 0;
      };
      inputs[INPUT.barrier] = blockedAt(0.75 * cs) ? 1 : blockedAt(1.75 * cs) ? 0.5 : 0;
    }

    // Chemical signals: update them from what has happened since the last thought, then offer them as inputs.
    if (this.chemOn) {
      this.updateChemicals(i);
      for (let k = 0; k < 4; k++) inputs[INPUT.chemReward + k] = this.chem[i * 4 + k]!;
    }
    // Home: which way, and how far, is the place this organism (or its lineage) calls home?
    if (this.homeX.length > 0) {
      const W = c.worldWidth;
      const H = c.worldHeight;
      let dx = this.homeX[i]! - x;
      let dy = this.homeY[i]! - y;
      if (dx > W / 2) dx -= W;
      else if (dx < -W / 2) dx += W;
      if (dy > H / 2) dy -= H;
      else if (dy < -H / 2) dy += H;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 0) {
        inputs[INPUT.homeAhead] = (dx * hx + dy * hy) / distance;
        inputs[INPUT.homeSide] = (hx * dy - hy * dx) / distance;
        inputs[INPUT.homeDistance] = Math.min(1, distance / c.homeRange);
      }
    }
    // Memory: what the brain wrote to its memory cells last time it thought.
    if (this.memoryOn) {
      for (let k = 0; k < MEMORY_COUNT; k++) inputs[INPUT.memory0 + k] = this.memState[i * MEMORY_COUNT + k]!;
    }

    // The body: hunger, age, its own diet, a constant, and a little noise (a deterministic scramble of the tick and the organism).
    inputs[INPUT.energy] = Math.min(this.energy[i]! / this.threshold[i]!, 1) * 2 - 1;
    inputs[INPUT.age] = Math.min(this.age[i]! / AGE_FULL, 1) * 2 - 1;
    inputs[INPUT.diet] = this.diet[i]! * 2 - 1;
    // Stamina left: -1 empty, +1 full (0 in worlds without sprint fatigue).
    if (this.staminaOn) inputs[INPUT.stamina] = this.staminaMax[i]! > 0 ? (this.stamina[i]! / this.staminaMax[i]!) * 2 - 1 : -1;
    inputs[INPUT.bias] = 1;
    inputs[INPUT.noise] = ((Math.imul(this.tick + 1, 0x9e3779b1) ^ Math.imul(this.id[i]!, 0x85ebca6b)) >>> 0) / 2147483648 - 1;

    const hidden = this.thinkHidden;
    const outputs = this.thinkOutputs;
    evaluateBrain(this.brainFrom, this.brainTo, this.brainWeight, i * CONN_MAX, this.brainCount[i]!, c.brainPruneBelow, inputs, hidden, outputs);
    this.outTurn[i] = outputs[OUTPUT.turn]!;
    this.outSpeed[i] = outputs[OUTPUT.speed]!;
    this.outAttack[i] = outputs[OUTPUT.attack]!;
    if (this.memoryOn) {
      for (let k = 0; k < MEMORY_COUNT; k++) this.memState[i * MEMORY_COUNT + k] = outputs[OUTPUT.memory0 + k]!;
    }

    if (traced) {
      this.traceInputs.set(inputs);
      this.traceHidden.set(hidden);
      this.traceOutputs.set(outputs);
      this.traceValid = true;
    }
  }

  /**
   * Fade every trail a little, then add each organism's scent to the square it stands in:
   * plant appetite goes into the plant-eater trail, meat appetite into the meat-eater trail.
   */
  private layScent(n: number): void {
    const c = this.config;
    const keep = 1 - c.scentDecay;
    const prey = this.preyScent;
    const hunter = this.hunterScent;
    for (let k = 0; k < prey.length; k++) {
      prey[k] = prey[k]! * keep;
      hunter[k] = hunter[k]! * keep;
    }
    const ss = c.scentCellSize;
    const sw = this.scentWidth;
    const deposit = c.scentDeposit;
    for (let i = 0; i < n; i++) {
      const k = Math.floor(this.y[i]! / ss) * sw + Math.floor(this.x[i]! / ss);
      const diet = this.diet[i]!;
      prey[k] = prey[k]! + deposit * (1 - diet);
      hunter[k] = hunter[k]! + deposit * diet;
    }
  }

  /**
   * Does `viewer` notice `target` right now? Always, without camouflage. With it, the odds depend on how
   * well the target's color matches the background where it stands (and on what the viewer has been
   * eating). The answer is a fixed function of the pair and of which glance period it is (no random
   * numbers are drawn), so a hidden animal stays hidden for camoGlance ticks at a time.
   */
  private detects(viewer: number, target: number): boolean {
    if (!this.camoOn) return true;
    const c = this.config;
    const cs = c.foodCellSize;
    const cell = Math.floor(this.y[target]! / cs) * this.gridWidth + Math.floor(this.x[target]! / cs);
    const hue = this.genes[target * GENE_COUNT + GENE.hue]!;
    let d = hue - this.background[cell]!;
    if (d < 0) d = -d;
    if (d > 0.5) d = 1 - d;
    let p = c.camoDetectMin + (1 - c.camoDetectMin) * (d * 2);
    if (c.camoLearning > 0 && this.hasImage[viewer] === 1) {
      let sd = hue - this.searchHue[viewer]!;
      if (sd < 0) sd = -sd;
      if (sd > 0.5) sd = 1 - sd;
      p *= 1 + c.camoLearning * (1 - 2 * sd);
      if (p > 1) p = 1;
    }
    const glance = Math.floor(this.tick / c.camoGlance);
    const u = ((Math.imul(glance + 1, 0x9e3779b1) ^ Math.imul(this.id[viewer]! + 1, 0x85ebca6b) ^ Math.imul(this.id[target]! + 1, 0xc2b2ae35)) >>> 0) / 4294967296;
    return u < p;
  }

  // ---- Multicellularity ----

  /** How many cells are bonded to cell i. */
  private bondCount(i: number): number {
    let count = 0;
    for (let k = 0; k < BOND_SLOTS; k++) if (this.bondTo[i * BOND_SLOTS + k]! >= 0) count++;
    return count;
  }

  /** Cut all of cell i's bonds (it is about to leave the world). */
  private breakBonds(i: number): void {
    for (let k = 0; k < BOND_SLOTS; k++) {
      const partner = this.bondTo[i * BOND_SLOTS + k]!;
      if (partner < 0) continue;
      for (let m = 0; m < BOND_SLOTS; m++) if (this.bondTo[partner * BOND_SLOTS + m] === i) this.bondTo[partner * BOND_SLOTS + m] = -1;
      this.bondTo[i * BOND_SLOTS + k] = -1;
      // A specialized cell only works as part of a body: left with no bonds, it goes back to being a generalist.
      if (this.typeOn && this.cellType[partner] !== 0 && this.bondCount(partner) === 0) {
        this.cellType[partner] = 0;
        this.express(partner);
      }
    }
  }

  /** How many cells are in the colony cell i belongs to (counting stops at `cap`). */
  private colonySize(i: number, cap: number): number {
    this.visitStamp++;
    const stack = this.colonyStack;
    let top = 0;
    let size = 0;
    stack[top++] = i;
    this.visitMark[i] = this.visitStamp;
    while (top > 0 && size < cap) {
      const cell = stack[--top]!;
      size++;
      for (let k = 0; k < BOND_SLOTS; k++) {
        const partner = this.bondTo[cell * BOND_SLOTS + k]!;
        if (partner >= 0 && this.visitMark[partner] !== this.visitStamp) {
          this.visitMark[partner] = this.visitStamp;
          stack[top++] = partner;
        }
      }
    }
    return size;
  }

  /** A baby may stay attached to its parent: the parent's bonding gene is the chance, if there is room. */
  private maybeAttach(parent: number, child: number): void {
    const c = this.config;
    if (this.rng.next() >= this.genes[parent * GENE_COUNT + GENE.bond]!) return;
    let slot = -1;
    for (let k = 0; k < c.bondLinksMax; k++) {
      if (this.bondTo[parent * BOND_SLOTS + k] === -1) {
        slot = k;
        break;
      }
    }
    if (slot < 0 || this.colonySize(parent, c.colonyMax) >= c.colonyMax) return;
    this.bondTo[parent * BOND_SLOTS + slot] = child;
    this.bondTo[child * BOND_SLOTS] = parent;
    if (this.typeOn) {
      // The body plan: what kind of cell this is depends on how many bonds its parent already had.
      const plan = slot === 0 ? GENE.plan1 : slot === 1 ? GENE.plan2 : GENE.plan3;
      const type = Math.min(5, Math.floor(this.genes[parent * GENE_COUNT + plan]! * 6));
      this.cellType[child] = type;
      this.express(child);
    }
    // The baby sits one bond-length from its parent, in the direction it faces (unless that is water).
    const W = c.worldWidth;
    const H = c.worldHeight;
    let nx = this.x[parent]! + this.headingX[child]! * c.bondRestLength;
    let ny = this.y[parent]! + this.headingY[child]! * c.bondRestLength;
    nx -= Math.floor(nx / W) * W;
    ny -= Math.floor(ny / H) * H;
    nx = Math.fround(nx);
    ny = Math.fround(ny);
    if (nx >= W) nx = 0;
    if (ny >= H) ny = 0;
    const cell = Math.floor(ny / c.foodCellSize) * this.gridWidth + Math.floor(nx / c.foodCellSize);
    if (this.terrainOn && this.passable[cell] === 0) return;
    this.x[child] = nx;
    this.y[child] = ny;
    this.cellOf[child] = cell;
  }

  /** Used while a generous animal looks for hungry neighbors: keep the few neediest (or youngest) in order. */
  private readonly considerGift = (index: number): void => {
    const c = this.config;
    if (index === this.giftGiver) return;
    const fraction = this.energy[index]! / this.threshold[index]!;
    if (fraction >= c.shareAcceptBelow) return;
    if (c.shareKinOnly === 1 && this.geneDistanceSq(this.giftGiver, index) > this.kinLimitSq) return;
    const key = c.shareTarget === 1 ? this.age[index]! : fraction;
    const room = c.shareRecipients;
    const keys = this.giftKey;
    const picks = this.giftPick;
    let slot: number;
    if (this.giftCount < room) slot = this.giftCount++;
    else if (key < keys[room - 1]! || (key === keys[room - 1]! && index < picks[room - 1]!)) slot = room - 1;
    else return;
    keys[slot] = key;
    picks[slot] = index;
    while (slot > 0 && (keys[slot]! < keys[slot - 1]! || (keys[slot] === keys[slot - 1] && picks[slot]! < picks[slot - 1]!))) {
      const k = keys[slot]!;
      const p = picks[slot]!;
      keys[slot] = keys[slot - 1]!;
      picks[slot] = picks[slot - 1]!;
      keys[slot - 1] = k;
      picks[slot - 1] = p;
      slot--;
    }
  };

  /** Generous animals give part of their spare energy to the neediest neighbors (all gifts worked out from the energy at the start of the tick). */
  private giveFood(n: number): void {
    const c = this.config;
    const delta = this.giftDelta;
    delta.fill(0, 0, n);
    this.hash.rebuild(this.x, this.y, n);
    let lost = 0;
    let given = 0;
    for (let i = 0; i < n; i++) {
      const gene = this.genes[i * GENE_COUNT + GENE.generosity]!;
      if (gene <= 0) continue;
      const excess = this.energy[i]! - c.shareAbove * this.threshold[i]!;
      if (excess <= 0) continue;
      this.giftGiver = i;
      this.giftCount = 0;
      this.hash.forEachNear(this.x[i]!, this.y[i]!, c.shareRange, this.considerGift);
      if (this.giftCount === 0) continue;
      const gift = gene * c.shareRate * excess;
      const each = gift / this.giftCount;
      for (let r = 0; r < this.giftCount; r++) delta[this.giftPick[r]!] = delta[this.giftPick[r]!]! + each * c.shareEfficiency;
      delta[i] = delta[i]! - gift;
      lost += gift * (1 - c.shareEfficiency);
      given += gift;
    }
    for (let i = 0; i < n; i++) this.energy[i] = this.energy[i]! + delta[i]!;
    this.ledger.digestionLoss += lost;
    this.totalShared += given;
  }

  /** Bonded cells move part of the way toward equal energy (the total never changes). */
  private shareEnergy(n: number): void {
    const share = this.config.bondShare;
    if (share <= 0) return;
    const delta = this.shareDelta;
    delta.fill(0, 0, n);
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < BOND_SLOTS; k++) {
        const p = this.bondTo[i * BOND_SLOTS + k]!;
        if (p <= i) continue; // each bond once
        const moved = (share * (this.energy[i]! - this.energy[p]!)) / 2;
        delta[i] = delta[i]! - moved;
        delta[p] = delta[p]! + moved;
      }
    }
    for (let i = 0; i < n; i++) this.energy[i] = this.energy[i]! + delta[i]!;
  }

  /** Each bonded cell turns part of the way toward the mean heading of its neighbors, so the colony moves as one. */
  private alignHeadings(n: number): void {
    const a = this.config.bondAlign;
    if (a <= 0) return;
    for (let i = 0; i < n; i++) {
      let sx = 0;
      let sy = 0;
      let count = 0;
      for (let k = 0; k < BOND_SLOTS; k++) {
        const p = this.bondTo[i * BOND_SLOTS + k]!;
        if (p < 0) continue;
        sx += this.headingX[p]!;
        sy += this.headingY[p]!;
        count++;
      }
      let hx = this.headingX[i]!;
      let hy = this.headingY[i]!;
      if (count > 0) {
        hx = (1 - a) * hx + (a * sx) / count;
        hy = (1 - a) * hy + (a * sy) / count;
        const length = Math.sqrt(hx * hx + hy * hy);
        if (length > 1e-9) {
          hx /= length;
          hy /= length;
        } else {
          hx = this.headingX[i]!;
          hy = this.headingY[i]!;
        }
      }
      this.alignX[i] = hx;
      this.alignY[i] = hy;
    }
    for (let i = 0; i < n; i++) {
      this.headingX[i] = this.alignX[i]!;
      this.headingY[i] = this.alignY[i]!;
    }
  }

  /** Used while a sticky cell looks for a stranger to bond to. */
  private bondSelf = 0;
  private readonly tryContact = (index: number, distSq: number): void => {
    const i = this.bondSelf;
    if (index <= i || distSq <= 0 || this.killed[index] === 1) return;
    const c = this.config;
    const stickJ = this.genes[index * GENE_COUNT + GENE.stick]!;
    if (stickJ <= 0) return;
    // Both need a free bond, and they must not be bonded already.
    let slotI = -1;
    let slotJ = -1;
    for (let k = 0; k < c.bondLinksMax; k++) {
      const a = this.bondTo[i * BOND_SLOTS + k]!;
      const b = this.bondTo[index * BOND_SLOTS + k]!;
      if (a === index) return;
      if (a === -1 && slotI < 0) slotI = k;
      if (b === -1 && slotJ < 0) slotJ = k;
    }
    if (slotI < 0 || slotJ < 0) return;
    if (this.rng.next() >= this.genes[i * GENE_COUNT + GENE.stick]! * stickJ) return;
    if (this.colonySize(i, c.colonyMax) + this.colonySize(index, c.colonyMax) > c.colonyMax) return;
    this.bondTo[i * BOND_SLOTS + slotI] = index;
    this.bondTo[index * BOND_SLOTS + slotJ] = i;
  };

  /** Every cell with some stickiness looks for touching cells to bond to. */
  private contactBond(n: number): void {
    const c = this.config;
    this.hash.rebuild(this.x, this.y, n);
    const reach = c.bondRestLength * 1.5;
    for (let i = 0; i < n; i++) {
      if (this.genes[i * GENE_COUNT + GENE.stick]! <= 0 || this.killed[i] === 1) continue;
      this.bondSelf = i;
      this.hash.forEachNear(this.x[i]!, this.y[i]!, reach, this.tryContact);
    }
  }

  /** Pull every bonded pair toward its rest length (a few passes), then update where each cell stands. */
  private holdBonds(n: number): void {
    const c = this.config;
    const W = c.worldWidth;
    const H = c.worldHeight;
    const rest = c.bondRestLength;
    const stiffness = c.bondStiffness;
    const cs = c.foodCellSize;
    const gw = this.gridWidth;
    for (let pass = 0; pass < c.bondIterations; pass++) {
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < BOND_SLOTS; k++) {
          const p = this.bondTo[i * BOND_SLOTS + k]!;
          if (p <= i) continue;
          let dx = this.x[p]! - this.x[i]!;
          let dy = this.y[p]! - this.y[i]!;
          if (dx > W / 2) dx -= W;
          else if (dx < -W / 2) dx += W;
          if (dy > H / 2) dy -= H;
          else if (dy < -H / 2) dy += H;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1e-9) continue;
          const pull = (stiffness * (dist - rest)) / (2 * dist);
          this.nudge(i, dx * pull, dy * pull);
          this.nudge(p, -dx * pull, -dy * pull);
        }
      }
    }
    for (let i = 0; i < n; i++) {
      if (this.bondTo[i * BOND_SLOTS] === -1 && this.bondTo[i * BOND_SLOTS + 1] === -1 && this.bondTo[i * BOND_SLOTS + 2] === -1 && this.bondTo[i * BOND_SLOTS + 3] === -1 && this.bondTo[i * BOND_SLOTS + 4] === -1 && this.bondTo[i * BOND_SLOTS + 5] === -1) continue;
      this.cellOf[i] = Math.floor(this.y[i]! / cs) * gw + Math.floor(this.x[i]! / cs);
    }
  }

  /** Shift one cell a little (wrapping round the world), unless that would put it in water. */
  private nudge(i: number, dx: number, dy: number): void {
    const c = this.config;
    const W = c.worldWidth;
    const H = c.worldHeight;
    let nx = this.x[i]! + dx;
    let ny = this.y[i]! + dy;
    nx -= Math.floor(nx / W) * W;
    ny -= Math.floor(ny / H) * H;
    nx = Math.fround(nx);
    ny = Math.fround(ny);
    if (nx >= W) nx = 0;
    if (ny >= H) ny = 0;
    if (this.terrainOn && this.passable[Math.floor(ny / c.foodCellSize) * this.gridWidth + Math.floor(nx / c.foodCellSize)] === 0) return;
    this.x[i] = nx;
    this.y[i] = ny;
  }

  /** The complexity of the colonies right now (all zeros without multicellularity). */
  private colonyStats(): ColonyStats {
    const none: ColonyStats = { count: 0, cells: 0, meanSize: 0, maxSize: 0, meanTypes: 0, maxTypes: 0, symmetry: 0, mixed: 0 };
    if (!this.bondsOn) return none;
    const colonies = this.colonyMembers();
    if (colonies.length === 0) return none;
    let cells = 0;
    let maxSize = 0;
    let typeSum = 0;
    let maxTypes = 0;
    let symmetrySum = 0;
    let symmetric = 0;
    let mixed = 0;
    for (const members of colonies) {
      if (this.tracker) {
        const firstSpecies = this.speciesOf(members[0]!);
        if (members.some((cell) => this.speciesOf(cell) !== firstSpecies)) mixed++;
      }
      cells += members.length;
      if (members.length > maxSize) maxSize = members.length;
      let seen = 0;
      if (this.typeOn) for (const cell of members) seen |= 1 << this.cellType[cell]!;
      let kinds = 0;
      for (let t = 0; t < 6; t++) if ((seen & (1 << t)) !== 0) kinds++;
      if (!this.typeOn) kinds = 1;
      typeSum += kinds;
      if (kinds > maxTypes) maxTypes = kinds;
      if (members.length >= 3) {
        symmetrySum += this.colonySymmetry(members);
        symmetric++;
      }
    }
    return {
      count: colonies.length,
      cells,
      meanSize: cells / colonies.length,
      maxSize,
      meanTypes: typeSum / colonies.length,
      maxTypes,
      symmetry: symmetric > 0 ? symmetrySum / symmetric : 0,
      mixed,
    };
  }

  /** Every colony (two or more bonded cells) as a list of its cells. */
  colonyMembers(): number[][] {
    const n = this.count;
    const out: number[][] = [];
    if (!this.bondsOn) return out;
    this.visitStamp++;
    const stamp = this.visitStamp;
    const stack = this.colonyStack;
    for (let start = 0; start < n; start++) {
      if (this.visitMark[start] === stamp) continue;
      const members: number[] = [];
      let top = 0;
      stack[top++] = start;
      this.visitMark[start] = stamp;
      while (top > 0) {
        const cell = stack[--top]!;
        members.push(cell);
        for (let k = 0; k < BOND_SLOTS; k++) {
          const partner = this.bondTo[cell * BOND_SLOTS + k]!;
          if (partner >= 0 && this.visitMark[partner] !== stamp) {
            this.visitMark[partner] = stamp;
            stack[top++] = partner;
          }
        }
      }
      if (members.length >= 2) out.push(members);
    }
    return out;
  }

  /**
   * How mirror-symmetrical a colony's body is, from 0 to 1: reflect every cell across the colony's long
   * axis and count the cells whose reflection lands on a cell of the same type.
   */
  private colonySymmetry(members: number[]): number {
    const c = this.config;
    const W = c.worldWidth;
    const H = c.worldHeight;
    const first = members[0]!;
    const px: number[] = [];
    const py: number[] = [];
    let mx = 0;
    let my = 0;
    for (const cell of members) {
      let dx = this.x[cell]! - this.x[first]!;
      let dy = this.y[cell]! - this.y[first]!;
      if (dx > W / 2) dx -= W;
      else if (dx < -W / 2) dx += W;
      if (dy > H / 2) dy -= H;
      else if (dy < -H / 2) dy += H;
      px.push(dx);
      py.push(dy);
      mx += dx;
      my += dy;
    }
    const n = members.length;
    mx /= n;
    my /= n;
    let sxx = 0;
    let sxy = 0;
    let syy = 0;
    for (let k = 0; k < n; k++) {
      px[k] = px[k]! - mx;
      py[k] = py[k]! - my;
      sxx += px[k]! * px[k]!;
      sxy += px[k]! * py[k]!;
      syy += py[k]! * py[k]!;
    }
    // The long axis: the eigenvector of the 2 x 2 covariance with the larger eigenvalue (exact arithmetic, no trigonometry).
    const half = (sxx - syy) / 2;
    const lambda = (sxx + syy) / 2 + Math.sqrt(half * half + sxy * sxy);
    let ux = sxy;
    let uy = lambda - sxx;
    const length = Math.sqrt(ux * ux + uy * uy);
    if (length < 1e-9) {
      ux = sxx >= syy ? 1 : 0;
      uy = sxx >= syy ? 0 : 1;
    } else {
      ux /= length;
      uy /= length;
    }
    // A reflection counts as landing on a cell if it is within 0.4 of a bond length of it.
    const tolerance = 0.16 * c.bondRestLength * c.bondRestLength;
    let matched = 0;
    for (let k = 0; k < n; k++) {
      const along = px[k]! * ux + py[k]! * uy;
      const rx = 2 * along * ux - px[k]!;
      const ry = 2 * along * uy - py[k]!;
      for (let j = 0; j < n; j++) {
        const ex = px[j]! - rx;
        const ey = py[j]! - ry;
        if (ex * ex + ey * ey > tolerance) continue;
        if (!this.typeOn || this.cellType[members[j]!] === this.cellType[members[k]!]) {
          matched++;
          break;
        }
      }
    }
    return matched / n;
  }

  /** For every cell, the size of its colony (1 for a cell on its own). Also fills colonyRoot with a number shared by the whole colony. */
  colonySizes(): Uint16Array {
    const n = this.count;
    const sizes = new Uint16Array(n);
    if (!this.bondsOn) return sizes.fill(1);
    if (this.colonyRoot.length < n) this.colonyRoot = new Int32Array(this.config.maxOrganisms);
    this.visitStamp++;
    const stamp = this.visitStamp;
    const stack = this.colonyStack;
    const members: number[] = [];
    for (let start = 0; start < n; start++) {
      if (this.visitMark[start] === stamp) continue;
      members.length = 0;
      let top = 0;
      stack[top++] = start;
      this.visitMark[start] = stamp;
      while (top > 0) {
        const cell = stack[--top]!;
        members.push(cell);
        for (let k = 0; k < BOND_SLOTS; k++) {
          const partner = this.bondTo[cell * BOND_SLOTS + k]!;
          if (partner >= 0 && this.visitMark[partner] !== stamp) {
            this.visitMark[partner] = stamp;
            stack[top++] = partner;
          }
        }
      }
      for (const cell of members) {
        sizes[cell] = members.length;
        this.colonyRoot[cell] = start;
      }
    }
    return sizes;
  }

  /** How well a strain fits an organism's genes: 1 when they match exactly, falling toward 0 as they differ. */
  private susceptibility(host: number, antigen: Float64Array): number {
    const g = this.genes;
    let sum = 0;
    for (let m = 0; m < this.mateMask.length; m++) {
      const d = g[host * GENE_COUNT + this.mateMask[m]!]! - antigen[m]!;
      sum += d * d;
    }
    const w = this.config.diseaseWidth;
    return 1 / (1 + sum / this.mateMask.length / (w * w));
  }

  /** A new pathogen strain aimed at organism j's genes, and j catches it. */
  private newStrainIn(j: number): void {
    const antigen = new Float64Array(this.mateMask.length);
    for (let m = 0; m < antigen.length; m++) antigen[m] = this.genes[j * GENE_COUNT + this.mateMask[m]!]!;
    this.strains.push(antigen);
    this.infection[j] = this.strains.length;
    this.sickFor[j] = this.config.diseaseDuration;
    this.totalInfections++;
  }

  /** Used while a sick organism looks for neighbors to infect. */
  private readonly tryInfect = (index: number, distSq: number): void => {
    if (index === this.diseaseHost || distSq <= 0) return;
    if (this.sickFor[index]! > 0 || this.immuneFor[index]! > 0 || this.pending[index]! > 0 || this.killed[index] === 1) return;
    const c = this.config;
    const strainId = this.infection[this.diseaseHost]!;
    const antigen = this.strains[strainId - 1]!;
    if (this.rng.next() >= c.diseaseTransmission * this.susceptibility(index, antigen)) return;
    let carried = strainId;
    // Now and then the strain changes: its target moves toward the genes of its new host (it adapts to whoever is common).
    if (c.diseaseMutationProb > 0 && this.rng.next() < c.diseaseMutationProb && this.strains.length < 65000) {
      const moved = new Float64Array(antigen.length);
      for (let m = 0; m < moved.length; m++) {
        const host = this.genes[index * GENE_COUNT + this.mateMask[m]!]!;
        moved[m] = antigen[m]! + c.diseaseDrift * (host - antigen[m]!);
      }
      this.strains.push(moved);
      carried = this.strains.length;
    }
    this.pending[index] = carried;
  };

  /** One tick of disease: new strains arrive, sick organisms infect their neighbors, sickness and immunity run down. */
  private diseaseStep(n: number): void {
    const c = this.config;
    if (n > 0 && this.rng.next() < 1 / c.diseaseIntroEvery) {
      const j = this.rng.int(n);
      if (this.sickFor[j] === 0 && this.immuneFor[j] === 0) this.newStrainIn(j);
    }
    let sick = 0;
    for (let i = 0; i < n; i++) if (this.sickFor[i]! > 0) sick++;
    if (sick > 0) {
      this.hash.rebuild(this.x, this.y, n);
      for (let i = 0; i < n; i++) {
        if (this.sickFor[i]! === 0) continue;
        this.diseaseHost = i;
        this.hash.forEachNear(this.x[i]!, this.y[i]!, c.diseaseContactRange, this.tryInfect);
      }
    }
    // Sickness and immunity run down...
    for (let i = 0; i < n; i++) {
      if (this.sickFor[i]! > 0) {
        this.sickFor[i] = this.sickFor[i]! - 1;
        if (this.sickFor[i] === 0) {
          this.infection[i] = 0;
          this.immuneFor[i] = c.diseaseImmunity;
        }
      } else if (this.immuneFor[i]! > 0) {
        this.immuneFor[i] = this.immuneFor[i]! - 1;
      }
    }
    // ...and then this tick's new infections begin (after, so each gets its full duration).
    for (let i = 0; i < n; i++) {
      const carried = this.pending[i]!;
      if (carried === 0) continue;
      this.pending[i] = 0;
      this.infection[i] = carried;
      this.sickFor[i] = c.diseaseDuration;
      this.totalInfections++;
    }
    if (this.strains.length > 300 && this.tick % 1000 === 0) this.compactStrains(n);
  }

  /** Forget strains nobody carries any more and renumber the rest, so the list does not grow forever. */
  private compactStrains(n: number): void {
    const newId = new Uint16Array(this.strains.length + 1);
    const kept: Float64Array[] = [];
    for (let i = 0; i < n; i++) {
      const id = this.infection[i]!;
      if (id === 0 || newId[id] !== 0) continue;
      kept.push(this.strains[id - 1]!);
      newId[id] = kept.length;
    }
    for (let i = 0; i < n; i++) if (this.infection[i]! !== 0) this.infection[i] = newId[this.infection[i]!]!;
    this.strains = kept;
  }

  private diseaseStats(): { infected: number; strains: number; totalInfections: number } {
    if (!this.diseaseOn) return { infected: 0, strains: 0, totalInfections: 0 };
    const seen = new Set<number>();
    let infected = 0;
    for (let i = 0; i < this.count; i++) {
      if (this.sickFor[i]! > 0) {
        infected++;
        seen.add(this.infection[i]!);
      }
    }
    return { infected, strains: seen.size, totalInfections: this.totalInfections };
  }

  /** How many babies this birth makes (1 unless the litter gene is in use; a fraction is rounded at random). */
  private litterSize(a: number, b: number): number {
    if (!this.litterOn) return 1;
    const trait = b < 0 ? this.litter[a]! : (this.litter[a]! + this.litter[b]!) / 2;
    let k = Math.floor(trait);
    if (this.rng.next() < trait - k) k++;
    return k < 1 ? 1 : k;
  }

  /** Used while looking for a mate: remember the nearest other ready, compatible organism. */
  private readonly considerMate = (index: number, distSq: number): void => {
    if (index === this.mateSelf || this.ready[index] !== 1) return;
    const limit = this.config.mateDistance;
    const geneSq = this.geneDistanceSq(this.mateSelf, index);
    if (geneSq > limit * limit) return;
    // The score to beat: how near (default) or how genetically similar (matePreference 1, nearer wins a tie).
    let score = distSq;
    if (this.config.matePreference === 1) score = geneSq;
    else if (this.config.matePreference === 2) {
      let hd = this.genes[this.mateSelf * GENE_COUNT + GENE.hue]! - this.genes[index * GENE_COUNT + GENE.hue]!;
      if (hd < 0) hd = -hd;
      score = hd > 0.5 ? 1 - hd : hd; // how far apart the colors are, round the color wheel
    }
    if (score > this.mateBestScore || (score === this.mateBestScore && distSq >= this.mateBestDistSq)) return;
    this.mateBest = index;
    this.mateBestScore = score;
    this.mateBestDistSq = distSq;
  };

  /**
   * Sexual reproduction: pair up the organisms that are ready to reproduce. Each takes the
   * nearest ready, compatible, unpaired organism within mating range. Those who find nobody
   * wait (and keep eating). Returns how many pairs were made, stored in this.pairs.
   */
  private pairUp(list: Uint32Array, parentCount: number, candidates: Uint32Array = list, candidateCount: number = parentCount): number {
    if (parentCount < 1 || candidateCount < 2) return 0;
    const ready = this.ready;
    for (let p = 0; p < candidateCount; p++) ready[candidates[p]!] = 1;
    this.hash.rebuild(this.x, this.y, this.count);
    let pairs = 0;
    for (let p = 0; p < parentCount; p++) {
      const a = list[p]!;
      if (ready[a] !== 1) continue;
      this.mateSelf = a;
      this.mateBest = -1;
      this.mateBestDistSq = Infinity;
      this.mateBestScore = Infinity;
      this.hash.forEachNear(this.x[a]!, this.y[a]!, this.config.mateRange, this.considerMate);
      const b = this.mateBest;
      if (b < 0) continue;
      ready[a] = 2;
      ready[b] = 2;
      this.pairs[2 * pairs] = a;
      this.pairs[2 * pairs + 1] = b;
      pairs++;
    }
    for (let p = 0; p < candidateCount; p++) ready[candidates[p]!] = 0;
    return pairs;
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
    const brainMode = c.brainMode;
    let attackers = 0;
    if (c.catastropheKind !== 0) this.catastropheCheck();
    if (this.climateOn) this.updateClimate();
    // Bonded cells even out their energy and turn toward their neighbors' heading.
    if (this.bondsOn) {
      this.shareEnergy(n);
      this.alignHeadings(n);
    }
    if (this.giveOn) this.giveFood(n);

    // Pass 0 (brains only): everyone who is due to think looks, smells and decides, before
    // anyone moves, so all brains see the same world whatever order they are processed in.
    if (brainMode > 0) {
      this.hash.rebuild(this.x, this.y, n);
      for (let i = 0; i < n; i++) {
        if ((this.tick + this.id[i]!) % c.brainEvery === 0) this.think(i);
      }
    }

    // Pass 1: every organism senses, turns and moves.
    for (let i = 0; i < n; i++) {
      const x0 = this.x[i]!;
      const y0 = this.y[i]!;
      let hx = this.headingX[i]!;
      let hy = this.headingY[i]!;
      this.attempted[i] = 0;
      if (this.resting[i]! > 0) this.resting[i] = this.resting[i]! - 1;
      if (this.torporOn) {
        // Where plants have stopped growing a dormant organism sits still (and cannot attack) and saves upkeep.
        // How dormant it is goes with its gene, so a little torpor costs a little mobility and saves a little upkeep.
        const dormancy = this.growthFactor[this.cellOf[i]!]! < c.torporBelowGrowth ? this.genes[i * GENE_COUNT + GENE.torpor]! : 0;
        this.torpid[i] = dormancy;
        if (dormancy >= c.torporSleepAt) this.resting[i] = 1; // deeply dormant: it cannot attack either
      }

      let stepSpeed = this.speed[i]!;
      if (brainMode === 0) {
        // No brain: sense, and lean toward richer plant food, then wander. (The Phase 3
        // behavior, kept exactly as the control.)
        const sense = this.senseRange[i]!;
        if (sense > 0) {
          const hereCell = Math.floor(y0 / cs) * gw + Math.floor(x0 / cs);
          const kinds = this.plantKinds > 1;
          // (With kinds of plant it leans toward food it can digest.)
          const here = food[hereCell]! * (kinds ? this.palateMatch(i, hereCell) : 1);
          let gx = 0;
          let gy = 0;
          for (let d = 0; d < 8; d++) {
            const cx = wrapCell(Math.floor((x0 + DIR_X[d]! * sense) / cs), gw);
            const cy = wrapCell(Math.floor((y0 + DIR_Y[d]! * sense) / cs), gh);
            const diff = food[cy * gw + cx]! * (kinds ? this.palateMatch(i, cy * gw + cx) : 1) - here;
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
      } else {
        // The brain's turn, plus the same small random wobble every organism has. The
        // rotation uses a longer series than above because brains turn further per tick.
        const turn = this.outTurn[i]! * c.brainTurnMax + this.rng.gaussianFast() * c.brainTurnNoise;
        const t2 = turn * turn;
        const cosT = 1 - (t2 / 2) * (1 - (t2 / 12) * (1 - t2 / 30));
        const sinT = turn * (1 - (t2 / 6) * (1 - (t2 / 20) * (1 - t2 / 42)));
        const rx = hx * cosT - hy * sinT;
        const ry = hx * sinT + hy * cosT;
        const lengthSq = rx * rx + ry * ry;
        if (lengthSq > 0) {
          const inv = 1 / Math.sqrt(lengthSq);
          hx = rx * inv;
          hy = ry * inv;
        }
        // Speed: 0 is standing still, 1 normal, 2 flat out.
        let mult = 1 + this.outSpeed[i]!;
        mult = mult < 0 ? 0 : mult > 2 ? 2 : mult;
        if (this.staminaOn) {
          // Running above normal pace drains the reserve (flat out drains one unit per tick) and
          // an empty reserve means normal pace at best. Slower than normal refills it, faster when still.
          const have = this.stamina[i]!;
          if (mult > 1) {
            let drain = mult - 1;
            if (drain > have) {
              drain = have;
              mult = 1 + have;
            }
            this.stamina[i] = have - drain;
          } else {
            const refilled = have + c.staminaRegen * (1 + c.staminaRestBonus * (1 - mult));
            const reserve = this.staminaMax[i]!;
            this.stamina[i] = refilled > reserve ? reserve : refilled;
          }
        }
        this.moveScale[i] = mult;
        stepSpeed *= mult;
        if (this.bodyChemOn) {
          // Stress speeds the body up and calm slows it, as far as the organism's own genes let the signals act.
          const at = i * 4;
          stepSpeed *= 1 + c.chemStressSpeed * this.genes[i * GENE_COUNT + GENE.stressResponse]! * this.chem[at + 1]! - c.chemCalmSlow * this.genes[i * GENE_COUNT + GENE.calmResponse]! * this.chem[at + 3]!;
        }
      }
      this.headingX[i] = hx;
      this.headingY[i] = hy;
      if (this.torporOn) stepSpeed *= 1 - this.torpid[i]!;

      let nx = x0 + hx * stepSpeed;
      let ny = y0 + hy * stepSpeed;
      // Wrap around the edges (the world is a torus).
      nx -= Math.floor(nx / W) * W;
      ny -= Math.floor(ny / H) * H;
      nx = Math.fround(nx);
      ny = Math.fround(ny);
      // Rounding to 32 bits can land exactly on the far edge; fold it back to 0.
      if (nx >= W) nx = 0;
      if (ny >= H) ny = 0;
      let cellNow = Math.floor(ny / cs) * gw + Math.floor(nx / cs);
      if (this.terrainOn && this.passable[cellNow] === 0) {
        // Water ahead: stay where we are and turn around.
        nx = x0;
        ny = y0;
        cellNow = Math.floor(ny / cs) * gw + Math.floor(nx / cs);
        this.headingX[i] = -hx;
        this.headingY[i] = -hy;
      }
      this.x[i] = nx;
      this.y[i] = ny;

      this.cellOf[i] = cellNow;
      if (this.attack[i]! >= c.attackThreshold) attackers++;
    }

    // Bonds pull linked cells back together after everyone has moved.
    if (this.bondsOn) this.holdBonds(n);
    // Touching cells may bond with strangers.
    if (this.bondsOn && c.contactBonding === 1) this.contactBond(n);

    // Scent trails: old scent fades, then everyone leaves fresh scent where they now stand.
    if (this.scentOn) this.layScent(n);

    // Disease: spreads by contact among the organisms that are now standing close together.
    if (this.diseaseOn) this.diseaseStep(n);

    // Predation: each armed organism picks the nearest prey in reach (that is not
    // too big for it) and tries to kill it. A kill leaves a corpse right there.
    if (attackers > 0) {
      this.hash.rebuild(this.x, this.y, n);
      for (let i = 0; i < n; i++) {
        if (this.attack[i]! < c.attackThreshold || this.killed[i] === 1 || this.resting[i]! > 0) continue;
        if (brainMode > 0 && this.outAttack[i]! < c.brainAttackGate) continue; // the brain held back
        this.pickAttacker = i;
        this.pickBest = -1;
        this.pickBestDistSq = Infinity;
        this.pickSizeLimit = this.size[i]! * c.preyMaxSizeRatio;
        this.hash.forEachNear(this.x[i]!, this.y[i]!, this.reach[i]!, this.considerPrey);
        const prey = this.pickBest;
        if (prey < 0) continue;
        this.attempted[i] = 1;
        this.totalAttacks++;
        if (this.chemOn) this.chemHit[prey] = 1; // whether or not it works, the prey knows it was attacked
        const power = this.attackPower[i]!;
        const odds = power / (power + this.defendedBy(prey));
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
      meatClaim[cell] = meatClaim[cell]! + this.meatWeight[i]! * this.meatAccess(i, cell);
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
    let brainBurned = 0;
    let plantEnergyTaken = 0;
    let meatEnergyTaken = 0;
    let digestionLoss = 0;
    let photoIn = 0;
    const climateOn = this.climateOn;
    for (let i = 0; i < n; i++) {
      if (this.killed[i] === 1) continue;
      const cell = this.cellOf[i]!;

      // Standing still lets an organism with a brain eat faster (it must decide: roam or graze).
      const eatBonus = brainMode > 0 ? 1 + c.brainStillEatBonus * (1 - Math.min(this.moveScale[i]!, 1)) : 1;
      const plantMass = Math.min(this.plantBite[i]! * eatBonus, this.plantWeight[i]! * plantShare[cell]!);
      const access = this.meatAccess(i, cell);
      const meatMass = Math.min(this.meatBite[i]! * access * eatBonus, this.meatWeight[i]! * access * meatShare[cell]!);
      plantClaim[cell] = plantClaim[cell]! + plantMass;
      meatClaim[cell] = meatClaim[cell]! + meatMass;
      const plantRaw = plantMass * energyPerFood;
      const meatRaw = meatMass * meatDensity[cell]!;
      const plantGain = plantRaw * this.plantEff[i]! * (this.plantKinds > 1 ? this.palateMatch(i, cell) : 1);
      const meatGain = meatRaw * this.meatEff[i]!;
      plantEnergyTaken += plantRaw;
      meatEnergyTaken += meatRaw;
      digestionLoss += plantRaw - plantGain + (meatRaw - meatGain);
      this.plantTaken[i] = this.plantTaken[i]! + plantGain;
      this.meatTaken[i] = this.meatTaken[i]! + meatGain;
      if (this.chemOn) this.chemIntake[i] = this.chemIntake[i]! + plantGain + meatGain;
      if (this.homeValue.length > 0) {
        // Place memory: a better meal than any it remembers makes this spot home.
        const meal = (plantGain + meatGain) / this.threshold[i]!;
        let best = this.homeValue[i]! * c.homeMemoryDecay;
        if (meal >= c.homeMemoryMin && meal >= best) {
          this.homeX[i] = this.x[i]!;
          this.homeY[i] = this.y[i]!;
          best = meal;
        }
        this.homeValue[i] = best;
      }
      let energy = this.energy[i]! + plantGain + meatGain;
      if (this.typeOn) {
        // A photosynthesizing cell collects sunlight directly (the only new energy that enters the world, so it goes in the ledger as sunlight).
        const gain = this.photoGain[i]!;
        if (gain > 0) {
          const collected = climateOn ? gain * this.growthFactor[cell]! : gain;
          energy += collected;
          photoIn += collected;
        }
      }

      if (this.fatOn) {
        // Fat: bank surplus when well fed, draw it back when hungry. (The heat lost in storing is a sink, so it goes in the ledger.)
        const need = this.threshold[i]!;
        let store = this.fatStore[i]!;
        const fraction = energy / need;
        if (fraction < c.fatDrawBelow && store > 0) {
          let draw = c.fatDrawRate * need;
          if (draw > store) draw = store;
          store -= draw;
          energy += draw;
        } else if (fraction > c.fatDepositAbove) {
          let amount = this.genes[i * GENE_COUNT + GENE.fat]! * c.fatDepositRate * (energy - c.fatDepositAbove * need);
          const room = (c.fatCap * need - store) / c.fatEfficiency;
          if (amount > room) amount = room > 0 ? room : 0;
          energy -= amount;
          store += amount * c.fatEfficiency;
          digestionLoss += amount * (1 - c.fatEfficiency);
        }
        this.fatStore[i] = store;
      }

      if (!this.seenScavenger && this.meatTaken[i]! >= SCAVENGER_MIN_MEAT) {
        this.seenScavenger = true;
        this.logEvent("firstScavenger", this.id[i]!, `Organism #${this.id[i]!} lived mostly off a corpse: the first scavenger`);
      }

      let basal = this.basalCost[i]!;
      if (this.agingOn) {
        // Past its prime, a body wears out faster and faster.
        const lifespan = this.lifespan[i]!;
        const prime = lifespan * c.agingPrimeFraction;
        const age = this.age[i]!;
        if (age > prime) {
          const worn = (age - prime) / (lifespan - prime);
          basal += c.agingCoeff * this.basalCost[i]! * worn * worn;
        }
      }
      if (this.diseaseOn && this.sickFor[i]! > 0) basal += c.diseaseCost * this.basalCost[i]!; // being sick costs upkeep
      if (this.bodyChemOn) {
        // Stress burns energy; calm saves it.
        const at = i * 4;
        basal *= 1 + c.chemStressUpkeep * this.genes[i * GENE_COUNT + GENE.stressResponse]! * this.chem[at + 1]! - c.chemCalmSaving * this.genes[i * GENE_COUNT + GENE.calmResponse]! * this.chem[at + 3]!;
      }
      if (this.fatOn) basal += c.fatUpkeep * (this.fatStore[i]! / this.threshold[i]!) * this.basalCost[i]!; // carrying fat costs upkeep
      if (this.torporOn) basal *= 1 - c.torporSaving * this.torpid[i]!;
      if (this.thermalOn) {
        // Too hot or too cold for comfort costs extra upkeep.
        const off = this.temperature[cell]! - this.thermalPref[i]!;
        const excess = (off < 0 ? -off : off) - c.thermalTolerance;
        if (excess > 0) basal += this.thermalScale[i]! * excess * excess;
      }
      // Moving costs more the faster the brain drives the body (cost grows with speed squared).
      let move = brainMode > 0 ? this.moveCost[i]! * this.moveScale[i]! * this.moveScale[i]! : this.moveCost[i]!;
      if (this.terrainOn) move *= this.terrainMove[cell]!; // mountains and forest cost more to cross
      if (this.fatOn) move *= 1 + c.fatMoveCost * (this.fatStore[i]! / this.threshold[i]!);
      if (this.torporOn) move *= (1 - this.torpid[i]!) * (1 - this.torpid[i]!); // slower costs less (cost goes with speed squared)
      if (this.staminaOn) move += this.staminaCost[i]!; // the upkeep of the sprint reserve counts as movement
      const sensing = this.senseCost[i]!;
      const fighting = this.attackCost[i]! + (this.attempted[i] === 1 ? this.attemptCost[i]! : 0);
      const armoring = this.armorCost[i]!;
      const thinking = brainMode > 0 ? this.brainCost[i]! : 0;
      const cost = basal + move + sensing + fighting + armoring + thinking;
      if (energy > cost) {
        energy -= cost;
        basalBurned += basal;
        movementBurned += move;
        sensingBurned += sensing;
        attackBurned += fighting;
        armorBurned += armoring;
        brainBurned += thinking;
      } else {
        const fraction = cost > 0 ? energy / cost : 0;
        basalBurned += basal * fraction;
        movementBurned += move * fraction;
        sensingBurned += sensing * fraction;
        attackBurned += fighting * fraction;
        armorBurned += armoring * fraction;
        brainBurned += thinking * fraction;
        energy = 0;
      }
      this.energy[i] = energy;
      this.age[i]!++;

      // Specialized cells are sterile: only generalist ("germ") cells reproduce.
      if (energy >= this.threshold[i]! && !(this.typeOn && this.cellType[i] !== 0)) this.parents[parentCount++] = i;
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
      let potential = (this.foodRegrow[cell]! * soil) / (soil + halfSat);
      if (climateOn) potential *= this.growthFactor[cell]!;
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
    // (With sexual reproduction, two ready organisms pair up and each hands over half as much.)
    // With sex as a gene, each ready organism first settles (once per birth) whether it splits in two or looks for a mate.
    let soloCount = parentCount;
    let mateCount = parentCount;
    let mateList = this.parents;
    let soloList = this.parents;
    if (this.sexGeneOn) {
      soloCount = 0;
      mateCount = 0;
      mateList = this.sexParents;
      soloList = this.soloParents;
      for (let p = 0; p < parentCount; p++) {
        const i = this.parents[p]!;
        if (this.sexMode[i] === 0) {
          this.sexMode[i] = this.rng.next() < this.genes[i * GENE_COUNT + GENE.sex]! ? 2 : 1;
          if (this.sexMode[i] === 2) this.mateSince[i] = this.tick;
        }
        // Facultative sex: a seeker that has waited too long gives up and splits in two.
        if (this.sexMode[i] === 2 && c.sexWaitLimit > 0 && this.tick - this.mateSince[i]! >= c.sexWaitLimit) this.sexMode[i] = 1;
        if (this.sexMode[i] === 2) this.sexParents[mateCount++] = i;
        else this.soloParents[soloCount++] = i;
      }
    }
    let pairCount = 0;
    if (this.sexOn) {
      // With sexAcceptAny every ready organism is a possible mate, not only the ones that went looking.
      if (this.sexGeneOn && c.sexAcceptAny === 1 && c.mateReadyFraction < 1) {
        // Any animal fed well enough can be taken as a mate, not only those ready to reproduce on their own.
        let partnerCount = 0;
        for (let i = 0; i < n; i++) {
          if (this.killed[i] === 1 || (this.typeOn && this.cellType[i] !== 0)) continue;
          if (this.energy[i]! >= c.mateReadyFraction * this.threshold[i]!) this.partnerList[partnerCount++] = i;
        }
        pairCount = this.pairUp(mateList, mateCount, this.partnerList, partnerCount);
      } else {
        pairCount = this.sexGeneOn && c.sexAcceptAny === 1 ? this.pairUp(mateList, mateCount, this.parents, parentCount) : this.pairUp(mateList, mateCount);
      }
      birthsLoop: for (let p = 0; p < pairCount; p++) {
        const a = this.pairs[2 * p]!;
        const b = this.pairs[2 * p + 1]!;
        const litter = this.litterSize(a, b);
        if (this.sexGeneOn) {
          this.sexMode[a] = 0;
          this.sexMode[b] = 0;
          this.matedNow[a] = 1;
          this.matedNow[b] = 1;
        }
        // Each parent hands over half of the usual total, split between the babies.
        const eachA = (this.energy[a]! * c.offspringEnergyFraction * 0.5) / litter;
        const eachB = (this.energy[b]! * c.offspringEnergyFraction * 0.5) / litter;
        for (let baby = 0; baby < litter; baby++) {
          const savedNextId = this.nextId;
          const child = this.spawn(this.id[a]!, this.x[a]!, this.y[a]!);
          if (child < 0) break birthsLoop;
          this.parent2Id[child] = this.id[b]!;
          if (this.homeX.length > 0 && c.homeMode >= 2) {
            this.homeX[child] = this.homeX[a]!;
            this.homeY[child] = this.homeY[a]!;
            if (this.homeValue.length > 0) this.homeValue[child] = this.homeValue[a]!;
          }
          this.inheritGenesFromTwo(child, a, b);
          if (this.loadOn) this.inheritLoad(child, a, b);
          this.macroMutate(child);
          if (this.tracker) this.species[child] = this.species[a]!;
          this.express(child);
          this.inheritBrainFromTwo(child, a, b);
          const cell = this.cellOf[a]!;
          const store = eachA + eachB - this.bodyEnergy[child]!;
          if (nutrient[cell]! < this.bodyMatter[child]! || store < 0) {
            this.count--;
            this.nextId = savedNextId;
            this.blockedBirths++;
            continue;
          }
          nutrient[cell] = nutrient[cell]! - this.bodyMatter[child]!;
          this.energy[a] = this.energy[a]! - eachA;
          this.energy[b] = this.energy[b]! - eachB;
          this.energy[child] = store;
          this.totalBirths++;
          this.sexualBirths++;
          if (this.bondsOn) this.maybeAttach(a, child);
        }
      }
    }
    if (!this.sexOn || this.sexGeneOn) {
      birthsLoop: for (let p = 0; p < soloCount; p++) {
        const parent = soloList[p]!;
        if (this.sexGeneOn) {
          this.sexMode[parent] = 0;
          if (this.matedNow[parent] === 1) continue; // it was taken as a mate this tick
        }
        const litter = this.litterSize(parent, -1);
        // The same total as always, split between the babies (a litter of one hands over exactly what it always did).
        const each = (this.energy[parent]! * c.offspringEnergyFraction) / litter;
        for (let baby = 0; baby < litter; baby++) {
          const savedNextId = this.nextId;
          const child = this.spawn(this.id[parent]!, this.x[parent]!, this.y[parent]!);
          if (child < 0) break birthsLoop;
          if (this.homeX.length > 0 && c.homeMode >= 2) {
            this.homeX[child] = this.homeX[parent]!;
            this.homeY[child] = this.homeY[parent]!;
            if (this.homeValue.length > 0) this.homeValue[child] = this.homeValue[parent]!;
          }
          this.inheritGenes(child, parent);
          if (this.loadOn) this.inheritLoad(child, parent, -1);
          this.macroMutate(child);
          if (this.tracker) this.species[child] = this.species[parent]!;
          this.express(child);
          this.inheritBrain(child, parent);
          const cell = this.cellOf[parent]!;
          const store = each - this.bodyEnergy[child]!;
          if (nutrient[cell]! < this.bodyMatter[child]! || store < 0) {
            // Cannot afford this baby right now: undo it. The parent keeps its energy and tries again later.
            this.count--;
            this.nextId = savedNextId;
            this.blockedBirths++;
            continue;
          }
          nutrient[cell] = nutrient[cell]! - this.bodyMatter[child]!;
          this.energy[parent] = this.energy[parent]! - each;
          this.energy[child] = store;
          this.totalBirths++;
          if (this.bondsOn) this.maybeAttach(parent, child);
        }
      }
    }

    if (this.sexGeneOn) {
      for (let p = 0; p < pairCount; p++) {
        this.matedNow[this.pairs[2 * p]!] = 0;
        this.matedNow[this.pairs[2 * p + 1]!] = 0;
      }
    }

    // Deaths: remove everyone who was killed or ran out of energy by moving the
    // last organism into the gap. (Order changes, but deterministically.) A body
    // that starved becomes a corpse; one that was killed already left its corpse.
    let alive = this.count;
    let i = 0;
    let starved = 0;
    while (i < alive) {
      if (this.killed[i] === 1) {
        if (this.bondsOn) this.breakBonds(i);
        alive--;
        if (i !== alive) this.moveOrganism(alive, i);
      } else if (this.energy[i]! <= 0) {
        const cell = this.cellOf[i]!;
        corpseEnergy[cell] = corpseEnergy[cell]! + this.bodyEnergy[i]! + (this.fatOn ? this.fatStore[i]! : 0);
        corpseMatter[cell] = corpseMatter[cell]! + this.bodyMatter[i]!;
        starved++;
        if (this.bondsOn) this.breakBonds(i);
        alive--;
        if (i !== alive) this.moveOrganism(alive, i);
      } else {
        i++;
      }
    }
    this.totalDeaths += this.count - alive;
    this.totalStarved += starved;
    this.count = alive;

    ledger.sunlightIn += sunlightIn + photoIn;
    ledger.plantEaten += plantEnergyTaken;
    ledger.meatEaten += meatEnergyTaken;
    ledger.digestionLoss += digestionLoss;
    ledger.decayLoss += decayLoss;
    ledger.basalBurned += basalBurned;
    ledger.movementBurned += movementBurned;
    ledger.sensingBurned += sensingBurned;
    ledger.attackBurned += attackBurned;
    ledger.armorBurned += armorBurned;
    ledger.brainBurned += brainBurned;

    this.tick++;
    if (this.tick % EVENT_CHECK_EVERY === 0) this.checkSlowEvents();
    if (this.tracker && this.tick % c.speciesEvery === 0) this.tracker.update(this.tick, this.count, this.genes, this.species, this);
  }

  /** `attacker` kills `prey`: the prey's body and whatever energy it carried become a corpse. */
  /**
   * How strongly organism i can claim meat in this cell: 1 normally, but while a killer holds
   * first claim on a fresh kill, everyone else's claim is cut to killOwnershipLeak.
   */
  private meatAccess(i: number, cell: number): number {
    if (!this.guardOn || this.tick >= this.corpseOwnerUntil[cell]! || this.corpseOwner[cell] === this.id[i]) return 1;
    return this.config.killOwnershipLeak;
  }

  private kill(attacker: number, prey: number): void {
    const cell = this.cellOf[prey]!;
    if (this.camoOn) {
      // The hunter remembers the color of its meal: its search image moves toward it (the short way round the color wheel).
      const preyHue = this.genes[prey * GENE_COUNT + GENE.hue]!;
      if (this.hasImage[attacker] === 0) {
        this.searchHue[attacker] = preyHue;
        this.hasImage[attacker] = 1;
      } else {
        let diff = preyHue - this.searchHue[attacker]!;
        if (diff > 0.5) diff -= 1;
        else if (diff < -0.5) diff += 1;
        let next = this.searchHue[attacker]! + this.config.camoLearnRate * diff;
        if (next < 0) next += 1;
        else if (next >= 1) next -= 1;
        this.searchHue[attacker] = next;
      }
    }
    if (this.guardOn) {
      this.corpseOwner[cell] = this.id[attacker]!;
      this.corpseOwnerUntil[cell] = this.tick + this.config.killOwnershipTicks;
    }
    this.corpseEnergy[cell] = this.corpseEnergy[cell]! + this.bodyEnergy[prey]! + this.energy[prey]! + (this.fatOn ? this.fatStore[prey]! : 0);
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
    if (this.bondsOn) {
      // Its bonds come with it, and its partners now point to its new place.
      for (let k = 0; k < BOND_SLOTS; k++) {
        const partner = this.bondTo[from * BOND_SLOTS + k]!;
        this.bondTo[to * BOND_SLOTS + k] = partner;
        if (partner < 0) continue;
        for (let m = 0; m < BOND_SLOTS; m++) if (this.bondTo[partner * BOND_SLOTS + m] === from) this.bondTo[partner * BOND_SLOTS + m] = to;
      }
    }
    const a = from * GENE_COUNT;
    const b = to * GENE_COUNT;
    for (let k = 0; k < GENE_COUNT; k++) this.genes[b + k] = this.genes[a + k]!;
    if (this.config.brainMode > 0) {
      const count = this.brainCount[from]!;
      const source = from * CONN_MAX;
      const target = to * CONN_MAX;
      this.brainFrom.copyWithin(target, source, source + count);
      this.brainTo.copyWithin(target, source, source + count);
      this.brainWeight.copyWithin(target, source, source + count);
      if (this.memoryOn) this.memState.copyWithin(to * MEMORY_COUNT, from * MEMORY_COUNT, (from + 1) * MEMORY_COUNT);
      if (this.chemOn) this.chem.copyWithin(to * 4, from * 4, from * 4 + 4);
    }
  }

  /** Run several ticks in a row. */
  run(ticks: number): void {
    for (let t = 0; t < ticks; t++) this.step();
  }

  /**
   * Save the whole world. Loading it with Simulation.load() and running on gives exactly
   * the history the original would have had.
   */
  save(): SimSnapshot {
    const n = this.count;
    const arrays: Record<string, SnapshotArray> = {};
    // Per-organism arrays: only the living part is saved.
    const organism = (name: string, array: SnapshotArray, stride = 1): void => {
      arrays[name] = array.slice(0, n * stride);
    };
    this.float32Fields.forEach((array, k) => organism(`f32.${k}`, array));
    this.float64Fields.forEach((array, k) => organism(`f64.${k}`, array));
    this.uint32Fields.forEach((array, k) => organism(`u32.${k}`, array));
    this.uint16Fields.forEach((array, k) => organism(`u16.${k}`, array));
    this.uint8Fields.forEach((array, k) => organism(`u8.${k}`, array));
    organism("genes", this.genes, GENE_COUNT);
    organism("cellOf", this.cellOf);
    organism("bondTo", this.bondTo, BOND_SLOTS);
    organism("brainFrom", this.brainFrom, CONN_MAX);
    organism("brainTo", this.brainTo, CONN_MAX);
    organism("brainWeight", this.brainWeight, CONN_MAX);
    if (this.memoryOn) organism("memState", this.memState, MEMORY_COUNT);
    if (this.chemOn) organism("chem", this.chem, 4);
    // The land and the scent trails, in full.
    for (const [name, array] of this.landArrays()) arrays[name] = array.slice();
    const state: Record<string, unknown> = {
      tick: this.tick,
      count: n,
      nextId: this.nextId,
      totalBirths: this.totalBirths,
      sexualBirths: this.sexualBirths,
      totalShared: this.totalShared,
      totalDeaths: this.totalDeaths,
      totalKills: this.totalKills,
      totalStarved: this.totalStarved,
      blockedBirths: this.blockedBirths,
      totalAttacks: this.totalAttacks,
      seen: [this.seenScavenger, this.seenKill, this.seenPredator, this.seenCarnivore],
      events: this.events,
      worldEvents: this.worldEvents,
      catastrophe: [this.catKind, this.catStart, this.catEnd],
      strains: this.strains.map((a) => Array.from(a)),
      totalInfections: this.totalInfections,
      ledger: this.ledger,
      rng: Array.from(this.rng.getState()),
      species: this.tracker ? this.tracker.exportState() : null,
    };
    return { format: SNAPSHOT_FORMAT, seed: this.seed, config: this.config, state: JSON.parse(JSON.stringify(state)) as Record<string, unknown>, arrays };
  }

  /**
   * Bring a saved world back. With `seed` given, the world continues from the same moment
   * but with a different random future (a branch of the original history).
   */
  static load(snapshot: SimSnapshot, options: { seed?: number } = {}): Simulation {
    if (snapshot.format !== SNAPSHOT_FORMAT) throw new Error(`Cannot load a saved world of format ${snapshot.format}`);
    const sim = new Simulation(options.seed ?? snapshot.seed, snapshot.config);
    sim.restore(snapshot, options.seed !== undefined);
    return sim;
  }

  /** The land-sized arrays that make up the world's surroundings, by saved name. */
  private landArrays(): [string, SnapshotArray][] {
    return [
      ["food", this.food],
      ["foodCapacity", this.foodCapacity],
      ["foodRegrow", this.foodRegrow],
      ["nutrient", this.nutrient],
      ["corpseMatter", this.corpseMatter],
      ["corpseEnergy", this.corpseEnergy],
      ["detritus", this.detritus],
      ["background", this.background],
      ["biome", this.biome],
      ["passable", this.passable],
      ["terrainMove", this.terrainMove],
      ["preyScent", this.preyScent],
      ["hunterScent", this.hunterScent],
      ["corpseOwner", this.corpseOwner],
      ["corpseOwnerUntil", this.corpseOwnerUntil],
    ];
  }

  private restore(snapshot: SimSnapshot, newFuture: boolean): void {
    const take = (name: string, target: SnapshotArray): void => {
      const source = snapshot.arrays[name];
      if (!source) throw new Error(`The saved world is missing "${name}"`);
      if (source.length > target.length) throw new Error(`The saved world's "${name}" does not fit this world`);
      target.fill(0);
      (target as Float64Array).set(source as Float64Array);
    };
    const s = snapshot.state as {
      tick: number;
      count: number;
      nextId: number;
      totalBirths: number;
      sexualBirths?: number;
      totalShared?: number;
      totalDeaths: number;
      totalKills: number;
      totalStarved: number;
      blockedBirths: number;
      totalAttacks: number;
      seen: boolean[];
      events: SimEvent[];
      worldEvents: WorldEvent[];
      catastrophe: [number, number, number];
      strains?: number[][];
      totalInfections?: number;
      ledger: EnergyLedger;
      rng: [number, number, number, number];
      species: Record<string, unknown> | null;
    };
    this.float32Fields.forEach((array, k) => take(`f32.${k}`, array));
    this.float64Fields.forEach((array, k) => take(`f64.${k}`, array));
    this.uint32Fields.forEach((array, k) => take(`u32.${k}`, array));
    this.uint16Fields.forEach((array, k) => take(`u16.${k}`, array));
    this.uint8Fields.forEach((array, k) => take(`u8.${k}`, array));
    take("genes", this.genes);
    take("cellOf", this.cellOf);
    if (this.bondsOn) {
      take("bondTo", this.bondTo);
      // take() clears with zeros; an empty bond slot is -1, so mark every slot past the saved cells empty.
      this.bondTo.fill(-1, s.count * BOND_SLOTS);
    }
    take("brainFrom", this.brainFrom);
    take("brainTo", this.brainTo);
    take("brainWeight", this.brainWeight);
    if (this.memoryOn) take("memState", this.memState);
    if (this.chemOn) take("chem", this.chem);
    for (const [name, array] of this.landArrays()) take(name, array);
    this.tick = s.tick;
    this.count = s.count;
    this.nextId = s.nextId;
    this.totalBirths = s.totalBirths;
    this.sexualBirths = s.sexualBirths ?? 0;
    this.totalShared = s.totalShared ?? 0;
    this.totalDeaths = s.totalDeaths;
    this.totalKills = s.totalKills;
    this.totalStarved = s.totalStarved;
    this.blockedBirths = s.blockedBirths;
    this.totalAttacks = s.totalAttacks;
    [this.seenScavenger, this.seenKill, this.seenPredator, this.seenCarnivore] = s.seen as [boolean, boolean, boolean, boolean];
    this.events.length = 0;
    this.events.push(...s.events);
    this.worldEvents.length = 0;
    this.worldEvents.push(...s.worldEvents);
    [this.catKind, this.catStart, this.catEnd] = s.catastrophe;
    this.strains = (s.strains ?? []).map((a) => Float64Array.from(a));
    this.totalInfections = s.totalInfections ?? 0;
    Object.assign(this.ledger, s.ledger);
    this.rng.setState(newFuture ? new Rng((this.seed + this.tick) >>> 0).getState() : s.rng);
    if (this.tracker && s.species) this.tracker.importState(s.species);
    if (this.climateOn) this.updateClimate();
  }

  /** Every real species so far (alive or extinct), and the births and extinctions among them. */
  get speciesRecords(): readonly SpeciesRecord[] {
    return this.tracker?.records ?? [];
  }

  get speciesEvents(): readonly SpeciesEvent[] {
    return this.tracker?.events ?? [];
  }

  /** The species organism i belongs to (0 when species tracking is off). */
  speciesOf(i: number): number {
    return this.tracker ? this.tracker.realSpeciesOf(this.species[i]!) : 0;
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
      case "bond":
      case "plan1":
      case "plan2":
      case "plan3":
      case "stick":
      case "tolerance":
      case "sex":
      case "fat":
      case "torpor":
      case "palate":
      case "stressResponse":
      case "calmResponse":
      case "generosity":
        return this.genes[i * GENE_COUNT + GENE[name]]!;
      case "lifespan": {
        const range = this.ranges.lifespan;
        return range.min + this.genes[i * GENE_COUNT + GENE.lifespan]! * (range.max - range.min);
      }
      case "litter": {
        const range = this.ranges.litter;
        return range.min + this.genes[i * GENE_COUNT + GENE.litter]! * (range.max - range.min);
      }
      case "thermal": {
        const range = this.ranges.thermal;
        return range.min + this.genes[i * GENE_COUNT + GENE.thermal]! * (range.max - range.min);
      }
      case "stamina": {
        const range = this.ranges.stamina;
        return range.min + this.genes[i * GENE_COUNT + GENE.stamina]! * (range.max - range.min);
      }
    }
  }

  stats(): SimStats {
    const n = this.count;
    const sums = new Float64Array(GENE_COUNT);
    const sumsSq = new Float64Array(GENE_COUNT);
    let energySum = 0;
    let herbivores = 0;
    let carnivores = 0;
    const brains = this.config.brainMode > 0;
    let allHidden = 0;
    let allConnections = 0;
    let herbHidden = 0;
    let herbConnections = 0;
    let carnHidden = 0;
    let carnConnections = 0;
    for (let i = 0; i < n; i++) {
      energySum += this.energy[i]!;
      for (let k = 0; k < GENE_COUNT; k++) {
        const v = this.traitOf(GENES[k]!, i);
        sums[k] = sums[k]! + v;
        sumsSq[k] = sumsSq[k]! + v * v;
      }
      const d = this.diet[i]!;
      const hiddenHere = brains ? this.brainHidden[i]! : 0;
      const connectionsHere = brains ? this.brainConnections[i]! : 0;
      allHidden += hiddenHere;
      allConnections += connectionsHere;
      if (d < HERBIVORE_BELOW) {
        herbivores++;
        herbHidden += hiddenHere;
        herbConnections += connectionsHere;
      } else if (d > CARNIVORE_ABOVE) {
        carnivores++;
        carnHidden += hiddenHere;
        carnConnections += connectionsHere;
      }
    }
    const mean = (total: number, count: number): number => (count > 0 ? total / count : 0);
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
      species: { alive: this.tracker?.aliveCount ?? 0, ever: this.tracker?.records.length ?? 0 },
      colonies: this.colonyStats(),
      disease: this.diseaseStats(),
      totalBirths: this.totalBirths,
      sexualBirths: this.sexualBirths,
      totalDeaths: this.totalDeaths,
      totalKills: this.totalKills,
      totalStarved: this.totalStarved,
      blockedBirths: this.blockedBirths,
      totalAttacks: this.totalAttacks,
      brain: {
        all: { hidden: mean(allHidden, n), connections: mean(allConnections, n) },
        herbivores: { hidden: mean(herbHidden, herbivores), connections: mean(herbConnections, herbivores) },
        carnivores: { hidden: mean(carnHidden, carnivores), connections: mean(carnConnections, carnivores) },
      },
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
      stores += this.energy[i]! + (this.fatOn ? this.fatStore[i]! : 0);
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
    if (span <= 0) {
      // A trait that cannot vary (its range is a single value): everyone is at that value.
      counts[0] = this.count;
      return counts;
    }
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
      otherParentId: this.sexOn ? this.parent2Id[i]! : 0,
      health: this.diseaseOn ? { sickFor: this.sickFor[i]!, immuneFor: this.immuneFor[i]!, strain: this.infection[i]! } : { sickFor: 0, immuneFor: 0, strain: 0 },
      cellType: this.typeOn ? this.cellType[i]! : 0,
      bonds: this.bondsOn ? this.bondCount(i) : 0,
      lifespan: this.agingOn ? this.lifespan[i]! : 0,
      litter: this.litterOn ? this.litter[i]! : 1,
      age: this.age[i]!,
      energy: this.energy[i]!,
      threshold: this.threshold[i]!,
      x: this.x[i]!,
      y: this.y[i]!,
      genes,
      traits,
      costs: {
        basal: this.basalCost[i]!,
        movement: this.moveCost[i]! + (this.staminaOn ? this.staminaCost[i]! : 0),
        sensing: this.senseCost[i]!,
        attack: this.attackCost[i]!,
        armor: this.armorCost[i]!,
        brain: this.config.brainMode > 0 ? this.brainCost[i]! : 0,
      },
      brain: this.config.brainMode > 0 ? this.describeBrain(i) : null,
      plantTaken: this.plantTaken[i]!,
      meatTaken: this.meatTaken[i]!,
      kills: this.kills[i]!,
      luck: this.luckOn ? { upkeep: this.upkeepLuck[i]!, fertility: this.fertilityLuck[i]! } : null,
    };
  }

  /** Organism i's working brain, and (if it is being traced) what it is thinking. */
  private describeBrain(i: number): BrainSnapshot {
    const c = this.config;
    const base = i * CONN_MAX;
    const links: BrainSnapshot["links"] = [];
    for (let k = 0; k < this.brainCount[i]!; k++) {
      const weight = this.brainWeight[base + k]!;
      if (weight < c.brainPruneBelow && weight > -c.brainPruneBelow) continue;
      links.push({ from: this.brainFrom[base + k]!, to: this.brainTo[base + k]!, weight });
    }
    const traced = this.traceValid && this.id[i] === this.traceId;
    return {
      hidden: this.brainHidden[i]!,
      connections: this.brainConnections[i]!,
      cost: this.brainCost[i]!,
      links,
      activity: traced
        ? { inputs: Array.from(this.traceInputs), hidden: Array.from(this.traceHidden), outputs: Array.from(this.traceOutputs) }
        : null,
    };
  }

  // What was seen at the start of a behavior measurement (see behaviorBefore).
  private behaviorIds: number[] = [];
  private behaviorIsHunter: boolean[] = [];
  private behaviorSideLeft: boolean[] = [];
  private behaviorHeading: number[] = [];

  /**
   * Start measuring how purposefully organisms turn: note, for every hunter that can see
   * prey and every plant eater that can see a threat (off to one side, inside the
   * forward field of view and within `range`), which side it is on and the current
   * heading. Call this, run ONE tick, then call behaviorAfter().
   */
  behaviorBefore(range = BEHAVIOR_RANGE): void {
    const c = this.config;
    const n = this.count;
    this.hash.rebuild(this.x, this.y, n);
    const W = c.worldWidth;
    const H = c.worldHeight;
    this.behaviorIds = [];
    this.behaviorIsHunter = [];
    this.behaviorSideLeft = [];
    this.behaviorHeading = [];
    for (let i = 0; i < n; i++) {
      const isHunter = this.attack[i]! >= c.attackThreshold && this.diet[i]! >= 0.5;
      const isPrey = this.diet[i]! < HERBIVORE_BELOW;
      if (!isHunter && !isPrey) continue;
      let bestDistSq = Infinity;
      let bestSide = 0;
      this.hash.forEachNear(this.x[i]!, this.y[i]!, range, (j, distSq) => {
        if (j === i || distSq >= bestDistSq) return;
        if (isHunter) {
          if (this.size[j]! > this.size[i]! * c.preyMaxSizeRatio || this.diet[j]! >= 0.5) return;
        } else if (this.attack[j]! < c.attackThreshold || this.diet[j]! < 0.5 || this.size[i]! > this.size[j]! * c.preyMaxSizeRatio) {
          return;
        }
        let dx = this.x[j]! - this.x[i]!;
        let dy = this.y[j]! - this.y[i]!;
        if (dx > W / 2) dx -= W;
        else if (dx < -W / 2) dx += W;
        if (dy > H / 2) dy -= H;
        else if (dy < -H / 2) dy += H;
        const forward = dx * this.headingX[i]! + dy * this.headingY[i]!;
        if (forward <= 0) return;
        const side = this.headingX[i]! * dy - this.headingY[i]! * dx;
        const across = side < 0 ? -side : side;
        // Inside the field of view, and clearly off to one side (not dead ahead).
        if (across >= 3.732050807568877 * forward || across < 0.2679491924311227 * forward) return;
        bestDistSq = distSq;
        bestSide = side;
      });
      if (bestDistSq === Infinity) continue;
      this.behaviorIds.push(this.id[i]!);
      this.behaviorIsHunter.push(isHunter);
      this.behaviorSideLeft.push(bestSide > 0);
      this.behaviorHeading.push(this.headingX[i]!, this.headingY[i]!);
    }
  }

  /** Finish the measurement started by behaviorBefore(), one tick later. */
  behaviorAfter(): BehaviorStats {
    const indexOf = new Map<number, number>();
    for (let i = 0; i < this.count; i++) indexOf.set(this.id[i]!, i);
    let chaseToward = 0;
    let chaseTotal = 0;
    let fleeAway = 0;
    let fleeTotal = 0;
    for (let k = 0; k < this.behaviorIds.length; k++) {
      const i = indexOf.get(this.behaviorIds[k]!);
      if (i === undefined) continue; // died in the meantime
      const oldX = this.behaviorHeading[2 * k]!;
      const oldY = this.behaviorHeading[2 * k + 1]!;
      const turned = oldX * this.headingY[i]! - oldY * this.headingX[i]!; // positive = turned left
      if (turned === 0) continue;
      const turnedLeft = turned > 0;
      const targetLeft = this.behaviorSideLeft[k]!;
      if (this.behaviorIsHunter[k]!) {
        chaseTotal++;
        if (turnedLeft === targetLeft) chaseToward++;
      } else {
        fleeTotal++;
        if (turnedLeft !== targetLeft) fleeAway++;
      }
    }
    return {
      chase: chaseTotal > 0 ? chaseToward / chaseTotal : 0.5,
      chaseSamples: chaseTotal,
      flee: fleeTotal > 0 ? fleeAway / fleeTotal : 0.5,
      fleeSamples: fleeTotal,
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
    if (this.sexOn) mixInts(this.parent2Id, n);
    mixBits(this.x, n);
    mixBits(this.y, n);
    mixBits(this.headingX, n);
    mixBits(this.headingY, n);
    mixBits(this.energy, n);
    mixBits(this.plantTaken, n);
    mixBits(this.meatTaken, n);
    // Genes first, leaving stamina out unless it is in use (see CORE_GENE_COUNT).
    const geneBits = new Uint32Array(this.genes.buffer, this.genes.byteOffset, n * GENE_COUNT);
    for (let i = 0; i < n; i++) for (let k = 0; k < GENE_COUNT; k++) if (this.activeGene[k]) mix(geneBits[i * GENE_COUNT + k]!);
    mixBits(this.food, this.food.length);
    mixBits(this.nutrient, this.nutrient.length);
    mixBits(this.corpseMatter, this.corpseMatter.length);
    mixBits(this.corpseEnergy, this.corpseEnergy.length);
    mixBits(this.detritus, this.detritus.length);
    if (this.config.brainMode > 0) {
      mix(this.totalAttacks);
      for (let i = 0; i < n; i++) {
        const count = this.brainCount[i]!;
        mix(count);
        const base = i * CONN_MAX;
        for (let k = 0; k < count; k++) {
          mix(this.brainFrom[base + k]! | (this.brainTo[base + k]! << 8));
          mix(new Uint32Array(this.brainWeight.buffer, this.brainWeight.byteOffset + (base + k) * 4, 1)[0]!);
        }
      }
      mixBits(this.outTurn, n);
      mixBits(this.outSpeed, n);
      mixBits(this.outAttack, n);
    }
    if (this.staminaOn) mixBits(this.stamina, n);
    if (this.bondsOn) for (let k = 0; k < n * BOND_SLOTS; k++) mix(this.bondTo[k]! >>> 0);
    if (this.camoOn) {
      mixBits(this.searchHue, n);
      for (let i = 0; i < n; i++) mix(this.hasImage[i]!);
    }
    if (this.diseaseOn) {
      for (let i = 0; i < n; i++) mix(this.infection[i]! | (this.sickFor[i]! << 16));
      mix(this.totalInfections);
    }
    if (this.guardOn) {
      mixInts(this.corpseOwner, this.corpseOwner.length);
      mixInts(this.corpseOwnerUntil, this.corpseOwnerUntil.length);
    }
    return hash;
  }
}
