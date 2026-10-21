# audit-0-baseline: comparison report

**Question:** Over 1,000,000 ticks, does the grand world (as committed, and with 15% mending) settle down or keep drifting, and what range does a normal grand world span across 16 seeds?

Base world `grand-world`; 1,000,000 ticks; seeds 1-16; 1 arms against `mended`; 32 of 32 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`mended`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 641 | 69.9 | 458 | 739 |
| lowest population | 185 | 39.2 | 97 | 256 |
| deaths per animal per 1,000 ticks | 1.003 | 0.231 | 0.791 | 1.593 |
| share of deaths by starving | 0.816 | 0.163 | 0.393 | 0.919 |
| share hungry | 0.195 | 0.025 | 0.141 | 0.243 |
| cost per animal per tick | 0.033 | 0.006 | 0.027 | 0.049 |
| share of costs from harmful mutations | 0.219 | 0.012 | 0.195 | 0.241 |
| harmful mutations per animal | 13.8 | 1.035 | 12.6 | 16.1 |
| average diet gene | 0.021 | 0.008 | 0.014 | 0.044 |
| highest diet gene ever | 0.295 | 0.053 | 0.21 | 0.4 |
| meat in the diet | 0.019 | 0.016 | 0.008 | 0.065 |
| kills per 1,000 ticks | 132 | 155 | 42.9 | 556 |
| feeding levels | 1 | 0 | 1 | 1 |
| births with two parents | 0.141 | 0.075 | 0.042 | 0.264 |
| sex gene | 0.155 | 0.086 | 0.045 | 0.298 |
| species alive | 2.188 | 0.555 | 1.436 | 3.713 |
| species diversity (Shannon) | 0.631 | 0.191 | 0.249 | 1.068 |
| share of cells in colonies | 0.022 | 0.007 | 0.013 | 0.037 |
| share sick | 0 | 0 | 0 | 0 |
| brain connections | 8.085 | 1.056 | 6.165 | 9.903 |
| plants standing (share of capacity) | 0.063 | 0.064 | 0.026 | 0.285 |
| worn ground | 0.539 | 0.117 | 0.317 | 0.656 |
| genes pinned at a limit | 8.375 | 1.258 | 5 | 10 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_senseRange`, `low_metabolism`, `low_diet`, `low_attack`, `low_armor`, `low_bond`, `low_generosity`.

## Red flags (2)

### Collapse (1)

*Any seed died out, or the population fell below a fifth of the control's.*

- **as-committed**: died out on 9 of 16 seeds (at tick 968,942, 459,337, 346,404, 143,223, 110,056, 513,402, 533,553, 840,149, 53,196). Reproduce: `npm run sim -- --config configs/grand-world.json --seed 2 --ticks 1000000`

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (1)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **as-committed**: population 641 → 317 (-4.6 noise units); lowest population 185 → 52.1 (-3.4 noise units); deaths per animal per 1,000 ticks 1.003 → 2.119 (4.8 noise units); cost per animal per tick 0.033 → 0.123 (15.3 noise units); share of costs from harmful mutations 0.219 → 0.782 (47 noise units); harmful mutations per animal 13.8 → 145 (127 noise units); plants standing (share of capacity) 0.063 → 0.41 (5.4 noise units); worn ground 0.539 → 0.126 (-3.5 noise units)

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

**population** (control 641): as-committed 317 (-4.6)

**lowest population** (control 185): as-committed 52.1 (-3.4)

**deaths per animal per 1,000 ticks** (control 1.003): as-committed 2.119 (+4.8)

**share hungry** (control 0.195): as-committed 0.163 (-1.3)

**cost per animal per tick** (control 0.033): as-committed 0.123 (+15.3)

**share of costs from harmful mutations** (control 0.219): as-committed 0.782 (+47)

**harmful mutations per animal** (control 13.8): as-committed 145 (+127)

**highest diet gene ever** (control 0.295): as-committed 0.215 (-1.5)

**births with two parents** (control 0.141): as-committed 0.305 (+2.2)

**sex gene** (control 0.155): as-committed 0.338 (+2.1)

**species alive** (control 2.188): as-committed 1.588 (-1.1)

**species diversity (Shannon)** (control 0.631): as-committed 0.341 (-1.5)

**brain connections** (control 8.085): as-committed 9.922 (+1.7)

**plants standing (share of capacity)** (control 0.063): as-committed 0.41 (+5.4)

**worn ground** (control 0.539): as-committed 0.126 (-3.5)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

