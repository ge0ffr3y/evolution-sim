# Devlog 10: The grand world (work in progress)

*Phase 8b. Evolvable social genes, richer environments, memory and chemical signals for brains, and colonies with brains, all in one large world. This file is filled in as each step lands.*

## Step 1: big-world benchmark

`npm run bench -w apps/runner -- --sizes 512,1024 --config configs/brains-evolvable.json --set foodRegrowPerTick=0.02` now works. Speed is not the blocker for a big world: about 4 million organism-ticks per second with brains. A 1024 x 1024 world with brains and standard food (about 20,000 animals) runs at roughly 190 ticks per second; with sparse food (0.02, about 5,500 animals) about 660 ticks per second.

## Step 2: kin tolerance as a gene (the 19th gene)

With `kinTolerance` on, how close a relative has to be before an organism spares it is a gene (times `kinDistance`), starting at 0 (attack anyone) and costing a little upkeep on the sensing line. 12 seeds per arm, 200,000 ticks, standard world without brains:

| World | Worlds with predators | Kills per 1,000 ticks (median) | Meat eaters at end (mean) |
|---|---|---|---|
| No kin recognition (control) | 12 of 12 | 3,358 | 119 |
| Fixed kin restraint 0.1, no herd bonus | 4 of 12 | 41 | 0.2 |
| **Tolerance gene, no herd bonus** | **11 of 12** | 1,752 | 23 |
| Tolerance gene, wider reach (0.2), no herd bonus | 10 of 12 | 271 | 4 |
| Fixed kin 0.1 with the selfish-herd bonus (1.5) | 1 of 12 | 17 | 4 |
| Herd bonus only (tolerance forced to stay 0) | 1 of 12 | 7 | 0 |

- Making tolerance a gene brings predators back (from 4 of 12 worlds to 11 of 12). Evolved tolerance settles around 0.1 to 0.2.
- **The bigger finding is that the selfish-herd bonus is what stops predators**, not kin restraint: herd bonus alone leaves predators in 1 of 12 worlds. Devlog 7 blamed kin recognition; the herd defense it was always paired with is the stronger cause. A small herd bonus is needed for worlds that should have a food web.

## Step 3: sex as a gene (the 20th gene), mostly a null result

With `sexualReproduction: 2`, every time an organism is ready it either splits in two or looks for a mate, with the gene as the chance. 12 seeds per arm, 200,000 ticks, starting with no mate-seeking:

- **It does not emerge.** The gene stays at its floor (about 0.03) in every world, with plain, disease, seasonal and disease-plus-seasonal worlds. Sexual births are under 2% of all births.
- **Letting any ready neighbor be a mate** (`sexAcceptAny`, so a rare mate-seeker is not stuck waiting for another) did not change that.
- **It does not spread even when seeded.** Starting a third of the population with the gene, it fell to 5 to 7% of the original within 120,000 ticks. Disease plus seasons slowed the decline (final gene mean 0.07 against 0.05) and a few worlds kept it (up to 0.27). A severe disease (transmission 0.6, three times the upkeep) did not change this (0.064 against 0.03 without seeding; one world at 0.36).
- Likely reasons (not tested): finding a ready, compatible mate within range is slow in a sparse world, so a mate-seeker spends its short life waiting; and with predators most animals die young. So sex has no way in here without a stronger or longer-lasting advantage.

## Step 4: weather, harsh and mild years, fat and torpor (the 21st and 22nd genes)

All optional and off by default (the old worlds and their golden fingerprints are unchanged):

- **Weather fronts.** Smooth warm and cold patches (up to a set size, such as 0.15 on the 0 to 1 temperature scale) drift east and south across the world and slowly change shape, so one region has a good spell while another has a bad one. They show on the Temperature map layer.
- **Harsh and mild years.** Each year's seasonal swing is stretched or shrunk by a fixed scramble of the year number. A harsh year can stop plant growth, but never makes it negative (a first version let it, and every world went extinct).
- **Fat gene.** A fat body banks more energy before reproducing, but costs more to move and keep.
- **Torpor gene.** Where plants are growing at less than a third of full speed, a dormant organism does not move or attack and burns less. Having the machinery costs upkeep all the time.
- With the winters set so that plants stop growing (seasonal growth swing 0.8, temperature swing 0.25), populations swing hard: the standard deviation is 0.6 of the average, with the population falling to about a tenth of its peak every winter. That is the "boom and crash" you asked for.

