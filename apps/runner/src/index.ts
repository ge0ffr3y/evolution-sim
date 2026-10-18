import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { GENES, Simulation, parsePreset, snapshotFromBytes, snapshotToBytes, type SimConfig } from "@evo/sim-core";
import { foodWebSummary, parseOverrides, parseSeedList, runToCsv, spreadAcrossSeeds, summarize, type SeedSummary } from "./run";

const USAGE = `Evolution Sim headless runner

One run:
  npm run sim -- --seed 42 --ticks 100000 [options]

Many seeds at once (runs in parallel, then compares them):
  npm run sim -- --seeds 1-20 --ticks 100000 [options]

Options:
  --seed N         random seed (default 42)
  --seeds LIST     run several seeds, e.g. 1-20 or 3,7,11 (writes a folder of CSVs plus summary.csv)
  --jobs N         how many seeds to run at once with --seeds (default: your CPU count minus 1)
  --ticks N        how many ticks to simulate (default 100000)
  --every N        write one row of stats every N ticks (default 100)
  --hist-every N   write trait histograms every N ticks to <name>-hist.csv (default 1000, 0 = off)
  --config FILE    JSON preset file with config changes (see the configs/ folder)
  --set NAME=VALUE override a config number, e.g. --set moveCostCoeff=0.05 (repeatable, applied after --config)
  --out PATH       CSV file for one run, or folder for --seeds (default: experiments/results/...)
  --save FILE      save the finished world to FILE (a .evosnap file) so it can be continued later
  --load FILE      continue a saved world instead of starting a new one (--ticks is then how many MORE ticks to run)
  --branch-seed N  with --load: continue from the same moment but with a different random future
  --help           show this message
`;

