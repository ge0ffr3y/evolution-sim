# kill-payoff: comparison report

**Question:** With richer kills, do meat eaters (diet above 0.75) evolve and last in the grand world on their own? Today's body energy of 4 per unit of size against 6, 8 and 12, with and without sparing your own parent and young, no help from invasions, 300,000 ticks. An answer: worlds with a lasting group of meat eaters, feeding levels, kills, species and population.

Base world `grand-world`; 300,000 ticks; seeds 1911-1914; 5 arms against `control`; 24 of 24 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 845 | 184 | 686 | 1,038 |
| lowest population | 389 | 83.2 | 269 | 460 |
| deaths per animal per 1,000 ticks | 2.399 | 1.468 | 1.117 | 3.889 |
| share of deaths by starving | 0.489 | 0.188 | 0.295 | 0.681 |
| share hungry | 0.13 | 0.012 | 0.116 | 0.145 |
| cost per animal per tick | 0.076 | 0.046 | 0.037 | 0.128 |
| share of costs from harmful mutations | 0.2 | 0.008 | 0.193 | 0.211 |
| harmful mutations per animal | 16.1 | 1.536 | 14.6 | 17.7 |
| average diet gene | 0.084 | 0.057 | 0.034 | 0.137 |
| highest diet gene ever | 0.834 | 0.141 | 0.653 | 0.958 |
| meat in the diet | 0.076 | 0.043 | 0.036 | 0.115 |
| kills per 1,000 ticks | 1,047 | 765 | 370 | 1,891 |
| feeding levels | 1.473 | 0.44 | 1.079 | 1.95 |
| births with two parents | 0.365 | 0.141 | 0.229 | 0.491 |
| sex gene | 0.064 | 0.006 | 0.057 | 0.068 |
| species alive | 6.077 | 2.33 | 2.871 | 8.337 |
| species diversity (Shannon) | 1.39 | 0.353 | 0.884 | 1.704 |
| share of cells in colonies | 0.042 | 0.012 | 0.03 | 0.055 |
| share sick | 0.231 | 0.036 | 0.182 | 0.268 |
| brain connections | 10.6 | 1.973 | 8.871 | 13.2 |
| plants standing (share of capacity) | 0.076 | 0.035 | 0.037 | 0.109 |
| worn ground | 0.178 | 0.206 | 0.005 | 0.434 |
| genes pinned at a limit | 5.25 | 3.775 | 2 | 9 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_senseRange`, `low_attack`, `low_bond`, `low_sex`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): wornShare (46.5%).

## Red flags (4)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (2)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **body-12**: sex gene 0.064 → 0.087 (4.3 noise units)
- **body-12-spare-family**: sex gene 0.064 → 0.095 (5.7 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (2)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **body-6**: newly pinned `low_generosity`
- **body-8**: freed `low_attack`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**lowest population** (control 389): body-12 237 (-1.8)

**share hungry** (control 0.13): body-12 0.152 (+1.8), body-12-spare-family 0.149 (+1.5)

**sex gene** (control 0.064): body-12-spare-family 0.095 (+5.7), body-12 0.087 (+4.3)

## No clear effect (3)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`body-6`, `body-8`, `body-8-spare-family`

