# dispersal-confirm: comparison report

**Question:** Confirmation on 16 fresh seeds and a longer run: in the grand world, do young that move away (natalDispersal 12) with the gut and prey condition keep a lasting meat-eating group (diet above 0.75), and do young that move away on their own help the grand world (fewer sick, more species, more feeding levels)? In the 8-seed screen the first held a group in 2 of 8 worlds (against 0 of 8 for gut + prey condition there), raised feeding levels by 17% and halved disease. 16 seeds, 500,000 ticks, with the diet ledger and the kill autopsy. An answer: worlds with a lasting meat-eating group, how long they last, feeding levels, species, diversity, disease and population, and whether any cost holds up.

Base world `grand-world`; 500,000 ticks; seeds 3401-3416; 2 arms against `control`; 48 of 48 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 1,130 | 181 | 880 | 1,660 |
| lowest population | 439 | 148 | 149 | 600 |
| deaths per animal per 1,000 ticks | 2.883 | 0.618 | 1.366 | 3.816 |
| share of deaths by starving | 0.235 | 0.044 | 0.171 | 0.341 |
| share hungry | 0.108 | 0.009 | 0.093 | 0.126 |
| cost per animal per tick | 0.088 | 0.02 | 0.04 | 0.121 |
| share of costs from harmful mutations | 0.085 | 0.007 | 0.073 | 0.102 |
| harmful mutations per animal | 5.645 | 0.083 | 5.452 | 5.784 |
| average diet gene | 0.133 | 0.024 | 0.083 | 0.175 |
| highest diet gene ever | 0.917 | 0.088 | 0.763 | 1 |
| meat in the diet | 0.159 | 0.013 | 0.141 | 0.185 |
| kills per 1,000 ticks | 2,439 | 456 | 1,494 | 3,180 |
| feeding levels | 1.985 | 0.047 | 1.832 | 2.04 |
| births with two parents | 0.36 | 0.056 | 0.287 | 0.524 |
| sex gene | 0.124 | 0.027 | 0.087 | 0.185 |
| species alive | 9.28 | 2.153 | 5.079 | 13.8 |
| species diversity (Shannon) | 1.761 | 0.31 | 1.092 | 2.3 |
| share of cells in colonies | 0.065 | 0.008 | 0.05 | 0.083 |
| share sick | 0.204 | 0.053 | 0.086 | 0.271 |
| brain connections | 10.2 | 1.548 | 8.081 | 13.5 |
| plants standing (share of capacity) | 0.12 | 0.023 | 0.071 | 0.177 |
| worn ground | 0.138 | 0.099 | 0.02 | 0.38 |
| genes pinned at a limit | 2.313 | 0.873 | 2 | 5 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_bond`.

## Red flags (1)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (1)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **gut-condition-disperse**: share of deaths by starving 0.235 → 0.092 (-3.2 noise units); share of costs from harmful mutations 0.085 → 0.06 (-3.8 noise units); harmful mutations per animal 5.645 → 5.912 (3.2 noise units); average diet gene 0.133 → 0.264 (5.4 noise units); meat in the diet 0.159 → 0.238 (6.3 noise units); share of cells in colonies 0.065 → 0.11 (5.6 noise units)

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

**population** (control 1,130): gut-condition-disperse 872 (-1.4)

**deaths per animal per 1,000 ticks** (control 2.883): gut-condition-disperse 4.503 (+2.6)

**share of deaths by starving** (control 0.235): gut-condition-disperse 0.092 (-3.2)

**share hungry** (control 0.108): gut-condition-disperse 0.084 (-2.8)

**cost per animal per tick** (control 0.088): gut-condition-disperse 0.109 (+1.1)

**share of costs from harmful mutations** (control 0.085): gut-condition-disperse 0.06 (-3.8)

**harmful mutations per animal** (control 5.645): gut-condition-disperse 5.912 (+3.2)

**average diet gene** (control 0.133): gut-condition-disperse 0.264 (+5.4)

**meat in the diet** (control 0.159): gut-condition-disperse 0.238 (+6.3)

**kills per 1,000 ticks** (control 2,439): gut-condition-disperse 3,559 (+2.5)

**feeding levels** (control 1.985): gut-condition-disperse 2.077 (+2)

**species alive** (control 9.28): gut-condition-disperse 6.376 (-1.3)

**species diversity (Shannon)** (control 1.761): gut-condition-disperse 1.399 (-1.2)

**share of cells in colonies** (control 0.065): gut-condition-disperse 0.11 (+5.6)

**share sick** (control 0.204): gut-condition-disperse 0.104 (-1.9)

**brain connections** (control 10.2): gut-condition-disperse 8.167 (-1.3)

**plants standing (share of capacity)** (control 0.12): gut-condition-disperse 0.18 (+2.6)

**worn ground** (control 0.138): gut-condition-disperse 0.006 (-1.3)

**genes pinned at a limit** (control 2.313): gut-condition-disperse 1.375 (-1.1)

## No clear effect (1)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`disperse`

