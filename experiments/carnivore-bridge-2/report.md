# carnivore-bridge-2: comparison report

**Question:** Which part of the three culprits erases meat eaters, and does removing them bring meat eaters back to the grand world? Added alone to the simple world: the climate split into its parts (a temperature map only; seasons; seasons with harsh years; seasons with torpor; day and night; weather fronts; the cost of heat and cold; slow drift), sex and harmful mutations split (sex only; harmful mutations only), and kin split (kin restraint only; with herds; with sharing). Then the grand world with the culprit groups taken out. An answer: meat eaters (diet above 0.75, and above 0.5) in each.

Base world `default`; 200,000 ticks; seeds 1401-1404; 19 arms against `simple`; 80 of 80 runs finished.

How to read this: each arm is compared with the control on the same seeds. *Change* is the average difference, *95% range* is where the true change probably lies, and *noise units* is the change divided by the control's spread between seeds (1 = as big as the usual difference between two seeds). Measures are taken over the second half of each run unless named otherwise. With many arms, a few will look important by chance alone, so every finding here is re-run on new seeds before anything is changed.

## The control (`simple`): what normal looks like

| Measure | Average | Spread between seeds | Lowest | Highest |
|---|---|---|---|---|
| population | 445 | 18.5 | 426 | 462 |
| lowest population | 194 | 12.5 | 175 | 200 |
| deaths per animal per 1,000 ticks | 8.838 | 0.628 | 8.272 | 9.614 |
| share of deaths by starving | 0.008 | 0.002 | 0.006 | 0.01 |
| share hungry | 0.019 | 0.002 | 0.018 | 0.022 |
| cost per animal per tick | 0.098 | 0.002 | 0.097 | 0.101 |
| share of costs from harmful mutations | 0 | 0 | 0 | 0 |
| harmful mutations per animal | 0 | 0 | 0 | 0 |
| average diet gene | 0.31 | 0.024 | 0.292 | 0.346 |
| highest diet gene ever | 1 | 0 | 1 | 1 |
| meat in the diet | 0.411 | 0.017 | 0.399 | 0.436 |
| kills per 1,000 ticks | 3,903 | 269 | 3,548 | 4,146 |
| feeding levels | 2.854 | 0.129 | 2.663 | 2.941 |
| births with two parents | 0 | 0 | 0 | 0 |
| sex gene | 0 | 0 | 0 | 0 |
| species alive | 3.611 | 0.538 | 3.069 | 4.337 |
| species diversity (Shannon) | 0.858 | 0.064 | 0.799 | 0.948 |
| share of cells in colonies | 0 | 0 | 0 | 0 |
| share sick | 0 | 0 | 0 | 0 |
| brain connections | 0 | 0 | 0 | 0 |
| plants standing (share of capacity) | 0.045 | 0.004 | 0.04 | 0.051 |
| worn ground | 0 | 0 | 0 | 0 |
| genes pinned at a limit | 2 | 0 | 2 | 2 |

Genes pinned at a limit in the control (over half the animals within 0.05 of it): `low_size`, `low_attack`.

## Red flags (38)

### Collapse (0)

*Any seed died out, or the population fell below a fifth of the control's.*

None.

### Too good to be true (7)

*The population more than doubled: check the energy ledger for an exploit before believing it.*

