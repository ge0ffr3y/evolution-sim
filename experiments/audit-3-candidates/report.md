# audit-3-candidates: comparison report

**Question:** Which features that are built but switched off in the grand world make it richer (more feeding levels, more species, steadier populations, longer lives) rather than merely harder, when each is added on its own?

Base world `grand-world`; 200,000 ticks; seeds 1-8; 23 arms against `control`; 192 of 192 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 836 | 196 | 472 | 1,115 |
| lowest population | 301 | 140 | 128 | 513 |
| deaths per animal per 1,000 ticks | 1.694 | 0.604 | 0.897 | 2.509 |
| share of deaths by starving | 0.649 | 0.155 | 0.495 | 0.9 |
| share hungry | 0.169 | 0.009 | 0.155 | 0.181 |
| cost per animal per tick | 0.053 | 0.015 | 0.034 | 0.068 |
| share of costs from harmful mutations | 0.204 | 0.022 | 0.168 | 0.232 |
| harmful mutations per animal | 14.3 | 1.197 | 11.9 | 15.6 |
| average diet gene | 0.037 | 0.016 | 0.016 | 0.055 |
| highest diet gene ever | 0.298 | 0.056 | 0.205 | 0.395 |
| meat in the diet | 0.046 | 0.025 | 0.011 | 0.083 |
| kills per 1,000 ticks | 529 | 321 | 65 | 926 |
| feeding levels | 1.004 | 0.007 | 1 | 1.02 |
| births with two parents | 0.133 | 0.084 | 0.049 | 0.257 |
| sex gene | 0.147 | 0.093 | 0.056 | 0.283 |
| species alive | 2.751 | 1.315 | 1.723 | 5.505 |
| species diversity (Shannon) | 0.809 | 0.355 | 0.429 | 1.443 |
| share of cells in colonies | 0.02 | 0.004 | 0.014 | 0.026 |
| share sick | 0.194 | 0.052 | 0.125 | 0.271 |
| brain connections | 10.3 | 2.158 | 7.557 | 13.2 |
| plants standing (share of capacity) | 0.115 | 0.113 | 0.048 | 0.362 |
| worn ground | 0.073 | 0.056 | 0.011 | 0.154 |
| genes pinned at a limit | 6.375 | 1.996 | 3 | 9 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_senseRange`, `low_diet`, `low_attack`, `low_bond`, `low_generosity`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): wornShare (87.8%).

## Red flags (19)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (10)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **nutrients-1**: share hungry 0.169 → 0.14 (-3.2 noise units)
- **nutrients-2**: share hungry 0.169 → 0.106 (-7.1 noise units); cost per animal per tick 0.053 → 0.122 (4.7 noise units); average diet gene 0.037 → 0.135 (6.1 noise units); feeding levels 1.004 → 1.595 (80.3 noise units); share of cells in colonies 0.02 → 0.061 (9.9 noise units)
- **climate-biomes**: worn ground 0.073 → 0.353 (5 noise units)
- **biomes-drinking**: worn ground 0.073 → 0.249 (3.2 noise units)
- **colony-saving**: share of cells in colonies 0.02 → 0.033 (3.2 noise units)
- **contact-bonding**: share of cells in colonies 0.02 → 0.042 (5.3 noise units)
- **big-mutations**: highest diet gene ever 0.298 → 0.76 (8.2 noise units); share of cells in colonies 0.02 → 0.036 (3.7 noise units)
- **mutation-floor-005**: share hungry 0.169 → 0.203 (3.9 noise units)
- **mutation-floor-01**: share hungry 0.169 → 0.229 (6.8 noise units)
- **place-memory**: share of cells in colonies 0.02 → 0.04 (4.8 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (9)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **nutrients-1**: newly pinned `low_sex`
- **nutrients-2**: newly pinned `low_litter`; freed `low_diet`, `low_attack`
- **climate-biomes**: newly pinned `low_palate`
- **biomes-drinking**: newly pinned `low_palate`
- **contact-bonding**: newly pinned `low_stick`
- **fat**: newly pinned `low_fat`
- **hunger-kin**: newly pinned `low_litter`
- **big-mutations**: newly pinned `low_metabolism`
- **mutation-floor-01**: newly pinned `low_metabolism`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 836): biomes-drinking 528 (-1.6), nutrients-2 581 (-1.3)

**lowest population** (control 301): biomes-drinking 134 (-1.2)

**deaths per animal per 1,000 ticks** (control 1.694): nutrients-2 2.701 (+1.7), bigger-meals 2.618 (+1.5)

**share of deaths by starving** (control 0.649): nutrients-2 0.316 (-2.1), hunger-kin 0.859 (+1.4), hunter-eye 0.821 (+1.1)

**share hungry** (control 0.169): nutrients-2 0.106 (-7.1), mutation-floor-01 0.229 (+6.8), mutation-floor-005 0.203 (+3.9), nutrients-1 0.14 (-3.2), biomes-drinking 0.192 (+2.6), learning 0.191 (+2.5), hunter-eye 0.189 (+2.2)

**cost per animal per tick** (control 0.053): nutrients-2 0.122 (+4.7), bigger-meals 0.077 (+1.7)

**share of costs from harmful mutations** (control 0.204): compounding-harm 0.247 (+2), biomes-drinking 0.168 (-1.7)

**harmful mutations per animal** (control 14.3): compounding-harm 10.8 (-3), nutrients-2 16.8 (+2.1), colony-saving 15.8 (+1.2)

**average diet gene** (control 0.037): nutrients-2 0.135 (+6.1)

**highest diet gene ever** (control 0.298): big-mutations 0.76 (+8.2), nutrients-2 0.439 (+2.5), nutrients-1 0.382 (+1.5)

**meat in the diet** (control 0.046): nutrients-2 0.112 (+2.6)

**kills per 1,000 ticks** (control 529): nutrients-2 1,020 (+1.5), hunger-kin 173 (-1.1), hunter-eye 197 (-1)

**feeding levels** (control 1.004): nutrients-2 1.595 (+80.3)

**births with two parents** (control 0.133): nutrients-2 0.341 (+2.5), nutrients-1 0.322 (+2.3)

**species diversity (Shannon)** (control 0.809): biomes-drinking 0.292 (-1.5), bigger-meals 0.295 (-1.5), compounding-harm 0.402 (-1.1)

**share of cells in colonies** (control 0.02): nutrients-2 0.061 (+9.9), contact-bonding 0.042 (+5.3), place-memory 0.04 (+4.8), big-mutations 0.036 (+3.7), colony-saving 0.033 (+3.2), mutation-floor-005 0.031 (+2.8), mutation-floor-01 0.031 (+2.6), toxicity 0.03 (+2.3)

**share sick** (control 0.194): colony-saving 0.076 (-2.3)

**worn ground** (control 0.073): climate-biomes 0.353 (+5), biomes-drinking 0.249 (+3.2)

**genes pinned at a limit** (control 6.375): climate-biomes 8.625 (+1.1)

## No clear effect (7)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`colony-protect`, `signaling`, `fat`, `stamina`, `mate-by-diet`, `working-memory`, `all-learning-brains`

