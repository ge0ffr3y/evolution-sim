# fat-rework-margin: comparison report

**Question:** Do arriving meat eaters with reworked fat hold their numbers? Grand world with reworked fat, the no-fat path bundle, and the path bundle with reworked fat; one animal in twenty becomes an armed meat eater with a fat gene of 0.5 at tick 100,000 and every 5,000 ticks after, diet ledger. An answer: how many remain 4,500 ticks after each arrival, and births against deaths.

Base world `grand-world`; 150,000 ticks; seeds 2311-2314; 2 arms against `new-fat`; 12 of 12 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`new-fat`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 801 | 138 | 611 | 930 |
| lowest population | 341 | 106 | 228 | 483 |
| harmful mutations per animal | 16.8 | 0.745 | 16.1 | 17.8 |
| average diet gene | 0.094 | 0.021 | 0.08 | 0.125 |
| highest diet gene ever | 0.992 | 0.015 | 0.97 | 1 |
| kills per 1,000 ticks | 1,432 | 155 | 1,252 | 1,612 |

## Red flags (2)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (2)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **path-bundle**: harmful mutations per animal 16.8 → 5.628 (-15 noise units); kills per 1,000 ticks 1,432 → 3,184 (11.3 noise units)
- **path-bundle-new-fat**: harmful mutations per animal 16.8 → 5.621 (-15 noise units); kills per 1,000 ticks 1,432 → 2,682 (8.1 noise units)

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

**population** (control 801): path-bundle-new-fat 1,104 (+2.2)

**lowest population** (control 341): path-bundle 506 (+1.6)

**harmful mutations per animal** (control 16.8): path-bundle-new-fat 5.621 (-15), path-bundle 5.628 (-15)

**kills per 1,000 ticks** (control 1,432): path-bundle 3,184 (+11.3), path-bundle-new-fat 2,682 (+8.1)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

