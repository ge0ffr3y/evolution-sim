# audit-2-doses: comparison report

**Question:** Which settings is the grand world (with 15% mending) sensitive to, which barely matter, and where does a change of half or double cause a collapse?

Base world `grand-world`; 100,000 ticks; seeds 301-304; 569 arms against `control`; 2280 of 2280 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`control`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 1,022 | 133 | 843 | 1,157 |
| lowest population | 422 | 203 | 211 | 600 |
| deaths per animal per 1,000 ticks | 1.532 | 0.4 | 1.169 | 2.097 |
| share of deaths by starving | 0.668 | 0.034 | 0.629 | 0.71 |
| share hungry | 0.147 | 0.002 | 0.144 | 0.148 |
| cost per animal per tick | 0.053 | 0.012 | 0.042 | 0.069 |
| share of costs from harmful mutations | 0.19 | 0.008 | 0.182 | 0.199 |
| harmful mutations per animal | 14.6 | 0.395 | 14.2 | 15.1 |
| average diet gene | 0.042 | 0.005 | 0.036 | 0.048 |
| highest diet gene ever | 0.723 | 0.192 | 0.558 | 1 |
| meat in the diet | 0.04 | 0.007 | 0.035 | 0.05 |
| kills per 1,000 ticks | 510 | 111 | 393 | 657 |
| feeding levels | 1.035 | 0.01 | 1.02 | 1.04 |
| births with two parents | 0.351 | 0.109 | 0.247 | 0.491 |
| sex gene | 0.101 | 0.073 | 0.053 | 0.21 |
| species alive | 7.111 | 2.999 | 3.921 | 10.3 |
| species diversity (Shannon) | 1.577 | 0.462 | 1.042 | 2.04 |
| share of cells in colonies | 0.031 | 0.002 | 0.028 | 0.033 |
| share sick | 0.233 | 0.039 | 0.176 | 0.263 |
| brain connections | 11.9 | 1.814 | 10.2 | 14.5 |
| plants standing (share of capacity) | 0.061 | 0.012 | 0.047 | 0.076 |
| worn ground | 0.003 | 0.003 | 9.00e-4 | 0.007 |
| genes pinned at a limit | 6 | 0.816 | 5 | 7 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_senseRange`, `low_diet`, `low_attack`, `low_bond`, `low_generosity`.

Still drifting at the end in the control (changed by more than 10% over the last quarter, the same way on every seed): wornShare (185%), grazingMean (14.4%), cost_total (-19.4%), cost_load (-21.5%).

## Red flags (506)

### Collapse (4)

*Any seed died out, or the population fell below a fifth of the control's.*

- **world-size-down**: population 186 against 1,022. Reproduce: `npm run sim -- --config configs/grand-world.json --set worldWidth=256 --set worldHeight=256 --set initialOrganisms=150 --seed 301 --ticks 100000`
- **base-temperature-down**: died out on 1 of 4 seeds (at tick 3,079). Reproduce: `npm run sim -- --config configs/grand-world.json --set baseTemperature=0.375 --seed 304 --ticks 100000`
- **plant-temp-tolerance-down**: died out on 2 of 4 seeds (at tick 29,775, 50,588). Reproduce: `npm run sim -- --config configs/grand-world.json --set plantTempTolerance=0.3 --seed 303 --ticks 100000`
- **ice-age-cooling-up**: died out on 1 of 4 seeds (at tick 77,418). Reproduce: `npm run sim -- --config configs/grand-world.json --set iceAgeCooling=0.6 --seed 301 --ticks 100000`

### Too good to be true (2)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

- **world-size-up**: population 4,080 against 1,022: check the energy ledger for an exploit. Reproduce: `npm run sim -- --config configs/grand-world.json --set worldWidth=1024 --set worldHeight=1024 --set initialOrganisms=2400 --seed 301 --ticks 100000`
- **food-cell-size-down**: population 2,803 against 1,022: check the energy ledger for an exploit. Reproduce: `npm run sim -- --config configs/grand-world.json --set foodCellSize=4 --seed 301 --ticks 100000`

### Big changes (187)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **world-size-down**: population 1,022 → 186 (-6.3 noise units); share hungry 0.147 → 0.119 (-14.4 noise units); harmful mutations per animal 14.6 → 17.1 (6.4 noise units); plants standing (share of capacity) 0.061 → 0.142 (6.8 noise units)
- **world-size-up**: population 1,022 → 4,080 (22.9 noise units); lowest population 422 → 1,741 (6.5 noise units); kills per 1,000 ticks 510 → 3,041 (22.9 noise units); feeding levels 1.035 → 1.743 (71.5 noise units)
- **food-cell-size-down**: share sick 0.233 → 0.407 (4.5 noise units)
- **food-cell-size-up**: population 1,022 → 317 (-5.3 noise units); share of costs from harmful mutations 0.19 → 0.243 (6.4 noise units); harmful mutations per animal 14.6 → 16.3 (4.4 noise units); share sick 0.233 → 0.002 (-6 noise units)
- **food-regrow-per-tick-down**: population 1,022 → 613 (-3.1 noise units); harmful mutations per animal 14.6 → 16.7 (5.3 noise units)
- **food-regrow-per-tick-up**: share of deaths by starving 0.668 → 0.401 (-7.8 noise units); cost per animal per tick 0.053 → 0.114 (5.1 noise units); harmful mutations per animal 14.6 → 16.2 (4.2 noise units); average diet gene 0.042 → 0.1 (11.8 noise units); meat in the diet 0.04 → 0.108 (10.1 noise units); kills per 1,000 ticks 510 → 2,354 (16.7 noise units); feeding levels 1.035 → 1.814 (78.8 noise units); share of cells in colonies 0.031 → 0.05 (8 noise units); plants standing (share of capacity) 0.061 → 0.14 (6.6 noise units)
- **fertility-variation-down**: share of deaths by starving 0.668 → 0.419 (-7.3 noise units); harmful mutations per animal 14.6 → 16 (3.7 noise units); meat in the diet 0.04 → 0.088 (7.2 noise units); kills per 1,000 ticks 510 → 1,381 (7.9 noise units); feeding levels 1.035 → 1.587 (55.8 noise units); share of cells in colonies 0.031 → 0.052 (9 noise units); plants standing (share of capacity) 0.061 → 0.1 (3.3 noise units)
- **initial-nutrient-per-cell-down**: population 1,022 → 538 (-3.6 noise units); deaths per animal per 1,000 ticks 1.532 → 4.173 (6.6 noise units); share of deaths by starving 0.668 → 0.332 (-9.8 noise units); share hungry 0.147 → 0.099 (-24.8 noise units); cost per animal per tick 0.053 → 0.125 (6 noise units); harmful mutations per animal 14.6 → 17.6 (7.8 noise units); average diet gene 0.042 → 0.155 (23.2 noise units); meat in the diet 0.04 → 0.128 (13.1 noise units); kills per 1,000 ticks 510 → 1,466 (8.6 noise units); feeding levels 1.035 → 1.837 (81 noise units); share of cells in colonies 0.031 → 0.056 (10.6 noise units); plants standing (share of capacity) 0.061 → 0.167 (8.8 noise units); genes pinned at a limit 6 → 2.25 (-4.6 noise units)
- **body-matter-per-size-down**: share hungry 0.147 → 0.173 (13.8 noise units)
- **body-matter-per-size-up**: population 1,022 → 450 (-4.3 noise units); deaths per animal per 1,000 ticks 1.532 → 4.763 (8.1 noise units); share of deaths by starving 0.668 → 0.248 (-12.3 noise units); share hungry 0.147 → 0.074 (-38.1 noise units); cost per animal per tick 0.053 → 0.155 (8.4 noise units); share of costs from harmful mutations 0.19 → 0.241 (6.2 noise units); harmful mutations per animal 14.6 → 18.2 (9.1 noise units); average diet gene 0.042 → 0.231 (38.9 noise units); meat in the diet 0.04 → 0.142 (15.3 noise units); kills per 1,000 ticks 510 → 1,588 (9.7 noise units); feeding levels 1.035 → 1.995 (97 noise units); share sick 0.233 → 0.035 (-5.1 noise units); plants standing (share of capacity) 0.061 → 0.239 (14.8 noise units); genes pinned at a limit 6 → 1.75 (-5.2 noise units)
- **body-energy-per-size-up**: share of deaths by starving 0.668 → 0.459 (-6.1 noise units); meat in the diet 0.04 → 0.099 (8.8 noise units); kills per 1,000 ticks 510 → 1,174 (6 noise units); share of cells in colonies 0.031 → 0.051 (8.5 noise units); plants standing (share of capacity) 0.061 → 0.1 (3.2 noise units)
- **detritus-mineralize-rate-down**: genes pinned at a limit 6 → 2.5 (-4.3 noise units)
- **initial-organisms-down**: share of cells in colonies 0.031 → 0.04 (4.1 noise units)
- **initial-organisms-up**: harmful mutations per animal 14.6 → 16.6 (5.3 noise units); share of cells in colonies 0.031 → 0.049 (7.7 noise units); plants standing (share of capacity) 0.061 → 0.101 (3.3 noise units)
- **initial-size-up**: share of deaths by starving 0.668 → 0.442 (-6.6 noise units); meat in the diet 0.04 → 0.079 (5.8 noise units)
- **initial-speed-down**: harmful mutations per animal 14.6 → 16.1 (3.9 noise units); share of cells in colonies 0.031 → 0.042 (4.6 noise units)
- **initial-metabolism-down**: share of deaths by starving 0.668 → 0.456 (-6.2 noise units); harmful mutations per animal 14.6 → 16.5 (4.9 noise units); meat in the diet 0.04 → 0.083 (6.4 noise units); share of cells in colonies 0.031 → 0.046 (6.5 noise units)
- **initial-mutation-rate-up**: deaths per animal per 1,000 ticks 1.532 → 3.709 (5.4 noise units); cost per animal per tick 0.053 → 0.101 (4 noise units); share of cells in colonies 0.031 → 0.047 (6.8 noise units)
- **initial-litter-up**: harmful mutations per animal 14.6 → 16 (3.6 noise units)
- **size-min-up**: population 1,022 → 378 (-4.8 noise units); share hungry 0.147 → 0.101 (-23.7 noise units); harmful mutations per animal 14.6 → 18.1 (9 noise units); share of cells in colonies 0.031 → 0.064 (14.4 noise units); share sick 0.233 → 0.031 (-5.2 noise units)
- **speed-min-down**: deaths per animal per 1,000 ticks 1.532 → 3.323 (4.5 noise units); share of deaths by starving 0.668 → 0.354 (-9.2 noise units); share hungry 0.147 → 0.123 (-12.5 noise units); cost per animal per tick 0.053 → 0.094 (3.4 noise units); harmful mutations per animal 14.6 → 17 (6 noise units); average diet gene 0.042 → 0.097 (11.4 noise units); meat in the diet 0.04 → 0.1 (9 noise units); kills per 1,000 ticks 510 → 1,520 (9.1 noise units); share of cells in colonies 0.031 → 0.055 (10.4 noise units); plants standing (share of capacity) 0.061 → 0.114 (4.5 noise units); genes pinned at a limit 6 → 2.75 (-4 noise units)
- **speed-max-up**: share of cells in colonies 0.031 → 0.041 (4.3 noise units)
- **sense-range-max-down**: share of cells in colonies 0.031 → 0.043 (5 noise units)
- **sense-range-max-up**: share of cells in colonies 0.031 → 0.051 (8.5 noise units)
- **metabolism-min-up**: deaths per animal per 1,000 ticks 1.532 → 3.444 (4.8 noise units); share of deaths by starving 0.668 → 0.422 (-7.2 noise units); share hungry 0.147 → 0.132 (-7.5 noise units); cost per animal per tick 0.053 → 0.097 (3.6 noise units); harmful mutations per animal 14.6 → 16.3 (4.3 noise units); average diet gene 0.042 → 0.087 (9.3 noise units); meat in the diet 0.04 → 0.087 (6.9 noise units); kills per 1,000 ticks 510 → 1,393 (8 noise units); feeding levels 1.035 → 1.512 (48.3 noise units); plants standing (share of capacity) 0.061 → 0.107 (3.9 noise units)
- **metabolism-max-up**: deaths per animal per 1,000 ticks 1.532 → 3.347 (4.5 noise units); share of deaths by starving 0.668 → 0.356 (-9.1 noise units); share hungry 0.147 → 0.114 (-17.2 noise units); cost per animal per tick 0.053 → 0.091 (3.2 noise units); harmful mutations per animal 14.6 → 17.2 (6.7 noise units); average diet gene 0.042 → 0.102 (12.2 noise units); meat in the diet 0.04 → 0.106 (9.8 noise units); kills per 1,000 ticks 510 → 1,595 (9.8 noise units); feeding levels 1.035 → 1.817 (79 noise units); share of cells in colonies 0.031 → 0.056 (10.9 noise units); plants standing (share of capacity) 0.061 → 0.12 (4.9 noise units); genes pinned at a limit 6 → 3.25 (-3.4 noise units)
- **attack-max-down**: worn ground 0.003 → 0.013 (3.4 noise units); genes pinned at a limit 6 → 8.75 (3.4 noise units)
- **attack-max-up**: deaths per animal per 1,000 ticks 1.532 → 3.789 (5.6 noise units); share of deaths by starving 0.668 → 0.368 (-8.8 noise units); cost per animal per tick 0.053 → 0.1 (3.9 noise units); harmful mutations per animal 14.6 → 17 (6.3 noise units); average diet gene 0.042 → 0.1 (11.9 noise units); meat in the diet 0.04 → 0.101 (9.2 noise units); kills per 1,000 ticks 510 → 1,750 (11.2 noise units); feeding levels 1.035 → 1.574 (54.5 noise units); plants standing (share of capacity) 0.061 → 0.114 (4.4 noise units); genes pinned at a limit 6 → 2.75 (-4 noise units)
- **armor-max-down**: harmful mutations per animal 14.6 → 17 (6.3 noise units); average diet gene 0.042 → 0.131 (18.2 noise units); feeding levels 1.035 → 1.745 (71.8 noise units); genes pinned at a limit 6 → 3 (-3.7 noise units)
- **lifespan-max-down**: population 1,022 → 610 (-3.1 noise units); deaths per animal per 1,000 ticks 1.532 → 3.685 (5.4 noise units); share of deaths by starving 0.668 → 0.363 (-8.9 noise units); share hungry 0.147 → 0.12 (-14.1 noise units); cost per animal per tick 0.053 → 0.103 (4.1 noise units); harmful mutations per animal 14.6 → 17 (6.2 noise units); average diet gene 0.042 → 0.098 (11.5 noise units); meat in the diet 0.04 → 0.097 (8.4 noise units); kills per 1,000 ticks 510 → 1,422 (8.2 noise units); feeding levels 1.035 → 1.507 (47.8 noise units); share of cells in colonies 0.031 → 0.051 (8.6 noise units); plants standing (share of capacity) 0.061 → 0.12 (5 noise units); genes pinned at a limit 6 → 3.25 (-3.4 noise units)
- **lifespan-max-up**: harmful mutations per animal 14.6 → 17 (6.1 noise units); share of cells in colonies 0.031 → 0.058 (11.6 noise units)
- **bite-rate-down**: share of cells in colonies 0.031 → 0.043 (5.3 noise units); plants standing (share of capacity) 0.061 → 0.114 (4.4 noise units)
- **bite-rate-up**: share of costs from harmful mutations 0.19 → 0.162 (-3.5 noise units); feeding levels 1.035 → 1.8 (77.3 noise units)
- **energy-per-food-down**: share of costs from harmful mutations 0.19 → 0.237 (5.6 noise units); share sick 0.233 → 0.102 (-3.4 noise units)
- **energy-per-food-up**: deaths per animal per 1,000 ticks 1.532 → 5.677 (10.4 noise units); share of deaths by starving 0.668 → 0.211 (-13.4 noise units); share hungry 0.147 → 0.077 (-36.2 noise units); cost per animal per tick 0.053 → 0.163 (9.1 noise units); harmful mutations per animal 14.6 → 18.3 (9.5 noise units); average diet gene 0.042 → 0.229 (38.4 noise units); meat in the diet 0.04 → 0.171 (19.6 noise units); kills per 1,000 ticks 510 → 3,051 (23 noise units); feeding levels 1.035 → 1.998 (97.3 noise units); share of cells in colonies 0.031 → 0.056 (10.8 noise units); plants standing (share of capacity) 0.061 → 0.11 (4.1 noise units); genes pinned at a limit 6 → 1.75 (-5.2 noise units)
- **basal-cost-coeff-down**: share of costs from harmful mutations 0.19 → 0.163 (-3.3 noise units); feeding levels 1.035 → 1.775 (74.8 noise units)
- **sense-cost-coeff-down**: deaths per animal per 1,000 ticks 1.532 → 2.921 (3.5 noise units); share of deaths by starving 0.668 → 0.411 (-7.5 noise units); share hungry 0.147 → 0.134 (-6.6 noise units); harmful mutations per animal 14.6 → 16.6 (5 noise units); average diet gene 0.042 → 0.088 (9.4 noise units); meat in the diet 0.04 → 0.089 (7.3 noise units); kills per 1,000 ticks 510 → 1,309 (7.2 noise units); feeding levels 1.035 → 1.5 (47 noise units); share of cells in colonies 0.031 → 0.046 (6.4 noise units); plants standing (share of capacity) 0.061 → 0.1 (3.2 noise units); genes pinned at a limit 6 → 3 (-3.7 noise units)
- **sense-cost-coeff-up**: feeding levels 1.035 → 1.48 (45 noise units)
- **diet-specialization-down**: deaths per animal per 1,000 ticks 1.532 → 4.566 (7.6 noise units); share of deaths by starving 0.668 → 0.369 (-8.7 noise units); cost per animal per tick 0.053 → 0.123 (5.8 noise units); harmful mutations per animal 14.6 → 17.3 (6.9 noise units); average diet gene 0.042 → 0.166 (25.5 noise units); meat in the diet 0.04 → 0.13 (13.5 noise units); kills per 1,000 ticks 510 → 1,846 (12.1 noise units); feeding levels 1.035 → 1.985 (96 noise units); share of cells in colonies 0.031 → 0.05 (8.3 noise units); plants standing (share of capacity) 0.061 → 0.135 (6.2 noise units); genes pinned at a limit 6 → 2.5 (-4.3 noise units)
- **diet-specialization-up**: average diet gene 0.042 → 0.026 (-3.4 noise units); feeding levels 1.035 → 1 (-3.5 noise units); genes pinned at a limit 6 → 8.5 (3.1 noise units)
- **attack-cost-coeff-down**: share hungry 0.147 → 0.119 (-14.4 noise units)
- **attack-attempt-cost-down**: share of deaths by starving 0.668 → 0.4 (-7.8 noise units); harmful mutations per animal 14.6 → 16.7 (5.4 noise units)
- **attack-attempt-cost-up**: share of deaths by starving 0.668 → 0.823 (4.5 noise units); share hungry 0.147 → 0.155 (4.5 noise units); genes pinned at a limit 6 → 8.5 (3.1 noise units)
- **armor-cost-coeff-up**: share of deaths by starving 0.668 → 0.424 (-7.1 noise units); harmful mutations per animal 14.6 → 16.2 (4.2 noise units); kills per 1,000 ticks 510 → 1,281 (7 noise units); plants standing (share of capacity) 0.061 → 0.106 (3.7 noise units)
- **armor-move-factor-up**: population 1,022 → 607 (-3.1 noise units); deaths per animal per 1,000 ticks 1.532 → 4.125 (6.5 noise units); share of deaths by starving 0.668 → 0.294 (-10.9 noise units); share hungry 0.147 → 0.119 (-14.7 noise units); cost per animal per tick 0.053 → 0.117 (5.3 noise units); harmful mutations per animal 14.6 → 17.5 (7.3 noise units); average diet gene 0.042 → 0.134 (18.9 noise units); meat in the diet 0.04 → 0.124 (12.6 noise units); kills per 1,000 ticks 510 → 1,762 (11.3 noise units); feeding levels 1.035 → 1.832 (80.5 noise units); share of cells in colonies 0.031 → 0.061 (13 noise units); plants standing (share of capacity) 0.061 → 0.152 (7.6 noise units); genes pinned at a limit 6 → 2.75 (-4 noise units)
- **armor-base-down**: harmful mutations per animal 14.6 → 16.3 (4.5 noise units)
- **attack-threshold-down**: share of deaths by starving 0.668 → 0.431 (-6.9 noise units); meat in the diet 0.04 → 0.094 (8 noise units); feeding levels 1.035 → 1.619 (59 noise units)
- **reach-base-down**: share of cells in colonies 0.031 → 0.04 (3.9 noise units)
- **reach-base-up**: population 1,022 → 395 (-4.7 noise units); deaths per animal per 1,000 ticks 1.532 → 6.2 (11.7 noise units); share of deaths by starving 0.668 → 0.185 (-14.1 noise units); share hungry 0.147 → 0.115 (-16.6 noise units); cost per animal per tick 0.053 → 0.176 (10.2 noise units); share of costs from harmful mutations 0.19 → 0.257 (8.1 noise units); harmful mutations per animal 14.6 → 18.5 (10 noise units); average diet gene 0.042 → 0.188 (30 noise units); meat in the diet 0.04 → 0.167 (19 noise units); kills per 1,000 ticks 510 → 2,007 (13.5 noise units); feeding levels 1.035 → 1.998 (97.3 noise units); share of cells in colonies 0.031 → 0.082 (22.3 noise units); share sick 0.233 → 0.001 (-6 noise units); plants standing (share of capacity) 0.061 → 0.247 (15.5 noise units); genes pinned at a limit 6 → 1.75 (-5.2 noise units)
- **prey-max-size-ratio-down**: share of deaths by starving 0.668 → 0.997 (9.6 noise units); share hungry 0.147 → 0.168 (10.9 noise units); harmful mutations per animal 14.6 → 12.7 (-4.8 noise units); meat in the diet 0.04 → 0.01 (-4.5 noise units); kills per 1,000 ticks 510 → 2.625 (-4.6 noise units); feeding levels 1.035 → 1.002 (-3.3 noise units); worn ground 0.003 → 0.02 (5.7 noise units); genes pinned at a limit 6 → 8.75 (3.4 noise units)
- **herbivore-attack-penalty-down**: population 1,022 → 610 (-3.1 noise units); deaths per animal per 1,000 ticks 1.532 → 3.93 (6 noise units); share of deaths by starving 0.668 → 0.277 (-11.4 noise units); share hungry 0.147 → 0.116 (-15.9 noise units); cost per animal per tick 0.053 → 0.116 (5.2 noise units); harmful mutations per animal 14.6 → 17.3 (6.9 noise units); average diet gene 0.042 → 0.119 (15.7 noise units); meat in the diet 0.04 → 0.115 (11.1 noise units); kills per 1,000 ticks 510 → 1,744 (11.2 noise units); feeding levels 1.035 → 1.856 (83 noise units); share of cells in colonies 0.031 → 0.068 (15.8 noise units); plants standing (share of capacity) 0.061 → 0.144 (6.9 noise units); genes pinned at a limit 6 → 2.75 (-4 noise units)
- **kill-cooldown-up**: deaths per animal per 1,000 ticks 1.532 → 2.983 (3.6 noise units); share of deaths by starving 0.668 → 0.447 (-6.4 noise units); harmful mutations per animal 14.6 → 16.4 (4.7 noise units); average diet gene 0.042 → 0.079 (7.6 noise units); meat in the diet 0.04 → 0.085 (6.7 noise units); kills per 1,000 ticks 510 → 1,277 (6.9 noise units); feeding levels 1.035 → 1.616 (58.8 noise units); share of cells in colonies 0.031 → 0.049 (7.6 noise units); plants standing (share of capacity) 0.061 → 0.101 (3.4 noise units)
- **brain-vision-range-up**: deaths per animal per 1,000 ticks 1.532 → 3.026 (3.7 noise units); share of deaths by starving 0.668 → 0.437 (-6.8 noise units); share hungry 0.147 → 0.128 (-10 noise units); harmful mutations per animal 14.6 → 16.2 (4.2 noise units); average diet gene 0.042 → 0.084 (8.5 noise units); meat in the diet 0.04 → 0.091 (7.7 noise units); kills per 1,000 ticks 510 → 1,335 (7.4 noise units); feeding levels 1.035 → 1.604 (57.5 noise units); share of cells in colonies 0.031 → 0.044 (5.5 noise units); plants standing (share of capacity) 0.061 → 0.102 (3.5 noise units)
- **brain-every-up**: share of cells in colonies 0.031 → 0.045 (6 noise units)
- **brain-turn-max-down**: share of costs from harmful mutations 0.19 → 0.216 (3.2 noise units); share of cells in colonies 0.031 → 0.056 (10.7 noise units)
- **brain-turn-max-up**: harmful mutations per animal 14.6 → 16.1 (3.8 noise units); average diet gene 0.042 → 0.067 (5.2 noise units); feeding levels 1.035 → 1.28 (24.7 noise units)
- **brain-turn-noise-down**: harmful mutations per animal 14.6 → 16.6 (5.2 noise units)
- **brain-turn-noise-up**: share of cells in colonies 0.031 → 0.042 (4.6 noise units)
- **brain-still-eat-bonus-up**: share hungry 0.147 → 0.134 (-6.7 noise units)
- **brain-weight-mutation-prob-down**: share of cells in colonies 0.031 → 0.041 (4.4 noise units)
- **brain-weight-mutation-prob-up**: share hungry 0.147 → 0.141 (-3.3 noise units); share of costs from harmful mutations 0.19 → 0.234 (5.3 noise units); harmful mutations per animal 14.6 → 16.5 (4.9 noise units); average diet gene 0.042 → 0.086 (9.1 noise units); share of cells in colonies 0.031 → 0.049 (7.7 noise units)
- **brain-weight-mutation-std-up**: share of cells in colonies 0.031 → 0.046 (6.7 noise units)
- **brain-weight-zero-prob-down**: harmful mutations per animal 14.6 → 15.9 (3.4 noise units)
- **brain-add-connection-prob-up**: share hungry 0.147 → 0.139 (-4.1 noise units); share of cells in colonies 0.031 → 0.038 (3.1 noise units)
- **brain-add-node-prob-down**: deaths per animal per 1,000 ticks 1.532 → 3.994 (6.2 noise units); share of deaths by starving 0.668 → 0.36 (-9 noise units); cost per animal per tick 0.053 → 0.109 (4.6 noise units); harmful mutations per animal 14.6 → 17.1 (6.3 noise units); average diet gene 0.042 → 0.119 (15.8 noise units); meat in the diet 0.04 → 0.107 (10.1 noise units); kills per 1,000 ticks 510 → 1,717 (10.9 noise units); feeding levels 1.035 → 1.723 (69.5 noise units); share of cells in colonies 0.031 → 0.053 (9.5 noise units); plants standing (share of capacity) 0.061 → 0.122 (5.1 noise units); genes pinned at a limit 6 → 2.5 (-4.3 noise units)
- **brain-remove-connection-prob-down**: share of deaths by starving 0.668 → 0.491 (-5.2 noise units); share hungry 0.147 → 0.135 (-6.3 noise units); harmful mutations per animal 14.6 → 16.1 (3.8 noise units); average diet gene 0.042 → 0.074 (6.6 noise units); meat in the diet 0.04 → 0.078 (5.7 noise units); kills per 1,000 ticks 510 → 1,152 (5.8 noise units); share of cells in colonies 0.031 → 0.045 (6.1 noise units)
- **brain-remove-node-prob-down**: feeding levels 1.035 → 1.493 (46.3 noise units)
- **brain-remove-node-prob-up**: deaths per animal per 1,000 ticks 1.532 → 2.997 (3.7 noise units); share of deaths by starving 0.668 → 0.438 (-6.7 noise units); harmful mutations per animal 14.6 → 16.3 (4.4 noise units); meat in the diet 0.04 → 0.085 (6.6 noise units); kills per 1,000 ticks 510 → 1,252 (6.7 noise units); plants standing (share of capacity) 0.061 → 0.106 (3.8 noise units); genes pinned at a limit 6 → 3.5 (-3.1 noise units)
- **chem-stress-hunger-down**: harmful mutations per animal 14.6 → 16.1 (3.8 noise units); share of cells in colonies 0.031 → 0.045 (5.8 noise units)
- **chem-hunger-below-up**: meat in the diet 0.04 → 0.082 (6.3 noise units); share of cells in colonies 0.031 → 0.047 (6.7 noise units)
- **chem-calm-rate-down**: share hungry 0.147 → 0.14 (-3.5 noise units); share of cells in colonies 0.031 → 0.041 (4.2 noise units)
- **chem-calm-rate-up**: deaths per animal per 1,000 ticks 1.532 → 3.743 (5.5 noise units); share of deaths by starving 0.668 → 0.379 (-8.4 noise units); share hungry 0.147 → 0.125 (-11.6 noise units); cost per animal per tick 0.053 → 0.102 (4 noise units); harmful mutations per animal 14.6 → 16.8 (5.7 noise units); average diet gene 0.042 → 0.102 (12.3 noise units); meat in the diet 0.04 → 0.101 (9.1 noise units); kills per 1,000 ticks 510 → 1,546 (9.4 noise units); feeding levels 1.035 → 1.75 (72.3 noise units); share of cells in colonies 0.031 → 0.055 (10.2 noise units); plants standing (share of capacity) 0.061 → 0.123 (5.2 noise units)
- **chem-calm-saving-up**: share of costs from harmful mutations 0.19 → 0.231 (5 noise units); genes pinned at a limit 6 → 3.25 (-3.4 noise units)
- **chem-calm-slow-down**: feeding levels 1.035 → 1.493 (46.3 noise units)
- **brain-cost-per-connection-down**: share hungry 0.147 → 0.13 (-8.7 noise units); harmful mutations per animal 14.6 → 15.9 (3.3 noise units); average diet gene 0.042 → 0.059 (3.5 noise units)
- **brain-cost-per-connection-up**: deaths per animal per 1,000 ticks 1.532 → 3.884 (5.9 noise units); share of deaths by starving 0.668 → 0.432 (-6.9 noise units); cost per animal per tick 0.053 → 0.097 (3.7 noise units); harmful mutations per animal 14.6 → 17.1 (6.4 noise units); meat in the diet 0.04 → 0.101 (9.1 noise units); kills per 1,000 ticks 510 → 1,519 (9.1 noise units); share of cells in colonies 0.031 → 0.051 (8.8 noise units); plants standing (share of capacity) 0.061 → 0.125 (5.4 noise units); genes pinned at a limit 6 → 3.25 (-3.4 noise units)
- **terrain-scale-down**: deaths per animal per 1,000 ticks 1.532 → 3.624 (5.2 noise units); share of deaths by starving 0.668 → 0.391 (-8.1 noise units); share hungry 0.147 → 0.121 (-13.5 noise units); harmful mutations per animal 14.6 → 17.2 (6.6 noise units); meat in the diet 0.04 → 0.098 (8.6 noise units); kills per 1,000 ticks 510 → 1,486 (8.8 noise units); feeding levels 1.035 → 1.671 (64.3 noise units); share of cells in colonies 0.031 → 0.058 (11.6 noise units)
- **terrain-water-fraction-up**: population 1,022 → 483 (-4 noise units); deaths per animal per 1,000 ticks 1.532 → 3.35 (4.5 noise units); share of deaths by starving 0.668 → 0.454 (-6.2 noise units); cost per animal per tick 0.053 → 0.089 (3 noise units); harmful mutations per animal 14.6 → 16.9 (6 noise units); average diet gene 0.042 → 0.09 (9.8 noise units); feeding levels 1.035 → 1.594 (56.5 noise units); share of cells in colonies 0.031 → 0.052 (9 noise units); plants standing (share of capacity) 0.061 → 0.153 (7.7 noise units); genes pinned at a limit 6 → 3 (-3.7 noise units)
- **terrain-mountain-fraction-up**: feeding levels 1.035 → 1.698 (67 noise units)
- **terrain-desert-fraction-down**: deaths per animal per 1,000 ticks 1.532 → 4.024 (6.2 noise units); share of deaths by starving 0.668 → 0.33 (-9.9 noise units); cost per animal per tick 0.053 → 0.114 (5.1 noise units); harmful mutations per animal 14.6 → 17.1 (6.5 noise units); average diet gene 0.042 → 0.109 (13.8 noise units); meat in the diet 0.04 → 0.106 (9.9 noise units); kills per 1,000 ticks 510 → 1,960 (13.1 noise units); feeding levels 1.035 → 1.797 (77 noise units); share of cells in colonies 0.031 → 0.06 (12.4 noise units); plants standing (share of capacity) 0.061 → 0.123 (5.2 noise units); genes pinned at a limit 6 → 2.75 (-4 noise units)
- **terrain-growth-desert-down**: share of deaths by starving 0.668 → 0.365 (-8.8 noise units); share hungry 0.147 → 0.121 (-13.3 noise units); harmful mutations per animal 14.6 → 16.9 (5.9 noise units); genes pinned at a limit 6 → 3.5 (-3.1 noise units)
- **terrain-growth-desert-up**: harmful mutations per animal 14.6 → 16.3 (4.3 noise units); share of cells in colonies 0.031 → 0.048 (7.2 noise units)
- **terrain-move-desert-up**: harmful mutations per animal 14.6 → 15.9 (3.5 noise units)
- **terrain-move-mountain-up**: share hungry 0.147 → 0.127 (-10.4 noise units); genes pinned at a limit 6 → 3.5 (-3.1 noise units)
- **base-temperature-down**: population 1,022 → 379 (-4.8 noise units); share sick 0.233 → 0.073 (-4.1 noise units)
- **latitude-cooling-up**: population 1,022 → 526 (-3.7 noise units); plants standing (share of capacity) 0.061 → 0.137 (6.4 noise units); worn ground 0.003 → 0.074 (23.8 noise units)
- **mountain-cooling-down**: share of deaths by starving 0.668 → 0.422 (-7.2 noise units); harmful mutations per animal 14.6 → 16.3 (4.3 noise units); average diet gene 0.042 → 0.081 (8 noise units); meat in the diet 0.04 → 0.09 (7.4 noise units); kills per 1,000 ticks 510 → 1,373 (7.8 noise units); feeding levels 1.035 → 1.639 (61 noise units); share of cells in colonies 0.031 → 0.044 (5.7 noise units)
- **mountain-cooling-up**: deaths per animal per 1,000 ticks 1.532 → 3.132 (4 noise units); share of deaths by starving 0.668 → 0.392 (-8.1 noise units); share hungry 0.147 → 0.117 (-15.6 noise units); cost per animal per tick 0.053 → 0.097 (3.7 noise units); harmful mutations per animal 14.6 → 16.5 (4.8 noise units); average diet gene 0.042 → 0.093 (10.5 noise units); meat in the diet 0.04 → 0.093 (7.8 noise units); kills per 1,000 ticks 510 → 1,334 (7.4 noise units); feeding levels 1.035 → 1.45 (42 noise units); plants standing (share of capacity) 0.061 → 0.122 (5.1 noise units)
- **plant-temp-optimum-up**: share of costs from harmful mutations 0.19 → 0.221 (3.7 noise units)
- **plant-temp-tolerance-down**: population 1,022 → 468 (-4.2 noise units); deaths per animal per 1,000 ticks 1.532 → 3.213 (4.2 noise units); share of deaths by starving 0.668 → 0.411 (-7.5 noise units); share of costs from harmful mutations 0.19 → 0.238 (5.8 noise units); harmful mutations per animal 14.6 → 16.5 (4.8 noise units); meat in the diet 0.04 → 0.091 (7.7 noise units); plants standing (share of capacity) 0.061 → 0.14 (6.5 noise units)
- **latitude-light-up**: harmful mutations per animal 14.6 → 16.1 (3.9 noise units)
- **day-length-up**: share hungry 0.147 → 0.135 (-6.2 noise units); harmful mutations per animal 14.6 → 16.5 (4.8 noise units)
- **day-night-depth-down**: harmful mutations per animal 14.6 → 16.4 (4.6 noise units); meat in the diet 0.04 → 0.09 (7.4 noise units); feeding levels 1.035 → 1.522 (49.3 noise units)
- **day-night-depth-up**: share of costs from harmful mutations 0.19 → 0.234 (5.3 noise units); share of cells in colonies 0.031 → 0.046 (6.3 noise units)
- **year-length-down**: feeding levels 1.035 → 1.005 (-3 noise units)
- **season-growth-swing-up**: harmful mutations per animal 14.6 → 16.2 (4.1 noise units)
- **season-temp-swing-up**: harmful mutations per animal 14.6 → 16.6 (5.2 noise units); plants standing (share of capacity) 0.061 → 0.124 (5.3 noise units)
- **climate-drift-period-down**: share of cells in colonies 0.031 → 0.046 (6.3 noise units)
- **climate-drift-amplitude-down**: share of deaths by starving 0.668 → 0.53 (-4 noise units); kills per 1,000 ticks 510 → 849 (3.1 noise units)
- **climate-drift-amplitude-up**: share of cells in colonies 0.031 → 0.048 (7.4 noise units)
- **thermal-cost-coeff-up**: share hungry 0.147 → 0.125 (-11.2 noise units)
- **thermal-tolerance-up**: share of costs from harmful mutations 0.19 → 0.215 (3 noise units)
- **weather-amplitude-down**: deaths per animal per 1,000 ticks 1.532 → 3.882 (5.9 noise units); share of deaths by starving 0.668 → 0.43 (-7 noise units); cost per animal per tick 0.053 → 0.115 (5.1 noise units); harmful mutations per animal 14.6 → 16.7 (5.3 noise units); average diet gene 0.042 → 0.102 (12.4 noise units); meat in the diet 0.04 → 0.091 (7.6 noise units); kills per 1,000 ticks 510 → 1,459 (8.6 noise units); feeding levels 1.035 → 1.599 (57 noise units); share of cells in colonies 0.031 → 0.048 (7.3 noise units); plants standing (share of capacity) 0.061 → 0.115 (4.5 noise units); genes pinned at a limit 6 → 3.25 (-3.4 noise units)
- **weather-amplitude-up**: deaths per animal per 1,000 ticks 1.532 → 4.125 (6.5 noise units); share of deaths by starving 0.668 → 0.321 (-10.1 noise units); share hungry 0.147 → 0.116 (-16 noise units); cost per animal per tick 0.053 → 0.115 (5.1 noise units); harmful mutations per animal 14.6 → 17.2 (6.7 noise units); average diet gene 0.042 → 0.112 (14.3 noise units); meat in the diet 0.04 → 0.111 (10.6 noise units); kills per 1,000 ticks 510 → 1,800 (11.6 noise units); feeding levels 1.035 → 1.728 (70 noise units); share of cells in colonies 0.031 → 0.056 (10.6 noise units); plants standing (share of capacity) 0.061 → 0.134 (6.1 noise units); genes pinned at a limit 6 → 2.5 (-4.3 noise units)
- **weather-scale-up**: cost per animal per tick 0.053 → 0.093 (3.3 noise units)
- **year-variability-up**: share of cells in colonies 0.031 → 0.039 (3.6 noise units)
- **torpor-below-growth-down**: share of deaths by starving 0.668 → 0.38 (-8.4 noise units); share hungry 0.147 → 0.117 (-15.7 noise units); harmful mutations per animal 14.6 → 16.6 (5.2 noise units); kills per 1,000 ticks 510 → 1,524 (9.2 noise units); share of cells in colonies 0.031 → 0.048 (7.5 noise units); plants standing (share of capacity) 0.061 → 0.111 (4.2 noise units); genes pinned at a limit 6 → 3.25 (-3.4 noise units)
- **torpor-below-growth-up**: share of costs from harmful mutations 0.19 → 0.264 (8.9 noise units); share of cells in colonies 0.031 → 0.039 (3.2 noise units)
- **torpor-upkeep-down**: harmful mutations per animal 14.6 → 16.1 (4 noise units)
- **torpor-sleep-at-up**: deaths per animal per 1,000 ticks 1.532 → 3.781 (5.6 noise units); share of deaths by starving 0.668 → 0.406 (-7.7 noise units); cost per animal per tick 0.053 → 0.105 (4.3 noise units); harmful mutations per animal 14.6 → 16.8 (5.7 noise units); average diet gene 0.042 → 0.106 (13.2 noise units); kills per 1,000 ticks 510 → 1,619 (10 noise units); feeding levels 1.035 → 1.757 (73 noise units); share of cells in colonies 0.031 → 0.052 (9.2 noise units); plants standing (share of capacity) 0.061 → 0.13 (5.7 noise units); genes pinned at a limit 6 → 3.25 (-3.4 noise units)
- **plant-types-down**: population 1,022 → 546 (-3.6 noise units); share sick 0.233 → 0.079 (-4 noise units); plants standing (share of capacity) 0.061 → 0.389 (27.3 noise units)
- **plant-type-scale-down**: share of costs from harmful mutations 0.19 → 0.218 (3.3 noise units); share of cells in colonies 0.031 → 0.04 (3.7 noise units)
- **plant-type-temp-spread-down**: share of deaths by starving 0.668 → 0.464 (-6 noise units); harmful mutations per animal 14.6 → 16.3 (4.3 noise units); average diet gene 0.042 → 0.075 (6.7 noise units); plants standing (share of capacity) 0.061 → 0.1 (3.2 noise units)
- **plant-type-temp-spread-up**: share of deaths by starving 0.668 → 0.481 (-5.5 noise units); harmful mutations per animal 14.6 → 16 (3.5 noise units)
- **share-above-down**: share of costs from harmful mutations 0.19 → 0.227 (4.5 noise units); harmful mutations per animal 14.6 → 16.8 (5.8 noise units); average diet gene 0.042 → 0.102 (12.4 noise units); meat in the diet 0.04 → 0.091 (7.6 noise units)
- **share-accept-below-down**: share of cells in colonies 0.031 → 0.05 (8.2 noise units)
- **share-accept-below-up**: share of deaths by starving 0.668 → 0.465 (-5.9 noise units); share hungry 0.147 → 0.132 (-7.7 noise units); harmful mutations per animal 14.6 → 16.2 (4.2 noise units); meat in the diet 0.04 → 0.081 (6.1 noise units); kills per 1,000 ticks 510 → 1,268 (6.8 noise units); share of cells in colonies 0.031 → 0.044 (5.7 noise units); plants standing (share of capacity) 0.061 → 0.099 (3.2 noise units); genes pinned at a limit 6 → 3.5 (-3.1 noise units)
- **share-efficiency-down**: share hungry 0.147 → 0.133 (-7.3 noise units)
- **mutation-load-rate-down**: share of deaths by starving 0.668 → 0.394 (-8 noise units); share hungry 0.147 → 0.122 (-13 noise units); share of costs from harmful mutations 0.19 → 0.12 (-8.5 noise units); harmful mutations per animal 14.6 → 8.376 (-15.7 noise units); meat in the diet 0.04 → 0.105 (9.6 noise units); kills per 1,000 ticks 510 → 1,478 (8.7 noise units); feeding levels 1.035 → 1.723 (69.5 noise units)
- **mutation-load-rate-up**: share of costs from harmful mutations 0.19 → 0.336 (17.7 noise units); harmful mutations per animal 14.6 → 32.6 (45.7 noise units)
- **mutation-load-mend-down**: share of costs from harmful mutations 0.19 → 0.329 (16.9 noise units); harmful mutations per animal 14.6 → 29.8 (38.4 noise units)
- **mutation-load-mend-up**: share of costs from harmful mutations 0.19 → 0.128 (-7.6 noise units); harmful mutations per animal 14.6 → 8.674 (-14.9 noise units)
- **mutation-load-cost-down**: share of deaths by starving 0.668 → 0.357 (-9.1 noise units); share of costs from harmful mutations 0.19 → 0.127 (-7.7 noise units); harmful mutations per animal 14.6 → 17.9 (8.5 noise units); meat in the diet 0.04 → 0.11 (10.4 noise units); feeding levels 1.035 → 1.77 (74.3 noise units); genes pinned at a limit 6 → 3.25 (-3.4 noise units)
- **mutation-load-cost-up**: share of costs from harmful mutations 0.19 → 0.27 (9.7 noise units); harmful mutations per animal 14.6 → 12.3 (-5.8 noise units); feeding levels 1.035 → 1.002 (-3.3 noise units)
- **luck-spread-up**: share of cells in colonies 0.031 → 0.05 (8 noise units)
- **luck-limit-down**: share of cells in colonies 0.031 → 0.044 (5.6 noise units)
- **erosion-rate-up**: harmful mutations per animal 14.6 → 16.1 (4 noise units); share of cells in colonies 0.031 → 0.046 (6.5 noise units); genes pinned at a limit 6 → 3.5 (-3.1 noise units)
- **erosion-recover-above-down**: share of cells in colonies 0.031 → 0.043 (5.1 noise units)
- **erosion-recovery-down**: harmful mutations per animal 14.6 → 16.1 (3.8 noise units)
- **erosion-min-up**: share hungry 0.147 → 0.139 (-4 noise units)
- **foul-decay-up**: harmful mutations per animal 14.6 → 15.9 (3.3 noise units); average diet gene 0.042 → 0.077 (7.1 noise units); meat in the diet 0.04 → 0.08 (6 noise units); kills per 1,000 ticks 510 → 1,125 (5.6 noise units); share of cells in colonies 0.031 → 0.045 (5.9 noise units)
- **foul-free-up**: share of cells in colonies 0.031 → 0.04 (3.9 noise units)
- **foul-growth-effect-down**: harmful mutations per animal 14.6 → 16.3 (4.4 noise units); feeding levels 1.035 → 1.686 (65.8 noise units); share of cells in colonies 0.031 → 0.052 (8.9 noise units)
- **overgraze-damage-down**: meat in the diet 0.04 → 0.066 (3.9 noise units); share of cells in colonies 0.031 → 0.04 (3.9 noise units)
- **overgraze-heal-up**: share of cells in colonies 0.031 → 0.047 (6.8 noise units)
- **plant-quality-half-up**: population 1,022 → 547 (-3.6 noise units); deaths per animal per 1,000 ticks 1.532 → 4.748 (8 noise units); share of deaths by starving 0.668 → 0.283 (-11.2 noise units); share hungry 0.147 → 0.095 (-26.9 noise units); cost per animal per tick 0.053 → 0.14 (7.2 noise units); harmful mutations per animal 14.6 → 17.9 (8.5 noise units); average diet gene 0.042 → 0.186 (29.5 noise units); meat in the diet 0.04 → 0.143 (15.3 noise units); kills per 1,000 ticks 510 → 1,844 (12.1 noise units); feeding levels 1.035 → 1.953 (92.8 noise units); share of cells in colonies 0.031 → 0.059 (12 noise units); plants standing (share of capacity) 0.061 → 0.186 (10.4 noise units); genes pinned at a limit 6 → 2.5 (-4.3 noise units)
- **plant-quality-max-down**: population 1,022 → 471 (-4.1 noise units); deaths per animal per 1,000 ticks 1.532 → 4.433 (7.3 noise units); share of deaths by starving 0.668 → 0.271 (-11.6 noise units); share hungry 0.147 → 0.081 (-34.5 noise units); cost per animal per tick 0.053 → 0.161 (9 noise units); harmful mutations per animal 14.6 → 17.8 (8.2 noise units); average diet gene 0.042 → 0.202 (33 noise units); meat in the diet 0.04 → 0.14 (15 noise units); kills per 1,000 ticks 510 → 1,386 (7.9 noise units); feeding levels 1.035 → 2 (97.5 noise units); share of cells in colonies 0.031 → 0.058 (11.6 noise units); plants standing (share of capacity) 0.061 → 0.252 (15.9 noise units); genes pinned at a limit 6 → 2 (-4.9 noise units)
- **plant-quality-max-up**: share hungry 0.147 → 0.175 (14.8 noise units)
- **plant-assimilation-down**: population 1,022 → 494 (-4 noise units); deaths per animal per 1,000 ticks 1.532 → 4.656 (7.8 noise units); share of deaths by starving 0.668 → 0.262 (-11.8 noise units); share hungry 0.147 → 0.08 (-34.6 noise units); cost per animal per tick 0.053 → 0.153 (8.3 noise units); harmful mutations per animal 14.6 → 18 (8.8 noise units); average diet gene 0.042 → 0.196 (31.6 noise units); meat in the diet 0.04 → 0.154 (17 noise units); kills per 1,000 ticks 510 → 1,695 (10.7 noise units); feeding levels 1.035 → 2 (97.5 noise units); share of cells in colonies 0.031 → 0.063 (13.8 noise units); plants standing (share of capacity) 0.061 → 0.214 (12.7 noise units); genes pinned at a limit 6 → 2 (-4.9 noise units)
- **nutrient-turnover-up**: share hungry 0.147 → 0.123 (-12.3 noise units)
- **nutrient-store-cap-down**: harmful mutations per animal 14.6 → 16.7 (5.5 noise units); meat in the diet 0.04 → 0.088 (7.2 noise units); feeding levels 1.035 → 1.644 (61.5 noise units)
- **deficiency-below-down**: share of deaths by starving 0.668 → 0.396 (-7.9 noise units); share of cells in colonies 0.031 → 0.054 (9.8 noise units)
- **founder-nutrient-down**: share of deaths by starving 0.668 → 0.5 (-4.9 noise units); feeding levels 1.035 → 1.604 (57.5 noise units); plants standing (share of capacity) 0.061 → 0.097 (3 noise units)
- **founder-nutrient-up**: share of deaths by starving 0.668 → 0.437 (-6.8 noise units); harmful mutations per animal 14.6 → 16.3 (4.3 noise units); meat in the diet 0.04 → 0.086 (6.9 noise units); plants standing (share of capacity) 0.061 → 0.103 (3.5 noise units)
- **ev-storm-radius-min-up**: share of cells in colonies 0.031 → 0.039 (3.3 noise units)
- **ev-storm-radius-max-down**: feeding levels 1.035 → 1.203 (17 noise units)
- **ev-storm-length-min-up**: feeding levels 1.035 → 1.213 (18 noise units)
- **ev-storm-soil-share-down**: feeding levels 1.035 → 1.005 (-3 noise units)
- **aging-coeff-up**: share of cells in colonies 0.031 → 0.043 (4.9 noise units)
- **kin-distance-up**: deaths per animal per 1,000 ticks 1.532 → 3.661 (5.3 noise units); share of deaths by starving 0.668 → 0.331 (-9.8 noise units); share hungry 0.147 → 0.119 (-14.7 noise units); cost per animal per tick 0.053 → 0.109 (4.6 noise units); harmful mutations per animal 14.6 → 17 (6.3 noise units); average diet gene 0.042 → 0.138 (19.6 noise units); meat in the diet 0.04 → 0.111 (10.6 noise units); kills per 1,000 ticks 510 → 1,629 (10.1 noise units); feeding levels 1.035 → 1.933 (90.8 noise units); share of cells in colonies 0.031 → 0.057 (11.1 noise units); plants standing (share of capacity) 0.061 → 0.129 (5.6 noise units)
- **meat-gorge-up**: share of deaths by starving 0.668 → 0.369 (-8.8 noise units); share hungry 0.147 → 0.12 (-13.8 noise units); harmful mutations per animal 14.6 → 17.2 (6.6 noise units); share of cells in colonies 0.031 → 0.056 (10.9 noise units); genes pinned at a limit 6 → 2.5 (-4.3 noise units)
- **tolerance-cost-coeff-down**: deaths per animal per 1,000 ticks 1.532 → 3.161 (4.1 noise units); share of deaths by starving 0.668 → 0.382 (-8.4 noise units); share hungry 0.147 → 0.124 (-12.1 noise units); harmful mutations per animal 14.6 → 16.7 (5.4 noise units); meat in the diet 0.04 → 0.094 (8 noise units); kills per 1,000 ticks 510 → 1,468 (8.7 noise units); feeding levels 1.035 → 1.673 (64.5 noise units); share of cells in colonies 0.031 → 0.052 (8.8 noise units); plants standing (share of capacity) 0.061 → 0.114 (4.4 noise units)
- **tolerance-cost-coeff-up**: share of deaths by starving 0.668 → 0.414 (-7.4 noise units); share hungry 0.147 → 0.127 (-10.1 noise units); meat in the diet 0.04 → 0.096 (8.4 noise units)
- **herd-cap-down**: genes pinned at a limit 6 → 3 (-3.7 noise units)
- **disease-transmission-up**: share of cells in colonies 0.031 → 0.04 (4 noise units)
- **disease-contact-range-down**: share of deaths by starving 0.668 → 0.464 (-6 noise units); share hungry 0.147 → 0.13 (-8.5 noise units); share of costs from harmful mutations 0.19 → 0.238 (5.8 noise units); harmful mutations per animal 14.6 → 16.3 (4.3 noise units); share sick 0.233 → 0.02 (-5.5 noise units)
- **disease-duration-down**: share of costs from harmful mutations 0.19 → 0.236 (5.6 noise units); harmful mutations per animal 14.6 → 16.1 (3.8 noise units); share of cells in colonies 0.031 → 0.042 (4.6 noise units); share sick 0.233 → 0.015 (-5.6 noise units)
- **disease-duration-up**: share sick 0.233 → 0.489 (6.6 noise units)
- **disease-cost-down**: share of costs from harmful mutations 0.19 → 0.22 (3.6 noise units)
- **camo-scale-down**: feeding levels 1.035 → 1.681 (65.3 noise units)
- **camo-scale-up**: deaths per animal per 1,000 ticks 1.532 → 3.524 (5 noise units); share of deaths by starving 0.668 → 0.391 (-8.1 noise units); cost per animal per tick 0.053 → 0.093 (3.3 noise units); harmful mutations per animal 14.6 → 16.8 (5.7 noise units); average diet gene 0.042 → 0.109 (13.7 noise units); meat in the diet 0.04 → 0.105 (9.8 noise units); kills per 1,000 ticks 510 → 1,611 (9.9 noise units); feeding levels 1.035 → 1.79 (76.3 noise units); share of cells in colonies 0.031 → 0.048 (7.2 noise units); plants standing (share of capacity) 0.061 → 0.116 (4.6 noise units); genes pinned at a limit 6 → 3.5 (-3.1 noise units)
- **camo-learning-up**: share of cells in colonies 0.031 → 0.048 (7.4 noise units); plants standing (share of capacity) 0.061 → 0.114 (4.4 noise units)
- **bond-rest-length-down**: share of deaths by starving 0.668 → 0.402 (-7.8 noise units); share hungry 0.147 → 0.129 (-9.4 noise units); meat in the diet 0.04 → 0.096 (8.4 noise units)
- **bond-stiffness-down**: share hungry 0.147 → 0.129 (-9.3 noise units)
- **bond-align-down**: share hungry 0.147 → 0.12 (-14 noise units)
- **initial-bond-down**: deaths per animal per 1,000 ticks 1.532 → 3.214 (4.2 noise units); cost per animal per tick 0.053 → 0.096 (3.5 noise units); average diet gene 0.042 → 0.111 (14.2 noise units); kills per 1,000 ticks 510 → 1,540 (9.3 noise units); feeding levels 1.035 → 1.844 (81.8 noise units); share of cells in colonies 0.031 → 0.049 (7.7 noise units); plants standing (share of capacity) 0.061 → 0.124 (5.2 noise units); genes pinned at a limit 6 → 3.25 (-3.4 noise units)
- **type-feeder-bite-down**: share hungry 0.147 → 0.139 (-4.3 noise units); harmful mutations per animal 14.6 → 15.9 (3.3 noise units)
- **type-feeder-bite-up**: share of deaths by starving 0.668 → 0.43 (-7 noise units); cost per animal per tick 0.053 → 0.101 (3.9 noise units); harmful mutations per animal 14.6 → 16.5 (4.9 noise units); kills per 1,000 ticks 510 → 1,295 (7.1 noise units); plants standing (share of capacity) 0.061 → 0.103 (3.5 noise units); genes pinned at a limit 6 → 3.5 (-3.1 noise units)
- **type-mover-bite-down**: share hungry 0.147 → 0.12 (-13.7 noise units); cost per animal per tick 0.053 → 0.098 (3.7 noise units); harmful mutations per animal 14.6 → 16.6 (5 noise units)
- **type-photo-speed-down**: harmful mutations per animal 14.6 → 15.9 (3.4 noise units)
- **type-armor-speed-up**: share of deaths by starving 0.668 → 0.502 (-4.9 noise units)
- **type-sensor-bite-down**: share of cells in colonies 0.031 → 0.047 (7 noise units)
- **type-sensor-speed-down**: harmful mutations per animal 14.6 → 16.6 (5.2 noise units); feeding levels 1.035 → 1.554 (52.5 noise units)
- **colony-defense-share-up**: share of deaths by starving 0.668 → 0.473 (-5.7 noise units)
- **sex-wait-limit-up**: harmful mutations per animal 14.6 → 16.3 (4.3 noise units)
- **mate-ready-fraction-down**: share of cells in colonies 0.031 → 0.043 (5.3 noise units)
- **mate-ready-fraction-up**: deaths per animal per 1,000 ticks 1.532 → 3.765 (5.6 noise units); cost per animal per tick 0.053 → 0.111 (4.8 noise units); meat in the diet 0.04 → 0.098 (8.7 noise units); kills per 1,000 ticks 510 → 1,453 (8.5 noise units); feeding levels 1.035 → 1.804 (77.8 noise units); share of cells in colonies 0.031 → 0.052 (9.1 noise units); genes pinned at a limit 6 → 3 (-3.7 noise units)
- **sex-founder-spread-down**: harmful mutations per animal 14.6 → 16 (3.6 noise units); share of cells in colonies 0.031 → 0.048 (7.1 noise units)
- **mate-range-down**: share of deaths by starving 0.668 → 0.544 (-3.6 noise units); share hungry 0.147 → 0.129 (-9.3 noise units)
- **mate-diet-limit-down**: share of cells in colonies 0.031 → 0.044 (5.4 noise units)
- **macro-mutation-std-up**: feeding levels 1.035 → 1.371 (34 noise units)
- **macro-mutation-genes-up**: share of deaths by starving 0.668 → 0.5 (-4.9 noise units); harmful mutations per animal 14.6 → 15.9 (3.3 noise units); average diet gene 0.042 → 0.067 (5.1 noise units); share of cells in colonies 0.031 → 0.045 (6.2 noise units)
- **kill-ownership-ticks-down**: share of cells in colonies 0.031 → 0.04 (3.8 noise units)
- **kill-ownership-leak-down**: harmful mutations per animal 14.6 → 16.4 (4.6 noise units)
- **repro-threshold-per-size-down**: deaths per animal per 1,000 ticks 1.532 → 4.26 (6.8 noise units); share hungry 0.147 → 0.11 (-19.1 noise units); harmful mutations per animal 14.6 → 16.2 (4.1 noise units); average diet gene 0.042 → 0.117 (15.4 noise units); meat in the diet 0.04 → 0.094 (8 noise units); kills per 1,000 ticks 510 → 1,799 (11.6 noise units); feeding levels 1.035 → 1.958 (93.3 noise units)
- **repro-threshold-per-size-up**: share of deaths by starving 0.668 → 0.38 (-8.4 noise units); cost per animal per tick 0.053 → 0.098 (3.8 noise units); harmful mutations per animal 14.6 → 16.7 (5.3 noise units); meat in the diet 0.04 → 0.089 (7.4 noise units); kills per 1,000 ticks 510 → 912 (3.6 noise units); plants standing (share of capacity) 0.061 → 0.116 (4.6 noise units)
- **offspring-energy-fraction-up**: harmful mutations per animal 14.6 → 16.3 (4.5 noise units)

### Same way both directions (55)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

- **food-regrow-per-tick**: harmful mutations per animal moves the same way both down and up (5.3 and 4.2 noise units): the control's value may sit at a peak or a valley
- **fertility-variation**: share of cells in colonies moves the same way both down and up (9 and 2.5 noise units): the control's value may sit at a peak or a valley
- **body-matter-per-size**: harmful mutations per animal moves the same way both down and up (2.5 and 9.1 noise units): the control's value may sit at a peak or a valley
- **initial-organisms**: share of cells in colonies moves the same way both down and up (4.1 and 7.7 noise units): the control's value may sit at a peak or a valley
- **sense-range-max**: share of cells in colonies moves the same way both down and up (5 and 8.5 noise units): the control's value may sit at a peak or a valley
- **metabolism-max**: population moves the same way both down and up (-2.2 and -2.1 noise units): the control's value may sit at a peak or a valley
- **metabolism-max**: genes pinned at a limit moves the same way both down and up (-2.4 and -3.4 noise units): the control's value may sit at a peak or a valley
- **lifespan-max**: harmful mutations per animal moves the same way both down and up (6.2 and 6.1 noise units): the control's value may sit at a peak or a valley
- **lifespan-max**: share of cells in colonies moves the same way both down and up (8.6 and 11.6 noise units): the control's value may sit at a peak or a valley
- **energy-per-food**: population moves the same way both down and up (-2.7 and -2.6 noise units): the control's value may sit at a peak or a valley
- **sense-cost-coeff**: feeding levels moves the same way both down and up (47 and 45 noise units): the control's value may sit at a peak or a valley
- **diet-specialization**: share of cells in colonies moves the same way both down and up (8.3 and 2.4 noise units): the control's value may sit at a peak or a valley
- **reach-base**: share of cells in colonies moves the same way both down and up (3.9 and 22.3 noise units): the control's value may sit at a peak or a valley
- **brain-weight-mutation-prob**: share of cells in colonies moves the same way both down and up (4.4 and 7.7 noise units): the control's value may sit at a peak or a valley
- **chem-calm-rate**: share hungry moves the same way both down and up (-3.5 and -11.6 noise units): the control's value may sit at a peak or a valley
- **chem-calm-rate**: share of cells in colonies moves the same way both down and up (4.2 and 10.2 noise units): the control's value may sit at a peak or a valley
- **brain-cost-per-connection**: harmful mutations per animal moves the same way both down and up (3.3 and 6.4 noise units): the control's value may sit at a peak or a valley
- **terrain-desert-fraction**: harmful mutations per animal moves the same way both down and up (6.5 and 2.4 noise units): the control's value may sit at a peak or a valley
- **terrain-growth-desert**: harmful mutations per animal moves the same way both down and up (5.9 and 4.3 noise units): the control's value may sit at a peak or a valley
- **mountain-cooling**: share of deaths by starving moves the same way both down and up (-7.2 and -8.1 noise units): the control's value may sit at a peak or a valley
- **mountain-cooling**: harmful mutations per animal moves the same way both down and up (4.3 and 4.8 noise units): the control's value may sit at a peak or a valley
- **mountain-cooling**: average diet gene moves the same way both down and up (8 and 10.5 noise units): the control's value may sit at a peak or a valley
- **mountain-cooling**: meat in the diet moves the same way both down and up (7.4 and 7.8 noise units): the control's value may sit at a peak or a valley
- **mountain-cooling**: kills per 1,000 ticks moves the same way both down and up (7.8 and 7.4 noise units): the control's value may sit at a peak or a valley
- **mountain-cooling**: feeding levels moves the same way both down and up (61 and 42 noise units): the control's value may sit at a peak or a valley
- **mountain-cooling**: plants standing (share of capacity) moves the same way both down and up (2.8 and 5.1 noise units): the control's value may sit at a peak or a valley
- **weather-amplitude**: population moves the same way both down and up (-2.6 and -2.8 noise units): the control's value may sit at a peak or a valley
- **weather-amplitude**: deaths per animal per 1,000 ticks moves the same way both down and up (5.9 and 6.5 noise units): the control's value may sit at a peak or a valley
- **weather-amplitude**: share of deaths by starving moves the same way both down and up (-7 and -10.1 noise units): the control's value may sit at a peak or a valley
- **weather-amplitude**: cost per animal per tick moves the same way both down and up (5.1 and 5.1 noise units): the control's value may sit at a peak or a valley
- **weather-amplitude**: harmful mutations per animal moves the same way both down and up (5.3 and 6.7 noise units): the control's value may sit at a peak or a valley
- **weather-amplitude**: average diet gene moves the same way both down and up (12.4 and 14.3 noise units): the control's value may sit at a peak or a valley
- **weather-amplitude**: meat in the diet moves the same way both down and up (7.6 and 10.6 noise units): the control's value may sit at a peak or a valley
- **weather-amplitude**: kills per 1,000 ticks moves the same way both down and up (8.6 and 11.6 noise units): the control's value may sit at a peak or a valley
- **weather-amplitude**: feeding levels moves the same way both down and up (57 and 70 noise units): the control's value may sit at a peak or a valley
- **weather-amplitude**: share of cells in colonies moves the same way both down and up (7.3 and 10.6 noise units): the control's value may sit at a peak or a valley
- **weather-amplitude**: plants standing (share of capacity) moves the same way both down and up (4.5 and 6.1 noise units): the control's value may sit at a peak or a valley
- **weather-amplitude**: genes pinned at a limit moves the same way both down and up (-3.4 and -4.3 noise units): the control's value may sit at a peak or a valley
- **torpor-below-growth**: share of cells in colonies moves the same way both down and up (7.5 and 3.2 noise units): the control's value may sit at a peak or a valley
- **plant-type-temp-spread**: share of deaths by starving moves the same way both down and up (-6 and -5.5 noise units): the control's value may sit at a peak or a valley
- **plant-type-temp-spread**: harmful mutations per animal moves the same way both down and up (4.3 and 3.5 noise units): the control's value may sit at a peak or a valley
- **share-accept-below**: share of cells in colonies moves the same way both down and up (8.2 and 5.7 noise units): the control's value may sit at a peak or a valley
- **deficiency-below**: share of cells in colonies moves the same way both down and up (9.8 and 2.9 noise units): the control's value may sit at a peak or a valley
- **founder-nutrient**: share of deaths by starving moves the same way both down and up (-4.9 and -6.8 noise units): the control's value may sit at a peak or a valley
- **founder-nutrient**: plants standing (share of capacity) moves the same way both down and up (3 and 3.5 noise units): the control's value may sit at a peak or a valley
- **tolerance-cost-coeff**: share of deaths by starving moves the same way both down and up (-8.4 and -7.4 noise units): the control's value may sit at a peak or a valley
- **tolerance-cost-coeff**: share hungry moves the same way both down and up (-12.1 and -10.1 noise units): the control's value may sit at a peak or a valley
- **tolerance-cost-coeff**: meat in the diet moves the same way both down and up (8 and 8.4 noise units): the control's value may sit at a peak or a valley
- **camo-scale**: feeding levels moves the same way both down and up (65.3 and 76.3 noise units): the control's value may sit at a peak or a valley
- **type-feeder-bite**: harmful mutations per animal moves the same way both down and up (3.3 and 4.9 noise units): the control's value may sit at a peak or a valley
- **mate-ready-fraction**: share of cells in colonies moves the same way both down and up (5.3 and 9.1 noise units): the control's value may sit at a peak or a valley
- **macro-mutation-genes**: share of cells in colonies moves the same way both down and up (3 and 6.2 noise units): the control's value may sit at a peak or a valley
- **repro-threshold-per-size**: harmful mutations per animal moves the same way both down and up (4.1 and 5.3 noise units): the control's value may sit at a peak or a valley
- **repro-threshold-per-size**: meat in the diet moves the same way both down and up (8 and 7.4 noise units): the control's value may sit at a peak or a valley
- **repro-threshold-per-size**: kills per 1,000 ticks moves the same way both down and up (11.6 and 3.6 noise units): the control's value may sit at a peak or a valley

### Still drifting (37)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

- **food-cap-up**: sickShare still changing by -15.6% over the last quarter (control -0%)
- **initial-nutrient-per-cell-up**: sickShare still changing by -21.9% over the last quarter (control -0%)
- **metabolism-max-up**: sickShare still changing by 13.3% over the last quarter (control -0%)
- **meta-mutation-std-up**: shannon still changing by 10.7% over the last quarter (control -5%)
- **armor-base-down**: sickShare still changing by -22% over the last quarter (control -0%)
- **brain-vision-range-up**: dietMean still changing by -38% over the last quarter (control -8%)
- **brain-vision-range-up**: sickShare still changing by -11.2% over the last quarter (control -0%)
- **brain-every-up**: shannon still changing by 12% over the last quarter (control -5%)
- **brain-remove-node-prob-up**: sickShare still changing by 16.4% over the last quarter (control -0%)
- **chem-decay-up**: colonyShare still changing by 58.8% over the last quarter (control -7%)
- **chem-reward-gain-down**: dietMean still changing by 27.7% over the last quarter (control -8%)
- **chem-stress-hit-down**: sickShare still changing by -10.6% over the last quarter (control -0%)
- **chemicals-cost-up**: shannon still changing by 11% over the last quarter (control -5%)
- **chem-stress-upkeep-down**: sickShare still changing by -16.2% over the last quarter (control -0%)
- **terrain-scale-up**: sickShare still changing by -14.4% over the last quarter (control -0%)
- **terrain-water-fraction-up**: sickShare still changing by -39.1% over the last quarter (control -0%)
- **terrain-desert-fraction-down**: dietMean still changing by -42.2% over the last quarter (control -8%)
- **terrain-growth-forest-down**: sickShare still changing by -11.1% over the last quarter (control -0%)
- **terrain-growth-mountain-down**: sickShare still changing by -16.1% over the last quarter (control -0%)
- **base-temperature-up**: wornShare still changing by 443% over the last quarter (control 185%)
- **mountain-cooling-up**: sickShare still changing by -18.9% over the last quarter (control -0%)
- **latitude-light-up**: hungryShare still changing by -15.3% over the last quarter (control -1%)
- **climate-drift-period-down**: sickShare still changing by -14.8% over the last quarter (control -0%)
- **weather-amplitude-down**: grazingMean still changing by 59.9% over the last quarter (control 14.4%)
- **torpor-below-growth-up**: sickShare still changing by -14.8% over the last quarter (control -0%)
- **plant-type-temp-spread-up**: shannon still changing by 15.1% over the last quarter (control -5%)
- **overgraze-heal-up**: grazingMean still changing by 46.5% over the last quarter (control 14.4%)
- **plant-quality-max-up**: sickShare still changing by -11.9% over the last quarter (control -0%)
- **plant-assimilation-down**: dietMean still changing by 24.4% over the last quarter (control -8%)
- **ev-storm-radius-min-up**: sickShare still changing by -12.2% over the last quarter (control -0%)
- **ev-flood-radius-max-up**: hungryShare still changing by -11.1% over the last quarter (control -1%)
- **kin-distance-up**: shannon still changing by 11.9% over the last quarter (control -5%)
- **disease-immunity-down**: sickShare still changing by -11.9% over the last quarter (control -0%)
- **disease-intro-every-down**: sickShare still changing by -13.7% over the last quarter (control -0%)
- **colony-defense-share-up**: sickShare still changing by -15.7% over the last quarter (control -0%)
- **mate-ready-fraction-down**: sickShare still changing by -16.7% over the last quarter (control -0%)
- **mate-diet-limit-down**: shannon still changing by -17.2% over the last quarter (control -5%)

### Pinned genes (221)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **world-size-down**: freed `low_senseRange`, `low_generosity`
- **food-cell-size-up**: freed `low_generosity`
- **food-cap-up**: newly pinned `low_sex`
- **food-regrow-per-tick-down**: newly pinned `low_sex`
- **initial-nutrient-per-cell-down**: freed `low_diet`, `low_attack`, `low_generosity`
- **body-matter-per-size-up**: freed `low_diet`, `low_attack`, `low_generosity`
- **body-energy-per-size-up**: freed `low_generosity`
- **meat-decay-rate-down**: newly pinned `low_sex`
- **meat-decay-rate-up**: newly pinned `low_sex`
- **initial-organisms-up**: newly pinned `low_sex`
- **initial-size-down**: newly pinned `low_sex`
- **initial-size-up**: newly pinned `low_sex`
- **initial-speed-up**: newly pinned `low_sex`
- **initial-mutation-rate-up**: newly pinned `low_sex`
- **initial-litter-up**: newly pinned `low_sex`; freed `low_generosity`
- **size-min-up**: freed `low_diet`
- **size-max-up**: newly pinned `low_sex`
- **speed-max-down**: newly pinned `low_sex`
- **speed-max-up**: newly pinned `low_sex`
- **metabolism-min-up**: newly pinned `low_sex`
- **metabolism-max-down**: newly pinned `low_sex`
- **metabolism-max-up**: newly pinned `low_sex`
- **mutation-rate-min-down**: newly pinned `low_sex`
- **attack-max-down**: newly pinned `low_metabolism`, `low_armor`
- **attack-max-up**: freed `low_diet`
- **armor-max-down**: freed `low_diet`, `low_attack`
- **thermal-max-down**: newly pinned `high_thermal`
- **lifespan-min-up**: newly pinned `low_sex`
- **lifespan-max-down**: newly pinned `low_sex`; freed `low_attack`
- **lifespan-max-up**: newly pinned `low_sex`
- **litter-max-up**: newly pinned `low_sex`
- **bite-rate-up**: freed `low_diet`
- **energy-per-food-up**: freed `low_senseRange`, `low_diet`, `low_attack`, `low_generosity`
- **basal-cost-coeff-down**: freed `low_diet`, `low_attack`
- **diet-specialization-down**: freed `low_diet`, `low_attack`, `low_generosity`
- **diet-specialization-up**: newly pinned `low_metabolism`, `low_sex`
- **attack-attempt-cost-down**: newly pinned `low_sex`
- **attack-attempt-cost-up**: newly pinned `low_metabolism`
- **armor-move-factor-up**: newly pinned `low_sex`; freed `low_senseRange`, `low_diet`, `low_attack`
- **attack-threshold-down**: newly pinned `low_sex`
- **reach-base-down**: newly pinned `low_metabolism`
- **reach-base-up**: newly pinned `low_sex`; freed `low_senseRange`, `low_diet`, `low_attack`
- **reach-per-size-down**: newly pinned `low_sex`
- **prey-max-size-ratio-down**: newly pinned `low_metabolism`, `low_armor`
- **prey-max-size-ratio-up**: newly pinned `low_sex`
- **herbivore-attack-penalty-down**: freed `low_senseRange`, `low_diet`, `low_attack`
- **herbivore-attack-penalty-up**: newly pinned `low_metabolism`
- **kill-cooldown-down**: newly pinned `low_sex`
- **kill-cooldown-up**: newly pinned `low_sex`
- **brain-vision-range-up**: newly pinned `low_sex`
- **brain-every-up**: newly pinned `low_sex`
- **brain-turn-max-down**: newly pinned `low_sex`
- **brain-turn-max-up**: newly pinned `low_sex`
- **brain-turn-noise-down**: newly pinned `low_sex`
- **brain-attack-gate-down**: newly pinned `low_sex`
- **brain-weight-mutation-prob-up**: newly pinned `low_sex`
- **brain-weight-mutation-std-up**: newly pinned `low_sex`
- **brain-weight-zero-prob-up**: newly pinned `low_sex`
- **brain-prune-below-down**: newly pinned `low_sex`
- **brain-prune-below-up**: newly pinned `low_sex`
- **brain-add-connection-prob-down**: newly pinned `low_sex`
- **brain-add-node-prob-down**: newly pinned `low_sex`; freed `low_diet`, `low_attack`
- **brain-add-node-prob-up**: newly pinned `low_sex`
- **brain-remove-node-prob-up**: newly pinned `low_sex`
- **home-memory-min-down**: newly pinned `low_sex`
- **chem-reward-gain-up**: newly pinned `low_sex`
- **chem-stress-sick-down**: newly pinned `low_sex`
- **chem-stress-sick-up**: newly pinned `low_sex`
- **chem-stress-hunger-down**: newly pinned `low_sex`
- **chem-stress-hunger-up**: newly pinned `low_sex`
- **chem-hunger-below-down**: newly pinned `low_sex`
- **chem-bond-gain-down**: newly pinned `low_sex`
- **chem-calm-rate-up**: newly pinned `low_sex`; freed `low_attack`
- **chem-stress-speed-up**: newly pinned `low_sex`
- **chem-stress-upkeep-down**: newly pinned `low_sex`
- **chem-calm-saving-down**: newly pinned `low_sex`
- **brain-base-cost-up**: newly pinned `low_sex`
- **brain-cost-per-neuron-down**: newly pinned `low_sex`
- **brain-cost-per-neuron-up**: newly pinned `low_sex`
- **brain-cost-per-connection-up**: newly pinned `low_sex`
- **terrain-scale-down**: newly pinned `low_sex`; freed `low_diet`
- **terrain-water-fraction-down**: newly pinned `low_sex`
- **terrain-mountain-fraction-down**: newly pinned `low_sex`
- **terrain-mountain-fraction-up**: newly pinned `low_sex`
- **terrain-desert-fraction-down**: freed `low_senseRange`, `low_diet`, `low_attack`
- **terrain-growth-mountain-down**: newly pinned `low_sex`
- **terrain-growth-mountain-up**: newly pinned `low_sex`; freed `low_attack`
- **terrain-move-forest-up**: newly pinned `low_sex`
- **terrain-move-desert-up**: newly pinned `low_sex`
- **terrain-move-mountain-down**: newly pinned `low_sex`
- **latitude-cooling-down**: newly pinned `low_sex`
- **latitude-cooling-up**: freed `low_generosity`
- **mountain-cooling-down**: newly pinned `low_sex`
- **plant-temp-tolerance-up**: newly pinned `low_sex`
- **latitude-light-down**: newly pinned `low_sex`
- **latitude-light-up**: newly pinned `low_sex`
- **day-length-up**: newly pinned `low_sex`
- **day-night-depth-down**: newly pinned `low_sex`
- **climate-drift-period-up**: newly pinned `low_sex`
- **thermal-cost-coeff-down**: newly pinned `low_sex`, `low_stressResponse`
- **thermal-cost-coeff-up**: newly pinned `low_sex`
- **thermal-tolerance-down**: newly pinned `low_sex`
- **thermal-tolerance-up**: newly pinned `low_sex`
- **weather-amplitude-down**: newly pinned `low_sex`; freed `low_generosity`
- **weather-amplitude-up**: freed `low_diet`, `low_attack`
- **weather-drift-y-ticks-up**: newly pinned `low_sex`
- **weather-morph-period-down**: newly pinned `low_sex`
- **year-variability-up**: newly pinned `low_sex`
- **torpor-saving-up**: newly pinned `low_sex`
- **torpor-below-growth-up**: newly pinned `low_sex`
- **torpor-upkeep-down**: newly pinned `low_sex`
- **torpor-upkeep-up**: newly pinned `low_sex`
- **torpor-sleep-at-down**: newly pinned `low_sex`
- **torpor-sleep-at-up**: newly pinned `low_sex`
- **plant-types-down**: newly pinned `low_palate`
- **plant-type-scale-down**: newly pinned `low_sex`
- **plant-type-scale-up**: newly pinned `low_sex`
- **plant-type-temp-spread-down**: newly pinned `low_sex`
- **plant-type-temp-spread-up**: newly pinned `low_sex`
- **founder-spread-down**: newly pinned `low_sex`
- **share-above-down**: newly pinned `low_sex`
- **share-above-up**: freed `low_generosity`
- **share-accept-below-down**: newly pinned `low_sex`
- **share-range-down**: newly pinned `low_sex`
- **share-range-up**: newly pinned `low_sex`
- **share-recipients-down**: newly pinned `low_sex`
- **share-recipients-up**: newly pinned `low_sex`
- **mutation-load-rate-down**: newly pinned `low_sex`
- **mutation-load-rate-up**: newly pinned `low_sex`
- **mutation-load-mend-up**: newly pinned `low_sex`
- **luck-spread-down**: newly pinned `low_sex`
- **luck-spread-up**: newly pinned `low_sex`
- **luck-limit-down**: newly pinned `low_sex`
- **erosion-rate-up**: freed `low_generosity`
- **erosion-below-down**: newly pinned `low_sex`
- **erosion-below-up**: newly pinned `low_sex`
- **erosion-recover-above-down**: newly pinned `low_sex`
- **erosion-recover-above-up**: newly pinned `low_sex`
- **erosion-recovery-up**: newly pinned `low_sex`
- **foul-decay-down**: newly pinned `low_sex`
- **foul-decay-up**: newly pinned `low_sex`
- **foul-disease-effect-down**: newly pinned `low_sex`
- **overgraze-damage-up**: newly pinned `low_sex`
- **overgraze-below-up**: newly pinned `low_sex`
- **overgraze-heal-up**: newly pinned `low_sex`
- **overgraze-penalty-down**: newly pinned `low_sex`
- **plant-quality-half-up**: newly pinned `low_sex`; freed `low_senseRange`, `low_diet`, `low_attack`
- **plant-quality-max-down**: freed `low_senseRange`, `low_diet`, `low_attack`, `low_generosity`
- **plant-assimilation-down**: freed `low_diet`, `low_attack`, `low_generosity`
- **meat-assimilation-down**: newly pinned `low_sex`
- **meat-assimilation-up**: newly pinned `low_sex`
- **nutrient-store-cap-down**: newly pinned `low_sex`
- **provision-share-down**: newly pinned `low_sex`
- **deficiency-below-down**: newly pinned `low_sex`
- **nutrient-root-uptake-down**: newly pinned `low_sex`
- **nutrient-root-uptake-up**: newly pinned `low_sex`
- **founder-nutrient-down**: newly pinned `low_sex`
- **founder-nutrient-up**: newly pinned `low_sex`
- **ev-fire-radius-min-up**: newly pinned `low_sex`
- **ev-fire-radius-max-up**: newly pinned `low_sex`
- **ev-fire-spread-min-up**: newly pinned `low_sex`
- **ev-fire-spread-max-down**: newly pinned `low_sex`
- **ev-fire-dry-weight-up**: newly pinned `low_sex`
- **ev-storm-length-max-down**: newly pinned `low_sex`
- **ev-flood-radius-max-down**: newly pinned `low_sex`
- **ev-volcano-radius-min-up**: newly pinned `low_sex`
- **ev-volcano-cooling-min-down**: newly pinned `low_sex`
- **ev-volcano-length-max-down**: newly pinned `low_sex`
- **ev-volcano-boost-down**: newly pinned `low_sex`
- **ev-volcano-boost-up**: newly pinned `low_sex`
- **ev-blight-length-max-up**: newly pinned `low_sex`
- **ev-good-year-every-down**: newly pinned `low_sex`
- **ev-good-year-length-max-up**: newly pinned `low_sex`
- **aging-coeff-up**: newly pinned `low_sex`
- **aging-prime-fraction-down**: newly pinned `low_sex`
- **aging-repair-coeff-down**: newly pinned `low_sex`
- **kin-distance-down**: freed `low_generosity`
- **kin-distance-up**: freed `low_diet`, `low_attack`
- **meat-gorge-up**: freed `low_senseRange`, `low_generosity`
- **tolerance-cost-coeff-down**: newly pinned `low_sex`
- **herd-bonus-down**: newly pinned `low_sex`
- **disease-transmission-down**: newly pinned `low_sex`
- **disease-cost-down**: newly pinned `low_sex`
- **disease-intro-every-down**: newly pinned `low_sex`
- **disease-intro-every-up**: newly pinned `low_sex`
- **disease-mutation-prob-down**: newly pinned `low_sex`
- **disease-drift-down**: newly pinned `low_sex`
- **camo-scale-up**: newly pinned `low_sex`
- **camo-detect-min-down**: newly pinned `low_sex`
- **camo-glance-up**: newly pinned `low_sex`
- **camo-learning-up**: newly pinned `low_sex`
- **bond-links-max-down**: newly pinned `low_sex`
- **bond-rest-length-up**: newly pinned `low_sex`
- **bond-stiffness-down**: newly pinned `low_sex`
- **bond-stiffness-up**: newly pinned `low_sex`
- **bond-iterations-down**: newly pinned `low_sex`
- **bond-align-up**: newly pinned `low_sex`
- **type-feeder-bite-down**: newly pinned `low_sex`
- **type-feeder-bite-up**: newly pinned `low_sex`; freed `low_generosity`
- **type-feeder-speed-up**: newly pinned `low_sex`
- **type-mover-bite-down**: newly pinned `low_sex`; freed `low_generosity`
- **type-photo-gain-down**: newly pinned `low_sex`
- **type-photo-gain-up**: newly pinned `low_sex`
- **type-photo-bite-down**: newly pinned `low_sex`
- **type-photo-bite-up**: newly pinned `low_sex`
- **type-photo-speed-up**: newly pinned `low_sex`
- **type-armor-defense-down**: newly pinned `low_sex`
- **type-sensor-range-up**: newly pinned `low_sex`
- **type-sensor-speed-up**: newly pinned `low_sex`
- **sex-wait-limit-up**: newly pinned `low_sex`
- **mate-ready-fraction-down**: newly pinned `low_sex`
- **mate-ready-fraction-up**: newly pinned `low_sex`; freed `low_generosity`
- **sex-founder-spread-down**: newly pinned `low_sex`
- **mate-range-down**: newly pinned `low_sex`
- **mate-distance-down**: newly pinned `low_sex`
- **macro-mutation-std-down**: newly pinned `low_sex`
- **macro-mutation-genes-down**: newly pinned `low_sex`
- **kill-ownership-leak-down**: freed `low_generosity`
- **repro-threshold-per-size-down**: newly pinned `low_sex`; freed `low_generosity`
- **repro-threshold-per-size-up**: newly pinned `low_sex`
- **offspring-energy-fraction-down**: newly pinned `low_sex`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 1,022): world-size-up 4,080 (+22.9), world-size-down 186 (-6.3), food-cell-size-up 317 (-5.3), size-min-up 378 (-4.8), base-temperature-down 379 (-4.8), reach-base-up 395 (-4.7), body-matter-per-size-up 450 (-4.3), plant-temp-tolerance-down 468 (-4.2)

**lowest population** (control 422): world-size-up 1,741 (+6.5), base-temperature-down 52.5 (-1.8), world-size-down 92 (-1.6), food-cell-size-up 107 (-1.6)

**deaths per animal per 1,000 ticks** (control 1.532): reach-base-up 6.2 (+11.7), energy-per-food-up 5.677 (+10.4), body-matter-per-size-up 4.763 (+8.1), plant-quality-half-up 4.748 (+8), plant-assimilation-down 4.656 (+7.8), diet-specialization-down 4.566 (+7.6), plant-quality-max-down 4.433 (+7.3), repro-threshold-per-size-down 4.26 (+6.8)

**share of deaths by starving** (control 0.668): reach-base-up 0.185 (-14.1), energy-per-food-up 0.211 (-13.4), body-matter-per-size-up 0.248 (-12.3), plant-assimilation-down 0.262 (-11.8), plant-quality-max-down 0.271 (-11.6), herbivore-attack-penalty-down 0.277 (-11.4), plant-quality-half-up 0.283 (-11.2), armor-move-factor-up 0.294 (-10.9)

**share hungry** (control 0.147): body-matter-per-size-up 0.074 (-38.1), energy-per-food-up 0.077 (-36.2), plant-assimilation-down 0.08 (-34.6), plant-quality-max-down 0.081 (-34.5), plant-quality-half-up 0.095 (-26.9), initial-nutrient-per-cell-down 0.099 (-24.8), size-min-up 0.101 (-23.7), repro-threshold-per-size-down 0.11 (-19.1)

**cost per animal per tick** (control 0.053): reach-base-up 0.176 (+10.2), energy-per-food-up 0.163 (+9.1), plant-quality-max-down 0.161 (+9), body-matter-per-size-up 0.155 (+8.4), plant-assimilation-down 0.153 (+8.3), plant-quality-half-up 0.14 (+7.2), initial-nutrient-per-cell-down 0.125 (+6), diet-specialization-down 0.123 (+5.8)

**share of costs from harmful mutations** (control 0.19): mutation-load-rate-up 0.336 (+17.7), mutation-load-mend-down 0.329 (+16.9), mutation-load-cost-up 0.27 (+9.7), torpor-below-growth-up 0.264 (+8.9), mutation-load-rate-down 0.12 (-8.5), reach-base-up 0.257 (+8.1), mutation-load-cost-down 0.127 (-7.7), mutation-load-mend-up 0.128 (-7.6)

**harmful mutations per animal** (control 14.6): mutation-load-rate-up 32.6 (+45.7), mutation-load-mend-down 29.8 (+38.4), mutation-load-rate-down 8.376 (-15.7), mutation-load-mend-up 8.674 (-14.9), reach-base-up 18.5 (+10), energy-per-food-up 18.3 (+9.5), body-matter-per-size-up 18.2 (+9.1), size-min-up 18.1 (+9)

**average diet gene** (control 0.042): body-matter-per-size-up 0.231 (+38.9), energy-per-food-up 0.229 (+38.4), plant-quality-max-down 0.202 (+33), plant-assimilation-down 0.196 (+31.6), reach-base-up 0.188 (+30), plant-quality-half-up 0.186 (+29.5), diet-specialization-down 0.166 (+25.5), initial-nutrient-per-cell-down 0.155 (+23.2)

**highest diet gene ever** (control 0.723): macro-mutation-std-down 0.506 (-1.1)

**meat in the diet** (control 0.04): energy-per-food-up 0.171 (+19.6), reach-base-up 0.167 (+19), plant-assimilation-down 0.154 (+17), plant-quality-half-up 0.143 (+15.3), body-matter-per-size-up 0.142 (+15.3), plant-quality-max-down 0.14 (+15), diet-specialization-down 0.13 (+13.5), initial-nutrient-per-cell-down 0.128 (+13.1)

**kills per 1,000 ticks** (control 510): energy-per-food-up 3,051 (+23), world-size-up 3,041 (+22.9), food-regrow-per-tick-up 2,354 (+16.7), reach-base-up 2,007 (+13.5), terrain-desert-fraction-down 1,960 (+13.1), diet-specialization-down 1,846 (+12.1), plant-quality-half-up 1,844 (+12.1), weather-amplitude-up 1,800 (+11.6)

**feeding levels** (control 1.035): plant-quality-max-down 2 (+97.5), plant-assimilation-down 2 (+97.5), energy-per-food-up 1.998 (+97.3), reach-base-up 1.998 (+97.3), body-matter-per-size-up 1.995 (+97), diet-specialization-down 1.985 (+96), repro-threshold-per-size-down 1.958 (+93.3), plant-quality-half-up 1.953 (+92.8)

**births with two parents** (control 0.351): prey-max-size-ratio-down 0.59 (+2.2), repro-threshold-per-size-up 0.121 (-2.1), energy-per-food-down 0.146 (-1.9), mate-ready-fraction-up 0.181 (-1.6), weather-amplitude-down 0.192 (-1.5), type-feeder-bite-up 0.201 (-1.4), armor-move-factor-up 0.202 (-1.4), brain-remove-node-prob-up 0.218 (-1.2)

**sex gene** (control 0.101): food-cell-size-up 0.297 (+2.7)

**species alive** (control 7.111): world-size-up 15 (+2.6), world-size-down 2.005 (-1.7), food-cell-size-up 2.629 (-1.5), mate-distance-down 2.703 (-1.5), mate-range-down 2.864 (-1.4), energy-per-food-up 3.082 (-1.3), season-temp-swing-up 3.153 (-1.3), plant-temp-tolerance-down 3.396 (-1.2)

**species diversity (Shannon)** (control 1.577): world-size-down 0.517 (-2.3), mate-range-down 0.705 (-1.9), food-cell-size-up 0.726 (-1.8), mate-distance-down 0.739 (-1.8), energy-per-food-up 0.796 (-1.7), terrain-growth-mountain-up 0.809 (-1.7), plant-temp-tolerance-down 0.845 (-1.6), sense-cost-coeff-down 0.913 (-1.4)

**share of cells in colonies** (control 0.031): reach-base-up 0.082 (+22.3), herbivore-attack-penalty-down 0.068 (+15.8), size-min-up 0.064 (+14.4), plant-assimilation-down 0.063 (+13.8), armor-move-factor-up 0.061 (+13), terrain-desert-fraction-down 0.06 (+12.4), plant-quality-half-up 0.059 (+12), terrain-scale-down 0.058 (+11.6)

**share sick** (control 0.233): disease-duration-up 0.489 (+6.6), reach-base-up 0.001 (-6), food-cell-size-up 0.002 (-6), disease-duration-down 0.015 (-5.6), disease-contact-range-down 0.02 (-5.5), size-min-up 0.031 (-5.2), body-matter-per-size-up 0.035 (-5.1), food-cell-size-down 0.407 (+4.5)

**brain connections** (control 11.9): brain-add-connection-prob-down 7.341 (-2.5), brain-weight-mutation-prob-up 8.138 (-2.1), prey-max-size-ratio-down 9.411 (-1.4), torpor-sleep-at-up 9.473 (-1.4), scent-cell-size-down 9.502 (-1.3), bond-share-up 9.539 (-1.3), camo-learning-up 9.541 (-1.3), world-size-down 9.666 (-1.3)

**plants standing (share of capacity)** (control 0.061): plant-types-down 0.389 (+27.3), plant-quality-max-down 0.252 (+15.9), reach-base-up 0.247 (+15.5), body-matter-per-size-up 0.239 (+14.8), plant-assimilation-down 0.214 (+12.7), plant-quality-half-up 0.186 (+10.4), initial-nutrient-per-cell-down 0.167 (+8.8), terrain-water-fraction-up 0.153 (+7.7)

**worn ground** (control 0.003): latitude-cooling-up 0.074 (+23.8), prey-max-size-ratio-down 0.02 (+5.7), attack-max-down 0.013 (+3.4), herbivore-attack-penalty-up 0.009 (+2.1)

**genes pinned at a limit** (control 6): body-matter-per-size-up 1.75 (-5.2), energy-per-food-up 1.75 (-5.2), reach-base-up 1.75 (-5.2), plant-quality-max-down 2 (-4.9), plant-assimilation-down 2 (-4.9), initial-nutrient-per-cell-down 2.25 (-4.6), detritus-mineralize-rate-down 2.5 (-4.3), diet-specialization-down 2.5 (-4.3)

## No clear effect (335)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`food-cap-down`, `food-cap-up`, `initial-food-fraction-down`, `fertility-scale-up`, `initial-nutrient-per-cell-up`, `nutrient-half-saturation-down`, `nutrient-half-saturation-up`, `body-energy-per-size-down`, `meat-decay-rate-down`, `meat-decay-rate-up`, `detritus-mineralize-rate-up`, `max-organisms-down`, `max-organisms-up`, `initial-size-down`, `initial-speed-up`, `initial-stamina-down`, `initial-stamina-up`, `initial-thermal-down`, `initial-thermal-up`, `initial-lifespan-down`, `initial-lifespan-up`, `initial-energy-fraction-down`, `size-max-down`, `size-max-up`, `speed-min-up`, `speed-max-down`, `metabolism-min-down`, `mutation-rate-min-down`, `mutation-rate-max-down`, `diet-max-down`, `armor-max-up`, `stamina-max-down`, `stamina-max-up`, `thermal-max-down`, `lifespan-min-down`, `lifespan-min-up`, `litter-max-down`, `litter-max-up`, `meta-mutation-std-down`, `meta-mutation-std-up`, `turn-std-down`, `turn-std-up`, `steer-gain-down`, `steer-gain-up`, `bite-size-blend-down`, `contest-strength-down`, `basal-cost-coeff-up`, `move-cost-coeff-down`, `move-cost-coeff-up`, `attack-cost-coeff-up`, `armor-cost-coeff-down`, `armor-base-up`, `attack-threshold-up`, `reach-per-size-down`, `reach-per-size-up`, `prey-max-size-ratio-up`, `kill-cooldown-down`, `brain-hidden-down`, `brain-hidden-up`, `brain-water-range-up`, `brain-vision-range-down`, `brain-every-down`, `brain-still-eat-bonus-down`, `brain-attack-gate-down`, `brain-attack-gate-up`, `brain-weight-mutation-std-down`, `brain-weight-zero-prob-up`, `brain-prune-below-down`, `brain-prune-below-up`, `brain-add-node-prob-up`, `home-range-down`, `home-range-up`, `home-memory-decay-down`, `home-memory-decay-up`, `home-memory-min-down`, `home-memory-min-up`, `chem-decay-down`, `chem-decay-up`, `chem-reward-gain-down`, `chem-reward-gain-up`, `chem-stress-hit-down`, `chem-stress-hit-up`, `chem-stress-sick-down`, `chem-stress-sick-up`, `chem-stress-hunger-up`, `chem-hunger-below-down`, `chem-bond-gain-down`, `chem-bond-gain-up`, `chemicals-cost-down`, `chemicals-cost-up`, `chem-stress-speed-down`, `chem-stress-speed-up`, `chem-stress-upkeep-down`, `chem-stress-upkeep-up`, `chem-calm-saving-down`, `chem-calm-slow-up`, `brain-base-cost-down`, `brain-base-cost-up`, `brain-cost-per-neuron-up`, `terrain-scale-up`, `terrain-water-fraction-down`, `terrain-forest-fraction-down`, `terrain-forest-fraction-up`, `terrain-growth-forest-down`, `terrain-growth-mountain-down`, `terrain-move-forest-down`, `terrain-move-forest-up`, `terrain-move-desert-down`, `terrain-move-mountain-down`, `base-temperature-up`, `latitude-cooling-down`, `plant-temp-optimum-down`, `plant-temp-tolerance-up`, `latitude-light-down`, `day-length-down`, `year-length-up`, `season-growth-swing-down`, `season-temp-swing-down`, `climate-drift-period-up`, `thermal-cost-coeff-down`, `thermal-tolerance-down`, `weather-scale-down`, `weather-drift-ticks-down`, `weather-drift-ticks-up`, `weather-drift-y-ticks-down`, `weather-drift-y-ticks-up`, `weather-morph-period-down`, `weather-morph-period-up`, `year-variability-down`, `torpor-saving-down`, `torpor-sleep-at-down`, `plant-types-up`, `plant-type-scale-up`, `plant-type-phase-down`, `plant-palate-width-down`, `plant-palate-width-up`, `plant-palate-floor-down`, `plant-palate-floor-up`, `founder-spread-down`, `founder-spread-up`, `share-rate-down`, `share-rate-up`, `share-above-up`, `share-range-down`, `share-range-up`, `share-efficiency-up`, `luck-spread-down`, `luck-limit-up`, `erosion-rate-down`, `erosion-below-down`, `erosion-below-up`, `erosion-recover-above-up`, `erosion-recovery-up`, `erosion-min-down`, `fouling-down`, `fouling-up`, `foul-free-down`, `foul-growth-effect-up`, `foul-disease-effect-down`, `foul-disease-effect-up`, `overgraze-below-down`, `overgraze-below-up`, `overgraze-heal-down`, `overgraze-penalty-down`, `overgraze-penalty-up`, `catastrophe-every-down`, `catastrophe-every-up`, `catastrophe-length-down`, `catastrophe-length-up`, `ice-age-cooling-down`, `ice-age-cooling-up`, `drought-severity-down`, `drought-severity-up`, `meteor-radius-down`, `meteor-radius-up`, `plant-assimilation-up`, `meat-assimilation-down`, `meat-assimilation-up`, `nutrient-turnover-down`, `nutrient-store-cap-up`, `provision-share-down`, `provision-share-up`, `deficiency-cost-down`, `deficiency-cost-up`, `nutrient-root-uptake-down`, `nutrient-root-uptake-up`, `ev-fire-every-up`, `ev-fire-radius-min-down`, `ev-fire-radius-min-up`, `ev-fire-radius-max-up`, `ev-fire-spread-min-down`, `ev-fire-spread-min-up`, `ev-fire-spread-max-down`, `ev-fire-spread-max-up`, `ev-fire-length-min-down`, `ev-fire-length-min-up`, `ev-fire-length-max-down`, `ev-fire-length-max-up`, `ev-fire-cell-burn-down`, `ev-fire-cell-burn-up`, `ev-fire-recover-down`, `ev-fire-recover-up`, `ev-fire-dry-weight-down`, `ev-fire-dry-weight-up`, `ev-storm-every-down`, `ev-storm-every-up`, `ev-storm-radius-min-down`, `ev-storm-radius-max-up`, `ev-storm-push-max-down`, `ev-storm-push-max-up`, `ev-storm-length-min-down`, `ev-storm-length-max-down`, `ev-storm-length-max-up`, `ev-storm-move-cost-down`, `ev-storm-move-cost-up`, `ev-storm-soil-share-up`, `ev-flood-every-down`, `ev-flood-every-up`, `ev-flood-radius-min-down`, `ev-flood-radius-min-up`, `ev-flood-radius-max-down`, `ev-flood-radius-max-up`, `ev-flood-length-min-down`, `ev-flood-length-min-up`, `ev-flood-length-max-down`, `ev-flood-length-max-up`, `ev-volcano-every-down`, `ev-volcano-every-up`, `ev-volcano-radius-min-down`, `ev-volcano-radius-min-up`, `ev-volcano-radius-max-down`, `ev-volcano-radius-max-up`, `ev-volcano-cooling-min-down`, `ev-volcano-cooling-min-up`, `ev-volcano-cooling-max-down`, `ev-volcano-cooling-max-up`, `ev-volcano-length-min-down`, `ev-volcano-length-min-up`, `ev-volcano-length-max-down`, `ev-volcano-length-max-up`, `ev-volcano-boost-down`, `ev-volcano-boost-up`, `ev-volcano-boost-reach-down`, `ev-volcano-boost-reach-up`, `ev-volcano-boost-fade-down`, `ev-volcano-boost-fade-up`, `ev-blight-every-down`, `ev-blight-every-up`, `ev-blight-growth-min-down`, `ev-blight-growth-min-up`, `ev-blight-growth-max-down`, `ev-blight-growth-max-up`, `ev-blight-length-min-down`, `ev-blight-length-min-up`, `ev-blight-length-max-down`, `ev-blight-length-max-up`, `ev-outbreak-every-down`, `ev-outbreak-every-up`, `ev-outbreak-radius-down`, `ev-outbreak-radius-up`, `ev-outbreak-hosts-down`, `ev-outbreak-hosts-up`, `ev-outbreak-duration-mult-down`, `ev-outbreak-duration-mult-up`, `ev-good-year-every-up`, `ev-good-year-boost-min-down`, `ev-good-year-boost-max-down`, `ev-good-year-boost-max-up`, `ev-good-year-length-min-down`, `ev-good-year-length-min-up`, `ev-good-year-length-max-down`, `ev-good-year-length-max-up`, `aging-coeff-down`, `aging-prime-fraction-down`, `aging-prime-fraction-up`, `aging-repair-coeff-down`, `herd-bonus-down`, `herd-bonus-up`, `herd-range-down`, `herd-cap-up`, `disease-transmission-down`, `disease-width-down`, `disease-width-up`, `disease-cost-up`, `disease-intro-every-down`, `disease-intro-every-up`, `disease-mutation-prob-down`, `disease-mutation-prob-up`, `disease-drift-down`, `disease-drift-up`, `camo-detect-min-down`, `camo-detect-min-up`, `camo-glance-down`, `camo-glance-up`, `camo-learning-down`, `camo-learn-rate-down`, `bond-links-max-down`, `bond-links-max-up`, `colony-max-down`, `colony-max-up`, `bond-rest-length-up`, `bond-stiffness-up`, `bond-iterations-down`, `bond-iterations-up`, `bond-align-up`, `initial-bond-up`, `type-feeder-speed-down`, `type-feeder-speed-up`, `type-mover-speed-down`, `type-mover-speed-up`, `type-mover-bite-up`, `type-photo-gain-down`, `type-photo-gain-up`, `type-photo-bite-down`, `type-photo-speed-up`, `type-armor-defense-down`, `type-armor-defense-up`, `type-armor-speed-down`, `type-armor-upkeep-down`, `type-armor-upkeep-up`, `type-sensor-range-down`, `type-sensor-range-up`, `type-sensor-bite-up`, `sex-wait-limit-down`, `mate-range-up`, `mate-distance-up`, `macro-mutation-prob-down`, `macro-mutation-prob-up`, `kill-ownership-leak-up`, `scent-deposit-down`, `scent-deposit-up`, `scent-decay-down`, `scent-decay-up`, `scent-cell-size-up`, `offspring-energy-fraction-down`

