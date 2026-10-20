# Phase 9 plan, part 1: the cloud-ready experiment runner (proposed, waiting for the owner's OK)

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
- **Resuming:** a job with a result is skipped. A job with a checkpoint carries on from it. Because saving and loading is exact, a resumed run gives the same answer as one that was never interrupted. This gets a test: run straight through, run with a stop and resume in the middle, compare the fingerprints.
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
2. **One spot machine starts:** a 64-core Graviton machine (c7g or c8g), using the standard Amazon Linux image, tagged `Project=evolution-sim`, with the results-only role, and set to *terminate* (not just stop) when it shuts down.
3. **The machine's start-up script:**
   1. installs Node and unpacks the code;
   2. **schedules a hard shutdown** at the estimated time × 1.5 (it can never run on unwatched);
   3. runs the experiment on all cores;
   4. copies results, checkpoints, status and a log to S3 every few minutes;
   5. writes a done marker and shuts down, which terminates it.
4. **No SSH, no open ports:** everything goes through S3, so the machine needs no login or firewall opening. (The runner user may create a key and firewall, but we don't need them.)
5. **If AWS reclaims the spot machine:** the checkpoints are in S3. `cloud status` shows "interrupted", and a second `cloud launch` resumes from them. At first a relaunch needs my action, and I'll tell you when it happens. Automatic relaunch can come later if interruptions turn out common.

## 6. Estimate and spending guard

- **Time:** each arm runs briefly on the laptop (a few seconds) to measure ticks per second. That is scaled to the full length, with a 1.5× margin because populations can grow, and divided by the machine's cores, counting the longest single job, which can't be split.
- **Cost:** machine-hours × the current spot price (read live), plus a little for storage.
- **Guard:**
  - before launching, the runner reads this month's account spend;
  - it refuses if spend plus the estimate would pass $50;
  - it always prints the estimate and needs an explicit `--confirm`;
  - I will always show you the estimate and wait for your yes in chat.

The spend check uses Cost Explorer, which charges $0.01 per query, so it runs once per launch.

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
4. **First cloud trial:** a tiny smoke test on the smallest allowed machine (t4g, a few cents) to check the role, the bucket, the start-up script and self-termination end to end.
5. **First real batch:** the deferred long runs from Phase 8e (erosion 1M, meat eating 500k, warning colors, planted hunters with real brains, overgrazing and fouling at 2M). Estimated at about 17 core-hours, about $3–5 and a couple of hours of wall time, plus the 2M-tick runs taking about 2 hours each.

Then part 2 of Phase 9: the analysis reports and the headline experiments.

## Decisions for the owner

1. **Machine:** c7g.16xlarge (cheapest right now, $0.77/h in one zone) or c8g.16xlarge (newer, probably 15–30% faster per core, $0.86–0.94/h). Suggestion: allow both, and let the estimate pick whichever is cheaper for the work, after a one-time speed check of each.
2. **After a spot interruption:** relaunch by hand at first (I tell you and relaunch), or automatically from the start?
3. **Results kept in S3:** for how long? Suggestion: delete after downloading, or after 30 days (storage costs pennies either way).
