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

### 6b. Can a ready-made group of meat eaters hold its own? (invasion test)

**Experiment:** `carnivore-invasion`, seeds 1201 to 1204. At tick 100,000, one animal in twenty (about 30 to 85 animals) became an armed meat eater: diet gene 0.95, attack gene 0.6, nothing else changed, brains included. The run continued to tick 200,000. Eight setups: today's grand world, no sex, diet-based mating, meat that keeps in the cold, hungry prey that defend less, weapons that get in the way of grazing, poorer plants (quality 1.5), and all but no sex together. About 35 minutes on an 8-core machine, about 18 cents.

**Answer: they can make a living for a while, but in every setup and every world they die out.** Meat eaters left (diet above 0.75), seed by seed:

| | 5,000 ticks after | 20,000 ticks after | 100,000 ticks after |
|---|---|---|---|
| Today's grand world | 64, 0, 0, 0 | 139, 0, 0, 0 | 0 everywhere |
| No sex | 0, 0, 0, 5 | 0 everywhere | 0 everywhere |
| Diet-based mating | 0, 0, 31, 59 | 0, 0, 7, 0 | 0 everywhere |
| Meat keeps in the cold | 39, 44, 6, 31 | 1, 0, 0, 0 | 0 everywhere |
| Hungry prey defend less | 0 everywhere | 0 everywhere | 0 everywhere |
| Weapons get in the way of grazing | 30, 4, 0, 147 | 0, 0, 0, 27 | 0 everywhere |
| Poorer plants | 0, 0, 32, 0 | 0 everywhere | 0 everywhere |
| All together | 0, 0, 72, 1 | 0 everywhere | 0 everywhere |

- **They can hunt and grow.** Several groups doubled or tripled in the first 1,000 ticks. In one world they grew to about 140, a tenth of all animals, 20,000 to 30,000 ticks after arriving, then dwindled (15 at 40,000) and were gone by 70,000.
- **It is not a boom and bust.** Prey numbers swing with the seasons as before; they are not eaten down.
- **It is not dilution by mating.** With no sex they died just as fast. Their diet does not drift into mixed eating either: every diet band above 0.25 empties along with them.
- **Meat keeping in the cold helps a little:** it was the only setup with meat eaters in all four worlds 5,000 ticks on, but not for long.
- **Hungry prey defending less backfires:** a newly converted meat eater is hungry, so it becomes easy prey itself, and three of four groups vanished within 500 ticks.
- **So a meat-eating life here runs at about break-even.** A small group wanders up and down until it hits zero. To last, meat eaters need a clear margin. Note the invaders kept their grazers' brains and the same body size as their prey; real predators come with evolved hunting behavior and are often bigger than what they eat.

### 6c. Bigger invaders (twice the size of their prey)

