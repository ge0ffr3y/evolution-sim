/**
 * Diagnostic: how do animals of each diet make a living? Runs one world, then over a watch window
 * tallies, per diet band, animal-ticks, plant and meat income, kills, births and deaths, and how
 * close to breeding (energy / threshold) the band sits. Not part of the sim; read-only.
 * Usage: npx tsx apps/runner/scripts/diet-ledger.ts <experiment> <arm> <seed> <warmup> <watch> [key=value ...]
 */
import { Simulation, GENE, GENE_COUNT } from "@evo/sim-core";
import { loadExperiment } from "../src/exp/experiment";

const [expPath, arm, seedS, warmS, watchS, ...sets] = process.argv.slice(2);
const exp = loadExperiment(expPath!, process.cwd());
const config = { ...exp.armConfigs[arm!]! } as Record<string, number>;
for (const s of sets) { const [k, v] = s.split("="); config[k!] = Number(v); }
const sim = new Simulation(Number(seedS), config as never);
const warm = Number(warmS), watch = Number(watchS);
for (let t = 0; t < warm; t++) sim.step();

const BANDS = ["0-0.25", "0.25-0.5", "0.5-0.75", "0.75-1"];
const band = (d: number) => (d < 0.25 ? 0 : d < 0.5 ? 1 : d < 0.75 ? 2 : 3);
const z = () => [0, 0, 0, 0];
const T = { ticks: z(), plant: z(), meat: z(), kills: z(), births: z(), deaths: z(), fed: z(), attack: z(), size: z(), ticksWithMeat: z() };
let prev = new Map<number, { b: number; plant: number; meat: number; kills: number }>();
const snap = () => {
  const now = new Map<number, { b: number; plant: number; meat: number; kills: number }>();
  for (let i = 0; i < sim.count; i++) {
    const d = sim.genes[i * GENE_COUNT + GENE.diet]!;
    now.set(sim.id[i]!, { b: band(d), plant: sim.plantTaken[i]!, meat: sim.meatTaken[i]!, kills: sim.kills[i]! });
  }
  return now;
};
prev = snap();
for (let t = 0; t < watch; t++) {
  sim.step();
  const now = new Map<number, { b: number; plant: number; meat: number; kills: number }>();
  for (let i = 0; i < sim.count; i++) {
    const id = sim.id[i]!;
    const d = sim.genes[i * GENE_COUNT + GENE.diet]!;
    const b = band(d);
    const rec = { b, plant: sim.plantTaken[i]!, meat: sim.meatTaken[i]!, kills: sim.kills[i]! };
    now.set(id, rec);
    const p = prev.get(id);
    T.ticks[b]++;
    T.fed[b] += sim.energy[i]! / sim.threshold[i]!;
    T.attack[b] += sim.attack[i]!;
    T.size[b] += sim.size[i]!;
    if (p) {
      const dp = rec.plant - p.plant, dm = rec.meat - p.meat;
      T.plant[b] += dp / sim.threshold[i]!;
      T.meat[b] += dm / sim.threshold[i]!;
      if (dm > 0) T.ticksWithMeat[b]++;
      T.kills[b] += rec.kills - p.kills;
    } else {
      // A newborn: credit the birth to its parent's band.
      const parent = prev.get(sim.parentId[i]!);
      T.births[parent ? parent.b : b]++;
    }
  }
  for (const [id, p] of prev) if (!now.has(id)) T.deaths[p.b]++;
  prev = now;
}
console.log(`seed ${seedS} arm ${arm} ticks ${warm}..${warm + watch} population ${sim.count}`);
console.log("band       share   fed   plant/1k  meat/1k  meatTicks  kills/1k  births/1k  deaths/1k  attack  size");
const all = T.ticks.reduce((a, b) => a + b, 0);
for (let b = 0; b < 4; b++) {
  const n = T.ticks[b]!;
  if (!n) { console.log(BANDS[b]!.padEnd(10), "none"); continue; }
  const r = (x: number) => ((x / n) * 1000).toFixed(2).padStart(8);
  console.log(BANDS[b]!.padEnd(10), (n / all).toFixed(4).padStart(6), (T.fed[b]! / n).toFixed(2).padStart(5), r(T.plant[b]!), r(T.meat[b]!), (T.ticksWithMeat[b]! / n).toFixed(3).padStart(9), r(T.kills[b]!), r(T.births[b]!), r(T.deaths[b]!), (T.attack[b]! / n).toFixed(2).padStart(7), (T.size[b]! / n).toFixed(2).padStart(5));
}
