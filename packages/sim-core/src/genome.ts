import type { SimConfig } from "./config";

/**
 * The genome: each organism carries one number between 0 and 1 for every gene
 * below. The traits it actually lives with (its size, speed and so on) are
 * worked out from the genes ("phenotype mapping") by stretching each gene
 * across that trait's allowed range from the config.
 */
export const GENES = ["size", "speed", "senseRange", "metabolism", "hue", "mutationRate", "diet", "attack", "armor", "stamina", "thermal", "lifespan", "litter", "bond"] as const;
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
