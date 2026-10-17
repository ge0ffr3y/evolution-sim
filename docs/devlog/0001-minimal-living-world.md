# Devlog 1: A minimal living world

*Phase 1. The first dots, and the first evolution.*

## What was built

- A wraparound (toroidal) world with a coarse grid of food that regrows at a fixed rate up to a cap.
- Organisms stored as typed arrays (position, heading, energy, age, speed, size). They wander at random, eat the food in their cell, pay energy every tick, die at zero, and split in two when they have enough energy. The child gets half the parent's energy and a slightly mutated speed and size.
- A spatial hash grid for fast "who is near me?" lookups. It is built and tested against a brute-force check, but nothing uses it yet. Predation and senses will.
- A browser viewer: the simulation runs in a Web Worker, a canvas draws food and organisms (dot color is speed, dot size is body size), with play/pause, five speeds, a seed box, and live charts of population, food, and average traits. The seed is kept in the address bar (`?seed=42`).
- A headless runner: `npm run sim -- --seed 42 --ticks 100000` writes stats to a CSV. `--set name=value` overrides any config number.
- A determinism test (seed 42, 10,000 ticks, run twice, fingerprints must match) plus a rules check that runs every tick of a long simulation.

## What emerged

Run 8 seeds for 100,000 ticks and every one of them behaves the same way:

1. The population rises from 200 to about 1,450 within a few hundred ticks, eating the starting pile of food down to almost nothing, and holds there for roughly 10,000 ticks.
2. Meanwhile, **mean size quietly drops** from 1.0 toward the 0.3 minimum. Smaller bodies need less energy to reproduce, and at this stage nothing rewards being big.
3. As bodies shrink, the same food supports more organisms, so the population climbs and settles near **5,000** (within about 8-12% of its average over the last 30,000 ticks, in all 8 seeds).
4. Mean speed first rises a little, then falls to about 0.3 as the movement cost (which scales with body size) shrinks along with the bodies.

None of that was programmed. It comes from "everything costs energy" plus random mutation.

## What broke (or surprised)

- **Every seed converges to nearly the same answer** (size 0.31 to 0.32, speed 0.30 to 0.37). That is expected here: with only one pressure (reproduce cheaply), there is one winning strategy. Phase 2 adds real trade-offs, and the goal there is for different seeds to settle on *different* strategies.
- **Browsers can disagree about math.** `Math.sin`, `Math.log`, `**` and friends are allowed to round differently in the last digit, which would make the same seed play out differently in Chrome vs Safari vs Firefox. The simulation now uses only exact operations (a guardrail test enforces it), so shareable seed links will replay identically everywhere.
- **Speed.** A 100,000-tick run with about 5,000 organisms takes roughly 100 seconds. Fine for the viewer, which runs smoothly at 60 fps with about 2,250 organisms while simulating around 900 ticks per second, but it is slower than the "1M ticks in minutes" goal. To be profiled before brains arrive in Phase 4.
- Two small tooling slips, both caught right away: a dev-server launch config that treated a port number as a folder, and a test that was slow because it called `expect` millions of times.

## Next

Phase 2: a real genome, with costs that scale with size and speed, an energy ledger, an inspector panel, and trait histograms.
