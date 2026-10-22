# carnivore-invasion: comparison report

**Question:** Can a ready-made group of meat eaters hold its own in the grand world once it exists? At tick 100,000 one animal in twenty becomes an armed meat eater (diet gene 0.95, attack gene 0.6; nothing else changes), and the run continues to tick 200,000. Compared: today's grand world, no sex (so mating cannot dilute them), diet-based mating, meat that keeps in the cold, hungry prey that defend less, weapons that get in the way of grazing, poorer plants (quality 1.5), and diet-based mating plus the three new settings plus poorer plants together. An answer: in which setups meat eaters (diet above 0.75) are still there at the end, and how many.

Base world `grand-world`; 200,000 ticks; seeds 1201-1204; 7 arms against `control`; 32 of 32 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 931 | 177 | 805 | 1,192 |
| lowest population | 423 | 116 | 297 | 579 |
| deaths per animal per 1,000 ticks | 2.125 | 0.226 | 1.785 | 2.25 |
| share of deaths by starving | 0.416 | 0.055 | 0.337 | 0.458 |
| share hungry | 0.127 | 0.004 | 0.122 | 0.133 |
| cost per animal per tick | 0.071 | 0.015 | 0.049 | 0.082 |
| share of costs from harmful mutations | 0.194 | 0.01 | 0.187 | 0.208 |
| harmful mutations per animal | 15.9 | 0.494 | 15.5 | 16.6 |
| average diet gene | 0.078 | 0.008 | 0.069 | 0.086 |
| highest diet gene ever | 0.981 | 0.023 | 0.95 | 1 |
| meat in the diet | 0.091 | 0.015 | 0.079 | 0.107 |
| kills per 1,000 ticks | 1,137 | 139 | 1,023 | 1,315 |
| feeding levels | 1.731 | 0.148 | 1.637 | 1.95 |
| births with two parents | 0.306 | 0.059 | 0.268 | 0.393 |
| sex gene | 0.073 | 0.01 | 0.062 | 0.086 |
| species alive | 4.078 | 1.688 | 2.627 | 6.398 |
| species diversity (Shannon) | 0.963 | 0.339 | 0.676 | 1.432 |
| share of cells in colonies | 0.046 | 0.007 | 0.04 | 0.056 |
| share sick | 0.23 | 0.036 | 0.193 | 0.279 |
| brain connections | 10.1 | 1.416 | 8.524 | 11.8 |
| plants standing (share of capacity) | 0.093 | 0.008 | 0.081 | 0.1 |
| worn ground | 0.048 | 0.03 | 0.018 | 0.085 |
| genes pinned at a limit | 5 | 1.826 | 3 | 7 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_attack`, `low_bond`, `low_sex`, `low_generosity`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): wornShare (106%), cost_load (-16.9%).

## Red flags (7)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (3)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **asexual**: births with two parents 0.306 → 0 (-5.2 noise units); sex gene 0.073 → 0 (-7.3 noise units)
- **hungry-prey**: deaths per animal per 1,000 ticks 2.125 → 3.21 (4.8 noise units)
- **weapons-graze**: deaths per animal per 1,000 ticks 2.125 → 1.295 (-3.7 noise units); share of deaths by starving 0.416 → 0.633 (4 noise units); share hungry 0.127 → 0.148 (4.8 noise units); average diet gene 0.078 → 0.046 (-4.2 noise units); kills per 1,000 ticks 1,137 → 557 (-4.2 noise units); feeding levels 1.731 → 1.192 (-3.6 noise units); plants standing (share of capacity) 0.093 → 0.048 (-5.4 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (4)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **asexual**: freed `low_sex`
- **cold-meat**: newly pinned `low_metabolism`, `low_diet`
- **hungry-prey**: freed `low_attack`
- **weapons-graze**: newly pinned `low_senseRange`, `low_metabolism`, `low_diet`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**lowest population** (control 423): hungry-prey 302 (-1)

**deaths per animal per 1,000 ticks** (control 2.125): hungry-prey 3.21 (+4.8), weapons-graze 1.295 (-3.7)

**share of deaths by starving** (control 0.416): weapons-graze 0.633 (+4), hungry-prey 0.35 (-1.2)

**share hungry** (control 0.127): weapons-graze 0.148 (+4.8)

**cost per animal per tick** (control 0.071): weapons-graze 0.043 (-1.8)

**harmful mutations per animal** (control 15.9): weapons-graze 14.5 (-2.7), hungry-prey 16.7 (+1.7)

**average diet gene** (control 0.078): weapons-graze 0.046 (-4.2)

**meat in the diet** (control 0.091): weapons-graze 0.049 (-2.9), poor-plants 0.07 (-1.5)

**kills per 1,000 ticks** (control 1,137): weapons-graze 557 (-4.2)

**feeding levels** (control 1.731): weapons-graze 1.192 (-3.6)

**births with two parents** (control 0.306): asexual 0 (-5.2), weapons-graze 0.416 (+1.9)

**sex gene** (control 0.073): asexual 0 (-7.3)

**species diversity (Shannon)** (control 0.963): poor-plants 1.339 (+1.1)

**plants standing (share of capacity)** (control 0.093): weapons-graze 0.048 (-5.4)

**worn ground** (control 0.048): weapons-graze 0.116 (+2.2)

**genes pinned at a limit** (control 5): weapons-graze 7.75 (+1.5)

## No clear effect (3)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`diet-mating`, `cold-meat`, `all-together`

