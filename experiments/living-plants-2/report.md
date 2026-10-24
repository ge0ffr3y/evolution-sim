# living-plants-2: comparison report

**Question:** Living plants, step 2: in the grand world with plants that evolve, do poisonous plants (plantToxins 1: a toxin gene that slows growth and harms eaters whose palate is far from the plant's chemistry) evolve, and do they split plant eaters into specialists: more species, plant eaters breeding faster, more feeding levels, room for meat eaters? Against the grand world and against plants that evolve without toxins. 8 fresh seeds, 300,000 ticks, with the diet ledger.

Base world `grand-world`; 300,000 ticks; seeds 3601-3608; 2 arms against `control`; 24 of 24 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 1,208 | 148 | 1,052 | 1,411 |
| lowest population | 502 | 92.1 | 390 | 600 |
| deaths per animal per 1,000 ticks | 2.636 | 0.636 | 1.861 | 3.439 |
| share of deaths by starving | 0.31 | 0.068 | 0.216 | 0.407 |
| share hungry | 0.131 | 0.015 | 0.112 | 0.155 |
| cost per animal per tick | 0.084 | 0.02 | 0.059 | 0.116 |
| share of costs from harmful mutations | 0.085 | 0.005 | 0.076 | 0.093 |
| harmful mutations per animal | 5.525 | 0.128 | 5.375 | 5.696 |
| average diet gene | 0.108 | 0.031 | 0.07 | 0.147 |
| highest diet gene ever | 0.901 | 0.072 | 0.795 | 1 |
| meat in the diet | 0.132 | 0.021 | 0.095 | 0.161 |
| kills per 1,000 ticks | 2,161 | 478 | 1,673 | 2,931 |
| feeding levels | 1.975 | 0.054 | 1.891 | 2.059 |
| births with two parents | 0.334 | 0.067 | 0.243 | 0.442 |
| sex gene | 0.116 | 0.033 | 0.077 | 0.168 |
| species alive | 7.431 | 1.86 | 5.099 | 9.98 |
| species diversity (Shannon) | 1.607 | 0.272 | 1.263 | 2.037 |
| share of cells in colonies | 0.055 | 0.006 | 0.047 | 0.063 |
| share sick | 0.248 | 0.046 | 0.192 | 0.321 |
| brain connections | 10.5 | 1.562 | 7.835 | 12.1 |
| plants standing (share of capacity) | 0.081 | 0.014 | 0.064 | 0.102 |
| worn ground | 0.078 | 0.061 | 0.008 | 0.152 |
| genes pinned at a limit | 3.5 | 1.414 | 2 | 6 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_bond`, `low_generosity`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): wornShare (63.8%).

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

- **living-plants**: newly pinned `low_attack`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 1,208): living-plants 1,506 (+2)

**cost per animal per tick** (control 0.084): living-plants 0.063 (-1)

**share of costs from harmful mutations** (control 0.085): living-plants 0.094 (+1.8), living-plants-toxins 0.09 (+1.1)

**share of cells in colonies** (control 0.055): living-plants-toxins 0.067 (+1.8)

**plants standing (share of capacity)** (control 0.081): living-plants-toxins 0.114 (+2.4)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

