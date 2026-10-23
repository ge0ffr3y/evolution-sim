# vigilance: comparison report

**Question:** Does vigilance (prey that see an attack coming are harder to catch) give wide eyes a purpose, so that eyes split by diet (wide for plant eaters, narrow for meat eaters) and meat eaters (diet above 0.75) take hold? Grand world; the eye gene alone and with vigilance 1; the eye with prey sight not scaled by diet and a founder pull toward prey, alone and with vigilance 1. 8 fresh seeds, 300,000 ticks. An answer: eye by diet (and their correlation), meat eaters, kills, feeding levels, species and population.

Base world `grand-world`; 300,000 ticks; seeds 2701-2708; 4 arms against `control`; 40 of 40 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 1,414 | 195 | 1,160 | 1,744 |
| lowest population | 482 | 92.1 | 371 | 600 |
| deaths per animal per 1,000 ticks | 2.272 | 0.683 | 1.417 | 3.208 |
| share of deaths by starving | 0.361 | 0.142 | 0.175 | 0.553 |
| share hungry | 0.13 | 0.019 | 0.094 | 0.15 |
| cost per animal per tick | 0.07 | 0.017 | 0.043 | 0.096 |
| share of costs from harmful mutations | 0.088 | 0.005 | 0.083 | 0.097 |
| harmful mutations per animal | 5.474 | 0.196 | 5.22 | 5.732 |
| average diet gene | 0.101 | 0.04 | 0.062 | 0.157 |
| highest diet gene ever | 0.932 | 0.066 | 0.825 | 1 |
| meat in the diet | 0.126 | 0.042 | 0.071 | 0.187 |
| kills per 1,000 ticks | 2,043 | 799 | 1,182 | 3,199 |
| feeding levels | 1.786 | 0.235 | 1.436 | 2 |
| births with two parents | 0.351 | 0.067 | 0.291 | 0.472 |
| sex gene | 0.114 | 0.027 | 0.085 | 0.175 |
| species alive | 8.502 | 2.908 | 4.228 | 12.9 |
| species diversity (Shannon) | 1.659 | 0.342 | 1.18 | 2.175 |
| share of cells in colonies | 0.053 | 0.011 | 0.041 | 0.071 |
| share sick | 0.226 | 0.037 | 0.176 | 0.298 |
| brain connections | 11 | 1.314 | 8.987 | 13.3 |
| plants standing (share of capacity) | 0.071 | 0.018 | 0.048 | 0.093 |
| worn ground | 0.128 | 0.111 | 0.038 | 0.36 |
| genes pinned at a limit | 3.5 | 1.604 | 2 | 6 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_bond`, `low_generosity`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): dietMean (12.6%).

## Red flags (2)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (2)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **eye**: cost per animal per tick 0.07 → 0.123 (3.1 noise units)
- **eye-unmuted-reflex**: deaths per animal per 1,000 ticks 2.272 → 4.823 (3.7 noise units); cost per animal per tick 0.07 → 0.167 (5.7 noise units); plants standing (share of capacity) 0.071 → 0.161 (4.9 noise units)

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

**population** (control 1,414): eye-unmuted-reflex 832 (-3), eye 1,056 (-1.8)

**deaths per animal per 1,000 ticks** (control 2.272): eye-unmuted-reflex 4.823 (+3.7), eye 3.703 (+2.1)

**share of deaths by starving** (control 0.361): eye-unmuted-reflex 0.186 (-1.2)

**cost per animal per tick** (control 0.07): eye-unmuted-reflex 0.167 (+5.7), eye 0.123 (+3.1), eye-vigilance 0.102 (+1.9)

**share of costs from harmful mutations** (control 0.088): eye-unmuted-reflex 0.082 (-1.3)

**harmful mutations per animal** (control 5.474): eye-unmuted-reflex 5.736 (+1.3)

**average diet gene** (control 0.101): eye-unmuted-reflex 0.201 (+2.5)

**meat in the diet** (control 0.126): eye-unmuted-reflex 0.176 (+1.2)

**kills per 1,000 ticks** (control 2,043): eye-unmuted-reflex 3,243 (+1.5)

**births with two parents** (control 0.351): eye-unmuted-reflex 0.267 (-1.3)

**species diversity (Shannon)** (control 1.659): eye-unmuted-reflex 1.294 (-1.1)

**share of cells in colonies** (control 0.053): eye-unmuted-reflex 0.077 (+2.3), eye-vigilance 0.064 (+1)

**brain connections** (control 11): eye-unmuted-reflex 9.345 (-1.3)

**plants standing (share of capacity)** (control 0.071): eye-unmuted-reflex 0.161 (+4.9), eye 0.124 (+2.9), eye-vigilance 0.106 (+1.9)

**genes pinned at a limit** (control 3.5): eye-unmuted-reflex 1.375 (-1.3)

## No clear effect (1)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`eye-unmuted-reflex-vigilance`

