# Phase 11 findings: bigger brains and richer senses

Plan: [`docs/plans/phase-11-brains.md`](../plans/phase-11-brains.md).

## Baseline: brains in the stream world (2026-10-27)

The stream's grand world (seed 846571) after 16.6 million ticks, 874 animals, 7 species, measured from its saved world with `apps/runner/scripts/brain-report.ts`:

- Working connections: 12.5 on average, the biggest 22 (room for 768). Thinking units: 3.7 on average, at most 7 (room for 16 then).
- 85% of the wiring into actions passes through a thinking unit; 71 of 82 senses are read by at least one brain, 6.2 by an average brain.
- Brains are 3.6% of all costs.
- Prey sight on the left side is never wired: with appetite senses, plant eaters barely see prey.

Brains are nowhere near their limits: bigger brains do not pay yet.

## 1. Tuning the appetite senses (`phase-11-appetite`)

**Question:** does a floor under the appetite senses (0.25, 0.5), or the evolvable attention gene (founders at 0), lead to lasting meat eaters, more feeding levels or bigger brains in the grand world?

**Setup:** grand world, 16 fresh seeds (4101 to 4116), 500,000 ticks, 64 runs on one c8g.16xlarge, about $3. Report: `experiments/phase-11-appetite/report.md`.

| Second half of the run | Control | Floor 0.25 | Floor 0.5 | Attention gene |
|---|---|---|---|---|
| Population | 1,177 | 1,137 | 1,172 | 1,197 |
| Species alive | 9.3 | 8.2 | 8.6 | 8.9 |
| Average diet gene | 0.131 | 0.137 | 0.133 | 0.127 |
| Share eating more than half meat | 0.30% | 0.25% | 0.41% | 0.36% |
| Feeding levels | 1.99 | 1.99 | 1.99 | 1.99 |
| Brain connections | 10.4 | 10.1 | 10.3 | 10.8 |
| Worlds with a lasting meat-eating group | 0 / 16 | 0 / 16 | 0 / 16 | 0 / 16 |
| Attention gene | | | | 0.21 (0.12 to 0.45) |

- **No measurable effect.** No key measure moved by a full noise unit; the only consistent change is a slightly lower "highest diet gene ever" (0.93 against 0.985) in all three arms. No arm produced a lasting meat-eating group.
- **The attention gene rose** from 0 to about 0.2. That is not proof that it pays: a gene that starts at its floor creeps up by mutation alone, and its cost (0.001 x gene a tick) is small.
- **Reading:** how faintly plant eaters see prey is not what holds meat eating back in the grand world. That fits Phase 9's findings (harmful mutations, sex blending diets, kin restraint and the climate are the brakes). Appetite tuning stays available as a setting; the grand world keeps today's appetite senses for now.
- **Next:** test the whole Phase 11 package (deeper brains, feelings, better eyes and focus, surroundings, with the eye gene and vigilance) against the control, where the senses that make chasing possible may matter more than seeing prey a little.

## 2. The whole package in the grand world (`phase-11-package`)

**Question:** with everything from Phase 11 on (32 thinking units with depth and loops, feelings and curiosity, better eyes and the focus action, surroundings, calls), alone, with the eye gene and vigilance, and with learning that learns from joy and pain: do brains grow, which new senses get used, do eyes split by diet, and do meat eaters take hold?

**Setup:** grand world, 16 fresh seeds (4201 to 4216), 500,000 ticks, 64 runs on one c8g.16xlarge, about $2.50 (the longest run took 0.8 hours). Report: `experiments/phase-11-package/report.md`. Sense use was counted in all 64 saved final worlds.

