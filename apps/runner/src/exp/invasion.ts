import { GENE, GENES, type Simulation } from "@evo/sim-core";

/**
 * An invasion: at one tick, every `every`-th animal (by id) has some genes set to new values, as if a
 * ready-made group had arrived. It asks whether a way of life can hold its own once it exists, which
 * is a different question from whether evolution can find it. Only genes change: body size is left
 * alone, so bodies keep the same energy and matter and the books still balance. Brains are untouched.
 */
export interface Invasion {
  atTick: number;
  every: number;
  /** Gene values (0 to 1) to set, by gene name. */
  genes: Record<string, number>;
}

/** Check an invasion from an experiment file. Throws a plain-English error on the first problem. */
export function checkInvasion(raw: unknown, ticks: number): Invasion {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("invasion must be an object: { \"atTick\": 100000, \"every\": 20, \"genes\": { \"diet\": 0.95 } }");
  const e = raw as Record<string, unknown>;
  for (const key of Object.keys(e)) if (!["atTick", "every", "genes"].includes(key)) throw new Error(`Unknown invasion field "${key}" (expected atTick, every, genes)`);
  const { atTick, every, genes } = e;
  if (typeof atTick !== "number" || !Number.isInteger(atTick) || atTick < 1 || atTick >= ticks) throw new Error("invasion.atTick must be a whole number of 1 or more, before the run ends");
  if (typeof every !== "number" || !Number.isInteger(every) || every < 1) throw new Error("invasion.every must be a whole number of 1 or more (1 = every animal, 20 = one in twenty)");
  if (typeof genes !== "object" || genes === null || Array.isArray(genes) || Object.keys(genes).length === 0) throw new Error("invasion.genes must name at least one gene, e.g. { \"diet\": 0.95 }");
  for (const [name, value] of Object.entries(genes)) {
    if (name === "size") throw new Error("invasion.genes cannot change size: it would change the energy and matter held in bodies");
    if (!(GENES as readonly string[]).includes(name)) throw new Error(`invasion.genes: unknown gene "${name}" (genes: ${GENES.join(", ")})`);
    if (typeof value !== "number" || !(value >= 0 && value <= 1)) throw new Error(`invasion.genes.${name} must be between 0 and 1`);
  }
  return { atTick, every, genes: genes as Record<string, number> };
}

/** Apply the invasion to the world as it stands. Returns how many animals were changed. */
export function invade(sim: Simulation, invasion: Invasion): number {
  const width = GENES.length;
  const changes = Object.entries(invasion.genes).map(([name, value]) => [GENE[name as keyof typeof GENE], value] as const);
  let changed = 0;
  for (let i = 0; i < sim.count; i++) {
    if (sim.id[i]! % invasion.every !== 0) continue;
    for (const [gene, value] of changes) sim.genes[i * width + gene] = value;
    sim.express(i);
    changed++;
  }
  return changed;
}
