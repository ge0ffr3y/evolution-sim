// Rank settings by how much turning them down and up moves the key measures (Stage 2).
import { readFileSync } from "node:fs";
const csv = readFileSync(process.argv[2], "utf8").trim().split("\n").slice(1).map((l) => l.split(","));
const KEYS = { meanPopulationLate: "pop", speciesAliveLate: "species", shannonLate: "shannon", trophicLevelsLate: "levels", meatShareOfFoodLate: "meat", twoParentShareLate: "sex", deathsPerAnimalPer1000Late: "deaths", wornShareLate: "worn" };
const by = new Map();
for (const r of csv) {
  if (!(r[1] in KEYS)) continue;
  const [arm, key, , a, c, , low, high] = r;
  const m = /^(.*)-(down|up)$/.exec(arm);
  if (!m) continue;
  const setting = m[1];
  if (!by.has(setting)) by.set(setting, {});
  const ctrl = +c;
  const pct = ctrl !== 0 ? ((+a - ctrl) / Math.abs(ctrl)) * 100 : 0;
  by.get(setting)[`${KEYS[key]}_${m[2]}`] = { pct, sig: +low > 0 || +high < 0 };
}
const score = (s, k) => Math.max(Math.abs(s[`${k}_down`]?.pct ?? 0), Math.abs(s[`${k}_up`]?.pct ?? 0));
const cell = (s, k) => {
  const f = (d) => { const v = s[`${k}_${d}`]; return v ? `${v.pct >= 0 ? "+" : ""}${Math.round(v.pct)}${v.sig ? "*" : ""}` : "."; };
  return `${f("down")}/${f("up")}`.padStart(13);
};
const rows = [...by.entries()].map(([setting, s]) => ({ setting, s, popScore: score(s, "pop"), divScore: Math.max(score(s, "species"), score(s, "shannon")), levScore: score(s, "levels"), meatScore: score(s, "meat"), sexScore: score(s, "sex") }));
const show = (title, list) => {
  console.log(`\n== ${title}`);
  console.log("setting".padEnd(30) + Object.values(KEYS).map((k) => `${k} d/u %`.padStart(13)).join(""));
  for (const r of list) console.log(r.setting.padEnd(30) + Object.values(KEYS).map((k) => cell(r.s, k)).join(""));
};
const n = +(process.argv[3] ?? 20);
show(`Top ${n} by population`, [...rows].sort((a, b) => b.popScore - a.popScore).slice(0, n));
show(`Top ${n} by species or diversity`, [...rows].sort((a, b) => b.divScore - a.divScore).slice(0, n));
show(`Top 12 by feeding levels`, [...rows].sort((a, b) => b.levScore - a.levScore).slice(0, 12));
show(`Top 12 by meat in the diet`, [...rows].sort((a, b) => b.meatScore - a.meatScore).slice(0, 12));
show(`Top 12 by sex (two-parent births)`, [...rows].sort((a, b) => b.sexScore - a.sexScore).slice(0, 12));
const inert = rows.filter((r) => Object.keys(KEYS).every((k) => score(r.s, KEYS[k]) < 10));
console.log(`\n== Barely matter: ${inert.length} of ${rows.length} settings move no key measure by 10% or more either way`);
console.log(inert.map((r) => r.setting).join(", "));
