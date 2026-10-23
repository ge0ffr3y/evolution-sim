# predator-life: comparison report

**Question:** Do a gut (food digested over time, eating speed by size, digestion speed by metabolism), rest (barely moving and not eating lowers upkeep) and prey condition (weak prey are easier to catch) give meat eaters (diet above 0.75) the lifestyle they need to take hold in the grand world? The gut alone, the gut with rest, prey condition alone, all three, and all three with prey sight not scaled by diet and a founder pull toward prey. 8 fresh seeds, 300,000 ticks, with the diet ledger recording how animals of each diet die. An answer: meat eaters, how they die, metabolism by diet, feeding levels, kills, species and population.

Base world `grand-world`; 300,000 ticks; seeds 2901-2908; 5 arms against `control`; 48 of 48 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 1,291 | 206 | 1,076 | 1,675 |
| lowest population | 540 | 78.2 | 400 | 600 |
| deaths per animal per 1,000 ticks | 2.702 | 0.621 | 1.8 | 3.733 |
| share of deaths by starving | 0.257 | 0.032 | 0.204 | 0.308 |
| share hungry | 0.119 | 0.007 | 0.107 | 0.127 |
| cost per animal per tick | 0.082 | 0.022 | 0.052 | 0.114 |
| share of costs from harmful mutations | 0.087 | 0.007 | 0.08 | 0.099 |
| harmful mutations per animal | 5.608 | 0.071 | 5.537 | 5.718 |
| average diet gene | 0.117 | 0.023 | 0.093 | 0.158 |
| highest diet gene ever | 0.936 | 0.065 | 0.825 | 1 |
| meat in the diet | 0.153 | 0.015 | 0.125 | 0.169 |
| kills per 1,000 ticks | 2,519 | 335 | 2,177 | 3,195 |
| feeding levels | 2.005 | 0.051 | 1.95 | 2.119 |
| births with two parents | 0.352 | 0.067 | 0.282 | 0.492 |
| sex gene | 0.125 | 0.04 | 0.086 | 0.208 |
| species alive | 8.422 | 2.363 | 4.792 | 11.3 |
| species diversity (Shannon) | 1.657 | 0.273 | 1.304 | 1.985 |
| share of cells in colonies | 0.065 | 0.004 | 0.058 | 0.07 |
| share sick | 0.255 | 0.039 | 0.195 | 0.312 |
| brain connections | 11.1 | 1.05 | 10 | 13.4 |
| plants standing (share of capacity) | 0.093 | 0.015 | 0.08 | 0.12 |
| worn ground | 0.125 | 0.132 | 0.01 | 0.377 |
| genes pinned at a limit | 2.875 | 1.126 | 2 | 5 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_bond`.

## Red flags (8)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (4)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **gut**: share of deaths by starving 0.257 → 0.112 (-4.5 noise units); share hungry 0.119 → 0.093 (-4 noise units); share of costs from harmful mutations 0.087 → 0.054 (-4.6 noise units); harmful mutations per animal 5.608 → 5.878 (3.8 noise units); average diet gene 0.117 → 0.235 (5.1 noise units); meat in the diet 0.153 → 0.213 (4.1 noise units); kills per 1,000 ticks 2,519 → 3,578 (3.2 noise units); share of cells in colonies 0.065 → 0.096 (8.4 noise units)
- **gut-rest**: share of deaths by starving 0.257 → 0.112 (-4.5 noise units); share hungry 0.119 → 0.093 (-4 noise units); share of costs from harmful mutations 0.087 → 0.054 (-4.6 noise units); harmful mutations per animal 5.608 → 5.878 (3.8 noise units); average diet gene 0.117 → 0.235 (5.1 noise units); meat in the diet 0.153 → 0.213 (4.1 noise units); kills per 1,000 ticks 2,519 → 3,578 (3.2 noise units); share of cells in colonies 0.065 → 0.096 (8.4 noise units)
- **all-three**: share of deaths by starving 0.257 → 0.086 (-5.3 noise units); share hungry 0.119 → 0.077 (-6.3 noise units); share of costs from harmful mutations 0.087 → 0.06 (-3.8 noise units); harmful mutations per animal 5.608 → 5.889 (4 noise units); average diet gene 0.117 → 0.235 (5.1 noise units); meat in the diet 0.153 → 0.229 (5.1 noise units); kills per 1,000 ticks 2,519 → 3,718 (3.6 noise units); share of cells in colonies 0.065 → 0.096 (8.3 noise units); plants standing (share of capacity) 0.093 → 0.142 (3.3 noise units)
- **all-three-hunting**: share of deaths by starving 0.257 → 0.084 (-5.4 noise units); share hungry 0.119 → 0.081 (-5.8 noise units); share of costs from harmful mutations 0.087 → 0.062 (-3.6 noise units); harmful mutations per animal 5.608 → 5.901 (4.1 noise units); average diet gene 0.117 → 0.283 (7.2 noise units); meat in the diet 0.153 → 0.227 (5 noise units); kills per 1,000 ticks 2,519 → 3,745 (3.7 noise units); share of cells in colonies 0.065 → 0.101 (9.6 noise units); plants standing (share of capacity) 0.093 → 0.146 (3.5 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (4)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **gut**: newly pinned `low_metabolism`
- **gut-rest**: newly pinned `low_metabolism`
- **all-three**: newly pinned `low_metabolism`
- **all-three-hunting**: newly pinned `low_metabolism`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 1,291): prey-condition 1,017 (-1.3), all-three 1,029 (-1.3), gut 1,030 (-1.3), gut-rest 1,030 (-1.3), all-three-hunting 1,040 (-1.2)

**lowest population** (control 540): all-three-hunting 461 (-1)

**deaths per animal per 1,000 ticks** (control 2.702): prey-condition 3.99 (+2.1), all-three 3.965 (+2), gut 3.932 (+2), gut-rest 3.932 (+2), all-three-hunting 3.923 (+2)

**share of deaths by starving** (control 0.257): all-three-hunting 0.084 (-5.4), all-three 0.086 (-5.3), gut 0.112 (-4.5), gut-rest 0.112 (-4.5), prey-condition 0.198 (-1.8)

**share hungry** (control 0.119): all-three 0.077 (-6.3), all-three-hunting 0.081 (-5.8), gut 0.093 (-4), gut-rest 0.093 (-4)

**cost per animal per tick** (control 0.082): prey-condition 0.119 (+1.7)

**share of costs from harmful mutations** (control 0.087): gut 0.054 (-4.6), gut-rest 0.054 (-4.6), all-three 0.06 (-3.8), all-three-hunting 0.062 (-3.6)

**harmful mutations per animal** (control 5.608): all-three-hunting 5.901 (+4.1), all-three 5.889 (+4), gut 5.878 (+3.8), gut-rest 5.878 (+3.8), prey-condition 5.71 (+1.4)

**average diet gene** (control 0.117): all-three-hunting 0.283 (+7.2), all-three 0.235 (+5.1), gut 0.235 (+5.1), gut-rest 0.235 (+5.1), prey-condition 0.157 (+1.8)

**meat in the diet** (control 0.153): all-three 0.229 (+5.1), all-three-hunting 0.227 (+5), gut 0.213 (+4.1), gut-rest 0.213 (+4.1)

**kills per 1,000 ticks** (control 2,519): all-three-hunting 3,745 (+3.7), all-three 3,718 (+3.6), gut 3,578 (+3.2), gut-rest 3,578 (+3.2), prey-condition 3,225 (+2.1)

**feeding levels** (control 2.005): all-three-hunting 2.157 (+3)

**species alive** (control 8.422): gut 5.396 (-1.3), gut-rest 5.396 (-1.3)

**species diversity (Shannon)** (control 1.657): gut 1.274 (-1.4), gut-rest 1.274 (-1.4)

**share of cells in colonies** (control 0.065): all-three-hunting 0.101 (+9.6), gut 0.096 (+8.4), gut-rest 0.096 (+8.4), all-three 0.096 (+8.3)

**share sick** (control 0.255): gut 0.32 (+1.6), gut-rest 0.32 (+1.6)

**brain connections** (control 11.1): all-three 8.277 (-2.7), all-three-hunting 8.933 (-2), gut 9.371 (-1.6), gut-rest 9.371 (-1.6)

**plants standing (share of capacity)** (control 0.093): all-three-hunting 0.146 (+3.5), all-three 0.142 (+3.3), gut 0.135 (+2.8), gut-rest 0.135 (+2.8)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

