# Devlog 22: Mating and sight

*Phase 9, part 7. The owner's ideas: attraction (choosing mates by diet), a scent that helps ready mates find each other, and an eye that could specialize: narrow and sharp for hunters, wide for prey. All built, all off by default, tested in three cloud experiments (about $3.40). They work as designed, and eyes do start to follow diet, but they do not make lasting meat eaters. A correction to devlog 21 is included.*

## What was built

- **Pickiness (the 32nd gene).** A picky animal turns down mates whose diet differs too much from its own and prefers the closest eater. How strict it can be depends on how many ready mates are around: with few it takes anyone, with many it chooses. Both partners must accept. Founders start at 0, so it has to evolve.
- **The eye (the 33rd gene), on a spectrum.** Founders start in the middle, which is exactly today's eye.
  - Toward one end it widens to nearly all round but reaches shorter.
  - Toward the other it narrows to 60 degrees but reaches further and spots camouflaged animals better.

  Every eye covers about the same area. It is worked out without trigonometry, so every browser gets the same answer.
- **Mate scent.** Animals looking for a mate lay scent in two layers by diet. Brains smell the mix matching their own diet, through two new senses.
- **Vigilance.** Prey that see an attacker coming, inside their field of view and range, are harder to catch: what a wide eye is for.
- **A measure** of eye and pickiness by diet.

## What we learned

- **Pickiness evolves from nothing** (to about 0.2 to 0.4), but evenly in plant eaters and others, so on its own it changes little.
- **Eyes evolve and start to follow diet.** With 8 seeds, mixed and meat eaters end up with narrower eyes than plant eaters. With vigilance and the hunting helps, the link is clearest (0.24). Over a million ticks it fades, as everyone's eyes narrow.
- **Vigilance protects the prey world:** it cancels most of the losses that extra hunting causes.
- **Letting plant eaters see prey, plus a pull toward prey, makes the most hunting** and nearly three times the mixed eaters, but at a cost to animals and species.
- **The full package over a million ticks: no lasting meat eaters,** a quarter fewer animals and a third fewer species. More hunting alone does not split off a meat-eating group: the hunting is done by an ever larger crowd of mixed eaters.
- **The reworked grand world already grows short-lived meat-eating groups** (up to 249 animals) on its own. They do not last.

## What broke, or misled

- **The species count in devlog 21 was inflated.** The species tracker still counted the fat gene, so fat differences split species. Fixed, the new grand world has about 8.8 species, about twice the classic world's 4.5 (not 2.4 times), and about half again the diversity (not +72%). The docs and the preset's description are corrected.
- **The account is now shared** with another simulation project, and the cap is $100. The runner counts the whole account's spend, but only this project's running machines and cores.
- **Two launches were refused by the cost ceiling over fractions of a cent** (the ceiling working).

## Still open

- **Lasting meat eaters in the grand world.** What is known:
  - with all the costs removed (Grand world: hunters) they form;
  - arriving meat eaters can now hold their numbers;
  - short-lived groups appear on their own;
  - but no setting tried makes a group last.
  - A natural next step is an autopsy of those short-lived groups: what ends them.
- **The mating-and-sight features stay off.** None improves the grand world on its own.
