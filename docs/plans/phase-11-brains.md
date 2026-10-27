# Plan: Phase 11, bigger brains and richer senses (proposed, waiting for the owner's OK)

**Why:** brains are the part of the sim with the most room left to grow, and they may be what meat eaters are missing. Earlier findings: meat eaters mostly die killed, often by other meat eaters; they attack whatever is nearest, relatives included; chasing never evolved. Better eyes and deeper brains go straight at that.

**Starting point** (measured 2026-10-27 on the stream world, seed 846571, tick 16.6 million, 874 animals; script kept outside the repo):

| | Founders (tick 0) | Stream world now | Limit today |
|---|---|---|---|
| Working connections per brain | 1 | mean 12.5, biggest 22 | 768 |
| Thinking units | 0 | mean 3.7, most 7 | 16 |
| Brain's share of all costs | 1.5% | 3.6% | |

- 85% of the wiring into actions passes through thinking units: brains do combine senses.
- 71 of the 82 senses are used by at least one brain. Prey sight on the left side is never used: in the grand world a plant eater sees prey only as strongly as its diet is meaty (`brainAppetiteSenses`).
- **The lesson:** brains are nowhere near their limits. Raising the limits is needed for the long run, but brains only grow where a bigger brain pays. So the senses that make smarter behaviour possible matter more than the extra room.

**Goal:** brains can grow deeper and sense much more of the world and of themselves, including pain and joy. Everything stays optional and off by default, every new piece is tested, and evolution decides what gets used.

**Done when:**
1. All new features are optional. With them off, every existing world plays out exactly as before (all brains-off goldens unchanged; brain-world goldens re-recorded only where the layout moved).
2. The stream's saved world (and any older save) still loads and carries on.
3. In the upgraded grand world (16 seeds, 500,000 ticks): brains grow clearly beyond today's baseline (mean above 12.5 connections, biggest above 22) in most seeds, and most new senses are used by some brains. Reported honestly if not.
4. Meat-eater check: lasting meat-eating groups (counted with `meat-groups.mjs`) appear more often than in the baseline grand world. Reported honestly if not.
5. Roadmap item: brain worlds measurably beat brainless controls (food found, population or survival), or we can say why not.
6. The stream still runs smoothly at 1080p20 (at 2x speed, or with one of the free fallbacks in section 7).

---

## 1. Measuring brains (first, changes nothing in the world)

Built first, so every later step can be judged against the baseline.

- **A `brains` measure** in the runner (opt-in): working connections, thinking units, depth (longest chain of thinking units), loops, senses used, actions driven, all by diet band, plus the most complex brain alive.
- **A brain chart in the viewer:** average and biggest brain over time, next to the other charts.
- **Stream (private repo, later):** a "most complex brain ever" record, a `!brain` chat command that shows the current champion's wiring, and a brain slide.

## 2. Tuning the appetite sense (the owner's choice: tune, not switch off)

Today, with `brainAppetiteSenses` on, food signals are scaled by diet: an animal that is 30% meat eater sees prey at 30% strength. A plant eater taking its first steps toward meat can barely see its food.

Two versions, both optional:
- **A floor** (`brainAppetiteFloor`, default 0 = today): prey looks at least this strong, rising with diet (strength = floor + (1 - floor) x diet). Simple and easy to read.
- **An attention gene** (the 34th gene, `preyAttention`): evolution decides how strongly each animal notices prey. It costs a little upkeep, so it is only kept where it pays. This follows the "nothing hard-coded" rule best.

Tested against each other (section 8). The winner goes into the grand world only with evidence.

## 3. Deeper brains

**Today:** senses → one row of up to 16 thinking units → actions. A thinking unit cannot feed another one.

