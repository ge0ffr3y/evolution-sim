# carnivore-invasion-big: comparison report

**Question:** Can a ready-made group of meat eaters twice the size of their prey hold its own in the grand world? As carnivore-invasion, but each invader's body is also doubled (paid from its own energy and nutrient, topped up from the soil where it stands): at tick 100,000 one animal in twenty becomes an armed meat eater twice its old size, and the run continues to tick 200,000. Setups: today's grand world, no sex, diet-based mating, meat that keeps in the cold, weapons that get in the way of grazing, poorer plants (quality 1.5), and those changes (but not no-sex) together. An answer: in which setups meat eaters (diet above 0.75) are still there at the end, against the same-size invasion.

Base world `grand-world`; 200,000 ticks; seeds 1201-1204; 6 arms against `control`; 28 of 28 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 882 | 170 | 783 | 1,136 |
| lowest population | 360 | 178 | 182 | 579 |
| deaths per animal per 1,000 ticks | 2.128 | 0.585 | 1.271 | 2.506 |
| share of deaths by starving | 0.449 | 0.137 | 0.338 | 0.649 |
| share hungry | 0.131 | 0.015 | 0.114 | 0.148 |
| cost per animal per tick | 0.073 | 0.023 | 0.039 | 0.092 |
| share of costs from harmful mutations | 0.189 | 0.005 | 0.182 | 0.194 |
| harmful mutations per animal | 15.8 | 0.813 | 14.7 | 16.5 |
| average diet gene | 0.073 | 0.027 | 0.04 | 0.099 |
| highest diet gene ever | 0.975 | 0.022 | 0.95 | 1 |
| meat in the diet | 0.079 | 0.022 | 0.046 | 0.098 |
| kills per 1,000 ticks | 1,018 | 354 | 506 | 1,309 |
| feeding levels | 1.653 | 0.329 | 1.229 | 2.02 |
| births with two parents | 0.346 | 0.083 | 0.282 | 0.468 |
| sex gene | 0.089 | 0.032 | 0.06 | 0.134 |
| species alive | 4.367 | 1.115 | 3.468 | 5.955 |
| species diversity (Shannon) | 1.07 | 0.322 | 0.722 | 1.368 |
| share of cells in colonies | 0.042 | 0.005 | 0.039 | 0.05 |
| share sick | 0.219 | 0.029 | 0.177 | 0.237 |
| brain connections | 10.4 | 1.961 | 8.52 | 12.8 |
| plants standing (share of capacity) | 0.089 | 0.028 | 0.047 | 0.111 |
| worn ground | 0.059 | 0.05 | 0.012 | 0.123 |
| genes pinned at a limit | 5 | 2.449 | 3 | 8 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_attack`, `low_bond`, `low_generosity`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): wornShare (93.7%), shannon (-14.8%).

## Red flags (5)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (1)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **asexual**: births with two parents 0.346 → 0 (-4.2 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (4)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **asexual**: newly pinned `low_diet`
- **cold-meat**: newly pinned `low_senseRange`, `low_metabolism`, `low_diet`, `low_sex`
- **weapons-graze**: newly pinned `low_senseRange`, `low_metabolism`, `low_diet`
- **all-together**: newly pinned `low_diet`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**meat in the diet** (control 0.079): diet-mating 0.11 (+1.4)

**births with two parents** (control 0.346): asexual 0 (-4.2)

**sex gene** (control 0.089): asexual 0 (-2.8)

## No clear effect (4)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`cold-meat`, `weapons-graze`, `poor-plants`, `all-together`

