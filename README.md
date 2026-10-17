# Evolution Sim Project

A browser-based artificial-life simulation where simple organisms evolve in a dynamic, changing world.

Nobody is told to be a predator, a herbivore or a scavenger. Those roles, along with arms races, speciation and eventually multicellular life, **emerge** from random mutation plus one universal rule: everything costs energy.

**Live demo:** https://ge0ffr3y.github.io/evolution-sim/

> **Status:** Phase 2 (genome and trade-offs) in progress. Organisms now carry a six-gene genome (size, speed, sense range, metabolism, color, mutation rate), every trait costs energy, and an energy ledger tracks where it all goes. Click any organism in the viewer to inspect it.

## Goals

- **Watch adaptation happen**: the emergent behavior and the data matter more than the graphics.
- **Observable**: population graphs, trait histories, phylogenetic trees and an organism inspector.
- **Rigorous**: seeded, deterministic runs, so results can be replayed, compared and turned into experiments.
- **Shareable**: runs in the browser with zero install.

## Design principles

1. Emergence over hard-coding. There is no `Predator` class.
2. Energy is the universal currency, so every trait has a cost and no trait is free.
3. Eating is physics, not a role.
4. The nutrient loop is closed (sun, plants, animals, corpses, soil, plants).
5. Determinism: the same seed and config always give the same history.
6. Observability first.

## Repo layout

| Path | What it is |
|---|---|
| `packages/sim-core` | The simulation: pure TypeScript, no UI, no browser APIs |
| `apps/viewer` | Browser app: world view, charts, inspector |
| `apps/runner` | Node CLI for headless batch experiments |
| `configs/` | Preset worlds (JSON) |
| `tests/` | Repo-wide guardrail tests |
| `docs/devlog` | One entry per development phase |

## Getting started

Requires Node.js 20 or newer.

```bash
npm install
npm test            # run all tests (about 40 seconds)
npm run dev         # start the viewer at http://localhost:5173 (add ?seed=7 and ?preset=costly-movement)
npm run sim -- --seed 42 --ticks 100000   # one headless run -> experiments/results/seed-42.csv (+ trait histograms)
npm run sim -- --seeds 1-12 --ticks 50000 # many seeds in parallel, then compare how they differ
npm run bench       # how fast is the simulation?
```

The headless runner also accepts `--config configs/<preset>.json` to run a named world, `--set name=value` to override any number in the config (for example `--set moveCostCoeff=0.05`), `--every N` (stats interval) and `--hist-every N` (histogram interval). Run `npm run sim -- --help` for details.

Preset worlds live in [`configs/`](configs). Each is a short JSON file naming the settings it changes, so the same world can be run under different costs and compared.

## Roadmap

| # | Phase | Outcome |
|---|---|---|
| 0 | Foundations | Repo, tooling, live placeholder page |
| 1 | Minimal living world | Organisms eat, reproduce, mutate, die |
| 2 | Genome and trade-offs | Real energy economics, diverging traits |
| 3 | Food webs | Emergent predators, nutrient loop (v0.1) |
| 4 | Senses and brains | Hunting and fleeing evolve |
| 5 | Species and phylogeny | Speciation tracking, family tree (v0.2) |
| 6 | Dynamic world | Biomes, seasons, climate, catastrophes |
| 7 | Ecological depth | Disease, aging, social behavior (v0.3) |
| 8 | Multicellularity | Colonies, cell types, body plans (v0.4) |
| 9 | Experiments at scale | Parameter sweeps and findings |
| 10 | Ship it | Portfolio page and write-ups (v1.0) |

## License

MIT, see [LICENSE](LICENSE).