**Experiment:** `carnivore-invasion-big`, as 6b (seeds 1201 to 1204, invasion at tick 100,000, run to 200,000), but each invader's body was also doubled. The bigger body was paid for from the animal's own energy and nutrient store, topped up from the soil and dead matter where it stood, so nothing was made. Seven setups (6b's, without hungry prey). About an hour on an 8-core machine, about 36 cents.

**Answer: size gives no margin. Bigger meat eaters died out everywhere too, mostly faster.**

| | 1,000 ticks after | 5,000 after | 20,000 after | 50,000 after |
|---|---|---|---|---|
| Today's grand world | 41, 5, 0, 15 | 20, 0, 0, 0 | 13, 0, 0, 0 | 0 everywhere |
| No sex | 3, 25, 70, 15 | 0, 0, 18, 1 | 0 everywhere | 0 everywhere |
| Diet-based mating | 11, 18, 49, 59 | 0, 0, 35, 56 | 0, 0, 8, 0 | 0 everywhere |
| Meat keeps in the cold | 35, 49, 31, 92 | 48, 15, 18, 61 | 6, 19, 8, 12 | 0 everywhere |
| Weapons get in the way of grazing | 37, 21, 1, 22 | 26, 12, 0, 7 | 0, 14, 0, 0 | 0, 20, 0, 0 |
| Poorer plants | 0, 4, 28, 2 | 0, 0, 28, 0 | 0 everywhere | 0 everywhere |
| All together | 0, 35, 1, 12 | 0, 8, 0, 0 | 0, 10, 0, 0 | 0 everywhere |

- **Unlike same-size invaders, none grew after arriving.** A bigger hunter kills more often, but a body twice the size needs twice the energy before it can breed, while its prey stay small. Each kill covers half as much.
- **Meat keeping in the cold again helped most:** it was the only setup with meat eaters in all four worlds 20,000 ticks on, though all were gone by 50,000.
- **Conclusion of 6, 6b and 6c:** in the grand world a meat-eating life runs at about break-even. No single setting tried here, and neither bigger bodies nor stopping dilution by mating, gives the margin a meat-eating group needs to last. What remains untested: hunting behavior (invaders kept grazer brains), and the basic exchange rate of a kill (a body holds 4 units of energy per unit of size, while making one costs 30).

## 7. Why does the simple world grow meat eaters and the grand world not?

**Experiment:** `carnivore-bridge` (made by `apps/runner/scripts/make-bridge.mjs`), 200,000 ticks, seeds 1301 to 1304. The grand world's 74 settings were sorted into 15 groups. Each group was added alone to the simple (default) world, and the groups were also added one after another, a "ladder" whose last step is the full grand world. Ice ages, droughts and volcanoes need a climate and floods need terrain, so the disaster group's single-add arm brings climate and terrain along (and plant kinds brings climate). About 40 minutes on a 32-core machine, about 89 cents. All 120 worlds finished.

**Answer: mostly the climate, then sex with harmful mutations, with nutrients and kin restraint thinning meat eaters along the way.**

Meat eaters (diet above 0.75) in the second half of the run, per world, and the share of animals:

| Added to the simple world, alone | Meat eaters per world | Share | Feeding levels |
|---|---|---|---|
| Nothing (the simple world) | 127, 31, 116, 132 | 22% | 2.58 |
| Bigger world, more food | 501, 523, 499, 592 | 25% | 3.00 |
| Nutrients through food | 10, 7, 20, 5 | 8% | 2.37 |
| Mutation floor and rare big mutations | 64 to 102 | 21% | 2.89 |
| Aging, litters, luck | 136 to 142 | 24% | 2.42 |
| Land damage | 37 to 81 | 22% | 2.54 |
| Terrain | 54 to 62 | 21% | 2.70 |
| **Climate** | **0, 0, 0, 0** | **0%** | **1.00** |
| Disasters (with climate and terrain) | 0, 0, 0, 0 | 0% | 1.00 |
| Plant kinds (with climate) | 2, 0, 0, 0 | 0.2% | 1.12 |
| **Kin restraint and herds** | **0, 0, 44, 0** | **3%** | **1.50** |
| **Sex and harmful mutations** | **0, 0, 0, 0** | **0%** | **1.00** |
| Disease | 5 to 128 | 19% | 2.31 |
| Camouflage | 114 to 164 | 25% | 2.56 |
| Colonies | 97 to 119 | 24% | 2.77 |
| Brains | 91 to 171 | 31% | 2.80 |

The ladder (each step adds a group to everything before it):

| Step | Share that are meat eaters | Share with diet above 0.5 | Feeding levels |
|---|---|---|---|
| Simple world + bigger world | 25% | 35% | 3.00 |
| + nutrients | 4% | 28% | 2.55 |
| + mutation, life history, land damage, terrain | 5 to 6% | 20 to 28% | 2.84 to 2.89 |
| **+ climate** | **0.3%** | 9% | 2.04 |
| + disasters, plant kinds | 0.2 to 0.3% | 2 to 8% | 1.86 to 2.02 |
| + kin restraint and herds | 2% (one world) | 3% | 2.24 |
| **+ sex and harmful mutations** | **0%** | 0.1% | 1.97 |
| + disease, camouflage, colonies, brains (= the grand world) | 0% | 0 to 0.3% | 1.33 to 1.99 |

- **Climate alone erases meat eating** from the simple world: the average diet falls from 0.28 to 0.02 and kills from 3,600 to 21 per 1,000 ticks. This is the opposite of the idea that cold should favor meat eaters. Which part of the climate does it (seasons, the cost of heat and cold, torpor, day and night, weather, harsh years) is the next question.
- **Sex with harmful mutations alone erases it too**, as devlog 14 found for the ratchet. Mending did not fix this in the simple world.
- **Kin restraint and herds** (as devlog 10 found for herds) nearly erase it.
- **Nutrients thin it** (meat eaters from 22% to 8% alone, 25% to 4% on the ladder) but push many animals into high mixed diets.
- **Everything else is harmless or helps:** brains, colonies, camouflage, a bigger world and disease all leave meat eaters in place.
- The report's three "too good to be true" flags are explained: a world four times the area holds about four times the animals, and simple worlds without predators hold two to three times as many (devlog 3).

### 7b. The culprits split apart, and taken out of the grand world

**Experiment:** `carnivore-bridge-2` (grand-world setups made by `apps/runner/scripts/make-bridge-2.ts`), 200,000 ticks, seeds 1401 to 1404. The three culprit groups were split into their parts, each added alone to the simple world. Then the grand world was run with culprit groups taken out (their settings put back to the simple world's). About 20 minutes on a 32-core machine plus one world finished on a small one, about 30 cents.

**Answer: no single setting is to blame. Seasons, harmful mutations, sex and kin restraint each thin meat eaters or make them hit-or-miss; together they erase them. Take all three groups out of the grand world and meat eaters come back in 3 of 4 worlds.**

| Added to the simple world, alone | Meat eaters per world | Share | Feeding levels |
|---|---|---|---|
| Nothing (the simple world) | 96 to 112 | 23% | 2.85 |
| A temperature map only | 85 to 98 | 25% | 2.76 |
| Day and night | 70 to 96 | 25% | 2.46 |
| Weather fronts | 73 to 96 | 24% | 2.61 |
| The cost of heat and cold | 88 to 109 | 29% | 2.33 |
| Slow climate drift | 32 to 106 | 24% | 2.69 |
| **Seasons** | **74, 3, 60, 12** | **9%** | 1.70 |
| Seasons with harsh years | 43, 5, 0, 76 | 8% | 1.54 |
| Seasons with torpor | 71, 26, 0, 74 | 10% | 1.88 |
| **Sex only** | **0, 130, 110, 0** | 13% | 1.85 |
| **Harmful mutations only** | **0, 44, 0, 0** | **3%** | 1.34 |
| Kin restraint only | 0, 74, 200, 90 | 25% | 1.88 |
| Kin restraint with herds | 137, 0, 85, 66 | 20% | 1.76 |
| Kin restraint with sharing | 0, 137, 75, 0 | 13% | 1.56 |

| The grand world | Meat eaters per world | Share | Feeding levels | Kills per 1,000 ticks |
|---|---|---|---|---|
| As it is | 0, 0, 0, 0 | 0% | 1.55 | 717 |
| Without the climate | 0, 0, 0, 0 | 0% | 1.98 | 2,232 |
| Without sex and harmful mutations | 0, 0, 0, 0 | 0% | 1.83 | 1,569 |
| Without kin restraint and herds | 0, 0, 0, 0 | 0% | 1.09 | 492 |
| Without the climate, sex and harmful mutations | 0, 0, 0, 75 | 2% | 2.21 | 3,384 |
| **Without all three** | **0, 85, 105, 89** | **6%** | **2.38** | **3,496** |

- **Of the climate, only the seasons matter.** A temperature map, day and night, weather, the cost of heat and cold and slow drift leave meat eaters as they are. Seasons cut them by about 60% and make them hit-or-miss (3 to 74 per world). A likely reason, not yet tested: each winter the plant eaters crash, and a small group of hunters crashes with them, so it can drift to zero.
- **Harmful mutations are the strongest single blocker** (meat eaters in 1 of 4 worlds). This fits devlog 14: would-be hunters are always a small group, and small groups pile up harmful mutations faster. Sex alone removes them in half the worlds, as gene mixing blends hunters back into the plant eaters (experiment 1).
- **Kin restraint is hit-or-miss** (no meat eaters in 1 or 2 of 4 worlds, depending on what it is paired with).
- **They add up.** Each one alone leaves a chance; the grand world stacks all of them, and the chance falls to zero. Taking out any one group does not help, two helps a little, all three brings meat eaters back in 3 of 4 worlds (about 6% of animals) with kills five times today's.
- **The common thread is small numbers.** Every culprit hurts a small, sparse group more than a big one: seasonal crashes, the faster build-up of harmful mutations, being outnumbered when mating, sparing relatives that are most of the neighbors. A meat-eating group starts small, so it is the one these rules hit.

### 7c. Gentler culprits are not enough

**Experiment:** `gentle-culprits`, 300,000 ticks, seeds 1501 to 1504. Today's grand world against gentler versions of three culprits:
- plants swinging less with the seasons (growth swing 0.4 and 0.2, against 0.6);
- fewer harmful mutations (rate 1.5, against 3), or more mending (0.3 and 0.5, against 0.15);
- tighter kin restraint (relatives only within 0.02, against 0.05), or hunger overriding it (below half fed);
- two combinations.

Sex was left as it is. About an hour on a 32-core machine, about $1.40. All 40 worlds finished.

**Answer: no. None of the ten setups has a single meat eater, and none raises the average diet.** The gentler setups do change the world, but toward a calmer one, not a food web:

| | Today | Seasons 0.4 | Tighter kin | Gentle, all three | Gentler, all three |
|---|---|---|---|---|---|
| Kills per 1,000 ticks | 1,050 | -51% | -57% | -59% | -60% |
| Feeding levels | 1.64 | -10% | -35% | -33% | -26% |
| Species alive | 5.3 | +16% | +21% | +30% | +48% |
| Average age | 674 | +66% | +60% | +83% | **+115%*** |
| Population | 821 | +15% | +17% | +13% | +18% |

(4 seeds; * holds up. Fewer harmful mutations and more mending changed little.)

- **Softening the culprits is not the same as removing them.** In 7b, taking all three groups out (with sex) brought meat eaters back in 3 of 4 worlds; here, gentler versions with sex kept bring none.
- **Tighter kin restraint cuts hunting**, against expectation (an animal spares fewer relatives, yet kills fall by more than half). Devlog 16 saw the same from the other side (switching kin restraint off cut hunting by three quarters). Not explained.
- **Sex was not softened here**, and 7b found it a blocker on its own (no meat eaters in half the worlds). The setups that brought meat eaters back all removed it.
- **A side effect worth keeping in mind:** the gentle combinations give more species (+30 to 48%) and lives about twice as long. That could be a better grand world in its own right, but it is a calmer one, and it needs a 16-seed check.

### 7d. Confirmed on 16 seeds: a "hunters" grand world

**Experiment:** `hunters-confirm` (made by `apps/runner/scripts/make-hunters.ts`), 300,000 ticks, 16 fresh seeds (1601 to 1616). Today's grand world against two versions without harmful mutations, sex and kin restraint (their settings put back to the simple world's):
- one also without the whole climate, as in 7b;
- one without only the seasons, keeping day and night, weather, drift, the cost of heat and cold, torpor and ice ages.

About an hour on a 32-core machine, about $1.15.

**Answer: without the climate, yes, reliably. Without only the seasons, no.**

| | Today | Hunters, no climate | Hunters, no seasons |
|---|---|---|---|
| Worlds with 10+ meat eaters for most of the second half | 0 of 16 | **13 of 16** | 0 of 16 |
| Worlds with any meat eaters (second half) | 0 of 16 | 15 of 16 | 4 of 16 (1 to 11) |
| Meat eaters per world (second half) | 0 | 0 to 222, average 87 | 0 to 11 |
| Feeding levels | 1.34 | **2.74*** | 1.71* |
| Kills per 1,000 ticks | 758 | **4,401*** | 819 |
| Mixed eaters | 16 | **161*** | |
| Species alive | 5.5 | **7.1*** (+29%) | 3.7* (-32%) |
| Species ever | 22 | **53*** | |
| Share of animals in the biggest species | 44% | 38% | |
| Population | 900 | **1,227*** (+36%) | 1,053* |
| Lowest population | 356 | **600*** | |
| Average age | 883 | **445*** (-50%) | 1,439* |
| Deaths that are kills | 48% | **78%*** | |

(* holds up, 16 seeds)

- **The hunters' world is richer, not poorer:** a real food web (plant eaters, mixed eaters, meat eaters; 2.7 feeding levels), 29% more species alive, more than twice as many species over the run, a bigger and steadier population. The price is shorter lives (half as long; most deaths are kills now) and more disease (a denser world).
- **Seasons were not the whole of the climate's effect in the grand world.** In the simple world only seasons mattered (7b), but here removing the seasons alone left meat eaters in 4 of 16 worlds at most 11 strong, and cost a third of the species. Something else in the climate also blocks them when combined with the rest: torpor (a dormant animal cannot attack), the cost of heat and cold, ice ages and droughts, or weather. Not yet split.
- **What it gives up:** sex, harmful mutations, kin restraint, herds and sharing, and the climate (seasons, weather, day and night, ice ages, droughts, volcanoes, the cost of heat and cold, torpor). It is a different world, not a fix for the grand world.

## 8. Prey choice: hunters eat their own families

**Why:** kin restraint behaved oddly. Removing it, and also tightening it, cut hunting in the grand world, so it was not simply a brake. A diagnostic (`apps/runner/scripts/kill-victims.ts`) recorded who each kill's victim was.

**Found:** babies appear on their parent's exact spot, and a hunter attacks whoever is nearest in reach, so family members are often each other's first targets. In 20,000-tick runs (one seed each):

| | Kills by an animal at most 5 ticks old | Victim is the killer's parent | Victim is the killer's child |
|---|---|---|---|
| Simple world | 22% | 21% | 4% |
| Grand world | 6% | 4% | 6% |
| Grand world without kin restraint | 8% | 12% | 10% |
| Grand world: hunters | 11% | 11% | 8% |

Kin restraint was patching this: without it a hunting family eats itself, so hunting pays less (grand world: 18,000 kills in 20,000 ticks without it, 41,000 with it).

**Built:** `spareFamily` (off by default; tests in `carnivory.test.ts`). An animal never attacks its own parent or offspring, known by identity, not by gene likeness. In a quick check it removed parent and child kills completely and raised kills to 62,000 (50,000 without kin restraint).

### 8b. It does not bring meat eaters to the grand world

**Experiment:** `spare-family` (made by `apps/runner/scripts/make-spare-family.ts`), 300,000 ticks, seeds 1701 to 1704. About 30 minutes on a 32-core machine, about 60 cents.

| | Meat eaters per world (second half) | Feeding levels | Kills per 1,000 ticks |
|---|---|---|---|
| Grand world | 0, 0, 0, 0 | 1.66 | 1,210 |
| + spare family | 0, 0, 0, 0 | 1.66 | 994 |
| + spare family, no kin restraint | 0, 0, 0, 0 | 1.37 | 747 |
| + spare family, no herds | 0, 0, 0, 0 | 1.77 | 1,463 |
| Grand world: hunters (reference) | 95 to 193 | 2.90 | 4,973 |
| Hunters + spare family | 43 to 101 | 2.94 | 5,932 |

**Answer: no.** The early rise in kills does not last, and no meat eaters appear in any grand-world setup. Sparing family is a real fix for a real quirk, but it is not what holds meat eaters back in the grand world.

### 8c. Autopsy: what kills a meat-eating group in the grand world

**Diagnostic:** `apps/runner/scripts/invader-autopsy.ts` turns one animal in twenty into an armed meat eater after 60,000 ticks and follows every descendant (one seed, laptop runs).

- **In the grand world the group dies within about 700 ticks; in the hunters' world it lasts.** Both take in about the same meat (about 5 to 10 breedings' worth per animal per 1,000 ticks) and are about equally fed (half of what breeding needs). The difference is breeding and starving: in the hunters' world invaders produce about one baby each per 100 ticks; in the grand world about a quarter of that, and most deaths are running out of energy.
- **Meat eaters kill each other.** In the hunters' world, 30 to 40% of the group's deaths are kills by its own lineage (cousins and siblings, which sparing family does not cover). They last anyway because they breed so fast.
- **No single grand-world feature is the cause.** Removed one at a time from the grand world, the group lasts: kin restraint or sex about 1,500 ticks, harmful mutations about 2,000, seasons about 3,000, the cost of heat and cold a little over 3,000 (one seed each). Each buys time; none is enough.
- **So the grand world taxes everyone, and meat eaters have no margin to pay it.** Harmful mutations alone raise every animal's basic upkeep by about 70% (about 18 per animal at about 4% each), about a fifth of all running costs. Plant eaters' income arrives every tick and absorbs that; a meat eater's arrives in lumps and runs at about break-even even in easy worlds, so each extra cost pushes it under.

