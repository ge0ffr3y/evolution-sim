import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { parseOverrides, runToCsv } from "./run";

const USAGE = `Evolution Sim headless runner

Usage:
  npm run sim -- --seed 42 --ticks 100000 [options]

Options:
  --seed N         random seed (default 42)
  --ticks N        how many ticks to simulate (default 100000)
  --every N        write one row of stats every N ticks (default 100)
  --out PATH       CSV file to write (default experiments/results/seed-<seed>.csv)
  --set NAME=VALUE override a config number, e.g. --set foodRegrowPerTick=0.05 (repeatable)
  --help           show this message
`;

function fail(message: string): never {
  console.error(`Error: ${message}\n\n${USAGE}`);
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    seed: { type: "string", default: "42" },
    ticks: { type: "string", default: "100000" },
    every: { type: "string", default: "100" },
    out: { type: "string" },
    set: { type: "string", multiple: true, default: [] },
    help: { type: "boolean", default: false },
  },
});

if (values.help) {
  console.log(USAGE);
  process.exit(0);
}

const seed = Number(values.seed);
const ticks = Number(values.ticks);
const every = Number(values.every);
if (!Number.isFinite(seed)) fail(`--seed must be a number, got "${values.seed}"`);
if (!Number.isInteger(ticks) || ticks < 0) fail(`--ticks must be a whole number, got "${values.ticks}"`);
if (!Number.isInteger(every) || every < 1) fail(`--every must be a whole number of 1 or more, got "${values.every}"`);

let overrides: ReturnType<typeof parseOverrides>;
try {
  overrides = parseOverrides(values.set);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

// `npm run` starts us inside apps/runner, so resolve paths against where the user typed the command.
const here = process.env["INIT_CWD"] ?? process.cwd();
const repoRoot = resolve(import.meta.dirname, "..", "..", "..");
const outPath = values.out
  ? resolve(here, values.out)
  : join(repoRoot, "experiments", "results", `seed-${seed}.csv`);

console.log(`Running seed ${seed} for ${ticks} ticks (a row every ${every})...`);
const started = performance.now();
const result = runToCsv({
  seed,
  ticks,
  every,
  overrides,
  onProgress: (fraction) => console.log(`  ${Math.round(fraction * 100)}%`),
});
const seconds = (performance.now() - started) / 1000;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, result.csv);

const f = result.final;
console.log(
  result.extinct
    ? `Everyone died out at tick ${f.tick}.`
    : `Finished tick ${f.tick}: population ${f.population}, mean speed ${f.meanSpeed.toFixed(3)}, mean size ${f.meanSize.toFixed(3)}.`,
);
console.log(`Wrote ${result.rows} rows to ${outPath} in ${seconds.toFixed(1)}s.`);