- **sex-only**: population 1,207 against 445: check the energy ledger for an exploit. Reproduce: `npm run sim -- --config configs/default.json --set sexualReproduction=2 --set sexAcceptAny=1 --set sexFounderSpread=1 --set sexWaitLimit=200 --set mateReadyFraction=0.6 --seed 1401 --ticks 200000`
- **harmful-mutations-only**: population 1,060 against 445: check the energy ledger for an exploit. Reproduce: `npm run sim -- --config configs/default.json --set mutationLoadRate=3 --set mutationLoadCost=0.04 --set mutationLoadModel=1 --set mutationLoadMend=0.15 --seed 1401 --ticks 200000`
- **grand**: population 1,072 against 445: check the energy ledger for an exploit. Reproduce: `npm run sim -- --config configs/default.json --set worldWidth=512 --set worldHeight=512 --set initialOrganisms=600 --set maxOrganisms=30000 --set foodRegrowPerTick=0.12 --set terrainMode=1 --set climateMode=1 --set yearLength=3000 --set dayLength=150 --set seasonGrowthSwing=0.6 --set seasonTempSwing=0.2 --set climateDriftPeriod=150000 --set climateDriftAmplitude=0.05 --set weatherAmplitude=0.12 --set yearVariability=0.25 --set thermalCostCoeff=1.5 --set catastropheKind=4 --set catastropheEvery=150000 --set catastropheLength=15000 --set plantTypes=3 --set plantTypePhase=1 --set founderSpread=0.6 --set initialPalate=0 --set brainMode=2 --set brainAppetiteSenses=1 --set killOwnershipTicks=30 --set brainMemory=1 --set homeMode=3 --set chemicals=1 --set chemBodyEffects=1 --set kinDistance=0.05 --set kinTolerance=1 --set herdBonus=0.3 --set sexualReproduction=2 --set sexAcceptAny=1 --set diseaseTransmission=0.5 --set diseaseWidth=0.15 --set camouflageMode=1 --set agingCoeff=3 --set litterMax=4 --set torporSaving=0.7 --set multicellular=1 --set cellTypes=1 --set initialBond=0.15 --set typePhotoGain=0.05 --set diseaseDuration=200 --set diseaseImmunity=600 --set diseaseMutationProb=0.5 --set diseaseDrift=0.5 --set diseaseIntroEvery=20000 --set diseaseCost=1 --set mutationLoadRate=3 --set mutationLoadCost=0.04 --set luckSpread=0.08 --set shareRate=0.4 --set sexFounderSpread=1 --set sexWaitLimit=200 --set mateReadyFraction=0.6 --set mutationLoadModel=1 --set mutationLoadMend=0.15 --set overgrazeDamage=0.003 --set overgrazePenalty=0.55 --set fouling=0.01 --set erosionRate=0.00001 --set evFireEvery=20000 --set evStormEvery=20000 --set evFloodEvery=80000 --set evVolcanoEvery=100000 --set evBlightEvery=50000 --set evOutbreakEvery=50000 --set evGoodYearEvery=40000 --set nutrientMode=2 --set mutationRateMin=0.01 --set macroMutationProb=0.005 --seed 1401 --ticks 200000`
- **grand-no-climate**: population 1,208 against 445: check the energy ledger for an exploit. Reproduce: `npm run sim -- --config configs/default.json --set worldWidth=512 --set worldHeight=512 --set initialOrganisms=600 --set maxOrganisms=30000 --set foodRegrowPerTick=0.12 --set terrainMode=1 --set climateMode=0 --set yearLength=0 --set dayLength=0 --set seasonGrowthSwing=0.4 --set seasonTempSwing=0.15 --set climateDriftPeriod=0 --set climateDriftAmplitude=0.15 --set weatherAmplitude=0 --set yearVariability=0 --set thermalCostCoeff=0 --set catastropheKind=0 --set catastropheEvery=0 --set catastropheLength=3000 --set plantTypes=3 --set plantTypePhase=0 --set founderSpread=0.6 --set initialPalate=0 --set brainMode=2 --set brainAppetiteSenses=1 --set killOwnershipTicks=30 --set brainMemory=1 --set homeMode=3 --set chemicals=1 --set chemBodyEffects=1 --set kinDistance=0.05 --set kinTolerance=1 --set herdBonus=0.3 --set sexualReproduction=2 --set sexAcceptAny=1 --set diseaseTransmission=0.5 --set diseaseWidth=0.15 --set camouflageMode=1 --set agingCoeff=3 --set litterMax=4 --set torporSaving=0 --set multicellular=1 --set cellTypes=1 --set initialBond=0.15 --set typePhotoGain=0.05 --set diseaseDuration=200 --set diseaseImmunity=600 --set diseaseMutationProb=0.5 --set diseaseDrift=0.5 --set diseaseIntroEvery=20000 --set diseaseCost=1 --set mutationLoadRate=3 --set mutationLoadCost=0.04 --set luckSpread=0.08 --set shareRate=0.4 --set sexFounderSpread=1 --set sexWaitLimit=200 --set mateReadyFraction=0.6 --set mutationLoadModel=1 --set mutationLoadMend=0.15 --set overgrazeDamage=0.003 --set overgrazePenalty=0.55 --set fouling=0.01 --set erosionRate=0.00001 --set evFireEvery=20000 --set evStormEvery=20000 --set evFloodEvery=80000 --set evVolcanoEvery=0 --set evBlightEvery=50000 --set evOutbreakEvery=50000 --set evGoodYearEvery=40000 --set nutrientMode=2 --set mutationRateMin=0.01 --set macroMutationProb=0.005 --seed 1401 --ticks 200000`
- **grand-no-kin-herd**: population 1,097 against 445: check the energy ledger for an exploit. Reproduce: `npm run sim -- --config configs/default.json --set worldWidth=512 --set worldHeight=512 --set initialOrganisms=600 --set maxOrganisms=30000 --set foodRegrowPerTick=0.12 --set terrainMode=1 --set climateMode=1 --set yearLength=3000 --set dayLength=150 --set seasonGrowthSwing=0.6 --set seasonTempSwing=0.2 --set climateDriftPeriod=150000 --set climateDriftAmplitude=0.05 --set weatherAmplitude=0.12 --set yearVariability=0.25 --set thermalCostCoeff=1.5 --set catastropheKind=4 --set catastropheEvery=150000 --set catastropheLength=15000 --set plantTypes=3 --set plantTypePhase=1 --set founderSpread=0.6 --set initialPalate=0 --set brainMode=2 --set brainAppetiteSenses=1 --set killOwnershipTicks=30 --set brainMemory=1 --set homeMode=3 --set chemicals=1 --set chemBodyEffects=1 --set kinDistance=0 --set kinTolerance=0 --set herdBonus=0 --set sexualReproduction=2 --set sexAcceptAny=1 --set diseaseTransmission=0.5 --set diseaseWidth=0.15 --set camouflageMode=1 --set agingCoeff=3 --set litterMax=4 --set torporSaving=0.7 --set multicellular=1 --set cellTypes=1 --set initialBond=0.15 --set typePhotoGain=0.05 --set diseaseDuration=200 --set diseaseImmunity=600 --set diseaseMutationProb=0.5 --set diseaseDrift=0.5 --set diseaseIntroEvery=20000 --set diseaseCost=1 --set mutationLoadRate=3 --set mutationLoadCost=0.04 --set luckSpread=0.08 --set shareRate=0 --set sexFounderSpread=1 --set sexWaitLimit=200 --set mateReadyFraction=0.6 --set mutationLoadModel=1 --set mutationLoadMend=0.15 --set overgrazeDamage=0.003 --set overgrazePenalty=0.55 --set fouling=0.01 --set erosionRate=0.00001 --set evFireEvery=20000 --set evStormEvery=20000 --set evFloodEvery=80000 --set evVolcanoEvery=100000 --set evBlightEvery=50000 --set evOutbreakEvery=50000 --set evGoodYearEvery=40000 --set nutrientMode=2 --set mutationRateMin=0.01 --set macroMutationProb=0.005 --seed 1401 --ticks 200000`
- **grand-no-climate-no-sex-load**: population 1,120 against 445: check the energy ledger for an exploit. Reproduce: `npm run sim -- --config configs/default.json --set worldWidth=512 --set worldHeight=512 --set initialOrganisms=600 --set maxOrganisms=30000 --set foodRegrowPerTick=0.12 --set terrainMode=1 --set climateMode=0 --set yearLength=0 --set dayLength=0 --set seasonGrowthSwing=0.4 --set seasonTempSwing=0.15 --set climateDriftPeriod=0 --set climateDriftAmplitude=0.15 --set weatherAmplitude=0 --set yearVariability=0 --set thermalCostCoeff=0 --set catastropheKind=0 --set catastropheEvery=0 --set catastropheLength=3000 --set plantTypes=3 --set plantTypePhase=0 --set founderSpread=0.6 --set initialPalate=0 --set brainMode=2 --set brainAppetiteSenses=1 --set killOwnershipTicks=30 --set brainMemory=1 --set homeMode=3 --set chemicals=1 --set chemBodyEffects=1 --set kinDistance=0.05 --set kinTolerance=1 --set herdBonus=0.3 --set sexualReproduction=0 --set sexAcceptAny=0 --set diseaseTransmission=0.5 --set diseaseWidth=0.15 --set camouflageMode=1 --set agingCoeff=3 --set litterMax=4 --set torporSaving=0 --set multicellular=1 --set cellTypes=1 --set initialBond=0.15 --set typePhotoGain=0.05 --set diseaseDuration=200 --set diseaseImmunity=600 --set diseaseMutationProb=0.5 --set diseaseDrift=0.5 --set diseaseIntroEvery=20000 --set diseaseCost=1 --set mutationLoadRate=0 --set mutationLoadCost=0.03 --set luckSpread=0.08 --set shareRate=0.4 --set sexFounderSpread=-1 --set sexWaitLimit=0 --set mateReadyFraction=1 --set mutationLoadModel=0 --set mutationLoadMend=0 --set overgrazeDamage=0.003 --set overgrazePenalty=0.55 --set fouling=0.01 --set erosionRate=0.00001 --set evFireEvery=20000 --set evStormEvery=20000 --set evFloodEvery=80000 --set evVolcanoEvery=0 --set evBlightEvery=50000 --set evOutbreakEvery=50000 --set evGoodYearEvery=40000 --set nutrientMode=2 --set mutationRateMin=0.01 --set macroMutationProb=0.005 --seed 1401 --ticks 200000`
- **grand-no-all-three**: population 1,522 against 445: check the energy ledger for an exploit. Reproduce: `npm run sim -- --config configs/default.json --set worldWidth=512 --set worldHeight=512 --set initialOrganisms=600 --set maxOrganisms=30000 --set foodRegrowPerTick=0.12 --set terrainMode=1 --set climateMode=0 --set yearLength=0 --set dayLength=0 --set seasonGrowthSwing=0.4 --set seasonTempSwing=0.15 --set climateDriftPeriod=0 --set climateDriftAmplitude=0.15 --set weatherAmplitude=0 --set yearVariability=0 --set thermalCostCoeff=0 --set catastropheKind=0 --set catastropheEvery=0 --set catastropheLength=3000 --set plantTypes=3 --set plantTypePhase=0 --set founderSpread=0.6 --set initialPalate=0 --set brainMode=2 --set brainAppetiteSenses=1 --set killOwnershipTicks=30 --set brainMemory=1 --set homeMode=3 --set chemicals=1 --set chemBodyEffects=1 --set kinDistance=0 --set kinTolerance=0 --set herdBonus=0 --set sexualReproduction=0 --set sexAcceptAny=0 --set diseaseTransmission=0.5 --set diseaseWidth=0.15 --set camouflageMode=1 --set agingCoeff=3 --set litterMax=4 --set torporSaving=0 --set multicellular=1 --set cellTypes=1 --set initialBond=0.15 --set typePhotoGain=0.05 --set diseaseDuration=200 --set diseaseImmunity=600 --set diseaseMutationProb=0.5 --set diseaseDrift=0.5 --set diseaseIntroEvery=20000 --set diseaseCost=1 --set mutationLoadRate=0 --set mutationLoadCost=0.03 --set luckSpread=0.08 --set shareRate=0 --set sexFounderSpread=-1 --set sexWaitLimit=0 --set mateReadyFraction=1 --set mutationLoadModel=0 --set mutationLoadMend=0 --set overgrazeDamage=0.003 --set overgrazePenalty=0.55 --set fouling=0.01 --set erosionRate=0.00001 --set evFireEvery=20000 --set evStormEvery=20000 --set evFloodEvery=80000 --set evVolcanoEvery=0 --set evBlightEvery=50000 --set evOutbreakEvery=50000 --set evGoodYearEvery=40000 --set nutrientMode=2 --set mutationRateMin=0.01 --set macroMutationProb=0.005 --seed 1401 --ticks 200000`

