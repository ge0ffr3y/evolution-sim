import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_CONFIG, makeConfig, parsePreset, type SimConfig } from "@evo/sim-core";

/**
 * The grand-world audit (docs/plans/phase-9-grand-world-audit.md), stage 2: every setting the
 * world uses, turned down and up one at a time. This file drafts the list of settings (which are
 * tested, how, and why the rest are not) and turns a reviewed list into an experiment.
 */

export interface SettingEntry {
  /** The setting, or a name for settings changed together (worldSize). */
  key: string;
  group: string;
  /** Its value in the audited world. */
  value: number;
  test: boolean;
  /** Why it is not tested (empty when it is). */
  reason: string;
  /** The changes for the "down" and "up" arms (null when that direction is not possible). */
  down: Record<string, number> | null;
  up: Record<string, number> | null;
}

export interface SettingsList {
  base: string;
  baseChanges: Record<string, number>;
  note: string;
  settings: SettingEntry[];
}

/** Read the config file's own layout: each "// --- Group ---" heading and the settings under it. */
export function configGroups(repoRoot: string): { key: string; group: string }[] {
  const source = readFileSync(join(repoRoot, "packages", "sim-core", "src", "config.ts"), "utf8");
  const start = source.indexOf("export interface SimConfig");
  const end = source.indexOf("\n}", start);
  const out: { key: string; group: string }[] = [];
  let group = "";
  for (const line of source.slice(start, end).split("\n")) {
    const heading = /^\s*\/\/ --- (.*) ---/.exec(line);
    if (heading) group = heading[1]!;
    const setting = /^ {2}([a-zA-Z0-9]+)\??:/.exec(line);
    if (setting && group) out.push({ key: setting[1]!, group });
  }
  return out;
}

/** Settings the validator only allows a fixed set of values for (on/off switches and modes), and whole-number settings. */
export function settingKinds(repoRoot: string): { switches: Set<string>; whole: Set<string> } {
  const source = readFileSync(join(repoRoot, "packages", "sim-core", "src", "config.ts"), "utf8");
  const switches = new Set([...source.matchAll(/!\[[0-9, ]*\]\.includes\(c\.([a-zA-Z0-9]+)\)/g)].map((m) => m[1]!));
  const whole = new Set([...source.matchAll(/Number\.isInteger\(c\.([a-zA-Z0-9]+)\)/g)].map((m) => m[1]!));
  return { switches, whole };
}

/**
 * Whether a setting does anything in this world, and if not, why. Mechanisms that are switched
 * off make their settings idle; those are tested by switching them on (stage 3), not here.
 */
