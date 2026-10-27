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
