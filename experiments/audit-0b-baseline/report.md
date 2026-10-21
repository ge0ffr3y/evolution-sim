# audit-0b-baseline: comparison report

**Question:** Over 1,000,000 ticks, does the updated grand world (nutrients through food, a mutation-rate floor, rare big mutations) settle down or keep drifting, what range does it span across 16 seeds, do true meat eaters emerge given time, and how does it compare with the grand world before those three changes?

Base world `grand-world`; 1,000,000 ticks; seeds 201-216; 1 arms against `before`; 32 of 32 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`before`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 759 | 70.5 | 607 | 867 |
| lowest population | 222 | 85.8 | 101 | 427 |
| deaths per animal per 1,000 ticks | 1.026 | 0.224 | 0.809 | 1.739 |
| share of deaths by starving | 0.87 | 0.108 | 0.546 | 0.958 |
| share hungry | 0.212 | 0.029 | 0.173 | 0.265 |
| cost per animal per tick | 0.034 | 0.003 | 0.03 | 0.043 |
| share of costs from harmful mutations | 0.187 | 0.011 | 0.171 | 0.209 |
| harmful mutations per animal | 12.9 | 0.898 | 11.7 | 14.9 |
| average diet gene | 0.019 | 0.007 | 0.012 | 0.038 |
| highest diet gene ever | 0.289 | 0.059 | 0.193 | 0.419 |
| meat in the diet | 0.017 | 0.011 | 0.007 | 0.054 |
| kills per 1,000 ticks | 112 | 130 | 32.7 | 550 |
| feeding levels | 1 | 0 | 1 | 1 |
| births with two parents | 0.181 | 0.111 | 0.028 | 0.384 |
| sex gene | 0.199 | 0.122 | 0.033 | 0.422 |
| species alive | 2.412 | 0.765 | 1.158 | 3.97 |
| species diversity (Shannon) | 0.689 | 0.254 | 0.016 | 1.146 |
| share of cells in colonies | 0.015 | 0.004 | 0.01 | 0.024 |
| share sick | 0.142 | 0.019 | 0.112 | 0.189 |
| brain connections | 9.423 | 1.341 | 6.529 | 11 |
| plants standing (share of capacity) | 0.051 | 0.059 | 0.025 | 0.268 |
| worn ground | 0.553 | 0.088 | 0.344 | 0.658 |
| genes pinned at a limit | 8.938 | 1.482 | 6 | 12 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_senseRange`, `low_metabolism`, `low_diet`, `low_attack`, `low_armor`, `low_bond`, `low_generosity`.

## Red flags (2)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (1)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **grand**: deaths per animal per 1,000 ticks 1.026 → 1.917 (4 noise units); share of deaths by starving 0.87 → 0.406 (-4.3 noise units); share hungry 0.212 → 0.12 (-3.2 noise units); cost per animal per tick 0.034 → 0.063 (8.6 noise units); harmful mutations per animal 12.9 → 16.2 (3.7 noise units); average diet gene 0.019 → 0.082 (9.1 noise units); highest diet gene ever 0.289 → 0.846 (9.4 noise units); meat in the diet 0.017 → 0.089 (6.4 noise units); kills per 1,000 ticks 112 → 914 (6.2 noise units); species alive 2.412 → 5.444 (4 noise units); share of cells in colonies 0.015 → 0.04 (6.5 noise units); worn ground 0.553 → 0.27 (-3.2 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (1)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **grand**: newly pinned `low_sex`; freed `low_armor`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**deaths per animal per 1,000 ticks** (control 1.026): grand 1.917 (+4)

**share of deaths by starving** (control 0.87): grand 0.406 (-4.3)

**share hungry** (control 0.212): grand 0.12 (-3.2)

**cost per animal per tick** (control 0.034): grand 0.063 (+8.6)

**share of costs from harmful mutations** (control 0.187): grand 0.203 (+1.4)

**harmful mutations per animal** (control 12.9): grand 16.2 (+3.7)

**average diet gene** (control 0.019): grand 0.082 (+9.1)

**highest diet gene ever** (control 0.289): grand 0.846 (+9.4)

**meat in the diet** (control 0.017): grand 0.089 (+6.4)

**kills per 1,000 ticks** (control 112): grand 914 (+6.2)

**births with two parents** (control 0.181): grand 0.411 (+2.1)

**sex gene** (control 0.199): grand 0.074 (-1)

**species alive** (control 2.412): grand 5.444 (+4)

**species diversity (Shannon)** (control 0.689): grand 1.309 (+2.4)

**share of cells in colonies** (control 0.015): grand 0.04 (+6.5)

**worn ground** (control 0.553): grand 0.27 (-3.2)

**genes pinned at a limit** (control 8.938): grand 5.375 (-2.4)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

