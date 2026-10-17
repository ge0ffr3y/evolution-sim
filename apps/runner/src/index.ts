import { parseArgs } from "node:util";
import { Rng } from "@evo/sim-core";

// Phase 0 placeholder for the headless runner. Phase 1 turns this into the real
// batch CLI: `npm run sim -- --seed 42 --ticks 100000` writing stats to CSV.
const { values } = parseArgs({
  options: { seed: { type: "string", default: "42" } },
});

const seed = Number(values.seed);
if (!Number.isFinite(seed)) {
  console.error(`Invalid --seed value: ${values.seed}`);
  process.exit(1);
}

const rng = new Rng(seed);
const samples = Array.from({ length: 3 }, () => rng.next().toFixed(4)).join(", ");
console.log(`Evolution Sim runner (Phase 0 placeholder). Seed ${seed} starts with ${samples}`);
