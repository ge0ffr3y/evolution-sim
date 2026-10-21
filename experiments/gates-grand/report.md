# gates-grand: comparison report

**Question:** In the grand world, on top of place memory and learning, does gated working memory raise memory use above chance (instead of erasing it, as the first design did), and does it help (food gathered by age, population, diversity)?

Base world `grand-world`; 300,000 ticks; seeds 1-8; 2 arms against `control`; 24 of 24 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 805 | 188 | 408 | 1,018 |
| lowest population | 254 | 117 | 88 | 427 |
| deaths per animal per 1,000 ticks | 1.489 | 0.493 | 0.92 | 2.247 |
| share of deaths by starving | 0.661 | 0.145 | 0.485 | 0.859 |
| share hungry | 0.18 | 0.012 | 0.158 | 0.195 |
| cost per animal per tick | 0.047 | 0.013 | 0.032 | 0.066 |
| share of costs from harmful mutations | 0.204 | 0.018 | 0.185 | 0.235 |
| harmful mutations per animal | 14.2 | 1.038 | 13.1 | 15.9 |
| average diet gene | 0.034 | 0.017 | 0.016 | 0.065 |
| highest diet gene ever | 0.313 | 0.052 | 0.245 | 0.421 |
| meat in the diet | 0.04 | 0.022 | 0.016 | 0.072 |
| kills per 1,000 ticks | 424 | 269 | 105 | 870 |
| feeding levels | 1.004 | 0.005 | 1 | 1.01 |
| births with two parents | 0.121 | 0.083 | 0.024 | 0.247 |
| sex gene | 0.134 | 0.093 | 0.024 | 0.276 |
| species alive | 2.6 | 0.924 | 2 | 4.673 |
| species diversity (Shannon) | 0.798 | 0.238 | 0.619 | 1.308 |
| share of cells in colonies | 0.02 | 0.004 | 0.016 | 0.026 |
| share sick | 0.192 | 0.067 | 0.042 | 0.262 |
| brain connections | 9.803 | 2.115 | 6.432 | 12.9 |
| plants standing (share of capacity) | 0.098 | 0.095 | 0.035 | 0.273 |
| worn ground | 0.185 | 0.092 | 0.046 | 0.3 |
| genes pinned at a limit | 6.5 | 1.773 | 4 | 9 |

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

## No clear effect (2)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`place-learning`, `place-learning-wm`

