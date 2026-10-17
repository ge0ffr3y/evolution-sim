/**
 * Every tuning number for the simulation lives here, and nowhere else.
 * To change how the world behaves, change a value in this object (or pass an
 * override to makeConfig). Never hard-code a number in the simulation logic.
 */
export interface SimConfig {
  // --- World ---
  /** World width in world units. Must be a whole multiple of foodCellSize. */
  worldWidth: number;
  /** World height in world units. Must be a whole multiple of foodCellSize. */
  worldHeight: number;
  /** Side length of one square food cell. */
  foodCellSize: number;

  // --- Food (plants) ---
  /** Most food one cell can hold. */
  foodCap: number;
  /** Food added to every cell each tick, up to foodCap. */
  foodRegrowPerTick: number;
  /** Starting food as a fraction of foodCap (0 to 1). */
  initialFoodFraction: number;
  /**
   * How uneven the land is: 0 means every cell is equally fertile; 0.8 means
   * cells range from 20% to 180% of the normal food cap and regrowth. The map
   * is generated from the seed, so each seed gets its own landscape.
   */
  fertilityVariation: number;
  /** Size of one fertile or barren patch, in food cells. Must divide the grid evenly. */
  fertilityScale: number;

  // --- Population ---
  initialOrganisms: number;
  /** Hard ceiling on living organisms (memory limit). Births are skipped at the ceiling. */
  maxOrganisms: number;

  // --- First generation (identical bodies, random color) ---
  initialSize: number;
  initialSpeed: number;
  initialSenseRange: number;
  initialMetabolism: number;
  /** Starting mutation rate: the typical size of a gene change between parent and child. */
  initialMutationRate: number;
  /** Fraction of the reproduction threshold that new organisms start with. */
  initialEnergyFraction: number;

  // --- Trait limits: each gene (0 to 1) is stretched across its trait's range ---
  sizeMin: number;
  sizeMax: number;
  speedMin: number;
  speedMax: number;
  /** How far an organism can sense food, in world units. 0 means no sensing at all. */
  senseRangeMin: number;
  senseRangeMax: number;
  /** Metabolism is a speed multiplier on eating AND upkeep: a fast burner or a thrifty saver. */
  metabolismMin: number;
  metabolismMax: number;
  mutationRateMin: number;
  mutationRateMax: number;
  /** How much the mutation-rate gene itself changes between generations (in gene units). */
  metaMutationStd: number;

  // --- Behavior (temporary, replaced by evolved brains in Phase 4) ---
  /** Standard deviation of the random turn each tick, in radians. */
  turnStd: number;
  /** How strongly an organism with sensing steers toward richer food nearby. */
  steerGain: number;

  // --- Energy economy ---
  /** Most food an organism can eat per tick, per unit of metabolism and body size. */
  biteRate: number;
  /**
   * How a body's eating power grows with size. 0 grows like size^0.75, the same
   * as upkeep (so size alone is a wash); 1 grows like size, so bigger bodies
   * out-eat smaller ones more than they out-cost them.
   */
  biteSizeBlend: number;
  /**
   * How food is split when a cell has less than its occupants want. 0 shares it
   * in proportion to eating power. 1 shares it in proportion to the square of
   * eating power, so a big eater in a crowded cell takes most of the food (and
   * small eaters do best where it is not crowded). 2 uses the cube, which is
   * even more winner-take-all. Values in between blend the neighbors.
   */
  contestStrength: number;
  /** Energy gained per unit of food eaten. */
  energyPerFood: number;
  /** Upkeep per tick: this x metabolism x size^0.75 (Kleiber's law). */
  basalCostCoeff: number;
  /** Movement per tick: this x size x speed x speed. */
  moveCostCoeff: number;
  /** Sensing per tick: this x sense range. */
  senseCostCoeff: number;

  // --- Reproduction ---
  /** An organism splits when its energy reaches this x its size. */
  reproThresholdPerSize: number;
  /** Fraction of the parent's energy given to the child. */
  offspringEnergyFraction: number;
}

