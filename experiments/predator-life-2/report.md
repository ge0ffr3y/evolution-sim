# predator-life-2: comparison report

**Question:** With the gut and prey condition (the best setup in predator-life, where one world in 8 kept a meat-eating group), do graded rest (slowing on a tick it eats nothing lowers upkeep) and fighting back (an animal's own weapons count toward its defense, so armed animals, other hunters included, are risky to attack) help meat eaters (diet above 0.75) last? Grand world; gut with prey condition; plus rest; plus fighting back; plus both. 8 fresh seeds, 300,000 ticks, with the diet ledger recording how each diet dies. An answer: worlds with a lasting meat-eating group, how meat eaters die (killed by meat eaters should fall with fighting back), metabolism, species and population.

Base world `grand-world`; 300,000 ticks; seeds 3001-3008; 4 arms against `control`; 40 of 40 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 1,269 | 320 | 975 | 1,680 |
| lowest population | 498 | 93.1 | 386 | 600 |
| deaths per animal per 1,000 ticks | 2.834 | 1.195 | 1.401 | 4.037 |
| share of deaths by starving | 0.316 | 0.12 | 0.184 | 0.493 |
| share hungry | 0.127 | 0.015 | 0.105 | 0.148 |
| cost per animal per tick | 0.091 | 0.033 | 0.049 | 0.134 |
| share of costs from harmful mutations | 0.085 | 0.007 | 0.074 | 0.097 |
| harmful mutations per animal | 5.544 | 0.186 | 5.285 | 5.755 |
| average diet gene | 0.119 | 0.044 | 0.064 | 0.169 |
| highest diet gene ever | 0.966 | 0.047 | 0.892 | 1 |
| meat in the diet | 0.135 | 0.034 | 0.092 | 0.181 |
| kills per 1,000 ticks | 2,312 | 883 | 1,194 | 3,330 |
| feeding levels | 1.901 | 0.129 | 1.663 | 2.01 |
| births with two parents | 0.343 | 0.044 | 0.304 | 0.425 |
| sex gene | 0.116 | 0.023 | 0.084 | 0.153 |
| species alive | 7.623 | 2.961 | 4.069 | 12.3 |
| species diversity (Shannon) | 1.555 | 0.355 | 1.051 | 2.077 |
| share of cells in colonies | 0.057 | 0.013 | 0.038 | 0.073 |
| share sick | 0.266 | 0.047 | 0.198 | 0.327 |
| brain connections | 11 | 1.811 | 8.559 | 13.3 |
| plants standing (share of capacity) | 0.089 | 0.024 | 0.052 | 0.129 |
| worn ground | 0.098 | 0.143 | 0.005 | 0.417 |
| genes pinned at a limit | 3 | 1.309 | 2 | 5 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_bond`.

## Red flags (6)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (4)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **gut-condition**: share hungry 0.127 → 0.08 (-3.3 noise units); share of costs from harmful mutations 0.085 → 0.058 (-3.7 noise units); average diet gene 0.119 → 0.261 (3.2 noise units); meat in the diet 0.135 → 0.238 (3 noise units)
- **gut-condition-rest**: share hungry 0.127 → 0.082 (-3.1 noise units); share of costs from harmful mutations 0.085 → 0.059 (-3.6 noise units); average diet gene 0.119 → 0.251 (3 noise units); meat in the diet 0.135 → 0.244 (3.2 noise units); share of cells in colonies 0.057 → 0.098 (3.2 noise units)
- **gut-condition-fight**: share hungry 0.127 → 0.08 (-3.3 noise units); share of costs from harmful mutations 0.085 → 0.054 (-4.3 noise units); average diet gene 0.119 → 0.284 (3.8 noise units); meat in the diet 0.135 → 0.245 (3.2 noise units); share of cells in colonies 0.057 → 0.106 (3.8 noise units); plants standing (share of capacity) 0.089 → 0.198 (4.5 noise units)
- **gut-condition-rest-fight**: share hungry 0.127 → 0.081 (-3.2 noise units); share of costs from harmful mutations 0.085 → 0.056 (-4 noise units); average diet gene 0.119 → 0.266 (3.3 noise units); share of cells in colonies 0.057 → 0.096 (3 noise units); plants standing (share of capacity) 0.089 → 0.165 (3.1 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (2)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **gut-condition**: newly pinned `low_metabolism`
- **gut-condition-rest**: newly pinned `low_metabolism`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 1,269): gut-condition-fight 871 (-1.2), gut-condition-rest-fight 914 (-1.1)

**deaths per animal per 1,000 ticks** (control 2.834): gut-condition-fight 4.933 (+1.8), gut-condition-rest-fight 4.705 (+1.6), gut-condition-rest 4.377 (+1.3), gut-condition 4.315 (+1.2)

**share of deaths by starving** (control 0.316): gut-condition-rest-fight 0.077 (-2), gut-condition-fight 0.079 (-2), gut-condition-rest 0.08 (-2), gut-condition 0.081 (-2)

**share hungry** (control 0.127): gut-condition 0.08 (-3.3), gut-condition-fight 0.08 (-3.3), gut-condition-rest-fight 0.081 (-3.2), gut-condition-rest 0.082 (-3.1)

**share of costs from harmful mutations** (control 0.085): gut-condition-fight 0.054 (-4.3), gut-condition-rest-fight 0.056 (-4), gut-condition 0.058 (-3.7), gut-condition-rest 0.059 (-3.6)

**harmful mutations per animal** (control 5.544): gut-condition-fight 5.91 (+2), gut-condition-rest-fight 5.909 (+2), gut-condition 5.902 (+1.9), gut-condition-rest 5.899 (+1.9)

**average diet gene** (control 0.119): gut-condition-fight 0.284 (+3.8), gut-condition-rest-fight 0.266 (+3.3), gut-condition 0.261 (+3.2), gut-condition-rest 0.251 (+3)

**meat in the diet** (control 0.135): gut-condition-fight 0.245 (+3.2), gut-condition-rest 0.244 (+3.2), gut-condition 0.238 (+3), gut-condition-rest-fight 0.235 (+2.9)

**kills per 1,000 ticks** (control 2,312): gut-condition-rest 4,117 (+2), gut-condition 4,024 (+1.9), gut-condition-rest-fight 3,955 (+1.9), gut-condition-fight 3,936 (+1.8)

**feeding levels** (control 1.901): gut-condition-rest 2.283 (+3), gut-condition-fight 2.265 (+2.8), gut-condition-rest-fight 2.075 (+1.4)

**share of cells in colonies** (control 0.057): gut-condition-fight 0.106 (+3.8), gut-condition-rest 0.098 (+3.2), gut-condition-rest-fight 0.096 (+3), gut-condition 0.096 (+3)

**brain connections** (control 11): gut-condition-fight 8.334 (-1.5), gut-condition-rest 8.375 (-1.5)

**plants standing (share of capacity)** (control 0.089): gut-condition-fight 0.198 (+4.5), gut-condition-rest-fight 0.165 (+3.1), gut-condition 0.157 (+2.8), gut-condition-rest 0.143 (+2.2)

**genes pinned at a limit** (control 3): gut-condition-fight 1.125 (-1.4), gut-condition-rest-fight 1.5 (-1.1)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

