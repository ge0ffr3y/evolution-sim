# audit-4-confirm: comparison report

**Question:** On 16 fresh seeds, do Stage 3's best candidates hold up (nutrients level 2: a second feeding level and more sex; a mutation-rate floor of 0.01: bigger, steadier populations), do they work together, and does adding rare big mutations let true meat eaters take hold?

Base world `grand-world`; 200,000 ticks; seeds 101-116; 4 arms against `control`; 80 of 80 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 864 | 159 | 633 | 1,235 |
| lowest population | 322 | 118 | 135 | 508 |
| deaths per animal per 1,000 ticks | 1.788 | 0.611 | 0.888 | 3.325 |
| share of deaths by starving | 0.699 | 0.203 | 0.369 | 0.943 |
| share hungry | 0.196 | 0.036 | 0.155 | 0.283 |
| cost per animal per tick | 0.053 | 0.015 | 0.031 | 0.089 |
| share of costs from harmful mutations | 0.2 | 0.016 | 0.173 | 0.233 |
| harmful mutations per animal | 14.2 | 1.376 | 11.8 | 16.2 |
| average diet gene | 0.033 | 0.018 | 0.015 | 0.078 |
| highest diet gene ever | 0.343 | 0.077 | 0.251 | 0.546 |
| meat in the diet | 0.041 | 0.024 | 0.014 | 0.087 |
| kills per 1,000 ticks | 478 | 371 | 62 | 1,109 |
| feeding levels | 1.027 | 0.058 | 1 | 1.168 |
| births with two parents | 0.118 | 0.06 | 0.026 | 0.228 |
| sex gene | 0.131 | 0.066 | 0.03 | 0.251 |
| species alive | 2.573 | 0.72 | 2 | 4 |
| species diversity (Shannon) | 0.747 | 0.212 | 0.506 | 1.297 |
| share of cells in colonies | 0.025 | 0.01 | 0.011 | 0.051 |
| share sick | 0.188 | 0.062 | 0.044 | 0.266 |
| brain connections | 9.954 | 1.745 | 7.327 | 13.3 |
| plants standing (share of capacity) | 0.095 | 0.076 | 0.034 | 0.264 |
| worn ground | 0.09 | 0.087 | 0.006 | 0.322 |
| genes pinned at a limit | 6.188 | 2.007 | 3 | 10 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_senseRange`, `low_diet`, `low_attack`, `low_bond`, `low_generosity`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): wornShare (95.5%).

## Red flags (4)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (3)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **nutrients-2**: cost per animal per tick 0.053 → 0.101 (3.4 noise units); average diet gene 0.033 → 0.109 (4.2 noise units); feeding levels 1.027 → 1.406 (6.5 noise units); births with two parents 0.118 → 0.363 (4.1 noise units)
- **both**: average diet gene 0.033 → 0.088 (3.1 noise units); feeding levels 1.027 → 1.63 (10.4 noise units); births with two parents 0.118 → 0.32 (3.4 noise units)
- **both-big-mutations**: highest diet gene ever 0.343 → 0.809 (6.1 noise units); feeding levels 1.027 → 1.468 (7.6 noise units); births with two parents 0.118 → 0.346 (3.8 noise units); species alive 2.573 → 5.077 (3.5 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (1)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **mutation-floor-01**: newly pinned `low_metabolism`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 864): mutation-floor-01 1,026 (+1)

**deaths per animal per 1,000 ticks** (control 1.788): both 2.517 (+1.2)

**share of deaths by starving** (control 0.699): nutrients-2 0.39 (-1.5), both 0.434 (-1.3)

**share hungry** (control 0.196): nutrients-2 0.116 (-2.2), both 0.132 (-1.8), both-big-mutations 0.134 (-1.7)

**cost per animal per tick** (control 0.053): nutrients-2 0.101 (+3.4), both 0.079 (+1.8), both-big-mutations 0.071 (+1.2)

**harmful mutations per animal** (control 14.2): both 16.1 (+1.4), nutrients-2 16.1 (+1.3), both-big-mutations 15.9 (+1.2)

**average diet gene** (control 0.033): nutrients-2 0.109 (+4.2), both 0.088 (+3.1), both-big-mutations 0.078 (+2.5)

**highest diet gene ever** (control 0.343): both-big-mutations 0.809 (+6.1), both 0.493 (+2)

**meat in the diet** (control 0.041): nutrients-2 0.088 (+2), both 0.088 (+2), both-big-mutations 0.076 (+1.5)

**kills per 1,000 ticks** (control 478): both 1,195 (+1.9), both-big-mutations 944 (+1.3), nutrients-2 928 (+1.2)

**feeding levels** (control 1.027): both 1.63 (+10.4), both-big-mutations 1.468 (+7.6), nutrients-2 1.406 (+6.5)

**births with two parents** (control 0.118): nutrients-2 0.363 (+4.1), both-big-mutations 0.346 (+3.8), both 0.32 (+3.4)

**species alive** (control 2.573): both-big-mutations 5.077 (+3.5), both 4.489 (+2.7)

**species diversity (Shannon)** (control 0.747): both-big-mutations 1.232 (+2.3), both 1.144 (+1.9)

**share of cells in colonies** (control 0.025): both 0.046 (+2.2), both-big-mutations 0.043 (+1.8), nutrients-2 0.04 (+1.5)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

