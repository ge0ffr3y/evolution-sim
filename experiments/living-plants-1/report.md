# living-plants-1: comparison report

**Question:** Living plants, step 1: in the grand world, do plants that evolve (plantEvolution 1) adapt to the land and diversify on every seed (plants' best temperature follows the local temperature; chemistry spreads from three kinds into many, in patches), and what does that do to the animals: palates, species, plant eaters' breeding, feeding levels and meat eaters? 8 fresh seeds, 300,000 ticks, with the diet ledger.

Base world `grand-world`; 300,000 ticks; seeds 3501-3508; 1 arms against `control`; 16 of 16 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 1,243 | 275 | 966 | 1,748 |
| lowest population | 542 | 78 | 419 | 600 |
| deaths per animal per 1,000 ticks | 3.084 | 1.092 | 1.449 | 4.307 |
| share of deaths by starving | 0.281 | 0.091 | 0.199 | 0.417 |
| share hungry | 0.123 | 0.008 | 0.113 | 0.135 |
| cost per animal per tick | 0.092 | 0.027 | 0.048 | 0.122 |
| share of costs from harmful mutations | 0.087 | 0.006 | 0.081 | 0.1 |
| harmful mutations per animal | 5.593 | 0.166 | 5.328 | 5.763 |
| average diet gene | 0.125 | 0.041 | 0.063 | 0.167 |
| highest diet gene ever | 0.973 | 0.07 | 0.8 | 1 |
| meat in the diet | 0.144 | 0.029 | 0.095 | 0.179 |
| kills per 1,000 ticks | 2,633 | 829 | 1,334 | 3,487 |
| feeding levels | 1.976 | 0.068 | 1.812 | 2.03 |
| births with two parents | 0.334 | 0.067 | 0.26 | 0.452 |
| sex gene | 0.113 | 0.022 | 0.081 | 0.145 |
| species alive | 7.906 | 1.886 | 4.267 | 10 |
| species diversity (Shannon) | 1.648 | 0.202 | 1.206 | 1.836 |
| share of cells in colonies | 0.061 | 0.014 | 0.043 | 0.077 |
| share sick | 0.254 | 0.044 | 0.19 | 0.312 |
| brain connections | 10.6 | 0.715 | 9.714 | 12.1 |
| plants standing (share of capacity) | 0.091 | 0.027 | 0.044 | 0.114 |
| worn ground | 0.073 | 0.092 | 0 | 0.265 |
| genes pinned at a limit | 3.375 | 1.768 | 2 | 6 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_bond`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): wornShare (127%).

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

**share hungry** (control 0.123): living-plants 0.143 (+2.4)

**meat in the diet** (control 0.144): living-plants 0.11 (-1.2)

**feeding levels** (control 1.976): living-plants 1.828 (-2.2)

**sex gene** (control 0.113): living-plants 0.088 (-1.2)

**brain connections** (control 10.6): living-plants 11.9 (+1.8)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

