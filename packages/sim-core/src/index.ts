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
export {
  CONN_MAX,
  HIDDEN_MAX,
  HIDDEN_START,
  INPUT,
  INPUT_COUNT,
  NODE_COUNT,
  OUTPUT,
  OUTPUT_COUNT,
  OUTPUT_LABELS,
  OUTPUT_START,
  RAY_COUNT,
  evaluateBrain,
  inputLabel,
  soft,
} from "./brain";
export { SpatialHash } from "./spatial-hash";
export { Simulation } from "./simulation";
export type {
  BehaviorStats,
  BrainSnapshot,
  BrainStats,
  DietClasses,
  EnergyAudit,
  EnergyLedger,
  MatterAudit,
  OrganismSnapshot,
  SimEvent,
  WorldEvent,
  SimEventKind,
  SimStats,
  TraitSummary,
} from "./simulation";
export { SAMPLE_STRIDE } from "./species";
export type { LifeRecords, Lifestyle, SpeciesEvent, SpeciesEventKind, SpeciesRecord } from "./species";
export { SNAPSHOT_FORMAT, snapshotFromBytes, snapshotToBytes } from "./snapshot";
export type { SimSnapshot, SnapshotArray } from "./snapshot";
export { BIOME, BIOME_NAMES } from "./terrain";
export { polarness, smoothWave } from "./climate";
