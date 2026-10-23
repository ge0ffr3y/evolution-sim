# fat-rework: comparison report

**Question:** Does reworked fat pay off? Grand world without fat, with today's fat, today's fat left out of relatedness, reworked fat (store only true surplus from the breeding level up, draw below half, 90% stored, cheaper to carry, half handed to young, left out of relatedness), reworked fat without the hand-over, reworked fat storing from 80%, and the no-fat path bundle with and without reworked fat. An answer: whether the fat gene now rises instead of falling, and what fat does to survival through lean spells (lowest population), species, brains (connections, hidden units) and meat eaters.

Base world `grand-world`; 300,000 ticks; seeds 2301-2304; 7 arms against `control`; 32 of 32 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 972 | 122 | 798 | 1,081 |
| lowest population | 396 | 222 | 188 | 600 |
| deaths per animal per 1,000 ticks | 1.53 | 0.822 | 1.035 | 2.76 |
| share of deaths by starving | 0.576 | 0.214 | 0.274 | 0.778 |
| share hungry | 0.137 | 0.018 | 0.115 | 0.159 |
| cost per animal per tick | 0.049 | 0.022 | 0.037 | 0.081 |
| share of costs from harmful mutations | 0.205 | 0.02 | 0.19 | 0.233 |
| harmful mutations per animal | 15.1 | 1.33 | 14.1 | 17.1 |
| average diet gene | 0.059 | 0.046 | 0.033 | 0.129 |
| highest diet gene ever | 0.705 | 0.04 | 0.658 | 0.751 |
| meat in the diet | 0.062 | 0.048 | 0.026 | 0.133 |
| kills per 1,000 ticks | 682 | 619 | 235 | 1,598 |
| feeding levels | 1.322 | 0.449 | 1 | 1.97 |
| births with two parents | 0.468 | 0.105 | 0.322 | 0.566 |
| sex gene | 0.092 | 0.04 | 0.056 | 0.137 |
| species alive | 4.379 | 2.02 | 2 | 6.149 |
| species diversity (Shannon) | 1.079 | 0.418 | 0.619 | 1.498 |
| share of cells in colonies | 0.039 | 0.008 | 0.033 | 0.051 |
| share sick | 0.198 | 0.046 | 0.132 | 0.24 |
| brain connections | 10.1 | 1.979 | 8.138 | 12.3 |
| plants standing (share of capacity) | 0.058 | 0.029 | 0.035 | 0.1 |
| worn ground | 0.237 | 0.1 | 0.098 | 0.337 |
| genes pinned at a limit | 6.25 | 2.872 | 2 | 8 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_senseRange`, `low_metabolism`, `low_diet`, `low_attack`, `low_bond`, `low_generosity`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): population (-27.7%), wornShare (26.2%), foulMean (-39%).

## Red flags (12)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (4)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **old-fat-unrelated**: cost per animal per tick 0.049 → 0.121 (3.3 noise units)
- **new-fat-store-from-80**: highest diet gene ever 0.705 → 0.869 (4.1 noise units)
- **path-bundle**: population 972 → 1,600 (5.2 noise units); share of costs from harmful mutations 0.205 → 0.093 (-5.7 noise units); harmful mutations per animal 15.1 → 5.425 (-7.3 noise units); highest diet gene ever 0.705 → 0.955 (6.3 noise units); species alive 4.379 → 13.4 (4.5 noise units)
- **path-bundle-new-fat**: share of costs from harmful mutations 0.205 → 0.092 (-5.8 noise units); harmful mutations per animal 15.1 → 5.518 (-7.2 noise units); highest diet gene ever 0.705 → 0.96 (6.4 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (2)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

- **old-fat**: wornShare still changing by 152% over the last quarter (control 26.2%)
- **path-bundle**: foulMean still changing by 19.2% over the last quarter (control -39%)

### Pinned genes (6)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **old-fat**: newly pinned `low_fat`; freed `low_metabolism`
- **old-fat-unrelated**: newly pinned `low_sex`; freed `low_metabolism`, `low_attack`, `low_generosity`
- **new-fat**: newly pinned `low_sex`
- **new-fat-store-from-80**: newly pinned `low_sex`
- **path-bundle**: freed `low_metabolism`
- **path-bundle-new-fat**: freed `low_metabolism`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 972): path-bundle 1,600 (+5.2), old-fat-unrelated 635 (-2.8), old-fat 764 (-1.7)

**share hungry** (control 0.137): new-fat-store-from-80 0.089 (-2.7), old-fat-unrelated 0.09 (-2.6), old-fat 0.091 (-2.6)

**cost per animal per tick** (control 0.049): old-fat-unrelated 0.121 (+3.3), old-fat 0.096 (+2.2)

**share of costs from harmful mutations** (control 0.205): path-bundle-new-fat 0.092 (-5.8), path-bundle 0.093 (-5.7)

**harmful mutations per animal** (control 15.1): path-bundle 5.425 (-7.3), path-bundle-new-fat 5.518 (-7.2)

**highest diet gene ever** (control 0.705): path-bundle-new-fat 0.96 (+6.4), path-bundle 0.955 (+6.3), new-fat-store-from-80 0.869 (+4.1)

**kills per 1,000 ticks** (control 682): path-bundle 1,691 (+1.6)

**births with two parents** (control 0.468): old-fat-unrelated 0.184 (-2.7), path-bundle-new-fat 0.235 (-2.2), old-fat 0.246 (-2.1), new-fat-no-handover 0.259 (-2), new-fat 0.271 (-1.9)

**species alive** (control 4.379): path-bundle 13.4 (+4.5)

**species diversity (Shannon)** (control 1.079): path-bundle 2.095 (+2.4)

**plants standing (share of capacity)** (control 0.058): old-fat-unrelated 0.116 (+2), old-fat 0.099 (+1.4)

**worn ground** (control 0.237): old-fat 0.023 (-2.1), old-fat-unrelated 0.031 (-2.1)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

