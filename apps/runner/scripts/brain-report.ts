// What the brains in a saved world look like: size, which senses and actions they use, by diet, and the most
// complex ones. It only loads the world, it never runs it.
//   npx tsx apps/runner/scripts/brain-report.ts w.evosnap [how many top brains to show, default 5]
// The file can be a plain .evosnap (as `npm run sim -- --save` writes) or a gzipped one.
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { CONN_MAX, HIDDEN_MAX, HIDDEN_START, INPUT_COUNT, OUTPUT_COUNT, OUTPUT_LABELS, OUTPUT_START, Simulation, inputLabel, snapshotFromBytes } from "@evo/sim-core";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npx tsx apps/runner/scripts/brain-report.ts <saved world> [top]");
  process.exit(1);
}
const top = Number(process.argv[3] ?? 5);
let bytes: Uint8Array = readFileSync(file);
if (bytes[0] === 0x1f && bytes[1] === 0x8b) bytes = gunzipSync(bytes);
// Copy into a fresh array: Node's buffers can share memory with others, and the loader reads the whole buffer.
const sim = Simulation.load(snapshotFromBytes(new Uint8Array(bytes)));
const n = sim.count;
if (sim.config.brainMode === 0 || n === 0) {
  console.log(n === 0 ? "No animals alive." : "This world has no brains.");
  process.exit(0);
}

const prune = sim.config.brainPruneBelow;
const conns: number[] = [];
const units: number[] = [];
const inputUse = new Float64Array(INPUT_COUNT);
const outputUse = new Float64Array(OUTPUT_COUNT);
const unitHist = new Array<number>(HIDDEN_MAX + 1).fill(0);
let direct = 0;
let viaUnit = 0;
const bands = [
  { name: "plant eaters (diet under 1/3)", n: 0, conns: 0, units: 0 },
  { name: "mixed eaters", n: 0, conns: 0, units: 0 },
  { name: "meat eaters (diet over 2/3)", n: 0, conns: 0, units: 0 },
];
const brains: { i: number; conns: number; units: number; inputs: number[]; outputs: number[] }[] = [];
for (let i = 0; i < n; i++) {
  const base = i * CONN_MAX;
  const ins = new Set<number>();
  const outs = new Set<number>();
  for (let k = 0; k < sim.brainCount[i]!; k++) {
    const w = sim.brainWeight[base + k]!;
    if (w < prune && w > -prune) continue;
    const from = sim.brainFrom[base + k]!;
    const to = sim.brainTo[base + k]!;
    if (from < INPUT_COUNT) ins.add(from);
    if (to >= OUTPUT_START) {
      outs.add(to - OUTPUT_START);
      if (from >= HIDDEN_START && from < OUTPUT_START) viaUnit++;
      else direct++;
    }
  }
  for (const k of ins) inputUse[k]!++;
  for (const o of outs) outputUse[o]!++;
  const c = sim.brainConnections[i]!;
  const h = sim.brainHidden[i]!;
  conns.push(c);
  units.push(h);
  unitHist[h]!++;
  const d = sim.diet[i]!;
  const band = bands[d < 1 / 3 ? 0 : d < 2 / 3 ? 1 : 2]!;
  band.n++;
  band.conns += c;
  band.units += h;
  brains.push({ i, conns: c, units: h, inputs: [...ins], outputs: [...outs] });
}

const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);
const at = (xs: number[], p: number) => sorted(xs)[Math.min(xs.length - 1, Math.floor(p * xs.length))]!;
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const pct = (x: number) => `${((100 * x) / n).toFixed(1)}%`;
const stats = sim.stats();
const cost = sim.costBreakdown();

console.log(`Tick ${sim.tick}, ${n} animals, ${stats.species.alive} species alive`);
console.log(`Working connections: average ${avg(conns).toFixed(1)}, middle ${at(conns, 0.5)}, top 10% from ${at(conns, 0.9)}, biggest ${Math.max(...conns)} (room for ${CONN_MAX})`);
console.log(`Thinking units: average ${avg(units).toFixed(2)}, most ${Math.max(...units)} (room for ${HIDDEN_MAX})`);
console.log(`  how many brains have each number of units: ${unitHist.map((v, k) => (v ? `${k}: ${v}` : "")).filter(Boolean).join(", ")}`);
console.log(`Connections into actions: ${direct} straight from a sense, ${viaUnit} through a thinking unit`);
for (const b of bands) if (b.n) console.log(`  ${b.name}: ${b.n} animals, ${(b.conns / b.n).toFixed(1)} connections, ${(b.units / b.n).toFixed(2)} thinking units`);
console.log(`Brain costs: ${cost.brain.toFixed(4)} per animal per tick, ${((100 * cost.brain) / cost.total).toFixed(1)}% of all costs`);
console.log(`Senses read: ${stats.brain.sensesInUse} of ${INPUT_COUNT} by at least one brain, ${stats.brain.sensesPerBrain.toFixed(1)} by an average brain`);

const used = [...inputUse.keys()].filter((k) => inputUse[k]! > 0).sort((a, b) => inputUse[b]! - inputUse[a]!);
console.log(`\nMost-read senses (share of brains):`);
for (const k of used.slice(0, 25)) console.log(`  ${pct(inputUse[k]!).padStart(6)}  ${inputLabel(k)}`);
const never = [...inputUse.keys()].filter((k) => inputUse[k] === 0);
console.log(`Never read (${never.length}): ${never.map(inputLabel).join(", ")}`);
console.log(`\nActions driven (share of brains): ${[...outputUse.keys()].map((o) => `${OUTPUT_LABELS[o]} ${pct(outputUse[o]!)}`).join(", ")}`);

brains.sort((a, b) => b.conns - a.conns || b.units - a.units || sim.id[a.i]! - sim.id[b.i]!);
console.log(`\nThe ${top} most complex brains:`);
for (const b of brains.slice(0, top)) {
  const i = b.i;
  console.log(
    `  #${sim.id[i]} (species ${sim.speciesOf(i)}, diet ${sim.diet[i]!.toFixed(2)}): ${b.conns} connections, ${b.units} thinking units, ${b.inputs.length} senses -> ${b.outputs.map((o) => OUTPUT_LABELS[o]).join(", ")}`,
  );
  console.log(`     reads: ${b.inputs.map(inputLabel).join("; ")}`);
}
