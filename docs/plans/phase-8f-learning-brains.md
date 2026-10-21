# Plan: learning brains (proposed, waiting for the owner's OK)

**Why:** brains today do not learn. Each brain's wiring is fixed at birth by its genes; only evolution, across generations, changes it. The audit (Phase 9, stage 1 review) found:
- brain memory works but nothing uses it: brains read it no more often than inputs that are always 0;
- the sense of home is used, but it is a ready-made signal, not something the animal works out.

Memory only pays when there is something worth carrying from one moment to the next that the senses do not already give, and something that can make use of it. Learning during a lifetime gives both.

**Goal:** individual animals can learn during their lives. How well they learn, and what kind of learning they can do, are evolvable traits with an energy cost, never fixed roles. Done when:
- in a simple test world, learners outperform non-learners, and the learning genes rise from low starting values;
- in the grand world, the learning genes are not pinned at 0, and brains read their memory clearly more than chance;
- an animal's intake rises with age within its own life (the signature of learning, as opposed to evolution);
- brains-off and learning-off worlds stay identical to now.

## 1. How an animal learns: reward-guided strengthening

This is the best-studied way to give evolved brains lifetime learning (biologists call it a three-factor rule; it is roughly how dopamine shapes learning).

- Each connection keeps a short trace of whether it was recently active. That means its source and its target were both firing, the "neurons that fire together" part.
- After each thought, every connection with a fresh trace is strengthened or weakened by:

  **learning rate gene × (how things are going now − how they usually go) × trace**

  "How things are going" is the reward chemical, which already rises when the animal eats (relative to what it needs), minus the stress chemical, which rises when it is hurt, sick or hungry. "How they usually go" is the animal's own running average. So only better-than-usual or worse-than-usual outcomes teach it anything.
- What is learned is kept apart from the inherited wiring: the brain uses inherited strength plus learned change. The learned part is capped, starts at 0 at birth, and is not inherited, so the genes stay intact. Animals that learn well leave more young, which is how learning ability evolves (the Baldwin effect).
- **Cost:** keeping the learning machinery running costs upkeep in proportion to the learning rate gene, on the brain line of the ledger. No energy is made; it only moves through the ledger as now.
- **Exact arithmetic only** (`+ - * /`, `Math.sqrt`), no random draws, so the same seed gives the same history in every browser.
- **Memory size:** learned changes and traces are kept for the first 64 connections of each brain (evolved brains use 8 to 12). That is about 15 MB for a full 30,000-animal world.

## 2. Kinds of intelligence (evolvable genes, each graded, each with a cost)

Following the Phase 8 rule: each one gives a small benefit as soon as it is a little above 0, or evolution cannot find it.

