# headline-sex: comparison report

**Question:** Does sex speed up the arrival of new feeding levels? Worlds where every animal splits in two, where sex is a gene (today's grand world), and where every animal must find a mate. An answer: when mixed eaters (5 or more) first appear and how much of the time they are present, the highest diet reached, and meat in the diet, against today's world, with 95% ranges.

Base world `grand-world`; 300,000 ticks; seeds 601-616; 2 arms against `control`; 48 of 48 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 916 | 127 | 628 | 1,086 |
| lowest population | 300 | 114 | 167 | 510 |
| deaths per animal per 1,000 ticks | 1.708 | 0.584 | 1.05 | 3.208 |
| share of deaths by starving | 0.487 | 0.115 | 0.245 | 0.636 |
| share hungry | 0.134 | 0.015 | 0.095 | 0.151 |
| cost per animal per tick | 0.056 | 0.022 | 0.035 | 0.115 |
| share of costs from harmful mutations | 0.197 | 0.012 | 0.175 | 0.212 |
| harmful mutations per animal | 15.6 | 1.028 | 14.2 | 18 |
| average diet gene | 0.062 | 0.031 | 0.033 | 0.158 |
| highest diet gene ever | 0.798 | 0.158 | 0.559 | 1 |
| meat in the diet | 0.071 | 0.027 | 0.038 | 0.138 |
| kills per 1,000 ticks | 797 | 323 | 398 | 1,522 |
| feeding levels | 1.332 | 0.321 | 1.04 | 1.96 |
| births with two parents | 0.407 | 0.086 | 0.271 | 0.563 |
| sex gene | 0.08 | 0.021 | 0.054 | 0.124 |
| species alive | 5.316 | 1.844 | 3.069 | 10.3 |
| species diversity (Shannon) | 1.296 | 0.326 | 0.747 | 1.957 |
| share of cells in colonies | 0.041 | 0.013 | 0.026 | 0.072 |
| share sick | 0.214 | 0.026 | 0.164 | 0.259 |
| brain connections | 10.8 | 1.515 | 8.162 | 12.7 |
| plants standing (share of capacity) | 0.07 | 0.031 | 0.035 | 0.15 |
| worn ground | 0.194 | 0.122 | 0.014 | 0.34 |
| genes pinned at a limit | 5.938 | 1.914 | 3 | 8 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_senseRange`, `low_metabolism`, `low_diet`, `low_attack`, `low_bond`, `low_generosity`.

## Red flags (3)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (2)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **asexual**: births with two parents 0.407 → 0 (-4.7 noise units); sex gene 0.08 → 0 (-3.9 noise units)
- **all-sexual**: births with two parents 0.407 → 1 (6.9 noise units); sex gene 0.08 → 0 (-3.9 noise units); species alive 5.316 → 12.9 (4.1 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (1)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **asexual**: freed `low_metabolism`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 916): asexual 769 (-1.2)

**lowest population** (control 300): all-sexual 415 (+1)

**deaths per animal per 1,000 ticks** (control 1.708): asexual 3.028 (+2.3), all-sexual 1.067 (-1.1)

**share hungry** (control 0.134): all-sexual 0.106 (-1.9), asexual 0.118 (-1.1)

**cost per animal per tick** (control 0.056): asexual 0.089 (+1.5)

**share of costs from harmful mutations** (control 0.197): all-sexual 0.209 (+1)

**harmful mutations per animal** (control 15.6): asexual 17.1 (+1.5)

**average diet gene** (control 0.062): asexual 0.108 (+1.5)

**meat in the diet** (control 0.071): asexual 0.099 (+1.1)

**kills per 1,000 ticks** (control 797): asexual 1,348 (+1.7)

**feeding levels** (control 1.332): asexual 1.759 (+1.3)

**births with two parents** (control 0.407): all-sexual 1 (+6.9), asexual 0 (-4.7)

**sex gene** (control 0.08): asexual 0 (-3.9), all-sexual 0 (-3.9)

**species alive** (control 5.316): all-sexual 12.9 (+4.1), asexual 3.312 (-1.1)

**species diversity (Shannon)** (control 1.296): all-sexual 2.221 (+2.8)

**share of cells in colonies** (control 0.041): asexual 0.057 (+1.2)

**brain connections** (control 10.8): asexual 8.013 (-1.9)

**plants standing (share of capacity)** (control 0.07): asexual 0.105 (+1.2)

**worn ground** (control 0.194): asexual 0.032 (-1.3)

**genes pinned at a limit** (control 5.938): asexual 2.688 (-1.7)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