### Big changes (18)

*A key measure moved by 3 or more noise units, with a 95% range that excludes no change.*

- **temperature-map**: population 445 → 369 (-4.1 noise units); cost per animal per tick 0.098 → 0.085 (-6.6 noise units); kills per 1,000 ticks 3,903 → 2,592 (-4.9 noise units)
- **seasons**: deaths per animal per 1,000 ticks 8.838 → 2.696 (-9.8 noise units); cost per animal per tick 0.098 → 0.062 (-18.7 noise units); average diet gene 0.31 → 0.136 (-7.1 noise units); kills per 1,000 ticks 3,903 → 1,232 (-9.9 noise units); feeding levels 2.854 → 1.696 (-9 noise units); species alive 3.611 → 1.908 (-3.2 noise units); species diversity (Shannon) 0.858 → 0.259 (-9.4 noise units); plants standing (share of capacity) 0.045 → 0.025 (-4.6 noise units)
- **seasons-harsh-years**: lowest population 194 → 93.5 (-8 noise units); deaths per animal per 1,000 ticks 8.838 → 2.216 (-10.6 noise units); cost per animal per tick 0.098 → 0.062 (-18.5 noise units); average diet gene 0.31 → 0.109 (-8.2 noise units); kills per 1,000 ticks 3,903 → 927 (-11.1 noise units); feeding levels 2.854 → 1.54 (-10.2 noise units); species alive 3.611 → 1.639 (-3.7 noise units); species diversity (Shannon) 0.858 → 0.207 (-10.2 noise units); plants standing (share of capacity) 0.045 → 0.022 (-5.1 noise units)
- **seasons-torpor**: deaths per animal per 1,000 ticks 8.838 → 3.157 (-9.1 noise units); cost per animal per tick 0.098 → 0.061 (-19.2 noise units); average diet gene 0.31 → 0.142 (-6.9 noise units); kills per 1,000 ticks 3,903 → 1,447 (-9.1 noise units); species diversity (Shannon) 0.858 → 0.317 (-8.5 noise units); plants standing (share of capacity) 0.045 → 0.026 (-4.3 noise units)
- **day-night**: population 445 → 341 (-5.6 noise units); deaths per animal per 1,000 ticks 8.838 → 6.366 (-3.9 noise units); share of deaths by starving 0.008 → 0.013 (3.2 noise units); share hungry 0.019 → 0.025 (3.9 noise units); cost per animal per tick 0.098 → 0.076 (-11.7 noise units); kills per 1,000 ticks 3,903 → 2,137 (-6.6 noise units); feeding levels 2.854 → 2.46 (-3.1 noise units)
- **weather**: population 445 → 356 (-4.9 noise units); cost per animal per tick 0.098 → 0.089 (-5 noise units); kills per 1,000 ticks 3,903 → 2,518 (-5.2 noise units)
- **heat-cold-cost**: population 445 → 356 (-4.8 noise units); share of deaths by starving 0.008 → 0.013 (3.3 noise units); share hungry 0.019 → 0.025 (3.4 noise units); cost per animal per tick 0.098 → 0.089 (-5 noise units); kills per 1,000 ticks 3,903 → 2,623 (-4.8 noise units); feeding levels 2.854 → 2.334 (-4 noise units)
- **drift**: population 445 → 332 (-6.1 noise units); share hungry 0.019 → 0.025 (3.3 noise units); kills per 1,000 ticks 3,903 → 2,518 (-5.2 noise units)
- **harmful-mutations-only**: deaths per animal per 1,000 ticks 8.838 → 1.037 (-12.4 noise units); share of deaths by starving 0.008 → 0.653 (386 noise units); share hungry 0.019 → 0.131 (73.4 noise units); average diet gene 0.31 → 0.058 (-10.3 noise units); meat in the diet 0.411 → 0.069 (-19.8 noise units); kills per 1,000 ticks 3,903 → 530 (-12.6 noise units); feeding levels 2.854 → 1.337 (-11.8 noise units); species alive 3.611 → 1.349 (-4.2 noise units); species diversity (Shannon) 0.858 → 0.122 (-11.5 noise units); plants standing (share of capacity) 0.045 → 0.021 (-5.4 noise units)
- **kin-only**: average diet gene 0.31 → 0.427 (4.8 noise units)
- **kin-herds**: feeding levels 2.854 → 1.762 (-8.5 noise units); species alive 3.611 → 1.691 (-3.6 noise units); species diversity (Shannon) 0.858 → 0.376 (-7.5 noise units)
- **kin-sharing**: feeding levels 2.854 → 1.559 (-10.1 noise units)
- **grand**: population 445 → 1,072 (33.9 noise units); lowest population 194 → 510 (25.3 noise units); deaths per animal per 1,000 ticks 8.838 → 1.461 (-11.8 noise units); share of deaths by starving 0.008 → 0.549 (324 noise units); share hungry 0.019 → 0.146 (82.9 noise units); cost per animal per tick 0.098 → 0.047 (-26.3 noise units); average diet gene 0.31 → 0.048 (-10.7 noise units); meat in the diet 0.411 → 0.063 (-20.2 noise units); kills per 1,000 ticks 3,903 → 717 (-11.9 noise units); feeding levels 2.854 → 1.554 (-10.1 noise units); species diversity (Shannon) 0.858 → 1.619 (11.9 noise units)
- **grand-no-climate**: population 445 → 1,208 (41.3 noise units); lowest population 194 → 578 (30.8 noise units); deaths per animal per 1,000 ticks 8.838 → 2.725 (-9.7 noise units); share of deaths by starving 0.008 → 0.296 (173 noise units); share hungry 0.019 → 0.11 (59.7 noise units); average diet gene 0.31 → 0.109 (-8.2 noise units); meat in the diet 0.411 → 0.124 (-16.6 noise units); kills per 1,000 ticks 3,903 → 2,232 (-6.2 noise units); feeding levels 2.854 → 1.978 (-6.8 noise units); species alive 3.611 → 7.163 (6.6 noise units); species diversity (Shannon) 0.858 → 1.51 (10.2 noise units); plants standing (share of capacity) 0.045 → 0.141 (21.9 noise units)
- **grand-no-sex-load**: population 445 → 806 (19.5 noise units); lowest population 194 → 463 (21.5 noise units); deaths per animal per 1,000 ticks 8.838 → 3.156 (-9.1 noise units); share of deaths by starving 0.008 → 0.376 (220 noise units); share hungry 0.019 → 0.121 (66.5 noise units); average diet gene 0.31 → 0.137 (-7.1 noise units); meat in the diet 0.411 → 0.123 (-16.7 noise units); kills per 1,000 ticks 3,903 → 1,569 (-8.7 noise units); feeding levels 2.854 → 1.829 (-8 noise units)
- **grand-no-kin-herd**: population 445 → 1,097 (35.3 noise units); lowest population 194 → 444 (20 noise units); deaths per animal per 1,000 ticks 8.838 → 1.259 (-12.1 noise units); share of deaths by starving 0.008 → 0.645 (381 noise units); share hungry 0.019 → 0.155 (89.4 noise units); cost per animal per tick 0.098 → 0.039 (-30.6 noise units); average diet gene 0.31 → 0.035 (-11.2 noise units); meat in the diet 0.411 → 0.042 (-21.4 noise units); kills per 1,000 ticks 3,903 → 492 (-12.7 noise units); feeding levels 2.854 → 1.089 (-13.7 noise units)
- **grand-no-climate-no-sex-load**: population 445 → 1,120 (36.6 noise units); lowest population 194 → 600 (32.5 noise units); deaths per animal per 1,000 ticks 8.838 → 3.846 (-8 noise units); share of deaths by starving 0.008 → 0.207 (119 noise units); share hungry 0.019 → 0.104 (55.6 noise units); average diet gene 0.31 → 0.154 (-6.4 noise units); meat in the diet 0.411 → 0.16 (-14.6 noise units); plants standing (share of capacity) 0.045 → 0.127 (18.8 noise units)
- **grand-no-all-three**: population 445 → 1,522 (58.3 noise units); lowest population 194 → 600 (32.5 noise units); deaths per animal per 1,000 ticks 8.838 → 3.793 (-8 noise units); share hungry 0.019 → 0.121 (66.6 noise units); average diet gene 0.31 → 0.144 (-6.8 noise units); meat in the diet 0.411 → 0.176 (-13.6 noise units)

