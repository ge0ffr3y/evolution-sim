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

## 4. Do geographic barriers produce more species?

### 4a. First attempt: more sea (inconclusive)

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

### 4b. The follow-up: a world cut into two halves

**Experiment:** `headline-barriers-2`, 500,000 ticks, seeds 1001 to 1016. The grand world cut into two halves by two straight water channels animals cannot cross (`terrainBarrierWidth` 2, as in the Two continents preset), against the same world uncut. About 31 minutes in the cloud, about 65 cents.

**Answer: yes, barriers make the world more varied.** The two halves evolve apart, no single species takes over as much, and diversity rises. The number of species alive rises a little, but not by enough to be certain with 16 seeds.

| | One connected world | Two halves |
|---|---|---|
| Land masses with 10 or more animals | 1.0 | **2.0*** |
| Share of animals in the biggest species | 46% | **36%*** |
| Species holding at least 10% of the animals | 3.1 | **3.8*** |
| Shannon diversity | 1.28 | **1.54*** (+20%) |
| Species alive | 5.3 | 6.2 (+18%, not certain) |
| Species ever | 25.6 | 27.8 |
| Population | 878 | **759*** (-14%) |

(* holds up)

- **The halves drift apart.** The share of gene variation lying between the two halves (0 = alike, 1 = entirely different) rises from 0.10 at tick 10,000 to about 0.23 to 0.26 by tick 50,000 to 100,000 (up to 0.42 in one world). It then eases back to about 0.17 by tick 500,000, perhaps because both halves face the same climate and pressures.
- **Fewer animals:** the channels take up land, and each half is a smaller habitat.
- **Together with experiment 1:** isolation by geography (here) and isolation by mating (sex for everyone, experiment 1) both make the world more varied. Mating isolation does it much more strongly, with 2.4 times the species.

## 5. Does poorer plant food make longer food chains but fewer species?

