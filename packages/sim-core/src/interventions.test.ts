import { describe, expect, it } from "vitest";
import type { SimConfig } from "./config";
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
