# rich-grand-confirm: comparison report

**Question:** Should the path bundle with fat that pays for breeding become the grand world? Confirmation on 16 fresh seeds over 500,000 ticks against today's grand world. Changes: sparing your own parent and young, plant growth 0.24 (against 0.12), meat that keeps in the cold (0.8), more mending of harmful mutations (0.5), half the cost of heat and cold (0.75), and reworked fat that pays for breeding. An answer: species, diversity, population and its low point, feeding levels, sex, lives, deaths and red flags, with 95% ranges; worlds lost; meat eaters.

Base world `grand-world`; 500,000 ticks; seeds 2501-2516; 1 arms against `control`; 32 of 32 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 865 | 121 | 608 | 1,061 |
| lowest population | 244 | 97.8 | 131 | 500 |
| deaths per animal per 1,000 ticks | 1.715 | 0.501 | 1.095 | 2.915 |
| share of deaths by starving | 0.47 | 0.098 | 0.289 | 0.628 |
| share hungry | 0.126 | 0.011 | 0.106 | 0.143 |
| cost per animal per tick | 0.058 | 0.017 | 0.038 | 0.092 |
| share of costs from harmful mutations | 0.197 | 0.013 | 0.178 | 0.236 |
| harmful mutations per animal | 15.8 | 0.748 | 14.5 | 17.3 |
| average diet gene | 0.066 | 0.025 | 0.039 | 0.133 |
| highest diet gene ever | 0.747 | 0.109 | 0.597 | 0.947 |
| meat in the diet | 0.074 | 0.022 | 0.046 | 0.123 |
| kills per 1,000 ticks | 774 | 247 | 432 | 1,344 |
| feeding levels | 1.528 | 0.275 | 1.099 | 1.931 |
| births with two parents | 0.407 | 0.088 | 0.266 | 0.557 |
| sex gene | 0.066 | 0.01 | 0.049 | 0.087 |
| species alive | 4.447 | 0.768 | 3.069 | 5.753 |
| species diversity (Shannon) | 1.117 | 0.149 | 0.867 | 1.379 |
| share of cells in colonies | 0.042 | 0.01 | 0.03 | 0.061 |
| share sick | 0.194 | 0.039 | 0.068 | 0.23 |
| brain connections | 9.901 | 1.398 | 6.688 | 12.1 |
| plants standing (share of capacity) | 0.078 | 0.025 | 0.042 | 0.13 |
| worn ground | 0.244 | 0.112 | 0.067 | 0.371 |
| genes pinned at a limit | 6.063 | 2.175 | 3 | 8 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_senseRange`, `low_diet`, `low_attack`, `low_bond`, `low_sex`, `low_generosity`.

## Red flags (1)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (1)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **rich-grand**: population 865 → 1,238 (3.1 noise units); share of costs from harmful mutations 0.197 → 0.084 (-8.4 noise units); harmful mutations per animal 15.8 → 5.584 (-13.6 noise units); meat in the diet 0.074 → 0.147 (3.4 noise units); kills per 1,000 ticks 774 → 2,268 (6 noise units); sex gene 0.066 → 0.125 (6.1 noise units); species alive 4.447 → 10.6 (8.1 noise units); species diversity (Shannon) 1.117 → 1.925 (5.4 noise units)

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

**population** (control 865): rich-grand 1,238 (+3.1)

**lowest population** (control 244): rich-grand 483 (+2.4)

**deaths per animal per 1,000 ticks** (control 1.715): rich-grand 2.564 (+1.7)

**share of deaths by starving** (control 0.47): rich-grand 0.269 (-2.1)

**share hungry** (control 0.126): rich-grand 0.113 (-1.2)

**cost per animal per tick** (control 0.058): rich-grand 0.081 (+1.3)

**share of costs from harmful mutations** (control 0.197): rich-grand 0.084 (-8.4)

**harmful mutations per animal** (control 15.8): rich-grand 5.584 (-13.6)

**average diet gene** (control 0.066): rich-grand 0.116 (+2)

**highest diet gene ever** (control 0.747): rich-grand 0.957 (+1.9)

**meat in the diet** (control 0.074): rich-grand 0.147 (+3.4)

**kills per 1,000 ticks** (control 774): rich-grand 2,268 (+6)

**feeding levels** (control 1.528): rich-grand 1.954 (+1.5)

**sex gene** (control 0.066): rich-grand 0.125 (+6.1)

**species alive** (control 4.447): rich-grand 10.6 (+8.1)

**species diversity (Shannon)** (control 1.117): rich-grand 1.925 (+5.4)

**share of cells in colonies** (control 0.042): rich-grand 0.063 (+2.1)

**plants standing (share of capacity)** (control 0.078): rich-grand 0.106 (+1.1)

**genes pinned at a limit** (control 6.063): rich-grand 2.875 (-1.5)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