1. **Learning rate:** how fast connections change with experience (the core "IQ" gene). Upkeep rises with it.
2. **Working memory:** how many of the four memory cells the brain can actually use (graded: the gene sets how much of each cell's value carries over). Upkeep per cell used.
3. **Place memory:** how many good feeding places it remembers (1 to 4, instead of the single "home" now), each fading over time, with a sense pointing to the best one it still remembers. Upkeep per place.
4. **Teaching (later, optional):** a newborn starts with a share of its parent's learned changes, as a simple form of culture. Learned knowledge can then spread beyond one lifetime without being written into genes. This is the most speculative of the four, so it comes last.

Proposed order: learning rate first (with the senses below), then working memory, then place memory, then teaching. Each step is tested before the next.

## 3. New senses that make learning and memory worth having

- **"Did that just work?"**: the change in its own energy since its last thought (signed).
- **Time of year:** two inputs that together say where in the year it is. Kinds of plant peak in different seasons, so an animal that learns the calendar can anticipate them.
- **What I just did:** its own last turn and speed. Without these, a brain cannot link an outcome to the action that caused it.
- **Surprise:** reward compared with its own running average (the same quantity that drives learning, offered as a sense too).
- **Best remembered place:** ahead, to the side, how far (with place memory).

New inputs change the brain layout (about 75 inputs instead of 69):
- `BRAIN_LAYOUTS` gets a new entry, so worlds saved before still load;
- brain-world reference fingerprints are re-recorded once, as in Phase 8e;
- brains-off reference fingerprints must not change.

Each new input reads 0 when its feature is off.

## 4. How we will know it works

**New measures:**
- the learning gene's spread;
- how big the learned changes are;
- intake per tick by age band (young, middle-aged, old);
- memory and place senses read compared with the always-0 baseline (the audit's brain check, made into a measure).

**Tests:**
- learning changes nothing when off;
- the learned part is saved and loaded exactly, and is 0 at birth;
- the upkeep shows up in the ledger;
- a hand-built brain learns a simple association (a reward follows one action) within a set number of thoughts.

**Experiments, all in the cloud:**
1. A **learning test world:** small and fast, with food that moves with the seasons in a fixed pattern. Learning on against off, with each new sense on and off; 8 seeds. About 50 cents.
2. The **grand world:** learning on against off, 8 seeds × 300,000 ticks. About $1.

## 5. Where it fits

It is a new mechanism, not an experiment, so I suggest it gets its own branch and devlog entry as **Phase 8f: learning brains**, before the audit's stage 2 (stage 2 should map the world we keep).

## Decisions for the owner

1. Start with learning rate plus the new senses, then add working memory, place memory and teaching one at a time (recommended)? Or build several at once?
2. Teaching (passing learned knowledge to young): include it as the last step, or leave it out for now?
3. Phase name and branch: Phase 8f (recommended), or part of Phase 9?

## Step 1 result: the learning gene and the learning senses (built 2026-10-21)

**Built (all off by default; 685 tests pass):**
- `brainLearning`: reward-guided learning during life, with the 29th gene, `learning`. Its upkeep is on the brain line. Learned changes are kept for the first 64 connections and are not inherited.
- `learnSenses`: energy change since the last thought, surprise, the time of year (two inputs) and the last turn and speed. Three place inputs are reserved and read 0 until place memory exists.
- Brain layout: 78 inputs and 704 connection slots. Brain-world reference fingerprints were re-recorded; brains-off ones are unchanged.
- The reward counts energy handed to young or neighbors as kept, so animals do not learn not to breed.
- Tests:
  - a hand-built brain wired the wrong way round learns the right way from reward alone (right on all of its last 100 tries);
  - learning keeps the energy books exact;
  - saving and loading part-way gives the same future, learned changes included;
  - newborns start with nothing learned.
- New measures: `learning` (how much each brain has learned; food gathered per tick by age) and `brainUse` (how often brains are wired to memory, home and the new senses, against inputs that are always 0).
- New preset: `learning-test` (a 256 world where the best food moves with the seasons in a fixed yearly pattern).

**Cloud runs (8 seeds each; about 35 cents together):**
- `learning-test`, 200,000 ticks: learning and senses on; without learning; without the senses; without either; and with learning that costs nothing.
- `learning-grand`, 300,000 ticks: the grand world as is; with learning and its senses; with the senses only.

| | Test world | Grand world |
|---|---|---|
| Learning gene | starts about 0.35, slips to about 0.28 by tick 25,000, then holds (0.10 to 0.42 across seeds) | starts about 0.30, rises to about 0.42 by tick 10,000, then holds (0.16 to 0.65 across seeds) |
| How much brains learn (sum of learned changes) | 0.09 to 0.12 per brain | 0.35 per brain |
| New senses wired (per input; chance level about 0.04 to 0.05) | 0.11 with learning on | 0.09 with learning, 0.14 with the senses only (holds up) |
| Memory wired | at chance (0.02 to 0.07) in every arm | at chance (0.02 to 0.05) in every arm |
| Population, lifespan, species, food gathered | no change that holds up, except more species without the senses (+0.9) | no change that holds up |
| Food gathered by the old against the young | 0.7 to 0.8 in every arm | about 0.9 in every arm |

**What it means:**
- The machinery works. Animals learn, evolution keeps the learning gene (it rises a little in the grand world despite its cost), and brains adopt the new senses.
- But learning brings no advantage that shows: old animals never gather more than the young, and memory stays unused.
- Likely reason: brains are tiny (6 to 10 connections, mostly "smell food, turn toward it"), and following the nose is good enough in both worlds. Even when food moves with the seasons, smell points straight to it. Learning only pays when the world holds information the senses do not give directly: food beyond smelling range, patterns in time, or things that must be found out by trying.

**Proposed next step:** build place memory before working memory. Remembering good feeding places beyond smelling range gives memory something to hold and learning a reason to exist. Working memory alone would change little while there is nothing worth remembering.

## Step 2 result: place memory (built 2026-10-21)

**Built (off by default; 688 tests pass):**
- `placeMemory` and the 30th gene, `placeMemory`: up to 4 remembered feeding places. Any gene above 0 gives at least one place; a gene of 1 gives `placeSlotsMax`.
- How remembering works:
  - a meal of at least `placeMinMeal` (as a share of the energy needed to breed) refreshes the remembered place it was eaten at (keeping the better value), or replaces the weakest memory;
  - every memory fades by `placeFade` each tick (0.999: half gone in about 700 ticks).
- The three place inputs reserved in step 1 now point to the best remembered place other than where the animal stands: ahead, to the left, and how far (scaled by `placeRange`).
- Each place it can hold costs `placeCostCoeff` upkeep on the brain line. Memories are not inherited.
- Remembered places are saved by name with the world, moved with the animal and cleared at birth.
- Tests check the gene-to-places rule, the remembering rule step by step, the sense, the cost, exact save and load, and the energy books.
- The test world preset now uses place memory (starting gene 0.1, with founder spread). The step 1 experiment file pins it off (`baseChanges`), so it still describes what ran.
- **Reproducibility check:** the test world without place memory reproduced step 1's control exactly (population 381, average age 820, the same wiring), on a different machine, a day later.

**Cloud runs (8 seeds each; about 50 cents together):**
- `place-test`, 200,000 ticks: everything on; without place memory; place memory without learning; neither (and no learning senses); free place memory.
- `place-grand`, 300,000 ticks: the grand world as is; with place memory; with place memory, learning and its senses.

| | Test world | Grand world |
|---|---|---|
| Place memory gene | starts 0.36, rises to about 0.48 at tick 150,000, ends about 0.41 (0.20 to 0.77 across seeds); about 2 places held, almost all filled | starts 0.30, falls slowly to about 0.20 (0.05 to 0.57 across seeds); about 1.4 places held, almost all filled |
| Place sense wired (per input; chance level about 0.02 to 0.05) | 0.18 to 0.22 | **0.25 with place memory alone (holds up)**; 0.10 with learning too |
| Memory wired | 0.07 with place memory and learning, against 0.02 to 0.03 otherwise (not certain with 8 seeds) | **0.12 with place memory and learning, against 0.035 (holds up): the first time brains use their memory above chance** |
| Diversity | species and Shannon diversity lower without learning (holds up); Shannon 0.53 with everything on, against 0.26 without place memory (not certain) | Shannon 0.77 with place memory, against 0.56 (not certain) |
| Food gathered | no change that holds up; old animals gather less than young (0.73 to 0.82) in every arm | up 10 to 24% with place memory and learning (borderline); old animals gather less than young (0.87 to 0.92) |
| Population, lifespan | no change that holds up | no change that holds up; more kills, more turnover (not certain) |

**What it means:**
- Place memory gives memory and learning something to work with. Brains wire to the place sense far above chance in both worlds.
- With place memory and learning together, the grand world's brains start using their memory cells, which nothing had done before.
- The place gene is kept in the test world, where food moves with the seasons. In the grand world it slowly declines but persists: it is worth something there, but not much more than it costs.
- Still missing: the lifetime-learning signature. Older animals never gather more food than younger ones.
- Diversity and food gathered lean upward, but 8 seeds cannot confirm it. A 16-seed confirmation run would settle these.

## Step 3 result: working memory (built 2026-10-21)

**Built (off by default; 690 tests pass):**
- `workingMemory` and the 31st gene, `workingMemory`. It needs brains with memory (`brainMemory` 1).
- The gene sets how many of the four memory cells a brain can use (any gene above 0 gives one; a gene of 1 gives all four; the rest read 0).
- It also sets how much of a cell's old value carries over each thought: the gene × `wmKeepMax` (0.95). The rest is what the brain writes now.
- Each usable cell costs `wmCostCoeff` on the brain line.
- Tests check the carry-over rule, the gene-to-cells rule, that unusable cells stay at 0, the cost, and (through the shared test world) determinism, the energy books and exact save and load.
- The test world preset now uses working memory (starting gene 0.1); the step 1 and step 2 experiment files pin it off.
- Measure fix after the runs: the cells-per-brain measure added up past the living animals (it reported about 5 of a possible 4). Only the measure was wrong, not the simulation. It now counts only the living; from the gene, the real figure in these runs is about 2 cells.

**Cloud runs (8 seeds each; about 45 cents together):**
- `wm-test`: everything on; without working memory; without learning; cells only (no carry-over); free working memory.
- `wm-grand`: the grand world as is; with place memory and learning; with all three.

| | Test world | Grand world |
|---|---|---|
| Working memory gene | rises from 0.35 to about 0.46 (peak 0.56 at tick 100,000; 0.11 to 0.87 across seeds) | holds near 0.30 (0.04 to 0.65 across seeds) |
| Memory wired (per input; chance level about 0.02 to 0.05) | 0.036, at chance (0.07 without working memory; not certain) | **0.023, at chance: adding working memory undoes the gain from place memory and learning (0.116)** |
| Learning gene | 0.38 (0.45 without working memory) | **0.17 with working memory, against 0.39 without** |
| Food gathered by the old | no change that holds up | **0.060 with all three, against 0.047 in the plain grand world (+27%; holds up)** |
| Kills per 1,000 ticks | no change that holds up | **530 with all three, against 273 (holds up)** |
| Population, lifespan, diversity | no change that holds up; free working memory leans toward longer lives and fewer kills | no change that holds up; species 2.9 against 2.2 and Shannon 0.79 against 0.56 (not certain) |
| Old against young (food gathered) | 0.70 to 0.78 in every arm | 0.87 to 0.92 in every arm |

**What it means:**
- Working memory is kept by evolution (it rises in the test world), and the grand world with all three abilities gathers more food and hunts more.
- But this design does not get brains to use memory more. In the grand world it undid the memory use that place memory and learning had produced.
- Likely reason: brains were using memory as a one-step echo of what they had just written, and slow carry-over blurs that echo.
- It also seems to replace learning: the learning gene falls by half when working memory is present.
- **Better design to consider:** let the brain choose, each thought, how much of each cell to keep and how much to overwrite (a "write" output per cell, like the gating in real working memory), with the gene setting how many cells there are. That means another brain-layout change (four new outputs).
- Still missing: the lifetime-learning signature (older animals never gather more than younger ones).

## Step 3b result: gated working memory (built 2026-10-21)

**Built (off by default; 690 tests pass):**
- Four new brain outputs, "hold memory 1 to 4": one gate per memory cell. A gate of 0 or above (what any brain not wired to it gives) overwrites the cell, exactly as memory worked before. A gate below 0 holds, keeping up to `wmKeepMax` (now 0.99) of the old value at -1.
- The working memory gene now sets only how many cells a brain can use (1 to 4), each costing upkeep.
- The outputs were added after the existing ones, so no connection changed number and every saved world still loads.
- Connection capacity rose from 704 to 768; the brain-world reference fingerprints were re-recorded; brains-off ones are unchanged.
- New measure: `wired_gates` (connections into the gates, per gate).
- `wm-test` and `wm-grand` above ran the first, carry-over design (commit 4b136a1). Their files now describe the gated design.

**Cloud runs (`gates-test`, `gates-grand`; 8 seeds each, same arms as step 3; about 45 cents):**
- **No effect holds up in either world.** Population, lifespan, food gathered by age, diversity, kills and memory wiring are all within the noise.
- The working memory gene holds about level: 0.35 to 0.37 in the test world; 0.30, dipping to 0.16, back to 0.27 in the grand world (0.05 to 0.58 across seeds). About 1.6 to 1.9 cells per brain.
- **Gate wiring is chance:** 0.20 to 0.32 connections per gate in every arm, including those where working memory is off and the gates do nothing. A new connection lands on a random output, and 4 of the 11 outputs are now gates.
- **Memory wiring is at chance in every arm.**
- **Step 2's main result did not replicate.** Place memory with learning wired memory at 0.116 per input in `place-grand` (against 0.035). Here the same setup gives 0.027 (against a control of 0.047). Evolution took different paths after the layout change, and the earlier result was most likely one of the few comparisons that look significant by chance among many. Any claim from this phase needs a 16-seed confirmation on fresh seeds.

## Where Phase 8f stands

What works:
- reward-guided learning during life;
- the learning senses;
- place memory;
- gated working memory.

All are tested (determinism, exact energy books, exact save and load) and off by default. Evolution keeps all three genes at moderate levels (about 0.2 to 0.5) when they are on.

What has not happened in any run:
- a lasting, measurable advantage;
- the lifetime-learning signature (older animals gathering more than younger ones);
- brains using their memory reliably above chance.

The place sense and the learning senses are wired above chance in most runs.

The likely reasons:
- brains stay tiny (6 to 10 working connections), because every connection costs energy and the worlds reward the cheapest body;
- in both worlds, following the nose is nearly as good as anything memory could add.

These features will only pay in a world where remembering beats sensing: food or danger that is predictable but out of sensing range, or patterns in time.
