# phase-11-package: comparison report

**Question:** Phase 11, the whole brain package in the grand world: deeper brains (32 units, depth and loops), feelings and curiosity, better eyes with the focus action, surroundings and calls. Alone, with the eye gene and vigilance (so eyes can split by diet), and with learning brains that learn from joy and pain. Do brains grow beyond today's (12.5 connections, biggest 22), which new senses get used, do eyes split by diet (narrow for meat eaters, wide for plant eaters), do lasting meat eaters appear, and at what cost to species and population? 16 fresh seeds, 500,000 ticks.

Base world `grand-world`; 500,000 ticks; seeds 4201-4216; 3 arms against `control`; 64 of 64 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 1,181 | 203 | 920 | 1,614 |
| lowest population | 438 | 117 | 272 | 600 |
| deaths per animal per 1,000 ticks | 2.861 | 0.763 | 1.492 | 4.495 |
| share of deaths by starving | 0.261 | 0.066 | 0.181 | 0.433 |
| share hungry | 0.11 | 0.009 | 0.095 | 0.132 |
| cost per animal per tick | 0.089 | 0.022 | 0.051 | 0.13 |
| share of costs from harmful mutations | 0.085 | 0.004 | 0.076 | 0.093 |
| harmful mutations per animal | 5.607 | 0.115 | 5.348 | 5.777 |
| average diet gene | 0.128 | 0.033 | 0.074 | 0.197 |
| highest diet gene ever | 0.934 | 0.068 | 0.828 | 1 |
| meat in the diet | 0.148 | 0.019 | 0.111 | 0.184 |
| kills per 1,000 ticks | 2,428 | 525 | 1,365 | 3,387 |
| feeding levels | 2.006 | 0.024 | 1.98 | 2.089 |
| births with two parents | 0.343 | 0.044 | 0.242 | 0.399 |
| sex gene | 0.109 | 0.021 | 0.074 | 0.153 |
| species alive | 8.186 | 2.77 | 4.624 | 13.5 |
| species diversity (Shannon) | 1.611 | 0.336 | 1.063 | 1.996 |
| share of cells in colonies | 0.061 | 0.009 | 0.05 | 0.082 |
| share sick | 0.231 | 0.041 | 0.164 | 0.32 |
| brain connections | 9.919 | 0.74 | 8.423 | 11.4 |
| most complex brain ever (connections) | 25.4 | 1.672 | 23 | 29 |
| senses read per brain | 4.824 | 0.458 | 4.09 | 5.64 |
| longest chain of thinking units ever | 1 | 0 | 1 | 1 |
| plants standing (share of capacity) | 0.114 | 0.022 | 0.076 | 0.148 |
| worn ground | 0.092 | 0.082 | 0.013 | 0.232 |
| genes pinned at a limit | 2.813 | 1.109 | 2 | 5 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_bond`.

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

**share sick** (control 0.231): brains-eyes-learning 0.113 (-2.9), brains-eyes 0.152 (-1.9), brains 0.172 (-1.4)

**brain connections** (control 9.919): brains-eyes 10.7 (+1.1)

**senses read per brain** (control 4.824): brains-eyes-learning 3.504 (-2.9), brains 3.555 (-2.8), brains-eyes 3.938 (-1.9)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

