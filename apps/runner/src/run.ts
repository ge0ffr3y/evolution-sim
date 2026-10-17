import { DEFAULT_CONFIG, Simulation, type SimConfig, type SimStats } from "@evo/sim-core";

export const CSV_COLUMNS = [
  "tick",
  "population",
  "totalFood",
  "meanSpeed",
  "meanSize",
  "meanEnergy",
  "totalBirths",
  "totalDeaths",
] as const satisfies readonly (keyof SimStats)[];

export interface RunOptions {
  seed: number;
  ticks: number;
  /** Record one row of stats every this many ticks. */
  every: number;
  overrides?: Partial<SimConfig>;
  /** Called with a 0-1 progress fraction about every 10%. */
  onProgress?: (fraction: number) => void;
}

export interface RunResult {
  csv: string;
  rows: number;
  final: SimStats;
  /** True if everyone died before the requested number of ticks. */
  extinct: boolean;
}

function csvRow(stats: SimStats): string {
  return CSV_COLUMNS.map((column) => {
    const value = stats[column];
    return Number.isInteger(value) ? String(value) : value.toFixed(4);
  }).join(",");
}

/** Run one simulation headless and collect its stats as CSV text. */
export function runToCsv(options: RunOptions): RunResult {
  const { seed, ticks, every, overrides, onProgress } = options;
  if (!Number.isInteger(ticks) || ticks < 0) throw new Error("ticks must be a whole number, 0 or more");
  if (!Number.isInteger(every) || every < 1) throw new Error("every must be a whole number, 1 or more");

  const sim = new Simulation(seed, overrides);
  const lines: string[] = [CSV_COLUMNS.join(","), csvRow(sim.stats())];
  const progressStep = Math.max(1, Math.floor(ticks / 10));

  let extinct = false;
  for (let t = 1; t <= ticks; t++) {
    sim.step();
    if (t % every === 0 || t === ticks) lines.push(csvRow(sim.stats()));
    if (onProgress && t % progressStep === 0) onProgress(t / ticks);
    if (sim.count === 0) {
      // Record the moment of extinction (unless this tick was just recorded) and stop.
      if (t % every !== 0 && t !== ticks) lines.push(csvRow(sim.stats()));
      extinct = true;
      break;
    }
  }

  return { csv: lines.join("\n") + "\n", rows: lines.length - 1, final: sim.stats(), extinct };
}

/** Turn repeated `name=value` strings into config overrides, rejecting unknown names. */
export function parseOverrides(pairs: readonly string[]): Partial<SimConfig> {
  const overrides: Record<string, number> = {};
  for (const pair of pairs) {
    const [name, raw, ...rest] = pair.split("=");
    if (!name || raw === undefined || rest.length > 0) throw new Error(`--set expects name=value, got "${pair}"`);
    if (!(name in DEFAULT_CONFIG)) throw new Error(`Unknown config setting "${name}"`);
    const value = Number(raw);
    if (raw.trim() === "" || !Number.isFinite(value)) throw new Error(`Setting "${name}" needs a number, got "${raw}"`);
    overrides[name] = value;
  }
  return overrides as Partial<SimConfig>;
}
