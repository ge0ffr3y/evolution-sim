export { Rng } from "./rng";
export type { RngState } from "./rng";
export { CONFIG_KEYS, DEFAULT_CONFIG, makeConfig, parseConfigOverrides } from "./config";
export type { SimConfig } from "./config";
export {
  GENE,
  GENES,
  GENE_COUNT,
  expressGenes,
  geneToTrait,
  traitRanges,
  traitToGene,
} from "./genome";
export type { GeneName, TraitRange, Traits } from "./genome";
export { parsePreset } from "./presets";
export type { Preset } from "./presets";
export { SpatialHash } from "./spatial-hash";
export { Simulation } from "./simulation";
export type {
  DietClasses,
  EnergyAudit,
  EnergyLedger,
  MatterAudit,
  OrganismSnapshot,
  SimEvent,
  SimEventKind,
  SimStats,
  TraitSummary,
} from "./simulation";
