# spare-family: comparison report

**Question:** Does sparing your own parent and young (spareFamily) let meat eaters (diet above 0.75) take hold in the grand world? Hunters attack whoever is nearest and babies are born on their parent's spot, so a hunting family's first victims are its own; kin restraint was patching that. Grand world: as it is; with spareFamily; with spareFamily and no kin restraint; with spareFamily and no herds. Reference: the hunters' world with and without spareFamily. An answer: meat eaters, feeding levels, kills, species and population in each, against the grand world.

Base world `grand-world`; 300,000 ticks; seeds 1701-1704; 5 arms against `control`; 24 of 24 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 856 | 133 | 707 | 972 |
| lowest population | 344 | 150 | 239 | 566 |
| deaths per animal per 1,000 ticks | 2.406 | 0.947 | 1.627 | 3.578 |
| share of deaths by starving | 0.401 | 0.097 | 0.318 | 0.505 |
| share hungry | 0.132 | 0.009 | 0.118 | 0.139 |
| cost per animal per tick | 0.079 | 0.03 | 0.05 | 0.108 |
| share of costs from harmful mutations | 0.195 | 0.013 | 0.182 | 0.212 |
| harmful mutations per animal | 16.3 | 0.955 | 15.4 | 17.4 |
| average diet gene | 0.085 | 0.038 | 0.053 | 0.128 |
| highest diet gene ever | 0.95 | 0.065 | 0.864 | 1 |
| meat in the diet | 0.087 | 0.022 | 0.059 | 0.11 |
| kills per 1,000 ticks | 1,210 | 464 | 793 | 1,726 |
| feeding levels | 1.658 | 0.278 | 1.307 | 1.881 |
| births with two parents | 0.309 | 0.092 | 0.229 | 0.43 |
| sex gene | 0.069 | 0.007 | 0.061 | 0.075 |
| species alive | 5.609 | 1.028 | 4.317 | 6.485 |
| species diversity (Shannon) | 1.408 | 0.217 | 1.108 | 1.62 |
| share of cells in colonies | 0.049 | 0.013 | 0.038 | 0.065 |
| share sick | 0.221 | 0.069 | 0.118 | 0.265 |
| brain connections | 9.871 | 1.839 | 7.973 | 11.6 |
| plants standing (share of capacity) | 0.082 | 0.016 | 0.069 | 0.101 |
| worn ground | 0.099 | 0.127 | 0.007 | 0.277 |
| genes pinned at a limit | 4.5 | 2.38 | 2 | 7 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_bond`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): wornShare (96.7%).

## Red flags (7)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (4)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **spare-family**: sex gene 0.069 → 0.135 (9.4 noise units)
- **spare-family-no-herds**: sex gene 0.069 → 0.122 (7.5 noise units)
- **hunters**: population 856 → 1,334 (3.6 noise units); share of costs from harmful mutations 0.195 → 0 (-14.6 noise units); harmful mutations per animal 16.3 → 0 (-17.1 noise units); meat in the diet 0.087 → 0.236 (6.7 noise units); kills per 1,000 ticks 1,210 → 4,973 (8.1 noise units); feeding levels 1.658 → 2.896 (4.5 noise units); births with two parents 0.309 → 0 (-3.4 noise units); sex gene 0.069 → 0 (-9.7 noise units)
- **hunters-spare-family**: deaths per animal per 1,000 ticks 2.406 → 6.18 (4 noise units); share hungry 0.132 → 0.096 (-3.7 noise units); share of costs from harmful mutations 0.195 → 0 (-14.6 noise units); harmful mutations per animal 16.3 → 0 (-17.1 noise units); average diet gene 0.085 → 0.255 (4.5 noise units); meat in the diet 0.087 → 0.24 (6.9 noise units); kills per 1,000 ticks 1,210 → 5,932 (10.2 noise units); feeding levels 1.658 → 2.941 (4.6 noise units); births with two parents 0.309 → 0 (-3.4 noise units); sex gene 0.069 → 0 (-9.7 noise units); share of cells in colonies 0.049 → 0.101 (4.1 noise units); plants standing (share of capacity) 0.082 → 0.157 (4.7 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (3)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **spare-family**: newly pinned `low_senseRange`, `low_attack`, `low_generosity`
- **spare-family-no-kin**: newly pinned `low_senseRange`, `low_metabolism`, `low_diet`, `low_attack`
- **hunters**: newly pinned `low_attack`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 856): hunters 1,334 (+3.6), hunters-spare-family 1,105 (+1.9)

**lowest population** (control 344): hunters 600 (+1.7), hunters-spare-family 600 (+1.7)

**deaths per animal per 1,000 ticks** (control 2.406): hunters-spare-family 6.18 (+4), hunters 4.882 (+2.6)

**share of deaths by starving** (control 0.401): hunters-spare-family 0.133 (-2.8)

**share hungry** (control 0.132): hunters-spare-family 0.096 (-3.7), hunters 0.109 (-2.4)

**share of costs from harmful mutations** (control 0.195): hunters 0 (-14.6), hunters-spare-family 0 (-14.6), spare-family 0.21 (+1.1)

**harmful mutations per animal** (control 16.3): hunters 0 (-17.1), hunters-spare-family 0 (-17.1)

**average diet gene** (control 0.085): hunters-spare-family 0.255 (+4.5), hunters 0.197 (+3)

**meat in the diet** (control 0.087): hunters-spare-family 0.24 (+6.9), hunters 0.236 (+6.7)

**kills per 1,000 ticks** (control 1,210): hunters-spare-family 5,932 (+10.2), hunters 4,973 (+8.1)

**feeding levels** (control 1.658): hunters-spare-family 2.941 (+4.6), hunters 2.896 (+4.5)

**births with two parents** (control 0.309): hunters 0 (-3.4), hunters-spare-family 0 (-3.4)

**sex gene** (control 0.069): hunters 0 (-9.7), hunters-spare-family 0 (-9.7), spare-family 0.135 (+9.4), spare-family-no-herds 0.122 (+7.5)

**species alive** (control 5.609): hunters-spare-family 7.832 (+2.2)

**share of cells in colonies** (control 0.049): hunters-spare-family 0.101 (+4.1)

**share sick** (control 0.221): hunters 0.402 (+2.6), hunters-spare-family 0.379 (+2.3)

**brain connections** (control 9.871): spare-family-no-kin 12.5 (+1.4)

**plants standing (share of capacity)** (control 0.082): hunters-spare-family 0.157 (+4.7), spare-family-no-kin 0.05 (-2)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

