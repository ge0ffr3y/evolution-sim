# oasis-test: comparison report

**Question:** In a world where food sits in oases far beyond sensing range and moves between them in a fixed yearly round, can learning, place memory and working memory pay off at all (bigger, longer-lived populations; more food gathered, especially by older animals; the genes rising; memory used above chance)? Does place memory need a starting reflex to get going, and does it need learning?

Base world `oasis-test`; 200,000 ticks; seeds 1-8; 5 arms against `none`; 48 of 48 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`none`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 79.5 | 60.9 | 5.059 | 190 |
| lowest population | 49 | 50.1 | 2 | 147 |
| deaths per animal per 1,000 ticks | 0.69 | 0.077 | 0.58 | 0.812 |
| share of deaths by starving | 0.761 | 0.123 | 0.52 | 0.888 |
| share hungry | 0.105 | 0.025 | 0.047 | 0.121 |
| cost per animal per tick | 0.027 | 0.006 | 0.019 | 0.035 |
| share of costs from harmful mutations | 0 | 0 | 0 | 0 |
| harmful mutations per animal | 0 | 0 | 0 | 0 |
| average diet gene | 0.039 | 0.016 | 0.022 | 0.067 |
| highest diet gene ever | 0.317 | 0.1 | 0.167 | 0.493 |
| meat in the diet | 0.034 | 0.018 | 0.019 | 0.072 |
| kills per 1,000 ticks | 11.5 | 11.6 | 1.66 | 37 |
| feeding levels | 0.921 | 0.228 | 0.356 | 1.01 |
| births with two parents | 0 | 0 | 0 | 0 |
| sex gene | 0 | 0 | 0 | 0 |
| species alive | 1.057 | 0.107 | 1 | 1.307 |
| species diversity (Shannon) | 0.024 | 0.044 | 0 | 0.123 |
| share of cells in colonies | 0 | 0 | 0 | 0 |
| share sick | 0 | 0 | 0 | 0 |
| brain connections | 5.774 | 1.821 | 3.684 | 9.15 |
| plants standing (share of capacity) | 0.117 | 0.098 | 0.044 | 0.349 |
| worn ground | 0 | 0 | 0 | 0 |
| genes pinned at a limit | 5.125 | 0.641 | 4 | 6 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_speed`, `low_senseRange`, `low_diet`, `low_attack`.

## Red flags (8)

### Collapse (2)

*Any seed died out, or the population fell below a fifth of the control's.*

- **control**: died out on 1 of 8 seeds (at tick 55,640). Reproduce: `npm run sim -- --config configs/oasis-test.json --seed 7 --ticks 200000`
- **no-place**: died out on 1 of 8 seeds (at tick 196,058). Reproduce: `npm run sim -- --config configs/oasis-test.json --set placeMemory=0 --seed 7 --ticks 200000`

### Too good to be true (0)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

None.

### Big changes (3)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **reflex**: cost per animal per tick 0.027 → 0.068 (6.9 noise units)
- **place-reflex-only**: cost per animal per tick 0.027 → 0.071 (7.4 noise units)
- **reflex-no-learning**: cost per animal per tick 0.027 → 0.066 (6.5 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (0)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

None.

### Pinned genes (3)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **reflex**: newly pinned `low_armor`; freed `low_size`, `low_speed`
- **place-reflex-only**: newly pinned `low_armor`; freed `low_size`, `low_speed`
- **reflex-no-learning**: newly pinned `low_armor`; freed `low_size`, `low_speed`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**share hungry** (control 0.105): reflex-no-learning 0.139 (+1.4), place-reflex-only 0.131 (+1.1)

**cost per animal per tick** (control 0.027): place-reflex-only 0.071 (+7.4), reflex 0.068 (+6.9), reflex-no-learning 0.066 (+6.5)

**highest diet gene ever** (control 0.317): reflex-no-learning 0.571 (+2.5)

**meat in the diet** (control 0.034): no-place 0.076 (+2.4), reflex 0.066 (+1.8), place-reflex-only 0.062 (+1.6)

**kills per 1,000 ticks** (control 11.5): reflex 27.9 (+1.4)

**genes pinned at a limit** (control 5.125): reflex-no-learning 3.5 (-2.5), reflex 3.75 (-2.1), place-reflex-only 3.75 (-2.1)

## No clear effect (1)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`control`

