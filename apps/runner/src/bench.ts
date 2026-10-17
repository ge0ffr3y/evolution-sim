import { Simulation } from "@evo/sim-core";

// How fast is the simulation? Prints milliseconds per tick at a few world sizes.
// Run with: npm run bench
// (Real-time clocks are fine here: this is a measuring tool, not simulation logic.)
const WARMUP_TICKS = 3000;
const MEASURE_TICKS = 2000;

for (const size of [128, 256, 512]) {
  const sim = new Simulation(1, { worldWidth: size, worldHeight: size, maxOrganisms: 100_000 });
  sim.run(WARMUP_TICKS);
  const started = performance.now();
  sim.run(MEASURE_TICKS);
  const ms = performance.now() - started;
  const perTick = ms / MEASURE_TICKS;
  const organismTicks = (sim.count * MEASURE_TICKS) / (ms / 1000);
  console.log(
    `world ${size}x${size}: ${sim.count} organisms, ${perTick.toFixed(3)} ms/tick (${Math.round(1000 / perTick)} ticks/s), ` +
      `${(organismTicks / 1e6).toFixed(1)} million organism-ticks/s`,
  );
}
