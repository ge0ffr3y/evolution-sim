import type { SimConfig } from "./config";
import { GENE, GENE_COUNT, type TraitRange } from "./genome";
import type { GeneName } from "./genome";
import { GENES } from "./genome";

/**
 * Species tracking. This only WATCHES the world: it never changes who lives, eats or
 * breeds, uses no random numbers, and is left out of the world fingerprint.
 *
 * How it decides what a species is (the same idea NEAT uses for neural networks):
 * - Every species has a "center", the average genes of its members.
 * - Every few ticks each organism checks whether it is still close enough (genetically)
 *   to the center of its own species. If so it stays (this keeps species from flapping).
 *   If not, it joins the closest species it is near enough to, and if there is none it
 *   starts a candidate new species.
 * - A candidate only becomes a real species if it keeps at least `speciesMinMembers`
 *   members for `speciesProbation` ticks. Otherwise it was just noise (a few unusual
 *   individuals) and its members are folded back into the nearest real species.
 * - Centers follow their members, so a whole population drifting together is NOT a new
 *   species, but a group that pulls away from the rest is.
 *
 * Genetic distance is the root-mean-square difference between genes (each 0 to 1),
 * ignoring the color marker (neutral) and the mutation rate (a setting about mutation,
 * not about the body). Brains are not part of the distance yet.
 */

/** Candidate species get ids from here up until they are promoted to real ones. */
const CANDIDATE_BASE = 1_000_000_000;

/** Numbers recorded about a species at one moment: tick, members, then every trait (gene order). */
export const SAMPLE_STRIDE = 2 + GENE_COUNT;

export interface SpeciesRecord {
  id: number;
  /** The species this one split from (0 for the first generation). */
  parent: number;
  bornTick: number;
  /** Null while it still has members. */
  diedTick: number | null;
  /** Members now, and the most it ever had. */
  count: number;
  peak: number;
  /** Average traits of its members now, when it was founded, and its parent's at that moment. */
  traits: number[];
  founderTraits: number[];
  ancestorTraits: number[] | null;
  /** Samples over time, flattened: [tick, members, trait values...] repeated (see SAMPLE_STRIDE). */
  history: number[];
}

export type SpeciesEventKind = "speciation" | "extinction";

export interface SpeciesEvent {
  tick: number;
  kind: SpeciesEventKind;
  species: number;
  /** For a speciation, the species it split from. */
  parent: number;
}

interface Live {
  id: number;
  provisional: boolean;
  bornTick: number;
  parent: number;
  /** Its center: average genes of its members (all genes, so traits can be worked out). */
  center: Float64Array;
  count: number;
  sums: Float64Array;
}

export class SpeciesTracker {
  /** Every real species there has ever been, in the order they were founded. */
  readonly records: SpeciesRecord[] = [];
  readonly events: SpeciesEvent[] = [];
  private readonly live = new Map<number, Live>();
  private readonly byId = new Map<number, SpeciesRecord>();
  private nextId = 1;
  private nextCandidate = CANDIDATE_BASE;
  private readonly mask: number[];
  private readonly distanceSq: number;

  constructor(
    private readonly config: SimConfig,
    private readonly ranges: Record<GeneName, TraitRange>,
    staminaInUse: boolean,
  ) {
    // Genes that count toward "how different": everything except color and mutation rate
    // (and stamina, unless it is doing something).
    this.mask = [];
    for (const name of GENES) {
      if (name === "hue" || name === "mutationRate") continue;
      if (name === "stamina" && !staminaInUse) continue;
      this.mask.push(GENE[name]);
    }
    this.distanceSq = config.speciesDistance * config.speciesDistance;
  }

  /** Species alive now, and how many real species there have ever been. */
  get aliveCount(): number {
    let alive = 0;
    for (const record of this.records) if (record.diedTick === null) alive++;
    return alive;
  }

  recordOf(id: number): SpeciesRecord | undefined {
    return this.byId.get(id);
  }

  /**
   * The real species an organism belongs to. While a candidate species is still on probation
   * its members count as members of the species it came from.
   */
  realSpeciesOf(id: number): number {
    const live = this.live.get(id);
    return live && live.provisional ? live.parent : id;
  }

  /** Put the first generation into one species. */
  start(n: number, genes: Float32Array, species: Uint32Array): void {
    const live = this.newLive(this.nextId++, false, 0, 0);
    for (let i = 0; i < n; i++) {
      species[i] = live.id;
      this.add(live, genes, i);
    }
    this.finish(live);
    const record = this.createRecord(live, 0, null);
    record.history.push(0, live.count, ...record.traits);
    this.live.set(live.id, live);
    this.records.push(record);
    this.byId.set(record.id, record);
  }

  private newLive(id: number, provisional: boolean, bornTick: number, parent: number): Live {
    return { id, provisional, bornTick, parent, center: new Float64Array(GENE_COUNT), count: 0, sums: new Float64Array(GENE_COUNT) };
  }

  private add(live: Live, genes: Float32Array, i: number): void {
    live.count++;
    const base = i * GENE_COUNT;
    for (let k = 0; k < GENE_COUNT; k++) live.sums[k] = live.sums[k]! + genes[base + k]!;
  }

  /** Turn the running sums into a center. */
  private finish(live: Live): void {
    if (live.count === 0) return;
    for (let k = 0; k < GENE_COUNT; k++) live.center[k] = live.sums[k]! / live.count;
  }

