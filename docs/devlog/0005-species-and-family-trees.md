# Devlog 5: Species and family trees

*Phase 5. Life now has a history you can read. Sex turned out to be a very different world.*

![Family tree of one run: green branches are plant eaters, orange and red are meat eaters, red crosses mark extinctions](../media/family-tree.png)

*Seed 4 over 406,000 ticks: 27 species so far, 3 alive. The long green branch at the top is the plant eaters. Meat-eater branches appear around tick 30,000 and keep splitting off short-lived offshoots.*

## What was built

- **Lineage and species tracking.** Every organism records its parent (and, with sexual reproduction, both). Every 50 ticks each organism checks whether it is still close enough, genetically, to the center of its species. If not, it joins a nearby species or starts a candidate, and a candidate only becomes a real species after keeping at least 10 members for 2,000 ticks (otherwise it was noise and its members are folded back in). Centers follow their members, so a whole population drifting together is not a new species but a group pulling away is. Distance ignores the color marker and the mutation rate. It never changes what happens in the world (no random numbers, left out of the world fingerprint), so all earlier worlds play out bit for bit as before.
- **Family tree view.** Time runs left to right, every species gets a row, thickness is how many members it has, color is its average diet, a thin line joins a branch to its parent, and a red cross marks an extinction. Click a branch to see how its traits differ from its ancestor's at the moment it split, and how its members live (share of their food that was meat, kills per 1,000 ticks lived, average age).
- **Event timeline.** New species, extinctions, population crashes (a drop of 40% or more from the recent high) and the notable firsts, newest first.
- **Save and load.** A world saves to a `.evosnap` file and loads back to carry on exactly as if it had never stopped. It can also branch: load it with a different seed for the same moment but a different random future. The viewer has Save and Load buttons, and the runner has `--save`, `--load` and `--branch-seed`. A guard test fails if a future change adds something to the world without either saving it or listing it as scratch space.
- **Sexual reproduction (a switch, off by default).** Two organisms that are both ready to reproduce, close together and genetically compatible pair up and have one baby. Each gene is taken from one parent or the other and then mutated. Brains are mixed too: in the evolvable layout the hidden thinking units are not numbered consistently between lineages, so the baby takes all of them from one parent and mixes only the direct sense-to-action connections. Each parent pays half the usual energy. A ready organism with no partner waits. An option makes organisms pick the most genetically similar mate instead of the nearest.
- **Rare large mutations (a switch, off by default).** With a set chance per birth, a few genes change by a lot at once. No templates: selection decides.
- **Runner:** species columns in the CSVs and the seed summary, and a species line in the sweep report.
- **Presets:** Sexual reproduction, Rare big mutations.
- **Tests:** 285 pass. Saving and reloading is tested byte for byte in plain worlds, brain worlds with everything switched on, and sexual worlds. Across the command line, a world run for 3,000 ticks, saved, loaded and run for 2,000 more is identical to a straight 5,000-tick run.

## What emerged

- **Real branching and extinctions in every seed.** 12 seeds, 1,000,000 ticks each: all 12 survived and all 12 grew a family tree, with 23 to 50 species over the run (35.5 on average) and 3 to 4 alive at the end. Three stable groups show up every time (plant eaters, mixed feeders, meat eaters), plus a stream of short-lived offshoots, most of them meat eaters splitting from an established meat-eater branch.
- **Choosing the species threshold took evidence.** With a genetic distance of 0.08 to 0.12 a world made 100 to 320 "species" per 300,000 ticks, mostly lasting a few thousand ticks (too busy to be a tree). At 0.3 it made only 4 to 6 (just the three groups). 0.2 with a 2,000-tick probation gives 13 to 17 per 300,000 ticks, a readable tree with the three main groups.
- **Rare big mutations make the tree branch about three times as much.** 600,000 ticks, 3 seeds: 50 to 70 species with 1 baby in 50 given a big jump, against 22 to 28 without.
- **Sex builds a very different world.** In sexual worlds the population is about 1,500 to 2,300 (against about 400 with predators) in a single species of plant eaters, and no meat eaters appeared in any of about 30 sexual runs of 300,000 to 600,000 ticks (several mating settings gave identical worlds because the compatibility rule never actually bit), where all 12 asexual worlds grew a carnivore lineage with a median at tick 30,750 (never later than 106,050). So in this model, sex does not speed the arrival of predators, it prevents it, at least for very long stretches. Loosening the mating rules (compatible at a genetic distance of up to 0.4 or anyone, mating range of 6, 12 or 25, preferring similar mates) did not change this.

## What broke, or only partly worked

- **Why no predators with sex is a guess.** My best explanation is that mixing genes breaks up the combination of several genes (diet, attack, and so on) that a meat-eating lineage needs, every generation. I have not tested it.
- **Rare big mutations plus sex collapses the world.** In all 6 sexual worlds with 0.5% or 2% rare big mutations, the population fell to a single organism. The trace shows plant eaters evolving to kill each other (body size near 3.7, attack above 0.5), the population shrinking to about 30, and then the survivors failing to find mates. Organisms do not recognize relatives, so nothing stops this. Kin recognition is planned for Phase 7. Two of four worlds with the longest mating range and similar-mate preference ended in the same state, with about 200 organisms.
- **Fussy mating can extinguish a population.** With a compatibility distance of 0.15, one of three sexual worlds died out around tick 108,000, when too few compatible mates were left.
- **Mating needs company.** A ready organism with no partner nearby just waits, so sparse worlds struggle. The big-world presets from Phase 4 would be hard on a sexual population.
- **Brains are not part of species distance yet.** Two organisms with identical genes but very different brains count as the same species.
- **A sexual baby's species starts as its first parent's.** The next check corrects it if its genes put it somewhere else.
- **Small things caught on the way:** a clicking bug in the tree (an off-by-one that selected the row below), a timeline label that ran into its text, and a runner table that shows the stamina gene as a constant when it is switched off.
- **Roadmap boxes:** all of Phase 5's boxes are met except the release itself, which waits for the owner's go-ahead.

## Next

Phase 6, a dynamic world: terrain, seasons, climate and barriers. Barriers are the natural fix for the sex finding, because mountains and water separate populations so lineages can diverge (and rare mutants find mates among their own). Carried over: the parked chase question from Phase 4, lifestyle clustering across species (the per-species lifestyle summaries are the first step), kin recognition (Phase 7) for the mutual-killing state, and mate choice by a visible marker such as the color gene.
