/**
 * The featured worlds on the front page: a preset, a seed that shows it well, and what to watch for.
 * The grand world comes first: it is also the world the viewer opens with.
 * Seeds were picked from 4 candidates per world over 100,000 ticks (experiments/featured-worlds): each stays alive
 * and shows what its line promises.
 */
export interface FeaturedWorld {
  presetId: string;
  title: string;
  seed: number;
  /** One line: what to look for, and where (which chart or overlay). */
  watchFor: string;
}

export const FEATURED: readonly FeaturedWorld[] = [
  {
    presetId: "grand-world",
    title: "The grand world",
    seed: 42,
    watchFor: "Every feature at once: continents, seasons, disasters, disease, brains, colonies. Watch species branch on the family tree and a second feeding level of mixed eaters (yellowish dots) take hold.",
  },
  {
    presetId: "default",
    title: "Food webs from nothing",
    seed: 12,
    watchFor: "Everyone starts as an unarmed plant eater. Watch the diet chart: the first kill within a few hundred ticks, then a lineage that lives on meat (red dots).",
  },
  {
    presetId: "arms-race",
    title: "Predator arms race",
    seed: 42,
    watchFor: "Fighting is cheap, so killing starts at once. Color the dots by diet, and watch armor and speed climb on the trait chart.",
  },
  {
    presetId: "ice-age",
    title: "Ice age",
    seed: 42,
    watchFor: "At tick 60,000 the world cools for 20,000 ticks. Watch the population halve, then pick Preferred temperature on the trait heatmap: the survivors like it colder.",
  },
  {
    presetId: "two-continents",
    title: "Two continents",
    seed: 12,
    watchFor: "Water splits the world in two. Watch each half grow its own species on the family tree.",
  },
  {
    presetId: "grand-living-plants",
    title: "Living plants",
    seed: 7,
    watchFor: "Plants evolve too. Switch the map to Plant warmth and compare with Temperature, or to Kinds of plant, and color the dots by Palate.",
  },
];

/** The viewer link that starts a featured world. */
export function featuredLink(world: FeaturedWorld): string {
  return `./app.html?seed=${world.seed}&preset=${encodeURIComponent(world.presetId)}`;
}
