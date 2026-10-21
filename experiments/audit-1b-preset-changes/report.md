# audit-1b-preset-changes: comparison report

**Question:** With slow climate drift, a disease that can spread (cost 1, wider matching) and slightly softer overgrazing, does the grand world stay healthy (no collapse, disease not wiping things out), do animals live longer, and what does each change do on its own?

Base world `grand-world`; 300,000 ticks; seeds 1-8; 4 arms against `control`; 40 of 40 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 878 | 131 | 692 | 1,069 |
| lowest population | 331 | 135 | 141 | 486 |
| deaths per animal per 1,000 ticks | 1.449 | 0.668 | 0.829 | 2.84 |
| share of deaths by starving | 0.736 | 0.164 | 0.428 | 0.942 |
| share hungry | 0.202 | 0.025 | 0.17 | 0.237 |
| cost per animal per tick | 0.045 | 0.013 | 0.029 | 0.064 |
| share of costs from harmful mutations | 0.203 | 0.015 | 0.185 | 0.227 |
| harmful mutations per animal | 13.7 | 1.134 | 12.2 | 15.5 |
| average diet gene | 0.029 | 0.017 | 0.015 | 0.066 |
| highest diet gene ever | 0.34 | 0.098 | 0.233 | 0.487 |
| meat in the diet | 0.036 | 0.024 | 0.012 | 0.085 |
| kills per 1,000 ticks | 356 | 283 | 51.5 | 828 |
| feeding levels | 1.004 | 0.007 | 1 | 1.02 |
| births with two parents | 0.146 | 0.093 | 0.037 | 0.279 |
| sex gene | 0.158 | 0.1 | 0.045 | 0.302 |
| species alive | 3.365 | 1.053 | 2.069 | 5.03 |
| species diversity (Shannon) | 0.982 | 0.292 | 0.497 | 1.385 |
| share of cells in colonies | 0.022 | 0.007 | 0.013 | 0.033 |
| share sick | 0.203 | 0.038 | 0.136 | 0.247 |
| brain connections | 9.638 | 1.535 | 7.242 | 11.5 |
| plants standing (share of capacity) | 0.055 | 0.035 | 0.023 | 0.136 |
| worn ground | 0.233 | 0.123 | 0.11 | 0.44 |
| genes pinned at a limit | 7.125 | 1.885 | 5 | 9 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_senseRange`, `low_metabolism`, `low_diet`, `low_attack`, `low_bond`, `low_generosity`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): wornShare (36.2%).

## Red flags (3)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (2)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **before**: share sick 0.203 → 0 (-5.4 noise units)
- **old-disease**: share sick 0.203 → 0 (-5.4 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (1)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **old-disease**: newly pinned `low_armor`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 878): old-grazing 701 (-1.3)

**share of costs from harmful mutations** (control 0.203): before 0.235 (+2), old-disease 0.234 (+2)

**species alive** (control 3.365): old-grazing 2.155 (-1.1)

**species diversity (Shannon)** (control 0.982): old-grazing 0.6 (-1.3)

**share sick** (control 0.203): before 0 (-5.4), old-disease 0 (-5.4), old-grazing 0.141 (-1.6)

## No clear effect (1)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`no-drift`

