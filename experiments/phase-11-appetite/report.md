# phase-11-appetite: comparison report

**Question:** Phase 11, step 2: tuning the appetite senses in the grand world. Today a plant eater sees prey only as strongly as its diet is meaty. Does a floor under the appetite (0.25, 0.5), or the evolvable attention gene (preyAttention, founders at 0), lead to more lasting meat eaters, more feeding levels, bigger brains or more prey sight wired, and at what cost to species and population? 16 fresh seeds, 500,000 ticks.

Base world `grand-world`; 500,000 ticks; seeds 4101-4116; 3 arms against `control`; 64 of 64 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 1,177 | 214 | 823 | 1,567 |
| lowest population | 446 | 134 | 223 | 600 |
| deaths per animal per 1,000 ticks | 2.935 | 0.84 | 1.632 | 4.38 |
| share of deaths by starving | 0.251 | 0.058 | 0.172 | 0.363 |
| share hungry | 0.11 | 0.009 | 0.095 | 0.129 |
| cost per animal per tick | 0.089 | 0.022 | 0.051 | 0.126 |
| share of costs from harmful mutations | 0.084 | 0.006 | 0.072 | 0.095 |
| harmful mutations per animal | 5.636 | 0.114 | 5.473 | 5.817 |
| average diet gene | 0.131 | 0.037 | 0.079 | 0.181 |
| highest diet gene ever | 0.985 | 0.026 | 0.915 | 1 |
| meat in the diet | 0.153 | 0.019 | 0.122 | 0.177 |
| kills per 1,000 ticks | 2,484 | 483 | 1,671 | 3,347 |
| feeding levels | 1.991 | 0.03 | 1.891 | 2.01 |
| births with two parents | 0.353 | 0.04 | 0.291 | 0.417 |
| sex gene | 0.118 | 0.021 | 0.081 | 0.147 |
| species alive | 9.313 | 3.562 | 3.436 | 16.8 |
| species diversity (Shannon) | 1.726 | 0.392 | 0.918 | 2.389 |
| share of cells in colonies | 0.062 | 0.004 | 0.054 | 0.073 |
| share sick | 0.22 | 0.033 | 0.176 | 0.277 |
| brain connections | 10.4 | 1.297 | 8.249 | 13 |
| most complex brain ever (connections) | 26.4 | 2.683 | 22 | 31 |
| senses read per brain | 5.133 | 0.643 | 4.179 | 6.662 |
| longest chain of thinking units ever | 1 | 0 | 1 | 1 |
| plants standing (share of capacity) | 0.115 | 0.025 | 0.068 | 0.159 |
| worn ground | 0.117 | 0.1 | 0.006 | 0.343 |
| genes pinned at a limit | 2.688 | 0.873 | 2 | 4 |

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

**highest diet gene ever** (control 0.985): floor-25 0.93 (-2.1), attention 0.935 (-1.9), floor-50 0.938 (-1.8)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

