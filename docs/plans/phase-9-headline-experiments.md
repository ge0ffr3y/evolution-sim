# Phase 9 plan, part 3: headline experiments (proposed, waiting for the owner's choice)

**Goal (the roadmap's "Done when"):** each headline experiment has a clear chart and a written conclusion. All run in the audited grand world, on 16 fresh seeds per setup, with the question and what counts as an answer written down before anything runs. The audit showed that 4 seeds find false effects, so 16 is the minimum.

## The candidates

Five from the roadmap and from what the audit found. Each line gives the setups, the length, what counts as an answer, and the expected cloud cost on one 32-core c8g machine (estimates have been roughly double the real cost so far).

### 1. Does an ice age raise or lower long-term diversity? (roadmap)

- **Setups:**
  - random catastrophes switched off, as the control;
  - one ice age at tick 200,000, at three severities: cooling 0.3 (today's), 0.45 and 0.6 (the cliff found in the audit).
- **Length:** 600,000 ticks. Diversity is compared before the ice age (tick 100,000 to 200,000) and long after it (tick 400,000 to 600,000).
- **An answer is:** species alive and Shannon diversity after recovery, against the control, with 95% ranges. Also how many worlds survive each severity.
- **Cost:** 64 runs, about $1.

### 2. Does sex speed up the arrival of new feeding levels? (roadmap: "predators")

- **Setups:**
  - asexual only;
  - sex as a gene (today's grand world);
  - sex for everyone.
- **Length:** 300,000 ticks.
- **An answer is:** the time until mixed eaters (5 or more) first appear and how long they last, the highest diet reached, and meat in the diet. The grand world has no lasting meat eaters yet, so "predators" means the second feeding level.
- **Cost:** 48 runs, about $0.40.

### 3. Do geographic barriers produce more species? (roadmap)

- **Setups:** seas covering 10%, 25% (today's) and 40% of the map. A wider water barrier between land masses can be a fourth setup.
- **Length:** 500,000 ticks.
- **An answer is:** species alive and ever, Shannon diversity, and how much lineages differ between land masses (a new measure: how different the average genes are on each land mass).
- **Cost:** 48 runs, about $0.70.

### 4. Does disease stop one species taking over? (roadmap)

- **Setups:**
  - no disease;
  - today's disease;
  - a disease that spreads more easily (wider host matching).
- **Length:** 300,000 ticks.
- **An answer is:** the share of animals in the biggest species (a new "dominance" measure) and Shannon diversity.
- **Cost:** 48 runs, about $0.40.

### 5. Does poorer plant food make longer food chains but fewer species? (from the audit)

- **Setups:** four plant quality limits: 2 (today's), 1.5, 1 and 0.75.
- **Length:** 1,000,000 ticks. Long enough to see whether true meat eaters finally take hold where plants are poor, which is the grand world's main open question.
- **An answer is:** feeding levels, meat eaters (lasting groups with diet above 0.75), meat in the diet, species and population, along the gradient.
- **Cost:** 64 runs, about $1.50.

**All five: about $4.**

## The charts: an analysis page (roadmap step)

- **A page in the viewer** that loads an experiment's results. For each measure it draws each setup as a point with its 95% range, and draws a measure over time as one line per setup with a band for the spread between seeds.
- The written conclusions go in a findings document, and the charts are embedded in the devlog.
- **Two ways to build it:**
  - (a) **inside the viewer** (what the roadmap describes; reusable for every future experiment);
  - (b) **a runner command that draws charts as images** (quicker, but nothing to explore).

  I recommend (a), with (b)'s image export as a button on the page.

## Suggested order

1. Build the two new measures: dominance (share of the biggest species) and difference between land masses. Tests that they do not change the world.
2. Run experiments 1 to 4 together; run 5 as a long run.
3. Build the analysis page while they run.
4. Write a conclusion and a chart for each, then devlog 17.

## Decisions for the owner

1. Which experiments: all five (recommended), or a subset?
2. The analysis page inside the viewer (recommended), or chart images only?
3. Anything to add? For example, the oasis world's place memory as a sixth experiment ("memory pays where food is scattered"), or the open puzzle of why turning off kin restraint cuts hunting.
