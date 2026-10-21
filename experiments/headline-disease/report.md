# headline-disease: comparison report

**Question:** Does disease stop one species taking over? Worlds with no disease, with today's disease, and with a disease that infects a wider range of hosts. An answer: the share of animals in the biggest species and Shannon diversity, against today's world, with 95% ranges.

Base world `grand-world`; 300,000 ticks; seeds 801-816; 2 arms against `control`; 48 of 48 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 814 | 124 | 604 | 1,014 |
| lowest population | 332 | 126 | 186 | 539 |
| deaths per animal per 1,000 ticks | 2.287 | 0.772 | 1.336 | 3.979 |
| share of deaths by starving | 0.411 | 0.093 | 0.247 | 0.565 |
| share hungry | 0.129 | 0.013 | 0.102 | 0.146 |
| cost per animal per tick | 0.074 | 0.023 | 0.043 | 0.118 |
| share of costs from harmful mutations | 0.195 | 0.012 | 0.179 | 0.219 |
| harmful mutations per animal | 16.3 | 0.931 | 14.9 | 18.1 |
| average diet gene | 0.088 | 0.039 | 0.042 | 0.181 |
| highest diet gene ever | 0.878 | 0.097 | 0.713 | 1 |
| meat in the diet | 0.087 | 0.026 | 0.06 | 0.145 |
| kills per 1,000 ticks | 1,070 | 359 | 570 | 1,808 |
| feeding levels | 1.623 | 0.302 | 1.04 | 2 |
| births with two parents | 0.326 | 0.078 | 0.209 | 0.458 |
| sex gene | 0.074 | 0.026 | 0.049 | 0.162 |
| species alive | 4.586 | 1.356 | 2.644 | 7.109 |
| species diversity (Shannon) | 1.179 | 0.286 | 0.806 | 1.74 |
| share of cells in colonies | 0.044 | 0.01 | 0.028 | 0.07 |
| share sick | 0.216 | 0.04 | 0.147 | 0.279 |
| brain connections | 11 | 1.857 | 8.554 | 15.3 |
| plants standing (share of capacity) | 0.086 | 0.025 | 0.044 | 0.125 |
| worn ground | 0.121 | 0.134 | 0.003 | 0.389 |
| genes pinned at a limit | 4.875 | 2.5 | 2 | 9 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_bond`, `low_sex`, `low_generosity`.

## Red flags (3)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (1)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **no-disease**: share sick 0.216 → 0 (-5.4 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (2)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **no-disease**: newly pinned `low_senseRange`, `low_diet`, `low_attack`
- **wider-disease**: newly pinned `low_attack`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 814): no-disease 956 (+1.1)

**deaths per animal per 1,000 ticks** (control 2.287): no-disease 1.486 (-1)

**share of deaths by starving** (control 0.411): no-disease 0.514 (+1.1), wider-disease 0.511 (+1.1)

**cost per animal per tick** (control 0.074): no-disease 0.048 (-1.2)

**share of costs from harmful mutations** (control 0.195): no-disease 0.228 (+2.8)

**highest diet gene ever** (control 0.878): no-disease 0.769 (-1.1)

**meat in the diet** (control 0.087): no-disease 0.061 (-1)

**kills per 1,000 ticks** (control 1,070): no-disease 694 (-1)

**feeding levels** (control 1.623): no-disease 1.304 (-1.1)

**births with two parents** (control 0.326): no-disease 0.435 (+1.4)

**share sick** (control 0.216): no-disease 0 (-5.4)

**plants standing (share of capacity)** (control 0.086): no-disease 0.051 (-1.4)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

