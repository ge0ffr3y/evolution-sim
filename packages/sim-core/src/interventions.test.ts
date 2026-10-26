import { describe, expect, it } from "vitest";
import type { SimConfig } from "./config";
import { GENE, GENE_COUNT } from "./genome";
import { Simulation, type ActiveEvent, type InterventionKind } from "./simulation";
import { snapshotFromBytes, snapshotToBytes } from "./snapshot";

/**
 * A middling world with a climate, water and the event engine on (good years and volcanoes switched on but so rare
 * they never happen by themselves), so every nudge has something to work on.
 */
const WORLD: Partial<SimConfig> = {
  worldWidth: 128,
  worldHeight: 128,
  initialOrganisms: 300,
  speciesEvery: 0,
  initialFoodFraction: 0.8,
  climateMode: 1,
  yearLength: 2000,
  terrainMode: 1,
  evGoodYearEvery: 1e12,
  evVolcanoEvery: 1e12,
  evFireEvery: 1e12,
  evStormEvery: 1e12,
  evFloodEvery: 1e12,
  interveneBloomRadius: 30,
  interveneFertilizeRadius: 30,
  interveneMutateLength: 200,
};

type Hidden = {
  inheritLineage(child: number, parentA: number, parentB: number): void;
  mateMask: number[];
  parent2Id: Uint32Array;
  beginClimateEvent(kind: "iceAge" | "drought", a: number, b: number, c: number, d: number): void;
  activeEvents: ActiveEvent[];
  ash: Float64Array;
  evMutationMult: number;
  eventRng: { getState(): Uint32Array | number[] };
};
const hidden = (sim: Simulation): Hidden => sim as unknown as Hidden;

type Books = { energy: number; matter: number; ledger: Simulation["ledger"] };
const bookmark = (sim: Simulation): Books => ({ energy: sim.energyAudit().total, matter: sim.matterAudit().total, ledger: { ...sim.ledger } });

