// Writes docs/devlog/README.md: the devlog as a series, one line per entry, grouped by phase.
// Each entry's title is its first heading; its line is the first sentence or two of its italic summary.
// Usage: node apps/runner/scripts/devlog-index.mjs
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const dir = "docs/devlog";
const groups = [
  { title: "Building the world (Phases 0 to 3, v0.1)", from: 0, to: 3 },
  { title: "Brains and species (Phases 4 and 5, v0.2)", from: 4, to: 5 },
  { title: "A changing world and ecology (Phases 6 and 7, v0.3)", from: 6, to: 7 },
  { title: "Multicellularity and the grand world (Phase 8, v0.4)", from: 8, to: 15 },
  { title: "Experiments at scale (Phase 9)", from: 16, to: 24 },
  { title: "Ship it (Phase 10, v1.0)", from: 25, to: 99 },
];
const entries = readdirSync(dir)
  .filter((f) => /^\d{4}-.*\.md$/.test(f))
  .sort()
  .map((file) => {
    const text = readFileSync(`${dir}/${file}`, "utf8");
    const title = (text.match(/^# (.+)$/m)?.[1] ?? file).replace(/^Devlog \d+: /, "");
    const summary = (text.match(/^\*(.+)\*$/m)?.[1] ?? "").replace(/\s+/g, " ");
    // The first two sentences of the summary are enough for an index line.
    const short = (summary.match(/^(.*?[.!?])\s+(.*?[.!?])(\s|$)/)?.slice(1, 3).join(" ") ?? summary).trim();
    return { n: Number(file.slice(0, 4)), file, title, short };
  });
let out = "# Devlog\n\nOne entry per phase or part of a phase, from an empty repository to living plants: what was built, what emerged, what broke, and one image each. Newest last. For the results in one place, see [What we found](../findings/README.md).\n";
for (const g of groups) {
  const list = entries.filter((e) => e.n >= g.from && e.n <= g.to);
  if (!list.length) continue;
  out += `\n## ${g.title}\n\n`;
  for (const e of list) out += `${e.n}. **[${e.title}](${e.file})**. ${e.short}\n`;
}
writeFileSync(`${dir}/README.md`, out);
console.log(`wrote ${dir}/README.md (${entries.length} entries)`);
