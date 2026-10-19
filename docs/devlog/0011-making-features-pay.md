# Devlog 11: Making the new features pay

*Phase 8c. After devlog 10 found that several new features did not evolve on their own, I went back through each one and asked whether it could pay in principle. Some had design flaws of mine; some needed a better world. Result: place memory, torpor, the stress and calm responses and (with harmful mutations plus starting variety) sex now evolve. Fat still does not. Two new ideas from the owner, luck at birth and food sharing, are in too.*

## What changed

- **Graded torpor.** The first version was all or nothing: any organism with the gene above zero stopped moving completely in winter (and still paid full movement cost). A mutant with a tiny gene paid the full price for a tiny saving, so selection removed it. Now an organism slows in proportion to its gene (a gene of 0.3 means 30% slower, with 30% less movement cost and 30% less upkeep), and it only cannot attack at 0.5 or more.
- **Fat as a separate reserve** (replacing the old "bank more before reproducing" version). An organism with surplus energy moves part of it into a fat store (losing 20% as heat) and draws the store back when hungry. Carrying fat costs movement and upkeep in proportion to how much is carried. The stored energy stays in the energy audit and goes into the corpse when the body dies, so energy is still conserved exactly.
- **Place memory** (`homeMode: 3`). "Home" is now the best feeding place the organism remembers: a better meal than any remembered (which fades slowly) makes the spot home. A baby inherits its parent's place. It reuses the three existing home inputs, so no new brain layout.
- **Chemical body effects** (`chemBodyEffects`, two new genes, the 24th and 25th). The stress and calm signals now also act on the body, scaled by a gene for each: stress speeds the animal up and raises its upkeep, calm lowers upkeep and slows it. Neither is a reward: each has a price as well as a use.
- **Lethal, fast-adapting parasites** need no new code: a high `diseaseCost`, narrow target width and fast strain drift do it.

## What emerged

All 12 worlds per arm unless noted. Tests: 500 pass, including energy conservation with fat reserves in corpses.

| Feature | World | Result |
|---|---|---|
| **Torpor** | Hard winters (growth swing 0.8) | Evolves from nothing: mean gene 0.15, up in all 12 worlds. (The old version never evolved, 0.003.) |
| | Harsher (0.95) | 0.19 from nothing in 11 of 11 survivors, 0.40 when seeded |
| | Predator-free, harshest (0.9) | **0.56** from nothing, in all 12 worlds. Lowest winter population 514 against 424 without it (+21%), at the cost of 5% lower average population |
| **Fat** | Same worlds | Does not evolve from nothing (about 0.01 to 0.02 everywhere). When seeded at 0.3 in the predator-free world it persists (mean 0.22) and the lowest winter population is higher (525 against 424), so it helps the group but not the individual that carries it. Torpor beats it when both are available |
| **Place memory** (8 worlds, 150,000 ticks) | Home = best remembered place | **Population 622 against 334** with no home sense; 16.4% of brains wire home straight to steering (against 1.7% and 0.2% for no home and birthplace home). Food per animal is lower (0.108 against 0.168) because more animals share the food |
| **Stress and calm responses** (8 worlds) | From zero | Stress response rises to 0.28 and calm response to 0.22, in all 8 worlds. Population 478 against 334; meat eaters 62 against 102. The signals alone (no body effect) change nothing (320) |
| **Sex** (12 worlds, 200,000 ticks) | Lethal parasites (30 times upkeep), 30% start mate-seeking | Gene holds at its starting level in 4 of 12 worlds (1 of 12 without parasites), does not spread. From zero: none. Milder parasites (10 times): no effect |

## Sex, second attempt: harmful mutations

