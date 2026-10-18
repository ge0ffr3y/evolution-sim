# Evolution Sim Project

A browser-based artificial-life simulation where simple organisms evolve in a dynamic, changing world.

Nobody is told to be a predator, a herbivore or a scavenger. Those roles, along with arms races, speciation and eventually multicellular life, **emerge** from random mutation plus one universal rule: everything costs energy.

**Live demo:** https://ge0ffr3y.github.io/evolution-sim/

![A time-lapse of one run: green plant eaters, then red meat eaters appear and a food web forms](docs/media/food-web.gif)

*Seed 12 over 60,000 ticks. Everyone starts as a green, unarmed plant eater. The first kill happens at tick 60, the first scavenger at 566, and by tick 8,690 a lineage lives mostly on meat (red). Larger dots are larger bodies.*

> **Status: v0.2 (Phase 5, species and family trees) plus Phase 6 (a dynamic world), on top of Phase 4 (senses and brains) and the v0.1 food webs.** Predators, plant eaters and scavengers emerge on their own, from nothing but mutation and the rule that everything costs energy. In 12 of 12 seeds a lineage that lives mostly on meat evolves, and all 12 ecosystems were still going after 1,000,000 ticks. Phase 4 adds evolvable neural-network brains: prey evolve to run from threats, and meat eaters evolve to ambush. Chasing has not evolved yet (see the [Phase 4 devlog](docs/devlog/0004-senses-and-brains.md) for why). Phase 5 adds a family tree of species, saving and loading worlds, and sexual reproduction. Phase 6 adds terrain, climate, seasons and catastrophes (all optional, see the presets).

![A family tree: green branches are plant eaters, orange and red are meat eaters, red crosses mark extinctions](docs/media/family-tree.png)

*Seed 4 over 406,000 ticks: 27 species so far, 3 alive. Time runs left to right, a branch's thickness is its number of members, and a thin line joins a branch to the species it split from.*

## What happens in a run

Every organism starts as the same unarmed plant eater. Nobody is told to hunt. The simulation has:

- **Genes** for size, speed, sense range, metabolism, mutation rate, a color marker, **diet**, **attack**, **armor**, **stamina** (a sprint reserve, used when brains and sprint fatigue are on) and a **preferred temperature** (used in worlds with a climate). Every trait costs energy every tick, so no trait is free.
- **Brains (optional).** Switch on evolvable neural networks that see, smell and feel (including their own diet and stamina), and decide how to turn, how fast to move and whether to attack. Brains cost energy per thinking unit and connection. Brains off is the control world.
- **A closed loop.** Sunlight and soil nutrients grow plants. Organisms eat plants (or each other), and eating, dying and rotting return matter to the soil as detritus, which turns back into nutrients. Newborns are built from nutrients in the soil they are born on, so soil limits the population.
- **Two ledgers, both checked by tests.** Energy flows one way (sun, plants, eaters, heat) and the books balance to better than one part in a billion. Matter goes round in a circle and none is ever created or destroyed.
- **Predation as physics.** An armed organism picks the nearest prey in reach that is not too big for it. The odds depend on its attack and size against the prey's armor and size. A kill leaves a corpse that anyone with a meat appetite can eat, so scavengers and hunters share a food supply.

What emerged (details in the [devlog](docs/devlog)):

1. Killing started within the first 50 ticks, and scavenging within a few hundred.
2. A lineage that survives mostly on meat appeared in **12 of 12 seeds** (median tick 29,000).
3. After the first predators arrive, plant eaters crash, then a stable predator and prey system settles in: about 230 plant eaters and 90 meat eaters, with carnivore numbers swinging in irregular waves.
4. Prey answer with armor and speed, and the arms race never ends.
5. A family tree grows: over 1,000,000 ticks every one of 12 seeds made 23 to 50 species (3 to 4 alive at the end), with a stream of short-lived offshoots from three lasting groups.
6. In a dynamic world, populations separated by water drift apart (nine times as far as without the barrier, and each continent grows its own species), an ice age halves the population and leaves survivors that prefer the cold, and the population swells and shrinks with the seasons.
7. With brains on, prey evolve to turn away from threats (about 0.68 of the time, against 0.52 for the no-brain control), and meat eaters evolve to ambush: they slow down and let prey walk into reach. They do not chase. In sparse worlds the meat eaters repeatedly crash and re-evolve, which wipes out any chasing wiring.

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
| `apps/viewer` | Browser app: world view, charts, inspector, event log |
| `apps/runner` | Node CLI for headless batch experiments, seed sweeps and GIF rendering |
| `configs/` | Preset worlds (JSON) |
| `tests/` | Repo-wide guardrail tests |
| `docs/devlog` | One entry per development phase |
| `docs/media` | Images for this README |

## Getting started

