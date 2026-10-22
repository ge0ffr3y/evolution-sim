// Writes experiments/spare-family/experiment.json: does sparing your own parent and young let meat eaters
// take hold in the grand world? Grand-world setups first (the goal), the hunters' world as a reference.
// Usage: npx tsx apps/runner/scripts/make-spare-family.ts
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { DEFAULT_CONFIG } from "@evo/sim-core";

const grand: Record<string, number> = JSON.parse(readFileSync("configs/grand-world.json", "utf8")).config;
const hunters: Record<string, number> = JSON.parse(readFileSync("configs/grand-hunters.json", "utf8")).config;
const defaults = DEFAULT_CONFIG as unknown as Record<string, number>;
// The base is the grand world, so the hunters' world must put every grand-world setting it drops back to the default.
const huntersOnGrand: Record<string, number> = { ...hunters };
for (const k of Object.keys(grand)) if (!(k in hunters)) huntersOnGrand[k] = defaults[k]!;
const noKin = { kinDistance: 0, kinTolerance: 0, herdBonus: 0, shareRate: 0 };

const exp = {
  name: "spare-family",
  question: "Does sparing your own parent and young (spareFamily) let meat eaters (diet above 0.75) take hold in the grand world? Hunters attack whoever is nearest and babies are born on their parent's spot, so a hunting family's first victims are its own; kin restraint was patching that. Grand world: as it is; with spareFamily; with spareFamily and no kin restraint; with spareFamily and no herds. Reference: the hunters' world with and without spareFamily. An answer: meat eaters, feeding levels, kills, species and population in each, against the grand world.",
  base: "grand-world",
  ticks: 300000,
  seeds: "1701-1704",
  sampleEvery: 1500,
  arms: {
    control: {},
    "spare-family": { spareFamily: 1 },
    "spare-family-no-kin": { spareFamily: 1, ...noKin },
    "spare-family-no-herds": { spareFamily: 1, herdBonus: 0 },
    hunters: huntersOnGrand,
    "hunters-spare-family": { ...huntersOnGrand, spareFamily: 1 },
  },
  measures: ["all"],
};
mkdirSync("experiments/spare-family", { recursive: true });
writeFileSync("experiments/spare-family/experiment.json", `${JSON.stringify(exp, null, 2)}\n`);
console.log("written");
