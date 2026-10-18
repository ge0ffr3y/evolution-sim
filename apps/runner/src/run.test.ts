import { describe, expect, it } from "vitest";
import { GENES } from "@evo/sim-core";
import {
  CSV_COLUMNS,
  HIST_COLUMNS,
  parseOverrides,
  parseSeedList,
  runToCsv,
  spreadAcrossSeeds,
  summarize,
  foodWebSummary,
  type SeedSummary,
} from "./run";

const SMALL = { worldWidth: 64, worldHeight: 64, initialOrganisms: 30 };

describe("runToCsv", () => {
  it("writes a header, a starting row, and one row per interval", () => {
    const result = runToCsv({ seed: 1, ticks: 1000, every: 250, overrides: SMALL });
    const lines = result.csv.trim().split("\n");
    expect(lines[0]).toBe(CSV_COLUMNS.join(","));
    expect(lines).toHaveLength(1 + 1 + 4); // header + tick 0 + ticks 250,500,750,1000
    expect(lines[1]!.split(",")[0]).toBe("0");
    expect(lines.at(-1)!.split(",")[0]).toBe("1000");
    expect(result.final.tick).toBe(1000);
    expect(result.extinct).toBe(false);
  });

  it("every row has a value for every column", () => {
    const result = runToCsv({ seed: 1, ticks: 500, every: 100, overrides: SMALL });
    for (const line of result.csv.trim().split("\n")) expect(line.split(",")).toHaveLength(CSV_COLUMNS.length);
  });

  it("includes trait means and spreads and the energy ledger", () => {
    for (const column of [
      "mean_size", "sd_speed", "mean_senseRange", "mean_mutationRate", "mean_diet", "mean_attack", "mean_armor",
      "carnivores", "totalKills", "sunlightIn", "plantEaten", "meatEaten", "digestionLoss", "decayLoss", "basalBurned",
      "sensingBurned", "attackBurned", "armorBurned", "brainBurned", "totalAttacks", "brainConnectionsCarnivores",
      "chaseTurn", "fleeTurn",
    ]) {
      expect(CSV_COLUMNS).toContain(column);
    }
  });

  it("always records the final tick, even if it is not a multiple of the interval", () => {
    const result = runToCsv({ seed: 1, ticks: 1000, every: 300, overrides: SMALL });
    const ticks = result.csv.trim().split("\n").slice(1).map((l) => l.split(",")[0]);
    expect(ticks).toEqual(["0", "300", "600", "900", "1000"]);
  });

  it("gives identical CSV text for the same seed", () => {
    const a = runToCsv({ seed: 5, ticks: 2000, every: 100, histEvery: 500, overrides: SMALL });
    const b = runToCsv({ seed: 5, ticks: 2000, every: 100, histEvery: 500, overrides: SMALL });
    expect(a.csv).toBe(b.csv);
    expect(a.histCsv).toBe(b.histCsv);
  });

  it("stops and reports extinction when everyone dies", () => {
    const result = runToCsv({
      seed: 1,
      ticks: 5000,
      every: 1000,
      overrides: { ...SMALL, initialFoodFraction: 0, foodRegrowPerTick: 0 },
    });
    expect(result.extinct).toBe(true);
    expect(result.final.population).toBe(0);
    expect(result.final.tick).toBeLessThan(5000);
    expect(result.csv.trim().split("\n").at(-1)!.split(",")[1]).toBe("0");
  });

  it("rejects nonsense options", () => {
    expect(() => runToCsv({ seed: 1, ticks: -5, every: 10 })).toThrow(/ticks/);
    expect(() => runToCsv({ seed: 1, ticks: 10, every: 0 })).toThrow(/every/);
    expect(() => runToCsv({ seed: 1, ticks: 10, every: 1, histEvery: -1 })).toThrow(/histEvery/);
    expect(() => runToCsv({ seed: 1, ticks: 10, every: 1, bins: 0 })).toThrow(/bins/);
  });
});

describe("histograms", () => {
  it("writes one row per trait per bin per snapshot, and every snapshot counts everyone", () => {
    const bins = 8;
    const result = runToCsv({ seed: 2, ticks: 1000, every: 500, histEvery: 500, bins, overrides: SMALL });
    const lines = result.histCsv.trim().split("\n");
    expect(lines[0]).toBe(HIST_COLUMNS.join(","));
    const rows = lines.slice(1).map((l) => l.split(","));
    // 3 snapshots (ticks 0, 500, 1000) x every gene's trait x 8 bins
    expect(rows).toHaveLength(3 * GENES.length * bins);

    const totals = new Map<string, number>();
    for (const [tick, trait, , , , count] of rows) {
      const key = `${tick}/${trait}`;
      totals.set(key, (totals.get(key) ?? 0) + Number(count));
    }
    expect(totals.get("0/size")).toBe(SMALL.initialOrganisms);
    for (const total of totals.values()) expect(total).toBeGreaterThan(0);
  });

  it("is empty when histograms are off", () => {
    expect(runToCsv({ seed: 2, ticks: 100, every: 50, overrides: SMALL }).histCsv).toBe("");
  });
});

