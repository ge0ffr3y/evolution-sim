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
