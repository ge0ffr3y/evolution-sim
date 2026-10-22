# headline-barriers-2: comparison report

**Question:** Do geographic barriers produce more species? The grand world cut into two halves by two straight water channels that animals cannot cross, against the same world uncut. An answer: species alive and ever, Shannon diversity, the share in the biggest species, and how far the two halves drift apart (the share of gene variation that lies between land masses), with 95% ranges.

Base world `grand-world`; 500,000 ticks; seeds 1001-1016; 1 arms against `control`; 32 of 32 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 878 | 102 | 600 | 1,022 |
| lowest population | 248 | 89.7 | 111 | 497 |
| deaths per animal per 1,000 ticks | 1.688 | 0.832 | 1.138 | 4.253 |
| share of deaths by starving | 0.496 | 0.103 | 0.269 | 0.614 |
| share hungry | 0.129 | 0.009 | 0.111 | 0.146 |
| cost per animal per tick | 0.055 | 0.026 | 0.036 | 0.133 |
| share of costs from harmful mutations | 0.2 | 0.011 | 0.186 | 0.227 |
| harmful mutations per animal | 15.7 | 0.897 | 14.7 | 17.8 |
| average diet gene | 0.064 | 0.036 | 0.037 | 0.16 |
| highest diet gene ever | 0.816 | 0.139 | 0.616 | 1 |
| meat in the diet | 0.07 | 0.027 | 0.038 | 0.135 |
| kills per 1,000 ticks | 750 | 413 | 372 | 1,866 |
| feeding levels | 1.493 | 0.313 | 1.03 | 1.99 |
| births with two parents | 0.449 | 0.076 | 0.265 | 0.546 |
| sex gene | 0.07 | 0.014 | 0.051 | 0.109 |
| species alive | 5.261 | 1.735 | 2.327 | 8.95 |
| species diversity (Shannon) | 1.284 | 0.328 | 0.705 | 1.979 |
| share of cells in colonies | 0.04 | 0.009 | 0.029 | 0.062 |
| share sick | 0.188 | 0.038 | 0.089 | 0.23 |
| brain connections | 10.7 | 1.385 | 7.416 | 13.6 |
| plants standing (share of capacity) | 0.071 | 0.027 | 0.039 | 0.142 |
| worn ground | 0.313 | 0.146 | 0.012 | 0.505 |
| genes pinned at a limit | 6.688 | 2.301 | 2 | 8 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_senseRange`, `low_metabolism`, `low_diet`, `low_attack`, `low_bond`, `low_sex`, `low_generosity`.

## Red flags (0)

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

### Pinned genes (0)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

None.

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 878): two-halves 759 (-1.2)

**sex gene** (control 0.07): two-halves 0.088 (+1.3)

**plants standing (share of capacity)** (control 0.071): two-halves 0.111 (+1.5)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

