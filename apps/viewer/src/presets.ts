import { parsePreset, type Preset } from "@evo/sim-core";

/** The world a visitor sees first (the owner's choice for v1.0): the grand world. */
export const DEFAULT_PRESET_ID = "grand-world";

export interface PresetEntry {
  id: string;
  preset: Preset;
}

// Every JSON file in the repo's configs/ folder is bundled in (shared by every page that starts worlds).
const presetFiles = import.meta.glob("../../../configs/*.json", { eager: true, import: "default" }) as Record<string, unknown>;

/** Every preset, the default first, then by name. */
export const presets: PresetEntry[] = Object.entries(presetFiles)
  .map(([path, json]) => {
    const id = path.split("/").pop()!.replace(/\.json$/, "");
    return { id, preset: parsePreset(json, id) };
  })
  .sort((a, b) => (a.id === DEFAULT_PRESET_ID ? -1 : b.id === DEFAULT_PRESET_ID ? 1 : a.preset.name.localeCompare(b.preset.name)));

/** The preset with this id, or the default one. */
export function findPreset(id: string | null): PresetEntry {
  return presets.find((p) => p.id === id) ?? presets.find((p) => p.id === DEFAULT_PRESET_ID) ?? presets[0]!;
}
