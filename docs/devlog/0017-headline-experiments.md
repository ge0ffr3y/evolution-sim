# Devlog 17: Headline experiments

*Phase 9, part 2. With the grand world audited, five questions it can now answer, each on 16 fresh seeds with a chart and a written conclusion. The cloud time cost about $6, and about 300 worlds were run. A new analysis page in the viewer shows every result. Full write-up: `docs/findings/phase-9-headline-experiments.md`.*

![Poorer plant food along a gradient (16 worlds each, 1,000,000 ticks): feeding levels and mixed eaters rise until a plant quality of 1, while species and population keep falling.](../media/plant-quality-gradient.svg)

## What was built

- **An analysis page** in the viewer ("Experiment results"). Pick an experiment and a measure to see:
  - every world as a dot, each setup's average with its 95% range, and the change against the control, compared seed by seed;
  - any measure over time, as each setup's average, optionally with its lowest and highest world;
  - a button to save either chart as an image.
- **`npm run exp -- export`** makes the small file the page reads (about 150 KB per experiment; the raw results stay on the laptop and in the cloud).
- **New measures:** how much of the population the biggest species holds, how different separate land masses become, and when mixed eaters first appear and how long they last.
- **The runner reads the account's core limit from AWS** and plans within what running machines leave free. It also counts a running machine's worst-case cost before starting another.

## What we learned

1. **Sex does not speed up new feeding levels, and it stops them from lasting.** Without sex, mixed eaters form a steady second feeding level 76% of the time. When every animal must mate, they last 5% of the time, because mating blends a would-be meat eater's genes back into the plant-eating majority. But obligate sex gives 2.4 times as many species: needing a genetically close mate splits the population into separate breeding groups.
2. **An ice age has no lasting effect on diversity unless it is severe.** Mild and moderate ice ages cut the population by a quarter to a half, then the world fully recovers. A severe one (twice today's cooling) killed 7 of 16 worlds, and the survivors had about 20% fewer species.
3. **Disease does not stop one species from taking over.** The biggest species holds about half the animals with or without disease. But disease supports the mixed eaters (70% fewer without it), probably through the carcasses it leaves. Against the Red Queen idea, disease lowers sex.
4. **Barriers make the world more varied, once they really separate the land.** Simply adding more sea made lakes and bays, not continents, so the first attempt tested nothing. Two water channels cutting the world in half worked:
   - the halves drifted apart;
   - the biggest species fell from 46% to 36% of the animals;
   - diversity rose by a fifth.
5. **Poorer plant food lengthens the food chain, then costs species.** Lowering plant quality from 2 to 1.5 adds most of a feeding level and doubles the mixed eaters, with no loss of species. Lower than that, there is no further gain, but species fall by up to half. The limiting factor shifts from energy to nutrient: plants go uneaten, and animals turn to meat for its nutrient. They also evolve to live fast, armed and short.

## What broke, or misled

- **The first barrier experiment tested nothing.** No sea level split the land, so the follow-up used channels instead. Lesson: check that a setting does what the question assumes before spending a full run on it.
- **AWS's spend figure lags by about a day.** The runner's own count is the one to trust.
- **The core-limit increase was requested for spot machines,** which we do not use. A request for on-demand machines is pending with AWS.
- **One ice-age world reached the hard stop** and was finished on a tiny machine for about a cent. The stop-and-resume design worked as intended.

## Still open

- **No lasting meat-eating group, in any experiment.** Even after a million ticks on the poorest plants, animals with a diet above 0.5 stay under 1%. Every pressure tested so far pushes the whole population toward mixed eating, not toward a separate hunting species.
- The sex gene sits low, yet 35 to 45% of births have two parents.
- Switching off kin restraint cuts hunting by three quarters.

## Next

Find out why pure meat eaters do not take hold, starting with the code that sets what meat is worth and what hunting costs.
