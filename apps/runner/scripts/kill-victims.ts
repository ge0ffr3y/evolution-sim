/**
 * Diagnostic: who do hunters kill? Wraps the simulation's kill step (observation only: the wrapper calls
 * the real one unchanged) and records, for each kill, whether the victim was the hunter's own child,
 * parent or sibling, and how genetically close it was.
 * Usage: npx tsx apps/runner/scripts/kill-victims.ts <preset> <seed> <warmup> <watch> [key=value ...]
 */
import { readFileSync } from "node:fs";
import { Simulation, parsePreset } from "@evo/sim-core";

const [presetName, seedS, warmS, watchS, ...sets] = process.argv.slice(2);
const preset = parsePreset(JSON.parse(readFileSync(`configs/${presetName}.json`, "utf8")), presetName!);
const config = { ...preset.config } as Record<string, number>;
for (const s of sets) { const [k, v] = s.split("="); config[k!] = Number(v); }
const sim = new Simulation(Number(seedS), config as never);
type Hidden = { kill(a: number, p: number): void; geneDistanceSq(i: number, j: number): number; parentId: Uint32Array; parent2Id: Uint32Array };
const h = sim as unknown as Hidden;
for (let t = 0; t < Number(warmS); t++) sim.step();
const tally = { kills: 0, child: 0, parent: 0, sibling: 0, closer: 0, close05: 0, close10: 0, distSum: 0, sameSpot: 0, newbornVictim: 0, newbornKiller: 0, familyNewborn: 0 };
const orig = h.kill.bind(sim);
h.kill = (a: number, p: number) => {
  const ida = sim.id[a]!, idp = sim.id[p]!;
  const pa = [h.parentId[a]!, h.parent2Id?.[a] ?? 0], pp = [h.parentId[p]!, h.parent2Id?.[p] ?? 0];
  tally.kills++;
  if (pp.includes(ida)) tally.child++;
  else if (pa.includes(idp)) tally.parent++;
  else if (pa[0] !== 0 && (pp.includes(pa[0]!) || (pa[1] !== 0 && pp.includes(pa[1]!)))) tally.sibling++;
  const family = pp.includes(ida) || pa.includes(idp) || (pa[0] !== 0 && (pp.includes(pa[0]!) || (pa[1] !== 0 && pp.includes(pa[1]!))));
  const dx = sim.x[a]! - sim.x[p]!, dy = sim.y[a]! - sim.y[p]!;
  if (dx * dx + dy * dy < 0.01) tally.sameSpot++;
  const young = sim.age[p]! <= 5 || sim.age[a]! <= 5;
  if (sim.age[p]! <= 5) tally.newbornVictim++;
  if (sim.age[a]! <= 5) tally.newbornKiller++;
  if (family && young) tally.familyNewborn++;
  const d = Math.sqrt(h.geneDistanceSq(a, p));
  tally.distSum += d;
  if (d <= 0.02) tally.closer++;
  if (d <= 0.05) tally.close05++;
  if (d <= 0.1) tally.close10++;
  orig(a, p);
};
for (let t = 0; t < Number(watchS); t++) sim.step();
const pct = (x: number) => `${((x / Math.max(tally.kills, 1)) * 100).toFixed(1)}%`;
console.log(`${presetName} seed ${seedS} ${sets.join(" ")}: ${tally.kills} kills in ${watchS} ticks, pop ${sim.count}; victim was own child ${pct(tally.child)}, parent ${pct(tally.parent)}, sibling ${pct(tally.sibling)}; gene distance <=0.02 ${pct(tally.closer)}, <=0.05 ${pct(tally.close05)}, <=0.1 ${pct(tally.close10)}, mean ${(tally.distSum / Math.max(tally.kills, 1)).toFixed(3)}; on the same spot ${pct(tally.sameSpot)}, victim at most 5 ticks old ${pct(tally.newbornVictim)}, killer at most 5 ticks old ${pct(tally.newbornKiller)}, family kill involving a newborn ${pct(tally.familyNewborn)}`);
