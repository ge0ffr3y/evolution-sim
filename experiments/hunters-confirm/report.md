# hunters-confirm: comparison report

**Question:** Does a 'hunters' grand world reliably grow meat eaters? Today's grand world against two versions without harmful mutations, sex and kin restraint: one also without the whole climate (as in carnivore-bridge-2, meat eaters in 3 of 4 worlds), one without only the seasons (keeping day and night, weather, drift, the cost of heat and cold, torpor and ice ages). 16 fresh seeds, 300,000 ticks. An answer: in how many worlds a meat-eating group (diet above 0.75) holds over the second half, how big, and what the versions cost in species and population.

Base world `grand-world`; 300,000 ticks; seeds 1601-1616; 2 arms against `control`; 48 of 48 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 900 | 129 | 651 | 1,069 |
| lowest population | 357 | 151 | 160 | 600 |
| deaths per animal per 1,000 ticks | 1.762 | 0.826 | 1.078 | 3.636 |
| share of deaths by starving | 0.521 | 0.117 | 0.243 | 0.654 |
| share hungry | 0.139 | 0.013 | 0.104 | 0.153 |
| cost per animal per tick | 0.056 | 0.024 | 0.037 | 0.111 |
| share of costs from harmful mutations | 0.197 | 0.011 | 0.175 | 0.213 |
| harmful mutations per animal | 15.4 | 1.062 | 14.3 | 17.9 |
| average diet gene | 0.061 | 0.038 | 0.035 | 0.168 |
| highest diet gene ever | 0.789 | 0.154 | 0.5 | 1 |
| meat in the diet | 0.064 | 0.03 | 0.034 | 0.131 |
| kills per 1,000 ticks | 758 | 415 | 372 | 1,663 |
| feeding levels | 1.34 | 0.368 | 1.01 | 2 |
| births with two parents | 0.405 | 0.103 | 0.212 | 0.535 |
| sex gene | 0.069 | 0.019 | 0.048 | 0.109 |
| species alive | 5.462 | 2.034 | 2.634 | 8.95 |
| species diversity (Shannon) | 1.325 | 0.395 | 0.694 | 1.953 |
| share of cells in colonies | 0.039 | 0.012 | 0.028 | 0.076 |
| share sick | 0.223 | 0.046 | 0.12 | 0.298 |
| brain connections | 10.6 | 1.562 | 7.633 | 12.7 |
| plants standing (share of capacity) | 0.066 | 0.03 | 0.036 | 0.15 |
| worn ground | 0.214 | 0.126 | 0.007 | 0.373 |
| genes pinned at a limit | 6.75 | 2.352 | 2 | 9 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_senseRange`, `low_metabolism`, `low_diet`, `low_attack`, `low_bond`, `low_sex`, `low_generosity`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): wornShare (34.3%).

## Red flags (4)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (2)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **hunters-no-climate**: deaths per animal per 1,000 ticks 1.762 → 4.724 (3.6 noise units); share of costs from harmful mutations 0.197 → 0 (-17.9 noise units); harmful mutations per animal 15.4 → 0 (-14.5 noise units); average diet gene 0.061 → 0.183 (3.2 noise units); meat in the diet 0.064 → 0.227 (5.5 noise units); kills per 1,000 ticks 758 → 4,401 (8.8 noise units); feeding levels 1.34 → 2.744 (3.8 noise units); births with two parents 0.405 → 0 (-3.9 noise units); sex gene 0.069 → 0 (-3.6 noise units)
- **hunters-no-seasons**: share of costs from harmful mutations 0.197 → 0 (-17.9 noise units); harmful mutations per animal 15.4 → 0 (-14.5 noise units); births with two parents 0.405 → 0 (-3.9 noise units); sex gene 0.069 → 0 (-3.6 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (2)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **hunters-no-climate**: freed `low_metabolism`, `low_sex`, `low_generosity`
- **hunters-no-seasons**: freed `low_sex`, `low_generosity`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 900): hunters-no-climate 1,227 (+2.5), hunters-no-seasons 1,053 (+1.2)

**lowest population** (control 357): hunters-no-climate 600 (+1.6)

**deaths per animal per 1,000 ticks** (control 1.762): hunters-no-climate 4.724 (+3.6)

**share of deaths by starving** (control 0.521): hunters-no-climate 0.223 (-2.5)

**share hungry** (control 0.139): hunters-no-climate 0.114 (-1.9), hunters-no-seasons 0.125 (-1.1)

**cost per animal per tick** (control 0.056): hunters-no-climate 0.085 (+1.2)

**share of costs from harmful mutations** (control 0.197): hunters-no-climate 0 (-17.9), hunters-no-seasons 0 (-17.9)

**harmful mutations per animal** (control 15.4): hunters-no-climate 0 (-14.5), hunters-no-seasons 0 (-14.5)

**average diet gene** (control 0.061): hunters-no-climate 0.183 (+3.2)

**highest diet gene ever** (control 0.789): hunters-no-climate 1 (+1.4), hunters-no-seasons 0.969 (+1.2)

**meat in the diet** (control 0.064): hunters-no-climate 0.227 (+5.5), hunters-no-seasons 0.094 (+1)

**kills per 1,000 ticks** (control 758): hunters-no-climate 4,401 (+8.8)

**feeding levels** (control 1.34): hunters-no-climate 2.744 (+3.8)

**births with two parents** (control 0.405): hunters-no-climate 0 (-3.9), hunters-no-seasons 0 (-3.9)

**sex gene** (control 0.069): hunters-no-climate 0 (-3.6), hunters-no-seasons 0 (-3.6)

**share sick** (control 0.223): hunters-no-climate 0.341 (+2.5)

**brain connections** (control 10.6): hunters-no-seasons 7.102 (-2.2), hunters-no-climate 8.293 (-1.5)

**plants standing (share of capacity)** (control 0.066): hunters-no-climate 0.106 (+1.3)

**worn ground** (control 0.214): hunters-no-climate 0.083 (-1)

**genes pinned at a limit** (control 6.75): hunters-no-climate 2.75 (-1.7)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

