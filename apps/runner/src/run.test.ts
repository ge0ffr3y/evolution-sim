import { describe, expect, it } from "vitest";
import { CSV_COLUMNS, parseOverrides, runToCsv } from "./run";

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

  it("always records the final tick, even if it is not a multiple of the interval", () => {
    const result = runToCsv({ seed: 1, ticks: 1000, every: 300, overrides: SMALL });
    const ticks = result.csv.trim().split("\n").slice(1).map((l) => l.split(",")[0]);
    expect(ticks).toEqual(["0", "300", "600", "900", "1000"]);
  });

  it("gives identical CSV text for the same seed", () => {
    const a = runToCsv({ seed: 5, ticks: 2000, every: 100, overrides: SMALL });
    const b = runToCsv({ seed: 5, ticks: 2000, every: 100, overrides: SMALL });
    expect(a.csv).toBe(b.csv);
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
  });
});

describe("parseOverrides", () => {
  it("turns name=value pairs into config overrides", () => {
    expect(parseOverrides(["foodRegrowPerTick=0.05", "initialOrganisms=10"])).toEqual({
      foodRegrowPerTick: 0.05,
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
