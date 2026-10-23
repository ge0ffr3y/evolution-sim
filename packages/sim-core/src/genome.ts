import type { SimConfig } from "./config";

/**
 * The genome: each organism carries one number between 0 and 1 for every gene
 * below. The traits it actually lives with (its size, speed and so on) are
 * worked out from the genes ("phenotype mapping") by stretching each gene
 * across that trait's allowed range from the config.
 */
export const GENES = ["size", "speed", "senseRange", "metabolism", "hue", "mutationRate", "diet", "attack", "armor", "stamina", "thermal", "lifespan", "litter", "bond", "plan1", "plan2", "plan3", "stick", "tolerance", "sex", "fat", "torpor", "palate", "stressResponse", "calmResponse", "generosity", "toxicity", "signal", "learning", "placeMemory", "workingMemory", "pickiness", "eye"] as const;
export type GeneName = (typeof GENES)[number];
export const GENE_COUNT = GENES.length;

/**
 * Genes before the optional ones. Stamina only does anything when sprint fatigue is switched
 * on, the thermal gene only when thermalCostCoeff is above zero in a world with a climate, the
 * lifespan gene only when aging is on and the litter gene only when litterMax is above 1 (see
 * the config). Worlds without them ignore the genes entirely: they are neither mutated nor counted
 * in the world fingerprint, and those worlds play out exactly as they did before they existed.
 */
export const CORE_GENE_COUNT = 9;

/** Position of each gene inside an organism's genome. */
export const GENE = {
  size: 0,
  speed: 1,
  senseRange: 2,
  metabolism: 3,
  hue: 4,
  mutationRate: 5,
  diet: 6,
  attack: 7,
  armor: 8,
  stamina: 9,
  thermal: 10,
  lifespan: 11,
  litter: 12,
  bond: 13,
  plan1: 14,
  plan2: 15,
  plan3: 16,
  stick: 17,
  tolerance: 18,
  sex: 19,
  fat: 20,
  torpor: 21,
  palate: 22,
  stressResponse: 23,
  calmResponse: 24,
  generosity: 25,
  toxicity: 26,
  signal: 27,
  learning: 28,
  placeMemory: 29,
  workingMemory: 30,
  pickiness: 31,
  eye: 32,
} as const satisfies Record<GeneName, number>;

/** Real-world values for every gene, e.g. { size: 1.2, speed: 0.8, ... }. */
export type Traits = Record<GeneName, number>;

export interface TraitRange {
  min: number;
  max: number;
}

/** The allowed range of each trait. Hue is a plain 0 to 1 marker with no effect on survival. */
export function traitRanges(c: SimConfig): Record<GeneName, TraitRange> {
  return {
    size: { min: c.sizeMin, max: c.sizeMax },
    speed: { min: c.speedMin, max: c.speedMax },
    senseRange: { min: c.senseRangeMin, max: c.senseRangeMax },
    metabolism: { min: c.metabolismMin, max: c.metabolismMax },
    hue: { min: 0, max: 1 },
    mutationRate: { min: c.mutationRateMin, max: c.mutationRateMax },
    diet: { min: c.dietMin, max: c.dietMax },
    attack: { min: c.attackMin, max: c.attackMax },
    armor: { min: c.armorMin, max: c.armorMax },
    stamina: { min: c.staminaMin, max: c.staminaMax },
    thermal: { min: c.thermalMin, max: c.thermalMax },
    lifespan: { min: c.lifespanMin, max: c.lifespanMax },
    litter: { min: c.litterMin, max: c.litterMax },
    // The chance a baby stays attached to its parent: a plain 0 to 1.
    bond: { min: 0, max: 1 },
    // The body plan: which cell type a bonded baby becomes (see cellTypes in the config), as a plain 0 to 1.
    plan1: { min: 0, max: 1 },
    plan2: { min: 0, max: 1 },
    plan3: { min: 0, max: 1 },
    // How readily a cell bonds to a neighbor it did not come from: a plain 0 to 1.
    stick: { min: 0, max: 1 },
    // How close a relative has to be before this organism will not attack it, as a share of kinDistance: a plain 0 to 1.
    tolerance: { min: 0, max: 1 },
    // The chance that a ready organism looks for a mate instead of splitting in two: a plain 0 to 1.
    sex: { min: 0, max: 1 },
    // How big an energy reserve to bank before reproducing, and how readily it goes dormant when plants stop growing: plain 0 to 1.
    fat: { min: 0, max: 1 },
    torpor: { min: 0, max: 1 },
    // Which kind of plant it digests best, from the first kind (0) to the last (1): a plain 0 to 1.
    palate: { min: 0, max: 1 },
    // How strongly the stress and calm signals act on the body: plain 0 to 1.
    stressResponse: { min: 0, max: 1 },
    calmResponse: { min: 0, max: 1 },
    // How much of its spare energy it gives to hungry neighbors: plain 0 to 1.
    generosity: { min: 0, max: 1 },
    // How poisonous the body is to whoever eats it: plain 0 to 1.
    toxicity: { min: 0, max: 1 },
    // How strongly a cell shares what it senses with the cells it is bonded to: plain 0 to 1.
    signal: { min: 0, max: 1 },
    // How fast its brain's connections change with experience during its life (0 = never learns): plain 0 to 1.
    learning: { min: 0, max: 1 },
    // How many good feeding places it can remember (0 up to placeSlotsMax): plain 0 to 1.
    placeMemory: { min: 0, max: 1 },
    // How much its brain can hold in mind: how many memory cells it can use (the brain decides what to hold): plain 0 to 1.
    workingMemory: { min: 0, max: 1 },
    // How strongly it turns down mates that eat differently from itself (when it has mates to choose from): plain 0 to 1.
    pickiness: { min: 0, max: 1 },
    // Its eye, from wide and short (0) through today's (0.5) to narrow, far-reaching and sharp (1): plain 0 to 1.
    eye: { min: 0, max: 1 },
  };
}

export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Turn a gene (0 to 1) into a trait value within its range. */
export function geneToTrait(gene: number, range: TraitRange): number {
  return range.min + gene * (range.max - range.min);
}

/** The reverse of geneToTrait: which gene value produces this trait value? */
export function traitToGene(value: number, range: TraitRange): number {
  const span = range.max - range.min;
  return span === 0 ? 0 : clamp01((value - range.min) / span);
}

/** All traits of an organism, from its genes stored at `genes[offset ...]`. */
export function expressGenes(genes: ArrayLike<number>, offset: number, ranges: Record<GeneName, TraitRange>): Traits {
  const traits = {} as Traits;
  for (const name of GENES) traits[name] = geneToTrait(genes[offset + GENE[name]]!, ranges[name]);
  return traits;
}
