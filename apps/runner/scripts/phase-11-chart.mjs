// Devlog 26 chart: two panels from the Phase 11 package experiment (16 grand worlds, 500,000 ticks).
// Left: the share of brains with a loop over time, per arm (from the result rows).
// Right: the average eye gene by diet gene band, animal by animal in the 16 saved final worlds of the
// eye gene + vigilance arm. Those saved worlds are not kept in the repo, so the figures are copied from
// docs/findings/phase-11-brains.md (section 2), where they were measured.
// Usage: node apps/runner/scripts/phase-11-chart.mjs docs/media/phase-11-brains.svg
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const TICKS = 500000;
const series = (arm, key) => {
  const dir = "experiments/phase-11-package/results";
  const runs = readdirSync(dir).filter((f) => new RegExp(`^${arm}-s\\d+\\.result\\.json$`).test(f)).map((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8")));
  const ticks = [];
  for (let t = 0; t <= TICKS; t += 10000) ticks.push(t);
  return ticks.map((t) => [t, runs.reduce((a, r) => a + ((r.rows.find((w) => w.tick >= t) ?? r.rows.at(-1))[key] ?? 0), 0) / runs.length]);
};
// Diet gene band (middle) and average eye gene, from the findings.
const EYE_BY_DIET = [
  ["0-0.02", 0.501],
  ["0.02-0.05", 0.537],
  ["0.05-0.1", 0.638],
  ["0.1-0.2", 0.742],
  ["0.2-0.3", 0.807],
  ["0.3-0.5", 0.831],
  ["0.5+", 0.836],
];

const W = 900, H = 340, PW = 340, T = 62, B = 52, ih = H - T - B;
let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Helvetica, Arial, sans-serif" font-size="12"><rect width="100%" height="100%" fill="#fff"/>`;
const grid = (L, y, ymax, steps, fmt) => {
  for (let i = 0; i <= steps; i++) {
    const v = (ymax * i) / steps;
    s += `<line x1="${L}" x2="${L + PW}" y1="${y(v)}" y2="${y(v)}" stroke="#eee"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" fill="#666">${fmt(v)}</text>`;
  }
};

// Left: loops over time.
{
  const L = 56;
  const x = (t) => L + (t / TICKS) * PW;
  const y = (v) => T + ih - Math.max(0, Math.min(v, 1)) * ih;
  s += `<text x="${L}" y="22" font-size="14" font-weight="bold" fill="#222">Brains learn to hold a thought</text><text x="${L}" y="40" fill="#555">share of brains with a loop (a unit that keeps its value)</text>`;
  grid(L, y, 1, 4, (v) => `${Math.round(v * 100)}%`);
  for (let t = 0; t <= TICKS; t += 100000) s += `<text x="${x(t)}" y="${T + ih + 16}" text-anchor="middle" fill="#666">${t / 1000}k</text>`;
  s += `<text x="${L + PW / 2}" y="${H - 10}" text-anchor="middle" fill="#444">ticks (average of 16 worlds)</text>`;
  const lines = [
    ["#e76f51", "Brain package", series("brains", "brainLoopShare")],
    ["#2a9d8f", "+ eye gene and vigilance", series("brains-eyes", "brainLoopShare")],
    ["#264653", "+ learning", series("brains-eyes-learning", "brainLoopShare")],
    ["#9a9a9a", "Today's grand world (no loops possible)", series("control", "brainLoopShare")],
  ];
  lines.forEach(([color, label, pts], j) => {
    s += `<polyline fill="none" stroke="${color}" stroke-width="2.2" points="${pts.map(([t, v]) => `${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}"/>`;
    s += `<line x1="${L + 120}" x2="${L + 138}" y1="${T + ih - 70 + j * 18}" y2="${T + ih - 70 + j * 18}" stroke="${color}" stroke-width="3"/><text x="${L + 144}" y="${T + ih - 66 + j * 18}" fill="#333">${label}</text>`;
  });
}

// Right: eye by diet.
{
  const L = 56 + PW + 80;
  const n = EYE_BY_DIET.length;
  const x = (k) => L + ((k + 0.5) / n) * PW;
  const lo = 0.4, hi = 0.9;
  const y = (v) => T + ih - ((v - lo) / (hi - lo)) * ih;
  s += `<text x="${L}" y="22" font-size="14" font-weight="bold" fill="#222">Eyes narrow with meat in the diet</text><text x="${L}" y="40" fill="#555">average eye gene (1 = narrowest) by diet gene, 16,421 animals</text>`;
  for (let i = 0; i <= 5; i++) {
    const v = lo + ((hi - lo) * i) / 5;
    s += `<line x1="${L}" x2="${L + PW}" y1="${y(v)}" y2="${y(v)}" stroke="#eee"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" fill="#666">${v.toFixed(1)}</text>`;
  }
  s += `<line x1="${L}" x2="${L + PW}" y1="${y(0.5)}" y2="${y(0.5)}" stroke="#999" stroke-dasharray="5 4"/><text x="${L + 6}" y="${T + 12}" fill="#777">dashed line: today's eye (150 degrees)</text>`;
  EYE_BY_DIET.forEach(([band, v], k) => {
    s += `<rect x="${(x(k) - 16).toFixed(1)}" y="${y(v).toFixed(1)}" width="32" height="${(T + ih - y(v)).toFixed(1)}" fill="#2a9d8f" opacity="0.85"/>`;
    s += `<text x="${x(k).toFixed(1)}" y="${(y(v) - 5).toFixed(1)}" text-anchor="middle" fill="#333">${v.toFixed(2)}</text>`;
    s += `<text x="${x(k).toFixed(1)}" y="${T + ih + 16}" text-anchor="middle" fill="#666" font-size="11">${band}</text>`;
  });
  s += `<text x="${L + PW / 2}" y="${H - 10}" text-anchor="middle" fill="#444">diet gene (0 = plants only, 1 = meat only)</text>`;
}

writeFileSync(process.argv[2], `${s}</svg>\n`);
