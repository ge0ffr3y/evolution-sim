# Phase 9 plan, part 2: the grand-world audit (approved 2026-10-20: baseline with 15% mending, recommended run lengths and order)

**Goal:** before any long runs or headline experiments, test every factor that plays into the grand world, find what is broken, too strong, too weak, doing nothing, or drifting, and decide what the grand world should contain. Everything runs in the cloud (c8g, on demand); the laptop only builds and checks the tools.

**Why the grand world first:** it is the world everything else is heading toward, and it is the one we understand least. In Phase 8e it settled on armed omnivores, and it slowly loses ground to harmful mutations (see "The baseline" below). Several suspects were tested one at a time on 4 seeds, and the spread between seeds was often larger than the effects.

## What "every factor" means

The config has 447 settings. Sorted by how they touch the grand world:

| | Settings | How they are tested |
|---|---|---|
| Used by the grand world (the core economy, brains, terrain, climate, weather, plant kinds, sharing, harmful mutations, luck, the land-damage trio, the old random catastrophes, seven kinds of disaster event, aging, kinship, disease, camouflage, colonies and cell types, sex, kill ownership, scent, reproduction) | about 320 | Every one is turned down and up (stage 2); every mechanism is switched off (stage 1) |
| Built but not switched on in the grand world (climate biomes and drinking, nutrients through food, colony physics and shared senses, toxicity, fat, stamina, contact bonding, the O4 fixes) | about 115 | Switched on one at a time (stage 3), to decide what joins the grand world |
| Only watch the world (species tracking) | 7 | Not tested: they cannot change what happens |

Mode switches (such as `brainMode` or `homeMode`) are tested by switching them, not by halving and doubling.

Some things are not settings: the order of steps in a tick, how a gene maps to a trait, how mutation works, the brain layout. These are covered by a **code review of each mechanism** alongside its stage 1 result (see stage 1).

## The baseline (decision 1)

The grand world preset as committed has harmful mutations with no mending. By tick 100,000 every animal carries 93 to 202 of them, upkeep is 5 to 9 times normal, and the number is still climbing (Phase 8e, O4). Measuring everything against a world in slow meltdown would blur every result, because each change would partly be measured by how it speeds up or slows down the meltdown.

**Recommendation:** run stage 0 on both the preset as it is and the preset with 15% mending (`mutationLoadMend` 0.15, which held the load near 15 and raised populations by a third to a half). Then screen everything else against **the grand world with 15% mending**. Whether mending goes into the preset is decided with the stage 0 evidence.

## The stages

Each stage is one experiment folder, launched only after I show you its estimate and you say yes.

### Stage A: tools (laptop, no cloud cost)

1. **New measures** (read-only, like the existing ones):
   - **energy budget:** each line of the energy ledger (sunlight in, plants eaten, meat eaten, digestion loss, upkeep, movement, sensing, attack, armor, brains, disease, aging and so on) per animal per tick, and as a share of all energy spent. This is where an exploit would show.
   - **causes of death:** killed, starved, killed by an event, and so on.
   - **genes at their limits:** for each gene, the share of animals within 0.05 of 0 or 1. A gene pinned at a limit in most worlds usually means its cost or benefit is set wrong.
   - **still changing at the end:** for the key measures, the trend over the last quarter of the run, so a slow drift (load, worn ground, fouling) is flagged instead of being averaged away.
   - **also:** disease (share sick), brain size, colony makeup, births blocked by soil or energy, and event deaths.
2. **Generating arms from a reviewed list:** a file listing every grand-world setting with its group, whether it is tested, and how it is turned down and up (normally half and double, kept inside its valid range; for shares between 0 and 1, halfway to each end). A command writes the experiment file from it, so 640 arms are never typed by hand, and you can read the list before anything runs.
3. **A comparison report:** for each arm against the control on the same seeds (the same seed gives the same map, so the comparison is paired and less noisy):
   - the change in each measure;
   - a 95% range from the spread between seeds;
   - the change in units of seed-to-seed noise.

   It writes a readable `report.md` with the red flags (below) at the top, plus a spreadsheet file. The report is committed; the raw results stay out of git.
4. **Tests:** the new measures do not change the world, generated arms are all valid, and the report's arithmetic is right on a small known case.