Requires Node.js 20 or newer.

```bash
npm install
npm test            # run all tests (about a minute)
npm run dev         # start the viewer at http://localhost:5173 (add ?seed=7 and ?preset=boom-and-bust)
npm run sim -- --seed 42 --ticks 100000   # one headless run -> experiments/results/seed-42.csv (+ trait histograms)
npm run sim -- --seeds 1-12 --ticks 100000 # many seeds in parallel, then a summary of how a food web emerged
npm run gif -- --seed 12 --ticks 60000     # render a time-lapse GIF of a run (no browser needed)
npm run bench       # how fast is the simulation?
```

The headless runner also accepts `--config configs/<preset>.json` to run a named world, `--set name=value` to override any number in the config (for example `--set moveCostCoeff=0.05`), `--every N` (stats interval) and `--hist-every N` (histogram interval). Run `npm run sim -- --help` for details.

### In the viewer

Switch the map between plants, terrain, temperature and plant growth. Scroll down for the **family tree** (click a branch to see how it differs from its ancestor) and the **timeline** of new species, extinctions and population crashes. **Save world** and **Load world** store a run in a file and bring it back exactly (tick the "as a branch" box to carry on with a different random future).

Click any organism to inspect its genes, energy, age, parent, what it has eaten and how many kills it has. Color the dots by diet, speed, size, color gene, energy or sense range. Switch the map between plants, soil nutrients, corpses and detritus. Watch the energy-flow bar, the "who eats what" chart, the trait heatmaps over time, and the log of notable firsts.

### Preset worlds

Each preset is a short JSON file in [`configs/`](configs) naming the settings it changes. Pick one in the viewer or with `?preset=<name>`.

| Preset | What it shows |
|---|---|
| Default | The standard world |
| Peaceful meadow (control) | Nobody can evolve weapons: same plants, no predators |
| Boom and bust | No armor and quick digestion: carnivore numbers swing in slow waves (watch for 100,000+ ticks) |
| Arms race | Fighting is cheap, so expect carnage, heavy armor and a small survivor population |
| No armor | Prey cannot defend themselves |
| Poor soil | Nutrients, not sunlight, limit the population: many births are blocked |
| Costly movement / Cheap movement | One cost changed 5 times over: watch the speed histograms |
| Scarce food | Plants regrow at half the rate |
| Continents and seas | Terrain: water (a hard barrier), plains, forest, desert and mountains |
| Two continents | Two water channels split the world in two, to watch separated populations drift apart |
| Seasons | A climate with a 2,000-tick year: warm middle, cold edges, a population that follows the seasons |
| Climate and continents | Terrain, climate, seasons and day and night together |
| Slow climate change | Seasons plus a slow warming and cooling of the whole world |
| Climate adaptation | A preferred-temperature gene: lineages in the cold bands evolve to like the cold |
| Ice age | At tick 60,000 the world gets colder for 20,000 ticks: crash, extinctions, different survivors |
| Meteor strike | At tick 30,000 everything in a circle dies: watch the crater refill |
| Random catastrophes | Ice ages, droughts and meteors at random, listed in the timeline |
| Sexual reproduction | Pairs of ready, compatible neighbors have babies with mixed genes. Result: one species, no meat eaters (see devlog 5) |
| Rare big mutations | One baby in fifty gets a big jump in three genes: the family tree branches about three times as much |
| Brains: evolvable layout | Neural-network brains whose layout evolves: click an organism to watch it think |
| Brains: fixed layout | Every brain has the same wiring plan and only the strengths evolve |
| Brains: sparse world (chase test) | Brains plus stamina and kill ownership in a world with scarce prey: meat eaters boom and crash |
| Flat and fair | A control with no niches for plant eaters to split |

## Roadmap

| # | Phase | Outcome |
|---|---|---|
| 0 | Foundations | Repo, tooling, live placeholder page (done) |
| 1 | Minimal living world | Organisms eat, reproduce, mutate, die (done) |
| 2 | Genome and trade-offs | Real energy economics, diverging traits (done) |
| 3 | Food webs | Emergent predators, nutrient loop (**v0.1, done**) |
| 4 | Senses and brains | Prey flee and hunters ambush (done; chasing did not evolve) |
| 5 | Species and phylogeny | Species tracking, family tree, sexual reproduction, save and load (**v0.2, done**) |
| 6 | Dynamic world | Terrain, climate, seasons, catastrophes (**done**) |
| 7 | Ecological depth | Disease, aging, social behavior (v0.3) |
| 8 | Multicellularity | Colonies, cell types, body plans (v0.4) |
| 9 | Experiments at scale | Parameter sweeps and findings |
| 10 | Ship it | Portfolio page and write-ups (v1.0) |

## License

MIT, see [LICENSE](LICENSE).
