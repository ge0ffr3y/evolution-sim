// Writes the fat-rework experiments. "New fat" is all five changes: store only true surplus (from the
// breeding level up), draw on it in lean spells (below half), store with less loss (90%), cheaper to
// carry, half the reserve handed to young, and the fat gene left out of relatedness.
// Usage: node apps/runner/scripts/make-fat-rework.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const oldFat = { fatDepositRate: 0.5, initialFat: 0.3 };
const newFat = { ...oldFat, fatDepositAbove: 1, fatDrawBelow: 0.5, fatEfficiency: 0.9, fatMoveCost: 0.25, fatUpkeep: 0.1, fatProvision: 0.5, fatRelated: 0 };
const pathBundle = { spareFamily: 1, foodRegrowPerTick: 0.24, meatColdKeep: 0.8, mutationLoadMend: 0.5, thermalCostCoeff: 0.75 };
const write = (exp) => {
  mkdirSync(`experiments/${exp.name}`, { recursive: true });
  writeFileSync(`experiments/${exp.name}/experiment.json`, `${JSON.stringify(exp, null, 2)}\n`);
};
write({
  name: "fat-rework",
  question: "Does reworked fat pay off? Grand world without fat, with today's fat, today's fat left out of relatedness, reworked fat (store only true surplus from the breeding level up, draw below half, 90% stored, cheaper to carry, half handed to young, left out of relatedness), reworked fat without the hand-over, reworked fat storing from 80%, and the no-fat path bundle with and without reworked fat. An answer: whether the fat gene now rises instead of falling, and what fat does to survival through lean spells (lowest population), species, brains (connections, hidden units) and meat eaters.",
  base: "grand-world",
  ticks: 300000,
  seeds: "2301-2304",
  sampleEvery: 1500,
  arms: {
    control: {},
    "old-fat": oldFat,
    "old-fat-unrelated": { ...oldFat, fatRelated: 0 },
    "new-fat": newFat,
    "new-fat-no-handover": { ...newFat, fatProvision: 0 },
    "new-fat-store-from-80": { ...newFat, fatDepositAbove: 0.8 },
    "path-bundle": pathBundle,
    "path-bundle-new-fat": { ...pathBundle, ...newFat },
  },
  measures: ["all"],
});
write({
  name: "fat-rework-margin",
  question: "Do arriving meat eaters with reworked fat hold their numbers? Grand world with reworked fat, the no-fat path bundle, and the path bundle with reworked fat; one animal in twenty becomes an armed meat eater with a fat gene of 0.5 at tick 100,000 and every 5,000 ticks after, diet ledger. An answer: how many remain 4,500 ticks after each arrival, and births against deaths.",
  base: "grand-world",
  ticks: 150000,
  seeds: "2311-2314",
  sampleEvery: 500,
  invasion: { atTick: 100000, every: 20, genes: { diet: 0.95, attack: 0.6, fat: 0.5 }, repeatEvery: 5000, until: 145000 },
  arms: { "new-fat": newFat, "path-bundle": pathBundle, "path-bundle-new-fat": { ...pathBundle, ...newFat } },
  measures: ["population", "classes", "dietSpread", "kills", "mutationLoad", "traits", "dietLedger"],
});
console.log("written");
