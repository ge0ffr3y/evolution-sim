// Writes experiments/hunters-confirm/experiment.json: today's grand world against two "hunters" versions,
// on 16 fresh seeds. Both take out harmful mutations, sex and kin restraint (settings put back to the
// simple world's values). One also takes out the whole climate (as in carnivore-bridge-2, which brought
// meat eaters back in 3 of 4 worlds); the other only the seasons, keeping the rest of the climate.
// Usage: npx tsx apps/runner/scripts/make-hunters.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { DEFAULT_CONFIG } from "@evo/sim-core";

const grand: Record<string, number> = JSON.parse(readFileSync("configs/grand-world.json", "utf8")).config;
const defaults = DEFAULT_CONFIG as unknown as Record<string, number>;
const groups: Record<string, string[]> = {
  climate: ["climateMode", "yearLength", "dayLength", "seasonGrowthSwing", "seasonTempSwing", "climateDriftPeriod", "climateDriftAmplitude", "weatherAmplitude", "yearVariability", "thermalCostCoeff", "torporSaving", "catastropheKind", "catastropheEvery", "catastropheLength", "evVolcanoEvery", "plantTypePhase"],
  sexLoad: ["sexualReproduction", "sexAcceptAny", "sexFounderSpread", "sexWaitLimit", "mateReadyFraction", "mutationLoadRate", "mutationLoadCost", "mutationLoadModel", "mutationLoadMend"],
  kinHerd: ["kinDistance", "kinTolerance", "herdBonus", "shareRate"],
};
const without = (...names: string[]): Record<string, number> => {
  const out = { ...grand };
  for (const name of names) for (const k of groups[name]!) out[k] = defaults[k]!;
  if (names.includes("climate")) out.plantTypePhase = 0; // plant kinds cannot peak by season without seasons
  return out;
};
// No seasons: plants and temperature no longer swing over the year, harsh years go (they are harsh
// seasons), and plant kinds grow all year. Day and night, weather, drift, the cost of heat and cold,
// torpor and ice ages stay.
const noSeasons = { ...without("sexLoad", "kinHerd"), seasonGrowthSwing: 0, seasonTempSwing: 0, yearVariability: 0, plantTypePhase: 0 };

const exp = {
  name: "hunters-confirm",
  question: "Does a 'hunters' grand world reliably grow meat eaters? Today's grand world against two versions without harmful mutations, sex and kin restraint: one also without the whole climate (as in carnivore-bridge-2, meat eaters in 3 of 4 worlds), one without only the seasons (keeping day and night, weather, drift, the cost of heat and cold, torpor and ice ages). 16 fresh seeds, 300,000 ticks. An answer: in how many worlds a meat-eating group (diet above 0.75) holds over the second half, how big, and what the versions cost in species and population.",
  base: "grand-world",
  ticks: 300000,
  seeds: "1601-1616",
  sampleEvery: 1500,
  arms: {
    control: {},
    "hunters-no-climate": without("climate", "sexLoad", "kinHerd"),
    "hunters-no-seasons": noSeasons,
  },
  measures: ["all"],
};
mkdirSync("experiments/hunters-confirm", { recursive: true });
writeFileSync("experiments/hunters-confirm/experiment.json", `${JSON.stringify(exp, null, 2)}\n`);
console.log("written");
