# path-bundle: comparison report

**Question:** With no help, do meat eaters (diet above 0.75) evolve and last in the grand world with the bundle of helps without the weapons penalty (sparing your own parent and young, a fat reserve, plant growth 0.24, meat that keeps in the cold, more mending 0.5, half the cost of heat and cold), and the same without fat? 16 fresh seeds, 500,000 ticks. An answer: worlds with 10+ meat eaters for most of the second half, feeding levels, kills, species and population.

Base world `grand-world`; 500,000 ticks; seeds 2201-2216; 2 arms against `control`; 48 of 48 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 838 | 110 | 654 | 1,009 |
| lowest population | 238 | 107 | 101 | 525 |
| deaths per animal per 1,000 ticks | 1.838 | 0.522 | 1.172 | 2.749 |
| share of deaths by starving | 0.471 | 0.103 | 0.328 | 0.666 |
| share hungry | 0.129 | 0.01 | 0.115 | 0.143 |
| cost per animal per tick | 0.062 | 0.019 | 0.038 | 0.094 |
| share of costs from harmful mutations | 0.194 | 0.009 | 0.18 | 0.209 |
| harmful mutations per animal | 15.8 | 0.823 | 14.4 | 17 |
| average diet gene | 0.068 | 0.022 | 0.039 | 0.109 |
| highest diet gene ever | 0.8 | 0.118 | 0.632 | 1 |
| meat in the diet | 0.076 | 0.021 | 0.037 | 0.106 |
| kills per 1,000 ticks | 807 | 265 | 369 | 1,215 |
| feeding levels | 1.488 | 0.268 | 1.01 | 1.782 |
| births with two parents | 0.41 | 0.07 | 0.297 | 0.529 |
| sex gene | 0.073 | 0.017 | 0.051 | 0.104 |
| species alive | 5.046 | 1.661 | 2.01 | 8.525 |
| species diversity (Shannon) | 1.229 | 0.307 | 0.675 | 1.836 |
| share of cells in colonies | 0.042 | 0.01 | 0.028 | 0.068 |
| share sick | 0.199 | 0.024 | 0.158 | 0.235 |
| brain connections | 9.644 | 0.974 | 8.464 | 11.4 |
| plants standing (share of capacity) | 0.081 | 0.03 | 0.046 | 0.131 |
| worn ground | 0.236 | 0.138 | 0.071 | 0.438 |
| genes pinned at a limit | 5.5 | 2.608 | 2 | 9 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_diet`, `low_attack`, `low_bond`, `low_sex`, `low_generosity`.

## Red flags (4)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (2)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **path-bundle**: share hungry 0.129 → 0.09 (-3.7 noise units); share of costs from harmful mutations 0.194 → 0.086 (-11.6 noise units); harmful mutations per animal 15.8 → 5.578 (-12.4 noise units); kills per 1,000 ticks 807 → 2,008 (4.5 noise units)
- **path-bundle-no-fat**: share of costs from harmful mutations 0.194 → 0.084 (-11.9 noise units); harmful mutations per animal 15.8 → 5.641 (-12.3 noise units); average diet gene 0.068 → 0.136 (3.1 noise units); meat in the diet 0.076 → 0.156 (3.7 noise units); kills per 1,000 ticks 807 → 2,527 (6.5 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (2)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **path-bundle**: newly pinned `low_fat`
- **path-bundle-no-fat**: freed `low_diet`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 838): path-bundle-no-fat 1,135 (+2.7), path-bundle 1,104 (+2.4)

**lowest population** (control 238): path-bundle-no-fat 476 (+2.2), path-bundle 417 (+1.7)

**deaths per animal per 1,000 ticks** (control 1.838): path-bundle-no-fat 2.993 (+2.2), path-bundle 2.572 (+1.4)

**share of deaths by starving** (control 0.471): path-bundle-no-fat 0.24 (-2.2), path-bundle 0.268 (-2)

**share hungry** (control 0.129): path-bundle 0.09 (-3.7), path-bundle-no-fat 0.108 (-2.1)

**cost per animal per tick** (control 0.062): path-bundle 0.098 (+2), path-bundle-no-fat 0.094 (+1.7)

**share of costs from harmful mutations** (control 0.194): path-bundle-no-fat 0.084 (-11.9), path-bundle 0.086 (-11.6)

**harmful mutations per animal** (control 15.8): path-bundle 5.578 (-12.4), path-bundle-no-fat 5.641 (-12.3)

**average diet gene** (control 0.068): path-bundle-no-fat 0.136 (+3.1), path-bundle 0.108 (+1.8)

**highest diet gene ever** (control 0.8): path-bundle-no-fat 0.94 (+1.2)

**meat in the diet** (control 0.076): path-bundle-no-fat 0.156 (+3.7), path-bundle 0.137 (+2.9)

**kills per 1,000 ticks** (control 807): path-bundle-no-fat 2,527 (+6.5), path-bundle 2,008 (+4.5)

**feeding levels** (control 1.488): path-bundle-no-fat 1.984 (+1.9), path-bundle 1.91 (+1.6)

**births with two parents** (control 0.41): path-bundle 0.274 (-1.9)

**sex gene** (control 0.073): path-bundle-no-fat 0.113 (+2.3)

**species alive** (control 5.046): path-bundle-no-fat 9.408 (+2.6)

**species diversity (Shannon)** (control 1.229): path-bundle-no-fat 1.78 (+1.8)

**share of cells in colonies** (control 0.042): path-bundle-no-fat 0.063 (+2.1), path-bundle 0.061 (+1.9)

**share sick** (control 0.199): path-bundle-no-fat 0.231 (+1.3)

**plants standing (share of capacity)** (control 0.081): path-bundle-no-fat 0.12 (+1.3), path-bundle 0.112 (+1)

**genes pinned at a limit** (control 5.5): path-bundle-no-fat 2.5 (-1.2)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

