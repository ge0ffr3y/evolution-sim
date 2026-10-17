# Evolution Sim Project: rules for the AI coding agent

A browser-based artificial-life simulation. Simple organisms evolve in a changing world. Roles like predator, herbivore and scavenger **emerge** from mutation plus one rule: everything costs energy. It is not a game and not visually polished: clarity and data matter more than looks.

The owner does not write code. Changes must be explainable in plain English and checkable by watching the sim and its graphs.

Planning notes live in the owner's Obsidian vault: `Projects/Evolution Sim Project/` (`01 - Overview`, `02 - Roadmap`). The roadmap defines the phases and each phase's "Done when" criteria.

## Hard rules

1. `packages/sim-core` must never use browser APIs (no `window`, `document`, DOM, canvas) or Node-only imports. It must run unchanged in a browser, a Web Worker and Node.
2. Never use `Math.random()`, `Date.now()`, `new Date()` or `performance.now()` in simulation logic. All randomness comes from the seeded `Rng` in `sim-core`.
3. The simulation advances in fixed **ticks**, never real time. Rendering speed must never change simulation results.
4. All tuning numbers (costs, rates, thresholds, caps) live in a single config object. No magic numbers in logic.
5. Same seed + same config must give exactly the same history. Do not iterate over unordered structures in a way that changes results, and do not depend on timing.
6. Energy is the universal currency. Every trait costs energy, and every energy gain or loss goes through the energy ledger once it exists. Never create or destroy energy outside defined sources and sinks.
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
- Write a devlog entry in `docs/devlog/` at the end of each phase: what was built, what emerged, what broke, one image.
- Never push, publish or deploy without the owner's go-ahead.

## Layout

```
packages/sim-core/   the simulation: pure logic, no UI, no browser or Node APIs
apps/viewer/         browser app: world view, charts, inspector (Vite + TypeScript)
apps/runner/         Node CLI for headless batch experiments (tsx)
tests/               repo-wide guardrail tests (e.g. forbidden APIs in sim-core)
experiments/         experiment configs and saved results
docs/devlog/         one entry per phase
```

## Commands

```
npm install        install everything
npm test           run all tests (vitest)
npm run typecheck  type-check every workspace
npm run dev        start the viewer locally
npm run build      production build of the viewer
npm run sim -- --seed 42   run the headless runner
```

## Tech notes

- TypeScript everywhere, npm workspaces. `sim-core` is consumed as TypeScript source (no build step).
- Simulation data uses typed arrays (struct-of-arrays) for speed; spatial queries use a spatial hash grid.
- In the browser the sim runs in a Web Worker and the UI stays on the main thread.
- Keep a fast-forward mode that skips rendering. Profile before optimizing.
- Hosting is static (GitHub Pages). The viewer reads `VITE_BASE` so it works under `/<repo-name>/`.
