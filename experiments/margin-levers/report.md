# margin-levers: comparison report

**Question:** In the grand world, with no help, do meat eaters (diet above 0.75) evolve and last with the two margin levers the diet ledger points to: a fat reserve (banks surplus from a big meal for the lean days between kills; deposit rate 0.5, founders start with a fat gene of 0.3, as fat does not evolve from nothing) and more plant growth (0.18 and 0.24 per tick, against 0.12), so plant eaters breed faster and leave more surplus for hunters, and fat with 0.18 together. 300,000 ticks. An answer: worlds with a lasting group of meat eaters, feeding levels, kills, species and population.

Base world `grand-world`; 300,000 ticks; seeds 2011-2014; 4 arms against `control`; 20 of 20 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 905 | 128 | 785 | 1,086 |
| lowest population | 356 | 195 | 147 | 600 |
| deaths per animal per 1,000 ticks | 1.655 | 0.465 | 1.094 | 2.116 |
| share of deaths by starving | 0.481 | 0.16 | 0.34 | 0.71 |
| share hungry | 0.129 | 0.014 | 0.113 | 0.146 |
| cost per animal per tick | 0.054 | 0.013 | 0.04 | 0.067 |
| share of costs from harmful mutations | 0.202 | 0.007 | 0.196 | 0.208 |
| harmful mutations per animal | 15.8 | 1.004 | 14.4 | 16.8 |
| average diet gene | 0.061 | 0.017 | 0.039 | 0.081 |
| highest diet gene ever | 0.731 | 0.078 | 0.652 | 0.82 |
| meat in the diet | 0.073 | 0.027 | 0.036 | 0.102 |
| kills per 1,000 ticks | 783 | 345 | 344 | 1,102 |
| feeding levels | 1.473 | 0.413 | 1.03 | 1.95 |
| births with two parents | 0.39 | 0.083 | 0.311 | 0.469 |
| sex gene | 0.075 | 0.018 | 0.054 | 0.093 |
| species alive | 4.743 | 1.093 | 3.257 | 5.891 |
| species diversity (Shannon) | 1.225 | 0.264 | 0.836 | 1.403 |
| share of cells in colonies | 0.043 | 0.009 | 0.038 | 0.056 |
| share sick | 0.211 | 0.026 | 0.191 | 0.246 |
| brain connections | 10.3 | 2.404 | 7.133 | 12.6 |
| plants standing (share of capacity) | 0.076 | 0.032 | 0.043 | 0.119 |
| worn ground | 0.142 | 0.021 | 0.126 | 0.17 |
| genes pinned at a limit | 6 | 2.449 | 4 | 9 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_senseRange`, `low_metabolism`, `low_diet`, `low_attack`, `low_bond`, `low_sex`, `low_generosity`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): plantFill (49.8%), hungryShare (-27%).

## Red flags (4)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (2)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **food-024**: kills per 1,000 ticks 783 → 1,858 (3.1 noise units)
- **fat-food-018**: share hungry 0.129 → 0.085 (-3.1 noise units); cost per animal per tick 0.054 → 0.112 (4.3 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (2)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **food-024**: freed `low_metabolism`
- **fat-food-018**: newly pinned `low_fat`; freed `low_metabolism`, `low_attack`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 905): food-024 1,225 (+2.5)

**deaths per animal per 1,000 ticks** (control 1.655): food-024 2.559 (+1.9)

**share hungry** (control 0.129): fat-food-018 0.085 (-3.1), fat 0.093 (-2.5)

**cost per animal per tick** (control 0.054): fat-food-018 0.112 (+4.3)

**meat in the diet** (control 0.073): food-024 0.112 (+1.4)

**kills per 1,000 ticks** (control 783): food-024 1,858 (+3.1), fat-food-018 1,480 (+2)

**births with two parents** (control 0.39): fat-food-018 0.23 (-1.9)

**plants standing (share of capacity)** (control 0.076): food-024 0.109 (+1)

## No clear effect (1)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`food-018`

