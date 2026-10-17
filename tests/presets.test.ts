import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Simulation, makeConfig, parsePreset } from "../packages/sim-core/src/index";

const folder = join(import.meta.dirname, "..", "configs");
const files = readdirSync(folder).filter((f) => f.endsWith(".json"));

describe("preset files in configs/", () => {
  it("finds the preset files", () => {
    expect(files).toContain("default.json");
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  for (const file of files) {
    it(`${file} is a valid, labeled preset that builds a working world`, () => {
      const preset = parsePreset(JSON.parse(readFileSync(join(folder, file), "utf8")), file);
      expect(preset.name).not.toBe(file);
      expect(preset.description.length).toBeGreaterThan(10);
      expect(() => makeConfig(preset.config)).not.toThrow();
      const sim = new Simulation(1, { ...preset.config, worldWidth: 128, worldHeight: 128, initialOrganisms: 40 });
      sim.run(200);
      expect(sim.count).toBeGreaterThan(0);
    });
  }

  it("the default preset changes nothing", () => {
    const preset = parsePreset(JSON.parse(readFileSync(join(folder, "default.json"), "utf8")));
    expect(preset.config).toEqual({});
  });
});
