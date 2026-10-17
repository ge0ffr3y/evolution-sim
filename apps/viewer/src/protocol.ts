import type { SimStats } from "@evo/sim-core";

/** Messages from the page to the simulation worker. */
export type ToWorker =
  | { type: "reset"; seed: number }
  | { type: "play" }
  | { type: "pause" }
  /** How many simulation ticks to run per real second. Infinity means "as fast as possible". */
  | { type: "speed"; ticksPerSecond: number };

/** One sample of the numbers drawn on the charts. */
export interface HistoryPoint {
  tick: number;
  population: number;
  totalFood: number;
  meanSpeed: number;
  meanSize: number;
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
  world: {
    width: number;
    height: number;
    gridWidth: number;
    gridHeight: number;
    foodCap: number;
  };
  count: number;
  x: Float32Array;
  y: Float32Array;
  speed: Float32Array;
  size: Float32Array;
  food: Float32Array;
  /** Chart samples recorded since the previous frame. */
  points: HistoryPoint[];
}
