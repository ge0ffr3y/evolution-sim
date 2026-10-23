// Diet-ledger table for an experiment: per arm and diet band, averages over rows after a tick,
// each sample weighted by the band's animals (share x population). Usage: node ledger-table.mjs <experiment> [fromTick]
import { readFileSync, readdirSync } from "node:fs";
const [name, fromS] = process.argv.slice(2);
const from = Number(fromS ?? 0);
const dir = `experiments/${name}/results`;
const arms = Object.keys(JSON.parse(readFileSync(`experiments/${name}/experiment.json`, "utf8")).arms);
const keys = (process.env.KEYS ?? "fed,plantIn,meatIn,cost,costUpkeep,costLoad,costThermal,costMove,costAttack,kills,births,deaths").split(",");
const acc = {};
for (const f of readdirSync(dir).filter((f) => f.endsWith(".result.json"))) {
  const r = JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
  for (const row of r.rows) {
    if (row.tick <= from) continue;
    for (let b = 0; b < 4; b++) {
      const share = row[`ld${b}_share`];
      if (!(share > 0)) continue;
      const wgt = share * row.population;
      const a = ((acc[r.arm] ??= {})[b] ??= { w: 0, n: 0 });
      a.w += wgt; a.n += 1;
      for (const k of keys) { const v = row[`ld${b}_${k}`]; if (Number.isFinite(v)) a[k] = (a[k] ?? 0) + v * wgt; }
    }
  }
}
const bandName = ["plant <.25", "mixed .25-.5", "mixed .5-.75", "meat >.75"];
console.log("per animal per 1,000 ticks; income and costs in breedings' worth".padEnd(40));
console.log("arm / band".padEnd(30), "animals", ...keys.map((k) => k.padStart(9)), " net");
for (const arm of arms) for (let b = 0; b < 4; b++) {
  const a = acc[arm]?.[b]; if (!a) continue;
  const v = (k) => (a[k] ?? 0) / a.w;
  const net = v("plantIn") + v("meatIn") - v("cost");
  console.log(`${arm} / ${bandName[b]}`.padEnd(30), (a.w / a.n).toFixed(0).padStart(7), ...keys.map((k) => v(k).toFixed(k === "fed" ? 2 : 1).padStart(9)), net.toFixed(1).padStart(6));
}
