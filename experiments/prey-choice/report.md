# prey-choice: comparison report

**Question:** With the gut and prey condition, does letting hunters go for the easiest prey in reach (preyChoice 1: the weakest defense they can judge) instead of the nearest stop meat eaters (diet above 0.75) killing each other, and help them last? With and without fighting back (an animal's own weapons count toward its defense, so armed meat eaters are hard targets). 8 fresh seeds, 300,000 ticks, with the diet ledger recording how each diet dies. An answer: worlds with a lasting meat-eating group, meat eaters killed by meat eaters, species and population.

Base world `grand-world`; 300,000 ticks; seeds 3101-3108; 4 arms against `control`; 40 of 40 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 1,191 | 347 | 908 | 2,004 |
| lowest population | 496 | 92.7 | 392 | 600 |
| deaths per animal per 1,000 ticks | 3.299 | 0.996 | 1.054 | 4.228 |
| share of deaths by starving | 0.257 | 0.113 | 0.185 | 0.529 |
| share hungry | 0.119 | 0.011 | 0.105 | 0.142 |
| cost per animal per tick | 0.104 | 0.033 | 0.036 | 0.14 |
| share of costs from harmful mutations | 0.085 | 0.008 | 0.078 | 0.101 |
| harmful mutations per animal | 5.644 | 0.158 | 5.268 | 5.758 |
| average diet gene | 0.147 | 0.041 | 0.054 | 0.181 |
| highest diet gene ever | 0.956 | 0.073 | 0.809 | 1 |
| meat in the diet | 0.152 | 0.029 | 0.089 | 0.175 |
| kills per 1,000 ticks | 2,759 | 751 | 995 | 3,272 |
| feeding levels | 1.95 | 0.14 | 1.604 | 2 |
| births with two parents | 0.325 | 0.081 | 0.265 | 0.495 |
| sex gene | 0.11 | 0.03 | 0.086 | 0.176 |
| species alive | 7.281 | 2.048 | 4.426 | 10.5 |
| species diversity (Shannon) | 1.492 | 0.31 | 0.952 | 1.885 |
| share of cells in colonies | 0.065 | 0.012 | 0.039 | 0.076 |
| share sick | 0.259 | 0.065 | 0.189 | 0.352 |
| brain connections | 10.2 | 1.008 | 8.992 | 11.8 |
| plants standing (share of capacity) | 0.106 | 0.033 | 0.03 | 0.132 |
| worn ground | 0.067 | 0.145 | 0.002 | 0.42 |
| genes pinned at a limit | 2.5 | 1.414 | 2 | 6 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_bond`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): sickShare (-51.4%).

## Red flags (4)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (3)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **gut-condition**: share hungry 0.119 → 0.078 (-3.6 noise units); share of costs from harmful mutations 0.085 → 0.061 (-3 noise units); meat in the diet 0.152 → 0.25 (3.4 noise units); feeding levels 1.95 → 2.495 (3.9 noise units); share of cells in colonies 0.065 → 0.103 (3.1 noise units)
- **gut-condition-fight**: share hungry 0.119 → 0.078 (-3.6 noise units); share of costs from harmful mutations 0.085 → 0.059 (-3.2 noise units); average diet gene 0.147 → 0.289 (3.4 noise units); meat in the diet 0.152 → 0.252 (3.5 noise units); feeding levels 1.95 → 2.556 (4.3 noise units)
- **gut-condition-choice-fight**: share hungry 0.119 → 0.08 (-3.4 noise units); share of costs from harmful mutations 0.085 → 0.057 (-3.5 noise units); meat in the diet 0.152 → 0.244 (3.2 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (1)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **gut-condition-choice**: newly pinned `low_metabolism`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**deaths per animal per 1,000 ticks** (control 3.299): gut-condition-choice-fight 4.89 (+1.6), gut-condition-fight 4.767 (+1.5), gut-condition 4.457 (+1.2)

**share of deaths by starving** (control 0.257): gut-condition-fight 0.073 (-1.6), gut-condition-choice-fight 0.073 (-1.6), gut-condition 0.082 (-1.6), gut-condition-choice 0.096 (-1.4)

**share hungry** (control 0.119): gut-condition-fight 0.078 (-3.6), gut-condition 0.078 (-3.6), gut-condition-choice-fight 0.08 (-3.4), gut-condition-choice 0.085 (-2.9)

**share of costs from harmful mutations** (control 0.085): gut-condition-choice-fight 0.057 (-3.5), gut-condition-fight 0.059 (-3.2), gut-condition 0.061 (-3), gut-condition-choice 0.061 (-3)

**harmful mutations per animal** (control 5.644): gut-condition-fight 5.918 (+1.7), gut-condition 5.911 (+1.7), gut-condition-choice-fight 5.908 (+1.7), gut-condition-choice 5.895 (+1.6)

**average diet gene** (control 0.147): gut-condition-fight 0.289 (+3.4), gut-condition-choice-fight 0.27 (+3), gut-condition 0.266 (+2.9), gut-condition-choice 0.234 (+2.1)

**meat in the diet** (control 0.152): gut-condition-fight 0.252 (+3.5), gut-condition 0.25 (+3.4), gut-condition-choice-fight 0.244 (+3.2), gut-condition-choice 0.23 (+2.7)

**kills per 1,000 ticks** (control 2,759): gut-condition-fight 4,209 (+1.9), gut-condition 4,149 (+1.9), gut-condition-choice-fight 3,952 (+1.6), gut-condition-choice 3,898 (+1.5)

**feeding levels** (control 1.95): gut-condition-fight 2.556 (+4.3), gut-condition 2.495 (+3.9)

**sex gene** (control 0.11): gut-condition-choice-fight 0.147 (+1.2)

**share of cells in colonies** (control 0.065): gut-condition 0.103 (+3.1), gut-condition-choice-fight 0.098 (+2.7), gut-condition-fight 0.096 (+2.5), gut-condition-choice 0.093 (+2.3)

**brain connections** (control 10.2): gut-condition-fight 8.308 (-1.9), gut-condition-choice-fight 8.584 (-1.6), gut-condition 8.725 (-1.5)

**plants standing (share of capacity)** (control 0.106): gut-condition-fight 0.199 (+2.8), gut-condition-choice-fight 0.188 (+2.5), gut-condition 0.182 (+2.3)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

