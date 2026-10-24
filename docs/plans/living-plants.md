# Plan: living plants (proposal, not started)

The owner's idea (2026-10-23): plants are too simple. They should come in many more kinds, carry several nutrients in different amounts, be poisonous to some animals and not others, and perhaps evolve.

## How plants work today

- The world is a grid of food cells (8 by 8 units; a 512 world has 64 by 64 = 4,096 cells). Each cell holds one number: how much plant is standing.
- With `plantTypes` 2 to 6, each cell grows one fixed kind, in patches. The kinds peak at different times of year and like slightly different temperatures.
- An animal's palate gene (0 to 1) says which kind it digests best. Kinds are spaced evenly from 0 to 1, and digestion falls off with the distance between palate and kind.
- With `nutrientMode` 2, plants hold soil nutrient in proportion to the soil they grew from (`plantQ`), so poor ground grows poor food. There is one nutrient, and it is real matter that cycles (soil, plants, animals, dung, carcasses, soil).
- Plants never change. A cell's kind is fixed from the start.

## The proposal: four steps, each optional and off by default

Every step follows the house rules:
- off by default, so older worlds and the brains-off goldens stay exactly the same;
- new per-cell arrays are saved only when their feature is on;
- the energy and matter books must balance;
- no trigonometry, and nothing hard-coded about who eats what.

### Step 1: plants that evolve (`plantEvolution`)

- **Each food cell gets a small plant genome** instead of a fixed kind. It has a few numbers from 0 to 1:
  - **chemistry**: a continuous version of the kind, read by the palate exactly as today, so there are as many kinds as there are distinct chemistries;
  - **season**: the time of year it grows best;
  - **warmth**: the temperature it likes best.
- **Plants spread by seed.**
  - Every so many ticks, each cell takes on a little of a neighbouring cell's genome. A cell with more standing plant sends out more seed.
  - Every seed mutates a little.
  - All cells update together from the previous state, so the order cells are visited in changes nothing.
- **Selection then happens on its own:**
  - plants suited to the local cold or season grow more and spread;
  - plants that animals eat bare send out less seed, so heavily grazed chemistries lose ground.
- **Plants get their own random stream** derived from the seed, as disasters do, so turning this on never reshuffles the animals' dice.
- **To see it:**
  - a viewer overlay coloring each cell by plant chemistry;
  - a chart of plant diversity;
  - an observation-only count of plant "kinds" as clusters of similar genomes (like the species tracker, it only watches).
- **Done when:** in a world with a climate, plants in cold places evolve a colder warmth and plant chemistry spreads into several patches with stable borders. Both visible on the overlay, on several seeds.

### Step 2: poisonous plants (`plantToxins`)

- **A fourth plant gene, toxin.** Making toxin slows the plant's growth, so it only pays where grazing is heavy.
- **Poison depends on who eats it.** An animal whose palate matches the plant's chemistry handles its toxin. One whose palate is far off pays an upkeep cost in proportion to toxin × mismatch. The same plant is food for one animal and poison for another, and nothing is hard-coded.
- **Animals avoid what poisons them.** Smell and steering already weigh plants by how well they can be digested; they would also count the harm. No new brain inputs, so brain-world goldens stay the same too.
- **What to look for:** an arms race. Plants evolve toxin against the commonest palate, grazers' palates follow, and that could split grazers into specialists on different plants. That is a way to more species and to plant eaters that breed faster in their own niche.

### Step 3: several nutrients (`dietNutrients`)

There are two ways to build this. I recommend the first.

- **A. Dietary nutrients (recommended).** Three nutrients, for example protein, fats and minerals.
  - Every plant genome gets a profile: how much of each it holds, with a trade-off so no plant is rich in all three.
  - Each animal has a small reserve of each, filled by eating and slowly used up. Running short of any one costs upkeep, in proportion to how short.
  - Meat holds a balanced mix, as real meat does. That gives meat eating a real, graded advantage without hard-coding it, and it ties straight back to the meat-eater question.
  - These are qualities of food, not substances, so the matter books need no new pools; the existing single nutrient keeps its cycle.
- **B. Nutrients as matter.** Each nutrient is a separate substance with its own soil pool, plant content, animal store, dung and carcass share, all in the matter books. More faithful, but every part of today's nutrient cycle would have to be generalized and audited three times over. Much bigger, and slower to run.

### Step 4: experiments

- A 4-seed check that each step does what it says.
- Then 8-seed screens in the grand world.
- Then a 16-seed, 500,000-tick confirmation of anything promising before it goes near a preset. That is the lesson of devlog 23.
- Measures to add:
  - plant diversity;
  - toxin levels;
  - how many palates the grazers split into;
  - nutrient shortages by diet;
  - and, as always, species, feeding levels and lasting meat-eating groups.

## Cost and size

- Steps 1 and 2 are moderate: a few per-cell arrays, a seeding pass every few hundred ticks, and changes to growth, digestion and smell. Speed should barely change (4,096 cells against about a thousand animals with brains).
- Step 3A is moderate.
- Each step is a few sessions of work. Cloud runs as before, about $1 to $2.50 per screen or confirmation, always estimated and approved first.

## Decisions for the owner

1. **Nutrients:** dietary nutrients (A, recommended) or full matter cycles (B)?
2. **Where it lives:** a new branch, `phase-9-living-plants`, after merging `phase-9-predator-life` into main and pushing it (with your go-ahead).
3. **Order:** steps 1 then 2 then 3, with a check-in after each? Or start with the toxins, which reuse today's fixed kinds and could be tried sooner?
