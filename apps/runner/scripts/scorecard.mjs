// Scorecard: each arm against the control on key measures, from comparisons.csv. "*" = 95% range excludes no change.
import { readFileSync } from "node:fs";
const [csvPath, ...rest] = process.argv.slice(2);
const keys = (rest[0] ?? "meanPopulationLate,lowestPopulation,deathsPerAnimalPer1000Late,meanAgeLate,speciesAliveLate,shannonLate,trophicLevelsLate,meatShareOfFoodLate,killsPer1000TicksLate,twoParentShareLate,sickShareLate,plantFillLate,wornShareLate,cost_total_late,colonyShareLate").split(",");
const short = { meanPopulationLate: "pop", lowestPopulation: "lowest", deathsPerAnimalPer1000Late: "deaths", meanAgeLate: "age", speciesAliveLate: "species", shannonLate: "shannon", trophicLevelsLate: "levels", meatShareOfFoodLate: "meat", killsPer1000TicksLate: "kills", twoParentShareLate: "sex", sickShareLate: "sick", plantFillLate: "plants", wornShareLate: "worn", cost_total_late: "cost", colonyShareLate: "colonies" };
const rows = readFileSync(csvPath, "utf8").trim().split("\n").slice(1).map((l) => l.split(","));
const by = new Map();
for (const r of rows) by.set(`${r[0]}|${r[1]}`, { arm: +r[3], ctrl: +r[4], low: +r[6], high: +r[7] });
const arms = [...new Set(rows.map((r) => r[0]))];
const fmt = (x) => (Math.abs(x) >= 100 ? x.toFixed(0) : Math.abs(x) >= 1 ? x.toFixed(2) : x.toFixed(3));
const first = by.get(`${arms[0]}|${keys[0]}`);
console.log("control".padEnd(20) + keys.map((k) => { const c = [...by.entries()].find(([kk]) => kk.endsWith(`|${k}`)); return (c ? fmt(c[1].ctrl) : "-").padStart(10); }).join(""));
console.log("".padEnd(20) + keys.map((k) => (short[k] ?? k).padStart(10)).join(""));
for (const a of arms) {
  console.log(a.padEnd(20) + keys.map((k) => {
    const c = by.get(`${a}|${k}`);
    if (!c) return "-".padStart(10);
    const pct = c.ctrl !== 0 ? `${c.arm >= c.ctrl ? "+" : ""}${Math.round(((c.arm - c.ctrl) / Math.abs(c.ctrl)) * 100)}%` : fmt(c.arm);
    const sig = c.low > 0 || c.high < 0 ? "*" : " ";
    return `${pct}${sig}`.padStart(10);
  }).join(""));
}
