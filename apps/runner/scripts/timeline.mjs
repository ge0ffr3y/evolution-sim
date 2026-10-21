// Summarize a long experiment over time: for each arm, median [min-max] across living seeds at fixed ticks.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
const dir = process.argv[2];
const at = [50000, 100000, 250000, 500000, 750000, 1000000];
const keys = (process.argv[3] ?? "population,mutationLoad,cost_load,cost_thermal,cost_total,hungryShare,dietMean,dietMax,meatEaters,sexGene,colonyShare,sickShare,speciesAlive,shannon,brainConnections,plantFill,grazingMean,foulMean,soilHealthMean,wornShare,meanAge").split(",");
const results = readdirSync(dir).filter((f) => f.endsWith(".result.json")).map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
const arms = [...new Set(results.map((r) => r.arm))];
const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1) + 0.5))]; };
const f = (x) => (x === undefined || Number.isNaN(x) ? "-" : Math.abs(x) >= 100 ? x.toFixed(0) : Math.abs(x) >= 1 ? x.toFixed(2) : x.toFixed(3));
for (const arm of arms) {
  const runs = results.filter((r) => r.arm === arm).sort((a, b) => a.seed - b.seed);
  const dead = runs.filter((r) => r.extinctAt !== null);
  console.log(`\n=== ${arm}: ${runs.length} seeds, ${dead.length} died out${dead.length ? ` (${dead.map((r) => `s${r.seed}@${r.extinctAt}`).join(", ")})` : ""}`);
  // rate measures from running totals: two-parent share and kills per 1000 between samples
  for (const r of runs) for (let k = 1; k < r.rows.length; k++) {
    const a = r.rows[k - 1], b = r.rows[k], dt = b.tick - a.tick;
    b.twoParentShare = b.births - a.births > 0 ? (b.twoParentBirths - a.twoParentBirths) / (b.births - a.births) : NaN;
    b.killsPer1000 = dt > 0 ? ((b.kills - a.kills) / dt) * 1000 : NaN;
    b.starvedShare = b.deaths - a.deaths > 0 ? (b.deathsStarved - a.deathsStarved) / (b.deaths - a.deaths) : NaN;
  }
  const all = [...keys, "twoParentShare", "killsPer1000", "starvedShare"];
  console.log(`${"measure".padEnd(18)}${at.map((t) => `${t / 1000}k`.padStart(24)).join("")}`);
  for (const key of all) {
    const cells = at.map((t) => {
      const vals = runs.map((r) => r.rows.find((row) => row.tick >= t && row.tick < t + 5000)?.[key]).filter((v) => typeof v === "number" && !Number.isNaN(v));
      return vals.length ? `${f(q(vals, 0.5))} [${f(Math.min(...vals))}-${f(Math.max(...vals))}]`.padStart(24) : "-".padStart(24);
    });
    console.log(`${key.padEnd(18)}${cells.join("")}`);
  }
}
