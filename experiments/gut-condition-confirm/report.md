# gut-condition-confirm: comparison report

**Question:** Confirmation on 16 fresh seeds and a longer run: does the gut (food digested over time) with prey condition (weak prey defend less, 0.5) keep a lasting meat-eating group (diet above 0.75) in the grand world itself? Across three 8-seed screens it did in 7 of 24 worlds, against 0 of 24 for the grand world as it is. 16 seeds, 500,000 ticks, with the diet ledger. An answer: worlds with a lasting meat-eating group, how long they last, feeding levels, species, diversity and population, and whether the cost to population or species holds up.

Base world `grand-world`; 500,000 ticks; seeds 3201-3216; 1 arms against `control`; 32 of 32 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 1,193 | 181 | 923 | 1,520 |
| lowest population | 476 | 127 | 243 | 600 |
| deaths per animal per 1,000 ticks | 2.813 | 0.625 | 1.786 | 3.862 |
| share of deaths by starving | 0.25 | 0.035 | 0.18 | 0.316 |
| share hungry | 0.11 | 0.007 | 0.097 | 0.12 |
| cost per animal per tick | 0.09 | 0.021 | 0.052 | 0.127 |
| share of costs from harmful mutations | 0.086 | 0.006 | 0.076 | 0.094 |
| harmful mutations per animal | 5.626 | 0.066 | 5.499 | 5.742 |
| average diet gene | 0.128 | 0.023 | 0.09 | 0.166 |
| highest diet gene ever | 0.924 | 0.087 | 0.758 | 1 |
| meat in the diet | 0.15 | 0.018 | 0.124 | 0.183 |
| kills per 1,000 ticks | 2,458 | 398 | 1,965 | 3,287 |
| feeding levels | 1.983 | 0.028 | 1.931 | 2.01 |
| births with two parents | 0.349 | 0.06 | 0.282 | 0.466 |
| sex gene | 0.123 | 0.025 | 0.091 | 0.184 |
| species alive | 9.319 | 2.652 | 3.98 | 13.5 |
| species diversity (Shannon) | 1.78 | 0.349 | 0.958 | 2.167 |
| share of cells in colonies | 0.064 | 0.007 | 0.055 | 0.079 |
| share sick | 0.216 | 0.051 | 0.115 | 0.302 |
| brain connections | 10.5 | 1.181 | 8.723 | 13.2 |
| plants standing (share of capacity) | 0.109 | 0.019 | 0.085 | 0.162 |
| worn ground | 0.133 | 0.103 | 0.023 | 0.317 |
| genes pinned at a limit | 2.5 | 0.73 | 2 | 4 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_bond`.

## Red flags (2)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (1)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **gut-condition**: share of deaths by starving 0.25 → 0.086 (-4.6 noise units); share hungry 0.11 → 0.08 (-4.6 noise units); share of costs from harmful mutations 0.086 → 0.057 (-5.1 noise units); harmful mutations per animal 5.626 → 5.898 (4.1 noise units); average diet gene 0.128 → 0.253 (5.4 noise units); meat in the diet 0.15 → 0.232 (4.6 noise units); kills per 1,000 ticks 2,458 → 3,655 (3 noise units); feeding levels 1.983 → 2.134 (5.3 noise units); share of cells in colonies 0.064 → 0.1 (5.2 noise units); plants standing (share of capacity) 0.109 → 0.179 (3.6 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (1)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **gut-condition**: newly pinned `low_metabolism`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 1,193): gut-condition 965 (-1.3)

**deaths per animal per 1,000 ticks** (control 2.813): gut-condition 4.181 (+2.2)

**share of deaths by starving** (control 0.25): gut-condition 0.086 (-4.6)

**share hungry** (control 0.11): gut-condition 0.08 (-4.6)

**share of costs from harmful mutations** (control 0.086): gut-condition 0.057 (-5.1)

**harmful mutations per animal** (control 5.626): gut-condition 5.898 (+4.1)

**average diet gene** (control 0.128): gut-condition 0.253 (+5.4)

**meat in the diet** (control 0.15): gut-condition 0.232 (+4.6)

**kills per 1,000 ticks** (control 2,458): gut-condition 3,655 (+3)

**feeding levels** (control 1.983): gut-condition 2.134 (+5.3)

**species alive** (control 9.319): gut-condition 6.075 (-1.2)

**species diversity (Shannon)** (control 1.78): gut-condition 1.379 (-1.1)

**share of cells in colonies** (control 0.064): gut-condition 0.1 (+5.2)

**brain connections** (control 10.5): gut-condition 8.886 (-1.4)

**plants standing (share of capacity)** (control 0.109): gut-condition 0.179 (+3.6)

**worn ground** (control 0.133): gut-condition 0.008 (-1.2)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

