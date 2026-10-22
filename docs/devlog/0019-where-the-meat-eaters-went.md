# Devlog 19: Where the meat eaters went

*Phase 9, part 4. Devlog 18 left lasting meat eaters as an open question. The simple world still grows them in every seed, so this time the question was what the grand world adds that takes them away. Four cloud experiments, about $4. Answer: four features together, and without them the grand world grows a real food web. That world is now a preset, "Grand world: hunters". Full write-up: `docs/findings/phase-9-headline-experiments.md`, sections 7 to 7d.*

![Meat eaters over 300,000 ticks, average of 16 worlds: none in today's grand world, a few brief ones without the seasons, and a lasting group in the hunters' world.](../media/hunters-world.svg)

## How it was found

- **A bridge from the simple world to the grand world.** The grand world's 74 settings were sorted into 15 groups. Each group was added alone to the simple world, and the groups were also added one after another until the last step was the full grand world (`apps/runner/scripts/make-bridge.mjs`).
- **Then the culprits were split into their parts,** and taken out of the grand world in turn (`make-bridge-2.ts`).
- **Then gentler versions were tried,** and finally the best candidate was confirmed on 16 fresh seeds (`make-hunters.ts`).

## What we learned

- **No single feature is to blame.** Four each thin meat eaters or make them hit-or-miss; together they erase them:
  - **the climate:** in the simple world only its seasons matter (every winter the plant eaters crash, and the small group of hunters crashes with them); in the grand world other parts of the climate add to it;
  - **harmful mutations:** the strongest single blocker; would-be hunters are always a small group, and small groups pile them up faster;
  - **sex:** mating blends hunters back into the plant eaters;
  - **kin restraint:** hit-or-miss.
- **The common thread is small numbers.** Each of these hurts a small, sparse group more than a big one, and a meat-eating group always starts small.
- **Gentler versions do not work.** Softer seasons, fewer harmful mutations, more mending and tighter kin restraint, with sex kept, brought no meat eaters in 40 worlds. They gave a calmer world instead: more species, lives about twice as long, half the kills.
- **Taking all four out works.** The grand world without the climate, sex, harmful mutations and kin restraint grew a lasting group of meat eaters in 13 of 16 worlds:
  - 2.7 feeding levels, against 1.3;
  - 29% more species alive and more than twice as many over the run;
  - a 36% bigger population with a higher low point;
  - six times the kills, so lives are half as long and most deaths are kills.
- **Taking out only the seasons is not enough** in the grand world (meat eaters in 4 of 16 worlds, at most 11 strong, and a third fewer species). Which other part of the climate matters is not yet known.

## What broke, or misled

- **The quick speed trial before a launch is unreliable for big worlds.** Two launches came in about 70% dearer than quoted. Two fixes:
  - every launch now needs the owner's approved ceiling (`--max-cost`) and is refused above it; this refused one launch twice;
  - `--hours` fixes the run time, and so the worst case, from real speeds of earlier runs.
- **Laptop tests timed out twice** while the owner's own runs kept it busy; they passed on a rerun.

## The new preset

**Grand world: hunters** (`configs/grand-hunters.json`). It keeps continents, three kinds of plant, nutrients through food, brains, disease, camouflage, aging, litters, colonies, land damage and most disasters. It drops the climate, sex, harmful mutations and kin restraint. Expect meat eaters from about tick 20,000, building to about 100 by tick 100,000.

## Still open

- **Which part of the grand world's climate,** besides the seasons, blocks meat eaters: torpor, the cost of heat and cold, ice ages and droughts, or weather.
- **Whether the meat eaters last a million ticks.** Over the last quarter of the run, the average diet drifted down about 7% (not in every world).
- **Why tighter kin restraint cuts hunting.**
