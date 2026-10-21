# place-test: comparison report

**Question:** In a world where food moves with the seasons, does place memory evolve (the gene rises from a low start), do animals use it (brains wired to the place sense and to memory above chance), and does it help them (food gathered, especially by older animals; population)? Does it need learning?

Base world `learning-test`; 200,000 ticks; seeds 1-8; 4 arms against `control`; 40 of 40 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 452 | 218 | 237 | 951 |
| lowest population | 89.1 | 49.9 | 24 | 161 |
| deaths per animal per 1,000 ticks | 2.114 | 0.701 | 0.886 | 3.141 |
| share of deaths by starving | 0.384 | 0.266 | 0.111 | 0.938 |
| share hungry | 0.135 | 0.032 | 0.076 | 0.182 |
| cost per animal per tick | 0.052 | 0.014 | 0.035 | 0.071 |
| share of costs from harmful mutations | 0 | 0 | 0 | 0 |
| harmful mutations per animal | 0 | 0 | 0 | 0 |
| average diet gene | 0.095 | 0.031 | 0.046 | 0.136 |
| highest diet gene ever | 0.99 | 0.027 | 0.922 | 1 |
| meat in the diet | 0.125 | 0.052 | 0.03 | 0.194 |
| kills per 1,000 ticks | 519 | 243 | 52.3 | 753 |
| feeding levels | 1.655 | 0.379 | 1 | 2.089 |
| births with two parents | 0 | 0 | 0 | 0 |
| sex gene | 0 | 0 | 0 | 0 |
| species alive | 2.235 | 0.438 | 1.535 | 2.723 |
| species diversity (Shannon) | 0.53 | 0.189 | 0.236 | 0.764 |
| share of cells in colonies | 0 | 0 | 0 | 0 |
| share sick | 0 | 0 | 0 | 0 |
| brain connections | 5.839 | 0.904 | 4.789 | 7.296 |
| plants standing (share of capacity) | 0.198 | 0.106 | 0.027 | 0.34 |
| worn ground | 0 | 0 | 0 | 0 |
| genes pinned at a limit | 3.375 | 0.744 | 2 | 4 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_diet`, `low_attack`.

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

- **no-place**: newly pinned `low_senseRange`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**brain connections** (control 5.839): no-place 6.972 (+1.3)

## No clear effect (3)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`place-no-learning`, `none`, `free-place`