export const DEFAULT_CONFIG: Readonly<SimConfig> = {
  worldWidth: 256,
  worldHeight: 256,
  foodCellSize: 8,

  foodCap: 10,
  foodRegrowPerTick: 0.08,
  initialFoodFraction: 1,
  fertilityVariation: 0.9,
  fertilityScale: 8,

  initialOrganisms: 200,
  maxOrganisms: 20000,

  initialSize: 1,
  initialSpeed: 1,
  initialSenseRange: 0,
  initialMetabolism: 1,
  initialMutationRate: 0.01,
  initialEnergyFraction: 0.6,

  sizeMin: 0.3,
  sizeMax: 4,
  speedMin: 0.1,
  speedMax: 4,
  senseRangeMin: 0,
  senseRangeMax: 16,
  metabolismMin: 0.5,
  metabolismMax: 2,
  mutationRateMin: 0.001,
  mutationRateMax: 0.05,
  metaMutationStd: 0.05,

  turnStd: 0.3,
  steerGain: 3,

  biteRate: 1,
  biteSizeBlend: 1,
  contestStrength: 2,
  energyPerFood: 1,
  basalCostCoeff: 0.05,
  moveCostCoeff: 0.01,
  senseCostCoeff: 0.0005,

  reproThresholdPerSize: 30,
  offspringEnergyFraction: 0.5,
};

export const CONFIG_KEYS = Object.keys(DEFAULT_CONFIG) as (keyof SimConfig)[];

/**
 * Check a loosely-typed object (for example parsed from a JSON preset file) and
 * return it as config overrides. Unknown names and non-numbers are rejected, so
 * a typo in a preset fails loudly instead of being silently ignored.
 */
export function parseConfigOverrides(input: unknown): Partial<SimConfig> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("Config must be an object of name: number pairs");
  }
  const overrides: Record<string, number> = {};
  for (const [name, value] of Object.entries(input)) {
    if (!(name in DEFAULT_CONFIG)) throw new Error(`Unknown config setting "${name}"`);
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`Setting "${name}" needs a number, got ${JSON.stringify(value)}`);
    }
    overrides[name] = value;
  }
  return overrides as Partial<SimConfig>;
}

/** Build a full config from the defaults plus any overrides, and check it makes sense. */
export function makeConfig(overrides: Partial<SimConfig> = {}): SimConfig {
  const c: SimConfig = { ...DEFAULT_CONFIG, ...overrides };

  const problems: string[] = [];
  if (c.foodCellSize <= 0) problems.push("foodCellSize must be positive");
  if (c.worldWidth % c.foodCellSize !== 0) problems.push("worldWidth must be a multiple of foodCellSize");
  if (c.worldHeight % c.foodCellSize !== 0) problems.push("worldHeight must be a multiple of foodCellSize");
  if (c.initialOrganisms > c.maxOrganisms) problems.push("initialOrganisms exceeds maxOrganisms");
  if (c.offspringEnergyFraction <= 0 || c.offspringEnergyFraction >= 1) {
    problems.push("offspringEnergyFraction must be between 0 and 1");
  }

  const ranges: [string, number, number, number][] = [
    ["size", c.sizeMin, c.sizeMax, c.initialSize],
    ["speed", c.speedMin, c.speedMax, c.initialSpeed],
    ["senseRange", c.senseRangeMin, c.senseRangeMax, c.initialSenseRange],
    ["metabolism", c.metabolismMin, c.metabolismMax, c.initialMetabolism],
    ["mutationRate", c.mutationRateMin, c.mutationRateMax, c.initialMutationRate],
  ];
  for (const [name, min, max, start] of ranges) {
    if (min > max) problems.push(`${name}Min exceeds ${name}Max`);
    if (start < min || start > max) problems.push(`initial ${name} is outside its allowed range`);
  }
  if (c.sizeMin <= 0) problems.push("sizeMin must be positive");
  if (c.metabolismMin <= 0) problems.push("metabolismMin must be positive");
  if (c.fertilityVariation < 0 || c.fertilityVariation >= 1) problems.push("fertilityVariation must be from 0 up to (but not including) 1");
  if (c.biteSizeBlend < 0 || c.biteSizeBlend > 1) problems.push("biteSizeBlend must be between 0 and 1");
  if (c.contestStrength < 0 || c.contestStrength > 2) problems.push("contestStrength must be between 0 and 2");
  if (!Number.isInteger(c.fertilityScale) || c.fertilityScale < 1) problems.push("fertilityScale must be a whole number of cells, 1 or more");
  else if (
    (c.worldWidth / c.foodCellSize) % c.fertilityScale !== 0 ||
    (c.worldHeight / c.foodCellSize) % c.fertilityScale !== 0
  ) {
    problems.push("fertilityScale must divide the food grid evenly");
  }
  if (c.speedMax >= Math.min(c.worldWidth, c.worldHeight)) problems.push("speedMax must be smaller than the world");
  if (c.senseRangeMax >= Math.min(c.worldWidth, c.worldHeight) / 2) problems.push("senseRangeMax must be under half the world");

  if (problems.length > 0) throw new Error(`Invalid sim config: ${problems.join("; ")}`);
  return c;
}
