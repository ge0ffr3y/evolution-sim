# nutrient-doses: comparison report

**Question:** Dietary nutrients that bite: at the default use (0.001 a tick) food refills reserves far faster than they drain and almost nobody runs short. A plant eater takes in about 0.0075 breedings' worth of food a tick, so with dietPlantSkew 0.8 one kind of plant brings about 0.0015 of its poorest nutrient and a mixed diet about 0.0075 of each. With use set between those (0.004, and 0.006 near the limit of a mixed diet), and with plants that hold only their own nutrient (dietPlantSkew 1), do animals mix their diets, eat more meat, split into more species, and does a meat-eating group last? Fixed kinds of plant, and plants that evolve. 8 fresh seeds, 300,000 ticks, with the diet ledger.

Base world `grand-world`; 300,000 ticks; seeds 3801-3808; 4 arms against `control`; 40 of 40 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 1,386 | 201 | 1,073 | 1,749 |
| lowest population | 474 | 123 | 292 | 600 |
| deaths per animal per 1,000 ticks | 2.241 | 0.455 | 1.597 | 2.918 |
| share of deaths by starving | 0.346 | 0.069 | 0.239 | 0.423 |
| share hungry | 0.133 | 0.011 | 0.116 | 0.145 |
| cost per animal per tick | 0.074 | 0.019 | 0.051 | 0.111 |
| share of costs from harmful mutations | 0.086 | 0.007 | 0.07 | 0.095 |
| harmful mutations per animal | 5.478 | 0.076 | 5.385 | 5.6 |
| average diet gene | 0.097 | 0.018 | 0.074 | 0.129 |
| highest diet gene ever | 0.91 | 0.082 | 0.825 | 1 |
| meat in the diet | 0.133 | 0.022 | 0.105 | 0.167 |
| kills per 1,000 ticks | 1,984 | 278 | 1,671 | 2,338 |
| feeding levels | 1.949 | 0.044 | 1.891 | 2 |
| births with two parents | 0.345 | 0.082 | 0.248 | 0.489 |
| sex gene | 0.102 | 0.04 | 0.066 | 0.191 |
| species alive | 8.937 | 3.536 | 5.218 | 15.4 |
| species diversity (Shannon) | 1.65 | 0.38 | 1.294 | 2.326 |
| share of cells in colonies | 0.057 | 0.011 | 0.04 | 0.073 |
| share sick | 0.249 | 0.037 | 0.188 | 0.307 |
| brain connections | 11.5 | 1.847 | 9.745 | 15.1 |
| plants standing (share of capacity) | 0.078 | 0.016 | 0.062 | 0.102 |
| worn ground | 0.122 | 0.091 | 0.032 | 0.275 |
| genes pinned at a limit | 3.75 | 0.886 | 3 | 5 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_attack`, `low_bond`, `low_generosity`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): plantFill (31.7%).

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

**population** (control 1,386): use-004-pure 1,072 (-1.6)

**deaths per animal per 1,000 ticks** (control 2.241): use-004-pure 3.444 (+2.6), living-use-004 3.307 (+2.3)

**share of deaths by starving** (control 0.346): use-004-pure 0.253 (-1.3)

**cost per animal per tick** (control 0.074): use-004-pure 0.103 (+1.6)

**harmful mutations per animal** (control 5.478): use-004-pure 5.621 (+1.9), living-use-004 5.582 (+1.4)

**average diet gene** (control 0.097): use-004-pure 0.13 (+1.8)

**kills per 1,000 ticks** (control 1,984): living-use-004 2,807 (+3), use-004-pure 2,692 (+2.5), use-004 2,617 (+2.3)

**births with two parents** (control 0.345): living-use-004 0.262 (-1)

**share sick** (control 0.249): living-use-004 0.293 (+1.2)

**plants standing (share of capacity)** (control 0.078): use-004-pure 0.107 (+1.8)

**worn ground** (control 0.122): living-use-004 0.016 (-1.2)

**genes pinned at a limit** (control 3.75): use-004-pure 2.5 (-1.4), living-use-004 2.75 (-1.1)

## No clear effect (1)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`use-006`

