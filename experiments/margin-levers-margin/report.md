# margin-levers-margin: comparison report

**Question:** In the grand world, do the two margin levers the diet ledger points to: a fat reserve (banks surplus from a big meal for the lean days between kills; deposit rate 0.5, founders start with a fat gene of 0.3, as fat does not evolve from nothing) and more plant growth (0.18 and 0.24 per tick, against 0.12), so plant eaters breed faster and leave more surplus for hunters, and fat with 0.18 together. Margin test: one animal in twenty becomes an armed meat eater (with a fat gene of 0.5) at tick 100,000 and every 5,000 ticks after, measured with the diet ledger. An answer: meat eaters' births against deaths, income and costs, and how many remain 4,500 ticks after each arrival.

Base world `grand-world`; 150,000 ticks; seeds 2001-2004; 4 arms against `control`; 20 of 20 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 749 | 95.5 | 620 | 848 |
| lowest population | 374 | 141 | 188 | 499 |
| harmful mutations per animal | 16.4 | 0.637 | 15.6 | 17 |
| average diet gene | 0.092 | 0.028 | 0.063 | 0.122 |
| highest diet gene ever | 0.975 | 0.029 | 0.95 | 1 |
| kills per 1,000 ticks | 1,230 | 401 | 764 | 1,637 |

## Red flags (1)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (1)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **food-024**: kills per 1,000 ticks 1,230 → 2,551 (3.3 noise units)

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

**kills per 1,000 ticks** (control 1,230): food-024 2,551 (+3.3), food-018 2,163 (+2.3)

## No clear effect (2)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`fat`, `fat-food-018`