export function idleReason(key: string, group: string, c: SimConfig): string {
  const off = (what: string): string => `${what} is off in this world`;
  if (group.startsWith("Species tracking")) return "only watches the world; cannot change what happens";
  if (group.startsWith("Senses and brains") || group.startsWith("Scent trails")) {
    if (c.brainMode === 0) return off("brains");
    if (key.startsWith("home") && c.homeMode === 0) return off("the sense of home");
    if (["chemStressSpeed", "chemStressUpkeep", "chemCalmSaving", "chemCalmSlow", "initialStressResponse", "initialCalmResponse"].includes(key) && c.chemBodyEffects === 0) return off("chemical body effects");
    if (key.startsWith("chem") && c.chemicals === 0) return off("chemical signals");
    if (group.startsWith("Scent trails") && c.scentDeposit === 0) return off("scent trails");
  }
  if (group.startsWith("Terrain") && c.terrainMode === 0) return off("terrain");
  if (group.startsWith("Climate (off") && c.climateMode === 0) return off("climate");
  if (key === "climateDriftAmplitude" && c.climateDriftPeriod === 0) return off("climate drift (climateDriftPeriod 0)");
  if (group.startsWith("Weather")) {
    if (key.startsWith("weather") && c.weatherAmplitude === 0) return off("weather");
    if ((key.startsWith("fat") || key === "initialFat") && c.fatDepositRate === 0) return off("the fat reserve");
    if ((key.startsWith("torpor") || key === "initialTorpor") && c.torporSaving === 0) return off("torpor");
    if ((key.startsWith("weather") || key === "yearVariability" || key.startsWith("torpor")) && c.climateMode === 0) return off("climate");
  }
  if (group.startsWith("Kinds of plant") && key.startsWith("plant") && c.plantTypes <= 1) return off("kinds of plant");
  if (group.startsWith("Kinds of plant") && key === "initialPalate" && c.plantTypes <= 1) return off("kinds of plant");
  if (group.startsWith("Sharing") && c.shareRate === 0 && key !== "shareRate") return off("food sharing");
  if (group.startsWith("Harmful mutations")) {
    if (c.mutationLoadRate === 0 && key !== "mutationLoadRate") return off("harmful mutations");
    if ((key === "mutationLoadLoci" || key === "mutationLoadBack") && c.mutationLoadModel !== 0) return "used only by the older 24-spot model (mutationLoadModel 0)";
    if (key === "mutationLoadMend" && c.mutationLoadModel !== 1) return "used only by the textbook model (mutationLoadModel 1)";
  }
  if (group.startsWith("Developmental noise") && c.luckSpread === 0 && key !== "luckSpread") return off("luck");
  if (group.startsWith("Toxicity") && c.toxinStrength === 0 && key !== "toxinStrength") return off("toxicity");
  if (group.startsWith("Erosion") && c.erosionRate === 0 && key !== "erosionRate") return off("erosion");
  if (group.startsWith("Fouling") && c.fouling === 0 && key !== "fouling") return off("fouling");
  if (group.startsWith("Overgrazing") && c.overgrazeDamage === 0 && key !== "overgrazeDamage") return off("overgrazing");
  if (group.startsWith("Catastrophes") && c.catastropheKind === 0 && key !== "catastropheKind") return off("the older catastrophes");
  if (group.startsWith("Climate biomes") && c.terrainMode !== 2) return off("climate biomes (terrainMode 2)");
  if (group.startsWith("Colony physics")) {
    if (c.multicellular === 0) return off("colonies");
    if ((key === "signalCost" || key === "initialSignal") && c.signaling === 0) return off("shared colony senses");
  }
  if (group.startsWith("Drinking") && c.drinking === 0 && key !== "drinking") return off("drinking");
  if (group.startsWith("Nutrients through food")) {
    if (c.nutrientMode === 0 && key !== "nutrientMode") return off("nutrients through food");
    if (key.startsWith("plantQuality") && c.nutrientMode !== 2) return off("plant quality (nutrientMode 2)");
  }
  if (group.startsWith("Disaster events")) {
    const kind = /^ev(IceAge|Drought|Meteor|Fire|Storm|Flood|Volcano|Blight|Outbreak|GoodYear)/.exec(key)?.[1];
    if (kind && !key.endsWith("Every") && (c as unknown as Record<string, number>)[`ev${kind}Every`] === 0) return off(`the ${kind} event`);
  }
  if (group.startsWith("Aging") && c.agingCoeff === 0 && key !== "agingCoeff") return off("aging");
  if (group.startsWith("Kin recognition")) {
    if ((key === "initialTolerance" || key === "toleranceCostCoeff") && c.kinTolerance === 0) return off("the tolerance gene");
    if ((key === "herdRange" || key === "herdCap") && c.herdBonus === 0) return off("the herd bonus");
    if (key === "kinHungerBelow" && c.kinDistance === 0) return off("kin restraint");
  }
  if (group.startsWith("Disease") && c.diseaseTransmission === 0 && key !== "diseaseTransmission") return off("disease");
  if (group.startsWith("Signals and camouflage") && c.camouflageMode === 0 && key !== "camouflageMode") return off("camouflage");
  if (group.startsWith("Multicellularity") && c.multicellular === 0 && key !== "multicellular") return off("colonies");
  if (group.startsWith("Cross-lineage bonding") && (c.contactBonding === 0 || c.multicellular === 0) && key !== "contactBonding") return off("contact bonding");
  if (group.startsWith("Cell types") && (c.cellTypes === 0 || c.multicellular === 0) && key !== "cellTypes") return off("cell types");
  if (group.startsWith("Sexual reproduction") && c.sexualReproduction === 0 && !key.startsWith("macroMutation") && key !== "sexualReproduction") return off("sexual reproduction");
  if (group.startsWith("Learning brains")) {
    if (c.brainMode === 0) return off("brains");
    if (c.brainLearning === 0 && c.learnSenses === 0 && key !== "brainLearning" && key !== "learnSenses") return off("learning");
    if (c.brainLearning === 0 && key !== "brainLearning" && key !== "learnSenses" && key !== "learnSenseScale" && key !== "learnBaselineRate") return off("learning (brainLearning)");
  }
  if (group.startsWith("Place memory")) {
    if (c.brainMode === 0) return off("brains");
    if (c.placeMemory === 0 && key !== "placeMemory") return off("place memory");
  }
  if (group.startsWith("Sprinting") && (c.sprintFatigue === 0 || c.brainMode === 0) && key !== "sprintFatigue") return off("stamina");
  if (group.startsWith("Kill ownership") && key === "killOwnershipLeak" && c.killOwnershipTicks === 0) return off("kill ownership");
  return "";
}

const round = (x: number): number => Number(x.toPrecision(6));

/** Shares kept from one tick (or thought) to the next: what matters is how long things last, so that is halved and doubled. */
const KEPT_PER_TICK = new Set(["homeMemoryDecay", "chemDecay"]);
/** Settings on a 0 to 1 scale (starting shares, temperatures) that the validator lets past 1: moved halfway to each end instead. */
const ZERO_TO_ONE = new Set(["initialFoodFraction", "initialEnergyFraction", "baseTemperature", "plantTempOptimum", "thermalMin", "thermalMax", "initialThermal"]);

