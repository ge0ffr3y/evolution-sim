# wm-test: comparison report

**Question:** In the learning test world (food that moves with the seasons, learning and place memory on), does working memory evolve (the gene rises from a low start), do brains use their memory more, and does it help? Which part matters: holding a value over time, or simply having the cells? Does it need learning?

Base world `learning-test`; 200,000 ticks; seeds 1-8; 4 arms against `control`; 40 of 40 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 496 | 151 | 305 | 731 |
| lowest population | 97.8 | 53.7 | 38 | 198 |
| deaths per animal per 1,000 ticks | 1.661 | 0.649 | 0.849 | 2.888 |
| share of deaths by starving | 0.545 | 0.198 | 0.203 | 0.849 |
| share hungry | 0.167 | 0.076 | 0.061 | 0.274 |
| cost per animal per tick | 0.05 | 0.012 | 0.029 | 0.064 |
| share of costs from harmful mutations | 0 | 0 | 0 | 0 |
| harmful mutations per animal | 0 | 0 | 0 | 0 |
| average diet gene | 0.067 | 0.028 | 0.037 | 0.118 |
| highest diet gene ever | 0.9 | 0.282 | 0.204 | 1 |
| meat in the diet | 0.089 | 0.051 | 0.035 | 0.17 |
| kills per 1,000 ticks | 388 | 266 | 82.5 | 820 |
| feeding levels | 1.387 | 0.336 | 1 | 2.04 |
| births with two parents | 0 | 0 | 0 | 0 |
| sex gene | 0 | 0 | 0 | 0 |
| species alive | 2.054 | 0.747 | 1 | 2.95 |
| species diversity (Shannon) | 0.392 | 0.297 | 0 | 0.867 |
| share of cells in colonies | 0 | 0 | 0 | 0 |
| share sick | 0 | 0 | 0 | 0 |
| brain connections | 7.279 | 1.06 | 5.502 | 8.552 |
| plants standing (share of capacity) | 0.157 | 0.079 | 0.039 | 0.289 |
| worn ground | 0 | 0 | 0 | 0 |
| genes pinned at a limit | 3.5 | 1.069 | 2 | 5 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_diet`, `low_attack`.

## Red flags (3)

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

### Pinned genes (3)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **wm-no-learning**: newly pinned `low_senseRange`
- **cells-only**: newly pinned `low_senseRange`
- **free-wm**: newly pinned `low_senseRange`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**brain connections** (control 7.279): free-wm 5.68 (-1.5), no-wm 5.839 (-1.4)

## No clear effect (2)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`wm-no-learning`, `cells-only`