**The change:**
- **Thinking units can feed other thinking units.** Units are worked out in number order. A connection from a lower-numbered unit to a higher one is used in the same thought, which gives depth: ideas built on ideas, such as "small" + "moving away" + "not my colour" → chase. A connection the other way (or to itself) carries the value from the previous thought, which gives loops: a brain can hold a thought, keep a rhythm, or remember what it was doing. One simple rule gives both, and every connection a mutation makes is valid.
- **Up to 64 thinking units** instead of 16 (`brainHiddenMax`; worlds that leave it alone keep 16).
- **Room per brain becomes a setting** (`brainSlots`, default 768 = today). Today's biggest brain uses 22, so the grand world does not need more yet; the setting lets a world raise it later without a code change.
- **Bigger node numbers:** wiring is stored in a format that tops out at 256 nodes (today 109). It moves to a 16-bit format, which removes that ceiling (about 46 MB more memory in a full 30,000-animal world).
- **Mutations:** "add a thinking unit" already splits a connection in two; it now also works on connections between units, which is how depth grows. Mixing parents' brains keeps today's rule (each thinking unit comes from one parent).
- **Costs stay as they are:** each thinking unit and connection costs a little upkeep. No extra charge for depth or loops, so evolution weighs them like any other wiring.
- **Saving:** loops mean a brain has state between thoughts, so each animal's unit values are saved with the world. Older saves load with their units starting at 0, and their node numbers are renumbered as today (`BRAIN_LAYOUTS` learns about the larger thinking layer).
- **Brain viewer:** units drawn in columns by depth, loops drawn as curved arrows.

## 4. New senses and actions

All read 0 when their feature is off. A sense costs nothing unless a brain is wired to it, so no new cost lands on every animal at once. New inputs go in before `bias`, as before.

### 4a. Feelings and body (`feelings`)

- **Pain** (0 to 1, plus which way it came from: ahead and left). Rises when the animal is attacked (whether or not it dies of it, so mostly from failed attacks against it), when its own failed attack injures it (`attackInjury`), and when a disaster harms it. Fades within a few thoughts. Pain from a direction is new: today an animal can tell it is stressed, not where the danger is.
- **Joy** (0 to 1). Rises when it eats well (compared with what it needs), makes a kill, mates, has young, or is fed and safe near relatives. Fades like pain. It is the mirror of pain, so a brain has something to seek as well as something to avoid.
- **Curiosity** (the 35th gene, optional, `curiosity`): a little joy for being somewhere it has not been lately (each animal remembers its last 8 places). The gene sets how much; it costs a little upkeep. This is what makes play possible without building play: if animals evolve to wander and try harmless moves when fed and safe, that is play emerging.
- **With learning on,** pain and joy join the learning reward (`learnFeelings`): reward = energy change + joy - pain. Learning then has something richer to learn from.
- **Feeling sick** (0 to 1, disease worlds).
- **Ready to breed** (how close to breeding energy, and whether it is looking for a mate).
- **Taste** (-1 to 1): how good or harmful its last bite was (palate match, plant toxins, poisonous prey).

*How this relates to the existing chemicals:* the grand world already has four chemical signals (reward, stress, bonding, calm). They stay unchanged. Pain and joy differ: they are tied to specific events, they are felt at once, pain has a direction, and joy covers more than food. Today the stress signal is never wired by any brain in the stream world, so the new feelings are a better-shaped version of what stress was meant to give. If the experiments show pain and joy do the chemicals' job better, retiring the chemicals in the grand world is a later, separate decision.

*A note on what these are:* these animals are small sums of numbers, so pain here is a value going up, not suffering. Pain always has a cause, always fades, and is balanced by joy.

### 4b. Better eyes (`richVision`)

For each of the 10 things the eyes see (5 directions × nearest smaller and nearest bigger):
- **Colour:** how like its own colour the thing is (-1 to 1). Lets an animal tell "one of us" from a stranger, and learn warning colours. Camouflage still applies: a hidden animal is not seen at all.
- **Motion:** is it coming closer or moving away (-1 to 1). Probably the missing piece for chasing and for fleeing in time.

Also:
- **How many** smaller and bigger animals are in view (not just the nearest).
- **Behind me:** a rough sense of the nearest animal behind (how near, bigger or smaller), since the eyes face forward.
- **Plants by sight:** how much plant food lies at the edge of sight, ahead, left and right (smell only reaches next door).
- **A focus action** (new output): when the brain chooses to focus, its eyes lock on to the nearest smaller animal ahead and keep tracking it even if it leaves the view: which way, how near, closing or not (4 inputs). It costs a little energy while focused. This makes a chase possible.

### 4c. Surroundings (`worldSenses`)

- **Crowding:** how many animals of any kind are nearby.
- **Light:** day or night (worlds with `dayLength`; the grand world has a 150-tick day).
- **Ground tremor:** big animals moving nearby, felt without seeing them (no direction).
- **Compass:** which way is north and east, so seasonal journeys become possible.

### 4d. Hearing and calls (`calls`)

