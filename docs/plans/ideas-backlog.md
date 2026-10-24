# Ideas backlog

Ideas the owner raised that are not started yet, kept here so they are not lost. Each becomes a proper plan (proposed before any code) when its turn comes.

## Plants that evolve, and many more kinds of plant (raised 2026-10-23)

The owner's idea: plants are too simple for a realistic outcome. Today a world has 1 to 6 fixed kinds of plant (the grand world uses 3). Each grows in patches, peaks at a different time of year, and is digested according to an animal's palate gene. Plants do not evolve.

What the owner wants explored:
- **Many more kinds of plant**, possibly plants that evolve (new kinds arising, spreading and dying out).
- **Several nutrients, not one.** Each plant kind holds different amounts of each, so a diet is a mix and animals can be short of one nutrient but not another.
- **Toxic plants:** some kinds are poisonous to some animals, so what is food for one species is poison for another.

Things to look at when this starts:
- Today there is one nutrient (the soil nutrient, carried in plants as `plantQ` with nutrientMode 2, and in animals' nutrient stores).
- The palate gene and plant kinds (`plantTypes`, `palateMatch`) are the starting point for "who can eat what".
- The toxicity gene already makes animals poisonous to eat. Plant toxicity would be the plant-side version.
- Plant evolution would need a plant genome per cell or per patch, and mutation and spread rules. That is a big change, so it should be optional and off by default like everything else.

## The gut, rest and prey condition (raised 2026-10-23)

Done on branch `phase-9-predator-life` (devlog 23, findings 12 to 13d): all built, off by default; none makes meat eaters last in the grand world on 16 seeds.
