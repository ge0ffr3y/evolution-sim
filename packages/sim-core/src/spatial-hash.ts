/**
 * Spatial hash grid: answers "who is near this point?" without checking everyone.
 *
 * The world is cut into square buckets. Call rebuild() with the current
 * organism positions, then forEachNear() only looks inside the buckets that
 * overlap the search circle. The world wraps around, so a search near one edge
 * also finds organisms near the opposite edge.
 *
 * Nothing in the Phase 1 tick uses this yet (wandering organisms ignore their
 * neighbors). Predation, senses and mating in later phases will rely on it.
 */
export class SpatialHash {
  private readonly gridWidth: number;
  private readonly gridHeight: number;
  /** cellStart[c] .. cellStart[c+1] is the slice of `items` that belongs to bucket c. */
  private readonly cellStart: Uint32Array;
  private readonly items: Uint32Array;
  private readonly cellOf: Uint32Array;
  private xs: Float32Array = new Float32Array(0);
  private ys: Float32Array = new Float32Array(0);

  constructor(
    readonly worldWidth: number,
    readonly worldHeight: number,
    readonly cellSize: number,
    capacity: number,
  ) {
    if (worldWidth % cellSize !== 0 || worldHeight % cellSize !== 0) {
      throw new Error("SpatialHash: world size must be a multiple of cellSize");
    }
    this.gridWidth = worldWidth / cellSize;
    this.gridHeight = worldHeight / cellSize;
    this.cellStart = new Uint32Array(this.gridWidth * this.gridHeight + 1);
    this.items = new Uint32Array(capacity);
    this.cellOf = new Uint32Array(capacity);
  }

  /** Index the first `count` organisms at the given positions. */
  rebuild(xs: Float32Array, ys: Float32Array, count: number): void {
    this.xs = xs;
    this.ys = ys;
    const cellStart = this.cellStart;
    cellStart.fill(0);

    // Counting sort: count per bucket, turn counts into start offsets, then fill.
    for (let i = 0; i < count; i++) {
      const cell = this.cellIndex(xs[i]!, ys[i]!);
      this.cellOf[i] = cell;
      cellStart[cell + 1]!++;
    }
    for (let c = 0; c < this.gridWidth * this.gridHeight; c++) {
      cellStart[c + 1] = cellStart[c + 1]! + cellStart[c]!;
    }
    const fill = cellStart.slice(0, this.gridWidth * this.gridHeight);
    for (let i = 0; i < count; i++) {
      const cell = this.cellOf[i]!;
      this.items[fill[cell]!] = i;
      fill[cell]!++;
    }
  }

  private cellIndex(x: number, y: number): number {
    return Math.floor(y / this.cellSize) * this.gridWidth + Math.floor(x / this.cellSize);
  }

  /**
   * Call `visit(index, distanceSquared)` for every organism within `radius` of
   * (px, py), measuring distance the short way around the wrapped world.
   * Results come in a fixed order, so searches are deterministic.
   */
  forEachNear(px: number, py: number, radius: number, visit: (index: number, distSq: number) => void): void {
    const cs = this.cellSize;
    const gw = this.gridWidth;
    const gh = this.gridHeight;

    // Range of buckets the search circle touches. If it spans the whole world,
    // visit each bucket exactly once instead of wrapping around onto itself.
    let cx0 = Math.floor((px - radius) / cs);
    let cxCount = Math.floor((px + radius) / cs) - cx0 + 1;
    let cy0 = Math.floor((py - radius) / cs);
    let cyCount = Math.floor((py + radius) / cs) - cy0 + 1;
    if (cxCount > gw) {
      cx0 = 0;
      cxCount = gw;
    }
    if (cyCount > gh) {
      cy0 = 0;
      cyCount = gh;
    }

    const radiusSq = radius * radius;
    const halfW = this.worldWidth / 2;
    const halfH = this.worldHeight / 2;

    for (let dy = 0; dy < cyCount; dy++) {
      const cy = (((cy0 + dy) % gh) + gh) % gh;
      for (let dx = 0; dx < cxCount; dx++) {
        const cx = (((cx0 + dx) % gw) + gw) % gw;
        const cell = cy * gw + cx;
        const end = this.cellStart[cell + 1]!;
        for (let s = this.cellStart[cell]!; s < end; s++) {
          const i = this.items[s]!;
          let ddx = Math.abs(this.xs[i]! - px);
          let ddy = Math.abs(this.ys[i]! - py);
          if (ddx > halfW) ddx = this.worldWidth - ddx;
          if (ddy > halfH) ddy = this.worldHeight - ddy;
          const distSq = ddx * ddx + ddy * ddy;
          if (distSq <= radiusSq) visit(i, distSq);
        }
      }
    }
  }
}
