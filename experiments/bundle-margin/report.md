# bundle-margin: comparison report

**Question:** Does a bundle of every partial help found so far, together: sparing your own parent and young, a fat reserve (deposit 0.5, founders start with 0.3), plant growth 0.24 (against 0.12), weapons that get in the way of grazing (0.6), meat that keeps in the cold (0.8), more mending of harmful mutations (0.5, against 0.15) and half the cost of heat and cold (0.75, against 1.5) give arriving meat eaters a margin in the grand world? One animal in twenty becomes an armed meat eater (with a fat gene of 0.5) at tick 100,000 and every 5,000 ticks after, measured with the diet ledger. An answer: meat eaters' births against deaths, and how many remain 4,500 ticks after each arrival.

Base world `grand-world`; 150,000 ticks; seeds 2101-2104; 1 arms against `control`; 8 of 8 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 891 | 198 | 704 | 1,121 |
| lowest population | 401 | 141 | 203 | 533 |
| harmful mutations per animal | 16.2 | 1.107 | 15.3 | 17.5 |
| average diet gene | 0.092 | 0.014 | 0.079 | 0.107 |
| highest diet gene ever | 1 | 0 | 1 | 1 |
| kills per 1,000 ticks | 1,275 | 228 | 1,086 | 1,560 |

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): dietMean (-24.4%).

## Red flags (1)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (1)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **bundle**: harmful mutations per animal 16.2 → 5.528 (-9.6 noise units); kills per 1,000 ticks 1,275 → 2,521 (5.5 noise units)

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

**population** (control 891): bundle 1,346 (+2.3)

**harmful mutations per animal** (control 16.2): bundle 5.528 (-9.6)

**kills per 1,000 ticks** (control 1,275): bundle 2,521 (+5.5)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

