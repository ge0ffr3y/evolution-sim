# Living plants: findings

Plan: `docs/plans/living-plants.md`. Branch `phase-9-living-plants`.

## 1. Plants that evolve (step 1)

**Built:** `plantEvolution` (off by default; tests in `livingplants.test.ts`).
- Each food cell carries a plant genome: chemistry (read by the palate gene), the time of year it grows best, and its best temperature.
- Ground eaten bare is reseeded from a neighbouring cell standing tall, and every seed mutates a little.
- It starts as the grand world's three kinds. With seeding off, a world plays out exactly as one with fixed kinds (tested).

To watch it: the preset "Grand world: living plants", with the overlays Kinds of plant and Plant warmth.

**Experiment:** `living-plants-1`. The grand world against the grand world with plants that evolve. Seeds 3501 to 3508, 300,000 ticks, 16 cores, about $0.35.

**Plants adapt and diversify on every seed** (start → second half of the run):

| | Range over the 8 seeds |
|---|---|
| Plants' best temperature against the local average temperature (correlation) | -0.20 to 0.22 → **0.61 to 0.76** |
| Gap between plants' best temperature and the local temperature | 0.17 to 0.20 → **0.09 to 0.10** |
| Distinct plant chemistries (effective number, out of at most 10) | 3.0 → **8.5 to 9.1** |
| Growing seasons (0 = all the same time, 1 = evenly spread) | 0.94 to 1.00 → 0.64 to 0.92 |

**Animals follow the plants, but the world is no richer:**

| | Grand world | With plants that evolve |
|---|---|---|
| Distinct palates among animals (effective number) | 3.9 | **8.4 (+113%*)** |
| Population | 1,243 | +9% |
| Species | 7.9 | -11% |
| Species diversity | 1.65 | -17% |
| Feeding levels | 1.98 | **-8%*** |
| Meat in the diet | 0.144 | **-24%*** |
| Births with two parents | 0.33 | **-19%*** |
| Plant eaters' births per animal per 1,000 ticks | 2.8 | 2.7 |
| Worlds with a lasting meat-eating group | 0 of 8 | 0 of 8 |

(* holds up, 8 seeds)

- Plant eaters spread their palates over many more plant chemistries, but that does not split them into more species. Species and diversity lean lower (neither holds up).
- Plant eaters do not breed faster. Less meat is eaten and there are fewer feeding levels: with food that suits them nearly everywhere, fewer animals turn to meat.
- **Against the plan's "Done when":**
  - Plants in cold places evolve to like the cold: met, on all 8 seeds.
  - Chemistry spreads into many kinds: met.
  - Patches with stable borders: seen on the overlay, but not measured.

## 2. Poisonous plants (step 2)

**Built:** `plantToxins` (off by default; needs plants that evolve; tests in `livingplants.test.ts`).
- Each plant genome gains a toxin gene. It starts at 0 and is inherited through seeds with mutation.
- Toxin slows the plant's growth (by 30% at full toxin).
- An animal eating it loses plantToxinHarm × toxin × palate mismatch × the plant energy it took, on the upkeep line. An animal whose palate matches the plant's chemistry is not harmed.
- Smell and steering weigh plants by their worth less the harm.

To watch it: the overlay Plant toxin.

**Experiment:** `living-plants-2`. The grand world; plants that evolve; plants that evolve with toxins. Seeds 3601 to 3608, 300,000 ticks, 32 cores, about $0.70. (The owner's computer crashed during the run. The cloud machine was unaffected and finished.)

**Toxin evolves on every seed and is still rising at the end:**
- Average toxin 0 → 0.15 at mid-run → 0.18 to 0.27 at the end.
- Share of land with toxin above 0.3: 0 → 19 to 44% at the end.
- Toxin is patchy (spread 0.10 to 0.13 between cells).

Mutation can only push toxin up from 0, so part of the rise may be drift rather than selection. A setup with toxin that does no harm would tell the two apart.

| | Grand world | Plants that evolve | Plants that evolve + toxins |
|---|---|---|---|
| Plants standing | 0.081 of capacity | 0% | **+40%*** |
| Population | 1,208 | **+25%*** | +11% |
| Species | 7.4 | -7% | -8% (2.4 to 10.6 between seeds) |
| Distinct palates (effective number) | 3.8 | 8.7 | 8.2 |
| Plant eaters' births per animal per 1,000 ticks | 2.5 | 2.2 | 2.8 |
| Meat in the diet | 0.132 | -22% | -5% |
| Kills | 2,161 per 1,000 ticks | -1% | +26% |
| Births with two parents | 0.33 | -11% | **-15%*** |
| Share of cells in colonies | 0.055 | +3% | **+21%*** |
| Worlds with a lasting meat-eating group | 0 of 8 | 0 of 8 | 0 of 8 |

(* holds up, 8 seeds)

- **Grazers avoid poison, so more plants stand** (+40%), and poisoned patches act as refuges for plants.
- **Poison does not split plant eaters into specialists here.** Palate variety is a little lower than with plants that evolve alone, and species are unchanged.
- Plant eaters breed a little faster with toxins (2.8 against 2.5) and kills rise, but neither holds up on 8 seeds, and no meat-eating group lasts.
- One red flag: with plants that evolve (no toxins), most animals end up with the attack gene at its lowest (newly pinned). Food that suits everyone nearly everywhere takes away the reason to fight.
- Step 1's population gain (+9% there, not holding up) is +25% here and holds up.