### Same way both directions (0)

*Turning a setting down and up both move a measure the same way (2+ noise units each).*

None.

### Still drifting (1)

*A measure still changing by more than 10% over the last quarter of the run, the same way on every seed, unlike the control.*

- **grand-no-climate-no-sex-load**: cost_total still changing by -14.8% over the last quarter (control -2%)

### Pinned genes (12)

*A gene newly stuck at a limit (over half the animals within 0.05 of it), or a gene the control has stuck that this arm frees.*

- **seasons-harsh-years**: newly pinned `low_diet`
- **seasons-torpor**: newly pinned `low_diet`
- **sex-only**: newly pinned `low_diet`
- **harmful-mutations-only**: newly pinned `low_diet`
- **kin-only**: freed `low_attack`
- **kin-sharing**: newly pinned `low_generosity`
- **grand**: newly pinned `low_senseRange`, `low_metabolism`, `low_diet`, `low_generosity`, `low_bond`
- **grand-no-climate**: newly pinned `low_generosity`, `low_bond`; freed `low_attack`
- **grand-no-sex-load**: newly pinned `low_bond`
- **grand-no-kin-herd**: newly pinned `low_senseRange`, `low_metabolism`, `low_diet`, `low_sex`, `low_bond`
- **grand-no-climate-no-sex-load**: newly pinned `low_bond`; freed `low_attack`
- **grand-no-all-three**: newly pinned `low_bond`