| Second half of the run | Control | Package | + eye gene, vigilance | + learning |
|---|---|---|---|---|
| Population | 1,181 | 1,125 (-5%) | 1,048 (-11%) | 1,017 (-14%) |
| Species alive | 8.2 | 7.6 | 8.1 | 7.4 |
| Worlds with a lasting meat-eating group | 0 / 16 | 0 / 16 | 0 / 16 | 0 / 16 |
| Share sick | 23% | 17% | 15% | **11%** |
| Brain connections | 9.9 | 10.4 | 10.7 | 10.5 |
| Thinking units | 2.5 | **3.6** | **3.6** | **3.9** |
| Brains with a loop | 0 | **91%** | **90%** | **87%** |
| Longest chain of units ever | 1 | **6.1** | **6.0** | **6.3** |
| Most complex brain ever (connections) | 25 | 24 | 25 | 24 |
| Senses read per brain | 4.8 | 3.6 | 3.9 | 3.5 |
| Eye: plant eaters / others (0.5 = today's) | | | 0.70 / 0.79 | 0.74 / 0.79 |
| Curiosity gene | | 0.26 | 0.24 | 0.29 |
| Speed (ticks a second, one core) | 277 | 238 (-14%) | 238 | 232 |

**Which new senses are used.** In the control, where they all read 0, brains still carry stray wiring to them by chance (each read by about 2 to 5% of brains); that is the baseline. Clearly above it:
- **Joy:** 10.5% of brains in the package, **29.5%** with the eye gene and vigilance (4.7% by chance). With learning on it falls back to chance (3.1%): there joy feeds learning instead of being read directly.
- **Ground tremor:** 8.5% in the package.
- **The focus target coming closer:** 8.3% with the eye gene (2% by chance); "something behind: bigger" 5.2%.
- Pain, colour, motion, crowding, daylight, compass and hearing stay at or near chance. The call and focus actions are wired no more often than by chance (calls 14 to 21% against 25% in the control).

**What it means:**
- **Brains grew deeper, not bigger.** Nearly every brain grew a loop (a unit holding its value between thoughts), chains up to six units deep appeared in every world, and thinking units rose by half, but connections barely rose and the most complex brain is no bigger. Brains read fewer different senses (3.6 to 3.9 against 4.8): they lean on held thoughts more than on extra inputs.
- **Joy is the one new sense evolution clearly wants**, most of all alongside the eye gene and vigilance.
- **Disease fell by up to half** (23% sick to 11%), the strongest single effect (2.9 noise units with learning). Why is not known yet: the feelings or crowding senses could help animals keep apart, or the new costs thin the population that spreads disease. Worth a closer look before claiming a cause.
- **Eyes narrow with meat in the diet (corrected, animal by animal).** The group averages above use "diet gene under 0.25" for plant eaters, and almost every animal is a slight mixed eater: only 7% have a diet gene under 0.02. Looked at animal by animal in the saved final worlds (eye gene + vigilance arm, 16,421 animals):

  | Diet gene | 0 to 0.02 | 0.02 to 0.05 | 0.05 to 0.1 | 0.1 to 0.2 | 0.2 to 0.3 | 0.3 to 0.5 | 0.5 and up |
  |---|---|---|---|---|---|---|---|
  | Animals | 1,103 | 1,601 | 3,351 | 6,434 | 2,890 | 938 | 104 |
  | Average eye (0.5 = today's, 1 = narrowest) | 0.50 | 0.54 | 0.64 | 0.74 | 0.81 | 0.83 | 0.84 |

  Pure plant eaters keep today's eye on average, with a wide spread (the widest tenth at 0.11 or below, close to the widest eye). The eye narrows steadily with the diet gene up to about 0.3, then levels off. The link is stronger than in Phase 9 (correlation 0.36 against 0.24). It follows the diet gene (what an animal is built to eat) more than the meat it actually ate (correlation 0.20). In 3 of 16 worlds (seeds 4209 to 4211) pure grazers went clearly wide (0.24 to 0.33) while the rest stayed narrow. With learning on, the split mostly disappears (pure plant eaters 0.71, correlation 0.16). So narrow eyes for everyone is mostly because nearly everyone eats a little meat; wide eyes stay rare because pure grazers are rare.
- **No meat eaters.** As with appetite tuning, the brakes on meat eating in the grand world are not in the brains.
- **Costs:** 5 to 14% fewer animals, a few percent fewer species, and the simulation runs about 14% slower.

**Done-when check (plan section "Done when"):**
1. Off by default, older worlds unchanged: met (brains-off goldens never changed; brain goldens re-recorded with checks).
2. Older saves load, the stream's included: met (tested; the stream's save loads under the new layout).
3. Brains grow beyond the baseline and most new senses are used: partly. Brains are deeper (loops, chains of six, half again as many units) but not bigger; only a few new senses are used above chance.
4. More lasting meat eaters: not met (0 of 16 in every arm).
5. Brains beat brainless controls: not tested yet.
6. The stream runs smoothly: not tested yet (about 14% slower per tick).
