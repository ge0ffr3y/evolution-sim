import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { Simulation, parseConfigOverrides, parsePreset } from "@evo/sim-core";

// How fast is the simulation? Prints milliseconds per tick at a few world sizes.
// Run with: npm run bench
// Try a big brainy world:  npm run bench -w apps/runner -- --sizes 512,1024 --config configs/brains-big-world.json --set foodRegrowPerTick=0.02
// (Real-time clocks are fine here: this is a measuring tool, not simulation logic.)
const USAGE = `How fast is the simulation?

  npm run bench -w apps/runner -- [options]   (with no options it uses the defaults)

Options:
  --sizes LIST     world sizes to try, e.g. 128,256,512 (default) or 1024
  --warmup N       ticks to run before measuring (default 3000)
  --measure N      ticks to time (default 2000)
  --config FILE    a preset JSON file to run
  --set name=value change any setting (can be repeated)
`;

const { values } = parseArgs({
  options: {
    sizes: { type: "string", default: "128,256,512" },
    warmup: { type: "string", default: "3000" },
    measure: { type: "string", default: "2000" },
    config: { type: "string" },
    set: { type: "string", multiple: true },
    help: { type: "boolean", default: false },
  },
});
if (values.help) {
  console.log(USAGE);
  process.exit(0);
}

const here = process.env["INIT_CWD"] ?? process.cwd();
const base = values.config ? parsePreset(JSON.parse(readFileSync(resolve(here, values.config), "utf8"))).config : {};
const extra: Record<string, number> = {};
for (const pair of values.set ?? []) {
  const [name, text] = pair.split("=");
  extra[name!] = Number(text);
}
const overrides = { ...base, ...parseConfigOverrides(extra) };
const warmup = Number(values.warmup);
const measure = Number(values.measure);

for (const size of values.sizes!.split(",").map(Number)) {
  const sim = new Simulation(1, { maxOrganisms: 100_000, ...overrides, worldWidth: size, worldHeight: size });
  sim.run(warmup);
  const started = performance.now();
  sim.run(measure);
  const ms = performance.now() - started;
  const perTick = ms / measure;
  const organismTicks = (sim.count * measure) / (ms / 1000);
  console.log(
    `world ${size}x${size}: ${sim.count} organisms, ${perTick.toFixed(3)} ms/tick (${Math.round(1000 / perTick)} ticks/s), ` +
      `${(organismTicks / 1e6).toFixed(1)} million organism-ticks/s`,
  );
}