**Did the storage genes evolve?** 12 worlds per arm, 300,000 ticks:

| World | Extinct | Mean fat gene | Mean torpor gene |
|---|---|---|---|
| Hard winters (growth swing 0.8), no storage genes | 0 of 12 | n/a | n/a |
| + fat, starting at 0 | 0 of 12 | 0.02 | n/a |
| + torpor, starting at 0 | 0 of 12 | n/a | 0.003 |
| + torpor, 30% of the first generation have it | 0 of 12 | n/a | 0.20 (kept at 0.36 to 0.76 in 5 worlds, lost in the other 7) |
| Even harsher winters (plus weather and harsh years): none seeded | 36 of 36 | | |
| Even harsher winters: fat and torpor both seeded at 30% | 10 of 12 | 0.10 | 0.79 (the two survivors) |

- **Fat does not pay.** It never rose above 0.04, in any world.
- **Torpor does not evolve from nothing,** even though winter is lethal enough that it should help. When it was seeded it survived in about 40% of worlds, and it was the only thing that kept a population alive in the harshest winters (2 of 12 worlds survived with torpor present, none of 36 without it). So it is a real adaptation, but the first dormancy mutations are too weak or too rare to take hold before a hard winter wipes everyone out.

## Step 6: brain memory and a sense of home (brain layout changed)

Optional and off by default. The brain layout grew: new inputs for the direction and distance of home, four memory cells (what the brain wrote last time comes back as an input), four chemical signals (step 7), four memory outputs, and room for 16 hidden units and 512 connections. That changed every brain world, so the five brain-world reference results were re-recorded (brains-off worlds are unchanged).

- **Home.** An organism can sense which way and how far its birthplace is (mode 1), or a place its whole lineage shares (mode 2, a baby inherits its parent's home).
- **Memory.** A brain can wire a memory cell to itself to keep a value, or count. Tested by hand-wiring a brain whose memory builds up each time it thinks, which a memoryless brain cannot do.

## Step 7: chemical signals

Optional. Four slow internal signals that the brain can read, with no reward for having them:

- **Reward:** jumps when the organism eats and fades.
- **Stress:** jumps when it is attacked (hit or miss), when it is starving or sick.
- **Bond:** rises with relatives (or bonded neighbors) close by.
- **Calm:** high when well fed and unstressed.

A brain that reads at least one pays a small extra upkeep. Nothing is paid for having them: they only tell the brain things about the recent past it could not otherwise know.

**Do evolved brains use the new inputs?** 8 worlds each, 150,000 ticks, brains with everything on against brains with the inputs always at zero (the zero-input worlds measure how much connecting to an input is just random leftovers):

| Input | Brains reading it (on) | (inputs at zero) |
|---|---|---|
| Home (any of three) | 5.9% | 15.7% |
| Memory (any cell read, and written back) | 16.8% | 14.9% |
| Reward | 11.8% (one world at 88%) | 4.7% |
| Stress | 1.6% | 3.4% |
| Bond | 0.4% | 9.0% |
| Calm | 20.2% (two worlds at 100% and 45%) | 0.7% |

So there is **no sign that evolution uses home or memory**, and bonding and stress go unused. Reward and calm are used in a few worlds (3 of 8), where they come to be read by most of the population. This is the same story as the Phase 7 senses: the relatives senses did evolve use, the others mostly did not. Memory and home, the main tools for habitat loyalty and nomads, are not picking up here. The likely reason is that a plain-food world gives a brain nothing to remember or return to; plant types in step 5 are meant to change that.

## Step 8: colonies whose cells have brains

The rule that colonies needed brains off is gone. Every cell keeps its own brain, and the bond springs and shared heading pull the colony together. Tested: two bonded cells whose brains want to go opposite ways stay together; a world of colonies with brains, memory and chemicals is deterministic, conserves energy and matter exactly, keeps its bonds consistent and saves and reloads exactly. **Not yet tested:** whether colonies with brains do better or worse than colonies without.
