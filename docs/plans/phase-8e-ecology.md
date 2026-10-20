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
