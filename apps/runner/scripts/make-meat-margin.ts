// Writes experiments/meat-margin/experiment.json: where does a meat eater's margin go in the grand world?
// The diet ledger (income, costs, births, deaths by diet band) in the grand world, the grand world with
// each culprit group taken out, and the hunters' world. Ready-made meat eaters arrive every 5,000 ticks
// from tick 100,000, so the meat-eater band is never empty. Usage: npx tsx apps/runner/scripts/make-meat-margin.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { DEFAULT_CONFIG } from "@evo/sim-core";

const grand: Record<string, number> = JSON.parse(readFileSync("configs/grand-world.json", "utf8")).config;
const hunters: Record<string, number> = JSON.parse(readFileSync("configs/grand-hunters.json", "utf8")).config;
const defaults = DEFAULT_CONFIG as unknown as Record<string, number>;
const groups: Record<string, string[]> = {
  climate: ["climateMode", "yearLength", "dayLength", "seasonGrowthSwing", "seasonTempSwing", "climateDriftPeriod", "climateDriftAmplitude", "weatherAmplitude", "yearVariability", "thermalCostCoeff", "torporSaving", "catastropheKind", "catastropheEvery", "catastropheLength", "evVolcanoEvery", "plantTypePhase"],
  sex: ["sexualReproduction", "sexAcceptAny", "sexFounderSpread", "sexWaitLimit", "mateReadyFraction"],
  load: ["mutationLoadRate", "mutationLoadCost", "mutationLoadModel", "mutationLoadMend"],
  kin: ["kinDistance", "kinTolerance", "herdBonus", "shareRate"],
};
const without = (name: string): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const k of groups[name]!) out[k] = defaults[k]!;
  if (name === "climate") out.plantTypePhase = 0;
  return out;
};
const huntersOnGrand: Record<string, number> = { ...hunters };
for (const k of Object.keys(grand)) if (!(k in hunters)) huntersOnGrand[k] = defaults[k]!;

const exp = {
  name: "meat-margin",
  question: "Where does a meat eater's margin go in the grand world? The diet ledger (per diet band: plant and meat income, running costs by kind, kills, births and deaths per animal per 1,000 ticks, how fed) in the grand world, the grand world without each culprit group (climate, sex, harmful mutations, kin restraint), and the hunters' world. One animal in twenty becomes an armed meat eater at tick 100,000 and again every 5,000 ticks, so the meat-eater band can be measured everywhere. An answer: which income or cost line separates meat eaters that last (hunters' world) from those that do not (grand world), and which culprit moves it.",
  base: "grand-world",
  ticks: 150000,
  seeds: "1801-1804",
  sampleEvery: 500,
  invasion: { atTick: 100000, every: 20, genes: { diet: 0.95, attack: 0.6 }, repeatEvery: 5000, until: 145000 },
  arms: {
    control: {},
    "no-climate": without("climate"),
    "no-sex": without("sex"),
    "no-harmful-mutations": without("load"),
    "no-kin": without("kin"),
    hunters: huntersOnGrand,
  },
  measures: ["population", "classes", "dietSpread", "kills", "mutationLoad", "dietLedger"],
};
mkdirSync("experiments/meat-margin", { recursive: true });
writeFileSync("experiments/meat-margin/experiment.json", `${JSON.stringify(exp, null, 2)}\n`);
console.log("written");
