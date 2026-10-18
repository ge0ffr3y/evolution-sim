# Devlog 11: Making the new features pay

*Phase 8c. After devlog 10 found that several new features did not evolve on their own, I went back through each one and asked whether it could pay in principle. Some had design flaws of mine; some needed a better world. Result: place memory, torpor and the stress and calm responses now evolve. Sex only partly. Fat still does not.*

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

## What the fat diagnosis showed

In a normal seasonal world the winter population crash (1,600 to 450) is almost all predators: only 5 to 30 animals per 1,000 ticks starve. Fat cannot help against predators and costs about 12% extra upkeep and 29% extra movement to carry. Fat only pays at the population level, and only where starvation is the main killer, and it still loses to torpor, which is cheaper.

## The grand world

The grand world preset now uses place memory, body effects, graded torpor, the fat reserve and deadly fast parasites, with food at 0.05. Population-size check (4 seeds, 60,000 ticks, 512 x 512, not a long run): food 0.03 gives 280 to 390 animals, 0.05 gives 260 to 920, 0.08 gives 580 to 1,200, and nothing went extinct. At 60,000 ticks the mate-seeking gene had fallen from its 0.3 starting average to 0.04 to 0.25 (it fell to 0.03 in the earlier runs), torpor sat at 0.1 to 0.6, and colonies reached up to 86 at once.

## Next

Open: sex still does not spread; fat does not evolve; chase (Phase 4); and a long run of the grand world to see whether habitat loyalty, nomads or larger organisms appear. Learning inside a lifetime is still the biggest untried idea.