**Stage A result (built 2026-10-20):**
- **Cost breakdown:** `Simulation.costBreakdown()` is a read-only split of what the average organism pays per tick into 22 parts:
  - upkeep: body, repair for a long lifespan, the torpor gene, harmful mutations, luck, the toxin gene, colony saving, signaling, thirst, nutrient shortage, aging wear, sickness, stress and calm, fat, torpor rest, heat and cold;
  - movement, sensing, weapons, armor and brain.

  Its parts add up exactly, and it predicts what the ledger books to within 1% (tested). On a 20,000-tick grand world with mending it already shows harmful mutations at about 40% of upkeep and heat and cold at about 12%.
- **New measures:** `costs`, `energyBudget`, `deaths` (killed, starved, disaster), `births` (and why births were blocked), `condition` (age, hunger), `genesAtLimits`, `disease`, `brains`, `colonyMakeup`, `landHealth` (plant fill, soil, grazing damage, fouling, soil health, worn share, ash, where the matter sits). Also end-of-run trends (`trend_*`: the change over the last quarter as a share of its level) and `"measures": ["all"]`. Experiment files take `baseChanges`, applied to every arm.
- **Settings list:** `experiments/audit-settings.json`, drafted by `npm run exp -- settings`. It covers 446 settings: 278 are turned down and up (545 arms); the other 168 each give their reason:
  - 53 belong to climate biomes, which are off;
  - 31 are 0 here, so doubling does nothing (candidates for stage 3);
  - 26 are switches;
  - 7 only watch the world;
  - the rest belong to features that are off.

  Special rules:
  - shares kept from tick to tick (`chemDecay`, `homeMemoryDecay`) have how long they last halved and doubled;
  - multipliers that must stay at 1 or more have half their excess over 1;
  - shares and temperatures on a 0 to 1 scale go halfway to each end;
  - world size changes width, height and starting numbers together.

  `experiments/audit-2-doses` is generated from it: 546 arms × 4 seeds × 100,000 ticks. Estimate: about $6, 2.4 hours on a c8g.16xlarge.
- **Report:** `npm run exp -- report <folder>` writes `report.md` with:
  - the control's normal range;
  - the red flags above, each with a command to reproduce it;
  - the biggest effects on each key measure;
  - the arms with no clear effect.

  Every comparison goes to `results/comparisons.csv` (paired by seed, with a t-based 95% range and noise units). `check --build` builds every arm's world before any machine is paid for.
- **Stage 0 file:** `experiments/audit-0-baseline` (2 arms × 16 seeds × 1,000,000 ticks). Estimate: about $1.50, 46 minutes on a c8g.12xlarge.

### Stage 0: the baseline, long (16 seeds x 1,000,000 ticks, 2 arms)

The grand world as it is, and with 15% mending. All measures, sampled 200 times per run. Questions:
- Does each one reach a steady state, or keep drifting (harmful mutations, worn ground, fouling, population, diet)?
- What does a normal grand world look like (the range across 16 seeds), so later stages know what counts as unusual?
- This also answers the deferred erosion question (it is on in the grand world) and gives a first long look at the meat-eating question, at no extra cost.

It is not the 24-hour long-run lane (that stays on hold): each run is about half an hour to an hour.

**Stage 0 result (run 2026-10-20 on one c8g.8xlarge, 21 minutes, about 46 cents; report in `experiments/audit-0-baseline/report.md`):**

| | As committed | With 15% mending |
|---|---|---|
| Worlds that died out by tick 1,000,000 | **9 of 16** (at ticks 53,000 to 969,000) | 0 of 16 |
| Population (second half) | 317 on average; lowest 52 | 641 (458 to 739); lowest 185 |
| Harmful mutations per animal | 145, and 78% of all costs | 13.8, steady from tick 50,000 on, and 22% of costs |
| Births with two parents | 31% | 14% |