/** Draft the settings list for a preset plus changes: every setting, whether it is tested, and its down and up values. */
export function draftSettings(repoRoot: string, base: string, baseChanges: Record<string, number>): SettingsList {
  const preset = parsePreset(JSON.parse(readFileSync(join(repoRoot, "configs", `${base}.json`), "utf8")), base);
  const overrides = { ...preset.config, ...baseChanges } as Partial<SimConfig>;
  const c = makeConfig(overrides);
  const { switches, whole } = settingKinds(repoRoot);
  const valid = (changes: Record<string, number>): boolean => {
    try {
      makeConfig({ ...overrides, ...changes });
      return true;
    } catch {
      return false;
    }
  };
  const settings: SettingEntry[] = [];
  for (const { key, group } of configGroups(repoRoot)) {
    if (key === "worldHeight") continue; // changed together with worldWidth (see worldSize)
    const value = (c as unknown as Record<string, number>)[key]!;
    const entry: SettingEntry = { key, group, value, test: false, reason: "", down: null, up: null };
    settings.push(entry);
    if (key === "worldWidth") {
      // World size: width and height together, so the world stays square.
      entry.key = "worldSize";
      entry.down = { worldWidth: c.worldWidth / 2, worldHeight: c.worldHeight / 2, initialOrganisms: Math.round(c.initialOrganisms / 4) };
      entry.up = { worldWidth: c.worldWidth * 2, worldHeight: c.worldHeight * 2, initialOrganisms: c.initialOrganisms * 4 };
      entry.test = true;
      entry.reason = "";
      continue;
    }
    if (!(key in DEFAULT_CONFIG)) continue;
    entry.reason = idleReason(key, group, c);
    if (entry.reason) continue;
    if (switches.has(key)) {
      entry.reason = "a switch or mode: tested by switching it (stage 1 or 3), not by halving and doubling";
      continue;
    }
    if (value === 0) {
      entry.reason = "0 here (off or none), and half or double of 0 is still 0: a candidate for stage 3 if it is worth trying";
      continue;
    }
    const isWhole = whole.has(key);
    const fix = (x: number): number => (isWhole ? Math.round(x) : round(x));
    // Down: half (for a multiplier that must stay at 1 or more, half of its excess over 1).
    // Up: double, or, for a share that cannot pass 1, halfway to 1; else one and a half.
    let downs = [value / 2, value > 1 ? 1 + (value - 1) / 2 : NaN];
    let ups = [value * 2, value > 0 && value < 1 ? (value + 1) / 2 : NaN, value * 1.5];
    if (KEPT_PER_TICK.has(key)) {
      downs = [1 - 2 * (1 - value)]; // lasts half as long
      ups = [1 - (1 - value) / 2]; // lasts twice as long
    } else if (ZERO_TO_ONE.has(key)) {
      downs = [value / 2];
      ups = [value < 1 ? (value + 1) / 2 : NaN];
    }
    for (const downValue of downs.map(fix)) {
      if (!Number.isNaN(downValue) && downValue !== value && valid({ [key]: downValue })) {
        entry.down = { [key]: downValue };
        break;
      }
    }
    for (const upValue of ups.map(fix)) {
      if (!Number.isNaN(upValue) && upValue !== value && valid({ [key]: upValue })) {
        entry.up = { [key]: upValue };
        break;
      }
    }
    entry.test = entry.down !== null || entry.up !== null;
    if (!entry.test) entry.reason = "no valid smaller or larger value";
  }
  return {
    base,
    baseChanges,
    note: "Drafted by `npm run exp -- settings`, then reviewed. test: false means the setting is not turned down and up, for the reason given. down and up are the exact changes each arm makes.",
    settings,
  };
}

/** Arm names are lower-case with dashes: worldSize -> world-size-down. */
export function armName(key: string, direction: "down" | "up"): string {
  return `${key.replace(/[A-Z]/g, (ch) => `-${ch.toLowerCase()}`)}-${direction}`;
}

/** The experiment file for stage 2: a control plus a down and an up arm for every tested setting. */
export function dosesExperiment(list: SettingsList, opts: { name: string; ticks: number; seeds: string }): Record<string, unknown> {
  const arms: Record<string, Record<string, number>> = { control: {} };
  for (const s of list.settings) {
    if (!s.test) continue;
    if (s.down) arms[armName(s.key, "down")] = s.down;
    if (s.up) arms[armName(s.key, "up")] = s.up;
  }
  return {
    name: opts.name,
    question: "Which settings is the grand world (with 15% mending) sensitive to, which barely matter, and where does a change of half or double cause a collapse?",
    base: list.base,
    baseChanges: list.baseChanges,
    ticks: opts.ticks,
    seeds: opts.seeds,
    arms,
    measures: ["all"],
  };
}
