# audit-4b-shortlist: comparison report

**Question:** On 16 fresh seeds, does Stage 2's shortlist hold up: where does the cold-side cliff begin (base temperature, plant temperature tolerance, ice-age cooling), does poorer plant food reliably build a food web (more meat, more feeding levels) and at what cost, and is today's weather strength a peak for population?

Base world `grand-world`; 200,000 ticks; seeds 401-416; 11 arms against `control`; 192 of 192 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 905 | 204 | 552 | 1,213 |
| lowest population | 341 | 78.1 | 197 | 480 |
| deaths per animal per 1,000 ticks | 2.243 | 1.092 | 1.082 | 4.19 |
| share of deaths by starving | 0.482 | 0.149 | 0.246 | 0.708 |
| share hungry | 0.132 | 0.016 | 0.1 | 0.156 |
| cost per animal per tick | 0.073 | 0.035 | 0.037 | 0.131 |
| share of costs from harmful mutations | 0.194 | 0.015 | 0.166 | 0.226 |
| harmful mutations per animal | 15.8 | 1.216 | 13.8 | 17.8 |
| average diet gene | 0.077 | 0.044 | 0.033 | 0.165 |
| highest diet gene ever | 0.852 | 0.117 | 0.585 | 1 |
| meat in the diet | 0.074 | 0.034 | 0.034 | 0.137 |
| kills per 1,000 ticks | 1,010 | 528 | 384 | 2,016 |
| feeding levels | 1.493 | 0.408 | 1 | 2 |
| births with two parents | 0.337 | 0.126 | 0.18 | 0.596 |
| sex gene | 0.077 | 0.027 | 0.049 | 0.159 |
| species alive | 5.51 | 2.077 | 2.891 | 10.5 |
| species diversity (Shannon) | 1.314 | 0.352 | 0.886 | 2.123 |
| share of cells in colonies | 0.043 | 0.011 | 0.028 | 0.062 |
| share sick | 0.227 | 0.044 | 0.1 | 0.298 |
| brain connections | 11 | 1.244 | 9.487 | 13 |
| plants standing (share of capacity) | 0.083 | 0.035 | 0.039 | 0.153 |
| worn ground | 0.076 | 0.077 | 9.00e-4 | 0.24 |
| genes pinned at a limit | 5.188 | 2.562 | 2 | 9 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_attack`, `low_bond`, `low_generosity`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): wornShare (68%).

## Red flags (13)

### Collapse (3)

*Any seed died out, or the population fell below a fifth of the control's.*

- **base-temperature-0375**: died out on 7 of 16 seeds (at tick 152,954, 104,206, 58,942, 32,074, 161,706, 158,358, 173,234). Reproduce: `npm run sim -- --config configs/grand-world.json --set baseTemperature=0.375 --seed 401 --ticks 200000`
- **plant-tolerance-03**: died out on 1 of 16 seeds (at tick 94,842). Reproduce: `npm run sim -- --config configs/grand-world.json --set plantTempTolerance=0.3 --seed 410 --ticks 200000`
- **ice-age-cooling-06**: died out on 5 of 16 seeds (at tick 122,473, 98,184, 146,097, 83,475, 53,448). Reproduce: `npm run sim -- --config configs/grand-world.json --set iceAgeCooling=0.6 --seed 403 --ticks 200000`

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (3)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **base-temperature-0375**: lowest population 341 → 32.9 (-3.9 noise units); share of costs from harmful mutations 0.194 → 0.248 (3.6 noise units); share sick 0.227 → 0.047 (-4.1 noise units)
- **plant-quality-max-1**: share hungry 0.132 → 0.082 (-3.2 noise units); plants standing (share of capacity) 0.083 → 0.211 (3.7 noise units)
- **plant-assimilation-001**: share hungry 0.132 → 0.082 (-3.1 noise units); plants standing (share of capacity) 0.083 → 0.214 (3.8 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (7)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **base-temperature-06**: newly pinned `low_diet`, `low_sex`
- **plant-tolerance-045**: newly pinned `low_senseRange`, `low_diet`
- **plant-quality-max-1**: freed `low_attack`, `low_generosity`
- **plant-assimilation-001**: freed `low_attack`, `low_generosity`
- **diet-specialization-025**: newly pinned `low_sex`
- **weather-006**: newly pinned `low_senseRange`, `low_diet`, `low_sex`
- **weather-024**: newly pinned `low_diet`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 905): base-temperature-0375 367 (-2.6), plant-assimilation-001 468 (-2.1), plant-quality-max-1 475 (-2.1), plant-tolerance-03 605 (-1.5)

**lowest population** (control 341): base-temperature-0375 32.9 (-3.9), plant-tolerance-03 159 (-2.3), plant-quality-max-1 176 (-2.1), plant-assimilation-001 201 (-1.8), ice-age-cooling-06 205 (-1.7), base-temperature-06 233 (-1.4), ice-age-cooling-045 246 (-1.2)

**deaths per animal per 1,000 ticks** (control 2.243): plant-assimilation-001 4.799 (+2.3), plant-quality-max-1 4.41 (+2)

**share of deaths by starving** (control 0.482): plant-assimilation-001 0.252 (-1.5), plant-quality-max-1 0.273 (-1.4)

**share hungry** (control 0.132): plant-quality-max-1 0.082 (-3.2), plant-assimilation-001 0.082 (-3.1)

**cost per animal per tick** (control 0.073): plant-assimilation-001 0.17 (+2.8), plant-quality-max-1 0.164 (+2.6)

**share of costs from harmful mutations** (control 0.194): base-temperature-0375 0.248 (+3.6), plant-tolerance-03 0.213 (+1.3), plant-assimilation-001 0.21 (+1.1)

**harmful mutations per animal** (control 15.8): plant-assimilation-001 18.1 (+1.9), plant-quality-max-1 17.9 (+1.7)

**average diet gene** (control 0.077): plant-assimilation-001 0.204 (+2.9), plant-quality-max-1 0.193 (+2.6), diet-specialization-025 0.135 (+1.3)

**meat in the diet** (control 0.074): plant-assimilation-001 0.151 (+2.2), plant-quality-max-1 0.139 (+1.9)

**kills per 1,000 ticks** (control 1,010): plant-assimilation-001 1,676 (+1.3), base-temperature-0375 475 (-1)

**feeding levels** (control 1.493): plant-assimilation-001 1.998 (+1.2), plant-quality-max-1 1.942 (+1.1)

**sex gene** (control 0.077): plant-quality-max-1 0.125 (+1.8), plant-assimilation-001 0.122 (+1.7)

**species alive** (control 5.51): base-temperature-0375 2.056 (-1.7), plant-assimilation-001 3.194 (-1.1), plant-tolerance-03 3.33 (-1)

**species diversity (Shannon)** (control 1.314): base-temperature-0375 0.497 (-2.3), plant-tolerance-03 0.875 (-1.2), plant-assimilation-001 0.924 (-1.1), diet-specialization-025 0.96 (-1)

**share of cells in colonies** (control 0.043): plant-quality-max-1 0.063 (+2), plant-assimilation-001 0.063 (+1.9)

**share sick** (control 0.227): base-temperature-0375 0.047 (-4.1), plant-assimilation-001 0.13 (-2.2), plant-quality-max-1 0.141 (-2), plant-tolerance-03 0.172 (-1.3)

**plants standing (share of capacity)** (control 0.083): plant-assimilation-001 0.214 (+3.8), plant-quality-max-1 0.211 (+3.7)

**worn ground** (control 0.076): base-temperature-0375 0.172 (+1.2)

**genes pinned at a limit** (control 5.188): plant-assimilation-001 1.813 (-1.3), plant-quality-max-1 2.063 (-1.2)

## No clear effect (3)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`plant-tolerance-045`, `weather-006`, `weather-024`

