# living-plants-3: comparison report

**Question:** Living plants, step 3: do dietary nutrients (dietNutrients 1: three nutrients, a plant's mix set by its chemistry, meat an even mix, running short costs upkeep) push animals toward mixed diets and meat eating, and change species and feeding levels in the grand world? With today's fixed kinds of plant, with plants that evolve, and with plants that evolve and toxins. Also: does plant toxin rise because it pays, or by chance? Toxins that do harm against harmless toxins (no harm, no growth cost: the chance-only baseline). 8 fresh seeds, 300,000 ticks, with the diet ledger.

Base world `grand-world`; 300,000 ticks; seeds 3701-3708; 5 arms against `control`; 48 of 48 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 1,191 | 140 | 1,028 | 1,375 |
| lowest population | 474 | 101 | 316 | 600 |
| deaths per animal per 1,000 ticks | 3.043 | 0.63 | 2.153 | 3.92 |
| share of deaths by starving | 0.258 | 0.071 | 0.186 | 0.376 |
| share hungry | 0.119 | 0.012 | 0.105 | 0.136 |
| cost per animal per tick | 0.093 | 0.022 | 0.059 | 0.122 |
| share of costs from harmful mutations | 0.085 | 0.006 | 0.078 | 0.094 |
| harmful mutations per animal | 5.628 | 0.097 | 5.484 | 5.746 |
| average diet gene | 0.128 | 0.028 | 0.089 | 0.168 |
| highest diet gene ever | 0.908 | 0.084 | 0.79 | 1 |
| meat in the diet | 0.153 | 0.024 | 0.112 | 0.182 |
| kills per 1,000 ticks | 2,669 | 603 | 1,846 | 3,468 |
| feeding levels | 1.959 | 0.079 | 1.782 | 2 |
| births with two parents | 0.328 | 0.055 | 0.278 | 0.445 |
| sex gene | 0.115 | 0.031 | 0.08 | 0.167 |
| species alive | 7.311 | 2.544 | 4.812 | 11 |
| species diversity (Shannon) | 1.526 | 0.429 | 1.006 | 2.074 |
| share of cells in colonies | 0.061 | 0.009 | 0.044 | 0.07 |
| share sick | 0.26 | 0.045 | 0.17 | 0.302 |
| brain connections | 10.6 | 1.194 | 9.091 | 12.4 |
| plants standing (share of capacity) | 0.094 | 0.024 | 0.057 | 0.122 |
| worn ground | 0.054 | 0.064 | 0.006 | 0.178 |
| genes pinned at a limit | 2.25 | 0.707 | 2 | 4 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_bond`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): wornShare (67.5%).

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

- **living-nutrients**: newly pinned `low_attack`
- **living-harmless-toxins**: newly pinned `low_attack`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 1,191): living-harmless-toxins 1,439 (+1.8)

**lowest population** (control 474): living-toxins 592 (+1.2)

**share of deaths by starving** (control 0.258): living-nutrients 0.382 (+1.7)

**share hungry** (control 0.119): living-nutrients 0.139 (+1.6)

**cost per animal per tick** (control 0.093): living-harmless-toxins 0.066 (-1.2)

**average diet gene** (control 0.128): living-harmless-toxins 0.097 (-1.1)

**meat in the diet** (control 0.153): living-nutrients 0.103 (-2.1), living-harmless-toxins 0.119 (-1.4), living-toxins 0.119 (-1.4), living-toxins-nutrients 0.121 (-1.4)

## No clear effect (1)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`nutrients`

