# Phase 8e plan: ecology overhaul

Written after the owner's notes from a 5-million-tick grand-world run. The grand world (`configs/grand-world.json`) is the world that matters most. Nothing here is built yet.

**How to work** (any model):
- Read `CLAUDE.md` first. Its hard rules always apply: seeded randomness only, exact arithmetic in sim-core, every energy flow in the ledger, matter conserved, no hard-coded roles.
- Work on branch `phase-8e-ecology`, with one commit per task.
- **Every new mechanic is optional and off by default.** Old worlds and the brains-off golden fingerprints must not change. Run `npx vitest run packages/sim-core/src/golden.test.ts` after each task.
- **Every task needs tests:**
  - the mechanic does what it says;
  - it is off by default;
  - determinism (two runs give the same fingerprint);
  - energy and matter conservation to 1e-9 (copy the pattern in `chemicals.test.ts`);
  - save and reload carries on exactly;
  - the snapshot guard in `snapshot.test.ts` lists any new scratch fields.
- **Every task gets a small evidence check:** a few seeds with and without the feature, reporting the numbers that show it does something. Keep runs small on the laptop (6 seeds, at most 100,000 ticks, at most 7 processes at once). Always launch long runs with `nohup` and confirm the processes are up. Tell the owner truthfully whether a run is still going or finished.
- Explain each change to the owner in plain English: what changed in the sim's behavior, and how to see it (which chart, layer or preset).
- Run `npm test` and `npm run typecheck` before every commit. Never merge, push or deploy without the owner's go-ahead.
- At the end of the Sonnet batch: write `docs/devlog/0013-*.md` and append it to the Obsidian devlog. Tick verified items in the Obsidian roadmap (Phase 8e section). Turn the finished mechanics on in `configs/grand-world.json`, with a quick 3-seed smoke test (not long pilot runs).

**Order:**
1. The Sonnet batch S1 to S7, in order.
2. Then switch to Opus for O1 to O4. O1 must come before O4. O2 and O3 can go in either order.

---

## Sonnet batch

### S1. Brain size chart: colors and width (owner's note 5)
- **Where:** `apps/viewer/src/charts.ts` (the `brainChart` series around lines 126 to 160) and `main.ts`, where `brain-chart-block` is shown.
- **Colors:**
  - thinking-unit lines: plant eaters `#5aa9ff` (blue), meat eaters `#ffa94d` (orange), still dashed;
  - connection lines keep green and red.
  - Update the hint text in `index.html` to name the colors.
- **Width:** the chart is sized while its block is hidden, so it falls back to 280 px. Re-size it when the block is un-hidden, and with a `ResizeObserver` on its container, as the other charts do.
- **Check:** open the "Brains: evolvable layout" preset in the viewer. All charts are equally wide, and the four lines are distinguishable.

### S2. Split the "births blocked" counter (owner's note 2, measurement only)
- **Now:** `blockedBirths` counts both causes (`simulation.ts`, two places near the births code): soil too poor for the baby's body, and the parents' share too small to pay for the baby's body energy.
- **Change:** two counters, `blockedBirthsSoil` and `blockedBirthsEnergy`, saved in the snapshot state like `totalBirths`. Keep `blockedBirths` as their sum for old code.
- **Viewer:** show both in the stats panel ("Births blocked: poor soil / not enough energy").
- **Runner:** add CSV columns for both.
- **Evidence:** report the split for the grand world (3 seeds, 50,000 ticks). This tells O1 how big the soil problem really is.

**S2 result (done).** Three counters: `blockedBirthsSoil`, `blockedBirthsEnergy` and `blockedBirthsBoth` (one blocked attempt can be short of both soil and energy), and they always add up to `blockedBirths`. Shown in the viewer ("Births blocked: soil / energy / both") and as CSV columns. Brains-off golden fingerprints are unchanged.

**What the split showed (grand world, `configs/grand-world.json`):**
- Over the first 50,000 ticks blocked births are negligible (5 to 100 against 77,000 to 88,000 births).
- **Over a long run, soil blocking grows steadily and energy blocking never does (confirmed in all 4 worlds run to 500,000 ticks; the last 100,000 ticks blocked 21,447 to 71,820 soil attempts per world, against at most 99 energy-blocked births over the whole of any run).** Seed 3: blocked attempts per 100,000 ticks went 1,945, 16,646, 33,226, 56,137, 71,820, against births falling from 154,367 to 50,125, so by 500,000 ticks more attempts are blocked than succeed. Seed 2 has the same shape (764 up to 43,542). Over the whole run 99.98% of blocks were soil, and energy blocked at most 22.
- **The soil is not gone; it is in the wrong places.** Total matter stays constant and about 100,000 of it sits in the soil throughout. But the number of cells with under 1 unit of nutrient grows from 1,077 to 1,736 of 4,096 (about 1,024 of those are empty water from the start), and the richest single cell grows from 83 to 243. On land, nutrient-poor cells go from about 2% to about 23%. Matter flows from where animals eat and breed to where they die, and nothing carries it back.
- **Implication for O1:** moving to "babies are built from the parent's food store" removes the blocked-birth freeze directly. A small separate fix, soil nutrient slowly mixing between neighboring cells (like leaching or wind), would stop the permanent hotspots and deserts in the meantime. Proposed as S2b below.

### S2b (proposed, not built): soil nutrient mixing
- `nutrientDiffusion` (default 0 = off): each tick every pair of neighboring land cells exchanges `nutrientDiffusion × (difference) / 4` of soil nutrient. The flow is symmetric, so total soil nutrient is exactly conserved. Water cells act as walls.
- Also a viewer "Soil nutrient" map layer already exists, so no new layer is needed.
- Tests: conservation to 1e-9, a point of nutrient spreads out and the total stays the same, water blocks flow, determinism, save and load.
- Evidence: the same long grand-world runs, counting soil-blocked births per window and poor-land cells with and without it.

### S3. Overgrazing (owner's note 1a)
- A plant cell grazed down to below `overgrazeBelow` of its capacity (default 0.15) gains damage. Damage rises by `overgrazeDamage` per tick while that low (default 0.002, capped at 1) and heals by `overgrazeHeal` per tick otherwise (default 0.0005).
- Plant growth in the cell is multiplied by `1 - overgrazePenalty × damage` (penalty default 0.7).
- **On/off switch:** `overgrazeDamage` > 0. Default 0, so it is off.
- **Implementation:**
  - one Float32Array per food cell;
  - add it to `landArrays()` so it is saved;
  - apply it where `potential` is computed in the plant growth loop.
  - It only changes how fast plants grow, so the energy ledger is unaffected (sunlight in is what actually grows).
- **Viewer:** a "Grazing damage" map layer.
- **Evidence:** compare plant cover and how far animals travel (mean distance from birthplace, or the home distance input if brains are on) with and without, 6 seeds.

**S3 result (done).** Overgrazing built as specified (`overgrazeDamage` > 0 turns it on; saved with the land only when on, so older saved worlds still load; a "Grazing damage" map layer; preset "The grand world with overgrazing", a full copy of the grand world plus overgrazing because presets cannot extend one another).

**Two things the evidence changed:**
- **The planned defaults were wrong.** "Bare" was set to under 15% of capacity, but in the standard world cells are below that 94% of the time (below 1% about half the time, with no difference between cells), so every cell was damaged and the effect was a blanket growth penalty (population 651 down to 275). Defaults are now: bare = under 1% of capacity, damage 0.003 per tick (set by the preset), healing 0.001, penalty 0.7. In the grand world, how often a cell is bare ranges from never to over a quarter of the time, so damage is patchy there.
- **It only makes sense in a varied world.** In terrain plus seasons alone, 74% of the ground was damaged; in the grand world about 24%. The config comment says so.

**Effect in the grand world (6 worlds, 150,000 ticks):** off 1,124 animals; moderate (0.003) 735 animals (35% fewer), 24% of ground damaged, 1 of 6 worlds nearly died out; strong (0.01, penalty 0.9) 325 animals. Mean speed rose about 9% but animals were not more spread out (density spread 0.84 to 0.88), so the push toward moving on is weak. A brain sense of ground health would be the natural follow-up. Not yet turned on in the plain grand world, because of the population cost.

### S4. Fouling (owner's note 1b)
- Every animal adds `fouling × its body size` per tick to a per-cell fouling index. The index decays by `foulDecay` per tick (default 0.01).
- It reduces plant growth by `1 / (1 + foulGrowthEffect × index)`, and multiplies disease transmission in that cell by `1 + foulDiseaseEffect × index`.
- **On/off switch:** `fouling` > 0. Default 0, so it is off.
- **It is an index, not matter.** Document that clearly: dung as real matter comes with O1, and this index is crowding and contamination. Saved in `landArrays()`.
- **Viewer:** a "Fouling" map layer.
- **Evidence:** crowded worlds should see animals spread out more and disease rise where they cluster.

