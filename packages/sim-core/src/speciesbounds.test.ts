import { describe, expect, it } from "vitest";
import type { SimConfig } from "./config";
import { Simulation } from "./simulation";
import { snapshotFromBytes, snapshotToBytes } from "./snapshot";
import { SAMPLE_STRIDE, type SpeciesRecord } from "./species";

/** A small world where species split off and die out often. */
const CHURN: Partial<SimConfig> = { worldWidth: 128, worldHeight: 128, initialOrganisms: 120, speciesEvery: 20, speciesSampleEvery: 100, speciesDistance: 0.1, speciesProbation: 200 };
/** Limits tiny enough that a short run reaches every one of them. */
const TIGHT: Partial<SimConfig> = { speciesHistoryMax: 6, speciesExtinctHistory: 3, speciesKeepExtinct: 2, speciesKeepSummaries: 2 };

const samples = (r: SpeciesRecord): number => r.history.length / SAMPLE_STRIDE;

function expectWithinLimits(sim: Simulation): void {
  const records = sim.speciesRecords;
  for (const r of records) expect(samples(r)).toBeLessThanOrEqual(r.diedTick === null ? 6 : 3);
  expect(records.filter((r) => r.diedTick !== null && r.history.length > 0).length).toBeLessThanOrEqual(2);
  expect(records.filter((r) => r.diedTick !== null && r.history.length === 0).length).toBeLessThanOrEqual(2);
}

describe("the species record book stays bounded", () => {
  it("keeps every history within its limits, counts forgotten species as 'ever', and changes nothing in the world", () => {
    const tight = new Simulation(5, { ...CHURN, ...TIGHT });
    const loose = new Simulation(5, CHURN);
    tight.run(15_000);
    loose.run(15_000);
    // The run is long enough to matter: a living species outgrew the sample limit many times over.
    expect(Math.max(...loose.speciesRecords.map(samples))).toBeGreaterThan(6 * 10);
    expectWithinLimits(tight);
    expect(tight.stats().species.ever).toBe(loose.stats().species.ever);
    expect(tight.stats().species.alive).toBe(loose.stats().species.alive);
    // The book only watches: the world plays out exactly the same.
    expect(tight.fingerprint()).toBe(loose.fingerprint());
  });

  it("keeps a thinned history spread over the whole life (the first and the latest sample kept)", () => {
    const loose = new Simulation(6, CHURN);
    const tight = new Simulation(6, { ...CHURN, ...TIGHT });
    loose.run(8_000);
    tight.run(8_000);
    const first = tight.speciesRecords.find((r) => r.id === 1)!;
    const full = loose.speciesRecords.find((r) => r.id === 1)!;
    expect(first.history[0]).toBe(full.history[0]);
    if (first.diedTick === null) expect(first.history[first.history.length - SAMPLE_STRIDE]).toBe(full.history[full.history.length - SAMPLE_STRIDE]);
  });

  it("brings an older, unbounded save within the limits when it loads (thinned, summed up, forgotten), keeping the count", () => {
    const loose = new Simulation(5, CHURN);
    loose.run(3_000);
    // A long history of extinct species, as a very old world has: 10 dead species with 50 samples each.
    const first = loose.speciesRecords[0]!;
    for (let k = 0; k < 10; k++) {
      const history: number[] = [];
      for (let t = 0; t < 50; t++) history.push(t * 100, 10 + t, ...first.traits);
      loose.speciesRecords.push({ ...first, id: 1_000 + k, parent: 1, bornTick: 0, diedTick: 5_000 + k, count: 0, history, traits: first.traits.slice(), founderTraits: first.traits.slice() });
    }
    const snapshot = snapshotFromBytes(snapshotToBytes(loose.save()));
    snapshot.config = { ...snapshot.config, ...TIGHT };
    const loaded = Simulation.load(snapshot);
    expectWithinLimits(loaded);
    // The newest 2 dead species keep 3 samples each, the 2 before them are summaries, and the 6 oldest are forgotten.
    const dead = loaded.speciesRecords.filter((r) => r.diedTick !== null);
    expect(dead.map((r) => [r.id, samples(r)])).toEqual([
      [1006, 0],
      [1007, 0],
      [1008, 3],
      [1009, 3],
    ]);
    expect(loaded.stats().species.ever).toBe(loose.speciesRecords.length);
    const again = Simulation.load(snapshotFromBytes(snapshotToBytes(loaded.save())));
    expect(again.stats().species.ever).toBe(loose.speciesRecords.length);
    loaded.run(500);
    again.run(500);
    expect(again.fingerprint()).toBe(loaded.fingerprint());
  });
});
