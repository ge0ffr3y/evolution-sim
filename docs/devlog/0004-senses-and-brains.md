# Devlog 4: Senses and brains

*Phase 4. Prey learned to run. Hunters learned to wait. Nobody learned to chase, and we found out why.*

## What was built

- **Brains.** Every organism can carry a small neural network (a list of connections with strengths, no loops). It reads senses, thinks every second tick, and decides three things: how much to turn, how fast to move (standing still to flat out) and whether to attack. Two kinds:
  - *Fixed layout:* every possible connection exists from birth and only the strengths evolve.
  - *Evolvable layout (NEAT-style):* brains start empty, and mutations can add or remove connections and thinking units.
  - Brains are **off by default** (the Phase 3 world is kept exactly, as the control), and switch on with `brainMode`.
- **Senses.** Vision: five rays across the front, each reporting the nearest thing a hunter could handle (how near, how meaty its diet looks) and the nearest bigger thing. Smell: which way plants and corpses get stronger. The body: energy, age, **its own diet**, **stamina left**, a constant and some noise.
- **Scent trails.** Every organism leaves a fading trail where it walks: a plant-eater trail and a meat-eater trail, mixed by diet. Brains can smell which way each trail is fresher. The viewer has a "Scent trails" map layer (green and red).
- **Appetite-shaped senses (option).** What an animal notices depends on what it eats: a plant eater's brain gets no signal about smaller animals or corpses, a meat eater's gets no signal about plants. Everyone still notices threats.
- **Stamina (a tenth gene, option).** Running faster than normal drains a reserve, an empty reserve means normal pace at best, rest refills it, and a bigger reserve costs energy every tick. Whoever has more stamina wins a long chase.
- **Kill ownership (option).** After a kill the killer has first claim on the meat for a set time (others get a tenth of a normal claim), so free-riders cannot out-eat the one who did the work.
- **Energy costs for thinking:** a base cost, plus a cost per working thinking unit and per working connection. Connections too weak to matter are treated as absent and are free.
- **Brain viewer:** click any organism and see its live network, what each sense reads and what each output is doing. Two new readouts show how purposefully animals turn (hunters toward prey, prey away from threats; 0.5 is random).
- **Founder reflexes** (settings, not rules): brains can start with a smell-the-plants reflex, or that plus a pull toward smaller animals, as ordinary evolvable connection strengths.
- **Speed:** profiling led to a cheaper random-noise function and skipping senses a brain does not use (results proven identical by fingerprints). Brains off: about 0.4 ms per tick at ~2,900 organisms. Evolvable brains are about 1.6 times slower, fixed brains about 3.4 times, and appetite-shaped senses cost about 1.7 times on top (trails alone are about 10%).
- **Tests:** 237 pass. The brains-off worlds are bit-for-bit the same as before Phase 4 (golden fingerprints unchanged), and energy and matter conservation hold with brains, trails, stamina and kill ownership all on.

## What emerged

1,000,000 ticks, 6 seeds per setting:

- **Prey learn to run.** Plant eaters turn away from threats about 0.66 to 0.73 of the time, against 0.51 for the brains-off control. That is a clear, repeatable, evolved behavior.
- **Hunters wait instead of chasing.** Hunters turn toward visible prey 0.50 of the time (random), in every setting, including when founders start with a chase reflex. Looking inside evolved meat-eater brains, the common wiring says "slow down": they move at about 0.4 times normal speed (plant eaters about 0.6) and let prey walk into reach. That is ambush, and it works.
- **Brains first collapsed the food web, and knowing its own diet fixed it.** With brains but no diet input, meat eaters died out in 3 of 6 worlds. With the diet input, they survive in 6 of 6. Appetite-shaped senses nearly doubled their numbers (138 against 79 in the brains-off control, at the end of the run), and kill rates came back to the brains-off level.
- **Scent trails made no measurable difference.** No world evolved any real use of them.
- **Brain complexity differs between niches.** Plant-eater brains grew to about 13 working connections, meat-eater brains about 4.

| 1M ticks, 6 seeds | Meat eaters at end | Hunters turn toward prey | Prey turn from threats |
|---|---|---|---|
| No brains (control) | 79 | 0.49 | 0.52 |
| Brains + own diet | 61 | 0.50 | 0.68 |
| + scent trails | 54 | 0.49 | 0.69 |
| + appetite-shaped senses | 138 | 0.50 | 0.60 |

## What broke, or only partly worked

- **Chasing never evolved, and I tried to make it pay.** Four attempts:
  1. *Founder chase reflex:* faded away.
  2. *Hand-wiring a chase into every meat eater:* they did turn toward prey (0.58 to 0.69) but ended up with fewer meat eaters and no more kills in every setting tried. Ambushers were already near the ceiling the 20-tick pause after a kill sets (roughly 100 to 190 kills each per 4,000 ticks, against a limit of 200).
  3. *Stamina and kill ownership:* kill ownership helped meat eaters a lot (about 50 to 75% more of them). Stamina alone did not make chasing pay.
  4. *Sparser prey:* as plant food was cut (and so prey), the penalty for a hand-wired chase shrank and then flipped to a small gain. Kills changed by -8% at half the plant growth, +8% at a quarter and +15% at an eighth (4 worlds each, so noisy). But the real test, letting it evolve at a quarter of the plant growth, still gave 0.50: no chasing.
- **Why: the meat-eater lineage keeps going extinct.** In the sparse worlds meat eaters boom to 100 to 190 and then crash to zero, up to four times in one world, and each time they re-evolve from plant eaters, with no chase wiring. Any chase that evolved would be lost at each crash. Seeds with meat eaters at the end of the run: 3 of 6 (appetite senses only), 4 of 6 (plus stamina and kill ownership) and 5 of 6 (plus founder chase reflex), by a last-third average of at least 10. This looks like real predator-prey boom and bust, which Phase 3 could not show at normal density (that checkbox stays open; the new evidence is only from sparse worlds).
- **Small populations make it worse.** With 30 to 90 meat eaters, drift swamps selection, and a chase needs several connections to appear together before it helps.
- **Roadmap boxes not met:** "predators chasing", "brains outperform random-walk controls" (population is comparable or higher, but food found per tick was not measured), and two Sensors/Actions steps (there is no "health" sense, and eating and reproducing are not brain outputs).

## Next

The chase is still unsolved. The most promising lever is **space**: a larger world at the same sparse density, so meat-eater crashes in one region get rescued from another and the lineage (and any chase wiring it evolved) survives. Also queued, from the design discussion:

1. **Per-animal lifetime records** (kills, corpses eaten, plants eaten, time sprinting or still), so animals can be described by what they actually do.
2. **Lifestyle clustering:** let the data define archetypes (grazer, scavenger, ambusher, pursuit hunter) instead of assigning them. Observation only: it never feeds back into the sim.
3. **Rare large mutations** (a big coordinated change in several genes at once, no templates).
4. New genes only where the records show a niche missing a real trade-off. Stamina was the first.
5. Phase 5: sexual reproduction, species and lineage tracking.
