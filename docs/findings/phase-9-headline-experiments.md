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
