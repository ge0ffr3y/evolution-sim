# injury-dispersal: comparison report

**Question:** The kill autopsy found that meat eaters (diet above 0.75) live in clumps of their own lineage and kill equals and relatives when no other prey is in reach, at no extra cost. With the gut and prey condition, does injury from failed attacks (attackInjury 0.2: a failed attack against an equal costs a tenth of a breeding's worth) or young that move away (natalDispersal 12 world units, about one and a half food cells) cut meat eaters killing meat eaters and let a meat-eating group last? Each alone and together, 8 fresh seeds, 300,000 ticks, with the diet ledger and the kill autopsy. An answer: worlds with a lasting meat-eating group, meat eaters killed by meat eaters, species and population.

Base world `grand-world`; 300,000 ticks; seeds 3301-3308; 4 arms against `control`; 40 of 40 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 1,277 | 303 | 986 | 1,954 |
| lowest population | 571 | 42.7 | 492 | 600 |
| deaths per animal per 1,000 ticks | 2.68 | 0.96 | 1.157 | 3.958 |
| share of deaths by starving | 0.296 | 0.093 | 0.188 | 0.465 |
| share hungry | 0.122 | 0.009 | 0.108 | 0.135 |
| cost per animal per tick | 0.086 | 0.03 | 0.037 | 0.126 |
| share of costs from harmful mutations | 0.086 | 0.009 | 0.077 | 0.105 |
| harmful mutations per animal | 5.577 | 0.145 | 5.367 | 5.753 |
| average diet gene | 0.117 | 0.036 | 0.064 | 0.166 |
| highest diet gene ever | 0.972 | 0.031 | 0.922 | 1 |
| meat in the diet | 0.138 | 0.027 | 0.1 | 0.176 |
| kills per 1,000 ticks | 2,314 | 804 | 1,209 | 3,684 |
| feeding levels | 1.994 | 0.064 | 1.931 | 2.139 |
| births with two parents | 0.333 | 0.063 | 0.269 | 0.447 |
| sex gene | 0.099 | 0.019 | 0.079 | 0.134 |
| species alive | 7.894 | 3.544 | 4.366 | 16 |
| species diversity (Shannon) | 1.56 | 0.395 | 0.983 | 2.326 |
| share of cells in colonies | 0.059 | 0.01 | 0.043 | 0.074 |
| share sick | 0.224 | 0.061 | 0.139 | 0.286 |
| brain connections | 11.1 | 1.552 | 9.753 | 13.6 |
| plants standing (share of capacity) | 0.089 | 0.026 | 0.04 | 0.114 |
| worn ground | 0.093 | 0.098 | 0.004 | 0.304 |
| genes pinned at a limit | 2.875 | 1.126 | 2 | 5 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_bond`.

## Red flags (5)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (4)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **gut-condition**: share hungry 0.122 → 0.081 (-4.5 noise units); share of costs from harmful mutations 0.086 → 0.058 (-3.2 noise units); average diet gene 0.117 → 0.238 (3.3 noise units); meat in the diet 0.138 → 0.237 (3.7 noise units); share of cells in colonies 0.059 → 0.095 (3.7 noise units)
- **gut-condition-injury**: share hungry 0.122 → 0.086 (-4 noise units); share of costs from harmful mutations 0.086 → 0.055 (-3.5 noise units); average diet gene 0.117 → 0.262 (4 noise units); meat in the diet 0.138 → 0.228 (3.4 noise units); share of cells in colonies 0.059 → 0.097 (3.9 noise units); plants standing (share of capacity) 0.089 → 0.187 (3.8 noise units)
- **gut-condition-disperse**: share hungry 0.122 → 0.086 (-4 noise units); average diet gene 0.117 → 0.284 (4.6 noise units); meat in the diet 0.138 → 0.267 (4.8 noise units); feeding levels 1.994 → 2.333 (5.3 noise units); share of cells in colonies 0.059 → 0.124 (6.6 noise units); plants standing (share of capacity) 0.089 → 0.179 (3.5 noise units)
- **gut-condition-injury-disperse**: share hungry 0.122 → 0.082 (-4.4 noise units); average diet gene 0.117 → 0.26 (4 noise units); meat in the diet 0.138 → 0.253 (4.3 noise units); sex gene 0.099 → 0.175 (4 noise units); share of cells in colonies 0.059 → 0.112 (5.3 noise units); share sick 0.224 → 0.038 (-3.1 noise units)

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

**population** (control 1,277): gut-condition-injury 920 (-1.2), gut-condition-disperse 932 (-1.1), gut-condition-injury-disperse 940 (-1.1), gut-condition 959 (-1)

**lowest population** (control 571): gut-condition 448 (-2.9), gut-condition-injury-disperse 495 (-1.8)

**deaths per animal per 1,000 ticks** (control 2.68): gut-condition-disperse 5.076 (+2.5), gut-condition-injury-disperse 5.048 (+2.5), gut-condition-injury 4.42 (+1.8), gut-condition 4.345 (+1.7)

**share of deaths by starving** (control 0.296): gut-condition-disperse 0.08 (-2.3), gut-condition 0.083 (-2.3), gut-condition-injury-disperse 0.096 (-2.1), gut-condition-injury 0.106 (-2)

**share hungry** (control 0.122): gut-condition 0.081 (-4.5), gut-condition-injury-disperse 0.082 (-4.4), gut-condition-injury 0.086 (-4), gut-condition-disperse 0.086 (-4)

**cost per animal per tick** (control 0.086): gut-condition-injury 0.118 (+1.1)

**share of costs from harmful mutations** (control 0.086): gut-condition-injury 0.055 (-3.5), gut-condition 0.058 (-3.2), gut-condition-injury-disperse 0.059 (-3), gut-condition-disperse 0.064 (-2.4)

**harmful mutations per animal** (control 5.577): gut-condition-injury-disperse 5.924 (+2.4), gut-condition-disperse 5.919 (+2.4), gut-condition-injury 5.907 (+2.3), gut-condition 5.897 (+2.2)

**average diet gene** (control 0.117): gut-condition-disperse 0.284 (+4.6), gut-condition-injury 0.262 (+4), gut-condition-injury-disperse 0.26 (+4), gut-condition 0.238 (+3.3)

**meat in the diet** (control 0.138): gut-condition-disperse 0.267 (+4.8), gut-condition-injury-disperse 0.253 (+4.3), gut-condition 0.237 (+3.7), gut-condition-injury 0.228 (+3.4)

**kills per 1,000 ticks** (control 2,314): gut-condition-disperse 4,341 (+2.5), gut-condition-injury-disperse 4,291 (+2.5), gut-condition 3,791 (+1.8), gut-condition-injury 3,607 (+1.6)

**feeding levels** (control 1.994): gut-condition-disperse 2.333 (+5.3), gut-condition 2.072 (+1.2)

**sex gene** (control 0.099): gut-condition-injury-disperse 0.175 (+4), gut-condition 0.15 (+2.7), gut-condition-disperse 0.135 (+1.9), gut-condition-injury 0.135 (+1.9)

**share of cells in colonies** (control 0.059): gut-condition-disperse 0.124 (+6.6), gut-condition-injury-disperse 0.112 (+5.3), gut-condition-injury 0.097 (+3.9), gut-condition 0.095 (+3.7)

**share sick** (control 0.224): gut-condition-injury-disperse 0.038 (-3.1), gut-condition-disperse 0.093 (-2.2)

**brain connections** (control 11.1): gut-condition-injury-disperse 8.164 (-1.9), gut-condition 8.526 (-1.6), gut-condition-disperse 8.536 (-1.6), gut-condition-injury 9.064 (-1.3)

**plants standing (share of capacity)** (control 0.089): gut-condition-injury 0.187 (+3.8), gut-condition-disperse 0.179 (+3.5), gut-condition 0.162 (+2.8), gut-condition-injury-disperse 0.155 (+2.6)

**genes pinned at a limit** (control 2.875): gut-condition-disperse 1.125 (-1.6), gut-condition-injury-disperse 1.25 (-1.4)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

