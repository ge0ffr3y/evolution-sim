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

  // --- Population ---
  initialOrganisms: number;
  /** Hard ceiling on living organisms (memory limit). Births are skipped at the ceiling. */
  maxOrganisms: number;

  // --- Starting traits (the first generation is identical) ---
  initialSpeed: number;
  initialSize: number;
  /** Fraction of the reproduction threshold that new organisms start with. */
  initialEnergyFraction: number;

  // --- Trait limits ---
  speedMin: number;
  speedMax: number;
  sizeMin: number;
  sizeMax: number;

  // --- Behavior (temporary random wandering) ---
  /** Standard deviation of the random turn each tick, in radians. */
  turnStd: number;

  // --- Energy economy ---
  /** Most food an organism can eat per tick, per unit of size. */
  biteRate: number;
  /** Energy gained per unit of food eaten. */
  energyPerFood: number;
  /** Energy burned per tick just to stay alive, per unit of size. */
  basalCostPerSize: number;
  /** Energy burned per tick moving: this x size x speed x speed. */
  moveCostPerSizeSpeedSq: number;

  // --- Reproduction ---
  /** An organism splits when its energy reaches this x its size. */
  reproThresholdPerSize: number;
  /** Fraction of the parent's energy given to the child. */
  offspringEnergyFraction: number;

  // --- Mutation ---
  /** Standard deviation of the speed change between parent and child. */
  mutationStdSpeed: number;
  /** Standard deviation of the size change between parent and child. */
  mutationStdSize: number;
}

export const DEFAULT_CONFIG: Readonly<SimConfig> = {
  worldWidth: 256,
  worldHeight: 256,
  foodCellSize: 8,

  foodCap: 10,
  foodRegrowPerTick: 0.08,
  initialFoodFraction: 1,

  initialOrganisms: 200,
  maxOrganisms: 20000,

  initialSpeed: 1,
  initialSize: 1,
  initialEnergyFraction: 0.6,

  speedMin: 0.1,
  speedMax: 4,
  sizeMin: 0.3,
  sizeMax: 4,

  turnStd: 0.3,

  biteRate: 1,
  energyPerFood: 1,
  basalCostPerSize: 0.05,
  moveCostPerSizeSpeedSq: 0.01,

  reproThresholdPerSize: 30,
  offspringEnergyFraction: 0.5,

  mutationStdSpeed: 0.05,
  mutationStdSize: 0.03,
};

/** Build a full config from the defaults plus any overrides, and check it makes sense. */
export function makeConfig(overrides: Partial<SimConfig> = {}): SimConfig {
  const config: SimConfig = { ...DEFAULT_CONFIG, ...overrides };

  const problems: string[] = [];
  if (config.worldWidth % config.foodCellSize !== 0) problems.push("worldWidth must be a multiple of foodCellSize");
  if (config.worldHeight % config.foodCellSize !== 0) problems.push("worldHeight must be a multiple of foodCellSize");
  if (config.foodCellSize <= 0) problems.push("foodCellSize must be positive");
  if (config.initialOrganisms > config.maxOrganisms) problems.push("initialOrganisms exceeds maxOrganisms");
  if (config.speedMin > config.speedMax) problems.push("speedMin exceeds speedMax");
  if (config.sizeMin > config.sizeMax) problems.push("sizeMin exceeds sizeMax");
  if (config.speedMax >= Math.min(config.worldWidth, config.worldHeight)) problems.push("speedMax must be smaller than the world");
  if (config.offspringEnergyFraction <= 0 || config.offspringEnergyFraction >= 1) {
    problems.push("offspringEnergyFraction must be between 0 and 1");
  }
  if (problems.length > 0) throw new Error(`Invalid sim config: ${problems.join("; ")}`);

  return config;
}
