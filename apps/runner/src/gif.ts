import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { createGifEncoder } from "./encoder";
import { Simulation, parsePreset } from "@evo/sim-core";
import { readFileSync } from "node:fs";
import { PALETTE, drawFrame } from "./frame";

const USAGE = `Render a time-lapse GIF of a run (no browser needed).

  npm run gif -- --seed 12 --ticks 60000 --frames 90 --out docs/media/food-web.gif

Options:
  --seed N      random seed (default 12)
  --ticks N     how many ticks the whole time-lapse covers (default 60000)
  --frames N    how many frames to capture (default 90)
  --size N      picture size in pixels (default 360)
  --fps N       playback speed (default 12)
  --config FILE JSON preset file
  --out PATH    where to write the GIF (default docs/media/food-web.gif)
`;

const { values } = parseArgs({
  options: {
    seed: { type: "string", default: "12" },
    ticks: { type: "string", default: "60000" },
    frames: { type: "string", default: "90" },
    size: { type: "string", default: "360" },
    fps: { type: "string", default: "12" },
    config: { type: "string" },
    out: { type: "string", default: "docs/media/food-web.gif" },
    help: { type: "boolean", default: false },
  },
});
if (values.help) {
  console.log(USAGE);
  process.exit(0);
}

const num = (name: string, text: string | undefined, min: number): number => {
  const n = Number(text);
  if (!Number.isInteger(n) || n < min) {
    console.error(`--${name} must be a whole number of ${min} or more, got "${text}"\n\n${USAGE}`);
    process.exit(1);
  }
  return n;
};
const seed = num("seed", values.seed, 0);
const ticks = num("ticks", values.ticks, 1);
const frames = num("frames", values.frames, 2);
const size = num("size", values.size, 64);
const fps = num("fps", values.fps, 1);

const here = process.env["INIT_CWD"] ?? process.cwd();
const repoRoot = resolve(import.meta.dirname, "..", "..", "..");
const overrides = values.config ? parsePreset(JSON.parse(readFileSync(resolve(here, values.config), "utf8"))).config : {};
const outPath = resolve(values.out!.startsWith("/") ? values.out! : resolve(repoRoot, values.out!));

const sim = new Simulation(seed, overrides);
const gif = createGifEncoder();
const pixels = new Uint8Array(size * size);
const ticksPerFrame = Math.max(1, Math.floor(ticks / frames));

console.log(`Rendering ${frames} frames, ${ticksPerFrame} ticks apart, from seed ${seed}...`);
for (let f = 0; f < frames; f++) {
  if (f > 0) sim.run(ticksPerFrame);
  drawFrame(sim, size, pixels);
  gif.writeFrame(pixels, size, size, { palette: PALETTE, delay: Math.round(1000 / fps), repeat: 0 });
  if (sim.count === 0) break;
}
gif.finish();

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, gif.bytes());
const s = sim.stats();
console.log(
  `Wrote ${outPath} (${(gif.bytes().length / 1024).toFixed(0)} KB). Final tick ${s.tick}: ` +
    `${s.classes.herbivores} plant eaters, ${s.classes.omnivores} mixed, ${s.classes.carnivores} meat eaters.`,
);
for (const event of sim.events) console.log(`  tick ${event.tick}: ${event.text}`);
