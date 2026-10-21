# audit-1-switch-off: comparison report

**Question:** What does each mechanism of the grand world (with 15% mending) do there, does any of them do nothing at all, and what does a disease that can actually spread do to the world?

Base world `grand-world`; 200,000 ticks; seeds 1-8; 48 arms against `control`; 392 of 392 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 764 | 81.3 | 638 | 874 |
| lowest population | 314 | 120 | 131 | 460 |
| deaths per animal per 1,000 ticks | 1.499 | 0.526 | 0.927 | 2.664 |
| share of deaths by starving | 0.726 | 0.137 | 0.575 | 0.94 |
| share hungry | 0.194 | 0.026 | 0.151 | 0.244 |
| cost per animal per tick | 0.042 | 0.008 | 0.033 | 0.059 |
| share of costs from harmful mutations | 0.239 | 0.015 | 0.219 | 0.261 |
| harmful mutations per animal | 14.5 | 1.058 | 12.9 | 16.1 |
| average diet gene | 0.031 | 0.024 | 0.015 | 0.088 |
| highest diet gene ever | 0.335 | 0.099 | 0.203 | 0.446 |
| meat in the diet | 0.037 | 0.02 | 0.014 | 0.073 |
| kills per 1,000 ticks | 331 | 224 | 63.6 | 722 |
| feeding levels | 1.015 | 0.038 | 1 | 1.109 |
| births with two parents | 0.141 | 0.069 | 0.062 | 0.282 |
| sex gene | 0.159 | 0.076 | 0.067 | 0.316 |
| species alive | 2.015 | 0.496 | 1.01 | 2.832 |
| species diversity (Shannon) | 0.562 | 0.251 | 8.00e-4 | 0.897 |
| share of cells in colonies | 0.027 | 0.005 | 0.018 | 0.035 |
| share sick | 0 | 0 | 0 | 0 |
| brain connections | 9.901 | 0.988 | 8.79 | 12 |
| plants standing (share of capacity) | 0.05 | 0.009 | 0.031 | 0.06 |
| worn ground | 0.151 | 0.067 | 0.062 | 0.275 |
| genes pinned at a limit | 6.375 | 1.302 | 4 | 8 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_senseRange`, `low_diet`, `low_attack`, `low_bond`, `low_generosity`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): wornShare (65.8%).

## Red flags (27)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (1)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

- **no-land-damage**: population 1,703 against 764: check the energy ledger for an exploit. Reproduce: `npm run sim -- --config configs/grand-world.json --set overgrazeDamage=0 --set fouling=0 --set erosionRate=0 --seed 1 --ticks 200000`

### Big changes (13)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **no-terrain**: population 764 → 1,028 (3.2 noise units)
- **no-climate**: population 764 → 1,084 (3.9 noise units); meat in the diet 0.037 → 0.1 (3.2 noise units); kills per 1,000 ticks 331 → 1,369 (4.6 noise units); feeding levels 1.015 → 1.436 (11 noise units)
- **no-seasons**: species alive 2.015 → 3.809 (3.6 noise units)
- **no-harsh-years**: plants standing (share of capacity) 0.05 → 0.145 (10.3 noise units)
- **one-plant-kind**: share of costs from harmful mutations 0.239 → 0.172 (-4.5 noise units); share of cells in colonies 0.027 → 0.01 (-3.2 noise units); plants standing (share of capacity) 0.05 → 0.018 (-3.5 noise units); worn ground 0.151 → 0.469 (4.7 noise units)
- **no-brains**: brain connections 9.901 → 0 (-10 noise units); plants standing (share of capacity) 0.05 → 0.238 (20.2 noise units)
- **no-harmful-mutations**: share of costs from harmful mutations 0.239 → 0 (-16 noise units); harmful mutations per animal 14.5 → 0 (-13.7 noise units)
- **no-camouflage**: plants standing (share of capacity) 0.05 → 0.143 (10 noise units)
- **no-aging**: plants standing (share of capacity) 0.05 → 0.156 (11.4 noise units)
- **no-torpor**: plants standing (share of capacity) 0.05 → 0.157 (11.5 noise units)
- **no-colonies**: share of cells in colonies 0.027 → 0 (-5.1 noise units)
- **no-overgrazing**: population 764 → 1,446 (8.4 noise units)
- **no-land-damage**: population 764 → 1,703 (11.6 noise units); kills per 1,000 ticks 331 → 1,197 (3.9 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (2)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

- **no-terrain**: soilHealthMean still changing by -11.3% over the last quarter (control -6%)
- **one-plant-kind**: wornShare still changing by 22% over the last quarter (control 65.8%)

### Pinned genes (11)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **no-terrain**: newly pinned `low_armor`
- **no-seasons**: newly pinned `low_armor`
- **no-heat-cold-cost**: newly pinned `low_armor`
- **one-plant-kind**: newly pinned `low_armor`
- **no-brains**: newly pinned `low_sex`; freed `low_senseRange`
- **no-chem-body-effects**: newly pinned `low_metabolism`
- **no-kin-restraint**: newly pinned `low_armor`
- **no-torpor**: newly pinned `low_armor`
- **no-colonies**: freed `low_bond`
- **no-sharing**: freed `low_generosity`
- **no-fouling**: newly pinned `low_armor`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 764): no-land-damage 1,703 (+11.6), no-overgrazing 1,446 (+8.4), no-climate 1,084 (+3.9), no-terrain 1,028 (+3.2), no-brains 555 (-2.6), no-erosion 942 (+2.2), no-chemicals 642 (-1.5), asexual 664 (-1.2)

**lowest population** (control 314): no-climate 600 (+2.4), one-plant-kind 122 (-1.6), no-terrain 483 (+1.4), no-founder-variety 168 (-1.2)

**deaths per animal per 1,000 ticks** (control 1.499): no-brains 2.536 (+2), no-blight 2.175 (+1.3), asexual 2.157 (+1.3), one-plant-kind 0.882 (-1.2)

**share of deaths by starving** (control 0.726): no-climate 0.365 (-2.6), no-harmful-mutations 0.498 (-1.7), one-plant-kind 0.95 (+1.6), no-land-damage 0.516 (-1.5), no-blight 0.536 (-1.4), no-kin-restraint 0.892 (+1.2)

**share hungry** (control 0.194): no-litters 0.125 (-2.7), no-climate 0.149 (-1.8), no-outbreak 0.159 (-1.4), no-disease 0.162 (-1.3), no-blight 0.165 (-1.2)

**cost per animal per tick** (control 0.042): no-outbreak 0.062 (+2.3), no-blight 0.06 (+2.1), asexual 0.059 (+2), no-litters 0.057 (+1.8), no-appetite-senses 0.054 (+1.4)

**share of costs from harmful mutations** (control 0.239): no-harmful-mutations 0 (-16), one-plant-kind 0.172 (-4.5), no-land-damage 0.271 (+2.2), disease-cost-1-wide 0.208 (-2.1), no-sharing 0.215 (-1.6), no-seasons 0.217 (-1.4), no-overgrazing 0.259 (+1.4), no-heat-cold-cost 0.258 (+1.3)

**harmful mutations per animal** (control 14.5): no-harmful-mutations 0 (-13.7), one-plant-kind 11.6 (-2.8), no-brains 16.1 (+1.5), no-blight 16 (+1.4), asexual 15.7 (+1.1)

**meat in the diet** (control 0.037): no-climate 0.1 (+3.2), no-harmful-mutations 0.081 (+2.2), no-land-damage 0.081 (+2.2), no-overgrazing 0.068 (+1.6), one-plant-kind 0.009 (-1.4), no-kin-restraint 0.016 (-1.1)

**kills per 1,000 ticks** (control 331): no-climate 1,369 (+4.6), no-land-damage 1,197 (+3.9), no-overgrazing 871 (+2.4), no-blight 718 (+1.7), one-plant-kind 29.9 (-1.3), no-kin-restraint 87.7 (-1.1)

**feeding levels** (control 1.015): no-climate 1.436 (+11)

**births with two parents** (control 0.141): asexual 0 (-2.1), no-brains 0.042 (-1.4)

**sex gene** (control 0.159): asexual 0 (-2.1), no-brains 0.044 (-1.5), no-blight 0.081 (-1)

**species alive** (control 2.015): no-seasons 3.809 (+3.6), no-volcano 3.374 (+2.7), disease-cost-1-wide 3.23 (+2.4), no-luck 3.13 (+2.2), no-chem-body-effects 3.126 (+2.2), no-fire 3.085 (+2.2), no-sharing 3.082 (+2.1), no-scent 3.02 (+2)

**species diversity (Shannon)** (control 0.562): one-plant-kind 0.019 (-2.2), no-volcano 0.949 (+1.5), no-terrain 0.845 (+1.1), no-sharing 0.825 (+1)

**share of cells in colonies** (control 0.027): no-colonies 0 (-5.1), one-plant-kind 0.01 (-3.2), asexual 0.038 (+2.1), no-seasons 0.017 (-1.9), no-fouling 0.019 (-1.5)

**brain connections** (control 9.901): no-brains 0 (-10), asexual 7.28 (-2.7), no-founder-variety 8.314 (-1.6), no-heat-cold-cost 8.793 (-1.1)

**plants standing (share of capacity)** (control 0.05): no-brains 0.238 (+20.2), no-torpor 0.157 (+11.5), no-aging 0.156 (+11.4), no-harsh-years 0.145 (+10.3), no-camouflage 0.143 (+10), one-plant-kind 0.018 (-3.5), no-terrain 0.031 (-2.1), no-kin-restraint 0.041 (-1)

**worn ground** (control 0.151): one-plant-kind 0.469 (+4.7), no-erosion 0 (-2.3), no-land-damage 0 (-2.3), no-seasons 0.269 (+1.8), no-brains 0.036 (-1.7), asexual 0.065 (-1.3), no-blight 0.073 (-1.2), no-litters 0.076 (-1.1)

**genes pinned at a limit** (control 6.375): asexual 4.25 (-1.6)

## No clear effect (14)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`no-day-night`, `no-weather`, `no-climate-drift`, `no-old-catastrophes`, `no-good-year`, `no-events-at-all`, `no-brain-memory`, `no-home`, `no-kill-ownership`, `no-tolerance-gene`, `no-herd`, `disease-cost-5`, `disease-cost-1`, `no-cell-types`

