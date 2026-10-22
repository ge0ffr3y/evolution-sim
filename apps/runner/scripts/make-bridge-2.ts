// Writes experiments/carnivore-bridge-2/experiment.json: the culprit groups from carnivore-bridge split into
// their parts and added alone to the simple world, plus the grand world with culprit groups taken out
// (their settings put back to the simple world's values). Usage: npx tsx apps/runner/scripts/make-bridge-2.ts
import { readFileSync, writeFileSync } from "node:fs";
import { DEFAULT_CONFIG } from "@evo/sim-core";

const path = "experiments/carnivore-bridge-2/experiment.json";
const exp = JSON.parse(readFileSync(path, "utf8"));
const grand: Record<string, number> = JSON.parse(readFileSync("configs/grand-world.json", "utf8")).config;
const groups: Record<string, string[]> = {
  // The climate, and everything that needs it (ice ages, droughts, volcanoes, plant kinds peaking by season).
  climate: ["climateMode", "yearLength", "dayLength", "seasonGrowthSwing", "seasonTempSwing", "climateDriftPeriod", "climateDriftAmplitude", "weatherAmplitude", "yearVariability", "thermalCostCoeff", "torporSaving", "catastropheKind", "catastropheEvery", "catastropheLength", "evVolcanoEvery", "plantTypePhase"],
  sexLoad: ["sexualReproduction", "sexAcceptAny", "sexFounderSpread", "sexWaitLimit", "mateReadyFraction", "mutationLoadRate", "mutationLoadCost", "mutationLoadModel", "mutationLoadMend"],
  kinHerd: ["kinDistance", "kinTolerance", "herdBonus", "shareRate"],
};
const without = (...names: string[]): Record<string, number> => {
  const out = { ...grand };
  for (const name of names) for (const k of groups[name]!) out[k] = (DEFAULT_CONFIG as unknown as Record<string, number>)[k]!;
  // Plant kinds can only peak by season with seasons; without a climate they grow all year.
  if (names.includes("climate")) out.plantTypePhase = 0;
  return out;
};
delete exp.arms.grand;
Object.assign(exp.arms, {
  grand: { ...grand },
  "grand-no-climate": without("climate"),
  "grand-no-sex-load": without("sexLoad"),
  "grand-no-kin-herd": without("kinHerd"),
  "grand-no-climate-no-sex-load": without("climate", "sexLoad"),
  "grand-no-all-three": without("climate", "sexLoad", "kinHerd"),
});
writeFileSync(path, `${JSON.stringify(exp, null, 2)}\n`);
console.log(`${Object.keys(exp.arms).length} arms`);