## Biggest effects on each key measure

The arms that moved each measure most (in noise units, with the 95% range excluding no change).

**population** (control 445): grand-no-all-three 1,522 (+58.3), grand-no-climate 1,208 (+41.3), grand-no-climate-no-sex-load 1,120 (+36.6), grand-no-kin-herd 1,097 (+35.3), grand 1,072 (+33.9), grand-no-sex-load 806 (+19.5), drift 332 (-6.1), day-night 341 (-5.6)

**lowest population** (control 194): grand-no-climate-no-sex-load 600 (+32.5), grand-no-all-three 600 (+32.5), grand-no-climate 578 (+30.8), grand 510 (+25.3), grand-no-sex-load 463 (+21.5), grand-no-kin-herd 444 (+20), seasons-harsh-years 93.5 (-8)

**deaths per animal per 1,000 ticks** (control 8.838): harmful-mutations-only 1.037 (-12.4), grand-no-kin-herd 1.259 (-12.1), grand 1.461 (-11.8), seasons-harsh-years 2.216 (-10.6), seasons 2.696 (-9.8), grand-no-climate 2.725 (-9.7), grand-no-sex-load 3.156 (-9.1), seasons-torpor 3.157 (-9.1)

**share of deaths by starving** (control 0.008): harmful-mutations-only 0.653 (+386), grand-no-kin-herd 0.645 (+381), grand 0.549 (+324), grand-no-sex-load 0.376 (+220), grand-no-climate 0.296 (+173), grand-no-climate-no-sex-load 0.207 (+119), heat-cold-cost 0.013 (+3.3), day-night 0.013 (+3.2)

