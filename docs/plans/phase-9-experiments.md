# Phase 9 plan, part 1: the cloud-ready experiment runner

**Owner's decisions (2026-10-20):** on-demand machines only, no spot. Test c7g and c8g side by side. Keep results in S3 for 60 days.

**Goal:** describe an experiment once in a small file, then run it on the laptop (tiny tests) or on one rented AWS machine (real runs), with:
- progress saved as it goes, so an interrupted run picks up where it stopped;
- the machine shutting itself down;
- a time and cost estimate shown, and agreed, before anything is launched.

This replaces the throwaway scripts used in Phase 8e (`drive.py`, `o4diag.ts` and friends).

## 1. Experiment files

One folder per experiment: `experiments/<name>/experiment.json`, kept in git. Results go in `experiments/<name>/results/`, which is ignored by git. Example:

```json
{
  "name": "meat-eating-long",
  "question": "Do specialist meat eaters appear in the grand world given 500,000 ticks?",
  "base": "grand-world",
  "ticks": 500000,
  "seeds": "1-8",
  "sampleEvery": 1000,
  "checkpointEvery": 50000,
  "arms": {
    "control": {},
    "best": { "mutationLoadMend": 0.15, "nutrientMode": 2, "kinHungerBelow": 0.5, "meatGorge": 5, "bodyEnergyPerSize": 8 }
  },
  "measures": ["population", "dietSpread", "meatEaters", "kills", "sex", "mutationLoad", "species"]
}
```

- **What each part means:**
  - `base` is a preset from `configs/`;
  - each **arm** is a set of changes to it (always include a control);
  - every arm runs on every seed;
  - `question` is written down before the run, so we know in advance what would count as an answer.
