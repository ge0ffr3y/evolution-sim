# path-bundle-margin: comparison report

**Question:** Do arriving meat eaters still hold their numbers in the grand world with the bundle of helps without the weapons penalty (sparing your own parent and young, a fat reserve, plant growth 0.24, meat that keeps in the cold, more mending 0.5, half the cost of heat and cold), and the same without fat? One animal in twenty becomes an armed meat eater (fat gene 0.5) at tick 100,000 and every 5,000 ticks after, diet ledger. An answer: how many remain 4,500 ticks after each arrival, and births against deaths.

Base world `grand-world`; 150,000 ticks; seeds 2221-2224; 2 arms against `control`; 12 of 12 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 665 | 99.1 | 600 | 812 |
| lowest population | 204 | 161 | 101 | 444 |
| harmful mutations per animal | 16.9 | 0.313 | 16.6 | 17.3 |
| average diet gene | 0.108 | 0.014 | 0.091 | 0.126 |
| highest diet gene ever | 0.991 | 0.015 | 0.969 | 1 |
| kills per 1,000 ticks | 1,365 | 131 | 1,253 | 1,555 |

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): population (25.9%).

## Red flags (2)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (2)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **path-bundle**: harmful mutations per animal 16.9 → 5.67 (-35.7 noise units); kills per 1,000 ticks 1,365 → 2,660 (9.9 noise units)
- **path-bundle-no-fat**: population 665 → 1,170 (5.1 noise units); harmful mutations per animal 16.9 → 5.625 (-35.8 noise units); kills per 1,000 ticks 1,365 → 2,708 (10.2 noise units)

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

**population** (control 665): path-bundle-no-fat 1,170 (+5.1), path-bundle 954 (+2.9)

**harmful mutations per animal** (control 16.9): path-bundle-no-fat 5.625 (-35.8), path-bundle 5.67 (-35.7)

**average diet gene** (control 0.108): path-bundle 0.132 (+1.7)

**kills per 1,000 ticks** (control 1,365): path-bundle-no-fat 2,708 (+10.2), path-bundle 2,660 (+9.9)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

