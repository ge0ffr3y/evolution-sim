# full-package-long: comparison report

**Question:** Given a million ticks, do meat eaters (diet above 0.75) evolve and last in the grand world with the full mating-and-sight package: the eye gene, vigilance, prey sight not scaled by the viewer's diet, a founder pull toward prey, the pickiness gene and mate scent? 16 fresh seeds against the grand world. An answer: worlds with a lasting meat-eating group (10+ for most of the second half), when meat eaters first appear, eye and pickiness by diet, feeding levels, kills, species, population and its low point.

Base world `grand-world`; 1,000,000 ticks; seeds 2801-2816; 1 arms against `control`; 32 of 32 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 1,044 | 116 | 890 | 1,308 |
| lowest population | 421 | 94.9 | 253 | 545 |
| deaths per animal per 1,000 ticks | 3.072 | 0.468 | 2.542 | 4.309 |
| share of deaths by starving | 0.241 | 0.042 | 0.172 | 0.323 |
| share hungry | 0.11 | 0.01 | 0.088 | 0.128 |
| cost per animal per tick | 0.105 | 0.015 | 0.079 | 0.132 |
| share of costs from harmful mutations | 0.081 | 0.003 | 0.076 | 0.089 |
| harmful mutations per animal | 5.644 | 0.071 | 5.508 | 5.766 |
| average diet gene | 0.138 | 0.02 | 0.111 | 0.18 |
| highest diet gene ever | 0.956 | 0.066 | 0.812 | 1 |
| meat in the diet | 0.15 | 0.016 | 0.12 | 0.183 |
| kills per 1,000 ticks | 2,418 | 372 | 1,803 | 3,274 |
| feeding levels | 1.989 | 0.02 | 1.95 | 2.03 |
| births with two parents | 0.341 | 0.035 | 0.297 | 0.446 |
| sex gene | 0.123 | 0.019 | 0.102 | 0.187 |
| species alive | 8.742 | 1.963 | 5.881 | 12.7 |
| species diversity (Shannon) | 1.743 | 0.215 | 1.388 | 2.127 |
| share of cells in colonies | 0.065 | 0.005 | 0.054 | 0.075 |
| share sick | 0.222 | 0.041 | 0.128 | 0.271 |
| brain connections | 10.1 | 1.327 | 6.919 | 12.3 |
| plants standing (share of capacity) | 0.134 | 0.012 | 0.118 | 0.158 |
| worn ground | 0.096 | 0.047 | 0.012 | 0.158 |
| genes pinned at a limit | 2.25 | 0.447 | 2 | 3 |

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

- **package**: deaths per animal per 1,000 ticks 3.072 → 4.516 (3.1 noise units); cost per animal per tick 0.105 → 0.166 (4.1 noise units); average diet gene 0.138 → 0.213 (3.8 noise units); plants standing (share of capacity) 0.134 → 0.2 (5.3 noise units)

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

**population** (control 1,044): package 786 (-2.2)

**lowest population** (control 421): package 265 (-1.6)

**deaths per animal per 1,000 ticks** (control 3.072): package 4.516 (+3.1)

**share of deaths by starving** (control 0.241): package 0.192 (-1.2)

**cost per animal per tick** (control 0.105): package 0.166 (+4.1)

**harmful mutations per animal** (control 5.644): package 5.744 (+1.4)

**average diet gene** (control 0.138): package 0.213 (+3.8)

**meat in the diet** (control 0.15): package 0.171 (+1.3)

**births with two parents** (control 0.341): package 0.303 (-1.1)

**species alive** (control 8.742): package 6.146 (-1.3)

**species diversity (Shannon)** (control 1.743): package 1.373 (-1.7)

**share of cells in colonies** (control 0.065): package 0.08 (+2.6)

**plants standing (share of capacity)** (control 0.134): package 0.2 (+5.3)

**worn ground** (control 0.096): package 0.032 (-1.4)

**genes pinned at a limit** (control 2.25): package 1.5 (-1.7)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

