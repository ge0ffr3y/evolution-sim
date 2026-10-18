# Evolution Sim Project: rules for the AI coding agent

A browser-based artificial-life simulation. Simple organisms evolve in a changing world. Roles like predator, herbivore and scavenger **emerge** from mutation plus one rule: everything costs energy. It is not a game and not visually polished: clarity and data matter more than looks.

The owner does not write code. Changes must be explainable in plain English and checkable by watching the sim and its graphs.

Planning notes live in the owner's Obsidian vault: `Projects/Evolution Sim Project/` (`01 - Overview`, `02 - Roadmap`). The roadmap defines the phases and each phase's "Done when" criteria.

## Hard rules

1. `packages/sim-core` must never use browser APIs (no `window`, `document`, DOM, canvas) or Node-only imports. It must run unchanged in a browser, a Web Worker and Node.
2. Never use `Math.random()`, `Date.now()`, `new Date()` or `performance.now()` in simulation logic. All randomness comes from the seeded `Rng` in `sim-core`.
   In `sim-core`, also avoid `Math.sin/cos/log/exp/pow/atan2` and the `**` operator: browsers may round them differently in the last digit, so the same seed would play out differently in Chrome, Safari and Firefox. Use only exact operations (`+ - * /`, `Math.sqrt`, `Math.floor`, `Math.fround`, `Math.min/max/abs`). For a power like `size^0.75`, build it from `sqrt`. A guardrail test enforces this.
3. The simulation advances in fixed **ticks**, never real time. Rendering speed must never change simulation results.
4. All tuning numbers (costs, rates, thresholds, caps) live in a single config object. No magic numbers in logic.
5. Same seed + same config must give exactly the same history. Do not iterate over unordered structures in a way that changes results, and do not depend on timing.
6. Energy is the universal currency. Every trait costs energy, and every energy gain or loss goes through the energy ledger (`Simulation.ledger`). Never create or destroy energy outside defined sources (plants regrowing) and sinks (upkeep, movement, sensing). The energy conservation test and the matter conservation test in `simulation.test.ts` must keep passing; if you add a new energy flow, add it to the ledger and to that test, and if you add a new place matter can sit, add it to `matterAudit()`.
7. There are no hard-coded roles. No `Predator` or `Herbivore` classes. Behavior must come from genes and environment.
8. Run `npm test` and `npm run typecheck` before every commit. Never commit with failing tests.
9. Prefer simple, readable code over clever code. Add a short comment explaining *why* for anything non-obvious.

## Working style

- Work **one roadmap phase at a time**, each on its own git branch (`phase-1-minimal-world`, etc.). Merge to `main` when the phase's "Done when" items are met.
- At the start of a phase, read this file and the phase's goals, then **propose a plan before writing code**.
- Explain changes in plain English for a non-programmer. Say what changed in the sim's behavior, not just in the code.
- Commit small and often so any change can be rolled back.
- Describe how to *see* each result (which chart, which overlay, which seed).
- Add tests as guardrails: determinism, energy conservation, golden seeds, snapshot round-trips. Keep growing them.
- If a result looks too good (something absurdly successful), check the energy ledger for an exploit before celebrating.
- Write a devlog entry in `docs/devlog/` at the end of each phase: what was built, what emerged, what broke, one image. Also append the same entry to the owner's Obsidian note `Projects/Evolution Sim Project/03 - Devlog`, and tick the roadmap checkboxes in `02 - Roadmap` as each item is verified working (only tick what you actually verified).
- Balancing is done with evidence: run many seeds (`npm run sim -- --seeds 1-12 ...`) and look at the spread, not one run. Report honestly when a "Done when" item is only partly met.
- Never push, publish or deploy without the owner's go-ahead.

## Layout

```
packages/sim-core/   the simulation: pure logic, no UI, no browser or Node APIs
apps/viewer/         browser app: world view, charts, inspector (Vite + TypeScript)
apps/runner/         Node CLI for headless batch experiments (tsx)
tests/               repo-wide guardrail tests (e.g. forbidden APIs in sim-core)
configs/             preset worlds as JSON (each is a named set of config changes; the viewer lists them)
experiments/         saved results (raw output is git-ignored)
docs/devlog/         one entry per phase
```

## Commands