### 8d. Where a meat eater's margin goes (diet ledger)

**Experiment:** `meat-margin` (made by `apps/runner/scripts/make-meat-margin.ts`; table by `apps/runner/scripts/ledger-table.mjs`), 150,000 ticks, seeds 1801 to 1804. A new opt-in measure, the diet ledger, tallies every tick, per diet band:
- income from plants and from meat, and running costs by kind, all in breedings' worth per animal per 1,000 ticks;
- kills, births (credited to the parent's band) and deaths.

From tick 100,000, one animal in twenty became an armed meat eater, and again every 5,000 ticks, so every setup had meat eaters to measure. Setups: the grand world, the grand world without each culprit group, and the hunters' world. About 30 minutes on a 16-core machine, about 35 cents.

**Per animal, ticks 100,000 to 150,000 (weighted by numbers):**

| Meat eaters (diet above 0.75) | Grand world | Hunters' world |
|---|---|---|
| Meat income | 7.8 | 7.4 |
| Running costs | **4.7** | **2.9** |
| of which basic upkeep | 2.9 | 1.4 |
| of which harmful mutations | 0.9 | 0 |
| of which heat and cold | 0.4 | 0 |
| Kills | 14.2 | 18.8 |
| Births / deaths | 6.0 / 6.1 | 6.0 / 6.1 |

| Plant eaters (diet under 0.25) | Grand world | Hunters' world |
|---|---|---|
| Plant income | 7.0 | 11.1 |
| Running costs | 5.7 | 8.1 |
| Births | **2.5** | **4.9** |
| Number | 913 | 1,117 |

**Meat eaters after each arrival** (average of 9 arrivals in 4 worlds):

| | On arrival | +500 ticks | +2,000 | +4,500 |
|---|---|---|---|---|
| Grand world | 82 | 71 | 50 | 41 |
| Without the climate | 79 | 31 | 21 | 19 |
| Without sex | 41 | 12 | 5 | 2 |
| Without harmful mutations | 87 | 73 | 54 | 52 |
| Without kin restraint | 101 | 92 | 70 | 58 |
| Hunters' world | 225 | 187 | 189 | 162 |

- **Meat eaters everywhere live at about break-even** (births about equal to deaths, about 6 per animal per 1,000 ticks). In the grand world they fall just short: a group loses about 40% every 4,500 ticks, so without newcomers it fades within about 20,000 to 30,000 ticks. In the hunters' world they hold.
- **They earn about the same in both worlds; what differs is costs.** A meat eater's running costs are about 60% higher in the grand world (4.7 against 2.9), mostly basic upkeep: harmful mutations and heat and cold make up most of the gap.
- **The prey matter too.** Grand-world plant eaters earn less and breed at half the rate (2.5 against 4.9 per 1,000 ticks), so there is less surplus for hunters to live on.
- **No single culprit fixes it, and two removals hurt.** Without harmful mutations or kin restraint, groups shrink a little more slowly. Without the climate or without sex they collapse faster: in those worlds the plant eaters kill about twice as often (2.0 and 1.7 kills per animal per 1,000 ticks against 0.9), and newly arrived meat eaters are among their victims.
- **Earlier autopsy (8c) was harsher than this**: a single small group at tick 60,000 in one seed died within 700 ticks; here repeated arrivals build up, and survivors from earlier groups carry on.

### 8e. A richer kill does not help either

**Experiments:** `kill-payoff-margin` (150,000 ticks, seeds 1901 to 1904, repeated meat-eater arrivals from tick 100,000, diet ledger) and `kill-payoff` (300,000 ticks, seeds 1911 to 1914, no help). A body holds `bodyEnergyPerSize` units of energy per unit of size: 4 today, against 6, 8 and 12. Each on a 16-core machine, side by side, about $1.25 together.

**Answer: no.**

| Body energy | Meat income per meat eater | Meat eaters 4,500 ticks after arriving | Plant eaters | From scratch: meat eaters in 4 worlds |
|---|---|---|---|---|
| 4 (today) | 7.1 | 20 of 55 | 821 | 0, 0, 0, 0 |
| 6 | 7.1 | 21 of 56 | 703 | 0, 0, 0, 0 |
| 8 | 9.1 | 13 of 44 | 707 | 0, 0, 0, 0 |
| 12 | 6.9 | 19 of 49 | 585 | 0, 0, 0, 0 |
| 8, sparing family | | | | 0, 0, 0, 0 |
| 12, sparing family | | | | 0, 0, 0, 0 |

- **A richer body is not a richer carcass.** The extra energy in a body comes out of what the parent hands its baby, so a newborn starts with less spare energy and a carcass holds about the same total. Meat income stays about flat.
- **It costs the prey.** Plant eaters become fewer (up to 29% fewer at 12), with fewer species (-15 to -33%), so there is less to hunt.
- **Feeding levels and meat in the diet rise a little** (up to +22% and +59%, not holding up with 4 seeds), but no world grows a single meat eater.

### 8f. A fat reserve and more plant growth do not give the margin either

**Experiments:** `margin-levers-margin` (150,000 ticks, seeds 2001 to 2004, repeated meat-eater arrivals from tick 100,000, diet ledger) and `margin-levers` (300,000 ticks, seeds 2011 to 2014, no help). Grand world against:
- a fat reserve (deposit rate 0.5, founders and arrivals starting with fat), to bank a big meal for the lean days between kills;
- more plant growth (0.18 and 0.24 per tick, against 0.12), so plant eaters breed faster;
- fat with 0.18.

Each on a 32-core machine, side by side, about $1.10 together.

| | Meat eaters 4,500 ticks after arriving | Meat eaters' births / deaths | From scratch: meat eaters in 4 worlds | Feeding levels | Kills per 1,000 ticks |
|---|---|---|---|---|---|
| Grand world | 4 of 41 | 6.0 / 6.7 | 0, 0, 0, 0 | 1.47 | 783 |
| Fat | 13 of 43 | 4.4 / 4.8 | 0, 0, 0, 0 | 1.23 | 502 |
| Plants 0.18 | 0 of 40 | 4.2 / 8.9 | 0, 0, 0, 0 | 1.57 | 1,188 |
| Plants 0.24 | 13 of 54 | 6.3 / 6.8 | 0, 0, 0, 0 | 1.73 | **1,858*** |
| Fat and plants 0.18 | 4 of 46 | 4.7 / 5.5 | 0, 0, 0, 0 | 1.79 | **1,480*** |

(* holds up, 4 seeds)

- **Arriving meat eaters still die faster than they are born in every setup.** Fat and plants at 0.24 slow the loss (about a third left after 4,500 ticks, against a tenth); 0.18 was worse than both, likely noise with 4 seeds.
- **More plants feed the armed plant eaters as much as the hunters.** Plant eaters kill more as plant growth rises (1.3 to about 2.3 kills each per 1,000 ticks in the margin test), and new meat eaters are among their victims. From scratch, plants at 0.24 more than double kills and lift feeding levels, but toward more mixed eating, not a meat-eating group.
- **Fat makes a calmer world:** a third fewer kills and less meat, lives half again as long.

### 8g. All the partial helps together: meat eaters can stay, but still do not arrive

**Experiments:** `bundle-margin` and `bundle` (made by `apps/runner/scripts/make-bundle.mjs`). The bundle adds every partial help found so far to the grand world as it is:
- sparing your own parent and young;
- a fat reserve;
- plant growth 0.24 (against 0.12);
- weapons that get in the way of grazing (0.6);
- meat that keeps in the cold (0.8);
- more mending of harmful mutations (0.5, against 0.15);
- half the cost of heat and cold.

`bundle-margin`: 150,000 ticks, seeds 2101 to 2104, meat eaters arriving every 5,000 ticks from tick 100,000, diet ledger. `bundle`: 300,000 ticks, seeds 2111 to 2114, no help, with each help left out in turn. About $1.15 together.

**Staying: yes.** Arriving meat eaters now hold their numbers in the grand world:

| | On arrival | +500 ticks | +2,000 | +4,500 | Births / deaths (meat eaters) | Plant eaters |
|---|---|---|---|---|---|---|
| Grand world | 50 | 41 | 16 | 9 | 5.8 / 6.3 | 819 |
| Bundle | 153 | 117 | 98 | **99** | **3.8 / 3.9** | 1,134 |

**Arriving: no.** From scratch, not one world grew a lasting group of meat eaters with the bundle. The bundle gives 90% more animals and 44% more species, but the same feeding levels. Leaving each help out in turn:

| From scratch | Meat eaters (4 worlds) | Feeding levels | Kills per 1,000 ticks | Mixed eaters | Meat in the diet |
|---|---|---|---|---|---|
| Grand world | 0, 0, 0, 0 | 1.56 | 1,047 | 16 | 8% |
| Bundle | 0, 0, 0, 0 | 1.58 | 1,178 | | |
| Bundle without weapons getting in the way of grazing | **0, 0, 13, 0** | **2.04*** | **2,685*** | **132** | **17%*** |
| Bundle without fat | 0, 0, 0, 0 | 1.80 | 1,826 | | |
| Bundle without meat keeping in the cold | 0, 0, 0, 0 | 1.86 | 1,708 | | |
| Other leave-one-outs | 0 to 8 in one world | 1.31 to 1.69 | 769 to 998 | | |

(* holds up, 4 seeds)

- **The weapons penalty helps meat eaters stay but blocks the road to them.** It removes armed plant eaters, which compete with and kill newly arrived meat eaters. But armed plant eaters that gradually eat more meat are the road meat eating evolves along (as in the simple world, devlog 3). Without it, the bundle has the most hunting, the most mixed eaters and the only small meat-eating group (13 in one world).
- **Fat calms the world.** Without fat, kills and feeding levels rise.
- **So staying and arriving pull in different directions here.** What protects a meat-eating group once it exists (fewer armed rivals, a fat reserve) also slows the mixed eaters it would evolve from.

### 8h. The bundle without the weapons penalty: a much richer grand world, still no meat eaters

**Experiments:** `path-bundle` (500,000 ticks, 16 fresh seeds, 2201 to 2216, no help) and `path-bundle-margin` (150,000 ticks, seeds 2221 to 2224, meat eaters arriving every 5,000 ticks from tick 100,000, diet ledger). The "path bundle" is the bundle without weapons getting in the way of grazing:
- sparing your own parent and young;
- plant growth 0.24;
- meat that keeps in the cold (0.8);
- more mending of harmful mutations (0.5);
- half the cost of heat and cold.

It was tested with and without the fat reserve. About an hour on a 48-core machine and 40 minutes on a 16-core one, about $2.

**Meat eaters: still none from scratch.** Not one of the 32 worlds held a group of 10 or more for most of the second half (one world, with fat, averaged 18). Arriving meat eaters:

| | On arrival | +500 ticks | +2,000 | +4,500 | Births / deaths |
|---|---|---|---|---|---|
| Grand world | 35 | 6 | 1 | 0 | 4.5 / 6.3 |
| Path bundle (with fat) | 49 | 8 | 1 | 1 | 2.5 / 5.1 |
| **Path bundle without fat** | 83 | 50 | 33 | **38** | **4.8 / 5.0** |

**But the path bundle without fat is a much richer world** (16 seeds; every change holds up):

| | Grand world | Path bundle without fat |
|---|---|---|
| Species alive | 5.1 | **9.4** (+86%) |
| Species over the run | 29 | **80** |
| Shannon diversity | 1.23 | **1.78** (+45%) |
| Share in the biggest species | 47% | **34%** |
| Feeding levels | 1.49 | **1.98** |
| Mixed eaters | 18 | **132** |
| Meat in the diet | 7.6% | **15.6%** |
| Kills per 1,000 ticks | 807 | **2,527** |
| Population | 838 | **1,135** |
| Lowest population | 238 | **476** |
| Average age | 882 | **622** (-29%) |
| Births with two parents | 41% | 35% |

- **Fat holds the world back here too.** With fat, the gains are smaller (species +29%, not holding up), and arriving meat eaters die out as fast as in today's grand world.
- **Meat eaters can now stay** (without fat they hold near balance), **but none arrive.** The world fills with mixed eaters (132 per world, 15.6% meat in the diet), yet none specialize. The step from mixed eating to a meat-eating group remains the barrier; sex (which blends hunters back, experiment 1) and the seasons are still fully on.

## 9. Fat, reworked

**Why:** today's fat reserve costs before it pays:
- it is banked from 60% of breeding energy, so breeding waits;
- 20% is lost storing it, and carrying it costs upkeep and movement;
- it is drawn only near starvation, and young start with none.

Evolution drops the gene: from 0.60 to 0.07 in 8h. And the fat gene counted toward relatedness, with a wide random spread at the start.

**Built** (all off by default; `fatrework.test.ts`):
- `fatProvision`: a share of a parent's fat is handed to each baby;
- `fatRelated`: 0 = the fat gene no longer counts toward species, mates and kin;
- a brain sense of the fat reserve (`INPUT.fatReserve`; brain layout 79 inputs; brain-world goldens re-recorded, brains-off unchanged).

"New fat" (`apps/runner/scripts/make-fat-rework.mjs`) uses those plus existing settings:
- store only from the breeding level up (`fatDepositAbove` 1);
- draw below half (`fatDrawBelow` 0.5);
- 90% stored (`fatEfficiency` 0.9);
- cheaper to carry (`fatMoveCost` 0.25, `fatUpkeep` 0.1);
- half handed to young (`fatProvision` 0.5);
- left out of relatedness (`fatRelated` 0).

**Experiments:** `fat-rework` (300,000 ticks, seeds 2301 to 2304) and `fat-rework-margin` (150,000 ticks, seeds 2311 to 2314, arriving meat eaters, diet ledger). About $1.05 together.

| | Fat gene at 50k / 150k / 300k | Births with two parents | Brain connections | Population | Species | Meat eaters |
|---|---|---|---|---|---|---|
| No fat (grand world) | none | 47% | 10.1 | 972 | 4.4 | 0 |
| Today's fat | 0.52 / 0.26 / 0.22 | **25%*** | 11.3 | **-21%*** | 4.2 | 0 |
| Today's fat, not counted in relatedness | 0.43 / 0.28 / 0.25 | **18%*** | 9.8 | **-35%*** | 3.6 | 0 |
| New fat | 0.60 / 0.54 / **0.53** | **27%*** | 10.3 | -9% | 4.8 | 0 |
| New fat, nothing handed to young | 0.61 / 0.58 / **0.67** | **26%*** | 10.4 | -12% | 5.9 | 0 |
| New fat, storing from 80% | 0.40 / 0.34 / 0.26 | 27% | 13.3 | -10% | 4.6 | 0 |
| Path bundle (no fat) | none | 41% | 9.7 | **+65%*** | **13.4*** | 0 |
| Path bundle with new fat | 0.60 / 0.54 / 0.53 | **24%*** | 11.3 | +39% | 6.3 | 0 |

(* holds up, 4 seeds)

- **Evolution now keeps fat.** With the rework, the fat gene stays at about 0.5 to 0.7 instead of falling to 0.2 or below. Banking only true surplus makes fat worth carrying for the individual.
- **But every kind of fat cuts sex by about half.** An animal waiting for a mate holds energy above its breeding level; fat banks exactly that energy, its energy falls below "ready", and it splits alone instead. Today's fat does the same at 60%.
- **Leaving fat out of relatedness was not the cause of the harm.** Today's fat without it did no better.
- **Not yet a gain for the world:** populations a little smaller, no clear change in species, brains or meat eaters. In the path bundle, adding new fat cancels most of its gain in species.
- **The margin test varies a lot between sets of 4 worlds.** Arriving meat eaters faded in all three setups, including the no-fat path bundle, which held them at about 38 in 8h.

### 9b. Fat that pays for breeding

**Why:** reworked fat was kept by evolution but halved sex (9): an animal waiting for a mate banked the energy it was holding to breed, fell below "ready" and split alone instead.

**Built:** `fatBreeding` (off by default; tests in `fatrework.test.ts`). Fat counts as breeding capital: when energy alone falls short of breeding, or of being ready to mate, but energy and fat together reach it, the shortfall moves out of fat with no loss. An animal seeking a mate banks nothing.

**Experiment:** `fat-breeding`, 300,000 ticks, 8 fresh seeds (2401 to 2408), on a 48-core machine, about $1.05.

| | Fat gene at the end | Births with two parents | Species alive | Shannon | Population | Lowest population | Kills per 1,000 ticks |
|---|---|---|---|---|---|---|---|
| No fat (grand world) | none | 39% | 5.4 | 1.31 | 938 | 319 | 900 |
| New fat | 0.51 | **31%** | 4.9 | 1.26 | 987 | 382 | **-45%*** |
| New fat, paying for breeding | 0.56 | **41%** | 6.8 | 1.49 | 958 | 349 | -20% |
| Path bundle (no fat) | none | 34% | 7.3 | 1.47 | **1,230*** | **478*** | **+185%*** |
| Path bundle + new fat paying for breeding | 0.46 | 35% | **10.8*** | **1.87*** | **1,330*** | **523*** | **+168%*** |

(* holds up, 8 seeds)

- **Paying for breeding removes fat's cost to sex** (41% of births with two parents, against 31% with fat that does not, and 39% without fat), and evolution still keeps fat (gene about 0.5).
- **Fat is now neutral to positive on its own** (species +27%, not holding up with 8 seeds), not a loss as before.
- **With the path bundle it gives the richest grand world so far:** twice the species of today's grand world (10.8 against 5.4) and 43% more diversity, with a bigger population and a higher low point, on top of what the bundle gives without fat (7.3 species).
- **Fat alone makes a calmer world** (fat that does not pay for breeding: 45% fewer kills, lives 31% longer).
- **Still no lasting meat eaters** (one world reached 4), and **brains are no bigger** (11.0 to 11.4 connections everywhere). Fat that pays off has not, by itself, pushed brains up in 300,000 ticks.

## 10. The grand world, reworked (adopted)

**Experiment:** `rich-grand-confirm`, 500,000 ticks, 16 fresh seeds (2501 to 2516), about 45 minutes on a 32-core machine, about $1. The grand world as it was (now kept as the preset `grand-world-classic`) against it with:
- sparing your own parent and young;
- plant growth 0.24 (against 0.12);
- meat that keeps in the cold (0.8);
- more mending of harmful mutations (0.5, against 0.15);
- half the cost of heat and cold (0.75);
- reworked fat that pays for breeding (9b).

**Answer: yes, adopt it.** Every change below holds up (16 seeds); no red flags beyond the intended ones (no collapse, no drift, no stuck genes).

| | Classic grand world | Reworked grand world |
|---|---|---|
| Species alive | 4.5 | **10.6** (2.4 times; about 8.8, twice, once fat is left out of species tracking: see 11) |
| Species over the run | 27 | **85** |
| Shannon diversity | 1.12 | **1.92** (+72%; about 1.67, +49%, once fat is left out of species tracking) |
| Share in the biggest species | 49% | **31%** |
| Population | 865 | **1,238** (+43%) |
| Lowest population | 244 | **483** (twice) |
| Feeding levels | 1.53 | **1.95** |
| Mixed eaters | 17 | **104** |
| Meat in the diet | 7.4% | **14.7%** |
| Kills per 1,000 ticks | 774 | **2,270** |
| Harmful mutations per animal | 15.8 | **5.6** |
| Deaths that are starvation | 47% | **27%** |
| Average age | 905 | 748 (-17%, not holding up) |
| Births with two parents | 41% | 38% (no change) |
| Fat gene | none | 0.58 |
| Lasting meat-eating groups | 0 of 16 | 0 of 16 |

**Adopted** as `configs/grand-world.json` (2026-10-23). Every experiment before this one ran on the classic grand world: their files now name `grand-world-classic` as their base, and the scripts that made them read it, so they re-run exactly.

## 11. Mating and sight: pickiness, the eye and mate scent

**Built** (all off by default; `matingsight.test.ts`):
- **Pickiness** (`matePickiness`, the 32nd gene): turns down mates whose diet differs by more than 1 - pickiness x choice, where choice is how many ready mates are in range (n / (n + 3)), and prefers the closer eater. Both partners must accept. Founders start at 0.
- **The eye** (`eyeMode`, the 33rd gene): 0.5 is today's 150-degree eye. Toward 0 it is wider (up to about 300 degrees) and shorter; toward 1 narrower (down to about 60 degrees), longer and sharper against camouflage. Founders start at 0.5.
- **Mate scent** (`mateScent`): animals seeking a mate lay scent in a plant-eater and a meat-eater layer; brains smell the mix matching their own diet.
- **A fix:** the species tracker now also leaves out the fat gene when `fatRelated` is 0. Before, fat differences could split species, which inflated the reworked grand world's species count (10: first 10.6, corrected about 8.8; Shannon first 1.92, corrected about 1.67).

**Experiment:** `mating-sight`, 300,000 ticks, seeds 2601 to 2604, on the reworked grand world, about $0.70.

| | Meat eaters (4 worlds) | Eye, plant eaters / others | Eye-diet correlation | Pickiness | Mixed eaters | Feeding levels | Kills | Population |
|---|---|---|---|---|---|---|---|---|
| Grand world | 0, 0, 0, 0 | (0.5) | | | 107 | 1.96 | 2,534 | 1,127 |
| Pickiness | 0, 0, 0, 0 | | | 0.19 / 0.18 | 84 | 1.75 | -17% | +18% |
| Eye | 0, 0, 0, **26** | 0.78 / 0.87 | 0.17 | | 152 | 2.05 | +20% | -16% |
| Mate scent | 0, 0, 0, 0 | | | | 99 | 1.88 | +3% | +11% |
| All three | 0, 0, 0, 0 | 0.88 / 0.89 | 0.04 | 0.30 / 0.32 | 140 | 2.00 | +22% | **-36%*** |
| All three, prey sight unmuted | 0, 0, 0, 0 | 0.76 / 0.81 | 0.16 | 0.25 / 0.27 | 212 | 2.00 | +25% | **-31%*** |
| All three, unmuted, pull toward prey | 0, 0, 0, 0 | 0.86 / 0.88 | 0.04 | 0.41 / 0.44 | **278*** | **2.01*** | **+31%*** | **-24%*** |

(* holds up, 4 seeds; the last setup also has 28% more meat in the diet*, and in one world 5% of animals with a diet above 0.5)

- **The eye evolves, but not apart by diet.** Plant eaters and others alike move to narrow, far-reaching, sharp eyes (about 0.8 to 0.9), and eye goes only weakly with diet (correlation 0.04 to 0.17). As built, a narrow eye is better for everyone: seeing far ahead and through camouflage pays, and a wide view gives prey too little, because nothing about an attack depends on whether the prey sees it coming.
- **Pickiness evolves from nothing** (to about 0.2 to 0.4), equally in plant eaters and others. On its own it does not change who eats what.
- **Mate scent alone changes little.**
- **Letting would-be hunters see prey, plus a pull toward prey, moves the most:** nearly three times the mixed eaters, more meat, more kills, and the first worlds with a few percent of animals eating mostly meat. But no lasting meat-eating group, and fewer animals.
- **Corrected species count:** the reworked grand world has about 8.8 species (against 4.5 for the classic one), about twice, not 2.4 times.

### 11b. Vigilance: a use for wide eyes

**Built:** `vigilance` (off by default, needs brains; tests in `matingsight.test.ts`). If an attacker is inside the prey's field of view and sight range, and not hidden by camouflage, the prey defends 1 + vigilance times as well. Wide eyes see more of what is around them, so this is what a wide eye is for.

**Experiment:** `vigilance`, 300,000 ticks, 8 fresh seeds (2701 to 2708), on the reworked grand world, 48 cores, about $1.

| | Eye: plant eaters / others | Eye-diet correlation | Population | Species | Kills | Feeding levels | Meat eaters |
|---|---|---|---|---|---|---|---|
| Grand world | (0.5) | | 1,414 | 8.5 | 2,043 | 1.79 | 0 |
| Eye | 0.68 / **0.84*** | **0.19*** | **-25%*** | -23% | +29% | +8% | 0 |
| Eye + vigilance | 0.65 / **0.73*** | **0.15*** | -14% | -5% | +31% | +8% | 0 |
| Eye + unmuted sight + pull toward prey | **0.83*** / **0.88*** | 0.09 | **-41%*** | **-32%*** | **+59%*** | **+12%*** | 0 |
| The same + vigilance | 0.60 / **0.73*** | **0.24*** | -16% | -17% | +17% | +10% | 0 (1 in three worlds) |

(* holds up, 8 seeds. Eye: 0 widest, 0.5 today's, 1 narrowest.)

- **Eyes now go with diet.** In every setup with the eye gene, mixed and meat eaters end up with narrower eyes than plant eaters, and the link holds up with 8 seeds (strongest, 0.24, with vigilance and the hunting helps). Everyone still drifts somewhat narrower than today's eye: a far, sharp view is useful to all.
- **Vigilance protects the prey world.** It cancels most of the population and species losses that unmuted sight and the pull toward prey cause (population -16% instead of -41%, species -17% instead of -32%), and keeps plant eaters' eyes wider.
- **Unmuted sight and the pull toward prey make the most hunting** (+59% kills, more meat, more feeding levels), at a real cost to the prey world.
- **Still no lasting meat-eating group** in any of the 40 worlds.

### 11c. The full package for a million ticks

**Experiment:** `full-package-long`, 1,000,000 ticks, 16 fresh seeds (2801 to 2816), about 80 minutes on a 32-core machine, about $1.70. The reworked grand world against it with the whole mating-and-sight package:
- the eye gene and vigilance;
- prey sight not scaled by the viewer's diet, and a founder pull toward prey;
- the pickiness gene and mate scent.

**Answer: no lasting meat eaters, in either.**

| | Grand world | Full package |
|---|---|---|
| Worlds with 10+ meat eaters for most of the second half | 0 of 16 | 0 of 16 |
| Biggest short-lived meat-eating group | **249** (others 118 and 52) | 102 |
| Share of animals with a diet above 0.5 | 0.23% | **1.33%** |
| Mixed eaters | 126 | **249** |
| Meat in the diet | 15% | **+14%*** |
| Kills per 1,000 ticks | 2,418 | **+15%*** |
| Feeding levels | 1.99 | 2.00* |
| Population | 1,044 | **-25%*** |
| Lowest population | 421 | **-37%*** |
| Species | 8.7 | **-30%*** |
| Eye, plant eaters / others | (0.5) | 0.81 / 0.85 (correlation 0.10) |
| Pickiness | | 0.42 / 0.43 |

(* holds up, 16 seeds)

- **The reworked grand world grows short-lived meat-eating groups on its own** (up to 249 animals, in 4 of 16 worlds a group of 10 or more at some point), but none lasts. The classic grand world never did.
- **The package pushes the whole population toward meat** (twice the mixed eaters, six times the animals eating mostly meat) but at a clear cost to the prey world (a quarter fewer animals, a third fewer species), and still no lasting meat-eating group.
- **Over a million ticks the eye split fades** (correlation 0.10, against 0.24 at 300,000 ticks): eyes narrow for everyone, and pickiness rises evenly in all diets.
- **So the package is not worth adopting as it is.** What it shows is that more hunting alone does not make a separate meat-eating group: the hunting is done by an ever larger crowd of mixed eaters.

## 12. Predator life: a gut, rest and prey condition

**Built** (all off by default; `predatorlife.test.ts`):
- **The gut** (`gutMode`). Food goes into a stomach and becomes energy over time: `gutDigestRate` x metabolism x body size a tick.
  - Eating speed is set by body size (no longer by metabolism); metabolism sets digestion speed.
  - Plants are bulky, meat is dense. A full stomach eats nothing.
  - Energy in the stomach counts in the books and goes into the carcass if the animal dies.
  - Brains sense how full they are (a new input; brain goldens re-recorded).
- **Rest** (`restSaving`): on a tick it eats nothing, the slower an animal goes, the less its basic upkeep.
- **Prey condition** (`preyCondition`): defense falls with the worst of hunger, sickness, age past prime and youth.
- **The diet ledger now records how animals die:** ran out of energy, killed by a meat eater, or killed by anyone else, plus how fed they were and how old.

**Two bugs found on the way:**
- A tiny energy leak with the gut: a rounding mismatch between claiming food and eating it. Fixed, and the books balance exactly.
- A changed order of additions altered brains-off fingerprints. Fixed: worlds without the gut are bit-for-bit as before.

**Experiment:** `predator-life`, 300,000 ticks, 8 fresh seeds (2901 to 2908), on the reworked grand world, 48 cores, about $1.

**Rest never happened in this run.** As first built, it needed a pace below 0.2, a cliff no brain ever reached (none of 4 million animal-ticks), so "gut + rest" equals "gut", and "all three" is really the gut with prey condition. Rest has since been made graded (slowing a little saves a little) and needs a new run.

| | Meat eaters (8 worlds, second half) | Biggest short-lived group | Diet above 0.5 | Mixed eaters | Meat in the diet | Kills | Metabolism | Population | Species |
|---|---|---|---|---|---|---|---|---|---|
| Grand world | 0 to 2 | 34 | 0.3% | 105 | 15% | 2,519 | 0.98 | 1,291 | 8.4 |
| Gut | 0 to 5 | **657** | **2.6%*** | **407*** | **21%*** | **+42%*** | **0.58** | **-20%*** | **-36%*** |
| Prey condition | 0 to 3 | 96 | 0.6% | 147 | 17%* | +28%* | | -21%* | -16% |
| Gut + prey condition | **0 to 62; one world holds a group** | 149 | **3.9%*** | **377*** | **23%*** | **+48%*** | 0.60 | -20%* | -15% |
| The same + unmuted prey sight and a pull toward prey | 0 to 10 | 81 | **7.2%*** | **575*** | **23%*** | **+49%*** | | -19%* | -10% |

(* holds up, 8 seeds)

**How meat eaters (diet above 0.75) die** (per animal per 1,000 ticks, second half):

| | Deaths | Ran out of energy | Killed by a meat eater | Killed by anyone else | Fed at death |
|---|---|---|---|---|---|
| Grand world | 3.9 | 0.8 | 1.4 | 1.7 | 0.5 |
| Gut | 3.5 | 0.8 | 0.9 | 1.8 | 0.4 |
| Gut + prey condition | 2.3 | 0.4 | **1.5** | 0.3 | 0.5 |
| The same + hunting helps | 2.9 | 0.5 | 1.1 | 1.3 | 0.4 |

- **The gut is the strongest lever on meat eating so far.** Animals eating mostly meat rise nine- to twenty-fivefold, short-lived meat-eating groups reach 657 animals, and with prey condition one world in 8 keeps a meat-eating group through the second half (about 62 animals), the first in the grand world itself.
- **Evolution answers the gut as expected:** metabolism falls from about 1.0 to 0.6, so slower, cheaper bodies digest at leisure.
- **Meat eaters mostly do not starve. They are killed,** often by other meat eaters. Starvation is 15 to 25% of their deaths, they die about half fed, and where a group lasts two thirds of its deaths are kills by other meat eaters. Today nothing makes an armed animal dangerous to attack: defense counts armor and size, not the prey's own weapons.
- **The cost:** about a fifth fewer animals everywhere, and with the gut alone a third fewer species.

### 12b. The gut with prey condition, again; rest and fighting back

**Built:** `fightBack` (off by default; test in `predatorlife.test.ts`): an animal's own attack power, times fightBack, adds to its defense, so armed animals are risky to attack. Rest was made graded (12).

**Experiment:** `predator-life-2`, 300,000 ticks, 8 fresh seeds (3001 to 3008), 48 cores, about $1.

| | Worlds with a lasting meat-eating group | Meat eaters in those worlds | Diet above 0.5 | Metabolism | Population | Species |
|---|---|---|---|---|---|---|
| Grand world | 0 of 8 | | 0.2% | 0.96 | 1,269 | 7.6 |
| Gut + prey condition | **2 of 8** | 96, 31 | 4.0% | 0.62 | -20% | -8% |
| + rest | **3 of 8** | 43, 36, 21 | 5.9% | 0.60 | -19% | -19% |
| + fighting back | **2 of 8** | 134, 31 (14 in a third) | 6.7% | 0.62 | **-31%*** | -25% |
| + rest + fighting back | 0 of 8 | | 4.3% | 0.61 | **-28%*** | -24% |

(A lasting group: 10 or more meat eaters, diet above 0.75, for most of the second half. * holds up.)

**How meat eaters die** (per animal per 1,000 ticks, second half):

| | Deaths | Ran out of energy | Killed by a meat eater | Killed by anyone else |
|---|---|---|---|---|
| Gut + prey condition | 2.4 | 0.7 | **1.6** | 0.2 |
| + rest | 3.0 | 0.4 | **2.0** | 0.6 |
| + fighting back | 2.8 | 0.5 | **2.2** | 0.1 |
| + rest + fighting back | 3.4 | 0.5 | **1.6** | 1.2 |

- **The gut with prey condition reliably grows lasting meat eaters in some grand worlds:** 1 of 8 in 12, 2 of 8 here, with up to about 100 animals. The classic and reworked grand worlds never did. It costs about a fifth of the animals, and species less than the gut alone (-8% against -36%).
- **Rest and fighting back make no clear difference.** 3, 2 and 0 of 8 are within luck for 8 worlds. Whether rest is used at all is not yet measured separately (its savings are counted with torpor's).
- **Meat eaters' main cause of death is still other meat eaters,** about two thirds of their deaths, and fighting back does not change that: when both sides are armed, their weapons cancel out. Starvation is a fifth or less.

### 12c. Hunters choosing the easiest prey

**Built:** `preyChoice` (off by default; tests in `predatorlife.test.ts`). With 1, a hunter goes for the prey in reach with the weakest defense it can judge (armor and size, weapons with `fightBack`, condition with `preyCondition`, vigilance; not herds), not the nearest.

**Experiment:** `prey-choice`, 300,000 ticks, 8 fresh seeds (3101 to 3108), 48 cores, about $1.

| | Worlds with a lasting meat-eating group | Meat eaters in those worlds | Diet above 0.5 | Population | Species |
|---|---|---|---|---|---|
| Grand world | 0 of 8 | | 0.1% | 1,191 | 7.3 |
| Gut + prey condition | **4 of 8** | 125, 112, 83, 50 | 7.3% | -13% | -4% |
| + easiest-prey choice | 1 of 8 | 34 | 3.0% | -7% | -10% |
| + fighting back | **4 of 8** | 105, 85, 68, 47 | 9.0% | -20% | -6% |
| + both | 1 of 8 | 122 | 5.5% | **-26%*** | -11% |

(* holds up, 8 seeds)

- **Choosing the easiest prey makes meat eating rarer, not commoner** (1 of 8 worlds instead of 4). It does not stop meat eaters killing each other (still most of their deaths, 1.6 to 2.1 per animal per 1,000 ticks).
- **The gut with prey condition is the setup that works:** across three screens it kept a lasting meat-eating group in 7 of 24 grand worlds (1, 2 and 4 of 8), against none in 24 for the grand world as it is. Here its cost was small (population -13% and species -4%, neither holding up).
- **Fighting back adds nothing clear.**

### 12d. Confirmation: the gut with prey condition, 16 fresh seeds, 500,000 ticks

**Experiment:** `gut-condition-confirm`, the grand world against the grand world with `gutMode` 1 and `preyCondition` 0.5, seeds 3201 to 3216, 500,000 ticks, 32 cores, about $1.

**The screens over-stated it.** A lasting meat-eating group (10 or more meat eaters in at least half the samples of the second half) formed in **1 of 16** worlds (seed 3216: about 85 meat eaters from 250,000 ticks to the end, 97 at the end). Judged at 300,000 ticks as in the screens it is also 1 of 16. All four experiments together: 8 of 40 worlds, about one in five, and the 8-seed screens were the lucky side of that.

Meat eaters do arise often. In 7 of 16 worlds a group reached 50 or more, sometimes 150 to 300, and in 9 worlds 10 or more were still around after 400,000 ticks. But the groups come and go instead of holding. In the grand world as it is, no group ever passed 41.

| | Grand world | With gut + prey condition |
|---|---|---|
| Worlds with a lasting meat-eating group | 0 of 16 | 1 of 16 |
| Average diet gene | 0.13 | 0.25* |
| Feeding levels | 1.98 | 2.13* (+8%) |
| Mixed eaters (diet 0.25 to 0.5) | 114 | 389 |
| Deaths by starving | 25% | 9%* |
| Population | 1,193 | -19%* |
| Species | 9.3 | **-35%*** (the gap widens over time: 8.2 against 9.3 in the first 50,000 ticks, 6.0 against 9.5 in the last) |
| Species diversity | 1.78 | -23%* |
| Average age | 645 | -42%* |
| Kills | 2,458 per 1,000 ticks | +49%* |

(* holds up, 16 seeds)

How meat eaters die, per animal per 1,000 ticks over the second half: 2.9 deaths, of which **2.0 are killed by other meat eaters**, 0.3 by other animals, and 0.6 run out of energy. Starving is still not the problem; other meat eaters are.

**Verdict:** the gut with prey condition is not a grand-world answer as it stands. It moves the whole world toward mixed eating, with a real extra half feeding level and much less starving. But it costs a third of the species and still rarely holds a meat-eating group. The barrier that remains is meat eaters killing each other.

### 13. Why meat eaters kill each other (kill autopsy)

**Built:** the `meatKills` measure (opt-in, watches every kill, changes nothing; tests in `exp.test.ts`). It notes every kill that involves a meat eater (diet above 0.75), with family ties, gene distance, the victim's age, condition, size, herd and the odds of the attack, whether a carcass was already there, and what else was in the killer's reach. Each sample also notes a baseline for meat eaters and everyone else.

**Experiment:** `meat-kill-autopsy`, the 16 worlds of `gut-condition-confirm` played again (same seeds and settings, the same history: all 16 ended with the same fingerprint), 16 cores, about $0.50. Over the whole run: 136,981 kills of a meat eater by a meat eater, 1,016,936 of other animals by meat eaters, and 25,489 of meat eaters by others.

| | Meat eater kills a meat eater | Meat eater kills another animal |
|---|---|---|
| Victim's size compared with the killer | 0.98 (an equal) | 0.19 (a fifth) |
| Odds of the attack | 0.59 | 0.79 |
| Meat eaters / other prey in the killer's reach at the time | 1.46 / 0.10 | 0.18 / 1.26 |
| Victim a sibling or half-sibling | 18% | 0.2% |
| Victim close enough to count as a relative (within `kinDistance`) | 31% | 0.2% |
| Gene distance | 0.09 | 0.39 |
| Victim under 100 ticks old | 40% | 46% |
| Victim's armor gene | 0.28 | 0.75 |
| A carcass already on the spot | 5% | 4% |

Meat eaters' killers are other meat eaters five times out of six (137,000 against 25,000).

What it shows:
- **Meat eaters live among their own kind.** In a typical sample, 59% of the animals in a meat eater's reach that are small enough to attack are other meat eaters. Babies are born on the parent's spot and the line stays together, so a meat eater's neighbours are mostly its own lineage.
- **A meat eater kills another meat eater when no other prey is in reach.** At those kills there were 1.5 meat eaters and 0.1 other animals in reach. Hunters attack the nearest animal they can, and the nearest is often a cousin.
- **Kin restraint barely works for them.** Meat eaters' tolerance gene averages 0.30, against 0.56 in other animals. Even at full tolerance the rule spares only animals within 0.05 in gene distance, which covers a third of these victims. There is no family recognition beyond parent and young (`spareFamily`).
- **Attacking an equal costs nothing extra.** The fights are between equals at 59% odds. A failed attack costs the same small fixed amount whether the target is a fifth of the attacker's size or its armed sibling, and nobody is ever hurt. Real predators avoid fighting each other mainly because of injury.
- **Not the causes:** fights over carcasses (5%), herds (herd factor about 1.04 for everyone), weak or young victims (about the same as other victims), hunger (killers are about 60% fed in both cases).

The one world that kept a meat-eating group (3216) looks the same in every column. Its meat eaters simply kill far more other prey (478,000 against 72,000).

**Candidate levers** (none built yet):
1. **Injury:** a failed attack hurts the attacker in proportion to the victim's weapons, so attacking an armed equal is dangerous and a small plant eater is not.
2. **Young that move away:** babies leave the parent's spot, so a lineage spreads out instead of living in a clump where cousins are each other's nearest prey.
