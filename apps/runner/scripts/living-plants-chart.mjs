// Devlog 24 chart: two panels, averages of 8 grand worlds over 300,000 ticks.
// Left: how closely plants' best temperature follows the local temperature (living-plants-1).
// Right: plant toxin that harms against harmless toxin, the chance-only baseline (living-plants-3).
// Usage: node apps/runner/scripts/living-plants-chart.mjs docs/media/living-plants.svg
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const series = (exp, arm, key) => {
  const dir = `experiments/${exp}/results`;
  const runs = readdirSync(dir).filter((f) => new RegExp(`^${arm}-s\\d+\\.result\\.json$`).test(f)).map((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8")));
  const ticks = [];
  for (let t = 0; t <= 300000; t += 6000) ticks.push(t);
  return ticks.map((t) => [t, runs.reduce((a, r) => a + ((r.rows.find((w) => w.tick >= t) ?? r.rows.at(-1))[key] ?? 0), 0) / runs.length]);
};
const panels = [
  { title: "Plants fit their land", sub: "best temperature against local temperature (correlation)", ymax: 0.8, lines: [["#2a9d8f", "Plants that evolve", series("living-plants-1", "living-plants", "plantWarmCorr")]] },
  { title: "Plant toxin is chosen", sub: "average toxin on land", ymax: 0.32, lines: [["#9b4dca", "Toxin that harms grazers", series("living-plants-3", "living-toxins", "plantToxin")], ["#9a9a9a", "Harmless toxin (chance alone)", series("living-plants-3", "living-harmless-toxins", "plantToxin")]] },
];
const W = 850, H = 330, PW = 340, T = 62, B = 48, ih = H - T - B;
let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Helvetica, Arial, sans-serif" font-size="12"><rect width="100%" height="100%" fill="#fff"/>`;
panels.forEach((p, k) => {
  const L = 56 + k * (PW + 70);
  const x = (t) => L + (t / 300000) * PW;
  const y = (v) => T + ih - (Math.max(0, Math.min(v, p.ymax)) / p.ymax) * ih;
  s += `<text x="${L}" y="22" font-size="14" font-weight="bold" fill="#222">${p.title}</text><text x="${L}" y="40" fill="#555">${p.sub}</text>`;
  for (let i = 0; i <= 4; i++) {
    const v = (p.ymax * i) / 4;
    s += `<line x1="${L}" x2="${L + PW}" y1="${y(v)}" y2="${y(v)}" stroke="#eee"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" fill="#666">${v.toFixed(2)}</text>`;
  }
  for (let t = 0; t <= 300000; t += 100000) s += `<text x="${x(t)}" y="${T + ih + 16}" text-anchor="middle" fill="#666">${t / 1000}k</text>`;
  s += `<text x="${L + PW / 2}" y="${H - 8}" text-anchor="middle" fill="#444">ticks (average of 8 worlds)</text>`;
  p.lines.forEach(([color, label, pts], j) => {
    s += `<polyline fill="none" stroke="${color}" stroke-width="2.2" points="${pts.map(([t, v]) => `${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}"/>`;
    s += `<line x1="${L + 10}" x2="${L + 28}" y1="${T + 10 + j * 18}" y2="${T + 10 + j * 18}" stroke="${color}" stroke-width="3"/><text x="${L + 34}" y="${T + 14 + j * 18}" fill="#333">${label}</text>`;
  });
});
writeFileSync(process.argv[2], `${s}</svg>\n`);
