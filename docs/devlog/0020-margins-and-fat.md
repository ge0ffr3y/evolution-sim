# Devlog 20: Margins, and fat that pays

*Phase 9, part 5. The goal was meat eaters in the grand world itself, not only in its own "hunters" version. That goal is not met yet. On the way, the hunt fixed a quirk in how hunters pick prey, measured exactly where a meat eater's margin goes, rebuilt the fat reserve so it pays off, and found a grand world with twice today's species. Ten cloud experiments, about $9. Full write-up: `docs/findings/phase-9-headline-experiments.md`, sections 8 to 9b.*

![Species alive over 300,000 ticks, average of 8 worlds: today's grand world holds about 5; the path bundle about 7; the path bundle with fat that pays for breeding about 10 to 12.](../media/fat-and-species.svg)

## What was built

- **Spare your own parent and young** (`spareFamily`). Babies are born on their parent's spot and hunters attack whoever is nearest, so a hunting family's first victims were its own: in the simple world, one kill in five was a newborn killing its parent. Animals can now recognize their own parent and young by who they are.
- **The diet ledger** (opt-in measure). Every tick, for each diet group: income from plants and meat, running costs by kind, kills, births and deaths.
- **Repeating invasions,** so a group of meat eaters keeps arriving and can be measured in worlds where it would otherwise die out.
- **Fat, reworked,** with three new settings:
  - fat handed to young (`fatProvision`);
  - fat no longer counted when telling relatives apart (`fatRelated`);
  - fat that pays for breeding (`fatBreeding`).

  Brains can now sense their fat reserve.
- **Cloud runs:**
  - AWS raised the account's limit to 192 cores, and the runner can use machines of up to 192 cores;
  - every launch needs the owner's approved ceiling (`--max-cost`) and is refused above it;
  - `--hours` fixes a run's time from real speeds, because the quick speed trial before a launch is unreliable.

## What we learned

- **Meat eaters live at about break-even everywhere** (births about equal to deaths). In the grand world they fall just short:
  - they earn as much as in the hunters' world, but pay about 60% more to stay alive (harmful mutations, heat and cold);
  - their prey breed at half the rate.
- **No single fix gives the margin back.** Each of these slows the loss of arriving meat eaters at best:
  - sparing family;
  - richer bodies (a richer body is carved out of the newborn's start, so a carcass holds about the same);
  - a fat reserve;
  - more plants (which also feed the armed plant eaters that kill newcomers).
- **All the partial helps together let arriving meat eaters stay, but none evolve.** One help, weapons that get in the way of grazing, protects meat eaters once they exist but blocks the road they evolve along (armed plant eaters that slowly eat more meat).
- **Without that one, the "path bundle" is a much richer grand world** (16 seeds, 500,000 ticks): 86% more species, a third more feeding levels, seven times the mixed eaters, three times the kills. Still no meat-eating group: the step from mixed eating to a meat specialist is the barrier.
- **Fat was a cost, not a reserve.**
  - It was banked before breeding and lost 20% going in.
  - It cost upkeep and movement to carry, was drawn only near starvation, and was never passed on.
  - Evolution dropped the gene.
- **Reworked, evolution keeps fat** (the gene stays about 0.5). It first halved sex, because it banked the energy animals held while waiting for a mate. With fat paying for breeding, that cost is gone.
- **The path bundle with fat that pays for breeding** has twice the species of today's grand world, 43% more diversity, and a bigger population with a higher low point (8 seeds).

## What broke, or misled

- **The quick speed trial before a launch misjudges big worlds**, far off in both directions (once 70% too cheap, once more than twice too dear). Two launches came in dearer than quoted, which led to the cost ceiling; one launch was refused twice over fractions of a cent, which is the ceiling working.
- **Margin tests on 4 worlds vary a lot:** the same setup held arriving meat eaters at 38 in one set of worlds and 11 in another.
- **A table of mine lumped two setups together** because one name started with the other; caught and fixed before it was written up.

## Still open

- **Meat eaters do not yet evolve in the grand world.** Untested candidates for the last step:
  - mating by diet on top of the path bundle;
  - gentler seasons;
  - letting would-be hunters perceive prey (in the grand world, a brain sees prey only as strongly as its own diet, so a plant eater barely sees its future food);
  - a founder pull toward prey.
- **Brains did not grow with fat** in 300,000 ticks.
- **Whether to make the path bundle with fat the new grand world** is the owner's call.
