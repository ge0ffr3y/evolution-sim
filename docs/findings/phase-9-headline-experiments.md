# Phase 9 headline experiments: findings

The audited grand world (Phase 9 audit, devlog 16), 16 fresh seeds per setup. Each change is compared with the control seed by seed, and "holds up" means the 95% range of the change excludes no change. Explore every measure, and save charts, on the viewer's analysis page (`analysis.html`, or `npm run dev` locally).

## 1. Does sex speed up the arrival of new feeding levels?

**Experiment:** `headline-sex`, 300,000 ticks, seeds 601 to 616. Three setups: every animal splits in two (asexual); sex is a gene (today's grand world); every animal must find a mate. About 26 minutes in the cloud, about 55 cents.

**Answer: no. Sex does not speed their arrival, and it stops them from lasting. It also multiplies species.**

| | Sex as a gene (today) | Everyone splits in two | Everyone must mate |
|---|---|---|---|
| Mixed eaters (late in the run) | 11 | **52*** | **0.8*** |
| Share of time with 5 or more mixed eaters | 33% | **76%*** | **5%*** |
| Feeding levels | 1.33 | **1.76*** | **1.05*** |
| Highest diet gene ever | 0.80 | **0.91*** | 0.76 |
| Species alive | 5.3 | **3.3*** | **12.9*** |
| Population | 916 | **-16%*** | **+12%*** |
| Average age | 878 | **-44%*** | **+44%*** |

(* holds up)

- **Arrival:** mixed eaters first number 5 or more at about the same time in all three (around tick 10,000 to 28,000; no difference holds up).
- **Lasting:** without sex they become a steady second feeding level (present 76% of the time). With sex for everyone, they almost never last (5%). Sex blends a would-be meat eater's genes back into the plant-eating majority, so a split in diet cannot hold. This is the gene-mixing explanation proposed in Phase 8e (O4), now confirmed.
- **Species:** sex for everyone gives 2.4 times as many species. Mates must be genetically close (`mateDistance`), which splits the population into separate breeding groups, the textbook way new species form. Without sex, there are fewer, broader species.
- **The trade:** asexual worlds have more feeding levels but fewer species, smaller populations and lives almost half as long. Worlds where everyone must mate have more species, bigger populations and longer lives, but a single feeding level.

## 2. Does an ice age raise or lower long-term diversity?

**Experiment:** `headline-ice-age`, 600,000 ticks, seeds 501 to 516. Random catastrophes are switched off in every setup. One ice age at tick 200,000 (lasting 15,000 ticks) at three severities: today's cooling (0.3), 50% colder (0.45) and twice as cold (0.6). The control has no ice age. About 70 minutes in the cloud, about $1.45 (one world was finished on a second, tiny machine after the first reached its hard stop).

**Answer: it depends on the severity. A mild or moderate ice age leaves no lasting mark on diversity; a severe one is a mass extinction that leaves the survivors less diverse.**

| Ice age | Worlds surviving | Lowest population | Population during the ice age (before: about 980) | Species after recovery (ticks 400,000 to 600,000; control 5.3) | Shannon after (control 1.27) |
|---|---|---|---|---|---|
| Today's severity (0.3) | 16 of 16 | -34%* | 751 | 5.6 | 1.39 |
| 50% colder (0.45) | 16 of 16 | -75%* | 573 | 5.8 | 1.33 |
| Twice as cold (0.6) | **9 of 16** | -97%* | 438 | **4.2** | **1.04** |

(* holds up. Species and Shannon after recovery are averaged over the surviving worlds. Over all worlds, including those that died, the severe ice age gives species -24%* and Shannon -21%*.)

- **Mild and moderate ice ages:** the population falls by a quarter to a half, then fully recovers. Species and diversity afterwards lean slightly higher than in worlds without an ice age, but no difference holds up with 16 seeds.
- **A severe ice age:** 7 of 16 worlds died out within about 6,000 ticks of it striking. The survivors recovered their numbers but stayed less diverse, with about 20% fewer species.
- This matches the audit's cold-side cliff: the grand world copes well with moderate cold, then fails sharply.

## 3. Does disease stop one species taking over?

**Experiment:** `headline-disease`, 300,000 ticks, seeds 801 to 816. Three setups: no disease (no outbreaks either); today's disease; a disease that infects a wider range of hosts (`diseaseWidth` 0.3 against 0.15). About 46 minutes in the cloud, about 49 cents.

**Answer: no.** The biggest species holds about half of all animals with or without disease, and the number of species and diversity do not change. **But disease feeds the second feeding level, and it costs sex.**

| | Today's disease | No disease | Wider disease |
|---|---|---|---|
| Share of animals in the biggest species | 47% | 48% | 49% |
| Species alive | 4.6 | 4.9 | 4.5 |
| Shannon diversity | 1.18 | 1.23 | 1.15 |
| Mixed eaters (late in the run) | 32 | **10*** | 20 |
| Feeding levels | 1.62 | **-20%*** | -11% |
| Meat in the diet | 8.7% | **-30%*** | **-18%*** |
| Kills per 1,000 ticks | 1,070 | **-35%*** | -20% |
| Births with two parents | 33% | **43%*** | **39%*** |
| Population | 814 | **+17%*** | **+11%*** |
| Average age | 681 | **+39%*** | +21% |

(* holds up against today's disease)

- **Dominance is unaffected.** In this world, the species picture is shaped by other things: sex and mate choice (experiment 1), cold (experiment 2), plant quality (experiment 5).
- **Disease supports mixed eaters.** Without disease there are 70% fewer mixed eaters, and a third less meat and fewer kills. One likely reason, not yet tested: animals weakened or killed by disease leave carcasses, so eating some meat pays.
- **Disease lowers sex,** against the Red Queen idea that parasites favour it: two-parent births are 43% without disease and 33% with it. Its other costs are real too: lives a third shorter and a population a sixth smaller.
- **The wider disease** is not worse than today's. Its population is even slightly larger, and none of its differences from today's disease are large.

## 4. Do geographic barriers produce more species? (first attempt: inconclusive)

**Experiment:** `headline-barriers`, 500,000 ticks, seeds 701 to 716. Seas covering 10%, 25% (today's) and 40% of the map. About 73 minutes in the cloud, about 78 cents.

**Result: this did not test barriers. More sea did not split the land.** In every world, at every sea level, a single land mass held the animals (1.0 to 1.06 land masses with 10 or more animals, on average). The seas form lakes and bays, not separate continents. So the experiment changed how much land there is, not whether populations are isolated:

| | 25% sea (today) | 10% sea | 40% sea |
|---|---|---|---|
| Population | 825 | **+30%*** | **-24%*** |
| Species alive | 4.8 | 4.7 | 5.0 |
| Species ever | 28 | 24 | 28 |
| Shannon diversity | 1.18 | 1.16 | 1.17 |
| Share in the biggest species | 49% | 48% | 51% |

(* holds up)

**Proposed follow-up:** add two straight water channels that cut the world into two halves that cannot reach each other (`terrainBarrierWidth` 2, as in the Two continents preset), against the same world without them. About 32 runs of 500,000 ticks, about 50 cents. The land-mass measure then shows how far the two halves drift apart.
