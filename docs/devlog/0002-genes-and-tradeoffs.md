# Devlog 2: Genes and trade-offs

*Phase 2. Every trait now has a price, and two different ways of life share one world.*

## What was built

- **A genome.** Each organism carries six genes, each a number from 0 to 1: size, speed, sense range, metabolism, color, and mutation rate. A gene is stretched across its trait's allowed range (set in the config) to get the real trait. Children copy their parent's genes with small random changes, and the mutation rate is itself a gene that can evolve.
- **A cost model.** Upkeep per tick scales with metabolism x size^0.75 (Kleiber's law), movement with size x speed x speed, and sensing with sense range. A bigger body also needs more energy to reproduce. Each organism's costs are worked out once, at birth, so the main loop is mostly simple arithmetic: the simulation got a little *faster* despite doing more (about 7 million organism-ticks per second; a million ticks of the default world takes about 4 minutes).
- **An energy ledger and a strict conservation test.** Every energy flow is recorded: food eaten, plants regrowing (the sun's contribution), and energy burned on upkeep, movement and sensing. The test checks that energy inside organisms plus food on the ground equals the starting amount plus sunshine minus everything burned, to better than one part in a billion, across thousands of ticks of births and deaths, with every feature switched on.
- **Food sensing.** An organism with a sense range looks in eight directions and leans toward richer food. This is a deliberate, temporary stand-in for senses and brains (Phase 4), added so the sense gene has a real job to do instead of being a pure cost that evolves to zero.
- **Contest feeding and uneven land.** When a cell has less food than its occupants want, the food is split by claim, and a dial (`contestStrength`) controls how winner-take-all that is. The land has rich and barren patches, generated from the seed.
- **Viewer upgrades.** Click any organism to inspect it (genes, traits, energy, age, parent, per-tick costs; it keeps following that organism and shows its last state if it dies). Color the dots by speed, size, color gene, energy or sense range. An energy-flow bar shows where the energy is going right now. A heatmap shows how any trait's distribution changes over time. A world menu loads preset worlds.
- **Runner upgrades.** `--config` loads a preset world; trait histograms are written alongside the stats; `--seeds 1-12` runs many seeds in parallel and prints how much they differ from one another; `npm run bench` measures speed.
- **Presets** in `configs/`: Default, Costly movement, Cheap movement, Scarce food, and Flat and fair (a control world with no niches).

## What emerged

**1. With plain costs, evolution picks one answer: the cheapest body.** My first version shrank everyone to the minimum size, in every seed, however I split the food. A test with fixed-size populations showed why: a big population leaves food standing uneaten, which is a bonanza for any small mutant that wanders in. Before long every setting I tried converged on one strategy, however I tuned the costs, and the early differences between seeds turned out to be timing differences on a shared path, not different destinations.

**2. Contest feeding makes two ways of life coexist.** Once bigger eaters win crowded cells (and small ones do best where it is not crowded), the size and speed histograms split into two bands: **big and slow** (speed about 0.18) and **small and faster** (speed about 0.5). In all 8 seeds run for 120,000 ticks, roughly half the population (47-65%) ends up in the big, slow group.

**3. The same world under different costs evolves predictably.** Movement cost 5x higher: mean speed falls to about a quarter of normal in every seed (0.20-0.32 against about 1.0) and organisms lean on sensing instead (sense range 1.9 against 0.4), so they sniff out food rather than roam for it. Nobody programmed that trade. Movement 5x cheaper: speed stays high (about 1.2 at 40,000 ticks against 0.6 for the default). A regression test locks this in.

**4. Sensing earns its keep.** With strong enough steering, sense range evolves to about 0.9 on average, with a wide spread between seeds, instead of vanishing.

## What broke, or only partly worked

- **"Different seeds settle on different strategies" is only partly true.** Seeds do diverge, sometimes dramatically: at tick 45,000 the big-and-slow share ranges from 23% to 46% across seeds, and in an earlier variant one seed was 99% big-bodied for tens of thousands of ticks. But by 120,000 ticks every seed has drifted to the same stable mix (spread of just 0.05 in the big share). So each population settles on *two* strategies side by side, and seeds differ for a long time on the way, but they do not end up in different places. I tried several ways of making the outcome seed-dependent for good (landscape patchiness, movement cost, sensing strength, sharper contest rules) and none did; it probably needs more niches, which Phase 3's meat and plant diets will add. Left unticked in the roadmap for an owner decision.
- **Size is still a race to the bottom for part of the population.** The small group sits at the minimum size. That is a genuine result of the economics, not a bug.
- **Mean metabolism barely moves** (about 0.9-1.0 across settings): under scarcity, a faster metabolism eats more but also burns more, nearly cancelling out.
- Debugging slips, caught quickly: a shell quirk (zsh does not split a variable into words) made a whole batch of test runs fail instantly with "NaN"; the viewer looked like it ran at 5 frames per second until I realized the browser pane was hidden, which throttles animation (the actual drawing work was under a millisecond per frame); and old browser tabs from earlier phases were quietly running simulations and competing for CPU.

## Next

Phase 3: diet and attack genes, corpses, and a closed nutrient loop, so predators, herbivores and scavengers can appear on their own. The extra niches there are also the best bet for making different seeds end up in genuinely different places.
