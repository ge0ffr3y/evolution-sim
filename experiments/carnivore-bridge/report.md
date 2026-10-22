# carnivore-bridge: comparison report

**Question:** Why does the simple world grow meat eaters and the grand world not? Starting from the simple (default) world, each of the grand world's 15 feature groups is added alone (add-...), and the groups are also added one after another (ladder-...) until the last step is the full grand world. An answer: which group, alone or in combination, makes meat eaters (diet above 0.75, and above 0.5) disappear.

Base world `default`; 200,000 ticks; seeds 1301-1304; 29 arms against `simple`; 120 of 120 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`simple`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 564 | 203 | 455 | 868 |
| lowest population | 182 | 21.5 | 160 | 200 |
| deaths per animal per 1,000 ticks | 7.3 | 3.203 | 2.695 | 10.1 |
| share of deaths by starving | 0.015 | 0.015 | 0.005 | 0.038 |
| share hungry | 0.029 | 0.021 | 0.018 | 0.06 |
| cost per animal per tick | 0.094 | 0.01 | 0.084 | 0.107 |
| share of costs from harmful mutations | 0 | 0 | 0 | 0 |
| harmful mutations per animal | 0 | 0 | 0 | 0 |
| average diet gene | 0.276 | 0.069 | 0.176 | 0.333 |
| highest diet gene ever | 1 | 0 | 1 | 1 |
| meat in the diet | 0.389 | 0.078 | 0.272 | 0.438 |
| kills per 1,000 ticks | 3,600 | 978 | 2,250 | 4,565 |
| feeding levels | 2.584 | 0.238 | 2.337 | 2.901 |
| births with two parents | 0 | 0 | 0 | 0 |
| sex gene | 0 | 0 | 0 | 0 |
| species alive | 3.433 | 0.438 | 2.842 | 3.901 |
| species diversity (Shannon) | 0.755 | 0.154 | 0.527 | 0.864 |
| share of cells in colonies | 0 | 0 | 0 | 0 |
| share sick | 0 | 0 | 0 | 0 |
| brain connections | 0 | 0 | 0 | 0 |
| plants standing (share of capacity) | 0.042 | 0.007 | 0.032 | 0.047 |
| worn ground | 0 | 0 | 0 | 0 |
| genes pinned at a limit | 2.25 | 0.5 | 2 | 3 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_attack`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): hungryShare (19.4%).

## Red flags (50)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (3)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

- **add-size-food**: population 2,091 against 564: check the energy ledger for an exploit. Reproduce: `npm run sim -- --config configs/default.json --set worldWidth=512 --set worldHeight=512 --set initialOrganisms=600 --set maxOrganisms=30000 --set foodRegrowPerTick=0.12 --seed 1301 --ticks 200000`
- **add-kin-herd**: population 1,288 against 564: check the energy ledger for an exploit. Reproduce: `npm run sim -- --config configs/default.json --set kinDistance=0.05 --set kinTolerance=1 --set herdBonus=0.3 --set shareRate=0.4 --seed 1301 --ticks 200000`
- **add-sex-load**: population 1,550 against 564: check the energy ledger for an exploit. Reproduce: `npm run sim -- --config configs/default.json --set sexualReproduction=2 --set sexAcceptAny=1 --set sexFounderSpread=1 --set sexWaitLimit=200 --set mateReadyFraction=0.6 --set mutationLoadRate=3 --set mutationLoadCost=0.04 --set mutationLoadModel=1 --set mutationLoadMend=0.15 --seed 1301 --ticks 200000`

### Big changes (22)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **add-size-food**: population 564 → 2,091 (7.5 noise units); lowest population 182 → 529 (16.2 noise units); kills per 1,000 ticks 3,600 → 20,687 (17.5 noise units)
- **add-nutrients**: lowest population 182 → 60 (-5.7 noise units); cost per animal per tick 0.094 → 0.307 (21.9 noise units); plants standing (share of capacity) 0.042 → 0.153 (16.2 noise units); genes pinned at a limit 2.25 → 0 (-4.5 noise units)
- **add-life-history**: share of deaths by starving 0.015 → 0.173 (10.4 noise units); share hungry 0.029 → 0.278 (12 noise units)
- **add-climate**: share of deaths by starving 0.015 → 0.956 (61.9 noise units); share hungry 0.029 → 0.162 (6.4 noise units); cost per animal per tick 0.094 → 0.055 (-4 noise units); average diet gene 0.276 → 0.019 (-3.7 noise units); meat in the diet 0.389 → 0.015 (-4.8 noise units); kills per 1,000 ticks 3,600 → 21.1 (-3.7 noise units); feeding levels 2.584 → 1 (-6.7 noise units); species alive 3.433 → 1 (-5.5 noise units); species diversity (Shannon) 0.755 → 0 (-4.9 noise units); plants standing (share of capacity) 0.042 → 0.016 (-3.8 noise units)
- **add-events**: lowest population 182 → 55.8 (-5.8 noise units); share of deaths by starving 0.015 → 0.924 (59.8 noise units); share hungry 0.029 → 0.174 (7 noise units); cost per animal per tick 0.094 → 0.041 (-5.5 noise units); average diet gene 0.276 → 0.024 (-3.6 noise units); meat in the diet 0.389 → 0.022 (-4.7 noise units); kills per 1,000 ticks 3,600 → 25.1 (-3.7 noise units); feeding levels 2.584 → 1.002 (-6.6 noise units); species alive 3.433 → 1 (-5.5 noise units); species diversity (Shannon) 0.755 → 0 (-4.9 noise units); plants standing (share of capacity) 0.042 → 0.018 (-3.5 noise units)
- **add-plant-kinds**: share of deaths by starving 0.015 → 0.815 (52.7 noise units); share hungry 0.029 → 0.168 (6.6 noise units); cost per animal per tick 0.094 → 0.052 (-4.4 noise units); average diet gene 0.276 → 0.042 (-3.4 noise units); meat in the diet 0.389 → 0.028 (-4.6 noise units); kills per 1,000 ticks 3,600 → 72.9 (-3.6 noise units); feeding levels 2.584 → 1.119 (-6.2 noise units); species alive 3.433 → 1.208 (-5.1 noise units); species diversity (Shannon) 0.755 → 0.094 (-4.3 noise units); genes pinned at a limit 2.25 → 3.75 (3 noise units)
- **add-kin-herd**: meat in the diet 0.389 → 0.083 (-3.9 noise units); species alive 3.433 → 1.498 (-4.4 noise units); genes pinned at a limit 2.25 → 6 (7.5 noise units)
- **add-sex-load**: population 564 → 1,550 (4.9 noise units); share of deaths by starving 0.015 → 0.951 (61.6 noise units); share hungry 0.029 → 0.162 (6.4 noise units); cost per animal per tick 0.094 → 0.036 (-6 noise units); average diet gene 0.276 → 0.012 (-3.8 noise units); meat in the diet 0.389 → 0.008 (-4.9 noise units); kills per 1,000 ticks 3,600 → 13.7 (-3.7 noise units); feeding levels 2.584 → 1 (-6.7 noise units); species alive 3.433 → 1 (-5.5 noise units); species diversity (Shannon) 0.755 → 0 (-4.9 noise units); plants standing (share of capacity) 0.042 → 0.012 (-4.3 noise units); genes pinned at a limit 2.25 → 4.5 (4.5 noise units)
- **ladder-02-nutrients**: cost per animal per tick 0.094 → 0.523 (44.1 noise units); kills per 1,000 ticks 3,600 → 8,009 (4.5 noise units); plants standing (share of capacity) 0.042 → 0.247 (29.9 noise units); genes pinned at a limit 2.25 → 0.25 (-4 noise units)
- **ladder-03-mutation**: cost per animal per tick 0.094 → 0.468 (38.4 noise units); kills per 1,000 ticks 3,600 → 8,943 (5.5 noise units); plants standing (share of capacity) 0.042 → 0.23 (27.4 noise units); genes pinned at a limit 2.25 → 0 (-4.5 noise units)
- **ladder-04-life-history**: lowest population 182 → 294 (5.2 noise units); cost per animal per tick 0.094 → 0.433 (34.8 noise units); kills per 1,000 ticks 3,600 → 9,612 (6.1 noise units); plants standing (share of capacity) 0.042 → 0.227 (27.1 noise units); genes pinned at a limit 2.25 → 0 (-4.5 noise units)
- **ladder-05-land-damage**: lowest population 182 → 265 (3.9 noise units); cost per animal per tick 0.094 → 0.459 (37.4 noise units); kills per 1,000 ticks 3,600 → 9,246 (5.8 noise units); plants standing (share of capacity) 0.042 → 0.23 (27.4 noise units); genes pinned at a limit 2.25 → 0 (-4.5 noise units)
- **ladder-06-terrain**: cost per animal per tick 0.094 → 0.335 (24.7 noise units); plants standing (share of capacity) 0.042 → 0.233 (27.9 noise units); genes pinned at a limit 2.25 → 0 (-4.5 noise units)
- **ladder-07-climate**: share of deaths by starving 0.015 → 0.081 (4.3 noise units); cost per animal per tick 0.094 → 0.19 (9.8 noise units); species alive 3.433 → 1.767 (-3.8 noise units); species diversity (Shannon) 0.755 → 0.266 (-3.2 noise units); plants standing (share of capacity) 0.042 → 0.114 (10.5 noise units); genes pinned at a limit 2.25 → 0.5 (-3.5 noise units)
- **ladder-08-events**: lowest population 182 → 92.3 (-4.2 noise units); share of deaths by starving 0.015 → 0.094 (5.2 noise units); cost per animal per tick 0.094 → 0.193 (10.1 noise units); species alive 3.433 → 1.861 (-3.6 noise units); plants standing (share of capacity) 0.042 → 0.113 (10.4 noise units); genes pinned at a limit 2.25 → 0.5 (-3.5 noise units)
- **ladder-09-plant-kinds**: share of deaths by starving 0.015 → 0.451 (28.7 noise units); share hungry 0.029 → 0.145 (5.6 noise units); meat in the diet 0.389 → 0.147 (-3.1 noise units); feeding levels 2.584 → 1.856 (-3.1 noise units); plants standing (share of capacity) 0.042 → 0.131 (13 noise units)
- **ladder-10-kin-herd**: share of deaths by starving 0.015 → 0.22 (13.5 noise units); share hungry 0.029 → 0.12 (4.4 noise units); plants standing (share of capacity) 0.042 → 0.221 (26.1 noise units)
- **ladder-11-sex-load**: lowest population 182 → 101 (-3.7 noise units); share of deaths by starving 0.015 → 0.333 (20.9 noise units); share hungry 0.029 → 0.123 (4.5 noise units); cost per animal per tick 0.094 → 0.164 (7.2 noise units); meat in the diet 0.389 → 0.127 (-3.3 noise units); plants standing (share of capacity) 0.042 → 0.273 (33.7 noise units)
- **ladder-12-disease**: share of deaths by starving 0.015 → 0.383 (24.2 noise units); share hungry 0.029 → 0.123 (4.5 noise units); cost per animal per tick 0.094 → 0.161 (6.8 noise units); meat in the diet 0.389 → 0.111 (-3.6 noise units); plants standing (share of capacity) 0.042 → 0.244 (29.4 noise units)
- **ladder-13-camouflage**: share of deaths by starving 0.015 → 0.574 (36.8 noise units); share hungry 0.029 → 0.139 (5.3 noise units); meat in the diet 0.389 → 0.089 (-3.8 noise units); feeding levels 2.584 → 1.802 (-3.3 noise units); plants standing (share of capacity) 0.042 → 0.17 (18.7 noise units)
- **ladder-14-colonies**: share of deaths by starving 0.015 → 0.482 (30.7 noise units); share hungry 0.029 → 0.132 (4.9 noise units); meat in the diet 0.389 → 0.106 (-3.6 noise units); plants standing (share of capacity) 0.042 → 0.182 (20.5 noise units)
- **ladder-15-brains**: share of deaths by starving 0.015 → 0.414 (26.3 noise units); share hungry 0.029 → 0.128 (4.7 noise units); cost per animal per tick 0.094 → 0.061 (-3.4 noise units); average diet gene 0.276 → 0.066 (-3 noise units); meat in the diet 0.389 → 0.086 (-3.9 noise units); feeding levels 2.584 → 1.332 (-5.3 noise units); species alive 3.433 → 5.408 (4.5 noise units); species diversity (Shannon) 0.755 → 1.355 (3.9 noise units); plants standing (share of capacity) 0.042 → 0.085 (6.3 noise units); genes pinned at a limit 2.25 → 5.5 (6.5 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (2)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

- **ladder-03-mutation**: shannon still changing by -31.4% over the last quarter (control 10.2%)
- **ladder-04-life-history**: plantFill still changing by -16.3% over the last quarter (control 6%)

### Pinned genes (23)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **add-size-food**: newly pinned `high_metabolism`
- **add-nutrients**: freed `low_attack`
- **add-climate**: newly pinned `low_diet`
- **add-events**: newly pinned `low_diet`, `low_torpor`
- **add-plant-kinds**: newly pinned `low_diet`
- **add-kin-herd**: newly pinned `low_senseRange`, `low_diet`, `low_armor`, `low_tolerance`, `low_generosity`
- **add-sex-load**: newly pinned `low_senseRange`, `low_diet`, `low_armor`
- **add-disease**: newly pinned `low_diet`
- **add-colonies**: newly pinned `low_bond`
- **add-brains**: newly pinned `low_diet`
- **ladder-02-nutrients**: freed `low_size`, `low_attack`
- **ladder-03-mutation**: freed `low_size`, `low_attack`
- **ladder-04-life-history**: freed `low_size`, `low_attack`
- **ladder-05-land-damage**: freed `low_size`, `low_attack`
- **ladder-06-terrain**: freed `low_attack`
- **ladder-07-climate**: freed `low_attack`
- **ladder-08-events**: freed `low_attack`
- **ladder-10-kin-herd**: freed `low_attack`
- **ladder-11-sex-load**: freed `low_attack`
- **ladder-12-disease**: freed `low_attack`
- **ladder-13-camouflage**: newly pinned `low_sex`
- **ladder-14-colonies**: newly pinned `low_sex`, `low_bond`
- **ladder-15-brains**: newly pinned `low_generosity`, `low_bond`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 564): add-size-food 2,091 (+7.5), add-sex-load 1,550 (+4.9), add-nutrients 172 (-1.9), ladder-15-brains 874 (+1.5)

**lowest population** (control 182): add-size-food 529 (+16.2), add-events 55.8 (-5.8), add-nutrients 60 (-5.7), ladder-04-life-history 294 (+5.2), ladder-08-events 92.3 (-4.2), ladder-05-land-damage 265 (+3.9), ladder-11-sex-load 101 (-3.7), add-climate 123 (-2.7)

**deaths per animal per 1,000 ticks** (control 7.3): ladder-05-land-damage 14.6 (+2.3), ladder-04-life-history 14.5 (+2.3), add-sex-load 0.181 (-2.2), ladder-03-mutation 13.8 (+2), add-climate 0.847 (-2), add-events 0.864 (-2), ladder-02-nutrients 13.7 (+2), add-plant-kinds 1.608 (-1.8)

**share of deaths by starving** (control 0.015): add-climate 0.956 (+61.9), add-sex-load 0.951 (+61.6), add-events 0.924 (+59.8), add-plant-kinds 0.815 (+52.7), ladder-13-camouflage 0.574 (+36.8), ladder-14-colonies 0.482 (+30.7), ladder-09-plant-kinds 0.451 (+28.7), ladder-15-brains 0.414 (+26.3)

**share hungry** (control 0.029): add-life-history 0.278 (+12), add-events 0.174 (+7), add-plant-kinds 0.168 (+6.6), add-sex-load 0.162 (+6.4), add-climate 0.162 (+6.4), ladder-09-plant-kinds 0.145 (+5.6), ladder-13-camouflage 0.139 (+5.3), ladder-14-colonies 0.132 (+4.9)

**cost per animal per tick** (control 0.094): ladder-02-nutrients 0.523 (+44.1), ladder-03-mutation 0.468 (+38.4), ladder-05-land-damage 0.459 (+37.4), ladder-04-life-history 0.433 (+34.8), ladder-06-terrain 0.335 (+24.7), add-nutrients 0.307 (+21.9), ladder-08-events 0.193 (+10.1), ladder-07-climate 0.19 (+9.8)

**average diet gene** (control 0.276): add-sex-load 0.012 (-3.8), add-climate 0.019 (-3.7), add-events 0.024 (-3.6), add-plant-kinds 0.042 (-3.4), ladder-15-brains 0.066 (-3), ladder-13-camouflage 0.125 (-2.2), ladder-04-life-history 0.423 (+2.1), ladder-03-mutation 0.422 (+2.1)

**meat in the diet** (control 0.389): add-sex-load 0.008 (-4.9), add-climate 0.015 (-4.8), add-events 0.022 (-4.7), add-plant-kinds 0.028 (-4.6), add-kin-herd 0.083 (-3.9), ladder-15-brains 0.086 (-3.9), ladder-13-camouflage 0.089 (-3.8), ladder-14-colonies 0.106 (-3.6)

**kills per 1,000 ticks** (control 3,600): add-size-food 20,687 (+17.5), ladder-04-life-history 9,612 (+6.1), ladder-05-land-damage 9,246 (+5.8), ladder-03-mutation 8,943 (+5.5), ladder-02-nutrients 8,009 (+4.5), add-sex-load 13.7 (-3.7), add-climate 21.1 (-3.7), add-events 25.1 (-3.7)

**feeding levels** (control 2.584): add-climate 1 (-6.7), add-sex-load 1 (-6.7), add-events 1.002 (-6.6), add-plant-kinds 1.119 (-6.2), ladder-15-brains 1.332 (-5.3), ladder-13-camouflage 1.802 (-3.3), ladder-09-plant-kinds 1.856 (-3.1), ladder-14-colonies 1.931 (-2.7)

**species alive** (control 3.433): add-climate 1 (-5.5), add-events 1 (-5.5), add-sex-load 1 (-5.5), add-plant-kinds 1.208 (-5.1), ladder-15-brains 5.408 (+4.5), add-kin-herd 1.498 (-4.4), ladder-07-climate 1.767 (-3.8), ladder-08-events 1.861 (-3.6)

**species diversity (Shannon)** (control 0.755): add-climate 0 (-4.9), add-events 0 (-4.9), add-sex-load 0 (-4.9), add-plant-kinds 0.094 (-4.3), ladder-15-brains 1.355 (+3.9), ladder-07-climate 0.266 (-3.2), ladder-08-events 0.335 (-2.7), ladder-10-kin-herd 0.968 (+1.4)

**plants standing (share of capacity)** (control 0.042): ladder-11-sex-load 0.273 (+33.7), ladder-02-nutrients 0.247 (+29.9), ladder-12-disease 0.244 (+29.4), ladder-06-terrain 0.233 (+27.9), ladder-03-mutation 0.23 (+27.4), ladder-05-land-damage 0.23 (+27.4), ladder-04-life-history 0.227 (+27.1), ladder-10-kin-herd 0.221 (+26.1)

**genes pinned at a limit** (control 2.25): add-kin-herd 6 (+7.5), ladder-15-brains 5.5 (+6.5), add-nutrients 0 (-4.5), add-sex-load 4.5 (+4.5), ladder-03-mutation 0 (-4.5), ladder-04-life-history 0 (-4.5), ladder-05-land-damage 0 (-4.5), ladder-06-terrain 0 (-4.5)

## No clear effect (6)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`add-mutation`, `add-land-damage`, `add-disease`, `add-camouflage`, `add-colonies`, `add-brains`

