# meat-margin: comparison report

**Question:** Where does a meat eater's margin go in the grand world? The diet ledger (per diet band: plant and meat income, running costs by kind, kills, births and deaths per animal per 1,000 ticks, how fed) in the grand world, the grand world without each culprit group (climate, sex, harmful mutations, kin restraint), and the hunters' world. One animal in twenty becomes an armed meat eater at tick 100,000 and again every 5,000 ticks, so the meat-eater band can be measured everywhere. An answer: which income or cost line separates meat eaters that last (hunters' world) from those that do not (grand world), and which culprit moves it.

Base world `grand-world`; 150,000 ticks; seeds 1801-1804; 5 arms against `control`; 24 of 24 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 1,033 | 185 | 773 | 1,205 |
| lowest population | 453 | 170 | 302 | 600 |
| harmful mutations per animal | 15.8 | 0.561 | 15.3 | 16.4 |
| average diet gene | 0.1 | 0.015 | 0.091 | 0.122 |
| highest diet gene ever | 1 | 0 | 1 | 1 |
| kills per 1,000 ticks | 1,363 | 125 | 1,214 | 1,500 |

## Red flags (3)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (3)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **no-climate**: kills per 1,000 ticks 1,363 → 2,897 (12.3 noise units)
- **no-harmful-mutations**: harmful mutations per animal 15.8 → 0 (-28.2 noise units)
- **hunters**: harmful mutations per animal 15.8 → 0 (-28.2 noise units); average diet gene 0.1 → 0.208 (7.2 noise units); kills per 1,000 ticks 1,363 → 5,639 (34.2 noise units)

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

**population** (control 1,033): hunters 1,380 (+1.9)

**lowest population** (control 453): no-sex 222 (-1.4)

**harmful mutations per animal** (control 15.8): no-harmful-mutations 0 (-28.2), hunters 0 (-28.2)

**average diet gene** (control 0.1): hunters 0.208 (+7.2)

**kills per 1,000 ticks** (control 1,363): hunters 5,639 (+34.2), no-climate 2,897 (+12.3)

## No clear effect (1)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`no-kin`