**share hungry** (control 0.019): grand-no-kin-herd 0.155 (+89.4), grand 0.146 (+82.9), harmful-mutations-only 0.131 (+73.4), grand-no-all-three 0.121 (+66.6), grand-no-sex-load 0.121 (+66.5), grand-no-climate 0.11 (+59.7), grand-no-climate-no-sex-load 0.104 (+55.6), day-night 0.025 (+3.9)

**cost per animal per tick** (control 0.098): grand-no-kin-herd 0.039 (-30.6), grand 0.047 (-26.3), seasons-torpor 0.061 (-19.2), seasons 0.062 (-18.7), seasons-harsh-years 0.062 (-18.5), day-night 0.076 (-11.7), temperature-map 0.085 (-6.6), weather 0.089 (-5)

**average diet gene** (control 0.31): grand-no-kin-herd 0.035 (-11.2), grand 0.048 (-10.7), harmful-mutations-only 0.058 (-10.3), seasons-harsh-years 0.109 (-8.2), grand-no-climate 0.109 (-8.2), seasons 0.136 (-7.1), grand-no-sex-load 0.137 (-7.1), seasons-torpor 0.142 (-6.9)

**meat in the diet** (control 0.411): grand-no-kin-herd 0.042 (-21.4), grand 0.063 (-20.2), harmful-mutations-only 0.069 (-19.8), grand-no-sex-load 0.123 (-16.7), grand-no-climate 0.124 (-16.6), grand-no-climate-no-sex-load 0.16 (-14.6), grand-no-all-three 0.176 (-13.6)

