# Devlog 12: Sex in the grand world

*Phase 8d. Sex spread in simple worlds (devlog 11) but faded in the grand world. A long hunt, mostly by measurement and switching things off, found two flaws of mine and one real interaction. Sex now holds its ground in the grand world, but it does not take over.*

## How the hunt went

I started with five guesses: too few compatible mates, a clean start giving sex nothing to fix, too few mate-seekers, a thin population, and interference from brains, parasites or colonies. Instead of fixing them all at once, I measured first.

**Measuring what is different** (3 worlds each, 60,000 ticks):

| | Lab world (sex spreads) | Grand world |
|---|---|---|
| Harmful mutations per animal (of 24 possible) | 3 to 4 | 19 to 21 |
| Mate-seekers that die before mating | 3% | 28 to 59% |
| Animals within mating range | 1.6 to 2.2 | 0.3 to 0.65 |
| Neighbors genetically compatible | 100% | 82 to 100% (not the problem) |

That pointed at two things. Seekers die while waiting, and harmful mutations pile up almost to the ceiling.

**Fixes for waiting** (both optional settings):
- **Facultative sex** (`sexWaitLimit`). A seeker that waits too long splits in two instead, as aphids and water fleas do.
- **Easier mates** (`mateReadyFraction`). Any well-fed neighbor can contribute its half, not only one that is ready to reproduce on its own.
- Together these cut waiting deaths from 40% to about 8% and raised the population. Sex still declined.

**Guesses that turned out wrong**, each tested with one group switched off:
- **Food sharing shielding loaded animals.** Wrong: without sharing, sex did worse (0.08 against 0.27).
- **Brains costing sex by mixing two brains.** Wrong: in a lab world, brains helped sex (0.80 against 0.61).
- **Outbreeding depression** (mixing breaks local adaptations). Mostly wrong: a uniform world did worse (0.10).
- **Fertility-lowering mutations.** These are realistic and kept as an option (`mutationLoadFertility`), but they didn't help.

**Measuring selection itself.** In the lab world each extra harmful mutation cost an animal 35 to 41% of its offspring. In the grand world it cost 11 to 13%. Other things decide more of who breeds there.

**Adding grand-world features to the lab one group at a time** found the real flaw. Every group that broke sex (climate, plant kinds, life history, social traits) pushed the load to 17 to 20 of the 24 possible bad spots. My first harmful-mutation model had only 24 spots, plus a small chance that a bad spot mends itself. When selection is weak, the load climbs to that ceiling. At the ceiling every animal is nearly fully loaded, so mixing has nothing clean to recombine, and sex loses its point. Real genomes have thousands of places where harm can occur, and mending is very rare.

**The textbook model** (`mutationLoadModel: 1`, Muller's ratchet as biologists model it) fixes this:
- unlimited places for harm, and no mending;
- each parent passes each of its harmful mutations to a sexual baby with a 50/50 chance;
- a baby that splits off keeps all of its parent's.

With it, every single group added to the lab world lets sex hold or rise. Climate, terrain and catastrophes went from 0.11 to 0.57. Plant kinds went from 0.10 to 0.44, life history from 0.15 to 0.47, and social traits from 0.20 to 0.35.

I had also lowered the mutation rate as a "fix". That was a mistake: it shrinks the very problem sex solves, and in the lab world sex fell to 0.28 with it.

**The full grand world still lost sex**, even with more food. Removing groups one at a time with the textbook model:

| Removed | Mate-seeking gene (start to end) |
|---|---|
| Nothing | 0.42 to 0.27 |
| Life history | 0.34 to 0.34 (holds) |
| Social traits | 0.40 to 0.39 (holds) |
| Colonies | 0.44 to 0.35 |
| Brains, disease, environment, plant kinds, luck | still falls |

Narrowing within those groups, only removing **fat** made sex rise. A 10-world check confirmed it moderately:

| | Mate-seeking gene (± standard error) | Worlds where it rose |
|---|---|---|
| Full | 0.41 to 0.23 ± 0.04 | 2 of 10 |
| Without fat | 0.35 to 0.36 ± 0.07 | 5 of 10 |
| Fat banked only near the top | 0.36 to 0.15 ± 0.03 | 0 of 10 |

My first explanation for this was wrong. Fat is not interfering with mate eligibility, because banking only near the top was even worse. The likelier reason is that banking surplus slows how fast animals reach readiness to breed, which slows the turnover that lets mixing beat harmful mutations. Fat never evolves on its own anyway, so the grand world now leaves it out.

## New optional settings

- `sexFounderSpread`: starting variety for the mate-seeking gene alone.
- `mutationLoadStart`: founders start with existing harmful mutations.
- `sexWaitLimit`: facultative sex.
- `mateReadyFraction`: easier mates.
- `mutationLoadSynergy`: each bad spot hurts more than the last.
- `mutationLoadFertility`: harmful mutations raise the energy needed to reproduce.
- `mutationLoadModel: 1`: the textbook ratchet.

All are tested for determinism, energy conservation and save and load.

## Where sex stands

In the grand world, with the textbook model, food at 1.5 times standard, facultative sex, easier mates and no fat, sex holds its ground. About 28% of births have two parents, and the mate-seeking gene rises in half of worlds and falls in the other half. It does not take over within 100,000 ticks. A longer run is below.

## Lessons

- **Measure before fixing.** Three of my explanations were plausible and wrong. Following individual mate-seekers, and counting offspring against load, found what guessing didn't.
- **Model ceilings matter.** A 24-spot genome was a convenient simplification that quietly made sex pointless whenever selection was weak.
- **Lowering a problem's size can remove the reason for its solution.**
