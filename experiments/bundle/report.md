# bundle: comparison report

**Question:** With no help, do meat eaters (diet above 0.75) evolve and last in the grand world with every partial help found so far, together: sparing your own parent and young, a fat reserve (deposit 0.5, founders start with 0.3), plant growth 0.24 (against 0.12), weapons that get in the way of grazing (0.6), meat that keeps in the cold (0.8), more mending of harmful mutations (0.5, against 0.15) and half the cost of heat and cold (0.75, against 1.5)? Also the bundle with each help left out in turn, to see which it needs. 300,000 ticks. An answer: worlds with a lasting group of meat eaters, feeding levels, kills, species and population.

Base world `grand-world`; 300,000 ticks; seeds 2111-2114; 8 arms against `control`; 36 of 36 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 828 | 172 | 681 | 1,048 |
| lowest population | 384 | 135 | 223 | 554 |
| deaths per animal per 1,000 ticks | 2.519 | 1.275 | 1.151 | 4.011 |
| share of deaths by starving | 0.489 | 0.146 | 0.402 | 0.705 |
| share hungry | 0.14 | 0.012 | 0.13 | 0.151 |
| cost per animal per tick | 0.079 | 0.033 | 0.038 | 0.112 |
| share of costs from harmful mutations | 0.189 | 0.009 | 0.181 | 0.201 |
| harmful mutations per animal | 15.9 | 1.117 | 14.2 | 16.6 |
| average diet gene | 0.081 | 0.035 | 0.035 | 0.117 |
| highest diet gene ever | 0.75 | 0.129 | 0.619 | 0.868 |
| meat in the diet | 0.077 | 0.029 | 0.036 | 0.105 |
| kills per 1,000 ticks | 1,047 | 562 | 356 | 1,686 |
| feeding levels | 1.564 | 0.296 | 1.188 | 1.901 |
| births with two parents | 0.358 | 0.112 | 0.266 | 0.506 |
| sex gene | 0.078 | 0.015 | 0.056 | 0.086 |
| species alive | 4.354 | 0.522 | 3.881 | 5.03 |
| species diversity (Shannon) | 1.128 | 0.105 | 0.988 | 1.238 |
| share of cells in colonies | 0.045 | 0.007 | 0.035 | 0.05 |
| share sick | 0.243 | 0.002 | 0.241 | 0.245 |
| brain connections | 11.7 | 0.986 | 10.5 | 12.5 |
| plants standing (share of capacity) | 0.073 | 0.018 | 0.045 | 0.084 |
| worn ground | 0.108 | 0.124 | 0.016 | 0.288 |
| genes pinned at a limit | 4.25 | 3.304 | 2 | 9 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_bond`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): wornShare (50.2%), brainConnections (-11%).

## Red flags (17)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (1)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

- **bundle-no-gentler-heat-cold**: population 1,693 against 828: check the energy ledger for an exploit. Reproduce: `npm run sim -- --config configs/grand-world.json --set spareFamily=1 --set fatDepositRate=0.5 --set initialFat=0.3 --set foodRegrowPerTick=0.24 --set weaponGrazeLoss=0.6 --set meatColdKeep=0.8 --set mutationLoadMend=0.5 --seed 2111 --ticks 300000`

### Big changes (8)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **bundle**: population 828 → 1,572 (4.3 noise units); share hungry 0.14 → 0.098 (-3.5 noise units); share of costs from harmful mutations 0.189 → 0.095 (-9.9 noise units); harmful mutations per animal 15.9 → 5.368 (-9.4 noise units); species alive 4.354 → 6.255 (3.6 noise units)
- **bundle-no-spare-family**: share hungry 0.14 → 0.09 (-4.2 noise units); share of costs from harmful mutations 0.189 → 0.091 (-10.4 noise units); harmful mutations per animal 15.9 → 5.365 (-9.4 noise units)
- **bundle-no-fat**: population 828 → 1,371 (3.2 noise units); share of costs from harmful mutations 0.189 → 0.089 (-10.6 noise units); harmful mutations per animal 15.9 → 5.459 (-9.3 noise units); species alive 4.354 → 8.488 (7.9 noise units); species diversity (Shannon) 1.128 → 1.721 (5.6 noise units)
- **bundle-no-more-plants**: share hungry 0.14 → 0.095 (-3.8 noise units); share of costs from harmful mutations 0.189 → 0.091 (-10.4 noise units); harmful mutations per animal 15.9 → 5.548 (-9.2 noise units); share sick 0.243 → 0.149 (-43.3 noise units)
- **bundle-no-weapons-graze**: share hungry 0.14 → 0.093 (-4 noise units); share of costs from harmful mutations 0.189 → 0.086 (-10.9 noise units); harmful mutations per animal 15.9 → 5.721 (-9.1 noise units); meat in the diet 0.077 → 0.168 (3.1 noise units); share of cells in colonies 0.045 → 0.074 (4.1 noise units)
- **bundle-no-cold-meat**: share hungry 0.14 → 0.098 (-3.5 noise units); share of costs from harmful mutations 0.189 → 0.093 (-10.2 noise units); harmful mutations per animal 15.9 → 5.469 (-9.3 noise units)
- **bundle-no-more-mending**: share hungry 0.14 → 0.099 (-3.4 noise units)
- **bundle-no-gentler-heat-cold**: population 828 → 1,693 (5 noise units); share hungry 0.14 → 0.094 (-3.8 noise units); share of costs from harmful mutations 0.189 → 0.1 (-9.4 noise units); harmful mutations per animal 15.9 → 5.292 (-9.5 noise units); share sick 0.243 → 0.178 (-30.2 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (8)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **bundle**: newly pinned `low_diet`, `low_attack`, `low_generosity`, `low_fat`
- **bundle-no-spare-family**: newly pinned `low_senseRange`, `low_diet`, `low_attack`, `low_sex`, `low_generosity`, `low_fat`
- **bundle-no-fat**: newly pinned `low_attack`, `low_generosity`
- **bundle-no-more-plants**: newly pinned `low_senseRange`, `low_attack`, `low_fat`
- **bundle-no-weapons-graze**: newly pinned `low_fat`
- **bundle-no-cold-meat**: newly pinned `low_attack`, `low_generosity`, `low_fat`
- **bundle-no-more-mending**: newly pinned `low_diet`, `low_attack`, `low_generosity`, `low_fat`
- **bundle-no-gentler-heat-cold**: newly pinned `low_senseRange`, `low_diet`, `low_attack`, `low_generosity`, `low_fat`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 828): bundle-no-gentler-heat-cold 1,693 (+5), bundle 1,572 (+4.3), bundle-no-fat 1,371 (+3.2), bundle-no-cold-meat 1,251 (+2.5)

**share of deaths by starving** (control 0.489): bundle-no-weapons-graze 0.196 (-2)

**share hungry** (control 0.14): bundle-no-spare-family 0.09 (-4.2), bundle-no-weapons-graze 0.093 (-4), bundle-no-gentler-heat-cold 0.094 (-3.8), bundle-no-more-plants 0.095 (-3.8), bundle-no-cold-meat 0.098 (-3.5), bundle 0.098 (-3.5), bundle-no-more-mending 0.099 (-3.4)

**cost per animal per tick** (control 0.079): bundle-no-weapons-graze 0.132 (+1.6)

**share of costs from harmful mutations** (control 0.189): bundle-no-weapons-graze 0.086 (-10.9), bundle-no-fat 0.089 (-10.6), bundle-no-spare-family 0.091 (-10.4), bundle-no-more-plants 0.091 (-10.4), bundle-no-cold-meat 0.093 (-10.2), bundle 0.095 (-9.9), bundle-no-gentler-heat-cold 0.1 (-9.4)

**harmful mutations per animal** (control 15.9): bundle-no-gentler-heat-cold 5.292 (-9.5), bundle-no-spare-family 5.365 (-9.4), bundle 5.368 (-9.4), bundle-no-fat 5.459 (-9.3), bundle-no-cold-meat 5.469 (-9.3), bundle-no-more-plants 5.548 (-9.2), bundle-no-weapons-graze 5.721 (-9.1)

**average diet gene** (control 0.081): bundle-no-weapons-graze 0.155 (+2.1)

**highest diet gene ever** (control 0.75): bundle-no-weapons-graze 0.948 (+1.5)

**meat in the diet** (control 0.077): bundle-no-weapons-graze 0.168 (+3.1), bundle-no-more-plants 0.118 (+1.4)

**kills per 1,000 ticks** (control 1,047): bundle-no-weapons-graze 2,685 (+2.9)

**feeding levels** (control 1.564): bundle-no-weapons-graze 2.045 (+1.6)

**sex gene** (control 0.078): bundle-no-fat 0.11 (+2.2)

**species alive** (control 4.354): bundle-no-fat 8.488 (+7.9), bundle 6.255 (+3.6)

**species diversity (Shannon)** (control 1.128): bundle-no-fat 1.721 (+5.6), bundle 1.354 (+2.1)

**share of cells in colonies** (control 0.045): bundle-no-weapons-graze 0.074 (+4.1), bundle-no-more-plants 0.06 (+2.1)

**share sick** (control 0.243): bundle-no-more-plants 0.149 (-43.3), bundle-no-gentler-heat-cold 0.178 (-30.2)

**plants standing (share of capacity)** (control 0.073): bundle-no-weapons-graze 0.127 (+2.9)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