```
npm install        install everything
npm test           run all tests (vitest)
npm run typecheck  type-check every workspace
npm run dev        start the viewer locally
npm run build      production build of the viewer
npm run sim -- --seed 42 --ticks 100000     one headless run (CSV of stats + trait histograms)
npm run sim -- --seeds 1-12 --ticks 50000   many seeds in parallel, then compare how they differ
npm run sim -- --config configs/costly-movement.json --seed 3   run a preset world (--set name=value tweaks any setting)
npm run bench      how fast is the simulation?
npm run sim -- --seed 5 --ticks 3000 --save w.evosnap     save the finished world
npm run sim -- --load w.evosnap --ticks 2000               carry on from a saved world (add --branch-seed N for a different random future)
npm run gif -- --seed 12 --ticks 60000   render a time-lapse GIF of a run
```

## Tech notes

- TypeScript everywhere, npm workspaces. `sim-core` is consumed as TypeScript source (no build step).
- Simulation data uses typed arrays (struct-of-arrays) for speed; spatial queries use a spatial hash grid.
- Each organism has a genome (eleven genes, each 0 to 1: size, speed, sense range, metabolism, color, mutation rate, diet, attack, armor, stamina, thermal). The stamina gene only does anything when `sprintFatigue` is on, and the thermal gene only in a climate world with `thermalCostCoeff` above 0; otherwise a gene is neither mutated nor fingerprinted (`activeGene`), so older worlds stay bit-for-bit identical (`CORE_GENE_COUNT`). Traits and per-tick costs are worked out from the genes once, at birth, and cached; the per-tick loop only does arithmetic on cached numbers. Gene order and the gene-to-trait mapping live in `genome.ts`.
- Energy goes one way (sun to plants to eaters to heat) and matter goes in a circle (soil, plants, detritus, soil; soil, bodies, corpses, detritus, soil). Plants need nutrient to grow, and a newborn's body is built from the soil it is born on.
- Predation is physics, not a role: any organism whose attack trait is above `attackThreshold` tries to kill the nearest prey in reach, with odds from attack power against defense. There is no Predator class and nothing is hard-coded about who eats whom.
- Brains are optional (`brainMode` 0 = none, the control; 1 = fixed layout; 2 = evolvable layout). They live in `brain.ts` (network and mutation) and `Simulation.think()`. All brain-world extras are off by default so earlier worlds do not change: `brainAppetiteSenses`, `sprintFatigue` (stamina), `killOwnershipTicks` (first claim on a kill), and `scentDeposit` (scent trails, laid whenever brains are on; set 0 to disable). Adding a brain input shifts node numbers and so changes brain-world golden fingerprints; brains-off goldens must never change.
- Species and the family tree live in `species.ts` and only WATCH the world: no random numbers, nothing in the world fingerprint, so they can never change what happens. A species is a group centered on its members' average genes (color and mutation rate ignored); a candidate needs `speciesMinMembers` members for `speciesProbation` ticks to count. Keep it observation-only: if species ever fed back into behavior it would be a hard-coded role.
- The dynamic world is all optional and off by default: `terrainMode` (biomes from noise, water is a hard barrier; `terrain.ts`), `climateMode` (temperature field, day/night, seasons, drift; `climate.ts`) and `catastropheKind` (ice age, drought, meteor). Terrain uses its own random stream derived from the seed. Per-tick climate arrays are recomputed from the tick, so they are not saved. A meteor must route what it destroys to a sink (plant matter to detritus, plant energy to `decayLoss`) so the conservation tests still pass.
- Sexual reproduction is a toggle (`sexualReproduction`, off by default so older worlds are unchanged): ready, nearby, genetically compatible organisms pair up and have one baby (genes and brains mixed, see `crossoverBrains` for why hidden units come from one parent), each paying half the energy.
- Saving: `Simulation.save()` and `Simulation.load()` (snapshot.ts) round-trip the whole world exactly. A guard test in `snapshot.test.ts` fails if you add a field to `Simulation` without either saving it or listing it as scratch space; do one or the other.
- Scarce food is shared by claim (see `contestStrength` in the config), which makes the result independent of the order organisms are processed in.
- In the browser the sim runs in a Web Worker and the UI stays on the main thread.
- Keep a fast-forward mode that skips rendering. Profile before optimizing.
- Hosting is static (GitHub Pages). The viewer reads `VITE_BASE` so it works under `/<repo-name>/`.