  private distanceSqTo(genes: Float32Array, i: number, center: Float64Array): number {
    const base = i * GENE_COUNT;
    let sum = 0;
    for (const k of this.mask) {
      const d = genes[base + k]! - center[k]!;
      sum += d * d;
    }
    return sum / this.mask.length;
  }

  /** Average trait values (real units) for a center. */
  private traitsOf(center: Float64Array): number[] {
    return GENES.map((name) => this.ranges[name].min + center[GENE[name]]! * (this.ranges[name].max - this.ranges[name].min));
  }

  private createRecord(live: Live, bornTick: number, ancestor: number[] | null): SpeciesRecord {
    const traits = this.traitsOf(live.center);
    return {
      id: live.id,
      parent: live.parent,
      bornTick,
      diedTick: null,
      count: live.count,
      peak: live.count,
      traits,
      founderTraits: traits.slice(),
      ancestorTraits: ancestor,
      history: [],
    };
  }

  /** Re-check everyone's species. Call every `speciesEvery` ticks, after births and deaths. */
  update(tick: number, n: number, genes: Float32Array, species: Uint32Array): void {
    // 1. Everyone stays, joins a nearby species, or starts a candidate.
    for (const live of this.live.values()) {
      live.count = 0;
      live.sums.fill(0);
    }
    for (let i = 0; i < n; i++) {
      const own = this.live.get(species[i]!);
      let target: Live | undefined;
      if (own && this.distanceSqTo(genes, i, own.center) <= this.distanceSq) {
        target = own;
      } else {
        let best = Infinity;
        for (const candidate of this.live.values()) {
          const d = this.distanceSqTo(genes, i, candidate.center);
          if (d <= this.distanceSq && d < best) {
            best = d;
            target = candidate;
          }
        }
        if (!target) {
          const parent = own ? (own.provisional ? own.parent : own.id) : 0;
          target = this.newLive(this.nextCandidate++, true, tick, parent);
          // A new candidate starts out centered on its first member.
          for (let k = 0; k < GENE_COUNT; k++) target.center[k] = genes[i * GENE_COUNT + k]!;
          this.live.set(target.id, target);
        }
      }
      species[i] = target.id;
      this.add(target, genes, i);
    }
    for (const live of this.live.values()) this.finish(live);

    // 2. Candidates that have been around long enough become real species, or are dissolved as noise.
    const promote = new Map<number, number>();
    const dissolve = new Set<number>();
    for (const live of this.live.values()) {
      if (!live.provisional) continue;
      if (live.count === 0) {
        dissolve.add(live.id);
      } else if (tick - live.bornTick >= this.config.speciesProbation) {
        const anyReal = [...this.live.values()].some((other) => !other.provisional);
        if (live.count >= this.config.speciesMinMembers || !anyReal) promote.set(live.id, this.nextId++);
        else dissolve.add(live.id);
      }
    }
    if (promote.size > 0 || dissolve.size > 0) {
      for (let i = 0; i < n; i++) {
        const id = species[i]!;
        const promoted = promote.get(id);
        if (promoted !== undefined) {
          species[i] = promoted;
        } else if (dissolve.has(id)) {
          // Noise: fold into the nearest real species, however far away it is.
          let best = Infinity;
          let target = 0;
          for (const real of this.live.values()) {
            if (real.provisional) continue;
            const d = this.distanceSqTo(genes, i, real.center);
            if (d < best) {
              best = d;
              target = real.id;
            }
          }
          species[i] = target;
          const real = this.live.get(target);
          if (real) this.add(real, genes, i);
        }
      }
      for (const [oldId, newId] of promote) {
        const live = this.live.get(oldId)!;
        this.live.delete(oldId);
        live.id = newId;
        live.provisional = false;
        const parentLive = this.live.get(live.parent);
        const ancestor = parentLive && parentLive.count > 0 ? this.traitsOf(parentLive.center) : (this.byId.get(live.parent)?.traits.slice() ?? null);
        const record = this.createRecord(live, live.bornTick, ancestor);
        this.live.set(newId, live);
        this.records.push(record);
        this.byId.set(newId, record);
        this.events.push({ tick, kind: "speciation", species: newId, parent: live.parent });
      }
      for (const id of dissolve) this.live.delete(id);
      for (const live of this.live.values()) this.finish(live);
    }

    // 3. Real species with nobody left are extinct. Everyone else updates their record.
    // (Members of a candidate on probation still count toward the species it came from.)
    const onProbation = new Map<number, number>();
    for (const live of this.live.values()) if (live.provisional) onProbation.set(live.parent, (onProbation.get(live.parent) ?? 0) + live.count);
    for (const live of [...this.live.values()]) {
      if (live.provisional) continue;
      const record = this.byId.get(live.id)!;
      const members = live.count + (onProbation.get(live.id) ?? 0);
      if (members === 0) {
        record.diedTick = tick;
        record.count = 0;
        this.events.push({ tick, kind: "extinction", species: live.id, parent: live.parent });
        this.live.delete(live.id);
        continue;
      }
      record.count = members;
      if (members > record.peak) record.peak = members;
      if (live.count > 0) record.traits = this.traitsOf(live.center);
      if (tick % this.config.speciesSampleEvery === 0) record.history.push(tick, members, ...record.traits);
    }
  }
}
