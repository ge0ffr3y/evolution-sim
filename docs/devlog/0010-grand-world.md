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