**S4 result (done).** Fouling built (`fouling` > 0 turns it on; saved with the land only when on; a "Fouled ground" map layer scaled to the busiest cell; preset "The grand world with fouling", a copy of the grand world plus fouling).

**Design changed after measuring.** The plan's absolute index did nothing in the standard world (every cell sits near 0.8, so no cell passed any fixed line) and was meaningless in the grand world (typical 0.05, busiest 1.3). It is now relative: a cell is crowded when its fouling is more than `foulFree` (default 2) times the average over all land, and the effects scale with how many times the average it is beyond that (`foulGrowthEffect` 0.2, `foulDiseaseEffect` 0.3). The index is still not matter (documented in the config).

**Effect (6 worlds each, 150,000 ticks):**
- Grand world: 16% of land crowded; population 1,124 down to 644 (43% fewer); animals slightly MORE clumped (density spread 0.84 to 0.90), not less.
- Standard world with disease: 4% crowded; population 634 down to 487 (23% fewer); infected share 21% to 19%.
- Disease did not spread at all in the grand world's second half, so the disease effect is untested there.

**Finding shared with S3:** both ground-damage mechanics only cut the population (about 25 to 45%) and barely move animals, because animals cannot sense damaged ground. **Recommendation: add one "how healthy is the ground here" brain input (grazing damage and fouling) as part of O2, the Opus water and moisture work, since both change the brain layout.** Not yet turned on in the plain grand world, because of the population cost.

**Clean-up note for the end of the batch:** `configs/grand-world-overgrazing.json`, `configs/grand-world-fouling.json` and `configs/grand-world-erosion.json` are copies made only so the layers could be seen. Delete them once the finished mechanics are switched on in `grand-world.json`.

### S5. Erosion (owner's note 1c)
- A per-cell fertility factor (start 1, range `erosionMin` default 0.4 to 1).
- It falls by `erosionRate` per tick (default 0.00005) while the cell's standing plants are below 10% of capacity, and recovers by `erosionRecovery` per tick (default 0.00002) while above 50%.
- It multiplies the cell's `foodCapacity`. Use a separate multiplier array so the base capacity is kept.
- **On/off switch:** `erosionRate` > 0. Default 0, so it is off. Saved in `landArrays()`.
- **Matter:** erosion changes how much plant a cell can hold, never moves or deletes matter, so the matter audit is unaffected.
- **Viewer:** a "Soil fertility" map layer.
- **Evidence:** long-grazed areas thin out and recover after the population moves on.

**S5 result (done).** Erosion built (`erosionRate` > 0 turns it on; a per-cell soil health, saved with the land only when on; a "Worn-away soil" map layer scaled to the most worn cell; preset "The grand world with erosion", a copy of the grand world plus erosion).

**Two deviations from the plan, both from measuring:**
- **Fertility lowers the regrowth speed as well as the ceiling.** The plan said only the ceiling (capacity). But ground that erodes is by definition bare, nowhere near any ceiling, so a lower ceiling there would do nothing. Soil health now multiplies both. Plants already standing are never deleted when the ceiling falls (so no matter vanishes); the cell just stops growing until it is back under it.
- **The trigger lines were recalibrated.** "Below 10% / above 50% of capacity" would have eroded everything in the standard world. Now: erode while bare (under 1% of capacity, the same line as overgrazing), recover above 10%.

**What the long runs showed (grand world, 4 worlds per arm):**
- The first defaults (0.00006 / 0.00002) were too harsh: 42% of the ground at the floor by 200,000 ticks, 56% by 600,000, plant cover 37% down to 9%. A trap: eroded ground regrows slowly, stays bare, keeps eroding, and never reaches the 10% cover needed to recover.
- **No setting tried reaches a stable balance within 300,000 ticks.** Worn ground keeps creeping up even at the gentlest (0.00001 / 0.00004): 5%, 11% and 15% worn at 100k, 200k and 300k ticks, 7% at the floor at 300k. The preset uses that. A million-tick check was started to see whether it levels off.
- **Population is hardly affected** (689 with default erosion against 466 without at 600,000 ticks), even though plant cover fell a lot, because other limits (soil nutrient, see S2) bind first.
- **Standard world:** 98% of the ground at the floor (all cells are bare about half the time), as the config comment warns. Not meaningful there.

### S6. Warning colors: a toxicity gene (owner's note 4)
- **New gene `toxicity`** (the 27th; add it to `genome.ts`), active when `toxinStrength` > 0. Default 0, so it is off.
- **Cost:** upkeep rises by `toxinUpkeep × gene` (default 0.15). Fold it into `basalCost` in `express()`.
- **Effect on eaters:** whoever eats meat from a toxic animal (a kill or a corpse) loses `toxinStrength × gene × meat energy eaten` extra energy.
  - Track per-cell corpse toxicity: the toxicity of the dead animals, weighted by matter, like corpse energy.
  - Count the loss as heat on the **basal** line, so the existing conservation test still covers it.
- **Learning to avoid:** mirror the camouflage "search image" code (`searchHue`, `hasImage`, `detects()`).
  - A hunter that eats toxic meat forms an avoid image: `avoidHue`, plus a strength that rises with the toxin dose and fades by `avoidFade` per tick.
  - In `considerPrey`, skip a prey whose hue is within `avoidWidth` (default 0.08) of the avoid image, with a chance equal to the avoid strength. Use a deterministic hash, like `detects()`, not a random draw.
  - Works with or without camouflage mode.
- **Founder spread:** add `toxicity` to the founder spread gene list.
- **Masks:** keep it in the species mask; it is a real trait.
- **Viewer:** a "Toxicity" dot color, a heatmap trait, an inspector label, and the gene label in `main.ts`.
- **Evidence** (6 seeds with predators, the standard world plus `toxinStrength`):
  - Does toxicity evolve in prey?
  - Do toxic lineages converge on shared colors (spread of hue within the toxic group against everyone)?
  - Do harmless mimics with the same colors appear?
  - Do species with signature colors appear?