Sex was the one the owner cared most about, so it got a second go. The diagnosis: in this sim no mutation is ever really bad, so a line that never mixes its genes loses nothing. In real life most mutations do harm, and a line that cannot mix cannot shed them (Muller's ratchet). New optional setting `mutationLoadRate`: 24 spots in the genome can go bad (each new birth risks a few), every bad spot adds 3 to 5% to upkeep, a baby that splits off keeps all its parent's bad spots, and a baby of two parents takes each spot from one parent or the other. Nobody is told that sex helps. Check: with 2 new bad spots per birth an all-asexual world's average load climbs from 2.8 to 8.7 over 60,000 ticks, while an all-sexual world holds at about 3.4.

12 worlds each, 300,000 ticks, mate-seeking gene at 0 to 1:

| World | Gene over time | Births with two parents at the end | Population |
|---|---|---|---|
| No harmful mutations, founders spread 0 to 1 | 0.21 to 0.07 | 4% | 510 |
| 3 bad spots per birth, founders spread 0 to 1 | 0.58 to **0.71** (10 of 12 worlds at 0.76 to 0.9) | **63%** | **1,283** |
| 5 bad spots per birth, founders spread 0 to 1 | 0.55 to **0.78** (11 of 12 worlds) | **70%** | 1,281 |
| 3 bad spots with luck switched on | 0.53 to 0.70 | 59% | 1,339 |
| 5 bad spots, everyone starting at exactly 0.3 | stays at 0.3 | 18% | 1,201 |

- **Sex emerges and spreads, but needs two things together:** a reason (harmful mutations) and starting variety in the propensity (a random spread across the first generation). With everyone starting at the same value the gene just stays there; mutation alone is too weak to find it.
- **Brains do not stop it** (with brains it held at 0.56, 8 of 12 worlds high, 49% of births) but mixing two parents' brains costs a little (4 of 12 worlds lost it, against 2 without brains). Without harmful mutations it collapsed to 0.03 either way.
- **In the full grand world it does not take off yet.** At 60,000 ticks the gene drifts down slowly (0.2 to 0.14). A wider mating range barely changes that; more food (0.08, about 815 animals) keeps it steady at its start (0.25, 21% of births). The grand world has many other pressures at once, and the load may need longer than 60,000 ticks to build from a clean start. Open.

## Luck (developmental noise)

Optional (`luckSpread`): each animal rolls two independent numbers at birth, from a bell curve around 1 (a spread of 0.08 means about two in three are within 8% of normal and almost all within 20%), one multiplying its upkeep and one multiplying the energy it needs to reproduce. Neither is inherited. Both are costs and gates, never gains, so luck cannot create energy (multiplying digestion efficiency would have). Tested: right distribution, right effect, independent, not inherited, conserves energy. It did not slow sex evolving (0.70 against 0.71) and populations were slightly higher (1,339 against 1,283). The inspector shows each animal's luck.

## Food sharing (the generosity gene, the 26th)

Optional (`shareRate`): each tick an animal gives part of its spare energy to up to 2 hungry neighbors within range (the hungriest, or the youngest), 90% arrives and the rest is heat; kin only or anyone. Gifts use everyone's energy at the start of the tick, so processing order changes nothing.

- **Grand world** (6 worlds, 100,000 ticks): little changes. Sharing with relatives holds at about 0.16 and 450,000 energy is shared, but population is 523 against 514; sharing with anyone is slowly selected out (0.10 to 0.05).
- **Seasonal world, isolated** (12 worlds): with the first generation's generosity randomly spread, the gene collapses within 20,000 ticks in every arm (recipients mostly do not carry the generous gene). In predator-free worlds sharing even costs about 5% of the population.
- **Uniform start** (8 worlds): where relatives are defined tightly (0.03) generosity is kept or raised (mean 0.33, one world 0.85); loosely (0.1) it is selected out (0.04); with no predators it disappears (0.005). That fits the biology (help pays only when neighbors carry the same helping gene). It did not clearly help the population (136 against 320), but the kin setting also decides who predators will not attack, so that comparison is confounded.
- **Side effect:** worlds that had sharing early ended with far more animals and no predators taking hold (about 600 against about 100). Not explained.

## What the fat diagnosis showed

In a normal seasonal world the winter population crash (1,600 to 450) is almost all predators: only 5 to 30 animals per 1,000 ticks starve. Fat cannot help against predators and costs about 12% extra upkeep and 29% extra movement to carry. Fat only pays at the population level, and only where starvation is the main killer, and it still loses to torpor, which is cheaper.

## The grand world

The grand world preset now uses place memory, body effects, graded torpor, the fat reserve, deadly fast parasites, harmful mutations, luck and food sharing, with food back at the standard 0.08. Population-size check (4 seeds, 60,000 ticks, 512 x 512, not a long run): food 0.03 gives 280 to 390 animals, 0.05 gives 260 to 920, 0.08 gives 580 to 1,200, and nothing went extinct. At 60,000 ticks the mate-seeking gene had fallen from its 0.3 starting average to 0.04 to 0.25 (it fell to 0.03 in the earlier runs), torpor sat at 0.1 to 0.6, and colonies reached up to 86 at once.

## Next

Open: sex spreads in simple worlds but not yet in the grand world; fat does not evolve; chase (Phase 4); and a long run of the grand world to see whether habitat loyalty, nomads or larger organisms appear. Learning inside a lifetime is still the biggest untried idea.