- **A call action** (new output): the animal makes a sound. Louder calls cost more energy and carry further.
- **Hearing:** the loudest call heard: how loud, from ahead, from the left, and whether the caller looks like its own kind (colour).
- Nothing rewards calling itself. Alarm calls, mating calls or hunting calls only appear if they pay. Calls are heard one thought late, so the order animals are processed in never matters.

### Count

About 45 new inputs (82 → about 127) and 2 new outputs (11 → 13). With 64 thinking units that is about 204 nodes, which is why the 16-bit format comes first.

## 5. Rules kept throughout (from CLAUDE.md)

- No `Math.random`, no time, and only exact arithmetic (`+ - * /`, `Math.sqrt`, `Math.floor`, `Math.min/max/abs`) in sim-core. Directions and motion use the same trigonometry-free measures as the eye today.
- Every energy flow is on the ledger: calls and focus cost energy on the brain line; joy and pain create or destroy no energy. Conservation tests keep passing.
- No hard-coded roles or behaviours: play, chasing, alarm calls and herding must emerge.
- Every new tuning number goes in the config.
- Same seed, same history: senses are worked out before anyone moves, as now.

## 6. Tests (guardrails)

- Brains-off goldens never change. Brain-world goldens are re-recorded once per layout change, with the reason in the commit.
- For each sense, a small test world showing it reads correctly: pain after a failed attack points toward the attacker; motion is positive for an approaching animal; colour matches for a clone; a call is heard within range and not beyond; and so on. Each reads 0 when its feature is off.
- Deeper brains: a hand-built three-unit chain gives the expected output; a loop carries a value to the next thought; save and load mid-loop continues exactly.
- Loading: a world saved with today's layout loads, renumbered, and runs on deterministically. The stream's real save is checked by hand (it is private, so it is not stored in the repo).
- Energy and matter conservation, snapshot round-trip and the forbidden-API guardrail, as always.
- The full suite runs on GitHub CI (push the branch), not on the owner's laptop.

## 7. Speed and the stream server

- **Profile before and after each step** with `npm run bench` on a big brainy world: how much of a tick goes to looking around, to brain arithmetic, and to everything else.
- **Stream budget:** the sim runs on one thread at 2x on the 3-core ARM server (about 80% busy).
- **Free fallbacks if it gets tight:** brains think every 3 ticks instead of 2 (`brainEvery`), or the sim runs at 1.5x. Slower thinking favours prey over hunters, so it is measured before it is used.
- **Paid options, only if free ones are not enough:** a faster core (the sim is one thread, so core speed matters more than core count). Prices to be checked when needed. The owner may also check whether the third core is actually billed (Oracle lists 3,000 free core-hours a month).

## 8. Experiments (AWS, each needs the owner's yes and a cost estimate first)

Each one: 16 seeds, 500,000 ticks, against the current grand world, using `npm run exp -- report`. Effects are confirmed on fresh seeds before any preset changes.

1. **Appetite:** floor 0, 0.25, 0.5, and the attention gene.
2. **Deeper brains:** 16 units without depth (today), 64 units with depth and loops.
3. **Each sense group** on its own (feelings, eyes, surroundings, calls), then all together.
4. **Brains against no brains,** in the upgraded world (the open roadmap item).
5. **One long run** (2 million ticks, 8 seeds) of the winner, to see whether complexity keeps climbing.

Measured in every run: brain size and depth, senses used, species, population, feeding levels, lasting meat-eating groups, and the energy ledger (anything absurdly successful gets checked for an exploit first).

## 9. Order of work

Each step is a small set of commits on `phase-11-brains`, CI green before the next.

1. Measuring tools (section 1).
2. Appetite tuning (section 2).
3. Deeper brains (section 3), which also brings in the 16-bit format.
4. Feelings and body (4a).
5. Better eyes and focus (4b).
6. Surroundings (4c).
7. Hearing and calls (4d).
8. Experiments (section 8), then a proposed grand-world update for the owner to approve.
9. Release: merge to main (updates the public site, owner's go-ahead), devlog entry, roadmap ticks, then the stream: deploy, `!brain`, the brain record and slide.

Steps 4 to 7 can each be stopped or reordered if the experiments say so.

## 10. Open questions for the owner

- Is "Phase 11" the right name, and should it be added to the Obsidian roadmap now?
- The stream world: once released, should the stream keep its current world (a saved world keeps its own settings, so the new features would be switched on for it as it loads, and its existing brains would then have to discover them), or start a fresh grand world with the upgrades on?
