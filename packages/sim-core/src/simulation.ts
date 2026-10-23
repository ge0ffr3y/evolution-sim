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
import { BIOME, climateBiome, climateBiomeTable, generateBackground, generateBiomes, generateClimateBase, generatePlantTypes, generateWeatherMap, growthMultipliers, moveMultipliers, rainBelt } from "./terrain";
import { SNAPSHOT_FORMAT, type SimSnapshot, type SnapshotArray } from "./snapshot";
import { SpeciesTracker, type SpeciesEvent, type SpeciesRecord } from "./species";
import {
  CONN_MAX,
  BRAIN_LAYOUTS,
  renumberOldNode,
  HIDDEN_MAX,
  HIDDEN_START,
  INPUT,
  INPUT_COUNT,
  NODE_COUNT,
  OUTPUT,
  OUTPUT_COUNT,
  MEMORY_COUNT,
  LEARN_SLOTS,
  applyLearning,
  carryMemory,
  learnedWeights,
  updateTraces,
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

/**
 * What the average organism pays per tick, split into every part (see costBreakdown). Upkeep is
 * body (size and metabolism) plus the birth-time extras (repair for a long lifespan, the torpor
 * gene, harmful mutations, luck, the toxin gene) plus the per-tick extras (colony saving and the
 * torpor rest are negative). upkeep, movement, sensing, attack, armor and brain match the ledger lines.
 */
export interface CostBreakdown {
  body: number;
  repair: number;
  torporGene: number;
  load: number;
  luck: number;
  toxinGene: number;
  colonySaving: number;
  signal: number;
  thirst: number;
  deficiency: number;
  wear: number;
  sickness: number;
  stressCalm: number;
  fat: number;
  torporRest: number;
  thermal: number;
  upkeep: number;
  movement: number;
  sensing: number;
  attack: number;
  armor: number;
  brain: number;
  total: number;
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
  kind: "iceAge" | "drought" | "meteor" | "recovery" | "wildfire" | "storm" | "flood" | "volcano" | "blight" | "outbreak" | "goodYear";
  text: string;
}

/** The kinds of disaster the event engine can start (see the ev* settings in the config). */
export type DisasterKind = "iceAge" | "drought" | "wildfire" | "storm" | "flood" | "volcano" | "blight" | "goodYear";

/**
 * A disaster that is going on now. Meteors and outbreaks happen in one instant, so they never
 * appear here. For a fire, `cells` are the cells burning now and `left` the ticks each has left;
 * for a flood, `cells` are the cells under water. `count` is a running tally for the log line.
 */
export interface ActiveEvent {
  kind: DisasterKind;
  start: number;
  end: number;
  x: number;
  y: number;
  radius: number;
  /** Cooling, severity, spread chance, push, growth fraction or boost, depending on the kind. */
  intensity: number;
  /** A storm's wind direction (0 to 7), or the plant kind a blight hits (-1 = all of them). */
  target: number;
  cells: number[];
  left: number[];
  count: number;
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
  /** Nutrient carried in animals' stores (0 without nutrient mode). */
  stores: number;
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
  /** Births that could not happen: the soil had no nutrients for the baby's body, the parents' share of energy could not pay for it, or both. */
  blockedBirths: number;
  /** The same blocked births split by cause (the three always add up to blockedBirths). */
  blockedBirthsSoil: number;
  blockedBirthsEnergy: number;
  blockedBirthsBoth: number;
  /** Attacks tried, and how many killed (so kills / attacks is the success rate). */
  totalAttacks: number;
  brain: BrainStats;
  /** Species alive now, and how many there have ever been (0 when tracking is off). */
  species: { alive: number; ever: number };
  /** Colonies (groups of two or more bonded cells): how many, how many cells are in one, and the average and largest size. */
  colonies: ColonyStats;
  /** Disease: organisms sick now, strains alive in them, and infections so far (all 0 without disease). */
  disease: { infected: number; strains: number; totalInfections: number };
  /** Nutrient mode: the average store as a multiple of body matter, and the share of animals short of nutrient (both 0 when off). */
  nutrientStore: { mean: number; deficient: number };
  /** Drinking: the average water an animal carries (0 to 1) and the share that are dehydrated (both 0 when off). */
  hydration: { mean: number; dehydrated: number };
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
/**
 * The eye (eyeMode): half the width of view in a trigonometry-free angle measure (0 straight ahead, 1 square
 * to the side, 2 straight behind; the measure is across / (ahead + across) in front, mirrored behind).
 * Today's eye reaches 75 degrees each side; the widest about 150 (a 300-degree view), the narrowest 30 (60).
 * The five rays keep today's spacing (cuts at 15, 45 and 75 degrees), scaled to the eye's width.
 */
const EYE_TODAY = 0.7886751345948129; // 75 degrees: tan 75 / (1 + tan 75)
const EYE_WIDE = 1.6339745962155614; // 150 degrees: 2 - (tan 30 / (1 + tan 30))
const EYE_NARROW = 0.36602540378443865; // 30 degrees: tan 30 / (1 + tan 30)
const EYE_CUT1 = 0.2679491924311227; // the 15-degree cut as a share of today's half-width
const EYE_CUT2 = 0.6339745962155614; // the 45-degree cut as a share of today's half-width
/** The kinds of input a brain can listen to (see brainSenses). */
const SENSE_VISION = 1;
const SENSE_SMELL = 2;
const SENSE_BODY = 4;
const SENSE_SOCIAL = 8;
/** Room for this many remembered feeding places per animal (placeSlotsMax can allow fewer). */
const PLACE_SLOTS = 4;
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
  blockedBirthsSoil = 0;
  blockedBirthsEnergy = 0;
  blockedBirthsBoth = 0;
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
  /**
   * Learning brains (Phase 8f). learnOn: connections change during life; learnSensesOn: the learning
   * senses are offered; either one needs the reward bookkeeping (trackOn). For the first LEARN_SLOTS
   * connections of each brain: what has been learned (learnDelta, added to the inherited weight) and a
   * fading record of recent activity (learnTrace). Per organism: its usual reward (learnAvg), its
   * energy at its last thought (learnPrevE, -1 before its first), and the energy it has handed to
   * young or to neighbors since then (learnSpent: giving is not counted as a loss when judging how
   * things went, or animals would learn not to breed).
   */
  private readonly learnOn: boolean;
  private readonly learnSensesOn: boolean;
  private readonly trackOn: boolean;
  private readonly learnDelta: Float32Array;
  private readonly learnTrace: Float32Array;
  private readonly learnAvg: Float32Array;
  private readonly learnPrevE: Float64Array;
  private readonly learnSpent: Float64Array;
  /**
   * Place memory (Phase 8f): up to PLACE_SLOTS remembered feeding places per animal (position and a
   * fading value; value 0 = empty), and how many it can hold (from its gene, cached at birth).
   */
  private readonly placeOn: boolean;
  private readonly placeX: Float32Array;
  private readonly placeY: Float32Array;
  private readonly placeVal: Float32Array;
  private readonly placeSlots: Uint8Array;
  /** Working memory (Phase 8f): how many memory cells each brain can use (from its gene, cached at birth). */
  private readonly wmOn: boolean;
  private readonly wmCells: Uint8Array;
  /** Scratch: the weights a learning brain thinks with (inherited plus learned). */
  private readonly learnWeights = new Float32Array(CONN_MAX);
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
  /** Overgrazing: how much damage each patch of ground carries (0 to 1). Saved with the land. */
  /** Toxicity: how poisonous the corpse in each cell is (0 to 1, by matter), and what each hunter remembers about poisonous prey. */
  private readonly toxOn: boolean;
  private readonly corpseToxin: Float32Array;
  private readonly avoidStrength: Float32Array;
  private readonly avoidHue: Float32Array;
  private readonly lastKillHue: Float32Array;
  private readonly lastKillTick: Uint32Array;
  private readonly erodeOn: boolean;
  /** Erosion: how healthy each cell's soil is (erosionMin to 1). Saved with the land only when on. */
  readonly soilHealth: Float32Array;
  private readonly foulOn: boolean;
  /** Fouling: how fouled each cell's ground is (an index of crowding, not matter). Saved with the land only when on. */
  readonly foul: Float32Array;
  private foulMeanNow = 0;
  private readonly grazeOn: boolean;
  readonly grazing: Float32Array;
  // Disaster events (Phase 8e). The list and the random stream are saved; the rest is worked out again every tick.
  private activeEvents: ActiveEvent[] = [];
  private readonly eventRng: Rng;
  private readonly eventsOn: boolean;
  private readonly ashOn: boolean;
  private readonly floodOn: boolean;
  private readonly stormOn: boolean;
  private readonly fireOn: boolean;
  /** Volcanic ash: extra room and growth around a volcano, fading slowly. Saved with the land only when volcanoes are on. */
  readonly ash: Float32Array;
  /** Scratch: 1 where a fire is burning now / where a storm is blowing now. */
  private readonly burning: Uint8Array;
  /** Fire scars: the tick until which each cell cannot burn again (its fuel is growing back). Saved with the land when fires are on. */
  readonly fireScar: Uint32Array;
  private readonly stormCell: Uint8Array;
  private readonly stormDelta: Float64Array;
  private evCooling = 0;
  private evDryness = 1;
  private evGrowthMult = 1;
  private evKindMult: number[] = [1];
  /** The average amount of plant on a land cell this tick (worked out while a fire burns): fire spreads through plants at least that thick. */
  private fuelRef = 0;
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
  /** Nutrients through food (nutrientMode 1): each animal's store of nutrient (matter), and per cell this tick, the eaten matter that went into stores instead of dung. */
  private readonly nutrientOn: boolean;
  readonly nutrientStore: Float64Array;
  private readonly assimClaim: Float64Array;
  /** Mode 2: how much nutrient each cell's plants hold per unit of plant (worked out from the soil they grew from). Saved with the land when on. */
  private readonly qualityOn: boolean;
  /** Climate biomes (terrainMode 2): each cell's lasting wetness (0 to 1), whether it is under ice right now, and per-biome lookups. */
  private readonly climateBiomesOn: boolean;
  readonly moistureBase: Float32Array;
  readonly iced: Uint8Array;
  private biomeSeen: number[] = [];
  private biomeDisease: number[] = [];
  /** Colony physics (O3): per cell this tick, how many cells its colony has and their total size (worked out at the start of each tick). */
  private readonly colonyInfoOn: boolean;
  private readonly colonyCount: Uint16Array;
  private readonly colonyMass: Float32Array;
  /** Signaling (O3): what each cell last shared (threat direction and nearness, food direction and strength, in world directions), saved; and a copy taken at the start of the tick that everyone reads, so the order cells think in cannot matter. */
  private readonly signalOn: boolean;
  private readonly sharedThreatX: Float32Array;
  private readonly sharedThreatY: Float32Array;
  private readonly sharedThreatNear: Float32Array;
  private readonly sharedFoodX: Float32Array;
  private readonly sharedFoodY: Float32Array;
  private readonly sharedFoodNear: Float32Array;
  private readonly heard: Float32Array;
  /** Drinking: how much water each animal has (0 to 1). Saved with the animals when on. */
  private readonly drinkOn: boolean;
  readonly hydration: Float32Array;
  /** For every cell, the nearest water cell (-1 if there is none): fixed with the terrain, for the brains' water sense. */
  private nearestWater: Int32Array = new Int32Array(0);
  readonly plantQ: Float64Array;
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
  /** Pickiness (matePickiness): on, and while pairing, counting the mates in range and how much choice that gives. */
  private readonly pickyOn: boolean;
  private pickyCounting = false;
  private pickyCount = 0;
  private pickyAlpha = 0;
  /** The eye (eyeMode): per organism, half the width of view (see EYE_TODAY) and how far it reaches compared with today's eye. */
  private readonly eyeOn: boolean;
  private readonly eyeHalf: Float32Array;
  private readonly eyeReach: Float32Array;
  private visEyeHalf = 0;
  /** Mate scent (mateScent): laid by animals looking for a mate, in a plant-eater and a meat-eater layer. */
  private readonly mateScentOn: boolean;
  readonly matePlantScent: Float64Array;
  readonly mateMeatScent: Float64Array;

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
    if (index === this.pickAttacker || this.killed[index] === 1 || (this.colonyInfoOn && this.config.colonyProtect === 1 ? this.colonyMass[index]! : this.size[index]!) > this.pickSizeLimit) return;
    if (this.camoOn && !this.detects(this.pickAttacker, index)) return; // never noticed it
    if (this.toxOn && this.avoidStrength[this.pickAttacker]! > 0 && this.avoids(this.pickAttacker, index)) return; // it remembers that this color was poison
    if (this.config.spareFamily === 1 && this.isFamily(this.pickAttacker, index)) return; // its own parent or young
    // Nobody attacks a relative (or, with kinTolerance, nobody tolerant enough to count the target as one).
    let limitSq = this.kinToleranceOn ? this.toleranceSq[this.pickAttacker]! : this.kinLimitSq;
    const hungerBelow = this.config.kinHungerBelow;
    if (limitSq > 0 && hungerBelow > 0) {
      // Hunger overrides kin restraint: the hungrier it is, the closer a relative must be to be spared.
      const fed = this.energy[this.pickAttacker]! / this.threshold[this.pickAttacker]!;
      if (fed < hungerBelow) {
        const keep = fed > 0 ? fed / hungerBelow : 0;
        limitSq *= keep * keep;
      }
    }
    if (limitSq > 0 && this.geneDistanceSq(this.pickAttacker, index) <= limitSq) return;
    if (distSq < this.pickBestDistSq || (distSq === this.pickBestDistSq && index < this.pickBest)) {
      this.pickBest = index;
      this.pickBestDistSq = distSq;
    }
  };

  /** Fat as breeding capital: if energy and fat together reach `level`, move the shortfall out of fat (no loss). Returns the energy. */
  private mobilizeFat(i: number, level: number): number {
    const energy = this.energy[i]!;
    const store = this.fatStore[i]!;
    if (energy >= level || energy + store < level) return energy;
    const moved = level - energy;
    this.fatStore[i] = store - moved;
    this.energy[i] = level;
    return level;
  }

  /** A newborn receives fat from a parent: into its reserve up to the cap, the rest as ordinary energy (nothing lost or made). */
  private giveFat(child: number, amount: number): void {
    const room = this.config.fatCap * this.threshold[child]! - this.fatStore[child]!;
    const kept = amount < room ? amount : room > 0 ? room : 0;
    this.fatStore[child] = this.fatStore[child]! + kept;
    this.energy[child] = this.energy[child]! + (amount - kept);
  }

  /** Is one of these two the other's parent (either parent, with sex)? Known by identity, not by genes. */
  private isFamily(a: number, b: number): boolean {
    const ia = this.id[a]!;
    const ib = this.id[b]!;
    if (this.parentId[a] === ib || this.parentId[b] === ia) return true;
    return this.sexOn && (this.parent2Id[a] === ib || this.parent2Id[b] === ia);
  }

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
    this.terrainOn = c.terrainMode >= 1;
    this.climateBiomesOn = c.terrainMode === 2;
    this.biome = new Uint8Array(this.terrainOn ? cells : 0);
    this.passable = new Uint8Array(this.terrainOn ? cells : 0);
    this.terrainMove = new Float64Array(this.terrainOn ? cells : 0);
    this.moistureBase = new Float32Array(this.climateBiomesOn ? cells : 0);
    this.iced = new Uint8Array(this.climateBiomesOn ? cells : 0);
    let moistureNoise: Float64Array | null = null;
    if (c.terrainMode === 1) this.applyTerrain(generateBiomes(c, seed, this.gridWidth, this.gridHeight));
    else if (this.climateBiomesOn) {
      // Climate biomes: water and highlands now; the rest of the land gets its biome once the climate is set up (below).
      const base = generateClimateBase(c, seed, this.gridWidth, this.gridHeight);
      this.biome.set(base.biome);
      for (let cell = 0; cell < cells; cell++) {
        this.passable[cell] = base.biome[cell] === BIOME.water ? 0 : 1;
        this.terrainMove[cell] = 1;
      }
      moistureNoise = base.moistureNoise;
    }
    if (this.terrainOn && c.brainMode > 0) this.nearestWater = this.findNearestWater();
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
    if (moistureNoise) this.setUpClimateBiomes(moistureNoise);
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
    this.mateScentOn = c.brainMode > 0 && c.sexualReproduction >= 1 && c.mateScent > 0;
    const mateCells = this.mateScentOn ? this.scentWidth * this.scentHeight : 0;
    this.matePlantScent = new Float64Array(mateCells);
    this.mateMeatScent = new Float64Array(mateCells);
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
    this.eyeOn = c.eyeMode === 1 && c.brainMode > 0;
    this.eyeHalf = new Float32Array(this.eyeOn ? n : 0);
    this.eyeReach = new Float32Array(this.eyeOn ? n : 0);
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
        (k === GENE.toxicity && c.toxinStrength > 0) ||
        (k === GENE.signal && c.signaling === 1 && c.multicellular === 1 && c.brainMode > 0) ||
        (k === GENE.learning && c.brainLearning === 1 && c.brainMode > 0) ||
        (k === GENE.placeMemory && c.placeMemory === 1 && c.brainMode > 0) ||
        (k === GENE.workingMemory && c.workingMemory === 1 && c.brainMemory === 1 && c.brainMode > 0) ||
        (k === GENE.pickiness && c.matePickiness === 1 && c.sexualReproduction >= 1) ||
        (k === GENE.eye && c.eyeMode === 1 && c.brainMode > 0) ||
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
    this.toxOn = c.toxinStrength > 0;
    this.corpseToxin = new Float32Array(this.toxOn ? cells : 0);
    this.avoidStrength = new Float32Array(this.toxOn ? n : 0);
    this.avoidHue = new Float32Array(this.toxOn ? n : 0);
    this.lastKillHue = new Float32Array(this.toxOn ? n : 0);
    this.lastKillTick = new Uint32Array(this.toxOn ? n : 0);
    this.erodeOn = c.erosionRate > 0;
    this.soilHealth = new Float32Array(this.erodeOn ? cells : 0).fill(1);
    this.foulOn = c.fouling > 0;
    this.foul = new Float32Array(this.foulOn ? cells : 0);
    this.grazeOn = c.overgrazeDamage > 0;
    this.grazing = new Float32Array(this.grazeOn ? cells : 0);
    // (Its own random stream, derived from the seed like the terrain's, so events never disturb anything else.)
    this.eventRng = new Rng((seed ^ 0x5bd1e995) >>> 0);
    this.fireOn = c.evFireEvery > 0;
    this.stormOn = c.evStormEvery > 0;
    this.floodOn = c.evFloodEvery > 0;
    this.ashOn = c.evVolcanoEvery > 0;
    this.eventsOn = [c.evIceAgeEvery, c.evDroughtEvery, c.evMeteorEvery, c.evFireEvery, c.evStormEvery, c.evFloodEvery, c.evVolcanoEvery, c.evBlightEvery, c.evOutbreakEvery, c.evGoodYearEvery].some((every) => every > 0);
    this.ash = new Float32Array(this.ashOn ? cells : 0);
    this.burning = new Uint8Array(this.fireOn ? cells : 0);
    this.fireScar = new Uint32Array(this.fireOn ? cells : 0);
    this.stormCell = new Uint8Array(this.stormOn ? cells : 0);
    this.stormDelta = new Float64Array(this.stormOn ? cells : 0);
    this.colonyInfoOn = this.bondsOn && (c.colonyProtect === 1 || c.colonyScaleSaving > 0);
    this.colonyCount = new Uint16Array(this.colonyInfoOn ? n : 0);
    this.colonyMass = new Float32Array(this.colonyInfoOn ? n : 0);
    this.signalOn = this.bondsOn && c.signaling === 1 && c.brainMode > 0;
    const signalSlots = this.signalOn ? n : 0;
    this.sharedThreatX = new Float32Array(signalSlots);
    this.sharedThreatY = new Float32Array(signalSlots);
    this.sharedThreatNear = new Float32Array(signalSlots);
    this.sharedFoodX = new Float32Array(signalSlots);
    this.sharedFoodY = new Float32Array(signalSlots);
    this.sharedFoodNear = new Float32Array(signalSlots);
    this.heard = new Float32Array(signalSlots * 6);
    this.drinkOn = c.drinking === 1;
    this.hydration = new Float32Array(this.drinkOn ? n : 0);
    this.nutrientOn = c.nutrientMode >= 1;
    this.qualityOn = c.nutrientMode === 2;
    this.plantQ = new Float64Array(this.qualityOn ? cells : 0);
    // The plants already standing hold what their soil would give them.
    if (this.qualityOn) for (let cell = 0; cell < cells; cell++) this.plantQ[cell] = this.qualityFrom(this.nutrient[cell]!);
    this.nutrientStore = new Float64Array(this.nutrientOn ? n : 0);
    this.assimClaim = new Float64Array(this.nutrientOn ? cells : 0);
    this.fatOn = c.fatDepositRate > 0;
    this.fatStore = new Float64Array(this.fatOn ? n : 0);
    this.torporOn = this.climateOn && c.torporSaving > 0;
    this.torpid = new Float32Array(this.torporOn ? n : 0);
    this.memoryOn = c.brainMode > 0 && c.brainMemory === 1;
    this.memState = new Float32Array(this.memoryOn ? n * MEMORY_COUNT : 0);
    this.learnOn = c.brainMode > 0 && c.brainLearning === 1;
    this.learnSensesOn = c.brainMode > 0 && c.learnSenses === 1;
    this.trackOn = this.learnOn || this.learnSensesOn;
    this.learnDelta = new Float32Array(this.learnOn ? n * LEARN_SLOTS : 0);
    this.learnTrace = new Float32Array(this.learnOn ? n * LEARN_SLOTS : 0);
    this.learnAvg = new Float32Array(this.trackOn ? n : 0);
    this.learnPrevE = new Float64Array(this.trackOn ? n : 0);
    this.learnSpent = new Float64Array(this.trackOn ? n : 0);
    this.placeOn = c.brainMode > 0 && c.placeMemory === 1;
    this.placeX = new Float32Array(this.placeOn ? n * PLACE_SLOTS : 0);
    this.placeY = new Float32Array(this.placeOn ? n * PLACE_SLOTS : 0);
    this.placeVal = new Float32Array(this.placeOn ? n * PLACE_SLOTS : 0);
    this.placeSlots = new Uint8Array(this.placeOn ? n : 0);
    this.wmOn = this.memoryOn && c.workingMemory === 1;
    this.wmCells = new Uint8Array(this.wmOn ? n : 0);
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
    this.pickyOn = c.matePickiness === 1 && c.sexualReproduction >= 1;
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
      if (name === "bond" || name === "plan1" || name === "plan2" || name === "plan3" || name === "stick" || name === "signal") continue;
      // How tolerant an organism is of relatives is a behavior setting, not part of what kind of organism it is.
      if (name === "tolerance" || name === "sex" || name === "stressResponse" || name === "calmResponse" || name === "generosity") continue;
      // How much fat an animal banks can be left out too (fatRelated 0): physiology, not kind.
      if (name === "fat" && c.fatRelated === 0) continue;
      // How choosy it is about mates is a behavior, not part of what kind of organism it is.
      if (name === "pickiness") continue;
      this.mateMask.push(GENE[name]);
    }
    this.species = new Uint32Array(c.speciesEvery > 0 ? n : 0);
    // Species, like compatibility, ignore tolerance of relatives: it is a behavior setting, not a kind of body.
    const speciesGenes = this.activeGene.map((on, k) => on && k !== GENE.tolerance && k !== GENE.sex && k !== GENE.stressResponse && k !== GENE.calmResponse && k !== GENE.generosity && k !== GENE.signal && k !== GENE.learning && k !== GENE.placeMemory && k !== GENE.workingMemory && k !== GENE.pickiness && !(k === GENE.fat && c.fatRelated === 0));
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
    if (this.eyeOn) this.float32Fields.push(this.eyeHalf, this.eyeReach);
    if (this.homeX.length > 0) this.float32Fields.push(this.homeX, this.homeY);
    if (this.homeValue.length > 0) this.float32Fields.push(this.homeValue);

    if (this.chemOn) this.float32Fields.push(this.chemIntake);
    this.float64Fields = [this.energy, this.plantTaken, this.meatTaken];
    if (this.fatOn) this.float64Fields.push(this.fatStore);
    if (this.nutrientOn) this.float64Fields.push(this.nutrientStore);
    if (this.drinkOn) this.float32Fields.push(this.hydration);
    if (this.signalOn) this.float32Fields.push(this.sharedThreatX, this.sharedThreatY, this.sharedThreatNear, this.sharedFoodX, this.sharedFoodY, this.sharedFoodNear);
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
    if (this.toxOn) {
      this.float32Fields.push(this.avoidStrength, this.avoidHue, this.lastKillHue);
      this.uint32Fields.push(this.lastKillTick);
    }
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
    founder[GENE.toxicity] = c.initialToxicity;
    founder[GENE.signal] = c.initialSignal;
    founder[GENE.learning] = c.initialLearning;
    founder[GENE.placeMemory] = c.initialPlaceMemory;
    founder[GENE.workingMemory] = c.initialWorkingMemory;
    founder[GENE.pickiness] = c.initialPickiness;
    founder[GENE.eye] = c.initialEye;
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
        for (const gene of [GENE.tolerance, GENE.sex, GENE.fat, GENE.torpor, GENE.palate, GENE.stressResponse, GENE.calmResponse, GENE.generosity, GENE.toxicity, GENE.signal, GENE.learning, GENE.placeMemory, GENE.workingMemory]) {
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
      if (this.nutrientOn) {
        // A founder's starting store comes out of the soil it starts on, so the books stay exact.
        const cell = Math.floor(fy / c.foodCellSize) * this.gridWidth + Math.floor(fx / c.foodCellSize);
        const want = c.founderNutrient * this.bodyMatter[index]!;
        const take = want < this.nutrient[cell]! ? want : this.nutrient[cell]!;
        this.nutrient[cell] = this.nutrient[cell]! - take;
        this.nutrientStore[index] = take;
      }
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
    if (this.eventsOn) {
      cooling += this.evCooling;
      dryness *= this.evDryness;
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
      if (this.climateBiomesOn) {
        // Plants need water: wetter ground grows more, and the growing season is the wet season.
        let m = this.moistureBase[cell]! * (1 + c.moistureSeasonSwing * season);
        m = m < 0 ? 0 : m > 1 ? 1 : m;
        this.growthFactor[cell] = this.growthFactor[cell]! * ((m * (1 + c.moistureHalf)) / (m + c.moistureHalf));
        // Ice: land whose average temperature (no seasons or days) is too cold freezes over, and thaws again as the climate warms.
        const frozen = this.biome[cell] !== BIOME.water && this.tempBase[cell]! + drift - cooling < c.iceBelow ? 1 : 0;
        this.iced[cell] = frozen;
        if (frozen === 1) this.growthFactor[cell] = 0;
      }
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
    const x0 = this.rng.range(0, c.worldWidth);
    const y0 = this.rng.range(0, c.worldHeight);
    this.meteorAt(x0, y0, c.meteorRadius);
  }

  /** Is the point (x, y) within r2 (a squared distance) of (x0, y0)? The world wraps round, so distances go the short way. */
  private nearPoint(x: number, y: number, x0: number, y0: number, r2: number): boolean {
    const W = this.config.worldWidth;
    const H = this.config.worldHeight;
    let dx = x - x0;
    let dy = y - y0;
    if (dx > W / 2) dx -= W;
    else if (dx < -W / 2) dx += W;
    if (dy > H / 2) dy -= H;
    else if (dy < -H / 2) dy += H;
    return dx * dx + dy * dy <= r2;
  }

  /** Organism i dies on the spot: its body and its energy become a corpse where it lay. */
  private killToCorpse(i: number): void {
    const cs = this.config.foodCellSize;
    const cell = Math.floor(this.y[i]! / cs) * this.gridWidth + Math.floor(this.x[i]! / cs);
    this.corpseEnergy[cell] = this.corpseEnergy[cell]! + this.bodyEnergy[i]! + this.energy[i]! + (this.fatOn ? this.fatStore[i]! : 0);
    const matter = this.bodyMatter[i]! + this.takeStore(i);
    if (this.toxOn) this.foldToxin(cell, this.corpseMatter[cell]!, matter, this.genes[i * GENE_COUNT + GENE.toxicity]!);
    this.corpseMatter[cell] = this.corpseMatter[cell]! + matter;
    this.energy[i] = 0;
    this.killed[i] = 1;
  }

  /**
   * A parent pays `body` from its store to build (its part of) a baby's body, then hands over a share
   * of what is left (`share` scales it: 0.5 for each of two parents). Returns the baby's starting store from this parent.
   */
  private provision(parent: number, body: number, share: number): number {
    const left = this.nutrientStore[parent]! - body;
    const gift = left * this.config.provisionShare * share;
    this.nutrientStore[parent] = left - gift;
    return gift;
  }

  /**
   * For every cell, the nearest water cell, found by spreading outward from all water at once
   * (one step at a time to the four neighbors, so "nearest" is counted in steps). -1 if there is no water.
   */
  private findNearestWater(): Int32Array {
    const gw = this.gridWidth;
    const gh = this.gridHeight;
    const out = new Int32Array(gw * gh).fill(-1);
    const queue = new Int32Array(gw * gh);
    let head = 0;
    let tail = 0;
    for (let cell = 0; cell < out.length; cell++) {
      if (this.biome[cell] === BIOME.water) {
        out[cell] = cell;
        queue[tail++] = cell;
      }
    }
    while (head < tail) {
      const cell = queue[head++]!;
      const cx = cell % gw;
      const cy = (cell - cx) / gw;
      for (let side = 0; side < 4; side++) {
        const nx = side === 0 ? wrapCell(cx + 1, gw) : side === 1 ? wrapCell(cx - 1, gw) : cx;
        const ny = side === 2 ? wrapCell(cy + 1, gh) : side === 3 ? wrapCell(cy - 1, gh) : cy;
        const nb = ny * gw + nx;
        if (out[nb] !== -1) continue;
        out[nb] = out[cell]!;
        queue[tail++] = nb;
      }
    }
    return out;
  }

  /** Can an animal in this cell drink? Yes if it or a neighboring cell is water (a flood counts), or, with climate biomes, if the ground is soaked. */
  private canDrink(cell: number): boolean {
    const gw = this.gridWidth;
    const gh = this.gridHeight;
    const cx = cell % gw;
    const cy = (cell - cx) / gw;
    if (this.passable[cell] === 0) return true;
    if (this.passable[cy * gw + wrapCell(cx + 1, gw)] === 0 || this.passable[cy * gw + wrapCell(cx - 1, gw)] === 0) return true;
    if (this.passable[wrapCell(cy + 1, gh) * gw + cx] === 0 || this.passable[wrapCell(cy - 1, gh) * gw + cx] === 0) return true;
    return this.climateBiomesOn && this.moistureBase[cell]! >= this.config.drinkMoisture;
  }

  /** How damaged a cell's ground is, from overgrazing, fouling and erosion together: 0 healthy, up to 1 ruined. */
  private groundDamage(cell: number): number {
    const c = this.config;
    let health = 1;
    if (this.erodeOn) health *= this.soilHealth[cell]!;
    if (this.grazeOn) health *= 1 - c.overgrazePenalty * this.grazing[cell]!;
    if (this.foulOn && this.foulMeanNow > 0) {
      const excess = this.foul[cell]! / this.foulMeanNow - c.foulFree;
      if (excess > 0) health /= 1 + c.foulGrowthEffect * excess;
    }
    return 1 - health;
  }

  /** Mode 2: the nutrient per unit of plant that grows from this much soil. */
  private qualityFrom(soil: number): number {
    const c = this.config;
    return (c.plantQualityMax * soil) / (soil + c.plantQualityHalf);
  }

  /** The matter (nutrient) held by the plants in a cell: one per unit of plant, or in mode 2 whatever their soil gave them. */
  private plantMatter(cell: number): number {
    return this.qualityOn ? this.food[cell]! * this.plantQ[cell]! : this.food[cell]!;
  }

  /** Empty an animal's nutrient store (when it dies, its store goes into the corpse with its body). 0 without nutrient mode. */
  private takeStore(i: number): number {
    if (!this.nutrientOn) return 0;
    const store = this.nutrientStore[i]!;
    this.nutrientStore[i] = 0;
    return store;
  }

  /** Plants in a cell are crushed: the matter becomes detritus, the energy is lost as heat. */
  private crushPlants(cell: number): void {
    this.detritus[cell] = this.detritus[cell]! + this.plantMatter(cell);
    this.ledger.decayLoss += this.food[cell]! * this.config.energyPerFood;
    this.food[cell] = 0;
  }

  /** Plants in a cell burn: the energy is lost as heat and the matter goes straight into the soil as ash. */
  private burnPlants(cell: number): void {
    this.nutrient[cell] = this.nutrient[cell]! + this.plantMatter(cell);
    this.ledger.decayLoss += this.food[cell]! * this.config.energyPerFood;
    this.food[cell] = 0;
  }

  private meteorAt(x0: number, y0: number, radius: number): void {
    const c = this.config;
    const r2 = radius * radius;
    const cs = c.foodCellSize;
    let killed = 0;
    for (let i = 0; i < this.count; i++) {
      if (this.killed[i] === 1 || !this.nearPoint(this.x[i]!, this.y[i]!, x0, y0, r2)) continue;
      this.killToCorpse(i);
      killed++;
    }
    for (let cy = 0; cy < this.gridHeight; cy++) {
      for (let cx = 0; cx < this.gridWidth; cx++) {
        if (!this.nearPoint((cx + 0.5) * cs, (cy + 0.5) * cs, x0, y0, r2)) continue;
        this.crushPlants(cy * this.gridWidth + cx);
      }
    }
    this.worldEvents.push({ tick: this.tick, kind: "meteor", text: `A meteor strikes near (${Math.round(x0)}, ${Math.round(y0)}): ${killed} organisms killed` });
  }

  // --- Disaster events (Phase 8e) ---

  /** A number drawn from the event stream, between lo and hi. */
  private evDraw(lo: number, hi: number): number {
    return lo + this.eventRng.next() * (hi - lo);
  }

  /** A random spot on land (or anywhere, if the world has no water), from the event stream. */
  private randomLandPoint(): [number, number] {
    const c = this.config;
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 50; tries++) {
      x = this.eventRng.range(0, c.worldWidth);
      y = this.eventRng.range(0, c.worldHeight);
      if (!this.terrainOn || this.passable[Math.floor(y / c.foodCellSize) * this.gridWidth + Math.floor(x / c.foodCellSize)] === 1) break;
    }
    return [x, y];
  }

  /** The cells whose middle lies within radius of (x0, y0), land only if the world has water. */
  private cellsWithin(x0: number, y0: number, radius: number): number[] {
    const cs = this.config.foodCellSize;
    const r2 = radius * radius;
    const out: number[] = [];
    for (let cy = 0; cy < this.gridHeight; cy++) {
      for (let cx = 0; cx < this.gridWidth; cx++) {
        const cell = cy * this.gridWidth + cx;
        if (this.terrainOn && this.passable[cell] === 0) continue;
        if (this.nearPoint((cx + 0.5) * cs, (cy + 0.5) * cs, x0, y0, r2)) out.push(cell);
      }
    }
    return out;
  }

  /** Roll the dice for each kind of disaster (in a fixed order), then run the ones going on. */
  private eventsStep(): void {
    const c = this.config;
    const t = this.tick;
    // Finished events end.
    for (let k = this.activeEvents.length - 1; k >= 0; k--) {
      const ev = this.activeEvents[k]!;
      if (t >= ev.end || ((ev.kind === "wildfire") && ev.cells.length === 0)) this.endEvent(ev, k);
    }
    // Which cells are on fire now (worked out fresh, so a loaded world needs nothing extra).
    if (this.fireOn) {
      this.burning.fill(0);
      for (const ev of this.activeEvents) if (ev.kind === "wildfire") for (const cell of ev.cells) this.burning[cell] = 1;
    }
    // New events begin. (One random number per kind per tick, only for kinds that are switched on.)
    const roll = (every: number): boolean => every > 0 && this.eventRng.next() < 1 / every;
    if (this.activeEvents.length < 64) {
      if (roll(c.evIceAgeEvery)) this.beginClimateEvent("iceAge", c.evIceAgeCoolingMin, c.evIceAgeCoolingMax, c.evIceAgeLengthMin, c.evIceAgeLengthMax);
      if (roll(c.evDroughtEvery)) this.beginClimateEvent("drought", c.evDroughtSeverityMin, c.evDroughtSeverityMax, c.evDroughtLengthMin, c.evDroughtLengthMax);
      if (roll(c.evMeteorEvery)) {
        const [x, y] = this.randomLandPoint();
        this.meteorAt(x, y, this.evDraw(c.evMeteorRadiusMin, c.evMeteorRadiusMax));
      }
      if (roll(c.evFireEvery)) this.beginFire();
      if (roll(c.evStormEvery)) this.beginStorm();
      if (roll(c.evFloodEvery)) this.beginFlood();
      if (roll(c.evVolcanoEvery)) this.beginVolcano();
      if (roll(c.evBlightEvery)) this.beginBlight();
      if (roll(c.evOutbreakEvery)) this.beginOutbreak();
      if (roll(c.evGoodYearEvery)) this.beginGoodYear();
    }
    // The ones going on act, and the numbers the rest of the tick needs are worked out fresh (so a loaded world needs nothing extra).
    this.evCooling = 0;
    this.evDryness = 1;
    this.evGrowthMult = 1;
    const kinds = this.plantKinds > 1 ? this.plantKinds : 1;
    if (this.evKindMult.length !== kinds) this.evKindMult = new Array<number>(kinds).fill(1);
    else this.evKindMult.fill(1);
    if (this.stormOn) this.stormCell.fill(0);
    if (this.fireOn && this.activeEvents.some((ev) => ev.kind === "wildfire")) {
      let sum = 0;
      let land = 0;
      for (let cell = 0; cell < this.food.length; cell++) {
        if (this.foodCapacity[cell]! <= 0) continue;
        sum += this.food[cell]!;
        land++;
      }
      this.fuelRef = land > 0 ? sum / land : 0;
    }
    for (const ev of this.activeEvents) {
      const span = ev.end - ev.start;
      const p = (t - ev.start) / span;
      const hump = 4 * p * (1 - p);
      switch (ev.kind) {
        case "iceAge":
        case "volcano":
          this.evCooling += ev.intensity * hump;
          break;
        case "drought":
          this.evDryness *= 1 - ev.intensity * hump;
          break;
        case "goodYear":
          this.evGrowthMult *= ev.intensity;
          break;
        case "blight":
          if (ev.target < 0) for (let j = 0; j < kinds; j++) this.evKindMult[j] = this.evKindMult[j]! * ev.intensity;
          else this.evKindMult[ev.target] = this.evKindMult[ev.target]! * ev.intensity;
          break;
        case "wildfire":
          this.fireSpread(ev);
          break;
        case "storm":
          this.stormBlow(ev);
          break;
        default:
          break;
      }
    }
    // Animals standing in flames die.
    if (this.fireOn && this.activeEvents.some((ev) => ev.kind === "wildfire")) {
      const cs = c.foodCellSize;
      for (let i = 0; i < this.count; i++) {
        if (this.killed[i] === 1) continue;
        if (this.burning[Math.floor(this.y[i]! / cs) * this.gridWidth + Math.floor(this.x[i]! / cs)] === 1) this.killToCorpse(i);
      }
    }
    // Ash left by volcanoes fades slowly.
    if (this.ashOn) {
      const keep = 1 - c.evVolcanoBoostFade;
      for (let cell = 0; cell < this.ash.length; cell++) if (this.ash[cell]! > 0) this.ash[cell] = this.ash[cell]! * keep;
    }
  }

  private endEvent(ev: ActiveEvent, index: number): void {
    const t = this.tick;
    this.activeEvents.splice(index, 1);
    switch (ev.kind) {
      case "iceAge":
        this.worldEvents.push({ tick: t, kind: "recovery", text: "An ice age ends" });
        break;
      case "drought":
        this.worldEvents.push({ tick: t, kind: "recovery", text: "A drought ends" });
        break;
      case "wildfire":
        this.worldEvents.push({ tick: t, kind: "recovery", text: `The fire near (${Math.round(ev.x)}, ${Math.round(ev.y)}) burns out: ${ev.count} patches of ground burned` });
        break;
      case "storm":
        this.worldEvents.push({ tick: t, kind: "recovery", text: `The storm near (${Math.round(ev.x)}, ${Math.round(ev.y)}) blows itself out` });
        break;
      case "flood": {
        // The water goes down (cells that are water for good were never in the list).
        for (const cell of ev.cells) this.passable[cell] = 1;
        this.worldEvents.push({ tick: t, kind: "recovery", text: `The flood near (${Math.round(ev.x)}, ${Math.round(ev.y)}) drains away` });
        break;
      }
      case "volcano":
        this.worldEvents.push({ tick: t, kind: "recovery", text: "The volcano's ash cloud clears" });
        break;
      case "blight":
        this.worldEvents.push({ tick: t, kind: "recovery", text: "The plant blight ends" });
        break;
      case "goodYear":
        this.worldEvents.push({ tick: t, kind: "recovery", text: "The good year ends" });
        break;
    }
  }

  private newEvent(kind: DisasterKind, length: number, x: number, y: number, radius: number, intensity: number, target = 0): ActiveEvent {
    const ev: ActiveEvent = { kind, start: this.tick, end: this.tick + length, x, y, radius, intensity, target, cells: [], left: [], count: 0 };
    this.activeEvents.push(ev);
    return ev;
  }

  /** An ice age or a drought: the same shape as the older catastrophes (builds up, worst in the middle, fades). */
  private beginClimateEvent(kind: "iceAge" | "drought", loValue: number, hiValue: number, loLength: number, hiLength: number): void {
    const intensity = this.evDraw(loValue, hiValue);
    const length = Math.max(2, Math.round(this.evDraw(loLength, hiLength)));
    this.newEvent(kind, length, 0, 0, 0, intensity);
    this.worldEvents.push({
      tick: this.tick,
      kind,
      text: kind === "iceAge" ? `An ice age begins: up to ${Math.round(intensity * 100) / 100} colder everywhere for ${length} ticks` : `A drought begins: plant growth falls by up to ${Math.round(intensity * 100)}% for ${length} ticks`,
    });
  }

  /** Light a fire on a patch of land, preferring dry ground with a lot of plants standing on it. */
  private beginFire(): void {
    const c = this.config;
    const cs = c.foodCellSize;
    // Fire starts where it can: of a few random spots, the one with most to burn.
    let bestX = 0;
    let bestY = 0;
    let bestScore = -1;
    for (let tries = 0; tries < 8; tries++) {
      const [x, y] = this.randomLandPoint();
      const cell = Math.floor(y / cs) * this.gridWidth + Math.floor(x / cs);
      const score = this.food[cell]! * (this.climateOn ? 2 - Math.min(1, this.growthFactor[cell]!) : 1.5);
      if (score > bestScore) {
        bestScore = score;
        bestX = x;
        bestY = y;
      }
    }
    const radius = this.evDraw(c.evFireRadiusMin, c.evFireRadiusMax);
    const spread = this.evDraw(c.evFireSpreadMin, c.evFireSpreadMax);
    const length = Math.max(2, Math.round(this.evDraw(c.evFireLengthMin, c.evFireLengthMax)));
    const ev = this.newEvent("wildfire", length, bestX, bestY, radius, spread);
    for (const cell of this.cellsWithin(bestX, bestY, radius)) this.igniteCell(ev, cell);
    this.worldEvents.push({ tick: this.tick, kind: "wildfire", text: `A wildfire starts near (${Math.round(bestX)}, ${Math.round(bestY)}): spread chance ${Math.round(spread * 100) / 100}, up to ${length} ticks` });
  }

  private igniteCell(ev: ActiveEvent, cell: number): void {
    if (this.burning[cell] === 1 || this.fireScar[cell]! > this.tick) return;
    this.burning[cell] = 1;
    this.fireScar[cell] = this.tick + this.config.evFireCellBurn + this.config.evFireRecover;
    ev.cells.push(cell);
    ev.left.push(this.config.evFireCellBurn);
    ev.count++;
    this.burnPlants(cell);
  }

  /** One tick of a fire: burning ground may light its four neighbors (more likely where plants are thick and the ground is dry), then burns down. */
  private fireSpread(ev: ActiveEvent): void {
    const c = this.config;
    const gw = this.gridWidth;
    const gh = this.gridHeight;
    const weight = c.evFireDryWeight;
    const burningNow = ev.cells.length;
    const lit: number[] = [];
    for (let k = 0; k < burningNow; k++) {
      const cell = ev.cells[k]!;
      this.burnPlants(cell); // anything that grew back while it was burning goes too
      const cx = cell % gw;
      const cy = (cell - cx) / gw;
      for (let side = 0; side < 4; side++) {
        const nx = side === 0 ? wrapCell(cx + 1, gw) : side === 1 ? wrapCell(cx - 1, gw) : cx;
        const ny = side === 2 ? wrapCell(cy + 1, gh) : side === 3 ? wrapCell(cy - 1, gh) : cy;
        const nb = ny * gw + nx;
        if (this.burning[nb] === 1 || this.fireScar[nb]! > this.tick || (this.terrainOn && this.passable[nb] === 0)) continue;
        if (!(this.foodCapacity[nb]! > 0) || !(this.food[nb]! > 0) || !(this.fuelRef > 0)) continue;
        // (How much there is to burn is judged against the average cell, so a fire behaves alike in rich and poor worlds.)
        const share = Math.min(1, this.food[nb]! / this.fuelRef);
        const dry = this.climateOn ? Math.max(0, 1 - this.growthFactor[nb]!) : 0.5;
        if (this.eventRng.next() < ev.intensity * share * (1 - weight + weight * dry)) {
          this.burning[nb] = 1; // (so no one else lights it again this tick)
          lit.push(nb);
        }
      }
    }
    // Cells burn for a few ticks, then go out.
    let kept = 0;
    for (let k = 0; k < burningNow; k++) {
      const left = ev.left[k]! - 1;
      if (left > 0) {
        ev.cells[kept] = ev.cells[k]!;
        ev.left[kept] = left;
        kept++;
      } else {
        this.burning[ev.cells[k]!] = 0;
      }
    }
    ev.cells.length = kept;
    ev.left.length = kept;
    for (const cell of lit) {
      this.fireScar[cell] = this.tick + c.evFireCellBurn + c.evFireRecover;
      ev.cells.push(cell);
      ev.left.push(c.evFireCellBurn);
      ev.count++;
      this.burnPlants(cell);
    }
  }

  private beginStorm(): void {
    const c = this.config;
    const [x, y] = this.randomLandPoint();
    const radius = this.evDraw(c.evStormRadiusMin, c.evStormRadiusMax);
    const push = this.evDraw(c.evStormPushMin, c.evStormPushMax);
    const length = Math.max(2, Math.round(this.evDraw(c.evStormLengthMin, c.evStormLengthMax)));
    const wind = this.eventRng.int(8);
    this.newEvent("storm", length, x, y, radius, push, wind);
    this.worldEvents.push({ tick: this.tick, kind: "storm", text: `A storm blows up near (${Math.round(x)}, ${Math.round(y)}), radius ${Math.round(radius)}, for ${length} ticks` });
  }

  /** One tick of a storm: animals are shoved downwind, moving costs more, and some soil is blown to the next cell downwind. */
  private stormBlow(ev: ActiveEvent): void {
    const c = this.config;
    const W = c.worldWidth;
    const H = c.worldHeight;
    const cs = c.foodCellSize;
    const gw = this.gridWidth;
    const gh = this.gridHeight;
    const r2 = ev.radius * ev.radius;
    const gust = ev.intensity * (0.5 + unitHash(this.tick, ev.start)); // the same shove for everyone, so colonies stay together
    const wx = DIR_X[ev.target]! * gust;
    const wy = DIR_Y[ev.target]! * gust;
    for (let i = 0; i < this.count; i++) {
      if (this.killed[i] === 1 || !this.nearPoint(this.x[i]!, this.y[i]!, ev.x, ev.y, r2)) continue;
      let nx = this.x[i]! + wx;
      let ny = this.y[i]! + wy;
      nx -= Math.floor(nx / W) * W;
      ny -= Math.floor(ny / H) * H;
      nx = Math.fround(nx);
      ny = Math.fround(ny);
      if (nx >= W) nx = 0;
      if (ny >= H) ny = 0;
      if (this.terrainOn && this.passable[Math.floor(ny / cs) * gw + Math.floor(nx / cs)] === 0) continue; // no blowing into water
      this.x[i] = nx;
      this.y[i] = ny;
    }
    // Soil: a share of each cell's nutrient moves one cell downwind (taken from all cells first, then added, so order does not matter).
    const stepX = DIR_X[ev.target]! > 0.5 ? 1 : DIR_X[ev.target]! < -0.5 ? -1 : 0;
    const stepY = DIR_Y[ev.target]! > 0.5 ? 1 : DIR_Y[ev.target]! < -0.5 ? -1 : 0;
    const delta = this.stormDelta;
    delta.fill(0);
    const share = c.evStormSoilShare;
    for (let cy = 0; cy < gh; cy++) {
      for (let cx = 0; cx < gw; cx++) {
        if (!this.nearPoint((cx + 0.5) * cs, (cy + 0.5) * cs, ev.x, ev.y, r2)) continue;
        const cell = cy * gw + cx;
        this.stormCell[cell] = 1;
        const to = wrapCell(cy + stepY, gh) * gw + wrapCell(cx + stepX, gw);
        if (to === cell || (this.terrainOn && this.passable[to] === 0)) continue;
        const moved = this.nutrient[cell]! * share;
        delta[cell] = delta[cell]! - moved;
        delta[to] = delta[to]! + moved;
      }
    }
    for (let cell = 0; cell < delta.length; cell++) if (delta[cell] !== 0) this.nutrient[cell] = this.nutrient[cell]! + delta[cell]!;
  }

  private beginFlood(): void {
    const c = this.config;
    const [x, y] = this.randomLandPoint();
    const radius = this.evDraw(c.evFloodRadiusMin, c.evFloodRadiusMax);
    const length = Math.max(2, Math.round(this.evDraw(c.evFloodLengthMin, c.evFloodLengthMax)));
    const ev = this.newEvent("flood", length, x, y, radius, 0);
    ev.cells = this.cellsWithin(x, y, radius); // (only cells that are dry land now)
    for (const cell of ev.cells) {
      this.passable[cell] = 0;
      this.crushPlants(cell);
    }
    // Animals caught in the water are carried to the nearest dry ground.
    let moved = 0;
    const cs = c.foodCellSize;
    for (let i = 0; i < this.count; i++) {
      if (this.killed[i] === 1) continue;
      const cell = Math.floor(this.y[i]! / cs) * this.gridWidth + Math.floor(this.x[i]! / cs);
      if (this.passable[cell] !== 0) continue;
      if (this.moveToDryGround(i, cell)) moved++;
    }
    this.worldEvents.push({ tick: this.tick, kind: "flood", text: `A flood covers ${ev.cells.length} patches of ground near (${Math.round(x)}, ${Math.round(y)}) for ${length} ticks; ${moved} animals washed to dry land` });
  }

  /** Put organism i on the nearest dry cell (looking outward ring by ring); false if there is none. */
  private moveToDryGround(i: number, from: number): boolean {
    const gw = this.gridWidth;
    const gh = this.gridHeight;
    const cs = this.config.foodCellSize;
    const fx = from % gw;
    const fy = (from - fx) / gw;
    const reach = Math.max(gw, gh) >> 1;
    for (let ring = 1; ring <= reach; ring++) {
      let best = -1;
      let bestDist = Infinity;
      for (let dy = -ring; dy <= ring; dy++) {
        for (let dx = -ring; dx <= ring; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
          const cell = wrapCell(fy + dy, gh) * gw + wrapCell(fx + dx, gw);
          if (this.passable[cell] === 0) continue;
          const d = dx * dx + dy * dy;
          if (d < bestDist) {
            bestDist = d;
            best = cell;
          }
        }
      }
      if (best >= 0) {
        const bx = best % gw;
        const by = (best - bx) / gw;
        // A little scatter so the washed-up animals do not all sit on one point.
        this.x[i] = Math.fround((bx + 0.1 + 0.8 * unitHash(this.id[i]!, this.tick)) * cs);
        this.y[i] = Math.fround((by + 0.1 + 0.8 * unitHash(this.id[i]!, this.tick + 7919)) * cs);
        this.cellOf[i] = best;
        return true;
      }
    }
    return false;
  }

  private beginVolcano(): void {
    const c = this.config;
    const [x, y] = this.randomLandPoint();
    const radius = this.evDraw(c.evVolcanoRadiusMin, c.evVolcanoRadiusMax);
    const cooling = this.evDraw(c.evVolcanoCoolingMin, c.evVolcanoCoolingMax);
    const length = Math.max(2, Math.round(this.evDraw(c.evVolcanoLengthMin, c.evVolcanoLengthMax)));
    this.newEvent("volcano", length, x, y, radius, cooling);
    const r2 = radius * radius;
    let killed = 0;
    for (let i = 0; i < this.count; i++) {
      if (this.killed[i] === 1 || !this.nearPoint(this.x[i]!, this.y[i]!, x, y, r2)) continue;
      this.killToCorpse(i);
      killed++;
    }
    for (const cell of this.cellsWithin(x, y, radius)) this.burnPlants(cell);
    // Richer ground around it: biggest at the crater, thinning to nothing at reach times the radius.
    const reach = radius * c.evVolcanoBoostReach;
    const cs = c.foodCellSize;
    for (const cell of this.cellsWithin(x, y, reach)) {
      const cx = cell % this.gridWidth;
      const cy = (cell - cx) / this.gridWidth;
      let dx = (cx + 0.5) * cs - x;
      let dy = (cy + 0.5) * cs - y;
      if (dx > c.worldWidth / 2) dx -= c.worldWidth;
      else if (dx < -c.worldWidth / 2) dx += c.worldWidth;
      if (dy > c.worldHeight / 2) dy -= c.worldHeight;
      else if (dy < -c.worldHeight / 2) dy += c.worldHeight;
      const boost = c.evVolcanoBoost * (1 - Math.sqrt(dx * dx + dy * dy) / reach);
      if (boost > this.ash[cell]!) this.ash[cell] = boost;
    }
    this.worldEvents.push({ tick: this.tick, kind: "volcano", text: `A volcano erupts near (${Math.round(x)}, ${Math.round(y)}): ${killed} organisms killed, the world cools by up to ${Math.round(cooling * 100) / 100} for ${length} ticks` });
  }

  private beginBlight(): void {
    const c = this.config;
    const left = this.evDraw(c.evBlightGrowthMin, c.evBlightGrowthMax);
    const length = Math.max(2, Math.round(this.evDraw(c.evBlightLengthMin, c.evBlightLengthMax)));
    const kind = this.plantKinds > 1 ? this.eventRng.int(this.plantKinds) : -1;
    this.newEvent("blight", length, 0, 0, 0, left, kind);
    this.worldEvents.push({
      tick: this.tick,
      kind: "blight",
      text: `A plant blight hits ${kind < 0 ? "all plants" : `plant kind ${kind + 1}`}: they grow at ${Math.round(left * 100)}% of normal for ${length} ticks`,
    });
  }

  /** A new strain starts in a cluster of animals and keeps them sick longer than usual. */
  private beginOutbreak(): void {
    const c = this.config;
    const [x, y] = this.randomLandPoint();
    const r2 = c.evOutbreakRadius * c.evOutbreakRadius;
    const hosts: number[] = [];
    for (let i = 0; i < this.count && hosts.length < c.evOutbreakHosts; i++) {
      if (this.killed[i] === 1 || this.sickFor[i]! > 0 || this.immuneFor[i]! > 0 || !this.nearPoint(this.x[i]!, this.y[i]!, x, y, r2)) continue;
      hosts.push(i);
    }
    if (hosts.length === 0) {
      this.worldEvents.push({ tick: this.tick, kind: "outbreak", text: `An outbreak near (${Math.round(x)}, ${Math.round(y)}) fizzles: nobody there to catch it` });
      return;
    }
    this.newStrainIn(hosts[0]!);
    const strain = this.strains.length;
    const sickness = Math.round(c.diseaseDuration * c.evOutbreakDurationMult);
    this.sickFor[hosts[0]!] = sickness;
    for (let k = 1; k < hosts.length; k++) {
      this.infection[hosts[k]!] = strain;
      this.sickFor[hosts[k]!] = sickness;
      this.totalInfections++;
    }
    this.worldEvents.push({ tick: this.tick, kind: "outbreak", text: `A new, nastier disease breaks out near (${Math.round(x)}, ${Math.round(y)}): ${hosts.length} animals sick` });
  }

  private beginGoodYear(): void {
    const c = this.config;
    const boost = this.evDraw(c.evGoodYearBoostMin, c.evGoodYearBoostMax);
    const length = Math.max(2, Math.round(this.evDraw(c.evGoodYearLengthMin, c.evGoodYearLengthMax)));
    this.newEvent("goodYear", length, 0, 0, 0, boost);
    this.worldEvents.push({ tick: this.tick, kind: "goodYear", text: `A good year begins: plants grow ${Math.round((boost - 1) * 100)}% faster for ${length} ticks` });
  }

  /** What the Events map layer shows: 1 burning, 2 flooded, 3 storm, 4 volcanic ground (0 nothing). */
  eventMap(): Uint8Array {
    const out = new Uint8Array(this.food.length);
    if (!this.eventsOn) return out;
    if (this.ashOn) for (let cell = 0; cell < out.length; cell++) if (this.ash[cell]! > 0.02) out[cell] = 4;
    for (const ev of this.activeEvents) {
      if (ev.kind === "wildfire") for (const cell of ev.cells) out[cell] = 1;
      else if (ev.kind === "flood") for (const cell of ev.cells) out[cell] = 2;
    }
    if (this.stormOn) for (let cell = 0; cell < out.length; cell++) if (this.stormCell[cell] === 1 && out[cell] === 0) out[cell] = 3;
    return out;
  }

  /** Are any disaster events switched on in this world? */
  get eventsEnabled(): boolean {
    return this.eventsOn;
  }

  /** The disasters going on now, for the viewer. */
  get currentEvents(): readonly ActiveEvent[] {
    return this.activeEvents;
  }

  /**
   * Climate biomes: each land cell's lasting moisture (from how near water it is, its rain belt
   * and patchy noise), then its biome from its average temperature and moisture, then plant
   * growth and movement cost by biome. With several kinds of plant, each cell grows the kind
   * that likes its temperature best.
   */
  private setUpClimateBiomes(noise: Float64Array): void {
    const c = this.config;
    const gw = this.gridWidth;
    const gh = this.gridHeight;
    const cells = gw * gh;
    // Steps to the nearest water, spreading outward from all water at once.
    const steps = new Int32Array(cells).fill(-1);
    const queue = new Int32Array(cells);
    let head = 0;
    let tail = 0;
    for (let cell = 0; cell < cells; cell++) {
      if (this.biome[cell] === BIOME.water) {
        steps[cell] = 0;
        queue[tail++] = cell;
      }
    }
    while (head < tail) {
      const cell = queue[head++]!;
      const cx = cell % gw;
      const cy = (cell - cx) / gw;
      for (let side = 0; side < 4; side++) {
        const nx = side === 0 ? wrapCell(cx + 1, gw) : side === 1 ? wrapCell(cx - 1, gw) : cx;
        const ny = side === 2 ? wrapCell(cy + 1, gh) : side === 3 ? wrapCell(cy - 1, gh) : cy;
        const nb = ny * gw + nx;
        if (steps[nb] !== -1) continue;
        steps[nb] = steps[cell]! + 1;
        queue[tail++] = nb;
      }
    }
    const noiseWeight = 1 - c.moistureWaterWeight - c.moistureBandWeight;
    const table = climateBiomeTable(c);
    this.biomeSeen = table.seen;
    this.biomeDisease = table.disease;
    for (let cy = 0; cy < gh; cy++) {
      const belt = rainBelt(c, polarness(cy, gh));
      for (let cx = 0; cx < gw; cx++) {
        const cell = cy * gw + cx;
        if (this.biome[cell] === BIOME.water) {
          this.moistureBase[cell] = 1;
          continue;
        }
        const nearWater = steps[cell]! < 0 ? 0 : c.moistureReach / (c.moistureReach + steps[cell]!);
        const m = c.moistureWaterWeight * nearWater + c.moistureBandWeight * belt + noiseWeight * noise[cell]!;
        this.moistureBase[cell] = m < 0 ? 0 : m > 1 ? 1 : m;
        if (this.biome[cell] !== BIOME.mountain) this.biome[cell] = climateBiome(c, this.tempBase[cell]!, this.moistureBase[cell]!);
        const kind = this.biome[cell]!;
        this.terrainMove[cell] = table.move[kind]!;
        this.foodCapacity[cell] = this.foodCapacity[cell]! * table.growth[kind]!;
        this.foodRegrow[cell] = this.foodRegrow[cell]! * table.growth[kind]!;
      }
    }
    for (let cell = 0; cell < cells; cell++) {
      if (this.biome[cell] === BIOME.water) {
        this.foodCapacity[cell] = 0;
        this.foodRegrow[cell] = 0;
      }
    }
    if (this.plantKinds > 1) {
      // Each kind of plant likes a slightly different temperature (see updateClimate): grow the best-suited one.
      for (let cell = 0; cell < cells; cell++) {
        let best = 0;
        let bestOff = Infinity;
        for (let j = 0; j < this.plantKinds; j++) {
          const off = Math.abs(this.tempBase[cell]! - (c.plantTempOptimum + (j - (this.plantKinds - 1) / 2) * c.plantTypeTempSpread));
          if (off < bestOff) {
            bestOff = off;
            best = j;
          }
        }
        this.plantTypeOf[cell] = best;
      }
    }
    this.updateClimate();
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
        let fertility = 1 + c.fertilityVariation * (2 * noise - 1);
        if (fertility < c.barrenBelow) fertility = 0; // barren ground: no plants at all (only oases grow)
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
    if (this.nutrientOn) this.nutrientStore[i] = 0;
    if (this.drinkOn) this.hydration[i] = 1; // born with a full drink
    if (this.signalOn) {
      this.sharedThreatNear[i] = 0;
      this.sharedFoodNear[i] = 0;
    }
    if (this.toxOn) {
      // A newborn remembers nothing (every field is cleared, so a reused slot never carries an old animal's memory).
      this.avoidStrength[i] = 0;
      this.avoidHue[i] = 0;
      this.lastKillHue[i] = 0;
      this.lastKillTick[i] = 0;
    }
    if (this.loadOn) this.loadMask[i] = 0;
    if (this.luckOn) {
      this.upkeepLuck[i] = this.rollLuck();
      this.fertilityLuck[i] = this.rollLuck();
    }
    if (this.memoryOn) this.memState.fill(0, i * MEMORY_COUNT, (i + 1) * MEMORY_COUNT);
    if (this.learnOn) {
      // A newborn has learned nothing yet (what its parents learned is not inherited).
      this.learnDelta.fill(0, i * LEARN_SLOTS, (i + 1) * LEARN_SLOTS);
      this.learnTrace.fill(0, i * LEARN_SLOTS, (i + 1) * LEARN_SLOTS);
    }
    if (this.trackOn) {
      this.learnAvg[i] = 0;
      this.learnPrevE[i] = -1;
      this.learnSpent[i] = 0;
    }
    if (this.placeOn) this.placeVal.fill(0, i * PLACE_SLOTS, (i + 1) * PLACE_SLOTS); // remembers nowhere yet
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
    // Being choosy about mates takes attention: a small cost on the sensing line.
    if (this.pickyOn) this.senseCost[i] = this.senseCost[i]! + c.pickinessCost * genes[g + GENE.pickiness]!;
    if (this.eyeOn) {
      // The eye: wider (gene toward 0) sees more of the world around but less far; narrower (toward 1) the reverse.
      const e = genes[g + GENE.eye]!;
      this.eyeHalf[i] = e <= 0.5 ? EYE_WIDE + (EYE_TODAY - EYE_WIDE) * (e / 0.5) : EYE_TODAY + (EYE_NARROW - EYE_TODAY) * ((e - 0.5) / 0.5);
      // Reach trades against width so every eye covers about the same area: a 300-degree view reaches
      // 1 / sqrt(2) as far as today's 150-degree one, a 60-degree view sqrt(2.5) times as far.
      const ratio = e <= 0.5 ? 0.5 + 0.5 * (e / 0.5) : 1 + 1.5 * ((e - 0.5) / 0.5);
      this.eyeReach[i] = Math.sqrt(ratio);
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
    // Weapons get in the way of grazing: an armed animal takes smaller plant bites.
    const grazing = (1 - diet) * (1 - c.weaponGrazeLoss * genes[g + GENE.attack]!);
    this.plantBite[i] = bite * grazing;
    this.meatBite[i] = bite * diet * c.meatGorge; // (gorging: meat can be wolfed down in bigger bites)
    this.plantWeight[i] = weight * grazing;
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
    if (this.toxOn) this.basalCost[i] = this.basalCost[i]! * (1 + c.toxinUpkeep * genes[g + GENE.toxicity]!);
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

  /** Does this hunter pass up this prey because of its color? (A fixed scramble of the glance period and the pair, so no random draw.) */
  private avoids(viewer: number, target: number): boolean {
    const c = this.config;
    let d = this.genes[target * GENE_COUNT + GENE.hue]! - this.avoidHue[viewer]!;
    if (d < 0) d = -d;
    if (d > 0.5) d = 1 - d;
    if (d >= c.avoidWidth) return false;
    const glance = Math.floor(this.tick / c.camoGlance);
    const u = ((Math.imul(glance + 1, 0x7feb352d) ^ Math.imul(this.id[viewer]! + 1, 0x846ca68b) ^ Math.imul(this.id[target]! + 1, 0xa5a5a5a5)) >>> 0) / 4294967296;
    return u < this.avoidStrength[viewer]!;
  }

  /** A new body joins the corpse in a cell: mix its toxicity in, weighted by matter. */
  private foldToxin(cell: number, matterBefore: number, matterAdded: number, toxin: number): void {
    const total = matterBefore + matterAdded;
    this.corpseToxin[cell] = total > 0 ? (this.corpseToxin[cell]! * matterBefore + toxin * matterAdded) / total : 0;
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

  /** Count one blocked birth, by what blocked it. (One attempt can be short of both soil and energy at once.) */
  private noteBlockedBirth(soilShort: boolean, energyShort: boolean): void {
    this.blockedBirths++;
    if (soilShort && energyShort) this.blockedBirthsBoth++;
    else if (soilShort) this.blockedBirthsSoil++;
    else this.blockedBirthsEnergy++;
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
      // Mending (off unless set): each harmful mutation passed down has a small chance of being repaired, so the
      // load of a small asexual group levels off instead of growing for ever.
      if (c.mutationLoadMend > 0) {
        let kept = 0;
        for (let k = count; k > 0; k--) if (this.rng.next() >= c.mutationLoadMend) kept++;
        count = kept;
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
    if (c.placeReflex === 1 && this.placeOn) {
      // Founders also turn toward the best place they remember elsewhere (so the place sense can pay from the start).
      count = setConnection(this.brainFrom, this.brainTo, this.brainWeight, base, count, INPUT.placeSide, OUTPUT_START + OUTPUT.turn, FOUNDER_REFLEX_WEIGHT);
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

  /** How many feeding places organism i can remember: any place memory gene above 0 gives at least one, a gene of 1 gives placeSlotsMax. */
  private placeCapacity(i: number): number {
    const gene = this.genes[i * GENE_COUNT + GENE.placeMemory]!;
    return gene > 0 ? Math.min(this.config.placeSlotsMax, Math.ceil(gene * this.config.placeSlotsMax)) : 0;
  }

  /** With working memory: how many memory cells organism i's brain can use (any gene above 0 gives one, a gene of 1 all four). */
  private memoryCells(i: number): number {
    const gene = this.genes[i * GENE_COUNT + GENE.workingMemory]!;
    return gene > 0 ? Math.min(MEMORY_COUNT, Math.ceil(gene * MEMORY_COUNT)) : 0;
  }

  /** Squared distance between two points in the wrapped world. */
  private wrappedDistSq(ax: number, ay: number, bx: number, by: number): number {
    const W = this.config.worldWidth;
    const H = this.config.worldHeight;
    let dx = bx - ax;
    let dy = by - ay;
    if (dx > W / 2) dx -= W;
    else if (dx < -W / 2) dx += W;
    if (dy > H / 2) dy -= H;
    else if (dy < -H / 2) dy += H;
    return dx * dx + dy * dy;
  }

  /**
   * Place memory, once a tick: every memory fades a little, and a good enough meal either refreshes
   * the remembered place it was eaten at (keeping the better value) or replaces the weakest memory.
   */
  private rememberPlace(i: number, meal: number): void {
    const c = this.config;
    const k = this.placeSlots[i]!;
    if (k === 0) return;
    const base = i * PLACE_SLOTS;
    const val = this.placeVal;
    for (let j = 0; j < k; j++) val[base + j] = val[base + j]! * c.placeFade;
    if (meal < c.placeMinMeal) return;
    const x = this.x[i]!;
    const y = this.y[i]!;
    const mergeSq = c.placeMergeRadius * c.placeMergeRadius;
    let weakest = 0;
    for (let j = 0; j < k; j++) {
      const v = val[base + j]!;
      if (v > 0 && this.wrappedDistSq(x, y, this.placeX[base + j]!, this.placeY[base + j]!) <= mergeSq) {
        if (meal >= v) {
          this.placeX[base + j] = x;
          this.placeY[base + j] = y;
          val[base + j] = meal;
        }
        return;
      }
      if (v < val[base + weakest]!) weakest = j;
    }
    if (meal > val[base + weakest]!) {
      this.placeX[base + weakest] = x;
      this.placeY[base + weakest] = y;
      val[base + weakest] = meal;
    }
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
    const learning = this.learnOn && this.genes[i * GENE_COUNT + GENE.learning]! > 0;
    for (let k = 0; k < this.brainCount[i]!; k++) {
      const w = this.brainWeight[base + k]!;
      // A weak connection can still be strengthened by learning, so its sense must be worked out too.
      if (w < c.brainPruneBelow && w > -c.brainPruneBelow && !(learning && k < LEARN_SLOTS)) continue;
      const source = this.brainFrom[base + k]!;
      if (source >= INPUT_COUNT) continue; // hidden units read other inputs, which are counted on their own
      if (source >= INPUT.chemReward && source <= INPUT.chemCalm) readsChem = true;
      if (source < INPUT.smellPlantAhead) senses |= SENSE_VISION;
      else if (source < INPUT.energy) senses |= SENSE_SMELL;
      else if (source >= INPUT.kinDensity && source <= INPUT.kinSide) senses |= SENSE_SOCIAL;
      else senses |= SENSE_BODY;
    }
    this.brainSenses[i] = senses;
    this.brainCost[i] =
      c.brainBaseCost +
      c.brainCostPerNeuron * size.hidden +
      c.brainCostPerConnection * size.connections +
      (readsChem && this.chemOn ? c.chemicalsCost : 0) +
      (this.learnOn ? c.learnCostCoeff * this.genes[i * GENE_COUNT + GENE.learning]! : 0) + // the learning machinery
      (this.placeOn ? c.placeCostCoeff * this.placeCapacity(i) : 0) + // room to remember places
      (this.wmOn ? c.wmCostCoeff * this.memoryCells(i) : 0); // memory cells it can use
    if (this.placeOn) this.placeSlots[i] = this.placeCapacity(i);
    if (this.wmOn) this.wmCells[i] = this.memoryCells(i);
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
    const hungerDefense = this.config.preyHungerDefense;
    if (hungerDefense > 0) {
      // A hungry animal defends itself less well.
      const fed = this.energy[prey]! / this.threshold[prey]!;
      defense *= 1 - hungerDefense * (1 - (fed < 0 ? 0 : fed > 1 ? 1 : fed));
    }
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
    const side = this.visHx * dy - this.visHy * dx; // positive = to my left
    const across = side < 0 ? -side : side;
    let ray: number;
    if (this.eyeOn) {
      // The eye gene sets how wide this eye sees (and, elsewhere, how far): the same five rays, spread
      // over its width. The angle is measured without trigonometry (see EYE_TODAY).
      const angle = forward >= 0 ? (forward + across > 0 ? across / (forward + across) : 0) : 2 - across / (across - forward);
      const half = this.visEyeHalf;
      if (angle >= half) return; // outside this eye's view
      if (angle < EYE_CUT1 * half) ray = 2;
      else if (angle < EYE_CUT2 * half) ray = side > 0 ? 3 : 1;
      else ray = side > 0 ? 4 : 0;
    } else {
      if (forward <= 0) return; // behind me
      // Five rays, each 30 degrees wide: straight ahead, and two on each side. The cut-offs are
      // the tangents of 15, 45 and 75 degrees, so no trigonometry is needed.
      if (across < 0.2679491924311227 * forward) ray = 2;
      else if (across < forward) ray = side > 0 ? 3 : 1;
      else if (across < 3.732050807568877 * forward) ray = side > 0 ? 4 : 0;
      else return;
    }
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
    // A signaling cell with bonds looks and smells for its colony even if its own brain uses neither.
    const publishing = this.signalOn && this.genes[i * GENE_COUNT + GENE.signal]! > 0 && this.bondCount(i) > 0;
    // A brain with no working connections decides nothing (every output is zero), and a
    // brain only needs the senses it is wired to. Skipping the rest changes no result,
    // only saves time. (An organism being watched in the viewer senses everything.)
    if (senses === 0 && !traced && !publishing) {
      this.outTurn[i] = 0;
      this.outSpeed[i] = 0;
      this.outAttack[i] = 0;
      return;
    }
    const seeing = (senses & SENSE_VISION) !== 0 || traced || publishing;
    const smelling = (senses & SENSE_SMELL) !== 0 || traced || publishing;
    inputs.fill(0);
    const x = this.x[i]!;
    const y = this.y[i]!;
    const hx = this.headingX[i]!;
    const hy = this.headingY[i]!;
    const range = (c.brainVisionRange + this.senseRange[i]!) * (this.eyeOn ? this.eyeReach[i]! : 1);
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
      this.visEyeHalf = this.eyeOn ? this.eyeHalf[i]! : 0;
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

    if (publishing) {
      // Share with the colony: the nearest bigger animal it can see (which way, how near) and which way plants smell stronger.
      let nearest = -1;
      let nearestDist = Infinity;
      if (seeing && range > 0.25) {
        for (let k = 0; k < RAY_COUNT; k++) {
          if (this.rayTargetLarge[k]! >= 0 && this.rayDistLarge[k]! < nearestDist) {
            nearestDist = this.rayDistLarge[k]!;
            nearest = this.rayTargetLarge[k]!;
          }
        }
      }
      if (nearest >= 0) {
        const W = c.worldWidth;
        const H = c.worldHeight;
        let dx = this.x[nearest]! - x;
        let dy = this.y[nearest]! - y;
        if (dx > W / 2) dx -= W;
        else if (dx < -W / 2) dx += W;
        if (dy > H / 2) dy -= H;
        else if (dy < -H / 2) dy += H;
        const d = Math.sqrt(dx * dx + dy * dy);
        this.sharedThreatX[i] = d > 0 ? dx / d : 0;
        this.sharedThreatY[i] = d > 0 ? dy / d : 0;
        this.sharedThreatNear[i] = 1 - Math.sqrt(nearestDist) / range;
      } else {
        this.sharedThreatNear[i] = 0;
      }
      const cx = Math.floor(x / cs);
      const cy = Math.floor(y / cs);
      const gxFood = (this.food[cy * gw + ((cx + 1) % gw)]! - this.food[cy * gw + ((cx + gw - 1) % gw)]!) / c.foodCap;
      const gyFood = (this.food[((cy + 1) % gh) * gw + cx]! - this.food[((cy + gh - 1) % gh) * gw + cx]!) / c.foodCap;
      const g = Math.sqrt(gxFood * gxFood + gyFood * gyFood);
      this.sharedFoodX[i] = g > 0 ? gxFood / g : 0;
      this.sharedFoodY[i] = g > 0 ? gyFood / g : 0;
      this.sharedFoodNear[i] = g < 1 ? g : 1;
      if (senses === 0 && !traced) {
        // Its own brain does nothing with any of it.
        this.outTurn[i] = 0;
        this.outSpeed[i] = 0;
        this.outAttack[i] = 0;
        return;
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
    // Place memory: which way, and how far, is the best feeding place it remembers somewhere other than here?
    if (this.placeOn && this.placeSlots[i]! > 0) {
      const base = i * PLACE_SLOTS;
      const mergeSq = c.placeMergeRadius * c.placeMergeRadius;
      let best = -1;
      let bestVal = 0;
      for (let j = 0; j < this.placeSlots[i]!; j++) {
        const v = this.placeVal[base + j]!;
        if (v > bestVal && this.wrappedDistSq(x, y, this.placeX[base + j]!, this.placeY[base + j]!) > mergeSq) {
          best = j;
          bestVal = v;
        }
      }
      if (best >= 0) {
        const W = c.worldWidth;
        const H = c.worldHeight;
        let dx = this.placeX[base + best]! - x;
        let dy = this.placeY[base + best]! - y;
        if (dx > W / 2) dx -= W;
        else if (dx < -W / 2) dx += W;
        if (dy > H / 2) dy -= H;
        else if (dy < -H / 2) dy += H;
        const distance = Math.sqrt(dx * dx + dy * dy);
        inputs[INPUT.placeAhead] = (dx * hx + dy * hy) / distance;
        inputs[INPUT.placeSide] = (hx * dy - hy * dx) / distance;
        inputs[INPUT.placeDistance] = Math.min(1, distance / c.placeRange);
      }
    }
    // Memory: what the brain wrote to its memory cells last time it thought.
    if (this.memoryOn) {
      // (With working memory, cells beyond the brain's capacity are kept at 0.)
      for (let k = 0; k < MEMORY_COUNT; k++) inputs[INPUT.memory0 + k] = this.memState[i * MEMORY_COUNT + k]!;
    }

    // The ground and the body's needs (Phase 8e): nutrient store, how rich the plants are, damaged ground, water, thirst.
    {
      const cx = Math.floor(x / cs);
      const cy = Math.floor(y / cs);
      const here = cy * gw + cx;
      const east = cy * gw + ((cx + 1) % gw);
      const west = cy * gw + ((cx + gw - 1) % gw);
      const south = ((cy + 1) % gh) * gw + cx;
      const north = ((cy + gh - 1) % gh) * gw + cx;
      if (this.nutrientOn) inputs[INPUT.nutrientStore] = Math.min(1, this.nutrientStore[i]! / (c.nutrientStoreCap * this.bodyMatter[i]!)) * 2 - 1;
      if (this.fatOn) inputs[INPUT.fatReserve] = Math.min(1, this.fatStore[i]! / (c.fatCap * this.threshold[i]!));
      if (this.mateScentOn) {
        // Mate scent: the mix that matches its own diet, and which way it gets stronger.
        const ss = c.scentCellSize;
        const sw = this.scentWidth;
        const sh = this.scentHeight;
        const sx = Math.floor(this.x[i]! / ss);
        const sy = Math.floor(this.y[i]! / ss);
        const meat = this.diet[i]!;
        const smell = (k: number): number => (1 - meat) * this.matePlantScent[k]! + meat * this.mateMeatScent[k]!;
        const scale = 1 / (c.mateScent * SCENT_FULL);
        const gx = (smell(sy * sw + ((sx + 1) % sw)) - smell(sy * sw + ((sx + sw - 1) % sw))) * scale;
        const gy = (smell(((sy + 1) % sh) * sw + sx) - smell(((sy + sh - 1) % sh) * sw + sx)) * scale;
        const hx = this.headingX[i]!;
        const hy = this.headingY[i]!;
        inputs[INPUT.mateScentAhead] = clampUnit(gx * hx + gy * hy);
        inputs[INPUT.mateScentSide] = clampUnit(hx * gy - hy * gx);
      }
      if (this.qualityOn) {
        const q = this.plantQ;
        const scale = 1 / c.plantQualityMax;
        inputs[INPUT.plantRichHere] = Math.min(1, q[here]! * scale);
        const gx = (q[east]! - q[west]!) * scale;
        const gy = (q[south]! - q[north]!) * scale;
        inputs[INPUT.plantRichAhead] = clampUnit(gx * hx + gy * hy);
        inputs[INPUT.plantRichSide] = clampUnit(hx * gy - hy * gx);
      }
      if (this.erodeOn || this.grazeOn || this.foulOn) {
        inputs[INPUT.damageHere] = this.groundDamage(here);
        const gx = this.groundDamage(east) - this.groundDamage(west);
        const gy = this.groundDamage(south) - this.groundDamage(north);
        inputs[INPUT.damageAhead] = clampUnit(gx * hx + gy * hy);
        inputs[INPUT.damageSide] = clampUnit(hx * gy - hy * gx);
      }
      if (this.drinkOn) inputs[INPUT.thirst] = 1 - this.hydration[i]!;
      if (this.signalOn) {
        // What bonded neighbors shared (heard at the start of the tick): turned into ahead and left for this cell's heading.
        const at = i * 6;
        const h = this.heard;
        if (h[at + 2]! > 0) {
          inputs[INPUT.colonyThreatAhead] = h[at]! * hx + h[at + 1]! * hy;
          inputs[INPUT.colonyThreatSide] = hx * h[at + 1]! - hy * h[at]!;
          inputs[INPUT.colonyThreatNear] = h[at + 2]!;
        }
        if (h[at + 5]! > 0) {
          inputs[INPUT.colonyFoodAhead] = h[at + 3]! * hx + h[at + 4]! * hy;
          inputs[INPUT.colonyFoodSide] = hx * h[at + 4]! - hy * h[at + 3]!;
          inputs[INPUT.colonyFoodNear] = h[at + 5]!;
        }
      }
      const water = this.nearestWater.length > 0 ? this.nearestWater[here]! : -1;
      if (water >= 0) {
        const W = c.worldWidth;
        const H = c.worldHeight;
        const wx = water % gw;
        let dx = (wx + 0.5) * cs - x;
        let dy = ((water - wx) / gw + 0.5) * cs - y;
        if (dx > W / 2) dx -= W;
        else if (dx < -W / 2) dx += W;
        if (dy > H / 2) dy -= H;
        else if (dy < -H / 2) dy += H;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0) {
          inputs[INPUT.waterAhead] = (dx * hx + dy * hy) / distance;
          inputs[INPUT.waterSide] = (hx * dy - hy * dx) / distance;
        }
        inputs[INPUT.waterDistance] = Math.min(1, distance / c.brainWaterRange);
      }
    }

    // The body: hunger, age, its own diet, a constant, and a little noise (a deterministic scramble of the tick and the organism).
    inputs[INPUT.energy] = Math.min(this.energy[i]! / this.threshold[i]!, 1) * 2 - 1;
    inputs[INPUT.age] = Math.min(this.age[i]! / AGE_FULL, 1) * 2 - 1;
    inputs[INPUT.diet] = this.diet[i]! * 2 - 1;
    // Stamina left: -1 empty, +1 full (0 in worlds without sprint fatigue).
    if (this.staminaOn) inputs[INPUT.stamina] = this.staminaMax[i]! > 0 ? (this.stamina[i]! / this.staminaMax[i]!) * 2 - 1 : -1;
    inputs[INPUT.bias] = 1;
    inputs[INPUT.noise] = ((Math.imul(this.tick + 1, 0x9e3779b1) ^ Math.imul(this.id[i]!, 0x85ebca6b)) >>> 0) / 2147483648 - 1;

    const count = this.brainCount[i]!;
    let learning = false;
    if (this.trackOn) {
      // How did things go since the last thought? The energy change (counting what was handed to
      // young or neighbors as kept), as a share of what it needs to breed, scaled and capped.
      const now = this.energy[i]! + (this.fatOn ? this.fatStore[i]! : 0);
      const before = this.learnPrevE[i]!;
      const reward = before < 0 ? 0 : clampUnit(((now + this.learnSpent[i]! - before) / this.threshold[i]!) * c.learnSenseScale);
      // Surprise: better (+) or worse (-) than usual. Then "usual" moves a little toward this result.
      const usual = this.learnAvg[i]!;
      const surprise = clampUnit(reward - usual);
      this.learnAvg[i] = usual + c.learnBaselineRate * (reward - usual);
      this.learnPrevE[i] = now;
      this.learnSpent[i] = 0;
      if (this.learnSensesOn) {
        inputs[INPUT.energyChange] = reward;
        inputs[INPUT.surprise] = surprise;
        if (c.yearLength > 0) {
          inputs[INPUT.yearA] = smoothWave(this.tick / c.yearLength);
          inputs[INPUT.yearB] = smoothWave(this.tick / c.yearLength + 0.25);
        }
        inputs[INPUT.lastTurn] = this.outTurn[i]!;
        inputs[INPUT.lastSpeed] = this.outSpeed[i]!;
      }
      if (this.learnOn) {
        const rate = c.learnRateMax * this.genes[i * GENE_COUNT + GENE.learning]!;
        if (rate > 0) {
          learning = true;
          // Whatever was active before this outcome is strengthened (or weakened) in proportion to the surprise.
          if (surprise !== 0) applyLearning(this.learnDelta, this.learnTrace, i * LEARN_SLOTS, count, rate * surprise, c.learnLimit);
        }
      }
    }

    const hidden = this.thinkHidden;
    const outputs = this.thinkOutputs;
    if (learning) {
      learnedWeights(this.brainWeight, i * CONN_MAX, count, this.learnDelta, i * LEARN_SLOTS, this.learnWeights);
      evaluateBrain(this.brainFrom, this.brainTo, this.learnWeights, i * CONN_MAX, count, c.brainPruneBelow, inputs, hidden, outputs, 0);
      updateTraces(this.brainFrom, this.brainTo, i * CONN_MAX, count, this.learnTrace, i * LEARN_SLOTS, c.learnTraceDecay, inputs, hidden, outputs);
    } else {
      evaluateBrain(this.brainFrom, this.brainTo, this.brainWeight, i * CONN_MAX, count, c.brainPruneBelow, inputs, hidden, outputs);
    }
    this.outTurn[i] = outputs[OUTPUT.turn]!;
    this.outSpeed[i] = outputs[OUTPUT.speed]!;
    this.outAttack[i] = outputs[OUTPUT.attack]!;
    if (this.wmOn) {
      // Working memory: the brain's hold gates decide, cell by cell, whether to overwrite or hold.
      carryMemory(this.memState, i * MEMORY_COUNT, outputs, this.wmCells[i]!, c.wmKeepMax);
    } else if (this.memoryOn) {
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
  /** Mate scent: old scent fades, then every animal looking for a mate lays fresh scent by its diet (and pays for it). */
  private layMateScent(n: number): void {
    const c = this.config;
    const keep = 1 - c.mateScentDecay;
    const plant = this.matePlantScent;
    const meat = this.mateMeatScent;
    for (let k = 0; k < plant.length; k++) {
      plant[k] = plant[k]! * keep;
      meat[k] = meat[k]! * keep;
    }
    const ss = c.scentCellSize;
    const sw = this.scentWidth;
    for (let i = 0; i < n; i++) {
      // Looking for a mate: with sex as a gene, the ones that chose to; otherwise any animal ready to breed.
      const seeking = this.sexGeneOn ? this.sexMode[i] === 2 : this.energy[i]! >= this.threshold[i]!;
      if (!seeking || this.killed[i] === 1) continue;
      const k = Math.floor(this.y[i]! / ss) * sw + Math.floor(this.x[i]! / ss);
      const diet = this.diet[i]!;
      plant[k] = plant[k]! + c.mateScent * (1 - diet);
      meat[k] = meat[k]! + c.mateScent * diet;
      // Laying scent costs energy (lost as heat, on the sensing line).
      const paid = Math.min(c.mateScentCost, Math.max(0, this.energy[i]!));
      this.energy[i] = this.energy[i]! - paid;
      this.ledger.sensingBurned += paid;
    }
  }

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
    if (this.climateBiomesOn) p = Math.min(1, p * this.biomeSeen[this.biome[cell]!]!); // forests hide, open ground exposes
    if (c.camoLearning > 0 && this.hasImage[viewer] === 1) {
      let sd = hue - this.searchHue[viewer]!;
      if (sd < 0) sd = -sd;
      if (sd > 0.5) sd = 1 - sd;
      p *= 1 + c.camoLearning * (1 - 2 * sd);
      if (p > 1) p = 1;
    }
    // A committed hunter's eye: the more of a meat eater it is, the closer to certain it notices prey.
    if (c.camoHunterEye > 0) p += (1 - p) * c.camoHunterEye * this.genes[viewer * GENE_COUNT + GENE.diet]!;
    if (this.eyeOn) {
      // A narrow eye is sharper (closer to always noticing), a wide one blurrier (the eye gene's other side).
      const sharp = (this.genes[viewer * GENE_COUNT + GENE.eye]! - 0.5) * 2;
      p = sharp >= 0 ? p + (1 - p) * c.eyeSharpness * sharp : p * (1 + c.eyeSharpness * sharp);
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
    if (index === this.giftGiver || this.killed[index] === 1) return; // (nobody feeds the dead)
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
      if (this.trackOn) this.learnSpent[i] = this.learnSpent[i]! + gift;
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
        // (A cell killed earlier this tick, by a disaster, shares nothing: its energy is already in its corpse.)
        if (this.killed[i] === 1 || this.killed[p] === 1) continue;
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
  /** For every cell: how many cells its colony has and their total size (a cell on its own is a colony of one). */
  private updateColonies(n: number): void {
    this.visitStamp++;
    const stamp = this.visitStamp;
    const stack = this.colonyStack;
    const members: number[] = [];
    for (let start = 0; start < n; start++) {
      if (this.visitMark[start] === stamp) continue;
      members.length = 0;
      let top = 0;
      let mass = 0;
      stack[top++] = start;
      this.visitMark[start] = stamp;
      while (top > 0) {
        const cell = stack[--top]!;
        members.push(cell);
        mass += this.size[cell]!;
        for (let k = 0; k < BOND_SLOTS; k++) {
          const partner = this.bondTo[cell * BOND_SLOTS + k]!;
          if (partner >= 0 && this.visitMark[partner] !== stamp) {
            this.visitMark[partner] = stamp;
            stack[top++] = partner;
          }
        }
      }
      for (const cell of members) {
        this.colonyCount[cell] = members.length;
        this.colonyMass[cell] = mass;
      }
    }
  }

  /**
   * Signaling: before anyone thinks, each cell that carries the gene hears its bonded neighbors'
   * last shared senses (how strongly: both cells' genes multiplied) and keeps the strongest threat
   * and the strongest food signal. Done for everyone first, so thinking order cannot matter.
   */
  private listen(n: number): void {
    const g = this.genes;
    const heard = this.heard;
    heard.fill(0, 0, n * 6);
    for (let i = 0; i < n; i++) {
      const mine = g[i * GENE_COUNT + GENE.signal]!;
      if (mine <= 0) continue;
      let bestThreat = 0;
      let bestFood = 0;
      for (let k = 0; k < BOND_SLOTS; k++) {
        const p = this.bondTo[i * BOND_SLOTS + k]!;
        if (p < 0) continue;
        const strength = mine * g[p * GENE_COUNT + GENE.signal]!;
        if (strength <= 0) continue;
        const threat = strength * this.sharedThreatNear[p]!;
        if (threat > bestThreat) {
          bestThreat = threat;
          heard[i * 6] = this.sharedThreatX[p]!;
          heard[i * 6 + 1] = this.sharedThreatY[p]!;
          heard[i * 6 + 2] = threat;
        }
        const food = strength * this.sharedFoodNear[p]!;
        if (food > bestFood) {
          bestFood = food;
          heard[i * 6 + 3] = this.sharedFoodX[p]!;
          heard[i * 6 + 4] = this.sharedFoodY[p]!;
          heard[i * 6 + 5] = food;
        }
      }
    }
  }

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
    let chance = c.diseaseTransmission * this.susceptibility(index, antigen);
    if (this.climateBiomesOn) chance *= this.biomeDisease[this.biome[this.cellOf[this.diseaseHost]!]!]!; // warm wet biomes breed disease
    if (this.foulOn) {
      // Disease passes on more easily on fouled ground (where the sick animal is standing).
      const mean = this.foulMeanNow;
      const excess = mean > 0 ? this.foul[this.cellOf[this.diseaseHost]!]! / mean - c.foulFree : 0;
      if (excess > 0) chance *= 1 + c.foulDiseaseEffect * excess;
    }
    if (this.rng.next() >= chance) return;
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

  /** The average fouling over all the land (worked out fresh from the index, so a saved world needs nothing extra). */
  private meanFoul(): number {
    let sum = 0;
    let land = 0;
    for (let cell = 0; cell < this.foul.length; cell++) {
      if (this.foodCapacity[cell]! <= 0) continue;
      sum += this.foul[cell]!;
      land++;
    }
    return land > 0 ? sum / land : 0;
  }

  /** One tick of disease: new strains arrive, sick organisms infect their neighbors, sickness and immunity run down. */
  private diseaseStep(n: number): void {
    const c = this.config;
    if (this.foulOn) this.foulMeanNow = this.meanFoul(); // once a tick, for tryInfect to use
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

  private hydrationStats(): { mean: number; dehydrated: number } {
    if (!this.drinkOn || this.count === 0) return { mean: 0, dehydrated: 0 };
    let sum = 0;
    let dry = 0;
    for (let i = 0; i < this.count; i++) {
      sum += this.hydration[i]!;
      if (this.hydration[i]! < this.config.thirstBelow) dry++;
    }
    return { mean: sum / this.count, dehydrated: dry / this.count };
  }

  private nutrientStats(): { mean: number; deficient: number } {
    if (!this.nutrientOn || this.count === 0) return { mean: 0, deficient: 0 };
    let sum = 0;
    let short = 0;
    for (let i = 0; i < this.count; i++) {
      const ratio = this.nutrientStore[i]! / this.bodyMatter[i]!;
      sum += ratio;
      if (ratio < this.config.deficiencyBelow) short++;
    }
    return { mean: sum / this.count, deficient: short / this.count };
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
    let dietGap = this.genes[this.mateSelf * GENE_COUNT + GENE.diet]! - this.genes[index * GENE_COUNT + GENE.diet]!;
    if (dietGap < 0) dietGap = -dietGap;
    if (dietGap > this.config.mateDietLimit) return; // too different an eater to pair with
    if (this.pickyCounting) {
      this.pickyCount++;
      return;
    }
    let picky = 0;
    if (this.pickyOn) {
      // Each partner turns down an eater too different from itself: the pickier, and the more choice, the closer it must be.
      picky = this.genes[this.mateSelf * GENE_COUNT + GENE.pickiness]! * this.pickyAlpha;
      const pickyOther = this.genes[index * GENE_COUNT + GENE.pickiness]! * this.pickyAlpha;
      if (dietGap > 1 - picky || dietGap > 1 - pickyOther) return;
    }
    // The score to beat: how near (default) or how genetically similar (matePreference 1, nearer wins a tie).
    let score = distSq;
    // Pickiness also prefers the closer eater: diet difference counted against distance (as a share of mating range).
    if (this.pickyOn && this.config.matePreference === 0) score = distSq / (this.config.mateRange * this.config.mateRange) + this.config.pickyWeight * picky * dietGap;
    if (this.config.matePreference === 1) score = geneSq;
    else if (this.config.matePreference === 2) {
      let hd = this.genes[this.mateSelf * GENE_COUNT + GENE.hue]! - this.genes[index * GENE_COUNT + GENE.hue]!;
      if (hd < 0) hd = -hd;
      score = hd > 0.5 ? 1 - hd : hd; // how far apart the colors are, round the color wheel
    } else if (this.config.matePreference === 3) score = dietGap; // the most similar eater
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
      if (this.pickyOn) {
        // First count the ready, compatible mates in range: pickiness scales with how much choice there is.
        this.pickyCounting = true;
        this.pickyCount = 0;
        this.hash.forEachNear(this.x[a]!, this.y[a]!, this.config.mateRange, this.considerMate);
        this.pickyCounting = false;
        this.pickyAlpha = this.pickyCount / (this.pickyCount + this.config.pickyHalf);
      }
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
    const fatBreeding = this.fatOn && c.fatBreeding === 1; // fat counts as breeding capital
    let attackers = 0;
    if (c.catastropheKind !== 0) this.catastropheCheck();
    // (Brains sense fouled ground compared with the average, so work the average out before anyone thinks.)
    if (this.foulOn && brainMode > 0) this.foulMeanNow = this.meanFoul();
    if (this.eventsOn) this.eventsStep();
    if (this.climateOn) this.updateClimate();
    // Bonded cells even out their energy and turn toward their neighbors' heading.
    if (this.bondsOn) {
      this.shareEnergy(n);
      this.alignHeadings(n);
    }
    if (this.giveOn) this.giveFood(n);
    if (this.colonyInfoOn) this.updateColonies(n);
    if (this.signalOn) this.listen(n);

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
    if (this.mateScentOn) this.layMateScent(n);

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
      if (this.foulOn) this.foul[cell] = this.foul[cell]! + c.fouling * this.size[i]!; // every animal fouls the ground it stands on

      // Standing still lets an organism with a brain eat faster (it must decide: roam or graze).
      const eatBonus = brainMode > 0 ? 1 + c.brainStillEatBonus * (1 - Math.min(this.moveScale[i]!, 1)) : 1;
      const plantMass = Math.min(this.plantBite[i]! * eatBonus, this.plantWeight[i]! * plantShare[cell]!);
      const access = this.meatAccess(i, cell);
      const meatMass = Math.min(this.meatBite[i]! * access * eatBonus, this.meatWeight[i]! * access * meatShare[cell]!);
      plantClaim[cell] = plantClaim[cell]! + plantMass;
      meatClaim[cell] = meatClaim[cell]! + meatMass;
      const plantRaw = plantMass * energyPerFood;
      const meatRaw = meatMass * meatDensity[cell]!;
      if (this.nutrientOn) {
        // Part of what it eats goes into its store (much more of meat, which is already body); the rest becomes dung here.
        const plantNutrient = this.qualityOn ? plantMass * this.plantQ[cell]! : plantMass;
        let store = this.nutrientStore[i]! + plantNutrient * c.plantAssimilation + meatMass * c.meatAssimilation;
        this.assimClaim[cell] = this.assimClaim[cell]! + (store - this.nutrientStore[i]!);
        if (this.typeOn && this.photoGain[i]! > 0) {
          // A photosynthesizing cell eats nothing, so it draws a little nutrient from the soil (roots).
          let up = c.nutrientRootUptake * this.bodyMatter[i]!;
          if (up > this.nutrient[cell]!) up = this.nutrient[cell]!;
          this.nutrient[cell] = this.nutrient[cell]! - up;
          store += up;
        }
        // Some of the store is lost as dung every tick, here (so nutrient travels with animals), and anything over the cap spills out.
        let dung = store * c.nutrientTurnover;
        store -= dung;
        const cap = c.nutrientStoreCap * this.bodyMatter[i]!;
        if (store > cap) {
          dung += store - cap;
          store = cap;
        }
        this.detritus[cell] = this.detritus[cell]! + dung;
        this.nutrientStore[i] = store;
      }
      let toxinLoss = 0;
      if (this.toxOn) {
        const conc = this.corpseToxin[cell]!;
        if (meatRaw > 0 && conc > 0) {
          // Poisoned: the meal costs extra energy (lost as heat, on the upkeep line).
          toxinLoss = c.toxinStrength * conc * meatRaw;
          // A hunter poisoned soon after its own kill remembers the color of what it killed.
          if (this.lastKillTick[i]! > 0 && this.tick - this.lastKillTick[i]! <= 3) {
            const have = this.avoidStrength[i]!;
            const add = c.avoidLearn * conc;
            const now = have + add > 1 ? 1 : have + add;
            if (have <= 0) this.avoidHue[i] = this.lastKillHue[i]!;
            else {
              // Blend the new color in, weighted by how strong the new lesson is against the old memory (the short way round the wheel).
              let diff = this.lastKillHue[i]! - this.avoidHue[i]!;
              if (diff > 0.5) diff -= 1;
              else if (diff < -0.5) diff += 1;
              let hue = this.avoidHue[i]! + (diff * add) / (have + add);
              if (hue < 0) hue += 1;
              else if (hue >= 1) hue -= 1;
              this.avoidHue[i] = hue;
            }
            this.avoidStrength[i] = now;
          }
        }
        if (this.avoidStrength[i]! > 0) {
          const faded = this.avoidStrength[i]! * (1 - c.avoidFade);
          this.avoidStrength[i] = faded < 1e-4 ? 0 : faded;
        }
      }
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
      if (this.placeOn) this.rememberPlace(i, (plantGain + meatGain) / this.threshold[i]!);
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
        } else if (fraction > c.fatDepositAbove && !(c.fatBreeding === 1 && this.sexGeneOn && this.sexMode[i] === 2)) {
          // (With fatBreeding, an animal seeking a mate banks nothing: it is holding that energy to breed.)
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

      let basal = this.basalCost[i]! + toxinLoss;
      if (this.colonyInfoOn && c.colonyScaleSaving > 0 && this.colonyCount[i]! > 1) {
        // Economies of scale: a cell in a bigger colony costs a little less to keep (cells^-1/8, built from square roots).
        const eighthRoot = Math.sqrt(Math.sqrt(Math.sqrt(this.colonyCount[i]!)));
        basal -= this.basalCost[i]! * c.colonyScaleSaving * (1 - 1 / eighthRoot);
      }
      if (this.signalOn) {
        const gene = this.genes[i * GENE_COUNT + GENE.signal]!;
        if (gene > 0) basal += c.signalCost * gene * this.bondCount(i); // keeping each line of communication open costs energy
      }
      if (this.drinkOn) {
        // Thirst: water is used up faster in the heat and when running; beside water (or on soaked ground) it drinks its fill.
        let water = this.hydration[i]!;
        if (this.canDrink(cell)) water = 1;
        else {
          let rate = c.thirstRate;
          if (this.climateOn) {
            const hot = this.temperature[cell]! - c.thirstHeatAbove;
            if (hot > 0) rate *= 1 + c.thirstHeat * hot;
          }
          if (brainMode > 0) rate *= 1 + c.thirstMove * this.moveScale[i]!;
          water = water > rate ? water - rate : 0;
        }
        this.hydration[i] = water;
        // Dehydrated: the body costs more to run (energy lost as heat, on the upkeep line).
        if (water < c.thirstBelow) basal += this.basalCost[i]! * c.dehydrationCost * (1 - water / c.thirstBelow);
      }
      if (this.nutrientOn) {
        // Short of nutrient: the body works less well and costs more to run (energy lost as heat, on the upkeep line).
        const need = c.deficiencyBelow * this.bodyMatter[i]!;
        const have = this.nutrientStore[i]!;
        if (need > 0 && have < need) basal += this.basalCost[i]! * c.deficiencyCost * (1 - have / need);
      }
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
      if (this.stormOn && this.stormCell[cell] === 1) move *= c.evStormMoveCost; // fighting the wind
      if (this.climateBiomesOn && this.iced[cell] === 1) move *= c.iceMoveCost; // crossing ice
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

      // Fat pays for breeding: top energy up to the breeding level from fat if together they reach it.
      if (fatBreeding && energy < this.threshold[i]!) energy = this.mobilizeFat(i, this.threshold[i]!);
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
    const coldKeep = this.climateOn ? c.meatColdKeep : 0;
    const foulMean = this.foulOn ? this.meanFoul() : 0;
    const mineralize = c.detritusMineralizeRate;
    const halfSat = c.nutrientHalfSaturation;
    for (let cell = 0; cell < food.length; cell++) {
      // Eaten plants.
      const eatenPlants = plantClaim[cell]!;
      plantClaim[cell] = 0;
      const plantsTaken = eatenPlants < food[cell]! ? eatenPlants : food[cell]!;
      food[cell] = food[cell]! - plantsTaken;
      let waste = this.qualityOn ? plantsTaken * this.plantQ[cell]! : plantsTaken;

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
      if (this.nutrientOn) {
        // What the eaters kept went into their stores, not onto the ground.
        waste -= this.assimClaim[cell]!;
        this.assimClaim[cell] = 0;
      }

      // Rot: the corpse's energy is lost as heat, its matter becomes detritus.
      if (corpseMatter[cell]! > 0 || corpseEnergy[cell]! > 0) {
        let rot = meatDecay;
        if (coldKeep > 0) {
          // Meat keeps in the cold: the colder than the plants' best temperature, the slower it rots.
          let cold = (c.plantTempOptimum - this.temperature[cell]!) / c.plantTempTolerance;
          cold = cold < 0 ? 0 : cold > 1 ? 1 : cold;
          rot = meatDecay * (1 - coldKeep * cold);
        }
        const rottedEnergy = corpseEnergy[cell]! * rot;
        const rottedMatter = corpseMatter[cell]! * rot;
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

      // Erosion: ground that stays bare wears away (and recovers when covered). Soil health scales regrowth and the ceiling.
      let health = 1;
      let ceiling = this.foodCapacity[cell]!;
      if (this.erodeOn && ceiling > 0) {
        const ratio = food[cell]! / ceiling;
        health = this.soilHealth[cell]!;
        if (ratio < c.erosionBelow) health -= c.erosionRate;
        else if (ratio > c.erosionRecoverAbove) health += c.erosionRecovery;
        health = health < c.erosionMin ? c.erosionMin : health > 1 ? 1 : health;
        this.soilHealth[cell] = health;
        ceiling *= health;
      }
      if (this.ashOn) ceiling *= 1 + this.ash[cell]!; // ground enriched by a volcano holds more plants
      // Plants grow, limited by sunlight (the rate), nutrient, and room.
      const room = ceiling - food[cell]!;
      let potential = (this.foodRegrow[cell]! * soil) / (soil + halfSat);
      if (climateOn) potential *= this.growthFactor[cell]!;
      potential *= health;
      if (this.eventsOn) {
        // Disasters: a blight or a good year changes the growth rate, volcanic ash raises it (and the ceiling), and flooded ground grows nothing.
        potential *= this.evGrowthMult * this.evKindMult[this.plantKinds > 1 ? this.plantTypeOf[cell]! : 0]!;
        if (this.ashOn) potential *= 1 + this.ash[cell]!;
        if (this.floodOn && this.passable[cell] === 0) potential = 0;
      }
      if (this.foulOn) {
        // Fouling: ground that is much more crowded than average grows plants more slowly. Then the fouling fades a little.
        const excess = foulMean > 0 ? this.foul[cell]! / foulMean - c.foulFree : 0;
        if (excess > 0) potential /= 1 + c.foulGrowthEffect * excess;
        this.foul[cell] = this.foul[cell]! * (1 - c.foulDecay);
      }
      if (this.grazeOn) {
        // Overgrazing: a cell eaten bare gains damage, and damaged ground regrows slowly.
        const capacity = this.foodCapacity[cell]!;
        if (capacity > 0) {
          let damage = this.grazing[cell]!;
          if (food[cell]! < c.overgrazeBelow * capacity) damage += c.overgrazeDamage;
          else damage -= c.overgrazeHeal;
          damage = damage < 0 ? 0 : damage > 1 ? 1 : damage;
          this.grazing[cell] = damage;
          potential *= 1 - c.overgrazePenalty * damage;
        }
      }
      let growth = potential < soil ? potential : soil;
      if (growth > room) growth = room > 0 ? room : 0;
      if (this.qualityOn) {
        // Mode 2: new growth holds nutrient according to the soil, and the cell's plants are a weighted mix of old and new.
        const q = this.qualityFrom(soil);
        if (growth * q > soil) growth = q > 0 ? soil / q : 0;
        const total = food[cell]! + growth;
        if (total > 0) this.plantQ[cell] = (food[cell]! * this.plantQ[cell]! + growth * q) / total;
        soil -= growth * q;
      } else {
        soil -= growth;
      }
      food[cell] = food[cell]! + growth;
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
          const ready = c.mateReadyFraction * this.threshold[i]!;
          if (fatBreeding && this.energy[i]! < ready) this.mobilizeFat(i, ready);
          if (this.energy[i]! >= ready) this.partnerList[partnerCount++] = i;
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
        // Fat passed to young (fatProvision): each parent gives half as much as it would alone.
        const fatA = this.fatOn ? (this.fatStore[a]! * c.fatProvision * 0.5) / litter : 0;
        const fatB = this.fatOn ? (this.fatStore[b]! * c.fatProvision * 0.5) / litter : 0;
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
          const body = this.bodyMatter[child]!;
          // (With nutrient mode, each parent builds half the body from its own store; otherwise it comes from the soil.)
          const matterShort = this.nutrientOn ? this.nutrientStore[a]! < body / 2 || this.nutrientStore[b]! < body / 2 : nutrient[cell]! < body;
          if (matterShort || store < 0) {
            this.count--;
            this.nextId = savedNextId;
            this.noteBlockedBirth(matterShort, store < 0);
            continue;
          }
          if (this.nutrientOn) this.nutrientStore[child] = this.provision(a, body / 2, 0.5) + this.provision(b, body / 2, 0.5);
          else nutrient[cell] = nutrient[cell]! - body;
          this.energy[a] = this.energy[a]! - eachA;
          this.energy[b] = this.energy[b]! - eachB;
          if (this.trackOn) {
            this.learnSpent[a] = this.learnSpent[a]! + eachA;
            this.learnSpent[b] = this.learnSpent[b]! + eachB;
          }
          this.energy[child] = store;
          if (fatA + fatB > 0) {
            this.fatStore[a] = this.fatStore[a]! - fatA;
            this.fatStore[b] = this.fatStore[b]! - fatB;
            this.giveFat(child, fatA + fatB);
          }
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
        const fatEach = this.fatOn ? (this.fatStore[parent]! * c.fatProvision) / litter : 0;
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
          const body = this.bodyMatter[child]!;
          const matterShort = this.nutrientOn ? this.nutrientStore[parent]! < body : nutrient[cell]! < body;
          if (matterShort || store < 0) {
            // Cannot afford this baby right now: undo it. The parent keeps its energy and tries again later.
            this.count--;
            this.nextId = savedNextId;
            this.noteBlockedBirth(matterShort, store < 0);
            continue;
          }
          if (this.nutrientOn) this.nutrientStore[child] = this.provision(parent, body, 1);
          else nutrient[cell] = nutrient[cell]! - body;
          this.energy[parent] = this.energy[parent]! - each;
          if (this.trackOn) this.learnSpent[parent] = this.learnSpent[parent]! + each;
          this.energy[child] = store;
          if (fatEach > 0) {
            this.fatStore[parent] = this.fatStore[parent]! - fatEach;
            this.giveFat(child, fatEach);
          }
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
        const matter = this.bodyMatter[i]! + this.takeStore(i);
        if (this.toxOn) this.foldToxin(cell, corpseMatter[cell]!, matter, this.genes[i * GENE_COUNT + GENE.toxicity]!);
        corpseMatter[cell] = corpseMatter[cell]! + matter;
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
    if (this.toxOn) {
      // Remember what was killed and when, in case the meal turns out to be poisonous.
      this.lastKillHue[attacker] = this.genes[prey * GENE_COUNT + GENE.hue]!;
      this.lastKillTick[attacker] = this.tick + 1;
    }
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
    const preyMatter = this.bodyMatter[prey]! + this.takeStore(prey);
    if (this.toxOn) this.foldToxin(cell, this.corpseMatter[cell]!, preyMatter, this.genes[prey * GENE_COUNT + GENE.toxicity]!);
    this.corpseMatter[cell] = this.corpseMatter[cell]! + preyMatter;
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
      if (this.learnOn) {
        this.learnDelta.copyWithin(to * LEARN_SLOTS, from * LEARN_SLOTS, (from + 1) * LEARN_SLOTS);
        this.learnTrace.copyWithin(to * LEARN_SLOTS, from * LEARN_SLOTS, (from + 1) * LEARN_SLOTS);
      }
      if (this.trackOn) {
        this.learnAvg[to] = this.learnAvg[from]!;
        this.learnPrevE[to] = this.learnPrevE[from]!;
        this.learnSpent[to] = this.learnSpent[from]!;
      }
      if (this.placeOn) {
        this.placeX.copyWithin(to * PLACE_SLOTS, from * PLACE_SLOTS, (from + 1) * PLACE_SLOTS);
        this.placeY.copyWithin(to * PLACE_SLOTS, from * PLACE_SLOTS, (from + 1) * PLACE_SLOTS);
        this.placeVal.copyWithin(to * PLACE_SLOTS, from * PLACE_SLOTS, (from + 1) * PLACE_SLOTS);
        this.placeSlots[to] = this.placeSlots[from]!;
      }
      if (this.wmOn) this.wmCells[to] = this.wmCells[from]!;
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
    if (this.learnOn) {
      organism("learnDelta", this.learnDelta, LEARN_SLOTS);
      organism("learnTrace", this.learnTrace, LEARN_SLOTS);
    }
    if (this.trackOn) {
      organism("learnAvg", this.learnAvg);
      organism("learnPrevE", this.learnPrevE);
      organism("learnSpent", this.learnSpent);
    }
    if (this.placeOn) {
      organism("placeX", this.placeX, PLACE_SLOTS);
      organism("placeY", this.placeY, PLACE_SLOTS);
      organism("placeVal", this.placeVal, PLACE_SLOTS);
      organism("placeSlots", this.placeSlots);
    }
    if (this.wmOn) organism("wmCells", this.wmCells);
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
      blockedBirthsSoil: this.blockedBirthsSoil,
      blockedBirthsEnergy: this.blockedBirthsEnergy,
      blockedBirthsBoth: this.blockedBirthsBoth,
      totalAttacks: this.totalAttacks,
      seen: [this.seenScavenger, this.seenKill, this.seenPredator, this.seenCarnivore],
      events: this.events,
      worldEvents: this.worldEvents,
      catastrophe: [this.catKind, this.catStart, this.catEnd],
      brainLayout: [INPUT_COUNT, CONN_MAX],
      // (Only in worlds with disaster events, so older saved worlds still load.)
      ...(this.eventsOn ? { activeEvents: this.activeEvents, eventRng: Array.from(this.eventRng.getState()) } : {}),
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
      // (Each of these only in worlds where its feature is on, so worlds saved before it existed still load.)
      ...(this.toxOn ? ([["corpseToxin", this.corpseToxin]] as [string, SnapshotArray][]) : []),
      ...(this.erodeOn ? ([["soilHealth", this.soilHealth]] as [string, SnapshotArray][]) : []),
      ...(this.ashOn ? ([["ash", this.ash]] as [string, SnapshotArray][]) : []),
      ...(this.fireOn ? ([["fireScar", this.fireScar]] as [string, SnapshotArray][]) : []),
      ...(this.qualityOn ? ([["plantQ", this.plantQ]] as [string, SnapshotArray][]) : []),
      ...(this.foulOn ? ([["foul", this.foul]] as [string, SnapshotArray][]) : []),
      ...(this.grazeOn ? ([["grazing", this.grazing]] as [string, SnapshotArray][]) : []),
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
      ...(this.mateScentOn ? ([["matePlantScent", this.matePlantScent], ["mateMeatScent", this.mateMeatScent]] as [string, SnapshotArray][]) : []),
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
      blockedBirthsSoil?: number;
      blockedBirthsEnergy?: number;
      blockedBirthsBoth?: number;
      totalAttacks: number;
      seen: boolean[];
      events: SimEvent[];
      worldEvents: WorldEvent[];
      brainLayout?: [number, number];
      activeEvents?: ActiveEvent[];
      eventRng?: number[];
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
    // A world saved before a gene was added has fewer genes per animal. Copy each animal's genes
    // across at its own spacing so they line up (genes it never had stay 0: they are not in use there).
    const savedGenes = snapshot.arrays.genes;
    const savedStride = savedGenes && s.count > 0 ? savedGenes.length / s.count : GENE_COUNT;
    if (savedGenes && savedStride !== GENE_COUNT) {
      if (!Number.isInteger(savedStride) || savedStride > GENE_COUNT) throw new Error(`The saved world's "genes" does not fit this world`);
      this.genes.fill(0);
      for (let i = 0; i < s.count; i++) for (let k = 0; k < savedStride; k++) this.genes[i * GENE_COUNT + k] = savedGenes[i * savedStride + k]!;
    } else {
      take("genes", this.genes);
    }
    take("cellOf", this.cellOf);
    if (this.bondsOn) {
      take("bondTo", this.bondTo);
      // take() clears with zeros; an empty bond slot is -1, so mark every slot past the saved cells empty.
      this.bondTo.fill(-1, s.count * BOND_SLOTS);
    }
    // A world saved before Phase 8e has the older brain layout (fewer inputs, fewer connection slots): renumber it.
    const [savedInputs, savedSlots] = s.brainLayout ?? [BRAIN_LAYOUTS[0]!.inputs, BRAIN_LAYOUTS[0]!.slots];
    if (this.config.brainMode > 0 && (savedInputs !== INPUT_COUNT || savedSlots !== CONN_MAX)) {
      const from = snapshot.arrays.brainFrom as Uint8Array;
      const to = snapshot.arrays.brainTo as Uint8Array;
      const weight = snapshot.arrays.brainWeight as Float32Array;
      const renumber = (node: number): number => renumberOldNode(node, savedInputs);
      this.brainFrom.fill(0);
      this.brainTo.fill(0);
      this.brainWeight.fill(0);
      for (let i = 0; i < s.count; i++) {
        for (let k = 0; k < this.brainCount[i]!; k++) {
          this.brainFrom[i * CONN_MAX + k] = renumber(from[i * savedSlots + k]!);
          this.brainTo[i * CONN_MAX + k] = renumber(to[i * savedSlots + k]!);
          this.brainWeight[i * CONN_MAX + k] = weight[i * savedSlots + k]!;
        }
      }
    } else {
      take("brainFrom", this.brainFrom);
      take("brainTo", this.brainTo);
      take("brainWeight", this.brainWeight);
    }
    if (this.memoryOn) take("memState", this.memState);
    if (this.learnOn) {
      take("learnDelta", this.learnDelta);
      take("learnTrace", this.learnTrace);
    }
    if (this.trackOn) {
      take("learnAvg", this.learnAvg);
      take("learnPrevE", this.learnPrevE);
      take("learnSpent", this.learnSpent);
    }
    if (this.placeOn) {
      take("placeX", this.placeX);
      take("placeY", this.placeY);
      take("placeVal", this.placeVal);
      take("placeSlots", this.placeSlots);
    }
    if (this.wmOn) take("wmCells", this.wmCells);
    if (this.chemOn) take("chem", this.chem);
    // (Fire scars came a little after fires did; a world saved in between simply has none.)
    for (const [name, array] of this.landArrays()) if (name !== "fireScar" || snapshot.arrays[name]) take(name, array);
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
    // (A world saved before the split was added has no breakdown: it starts at zero and counts from here.)
    this.blockedBirthsSoil = s.blockedBirthsSoil ?? 0;
    this.blockedBirthsEnergy = s.blockedBirthsEnergy ?? 0;
    this.blockedBirthsBoth = s.blockedBirthsBoth ?? 0;
    this.totalAttacks = s.totalAttacks;
    [this.seenScavenger, this.seenKill, this.seenPredator, this.seenCarnivore] = s.seen as [boolean, boolean, boolean, boolean];
    this.events.length = 0;
    this.events.push(...s.events);
    this.worldEvents.length = 0;
    this.worldEvents.push(...s.worldEvents);
    [this.catKind, this.catStart, this.catEnd] = s.catastrophe;
    this.activeEvents = (s.activeEvents ?? []).map((e) => ({ ...e, cells: [...e.cells], left: [...e.left] }));
    this.eventRng.setState(newFuture ? new Rng(((this.seed + this.tick) ^ 0x5bd1e995) >>> 0).getState() : ((s.eventRng ?? Array.from(this.eventRng.getState())) as unknown as [number, number, number, number]));
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
      case "toxicity":
      case "signal":
      case "learning":
      case "placeMemory":
      case "workingMemory":
      case "pickiness":
      case "eye":
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

  /**
   * What the average living organism is paying per tick right now, split into every part.
   * Read only: it changes nothing and draws no random numbers. It repeats the arithmetic of the
   * upkeep code in step() (keep the two in step; a test holds this one to the ledger). The
   * birth-time upkeep is a chain of multipliers, so each one's share is taken in the order the
   * code applies them, which makes the parts add up exactly to the whole. Poison from a meal
   * (toxicity) is left out: it is only known inside the tick.
   */
  costBreakdown(include?: (i: number) => boolean): CostBreakdown {
    const c = this.config;
    const out: CostBreakdown = {
      body: 0, repair: 0, torporGene: 0, load: 0, luck: 0, toxinGene: 0,
      colonySaving: 0, signal: 0, thirst: 0, deficiency: 0, wear: 0, sickness: 0, stressCalm: 0, fat: 0, torporRest: 0, thermal: 0,
      upkeep: 0, movement: 0, sensing: 0, attack: 0, armor: 0, brain: 0, total: 0,
    };
    const n = this.count;
    if (n === 0) return out;
    const cs = c.foodCellSize;
    const brains = c.brainMode > 0;
    let counted = 0;
    for (let i = 0; i < n; i++) {
      // Optionally only some animals (say, one diet group); the average is over those.
      if (include && !include(i)) continue;
      counted++;
      const g = i * GENE_COUNT;
      const cell = Math.floor(this.y[i]! / cs) * this.gridWidth + Math.floor(this.x[i]! / cs);
      // Birth-time upkeep, undone from the last multiplier back to the first.
      const cached = this.basalCost[i]!;
      let v = cached;
      if (this.toxOn) {
        const before = v / (1 + c.toxinUpkeep * this.genes[g + GENE.toxicity]!);
        out.toxinGene += v - before;
        v = before;
      }
      if (this.luckOn) {
        const before = v / this.upkeepLuck[i]!;
        out.luck += v - before;
        v = before;
      }
      if (this.loadOn) {
        const spots = this.badSpots(i);
        const before = v / (1 + c.mutationLoadCost * spots + c.mutationLoadSynergy * spots * spots);
        out.load += v - before;
        v = before;
      }
      if (this.torporOn) {
        const before = v / (1 + c.torporUpkeep * this.genes[g + GENE.torpor]!);
        out.torporGene += v - before;
        v = before;
      }
      if (this.agingOn) {
        const before = v / (1 + c.agingRepairCoeff * this.genes[g + GENE.lifespan]!);
        out.repair += v - before;
        v = before;
      }
      out.body += v;

      // Per-tick extras, in the order step() applies them.
      let basal = cached;
      if (this.colonyInfoOn && c.colonyScaleSaving > 0 && this.colonyCount[i]! > 1) {
        const saving = -cached * c.colonyScaleSaving * (1 - 1 / Math.sqrt(Math.sqrt(Math.sqrt(this.colonyCount[i]!))));
        out.colonySaving += saving;
        basal += saving;
      }
      if (this.signalOn) {
        const gene = this.genes[g + GENE.signal]!;
        if (gene > 0) {
          const s = c.signalCost * gene * this.bondCount(i);
          out.signal += s;
          basal += s;
        }
      }
      if (this.drinkOn) {
        const water = this.hydration[i]!;
        if (water < c.thirstBelow) {
          const s = cached * c.dehydrationCost * (1 - water / c.thirstBelow);
          out.thirst += s;
          basal += s;
        }
      }
      if (this.nutrientOn) {
        const need = c.deficiencyBelow * this.bodyMatter[i]!;
        const have = this.nutrientStore[i]!;
        if (need > 0 && have < need) {
          const s = cached * c.deficiencyCost * (1 - have / need);
          out.deficiency += s;
          basal += s;
        }
      }
      if (this.agingOn) {
        const prime = this.lifespan[i]! * c.agingPrimeFraction;
        const age = this.age[i]!;
        if (age > prime) {
          const worn = (age - prime) / (this.lifespan[i]! - prime);
          const s = c.agingCoeff * cached * worn * worn;
          out.wear += s;
          basal += s;
        }
      }
      if (this.diseaseOn && this.sickFor[i]! > 0) {
        out.sickness += c.diseaseCost * cached;
        basal += c.diseaseCost * cached;
      }
      if (this.bodyChemOn) {
        const at = i * 4;
        const factor = c.chemStressUpkeep * this.genes[g + GENE.stressResponse]! * this.chem[at + 1]! - c.chemCalmSaving * this.genes[g + GENE.calmResponse]! * this.chem[at + 3]!;
        out.stressCalm += basal * factor;
        basal += basal * factor;
      }
      if (this.fatOn) {
        const s = c.fatUpkeep * (this.fatStore[i]! / this.threshold[i]!) * cached;
        out.fat += s;
        basal += s;
      }
      if (this.torporOn) {
        const s = -basal * c.torporSaving * this.torpid[i]!;
        out.torporRest += s;
        basal += s;
      }
      if (this.thermalOn) {
        const off = this.temperature[cell]! - this.thermalPref[i]!;
        const excess = (off < 0 ? -off : off) - c.thermalTolerance;
        if (excess > 0) {
          const s = this.thermalScale[i]! * excess * excess;
          out.thermal += s;
          basal += s;
        }
      }
      out.upkeep += basal;

      let move = brains ? this.moveCost[i]! * this.moveScale[i]! * this.moveScale[i]! : this.moveCost[i]!;
      if (this.terrainOn) move *= this.terrainMove[cell]!;
      if (this.stormOn && this.stormCell[cell] === 1) move *= c.evStormMoveCost;
      if (this.climateBiomesOn && this.iced[cell] === 1) move *= c.iceMoveCost;
      if (this.fatOn) move *= 1 + c.fatMoveCost * (this.fatStore[i]! / this.threshold[i]!);
      if (this.torporOn) move *= (1 - this.torpid[i]!) * (1 - this.torpid[i]!);
      if (this.staminaOn) move += this.staminaCost[i]!;
      out.movement += move;
      out.sensing += this.senseCost[i]!;
      out.attack += this.attackCost[i]! + (this.attempted[i] === 1 ? this.attemptCost[i]! : 0);
      out.armor += this.armorCost[i]!;
      if (brains) out.brain += this.brainCost[i]!;
    }
    out.total = out.upkeep + out.movement + out.sensing + out.attack + out.armor + out.brain;
    if (counted === 0) return out;
    for (const key of Object.keys(out) as (keyof CostBreakdown)[]) out[key] /= counted;
    return out;
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
      nutrientStore: this.nutrientStats(),
      hydration: this.hydrationStats(),
      totalBirths: this.totalBirths,
      sexualBirths: this.sexualBirths,
      totalDeaths: this.totalDeaths,
      totalKills: this.totalKills,
      totalStarved: this.totalStarved,
      blockedBirths: this.blockedBirths,
      blockedBirthsSoil: this.blockedBirthsSoil,
      blockedBirthsEnergy: this.blockedBirthsEnergy,
      blockedBirthsBoth: this.blockedBirthsBoth,
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
    let plants = 0;
    if (this.qualityOn) for (let cell = 0; cell < this.food.length; cell++) plants += this.food[cell]! * this.plantQ[cell]!;
    else plants = sumOf(this.food);
    const corpses = sumOf(this.corpseMatter);
    const detritus = sumOf(this.detritus);
    let stores = 0;
    if (this.nutrientOn) for (let i = 0; i < this.count; i++) stores += this.nutrientStore[i]!;
    return { soilNutrient, plants, corpses, detritus, bodies, stores, total: soilNutrient + plants + corpses + detritus + bodies + stores };
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

  /** The food-grid cell organism i stands in (read-only; for tools such as the experiment runner). */
  cellIndexOf(i: number): number {
    return this.cellOf[i]!;
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
    if (this.nutrientOn) mixBits(this.nutrientStore, n);
    if (this.qualityOn) mixBits(this.plantQ, this.plantQ.length);
    if (this.drinkOn) mixBits(this.hydration, n);
    if (this.signalOn) {
      mixBits(this.sharedThreatNear, n);
      mixBits(this.sharedFoodNear, n);
    }
    if (this.toxOn) {
      mixBits(this.avoidStrength, n);
      mixBits(this.avoidHue, n);
    }
    if (this.eventsOn) {
      for (const word of this.eventRng.getState()) mix(word);
      mix(this.activeEvents.length);
      if (this.ashOn) mixBits(this.ash, this.ash.length);
      if (this.fireOn) for (let cell = 0; cell < this.fireScar.length; cell++) mix(this.fireScar[cell]!);
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
