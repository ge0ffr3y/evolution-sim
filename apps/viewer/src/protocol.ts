import type { BehaviorStats, GeneName, OrganismSnapshot, SimConfig, SimEvent, SimStats, TraitRange } from "@evo/sim-core";

/** Messages from the page to the simulation worker. */
export type ToWorker =
  | { type: "reset"; seed: number; config: Partial<SimConfig> }
  | { type: "play" }
  | { type: "pause" }
  /** How many simulation ticks to run per real second. Infinity means "as fast as possible". */
  | { type: "speed"; ticksPerSecond: number }
  /** Select the organism nearest this point (in world units), if there is one close enough. */
  | { type: "inspectAt"; x: number; y: number }
  | { type: "clearInspect" };

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
  overlayScale: { nutrient: number; corpse: number; detritus: number };
  ranges: Record<GeneName, TraitRange>;
  histogramBins: number;
  histogramEvery: number;
  /** 0 = no brains, 1 = fixed layout, 2 = evolvable layout. */
  brainMode: number;
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
  /** Most food each cell can hold. Sent only in the first frame after a restart. */
  capacity: Float64Array | null;
  /** Chart samples recorded since the previous frame. */
  points: HistoryPoint[];
  /** Histogram snapshots taken since the previous frame. */
  histograms: HistogramSample[];
  inspected: InspectedState | null;
  /** Notable firsts so far (the first kill, the first carnivore...). */
  events: SimEvent[];
  /** How purposefully organisms have been turning recently (0.5 = random). */
  behavior: BehaviorStats;
}
