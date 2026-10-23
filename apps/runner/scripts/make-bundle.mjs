// Writes the bundle experiments: every partial help found so far, together, in the grand world as it is.
// bundle-margin: arriving meat eaters measured with the diet ledger (grand world against the bundle).
// bundle: from scratch, the grand world, the bundle, and the bundle with each help left out in turn.
// Usage: node apps/runner/scripts/make-bundle.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const HELPS = {
  "spare-family": { spareFamily: 1 },
  fat: { fatDepositRate: 0.5, initialFat: 0.3 },
  "more-plants": { foodRegrowPerTick: 0.24 },
  "weapons-graze": { weaponGrazeLoss: 0.6 },
  "cold-meat": { meatColdKeep: 0.8 },
  "more-mending": { mutationLoadMend: 0.5 },
  "gentler-heat-cold": { thermalCostCoeff: 0.75 },
};
const bundle = Object.assign({}, ...Object.values(HELPS));
const describe = "every partial help found so far, together: sparing your own parent and young, a fat reserve (deposit 0.5, founders start with 0.3), plant growth 0.24 (against 0.12), weapons that get in the way of grazing (0.6), meat that keeps in the cold (0.8), more mending of harmful mutations (0.5, against 0.15) and half the cost of heat and cold (0.75, against 1.5)";
const write = (name, exp) => {
  mkdirSync(`experiments/${name}`, { recursive: true });
  writeFileSync(`experiments/${name}/experiment.json`, `${JSON.stringify(exp, null, 2)}\n`);
};
write("bundle-margin", {
  name: "bundle-margin",
  question: `Does a bundle of ${describe} give arriving meat eaters a margin in the grand world? One animal in twenty becomes an armed meat eater (with a fat gene of 0.5) at tick 100,000 and every 5,000 ticks after, measured with the diet ledger. An answer: meat eaters' births against deaths, and how many remain 4,500 ticks after each arrival.`,
  base: "grand-world-classic",
  ticks: 150000,
  seeds: "2101-2104",
  sampleEvery: 500,
  invasion: { atTick: 100000, every: 20, genes: { diet: 0.95, attack: 0.6, fat: 0.5 }, repeatEvery: 5000, until: 145000 },
  arms: { control: {}, bundle },
  measures: ["population", "classes", "dietSpread", "kills", "mutationLoad", "dietLedger"],
});
const arms = { control: {}, bundle };
for (const name of Object.keys(HELPS)) {
  const without = Object.assign({}, ...Object.entries(HELPS).filter(([n]) => n !== name).map(([, v]) => v));
  arms[`bundle-no-${name}`] = without;
}
write("bundle", {
  name: "bundle",
  question: `With no help, do meat eaters (diet above 0.75) evolve and last in the grand world with ${describe}? Also the bundle with each help left out in turn, to see which it needs. 300,000 ticks. An answer: worlds with a lasting group of meat eaters, feeding levels, kills, species and population.`,
  base: "grand-world-classic",
  ticks: 300000,
  seeds: "2111-2114",
  sampleEvery: 1500,
  arms,
  measures: ["all"],
});
console.log(`bundle-margin: 2 arms; bundle: ${Object.keys(arms).length} arms`);
