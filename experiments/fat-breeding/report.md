# fat-breeding: comparison report

**Question:** Does letting fat pay for breeding (fatBreeding: fat counts as breeding capital, and nothing is banked while seeking a mate) remove the cost of fat to sex and make fat a gain for the world? Grand world without fat, with reworked fat, and with reworked fat that pays for breeding; the no-fat path bundle and the path bundle with fat that pays for breeding. 8 fresh seeds, 300,000 ticks. An answer: births with two parents, the fat gene, population and its low point, species, brains and meat eaters.

Base world `grand-world`; 300,000 ticks; seeds 2401-2408; 4 arms against `control`; 40 of 40 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 938 | 89.5 | 770 | 1,043 |
| lowest population | 319 | 61.6 | 230 | 393 |
| deaths per animal per 1,000 ticks | 1.785 | 0.535 | 1.227 | 2.941 |
| share of deaths by starving | 0.463 | 0.091 | 0.312 | 0.584 |
| share hungry | 0.127 | 0.009 | 0.112 | 0.138 |
| cost per animal per tick | 0.057 | 0.018 | 0.035 | 0.094 |
| share of costs from harmful mutations | 0.207 | 0.012 | 0.188 | 0.225 |
| harmful mutations per animal | 16.1 | 0.669 | 15.1 | 17.4 |
| average diet gene | 0.071 | 0.029 | 0.047 | 0.135 |
| highest diet gene ever | 0.796 | 0.134 | 0.62 | 1 |
| meat in the diet | 0.08 | 0.024 | 0.056 | 0.121 |
| kills per 1,000 ticks | 900 | 325 | 526 | 1,556 |
| feeding levels | 1.501 | 0.299 | 1.218 | 1.98 |
| births with two parents | 0.392 | 0.068 | 0.303 | 0.509 |
| sex gene | 0.072 | 0.018 | 0.056 | 0.101 |
| species alive | 5.356 | 1.15 | 3.178 | 6.921 |
| species diversity (Shannon) | 1.314 | 0.272 | 0.843 | 1.672 |
| share of cells in colonies | 0.042 | 0.01 | 0.028 | 0.054 |
| share sick | 0.201 | 0.026 | 0.143 | 0.223 |
| brain connections | 11.1 | 2.005 | 9.553 | 14.6 |
| plants standing (share of capacity) | 0.07 | 0.023 | 0.041 | 0.111 |
| worn ground | 0.151 | 0.123 | 0.027 | 0.337 |
| genes pinned at a limit | 6.125 | 2.1 | 2 | 8 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_senseRange`, `low_attack`, `low_bond`, `low_sex`, `low_generosity`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): cost_total (18.1%), cost_load (14.8%).

## Red flags (4)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (2)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **path-bundle**: population 938 → 1,231 (3.3 noise units); share of costs from harmful mutations 0.207 → 0.085 (-10 noise units); harmful mutations per animal 16.1 → 5.606 (-15.6 noise units); kills per 1,000 ticks 900 → 2,561 (5.1 noise units)
- **path-bundle-fat-breeding**: population 938 → 1,329 (4.4 noise units); lowest population 319 → 523 (3.3 noise units); share of costs from harmful mutations 0.207 → 0.087 (-9.8 noise units); harmful mutations per animal 16.1 → 5.561 (-15.7 noise units); kills per 1,000 ticks 900 → 2,410 (4.6 noise units); species alive 5.356 → 10.8 (4.7 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (2)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **new-fat**: newly pinned `low_metabolism`, `low_diet`
- **fat-breeding**: newly pinned `low_metabolism`, `low_diet`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 938): path-bundle-fat-breeding 1,329 (+4.4), path-bundle 1,231 (+3.3)

**lowest population** (control 319): path-bundle-fat-breeding 523 (+3.3), path-bundle 478 (+2.6)

**deaths per animal per 1,000 ticks** (control 1.785): path-bundle 2.916 (+2.1)

**share of deaths by starving** (control 0.463): path-bundle 0.272 (-2.1), path-bundle-fat-breeding 0.301 (-1.8), new-fat 0.595 (+1.5)

**share hungry** (control 0.127): fat-breeding 0.136 (+1)

**cost per animal per tick** (control 0.057): path-bundle 0.085 (+1.5)

**share of costs from harmful mutations** (control 0.207): path-bundle 0.085 (-10), path-bundle-fat-breeding 0.087 (-9.8)

**harmful mutations per animal** (control 16.1): path-bundle-fat-breeding 5.561 (-15.7), path-bundle 5.606 (-15.6), new-fat 15.1 (-1.5)

**average diet gene** (control 0.071): path-bundle 0.127 (+1.9), new-fat 0.041 (-1)

**highest diet gene ever** (control 0.796): path-bundle-fat-breeding 0.945 (+1.1)

**meat in the diet** (control 0.08): path-bundle 0.149 (+2.9), path-bundle-fat-breeding 0.142 (+2.6), new-fat 0.046 (-1.4)

**kills per 1,000 ticks** (control 900): path-bundle 2,561 (+5.1), path-bundle-fat-breeding 2,410 (+4.6), new-fat 498 (-1.2)

**feeding levels** (control 1.501): path-bundle 1.975 (+1.6), path-bundle-fat-breeding 1.972 (+1.6), new-fat 1.161 (-1.1)

**sex gene** (control 0.072): path-bundle-fat-breeding 0.115 (+2.4), path-bundle 0.112 (+2.2)

**species alive** (control 5.356): path-bundle-fat-breeding 10.8 (+4.7)

**species diversity (Shannon)** (control 1.314): path-bundle-fat-breeding 1.883 (+2.1)

**share of cells in colonies** (control 0.042): path-bundle-fat-breeding 0.059 (+1.7), path-bundle 0.058 (+1.7)

**share sick** (control 0.201): path-bundle 0.257 (+2.1)

**genes pinned at a limit** (control 6.125): path-bundle 2.5 (-1.7), path-bundle-fat-breeding 3.375 (-1.3)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

