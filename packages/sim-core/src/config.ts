import { CONN_MAX, INPUT_COUNT, OUTPUT_COUNT } from "./brain";

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
  /** How far a hunter's remembered color moves toward the color of each new kill (0 to 1). */
  camoLearnRate: number;

  // --- Multicellularity (off by default) ---
  /**
   * 0 = every organism lives alone. 1 = cells can stay together: a gene gives the chance that a baby
   * stays attached to its parent, forming a colony. Bonded cells are held near each other like
   * linked beads, turn toward their neighbors' heading so the colony moves as one, and share
   * energy (a hungry cell is fed by a fed neighbor). Needs brainMode 0 for now.
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
   * a combination of genes that would be diluted by mixing with everyone).
   */
  matePreference: number;

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
   * A population crash is logged when the population falls below (1 - speciesCrashDrop) times its
   * highest value over the last speciesCrashWindow ticks.
   */
  speciesCrashDrop: number;
  speciesCrashWindow: number;

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
  brainHidden: 8,
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
  brainBaseCost: 0.001,
  brainCostPerNeuron: 0.0005,
  brainCostPerConnection: 0.0001,
  brainAppetiteSenses: 0,
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
  thermalCostCoeff: 0,
  thermalTolerance: 0.1,
  catastropheKind: 0,
  catastropheAt: 0,
  catastropheEvery: 0,
  catastropheLength: 3000,
  iceAgeCooling: 0.3,
  droughtSeverity: 0.8,
  meteorRadius: 40,
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
  sexAcceptAny: 0,
  mateRange: 6,
  mateDistance: 0.25,
  matePreference: 0,
  macroMutationProb: 0,
  macroMutationStd: 0.3,
  macroMutationGenes: 3,
  speciesEvery: 50,
  speciesDistance: 0.2,
  speciesMinMembers: 10,
  speciesProbation: 2000,
  speciesSampleEvery: 500,
  speciesCrashDrop: 0.4,
  speciesCrashWindow: 2000,
  sprintFatigue: 0,
  staminaRegen: 0.1,
  staminaRestBonus: 1,
  staminaCostCoeff: 0.001,
  killOwnershipTicks: 0,
  killOwnershipLeak: 0.1,
  scentDeposit: 1,
  scentDecay: 0.05,
  scentCellSize: 4,

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
  if (!Number.isInteger(c.brainHidden) || c.brainHidden < 1 || c.brainHidden > 12) problems.push("brainHidden must be a whole number from 1 to 12");
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
  if (![0, 1].includes(c.terrainMode)) problems.push("terrainMode must be 0 (open plain) or 1 (biomes)");
  if (c.terrainMode === 1) {
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
  if (![0, 1].includes(c.climateMode)) problems.push("climateMode must be 0 (no climate) or 1 (climate)");
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
    if (c.brainMode !== 0) problems.push("multicellular worlds do not support brains yet (set brainMode to 0)");
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
  if (![0, 1].includes(c.sexAcceptAny)) problems.push("sexAcceptAny must be 0 or 1");
  if (!(c.mateRange > 0)) problems.push("mateRange must be positive");
  if (![0, 1, 2].includes(c.matePreference)) problems.push("matePreference must be 0 (nearest), 1 (most similar genes) or 2 (most similar color)");
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
  if (![0, 1].includes(c.sprintFatigue)) problems.push("sprintFatigue must be 0 or 1");
  if (c.staminaMin < 0) problems.push("staminaMin cannot be negative");
  if (c.staminaRegen < 0 || c.staminaRestBonus < 0 || c.staminaCostCoeff < 0) problems.push("stamina regen, rest bonus and cost cannot be negative");
  if (!Number.isInteger(c.killOwnershipTicks) || c.killOwnershipTicks < 0 || c.killOwnershipTicks > 65000) {
    problems.push("killOwnershipTicks must be a whole number of ticks from 0 to 65000");
  }
  if (c.killOwnershipLeak < 0 || c.killOwnershipLeak > 1) problems.push("killOwnershipLeak must be between 0 and 1");
  if (![0, 1].includes(c.brainAppetiteSenses)) problems.push("brainAppetiteSenses must be 0 or 1");
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