describe("parseOverrides", () => {
  it("turns name=value pairs into config overrides", () => {
    expect(parseOverrides(["moveCostCoeff=0.05", "initialOrganisms=10"])).toEqual({
      moveCostCoeff: 0.05,
      initialOrganisms: 10,
    });
  });

  it("rejects unknown names, non-numbers and malformed pairs", () => {
    expect(() => parseOverrides(["bogus=1"])).toThrow(/Unknown config setting/);
    expect(() => parseOverrides(["foodCap=lots"])).toThrow(/needs a number/);
    expect(() => parseOverrides(["foodCap="])).toThrow(/needs a number/);
    expect(() => parseOverrides(["foodCap"])).toThrow(/name=value/);
    expect(() => parseOverrides(["foodCap=1=2"])).toThrow(/name=value/);
  });
});

describe("parseSeedList", () => {
  it("reads single seeds, lists and ranges", () => {
    expect(parseSeedList("7")).toEqual([7]);
    expect(parseSeedList("3,7,11")).toEqual([3, 7, 11]);
    expect(parseSeedList("1-4")).toEqual([1, 2, 3, 4]);
    expect(parseSeedList("1-3,9,2")).toEqual([1, 2, 3, 9]);
  });

  it("rejects nonsense", () => {
    expect(() => parseSeedList("")).toThrow();
    expect(() => parseSeedList("5-2")).toThrow(/backwards/);
    expect(() => parseSeedList("a-b")).toThrow(/Cannot read/);
    expect(() => parseSeedList("1-99999999")).toThrow(/too large/);
  });
});

describe("spreadAcrossSeeds", () => {
  const make = (seed: number, size: number, extinct = false): SeedSummary => ({
    seed,
    extinct,
    tick: 1000,
    population: extinct ? 0 : 100,
    herbivores: extinct ? 0 : 90,
    omnivores: 0,
    carnivores: extinct ? 0 : 10,
    totalKills: 0,
    totalAttacks: 0,
    brainConnectionsHerbivores: 0,
    brainConnectionsCarnivores: 0,
    chaseTurn: 0.5,
    fleeTurn: 0.5,
    firsts: { firstScavenger: null, firstKill: null, firstPredator: null, firstCarnivore: null },
    means: { size, speed: 1, senseRange: 0, metabolism: 1, hue: 0.5, mutationRate: 0.01, diet: 0, attack: 0, armor: 0 },
  });

  it("measures how far apart the surviving seeds ended up, ignoring extinct ones", () => {
    const spread = spreadAcrossSeeds([make(1, 1), make(2, 3), make(3, 99, true)]);
    expect(spread.survivors).toBe(2);
    expect(spread.traits["size"]).toEqual({ mean: 2, sd: 1, min: 1, max: 3 });
    expect(spread.traits["speed"]!.sd).toBe(0);
  });

  it("summarizes a finished run", () => {
    const result = runToCsv({ seed: 3, ticks: 200, every: 100, overrides: SMALL });
    const summary = summarize(3, result);
    expect(summary.seed).toBe(3);
    expect(summary.tick).toBe(200);
    expect(summary.means["size"]).toBeCloseTo(result.final.traits.size.mean, 9);
  });
});

describe("foodWebSummary", () => {
  const seed = (n: number, firstCarnivore: number | null, carnivores: number, extinct = false): SeedSummary => ({
    seed: n,
    extinct,
    tick: 1000,
    population: extinct ? 0 : 100,
    herbivores: 80,
    omnivores: 0,
    carnivores,
    totalKills: 50,
    totalAttacks: 100,
    brainConnectionsHerbivores: 0,
    brainConnectionsCarnivores: 0,
    chaseTurn: 0.5,
    fleeTurn: 0.5,
    firsts: { firstScavenger: 100, firstKill: 40, firstPredator: 90, firstCarnivore },
    means: { size: 1, speed: 1, senseRange: 0, metabolism: 1, hue: 0.5, mutationRate: 0.01, diet: 0.2, attack: 0.1, armor: 0.1 },
  });

  it("counts how many seeds grew each part of the food web, with median timing", () => {
    const web = foodWebSummary([seed(1, 500, 40), seed(2, 900, 5), seed(3, null, 0), seed(4, 700, 30)]);
    expect(web.survivors).toBe(4);
    expect(web.emerged.firstCarnivore).toEqual({ seeds: 3, medianTick: 700 });
    expect(web.emerged.firstKill).toEqual({ seeds: 4, medianTick: 40 });
    expect(web.withCarnivoresAtEnd).toBe(2);
  });

  it("says null when something never happened", () => {
    const web = foodWebSummary([seed(1, null, 0), seed(2, null, 0)]);
    expect(web.emerged.firstCarnivore).toEqual({ seeds: 0, medianTick: null });
  });
});