/** Since the bookmark, energy and matter both balance to a billionth (the same check as the disaster events' tests). */
function expectBooksBalance(sim: Simulation, from: Books): void {
  const L = sim.ledger;
  const B = from.ledger;
  const burned = (x: Simulation["ledger"]): number => x.basalBurned + x.movementBurned + x.sensingBurned + x.attackBurned + x.armorBurned + x.brainBurned;
  const expected = from.energy + (L.sunlightIn - B.sunlightIn) - (burned(L) - burned(B)) - (L.digestionLoss - B.digestionLoss) - (L.decayLoss - B.decayLoss);
  expect(Math.abs(sim.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
  expect(Math.abs(sim.matterAudit().total - from.matter) / from.matter).toBeLessThan(1e-9);
}

const sum = (a: ArrayLike<number>): number => {
  let total = 0;
  for (let i = 0; i < a.length; i++) total += a[i]!;
  return total;
};

describe("outside nudges (intervene)", () => {
  it("are refused in a world without the event engine, changing nothing", () => {
    const sim = new Simulation(1, { ...WORLD, evGoodYearEvery: 0, evVolcanoEvery: 0, evFireEvery: 0, evStormEvery: 0, evFloodEvery: 0 });
    sim.run(50);
    const before = sim.fingerprint();
    expect(sim.intervene("goodYear").ok).toBe(false);
    expect(sim.interventionLog).toHaveLength(0);
    expect(sim.fingerprint()).toBe(before);
  });

  it("keep energy and matter balanced, each of them", () => {
    for (const kind of ["goodYear", "bloom", "fertilize", "mutate", "rain", "thaw", "meteor", "wildfire", "storm", "flood"] as InterventionKind[]) {
      const sim = new Simulation(2, WORLD);
      sim.run(150);
      // Something for rain and thaw to end.
      if (kind === "rain") hidden(sim).beginClimateEvent("drought", 0.5, 0.5, 400, 400);
      if (kind === "thaw") hidden(sim).beginClimateEvent("iceAge", 0.3, 0.3, 400, 400);
      sim.step();
      const books = bookmark(sim);
      expect(sim.intervene(kind).ok, kind).toBe(true);
      sim.run(300);
      expectBooksBalance(sim, books);
    }
  });

  it("that cannot happen change nothing, not even the random numbers", () => {
    const sim = new Simulation(3, WORLD);
    sim.run(100);
    const before = sim.fingerprint();
    const rngBefore = Array.from(hidden(sim).eventRng.getState());
    expect(sim.intervene("rain")).toEqual({ ok: false, text: "There's no drought to end right now." });
    expect(sim.intervene("thaw").ok).toBe(false);
    expect(sim.fingerprint()).toBe(before);
    expect(Array.from(hidden(sim).eventRng.getState())).toEqual(rngBefore);
    expect(sim.interventionLog).toHaveLength(0);
    // And a bloom needs volcanoes (the rich-ground field).
    const noVolcanoes = new Simulation(3, { ...WORLD, evVolcanoEvery: 0 });
    expect(noVolcanoes.intervene("bloom").ok).toBe(false);
  });

  it("rain ends a drought and a thaw ends an ice age, at the start of the next tick", () => {
    const sim = new Simulation(4, WORLD);
    sim.run(50);
    hidden(sim).beginClimateEvent("drought", 0.5, 0.5, 2000, 2000);
    hidden(sim).beginClimateEvent("iceAge", 0.3, 0.3, 2000, 2000);
    sim.step();
    expect(sim.intervene("rain").text).toBe("Rain breaks the drought early");
    expect(sim.intervene("thaw").text).toBe("A thaw ends the cold early");
    sim.step();
    expect(hidden(sim).activeEvents.filter((e) => e.kind === "drought" || e.kind === "iceAge")).toHaveLength(0);
    const texts = sim.worldEvents.map((e) => e.text);
    expect(texts).toContain("A drought ends");
    expect(texts).toContain("An ice age ends");
  });

  it("fertilize moves dead matter into the soil, making none", () => {
    const sim = new Simulation(5, WORLD);
    sim.run(300);
    const matter = sim.matterAudit().total;
    const detritus = sum(sim.detritus);
    const nutrient = sum(sim.nutrient);
    sim.intervene("fertilize");
    const moved = detritus - sum(sim.detritus);
    expect(moved).toBeGreaterThan(0);
    expect(sum(sim.nutrient) - nutrient).toBeCloseTo(moved, 6);
    expect(Math.abs(sim.matterAudit().total - matter) / matter).toBeLessThan(1e-12);
  });

  it("bloom enriches the ground, which then fades like a volcano's", () => {
    const sim = new Simulation(6, WORLD);
    sim.run(20);
    expect(sum(hidden(sim).ash)).toBe(0);
    sim.intervene("bloom");
    const rich = sum(hidden(sim).ash);
    expect(rich).toBeGreaterThan(0);
    sim.run(100);
    expect(sum(hidden(sim).ash)).toBeLessThan(rich);
  });

  it("mutate raises mutation rates for a while, then they settle back", () => {
    const sim = new Simulation(7, WORLD);
    sim.run(20);
    expect(sim.intervene("mutate").ok).toBe(true);
    sim.step();
    expect(hidden(sim).evMutationMult).toBe(4); // the default factor
    sim.run(250);
    expect(hidden(sim).evMutationMult).toBe(1);
    expect(sim.worldEvents.map((e) => e.text)).toContain("Mutation rates settle back down");
  });

  it("are logged, and the seed plus the log replays the world exactly", () => {
    const play = (): Simulation => {
      const sim = new Simulation(8, WORLD);
      for (let t = 0; t < 600; t++) {
        if (t === 100) sim.intervene("goodYear");
        if (t === 250) sim.intervene("mutate");
        if (t === 400) sim.intervene("fertilize");
        sim.step();
      }
      return sim;
    };
    const a = play();
    const b = play();
    expect(a.interventionLog).toEqual([
      { tick: 100, kind: "goodYear" },
      { tick: 250, kind: "mutate" },
      { tick: 400, kind: "fertilize" },
    ]);
    expect(b.fingerprint()).toBe(a.fingerprint());
    // And the nudges did change the world.
    const untouched = new Simulation(8, WORLD);
    untouched.run(600);
    expect(untouched.fingerprint()).not.toBe(a.fingerprint());
  });

  it("survive saving and loading: the log, and a nudge still going on", () => {
    const sim = new Simulation(9, WORLD);
    sim.run(100);
    sim.intervene("mutate");
    sim.run(50);
    const copy = Simulation.load(snapshotFromBytes(snapshotToBytes(sim.save())));
    expect(copy.interventionLog).toEqual(sim.interventionLog);
    sim.run(300);
    copy.run(300);
    expect(copy.fingerprint()).toBe(sim.fingerprint());
  });
});

describe("disaster nudges", () => {
  it("at strength 0 are always the smallest version, and a low strength stays near the bottom of the range", () => {
    const smallest = new Simulation(10, WORLD);
    smallest.run(50);
    expect(smallest.intervene("storm", { strength: 0 }).ok).toBe(true);
    const storm = hidden(smallest).activeEvents.find((e) => e.kind === "storm")!;
    expect(storm.radius).toBe(smallest.config.evStormRadiusMin);
    expect(storm.end - storm.start).toBe(Math.round(smallest.config.evStormLengthMin));
    for (let seed = 11; seed < 16; seed++) {
      const sim = new Simulation(seed, WORLD);
      sim.run(50);
      sim.intervene("storm", { strength: 0.25 });
      const ev = hidden(sim).activeEvents.find((e) => e.kind === "storm")!;
      const c = sim.config;
      expect(ev.radius).toBeLessThanOrEqual(c.evStormRadiusMin + 0.25 * (c.evStormRadiusMax - c.evStormRadiusMin));
    }
  });

  it("are turned down while another disaster is going on, or where the world does not have them", () => {
    const sim = new Simulation(16, WORLD);
    sim.run(50);
    hidden(sim).beginClimateEvent("drought", 0.3, 0.3, 500, 500);
    const before = sim.fingerprint();
    expect(sim.intervene("meteor")).toEqual({ ok: false, text: "Another disaster is going on. The world gets a breather first." });
    expect(sim.fingerprint()).toBe(before);
    // A good year or a mutation spike is no disaster: they do not stand in the way.
    const calm = new Simulation(16, WORLD);
    calm.run(50);
    calm.intervene("goodYear");
    expect(calm.intervene("meteor").ok).toBe(true);
    const noFires = new Simulation(16, { ...WORLD, evFireEvery: 0 });
    expect(noFires.intervene("wildfire")).toEqual({ ok: false, text: "This world has no wildfires." });
  });

  it("are logged with their strength", () => {
    const sim = new Simulation(17, WORLD);
    sim.run(50);
    sim.intervene("meteor", { strength: 0.25 });
    expect(sim.interventionLog).toEqual([{ tick: 50, kind: "meteor", strength: 0.25 }]);
  });
});

/** A world of mixed eaters that mate (with a sex gene and the "give up and split" fallback after 50 ticks). */
const MATING: Partial<SimConfig> = { ...WORLD, initialDiet: 0.5, sexualReproduction: 2, sexWaitLimit: 50, mateReadyFraction: 0.6 };

describe("predator nudges", () => {
  it("turn a mixed eater into a meat eater that can still mate with its own kind", () => {
    const sim = new Simulation(20, MATING);
    sim.run(100);
    const result = sim.intervene("predator");
    expect(result.ok).toBe(true);
    const i = sim.indexOfId(result.organismId!);
    expect(sim.diet[i]!).toBeGreaterThan(0.75);
    expect(sim.attack[i]!).toBeGreaterThan(0);
    expect(result.text).toBe(`Organism #${result.organismId} turns into a predator: it now eats meat and fights harder, and can only breed with a mate`);
    // Its genes moved less than the mating limit (measured over the genes that count for mating).
    const mask = hidden(sim).mateMask;
    const founders = new Simulation(20, MATING); // the same world before the nudge
    founders.run(100);
    const j = founders.indexOfId(result.organismId!);
    let sumSq = 0;
    for (const k of mask) {
      const d = sim.genes[i * GENE_COUNT + k]! - founders.genes[j * GENE_COUNT + k]!;
      sumSq += d * d;
    }
    expect(Math.sqrt(sumSq / mask.length)).toBeLessThanOrEqual(sim.config.mateDistance);
    expect(sim.lineages()).toMatchObject([{ tag: 1, founderId: result.organismId, founderAlive: true, alive: 1, aliveMeat: 1, born: 0 }]);
  });

  it("keep energy and matter balanced, a big one included (it pays for its bigger body)", () => {
    for (const style of ["plain", "big", "fast", "sneaky"] as const) {
      const sim = new Simulation(21, { ...MATING, camouflageMode: 1, nutrientMode: 1 });
      sim.run(150);
      const books = bookmark(sim);
      expect(sim.intervene("predator", { style }).ok, style).toBe(true);
      sim.run(200);
      expectBooksBalance(sim, books);
    }
  });

  it("never breed alone, however long they wait for a mate", () => {
    const sim = new Simulation(22, MATING);
    sim.run(100);
    const founder = sim.intervene("predator").organismId!;
    sim.run(2000);
    // No newborn has the predator as its only parent.
    let alone = 0;
    for (let i = 0; i < sim.count; i++) if (sim.parentId[i] === founder && hidden(sim).parent2Id[i] === 0) alone++;
    expect(alone).toBe(0);
    expect(sim.genes[sim.indexOfId(founder) * GENE_COUNT + GENE.sex] ?? 1).toBe(1);
  });

  it("found a lineage its young join, which the tag only watches", () => {
    const sim = new Simulation(23, MATING);
    sim.run(100);
    const founder = sim.intervene("predator").organismId!;
    // Pretend another animal was born to the predator: it joins the lineage.
    const other = sim.indexOfId(founder) === 0 ? 1 : 0;
    hidden(sim).inheritLineage(other, founder, 0);
    expect(sim.lineages()[0]).toMatchObject({ alive: 2, born: 1 });
    // Watching changes nothing: the same world with and without asking for lineages plays out the same.
    const a = new Simulation(24, MATING);
    const b = new Simulation(24, MATING);
    for (const sim2 of [a, b]) {
      sim2.run(50);
      sim2.intervene("predator");
    }
    for (let t = 0; t < 300; t++) {
      a.step();
      b.step();
      b.lineages();
    }
    expect(b.fingerprint()).toBe(a.fingerprint());
  });

  it("count only real births as descendants (a birth that is undone does not leak its tag to the next newborn)", () => {
    // Food is scarce, so many births are started and undone for want of energy or soil.
    const sim = new Simulation(27, { ...MATING, initialFoodFraction: 0.3, foodRegrowPerTick: 0.004 });
    sim.run(100);
    sim.intervene("predator");
    const birthsBefore = sim.totalBirths;
    for (let k = 0; k < 6; k++) {
      sim.run(250);
      const line = sim.lineages()[0]!;
      expect(line.born).toBeLessThanOrEqual(sim.totalBirths - birthsBefore);
      expect(line.alive).toBeLessThanOrEqual(line.born + 1);
    }
  });

  it("survive saving and loading: the lineage, and the rule about mates", () => {
    const sim = new Simulation(25, MATING);
    sim.run(100);
    sim.intervene("predator", { style: "fast" });
    sim.run(100);
    const copy = Simulation.load(snapshotFromBytes(snapshotToBytes(sim.save())));
    expect(copy.lineages()).toEqual(sim.lineages());
    sim.run(400);
    copy.run(400);
    expect(copy.fingerprint()).toBe(sim.fingerprint());
    expect(copy.interventionLog).toEqual([{ tick: 100, kind: "predator", style: "fast" }]);
  });

  it("are refused when nobody could become one", () => {
    const empty = new Simulation(26, { ...MATING, initialOrganisms: 0 });
    expect(empty.intervene("predator")).toEqual({ ok: false, text: "There is nobody who could become a predator." });
  });
});
