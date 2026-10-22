# carnivore-screen: comparison report

**Question:** What lets a lasting group of meat eaters (diet above 0.75) take hold in the grand world? A 4-seed screen of seven changes against today's grand world: diet-based mating (hunters mate with hunters), a stronger gut trade-off, richer carcasses, meat that keeps in the cold, hungry prey that defend less, weapons that get in the way of grazing, and all six together. Anything promising is confirmed on 16 fresh seeds.

Base world `grand-world`; 300,000 ticks; seeds 1101-1104; 7 arms against `control`; 32 of 32 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 930 | 120 | 754 | 1,006 |
| lowest population | 502 | 151 | 282 | 600 |
| deaths per animal per 1,000 ticks | 1.658 | 0.835 | 1.082 | 2.897 |
| share of deaths by starving | 0.502 | 0.129 | 0.338 | 0.65 |
| share hungry | 0.137 | 0.009 | 0.131 | 0.15 |
| cost per animal per tick | 0.052 | 0.022 | 0.037 | 0.085 |
| share of costs from harmful mutations | 0.207 | 0.018 | 0.192 | 0.227 |
| harmful mutations per animal | 15.6 | 1.332 | 14.2 | 17.3 |
| average diet gene | 0.061 | 0.038 | 0.037 | 0.118 |
| highest diet gene ever | 0.777 | 0.182 | 0.611 | 1 |
| meat in the diet | 0.061 | 0.026 | 0.034 | 0.097 |
| kills per 1,000 ticks | 775 | 464 | 380 | 1,446 |
| feeding levels | 1.327 | 0.39 | 1 | 1.891 |
| births with two parents | 0.392 | 0.111 | 0.23 | 0.475 |
| sex gene | 0.068 | 0.014 | 0.049 | 0.081 |
| species alive | 5.693 | 1.169 | 4.099 | 6.901 |
| species diversity (Shannon) | 1.346 | 0.285 | 0.968 | 1.658 |
| share of cells in colonies | 0.035 | 0.009 | 0.029 | 0.047 |
| share sick | 0.178 | 0.076 | 0.088 | 0.248 |
| brain connections | 11.1 | 1.576 | 9.373 | 12.9 |
| plants standing (share of capacity) | 0.052 | 0.023 | 0.03 | 0.083 |
| worn ground | 0.274 | 0.207 | 0.005 | 0.443 |
| genes pinned at a limit | 6.5 | 3 | 2 | 8 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_senseRange`, `low_metabolism`, `low_diet`, `low_attack`, `low_bond`, `low_sex`, `low_generosity`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): dietMax (20.3%), wornShare (66.4%).

## Red flags (2)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (0)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

None.

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (2)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **cold-meat**: freed `low_metabolism`
- **hungry-prey**: freed `low_metabolism`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**lowest population** (control 502): cold-meat 202 (-2)

**share hungry** (control 0.137): all-together 0.153 (+1.8)

**cost per animal per tick** (control 0.052): cold-meat 0.09 (+1.7)

**births with two parents** (control 0.392): cold-meat 0.268 (-1.1)

**species alive** (control 5.693): cold-meat 3.973 (-1.5), rich-carcasses 4.436 (-1.1)

**plants standing (share of capacity)** (control 0.052): cold-meat 0.095 (+1.9), hungry-prey 0.087 (+1.5)

## No clear effect (3)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`diet-mating`, `gut-tradeoff`, `weapons-graze`

