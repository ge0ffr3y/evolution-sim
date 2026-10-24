import { describe, expect, it } from "vitest";
import { Simulation } from "@evo/sim-core";
import { formatSettings, parseSettings, readLink, writeLink } from "./links";

const presets: Record<string, Record<string, number>> = { small: { worldWidth: 64, worldHeight: 64, initialOrganisms: 60 } };
const presetConfig = (id: string | null): Record<string, number> => presets[id ?? ""] ?? {};

describe("shareable links", () => {
  it("settings round-trip through the address, in a fixed order", () => {
    const settings = parseSettings("plantToxins:1,plantEvolution:1");
    expect(settings).toEqual({ plantEvolution: 1, plantToxins: 1 });
    expect(formatSettings(settings)).toBe("plantEvolution:1,plantToxins:1");
    const url = writeLink(new URL("https://example.org/app.html?seed=1"), 7, "small", settings);
    expect(url.search).toBe("?seed=7&preset=small&set=plantEvolution%3A1%2CplantToxins%3A1");
    const link = readLink(url.search, presetConfig);
    expect(link).toEqual({ seed: 7, presetId: "small", settings, problem: null });
  });

  it("rejects unknown settings, values that are not numbers and settings that do not fit the world, keeping seed and preset", () => {
    expect(() => parseSettings("notASetting:1")).toThrow(/Unknown config setting/);
    expect(() => parseSettings("plantToxins:yes")).toThrow(/needs a number/);
    expect(() => parseSettings("plantToxins")).toThrow(/name:value/);
    const bad = readLink("?seed=3&preset=small&set=plantToxins:1", presetConfig); // toxins need plants that evolve
    expect(bad.seed).toBe(3);
    expect(bad.presetId).toBe("small");
    expect(bad.settings).toEqual({});
    expect(bad.problem).toMatch(/plantEvolution/);
  });

  it("a link with no settings leaves the address clean, and a bad seed is ignored", () => {
    expect(writeLink(new URL("https://example.org/?set=x:1"), 5, "small", {}).search).toBe("?seed=5&preset=small");
    expect(readLink("?seed=-4&preset=small", presetConfig).seed).toBeNull();
  });

  it("a world started from a link plays out exactly like the same world built directly", () => {
    const link = readLink("?seed=11&preset=small&set=foodRegrowPerTick:0.2,initialOrganisms:80", presetConfig);
    const fromLink = new Simulation(link.seed!, { ...presetConfig(link.presetId), ...link.settings });
    const direct = new Simulation(11, { worldWidth: 64, worldHeight: 64, initialOrganisms: 80, foodRegrowPerTick: 0.2 });
    fromLink.run(300);
    direct.run(300);
    expect(fromLink.fingerprint()).toBe(direct.fingerprint());
  });
});
