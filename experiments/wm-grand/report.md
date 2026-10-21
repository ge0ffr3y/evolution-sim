# wm-grand: comparison report

**Question:** In the grand world, on top of place memory and learning (the first setup in which brains used their memory above chance), does working memory evolve, raise memory use, and help (population, lifespan, food gathered by age, diversity)?

Base world `grand-world`; 300,000 ticks; seeds 1-8; 2 arms against `control`; 24 of 24 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 807 | 156 | 527 | 986 |
| lowest population | 293 | 117 | 101 | 411 |
| deaths per animal per 1,000 ticks | 1.277 | 0.447 | 0.76 | 1.968 |
| share of deaths by starving | 0.75 | 0.137 | 0.55 | 0.907 |
| share hungry | 0.184 | 0.022 | 0.162 | 0.218 |
| cost per animal per tick | 0.042 | 0.008 | 0.03 | 0.056 |
| share of costs from harmful mutations | 0.21 | 0.021 | 0.176 | 0.246 |
| harmful mutations per animal | 14.2 | 1.057 | 13 | 15.9 |
| average diet gene | 0.028 | 0.01 | 0.017 | 0.046 |
| highest diet gene ever | 0.304 | 0.069 | 0.202 | 0.406 |
| meat in the diet | 0.029 | 0.017 | 0.013 | 0.055 |
| kills per 1,000 ticks | 273 | 212 | 66.9 | 645 |
| feeding levels | 1.016 | 0.035 | 1 | 1.099 |
| births with two parents | 0.101 | 0.063 | 0.041 | 0.24 |
| sex gene | 0.109 | 0.069 | 0.042 | 0.262 |
| species alive | 2.22 | 0.557 | 1.356 | 3.03 |
| species diversity (Shannon) | 0.561 | 0.309 | 0.06 | 1.055 |
| share of cells in colonies | 0.032 | 0.014 | 0.017 | 0.063 |
| share sick | 0.166 | 0.089 | 0.023 | 0.247 |
| brain connections | 9.464 | 1.591 | 7.781 | 12.4 |
| plants standing (share of capacity) | 0.102 | 0.106 | 0.033 | 0.279 |
| worn ground | 0.218 | 0.113 | 0.045 | 0.39 |
| genes pinned at a limit | 7.75 | 1.982 | 5 | 11 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_senseRange`, `low_diet`, `low_attack`, `low_bond`, `low_generosity`.

## Red flags (0)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (0)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

None.

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (0)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

None.

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**share of deaths by starving** (control 0.75): place-learning-wm 0.581 (-1.2)

**cost per animal per tick** (control 0.042): place-learning-wm 0.051 (+1.1)

**meat in the diet** (control 0.029): place-learning-wm 0.047 (+1.1)

**kills per 1,000 ticks** (control 273): place-learning-wm 530 (+1.2)

## No clear effect (1)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`place-learning`

