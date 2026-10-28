# Devlog 26: Bigger brains and richer senses

*Phase 11. Brains get room to grow deeper, and much more to sense: pain and joy, colour and motion, a focus that can lock on to prey, ground tremor, daylight, a compass, and calls that others can hear. Everything is off by default. Two cloud experiments, about $5.50 together. Now running on the stream.*

![Left: the share of brains with a loop climbs to about 90% within 50,000 ticks in every version of the package. Right: animal by animal, the eye narrows as the diet gene rises, from today's eye for pure plant eaters to about 0.83 for animals eating a third or more meat.](../media/phase-11-brains.svg)

## Where brains started

The stream's own world, after 16.6 million ticks, had evolved real brains: 85% of the wiring into actions passed through a thinking unit. But the average brain had 12.5 connections out of 768 possible, the biggest 22, and at most 7 of 16 thinking units. Brains were nowhere near their limits. Bigger brains did not pay.

## What was built

All optional, all off by default, each with its own tests (`appetite`, `deepbrains`, `feelings`, `richvision`, `surroundings` and `calls` test files):

- **Brain measuring tools:** the world's stats report the most complex brain alive, how many senses brains read, the longest chain of thinking units and how many brains have a loop. The viewer's brain chart has grey lines for the most complex brain. `apps/runner/scripts/brain-report.ts` describes the brains in any saved world.
- **Appetite tuning:** a floor under how faintly a plant eater sees prey, and an attention gene (the 34th) that lets evolution decide.
- **Deeper brains:** room for 64 thinking units instead of 16. Units can feed later units in the same thought (depth) and themselves or earlier units in the next one (a loop), so a brain can build ideas on ideas and hold a thought.
- **Feelings and body senses:** pain, with the direction it came from; joy, from good meals, kills, young and being fed and safe; feeling sick; ready to breed; the taste of the last bite. A curiosity gene (the 35th) gives a little joy for somewhere new, which is where play could emerge. Nothing builds play itself. Pain always has a cause and always fades.
- **Better eyes:** for everything seen, its colour likeness and whether it is coming closer; how many animals are in view; a short-range feel of something behind; plants at the edge of sight. A **focus** action locks the eyes on to prey and tracks it out of view.
- **Surroundings:** crowding, ground tremor (big animals moving nearby), daylight and a compass.
- **Calls and hearing:** a call action, heard one tick later by others nearby, with direction and the caller's colour. Nothing rewards calling.
- **Loading a world with features switched on:** a saved world can be loaded with new settings, which is how the stream's running world got the upgrade.

## What emerged

**Appetite tuning alone did nothing measurable** (16 worlds, 500,000 ticks): no change in meat eating, feeding levels or brains. How faintly grazers see prey is not what holds meat eating back.

**The whole package** (16 worlds, 500,000 ticks, with and without the eye gene, and with learning):
- **Brains grew deeper, not bigger.** About 90% of brains grew a loop within 50,000 ticks, and chains of up to six thinking units appeared in every world. There were half again as many thinking units, but connections barely rose, and the most complex brain was no bigger than today's. Brains read fewer different senses, leaning on held thoughts instead.
- **Joy is the new sense evolution clearly wants:** read by up to 30% of brains, against about 5% by chance. Ground tremor and a focused target "coming closer" are also used above chance. Pain, colour, motion, crowding, daylight, the compass and hearing were not, and calling never caught on.
- **Disease fell by up to half** (23% of animals sick down to 11%). Why is not yet known.
- **Eyes narrow with meat in the diet.** Animal by animal, pure plant eaters keep today's eye, and the eye narrows steadily as the diet gene rises to about 0.3, then levels off. In 3 of 16 worlds pure grazers went clearly wide. Most animals eat a little meat, so most eyes are narrow.
- **No lasting meat eaters,** in any world of either experiment.
- **Costs:** 5 to 14% fewer animals, slightly fewer species, about 14% slower per tick.

Details: [Phase 11 findings](../findings/phase-11-brains.md).

## What broke

- **Switching a feature on for a saved world could load the wrong data.** Each animal's arrays were saved in a numbered list whose order depends on which features are on. Turning one on (the eye gene, say) shifted everything after it, so a save either failed to load or loaded quietly into the wrong arrays. Loading now finds each array by name in the saved world's own list. The save format did not change.
- **A deep brain run without depth would have read nonsense** (a unit-to-unit link read as a sense that does not exist). The older path now ignores such links.
- **The fixed-layout brain's default of 8 thinking units no longer fit** the connection room once the senses were added. The default is now 4, which is what the preset and its test world already used.
- **The first experiment was refused by the cloud cap:** the account's monthly spend had passed $100 before launch. The owner raised the budget to $150, and the runner's cap followed.

## On the stream

The stream's world (seed 846571, 18 million ticks) carried on with the package switched on: deeper brains, feelings and curiosity, better eyes and focus, surroundings and calls. The eye gene and vigilance were held back for now, and brains think every 3 ticks instead of 2. Chat has `!brain` (the most complex brain alive) and a most-complex-brain record. With the bigger brains the simulation filled its server core at 2x, so the stream now runs at 1.5x and holds that speed. A faster server core (about $56 a month) is the next step if the brains outgrow it.

## Still open

- **Lasting meat eaters in the grand world** remain the main open question. Neither appetite nor brains is the brake.
- **Why disease fell** with the package.
- **Brains against no brains** in the upgraded world, and a long run to see whether brains keep deepening.
- **The eye gene on the stream,** held back by the owner's choice.
