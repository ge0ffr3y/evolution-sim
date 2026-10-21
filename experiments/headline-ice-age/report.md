# headline-ice-age: comparison report

**Question:** Does an ice age raise or lower long-term diversity? One ice age strikes at tick 200,000 (at today's severity, 50% colder and twice as cold); diversity before it (ticks 100,000 to 200,000) and long after it (400,000 to 600,000) is compared with worlds that have no catastrophes at all. An answer: species alive and Shannon diversity after recovery against the control, with 95% ranges, and how many worlds survive each severity.

Base world `grand-world` with `catastropheEvery` 0; 600,000 ticks; seeds 501-516; 3 arms against `control`; 64 of 64 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 859 | 95.3 | 680 | 960 |
| lowest population | 524 | 62.1 | 415 | 600 |
| deaths per animal per 1,000 ticks | 1.803 | 0.591 | 1.166 | 2.981 |
| share of deaths by starving | 0.417 | 0.101 | 0.234 | 0.569 |
| share hungry | 0.12 | 0.01 | 0.1 | 0.135 |
| cost per animal per tick | 0.061 | 0.023 | 0.037 | 0.106 |
| share of costs from harmful mutations | 0.199 | 0.01 | 0.18 | 0.216 |
| harmful mutations per animal | 16 | 0.883 | 14.7 | 17.3 |
| average diet gene | 0.075 | 0.033 | 0.041 | 0.143 |
| highest diet gene ever | 0.851 | 0.108 | 0.682 | 1 |
| meat in the diet | 0.084 | 0.025 | 0.049 | 0.131 |
| kills per 1,000 ticks | 904 | 356 | 481 | 1,637 |
| feeding levels | 1.62 | 0.313 | 1.199 | 2 |
| births with two parents | 0.418 | 0.069 | 0.3 | 0.513 |
| sex gene | 0.078 | 0.024 | 0.053 | 0.13 |
| species alive | 5.406 | 1.341 | 3.225 | 8.483 |
| species diversity (Shannon) | 1.284 | 0.242 | 0.83 | 1.722 |
| share of cells in colonies | 0.042 | 0.012 | 0.029 | 0.062 |
| share sick | 0.181 | 0.04 | 0.054 | 0.214 |
| brain connections | 10.9 | 1.069 | 8.051 | 12.8 |
| plants standing (share of capacity) | 0.083 | 0.032 | 0.045 | 0.142 |
| worn ground | 0.278 | 0.155 | 0.039 | 0.479 |
| genes pinned at a limit | 5.813 | 2.689 | 2 | 8 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_senseRange`, `low_attack`, `low_bond`, `low_sex`, `low_generosity`.

## Red flags (6)

### Collapse (1)

*Any seed died out, or the population fell below a fifth of the control's.*

- **ice-age-06**: died out on 7 of 16 seeds (at tick 206,304, 209,290, 206,319, 206,460, 206,227, 206,113, 206,623). Reproduce: `npm run sim -- --config configs/grand-world.json --set catastropheEvery=0 --set catastropheKind=1 --set catastropheAt=200000 --set iceAgeCooling=0.6 --seed 502 --ticks 600000`

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (2)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **ice-age-045**: lowest population 524 → 129 (-6.4 noise units)
- **ice-age-06**: lowest population 524 → 17.6 (-8.2 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (3)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **ice-age-03**: newly pinned `low_diet`
- **ice-age-045**: newly pinned `low_metabolism`, `low_diet`
- **ice-age-06**: newly pinned `low_diet`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**lowest population** (control 524): ice-age-06 17.6 (-8.2), ice-age-045 129 (-6.4), ice-age-03 347 (-2.9)

**share hungry** (control 0.12): ice-age-06 0.132 (+1.2)

**species diversity (Shannon)** (control 1.284): ice-age-06 1.018 (-1.1)

## No clear effect (0)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

None.

