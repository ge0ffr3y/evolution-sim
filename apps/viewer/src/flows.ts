import type { HistoryPoint } from "./protocol";

/** Look back about this many ticks when working out recent energy flows. */
const WINDOW_TICKS = 1000;

export interface EnergyFlows {
  /** Sunlight captured by plants, per tick, over the recent window. This is the only energy that enters the world. */
  sunPerTick: number;
  /** Energy taken out of plants and out of corpses by eaters, per tick. */
  plantEatenPerTick: number;
  meatEatenPerTick: number;
  /** Where energy goes as heat, per tick. */
  basalPerTick: number;
  movementPerTick: number;
  sensingPerTick: number;
  fightingPerTick: number;
  armorPerTick: number;
  brainPerTick: number;
  digestionPerTick: number;
  rotPerTick: number;
  /** Ticks the numbers are averaged over. */
  span: number;
}

/** Keeps recent running totals so the page can show where energy is going right now. */
export class FlowTracker {
  private points: HistoryPoint[] = [];

  clear(): void {
    this.points = [];
  }

  add(newPoints: readonly HistoryPoint[]): void {
    this.points.push(...newPoints);
    // Keep a bit more than the window; older samples are never needed.
    const latest = this.points.at(-1);
    if (latest) {
      const cutoff = latest.tick - WINDOW_TICKS * 2;
      let drop = 0;
      while (drop < this.points.length - 2 && this.points[drop]!.tick < cutoff) drop++;
      if (drop > 0) this.points.splice(0, drop);
    }
  }

  /** Average flows over roughly the last WINDOW_TICKS ticks, or null if there is not enough history yet. */
  recent(): EnergyFlows | null {
    const latest = this.points.at(-1);
    if (!latest) return null;
    const target = latest.tick - WINDOW_TICKS;
    let start = this.points[0]!;
    for (const p of this.points) {
      if (p.tick <= target) start = p;
      else break;
    }
    const span = latest.tick - start.tick;
    if (span < 50) return null;
    const per = (key: keyof HistoryPoint): number => ((latest[key] as number) - (start[key] as number)) / span;
    return {
      sunPerTick: per("sunlightIn"),
      plantEatenPerTick: per("plantEaten"),
      meatEatenPerTick: per("meatEaten"),
      basalPerTick: per("basalBurned"),
      movementPerTick: per("movementBurned"),
      sensingPerTick: per("sensingBurned"),
      fightingPerTick: per("attackBurned"),
      armorPerTick: per("armorBurned"),
      brainPerTick: per("brainBurned"),
      digestionPerTick: per("digestionLoss"),
      rotPerTick: per("decayLoss"),
      span,
    };
  }
}
