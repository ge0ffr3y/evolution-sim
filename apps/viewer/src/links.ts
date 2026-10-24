import { makeConfig, parseConfigOverrides, type SimConfig } from "@evo/sim-core";

/**
 * Shareable links. The address holds everything needed to replay a run exactly:
 *   ?seed=42&preset=grand-world&set=plantEvolution:1,plantToxins:1
 * seed and preset pick the world; set (optional) changes settings on top of the preset.
 * seed=random asks for a fresh seed on every visit (the viewer then writes the seed it picked into the address).
 */
export interface Link {
  seed: number | null;
  /** The link asked for a new random seed each visit (seed=random). */
  randomSeed: boolean;
  presetId: string | null;
  settings: Partial<SimConfig>;
  /** Why the settings in the link could not be used (they are then dropped), or null. */
  problem: string | null;
}

/** "name:value,name:value" into settings; throws on an unknown name or a value that is not a number. */
export function parseSettings(text: string): Partial<SimConfig> {
  const pairs: Record<string, number> = {};
  for (const part of text.split(",")) {
    if (part.trim() === "") continue;
    const [name, raw, extra] = part.split(":");
    if (name === undefined || raw === undefined || extra !== undefined) throw new Error(`"${part}" should look like name:value`);
    const value = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(value)) throw new Error(`Setting "${name}" needs a number, got "${raw}"`);
    pairs[name.trim()] = value;
  }
  return parseConfigOverrides(pairs);
}

/** Settings into "name:value,..." with the names sorted, so the same settings always give the same link. */
export function formatSettings(settings: Partial<SimConfig>): string {
  return Object.keys(settings)
    .sort()
    .map((name) => `${name}:${(settings as Record<string, number>)[name]}`)
    .join(",");
}

/** Read a link from the address's query string. Settings that are not valid on top of the preset are dropped, with the reason. */
export function readLink(search: string, presetConfig: (presetId: string | null) => Partial<SimConfig>): Link {
  const params = new URLSearchParams(search);
  const rawSeed = params.get("seed");
  const seedValue = rawSeed === null ? NaN : Number(rawSeed);
  const seed = Number.isInteger(seedValue) && seedValue >= 0 ? seedValue : null;
  const randomSeed = rawSeed !== null && rawSeed.trim().toLowerCase() === "random";
  const presetId = params.get("preset");
  const rawSettings = params.get("set");
  if (!rawSettings) return { seed, randomSeed, presetId, settings: {}, problem: null };
  try {
    const settings = parseSettings(rawSettings);
    makeConfig({ ...presetConfig(presetId), ...settings }); // checks the combination makes sense
    return { seed, randomSeed, presetId, settings, problem: null };
  } catch (error) {
    return { seed, randomSeed, presetId, settings: {}, problem: error instanceof Error ? error.message : String(error) };
  }
}

/** Write the run into a URL: seed and preset always (so old and new defaults never get confused), settings when there are any. */
export function writeLink(url: URL, seed: number, presetId: string, settings: Partial<SimConfig>): URL {
  const out = new URL(url.href);
  out.searchParams.set("seed", String(seed));
  out.searchParams.set("preset", presetId);
  const text = formatSettings(settings);
  if (text) out.searchParams.set("set", text);
  else out.searchParams.delete("set");
  return out;
}
