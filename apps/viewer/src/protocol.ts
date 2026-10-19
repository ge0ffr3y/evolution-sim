import type { BehaviorStats, GeneName, OrganismSnapshot, SimConfig, SimEvent, SimStats, SpeciesEvent, SpeciesRecord, TraitRange, WorldEvent } from "@evo/sim-core";

/** Messages from the page to the simulation worker. */
export type ToWorker =
  | { type: "reset"; seed: number; config: Partial<SimConfig> }
  | { type: "play" }
  | { type: "pause" }
  /** How many simulation ticks to run per real second. Infinity means "as fast as possible". */
  | { type: "speed"; ticksPerSecond: number }
  /** Select the organism nearest this point (in world units), if there is one close enough. */
  | { type: "inspectAt"; x: number; y: number }
  | { type: "clearInspect" }
  /** Ask for the whole world as bytes (answered with a "saved" message). */
  | { type: "save" }
  /** Replace the world with a saved one. With branchSeed, carry on from the same moment with a different random future. */
  | { type: "load"; bytes: Uint8Array; branchSeed?: number };

/** The worker's answer to "save". */
export interface SavedMessage {
  type: "saved";
  bytes: Uint8Array;
  tick: number;
  seed: number;
}

/** The worker could not make sense of a file sent with "load". */
export interface LoadFailedMessage {
  type: "loadFailed";
  message: string;
}

/** Everything the worker can send the page. */
export type FromWorker = FrameMessage | SavedMessage | LoadFailedMessage;

/** One sample of the numbers drawn on the charts and the energy-flow readout. */
export interface HistoryPoint {
  tick: number;
  population: number;
  herbivores: number;
  omnivores: number;
  carnivores: number;
  totalFood: number;
  totalKills: number;
  meanSize: number;
  meanSpeed: number;
  meanSense: number;
  meanMetabolism: number;
  /** Running energy totals, so the page can work out recent flows. */
  sunlightIn: number;
  plantEaten: number;
  meatEaten: number;
  digestionLoss: number;
  decayLoss: number;
  basalBurned: number;
  movementBurned: number;
  sensingBurned: number;
  attackBurned: number;
  armorBurned: number;
  brainBurned: number;
  /** Average brain size (working hidden units and connections) by diet class. */
  hiddenHerbivores: number;
  connectionsHerbivores: number;
  hiddenCarnivores: number;
  connectionsCarnivores: number;
  /** Multicellular complexity (zeros without bonding): the share of organisms that are in a colony, and the colonies' average size, average number of cell types and symmetry. */
  colonyShare: number;
  colonyMeanSize: number;
  colonyMeanTypes: number;
  colonySymmetry: number;
}

/** How many organisms fall in each slice of every trait's range, at one moment. */
export interface HistogramSample {
  tick: number;
  counts: Record<GeneName, Uint32Array>;
}

/** The organism being inspected, even after it dies (its last known state is kept). */
export interface InspectedState {
  snapshot: OrganismSnapshot;
  alive: boolean;
  /** Tick at which we noticed it was gone. */
  diedAtTick: number | null;
}

/** Fixed facts about the current world, sent with every frame (cheap) so the page never has to guess. */
export interface WorldInfo {
  width: number;
  height: number;
  gridWidth: number;
  gridHeight: number;
  foodCap: number;
  /** What a "full" cell looks like for each overlay, so the map can be shaded sensibly. */
  overlayScale: { nutrient: number; corpse: number; detritus: number; scent: number };
  /** Size of the scent-trail grid (finer than the food grid). */
  scentWidth: number;
  scentHeight: number;
  ranges: Record<GeneName, TraitRange>;
  histogramBins: number;
  histogramEvery: number;
  /** 0 = no brains, 1 = fixed layout, 2 = evolvable layout. */
  brainMode: number;
  /** Whether cells can bond into colonies. */
  multicellular: boolean;
  /** Whether the world has disease and camouflage. */
  diseaseOn: boolean;
  camouflageOn: boolean;
  /** How many kinds of plant there are (1 = one kind), and whether sex is a gene. */
  plantKinds: number;
  sexGeneOn: boolean;
  /** Whether the world has a climate, and the length of its year and its day in ticks (0 = none). */
  climateMode: number;
  yearLength: number;
  dayLength: number;
}

/** Everything the page needs to draw one picture of the world. */
export interface FrameMessage {
  type: "frame";
  /** Changes every time the simulation restarts, so stale frames can be ignored. */
  resetId: number;
  seed: number;
  running: boolean;
  extinct: boolean;
  stats: SimStats;
  world: WorldInfo;
  count: number;
  x: Float32Array;
  y: Float32Array;
  speed: Float32Array;
  size: Float32Array;
  sense: Float32Array;
  hue: Float32Array;
  diet: Float32Array;
  /** Energy as a fraction of the amount needed to reproduce. */
  energyFraction: Float32Array;
  food: Float64Array;
  /** Soil nutrient, corpse energy and detritus in each cell (for the map overlays). */
  nutrient: Float64Array;
  corpse: Float64Array;
  detritus: Float64Array;
  /** How much damage overgrazing has done to each cell, 0 to 1 (null in worlds without overgrazing). */
  grazing: Float32Array | null;
  /** Plant-eater and meat-eater scent in each square of the scent grid (empty when brains are off). */
  preyScent: Float32Array;
  hunterScent: Float32Array;
  /** Most food each cell can hold. Sent only in the first frame after a restart. */
  capacity: Float64Array | null;
  /** The current temperature and plant growth factor of every cell (null in worlds without a climate). */
  climate: { temperature: Float32Array; growth: Float32Array } | null;
  /** The background color of each cell (0 to 1 round the color wheel); null except in the first frame after a restart, and in worlds without camouflage. */
  background: Float32Array | null;
  /** Which kind of plant grows in each cell (sent with the land, only in worlds with several kinds). */
  plantKindMap: Uint8Array | null;
  /** Each animal's palate gene (0 to 1), only in worlds with several kinds of plant. */
  palate: Float32Array | null;
  /** Bonds between cells as pairs of organism indices (a, b, a, b, ...), and the size of each organism's colony (null without multicellularity). */
  bonds: Uint32Array | null;
  colonySize: Uint16Array | null;
  /** The cell type of each organism (0 generalist, 1 feeder, 2 mover, 3 photosynthesizer, 4 armor, 5 sensor); null without cell types. */
  cellType: Uint8Array | null;
  /** For each organism: 0 healthy, 1 sick, 2 immune (null in worlds without disease). */
  health: Uint8Array | null;
  /** The biome of each cell (0 water, 1 plains, 2 forest, 3 desert, 4 mountains); null except in the first frame after a restart, and in worlds without terrain. */
  terrain: Uint8Array | null;
  /** Chart samples recorded since the previous frame. */
  points: HistoryPoint[];
  /** Histogram snapshots taken since the previous frame. */
  histograms: HistogramSample[];
  inspected: InspectedState | null;
  /** Notable firsts so far (the first kill, the first carnivore...). */
  events: SimEvent[];
  /** How purposefully organisms have been turning recently (0.5 = random). */
  behavior: BehaviorStats;
  /**
   * The family tree so far. Large (it carries each species' whole history), so it is only
   * sent every second or so; null on the frames in between.
   */
  species: SpeciesRecord[] | null;
  /** Speciations, extinctions and population crashes (sent along with `species`). */
  speciesEvents: SpeciesEvent[] | null;
  /** Catastrophes and their ends (sent along with `species`). */
  worldEvents: WorldEvent[] | null;
}
