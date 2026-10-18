# Devlog 9: Closing open questions

*A short cleanup between Phase 8 and Phase 9. Four loose ends from earlier phases, checked with data instead of left as "not measured".*

No simulation code changed. These are experiments and roadmap housekeeping.

## 1. Do predators and prey cycle? (Phase 3, still only partly)

This was already measured in devlog 3, so I did not re-run it. The result stands: one big boom and bust when predators first arrive, then irregular waves in the carnivore count. By a swing count, 6 of 12 default-world seeds show two or more full swings in 300,000 ticks, and 7 of 8 in the Boom and bust preset. A formal test for predators following prey with a delay found it in at most 1 of 12 seeds, and there is no regular rhythm. The roadmap box stays unticked, now with those numbers beside it.

## 2. Do brains find more food than random walkers? (Phase 4: not shown)

8 seeds each, 100,000 ticks, brains (evolvable layout, appetite senses, kill ownership) against no brains, measured over the second half.

| | No brains | Brains |
|---|---|---|
| Food energy eaten per organism per tick (plants plus meat) | 0.194 | 0.184 |
| Of that, brain upkeep | 0 | about 0.002 |
| Average population | 633 | 733 |
| Total food eaten per tick | 95.8 | 105.9 |

Per organism, brains do not find more food: it is slightly lower, and in 4 of 8 seeds higher. The brain world has a somewhat bigger population (higher in 5 of 8) and takes in about 10% more food in total (higher in 6 of 8), but with only 8 worlds and very different outcomes from seed to seed (some worlds are predator-free with 1,700 animals, others have many meat eaters and 500), I would call it a wash, not a win. Brains cost about 1% of what an animal eats, so the cost is not what holds them back. The roadmap box stays unticked: "brains measurably outperform random walkers" is not supported by the intake measure. What brains did show earlier is behavior (prey turning away from threats), not more food.

## 3. Do evolved brains use the Phase 7 senses? (mixed)

6 worlds each, 150,000 ticks, brains on. The control is a world where the sense is always zero, so any connection from it is a leftover from random mutation. The table is the share of brains that have a working connection from the sense.

| Sense | In a world where it matters | In a world where it is always zero |
|---|---|---|
| Relatives nearby (kin density) | 30% | 7% |
| Which way relatives lie (ahead) | 30% | 3% |
| Which side relatives lie | 42% | 1% |
| Water ahead | 12.5% | 5% |
| Too hot or cold (comfort) | 2.6% | 2.8% |

- **The relatives senses are used, and for steering.** Between a fifth and two fifths of brains wire them straight to turning or speed (0.2 to 0.4 connections per brain, against about 0.005 in the control). But it varies a lot between worlds: in one world 96% of brains read kin density, in another 1%.
- **Water ahead: weak.** Two of six worlds have it in 21% and 41% of brains, the other four are at or below the control, and direct steering connections are no more common than in the control (0.013 against 0.010). Brains still bump along coasts rather than steer away.
- **Comfort: no sign of use.** The same rate as the control, even in a seasonal world where the preferred temperature costs energy. A plausible reason is that adaptation by the temperature gene is simpler than adaptation by a brain, but I did not test that.

## Roadmap housekeeping

The Phase 5 "Release v0.2" box was ticked (the tag has existed since Phase 5). The Phase 3 and Phase 4 boxes above got their numbers written next to them.

## Next

Regroup with the owner on the further ideas, then Phase 9. Still open: why hunters do not chase (Phase 4), and why kin recognition stops predators forming, and why predators erase colonies.
