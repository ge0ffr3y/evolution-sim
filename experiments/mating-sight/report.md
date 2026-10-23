# mating-sight: comparison report

**Question:** Do the pickiness gene (diet-based mate choice, scaled by how many mates are around), the eye gene (from wide and short to narrow, far-reaching and sharp, starting at today's eye) and mate scent (two diet layers, smelled by the brain) let meat eaters (diet above 0.75) evolve and last in the grand world? Each alone, all three, all three with prey sight not scaled by the viewer's diet (brainAppetiteSenses 0), and that with a founder pull toward prey (brainFounderReflex 2). An answer: meat eaters, whether eyes split by diet (narrow for meat eaters, wide for plant eaters) and pickiness rises, feeding levels, kills, species, sex and population. The control also re-measures the grand world's species with the fat gene left out of species tracking.

Base world `grand-world`; 300,000 ticks; seeds 2601-2604; 6 arms against `control`; 28 of 28 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 1,127 | 44.5 | 1,076 | 1,177 |
| lowest population | 419 | 94.1 | 323 | 540 |
| deaths per animal per 1,000 ticks | 3.134 | 0.568 | 2.561 | 3.91 |
| share of deaths by starving | 0.282 | 0.063 | 0.216 | 0.368 |
| share hungry | 0.126 | 0.02 | 0.104 | 0.152 |
| cost per animal per tick | 0.093 | 0.014 | 0.074 | 0.104 |
| share of costs from harmful mutations | 0.086 | 0.005 | 0.079 | 0.092 |
| harmful mutations per animal | 5.607 | 0.091 | 5.498 | 5.716 |
| average diet gene | 0.13 | 0.017 | 0.109 | 0.149 |
| highest diet gene ever | 0.882 | 0.082 | 0.817 | 1 |
| meat in the diet | 0.145 | 0.03 | 0.104 | 0.168 |
| kills per 1,000 ticks | 2,534 | 524 | 2,183 | 3,297 |
| feeding levels | 1.96 | 0.04 | 1.921 | 2 |
| births with two parents | 0.295 | 0.049 | 0.25 | 0.351 |
| sex gene | 0.101 | 0.026 | 0.069 | 0.134 |
| species alive | 8.832 | 2.998 | 6.723 | 13.3 |
| species diversity (Shannon) | 1.666 | 0.363 | 1.329 | 2.181 |
| share of cells in colonies | 0.063 | 0.012 | 0.045 | 0.07 |
| share sick | 0.253 | 0.019 | 0.234 | 0.277 |
| brain connections | 11.9 | 1.132 | 10.7 | 13.1 |
| plants standing (share of capacity) | 0.094 | 0.017 | 0.074 | 0.117 |
| worn ground | 0.033 | 0.019 | 0.014 | 0.055 |
| genes pinned at a limit | 2.25 | 0.5 | 2 | 3 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_bond`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): plantFill (25.1%), shannon (-23.3%).

## Red flags (3)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (3)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **all-three**: population 1,127 → 720 (-9.1 noise units); deaths per animal per 1,000 ticks 3.134 → 5.13 (3.5 noise units); cost per animal per tick 0.093 → 0.185 (6.5 noise units); average diet gene 0.13 → 0.183 (3.2 noise units); plants standing (share of capacity) 0.094 → 0.179 (4.9 noise units)
- **all-three-unmuted**: population 1,127 → 779 (-7.8 noise units); deaths per animal per 1,000 ticks 3.134 → 5.038 (3.4 noise units); cost per animal per tick 0.093 → 0.179 (6.1 noise units); average diet gene 0.13 → 0.203 (4.4 noise units); plants standing (share of capacity) 0.094 → 0.168 (4.2 noise units)
- **all-three-unmuted-reflex**: population 1,127 → 856 (-6.1 noise units); cost per animal per tick 0.093 → 0.144 (3.7 noise units); average diet gene 0.13 → 0.213 (5 noise units)

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

**population** (control 1,127): all-three 720 (-9.1), all-three-unmuted 779 (-7.8), all-three-unmuted-reflex 856 (-6.1)

**lowest population** (control 419): mate-scent 525 (+1.1)

**deaths per animal per 1,000 ticks** (control 3.134): all-three 5.13 (+3.5), all-three-unmuted 5.038 (+3.4), all-three-unmuted-reflex 4.645 (+2.7)

**share of deaths by starving** (control 0.282): all-three 0.162 (-1.9), all-three-unmuted-reflex 0.168 (-1.8)

**cost per animal per tick** (control 0.093): all-three 0.185 (+6.5), all-three-unmuted 0.179 (+6.1), all-three-unmuted-reflex 0.144 (+3.7)

**share of costs from harmful mutations** (control 0.086): mate-scent 0.092 (+1.1)

**harmful mutations per animal** (control 5.607): all-three 5.789 (+2), all-three-unmuted-reflex 5.776 (+1.9), all-three-unmuted 5.748 (+1.5)

**average diet gene** (control 0.13): all-three-unmuted-reflex 0.213 (+5), all-three-unmuted 0.203 (+4.4), all-three 0.183 (+3.2)

**meat in the diet** (control 0.145): all-three-unmuted-reflex 0.185 (+1.4)

**kills per 1,000 ticks** (control 2,534): all-three-unmuted-reflex 3,312 (+1.5)

**feeding levels** (control 1.96): all-three-unmuted-reflex 2.01 (+1.2)

**species diversity (Shannon)** (control 1.666): eye 1.276 (-1.1)

**share sick** (control 0.253): eye 0.303 (+2.6)

**brain connections** (control 11.9): all-three 10.1 (-1.6), pickiness 10.4 (-1.3)

**plants standing (share of capacity)** (control 0.094): all-three 0.179 (+4.9), all-three-unmuted 0.168 (+4.2), all-three-unmuted-reflex 0.142 (+2.7)

**worn ground** (control 0.033): all-three 0.003 (-1.6)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

