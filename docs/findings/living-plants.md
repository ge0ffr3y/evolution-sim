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

## 3. Dietary nutrients (step 3), and is toxin chosen or chance?

**Built:** `dietNutrients` (off by default; needs kinds of plant or plants that evolve; tests in `livingplants.test.ts`).
- Food holds three nutrients. A plant's mix follows its chemistry, and meat is an even mix.
- Animals keep three reserves, and running short (below half) costs upkeep.

To watch it: color the dots by Nutrient balance.

**Experiment:** `living-plants-3`, six setups, seeds 3701 to 3708, 300,000 ticks, 48 cores, about $1.10.

**Nutrients as set by default barely bite.**
- Only 3 to 4% of animals are short of a nutrient at any time, and the average lowest reserve stays at about 0.88 (on a scale where 0.5 is short).
- Food refills reserves much faster than they drain (0.001 a tick), so even an animal eating one kind of plant keeps up.
- So none of the changes from nutrients hold up: with fixed kinds, species -1% and meat -8%. That says nothing yet about nutrients that matter; the default rates are too gentle.

**Toxin is chosen, not only chance.**

| Average toxin at the end | Range over 8 seeds |
|---|---|
| Toxin that harms (and slows the plant's growth) | 0.18 to 0.28 |
| The same with nutrients | 0.17 to 0.30 |
| Harmless toxin (no harm, no growth cost: chance alone) | 0.12 to 0.17 |

All eight harmful-toxin worlds end above every harmless one (lowest 0.18 against highest 0.17), even though toxin there also slows growth. Chance explains most of the level, and selection adds about a third more toxin, and twice the share of land with toxin above 0.3 (16% against 8%).

**Every setup with plants that evolve cuts meat in the diet by 21 to 33%** (holds up in all four), as in steps 1 and 2. No setup kept a lasting meat-eating group (0 of 8 each).

| Against the grand world | Population | Species | Meat in the diet |
|---|---|---|---|
| Nutrients (fixed kinds) | -5% | -1% | -8% |
| Plants that evolve + nutrients | +25% | +8% | **-33%*** |
| Plants that evolve + toxins + nutrients | +12% | +11% | **-21%*** |
| Plants that evolve + toxins | +13% | +1% | **-22%*** |
| Plants that evolve + harmless toxins | **+21%*** | +16% | **-22%*** |

(* holds up, 8 seeds)

## 4. Nutrients that bite (`nutrient-doses`)

The default nutrient use (0.001 a tick) was too gentle. A plant eater takes in about 0.0075 breedings' worth of food a tick. With `dietPlantSkew` 0.8, one kind of plant brings about 0.0015 of its poorest nutrient and a mixed diet about 0.0075 of each, so this screen sets use between the two.

**Experiment:** the grand world against:
- use 0.004;
- use 0.004 with pure plants (each kind holds only its own nutrient);
- use 0.006;
- use 0.004 with plants that evolve.

Seeds 3801 to 3808, 300,000 ticks, 48 cores, about $1.10.

**Now nutrients bite, and mixing pays a little:**

| | Animals short of a nutrient | Lowest reserve: plant eaters | Lowest reserve: mixed and meat eaters |
|---|---|---|---|
| Use 0.004 | 49% | 0.43 | 0.57 |
| Use 0.004, pure plants | 72% | 0.25 | 0.40 |
| Use 0.006 | 75% | 0.24 | 0.39 |
| Use 0.004, plants that evolve | 48% | 0.44 | 0.55 |

**What it does to the world** (against the grand world: 1,386 animals, 8.9 species):

| | Population | Deaths | Life span | Species | Meat in the diet | Kills | Mixed eaters (diet 0.25 to 0.5) |
|---|---|---|---|---|---|---|---|
| Use 0.004 | -19% | +52% | -35% | -26% | +7% | **+32%*** | 99 (against 69) |
| Use 0.004, pure | **-23%*** | **+54%*** | **-38%*** | -5% | +13% | **+36%*** | 120 |
| Use 0.006 | -11% | +36% | -20% | -8% | -3% | +18% | 91 |
| Use 0.004, plants that evolve | -4% | **+48%*** | **-38%*** | **-31%*** | -16% | **+41%*** | 96 |

(* holds up, 8 seeds)

- **Lives get shorter and turnover faster.** Plant eaters now breed at 3.1 to 3.3 births per animal per 1,000 ticks (2.1 in the grand world). That is the faster-breeding prey finding 13d pointed to, here from shortage deaths rather than plenty.
- **There are more kills and a few more mixed eaters,** and feeding levels rise a little with pure plants (+2%*).
- **Still no lasting meat-eating group (0 of 8 in every setup).** The share of animals eating mostly meat stays under half a percent.
- **With plants that evolve, nutrients cost a third of the species** (-31%*).

## Where living plants stand

All three steps are built, off by default, tested on GitHub and checked on 8 seeds.

- Plants adapt to their land and diversify.
- Toxin is selected beyond chance.
- Nutrients can be set to bite, and then mixing pays a little.

None of it makes meat eaters last in the grand world:
- plants that evolve cut meat eating by a fifth to a third;
- nutrients that bite raise turnover and kills, but at a cost in lives and, with evolving plants, in species.

The richer plant world is a real addition to watch (overlays for chemistry, warmth and toxin, and the nutrient balance color). It does not answer the meat-eater question.
