# headline-barriers: comparison report

**Question:** Do geographic barriers produce more species? Seas covering 10%, 25% (today's) and 40% of the map. An answer: species alive and ever, Shannon diversity, and how different the animals on separate land masses are, against today's world, with 95% ranges.

Base world `grand-world`; 500,000 ticks; seeds 701-716; 2 arms against `control`; 48 of 48 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 825 | 117 | 547 | 992 |
| lowest population | 256 | 86 | 138 | 413 |
| deaths per animal per 1,000 ticks | 1.925 | 0.788 | 1.21 | 3.738 |
| share of deaths by starving | 0.462 | 0.114 | 0.294 | 0.613 |
| share hungry | 0.127 | 0.012 | 0.106 | 0.148 |
| cost per animal per tick | 0.064 | 0.027 | 0.039 | 0.125 |
| share of costs from harmful mutations | 0.193 | 0.009 | 0.175 | 0.207 |
| harmful mutations per animal | 15.9 | 0.902 | 14.7 | 17.5 |
| average diet gene | 0.073 | 0.032 | 0.04 | 0.139 |
| highest diet gene ever | 0.791 | 0.151 | 0.553 | 1 |
| meat in the diet | 0.077 | 0.026 | 0.043 | 0.117 |
| kills per 1,000 ticks | 846 | 377 | 440 | 1,672 |
| feeding levels | 1.494 | 0.312 | 1.059 | 1.96 |
| births with two parents | 0.413 | 0.079 | 0.274 | 0.519 |
| sex gene | 0.07 | 0.012 | 0.054 | 0.093 |
| species alive | 4.787 | 1.839 | 2 | 8.941 |
| species diversity (Shannon) | 1.177 | 0.35 | 0.665 | 1.925 |
| share of cells in colonies | 0.043 | 0.012 | 0.031 | 0.066 |
| share sick | 0.189 | 0.03 | 0.128 | 0.233 |
| brain connections | 10.7 | 1.302 | 8.67 | 13.3 |
| plants standing (share of capacity) | 0.083 | 0.029 | 0.041 | 0.137 |
| worn ground | 0.23 | 0.122 | 0.031 | 0.423 |
| genes pinned at a limit | 5.5 | 2.53 | 2 | 8 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_attack`, `low_bond`, `low_sex`, `low_generosity`.

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

- **water-010**: newly pinned `low_senseRange`, `low_metabolism`, `low_diet`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 825): water-010 1,076 (+2.1), water-040 629 (-1.7)

**lowest population** (control 256): water-010 346 (+1.1)

**share of costs from harmful mutations** (control 0.193): water-040 0.205 (+1.3)

**sex gene** (control 0.07): water-010 0.053 (-1.4)

**share sick** (control 0.189): water-040 0.149 (-1.4)

**brain connections** (control 10.7): water-040 9.165 (-1.2)

**plants standing (share of capacity)** (control 0.083): water-010 0.049 (-1.1), water-040 0.116 (+1.1)

**worn ground** (control 0.23): water-010 0.367 (+1.1)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