function fail(message: string): never {
  console.error(`Error: ${message}\n\n${USAGE}`);
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    seed: { type: "string", default: "42" },
    seeds: { type: "string" },
    jobs: { type: "string" },
    ticks: { type: "string", default: "100000" },
    every: { type: "string", default: "100" },
    "hist-every": { type: "string", default: "1000" },
    config: { type: "string" },
    out: { type: "string" },
    save: { type: "string" },
    load: { type: "string" },
    "branch-seed": { type: "string" },
    set: { type: "string", multiple: true, default: [] },
    "summary-json": { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

if (values.help) {
  console.log(USAGE);
  process.exit(0);
}

function wholeNumber(name: string, text: string | undefined, min: number): number {
  const n = Number(text);
  if (text === undefined || !Number.isInteger(n) || n < min) fail(`--${name} must be a whole number of ${min} or more, got "${text}"`);
  return n;
}

const ticks = wholeNumber("ticks", values.ticks, 0);
const every = wholeNumber("every", values.every, 1);
const histEvery = wholeNumber("hist-every", values["hist-every"], 0);

// `npm run` starts us inside apps/runner, so resolve paths against where the user typed the command.
const here = process.env["INIT_CWD"] ?? process.cwd();
const repoRoot = resolve(import.meta.dirname, "..", "..", "..");

// Config: the preset file first, then any --set changes on top.
let overrides: Partial<SimConfig> = {};
let presetLabel = "";
try {
  if (values.config) {
    const path = resolve(here, values.config);
    const preset = parsePreset(JSON.parse(readFileSync(path, "utf8")), basename(path, ".json"));
    overrides = { ...preset.config };
    presetLabel = preset.name;
  }
  overrides = { ...overrides, ...parseOverrides(values.set) };
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

function describeConfig(): string {
  const parts = Object.entries(overrides).map(([k, v]) => `${k}=${v}`);
  const label = presetLabel ? `${presetLabel}${parts.length ? " + " : ""}` : "";
  return parts.length || label ? `${label}${parts.join(", ")}` : "default config";
}

// ---------------------------------------------------------------------------
// Many seeds: run each one as its own process, several at a time.
// ---------------------------------------------------------------------------
async function runSweep(seeds: number[]): Promise<void> {
  const jobs = values.jobs ? wholeNumber("jobs", values.jobs, 1) : Math.max(1, availableParallelism() - 1);
  const folder = values.out ? resolve(here, values.out) : join(repoRoot, "experiments", "results", `sweep-${seeds[0]}-${seeds[seeds.length - 1]}`);
  mkdirSync(folder, { recursive: true });
  console.log(`Running ${seeds.length} seeds for ${ticks} ticks each (${jobs} at a time) with ${describeConfig()}...`);

  const summaries: SeedSummary[] = [];
  const queue = [...seeds];
  const script = process.argv[1]!;

  const runOne = (seed: number): Promise<void> =>
    new Promise((done, reject) => {
      const args = [
        ...process.execArgv,
        script,
        "--seed", String(seed),
        "--ticks", String(ticks),
        "--every", String(every),
        "--hist-every", String(histEvery),
        "--out", join(folder, `seed-${seed}.csv`),
        "--summary-json",
      ];
      if (values.config) args.push("--config", resolve(here, values.config));
      for (const pair of values.set) args.push("--set", pair);
      const child = spawn(process.execPath, args, { stdio: ["ignore", "pipe", "pipe"] });
      let out = "";
      let err = "";
      child.stdout.on("data", (chunk: Buffer) => (out += chunk.toString()));
      child.stderr.on("data", (chunk: Buffer) => (err += chunk.toString()));
      child.on("error", reject);
      child.on("close", (code) => {
        const line = out.split("\n").find((l) => l.startsWith("SUMMARY "));
        if (code !== 0 || !line) return reject(new Error(`Seed ${seed} failed (exit ${code}): ${err.trim() || out.trim()}`));
        summaries.push(JSON.parse(line.slice("SUMMARY ".length)) as SeedSummary);
        console.log(`  seed ${seed} done (${summaries.length}/${seeds.length})`);
        done();
      });
    });

  const workers = Array.from({ length: Math.min(jobs, seeds.length) }, async () => {
    for (let seed = queue.shift(); seed !== undefined; seed = queue.shift()) await runOne(seed);
  });
  await Promise.all(workers);

  summaries.sort((a, b) => a.seed - b.seed);
  const header = ["seed", "extinct", "tick", "population", "herbivores", "omnivores", "carnivores", "totalKills", "totalAttacks", "brainConnHerbivores", "brainConnCarnivores", "chaseTurn", "fleeTurn", "speciesAlive", "speciesEver", "firstScavenger", "firstKill", "firstPredator", "firstCarnivore", ...GENES.map((g) => `mean_${g}`)];
  const tickOrBlank = (t: number | null): string => (t === null ? "" : String(t));
  const rows = summaries.map((s) =>
    [
      s.seed,
      s.extinct ? 1 : 0,
      s.tick,
      s.population,
      s.herbivores,
      s.omnivores,
      s.carnivores,
      s.totalKills,
      s.totalAttacks,
      s.brainConnectionsHerbivores.toFixed(2),
      s.brainConnectionsCarnivores.toFixed(2),
      s.chaseTurn.toFixed(3),
      s.fleeTurn.toFixed(3),
      s.speciesAlive,
      s.speciesEver,
      tickOrBlank(s.firsts.firstScavenger),
      tickOrBlank(s.firsts.firstKill),
      tickOrBlank(s.firsts.firstPredator),
      tickOrBlank(s.firsts.firstCarnivore),
      ...GENES.map((g) => s.means[g]!.toFixed(5)),
    ].join(","),
  );
  writeFileSync(join(folder, "summary.csv"), [header.join(","), ...rows].join("\n") + "\n");

  const spread = spreadAcrossSeeds(summaries);
  console.log(`\n${spread.survivors} of ${summaries.length} seeds survived to the end. How the survivors differ from each other:`);
  console.log("  trait          mean     sd    min     max   (sd/mean)");
  for (const gene of GENES) {
    const t = spread.traits[gene]!;
    const rel = t.mean > 0 ? (t.sd / t.mean) * 100 : 0;
    console.log(`  ${gene.padEnd(13)} ${t.mean.toFixed(3).padStart(6)} ${t.sd.toFixed(3).padStart(6)} ${t.min.toFixed(3).padStart(6)} ${t.max.toFixed(3).padStart(7)}   ${rel.toFixed(0)}%`);
  }

  const web = foodWebSummary(summaries);
  const median = (t: number | null): string => (t === null ? "never" : `tick ${t.toLocaleString("en-US")}`);
  console.log("\nDid a food web emerge? (everyone starts as an unarmed plant eater)");
  console.log(`  first scavenger:  ${web.emerged.firstScavenger.seeds} of ${summaries.length} seeds (median ${median(web.emerged.firstScavenger.medianTick)})`);
  console.log(`  first kill:       ${web.emerged.firstKill.seeds} of ${summaries.length} seeds (median ${median(web.emerged.firstKill.medianTick)})`);
  console.log(`  first predator:   ${web.emerged.firstPredator.seeds} of ${summaries.length} seeds (median ${median(web.emerged.firstPredator.medianTick)})`);
  console.log(`  first carnivore (survives mostly on meat): ${web.emerged.firstCarnivore.seeds} of ${summaries.length} seeds (median ${median(web.emerged.firstCarnivore.medianTick)})`);
  console.log(`  seeds ending with at least ${web.carnivoreThreshold} carnivores: ${web.withCarnivoresAtEnd} of ${summaries.length}`);

  const alive = summaries.filter((s) => !s.extinct);
  if (alive.length > 0) {
    const avg = (pick: (s: SeedSummary) => number): number => alive.reduce((total, s) => total + pick(s), 0) / alive.length;
    console.log("\nHow purposeful is behavior? (turning at random scores 50%)");
    console.log(`  hunters that can see prey off to one side turn toward it: ${(avg((s) => s.chaseTurn) * 100).toFixed(0)}%`);
    console.log(`  plant eaters that can see a threat off to one side turn away: ${(avg((s) => s.fleeTurn) * 100).toFixed(0)}%`);
    const ever = avg((s) => s.speciesEver);
    if (ever > 0) console.log(`\nSpecies (genetically distinct groups): ${avg((s) => s.speciesAlive).toFixed(1)} alive at the end, ${ever.toFixed(1)} ever, per seed (on average)`);
    const attacks = avg((s) => s.totalAttacks);
    if (attacks > 0) console.log(`  attacks that killed (whole run): ${((avg((s) => s.totalKills) / attacks) * 100).toFixed(0)}%`);
    const brainSize = avg((s) => s.brainConnectionsHerbivores + s.brainConnectionsCarnivores);
    if (brainSize > 0) {
      console.log(`  average working connections per brain: plant eaters ${avg((s) => s.brainConnectionsHerbivores).toFixed(1)}, meat eaters ${avg((s) => s.brainConnectionsCarnivores).toFixed(1)}`);
    }
  }
  console.log(`\nWrote ${summaries.length} run files and summary.csv to ${folder}`);
}

// ---------------------------------------------------------------------------
// One run.
// ---------------------------------------------------------------------------
function runSingle(): void {
  const seed = Number(values.seed);
  if (!Number.isFinite(seed)) fail(`--seed must be a number, got "${values.seed}"`);
  const outPath = values.out ? resolve(here, values.out) : join(repoRoot, "experiments", "results", `seed-${seed}.csv`);
  const quiet = values["summary-json"];

  let resume: Simulation | undefined;
  if (values.load) {
    if (values.config || values.set.length > 0) fail("--load continues a saved world with its own settings, so --config and --set cannot be used with it");
    try {
      const snapshot = snapshotFromBytes(new Uint8Array(readFileSync(resolve(here, values.load))));
      resume = Simulation.load(snapshot, values["branch-seed"] !== undefined ? { seed: Number(values["branch-seed"]) } : {});
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error));
    }
    if (!quiet) console.log(`Loaded ${values.load} (tick ${resume!.tick.toLocaleString("en-US")}, ${resume!.count} organisms). Running ${ticks} more ticks...`);
  } else if (values["branch-seed"] !== undefined) {
    fail("--branch-seed only makes sense together with --load");
  } else if (!quiet) {
    console.log(`Running seed ${seed} for ${ticks} ticks (a row every ${every}) with ${describeConfig()}...`);
  }
  const started = performance.now();
  const result = runToCsv({
    sim: resume,
    seed,
    ticks,
    every,
    histEvery,
    overrides,
    onProgress: quiet ? undefined : (fraction) => console.log(`  ${Math.round(fraction * 100)}%`),
  });
  const seconds = (performance.now() - started) / 1000;

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, result.csv);
  const histPath = outPath.replace(/\.csv$/, "") + "-hist.csv";
  if (result.histCsv) writeFileSync(histPath, result.histCsv);
  if (values.save) {
    const savePath = resolve(here, values.save);
    mkdirSync(dirname(savePath), { recursive: true });
    writeFileSync(savePath, snapshotToBytes(result.sim.save()));
    if (!quiet) console.log(`Saved the world at tick ${result.sim.tick.toLocaleString("en-US")} to ${savePath}`);
  }

  if (quiet) {
    console.log(`SUMMARY ${JSON.stringify(summarize(seed, result))}`);
    return;
  }
  const f = result.final;
  console.log(
    result.extinct
      ? `Everyone died out at tick ${f.tick}.`
      : `Finished tick ${f.tick}: population ${f.population}, mean size ${f.traits.size.mean.toFixed(3)}, mean speed ${f.traits.speed.mean.toFixed(3)}.`,
  );
  for (const event of result.events) console.log(`  tick ${event.tick.toLocaleString("en-US")}: ${event.text}`);
  console.log(`Wrote ${result.rows} rows to ${outPath} in ${seconds.toFixed(1)}s.`);
  if (result.histCsv) console.log(`Wrote trait histograms to ${histPath}.`);
}

if (values.seeds !== undefined) {
  let seeds: number[];
  try {
    seeds = parseSeedList(values.seeds);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  await runSweep(seeds);
} else {
  runSingle();
}
