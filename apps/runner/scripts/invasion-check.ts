// Quick look: after an invasion, how do the invaders (diet above 0.75) make a living, breed and die?
// Usage: npx tsx apps/runner/scripts/invasion-check.ts <experiment> <arm> <seed> <ticksAfter> [every]
import { Simulation } from "@evo/sim-core";
import { loadExperiment } from "../src/exp/experiment";
import { invade } from "../src/exp/invasion";
const [path, arm, seed, after, everyS] = process.argv.slice(2);
const exp = loadExperiment(path!, process.cwd());
const sim = new Simulation(Number(seed), exp.armConfigs[arm!]!);
while (sim.tick < exp.invasion!.atTick) sim.step();
const done = invade(sim, exp.invasion!);
console.log(`tick ${sim.tick}: ${done.changed} invaders (${done.enlarged} made bigger) among ${sim.count}`);
const every = Number(everyS ?? 100);
const end = sim.tick + Number(after);
type Rec = { meat: number; plant: number; kills: number };
let prev = new Map<number, Rec>();
let w = { ticks: 0, meat: 0, plant: 0, kills: 0, births: 0, deaths: 0, starvedish: 0, fed: 0, upkeep: 0 };
const isMeat = (i: number) => sim.diet[i]! > 0.75;
for (let i = 0; i < sim.count; i++) if (isMeat(i)) prev.set(sim.id[i]!, { meat: sim.meatTaken[i]!, plant: sim.plantTaken[i]!, kills: sim.kills[i]! });
const lastFed = new Map<number, number>();
while (sim.tick < end) {
  sim.step();
  const now = new Map<number, Rec>();
  for (let i = 0; i < sim.count; i++) {
    if (!isMeat(i)) continue;
    const id = sim.id[i]!;
    const r = { meat: sim.meatTaken[i]!, plant: sim.plantTaken[i]!, kills: sim.kills[i]! };
    now.set(id, r);
    lastFed.set(id, sim.energy[i]! / sim.threshold[i]!);
    w.ticks++;
    w.fed += sim.energy[i]! / sim.threshold[i]!;
    const p = prev.get(id);
    if (p) { w.meat += (r.meat - p.meat) / sim.threshold[i]!; w.plant += (r.plant - p.plant) / sim.threshold[i]!; w.kills += r.kills - p.kills; }
    else w.births++;
  }
  for (const [id] of prev) if (!now.has(id)) { w.deaths++; if ((lastFed.get(id) ?? 1) < 0.05) w.starvedish++; }
  prev = now;
  if (sim.tick % every === 0) {
    const n = w.ticks / every;
    const per = (x: number) => (w.ticks ? ((x / w.ticks) * 1000).toFixed(1) : "-");
    console.log(`tick ${sim.tick}: ~${n.toFixed(0)} meat eaters; per eater per 1k ticks: meat ${per(w.meat)} plant ${per(w.plant)} (in breedings' worth), kills ${per(w.kills)}; births ${w.births} deaths ${w.deaths} (${w.starvedish} near-empty); fed ${(w.fed / Math.max(w.ticks, 1)).toFixed(2)}`);
    w = { ticks: 0, meat: 0, plant: 0, kills: 0, births: 0, deaths: 0, starvedish: 0, fed: 0, upkeep: 0 };
  }
}
