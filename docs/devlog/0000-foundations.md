# Devlog 0: Foundations

*Phase 0. No life yet, but the ground rules are in place.*

## What was built

- A monorepo with three parts: `sim-core` (the simulation brain), `viewer` (the browser app) and `runner` (a command-line tool for running many simulations without graphics).
- A **seeded random number generator** (xoshiro128**). Every random choice in the simulation will come from it, so a given seed always replays the same history. Its first outputs are checked against values worked out by hand from the algorithm.
- **Guardrail tests** that scan `sim-core` and fail if anyone uses `Math.random`, real-time clocks or browser-only features. These enforce the rules in `CLAUDE.md` automatically.
- Automated checks (tests, type checks, build) that run on every push, plus a workflow that publishes the viewer to GitHub Pages.

## What emerged

Nothing yet. That is expected. The viewer is a placeholder page, and the only "simulation" is a handful of seeded random numbers.

## What broke

Nothing broke, but one thing was caught early: the project folder had no git repo of its own, and git was quietly resolving to a repo in the home directory. A fresh repo was created before the first commit so the project history stays separate.

## Next

Phase 1: a minimal living world where dots eat, reproduce, mutate and die, and the population finds a carrying capacity.
