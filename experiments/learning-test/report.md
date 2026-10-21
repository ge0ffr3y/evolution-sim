# learning-test: comparison report

**Question:** In a world where food moves with the seasons, does lifetime learning evolve (the learning gene rises from a low start), do learners gather more food as they age, do brains start using memory and the new senses, and which parts (learning, its senses, its cost) matter?

Base world `learning-test`; 200,000 ticks; seeds 1-8; 4 arms against `control`; 40 of 40 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 381 | 92.7 | 213 | 526 |
| lowest population | 83.9 | 63.2 | 16 | 214 |
| deaths per animal per 1,000 ticks | 2.193 | 0.899 | 0.608 | 3.511 |
| share of deaths by starving | 0.336 | 0.209 | 0.187 | 0.826 |
| share hungry | 0.147 | 0.063 | 0.059 | 0.281 |
| cost per animal per tick | 0.051 | 0.02 | 0.028 | 0.077 |
| share of costs from harmful mutations | 0 | 0 | 0 | 0 |
| harmful mutations per animal | 0 | 0 | 0 | 0 |
| average diet gene | 0.093 | 0.032 | 0.037 | 0.13 |
| highest diet gene ever | 1 | 0 | 1 | 1 |
| meat in the diet | 0.119 | 0.051 | 0.021 | 0.178 |
| kills per 1,000 ticks | 565 | 310 | 55.6 | 1,132 |
| feeding levels | 1.615 | 0.359 | 1 | 2.069 |
| births with two parents | 0 | 0 | 0 | 0 |
| sex gene | 0 | 0 | 0 | 0 |
| species alive | 1.765 | 0.521 | 1 | 2.624 |
| species diversity (Shannon) | 0.264 | 0.209 | 0 | 0.663 |
| share of cells in colonies | 0 | 0 | 0 | 0 |
| share sick | 0 | 0 | 0 | 0 |
| brain connections | 6.972 | 0.752 | 5.855 | 8.058 |
| plants standing (share of capacity) | 0.197 | 0.082 | 0.093 | 0.325 |
| worn ground | 0 | 0 | 0 | 0 |
| genes pinned at a limit | 3.75 | 1.669 | 2 | 6 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_senseRange`, `low_diet`, `low_attack`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): shannon (70.4%).

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

**species alive** (control 1.765): no-senses 2.694 (+1.8)

**species diversity (Shannon)** (control 0.264): no-senses 0.652 (+1.9)

**brain connections** (control 6.972): no-senses 6.026 (-1.3)

## No clear effect (3)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`no-learning`, `neither`, `free-learning`

