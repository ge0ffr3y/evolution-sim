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

### S4. Fouling (owner's note 1b)
- Every animal adds `fouling × its body size` per tick to a per-cell fouling index. The index decays by `foulDecay` per tick (default 0.01).
- It reduces plant growth by `1 / (1 + foulGrowthEffect × index)`, and multiplies disease transmission in that cell by `1 + foulDiseaseEffect × index`.
- **On/off switch:** `fouling` > 0. Default 0, so it is off.
- **It is an index, not matter.** Document that clearly: dung as real matter comes with O1, and this index is crowding and contamination. Saved in `landArrays()`.
- **Viewer:** a "Fouling" map layer.
- **Evidence:** crowded worlds should see animals spread out more and disease rise where they cluster.

### S5. Erosion (owner's note 1c)
- A per-cell fertility factor (start 1, range `erosionMin` default 0.4 to 1).
- It falls by `erosionRate` per tick (default 0.00005) while the cell's standing plants are below 10% of capacity, and recovers by `erosionRecovery` per tick (default 0.00002) while above 50%.
- It multiplies the cell's `foodCapacity`. Use a separate multiplier array so the base capacity is kept.
- **On/off switch:** `erosionRate` > 0. Default 0, so it is off. Saved in `landArrays()`.
- **Matter:** erosion changes how much plant a cell can hold, never moves or deletes matter, so the matter audit is unaffected.
- **Viewer:** a "Soil fertility" map layer.
- **Evidence:** long-grazed areas thin out and recover after the population moves on.

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