**Experiment:** `headline-plant-quality`, 1,000,000 ticks, seeds 901 to 916. The most nutrient a unit of plant can hold (`plantQualityMax`) set to 2 (today's), 1.5, 1 and 0.75. All 64 worlds finished and none died out. About 1.7 hours on one 32-core machine, about $2.20.

**Answer: yes to both, up to a point, but true meat eaters still do not take hold.** Poorer plants add a feeding level and four times as many mixed eaters. Below 1.5 they also cost species. The gain in feeding levels stops at a quality of 1, while the losses keep growing.

| | Quality 2 (today) | 1.5 | 1 | 0.75 |
|---|---|---|---|---|
| Feeding levels | 1.59 | **1.90*** | **2.00*** | **2.00*** |
| Mixed eaters | 29 | 61 | **134*** | **121*** |
| Share of time with 5+ mixed eaters | 59% | **90%*** | **100%*** | **100%*** |
| Meat in the diet | 8.9% | **11%*** | **16%*** | **18%*** |
| Average diet gene | 0.08 | **0.13*** | **0.22*** | **0.24*** |
| Share of animals with diet above 0.5 | 0.04% | 0.07% | **0.7%*** | **0.7%*** |
| Lasting meat eaters (diet above 0.75) | 0.03 | 0.01 | 0.01 | 0.01 |
| Species alive | 5.3 | 5.2 | **3.5*** (-34%) | **2.4*** (-54%) |
| Shannon diversity | 1.28 | 1.27 | **0.96*** | **0.70*** |
| Share in the biggest species | 47% | 47% | **56%*** | **65%*** |
| Population | 814 | **617*** | **383*** | **286*** |
| Average age | 848 | **523*** | **354*** | **373*** |
| Share sick | 17% | 16% | **7%*** | **2%*** |

(* holds up)

- **1.5 is a free lunch for the food web.** It adds most of the extra feeding level (1.59 to 1.90), nine tenths of the time with a lasting group of mixed eaters, and a third more kills, with no loss of species or diversity. Many more species appear over the run (65 against 47). The costs are fewer animals (-24%) and lives about a third shorter.
- **Below 1.5 the world narrows.** At 1 and 0.75 there are no more feeding levels to gain, but species fall by a third to a half and one species holds well over half the animals.
- **Still no true meat eaters.** Even with a million ticks and the poorest plants, a lasting group with a diet above 0.75 never forms. Animals with a diet above 0.5 grow twentyfold but stay under 1%. Poor plants push the whole population toward mixed eating, not toward a separate hunting species.
- **Nutrient, not energy, is now the limit.** Plants go uneaten (a third of capacity standing, against 9%; almost no worn ground), and fewer animals are hungry or starve. But more are short of nutrient (59% against 37%). Meat is rich in nutrient, which is why the diet shifts.
- **A fast, armed, short life.** Animals evolve high metabolism (13% at the gene's upper limit, against almost none), more attack and armor, larger bodies, and twice as much sex (gene 0.17 against 0.08). Each animal burns about three times as much energy per tick. Deaths and births both double, about four in five deaths are kills (against 58%), and the hit rate of attacks doubles.
- **Disease nearly vanishes** at the poorest levels, because there are a third as many animals to spread it.
- **Together with the audit:** this confirms Stage 2's finding that plant quality is the strongest lever on the food web, and shows that its price is paid in species once it goes below 1.5.

## 6. Follow-up: what would let meat eaters take hold? (4-seed screen)

**Why:** no headline experiment produced a lasting group of meat eaters (diet above 0.75). A diagnostic run (`apps/runner/scripts/diet-ledger.ts`, 8 worlds) found:
- almost all kills are made by armed plant eaters;
- the rare animals eating mostly meat carry almost no weapons, so they only scavenge, and they die fast;
- even on poor plants, mostly-meat eaters earn about half what grazers do.

**Experiment:** `carnivore-screen`, 300,000 ticks, seeds 1101 to 1104. Seven changes to the grand world:
- three existing settings: diet-based mating (`matePreference` 3, `mateDietLimit` 0.25), a stronger gut trade-off (`dietSpecialization` 0.8), richer carcasses (`bodyEnergyPerSize` 8);
- three new ones: meat that keeps in the cold (`meatColdKeep` 0.8), hungry prey that defend less (`preyHungerDefense` 0.6), weapons that get in the way of grazing (`weaponGrazeLoss` 0.6);
- all six together.

About 20 minutes in the cloud, about 41 cents. All 32 worlds finished.

**Answer: none of them.** Lasting meat eaters stayed at about zero in every setup, and animals with a diet above 0.5 stayed under 0.03%. The changes split into two groups:

| | Today | Meat keeps in the cold | Hungry prey defend less | Weapons get in the way of grazing | Stronger gut trade-off | All together |
|---|---|---|---|---|---|---|
| Mixed eaters | 8 | 52 | 19 | 4 | 0.4 | 0.9 |
| Share of time with 5+ mixed eaters | 33% | 88% | 63% | 21% | 2% | 7% |
| Feeding levels | 1.33 | 1.88 | 1.63 | 1.21 | 1.02 | 1.08 |
| Kills per 1,000 ticks | 775 | 1,390 | 1,120 | 484 | 659 | 465 |
| Species alive | 5.7 | **4.0*** | 6.2 | 5.3 | 4.1 | 5.2 |

(4 seeds; * holds up. Diet-based mating and richer carcasses changed little.)

- **Making meat easier to get (cold keeping, hungry prey) feeds the mixed eaters**, not meat specialists. Cold keeping gave six times the mixed eaters and 79% more kills, but cost species.
- **Making the in-between costly (weapons, gut) removes the mixed eaters and the armed grazers**, and nothing takes their place: hunting falls by about 40%.
- **So the obstacle looks like the path, not the destination.** A meat eater needs several things at once (a high diet gene, weapons, hunting behavior), and every step on the way is worse than staying a grazer or a mixed eater. Whether a ready-made group of meat eaters could hold its own if it existed is not yet known.
