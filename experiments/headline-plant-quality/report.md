# headline-plant-quality: comparison report

**Question:** Does poorer plant food make longer food chains but fewer species, and given a million ticks, do true meat eaters (a lasting group with a diet above 0.75) take hold where plants are poor? Plant quality limits of 2 (today's), 1.5, 1 and 0.75. An answer: feeding levels, meat eaters, meat in the diet, species and population along the gradient, with 95% ranges.

Base world `grand-world`; 1,000,000 ticks; seeds 901-916; 3 arms against `control`; 64 of 64 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 814 | 95.2 | 637 | 970 |
| lowest population | 262 | 62.2 | 167 | 389 |
| deaths per animal per 1,000 ticks | 1.987 | 0.762 | 1.196 | 3.654 |
| share of deaths by starving | 0.416 | 0.104 | 0.262 | 0.575 |
| share hungry | 0.12 | 0.011 | 0.096 | 0.138 |
| cost per animal per tick | 0.064 | 0.023 | 0.036 | 0.106 |
| share of costs from harmful mutations | 0.202 | 0.009 | 0.179 | 0.213 |
| harmful mutations per animal | 16.2 | 0.848 | 15 | 17.9 |
| average diet gene | 0.083 | 0.039 | 0.043 | 0.171 |
| highest diet gene ever | 0.844 | 0.121 | 0.623 | 1 |
| meat in the diet | 0.089 | 0.028 | 0.052 | 0.14 |
| kills per 1,000 ticks | 943 | 395 | 468 | 1,713 |
| feeding levels | 1.592 | 0.275 | 1.069 | 1.99 |
| births with two parents | 0.428 | 0.087 | 0.306 | 0.584 |
| sex gene | 0.077 | 0.019 | 0.046 | 0.12 |
| species alive | 5.281 | 1.586 | 3.148 | 8.98 |
| species diversity (Shannon) | 1.276 | 0.257 | 0.884 | 1.839 |
| share of cells in colonies | 0.041 | 0.01 | 0.024 | 0.063 |
| share sick | 0.169 | 0.029 | 0.1 | 0.218 |
| brain connections | 10.4 | 1.125 | 8.695 | 12 |
| plants standing (share of capacity) | 0.087 | 0.032 | 0.041 | 0.144 |
| worn ground | 0.28 | 0.143 | 0.043 | 0.498 |
| genes pinned at a limit | 5.25 | 2.543 | 2 | 9 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_attack`, `low_bond`, `low_sex`, `low_generosity`.

## Red flags (5)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (2)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **quality-10**: population 814 → 383 (-4.5 noise units); share hungry 0.12 → 0.063 (-5.1 noise units); cost per animal per tick 0.064 → 0.183 (5.2 noise units); average diet gene 0.083 → 0.224 (3.6 noise units); sex gene 0.077 → 0.155 (4.1 noise units); share sick 0.169 → 0.068 (-3.5 noise units); plants standing (share of capacity) 0.087 → 0.256 (5.4 noise units)
- **quality-075**: population 814 → 286 (-5.5 noise units); share hungry 0.12 → 0.044 (-6.9 noise units); cost per animal per tick 0.064 → 0.217 (6.7 noise units); average diet gene 0.083 → 0.239 (4.1 noise units); meat in the diet 0.089 → 0.181 (3.3 noise units); sex gene 0.077 → 0.167 (4.7 noise units); share sick 0.169 → 0.018 (-5.2 noise units); plants standing (share of capacity) 0.087 → 0.335 (7.9 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (3)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **quality-15**: freed `low_attack`
- **quality-10**: freed `low_attack`, `low_generosity`
- **quality-075**: freed `low_attack`, `low_sex`, `low_generosity`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 814): quality-075 286 (-5.5), quality-10 383 (-4.5), quality-15 617 (-2.1)

**lowest population** (control 262): quality-075 97.9 (-2.6), quality-10 124 (-2.2), quality-15 177 (-1.4)

**deaths per animal per 1,000 ticks** (control 1.987): quality-10 4.203 (+2.9), quality-075 4.047 (+2.7), quality-15 3.031 (+1.4)

**share of deaths by starving** (control 0.416): quality-075 0.207 (-2), quality-10 0.237 (-1.7)

**share hungry** (control 0.12): quality-075 0.044 (-6.9), quality-10 0.063 (-5.1), quality-15 0.099 (-1.9)

**cost per animal per tick** (control 0.064): quality-075 0.217 (+6.7), quality-10 0.183 (+5.2), quality-15 0.114 (+2.2)

**share of costs from harmful mutations** (control 0.202): quality-10 0.215 (+1.4), quality-075 0.214 (+1.3)

**harmful mutations per animal** (control 16.2): quality-075 18.7 (+2.9), quality-10 18.3 (+2.4), quality-15 17.2 (+1.1)

**average diet gene** (control 0.083): quality-075 0.239 (+4.1), quality-10 0.224 (+3.6), quality-15 0.133 (+1.3)

**meat in the diet** (control 0.089): quality-075 0.181 (+3.3), quality-10 0.159 (+2.5)

**feeding levels** (control 1.592): quality-10 1.996 (+1.5), quality-075 1.995 (+1.5), quality-15 1.9 (+1.1)

**sex gene** (control 0.077): quality-075 0.167 (+4.7), quality-10 0.155 (+4.1), quality-15 0.106 (+1.5)

**species alive** (control 5.281): quality-075 2.437 (-1.8), quality-10 3.502 (-1.1)

**species diversity (Shannon)** (control 1.276): quality-075 0.704 (-2.2), quality-10 0.957 (-1.2)

**share of cells in colonies** (control 0.041): quality-10 0.072 (+2.9), quality-075 0.071 (+2.9), quality-15 0.058 (+1.6)

**share sick** (control 0.169): quality-075 0.018 (-5.2), quality-10 0.068 (-3.5)

**brain connections** (control 10.4): quality-075 8.116 (-2), quality-10 8.49 (-1.7)

**plants standing (share of capacity)** (control 0.087): quality-075 0.335 (+7.9), quality-10 0.256 (+5.4), quality-15 0.149 (+2)

**worn ground** (control 0.28): quality-075 0.004 (-1.9), quality-10 0.006 (-1.9), quality-15 0.064 (-1.5)

**genes pinned at a limit** (control 5.25): quality-075 1.438 (-1.5), quality-10 1.813 (-1.4), quality-15 2.063 (-1.3)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

