// Writes experiments/carnivore-bridge: the simple (default) world, which grows meat eaters, against
// the grand world, which does not. Each of the grand world's feature groups is added alone to the
// simple world ("add-..."), and the groups are also added one after another ("ladder-NN-...") until
// the last step is the full grand world. Every grand-world setting must belong to exactly one group.
// Usage: node apps/runner/scripts/make-bridge.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const grand = JSON.parse(readFileSync("configs/grand-world-classic.json", "utf8")).config;
const GROUPS = [
  ["size-food", ["worldWidth", "worldHeight", "initialOrganisms", "maxOrganisms", "foodRegrowPerTick"]],
  ["nutrients", ["nutrientMode"]],
  ["mutation", ["mutationRateMin", "macroMutationProb", "founderSpread"]],
  ["life-history", ["agingCoeff", "litterMax", "luckSpread"]],
  ["land-damage", ["overgrazeDamage", "overgrazePenalty", "fouling", "erosionRate"]],
  ["terrain", ["terrainMode"]],
  ["climate", ["climateMode", "yearLength", "dayLength", "seasonGrowthSwing", "seasonTempSwing", "climateDriftPeriod", "climateDriftAmplitude", "weatherAmplitude", "yearVariability", "thermalCostCoeff", "torporSaving"]],
  ["events", ["catastropheKind", "catastropheEvery", "catastropheLength", "evFireEvery", "evStormEvery", "evFloodEvery", "evVolcanoEvery", "evBlightEvery", "evGoodYearEvery"]],
  ["plant-kinds", ["plantTypes", "plantTypePhase", "initialPalate"]],
  ["kin-herd", ["kinDistance", "kinTolerance", "herdBonus", "shareRate"]],
  ["sex-load", ["sexualReproduction", "sexAcceptAny", "sexFounderSpread", "sexWaitLimit", "mateReadyFraction", "mutationLoadRate", "mutationLoadCost", "mutationLoadModel", "mutationLoadMend"]],
  ["disease", ["diseaseTransmission", "diseaseWidth", "diseaseDuration", "diseaseImmunity", "diseaseMutationProb", "diseaseDrift", "diseaseIntroEvery", "diseaseCost", "evOutbreakEvery"]],
  ["camouflage", ["camouflageMode"]],
  ["colonies", ["multicellular", "cellTypes", "initialBond", "typePhotoGain"]],
  ["brains", ["brainMode", "brainAppetiteSenses", "killOwnershipTicks", "brainMemory", "homeMode", "chemicals", "chemBodyEffects"]],
];
const seen = new Map();
for (const [g, keys] of GROUPS) for (const k of keys) {
  if (!(k in grand)) throw new Error(`${k} (group ${g}) is not in the grand world`);
  if (seen.has(k)) throw new Error(`${k} is in two groups`);
  seen.set(k, g);
}
const missing = Object.keys(grand).filter((k) => !seen.has(k));
if (missing.length) throw new Error(`grand-world settings in no group: ${missing.join(", ")}`);
const pick = (keys) => Object.fromEntries(keys.map((k) => [k, grand[k]]));

const arms = { simple: {} };
// Some groups only work on top of others (ice ages need a climate, floods need terrain): their
// single-add arm brings those along, and the ladder order puts them later anyway.
const NEEDS = { events: ["terrain", "climate"], "plant-kinds": ["climate"] };
const keysOf = (g) => GROUPS.find(([name]) => name === g)[1];
for (const [g, keys] of GROUPS) arms[`add-${g}`] = pick([...(NEEDS[g] ?? []).flatMap(keysOf), ...keys]);
let ladder = [];
GROUPS.forEach(([g, keys], n) => {
  ladder = [...ladder, ...keys];
  if (n > 0) arms[`ladder-${String(n + 1).padStart(2, "0")}-${g}`] = pick(ladder);
});
mkdirSync("experiments/carnivore-bridge", { recursive: true });
const exp = {
  name: "carnivore-bridge",
  question: "Why does the simple world grow meat eaters and the grand world not? Starting from the simple (default) world, each of the grand world's 15 feature groups is added alone (add-...), and the groups are also added one after another (ladder-...) until the last step is the full grand world. An answer: which group, alone or in combination, makes meat eaters (diet above 0.75, and above 0.5) disappear.",
  base: "default",
  ticks: 200000,
  seeds: "1301-1304",
  sampleEvery: 1000,
  arms,
  measures: ["all"],
};
writeFileSync("experiments/carnivore-bridge/experiment.json", `${JSON.stringify(exp, null, 2)}\n`);
console.log(`${Object.keys(arms).length} arms, ${Object.keys(grand).length} settings in ${GROUPS.length} groups`);
