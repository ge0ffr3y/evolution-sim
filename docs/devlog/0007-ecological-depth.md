# Devlog 7: Ecological depth

*Phase 7. Bodies wear out, parents choose between many cheap babies and few fed ones, pathogens hunt the common genotype, colors become disguises and signals, and kin recognition fixes one problem by creating a bigger one.*

## What was built

Every feature is a switch, off in the standard world, so every earlier world plays out exactly as before (the brains-off golden fingerprints did not change).

- **Aging and a lifespan gene (the 12th gene).** Past its prime (half its lifespan) an organism pays extra upkeep that rises with the square of how far past it is, and a longer lifespan costs upkeep all the time, the price of keeping a body in repair. Both count as upkeep in the energy ledger.
- **Litter size (the 13th gene).** A gene sets how many babies one birth makes. The parent hands over the same total energy as before, split between the babies, so a big litter means many babies each starting with little, and a baby that cannot afford its own body is not born. That is the many-cheap-babies against few-well-fed trade-off.
- **Kin recognition.** With a kin distance set, nobody attacks a genetically close relative.
- **The selfish herd.** Prey with relatives close by are harder to kill (up to a cap).
- **New brain senses.** Brains can sense how many relatives are near, which way they lie, whether it is too hot or cold for comfort (the temperature gene from Phase 6) and whether there is water ahead (the terrain from Phase 6). Adding them changed the brain layout, so the brain-world reference results were re-recorded and the biggest brain grew from 320 to 384 connections.
- **Disease.** A pathogen spreads by contact. Each strain targets a particular set of genes, and organisms that resemble the target catch it easily, so a population where everyone looks alike is wide open to an epidemic and a varied one is not. Sick organisms pay extra upkeep and are then immune for a while. Strains drift toward the genes of whoever they infect, and new ones arrive from outside now and then. Strains are saved with the world.
- **Signals and camouflage.** A smooth background color covers the world. An organism whose color gene matches the background where it stands is hard to notice, for hunters and for brains. Noticing is a fixed function of the pair and a short "glance" period, so a hidden animal stays hidden for a while and no random numbers are used. Hunters learn: after a kill they remember the color of their meal and are better at spotting it. The color gene can also be used as a mating signal (prefer the mate whose color is closest).
- **Viewer:** a Health color mode and a sick/strains readout, a Background color map layer, and the inspector shows sickness, immunity, lifespan and litter size.
- **Presets:** Aging, Litter size, Life history, Kin recognition and herds, Sexual reproduction with kin recognition, Disease, Camouflage and search images, Sexual reproduction with color choice.
- **Tests:** 395 pass, including determinism, energy and matter conservation, and save and reload for each feature.

## What emerged

Each feature on against off, 8 worlds each, 200,000 ticks, averaged over the second half:

| Feature | What changed |
|---|---|
| **Litter size** | The litter gene rose from 1.5 to 2.25 babies on average and the population more than doubled (1,037 against 488). |
| **Disease** | About a fifth of the population is sick at any time. Plant eaters keep **34% more genetic variety** (0.047 against 0.035): higher in 7 of 8 matched worlds and equal in the eighth. |
| **Camouflage** | Plant eaters' color mismatch with the background fell from 0.46 to 0.34 (lower in 8 of 8 worlds; random colors would give 0.5). When hunters also learn, colors within a patch stay more varied (0.081 against 0.051). |
| **Aging** | In a world without predators, where animals can live long enough to grow old, the average age fell from 7,485 to 2,800 ticks and the oldest from 50,922 to 9,552 (down 63% and 81%), and the population was 9% smaller. |
| **Kin recognition and herds** | Plant eaters have about three times as many relatives close by (3.6 against 1.2). See below for the price. |
| **Kin recognition in sexual worlds** | With rare big mutations, 3 of 4 sexual worlds collapsed to a single organism without it and 0 of 4 did with it. |

## What broke, or only partly worked

- **Kin recognition suppresses predators.** With it, meat eaters rarely get started: at a kin distance of 0.2 the kill rate fell from about 3,500 to 0.3 per 1,000 ticks (no predators in 8 of 8 worlds), and at 0.05 or 0.1 most worlds (5 to 7 of 8) had almost no kills. The reason is that the first meat eaters are still close relatives of their prey. So it fixes the sexual-world collapse but stops the food web forming. The presets use small distances (0.05 and 0.1), and the herd benefit has not been tested against real predators.
- **Aging barely shows in the standard world.** Predators kill animals at an average age of about 140 ticks, long before a lifespan of thousands of ticks matters, so the lifespan gene just drifts down (to about 5,260 from 8,000). Aging shows clearly only where animals can live a long time.
- **Early disease is brutal.** In the crowded, uniform early phase nearly everyone is sick at once (about 1,000 of 1,100 in one world at tick 9,000), then it settles to about a fifth. The first disease calibration, with a wide pathogen target (0.15), did nothing for diversity: every plant eater looked alike to it. A narrow target (0.03 to 0.06) was needed.
- **I did not check whether evolved brains use the new senses** (relatives, comfort, water). They are available and tested, but whether evolution wires them up is untested.
- **Symbiosis (the stretch item) was not built.**

## Next

Phase 8, multicellularity: bonded colonies, cell types, body plans. Carried over: the parked chase question from Phase 4 (the new relatives sense might matter for pack hunting), predators versus kin recognition, and whether evolved brains use the new senses.
