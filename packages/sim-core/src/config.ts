import { CONN_MAX, HIDDEN_MAX, INPUT_COUNT, OUTPUT_COUNT } from "./brain";

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
  /**
   * The most plant food a cell can grow per tick when soil nutrients are plentiful
   * (the sunlight-limited rate). Plants never grow past foodCap, and need soil
   * nutrients to grow at all.
   */
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
  /**
   * Ground less fertile than this (1 = average fertility) holds and grows no plants at all, so plants
   * grow only in patches, oases, with barren land between them. 0 = off. Needs fertilityVariation.
   */
  barrenBelow: number;

  // --- Soil, bodies and decay (the matter loop) ---
  /** Soil nutrients in every cell at the start. Plants turn nutrients into food. */
  initialNutrientPerCell: number;
  /** Plants grow at half their top speed when a cell holds this much nutrient. */
  nutrientHalfSaturation: number;
  /** Nutrient locked into a newborn's body, per unit of size. Taken from the soil it is born on. */
  bodyMatterPerSize: number;
  /** Energy locked into a body, per unit of size. Released as meat when it dies. */
  bodyEnergyPerSize: number;
  /** Fraction of the meat (and its energy) in a cell that rots away each tick. */
  meatDecayRate: number;
  /** Fraction of the detritus in a cell that turns back into soil nutrient each tick. */
  detritusMineralizeRate: number;

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
  /** Diet: 0 eats only plants, 1 eats only meat. Everyone starts as a plant eater. */
  initialDiet: number;
  /** Attack and armor start at zero: nobody starts out able to hunt or defend. */
  initialAttack: number;
  initialArmor: number;
  /** Starting sprint reserve of the first generation (see sprintFatigue). */
  initialStamina: number;
  /** Starting preferred temperature of the first generation (0 to 1, see thermalCostCoeff). */
  initialThermal: number;
  /** Starting lifespan (ticks) and litter size of the first generation. */
  initialLifespan: number;
  initialLitter: number;
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
  dietMin: number;
  dietMax: number;
  attackMin: number;
  attackMax: number;
  armorMin: number;
  armorMax: number;
  /** Range of the stamina gene: the biggest sprint reserve, counted in ticks of flat-out running. */
  staminaMin: number;
  staminaMax: number;
  /** Range of the thermal gene: the temperature an organism is comfortable at. */
  thermalMin: number;
  thermalMax: number;
  /** Range of the lifespan gene, in ticks (see agingCoeff), and of the litter gene (babies per birth). */
  lifespanMin: number;
  lifespanMax: number;
  litterMin: number;
  litterMax: number;
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
  /**
   * How much a diet specialist outperforms a generalist. A pure plant eater digests
   * plants at full efficiency; each step toward meat costs this fraction of plant
   * efficiency per unit of diet (and the reverse for a meat eater). 0 = no penalty.
   */
  dietSpecialization: number;

  // --- Attack and defense ---
  /** Keeping weapons ready costs this x attack x size per tick. */
  attackCostCoeff: number;
  /** Each attack attempt costs this x size. */
  attackAttemptCost: number;
  /** Carrying armor costs this x armor x size per tick, and slows movement (see armorMoveFactor). */
  armorCostCoeff: number;
  /** Armor makes movement this much more expensive per unit of armor. */
  armorMoveFactor: number;
  /** Every body has at least this much natural defense, even with zero armor. */
  armorBase: number;
  /** An organism only tries to attack if its attack trait is at least this. */
  attackThreshold: number;
  /** How far an attacker can reach: this + reachPerSize x its size, in world units. */
  reachBase: number;
  reachPerSize: number;
  /** An attacker only goes after prey no bigger than this multiple of its own size. */
  preyMaxSizeRatio: number;
  /**
   * Fighting is harder for an organism that cannot digest meat: attack costs are
   * multiplied by 1 + this x (1 - diet). A plant specialist pays the full penalty;
   * a meat specialist pays none. 0 means everyone fights at the same price.
   */
  herbivoreAttackPenalty: number;
  /** After a kill, an attacker needs this many ticks to deal with its prey before it can attack again. */
  killCooldown: number;

  // --- Senses and brains ---
  /**
   * 0 = no brains: organisms wander at random and steer toward food with a fixed rule
   * (the Phase 3 behavior, kept as the control). 1 = every organism has a small neural
   * network with a fixed layout whose weights evolve. 2 = the layout itself can evolve
   * (connections and hidden units can be added and removed).
   */
  brainMode: number;
  /** Hidden units in the fixed-layout brain (mode 1). */
  brainHidden: number;
  /**
   * Phase 11: the most thinking units an evolvable brain (mode 2) can grow, up to 64. 16 was the old fixed
   * limit and is the default, so older worlds play out exactly as before.
   */
  brainHiddenMax: number;
  /**
   * Phase 11, deeper brains (0 = off; needs brainMode 2): thinking units can feed other thinking units. Units
   * are worked out in number order: a unit feeding a later one passes on this thought's value (depth, ideas
   * built on ideas), and a unit feeding itself or an earlier one passes on its value from the previous thought
   * (a loop, so a brain can hold a thought or keep a rhythm). Mutations can then add unit-to-unit connections
   * and split any connection with a new unit. Each unit's last value is saved with the world.
   */
  brainDepth: number;
  /** Brains sense the nearest water up to this far away (world units): the "water: how far" sense reads 1 at this distance or more. */
  brainWaterRange: number;
  /**
   * How far every organism with a brain can see, as a baseline. The sense-range gene adds
   * extra reach on top (at an energy cost). Without a baseline, vision would be selected
   * away before any brain had learned to use it.
   */
  brainVisionRange: number;
  /** A brain thinks once every this many ticks (and keeps its last decision in between). */
  brainEvery: number;
  /** Radians per tick of turning when the brain's turn output is at its maximum. */
  brainTurnMax: number;
  /** The random wobble in heading that organisms with brains keep (they do not need as much as wanderers). */
  brainTurnNoise: number;
  /** Standing still lets an organism eat up to this much faster (a full stop gets the full bonus). */
  brainStillEatBonus: number;
  /** A brain can hold back an attack by driving its attack output below this. */
  brainAttackGate: number;
  /** Chance that each connection weight changes when a baby is born, and by how much (typically). */
  brainWeightMutationProb: number;
  brainWeightMutationStd: number;
  /** When a weight mutates, the chance it is set back to zero (deleting the connection) instead of nudged. */
  brainWeightZeroProb: number;
  /** Connections weaker than this are treated as absent: free, and they do nothing. */
  brainPruneBelow: number;
  /**
   * Reflexes founders start with, as ordinary evolvable weights (not fixed rules).
   * 0 = start blank. 1 = plant smell turns them toward richer ground (this matches the
   * steering the brains-off control has built in, so brains do not start out
   * handicapped). 2 = that, plus a pull toward things smaller than themselves that they
   * can see (so predators start with a way to approach prey, as prey have no such head
   * start in fleeing). Hunting and fleeing still have to be refined by evolution.
   */
  brainFounderReflex: number;
  /** Chances per birth of the layout changing (mode 2 only). */
  brainAddConnectionProb: number;
  brainAddNodeProb: number;
  brainRemoveConnectionProb: number;
  brainRemoveNodeProb: number;
  /**
   * Memory (needs brains): four memory cells. What the brain writes to its four memory outputs
   * is kept and comes back as inputs the next time it thinks, so a brain can wire a cell to
   * itself to remember something, or count, or keep a mood. 0 = off (the inputs stay at zero).
   */
  brainMemory: number;
  /**
   * Home (needs brains): 0 = no sense of home. 1 = each organism can sense the direction and
   * distance of the place it was born. 2 = the same, but a baby inherits its parent's home, so a
   * whole lineage shares a home range. homeRange is how far away counts as "far" (the distance
   * input reaches 1 there). 3 = home is the best feeding place the organism remembers: whenever
   * it eats at a better rate than the best it remembers (which fades by homeMemoryDecay a tick),
   * home moves to where it stands (only if the meal is at least homeMemoryMin of its reproduction
   * energy in one tick). A baby inherits its parent's remembered place.
   */
  homeMode: number;
  homeRange: number;
  homeMemoryDecay: number;
  homeMemoryMin: number;
  /**
   * Chemical signals (needs brains): each organism has four slow internal signals that its brain can
   * read: a reward signal that jumps when it eats, a stress signal that jumps when it is attacked,
   * starving or sick, a bonding signal that rises with relatives close by (or bonded neighbors),
   * and a calm signal that is high when it is well fed and unstressed. Nothing is rewarded for
   * having them: they only tell the brain things it could not otherwise know about the recent past,
   * and an organism that does not read them just does not pay for them (chemicalsCost, per tick,
   * for a brain that reads at least one). 0 = off (the inputs stay at zero).
   */
  chemicals: number;
  /** Each signal keeps this share of its value from one thought to the next (0 to 1). */
  chemDecay: number;
  /** Reward rises by this much per unit of food energy eaten, as a share of the energy needed to reproduce. */
  chemRewardGain: number;
  /** Stress rises by chemStressHit when an attack is made on the organism, chemStressSick while sick, and up to chemStressHunger when its energy is below chemHungerBelow of what it needs to reproduce. */
  chemStressHit: number;
  chemStressSick: number;
  chemStressHunger: number;
  chemHungerBelow: number;
  /** Bonding rises by this much when the relatives it can count (up to herdCap) are all around it. */
  chemBondGain: number;
  /** How fast calm moves toward (well fed x not stressed). */
  chemCalmRate: number;
  chemicalsCost: number;
  /**
   * Body effects of the signals (needs chemicals; 1 = on). Two more genes (the 24th and 25th) say how
   * strongly the stress and calm signals act on an organism's own body, so evolution sets how
   * much of a stress response to have. Stress, scaled by the gene, speeds the organism up by up to
   * chemStressSpeed (as a share of its speed) and raises its upkeep by up to chemStressUpkeep.
   * Calm, scaled by the gene, cuts upkeep by up to chemCalmSaving and slows the organism by up to
   * chemCalmSlow. Neither is a reward: each has a price as well as a use.
   */
  chemBodyEffects: number;
  chemStressSpeed: number;
  chemStressUpkeep: number;
  chemCalmSaving: number;
  chemCalmSlow: number;
  initialStressResponse: number;
  initialCalmResponse: number;
  /** Energy per tick for having a brain at all, per hidden unit, and per working connection. */
  brainBaseCost: number;
  brainCostPerNeuron: number;
  brainCostPerConnection: number;
  /**
   * Appetite shapes perception (0 = off, 1 = on). When on, what an organism notices about
   * food depends on what it can eat: the sight and scent of smaller animals, and the smell
   * of corpses, reach the brain scaled by the organism's meat appetite, and the smell of
   * plants scaled by its plant appetite. Threats (bigger animals, meat-eater trails) are
   * noticed by everyone. A plant eater's brain can then carry wiring for chasing without
   * it doing anything, and the wiring wakes up when a lineage turns to meat.
   */
  brainAppetiteSenses: number;
  /**
   * Phase 11, tuning the appetite senses (needs brainAppetiteSenses 1; 0 = today). Each appetite signal is
   * at least this strong: food signals reach the brain at floor + (1 - floor) x appetite, so a plant eater
   * with a floor of 0.4 still sees prey at 40% strength, and its plants never fade below 40% either.
   */
  brainAppetiteFloor: number;
  /**
   * The attention gene (0 = off; needs brains and brainAppetiteSenses 1): the 34th gene. It lets evolution
   * decide how strongly each animal notices prey and meat (the sight and trail of smaller animals, the smell of
   * corpses, meat here), beyond what its diet gives: strength = base + (1 - base) x gene, where base is the
   * appetite strength above. 0 is today's; 1 notices them fully whatever it eats. It costs attentionCost x gene
   * a tick (sensing line). Founders start at initialAttention.
   */
  preyAttention: number;
  attentionCost: number;
  initialAttention: number;
  /**
   * Phase 11, feelings and body senses (0 = off; needs brains). Seven brain inputs, all 0 when off:
   * - Pain (0 to 1, and which way it came from): rises by painHit when it survives an attack (pointing at the
   *   attacker), and by painInjury x the prey's share of fighting power when its own attack fails and it is
   *   hurt (attackInjury). It keeps painFade of itself each tick.
   * - Joy (0 to 1): rises by joyEat x (energy eaten / breeding energy), by joyKill for a kill, by joyBirth when
   *   it has young, and by joyContent a tick while fed (above half its breeding energy) and free of pain. It
   *   keeps joyFade of itself each tick.
   * - Feeling sick (disease worlds), ready to breed (looking for a mate, or ready to split), and the taste of
   *   the last bite (-1 to 1: energy kept per unit eaten, less any poison; it keeps tasteFade a tick).
   * Feelings move no energy: they are only signals. Pain always has a cause and always fades.
   */
  feelings: number;
  painHit: number;
  painInjury: number;
  painFade: number;
  joyEat: number;
  joyKill: number;
  joyBirth: number;
  joyContent: number;
  joyFade: number;
  tasteFade: number;
  /**
   * The curiosity gene (0 = off; needs feelings): the 35th gene. Every noveltyEvery ticks each animal notes the
   * square it is in (squares noveltyCellSize across) among the last eight it noted; a square not among them gives
   * curiosityJoy x gene of joy. Nothing else rewards it: if exploring pays, curiosity rises (this is where play
   * could emerge). It costs curiosityCost x gene a tick (sensing line). Founders start at initialCuriosity.
   */
  curiosity: number;
  curiosityJoy: number;
  curiosityCost: number;
  initialCuriosity: number;
  noveltyEvery: number;
  noveltyCellSize: number;
  /** With learning brains and feelings: the learning reward is the energy change plus joy minus pain (0 = energy change only). */
  learnFeelings: number;
  /**
   * Phase 11, better eyes (0 = off; needs brains). Thirty-one more inputs, all 0 when off: for each of the ten
   * things the eyes report, how like its own colour it is and whether it is coming closer (its own pace toward
   * the viewer, as a share of speedMax); how many smaller and bigger animals are in view (n / (n +
   * visionCountHalf)); the nearest animal close behind, outside the eye's view and within behindRange x sight
   * range (how near, bigger or smaller: a rough feel, so a wide eye still pays); and how much plant food stands
   * plantSightReach x sight range away, ahead and half-left and half-right. With appetite senses, everything
   * about smaller animals is scaled by meat appetite (as prey sight is) and plant sight by plant appetite.
   */
  richVision: number;
  visionCountHalf: number;
  behindRange: number;
  plantSightReach: number;
  /**
   * The focus action (0 = off; needs brains): a new brain output. While it is above 0 the eyes lock on to the
   * nearest smaller animal in view and keep tracking it, even out of view, while it is within focusHold x sight
   * range (a far-reaching narrow eye holds a lock further). Four inputs: which way it is (ahead, left), how near,
   * and whether it is coming closer. Focusing costs focusCost a tick (sensing line). It only informs: steering
   * and attacking are still up to the brain and the usual rules.
   */
  focusAction: number;
  focusHold: number;
  focusCost: number;
  /**
   * Phase 11, surroundings (0 = off; needs brains). Five inputs, all 0 when off: crowding (animals of any kind
   * within crowdRange: n / (n + crowdHalf)); ground tremor (the size x pace of every bigger animal within
   * tremorRange, added up: t / (t + tremorHalf), with no direction); daylight (the day's wave, +1 midday to -1
   * midnight, in worlds with dayLength); and a compass (how much it faces north, the top of the map, and east).
   */
  worldSenses: number;
  crowdRange: number;
  crowdHalf: number;
  tremorRange: number;
  tremorHalf: number;

  // --- Terrain (off by default) ---
  /**
   * 0 = the land is a uniform, open plain (the original world). 1 = the land gets biomes
   * from smooth noise: water (a hard barrier: nothing can enter it and plants do not grow
   * there), plains, forest, desert and mountains, which change plant growth and what it
   * costs to move.
   */
  terrainMode: number;
  /** Size of the broad terrain features, in food cells (must divide the grid). Bigger = bigger continents. */
  terrainScale: number;
  /** Share of all cells that are water and mountains; and of the remaining land, the share that is desert and forest. */
  terrainWaterFraction: number;
  terrainMountainFraction: number;
  terrainDesertFraction: number;
  terrainForestFraction: number;
  /** Width, in food cells, of two straight channels of water that cut the world in two (0 = none). */
  terrainBarrierWidth: number;
  /** How fast plants grow in each biome, relative to plains. */
  terrainGrowthForest: number;
  terrainGrowthDesert: number;
  terrainGrowthMountain: number;
  /** What it costs to move in each biome, relative to plains. */
  terrainMoveForest: number;
  terrainMoveDesert: number;
  terrainMoveMountain: number;

  // --- Climate (off by default) ---
  /**
   * 0 = the same sunshine and temperature everywhere, always (the original world). 1 = a
   * climate: it is warmest at the equator (the middle of the world) and colder toward the top
   * and bottom edges, mountains are colder still, plants grow best at a moderate temperature,
   * and the parts below can be switched on by giving them a length (0 = off).
   */
  climateMode: number;
  /** Temperature at the equator on a 0 (freezing) to 1 (hot) scale, and how much colder the edges and mountains are. */
  baseTemperature: number;
  latitudeCooling: number;
  mountainCooling: number;
  /** Plants grow at full speed at this temperature and not at all this far above or below it. */
  plantTempOptimum: number;
  plantTempTolerance: number;
  /** Less sunlight toward the edges (0 = the same everywhere). */
  latitudeLight: number;
  /** Day and night: one cycle every dayLength ticks (0 = always day). At night plants grow dayNightDepth less. */
  dayLength: number;
  dayNightDepth: number;
  /**
   * Seasons: a year every yearLength ticks (0 = no seasons). Plants grow seasonGrowthSwing
   * faster in summer and slower in winter, and temperature swings by seasonTempSwing
   * (more toward the edges).
   */
  yearLength: number;
  seasonGrowthSwing: number;
  seasonTempSwing: number;
  /** Slow climate drift: temperature rises and falls by climateDriftAmplitude over a climateDriftPeriod ticks (0 = none). */
  climateDriftPeriod: number;
  climateDriftAmplitude: number;

  /**
   * The thermal gene (preferred temperature). With thermalCostCoeff above 0 (and a climate), an
   * organism that is more than thermalTolerance away from its preferred temperature pays extra
   * upkeep: thermalCostCoeff x body size^0.75 x (how far past the tolerance)^2. 0 = the gene
   * does nothing.
   */
  thermalCostCoeff: number;
  thermalTolerance: number;

  // --- Weather, harsh and mild years, reserves and dormancy (all off by default; weather and harsh years need a climate) ---
  /**
   * Weather fronts: smooth warm and cold patches that drift across the world and slowly change
   * shape, so one region has a good spell while another has a bad one. weatherAmplitude is how
   * much warmer or colder (on the 0 to 1 temperature scale) a patch is at its most extreme
   * (0 = no weather). weatherScale is the patch size in food cells (it must divide the grid),
   * weatherDriftTicks the ticks a front takes to move one cell east (0 = it stays put),
   * weatherDriftYTicks the same going south, and weatherMorphPeriod how long the pattern takes to
   * change from one shape to another (0 = it keeps its shape).
   */
  weatherAmplitude: number;
  weatherScale: number;
  weatherDriftTicks: number;
  weatherDriftYTicks: number;
  weatherMorphPeriod: number;
  /** Harsh and mild years: each year's seasonal swing is multiplied by 1 plus or minus this much, by a fixed scramble of the year number (0 = every year alike; needs yearLength). */
  yearVariability: number;
  /**
   * The fat gene (the 21st; fatDepositRate above 0 turns it on) is a separate energy reserve. When an
   * organism's energy is above fatDepositAbove of what it needs to reproduce, it moves a share
   * (fat gene x fatDepositRate) of the excess into fat each tick, losing 1 - fatEfficiency of it as
   * heat. When its energy falls below fatDrawBelow it draws the fat back (up to fatDrawRate of its
   * reproduction energy per tick) at full value. The reserve is capped at fatCap times the energy
   * needed to reproduce, and carrying it costs: movement costs rise by fatMoveCost and upkeep by
   * fatUpkeep for every whole reproduction-energy of fat carried. A little fat does a little good,
   * so evolution can find it.
   */
  fatDepositRate: number;
  fatDepositAbove: number;
  fatEfficiency: number;
  fatDrawBelow: number;
  fatDrawRate: number;
  fatCap: number;
  fatMoveCost: number;
  fatUpkeep: number;
  initialFat: number;
  /**
   * Fat passed to young (0 = none, as before): at each birth a parent hands this share of its fat reserve
   * to its babies (split between a litter; with two parents each hands over half as much), as yolk or milk
   * would. Fat beyond what a newborn can hold becomes its ordinary energy. Energy is only moved, never made.
   */
  fatProvision: number;
  /**
   * Does the fat gene count when telling how related two animals are (species, mates, kin)? 1 = yes (as
   * before), 0 = no: how much fat an animal banks is physiology, not what kind of animal it is, and a wide
   * starting spread of it otherwise makes early relatives look like strangers.
   */
  fatRelated: number;
  /**
   * Fat pays for breeding (0 = off): fat counts as breeding capital, as for animals that breed from stored
   * reserves. An animal whose energy alone falls short of breeding (or of being ready to mate) but whose
   * energy and fat together reach it moves the difference out of fat (no loss) and breeds or mates. While
   * it is seeking a mate it banks nothing, so waiting does not drain its energy into fat and back.
   */
  fatBreeding: number;
  /**
   * The torpor gene (the 22nd; needs a climate, and torporSaving above 0 turns it on): where plants are
   * growing at less than torporBelowGrowth of full speed an organism slows down in proportion to its
   * gene (a gene of 0.3 means 30% slower, and 30% less movement cost), and its upkeep falls by
   * torporSaving times its gene. At torporSleepAt or more it cannot attack either. Having the machinery
   * for it costs torporUpkeep times the gene extra upkeep all the time. (It is graded on purpose: a
   * little torpor does a little good, so evolution can find it.)
   */
  torporSaving: number;
  torporBelowGrowth: number;
  torporUpkeep: number;
  torporSleepAt: number;
  initialTorpor: number;

  // --- Kinds of plant (off by default: 1 = every plant is alike) ---
  /**
   * How many kinds of plant there are (1 to 6). Each cell grows one kind, in smooth patches
   * (plantTypeScale food cells across; it must divide the grid). The kinds differ in the time of
   * year they grow best (their peaks are spread over plantTypePhase of a year, which needs seasons)
   * and the temperature they like (plantTypeTempSpread apart, which needs a climate). A new gene,
   * the palate (the 23rd), says which kind an animal digests best: it digests the kind it matches
   * at full efficiency, and a kind that is plantPalateWidth away at the floor efficiency
   * (plantPalateFloor), falling in a straight line in between. Being good at one kind therefore
   * means being worse at the others, and the kinds are spaced evenly from 0 to 1. Brains smell
   * plants in proportion to how well they can digest them.
   */
  plantTypes: number;
  /**
   * Plants that evolve (0 = off). Each food cell carries a small plant genome instead of a fixed kind:
   * chemistry (0 to 1, read by the palate gene as a continuous kind), season (the time of year it grows best, as a
   * fraction of the year) and warmth (the temperature it likes best). It starts as today's kinds (with plantTypes 2 to 6)
   * or as one kind (chemistry plantInitialChem). Every plantSeedEvery ticks each land cell may be reseeded from one
   * neighbouring cell, with chance plantSeedRate x the neighbour's fill x how bare the cell is (fill = standing plants
   * / capacity), and each seed mutates by up to plantMutateChem, plantMutateSeason and plantMutateWarm. Plants that
   * stand tall (well suited, not eaten) spread into ground eaten bare. Only the label of the plants changes: no plant
   * mass, energy or nutrient moves. Plants use their own random stream, so animals' dice are not disturbed.
   */
  plantEvolution: number;
  plantSeedEvery: number;
  plantSeedRate: number;
  plantMutateChem: number;
  plantMutateSeason: number;
  plantMutateWarm: number;
  plantInitialChem: number;
  /**
   * Poisonous plants (0 = off; needs plantEvolution). Each plant genome gains a toxin (0 to 1), inherited through seeds
   * with mutation (plantMutateToxin) and starting at plantInitialToxin. Making toxin slows the plant's growth
   * (by plantToxinGrowthCost x toxin). An animal eating it loses plantToxinHarm x toxin x mismatch x the plant energy
   * it took, where mismatch is how far its palate is from the plant's chemistry, as a share of plantPalateWidth (0 when
   * they match, 1 at plantPalateWidth or more). The loss is counted as upkeep, like poisonous meat. Smell and steering
   * weigh a patch by its food value minus that harm, so animals avoid what poisons them, and only them.
   */
  plantToxins: number;
  /**
   * Dietary nutrients (0 = off; needs several kinds of plant or plants that evolve). Food holds three nutrients.
   * A plant's mix follows its chemistry: chemistry 0 is rich in the first, 0.5 in the second, 1 in the third, blended
   * in between; dietPlantSkew of it follows the chemistry and the rest is an even mix (so 0 = every plant balanced).
   * Meat holds an even mix (dietMeatRichness of each). Each animal keeps a reserve of each nutrient (0 to 1, newborns
   * start at dietNutrientStart): each tick it uses dietNutrientUse of each, and food refills it by dietNutrientFill x
   * (energy gained / breeding energy) x the food's content. Any reserve below dietShortBelow costs extra upkeep:
   * dietShortCost x basic upkeep x how short (the average over the three of (dietShortBelow - reserve) / dietShortBelow).
   * Nutrients here are a quality of food, not matter, so the matter books do not change; the cost is heat on the upkeep line.
   */
  dietNutrients: number;
  dietPlantSkew: number;
  dietMeatRichness: number;
  dietNutrientUse: number;
  dietNutrientFill: number;
  dietShortBelow: number;
  dietShortCost: number;
  dietNutrientStart: number;
  plantToxinHarm: number;
  plantToxinGrowthCost: number;
  plantMutateToxin: number;
  plantInitialToxin: number;
  plantTypeScale: number;
  plantTypePhase: number;
  plantTypeTempSpread: number;
  plantPalateWidth: number;
  plantPalateFloor: number;
  /** The first generation's palate. */
  initialPalate: number;
  /**
   * Standing variety in the first generation: each of the newer genes that is switched on
   * (tolerance, mate-seeking, fat, torpor, palate) starts at its initial value plus a random amount
   * between 0 and this, so selection has something to work with from the start. 0 = every
   * founder is alike (the original way).
   */
  founderSpread: number;

  // --- Sharing food (off by default) ---
  /**
   * The generosity gene (the 26th; shareRate above 0 turns it on). Each tick an organism gives
   * (gene x shareRate) of its energy above shareAbove of what it needs to reproduce to up to
   * shareRecipients hungry neighbors within shareRange, split equally. Only neighbors below
   * shareAcceptBelow of their reproduction energy get any. shareTarget picks who is served first:
   * 0 = the hungriest, 1 = the youngest. With shareKinOnly 1 only genetic relatives (within
   * kinDistance, which must be above 0) count; with 0 anyone does, which lets stingy animals
   * live off generous ones. shareEfficiency of a gift arrives and the rest is lost as heat. Gifts
   * are worked out from everyone's energy at the start of the tick, so the order animals are
   * processed in changes nothing.
   */
  shareRate: number;
  shareAbove: number;
  shareAcceptBelow: number;
  shareRange: number;
  shareRecipients: number;
  shareTarget: number;
  shareKinOnly: number;
  shareEfficiency: number;
  initialShare: number;

  // --- Harmful mutations (off by default) ---
  /**
   * Most real mutations do harm, and a line that never mixes its genes cannot get rid of them
   * (Muller's ratchet): each birth, every one of mutationLoadLoci spots in the genome that is still
   * sound goes bad with chance mutationLoadRate / mutationLoadLoci, and a spot that has gone bad
   * mends with chance mutationLoadBack. Every bad spot raises upkeep by mutationLoadCost (as a share of
   * normal upkeep). A baby that splits off keeps all its parent's bad spots (plus new ones); a
   * baby of two parents takes each spot from one parent or the other, so sexual lineages can
   * shed bad spots and put good ones back together. Nobody is told that sex helps: this only
   * makes mixing matter. 0 = off (mutationLoadRate).
   */
  mutationLoadRate: number;
  /**
   * 0 = the genome has mutationLoadLoci spots that can go bad (and mend with mutationLoadBack).
   * 1 = the textbook model of Muller's ratchet: effectively unlimited places for harm, no mending,
   * new harmful mutations arrive about mutationLoadRate per birth, a baby that splits off keeps all
   * its parent's, and a baby of two parents gets each of each parent's mutations with a 50/50
   * chance. Here the load cannot hit a ceiling, so a line that never mixes keeps getting worse when
   * selection is weak, which is the situation sex is thought to solve.
   */
  mutationLoadModel: number;
  /** Model 1 only: the chance that each harmful mutation a baby inherits is repaired (0 = never, the textbook ratchet). */
  mutationLoadMend: number;
  mutationLoadLoci: number;
  mutationLoadBack: number;
  mutationLoadCost: number;
  /**
   * Synergy between harmful mutations: each bad spot hurts more than the last. Upkeep rises by
   * mutationLoadCost x spots + mutationLoadSynergy x spots squared. (Biologists' "synergistic
   * epistasis": it keeps the load lower and makes mixing genes pay more.) 0 = every spot costs the same.
   */
  mutationLoadSynergy: number;
  /**
   * Harmful mutations can also lower fertility: each bad spot raises the energy needed to reproduce
   * by this share (0 = they only cost upkeep). Fertility counts in every world, where a little
   * extra upkeep may not, and it only delays reproduction, so it cannot create energy.
   */
  mutationLoadFertility: number;
  /** Standing load: founders start with about this many bad spots each (0 = a clean start). */
  mutationLoadStart: number;

  // --- Developmental noise: luck (off by default) ---
  /**
   * Two bits of luck per organism, rolled at birth and never inherited (a baby rolls its own): one
   * multiplies its upkeep, the other the energy it needs before reproducing. Each is a bell curve
   * around 1 with this spread (a standard deviation: 0.08 means about two in three organisms are
   * within 8% of normal and almost all within 16%) and is cut off at luckLimit spreads either way.
   * Both are costs and gates, never gains, so luck cannot create energy. 0 = off.
   */
  luckSpread: number;
  luckLimit: number;

  // --- Toxicity and warning colors (off by default) ---
  /**
   * The toxicity gene (the 27th; toxinStrength above 0 turns it on): how poisonous an animal's body is to
   * whoever eats it. When an animal dies its toxicity mixes into the corpse where it fell (weighted by
   * matter), and an animal that eats meat there loses toxinStrength x that toxicity x the meat's energy
   * (counted as heat on its upkeep line, so the energy books balance). Being toxic costs toxinUpkeep x the
   * gene extra upkeep all the time. A hunter that is poisoned within a few ticks of its own kill
   * remembers the color (the color gene) of what it killed and then passes up prey of that color, with a
   * chance equal to how strongly it remembers (avoidLearn x toxicity per poisoning, fading by avoidFade per
   * tick). Prey within avoidWidth of the remembered color on the color wheel are avoided, so toxic prey
   * that share a color are protected together, and harmless look-alikes are too. Nobody is told to
   * advertise. 0 = off (toxinStrength).
   */
  toxinStrength: number;
  toxinUpkeep: number;
  initialToxicity: number;
  avoidLearn: number;
  avoidFade: number;
  avoidWidth: number;

  // --- Erosion (off by default) ---
  /**
   * Ground that stays bare slowly loses fertility, and ground that is covered slowly regains it. Every cell
   * has a soil health between erosionMin and 1. It falls by erosionRate per tick while the plants standing
   * in the cell are below erosionBelow of what it could hold, and rises by erosionRecovery per tick while
   * they are above erosionRecoverAbove. Soil health multiplies how fast plants regrow and how much the
   * cell can hold. Plants already standing are never deleted when the ceiling drops, so no matter
   * disappears; the cell just stops growing until it is back under the new ceiling. The recovery default
   * is calibrated for the grand world, where how often a cell is bare ranges from never to over a quarter
   * of the time, so only the persistently bare cells wear away. Try erosionRate 0.00001: about 15% of the
   * ground is worn after 300,000 ticks. It does NOT settle into a balance in that time: eroded ground
   * regrows slowly, so it tends to stay bare and keep eroding, and the worn share keeps creeping up. In a
   * uniformly food-limited world (the standard one) every cell is bare about half the time, so all of it
   * wears down to the floor. 0 = off (erosionRate).
   */
  erosionRate: number;
  erosionBelow: number;
  erosionRecoverAbove: number;
  erosionRecovery: number;
  erosionMin: number;

  // --- Fouling (off by default) ---
  /**
   * Crowds foul their ground. Every animal adds fouling x its body size to a per-cell fouling index each
   * tick, and the index fades by foulDecay per tick. A cell is crowded when its index is more than
   * foulFree times the average over all the land (so the rule fits any world: in one where animals are
   * everywhere alike nothing is crowded, and where they clump the clumps are). The excess is how many
   * times the average, beyond foulFree, a cell's index is. Plants there grow at 1 / (1 + foulGrowthEffect
   * x the excess) of their normal speed, and disease passes on more easily (the chance is multiplied by
   * 1 + foulDiseaseEffect x the excess, using the ground the sick animal stands on). So staying crowded in
   * one place is slowly punished, and animals that spread out or move on do better. This is an index of crowding and contamination, not matter: the nutrient cycle is
   * not touched (dung as real matter comes with the nutrient redesign). 0 = off (fouling).
   */
  fouling: number;
  foulDecay: number;
  foulFree: number;
  foulGrowthEffect: number;
  foulDiseaseEffect: number;

  // --- Overgrazing (off by default) ---
  /**
   * A patch of ground that is eaten bare keeps suffering: while the plants standing in a cell are below
   * overgrazeBelow of what it can hold, the cell gains damage (overgrazeDamage per tick, up to 1), and it
   * heals by overgrazeHeal per tick otherwise. With the defaults (bare = under 1% of capacity, damage
   * three times as fast as healing) a cell that is bare more than about a quarter of the time builds
   * up damage and a normally grazed one stays healthy. That is calibrated for worlds with some spatial
   * variety, such as the grand world, where how often a cell is bare ranges from never to over a quarter
   * of the time. In a uniformly food-limited world (the standard one) every cell is bare about half the
   * time, so all of it ends up damaged and the effect is just a blanket growth penalty. Plants grow more slowly where there is damage: their growth
   * is multiplied by 1 minus overgrazePenalty x damage. So a crowd that strips a place leaves it slow to
   * recover, which rewards moving on. It only changes how fast plants grow (the sunlight they capture), so
   * the energy books are unaffected. 0 = off (overgrazeDamage).
   */
  overgrazeDamage: number;
  overgrazeBelow: number;
  overgrazeHeal: number;
  overgrazePenalty: number;

  // --- Catastrophes (off by default) ---
  /**
   * 0 = none. 1 = an ice age (the whole world gets colder, then recovers). 2 = a drought
   * (plants grow much more slowly, then recover). 3 = a meteor strike (everything in a circle
   * dies and the plants there are destroyed). 4 = a random one of those each time. Ice ages
   * and droughts need a climate (climateMode 1).
   */
  catastropheKind: number;
  /** A catastrophe starts at exactly this tick (0 = not scheduled)... */
  catastropheAt: number;
  /** ...and/or one starts at a random moment, on average once every this many ticks (0 = never). */
  catastropheEvery: number;
  /** How long an ice age or drought lasts, in ticks (it builds up and fades smoothly, worst in the middle). */
  catastropheLength: number;
  /** How much colder it gets at the worst of an ice age, and how much plant growth falls at the worst of a drought (0 to 1). */
  iceAgeCooling: number;
  droughtSeverity: number;
  /** The radius of a meteor strike, in world units. */
  meteorRadius: number;

  // --- Climate biomes (terrainMode 2; needs a climate) ---
  /** Average temperatures that divide the climate belts: tundra below the first, cool lands below the second, hot lands above the third. */
  biomeColdBelow: number;
  biomeCoolBelow: number;
  biomeHotAbove: number;
  /** Moisture (0 to 1) that divides dry from middling from wet land, and above which warm wet land is swamp. */
  biomeDryBelow: number;
  biomeWetAbove: number;
  biomeSwampAbove: number;
  /** Moisture: how near water a cell is counts this much (out of 1), the rain belt this much, and the rest is patchy noise. */
  moistureWaterWeight: number;
  moistureBandWeight: number;
  /** How many cells from water the wetness from water halves. */
  moistureReach: number;
  /** How wet each rain belt is (equator, subtropics, temperate lands, poles), 0 to 1. */
  moistureBandEquator: number;
  moistureBandSubtropic: number;
  moistureBandTemperate: number;
  moistureBandPolar: number;
  /** Plant growth is multiplied by moisture / (moisture + moistureHalf) * (1 + moistureHalf), so it is 1 on soaked ground. */
  moistureHalf: number;
  /** How much wetter (and drier) the land is at the height (and depth) of the growing season. */
  moistureSeasonSwing: number;
  /** Land whose average temperature (no seasons or days, but with climate drift, ice ages and volcanic cooling) is below this is ice: nothing grows, and crossing it costs iceMoveCost times as much. */
  iceBelow: number;
  iceMoveCost: number;
  /** Per climate biome: plant growth, movement cost, how easily an animal there is noticed by a hunter (camouflage worlds), and how easily disease spreads. */
  biomeGrowthGrassland: number;
  biomeMoveGrassland: number;
  biomeSeenGrassland: number;
  biomeDiseaseGrassland: number;
  biomeGrowthTemperateForest: number;
  biomeMoveTemperateForest: number;
  biomeSeenTemperateForest: number;
  biomeDiseaseTemperateForest: number;
  biomeGrowthDesert: number;
  biomeMoveDesert: number;
  biomeSeenDesert: number;
  biomeDiseaseDesert: number;
  biomeGrowthHighlands: number;
  biomeMoveHighlands: number;
  biomeSeenHighlands: number;
  biomeDiseaseHighlands: number;
  biomeGrowthTundra: number;
  biomeMoveTundra: number;
  biomeSeenTundra: number;
  biomeDiseaseTundra: number;
  biomeGrowthBoreal: number;
  biomeMoveBoreal: number;
  biomeSeenBoreal: number;
  biomeDiseaseBoreal: number;
  biomeGrowthSavanna: number;
  biomeMoveSavanna: number;
  biomeSeenSavanna: number;
  biomeDiseaseSavanna: number;
  biomeGrowthTropical: number;
  biomeMoveTropical: number;
  biomeSeenTropical: number;
  biomeDiseaseTropical: number;
  biomeGrowthSwamp: number;
  biomeMoveSwamp: number;
  biomeSeenSwamp: number;
  biomeDiseaseSwamp: number;

  // --- Colony physics and shared senses (Phase 8e O3, off by default; need multicellular) ---
  /** 1 = a hunter judges whether prey is too big by the whole colony's size, not one cell's (size protects). */
  colonyProtect: number;
  /** Economies of scale: each cell's upkeep falls by up to this share as its colony grows (saving times (1 - cells^-1/8)). */
  colonyScaleSaving: number;
  /**
   * 1 = the signaling gene (the 28th) is on (needs brains): a bonded cell that carries it shares what it
   * sees (the nearest bigger animal) and smells (which way plants are) with bonded neighbors that also carry it,
   * as the "colony threat" and "colony food" senses, scaled by both genes. Each bond costs signalCost x gene per tick.
   */
  signaling: number;
  signalCost: number;
  initialSignal: number;

  // --- Drinking (Phase 8e O2, off by default; needs terrain) ---
  /** 0 = off. 1 = animals get thirsty and must drink: next to water, or (with climate biomes) on very wet ground. */
  drinking: number;
  /** How much of a full drink an animal loses each tick when cool and still... */
  thirstRate: number;
  /** ...times (1 + thirstHeat times how far the temperature is above thirstHeatAbove)... */
  thirstHeat: number;
  thirstHeatAbove: number;
  /** ...times (1 + thirstMove times how hard a brain drives the body; 1 = normal pace). */
  thirstMove: number;
  /** With climate biomes, ground at least this wet (swamp, soaked forest) also lets an animal drink. */
  drinkMoisture: number;
  /** Below this much water an animal is dehydrated: its upkeep rises, by up to this much more (2 = three times) when it has none left. */
  thirstBelow: number;
  dehydrationCost: number;

  // --- Nutrients through food (Phase 8e O1, off by default) ---
  /**
   * 0 = off: a baby's body is built from the soil under its parent (the older worlds).
   * 1 = animals carry nutrient: each has a store (matter) filled by eating, and a baby's body
   * is built from its parent's store. Dung puts the rest back on the ground wherever the animal is.
   * 2 = as 1, and plants also hold more or less nutrient depending on the soil they grew from, so
   * plants on poor ground are filling but poor food.
   */
  nutrientMode: number;
  /** Mode 2: plants hold nutrient = plantQualityMax * soil / (soil + plantQualityHalf) per unit of plant. */
  plantQualityHalf: number;
  plantQualityMax: number;
  /** Share of eaten plant matter that goes into the store (the rest is dung on the spot). */
  plantAssimilation: number;
  /** Share of eaten meat matter that goes into the store (meat is already body, so most of it is kept). */
  meatAssimilation: number;
  /** Share of the store lost as dung each tick, wherever the animal stands then (so animals carry fertility around). */
  nutrientTurnover: number;
  /** The most an animal can store, as a multiple of its own body matter; anything above spills out as dung at once. */
  nutrientStoreCap: number;
  /** Share of what is left in a parent's store (after building the baby's body) that it hands to each baby. */
  provisionShare: number;
  /** Below this store (as a multiple of its body matter) an animal is short of nutrient and pays extra upkeep... */
  deficiencyBelow: number;
  /** ...rising to this much extra (0.3 = +30%) when the store is empty. */
  deficiencyCost: number;
  /** Nutrient a photosynthesizing cell draws from the soil under it each tick, as a multiple of its body matter (it eats nothing). */
  nutrientRootUptake: number;
  /** Founders start with this much store, as a multiple of their body matter, taken from the soil they start on. */
  founderNutrient: number;

  // --- Disaster events (Phase 8e, all off by default) ---
  // Each kind has a mean interval (on average one every this many ticks; 0 = never) and ranges
  // (min, max) for how big, how wide and how long. The numbers for each event are drawn when it
  // starts, from a random stream of their own, so switching events on never reshuffles anything else.
  // Several can be going at once. They work alongside the older catastrophe settings above.
  /** Ice age: the whole world cools by up to this much for this many ticks (needs a climate). */
  evIceAgeEvery: number;
  evIceAgeCoolingMin: number;
  evIceAgeCoolingMax: number;
  evIceAgeLengthMin: number;
  evIceAgeLengthMax: number;
  /** Drought: plant growth falls by up to this share (needs a climate). */
  evDroughtEvery: number;
  evDroughtSeverityMin: number;
  evDroughtSeverityMax: number;
  evDroughtLengthMin: number;
  evDroughtLengthMax: number;
  /** Meteor: everything in a circle (radius in world units) dies. */
  evMeteorEvery: number;
  evMeteorRadiusMin: number;
  evMeteorRadiusMax: number;
  /**
   * Wildfire: starts as a small patch (radius in world units) on land and spreads to neighboring cells
   * with a chance (spread) that grows with the plants standing there (compared with the average cell) and how dry the ground is.
   * A cell burns for evFireCellBurn ticks; the whole fire stops after its length.
   */
  evFireEvery: number;
  evFireRadiusMin: number;
  evFireRadiusMax: number;
  evFireSpreadMin: number;
  evFireSpreadMax: number;
  evFireLengthMin: number;
  evFireLengthMax: number;
  evFireCellBurn: number;
  /** Ground that has burned cannot burn again for this many ticks (its fuel has to grow back), so a fire sweeps through once instead of circling round. */
  evFireRecover: number;
  /** How much dryness matters for spreading (0 = not at all, 1 = bone-dry ground only). */
  evFireDryWeight: number;
  /** Storm: pushes animals downwind (world units per tick), makes moving cost more, and blows soil nutrient downwind. */
  evStormEvery: number;
  evStormRadiusMin: number;
  evStormRadiusMax: number;
  evStormPushMin: number;
  evStormPushMax: number;
  evStormLengthMin: number;
  evStormLengthMax: number;
  evStormMoveCost: number;
  evStormSoilShare: number;
  /** Flood: land in a circle becomes impassable water for a while (needs terrain). */
  evFloodEvery: number;
  evFloodRadiusMin: number;
  evFloodRadiusMax: number;
  evFloodLengthMin: number;
  evFloodLengthMax: number;
  /**
   * Volcano: kills and burns in a small circle (the burnt plants become soil nutrient), cools the whole
   * world for a while, and leaves richer ground around it (it holds more plants, fading slowly).
   */
  evVolcanoEvery: number;
  evVolcanoRadiusMin: number;
  evVolcanoRadiusMax: number;
  evVolcanoCoolingMin: number;
  evVolcanoCoolingMax: number;
  evVolcanoLengthMin: number;
  evVolcanoLengthMax: number;
  evVolcanoBoost: number;
  evVolcanoBoostReach: number;
  evVolcanoBoostFade: number;
  /** Plant blight: one kind of plant (all of them if there is only one) grows at a fraction of normal. */
  evBlightEvery: number;
  evBlightGrowthMin: number;
  evBlightGrowthMax: number;
  evBlightLengthMin: number;
  evBlightLengthMax: number;
  /** Outbreak: a new strain starts in several animals close together and keeps them sick longer (needs disease). */
  evOutbreakEvery: number;
  evOutbreakRadius: number;
  evOutbreakHosts: number;
  evOutbreakDurationMult: number;
  /** Good year: plants grow faster (more sunlight, a real energy source). */
  evGoodYearEvery: number;
  evGoodYearBoostMin: number;
  evGoodYearBoostMax: number;
  evGoodYearLengthMin: number;
  evGoodYearLengthMax: number;
  /**
   * Outside nudges (Simulation.intervene, for example from a stream's chat; they only matter when used).
   * Bloom: rich ground in a circle of this radius, holding and growing up to this much more plant (like the ground a
   * volcano leaves, fading the same way; needs volcanoes switched on). Fertilize: dead matter in a circle of this
   * radius goes straight back into the soil. Mutate: mutation rates are multiplied by this factor for this many ticks.
   */
  interveneBloomRadius: number;
  interveneBloomBoost: number;
  interveneFertilizeRadius: number;
  interveneMutateFactor: number;
  interveneMutateLength: number;
  /** A predator made by a nudge cannot be attacked for this many ticks (a head start in a world full of hunters). */
  intervenePredatorShelter: number;

  // --- Aging and litter size (off by default) ---
  /**
   * Aging (0 = off: organisms never grow old). With aging, an organism past its prime pays extra
   * upkeep that rises with the square of how far past it is: at an age equal to its lifespan
   * gene it pays agingCoeff times its normal upkeep extra. The prime is agingPrimeFraction of the
   * lifespan. A longer lifespan costs upkeep all the time (up to agingRepairCoeff times normal at
   * the longest), the price of keeping a body in repair.
   */
  agingCoeff: number;
  agingPrimeFraction: number;
  agingRepairCoeff: number;
  /**
   * Litter size: with litterMax above 1, a gene sets how many babies one birth makes (a fraction
   * is rounded up or down at random). The parent hands over the same total energy as before, split
   * between the babies, so a big litter means many babies each starting with little, and a baby
   * that cannot afford its own body is not born.
   */

  // --- Kin recognition and herding (off by default) ---
  /**
   * Organisms recognize relatives: genetically this close (root-mean-square gene difference, 0 to 1,
   * the same measure as speciesDistance) counts as kin. With kinDistance above 0, nobody attacks
   * kin, and brains can sense how many relatives are near and in which direction. 0 = off.
   */
  kinDistance: number;
  /**
   * Make tolerance of relatives a gene (the 19th) instead of a fixed rule. 1 = each organism's own
   * gene (0 to 1) times kinDistance is the closeness at which it will not attack a relative, so
   * a founder with tolerance 0 attacks anyone and tolerance has to evolve (kinDistance is then the
   * most it can reach, and still decides who counts as a relative for sensing and herding). Needs
   * kinDistance above 0. 0 = everybody follows kinDistance.
   */
  kinTolerance: number;
  /**
   * Hunger overrides kin restraint (0 = off). An animal whose energy is below this share of what it needs to
   * breed spares only closer relatives the hungrier it gets: the closeness it respects shrinks in proportion,
   * to nothing when it has no energy left. A well-fed animal spares relatives as before.
   */
  kinHungerBelow: number;
  /**
   * Spare your own parent and young (0 = off). With 1, an animal never attacks its own parent or its own
   * offspring, recognized by who they are (as animals know their mother or litter), not by how alike their
   * genes look. Babies are born on their parent's spot and hunters attack whoever is nearest, so without
   * this a hunting family's first victims are its own members. Everyone else, relatives included, is fair game.
   */
  spareFamily: number;
  /**
   * Gorging: meat bites are this many times bigger than plant bites would be (1 = the same). A hunter eats
   * most of its kill before it rots or others share it. Energy only changes hands faster; none is made.
   */
  meatGorge: number;
  /**
   * Meat keeps in the cold (0 = off; needs a climate). Where it is at or above the plants' best temperature
   * (plantTempOptimum) meat rots at meatDecayRate; colder, the rate falls in proportion, down to
   * (1 - meatColdKeep) of it where it is too cold for plants to grow (plantTempTolerance below the best).
   * Carcasses last longer where plants are poor. Energy is only lost more slowly; none is made.
   */
  meatColdKeep: number;
  /**
   * Hungry prey defend less (0 = off). An attack's odds use the prey's defense times
   * (1 - preyHungerDefense x (1 - fed)), where fed is the prey's energy as a share of what it needs to
   * breed (at most 1). A starving animal (in winter, or where plants are poor) is easier to catch.
   */
  preyHungerDefense: number;
  /**
   * Weapons get in the way of grazing (0 = off): sharp teeth and claws grind plants poorly. Plant bites
   * shrink by this x the attack gene (0 to 1), so an armed grazer loses grazing while a meat eater, which
   * does not graze, loses nothing.
   */
  weaponGrazeLoss: number;
  /** Tolerance of the first generation (0 to 1). */
  initialTolerance: number;
  /** Energy per tick per unit of tolerance: recognizing relatives is a kind of sensing, so it is counted on the sensing line. */
  toleranceCostCoeff: number;
  /**
   * The selfish herd: prey with relatives close by are harder to kill. An attack's odds use the
   * prey's defense times (1 + herdBonus x relatives within herdRange / herdCap), counting at most
   * herdCap relatives. herdBonus 0 = off; it needs kinDistance above 0.
   */
  herdBonus: number;
  herdRange: number;
  herdCap: number;

  // --- Disease (off by default) ---
  /**
   * 0 = no disease. Above 0, a pathogen spreads by contact: each tick, for every sick organism and
   * every healthy neighbor within diseaseContactRange, the neighbor catches it with probability
   * diseaseTransmission x how much the neighbor resembles the pathogen's strain. Resembling it
   * means being genetically close to the strain's "target" (1 / (1 + (distance / diseaseWidth)^2)),
   * so a population where everyone looks alike is wide open to an epidemic and a varied one is not.
   */
  diseaseTransmission: number;
  diseaseContactRange: number;
  diseaseWidth: number;
  /** How long an infection lasts (ticks), how long the survivor is then immune, and the extra upkeep while sick (times normal upkeep). */
  diseaseDuration: number;
  diseaseImmunity: number;
  diseaseCost: number;
  /** A brand-new strain arrives from outside, on average once every this many ticks, aimed at a random organism's genes. */
  diseaseIntroEvery: number;
  /** Chance per infection that the strain changes, and how far toward its new host's genes its target moves when it does. */
  diseaseMutationProb: number;
  diseaseDrift: number;

  // --- Signals and camouflage (off by default) ---
  /**
   * 0 = the color gene does nothing. 1 = the world has a smooth background color, and an
   * organism whose color differs from the background where it stands is easier to spot: a
   * viewer (a hunter, or a brain looking around) notices a perfectly matching organism with
   * probability camoDetectMin and a completely mismatched one always. Each pair rolls
   * afresh every camoGlance ticks, so a hidden animal stays hidden for a while. Hunters learn:
   * after a kill they remember the color of what they ate, and are camoLearning times more
   * likely to notice that color (which favors rare colors). The same color gene is also what
   * matePreference 2 chooses mates by.
   */
  camouflageMode: number;
  /** Size of the broad patches of background color, in food cells (must divide the grid). */
  camoScale: number;
  camoDetectMin: number;
  camoGlance: number;
  camoLearning: number;
  /**
   * A committed hunter's eye (0 = off): the chance of noticing camouflaged prey is raised toward certainty
   * by this much times the hunter's diet gene, so an occasional meat eater stays easy to fool and a
   * specialist sees through camouflage far better.
   */
  camoHunterEye: number;
  /** How far a hunter's remembered color moves toward the color of each new kill (0 to 1). */
  camoLearnRate: number;

  // --- Multicellularity (off by default) ---
  /**
   * 0 = every organism lives alone. 1 = cells can stay together: a gene gives the chance that a baby
   * stays attached to its parent, forming a colony. Bonded cells are held near each other like
   * linked beads, turn toward their neighbors' heading so the colony moves as one, and share
   * energy (a hungry cell is fed by a fed neighbor). With brains, every cell keeps its own brain.
   */
  multicellular: number;
  /** The most bonds one cell can have (at most 6) and the most cells one colony can hold; a baby that would exceed either floats off alone. */
  bondLinksMax: number;
  colonyMax: number;
  /** Distance, in world units, bonded cells keep from each other, how hard the bond pulls toward it (0 to 1 per pass) and how many passes per tick. */
  bondRestLength: number;
  bondStiffness: number;
  bondIterations: number;
  /** Each tick a bonded pair moves this fraction of the way to equal energy (0 to 1), and each cell turns this fraction of the way toward its neighbors' mean heading. */
  bondShare: number;
  bondAlign: number;
  /** The bonding gene of the first generation (the chance a baby stays attached). 0 = nobody bonds until mutation makes it happen. */
  initialBond: number;

  // --- Cross-lineage bonding (off by default; needs multicellular) ---
  /**
   * 0 = cells only bond to their own babies. 1 = a gene ("stickiness") lets cells bond to ANY cell that
   * touches them, relative or not: each tick, two touching cells with free bonds join with probability
   * equal to the product of their stickiness genes. Nothing rewards it: a colony of unrelated cells
   * shares energy like any other, so it can help both (mutualism) or let one cell drain the other
   * (parasitism), and selection decides. Mixed colonies are counted in the colony stats.
   */
  contactBonding: number;
  /** Stickiness of the first generation (0 = nobody is sticky until mutation makes it so). */
  initialStick: number;

  // --- Cell types (off by default; needs multicellular) ---
  /**
   * 0 = every cell is the same. 1 = a baby that stays attached to its parent becomes one of six types,
   * chosen by three body-plan genes according to how many bonds its parent already has (none, one,
   * two or more). A baby that floats off alone is always a generalist. Each specialist is better than
   * a generalist at one job and worse at the others, and is sterile (only generalist "germ" cells
   * reproduce); neighbors in a colony make up for each other by sharing energy, and a specialist
   * left with no bonds goes back to being a generalist (specialists only work as part of a body). Types: 0 generalist, 1 feeder (eats far better, slow), 2 mover (fast, eats
   * badly), 3 photosynthesizer (collects a little sunlight itself, eats badly, slow), 4 armor (very
   * hard to kill, slow, a little costlier), 5 sensor (sees far, otherwise weak).
   */
  cellTypes: number;
  typeFeederBite: number;
  typeFeederSpeed: number;
  typeMoverSpeed: number;
  typeMoverBite: number;
  typePhotoGain: number;
  typePhotoBite: number;
  typePhotoSpeed: number;
  typeArmorDefense: number;
  typeArmorSpeed: number;
  typeArmorUpkeep: number;
  typeSensorRange: number;
  typeSensorBite: number;
  typeSensorSpeed: number;
  /** A cell is also protected by its bonded neighbors: this share of their defense is added to its own. */
  colonyDefenseShare: number;

  // --- Sexual reproduction (off by default) ---
  /**
   * 0 = organisms split in two when they have enough energy (the original way). 1 = two
   * organisms that are both ready to reproduce, close together and genetically compatible
   * pair up and have one baby, built from a mix of their genes (and brains), with each
   * paying half the usual energy. A ready organism with no partner nearby waits.
   * 2 = sex is a gene (the 20th): each time an organism becomes ready it either splits in
   * two or goes looking for a mate, with the gene as the chance of looking. Nobody is told
   * to be sexual, and the only price of looking is the wait for a partner.
   */
  sexualReproduction: number;
  /** The chance of looking for a mate in the first generation, with sexualReproduction 2 (0 = everyone starts out splitting). */
  initialSex: number;
  /**
   * Facultative sex (sexualReproduction 2): a mate-seeker that has waited this many ticks since it
   * decided to look for a mate gives up and splits in two instead, as aphids and water fleas do
   * when no mate is around. 0 = it waits for as long as it takes.
   */
  sexWaitLimit: number;
  /**
   * With sexAcceptAny: how much energy (as a share of what it needs to reproduce on its own) an
   * animal needs to be taken as a mate. 1 = it must be ready to reproduce itself (the original
   * rule); lower means any well-fed neighbor can contribute its half of the baby.
   */
  mateReadyFraction: number;
  /** Starting variety for the mate-seeking gene alone (like founderSpread, which it overrides for this gene). -1 = use founderSpread. */
  sexFounderSpread: number;
  /**
   * With sexualReproduction 2: 1 = a ready organism that did not choose to look for a mate will still
   * accept a compatible neighbor who asks (it pays half the energy, as a mate does), so a rare
   * mate-seeker is not stuck waiting for another mate-seeker. 0 = only mate-seekers pair with each other.
   */
  sexAcceptAny: number;
  /** How close (in world units) two organisms must be to mate. */
  mateRange: number;
  /**
   * How genetically different (root-mean-square gene difference, 0 to 1, same measure as
   * speciesDistance) two organisms can be and still mate. Small = fussy, which splits a
   * population into groups that never mix.
   */
  mateDistance: number;
  /**
   * Who an organism picks out of the compatible, ready ones in range: 0 = the nearest, 1 = the
   * most genetically similar (so specialists tend to find each other, which lets a lineage keep
   * a combination of genes that would be diluted by mixing with everyone), 2 = the most similar
   * color, 3 = the most similar diet.
   */
  matePreference: number;
  /**
   * Mates must have diets within this much of each other (diet genes, 0 to 1; 1 = any diet will do).
   * With matePreference 3 (most similar diet) this is assortative mating by diet: hunters mate with hunters.
   */
  mateDietLimit: number;

  /**
   * Rare large mutations: with this chance per birth, a few genes at once change by a lot
   * (no templates, just a big random jump; selection decides if it was any good). 0 = off.
   */
  macroMutationProb: number;
  macroMutationStd: number;
  macroMutationGenes: number;

  // --- Species tracking (only watches; never changes the world) ---
  /** How often (in ticks) to re-check everyone's species. 0 turns species tracking off. */
  speciesEvery: number;
  /**
   * How different (root-mean-square gene difference, 0 to 1) an organism can be from the
   * center of its species before it counts as something else.
   */
  speciesDistance: number;
  /** A candidate species needs this many members, for this many ticks, to count as a real one. */
  speciesMinMembers: number;
  speciesProbation: number;
  /** Every this many ticks each living species records its size and average traits (a multiple of speciesEvery). */
  speciesSampleEvery: number;
  /**
   * Keeping the species record book bounded however long a world runs (it only watches, so these change nothing in the
   * world): a living species keeps at most speciesHistoryMax samples (when it gets there, it keeps half of them, evenly
   * spread, so its whole life stays at coarser detail); a species that dies out keeps speciesExtinctHistory samples
   * spread over its life; beyond the speciesKeepExtinct most recently extinct, older species become summaries (dates,
   * peak, traits, no samples); and beyond speciesKeepSummaries summaries (and species events), the oldest are forgotten
   * (still counted in "species ever").
   */
  speciesHistoryMax: number;
  speciesExtinctHistory: number;
  speciesKeepExtinct: number;
  speciesKeepSummaries: number;

  /**
   * A population crash is logged when the population falls below (1 - speciesCrashDrop) times its
   * highest value over the last speciesCrashWindow ticks.
   */
  speciesCrashDrop: number;
  speciesCrashWindow: number;

  // --- Learning brains (Phase 8f, off by default; need brains) ---
  /**
   * 0 = off: a brain's wiring is fixed at birth. 1 = on: connections change during life, guided by
   * reward. After each thought, a connection that was recently active (its two ends firing together)
   * is strengthened when things went better than usual and weakened when they went worse, by
   * learnRateMax x the learning gene. What is learned is not inherited, and learning costs upkeep.
   */
  brainLearning: number;
  /**
   * 0 = off, 1 = on: the senses that make learning and memory worth having. How energy changed
   * since the last thought, how surprising that was, the time of year, and what the brain did
   * last time. (Each reads 0 when off.)
   */
  learnSenses: number;
  /** The most a connection can change per thought, at full surprise and a learning gene of 1. */
  learnRateMax: number;
  /** How much of a connection's record of recent activity is kept from one thought to the next (0 to 1). */
  learnTraceDecay: number;
  /** The most learning can add to or take from one connection's inherited strength. */
  learnLimit: number;
  /** How quickly the sense of "how things usually go" follows recent results (0 to 1 per thought). */
  learnBaselineRate: number;
  /** Upkeep for the learning machinery: this x the learning gene, per tick (on the brain line). */
  learnCostCoeff: number;
  /** Energy change since the last thought, as a share of the energy needed to breed, is multiplied by this to make the reward signal (then capped at -1 to 1). */
  learnSenseScale: number;
  /** The first generation's learning gene. */
  initialLearning: number;

  // --- Place memory (Phase 8f, off by default; needs brains) ---
  /**
   * 0 = off, 1 = on: an animal remembers a few good feeding places (how many is set by the place
   * memory gene, up to placeSlotsMax), and senses which way, and how far, the best one it remembers
   * elsewhere is. A good meal refreshes the remembered place it was eaten at, or replaces the weakest
   * memory; every memory fades. Each place it can hold costs upkeep. Memories are not inherited.
   */
  placeMemory: number;
  /** The most places one animal can remember (1 to 4), at a place memory gene of 1. */
  placeSlotsMax: number;
  /** Each tick, a remembered place keeps this share of its value (0.999: half gone in about 700 ticks). */
  placeFade: number;
  /** A meal must be at least this share of the energy needed to breed to be worth remembering. */
  placeMinMeal: number;
  /** A meal this close to a remembered place (world units) counts as that place. */
  placeMergeRadius: number;
  /** The best-place sense reads "far" (1) at this distance (world units). */
  placeRange: number;
  /** Upkeep per place it can remember, per tick (on the brain line). */
  placeCostCoeff: number;
  /** The first generation's place memory gene. */
  initialPlaceMemory: number;
  /**
   * 0 = off, 1 = founders start with a place reflex: turn toward the best remembered place elsewhere
   * (like brainFounderReflex does for smell). Evolution can keep, change or lose it. Without it, the
   * place sense only helps once a brain happens to wire it to steering.
   */
  placeReflex: number;

  // --- Working memory (Phase 8f, off by default; needs brains with memory) ---
  /**
   * 0 = off: with brainMemory, every brain has all four memory cells for free, and each thought
   * overwrites them. 1 = on: the working memory gene sets how many cells a brain can use (any gene
   * above 0 gives one, a gene of 1 gives all four; the rest read 0), each costing upkeep, and the
   * brain decides each thought whether to overwrite a cell or hold it, with one "hold" output
   * (gate) per cell: 0 or above overwrites, below 0 holds, keeping up to wmKeepMax of the old value.
   */
  workingMemory: number;
  /** The most of its old value a held memory cell keeps in one thought (with its gate fully at hold). */
  wmKeepMax: number;
  /** Upkeep per usable memory cell, per tick (on the brain line). */
  wmCostCoeff: number;
  /** The first generation's working memory gene. */
  initialWorkingMemory: number;

  // --- Sprinting and stamina (only with brains) ---
  /**
   * 0 = off: brains can run flat out for as long as they like (paying the energy), and the
   * stamina gene does nothing. 1 = on: running faster than normal drains a stamina reserve,
   * running out means no more sprinting until it refills, and a bigger reserve costs
   * energy every tick (the upkeep of muscle). Whoever has more stamina wins a long chase.
   */
  sprintFatigue: number;
  /** Reserve (in ticks of flat-out running) regained each tick at normal pace. */
  staminaRegen: number;
  /** Extra recovery for slowing down: regen x (1 + this x how much slower than normal). */
  staminaRestBonus: number;
  /** Energy per tick for the reserve: this x the reserve size x body size. */
  staminaCostCoeff: number;

  // --- Kill ownership ---
  /**
   * After a kill, the killer has first claim on the meat for this many ticks (0 = off, as
   * before: a corpse is a free-for-all). Others still get a share, but only `killOwnershipLeak`
   * as strong a claim as usual, so free-riders cannot cheaply out-eat the one who did the work.
   */
  killOwnershipTicks: number;
  killOwnershipLeak: number;

  // --- Scent trails (only laid when brains are on) ---
  /**
   * Every organism leaves scent where it walks: plant eaters lay a "plant-eater" trail and
   * meat eaters a "meat-eater" trail (an omnivore lays some of each, in proportion to its
   * diet). Scent fades by scentDecay of its strength every tick, so a trail shows where
   * animals were recently, and which way they went (it is fresher toward their end).
   * scentDeposit 0 turns trails off.
   */
  scentDeposit: number;
  scentDecay: number;
  /** Size of a scent grid square, in world units. Must divide the world size. */
  scentCellSize: number;
  /**
   * Mate scent (0 = off; needs brains and sex): an animal looking for a mate lays this much scent a tick
   * where it stands, in two layers by diet as the trails are (a plant-eater layer and a meat-eater layer; a
   * mixed eater lays some of each). Brains smell the mix that matches their own diet (mate scent: ahead and
   * left), so similar eaters can find each other. It fades by mateScentDecay a tick, and laying it costs
   * mateScentCost energy a tick (on the sensing line).
   */
  mateScent: number;
  mateScentDecay: number;
  mateScentCost: number;
  /**
   * Pickiness (0 = off; needs sex): the 32nd gene. A picky animal turns down mates whose diet differs from
   * its own by more than 1 - pickiness x choice, and prefers the closest eater among the rest (pickyWeight
   * sets how much diet counts against distance). "Choice" is how many ready mates are in range,
   * n / (n + pickyHalf): with few around it takes anyone, with many it can choose. Both partners must accept.
   * Founders start at initialPickiness; the gene costs pickinessCost x gene a tick (sensing line).
   */
  matePickiness: number;
  pickyHalf: number;
  pickyWeight: number;
  pickinessCost: number;
  initialPickiness: number;
  /**
   * The eye (0 = off; needs brains): the 33rd gene, from wide to narrow. At 0.5 (where founders start,
   * initialEye) it is today's eye: a 150-degree forward view at the usual range. Toward 0 the view widens
   * to about 300 degrees (nearly all round) but reaches shorter; toward 1 it narrows to about 60 degrees but
   * reaches further, so every eye covers about the same area. A narrower eye is also sharper at spotting
   * camouflaged animals, a wider one less so (eyeSharpness sets how much).
   */
  eyeMode: number;
  initialEye: number;
  eyeSharpness: number;
  /**
   * Vigilance (0 = off; needs brains): prey that see an attack coming are harder to catch. If the attacker is
   * inside the prey's field of view (its eye's width with eyeMode, otherwise today's 150-degree view) and within
   * its sight range, and not hidden by camouflage, the prey's defense counts 1 + vigilance times. Wide eyes see
   * more of what is around them, so this is what a wide eye is for. It changes only the odds of a kill.
   */
  vigilance: number;
  /**
   * The gut (0 = off): food goes into a stomach first and becomes energy over time, as in real digestion.
   * - The stomach holds gutCapacity x body matter of food. A full stomach eats nothing more.
   * - Plants are bulky (a unit of plant is a unit of stomach and a unit of energy); meat is dense (a carcass's
   *   energy per unit of matter, usually about ten times a plant's), so a meal of meat lasts.
   * - How fast it eats is set by body size (biteRate x gutBite), no longer by metabolism. Metabolism instead sets
   *   how fast the stomach turns food into energy: gutDigestRate x metabolism x body size a tick. So grazers
   *   need a fast metabolism to keep up with bulky food, while a predator can gorge and digest slowly and cheaply.
   * Energy in the stomach counts in the books, and goes into the carcass if the animal dies.
   */
  gutMode: number;
  gutCapacity: number;
  gutBite: number;
  gutDigestRate: number;
  /**
   * Rest (0 = off; needs brains): on a tick an animal eats nothing, the slower its brain moves it the less its body
   * costs: basic upkeep falls by restSaving x (restBelow - pace) / restBelow when pace is below restBelow (pace is 0
   * standing still, 1 normal and 2 flat out), so standing still saves restSaving in full. Graded, so evolution can
   * find it: slowing a little saves a little. Digestion carries on.
   * A grazer that stops eating to rest goes hungry; a predator with a full stomach can rest for a long time.
   */
  restSaving: number;
  restBelow: number;
  /**
   * Prey condition (0 = off): weak prey are easier to catch. An attack's odds use the prey's defense times
   * 1 - preyCondition x weakness, where weakness is the worst of: hunger (1 - energy as a share of what it needs
   * to breed), sickness (1 while sick), age past its prime (0 at the prime, 1 at the end of its lifespan, with
   * aging on) and youth (1 at birth, 0 at youngTicks old). Hunters then take the weakest, as real ones do.
   */
  preyCondition: number;
  youngTicks: number;
  /**
   * Fighting back (0 = off): an animal's own weapons count toward its defense. An attack's odds use the prey's
   * defense plus fightBack x the prey's attack power (attack x size), so armed animals, other hunters included,
   * are risky to attack and hunters do best on the unarmed.
   */
  fightBack: number;
  /**
   * Which prey a hunter goes for: 0 = the nearest in reach (as before), 1 = the easiest in reach, the one with the
   * weakest defense as the hunter can judge it (armor and size, its weapons with fightBack, its condition with
   * preyCondition, whether it sees the attack coming with vigilance; herds are not counted here), nearest first on
   * a tie. Hunters then cull the weak and leave the strong and the armed, as real ones do.
   */
  preyChoice: number;
  /**
   * Injury (0 = off): a failed attack hurts the attacker. It loses attackInjury x its breeding energy x the prey's share
   * of the two animals' attack power (prey power / (attacker power + prey power)), charged as a fighting cost. Attacking
   * an armed equal is then dangerous (an equal's share is half), and a small or unarmed animal hardly hurts at all.
   */
  attackInjury: number;
  /**
   * Young that move away (0 = off): a newborn is placed this far from its parent (world units), along the random heading
   * it is born with (so no extra random numbers are drawn), unless that spot is water or it is born bonded to a colony.
   * A line then spreads out instead of living in a clump where relatives are each other's nearest prey.
   */
  natalDispersal: number;

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
  barrenBelow: 0,

  initialNutrientPerCell: 30,
  nutrientHalfSaturation: 2,
  bodyMatterPerSize: 1,
  bodyEnergyPerSize: 4,
  meatDecayRate: 0.01,
  detritusMineralizeRate: 0.01,

  initialOrganisms: 200,
  maxOrganisms: 20000,

  initialSize: 1,
  initialSpeed: 1,
  initialSenseRange: 0,
  initialMetabolism: 1,
  initialMutationRate: 0.01,
  initialDiet: 0,
  initialAttack: 0,
  initialArmor: 0,
  initialStamina: 10,
  initialThermal: 0.5,
  initialLifespan: 8000,
  initialLitter: 1,
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
  dietMin: 0,
  dietMax: 1,
  attackMin: 0,
  attackMax: 2,
  armorMin: 0,
  armorMax: 2,
  staminaMin: 0,
  staminaMax: 30,
  thermalMin: 0,
  thermalMax: 1,
  lifespanMin: 1000,
  lifespanMax: 30000,
  litterMin: 1,
  litterMax: 1,
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
  dietSpecialization: 0.5,

  attackCostCoeff: 0.01,
  attackAttemptCost: 0.25,
  armorCostCoeff: 0.01,
  armorMoveFactor: 0.5,
  armorBase: 0.25,
  attackThreshold: 0.05,
  reachBase: 1.5,
  reachPerSize: 1,
  preyMaxSizeRatio: 1.25,
  herbivoreAttackPenalty: 4,
  killCooldown: 20,

  brainMode: 0,
  brainHidden: 4,
  brainHiddenMax: 16,
  brainDepth: 0,
  brainWaterRange: 64,
  brainVisionRange: 6,
  brainEvery: 2,
  brainTurnMax: 0.5,
  brainTurnNoise: 0.1,
  brainStillEatBonus: 0.5,
  brainAttackGate: -0.5,
  brainWeightMutationProb: 0.03,
  brainWeightMutationStd: 0.4,
  brainWeightZeroProb: 0.3,
  brainFounderReflex: 1,
  brainPruneBelow: 0.05,
  brainAddConnectionProb: 0.08,
  brainAddNodeProb: 0.03,
  brainRemoveConnectionProb: 0.03,
  brainRemoveNodeProb: 0.01,
  brainMemory: 0,
  chemicals: 0,
  chemDecay: 0.95,
  chemRewardGain: 20,
  chemStressHit: 0.5,
  chemStressSick: 0.05,
  chemStressHunger: 0.1,
  chemHungerBelow: 0.3,
  chemBondGain: 0.1,
  chemCalmRate: 0.02,
  chemicalsCost: 0.0005,
  chemBodyEffects: 0,
  chemStressSpeed: 0.5,
  chemStressUpkeep: 0.5,
  chemCalmSaving: 0.3,
  chemCalmSlow: 0.3,
  initialStressResponse: 0,
  initialCalmResponse: 0,
  homeMode: 0,
  homeRange: 64,
  homeMemoryDecay: 0.999,
  homeMemoryMin: 0.005,
  brainBaseCost: 0.001,
  brainCostPerNeuron: 0.0005,
  brainCostPerConnection: 0.0001,
  brainAppetiteSenses: 0,
  brainAppetiteFloor: 0,
  preyAttention: 0,
  attentionCost: 0.001,
  initialAttention: 0,
  feelings: 0,
  painHit: 1,
  painInjury: 1,
  painFade: 0.9,
  joyEat: 20,
  joyKill: 0.5,
  joyBirth: 1,
  joyContent: 0.02,
  joyFade: 0.9,
  tasteFade: 0.9,
  curiosity: 0,
  curiosityJoy: 0.3,
  curiosityCost: 0.001,
  initialCuriosity: 0,
  noveltyEvery: 20,
  noveltyCellSize: 16,
  learnFeelings: 0,
  richVision: 0,
  visionCountHalf: 3,
  behindRange: 0.4,
  plantSightReach: 0.7,
  focusAction: 0,
  focusHold: 1.5,
  focusCost: 0.002,
  worldSenses: 0,
  crowdRange: 8,
  crowdHalf: 5,
  tremorRange: 12,
  tremorHalf: 2,
  terrainMode: 0,
  terrainScale: 8,
  terrainWaterFraction: 0.25,
  terrainMountainFraction: 0.1,
  terrainDesertFraction: 0.25,
  terrainForestFraction: 0.3,
  terrainBarrierWidth: 0,
  terrainGrowthForest: 1.3,
  terrainGrowthDesert: 0.3,
  terrainGrowthMountain: 0.4,
  terrainMoveForest: 1.4,
  terrainMoveDesert: 1.2,
  terrainMoveMountain: 3,
  climateMode: 0,
  baseTemperature: 0.75,
  latitudeCooling: 0.45,
  mountainCooling: 0.2,
  plantTempOptimum: 0.65,
  plantTempTolerance: 0.6,
  latitudeLight: 0.4,
  dayLength: 0,
  dayNightDepth: 0.5,
  yearLength: 0,
  seasonGrowthSwing: 0.4,
  seasonTempSwing: 0.15,
  climateDriftPeriod: 0,
  climateDriftAmplitude: 0.15,
  plantTypes: 1,
  plantEvolution: 0,
  plantSeedEvery: 50,
  plantSeedRate: 0.5,
  plantMutateChem: 0.03,
  plantMutateSeason: 0.02,
  plantMutateWarm: 0.02,
  plantInitialChem: 0.5,
  plantToxins: 0,
  dietNutrients: 0,
  dietPlantSkew: 0.8,
  dietMeatRichness: 1,
  dietNutrientUse: 0.001,
  dietNutrientFill: 1,
  dietShortBelow: 0.5,
  dietShortCost: 0.5,
  dietNutrientStart: 0.8,
  plantToxinHarm: 0.5,
  plantToxinGrowthCost: 0.3,
  plantMutateToxin: 0.02,
  plantInitialToxin: 0,
  plantTypeScale: 8,
  plantTypePhase: 1,
  plantTypeTempSpread: 0.1,
  plantPalateWidth: 0.5,
  plantPalateFloor: 0.1,
  initialPalate: 0.5,
  founderSpread: 0,
  shareRate: 0,
  shareAbove: 0.6,
  shareAcceptBelow: 0.9,
  shareRange: 6,
  shareRecipients: 2,
  shareTarget: 0,
  shareKinOnly: 1,
  shareEfficiency: 0.9,
  initialShare: 0,
  mutationLoadRate: 0,
  mutationLoadModel: 0,
  mutationLoadMend: 0,
  mutationLoadLoci: 24,
  mutationLoadBack: 0.01,
  mutationLoadCost: 0.03,
  mutationLoadStart: 0,
  mutationLoadSynergy: 0,
  mutationLoadFertility: 0,
  luckSpread: 0,
  luckLimit: 2.5,
  toxinStrength: 0,
  toxinUpkeep: 0.15,
  initialToxicity: 0,
  avoidLearn: 0.5,
  avoidFade: 0.0005,
  avoidWidth: 0.08,
  erosionRate: 0,
  erosionBelow: 0.01,
  erosionRecoverAbove: 0.1,
  erosionRecovery: 0.00004,
  erosionMin: 0.4,
  fouling: 0,
  foulDecay: 0.01,
  foulFree: 2,
  foulGrowthEffect: 0.2,
  foulDiseaseEffect: 0.3,
  overgrazeDamage: 0,
  overgrazeBelow: 0.01,
  overgrazeHeal: 0.001,
  overgrazePenalty: 0.7,
  weatherAmplitude: 0,
  weatherScale: 8,
  weatherDriftTicks: 400,
  weatherDriftYTicks: 1500,
  weatherMorphPeriod: 30000,
  yearVariability: 0,
  fatDepositRate: 0,
  fatDepositAbove: 0.6,
  fatEfficiency: 0.8,
  fatDrawBelow: 0.35,
  fatDrawRate: 0.05,
  fatCap: 1,
  fatMoveCost: 0.5,
  fatUpkeep: 0.2,
  initialFat: 0,
  fatProvision: 0,
  fatRelated: 1,
  fatBreeding: 0,
  torporSaving: 0,
  torporBelowGrowth: 0.35,
  torporUpkeep: 0.1,
  torporSleepAt: 0.5,
  initialTorpor: 0,
  thermalCostCoeff: 0,
  thermalTolerance: 0.1,
  catastropheKind: 0,
  catastropheAt: 0,
  catastropheEvery: 0,
  catastropheLength: 3000,
  iceAgeCooling: 0.3,
  droughtSeverity: 0.8,
  meteorRadius: 40,
  biomeColdBelow: 0.36,
  biomeCoolBelow: 0.5,
  biomeHotAbove: 0.66,
  biomeDryBelow: 0.4,
  biomeWetAbove: 0.52,
  biomeSwampAbove: 0.7,
  moistureWaterWeight: 0.3,
  moistureBandWeight: 0.4,
  moistureReach: 3,
  moistureBandEquator: 1,
  moistureBandSubtropic: 0.1,
  moistureBandTemperate: 0.8,
  moistureBandPolar: 0.3,
  moistureHalf: 0.3,
  moistureSeasonSwing: 0.25,
  iceBelow: 0.33,
  iceMoveCost: 3,
  biomeGrowthGrassland: 1.0,
  biomeMoveGrassland: 1.0,
  biomeSeenGrassland: 1.2,
  biomeDiseaseGrassland: 1.0,
  biomeGrowthTemperateForest: 1.15,
  biomeMoveTemperateForest: 1.4,
  biomeSeenTemperateForest: 0.6,
  biomeDiseaseTemperateForest: 1.1,
  biomeGrowthDesert: 0.7,
  biomeMoveDesert: 1.2,
  biomeSeenDesert: 1.3,
  biomeDiseaseDesert: 0.5,
  biomeGrowthHighlands: 0.6,
  biomeMoveHighlands: 2.5,
  biomeSeenHighlands: 0.9,
  biomeDiseaseHighlands: 0.6,
  biomeGrowthTundra: 0.6,
  biomeMoveTundra: 1.3,
  biomeSeenTundra: 1.2,
  biomeDiseaseTundra: 0.5,
  biomeGrowthBoreal: 0.9,
  biomeMoveBoreal: 1.5,
  biomeSeenBoreal: 0.7,
  biomeDiseaseBoreal: 0.8,
  biomeGrowthSavanna: 1.05,
  biomeMoveSavanna: 1.0,
  biomeSeenSavanna: 1.3,
  biomeDiseaseSavanna: 1.2,
  biomeGrowthTropical: 1.3,
  biomeMoveTropical: 1.8,
  biomeSeenTropical: 0.5,
  biomeDiseaseTropical: 1.6,
  biomeGrowthSwamp: 1.15,
  biomeMoveSwamp: 2.2,
  biomeSeenSwamp: 0.7,
  biomeDiseaseSwamp: 1.8,
  colonyProtect: 0,
  colonyScaleSaving: 0,
  signaling: 0,
  signalCost: 0.002,
  initialSignal: 0,
  drinking: 0,
  thirstRate: 0.002,
  thirstHeat: 2,
  thirstHeatAbove: 0.6,
  thirstMove: 0.5,
  drinkMoisture: 0.65,
  thirstBelow: 0.5,
  dehydrationCost: 2,
  nutrientMode: 0,
  plantAssimilation: 0.02,
  meatAssimilation: 0.8,
  nutrientTurnover: 0.002,
  nutrientStoreCap: 3,
  provisionShare: 0.25,
  deficiencyBelow: 0.5,
  deficiencyCost: 0.3,
  nutrientRootUptake: 0.002,
  founderNutrient: 1,
  plantQualityHalf: 30,
  plantQualityMax: 2,
  evIceAgeEvery: 0,
  evIceAgeCoolingMin: 0.05,
  evIceAgeCoolingMax: 0.15,
  evIceAgeLengthMin: 1500,
  evIceAgeLengthMax: 4000,
  evDroughtEvery: 0,
  evDroughtSeverityMin: 0.3,
  evDroughtSeverityMax: 0.7,
  evDroughtLengthMin: 1500,
  evDroughtLengthMax: 5000,
  evMeteorEvery: 0,
  evMeteorRadiusMin: 15,
  evMeteorRadiusMax: 50,
  evFireEvery: 0,
  evFireRadiusMin: 6,
  evFireRadiusMax: 14,
  evFireSpreadMin: 0.05,
  evFireSpreadMax: 0.4,
  evFireLengthMin: 200,
  evFireLengthMax: 800,
  evFireCellBurn: 3,
  evFireRecover: 3000,
  evFireDryWeight: 0.5,
  evStormEvery: 0,
  evStormRadiusMin: 30,
  evStormRadiusMax: 80,
  evStormPushMin: 0.02,
  evStormPushMax: 0.1,
  evStormLengthMin: 100,
  evStormLengthMax: 400,
  evStormMoveCost: 1.5,
  evStormSoilShare: 0.001,
  evFloodEvery: 0,
  evFloodRadiusMin: 20,
  evFloodRadiusMax: 60,
  evFloodLengthMin: 500,
  evFloodLengthMax: 2500,
  evVolcanoEvery: 0,
  evVolcanoRadiusMin: 6,
  evVolcanoRadiusMax: 14,
  evVolcanoCoolingMin: 0.03,
  evVolcanoCoolingMax: 0.1,
  evVolcanoLengthMin: 1500,
  evVolcanoLengthMax: 4000,
  evVolcanoBoost: 0.5,
  evVolcanoBoostReach: 4,
  evVolcanoBoostFade: 0.0001,
  evBlightEvery: 0,
  evBlightGrowthMin: 0.3,
  evBlightGrowthMax: 0.7,
  evBlightLengthMin: 1000,
  evBlightLengthMax: 4000,
  evOutbreakEvery: 0,
  evOutbreakRadius: 25,
  evOutbreakHosts: 20,
  evOutbreakDurationMult: 2,
  evGoodYearEvery: 0,
  evGoodYearBoostMin: 1.3,
  evGoodYearBoostMax: 1.8,
  evGoodYearLengthMin: 2000,
  evGoodYearLengthMax: 4000,
  interveneBloomRadius: 40,
  interveneBloomBoost: 0.8,
  interveneFertilizeRadius: 40,
  interveneMutateFactor: 4,
  interveneMutateLength: 20000,
  intervenePredatorShelter: 3000,
  agingCoeff: 0,
  agingPrimeFraction: 0.5,
  agingRepairCoeff: 0.3,
  kinDistance: 0,
  kinTolerance: 0,
  initialTolerance: 0,
  toleranceCostCoeff: 0.003,
  herdBonus: 0,
  herdRange: 8,
  herdCap: 5,
  diseaseTransmission: 0,
  diseaseContactRange: 3,
  diseaseWidth: 0.15,
  diseaseDuration: 300,
  diseaseImmunity: 600,
  diseaseCost: 1,
  diseaseIntroEvery: 3000,
  diseaseMutationProb: 0.05,
  diseaseDrift: 0.2,
  camouflageMode: 0,
  camoScale: 8,
  camoDetectMin: 0.2,
  camoGlance: 20,
  camoLearning: 1,
  camoHunterEye: 0,
  camoLearnRate: 0.3,
  multicellular: 0,
  bondLinksMax: 4,
  colonyMax: 16,
  bondRestLength: 1.5,
  bondStiffness: 0.5,
  bondIterations: 2,
  bondShare: 0.1,
  bondAlign: 0.3,
  initialBond: 0,
  contactBonding: 0,
  initialStick: 0,
  cellTypes: 0,
  typeFeederBite: 2,
  typeFeederSpeed: 0.4,
  typeMoverSpeed: 2,
  typeMoverBite: 0.4,
  typePhotoGain: 0.035,
  typePhotoBite: 0.3,
  typePhotoSpeed: 0.5,
  typeArmorDefense: 3,
  typeArmorSpeed: 0.5,
  typeArmorUpkeep: 1.2,
  typeSensorRange: 4,
  typeSensorBite: 0.5,
  typeSensorSpeed: 0.7,
  colonyDefenseShare: 0.5,
  sexualReproduction: 0,
  initialSex: 0,
  sexFounderSpread: -1,
  sexWaitLimit: 0,
  mateReadyFraction: 1,
  sexAcceptAny: 0,
  mateRange: 6,
  mateDistance: 0.25,
  matePreference: 0,
  kinHungerBelow: 0,
  spareFamily: 0,
  meatGorge: 1,
  meatColdKeep: 0,
  preyHungerDefense: 0,
  weaponGrazeLoss: 0,
  mateDietLimit: 1,
  macroMutationProb: 0,
  macroMutationStd: 0.3,
  macroMutationGenes: 3,
  speciesEvery: 50,
  speciesDistance: 0.2,
  speciesMinMembers: 10,
  speciesProbation: 2000,
  speciesSampleEvery: 500,
  speciesHistoryMax: 400,
  speciesExtinctHistory: 16,
  speciesKeepExtinct: 500,
  speciesKeepSummaries: 5000,
  speciesCrashDrop: 0.4,
  speciesCrashWindow: 2000,
  brainLearning: 0,
  learnSenses: 0,
  learnRateMax: 0.1,
  learnTraceDecay: 0.8,
  learnLimit: 2,
  learnBaselineRate: 0.05,
  learnCostCoeff: 0.002,
  learnSenseScale: 20,
  initialLearning: 0,
  placeMemory: 0,
  placeSlotsMax: 4,
  placeFade: 0.999,
  placeMinMeal: 0.005,
  placeMergeRadius: 8,
  placeRange: 64,
  placeCostCoeff: 0.0005,
  initialPlaceMemory: 0,
  placeReflex: 0,
  workingMemory: 0,
  wmKeepMax: 0.99,
  wmCostCoeff: 0.0003,
  initialWorkingMemory: 0,
  sprintFatigue: 0,
  staminaRegen: 0.1,
  staminaRestBonus: 1,
  staminaCostCoeff: 0.001,
  killOwnershipTicks: 0,
  killOwnershipLeak: 0.1,
  scentDeposit: 1,
  scentDecay: 0.05,
  scentCellSize: 4,
  mateScent: 0,
  mateScentDecay: 0.1,
  mateScentCost: 0.002,
  matePickiness: 0,
  pickyHalf: 3,
  pickyWeight: 2,
  pickinessCost: 0.001,
  initialPickiness: 0,
  eyeMode: 0,
  initialEye: 0.5,
  eyeSharpness: 0.5,
  vigilance: 0,
  gutMode: 0,
  gutCapacity: 3,
  gutBite: 1.5,
  gutDigestRate: 1.5,
  restSaving: 0,
  restBelow: 1,
  preyCondition: 0,
  youngTicks: 100,
  fightBack: 0,
  preyChoice: 0,
  attackInjury: 0,
  natalDispersal: 0,

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
    ["diet", c.dietMin, c.dietMax, c.initialDiet],
    ["attack", c.attackMin, c.attackMax, c.initialAttack],
    ["armor", c.armorMin, c.armorMax, c.initialArmor],
    ["stamina", c.staminaMin, c.staminaMax, c.initialStamina],
    ["thermal", c.thermalMin, c.thermalMax, c.initialThermal],
    ["lifespan", c.lifespanMin, c.lifespanMax, c.initialLifespan],
    ["litter", c.litterMin, c.litterMax, c.initialLitter],
  ];
  for (const [name, min, max, start] of ranges) {
    if (min > max) problems.push(`${name}Min exceeds ${name}Max`);
    if (start < min || start > max) problems.push(`initial ${name} is outside its allowed range`);
  }
  if (c.dietMin < 0 || c.dietMax > 1) problems.push("diet must stay between 0 and 1");
  if (c.attackMin < 0 || c.armorMin < 0) problems.push("attack and armor cannot be negative");
  if (c.dietSpecialization < 0 || c.dietSpecialization > 1) problems.push("dietSpecialization must be between 0 and 1");
  if (c.meatDecayRate < 0 || c.meatDecayRate > 1) problems.push("meatDecayRate must be between 0 and 1");
  if (c.detritusMineralizeRate < 0 || c.detritusMineralizeRate > 1) problems.push("detritusMineralizeRate must be between 0 and 1");
  if (c.nutrientHalfSaturation <= 0) problems.push("nutrientHalfSaturation must be positive");
  if (c.bodyEnergyPerSize >= c.reproThresholdPerSize * c.offspringEnergyFraction) {
    problems.push("a newborn's body energy must be less than the energy a parent hands over");
  }
  if (c.armorBase <= 0) problems.push("armorBase must be positive");
  if (c.preyMaxSizeRatio <= 0) problems.push("preyMaxSizeRatio must be positive");
  if (c.herbivoreAttackPenalty < 0) problems.push("herbivoreAttackPenalty cannot be negative");
  if (![0, 1, 2].includes(c.brainMode)) problems.push("brainMode must be 0 (no brains), 1 (fixed layout) or 2 (evolvable layout)");
  if (!Number.isInteger(c.brainHidden) || c.brainHidden < 1 || c.brainHidden > HIDDEN_MAX) problems.push(`brainHidden must be a whole number from 1 to ${HIDDEN_MAX}`);
  if (!Number.isInteger(c.brainHiddenMax) || c.brainHiddenMax < 1 || c.brainHiddenMax > HIDDEN_MAX) problems.push(`brainHiddenMax must be a whole number from 1 to ${HIDDEN_MAX}`);
  if (c.brainDepth !== 0 && c.brainDepth !== 1) problems.push("brainDepth must be 0 or 1");
  else if (c.brainDepth === 1 && c.brainMode !== 2) problems.push("brainDepth needs brainMode 2 (an evolvable layout)");
  else if (c.brainMode === 1 && c.brainHidden * (INPUT_COUNT + OUTPUT_COUNT) > CONN_MAX) {
    problems.push(`brainHidden ${c.brainHidden} needs ${c.brainHidden * (INPUT_COUNT + OUTPUT_COUNT)} connections per brain, but only ${CONN_MAX} fit (use at most ${Math.floor(CONN_MAX / (INPUT_COUNT + OUTPUT_COUNT))})`);
  }
  if (!Number.isInteger(c.brainEvery) || c.brainEvery < 1) problems.push("brainEvery must be a whole number of 1 or more");
  if (c.brainWeightMutationProb < 0 || c.brainWeightMutationProb > 1) problems.push("brainWeightMutationProb must be between 0 and 1");
  for (const [name, value] of [
    ["brainAddConnectionProb", c.brainAddConnectionProb],
    ["brainAddNodeProb", c.brainAddNodeProb],
    ["brainRemoveConnectionProb", c.brainRemoveConnectionProb],
    ["brainRemoveNodeProb", c.brainRemoveNodeProb],
  ] as const) {
    if (value < 0 || value > 1) problems.push(`${name} must be between 0 and 1`);
  }
  if (![0, 1, 2].includes(c.brainFounderReflex)) problems.push("brainFounderReflex must be 0, 1 or 2");
  if (c.brainWeightZeroProb < 0 || c.brainWeightZeroProb > 1) problems.push("brainWeightZeroProb must be between 0 and 1");
  if (c.brainPruneBelow < 0) problems.push("brainPruneBelow cannot be negative");
  if (c.brainMode > 0 && c.brainVisionRange + c.senseRangeMax >= Math.min(c.worldWidth, c.worldHeight) / 2) {
    problems.push("brainVisionRange plus senseRangeMax must be under half the world");
  }
  if (c.brainVisionRange < 0) problems.push("brainVisionRange cannot be negative");
  if (![0, 1].includes(c.brainMemory)) problems.push("brainMemory must be 0 or 1");
  if (![0, 1].includes(c.chemicals)) problems.push("chemicals must be 0 or 1");
  if (c.chemicals === 1 && c.brainMode === 0) problems.push("chemicals need brains (set brainMode to 1 or 2)");
  if (![0, 1].includes(c.chemBodyEffects)) problems.push("chemBodyEffects must be 0 or 1");
  if (c.chemBodyEffects === 1 && c.chemicals !== 1) problems.push("chemBodyEffects needs chemicals (set chemicals to 1)");
  if (c.chemStressSpeed < 0 || c.chemStressUpkeep < 0 || c.chemCalmSaving < 0 || c.chemCalmSaving > 1 || c.chemCalmSlow < 0 || c.chemCalmSlow > 1) problems.push("the chemical body-effect settings must not be negative, and the calm ones at most 1");
  if (c.initialStressResponse < 0 || c.initialStressResponse > 1 || c.initialCalmResponse < 0 || c.initialCalmResponse > 1) problems.push("initialStressResponse and initialCalmResponse must be between 0 and 1");
  if (c.chemDecay < 0 || c.chemDecay >= 1) problems.push("chemDecay must be at least 0 and under 1");
  if (c.chemRewardGain < 0 || c.chemStressHit < 0 || c.chemStressSick < 0 || c.chemStressHunger < 0 || c.chemBondGain < 0 || c.chemCalmRate < 0 || c.chemicalsCost < 0) problems.push("the chemical settings cannot be negative");
  if (c.chemHungerBelow <= 0 || c.chemHungerBelow > 1) problems.push("chemHungerBelow must be above 0 and at most 1");
  if (c.brainMemory === 1 && c.brainMode === 0) problems.push("brainMemory needs brains (set brainMode to 1 or 2)");
  if (![0, 1, 2, 3].includes(c.homeMode)) problems.push("homeMode must be 0, 1, 2 or 3");
  if (c.homeMemoryDecay < 0 || c.homeMemoryDecay > 1 || c.homeMemoryMin < 0) problems.push("homeMemoryDecay must be between 0 and 1 and homeMemoryMin cannot be negative");
  if (c.homeMode > 0 && c.brainMode === 0) problems.push("homeMode needs brains (set brainMode to 1 or 2)");
  if (!(c.homeRange > 0)) problems.push("homeRange must be positive");
  if (![0, 1, 2].includes(c.terrainMode)) problems.push("terrainMode must be 0 (open plain), 1 (five biomes) or 2 (climate biomes)");
  if (c.terrainMode === 2) {
    if (c.climateMode !== 1) problems.push("climate biomes need a climate (set climateMode to 1)");
    if (!(c.biomeColdBelow < c.biomeCoolBelow && c.biomeCoolBelow < c.biomeHotAbove)) problems.push("biomeColdBelow, biomeCoolBelow and biomeHotAbove must rise in that order");
    if (!(c.biomeDryBelow < c.biomeWetAbove && c.biomeWetAbove <= c.biomeSwampAbove)) problems.push("biomeDryBelow, biomeWetAbove and biomeSwampAbove must rise in that order");
    if (c.moistureWaterWeight < 0 || c.moistureBandWeight < 0 || c.moistureWaterWeight + c.moistureBandWeight > 1) problems.push("moistureWaterWeight and moistureBandWeight cannot be negative or add up to more than 1");
    if (!(c.moistureReach > 0) || !(c.moistureHalf > 0) || c.moistureSeasonSwing < 0 || c.moistureSeasonSwing > 1 || c.iceMoveCost < 1) problems.push("moistureReach and moistureHalf must be positive, moistureSeasonSwing between 0 and 1, iceMoveCost at least 1");
  }
  if (c.terrainMode >= 1) {
    const gw = c.worldWidth / c.foodCellSize;
    const gh = c.worldHeight / c.foodCellSize;
    if (!Number.isInteger(c.terrainScale) || c.terrainScale < 1 || gw % c.terrainScale !== 0 || gh % c.terrainScale !== 0) {
      problems.push("terrainScale must be a whole number of food cells that divides the grid evenly");
    }
    for (const [name, value] of [["terrainWaterFraction", c.terrainWaterFraction], ["terrainMountainFraction", c.terrainMountainFraction], ["terrainDesertFraction", c.terrainDesertFraction], ["terrainForestFraction", c.terrainForestFraction]] as const) {
      if (value < 0 || value >= 1) problems.push(`${name} must be from 0 up to (but not including) 1`);
    }
    if (c.terrainWaterFraction + c.terrainMountainFraction >= 1) problems.push("water and mountains cannot cover the whole world");
    if (c.terrainDesertFraction + c.terrainForestFraction > 1) problems.push("desert and forest fractions cannot add up to more than 1");
    if (!Number.isInteger(c.terrainBarrierWidth) || c.terrainBarrierWidth < 0 || c.terrainBarrierWidth * 2 > gw / 2) {
      problems.push("terrainBarrierWidth must be a whole number of cells, at most a quarter of the world's width");
    }
    for (const [name, value] of [["terrainGrowthForest", c.terrainGrowthForest], ["terrainGrowthDesert", c.terrainGrowthDesert], ["terrainGrowthMountain", c.terrainGrowthMountain], ["terrainMoveForest", c.terrainMoveForest], ["terrainMoveDesert", c.terrainMoveDesert], ["terrainMoveMountain", c.terrainMoveMountain]] as const) {
      if (value < 0) problems.push(`${name} cannot be negative`);
    }
  }
  if (c.agingCoeff < 0 || c.agingRepairCoeff < 0) problems.push("agingCoeff and agingRepairCoeff cannot be negative");
  if (!(c.agingPrimeFraction >= 0 && c.agingPrimeFraction < 1)) problems.push("agingPrimeFraction must be from 0 up to (but not including) 1");
  if (c.lifespanMin <= 0) problems.push("lifespanMin must be positive");
  if (c.litterMin < 1) problems.push("litterMin must be at least 1");
  if (c.thermalCostCoeff < 0 || c.thermalTolerance < 0) problems.push("thermalCostCoeff and thermalTolerance cannot be negative");
  if (c.thermalCostCoeff > 0 && c.climateMode !== 1) problems.push("thermalCostCoeff needs a climate (set climateMode to 1)");
  if (![0, 1, 2, 3, 4].includes(c.catastropheKind)) problems.push("catastropheKind must be 0 (none), 1 (ice age), 2 (drought), 3 (meteor) or 4 (random)");
  if (c.catastropheKind !== 0) {
    if ((c.catastropheKind === 1 || c.catastropheKind === 2 || c.catastropheKind === 4) && c.climateMode !== 1) problems.push("ice ages and droughts need a climate (set climateMode to 1)");
    if (!Number.isInteger(c.catastropheAt) || c.catastropheAt < 0) problems.push("catastropheAt must be a whole number of ticks (0 = not scheduled)");
    if (!Number.isInteger(c.catastropheEvery) || c.catastropheEvery < 0) problems.push("catastropheEvery must be a whole number of ticks (0 = never)");
    if (!Number.isInteger(c.catastropheLength) || c.catastropheLength < 2) problems.push("catastropheLength must be a whole number of ticks, at least 2");
    if (c.iceAgeCooling < 0) problems.push("iceAgeCooling cannot be negative");
    if (c.droughtSeverity < 0 || c.droughtSeverity > 1) problems.push("droughtSeverity must be between 0 and 1");
    if (!(c.meteorRadius > 0)) problems.push("meteorRadius must be positive");
  }
  if (![0, 1].includes(c.colonyProtect) || ![0, 1].includes(c.signaling)) problems.push("colonyProtect and signaling must be 0 or 1");
  if ((c.colonyProtect === 1 || c.colonyScaleSaving > 0 || c.signaling === 1) && c.multicellular !== 1) problems.push("colony physics and signaling need colonies (set multicellular to 1)");
  if (c.signaling === 1 && c.brainMode === 0) problems.push("signaling needs brains (set brainMode to 1 or 2)");
  if (c.colonyScaleSaving < 0 || c.colonyScaleSaving > 1 || c.signalCost < 0 || c.initialSignal < 0 || c.initialSignal > 1) problems.push("colonyScaleSaving and initialSignal must be between 0 and 1, and signalCost cannot be negative");
  if (![0, 1].includes(c.drinking)) problems.push("drinking must be 0 (off) or 1 (on)");
  if (c.drinking === 1) {
    if (c.terrainMode === 0) problems.push("drinking needs terrain with water (set terrainMode to 1 or 2)");
    if (!(c.thirstRate > 0) || c.thirstHeat < 0 || c.thirstMove < 0 || c.dehydrationCost < 0 || !(c.thirstBelow > 0 && c.thirstBelow <= 1)) problems.push("thirstRate must be positive, thirstBelow above 0 and at most 1, and the other thirst settings cannot be negative");
  }
  if (![0, 1, 2].includes(c.nutrientMode)) problems.push("nutrientMode must be 0 (babies built from soil), 1 (animals carry nutrient) or 2 (and plants vary with the soil)");
  if (c.nutrientMode === 2 && !(c.plantQualityHalf > 0 && c.plantQualityMax > 0)) problems.push("plantQualityHalf and plantQualityMax must be positive");
  if (c.nutrientMode >= 1) {
    for (const [name, value] of [["plantAssimilation", c.plantAssimilation], ["meatAssimilation", c.meatAssimilation], ["nutrientTurnover", c.nutrientTurnover], ["provisionShare", c.provisionShare]] as const) {
      if (!(value >= 0 && value <= 1)) problems.push(`${name} must be between 0 and 1`);
    }
    if (!(c.nutrientStoreCap > 0) || c.deficiencyBelow < 0 || c.deficiencyCost < 0 || c.nutrientRootUptake < 0 || c.founderNutrient < 0) problems.push("nutrientStoreCap must be positive, and deficiencyBelow, deficiencyCost, nutrientRootUptake and founderNutrient cannot be negative");
  }
  // Disaster events: each kind with a non-zero interval needs its ranges to make sense (and the world features it works on).
  const eventKinds: [string, number, [string, number, number][]][] = [
    ["evIceAge", c.evIceAgeEvery, [["Cooling", c.evIceAgeCoolingMin, c.evIceAgeCoolingMax], ["Length", c.evIceAgeLengthMin, c.evIceAgeLengthMax]]],
    ["evDrought", c.evDroughtEvery, [["Severity", c.evDroughtSeverityMin, c.evDroughtSeverityMax], ["Length", c.evDroughtLengthMin, c.evDroughtLengthMax]]],
    ["evMeteor", c.evMeteorEvery, [["Radius", c.evMeteorRadiusMin, c.evMeteorRadiusMax]]],
    ["evFire", c.evFireEvery, [["Radius", c.evFireRadiusMin, c.evFireRadiusMax], ["Spread", c.evFireSpreadMin, c.evFireSpreadMax], ["Length", c.evFireLengthMin, c.evFireLengthMax]]],
    ["evStorm", c.evStormEvery, [["Radius", c.evStormRadiusMin, c.evStormRadiusMax], ["Push", c.evStormPushMin, c.evStormPushMax], ["Length", c.evStormLengthMin, c.evStormLengthMax]]],
    ["evFlood", c.evFloodEvery, [["Radius", c.evFloodRadiusMin, c.evFloodRadiusMax], ["Length", c.evFloodLengthMin, c.evFloodLengthMax]]],
    ["evVolcano", c.evVolcanoEvery, [["Radius", c.evVolcanoRadiusMin, c.evVolcanoRadiusMax], ["Cooling", c.evVolcanoCoolingMin, c.evVolcanoCoolingMax], ["Length", c.evVolcanoLengthMin, c.evVolcanoLengthMax]]],
    ["evBlight", c.evBlightEvery, [["Growth", c.evBlightGrowthMin, c.evBlightGrowthMax], ["Length", c.evBlightLengthMin, c.evBlightLengthMax]]],
    ["evGoodYear", c.evGoodYearEvery, [["Boost", c.evGoodYearBoostMin, c.evGoodYearBoostMax], ["Length", c.evGoodYearLengthMin, c.evGoodYearLengthMax]]],
  ];
  for (const [name, every, ranges] of eventKinds) {
    if (!Number.isInteger(every) || every < 0) problems.push(`${name}Every must be a whole number of ticks (0 = never)`);
    if (every > 0) {
      for (const [what, lo, hi] of ranges) {
        if (!(lo >= 0) || hi < lo) problems.push(`${name}${what}Min must be at least 0 and not above ${name}${what}Max`);
        if (what === "Length" && lo < 2) problems.push(`${name}LengthMin must be at least 2 ticks`);
      }
    }
  }
  if (c.evIceAgeEvery > 0 || c.evDroughtEvery > 0 || c.evVolcanoEvery > 0) {
    if (c.climateMode !== 1) problems.push("ice ages, droughts and volcanoes need a climate (set climateMode to 1)");
  }
  if (c.evFloodEvery > 0 && c.terrainMode === 0) problems.push("floods need terrain (set terrainMode to 1 or 2)");
  if (c.evOutbreakEvery > 0 && !(c.diseaseTransmission > 0)) problems.push("outbreaks need disease (set diseaseTransmission above 0)");
  if (c.evDroughtEvery > 0 && c.evDroughtSeverityMax > 1) problems.push("evDroughtSeverityMax cannot be above 1");
  if (c.evBlightEvery > 0 && c.evBlightGrowthMax > 1) problems.push("evBlightGrowthMax cannot be above 1 (it is the fraction of normal growth that is left)");
  if (c.evGoodYearEvery > 0 && c.evGoodYearBoostMin < 1) problems.push("evGoodYearBoostMin must be at least 1");
  if (c.evFireEvery > 0 && (c.evFireSpreadMax > 1 || !Number.isInteger(c.evFireCellBurn) || c.evFireCellBurn < 1 || c.evFireDryWeight < 0 || c.evFireDryWeight > 1)) problems.push("fire: evFireSpreadMax at most 1, evFireCellBurn a whole number from 1, evFireDryWeight between 0 and 1");
  if (c.evFireEvery > 0 && (!Number.isInteger(c.evFireRecover) || c.evFireRecover < 0)) problems.push("evFireRecover must be a whole number of ticks (0 or more)");
  if (c.evStormEvery > 0 && (c.evStormMoveCost < 1 || c.evStormSoilShare < 0 || c.evStormSoilShare > 1)) problems.push("storm: evStormMoveCost at least 1, evStormSoilShare between 0 and 1");
  if (c.evVolcanoEvery > 0 && (c.evVolcanoBoost < 0 || c.evVolcanoBoostReach < 1 || c.evVolcanoBoostFade < 0 || c.evVolcanoBoostFade > 1)) problems.push("volcano: evVolcanoBoost at least 0, evVolcanoBoostReach at least 1, evVolcanoBoostFade between 0 and 1");
  if (c.evOutbreakEvery > 0 && (c.evOutbreakRadius <= 0 || c.evOutbreakHosts < 1 || c.evOutbreakDurationMult < 1)) problems.push("outbreak: evOutbreakRadius above 0, evOutbreakHosts at least 1, evOutbreakDurationMult at least 1");
  if (![0, 1].includes(c.climateMode)) problems.push("climateMode must be 0 (no climate) or 1 (climate)");
  if (c.weatherAmplitude < 0) problems.push("weatherAmplitude cannot be negative");
  if (c.weatherAmplitude > 0) {
    if (c.climateMode !== 1) problems.push("weather needs a climate (set climateMode to 1)");
    const gw = c.worldWidth / c.foodCellSize;
    const gh = c.worldHeight / c.foodCellSize;
    if (!Number.isInteger(c.weatherScale) || c.weatherScale < 1 || gw % c.weatherScale !== 0 || gh % c.weatherScale !== 0) {
      problems.push("weatherScale must be a whole number of food cells that divides the grid evenly");
    }
    if (c.weatherDriftTicks < 0 || c.weatherDriftYTicks < 0 || c.weatherMorphPeriod < 0) problems.push("weather drift and morph times cannot be negative");
  }
  if (!Number.isInteger(c.plantTypes) || c.plantTypes < 1 || c.plantTypes > 6) problems.push("plantTypes must be a whole number from 1 to 6");
  if (c.plantEvolution !== 0 && c.plantEvolution !== 1) problems.push("plantEvolution must be 0 (off) or 1 (on)");
  if (c.plantToxins !== 0 && c.plantToxins !== 1) problems.push("plantToxins must be 0 (off) or 1 (on)");
  if (c.dietNutrients !== 0 && c.dietNutrients !== 1) problems.push("dietNutrients must be 0 (off) or 1 (on)");
  if (c.dietNutrients === 1) {
    if (c.plantTypes < 2 && c.plantEvolution !== 1) problems.push("dietNutrients needs several kinds of plant (plantTypes 2 or more) or plants that evolve (plantEvolution 1)");
    if (!(c.dietPlantSkew >= 0 && c.dietPlantSkew <= 1) || !(c.dietShortBelow > 0 && c.dietShortBelow <= 1) || !(c.dietNutrientStart >= 0 && c.dietNutrientStart <= 1)) problems.push("dietPlantSkew and dietNutrientStart must be between 0 and 1, dietShortBelow above 0 and at most 1");
    if (!(c.dietMeatRichness >= 0) || !(c.dietNutrientUse >= 0) || !(c.dietNutrientFill >= 0) || !(c.dietShortCost >= 0)) problems.push("dietMeatRichness, dietNutrientUse, dietNutrientFill and dietShortCost cannot be negative");
  }
  if (c.plantToxins === 1) {
    if (c.plantEvolution !== 1) problems.push("plantToxins needs plants that evolve (plantEvolution 1)");
    if (!(c.plantToxinHarm >= 0) || !(c.plantToxinGrowthCost >= 0 && c.plantToxinGrowthCost <= 1)) problems.push("plantToxinHarm cannot be negative, and plantToxinGrowthCost must be between 0 and 1");
    if (!(c.plantMutateToxin >= 0 && c.plantMutateToxin <= 0.5) || !(c.plantInitialToxin >= 0 && c.plantInitialToxin <= 1)) problems.push("plantMutateToxin must be between 0 and 0.5, plantInitialToxin between 0 and 1");
  }
  if (c.plantEvolution === 1) {
    if (!Number.isInteger(c.plantSeedEvery) || c.plantSeedEvery < 1) problems.push("plantSeedEvery must be a whole number of ticks, at least 1");
    if (!(c.plantSeedRate >= 0 && c.plantSeedRate <= 1)) problems.push("plantSeedRate must be between 0 and 1");
    if (!(c.plantMutateChem >= 0 && c.plantMutateChem <= 0.5 && c.plantMutateSeason >= 0 && c.plantMutateSeason <= 0.5 && c.plantMutateWarm >= 0 && c.plantMutateWarm <= 1)) problems.push("plantMutateChem and plantMutateSeason must be between 0 and 0.5, plantMutateWarm between 0 and 1");
    if (!(c.plantInitialChem >= 0 && c.plantInitialChem <= 1)) problems.push("plantInitialChem must be between 0 and 1");
    if (c.plantTypes === 1 && !(c.plantPalateWidth > 0)) problems.push("plantPalateWidth must be positive");
    if (c.plantTypes === 1 && (c.plantPalateFloor < 0 || c.plantPalateFloor > 1)) problems.push("plantPalateFloor must be between 0 and 1");
  }
  if (c.plantTypes > 1) {
    const gw = c.worldWidth / c.foodCellSize;
    const gh = c.worldHeight / c.foodCellSize;
    if (!Number.isInteger(c.plantTypeScale) || c.plantTypeScale < 1 || gw % c.plantTypeScale !== 0 || gh % c.plantTypeScale !== 0) problems.push("plantTypeScale must be a whole number of food cells that divides the grid evenly");
    if (c.plantTypePhase < 0 || c.plantTypePhase > 1) problems.push("plantTypePhase must be between 0 and 1");
    if (c.plantTypePhase > 0 && c.climateMode !== 1) problems.push("plantTypePhase above 0 needs a climate with seasons (set climateMode to 1 and a yearLength), or set it to 0");
    if (c.plantTypeTempSpread < 0) problems.push("plantTypeTempSpread cannot be negative");
    if (!(c.plantPalateWidth > 0)) problems.push("plantPalateWidth must be positive");
    if (c.plantPalateFloor < 0 || c.plantPalateFloor > 1) problems.push("plantPalateFloor must be between 0 and 1");
    if (c.initialPalate < 0 || c.initialPalate > 1) problems.push("initialPalate must be between 0 and 1");
  }
  if (c.founderSpread < 0 || c.founderSpread > 1) problems.push("founderSpread must be between 0 and 1");
  if (c.shareRate < 0 || c.shareRate > 1) problems.push("shareRate must be between 0 and 1");
  if (c.shareRate > 0) {
    if (!Number.isInteger(c.shareRecipients) || c.shareRecipients < 1 || c.shareRecipients > 4) problems.push("shareRecipients must be a whole number from 1 to 4");
    if (![0, 1].includes(c.shareTarget) || ![0, 1].includes(c.shareKinOnly)) problems.push("shareTarget and shareKinOnly must be 0 or 1");
    if (c.shareKinOnly === 1 && c.kinDistance <= 0) problems.push("shareKinOnly needs kinDistance above 0 (who counts as a relative)");
    if (!(c.shareRange > 0) || c.shareEfficiency <= 0 || c.shareEfficiency > 1) problems.push("shareRange must be positive and shareEfficiency above 0 and at most 1");
    if (c.shareAbove < 0 || c.shareAbove > 1 || c.shareAcceptBelow <= 0 || c.shareAcceptBelow > 1) problems.push("shareAbove and shareAcceptBelow must be between 0 and 1");
    if (c.initialShare < 0 || c.initialShare > 1) problems.push("initialShare must be between 0 and 1");
  }
  if (c.mutationLoadRate < 0) problems.push("mutationLoadRate cannot be negative");
  if (c.mutationLoadRate > 0) {
    if (![0, 1].includes(c.mutationLoadModel)) problems.push("mutationLoadModel must be 0 (a fixed number of spots) or 1 (unlimited)");
    if (!Number.isInteger(c.mutationLoadLoci) || c.mutationLoadLoci < 1 || c.mutationLoadLoci > 30) problems.push("mutationLoadLoci must be a whole number from 1 to 30");
    if (c.mutationLoadBack < 0 || c.mutationLoadBack > 1 || c.mutationLoadCost < 0) problems.push("mutationLoadBack must be between 0 and 1 and mutationLoadCost cannot be negative");
    if (c.mutationLoadModel === 0 && c.mutationLoadRate > c.mutationLoadLoci) problems.push("mutationLoadRate cannot be more than mutationLoadLoci");
    if (c.mutationLoadMend < 0 || c.mutationLoadMend > 1) problems.push("mutationLoadMend must be between 0 and 1");
    if (c.mutationLoadSynergy < 0 || c.mutationLoadFertility < 0) problems.push("mutationLoadSynergy and mutationLoadFertility cannot be negative");
    if (c.mutationLoadStart < 0 || (c.mutationLoadModel === 0 && c.mutationLoadStart > c.mutationLoadLoci)) problems.push("mutationLoadStart must be between 0 and mutationLoadLoci");
  }
  if (c.luckSpread < 0 || c.luckSpread * c.luckLimit >= 1) problems.push("luckSpread cannot be negative, and luckSpread x luckLimit must stay under 1 (or an organism could have zero upkeep)");
  if (c.luckLimit <= 0) problems.push("luckLimit must be positive");
  if (c.toxinStrength < 0) problems.push("toxinStrength cannot be negative");
  if (c.toxinStrength > 0) {
    if (c.toxinUpkeep < 0 || c.avoidLearn < 0) problems.push("toxinUpkeep and avoidLearn cannot be negative");
    if (c.initialToxicity < 0 || c.initialToxicity > 1) problems.push("initialToxicity must be between 0 and 1");
    if (c.avoidFade < 0 || c.avoidFade > 1) problems.push("avoidFade must be between 0 and 1");
    if (c.avoidWidth <= 0 || c.avoidWidth > 0.5) problems.push("avoidWidth must be above 0 and at most 0.5 (it is a distance round the color wheel)");
  }
  if (c.erosionRate < 0 || c.erosionRate > 1) problems.push("erosionRate must be between 0 and 1");
  if (c.erosionRate > 0) {
    if (c.erosionBelow <= 0 || c.erosionBelow >= 1 || c.erosionRecoverAbove <= c.erosionBelow || c.erosionRecoverAbove > 1) problems.push("erosionBelow must be above 0 and under erosionRecoverAbove, which must be at most 1");
    if (c.erosionRecovery < 0 || c.erosionRecovery > 1) problems.push("erosionRecovery must be between 0 and 1");
    if (c.erosionMin <= 0 || c.erosionMin > 1) problems.push("erosionMin must be above 0 and at most 1");
  }
  if (c.fouling < 0) problems.push("fouling cannot be negative");
  if (c.fouling > 0) {
    if (!(c.foulDecay > 0) || c.foulDecay > 1) problems.push("foulDecay must be above 0 and at most 1");
    if (c.foulFree < 0 || c.foulGrowthEffect < 0 || c.foulDiseaseEffect < 0) problems.push("foulFree, foulGrowthEffect and foulDiseaseEffect cannot be negative");
  }
  if (c.overgrazeDamage < 0 || c.overgrazeDamage > 1) problems.push("overgrazeDamage must be between 0 and 1");
  if (c.overgrazeDamage > 0) {
    if (c.overgrazeBelow <= 0 || c.overgrazeBelow >= 1) problems.push("overgrazeBelow must be above 0 and under 1");
    if (c.overgrazeHeal < 0 || c.overgrazeHeal > 1) problems.push("overgrazeHeal must be between 0 and 1");
    if (c.overgrazePenalty < 0 || c.overgrazePenalty > 1) problems.push("overgrazePenalty must be between 0 and 1");
  }
  if (c.yearVariability < 0 || c.yearVariability > 1) problems.push("yearVariability must be between 0 and 1");
  if (c.yearVariability > 0 && (c.climateMode !== 1 || c.yearLength <= 0)) problems.push("yearVariability needs a climate with seasons (climateMode 1 and a yearLength)");
  if (c.fatDepositRate < 0 || c.fatDepositRate > 1 || c.fatDrawRate < 0 || c.fatCap < 0 || c.fatMoveCost < 0 || c.fatUpkeep < 0) problems.push("the fat settings cannot be negative (and fatDepositRate is at most 1)");
  if (c.fatDepositRate > 0 && (c.fatEfficiency <= 0 || c.fatEfficiency > 1)) problems.push("fatEfficiency must be above 0 and at most 1");
  if (c.fatDepositAbove < 0 || c.fatDepositAbove > 1 || c.fatDrawBelow < 0 || c.fatDrawBelow > 1) problems.push("fatDepositAbove and fatDrawBelow must be between 0 and 1");
  if (c.initialFat < 0 || c.initialFat > 1 || c.initialTorpor < 0 || c.initialTorpor > 1) problems.push("initialFat and initialTorpor must be between 0 and 1");
  if (c.torporSaving < 0 || c.torporSaving > 1) problems.push("torporSaving must be between 0 and 1");
  if (c.torporSaving > 0 && c.climateMode !== 1) problems.push("torpor needs a climate (set climateMode to 1)");
  if (c.torporSleepAt <= 0 || c.torporSleepAt > 1) problems.push("torporSleepAt must be above 0 and at most 1");
  if (c.torporBelowGrowth < 0 || c.torporUpkeep < 0) problems.push("the torpor settings cannot be negative");
  if (c.climateMode === 1) {
    for (const [name, value] of [["dayLength", c.dayLength], ["yearLength", c.yearLength], ["climateDriftPeriod", c.climateDriftPeriod]] as const) {
      if (!Number.isInteger(value) || value < 0) problems.push(`${name} must be a whole number of ticks (0 turns it off)`);
    }
    if (!(c.plantTempTolerance > 0)) problems.push("plantTempTolerance must be positive");
    for (const [name, value] of [["dayNightDepth", c.dayNightDepth], ["latitudeLight", c.latitudeLight]] as const) {
      if (value < 0 || value > 1) problems.push(`${name} must be between 0 and 1`);
    }
    if (c.seasonGrowthSwing < 0 || c.seasonGrowthSwing > 1) problems.push("seasonGrowthSwing must be between 0 and 1");
    if (c.seasonTempSwing < 0 || c.climateDriftAmplitude < 0 || c.latitudeCooling < 0 || c.mountainCooling < 0) problems.push("temperature swings and cooling cannot be negative");
  }
  if (c.kinDistance < 0 || c.kinDistance > 1) problems.push("kinDistance must be between 0 and 1");
  if (![0, 1].includes(c.kinTolerance)) problems.push("kinTolerance must be 0 or 1");
  if (c.kinTolerance === 1 && c.kinDistance <= 0) problems.push("kinTolerance needs kinDistance above 0 (the most closeness a tolerant organism can reach)");
  if (c.initialTolerance < 0 || c.initialTolerance > 1) problems.push("initialTolerance must be between 0 and 1");
  if (c.toleranceCostCoeff < 0) problems.push("toleranceCostCoeff cannot be negative");
  if (c.herdBonus < 0) problems.push("herdBonus cannot be negative");
  if (c.herdBonus > 0 && c.kinDistance <= 0) problems.push("herdBonus needs kinDistance above 0 (who counts as a relative)");
  if (!(c.herdRange > 0)) problems.push("herdRange must be positive");
  if (!(c.herdCap >= 1)) problems.push("herdCap must be at least 1");
  if (c.diseaseTransmission < 0 || c.diseaseTransmission > 1) problems.push("diseaseTransmission must be between 0 and 1");
  if (c.diseaseTransmission > 0) {
    if (!(c.diseaseContactRange > 0) || !(c.diseaseWidth > 0)) problems.push("diseaseContactRange and diseaseWidth must be positive");
    if (!Number.isInteger(c.diseaseDuration) || c.diseaseDuration < 1 || c.diseaseDuration > 60000) problems.push("diseaseDuration must be a whole number of ticks from 1 to 60000");
    if (!Number.isInteger(c.diseaseImmunity) || c.diseaseImmunity < 0 || c.diseaseImmunity > 60000) problems.push("diseaseImmunity must be a whole number of ticks from 0 to 60000");
    if (c.diseaseCost < 0) problems.push("diseaseCost cannot be negative");
    if (!Number.isInteger(c.diseaseIntroEvery) || c.diseaseIntroEvery < 1) problems.push("diseaseIntroEvery must be a whole number of ticks, 1 or more");
    if (c.diseaseMutationProb < 0 || c.diseaseMutationProb > 1 || c.diseaseDrift < 0 || c.diseaseDrift > 1) problems.push("diseaseMutationProb and diseaseDrift must be between 0 and 1");
  }
  if (![0, 1].includes(c.multicellular)) problems.push("multicellular must be 0 or 1");
  if (c.multicellular === 1) {
    if (!Number.isInteger(c.bondLinksMax) || c.bondLinksMax < 1 || c.bondLinksMax > 6) problems.push("bondLinksMax must be a whole number from 1 to 6");
    if (!Number.isInteger(c.colonyMax) || c.colonyMax < 2) problems.push("colonyMax must be a whole number of 2 or more");
    if (!(c.bondRestLength > 0)) problems.push("bondRestLength must be positive");
    if (c.bondStiffness < 0 || c.bondStiffness > 1) problems.push("bondStiffness must be between 0 and 1");
    if (!Number.isInteger(c.bondIterations) || c.bondIterations < 1) problems.push("bondIterations must be a whole number of 1 or more");
    if (c.bondShare < 0 || c.bondShare > 1 || c.bondAlign < 0 || c.bondAlign > 1) problems.push("bondShare and bondAlign must be between 0 and 1");
    if (c.initialBond < 0 || c.initialBond > 1) problems.push("initialBond must be between 0 and 1");
  }
  if (![0, 1].includes(c.contactBonding)) problems.push("contactBonding must be 0 or 1");
  if (c.contactBonding === 1 && c.multicellular !== 1) problems.push("contactBonding needs multicellular to be 1");
  if (c.initialStick < 0 || c.initialStick > 1) problems.push("initialStick must be between 0 and 1");
  if (![0, 1].includes(c.cellTypes)) problems.push("cellTypes must be 0 or 1");
  if (c.cellTypes === 1) {
    if (c.multicellular !== 1) problems.push("cellTypes needs multicellular to be 1");
    for (const [name, value] of [["typeFeederBite", c.typeFeederBite], ["typeFeederSpeed", c.typeFeederSpeed], ["typeMoverSpeed", c.typeMoverSpeed], ["typeMoverBite", c.typeMoverBite], ["typePhotoGain", c.typePhotoGain], ["typePhotoBite", c.typePhotoBite], ["typePhotoSpeed", c.typePhotoSpeed], ["typeArmorDefense", c.typeArmorDefense], ["typeArmorSpeed", c.typeArmorSpeed], ["typeArmorUpkeep", c.typeArmorUpkeep], ["typeSensorRange", c.typeSensorRange], ["typeSensorBite", c.typeSensorBite], ["typeSensorSpeed", c.typeSensorSpeed], ["colonyDefenseShare", c.colonyDefenseShare]] as const) {
      if (value < 0) problems.push(`${name} cannot be negative`);
    }
  }
  if (![0, 1, 2].includes(c.sexualReproduction)) problems.push("sexualReproduction must be 0, 1 or 2");
  if (c.initialSex < 0 || c.initialSex > 1) problems.push("initialSex must be between 0 and 1");
  if (c.sexWaitLimit < 0 || !Number.isInteger(c.sexWaitLimit)) problems.push("sexWaitLimit must be a whole number of ticks, 0 or more");
  if (!(c.mateReadyFraction > 0) || c.mateReadyFraction > 1) problems.push("mateReadyFraction must be above 0 and at most 1");
  if (c.sexFounderSpread !== -1 && (c.sexFounderSpread < 0 || c.sexFounderSpread > 1)) problems.push("sexFounderSpread must be -1 (follow founderSpread) or between 0 and 1");
  if (![0, 1].includes(c.sexAcceptAny)) problems.push("sexAcceptAny must be 0 or 1");
  if (!(c.mateRange > 0)) problems.push("mateRange must be positive");
  if (![0, 1, 2, 3].includes(c.matePreference)) problems.push("matePreference must be 0 (nearest), 1 (most similar genes), 2 (most similar color) or 3 (most similar diet)");
  if (!(c.mateDietLimit > 0 && c.mateDietLimit <= 1)) problems.push("mateDietLimit must be above 0 and at most 1");
  if (!(c.meatGorge >= 1)) problems.push("meatGorge must be at least 1");
  if (!(c.fatProvision >= 0 && c.fatProvision <= 1)) problems.push("fatProvision must be between 0 and 1");
  if (c.fatRelated !== 0 && c.fatRelated !== 1) problems.push("fatRelated must be 0 or 1");
  if (c.fatBreeding !== 0 && c.fatBreeding !== 1) problems.push("fatBreeding must be 0 or 1");
  if (!(c.mateScent >= 0) || !(c.mateScentDecay > 0 && c.mateScentDecay <= 1) || !(c.mateScentCost >= 0)) problems.push("mateScent and mateScentCost cannot be negative, and mateScentDecay must be above 0 and at most 1");
  if (c.mateScent > 0 && (c.brainMode === 0 || c.sexualReproduction === 0)) problems.push("mateScent needs brains and sexual reproduction");
  if (c.matePickiness !== 0 && c.matePickiness !== 1) problems.push("matePickiness must be 0 or 1");
  if (c.matePickiness === 1 && c.sexualReproduction === 0) problems.push("matePickiness needs sexual reproduction");
  if (!(c.pickyHalf > 0) || !(c.pickyWeight >= 0) || !(c.pickinessCost >= 0) || !(c.initialPickiness >= 0 && c.initialPickiness <= 1)) problems.push("pickyHalf must be positive, pickyWeight and pickinessCost cannot be negative, and initialPickiness must be between 0 and 1");
  if (c.eyeMode !== 0 && c.eyeMode !== 1) problems.push("eyeMode must be 0 or 1");
  if (c.eyeMode === 1 && c.brainMode === 0) problems.push("eyeMode needs brains (only brains see)");
  if (!(c.initialEye >= 0 && c.initialEye <= 1) || !(c.eyeSharpness >= 0 && c.eyeSharpness <= 1)) problems.push("initialEye and eyeSharpness must be between 0 and 1");
  if (!(c.vigilance >= 0)) problems.push("vigilance cannot be negative");
  if (c.vigilance > 0 && c.brainMode === 0) problems.push("vigilance needs brains (only brains see)");
  if (c.gutMode !== 0 && c.gutMode !== 1) problems.push("gutMode must be 0 or 1");
  if (!(c.gutCapacity > 0) || !(c.gutBite > 0) || !(c.gutDigestRate > 0)) problems.push("gutCapacity, gutBite and gutDigestRate must be positive");
  if (!(c.restSaving >= 0 && c.restSaving <= 1) || !(c.restBelow >= 0 && c.restBelow <= 2)) problems.push("restSaving must be between 0 and 1, and restBelow (a pace: 0 still, 1 normal, 2 flat out) between 0 and 2");
  if (c.restSaving > 0 && c.brainMode === 0) problems.push("restSaving needs brains (a brain decides to rest)");
  if (!(c.preyCondition >= 0 && c.preyCondition <= 1) || !(c.youngTicks >= 0)) problems.push("preyCondition must be between 0 and 1, and youngTicks cannot be negative");
  if (!(c.fightBack >= 0)) problems.push("fightBack cannot be negative");
  if (c.preyChoice !== 0 && c.preyChoice !== 1) problems.push("preyChoice must be 0 (nearest) or 1 (easiest)");
  if (!(c.attackInjury >= 0 && c.attackInjury <= 1)) problems.push("attackInjury must be between 0 and 1");
  if (!(c.natalDispersal >= 0 && c.natalDispersal < Math.min(c.worldWidth, c.worldHeight) / 2)) problems.push("natalDispersal must be at least 0 and less than half the world");
  if (c.spareFamily !== 0 && c.spareFamily !== 1) problems.push("spareFamily must be 0 (off) or 1 (never attack your own parent or offspring)");
  for (const [name, value] of [["meatColdKeep", c.meatColdKeep], ["preyHungerDefense", c.preyHungerDefense], ["weaponGrazeLoss", c.weaponGrazeLoss]] as const) {
    if (!(value >= 0 && value <= 1)) problems.push(`${name} must be between 0 and 1`);
  }
  if (c.kinHungerBelow < 0 || c.kinHungerBelow > 1 || c.camoHunterEye < 0 || c.camoHunterEye > 1) problems.push("kinHungerBelow and camoHunterEye must be between 0 and 1");
  if (![0, 1].includes(c.camouflageMode)) problems.push("camouflageMode must be 0 or 1");
  if (c.camouflageMode === 1) {
    const gw = c.worldWidth / c.foodCellSize;
    const gh = c.worldHeight / c.foodCellSize;
    if (!Number.isInteger(c.camoScale) || c.camoScale < 1 || gw % c.camoScale !== 0 || gh % c.camoScale !== 0) problems.push("camoScale must be a whole number of food cells that divides the grid evenly");
    if (c.camoDetectMin < 0 || c.camoDetectMin > 1) problems.push("camoDetectMin must be between 0 and 1");
    if (!Number.isInteger(c.camoGlance) || c.camoGlance < 1) problems.push("camoGlance must be a whole number of ticks, 1 or more");
    if (c.camoLearning < 0) problems.push("camoLearning cannot be negative");
    if (c.camoLearnRate < 0 || c.camoLearnRate > 1) problems.push("camoLearnRate must be between 0 and 1");
  }
  if (!(c.mateDistance > 0 && c.mateDistance <= 1)) problems.push("mateDistance must be above 0 and at most 1");
  if (c.macroMutationProb < 0 || c.macroMutationProb > 1) problems.push("macroMutationProb must be between 0 and 1");
  if (c.macroMutationStd < 0) problems.push("macroMutationStd cannot be negative");
  if (!Number.isInteger(c.macroMutationGenes) || c.macroMutationGenes < 1) problems.push("macroMutationGenes must be a whole number of 1 or more");
  if (!Number.isInteger(c.speciesEvery) || c.speciesEvery < 0) problems.push("speciesEvery must be a whole number of ticks (0 turns species tracking off)");
  if (c.speciesEvery > 0) {
    if (!(c.speciesDistance > 0 && c.speciesDistance <= 1)) problems.push("speciesDistance must be above 0 and at most 1");
    if (!Number.isInteger(c.speciesMinMembers) || c.speciesMinMembers < 1) problems.push("speciesMinMembers must be a whole number of 1 or more");
    if (!Number.isInteger(c.speciesProbation) || c.speciesProbation < 0) problems.push("speciesProbation must be a whole number of ticks");
    if (!(c.speciesCrashDrop > 0 && c.speciesCrashDrop < 1)) problems.push("speciesCrashDrop must be between 0 and 1");
    if (!Number.isInteger(c.speciesCrashWindow) || c.speciesCrashWindow < c.speciesEvery) problems.push("speciesCrashWindow must be at least speciesEvery ticks");
    if (!Number.isInteger(c.speciesSampleEvery) || c.speciesSampleEvery < c.speciesEvery || c.speciesSampleEvery % c.speciesEvery !== 0) {
      problems.push("speciesSampleEvery must be a multiple of speciesEvery");
    }
  }
  if (![0, 1].includes(c.brainLearning)) problems.push("brainLearning must be 0 or 1");
  if (![0, 1].includes(c.learnSenses)) problems.push("learnSenses must be 0 or 1");
  if ((c.brainLearning === 1 || c.learnSenses === 1) && c.brainMode === 0) problems.push("learning and its senses need brains (set brainMode to 1 or 2)");
  if (c.learnRateMax < 0 || c.learnLimit < 0 || c.learnCostCoeff < 0 || c.learnSenseScale < 0) problems.push("learnRateMax, learnLimit, learnCostCoeff and learnSenseScale cannot be negative");
  if (c.learnTraceDecay < 0 || c.learnTraceDecay >= 1) problems.push("learnTraceDecay must be at least 0 and below 1");
  if (c.learnBaselineRate <= 0 || c.learnBaselineRate > 1) problems.push("learnBaselineRate must be above 0 and at most 1");
  if (c.initialLearning < 0 || c.initialLearning > 1) problems.push("initialLearning must be between 0 and 1");
  if (![0, 1].includes(c.placeMemory)) problems.push("placeMemory must be 0 or 1");
  if (c.placeMemory === 1 && c.brainMode === 0) problems.push("placeMemory needs brains (set brainMode to 1 or 2)");
  if (!Number.isInteger(c.placeSlotsMax) || c.placeSlotsMax < 1 || c.placeSlotsMax > 4) problems.push("placeSlotsMax must be a whole number from 1 to 4");
  if (c.placeFade <= 0 || c.placeFade > 1) problems.push("placeFade must be above 0 and at most 1");
  if (c.placeMinMeal < 0 || c.placeMergeRadius < 0 || c.placeCostCoeff < 0) problems.push("placeMinMeal, placeMergeRadius and placeCostCoeff cannot be negative");
  if (c.placeRange <= 0) problems.push("placeRange must be positive");
  if (c.initialPlaceMemory < 0 || c.initialPlaceMemory > 1) problems.push("initialPlaceMemory must be between 0 and 1");
  if (![0, 1].includes(c.placeReflex)) problems.push("placeReflex must be 0 or 1");
  if (c.placeReflex === 1 && c.placeMemory !== 1) problems.push("placeReflex needs placeMemory 1");
  if (![0, 1].includes(c.workingMemory)) problems.push("workingMemory must be 0 or 1");
  if (c.workingMemory === 1 && (c.brainMode === 0 || c.brainMemory !== 1)) problems.push("workingMemory needs brains with memory (brainMode 1 or 2, brainMemory 1)");
  if (c.wmKeepMax < 0 || c.wmKeepMax >= 1) problems.push("wmKeepMax must be at least 0 and below 1");
  if (c.wmCostCoeff < 0) problems.push("wmCostCoeff cannot be negative");
  if (c.initialWorkingMemory < 0 || c.initialWorkingMemory > 1) problems.push("initialWorkingMemory must be between 0 and 1");
  if (![0, 1].includes(c.sprintFatigue)) problems.push("sprintFatigue must be 0 or 1");
  if (c.staminaMin < 0) problems.push("staminaMin cannot be negative");
  if (c.staminaRegen < 0 || c.staminaRestBonus < 0 || c.staminaCostCoeff < 0) problems.push("stamina regen, rest bonus and cost cannot be negative");
  if (!Number.isInteger(c.killOwnershipTicks) || c.killOwnershipTicks < 0 || c.killOwnershipTicks > 65000) {
    problems.push("killOwnershipTicks must be a whole number of ticks from 0 to 65000");
  }
  if (c.killOwnershipLeak < 0 || c.killOwnershipLeak > 1) problems.push("killOwnershipLeak must be between 0 and 1");
  if (![0, 1].includes(c.brainAppetiteSenses)) problems.push("brainAppetiteSenses must be 0 or 1");
  if (!(c.brainAppetiteFloor >= 0 && c.brainAppetiteFloor <= 1)) problems.push("brainAppetiteFloor must be between 0 and 1");
  if (c.preyAttention !== 0 && c.preyAttention !== 1) problems.push("preyAttention must be 0 or 1");
  if (c.preyAttention === 1 && (c.brainMode === 0 || c.brainAppetiteSenses !== 1)) problems.push("preyAttention needs brains and brainAppetiteSenses 1 (it tunes the appetite senses)");
  if (!(c.attentionCost >= 0) || !(c.initialAttention >= 0 && c.initialAttention <= 1)) problems.push("attentionCost cannot be negative, and initialAttention must be between 0 and 1");
  if (c.feelings !== 0 && c.feelings !== 1) problems.push("feelings must be 0 or 1");
  else if (c.feelings === 1 && c.brainMode === 0) problems.push("feelings needs brains (feelings are brain senses)");
  for (const [name, value] of [["painHit", c.painHit], ["painInjury", c.painInjury], ["joyEat", c.joyEat], ["joyKill", c.joyKill], ["joyBirth", c.joyBirth], ["joyContent", c.joyContent], ["curiosityJoy", c.curiosityJoy], ["curiosityCost", c.curiosityCost]] as const) {
    if (!(value >= 0)) problems.push(`${name} cannot be negative`);
  }
  for (const [name, value] of [["painFade", c.painFade], ["joyFade", c.joyFade], ["tasteFade", c.tasteFade], ["initialCuriosity", c.initialCuriosity]] as const) {
    if (!(value >= 0 && value <= 1)) problems.push(`${name} must be between 0 and 1`);
  }
  if (c.curiosity !== 0 && c.curiosity !== 1) problems.push("curiosity must be 0 or 1");
  else if (c.curiosity === 1 && c.feelings !== 1) problems.push("curiosity needs feelings (it gives joy)");
  if (!Number.isInteger(c.noveltyEvery) || c.noveltyEvery < 1) problems.push("noveltyEvery must be a whole number of 1 or more");
  if (!(c.noveltyCellSize > 0)) problems.push("noveltyCellSize must be positive");
  if (c.richVision !== 0 && c.richVision !== 1) problems.push("richVision must be 0 or 1");
  else if (c.richVision === 1 && c.brainMode === 0) problems.push("richVision needs brains");
  if (c.focusAction !== 0 && c.focusAction !== 1) problems.push("focusAction must be 0 or 1");
  else if (c.focusAction === 1 && c.brainMode === 0) problems.push("focusAction needs brains");
  if (!(c.visionCountHalf > 0)) problems.push("visionCountHalf must be positive");
  for (const [name, value] of [["behindRange", c.behindRange], ["plantSightReach", c.plantSightReach]] as const) if (!(value >= 0 && value <= 1)) problems.push(`${name} must be between 0 and 1`);
  if (!(c.focusHold >= 1) || !(c.focusCost >= 0)) problems.push("focusHold must be at least 1 and focusCost cannot be negative");
  if (c.worldSenses !== 0 && c.worldSenses !== 1) problems.push("worldSenses must be 0 or 1");
  else if (c.worldSenses === 1 && c.brainMode === 0) problems.push("worldSenses needs brains");
  if (!(c.crowdRange > 0) || !(c.crowdHalf > 0) || !(c.tremorRange > 0) || !(c.tremorHalf > 0)) problems.push("crowdRange, crowdHalf, tremorRange and tremorHalf must be positive");
  else if (c.worldSenses === 1 && Math.max(c.crowdRange, c.tremorRange) >= Math.min(c.worldWidth, c.worldHeight) / 2) problems.push("crowdRange and tremorRange must be under half the world");
  if (c.learnFeelings !== 0 && c.learnFeelings !== 1) problems.push("learnFeelings must be 0 or 1");
  else if (c.learnFeelings === 1 && c.feelings !== 1) problems.push("learnFeelings needs feelings");
  if (c.scentDeposit < 0) problems.push("scentDeposit cannot be negative");
  if (!(c.scentDecay > 0 && c.scentDecay <= 1)) problems.push("scentDecay must be above 0 and at most 1");
  if (!(c.scentCellSize > 0) || c.worldWidth % c.scentCellSize !== 0 || c.worldHeight % c.scentCellSize !== 0) {
    problems.push("scentCellSize must be positive and divide the world width and height");
  }
  if (!Number.isInteger(c.killCooldown) || c.killCooldown < 0 || c.killCooldown > 65000) {
    problems.push("killCooldown must be a whole number of ticks from 0 to 65000");
  }
  if (c.reachBase + c.reachPerSize * c.sizeMax >= c.foodCellSize / 2 + c.foodCellSize) {
    problems.push("attack reach is too long for the grid (keep it under one and a half food cells)");
  }
  if (c.sizeMin <= 0) problems.push("sizeMin must be positive");
  if (c.metabolismMin <= 0) problems.push("metabolismMin must be positive");
  if (c.fertilityVariation < 0 || c.fertilityVariation >= 1) problems.push("fertilityVariation must be from 0 up to (but not including) 1");
  if (c.barrenBelow < 0 || c.barrenBelow >= 2) problems.push("barrenBelow must be from 0 up to (but not including) 2");
  if (c.barrenBelow > 0 && c.fertilityVariation === 0) problems.push("barrenBelow needs fertilityVariation above 0 (without it every cell is equally fertile)");
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