**S6 result (done).** Toxicity built as specified (the 27th gene, `toxinStrength` > 0 turns it on; corpse toxicity per cell weighted by matter; poisoning costs energy as heat on the upkeep line; hunters poisoned within 3 ticks of their own kill remember the killed animal's color and avoid prey within `avoidWidth` of it, with a deterministic hash instead of a random draw; a Toxicity color mode, heatmap trait and inspector label; preset "Poison and learned avoidance", which is a short change to the standard world so it needs no grand-world copy). 10 new tests. A test caught a real bug: a newborn in a reused animal slot kept the old animal's color memory, so a reloaded world drifted; every memory field is now cleared at birth.

**What the evidence showed (standard world with predators, 8 worlds per arm, 300,000 ticks):**
- **Learned avoidance cuts predation sharply:** meat eaters 108 down to 85 (toxicity arising by mutation), 50 (a spread of toxicity in the first generation) and 15 (strong toxin); prey population 389 up to 800, 1,154 and 1,861.
- **Toxicity itself stays low** (mean 0.09 to 0.12; only 0 to 3% of prey strongly toxic) because it is a public good: prey mostly share one color, so one poisoning teaches hunters to avoid all of them, and non-toxic prey get the protection for free.
- **Distinct warning colors did NOT emerge.** The color gene is neutral and prey converge on almost one hue (concentration 0.89 to 0.99, for toxic and non-toxic prey alike), so there is no variety to signal with. Camouflage did not keep colors varied over a long run (0.91 to 0.98), and it weakened toxicity (prey toxicity 0.06 against 0.12) and its effect on predators (122 against 50 meat eaters), because hunters meet fewer poisonous meals.
- **Caution for O4 (meat eating in the grand world): toxicity is a powerful predator suppressor. Do not turn it on in the grand world until O4's diagnosis is done; if it is wanted, use a mild strength.**

**Deferred long run:** does sexual reproduction with color-based mate choice (`matePreference` 2) plus toxicity produce lineages with distinct colors and different toxicity? (Sex plus color choice is the one existing force that can split a population into color groups.)

### S7. Disaster framework (owner's note 8)
Replace the one-catastrophe-at-a-time system with an event engine. Keep the old settings working: `catastropheKind`, `catastropheAt` and so on map onto the new engine, so old presets behave as before. Test the ice-age, drought and meteor presets against their old fingerprints. If they can't stay identical, say so and re-record with the owner's OK.

- **The engine:**
  - a list of active events, several at once;
  - a separate random stream derived from the seed, like `terrain.ts` does, so turning events on doesn't reshuffle other randomness;
  - each event type has a mean interval, plus ranges for intensity, radius and duration, all drawn at random when it starts;
  - local events pick a random center (on land);
  - every event writes a line to the world events timeline.
- **Events.** Each says where destroyed energy and matter go, which is mandatory for the conservation tests.
  - **Ice age and drought:** as now, but intensity and duration drawn from ranges.
  - **Meteor:** as now, with a random radius.
  - **Wildfire (local):**
    - starts in a dry cell and spreads each tick to neighbors with chance based on how much plant is standing and how dry it is (low growth factor, or desert and grassland biomes once O2 lands);
    - burning cells lose their plants: plant energy goes to `decayLoss`, and plant matter goes **straight to soil nutrient**, which is the ash fertility boost;
    - animals standing in burning cells die as corpses (meteor pattern);
    - burns out after its duration or when nothing is left to burn.
  - **Storm (local):**
    - animals in the radius are pushed a random distance (deterministic stream), and movement costs double there for the duration;
    - a share of soil nutrient in the radius is moved to neighboring cells (moved, not destroyed).
  - **Flood (local):**
    - cells in the radius become impassable for the duration, like water;
    - their standing plants turn to detritus (energy to `decayLoss`);
    - animals caught there are moved to the nearest dry cell.
  - **Volcano (local):**
    - kills and burns like a fire in a small radius (matter to soil);
    - adds a short global cooling, like a mini ice age;
    - raises the soil-fertility factor (S5) around it for a long time. No new matter appears: it only raises how much plant the cells can hold.
  - **Plant blight:** one plant kind (or all, if `plantTypes` is 1) grows at a fraction of normal for the duration.
  - **Outbreak:** introduces a new, more virulent disease strain, if disease is on.
  - **Good year:** plant growth multiplied by a factor for a year. This is more sunlight, a real energy source, already counted as sunlight in.
- **Settings:** one config block per event type: interval, intensity range, radius range, duration range. All intervals default to 0 (off).
- **Viewer:** events in the timeline, and an "Events" map layer showing active local events.
- **Tests:** each event alone, then all of them together at high frequency, with conservation checked to 1e-9.
- **Evidence:** a seasonal world with all events on (6 seeds). Report how often each fired, population dips and recoveries, and fertility after fires and volcanoes.

**S7 result (done).** The event engine is built (`eventsStep()` in `simulation.ts`, settings `ev*` in `config.ts`, 17 tests in `events.test.ts`). Ten kinds, all off until their interval is above 0, any number running at once, each drawing size, radius and length from a range when it starts, all on a random stream of their own (`eventRng`, derived from the seed) so switching them on never reshuffles anything else: ice age, drought, meteor, wildfire, storm, flood, volcano, plant blight, outbreak, good year. Every start and end is written to the timeline, and there is a "Disasters" map layer (fire red, flood blue, storm grey, volcano ground purple) and a "Disasters" preset.

**One deliberate difference from the plan:** the old `catastrophe*` settings were NOT moved onto the new engine. They still run exactly as before, next to it. I checked: the ice-age, meteor-strike and random-catastrophes presets give bit-for-bit identical fingerprints before and after (with disasters forced to happen inside the run), and every golden test passes unchanged. Mapping them onto the new engine would have changed their random draws, which needs the owner's OK to re-record.

Where destroyed things go (all checked by the conservation test to 1e-9 with all ten kinds firing at once): burnt plants put their matter straight into the soil and their energy into heat; crushed plants (meteor, flood) become detritus; animals killed become corpses; a storm moves soil nutrient to the next cell downwind, it never destroys any; a flood flips `passable` and gives it back at the end; volcano ash is a separate `ash` array (not the erosion health factor, so it works without erosion) that raises plant growth and the plant ceiling around the crater and fades slowly.

**Design findings while measuring (the same lesson as before: absolute numbers do not travel between worlds):**
- Fire fuel judged against the plant ceiling did nothing: in the standard world most cells stand at 1 to 3% of capacity, so fire never spread. Fuel is now plant amount compared with the average land cell.
- The first default ice age (up to 0.4 colder for up to 6,000 ticks) wiped out the thermal-gene-free population in 2 of 6 worlds. Gentler defaults: ice age 0.05 to 0.15 colder for 1,500 to 4,000 ticks, drought 30 to 70%, blight leaves 30 to 70% of growth.
- Outbreaks are "more virulent" only by starting in about 20 animals close together and keeping them sick twice as long; transmission is still one world-wide setting because strains have no virulence of their own yet.

**Evidence (the "Disasters" preset, 6 seeds, 60,000 ticks; control = same world with every event off):**
- The control survived in 6 of 6 worlds (mean population 138 to 374). With events, 4 of 6 survived (extinct at tick 4,349 in one, 43,847 in another; both also went extinct in the harsher earlier setting). So in this small standard world (about 150 animals) disasters are a real extinction risk; in the 512 grand world, with thousands of animals, I expect far less, but have not measured it.
- Counts over 6 worlds: wildfire 40, storm 32, good year 22, blight 21, outbreak 14, drought 13, volcano 12, flood 11, meteor 9, ice age 4.
- Population after each kind (lowest point in the next 1,500 ticks as a share of the level before, and ticks to climb back to 90%; events overlap, so these are rough): blight 0.64 / 933, drought 0.57 / 109, outbreak 0.72 / 356, volcano 0.72 / 444, ice age 0.71 / 800, meteor 0.79 / 457, wildfire 0.78 / 329, storm 0.84 / 500, flood 0.87 / 120, good year 0.91 / 94 (a good year can still dip, because growth boosts last long enough to be followed by a bust). No event type is a clean one-off: all recover on average.
- **Fertility after fire and volcano** (burned ground now against the same ground before, divided by how the whole world changed over the same time): volcano ground grows about 1.35 to 1.9 times the plants of ordinary ground at 200, 2,000 and 8,000 ticks later, so the ash bonus is real and lasting. Fire shows NO lasting plant bonus (0.78, 0.87, 0.91 of before) and soil nutrient about 1.0: the ash is eaten by regrowing plants within a few ticks, and fires start on the best-fed ground, so "before" is a high bar. If the owner wants fire to leave a visible fertility boost, give fire the same `ash` array (a small, fast-fading boost); that is a one-line change but is a design choice.
- Fire is quite destructive in this world: a 778-tick fire logged 897 burned patches in a 1,024-cell world, because cells that regrow can be lit again. Setting a shorter fire length or making `evFireCellBurn` cells slower to reignite would soften it.

---

### O4 diagnosis (done)

**Step 1: switch the suspects off one at a time in the grand world** (4 worlds each, 100,000 ticks, measured over the second half; "meat eaters" means diet above 0.75):

| | Meat eaters | Kills per 1,000 ticks | Meat in the diet | Armed (attack above the threshold) | Diet gene |
|---|---|---|---|---|---|
| Standard world (control) | 33 to 80 in 3 of 4 worlds (up to 125) | 2,700 to 4,900 | 32 to 42% | 39 to 63% | 0.20 to 0.31 |
| Grand world | 0 | 250 to 410 | 1.5 to 2.9% | 14 to 50% | 0.02 |
| ...without herd bonus, camouflage, colonies, kin tolerance, food sharing, disease, torpor, plant kinds, or the Phase 8e ecology (one at a time) | 0 in every world | 50 to 520 | 0.5 to 3.2% | 2 to 99% | 0.01 to 0.04 |
| ...without all of those | 0 | 12 to 30 | 0.8 to 1.2% | 11 to 18% | 0.01 |
| ...without kin restraint (kinDistance 0) | 0 | 105 to 158 | 1.0 to 1.3% | 3 to 6% | 0.01 to 0.02 |
| ...without all of those and kin restraint | 0 | 44 to 80 | 0.8 to 1.2% | 1% | 0.01 |

- **Grand-world animals do kill, and plenty of them arm themselves, but they never become meat eaters:** the diet gene stays near 0.02, so they cannot digest what they kill. The missing step is the shift in diet, not the arming.
- **Prey are hidden by kin restraint and camouflage.** In the grand world only 5 to 21% of prey within reach are eligible: 38 to 49% go unnoticed and 23 to 53% count as relatives. With every suspect off, 97% count as relatives, because the fixed rule "never attack anyone within kinDistance" covers almost everyone in a uniform population.
- **But that is not the cause.** With kin restraint off too, 97% of prey within reach become eligible, and still no meat eaters appear; fewer animals even bother to arm (1%). None of the suspects listed in the plan is the reason.

**Step 2: add one grand-world group at a time to the standard world,** where meat eaters do appear (4 worlds each, 100,000 ticks):

| Standard world plus... | Worlds with meat eaters | Meat eaters (average) | Meat in the diet |
|---|---|---|---|
| nothing (control) | 3 of 4 | 33 to 80 | 32 to 42% |
| bigger world and 1.5x food | 4 of 4 | 480 to 690 | 43 to 45% |
| Phase 8e ecology | 4 of 4 | 29 to 89 | 29 to 45% |
| disease | 4 of 4 | 16 to 99 | 17 to 38% |
| life history (aging, litters, luck, starting variety) | 3 of 4 | 117 to 188 | 38 to 47% |
| colonies | 3 of 4 | 3 to 129 | 11 to 43% |
| plant kinds | 3 of 4 | 27 to 152 | 18 to 38% |
| climate and terrain | 2 of 4 | 9 to 26 | 21 to 32% |
| brains | 2 of 4 | 47 to 80 | 25 to 33% |
| social traits (kin, herds, sharing, camouflage) | 1 of 4 | 43 | 34% |
| **sex and harmful mutations** | **0 of 4** | 0 | about 1% |
| sex only (as a gene, with the easier-mating settings) | 1 of 4 | 62 | 37% |
| **harmful mutations only** (`mutationLoadRate` 3, the textbook ratchet) | **0 of 4** | 0 | about 1% |

**Step 3: confirm.**
- In the standard world with harmful mutations, armed animals carry about **twice as many harmful mutations** as everyone else, in all 4 worlds (5.6 to 17.2, against 2.9 to 7.2).
- The grand world without harmful mutations:
  - kills rise from 250 to 410 to 1,250 to 1,530 per 1,000 ticks;
  - meat in the diet rises from 1.5 to 3% to 11 to 13%;
  - the diet gene triples (0.02 to 0.05 to 0.07), and 26 to 93% of animals are armed;
  - but true meat eaters still appeared only once, briefly (18 at most).

**Diagnosis:**
1. **The main cause is the harmful-mutation load (Muller's ratchet) added in Phase 8d to make sex pay.** It reliably stops meat eating from taking off. Would-be hunters are always a small group, and small groups pile up harmful mutations faster (the ratchet turns faster when there are fewer to choose from). Their upkeep climbs until hunting no longer pays. Sex is the cure for the ratchet, but rare hunters rarely meet a compatible mate, so they stay asexual and keep loading up.
2. **Smaller brakes remain once the load is gone:** climate and terrain, brains, and the social traits each cut meat eating to 1 or 2 worlds in 4 in the standard world. Together they explain why the grand world without load reaches mixed diets but not true meat eaters.
3. **Not the cause:** the herd bonus, camouflage, colonies, kin tolerance, food sharing, disease, torpor, plant kinds, the Phase 8e ecology, and kin restraint. Each hides or protects prey, but switching any of them off, or all of them, did not bring back meat eaters while the load was on.

**Options for the next step (to decide with the owner):**
- **(a) A small chance of mending** (back-mutation) in the textbook ratchet, so load in small asexual groups levels off instead of growing for ever. Real genomes do repair a little. This needs checking that sex still pays in the grand world.
- **(b) Make hunting pay more,** so hunters out-breed their load. These are the O4 rewards: meat nutrient-rich (already in nutrient mode, which helped meat eaters in the standard world), meat filling a reserve, and fewer but bigger meals.
- **(c) Hunters find mates more easily,** for example compatibility judged without the diet and attack genes, so rare hunters can get the benefit of sex. This risks mixing hunting genes back into the prey.
- (d) A milder load rate in the grand world. Phase 8d found this removes the reason for sex, so it is a last resort.
- Recommended order: (a) and (b) together in the grand world, measured on both meat eaters and sex; then (c) if hunters still cannot find mates.

### O4 first fixes: mending plus nutrient-rich meat (grand world, 4 worlds each, 100,000 ticks)

Built: `mutationLoadMend` (model 1 only, default 0): each inherited harmful mutation has this chance of being repaired at birth. The reward tried is the one that already exists, nutrient-rich meat (`nutrientMode: 2`). Fat is still off in the grand world, pending the owner's decision.

| | Meat eaters | Meat in the diet | Diet gene | Harmful mutations per animal | Sex gene | Births with two parents | Population |
|---|---|---|---|---|---|---|---|
| Grand world | 0 | 1.5 to 2.9% | 0.02 | **93 to 202** | 0.13 to 0.48 | 11 to 44% | 366 to 623 |
| + mending 5% | 0 | 1.6 to 5.5% | 0.02 to 0.03 | 28 to 40 | 0.06 to 0.35 | 4 to 32% | 709 to 884 |
| + mending 15% | 0 | 3.0 to 5.1% | 0.03 | 15 to 16 | 0.04 to 0.14 | 4 to 13% | 769 to 944 |
| + nutrient-rich meat | 0 | 0.7 to 2.6% | 0.02 to 0.05 | 77 to 147 | 0.24 to 0.31 | 35 to 47% | 489 to 1,033 |
| + mending 5% + nutrient-rich meat | 0 | 1.1 to 8.9% | 0.02 to 0.10 | 28 to 45 | 0.03 to 0.40 | 18 to 53% | 682 to 840 |
| + mending 15% + nutrient-rich meat | 0 | **1.7 to 16.9%** | **0.02 to 0.21** | 14 to 18 | 0.03 to 0.13 | 14 to 47% | 458 to 999 |

- **The grand world is in a slow meltdown without mending.** By tick 100,000 every animal carries 93 to 202 harmful mutations, so its upkeep is about 5 to 9 times normal, and the number is still climbing. Mending holds it near 30 to 40 (5%) or 15 (15%), and populations rise by a third to a half.
- **Mending weakens sex,** as Phase 8d predicted: the sex gene falls from 0.13 to 0.48 to 0.04 to 0.14 at 15% mending. Nutrient-rich meat pushes the other way (two-parent births 35 to 47%), probably because a baby is built from both parents' stores.
- **Meat eating moves, but no true meat eaters appear.** With 15% mending and nutrient-rich meat, two of four worlds reach 14 to 17% meat in the diet, a diet gene of 0.15 to 0.21, and over 1,000 kills per 1,000 ticks: mixed eaters, not specialists. The done criterion (a lasting meat-eating lineage in most worlds) is **not met**.
- **What is left:** the smaller brakes from step 2 (climate and terrain, brains, social traits), which compound in the grand world, and the cost of being half-way between diets (`dietSpecialization` makes a mixed diet worse at both foods, a valley a lineage has to cross).

### O4 remaining brakes (grand world with 15% mending and nutrient-rich meat; one group removed at a time; 4 worlds each, 100,000 ticks)

| | Meat eaters | Kills per 1,000 ticks | Meat in the diet | Diet gene | Mixed eaters (diet 0.25 to 0.75) | Births with two parents | Population |
|---|---|---|---|---|---|---|---|
| Baseline | 0 | 150 to 2,000 | 1.7 to 16.9% | 0.02 to 0.21 | 0 to 23% | 14 to 47% | 458 to 999 |
| Without climate and terrain | 0 (one, once) | 75 to 4,350 (above 3,500 in 3 of 4) | 1.0 to 21.4% | 0.02 to 0.21 | 0 to 35% | 14 to 32% | 1,145 to 2,177 |
| Without brains | 0 | 950 to 1,770 (all 4) | 10.6 to 14.1% (all 4) | 0.20 to 0.25 (all 4) | 19 to 46% | 17 to 26% | 432 to 576 |
| Without social traits | 0 | 130 to 280 | 2.0 to 3.6% | 0.03 | 0% | 53 to 58% | 899 to 1,142 |
| Mixed diet half as costly (`dietSpecialization` 0.25) | 0 | 770 to 1,650 | 7.8 to 20.4% | 0.13 to 0.32 | 3 to 82% | 12 to 27% | 179 to 625 |

- **None of the remaining brakes, removed alone, produces true meat eaters.**
- **Removing brains, climate or the diet cost makes the whole population lean toward meat** (up to a fifth of the diet, diet gene up to 0.3, up to 82% mixed eaters), but it shifts as one population of omnivores. It does not split into plant eaters and specialist hunters, which is what happens in the standard world (diet 0.2 to 0.3 on average, but made of two separate groups).
- **Removing the social traits makes meat eating rarer, not commoner** (2 to 4% of the diet), so they are not a brake here. Births with two parents rise to 53 to 58% at the same time.
- **Likely reason for no split: gene mixing.** Would-be hunters mate with plant-eating neighbors (they count as compatible while their diets are still close), so hunting genes are blended back into the prey before a separate hunting lineage can form. This fits step 2: sex alone allowed meat eaters in only 1 of 4 standard worlds, against 3 of 4 without it. It is a hypothesis; the test would be mate choice that favors a similar diet (assortative mating, which is how new species usually split), or compatibility judged more strictly on the diet gene.

### O4 test of the gene-mixing hypothesis: mating by diet (grand world with 15% mending and nutrient-rich meat; 4 worlds each, 100,000 ticks)

Built: `matePreference: 3` (pick the most similar diet) and `mateDietLimit` (refuse mates whose diet gene differs by more than this). Both off by default; 4 tests.

| | Meat eaters | Animals with diet above 0.5 | Highest diet in the world | Average diet | Meat in the diet | Births with two parents |
|---|---|---|---|---|---|---|
| Baseline | 0 | - | - | 0.02 to 0.21 | 1.7 to 16.9% | 14 to 47% |
| Prefer a similar diet | 0 | 0 | 0.25 to 0.31 | 0.12 to 0.17 | 6.6 to 13.6% | 16 to 34% |
| + refuse mates more than 0.3 apart | 0 | 0 | 0.23 to 0.34 | 0.12 to 0.18 | 8.1 to 14.0% | 13 to 22% |
| + refuse mates more than 0.15 apart | 0 | 0 to 0.1% | 0.14 to 0.36 | 0.02 to 0.17 | 2.2 to 13.2% | 14 to 41% |

- **The hypothesis is not supported.** Even when hunters may only mate with similar eaters, nobody in any world gets past a diet of 0.36. Only about a fifth to a third of births have two parents anyway, so most lineages are already free of mixing, and they do not specialize either.
- **What this points to instead: hunting income per animal is too low for a specialist to pay.** The grand world makes about 1 to 3 kills per animal per 1,000 ticks, against about 7 in the standard world. So the best diet sits at an omnivore's 0.2 to 0.3: a little meat on top of plants. Going further means giving up plant food for meat there is not enough of.
- **Why the catch rate is low:** many small things that each lower it, and that add up (camouflage hides 38 to 49% of prey within reach, kin restraint and the herd protect others, brains have to learn to attack, climate and terrain scatter animals). Removing one at a time was never enough.
- **Next options:** (1) remove several of these together (no camouflage, no kin restraint or herd, no brains), to learn whether specialists can appear at all in a world this size; (2) make each kill worth more (bigger meals or a reserve for meat), so a specialist can live on fewer kills.

### O4 mechanism: energy budgets by diet and planted hunters

Measured in 4 grand worlds (15% mending, nutrient-rich meat) and 4 standard worlds. Budgets by diet run from tick 30,000 to 50,000. At tick 50,000, 30 animals per world were turned into ready-made meat eaters, using the average genome of evolved meat eaters in a standard world (size 0.46, speed 0.36, sense 0.28, metabolism 0.51, diet 0.83, attack 0.34, armor 0.85), and followed to tick 90,000.

**Would-be hunters at the same diet (diet gene 0.3 to 0.5), grand against standard:**

| | Grand world | Standard world |
|---|---|---|
| Kills per animal per 1,000 ticks | 5.5 | 25.9 |
| Meat energy per tick | 0.063 | 0.228 |
| Upkeep per tick | 0.106 | 0.053 |
| Body size | 1.14 | 0.80 |
| Animals with diet above 0.5 | none | 4% of all animals |

**The planted meat eaters:**
- **Grand world:** all 30 were gone within 1,000 ticks in 3 of 4 worlds (29 of 30 starved rather than being killed), and in the 4th within 4,000. They made 0.1 to 4 kills per 1,000 ticks while paying 0.18 to 0.20 upkeep per tick.
- **Standard world:** the same genome made 11 to 35 kills per 1,000 ticks. Its lineage grew to 250 to 550 in two worlds and held at 30 to 60 in a third.

**Why kills are rare in the grand world (from the earlier runs):**
- Of the prey within a hunter's reach, only 5 to 46% are eligible, against 81 to 84% in standard worlds with meat eaters. Camouflage hides 35 to 53%, and kin restraint spares 14 to 58%.
- Attacks succeed 15 to 36% of the time, against 38 to 47%.
- Brains never hold an attack back (the attack gate is never the limit), but grand-world brains steer toward plants, and the planted hunters carried plant eaters' brains. That is a limit of this test: there are no hunting brains in the grand world to give them.

**The mechanism, put together:**
1. **A hunter in the grand world gets about a quarter of the meat a hunter of the same diet gets in the standard world,** because it makes about a fifth as many kills. Most prey near it are hidden by camouflage or protected as relatives, and fewer attacks succeed.
2. **It also pays about twice the upkeep,** because hunting there favors a much bigger body (and the grand world has extra costs: brains, aging, the remaining mutation load).
3. **So the best strategy is a little meat on top of plants.** In the grand world, net growth (births minus deaths per 1,000 animal-ticks) rises slightly with diet up to 0.5 (from -0.02 to +0.06), so omnivores are favored, but nothing past 0.5 can pay. Planted specialists starve.
4. **Why switching off camouflage or kin restraint alone failed earlier:** they compound, and the run that switched both off together (97% of prey eligible) still had the full, unmended mutation load. Catching enough prey and carrying a manageable load have never been tested together.

**Suggested decisive test:** the grand world with 15% mending and nutrient-rich meat, and with camouflage, kin restraint and the herd bonus off. If specialists appear, the mechanism is confirmed (low catch rate plus load). Then the fix can be chosen to keep camouflage and kinship in the world but soften them for hunters. For example: hunters learn to see through camouflage faster, or kin restraint applies only to close relatives. Bigger meals would make each kill count more without discouraging omnivores.

### O4 decisive test and the first two fixes (grand world, 15% mending and nutrient-rich meat, 4 worlds each, 100,000 ticks)

Built (both off by default, 7 tests):
- `kinHungerBelow`: hunger overrides kin restraint. Below this share of breeding energy, the closeness an animal respects shrinks in proportion to its hunger.
- `camoHunterEye`: the chance of noticing camouflaged prey rises toward certainty by this much times the hunter's diet gene.

| | Meat eaters | Armed | Meat in the diet | Highest diet in the world | Prey within reach that are eligible |
|---|---|---|---|---|---|
| Baseline | 0 | 3 to 100% | 1.7 to 16.9% | about 0.3 | 5 to 46% |
| **Decisive test:** camouflage, kin restraint, herd bonus off | 0 | **2 to 3%** | **1.8 to 3.2%** | 0.12 to 0.19 | **94 to 97%** |
| + hunger overrides kin restraint (0.5) | 0 | 98 to 100% (all 4) | 11 to 14% (all 4) | 0.19 to 0.29 | 3 to 10% |
| + committed hunter's eye (0.8) | 0 | 8 to 100% | 4.6 to 16.3% | 0.22 to 0.46 | 3 to 42% |
| + both | 0 | 3 to 100% | 1.7 to 17.6% | 0.10 to 0.25 | 5 to 53% |

- **The decisive test refutes the catch-rate explanation as the whole story.** With nearly every nearby animal attackable, meat eating fell rather than rose, because almost nobody arms (2 to 3%). The social traits (kin restraint, herd, camouflage) somehow support aggression evolving; it is not that hunters eat their own family. Kills of own young are 8 to 10% with or without restraint, and strangers make up 59 to 66% of kills either way.
- **Hunger overriding kin restraint makes arming universal and meat steady** (11 to 14% of the diet in every world, against 1.7 to 17% before): the most reliable effect of anything tried. But it makes everyone an armed omnivore, not a specialist.
- **The hunter's eye** helps only somewhere: in one world the whole population became mixed eaters (diet 0.35), and that world crashed to 116 animals.
- **The pattern across every test:** the whole population drifts toward a little meat. No lineage passes a diet of about 0.46, and the planted specialists starved. A specialist needs about five times the kills an animal gets in the grand world, and the available kills are spread thinly over a population of armed omnivores all taking a little.
- **Remaining lever:** the payoff per kill, so that fewer kills can sustain a specialist (option 3: gorging, or bigger meals). Or accept that the grand world favors armed omnivores and treat that as a valid outcome.

### O4 bigger and richer meals (grand world with 15% mending, nutrient-rich meat and hunger overriding kin restraint; 4 worlds each, 100,000 ticks)

Built: `meatGorge` (meat bites this many times bigger, so a hunter eats most of its kill before it rots or is shared; off by default, 2 tests). "Richer" means more energy locked in every body (`bodyEnergyPerSize` 4 to 8). That is the only way a kill can carry more energy without energy being made, and it makes every baby cost more to build, plant eaters' too.

| | Meat eaters | Armed | Meat in the diet | Highest diet in the world | Population |
|---|---|---|---|---|---|
| Hunger overriding kin restraint only | 0 | 98 to 100% | 11 to 14% | 0.19 to 0.29 | 490 to 786 |
| + bites x3 | 0 | 98 to 100% | 12 to 18% | 0.20 to 0.28 | 514 to 870 |
| + richer bodies (x2) | 0 | 35 to 100% | 10 to 16% | 0.24 to 0.34 | 550 to 856 |
| + bites x3 and richer bodies | 0 | 100% | 13 to 18% | 0.19 to 0.27 | **168 to 411** |
| + bites x5 and richer bodies | 0 | 100% | **19 to 25%** | 0.24 to 0.34 | 360 to 561 |

- **Bigger and richer meals raise meat eating steadily,** up to a fifth to a quarter of everything eaten, with every animal armed.
- **They still do not produce a specialist.** No animal in any world passed a diet of 0.34, and no world had anyone above 0.5. The richer bodies also cost population (down to 168 to 411 with bites x3).
- **Across every O4 test so far, the grand world settles on armed omnivores:** everybody hunts a little, nobody hunts for a living. In 100,000 ticks the diet gene never climbs past about a third, whatever we change. Possible reasons not yet tested: specialization needs far longer than 100,000 ticks in a world this size (the standard world needed 30,000 to 60,000 ticks with fewer animals), or a specialist cannot live among prey that are all armed and as big as it is.

## Deferred long runs (do these later, on the cloud or when the laptop is free)

- **Erosion, 1,000,000 ticks.** Question: does worn ground level off at a stable share, or keep climbing, with the gentlest default (`erosionRate` 0.00001, recovery 0.00004) in the grand world? So far about 15% is worn at 300,000 ticks and still rising. If it levels off at 20 to 30% the default is fine; if it keeps climbing toward most of the land, add a better recovery before turning erosion on in the grand world. Run `erodeexp` (3 seeds). The sampling script was fixed to record every tenth of the run (an earlier attempt recorded nothing because 1,000,000 does not divide evenly by 6).
- **Warning colors with sex and color mate choice** (see S6 result): sexual reproduction (`sexualReproduction` 2 with the sex-gene settings from devlog 12), `matePreference` 2, `toxinStrength` 0.8, `founderSpread` 0.5; look for lineages with distinct hue and different toxicity. 8 seeds, 300,000 ticks.
- (Add other long checks here as they come up, for example overgrazing and fouling over millions of ticks, to see whether their population cost keeps growing or settles.)

---

## Opus batch (switch to Opus for these)

### O1. Nutrients travel through food (owner's notes 2d, 6 and 7a)
**Goal:**
- Animals get the nutrients for their babies from what they eat, not from the soil under them. Poor ground then means nutrient-starved, hungry animals that must move or decline, not frozen parents retrying a blocked birth.
- Well-nourished parents produce better-provisioned babies, and poorly nourished ones produce weaker babies (note 6).
- Meat is nutrient-rich (note 7a).

**Sketch to design properly:**
- **Matter in food:**
  - plants carry matter (they already do: grown from soil);
  - eating a plant moves its matter into the animal's nutrient store; part passes straight through as dung onto the soil it is standing on (detritus), which gives real fertilization where animals go;
  - meat carries the dead animal's body matter plus its store, so it is richer per bite.
- **Births:**
  - the baby's body matter comes from the parent's store, or both parents' stores for sexual births;
  - a parent without enough stored nutrient cannot reproduce until it eats more. That ends the frozen retrying and pushes it to forage elsewhere.
- **Maternal condition (note 6):**
  - a parent with a surplus store passes extra nutrient to the baby, giving it a better start;
  - a lean parent's baby starts with a condition penalty: slightly higher upkeep or a higher reproduction threshold, fading as the young animal eats. Use the luck-style "costs and gates only" approach so no energy is created.
  - Consider whether "condition" should be a second food value (a micronutrient) or simply the matter store. Simplest wins unless there's a clear reason.
- **Matter audit:** add animal nutrient stores to `matterAudit()`, and update corpse creation, meteor and fire.
- **Mode:** a new switch (for example `nutrientMode: 1`), so old worlds stay identical.
- **Evidence:** in the grand world, starvation versus blocked births before and after, how far animals travel, and whether meat eaters gain from nutrient-rich meat.

### Disaster review (Opus, after the merge)

The grand world with disasters on lost one world in six and held fewer animals in others. Each disaster kind alone, at one every 10,000 ticks in the grand world (3 worlds each), was mild: average populations were within the normal spread and nothing went extinct. The damage came from **wildfires**:
- **Flaw 1, fires re-burned their own ground.** Burnt cells regrew a little and could be lit again by the same fire, so a fire burned until its time limit ran out. One fire lit 27,570 patches in a world of 3,072 land patches: it went round the map about nine times. In another world one fire killed 648 animals and the world went extinct 600 ticks later.
- **Flaw 2, spread was above the tipping point.** With spread 0.15 to 0.5, any ground with average plant cover passed fire on to more than one neighbor, so fires grew until stopped by time or water.
- **Fix:** fire scars (`evFireRecover`, default 3,000 ticks; a burnt cell cannot burn again until its fuel has grown back, saved with the world) and spread 0.05 to 0.4. Fire sizes in the grand world, 89 fires at four times the grand-world frequency: median 13 patches, 90th percentile 99, largest 300 (a tenth of the land); no extinctions. (At a ceiling of 0.6 the largest fire burned 72% of the land.)

Other settings that were out of scale, all per tick where they should have been per event:
- **Storm shove** 0.2 to 0.8 world units every tick, over 100 to 400 ticks, swept animals 50 to 150 units, out of the storm and against coasts. Now 0.02 to 0.1, about 5 to 30 units per storm.
- **Storm soil** 2% of each cell's nutrient blown downwind every tick stripped the upwind ground almost bare. Now 0.1%. Extra movement cost in a storm 2 times, now 1.5 times.
- **Volcano cooling** (0.1 to 0.3) was stronger than the softened ice age (0.05 to 0.15). Now 0.03 to 0.1.

Result, grand world as configured (6 worlds, 60,000 ticks): **6 of 6 survive** (before the fix 5 of 6), average population 490 to 723 against 356 to 656 with no Phase 8e disasters. Disaster frequencies in `grand-world.json` are unchanged.

### O1 design (proposed by Opus, waiting for the owner's OK)

**What happens today (measured, 3 worlds each, second half of 60,000 ticks):**
- A plant bite is matter and energy at once (1 unit of plant = 1 unit of matter = 1 energy). Eaten matter goes straight back to the ground where it was eaten. Only energy goes into the animal.
- Babies are built from the soil under the parent, so a parent on poor ground cannot breed even though it has eaten plenty. Grand-world animals eat 52 to 79 units of plant per birth, while a baby's body needs about 0.35 units of matter: 150 to 220 times more matter passes through them than they keep.
- Meat holds 5 to 30 energy per unit of matter (it is mostly stored energy), so per bite meat is already rich in energy but poor in matter.
- Soil nutrient is moderately uneven (a Gini of 0.17 to 0.38; the richest tenth of land holds 15 to 27% of it). Animals end up 37 to 40 world units from where they were born (66 to 96 in the standard world).

**Level 1: animals carry nutrient** (a new switch, `nutrientMode: 1`; 0 keeps every older world identical):
1. **A nutrient store per animal**, made of matter. It is saved, counted in the matter audit, and goes into the corpse when the animal dies (so meat carries it).
2. **Eating fills it.** A small share of the plant matter eaten (`plantAssimilation`, about 1%, to be set so a typical plant eater collects one to two babies' worth per breeding cycle) goes into the store; the rest is dung on the spot, as now. A large share of meat matter (`meatAssimilation`, about 80%) goes in, because meat is already body. Per unit of energy, meat then brings several times more nutrient than plants: **meat is nutrient-rich**.
3. **Dung moves nutrient around.** Each tick a little of the store (`nutrientTurnover`, about 0.2%) is lost as dung on the cell where the animal stands now. A store above its cap (`nutrientStoreCap` times its own body matter) spills over at once. Nutrient eaten on rich ground ends up where animals walk and rest, which is how real animals spread fertility. This is a natural form of the pinned S2b "soil mixing"; S2b can be decided after seeing it.
4. **Babies are built from the parent's store, not the soil** (half from each parent in a sexual birth). A parent without enough store cannot breed until it eats more. It keeps its energy, so it can go and find food instead of standing still. Blocked births are then counted as "nutrient" rather than "soil".
5. **Provisioning (note 6):** a parent also hands the baby a share of what is left in its store (`provisionShare`, about 25%). A well-fed parent's baby starts with a full store; a lean parent's baby starts nearly empty.
6. **Deficiency:** an animal whose store is below `deficiencyBelow` times its body matter pays extra upkeep, rising to `deficiencyCost` (about +30%) when the store is empty. This only costs energy (on the upkeep line), it never creates any. It is the "buff or nerf from the parent's nourishment": a poorly provisioned baby is deficient until it has eaten well.
7. **Edge cases:** photosynthesizing colony cells eat nothing, so they draw a little nutrient from the soil under them (roots); colony cells do not share stores (yet). Founders start with a store taken from the soil they are placed on, so the books stay exact.

**Level 2: plants on poor soil are poor food** (recommended as the second step of O1, measured separately):
- Today a unit of plant always holds the same matter, so poor ground simply grows fewer plants. Hunger and nutrient shortage would mostly go together, and "nutrient-starved" would rarely differ from "hungry".
- In Level 2, each cell's plants hold a nutrient concentration that follows the soil they grew from (as with corpse toxicity, it is mixed by weight as new growth is added). Energy still comes from sunlight per unit of plant; the nutrient taken from the soil is the concentration times the growth. Plants on poor soil are then filling but poor in nutrient. An animal grazing there stays fed but becomes deficient, so it must move to rich ground or breed slowly. That is exactly the behavior the owner asked for.
- The cost: plant growth no longer uses up soil one-for-one in this mode. Matter is still conserved exactly (the matter audit counts nutrient: soil, plants by concentration, stores, bodies, corpses, detritus). Energy is unchanged.

**Tests:** matter and energy conservation to 1e-9 in both levels, with every corpse route (kills, starvation, meteor, fire, volcano); save and load mid-run; `nutrientMode: 0` goldens unchanged; deficiency and provisioning unit tests on a single patch.

**Evidence plan:** the grand world with modes 0, 1 and 1+2 (6 worlds each, 100,000 ticks): births blocked against starvation, mean population, how far animals travel, soil evenness (Gini), share of meat in the diet and the number of meat eaters.

**Found while measuring (not part of O1, needs a decision):** the grand world as merged, with overgrazing, fouling, erosion and the disasters switched on at close-out, holds far fewer animals than before (end populations 101 to 166 and 1 of 3 extinct, against 367 to 904 with the Phase 8e mechanics off). Switching groups off one at a time (3 worlds, 60,000 ticks, single end-of-run counts, so noisy): with disasters off the worlds survive (209 to 971); with only disasters on, seed 2 goes extinct in every variant. Recommendation: take the disasters out of `grand-world.json` for now (keep the ground damage) and look again after O1 and O2, which change the food economy anyway.

### O1 Level 1 result (built, `nutrientMode: 1`)

Built as designed (store, assimilation, dung turnover, cap, births from the store, provisioning, deficiency upkeep, root uptake for photosynthesizing cells, founders' store from the soil, stores in corpses and in the matter audit). 11 new tests, books exact to 1e-9 in a plain world and in a world with colonies, sex, litters, poison, fat and five kinds of disaster. Viewer: a "Nutrient store" dot color, a "Nutrient store / short of it" readout, and a "Nutrients through food" preset. Off by default; every older world is unchanged.

**A real bug found on the way (older than O1):** colony energy sharing and food gifts ran after a disaster had killed a cell, so energy flowed into the dead cell and vanished when it was cleared away (a leak of about 1 part in 6,000 over 3,000 ticks). Dead cells now take nothing; regression test added.

**First measurement (3 worlds each, second half of 60,000 ticks; mode 0 against mode 1 with default settings):**

| | Grand, off | Grand, on | Standard, off | Standard, on |
|---|---|---|---|---|
| Average population | 288 to 778 | 508 to 754 | 529 to 1,737 | 169 to 1,254 |
| Animals short of nutrient | - | 10 to 12% | - | 21 to 29% |
| Average store (times body) | - | 1.5 to 1.6 | - | 0.7 to 1.1 |
| Meat eaters at the end | 0 | 0 | 0 to 6 | 3 to 23 |
| Distance from birthplace | 39 to 45 | 36 to 41 | 66 to 96 | 55 to 92 |

- **Nutrient is now a real second resource.** In the standard world it, not energy, decides who breeds: parents sit on plenty of energy waiting to fill their store. (The births-blocked count counts every retry, every tick, so it runs into the millions; it is a measure of waiting, not of animals.)
- **Meat, being rich in nutrient, pays much more:** kills became the main cause of death in the standard world and meat eaters appeared in every world (3 to 23 at the end, against 0 to 6). This feeds straight into O4. In the grand world meat eaters still did not appear.
- **Animals do not travel further**, because in Level 1 every plant carries the same nutrient wherever it grows: there is nowhere better to go. That is what Level 2 is for.
- Soil became a little more uneven in the grand world (Gini 0.26 to 0.29, against 0.15 to 0.27), because dung lands where animals gather.

### O1 Level 2 result (built, `nutrientMode: 2`)

Plants hold `plantQualityMax * soil / (soil + plantQualityHalf)` nutrient per unit (defaults 2 and 30, so a plant on typical soil of about 30 holds the same as in Level 1, poor soil less, rich soil up to twice as much). It is mixed by weight as new growth comes in, and used everywhere plant matter moves (eating, dung, fire, crushing, the matter audit). Measured first: soil on land runs from about 15 to 50 in both worlds, far above the level (2) where it slows growth, so before this, soil mattered for almost nothing. Tests: 3 new (quality follows soil, poor plants fill the store more slowly, books exact with five kinds of disaster plus save and load). Viewer: a "Plant nutrient" map layer, stretched between the poorest and richest plants on the map at that moment. The "Nutrients through food" preset uses mode 2.

**Grand world, 6 worlds each, second half of 100,000 ticks:**

| | Mode 0 (soil) | Mode 1 (stores) | Mode 2 (stores + plant quality) |
|---|---|---|---|
| Worlds extinct | 1 of 6 | 0 of 6 | 0 of 6 |
| Average population (survivors) | 467 to 748 | 458 to 865 | 191 to 1,044 |
| Animals short of nutrient | - | 10 to 12% | 12 to 25% |
| Average store (times body) | - | 1.5 to 1.6 | 1.0 to 1.6 |
| Distance from birthplace | 38 to 50 | 35 to 46 | 37 to 48 |
| Soil evenness (Gini; higher = more uneven) | 0.24 to 0.32 | 0.34 to 0.43 | 0.24 to 0.32 |
| Meat eaters at the end | 0 | 0 | 0 |

- **Nutrient matters more in mode 2:** up to a quarter of animals are short of it, and parents wait longer to breed.
- **But animals still do not travel further.** They cannot sense their own store or how rich a plant is: brainless animals steer by plant amount and brains see plants, not their quality. So moving to rich ground is not something they can do on purpose yet. That needs two brain inputs: "my nutrient store" and "how rich the plants are here / ahead".
- **Mode 1 makes soil more uneven** (dung piles up where animals gather), and **mode 2 evens it out again**, because rich soil grows richer plants that draw more out of it.
- **Population is not hurt;** if anything, fewer worlds die out. In the grand world meat eaters still do not appear in any mode (that is O4).
- **Recommendation:** add the two nutrient brain inputs together with O2's "ground health" input, in one change to the brain layout, so brain-world golden fingerprints are re-recorded only once.

### O2. Water, moisture and climate biomes (owner's notes 3 and 10)
- **Moisture field:** a persistent per-cell moisture from distance to water, latitude bands, season and drought. Plants need it: growth is multiplied by a moisture response. This is the foundation for biomes.
- **Drinking (optional switch):**
  - animals have hydration that drains each tick (faster when hot or moving) and refills when standing next to water or in wet cells;
  - dehydration costs upkeep and eventually kills;
  - brains get a "water: which way, how far" sense (new inputs, so the brain layout changes and brain goldens are re-recorded).
- **Biomes from temperature and moisture (a Whittaker-style table):**
  - polar ice: dynamic, growing and shrinking with temperature and ice ages, impassable or very costly;
  - tundra, boreal forest, temperate forest, grassland or savanna, desert, tropical forest, swamp, highlands.
  - Each has: plant growth, which plant kinds grow there, movement cost, visibility (camouflage), disease rate and temperature.
  - Design the table so every biome has a real upside and downside.
- **Mode:** keep the old five-biome terrain as a mode; the new system is a new `terrainMode` value.
- **Viewer:** biome and moisture map layers, and a hydration readout.
- **Evidence:** do lineages specialize by biome (traits and palates differ between biomes)? Does the ice edge move with the climate?

### O2 result (built)

**What was built (all off by default; older worlds unchanged):**
- **One brain-layout change for O1 and O2:** eleven new senses (own nutrient store; plant richness here, ahead and to the side; ground damage here, ahead and to the side from overgrazing, fouling and erosion together; nearest water ahead, to the side and how far; thirst). 63 inputs and 576 connection slots. Brain-world golden fingerprints were re-recorded once; brains-off goldens are unchanged. A world saved with the older layout is renumbered when it loads.
- **Climate biomes, `terrainMode: 2`:**
  - The same seas and highlands as the five-biome terrain.
  - A lasting moisture per cell, from nearness to water, latitude rain belts (wet equator, dry subtropics, wet temperate lands, dry poles) and patchy noise.
  - A Whittaker-style table from average temperature and moisture: tundra, boreal forest, grassland, temperate forest, desert, savanna, tropical forest, swamp, highlands. In a 512 world: grassland 22 to 27%, temperate forest 11 to 13%, desert 10 to 11%, highlands 13%, tundra 11 to 12%, boreal 7 to 12%, savanna 7 to 8%, tropical 6 to 10%, swamp 2 to 3%.
  - Each biome has its own growth, movement cost, visibility to hunters and disease rate, with a real upside and downside. For example, tropical forest is the richest and best for hiding, but slow to cross and full of disease; desert is poor and exposed, but healthy.
  - Plant growth follows moisture through the seasons, and plant kinds follow temperature.
  - Polar and high ground freezes when its average temperature (no seasons, but with drift and ice-age or volcano cooling) falls below `iceBelow`: nothing grows there, and crossing costs three times as much.
- **Drinking, `drinking: 1`:** animals carry water that runs down faster in the heat and when running. They refill beside water, in a flood or on soaked ground, and pay up to three times the upkeep when dry.
- **Viewer:** climate-biome colors, white ice, a Moisture layer, a Water readout and dot color, and a "Climate biomes" preset.
- 22 new tests (senses, the old-layout loader, climate biomes, drinking).

**Evidence (grand world, 6 worlds each, 100,000 ticks, trait measures from the second half): the grand world as it is, against the same world with climate biomes, drinking and nutrient mode 2, and the same again with a forced ice age.**

| | Grand world | + climate biomes, drinking, nutrients | + forced ice age |
|---|---|---|---|
| Worlds extinct | 0 of 6 | 0 of 6 | 0 of 6 |
| Average population | 378 to 782 | 397 to 790 | 399 to 783 |
| Share of temperature-preference variation lying between biomes | 0.02 to 0.09 | 0.03 to 0.48 (above 0.15 in 5 of 6) | 0.05 to 0.74 (above 0.4 in 5 of 6) |
| Same for palate (which plant kind it digests) | 0.01 to 0.06 | 0.02 to 0.66 (above 0.18 in 5 of 6) | 0.03 to 0.80 (above 0.67 in 5 of 6) |
| Same for body size | 0.01 to 0.09 | 0.02 to 0.26 | 0.03 to 0.05 |
| Dehydrated | - | 4 to 15% | 7 to 11% |
| Short of nutrient | - | 15 to 32% | 17 to 25% |
| Plant richness where animals stand, against the land average | - | 0.83 to 0.97 | 0.82 to 0.96 |

- **Lineages do specialize by biome.** With climate biomes, temperature preference and palate differ strongly between biomes in 5 of 6 worlds, and the ice age sharpens it. Body size hardly does. Few species exist at once (1 to 3), so this is mostly one lineage varying across the map, not separate species per biome.
- **The ice edge moves with the climate.** Ice covers 282 to 464 cells normally, 1,018 to 1,490 at the depth of the ice age (about 3 to 4 times as much), and melts back to exactly where it was. A volcano's cooling also adds a short burst of ice (282 to 597 cells).
- **The new senses are picked up only here and there, and maybe not at all.** In each world one or two of them end up wired into 15 to 63% of brains (for example "richer plants: ahead" in 63% of one world, "thirst" in 42% of another), but no sense is used consistently across worlds. **Correction (found in O3):** inputs that always read zero get wired at similar rates (4 to 78% of brains in the grand world, where the colony senses are always zero), because a connection from a silent input costs little and does nothing, so it drifts in. Wiring alone is therefore not evidence that evolution chose a sense; it has to beat that drift level. Animals still stand on slightly poorer-than-average plants (0.82 to 0.97), so seeking out rich ground has not evolved in 50,000 ticks. Most likely the best plant amounts and the richest plants are in different places: the senses exist, and the reward for using them is small.
- Populations are unchanged on average, and none went extinct, but the lowest points are deeper (down to 47 to 73 in some worlds).

### O3. Colony physics and evolvable shared senses (owner's note 11)
- **(a) Size protects:** when a hunter decides whether prey is too big, use the prey's colony total size, not the single cell's.
- **(c) Economies of scale:** per-cell upkeep falls mildly with colony size (for example `cells^-0.1` built from `sqrt`, capped), as for bigger bodies.
- **(b) Shared senses, not guaranteed:**
  - a new "signaling" gene;
  - bonded neighbors that both carry it pass a summary of what they sense (nearest threat and nearest food, direction and distance) along the bond;
  - each tick costs `signalCost × gene` per bond;
  - brains get new inputs, "colony senses: threat and food", which they must evolve wiring to use. So a colony only acts as one body if evolution builds both the signaling and the wiring. Otherwise it stays a bunch of individuals.
  - Brain layout changes, so brain goldens are re-recorded.
- **Tuning:** use experiments so colonies win some niches and not everywhere.
- **Evidence:**
  - share of cells in colonies;
  - colony size;
  - whether the signaling gene rises;
  - whether brains wire to the colony senses;
  - survival against predators.

### O3 result (built)

**What was built (all off by default; older worlds unchanged):**
- `colonyProtect`: a hunter judges whether prey is too big by the whole colony's size.
- `colonyScaleSaving`: each cell's upkeep falls with colony size, by up to saving x (1 - cells^-1/8).
- `signaling`: the 28th gene (needs brains). Bonded cells that carry it share the nearest bigger animal they see and which way plants smell stronger. Neighbors that also carry it hear this one tick later, scaled by both genes, so the order cells think in cannot matter. Six new colony senses carry it into the brain. Each bond costs `signalCost` x gene.
- The brain layout grew to 69 inputs and 640 slots. Brain goldens were re-recorded. `BRAIN_LAYOUTS` and `renumberOldNode` in `brain.ts` now load a world saved with any earlier layout.
- 9 new tests.

**Evidence (6 worlds each, second half of the run):**

| World | Share of cells in colonies | Average colony | Kills per 1,000 cell-ticks: colony / alone |
|---|---|---|---|
| Grand world (100,000 ticks), as it is | 1 to 4% | 2 cells | about the same |
| Grand world + all three | 2 to 8% | 2 cells | 0.005 to 0.22 / 0.38 to 0.95 |
| Colonies world (60,000 ticks), as it is | 2 to 16% | 2 cells | about the same (0.05 to 12.7 / 0.03 to 8.5) |
| Colonies world + size protection | 50 to 94% | 5 to 12 cells (up to 16) | 0.2 to 1.0 / 4.8 to 17.5 |
| Colonies world + economies of scale | 2 to 12% | 2 cells | about the same |
| Sunlit colonies, as it is | 4 to 56% | 2 to 4 cells | |
| Sunlit colonies + protection and scale | 19 to 85% | 3 to 4 cells | 0 to 0.04 / 0.04 to 0.9 |

- **Size protection is the lever.** Where predators hunt, colony cells are killed 10 to 60 times less often than lone cells, and colonies take over: most cells end up in colonies of 5 to 12. Where predators are rare (the grand world, or worlds where none evolved), colonies stay rare pairs. So colonies win the niche "where there are hunters", not everywhere.
- **Economies of scale does almost nothing** at the colony sizes that form by themselves: a 2-cell colony saves only about 2.5%.
- **Signaling is not clearly chosen.** In the Colonies world with brains and size protection, the gene started at 0.3 and ended at 0.25 to 0.46. In the two worlds with big colonies, the colony senses were wired into 53% and 86% of brains, against 10 to 43% drift where the senses were silent. So there may be early use in those two worlds, but it is not conclusive.
- **The grand world needs predators before colony physics matters there.** That is O4.

### O4. Why meat eating fails in the grand world, then rewards and trade-offs (owner's note 7)
- **First, diagnose,** as was done for sex (`docs/devlog/0012`).
  - Remove one grand-world feature group at a time and measure meat eaters, kill rate and how long predator lineages last.
  - Suspects: the herd bonus (known to stop predators), camouflage, colony defense, kin tolerance, food sharing, deadly disease, torpor (sleeping prey), and plant kinds.
- **Then implement, scaled by the findings:**
  - **(a)** meat nutrient-rich (comes with O1);
  - **(b)** meat fills the fat reserve more efficiently. **Note:** the grand world currently turns fat off, because it held sex back. Decide with the owner whether to bring fat back for meat eaters only, or give the benefit another way, for example meat filling the torpor or energy store.
  - **Trade-offs:**
    - eating corpses, or animals that were sick, can pass on disease;
    - kills cost a bit more effort;
    - meat already rots.
- **Done when:** in the grand world, a meat-eating lineage appears and persists for most of a long run in most seeds, without wiping out prey diversity.
