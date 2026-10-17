import { parseConfigOverrides, type SimConfig } from "./config";

/** A named set of config changes, loaded from a JSON file. */
export interface Preset {
  name: string;
  description: string;
  config: Partial<SimConfig>;
}

/**
 * Read a preset from parsed JSON. Two shapes are accepted:
 *   { "name": "...", "description": "...", "config": { "moveCostCoeff": 0.05 } }
 *   { "moveCostCoeff": 0.05 }            (just the changes, no label)
 * Typos are rejected instead of ignored.
 */
export function parsePreset(input: unknown, fallbackName = "custom"): Preset {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("A preset must be a JSON object");
  }
  if (!("config" in input)) {
    return { name: fallbackName, description: "", config: parseConfigOverrides(input) };
  }
  const { name, description, config, ...rest } = input as Record<string, unknown>;
  const extra = Object.keys(rest);
  if (extra.length > 0) throw new Error(`Unknown preset field "${extra[0]}" (expected name, description, config)`);
  if (name !== undefined && typeof name !== "string") throw new Error("Preset name must be text");
  if (description !== undefined && typeof description !== "string") throw new Error("Preset description must be text");
  return {
    name: name ?? fallbackName,
    description: description ?? "",
    config: parseConfigOverrides(config),
  };
}
