# Evolution Sim Project

A browser-based artificial-life simulation where simple organisms evolve in a dynamic, changing world.

Nobody is told to be a predator, a herbivore or a scavenger. Those roles, along with arms races, speciation and eventually multicellular life, **emerge** from random mutation plus one universal rule: everything costs energy.

> **Status:** Phase 0 (foundations). The project skeleton, tooling and tests are in place. The simulation itself starts in Phase 1.

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
| `tests/` | Repo-wide guardrail tests |
| `docs/devlog` | One entry per development phase |

## Getting started

Requires Node.js 20 or newer.

```bash
npm install
npm test            # run all tests
npm run dev         # start the viewer at http://localhost:5173
npm run sim -- --seed 42   # headless runner (placeholder until Phase 1)
```

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
