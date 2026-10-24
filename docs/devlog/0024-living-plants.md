# Devlog 24: Living plants

*Phase 9, part 9. The owner's idea: plants were too simple. A world had at most six fixed kinds that never changed. Now plants can evolve, become poisonous, and carry three nutrients. Built in three steps with a check-in after each, all off by default, tested on GitHub's machines instead of the owner's laptop. Four cloud experiments, about $3.30. Full write-up: `docs/findings/living-plants.md`; plan: `docs/plans/living-plants.md`.*

![Left: in 8 grand worlds, plants' best temperature goes from unrelated to the local temperature (correlation about 0) to clearly following it (about 0.7) within 100,000 ticks. Right: plant toxin that harms grazers rises above harmless toxin, the chance-only baseline (about 0.2 against 0.14 by 300,000 ticks).](../media/living-plants.svg)

## What was built

All of these are off by default. A world with them switched off plays out exactly as before.

- **Plants that evolve** (`plantEvolution`).
  - Every patch of ground carries a small plant genome:
    - a chemistry, which animals' palate gene reads like a plant kind, but continuous;
    - the time of year it grows best;
    - the temperature it likes best.
  - Every 50 ticks, ground eaten bare is reseeded from a neighbouring patch standing tall, and the seed mutates a little.
  - Only the plants' label changes; no plant matter or energy moves. Plants have their own random numbers, so the animals' dice are not disturbed.
  - With seeding switched off, a world plays out exactly as one with fixed kinds (tested).
- **Poisonous plants** (`plantToxins`).
  - A toxin gene that slows the plant's growth.
  - An animal eating it pays upkeep in proportion to the toxin and to how far its palate is from the plant's chemistry. The same plant is food for one animal and poison for another.
  - Smell and steering count the harm, so animals avoid what poisons them.
- **Dietary nutrients** (`dietNutrients`).
  - Food holds three nutrients. A plant's mix follows its chemistry; meat is an even mix.
  - Animals keep three reserves, and running short of any one costs upkeep.
- **To watch it:**
  - the preset "Grand world: living plants";
  - the map overlays Kinds of plant (by chemistry), Plant warmth (compare with Temperature) and Plant toxin;
  - the dot colors Palate and Nutrient balance.
- **Measures and tools:**
  - a plants measure: plant diversity, how well plants fit the local temperature, toxin, and nutrient shortage by diet;
  - `meat-groups.mjs`, which counts lasting meat-eating groups;
  - `--speeds-from`, which prices a cloud run from an earlier run's real speeds, so nothing runs on the laptop.

## What we learned

- **Plants fit their land, on every seed.** Within about 100,000 ticks:
  - plants' best temperature goes from unrelated to the local temperature to clearly following it (correlation 0.6 to 0.8);
  - the gap between the two halves;
  - three kinds spread into eight or nine distinct chemistries.
- **Animals follow:** about twice as many distinct palates. But that does not become more species.
- **Toxin is chosen, not only chance.**
  - Mutation alone pushes toxin up from zero, so a harmless version (no harm, no growth cost) was run as the chance-only baseline.
  - All eight harmful-toxin worlds ended above every harmless one (0.18 to 0.28 against 0.12 to 0.17), even though their toxin also slows growth.
  - Grazers avoid poisoned patches, so about 40% more plants stand.
- **Nutrients need the right setting to matter.**
  - As first set, food refilled reserves far faster than they drained, and almost nobody ran short.
  - Set where a one-plant diet falls short and a mixed diet does not, half to three quarters of animals are short at any time, and mixed eaters are better supplied.
  - Lives get shorter, plant eaters breed faster, and kills rise by a third.
- **None of it makes meat eaters last.**
  - Plants that evolve cut meat eating by a fifth to a third: with food that suits them nearly everywhere, fewer animals turn to meat.
  - Nutrients that bite add kills and a few mixed eaters, but no lasting meat-eating group in any of the 8 worlds of any setup, and with evolving plants they cost a third of the species.

## What broke, or misled

- **The owner's laptop ran hot** with its own simulation queue (load average about 26). Under that load the full test suite failed on time limits, not wrong answers.
  - Testing moved to GitHub's machines: every push of the work branch runs the type check, the full suite and the build, at no cost.
  - One commit (write-up only) went in after a local run that had timed out; GitHub passed it.
- **The owner's computer crashed during a cloud run.** The cloud machine was unaffected, but the analysis scripts kept in a temporary folder were lost. They now live in the repo.
- **The first nutrient setting was too gentle to test anything.** This was caught by the shortage measure before it was reported as "nutrients don't matter".
- **A miscount in the findings:** "seven of eight" toxin worlds above chance was really all eight. Corrected.

## Still open

- **Lasting meat eaters in the grand world,** still only with the four costly features switched off (Grand world: hunters).
- **Whether living plants belong in the grand world preset.** Plants that evolve add animals (+9 to +25%) and on their own make no change in species that holds up, but they cut meat eating. That is the owner's call, after a 16-seed confirmation.
- **Phase 10 ("Ship it")** is next on the roadmap.