- **The meltdown is confirmed on 16 seeds.** Without mending, the grand world dies out in more than half the worlds within 1,000,000 ticks. **Recommendation: put `mutationLoadMend` 0.15 into the grand-world preset** (the owner's decision). It costs sex about half its share, as Phase 8d predicted.
- **With mending the world settles:** no key measure is still changing by more than 10% over the last quarter. Population peaks near 870 at tick 100,000 and settles at 630 to 670.

**Leads for stages 1 to 3 (all in the mended world):**
1. **Disease is dead.** No animal is sick in any sample of any world. Each world logs only 113 to 281 infections in 1,000,000 ticks, despite about 50 introductions and 19 outbreaks (of 20 hosts each), so every introduction dies out almost at once. Likely suspects: too few animals per area for contact (650 in a 512 world), and the strict match between a strain and its hosts (`diseaseWidth` 0.05).
2. **Erosion wears out most of the land, then levels off.** Worn ground (soil health under 0.5) rises from 2% at tick 100,000 to 57% at 500,000, then stays at about 61% (the deferred erosion question: it levels off, but far above the 20 to 30% we hoped for). Average soil health settles at 0.62.
3. **The land is grazed bare.** Plants stand at 4% of what the ground could hold (2.6 to 29%), grazing damage averages 0.74, and 97% of all matter sits in the soil. Births blocked for lack of soil nutrient: about 6 per 100 births.
4. **Animals shrink to the cheapest body allowed.** Over half the animals sit at the lower limit of 8 to 10 genes:
   - size, metabolism and sense range;
   - diet, attack and armor;
   - bonding and generosity.

   The trait ranges, not evolution, set their bodies. Small, slow-burning, unarmed plant eaters are what this world rewards.
5. **Hunting fades.** Kills fall from about 660 per 1,000 ticks at tick 50,000 to about 70 by tick 1,000,000. The highest diet gene in a world falls from 0.14 to 0.09, and no meat eaters appear in any world.
6. **Where the energy goes:**
   - Upkeep is 66% of what animals spend, made up of body 37%, harmful mutations 22%, heat and cold 10%, and the rest small; movement takes 20% and brains 9.5%.
   - Digestion loses 23% of what is eaten.
   - Brains shrink slowly (connections 10 down to 7.6).
7. **Diversity is low:** about 2 species, with a Shannon diversity of 0.63; colonies hold about 1 to 2% of cells.

Stage 1 should therefore look hard at disease, erosion, overgrazing and the trait ranges (what holds size, metabolism and the weapons at their limits).

**Owner's decision (2026-10-20): `mutationLoadMend` 0.15 is now in the grand-world preset.** (The `as-committed` arm of stage 0 now names `mutationLoadMend: 0` explicitly, so the file still describes what ran.)

**Sex with mending:** each world settles on its own share of births with two parents by about tick 100,000 (4% to 27% across seeds) and holds it. 12 of 16 worlds ended slightly lower than they began, and none clearly higher, so longer runs alone are unlikely to spread sex further. The audit's best leads for sex:
- disease: the Red Queen reason for sex is missing while disease never takes hold;
- finding a mate: the mate-finding settings are in stage 2;
- compounding harm: `mutationLoadSynergy`, added to the stage 3 candidates.

**Why disease is dead (laptop check, 2026-10-20; grand world, one new strain every 500 ticks, 30,000 ticks, 2 seeds per row):**

| Sickness cost (times normal upkeep) | Sick animals survive | Infected per new strain | Share sick |
|---|---|---|---|
| 30 (the grand world) | 5 to 6 ticks, none recover | 1.3 to 1.6 | 0.002% |
| 5 | 43 to 46 ticks, almost none recover | 7 to 11 | 0.1% |
| 1 (the default) | 87 to 98 ticks, a third to a half recover | 134 to 167 | 5 to 7% |
| 1, with strains matching a wider range of hosts (`diseaseWidth` 0.15) | about 90 ticks, nearly half recover | 1,400 to 1,900 | 27 to 29% |

A sick animal starves within about 6 ticks, before it meets anyone, so every new strain dies with its first host. Halving and doubling (stage 2) cannot find this: at half the cost (15) the sick still die within about 10 ticks. Three disease arms were therefore added to stage 1 (cost 5, cost 1, and cost 1 with wider matching), to see what a disease that can spread does to population, diversity and sex.

### Stage 1: switch each mechanism off (8 seeds x 200,000 ticks, about 40 arms)

From the baseline, one mechanism off at a time: terrain, climate, seasons, day and night, weather, harsh years, random catastrophes, each of the seven disaster events, plant kinds, brains (and separately memory, home, chemical signals, their body effects, appetite senses), kill ownership, scent trails, kin restraint, the tolerance gene, the herd bonus, sex (asexual only), harmful mutations, disease, camouflage, aging, litters, torpor, colonies, cell types, luck, sharing, founder variety, overgrazing, fouling, erosion, and thermal costs.

For each mechanism this shows what it does in the grand world, and whether it does anything at all. A mechanism that changes nothing beyond the noise is either too weak to matter or broken. As each result comes in, I read that mechanism's code against what it is meant to do: where its energy and matter go, hidden fixed numbers, and order effects. Anything found is fixed with a test before stage 2.

**Stage 1 result (run 2026-10-20 on one c8g.8xlarge, about an hour, about $1.30; 49 arms × 8 seeds × 200,000 ticks, none died out; report in `experiments/audit-1-switch-off/report.md`):**

Control: population 764 (638 to 874), about 2 species, plants standing at 5% of capacity, no animal ever sick, 6 genes pinned at their lower limit. Worn ground is still rising at tick 200,000 (Stage 0 shows it levels off near 60% by tick 500,000).

1. **Overgrazing is the biggest brake in the grand world.**
   - Switching it off nearly doubles the population (764 to 1,446). Switching off all three kinds of land damage more than doubles it (1,703), with kills up 3.6 times and meat in the diet up 2.2 times.
   - It is not an exploit: the land captures twice the sunlight overall (91,000 against 45,000 units per 1,000 ticks), and each animal eats and spends about as before.
   - Grazing damage averages 0.67 across the land, so overgrazing roughly halves what the whole world grows.
2. **Climate is the main brake on hunting.**
   - Without it, the population is 42% bigger and kills are 4 times higher. Meat in the diet rises from 3.7% to 10%, and feeding levels from 1.0 to 1.4: mixed eaters establish themselves, the first sign of a second feeding level in any grand world.
   - Its parts switched off one at a time (day and night, weather, harsh years, drift, the cost of heat and cold) do little on their own, so it is climate as a whole that holds hunting back.
   - Without terrain, the population is 35% bigger.
3. **Diversity:**
   - Without seasons, species alive rise from 2.0 to 3.8.
   - With only one kind of plant, diversity collapses (Shannon 0.56 to 0.02), worn ground triples (15% to 47%, still rising), and colonies fall by two thirds. Plant kinds hold up both diversity and soil.
   - A disease that can spread (cost 1, wider matching; 15 to 23% sick in 6 of 8 worlds) raises species alive from 2.0 to 3.2 without costing population. Sex did not rise in 200,000 ticks.
4. **Brains matter:**
   - Without them, the population is 27% smaller and deaths per animal rise by two thirds.
   - Births with two parents drop from 14% to 4%, so brains find mates. Plants are left uneaten (24% standing), so brains also find food.
   - Without sex (asexual only), the population is 13% smaller, costs are higher and brains are smaller.
5. **Disease at cost 5 is still dead; at cost 1 it comes and goes** (0.1% to 10% sick, depending on the world). It needs both a low cost and wider matching to become established.
6. **No clear effect (14):**
   - parts of the climate: day and night, weather, climate drift;
   - disasters: the old catastrophes, good years, and **all disaster events together**;
   - brains: memory, the sense of home, kill ownership;
   - social: the tolerance gene, the herd bonus;
   - colonies: cell types;
   - disease at cost 5 and at cost 1.

   Each is too weak to matter here or broken; per the plan, its code gets read before stage 2.
7. **Two ways of settling (to re-check, not an effect yet).** In several arms (no harsh years, no camouflage, no aging, no torpor), 3 to 5 of 8 worlds settle with 15 to 33% of plants standing and fewer animals, while the others match the control's 5%. All 8 control worlds happened to settle low, but Stage 0's control worlds range from 3% to 29%. So this is probably a second way the grand world can settle, not something those arms cause. Stage 4 re-runs them on fresh seeds.
8. **Pinned genes:**
   - Armor becomes pinned at its lower limit in 7 arms.
   - Generosity is freed when sharing is off (the gene then does nothing, so it drifts).
   - Without brains, the sex gene becomes pinned at its lower limit.

**Before stage 2:**
- read the code of the 14 mechanisms with no clear effect, and fix what is broken;
- decide with the owner whether overgrazing and climate are too strong, and what disease should be;
- note that 100,000-tick runs see the world before erosion has settled.

**Code review of the 14 mechanisms with no clear effect (2026-10-20).** For each one the code was read, its setting in the grand world checked, and its real strength measured in two saved control worlds (seeds 1 and 2 at tick 200,000) or in the Stage 1 data. **None of them is broken in the simulation.**

| Mechanism | Verdict | Evidence |
|---|---|---|
| Climate drift | **Not switched on** | It needs a cycle length (`climateDriftPeriod`), which the grand world leaves at 0 (no drift). Switching off its strength therefore changed nothing. |
| Day and night | Works; weak against the noise | Without it the world captures a third more sunlight (44,000 to 59,000 units per 1,000 ticks) and the population is 11% bigger. But sunlight varies 35,000 to 89,000 between seeds, so 8 seeds cannot confirm an 11% change. |
| Weather | Works; weak | Fronts of up to ±0.12 on a 0 to 1 temperature scale, drifting east and south. Growth shifts by less than the spread between seeds. |
| Old catastrophes | Works; big when it happens, but rare and random | A drought cutting growth by up to 80% for 15,000 ticks, an ice age 0.3 colder, a meteor that killed 23. Seed 2 had three droughts and an ice age in 200,000 ticks; seed 1 had none. With 8 seeds that luck hides the effect. |
| Good years | Works; brief | Growth up 37 to 78% for 2,000 to 3,700 ticks, about 4 or 5 times per 200,000 ticks: two or three generations each. |
| All disaster events together | Work; small next to the world | They cause about 0.02% of deaths (Stage 0). **Fires burn out within 3 to 70 ticks, after 4 to 200 patches (usually 5 to 30) of about 3,000, because overgrazing leaves no fuel.** Storms last 100 to 400 ticks. Floods cover 70 to 110 patches and move about 20 animals. Volcanoes kill 0 to 3 animals and cool the world by 0.07 to 0.09 for a few thousand ticks. Outbreaks start with 1 to 10 sick animals and die out at once (disease is dead). |
| Brain memory | Works (wired, stored, moved, saved); **unused** | 88 to 98% of brains write to memory, but brains read it no more often than inputs that are always 0 in this world (0.04 connections per input, the same as the baseline). |
| Sense of home | Works and is **used**, but **redundant** | 33 to 94% of brains connect to it, well above chance. Switching it off changes nothing, so it seems to duplicate what smelling plants already tells them (smell is used by every brain). |
| Kill ownership | Works; **irrelevant without meat eaters** | For 30 ticks the killer's claim counts in full and others' at 10%. It only matters when two animals want the same carcass, and meat is about 4% of the diet. |
| Tolerance gene | Works and evolves | It settles at 0.09 in one world (spare only the closest relatives) and 0.44 in another. Replacing it with the fixed rule changed kills on some seeds and not others, with no consistent direction. |
| Herd bonus | Works; **rarely applies** | Prey are on average only 4% harder to kill; the typical animal has no relatives within 8 units, and none has the full 30%. The population is too spread out. |
| Cell types | Works; **colonies too rare** | Within colonies, 41% of cells specialize (sensors 14%, feeders 10%, photosynthesizers 9%, armor 7%), but colonies hold 2.7% of cells, so specialists are about 1% of all animals. |
| Disease, cost 5 | **Dead** (see the disease check) | Sick animals starve within about 45 ticks; no world had sick animals at the samples. |
| Disease, cost 1 | Works, comes and goes | 0.1 to 10% sick depending on the world. It needs wider matching as well to take hold (the cost-1-wide arm). |

**What this means:**
- Most of the "no clear effect" mechanisms are real but small, and the grand world is noisy.
- Many are held back by the same few things:
  - a sparse population (herds, disease);
  - bare, overgrazed land (fires);
  - no meat eaters (kill ownership);
  - few colonies (cell types).
- Stage 2 with 4 seeds will detect only large effects. Effects as small as day and night (11%) need 16 or more seeds.

**Found, not yet fixed:**
- Tooling: the settings list counts `climateDriftAmplitude` as active although drift is off (2 wasted stage 2 arms).
- Tooling: the colony makeup measure reports 0% generalists, instead of 100%, when cell types are off.
- Open question: switching off kin restraint, together with the herd bonus and kin-only sharing, cut kills from about 330 to about 90 per 1,000 ticks on all 8 seeds. This matches the Phase 8e (O4) finding that the social traits somehow support aggression. Which part does it, and why?

**Decisions for the owner before stage 2:**
1. Switch on climate drift in the grand world, or leave it off?
2. Should disasters matter more (bigger or more frequent), or stay as background?
3. What should disease be (a cost near 1 with wider matching makes it spread)?
4. Overgrazing halves what the world grows: leave it, or soften it?
5. 4 seeds for stage 2 as planned (about $6, finds large effects only), or 8 (about $12)?

### Stage 2: turn every setting down and up (4 seeds x 100,000 ticks, about 640 arms)

Each of the about 320 grand-world settings at half and at double (or halfway to each end), one at a time. 4 seeds is enough to spot big effects and cliffs, not small ones; anything flagged gets more seeds in stage 4. The output is a map of which settings the grand world is sensitive to, which barely matter, and where a small change causes a collapse.

### Stage 3: candidates to join the grand world (8 seeds x 200,000 ticks, about 16 arms)

Each built-but-off feature added on its own:
- climate biomes with drinking;
- nutrients through food, levels 1 and 2;
- colony protection;
- colony upkeep savings;
- shared colony senses;
- toxicity;
- the fat reserve;
- stamina;
- contact bonding;
- the O4 fixes (hunger overriding kin restraint, the hunter's eye, bigger and richer meals, mating by diet);
- rare big mutations;
- compounding harmful mutations (`mutationLoadSynergy`, each one hurting more than the last, which in theory favours sex).

The question for each is whether the world gets richer (more feeding levels, more species, steadier populations) or merely harder.

### Stage 4: confirm (16 fresh seeds x 200,000 ticks, the flagged arms)

With about 700 comparisons, a few will look important by pure chance. So every red flag and every promising finding is re-run on 16 new seeds before anything is changed. Only what holds up there becomes a fix or a preset change.

### Stage 5 (optional, after stage 4): settings working together

The settings that mattered most (perhaps 20 to 30) varied all at once, in random combinations spread evenly across their ranges (about 400 runs). This finds pairs that only matter together (for example camouflage and kinship, which O4 suggested compound). It is worth doing only if stages 1 to 4 leave the grand world unexplained.

### Then: grand world v2

A proposed new preset, the fixes, a devlog entry and the Obsidian log. Then the long-run lane and the headline experiments come off hold, on a world we understand.

## Red flags (decided before the runs, so the results cannot steer them)

- **Collapse:** any seed dies out, or the population falls below a fifth of the control's.
- **Dead mechanism:** switching it off changes no measure by more than the seed-to-seed noise.
- **Cliff:** half or double moves a measure by more than three times the noise, or the two directions disagree wildly (a sign of a threshold inside the range).
- **Pinned gene:** a gene's average stays within 0.05 of 0 or 1 in most seeds.
- **Runaway:** a measure still clearly trending over the last quarter of a 1,000,000-tick baseline run.
- **Exploit:** one energy-ledger line takes an implausible share, or one trait combination explodes. Check the ledger before celebrating anything that looks too good.
- **Too noisy:** the seeds disagree so much that the arm cannot be judged; more seeds in stage 4.

## How you can see each result

Each stage's `report.md` lists the red flags first, with the seed and setting to reproduce each one in the viewer (preset plus `--set` changes, or a saved world). The few worth seeing get a chart or a screenshot in the devlog.

## Cost and time (c8g on demand, from the speed test; includes the 1.5x allowance)

A 100,000-tick grand world takes about 2 minutes on one c8g core. Core time costs about 4 cents an hour on a 64-core c8g.16xlarge ($2.55 an hour).

| Stage | Runs | Core-hours | Machine and wall time | Cost |
|---|---|---|---|---|
| A: tools | (laptop) | - | - | $0 |
| 0: baseline | 32 x 1M | about 20 to 30 | 32 cores, about 1 to 1.5 h | about $1 to 2 |
| 1: switch off | about 320 x 200k | about 30 to 45 | 64 cores, about 1 h | about $2 to 3 |
| 2: down and up | about 2,560 x 100k | about 90 to 130 | 64 cores, about 2 to 3 h | about $4 to 6 |
| 3: candidates | about 130 x 200k | about 12 to 18 | 32 cores, about 1 h | about $1 |
| 4: confirm | about 600 x 200k | about 55 to 80 | 64 cores, about 1.5 h | about $3 to 4 |
| 5: together (optional) | about 400 x 200k | about 35 to 55 | 64 cores, about 1 h | about $2 to 3 |
| **Total** | | | | **about $13 to 19** |

October's spend so far is $6.70 of the $50 cap, so this fits, with room for reruns. Each launch still shows its own estimate and waits for your yes; populations that grow bigger than expected make runs slower, and the hard stop caps every machine.

## Decisions for the owner

1. **The baseline:** screen against the grand world with 15% mending (recommended), or against the preset as it is?
2. **Run lengths:** 100,000 ticks for the down-and-up screen and 200,000 for the switch-off, candidate and confirm stages (recommended). Longer is safer for slow mechanisms (erosion, aging, the ratchet) but costs about twice as much. The stage 0 runs show which mechanisms are slow, and those can be re-run longer in stage 4.
3. **The candidates list in stage 3:** anything to add or drop?
4. **The order:** A, 0, 1, 2, 3, 4 (recommended), checking in after each stage with its report before launching the next.
