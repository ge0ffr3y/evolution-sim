import { GENE, GENES, type Simulation } from "@evo/sim-core";

/**
 * An invasion: at one tick, every `every`-th animal (by id) has some genes set to new values, as if a
 * ready-made group had arrived. It asks whether a way of life can hold its own once it exists, which
 * is a different question from whether evolution can find it. Genes change; brains are untouched.
 * Size is never set as a gene. Instead `sizeFactor` makes each chosen animal that many times bigger, and
 * the bigger body is paid for from the animal's own energy (the body's extra energy) and nutrient store
 * (its extra matter), topped up from the soil nutrient and then the dead matter where it stands, as a
 * newborn's body is built from the soil. Nothing is made or destroyed. An animal that cannot afford it
 * keeps its size.
 */
export interface Invasion {
  atTick: number;
  every: number;
  /** Gene values (0 to 1) to set, by gene name. */
  genes: Record<string, number>;
  /** Optional: make each chosen animal this many times bigger (1 to 4), paid from its own stores. */
  sizeFactor?: number;
}

export interface InvasionResult {
  changed: number;
  /** How many were made bigger (the rest could not afford it, or were already as big as allowed). */
  enlarged: number;
}

/** Check an invasion from an experiment file. Throws a plain-English error on the first problem. */
export function checkInvasion(raw: unknown, ticks: number): Invasion {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("invasion must be an object: { \"atTick\": 100000, \"every\": 20, \"genes\": { \"diet\": 0.95 } }");
  const e = raw as Record<string, unknown>;
  for (const key of Object.keys(e)) if (!["atTick", "every", "genes", "sizeFactor"].includes(key)) throw new Error(`Unknown invasion field "${key}" (expected atTick, every, genes, sizeFactor)`);
  const { atTick, every, genes, sizeFactor } = e;
  if (sizeFactor !== undefined && (typeof sizeFactor !== "number" || !(sizeFactor >= 1 && sizeFactor <= 4))) throw new Error("invasion.sizeFactor must be between 1 and 4");
  if (typeof atTick !== "number" || !Number.isInteger(atTick) || atTick < 1 || atTick >= ticks) throw new Error("invasion.atTick must be a whole number of 1 or more, before the run ends");
  if (typeof every !== "number" || !Number.isInteger(every) || every < 1) throw new Error("invasion.every must be a whole number of 1 or more (1 = every animal, 20 = one in twenty)");
  if (typeof genes !== "object" || genes === null || Array.isArray(genes) || Object.keys(genes).length === 0) throw new Error("invasion.genes must name at least one gene, e.g. { \"diet\": 0.95 }");
  for (const [name, value] of Object.entries(genes)) {
    if (name === "size") throw new Error("invasion.genes cannot set size directly (bodies hold energy and matter); use invasion.sizeFactor, which the animals pay for");
    if (!(GENES as readonly string[]).includes(name)) throw new Error(`invasion.genes: unknown gene "${name}" (genes: ${GENES.join(", ")})`);
    if (typeof value !== "number" || !(value >= 0 && value <= 1)) throw new Error(`invasion.genes.${name} must be between 0 and 1`);
  }
  return sizeFactor === undefined ? { atTick, every, genes: genes as Record<string, number> } : { atTick, every, genes: genes as Record<string, number>, sizeFactor };
}

/** Apply the invasion to the world as it stands. */
export function invade(sim: Simulation, invasion: Invasion): InvasionResult {
  const width = GENES.length;
  const changes = Object.entries(invasion.genes).map(([name, value]) => [GENE[name as keyof typeof GENE], value] as const);
  const factor = invasion.sizeFactor ?? 1;
  if (factor > 1 && sim.nutrientStore.length === 0) throw new Error("invasion.sizeFactor needs nutrientMode 1 or 2 (a bigger body's matter comes from the animal's nutrient store)");
  const { min, max } = sim.ranges.size;
  let changed = 0;
  let enlarged = 0;
  for (let i = 0; i < sim.count; i++) {
    if (sim.id[i]! % invasion.every !== 0) continue;
    for (const [gene, value] of changes) sim.genes[i * width + gene] = value;
    sim.express(i);
    changed++;
    if (factor <= 1) continue;
    // A bigger body: try it, and keep it only if the animal can pay for the extra energy and matter.
    const sizeGene = sim.genes[i * width + GENE.size]!;
    const target = Math.min(max, sim.size[i]! * factor);
    const energyBefore = sim.bodyEnergy[i]!;
    const matterBefore = sim.bodyMatter[i]!;
    sim.genes[i * width + GENE.size] = (target - min) / (max - min);
    sim.express(i);
    const extraEnergy = sim.bodyEnergy[i]! - energyBefore;
    const extraMatter = sim.bodyMatter[i]! - matterBefore;
    const cell = sim.cellIndexOf(i);
    const store = sim.nutrientStore[i]!;
    const soil = sim.nutrient[cell]!;
    const dead = sim.detritus[cell]!;
    if (extraEnergy <= 0 || extraEnergy > sim.energy[i]! || extraMatter > store + soil + dead) {
      sim.genes[i * width + GENE.size] = sizeGene; // cannot afford it (or no bigger allowed): back to its own size
      sim.express(i);
      continue;
    }
    sim.energy[i] = sim.energy[i]! - extraEnergy;
    // Matter: the store first, then the soil, then dead matter on the ground.
    const fromStore = Math.min(extraMatter, store);
    const fromSoil = Math.min(extraMatter - fromStore, soil);
    sim.nutrientStore[i] = store - fromStore;
    sim.nutrient[cell] = soil - fromSoil;
    sim.detritus[cell] = dead - (extraMatter - fromStore - fromSoil);
    enlarged++;
  }
  return { changed, enlarged };
}
