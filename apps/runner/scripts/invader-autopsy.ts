/**
 * Diagnostic: what happens to a ready-made group of meat eaters and all its descendants? Runs a preset
 * to a warm-up tick, turns one animal in `every` into an armed meat eater (invasion), then follows the
 * lineage (every descendant, whoever the other parent was) and reports per window: lineage size and
 * diet, how many of its births had a parent from outside it, its harmful mutations against everyone
 * else's, how its members die (killed, by whom, or ran out of energy) and in which quarter of the year.
 * Observation only: the kill step is wrapped but the real one runs unchanged.
 * Usage: npx tsx apps/runner/scripts/invader-autopsy.ts <preset> <seed> <warmup> <watch> <window> [key=value ...]
 */
import { readFileSync } from "node:fs";
import { Simulation, parsePreset } from "@evo/sim-core";
import { invade } from "../src/exp/invasion";

const [presetName, seedS, warmS, watchS, windowS, ...sets] = process.argv.slice(2);
const preset = parsePreset(JSON.parse(readFileSync(`configs/${presetName}.json`, "utf8")), presetName!);
const config = { ...preset.config } as Record<string, number>;
for (const s of sets) { const [k, v] = s.split("="); config[k!] = Number(v); }
const sim = new Simulation(Number(seedS), config as never);
type Hidden = { kill(a: number, p: number): void; badSpots(i: number): number; parentId: Uint32Array; parent2Id: Uint32Array; loadOn: boolean };
const h = sim as unknown as Hidden;
const year = config.yearLength ?? 0;
for (let t = 0; t < Number(warmS); t++) sim.step();
const lineage = new Set<number>();
invade(sim, { atTick: sim.tick, every: 20, genes: { diet: 0.95, attack: 0.6 } });
for (let i = 0; i < sim.count; i++) if (sim.id[i]! % 20 === 0) lineage.add(sim.id[i]!);
const start = lineage.size;

let income = { meat: 0, plant: 0, ticks: 0, fed: 0 };
let prevTaken = new Map<number, [number, number]>();
let w = { births: 0, mixedBirths: 0, newbornDiet: 0, killedByOwn: 0, killedByOther: 0, ranOut: 0, kills: 0, deathsByQuarter: [0, 0, 0, 0] };
const killedIds = new Map<number, boolean>(); // victim id -> killed by its own lineage?
const orig = h.kill.bind(sim);
h.kill = (a: number, p: number) => {
  const ia = sim.id[a]!, ip = sim.id[p]!;
  if (lineage.has(ia)) w.kills++;
  if (lineage.has(ip)) killedIds.set(ip, lineage.has(ia));
  orig(a, p);
};
let alive = new Set<number>();
for (let i = 0; i < sim.count; i++) if (lineage.has(sim.id[i]!)) alive.add(sim.id[i]!);
console.log(`${presetName} seed ${seedS} ${sets.join(" ")}: ${start} invaders among ${sim.count} at tick ${sim.tick}`);
console.log("(income: breedings' worth per member per 1,000 ticks; fed: energy as a share of what breeding needs)");
console.log("tick     lineage  meat>.75  diet   births  outside-parent  newborn-diet  killed-by-own  killed-by-other  ran-out  kills  load(lineage/all)  deaths by quarter   meat-in plant-in fed  pop");
const end = sim.tick + Number(watchS);
while (sim.tick < end) {
  sim.step();
  const now = new Set<number>();
  for (let i = 0; i < sim.count; i++) {
    const id = sim.id[i]!;
    if (!lineage.has(id)) {
      const p1 = h.parentId[i]!, p2 = h.parent2Id.length ? h.parent2Id[i]! : 0;
      const in1 = lineage.has(p1), in2 = p2 !== 0 && lineage.has(p2);
      if ((in1 || in2) && sim.age[i]! <= 1) {
        lineage.add(id);
        w.births++;
        if (p2 !== 0 && in1 !== in2) w.mixedBirths++;
        w.newbornDiet += sim.diet[i]!;
      }
    }
    if (lineage.has(id)) {
      now.add(id);
      const thr = sim.threshold[i]!;
      const was = prevTaken.get(id);
      if (was) { income.meat += (sim.meatTaken[i]! - was[0]) / thr; income.plant += (sim.plantTaken[i]! - was[1]) / thr; }
      prevTaken.set(id, [sim.meatTaken[i]!, sim.plantTaken[i]!]);
      income.ticks++;
      income.fed += sim.energy[i]! / thr;
    }
  }
  for (const id of alive) if (!now.has(id)) {
    if (killedIds.has(id)) { if (killedIds.get(id)) w.killedByOwn++; else w.killedByOther++; }
    else w.ranOut++;
    if (year > 0) w.deathsByQuarter[Math.floor(((sim.tick % year) / year) * 4)]!++;
  }
  alive = now;
  if ((sim.tick - (end - Number(watchS))) % Number(windowS) === 0) {
    let diet = 0, meat = 0, loadL = 0, loadAll = 0;
    for (let i = 0; i < sim.count; i++) {
      const spots = h.loadOn ? h.badSpots(i) : 0;
      loadAll += spots;
      if (lineage.has(sim.id[i]!)) { diet += sim.diet[i]!; if (sim.diet[i]! > 0.75) meat++; loadL += spots; }
    }
    const n = alive.size;
    console.log(`${String(sim.tick).padEnd(8)} ${String(n).padStart(7)} ${String(meat).padStart(9)} ${(n ? diet / n : 0).toFixed(2).padStart(5)} ${String(w.births).padStart(8)} ${String(w.mixedBirths).padStart(15)} ${(w.births ? w.newbornDiet / w.births : 0).toFixed(2).padStart(13)} ${String(w.killedByOwn).padStart(14)} ${String(w.killedByOther).padStart(16)} ${String(w.ranOut).padStart(8)} ${String(w.kills).padStart(6)} ${(n ? loadL / n : 0).toFixed(1).padStart(8)}/${(loadAll / sim.count).toFixed(1).padEnd(8)} ${w.deathsByQuarter.join(",").padEnd(18)} ${(income.ticks ? (income.meat / income.ticks) * 1000 : 0).toFixed(1).padStart(7)} ${(income.ticks ? (income.plant / income.ticks) * 1000 : 0).toFixed(1).padStart(8)} ${(income.ticks ? income.fed / income.ticks : 0).toFixed(2).padStart(4)} ${String(sim.count).padStart(5)}`);
    income = { meat: 0, plant: 0, ticks: 0, fed: 0 };
    w = { births: 0, mixedBirths: 0, newbornDiet: 0, killedByOwn: 0, killedByOther: 0, ranOut: 0, kills: 0, deathsByQuarter: [0, 0, 0, 0] };
    if (n === 0) break;
  }
}
