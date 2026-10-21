# gates-test: comparison report

**Question:** With working memory redesigned so the brain decides each thought whether to hold or overwrite each memory cell (hold gates), in the learning test world: do brains wire the gates and use their memory above chance, does the working memory gene rise, and does it help? Does it need learning, and does a shorter hold change it?

Base world `learning-test`; 200,000 ticks; seeds 1-8; 4 arms against `control`; 40 of 40 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 386 | 156 | 155 | 632 |
| lowest population | 75.6 | 27.7 | 44 | 117 |
| deaths per animal per 1,000 ticks | 1.838 | 0.664 | 1.078 | 2.991 |
| share of deaths by starving | 0.446 | 0.243 | 0.213 | 0.865 |
| share hungry | 0.181 | 0.047 | 0.124 | 0.264 |
| cost per animal per tick | 0.049 | 0.008 | 0.037 | 0.06 |
| share of costs from harmful mutations | 0 | 0 | 0 | 0 |
| harmful mutations per animal | 0 | 0 | 0 | 0 |
| average diet gene | 0.079 | 0.019 | 0.056 | 0.106 |
| highest diet gene ever | 0.988 | 0.034 | 0.904 | 1 |
| meat in the diet | 0.09 | 0.046 | 0.031 | 0.162 |
| kills per 1,000 ticks | 381 | 267 | 98.8 | 868 |
| feeding levels | 1.481 | 0.319 | 1.01 | 1.832 |
| births with two parents | 0 | 0 | 0 | 0 |
| sex gene | 0 | 0 | 0 | 0 |
| species alive | 1.723 | 0.369 | 1 | 2.04 |
| species diversity (Shannon) | 0.256 | 0.146 | 0 | 0.448 |
| share of cells in colonies | 0 | 0 | 0 | 0 |
| share sick | 0 | 0 | 0 | 0 |
| brain connections | 6.647 | 1.669 | 4.892 | 10 |
| plants standing (share of capacity) | 0.188 | 0.085 | 0.095 | 0.335 |
| worn ground | 0 | 0 | 0 | 0 |
| genes pinned at a limit | 3.5 | 0.756 | 3 | 5 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_senseRange`, `low_diet`, `low_attack`.

## Red flags (1)

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

### Pinned genes (1)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **free-wm**: newly pinned `low_palate`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

## No clear effect (4)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`no-wm`, `wm-no-learning`, `short-hold`, `free-wm`