- **Checked before anything runs:** unknown settings, impossible values and unknown measures are caught at once (each arm's world is built for a moment, without running).

## 2. Measures library

A named list of things to record. Each one only reads the world; a test checks that recording never changes what happens. Each produces:
- a time series, one row every `sampleEvery` ticks;
- a few summary numbers per run (for example: extinct or not, time to first predator, averages over the last half).

**From the roadmap:**
- population;
- species richness;
- Shannon diversity;
- number of trophic levels;
- time to first predator;
- time to multicellularity;
- extinction.

**Ones that earned their keep in Phase 8e:**
- the diet spread (shares in each diet band, the highest diet, meat eaters);
- kills and attack success;
- the share of births with two parents and the sex gene;
- harmful-mutation load;
- colony share and colony size;
- trait differences between biomes;
- nutrient and water shortage;
- ice cover;
- soil evenness;
- disasters fired.

Planted test animals (like the O4 hunters) become an optional "probe" an experiment can switch on.

## 3. Jobs, saving progress, resuming

- A **job** is one arm on one seed. Each job writes:
  - its result file when it finishes;
  - a saved world (checkpoint) every `checkpointEvery` ticks, and on a clean stop.
- **Resuming:** a job with a result is skipped. A job with a checkpoint carries on from it. (No spot interruptions, but checkpoints still protect against crashes and let a long run be split or extended later.) Because saving and loading is exact, a resumed run gives the same answer as one that was never interrupted. This gets a test: run straight through, run with a stop and resume in the middle, compare the fingerprints.
- A small **status file** lists what has finished, what is running, how far each job has got, and the estimated time left. "Is it done?" then has a reliable answer.

## 4. Laptop commands

```
npm run exp -- check    experiments/<name>     validate the file, list the jobs
npm run exp -- estimate experiments/<name>     time and cost estimate (see 6)
npm run exp -- run      experiments/<name>     run here (cores minus one by default), resuming anything unfinished
npm run exp -- status   experiments/<name>     what is done, running, left
```

On the laptop this is only for tiny test runs.

## 5. The cloud

```
npm run exp -- cloud launch experiments/<name>   start one machine for this experiment (only after a yes to the estimate)
npm run exp -- cloud status                      our machines, how long they have run, cost so far, progress
npm run exp -- cloud fetch  experiments/<name>   download results to the laptop
npm run exp -- cloud stop                        terminate our machines now
```

**How a launch works:**
1. The code at the current commit, plus the experiment file, is uploaded to the results bucket (`evolution-sim-results-<account>`).
2. **One on-demand machine starts** (never interrupted): a Graviton machine (c7g or c8g, sized to the work, see 6), using the standard Amazon Linux image, tagged `Project=evolution-sim`, with the results-only role, and set to *terminate* (not just stop) when it shuts down.
3. **The machine's start-up script:**
   1. installs Node and unpacks the code;
   2. **schedules a hard shutdown** at the estimated time × 1.5 (it can never run on unwatched);
   3. runs the experiment on all cores;
   4. copies results, checkpoints, status and a log to S3 every few minutes;
   5. writes a done marker and shuts down, which terminates it.
4. **No SSH, no open ports:** everything goes through S3, so the machine needs no login or firewall opening. (The runner user may create a key and firewall, but we don't need them.)
5. **If a machine dies anyway** (very rare on demand): the checkpoints are in S3, `cloud status` shows it, and a second `cloud launch` resumes. I tell you before relaunching.
6. **Results are kept in S3 for 60 days,** then deleted automatically. The runner sets that expiry rule when it creates the bucket.

## 6. Estimate and spending guard

- **Time:** each arm runs briefly on the laptop (a few seconds) to measure ticks per second. That is scaled to the full length, with a 1.5× margin because populations can grow, and divided by the machine's cores, counting the longest single job, which can't be split.
- **Machine size:** single runs cannot be split across cores, so a 64-core machine is only worth it when there are about 64 jobs. The estimate picks the size that finishes in about the time of the longest job, without paying for idle cores. For example, 8 long runs go on an 8-core machine, not a 64-core one.
- **Cost:** machine-hours × the on-demand price (read live from AWS), plus a little for storage. Approximate us-west-2 prices: c7g.16xlarge (64 cores) $2.32/h, c8g.16xlarge about $2.55/h, with smaller sizes in proportion (a 16-core c7g.4xlarge is $0.58/h). That is roughly 3.6 to 4 cents per core-hour, about 3 times spot.
- **Guard:**
  - before launching, the runner reads this month's account spend;
  - it refuses if spend plus the estimate would pass $50;
  - it always prints the estimate and needs an explicit `--confirm`;
  - I will always show you the estimate and wait for your yes in chat.

The spend check uses Cost Explorer, which charges $0.01 per query, so it runs once per launch.

## 6b. The long-run lane (24 hours and more, up to 8 worlds at once)

For runs too long to share a big machine with, such as watching the grand world for days to see whether meat eaters ever specialize.

- **Machine:** c8g.2xlarge (8 cores, 16 GB), the winner of the c7g/c8g test (see 8, step 5).
  - On demand: about $0.32 an hour (about $7.70 a day).
  - Not t4g: those are "burstable" machines that either slow to 40% under constant load or charge extra for running flat out, and our runs are always flat out.
- **How much it gets through:** a grand world runs about 370 ticks a second on a laptop core, and a c8g core is 0.84 times as fast, so a day is roughly 27 million ticks per world, and 8 worlds run side by side. (Most of our "long" runs so far were 0.5 to 1 million ticks; 24 hours is far beyond that.)
- **Saving:**
  - a checkpoint every hour or so goes to S3, so nothing is lost if anything fails;
  - a run can be **extended** later (relaunch from the last checkpoint with more ticks) instead of guessing the length up front;
  - samples are sparser (for example every 10,000 ticks), so the result files stay small.
- **Watching it:** the latest saved worlds can be downloaded and opened in the viewer with **Load world**, so the owner can look at a 3-day-old world as it stands. A time-lapse GIF can be made from the checkpoints.
- **Cost guard:**
  - the machine's hard shutdown time comes from the agreed spend (for example, $14 means about 48 hours);
  - the launch shows the expected cost per day and in total, and needs a yes;
  - a weekly reminder of what is running and what it has cost so far.
- **Budget reality:** about $7 to $8 a day means a 3-day run costs about $21 to $23, close to half the monthly cap, so long runs would be planned one or two at a time.

## 7. Tests

- Experiment file validation (good and bad files).
- Measures don't change the world (the fingerprint with and without them is identical).
- Resume equals an uninterrupted run (fingerprints).
- Estimate arithmetic.
- The cloud launch request is built correctly: the right tags, machine type, terminate-on-shutdown, hard shutdown time, role and region, checked without touching AWS.

## 8. Order of work

1. Experiment files, measures, jobs, checkpoints, resume, status, laptop `run` (with tests).
2. Estimate and the spending guard.
3. Cloud launch, status, fetch and stop.
4. **First cloud trial: done (2026-10-20).** `experiments/runner-smoke` (4 small worlds, 2 million ticks) on a c7g.xlarge: it started, ran, uploaded, shut itself down after 7 minutes, and the results downloaded; about 2 cents. A laptop re-run of one world matched the cloud fingerprint exactly. It found one bug (a plain fetch could leave old saved worlds next to newer rows), now fixed.
5. **c7g against c8g: done (2026-10-20).** The same 4 grand worlds (seeds 1–4, 300,000 ticks) on a 4-core c7g.xlarge, a 4-core c8g.xlarge and the laptop (M2), all cores busy on each. Run time in total: laptop 960 s, c8g 1,148 s, c7g 1,452 s. So one c8g core does 0.84 of a laptop core's work and one c7g core 0.66, the same within 0.03 on every seed (a smaller, plain world in the first smoke test gave c7g 0.74). Per unit of work, c8g ($0.16/h for 4 cores) is about 13% cheaper than c7g ($0.145/h) as well as about 26% faster, so **c8g is the machine** for both lanes. All four worlds ended in exactly the same state (same fingerprint) on all three machines, brains included. These speeds are now in the estimates (`FAMILIES` in `estimate.ts`), and each result records the machine it ran on, so a speed measured in the cloud is converted back to laptop terms. The test cost about 6 cents (two machines for about 8 minutes each, plus two spending checks).
6. **First real batch:** the deferred long runs from Phase 8e (erosion 1M, meat eating 500k, warning colors, planted hunters with real brains, overgrazing and fouling at 2M). About 33 jobs and about 17 core-hours. On a right-sized machine (about 32 cores) for about 2.5 hours (the 2M-tick runs set the length), that is roughly $3–6 on demand.

**All of Phase 9** (about 200 to 300 core-hours, up to 500 if generous) comes to roughly $10–25 on demand, well inside the $50 a month cap.

Then part 2 of Phase 9: the analysis reports and the headline experiments.

## Decisions (settled)

1. **Machine:** c8g, the cheaper per run in the side-by-side test (step 5 above). Both are Graviton (ARM) machines, where every vCPU is a whole core; on Intel or AMD machines a vCPU is half a core, so they cost more for this kind of work.
2. **No spot:** on-demand only.
3. **Results kept for 60 days** in S3.
