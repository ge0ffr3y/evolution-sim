// Worlds holding a lasting meat-eating group, per arm: 10 or more meat eaters (diet above 0.75) in at least half the
// samples of the second half of the run. Also the share of animals eating more than half meat, and per seed how big
// the group got, when it was last 10 or more, and how many there were at the end.
// Usage: node apps/runner/scripts/meat-groups.mjs <experiment> [--seeds]
import { readFileSync, readdirSync } from "node:fs";

const [name, flag] = process.argv.slice(2);
const dir = `experiments/${name}/results`;
const arms = Object.keys(JSON.parse(readFileSync(`experiments/${name}/experiment.json`, "utf8")).arms);
const meat = (w) => (w.dietOver75 ?? 0) * w.population;
for (const arm of arms) {
  const files = readdirSync(dir).filter((f) => new RegExp(`^${arm}-s\\d+\\.result\\.json$`).test(f)).sort();
  const runs = files.map((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8")));
  const avg = (k) => runs.reduce((a, r) => a + (r.summary[k] ?? 0), 0) / runs.length;
  const per = runs.map((r) => {
    const late = r.rows.slice(Math.floor(r.rows.length / 2));
    const withGroup = r.rows.filter((w) => meat(w) >= 10);
    return {
      seed: r.seed,
      lateAvg: late.reduce((a, w) => a + meat(w), 0) / late.length,
      held: late.filter((w) => meat(w) >= 10).length / late.length,
      max: Math.max(...r.rows.map(meat)),
      last: withGroup.length ? withGroup[withGroup.length - 1].tick : 0,
      end: meat(r.rows[r.rows.length - 1]),
    };
  });
  const held = per.filter((x) => x.held >= 0.5).length;
  console.log(`${arm.padEnd(26)} held ${held}/${runs.length}  diet>0.5 ${(avg("dietOver50Late") * 100).toFixed(2)}%  10+ at the end: ${per.filter((x) => x.end >= 10).length}`);
  if (flag === "--seeds")
    for (const x of per)
      console.log(`   s${x.seed} late avg ${x.lateAvg.toFixed(0).padStart(4)}  held share ${x.held.toFixed(2)}  max ${x.max.toFixed(0).padStart(4)}  last 10+ at ${String(x.last).padStart(7)}  end ${x.end.toFixed(0)}${x.held >= 0.5 ? "  HELD" : ""}`);
}
