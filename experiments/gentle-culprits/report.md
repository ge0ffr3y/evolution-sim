# gentle-culprits: comparison report

**Question:** Can the grand world keep its seasons, harmful mutations and kin restraint, only gentler, and still grow meat eaters? A 4-seed screen against today's grand world: plants swinging less with the seasons (growth swing 0.4 and 0.2, against 0.6); fewer harmful mutations (rate 1.5, against 3); more mending (0.3 and 0.5, against 0.15); tighter kin restraint (relatives only within 0.02, against 0.05); hunger overriding kin restraint (below half fed); and two combinations. An answer: meat eaters (diet above 0.75, and above 0.5), feeding levels and kills in each, and what each costs in species, sex and population. Anything promising is confirmed on 16 fresh seeds.

Base world `grand-world`; 300,000 ticks; seeds 1501-1504; 9 arms against `control`; 40 of 40 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 821 | 102 | 713 | 931 |
| lowest population | 345 | 156 | 220 | 566 |
| deaths per animal per 1,000 ticks | 2.31 | 0.821 | 1.192 | 2.973 |
| share of deaths by starving | 0.453 | 0.14 | 0.327 | 0.648 |
| share hungry | 0.132 | 0.013 | 0.115 | 0.144 |
| cost per animal per tick | 0.075 | 0.03 | 0.039 | 0.109 |
| share of costs from harmful mutations | 0.194 | 0.004 | 0.189 | 0.197 |
| harmful mutations per animal | 16.2 | 1.168 | 14.5 | 17.1 |
| average diet gene | 0.088 | 0.035 | 0.039 | 0.12 |
| highest diet gene ever | 0.99 | 0.021 | 0.959 | 1 |
| meat in the diet | 0.087 | 0.033 | 0.04 | 0.114 |
| kills per 1,000 ticks | 1,050 | 454 | 391 | 1,428 |
| feeding levels | 1.644 | 0.452 | 1.04 | 1.99 |
| births with two parents | 0.367 | 0.12 | 0.272 | 0.526 |
| sex gene | 0.088 | 0.011 | 0.072 | 0.098 |
| species alive | 5.312 | 4.16 | 2.079 | 11.3 |
| species diversity (Shannon) | 1.2 | 0.656 | 0.668 | 2.122 |
| share of cells in colonies | 0.044 | 0.01 | 0.031 | 0.053 |
| share sick | 0.224 | 0.035 | 0.174 | 0.255 |
| brain connections | 11.6 | 1.61 | 10.3 | 13.9 |
| plants standing (share of capacity) | 0.083 | 0.029 | 0.048 | 0.118 |
| worn ground | 0.101 | 0.145 | 0.008 | 0.314 |
| genes pinned at a limit | 4.5 | 2.646 | 2 | 8 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_bond`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): population (16.6%), wornShare (82.5%), grazingMean (29.3%).

## Red flags (20)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (8)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **seasons-02**: highest diet gene ever 0.99 → 0.784 (-9.9 noise units)
- **fewer-mutations**: share of costs from harmful mutations 0.194 → 0.113 (-22.3 noise units); harmful mutations per animal 16.2 → 7.922 (-7.1 noise units)
- **mending-03**: share of costs from harmful mutations 0.194 → 0.121 (-20.2 noise units); harmful mutations per animal 16.2 → 8.779 (-6.4 noise units)
- **mending-05**: share of costs from harmful mutations 0.194 → 0.082 (-31.1 noise units); harmful mutations per animal 16.2 → 5.595 (-9.1 noise units); highest diet gene ever 0.99 → 0.751 (-11.5 noise units)
- **kin-tight**: highest diet gene ever 0.99 → 0.697 (-14.1 noise units)
- **kin-hunger**: highest diet gene ever 0.99 → 0.673 (-15.3 noise units)
- **gentle-all**: share of costs from harmful mutations 0.194 → 0.126 (-19 noise units); harmful mutations per animal 16.2 → 8.404 (-6.7 noise units); highest diet gene ever 0.99 → 0.719 (-13.1 noise units)
- **gentler-all**: share of costs from harmful mutations 0.194 → 0.045 (-41.3 noise units); harmful mutations per animal 16.2 → 2.657 (-11.6 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (3)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

- **seasons-02**: population still changing by -27.5% over the last quarter (control 16.6%)
- **seasons-02**: grazingMean still changing by -28.8% over the last quarter (control 29.3%)
- **gentle-all**: colonyShare still changing by -27.9% over the last quarter (control 12.3%)

### Pinned genes (9)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **seasons-04**: newly pinned `low_senseRange`, `low_metabolism`, `low_diet`, `low_attack`, `low_sex`, `low_generosity`
- **seasons-02**: newly pinned `low_attack`, `low_generosity`
- **fewer-mutations**: newly pinned `low_senseRange`, `low_attack`
- **mending-03**: newly pinned `low_senseRange`, `low_attack`, `low_sex`, `low_generosity`
- **mending-05**: newly pinned `low_attack`, `low_generosity`
- **kin-tight**: newly pinned `low_senseRange`, `low_metabolism`, `low_diet`, `low_attack`, `low_sex`
- **kin-hunger**: newly pinned `low_senseRange`, `low_diet`, `low_attack`, `low_sex`, `low_generosity`
- **gentle-all**: newly pinned `low_senseRange`, `low_metabolism`, `low_diet`, `low_attack`, `low_sex`
- **gentler-all**: newly pinned `low_senseRange`, `low_metabolism`, `low_diet`, `low_attack`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**share of costs from harmful mutations** (control 0.194): gentler-all 0.045 (-41.3), mending-05 0.082 (-31.1), fewer-mutations 0.113 (-22.3), mending-03 0.121 (-20.2), gentle-all 0.126 (-19)

**harmful mutations per animal** (control 16.2): gentler-all 2.657 (-11.6), mending-05 5.595 (-9.1), fewer-mutations 7.922 (-7.1), gentle-all 8.404 (-6.7), mending-03 8.779 (-6.4)

**highest diet gene ever** (control 0.99): kin-hunger 0.673 (-15.3), kin-tight 0.697 (-14.1), gentle-all 0.719 (-13.1), mending-05 0.751 (-11.5), seasons-02 0.784 (-9.9)

**sex gene** (control 0.088): kin-hunger 0.062 (-2.3), kin-tight 0.066 (-1.9)

**worn ground** (control 0.101): gentler-all 0.491 (+2.7), gentle-all 0.43 (+2.3)

**genes pinned at a limit** (control 4.5): gentle-all 7.5 (+1.1)

## No clear effect (1)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`seasons-04`