**kills per 1,000 ticks** (control 3,903): grand-no-kin-herd 492 (-12.7), harmful-mutations-only 530 (-12.6), grand 717 (-11.9), seasons-harsh-years 927 (-11.1), seasons 1,232 (-9.9), seasons-torpor 1,447 (-9.1), grand-no-sex-load 1,569 (-8.7), day-night 2,137 (-6.6)

**feeding levels** (control 2.854): grand-no-kin-herd 1.089 (-13.7), harmful-mutations-only 1.337 (-11.8), seasons-harsh-years 1.54 (-10.2), grand 1.554 (-10.1), kin-sharing 1.559 (-10.1), seasons 1.696 (-9), kin-herds 1.762 (-8.5), grand-no-sex-load 1.829 (-8)

**species alive** (control 3.611): grand-no-climate 7.163 (+6.6), harmful-mutations-only 1.349 (-4.2), seasons-harsh-years 1.639 (-3.7), kin-herds 1.691 (-3.6), seasons 1.908 (-3.2), seasons-torpor 2.099 (-2.8)

**species diversity (Shannon)** (control 0.858): grand 1.619 (+11.9), harmful-mutations-only 0.122 (-11.5), grand-no-climate 1.51 (+10.2), seasons-harsh-years 0.207 (-10.2), seasons 0.259 (-9.4), seasons-torpor 0.317 (-8.5), kin-herds 0.376 (-7.5)

**plants standing (share of capacity)** (control 0.045): grand-no-climate 0.141 (+21.9), grand-no-climate-no-sex-load 0.127 (+18.8), harmful-mutations-only 0.021 (-5.4), seasons-harsh-years 0.022 (-5.1), seasons 0.025 (-4.6), seasons-torpor 0.026 (-4.3), day-night 0.036 (-1.9), temperature-map 0.039 (-1.2)

## No clear effect (1)

*No key measure moved by 1 noise unit or more with a 95% range excluding no change. For a mechanism switched off, this means it is too weak to matter here, or broken. With few seeds, small effects can hide here too.*

`sex-only`

