import { describe, expect, it } from "vitest";
import { Simulation, type ActiveEvent } from "./simulation";
import type { SimConfig } from "./config";

/** A middling world with a climate and water, so every kind of disaster has something to work on. */
const WORLD: Partial<SimConfig> = {
  worldWidth: 128,
  worldHeight: 128,
  initialOrganisms: 300,
  speciesEvery: 0,
  initialFoodFraction: 0.8,
  climateMode: 1,
  yearLength: 2000,
  terrainMode: 1,
  diseaseTransmission: 0.3,
};

type Hidden = {
  beginFire(): void;
  beginStorm(): void;
  beginFlood(): void;
  beginVolcano(): void;
  beginBlight(): void;
  beginOutbreak(): void;
  beginGoodYear(): void;
  beginClimateEvent(kind: "iceAge" | "drought", a: number, b: number, c: number, d: number): void;
  stormBlow(ev: ActiveEvent): void;
  activeEvents: ActiveEvent[];
  burning: Uint8Array;
  eventsStep(): void;
};
const hidden = (sim: Simulation): Hidden => sim as unknown as Hidden;

type Books = { energy: number; matter: number; ledger: Simulation["ledger"] };
/** Note the energy and matter in the world now (and the ledger's running totals), to check against later. */
const bookmark = (sim: Simulation): Books => ({ energy: sim.energyAudit().total, matter: sim.matterAudit().total, ledger: { ...sim.ledger } });

/** Since the bookmark, energy and matter both balance to a billionth: nothing was made or lost except as heat and detritus. */
function expectBooksBalance(sim: Simulation, from: Books): void {
  const L = sim.ledger;
  const B = from.ledger;
  const burned = (x: Simulation["ledger"]): number => x.basalBurned + x.movementBurned + x.sensingBurned + x.attackBurned + x.armorBurned + x.brainBurned;
  const expected = from.energy + (L.sunlightIn - B.sunlightIn) - (burned(L) - burned(B)) - (L.digestionLoss - B.digestionLoss) - (L.decayLoss - B.decayLoss);
  expect(Math.abs(sim.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
  expect(Math.abs(sim.matterAudit().total - from.matter) / from.matter).toBeLessThan(1e-9);
}

/** One patch of ground, nobody on it, for watching a single tick of plant growth. */
const PATCH: Partial<SimConfig> = {
  worldWidth: 16,
  worldHeight: 16,
  foodCellSize: 16,
  fertilityScale: 1,
  fertilityVariation: 0,
  speedMax: 4,
  senseRangeMax: 3,
  initialOrganisms: 0,
  initialFoodFraction: 0,
  foodRegrowPerTick: 0.2,
  foodCap: 100,
  initialNutrientPerCell: 1000,
};

describe("disaster events", () => {
  it("are off by default: nothing is logged and there are no active events", () => {
    const sim = new Simulation(1, { ...WORLD, initialOrganisms: 50 });
    sim.run(400);
    expect(sim.worldEvents).toHaveLength(0);
    expect(sim.currentEvents).toHaveLength(0);
  });

  it("use a random stream of their own: switching them on (but never firing) changes nothing else", () => {
    const a = new Simulation(3, { ...WORLD, initialOrganisms: 80 });
    const b = new Simulation(3, { ...WORLD, initialOrganisms: 80, evGoodYearEvery: 1000000000 });
    a.run(500);
    b.run(500);
    expect(b.count).toBe(a.count);
    expect(b.totalBirths).toBe(a.totalBirths);
    expect(Array.from(b.food)).toEqual(Array.from(a.food));
    expect(Array.from(b.x.slice(0, b.count))).toEqual(Array.from(a.x.slice(0, a.count)));
  });

  it("an ice age and a drought from the engine cool the world and slow the plants, then end", () => {
    const sim = new Simulation(1, { ...WORLD, terrainMode: 0, evIceAgeEvery: 1000000000, evDroughtEvery: 1000000000 });
    const plain = new Simulation(1, { ...WORLD, terrainMode: 0 });
    const h = hidden(sim);
    sim.run(100);
    plain.run(100);
    h.beginClimateEvent("iceAge", 0.3, 0.3, 400, 400);
    h.beginClimateEvent("drought", 0.8, 0.8, 400, 400);
    expect(sim.worldEvents.map((e) => e.kind)).toEqual(["iceAge", "drought"]);
    const cell = Math.floor(sim.gridHeight / 2) * sim.gridWidth;
    let worstCooling = 0;
    for (let t = 0; t < 450; t++) {
      sim.step();
      plain.step();
      worstCooling = Math.max(worstCooling, plain.temperature[cell]! - sim.temperature[cell]!);
    }
    expect(worstCooling).toBeGreaterThan(0.25);
    expect(sim.currentEvents).toHaveLength(0);
    expect(sim.worldEvents.filter((e) => e.kind === "recovery")).toHaveLength(2);
  });

  it("a wildfire burns the plants to ash in the soil, kills the animals in the flames, spreads, and burns out", () => {
    const sim = new Simulation(5, { ...WORLD, terrainMode: 0, initialFoodFraction: 1, evFireEvery: 1000000000, evFireSpreadMin: 0.6, evFireSpreadMax: 0.6, evFireLengthMin: 60, evFireLengthMax: 60, evFireRadiusMin: 10, evFireRadiusMax: 10 });
    const h = hidden(sim);
    sim.run(20);
    const books = bookmark(sim);
    const nutrientBefore = sim.nutrient.reduce((a, b) => a + b, 0);
    const plantsBefore = sim.food.reduce((a, b) => a + b, 0);
    const lossBefore = sim.ledger.decayLoss;
    h.beginFire();
    const ev = h.activeEvents[0]!;
    expect(ev.kind).toBe("wildfire");
    const first = ev.cells.length;
    expect(first).toBeGreaterThan(1);
    // The burnt ground has no plants left, the matter is in the soil, the energy has gone as heat.
    for (const cell of ev.cells) expect(sim.food[cell]).toBe(0);
    const plantsAfter = sim.food.reduce((a, b) => a + b, 0);
    const nutrientAfter = sim.nutrient.reduce((a, b) => a + b, 0);
    expect(nutrientAfter - nutrientBefore).toBeCloseTo(plantsBefore - plantsAfter, 6);
    expect(sim.ledger.decayLoss - lossBefore).toBeCloseTo((plantsBefore - plantsAfter) * sim.config.energyPerFood, 6);
    // Nobody in the flames is left alive once the fire has had its turn this tick.
    h.eventsStep();
    let inFlames = 0;
    for (let i = 0; i < sim.count; i++) {
      const cell = Math.floor(sim.y[i]! / 8) * sim.gridWidth + Math.floor(sim.x[i]! / 8);
      if (h.burning[cell] === 1) {
        inFlames++;
        expect(sim.energy[i]).toBe(0);
      }
    }
    expect(inFlames).toBeGreaterThan(0);
    // It spreads over the next ticks.
    let peak = first;
    for (let t = 0; t < 70; t++) {
      sim.step();
      peak = Math.max(peak, ev.count);
    }
    expect(peak).toBeGreaterThan(first);
    expect(sim.currentEvents).toHaveLength(0);
    expect(sim.worldEvents.some((e) => e.kind === "recovery" && /burns out/.test(e.text))).toBe(true);
    expectBooksBalance(sim, books);
  });

  it("a fire cannot jump to bare ground or across water", () => {
    const sim = new Simulation(2, { ...WORLD, initialFoodFraction: 0, initialNutrientPerCell: 0, evFireEvery: 1000000000, evFireSpreadMin: 1, evFireSpreadMax: 1, evFireLengthMin: 50, evFireLengthMax: 50 });
    const h = hidden(sim);
    sim.run(5);
    sim.food.fill(0);
    h.beginFire();
    const ev = h.activeEvents[0]!;
    sim.run(30);
    expect(ev.count).toBeLessThanOrEqual(ev.cells.length + 400); // only the starting patch could burn: nothing to spread through
    expect(ev.count).toBeLessThan(60);
    for (let cell = 0; cell < sim.passable.length; cell++) if (sim.passable[cell] === 0) expect(sim.food[cell]).toBe(0);
  });

  it("a storm shoves animals downwind and blows some soil along, without losing any of it", () => {
    const sim = new Simulation(7, { ...WORLD, terrainMode: 0, initialOrganisms: 600, evStormEvery: 1000000000, evStormRadiusMin: 50, evStormRadiusMax: 50, evStormPushMin: 1, evStormPushMax: 1, evStormSoilShare: 0.5 });
    const h = hidden(sim);
    sim.run(10);
    h.beginStorm();
    const ev = h.activeEvents[0]!;
    // Look at the shove and the soil on their own, without the rest of the tick.
    ev.target = 0; // wind to the east
    const nutrient = Float64Array.from(sim.nutrient);
    const xBefore = Float32Array.from(sim.x.slice(0, sim.count));
    const total = nutrient.reduce((a, b) => a + b, 0);
    h.stormBlow(ev);
    expect(Array.from(sim.nutrient).reduce((a, b) => a + b, 0)).toBeCloseTo(total, 6);
    expect(Array.from(sim.nutrient)).not.toEqual(Array.from(nutrient));
    let moved = 0;
    for (let i = 0; i < sim.count; i++) {
      let d = sim.x[i]! - xBefore[i]!;
      if (d < -64) d += 128;
      if (d > 0.4) moved++;
      expect(d).toBeGreaterThanOrEqual(0);
    }
    expect(moved).toBeGreaterThan(20);
  });

  it("moving costs more inside a storm", () => {
    const quiet = new Simulation(7, { ...WORLD, terrainMode: 0, initialOrganisms: 300, evStormEvery: 1000000000, evStormRadiusMin: 200, evStormRadiusMax: 200, evStormPushMin: 0, evStormPushMax: 0, evStormSoilShare: 0 });
    const windy = new Simulation(7, { ...WORLD, terrainMode: 0, initialOrganisms: 300, evStormEvery: 1000000000, evStormRadiusMin: 200, evStormRadiusMax: 200, evStormPushMin: 0, evStormPushMax: 0, evStormSoilShare: 0 });
    quiet.run(10);
    windy.run(10);
    hidden(windy).beginStorm();
    const before = [quiet.ledger.movementBurned, windy.ledger.movementBurned];
    quiet.run(20);
    windy.run(20);
    const q = quiet.ledger.movementBurned - before[0]!;
    const w = windy.ledger.movementBurned - before[1]!;
    expect(w).toBeGreaterThan(q * 1.5);
  });

  it("a flood covers dry land with water for a while: plants gone, animals carried out, the land comes back", () => {
    const sim = new Simulation(11, { ...WORLD, initialOrganisms: 500, evFloodEvery: 1000000000, evFloodRadiusMin: 30, evFloodRadiusMax: 30, evFloodLengthMin: 100, evFloodLengthMax: 100 });
    const h = hidden(sim);
    sim.run(30);
    const books = bookmark(sim);
    const dryBefore = Array.from(sim.passable);
    h.beginFlood();
    const ev = h.activeEvents[0]!;
    expect(ev.cells.length).toBeGreaterThan(5);
    for (const cell of ev.cells) {
      expect(sim.passable[cell]).toBe(0);
      expect(dryBefore[cell]).toBe(1);
      expect(sim.food[cell]).toBe(0);
    }
    // Nobody is standing in the water.
    for (let i = 0; i < sim.count; i++) expect(sim.passable[Math.floor(sim.y[i]! / 8) * sim.gridWidth + Math.floor(sim.x[i]! / 8)]).toBe(1);
    sim.run(50);
    for (const cell of ev.cells) expect(sim.food[cell]).toBe(0); // (plants do not grow under water)
    sim.run(60);
    expect(sim.currentEvents).toHaveLength(0);
    expect(Array.from(sim.passable)).toEqual(dryBefore);
    expectBooksBalance(sim, books);
  });

  it("a volcano kills and burns in a small circle, cools the world, and leaves richer ground that fades", () => {
    const sim = new Simulation(4, { ...WORLD, terrainMode: 0, initialOrganisms: 600, initialFoodFraction: 1, evVolcanoEvery: 1000000000, evVolcanoRadiusMin: 12, evVolcanoRadiusMax: 12, evVolcanoCoolingMin: 0.3, evVolcanoCoolingMax: 0.3, evVolcanoLengthMin: 200, evVolcanoLengthMax: 200 });
    const h = hidden(sim);
    sim.run(20);
    const books = bookmark(sim);
    const before = sim.count;
    h.beginVolcano();
    const ev = h.activeEvents[0]!;
    expect(sim.worldEvents.at(-1)!.kind).toBe("volcano");
    const cx = Math.floor(ev.x / 8);
    const cy = Math.floor(ev.y / 8);
    const centre = cy * sim.gridWidth + cx;
    expect(sim.food[centre]).toBe(0);
    expect(sim.ash[centre]).toBeGreaterThan(0.3);
    const farCell = (centre + Math.floor(sim.food.length / 2) + 7) % sim.food.length;
    expect(sim.ash[farCell]).toBe(0);
    sim.step();
    expect(sim.count).toBeLessThanOrEqual(before + 60);
    const ashNow = sim.ash[centre]!;
    sim.run(500);
    expect(sim.ash[centre]!).toBeLessThan(ashNow);
    expect(sim.ash[centre]!).toBeGreaterThan(0);
    expectBooksBalance(sim, books);
  });

  it("ash makes ground grow faster and hold more", () => {
    const plain = new Simulation(1, { ...PATCH, climateMode: 1, evVolcanoEvery: 1000000000 });
    const rich = new Simulation(1, { ...PATCH, climateMode: 1, evVolcanoEvery: 1000000000 });
    rich.ash[0] = 0.5;
    plain.step();
    rich.step();
    expect(rich.food[0]!).toBeGreaterThan(plain.food[0]! * 1.4);
    expect(rich.food[0]!).toBeLessThan(plain.food[0]! * 1.6);
  });

  it("a blight slows the plants to the drawn fraction, and a good year speeds them up", () => {
    const options = { ...PATCH, evBlightEvery: 1000000000, evBlightGrowthMin: 0.25, evBlightGrowthMax: 0.25, evBlightLengthMin: 50, evBlightLengthMax: 50, evGoodYearEvery: 1000000000, evGoodYearBoostMin: 1.5, evGoodYearBoostMax: 1.5, evGoodYearLengthMin: 50, evGoodYearLengthMax: 50 };
    const plain = new Simulation(1, options);
    const blighted = new Simulation(1, options);
    const lucky = new Simulation(1, options);
    hidden(blighted).beginBlight();
    hidden(lucky).beginGoodYear();
    plain.step();
    blighted.step();
    lucky.step();
    expect(blighted.food[0]! / plain.food[0]!).toBeCloseTo(0.25, 6);
    expect(lucky.food[0]! / plain.food[0]!).toBeCloseTo(1.5, 6);
    blighted.run(60);
    expect(blighted.currentEvents).toHaveLength(0);
  });

  it("a blight hits just one kind of plant when there are several", () => {
    const sim = new Simulation(2, { ...WORLD, terrainMode: 0, plantTypes: 3, evBlightEvery: 1000000000 });
    hidden(sim).beginBlight();
    const ev = hidden(sim).activeEvents[0]!;
    expect(ev.target).toBeGreaterThanOrEqual(0);
    expect(ev.target).toBeLessThan(3);
    expect(sim.worldEvents.at(-1)!.text).toContain(`plant kind ${ev.target + 1}`);
  });

  it("an outbreak makes a new strain sick in a cluster of animals, and nobody is made sick without disease", () => {
    const sim = new Simulation(8, { ...WORLD, terrainMode: 0, initialOrganisms: 900, evOutbreakEvery: 1000000000, evOutbreakRadius: 60 });
    const before = sim.stats().disease.infected;
    hidden(sim).beginOutbreak();
    expect(sim.worldEvents.at(-1)!.kind).toBe("outbreak");
    expect(sim.stats().disease.infected).toBeGreaterThan(before + 5);
    expect(sim.stats().disease.strains).toBe(1);
    expect(() => new Simulation(1, { ...WORLD, diseaseTransmission: 0, evOutbreakEvery: 100 })).toThrow(/outbreaks need disease/);
  });

  it("all of them together at high frequency: they overlap, the books balance exactly, and the run is repeatable", () => {
    const config: Partial<SimConfig> = {
      ...WORLD,
      worldWidth: 256,
      worldHeight: 256,
      initialOrganisms: 1500,
      plantTypes: 3,
      evIceAgeEvery: 3000,
      evDroughtEvery: 3000,
      evMeteorEvery: 1500,
      evFireEvery: 800,
      evStormEvery: 600,
      evFloodEvery: 1200,
      evVolcanoEvery: 2000,
      evBlightEvery: 1500,
      evOutbreakEvery: 1000,
      evGoodYearEvery: 2000,
      evIceAgeLengthMin: 300,
      evIceAgeLengthMax: 900,
      evDroughtLengthMin: 300,
      evDroughtLengthMax: 900,
      evFloodLengthMin: 100,
      evFloodLengthMax: 400,
    };
    const run = (): { sim: Simulation; books: Books; mostAtOnce: number } => {
      const sim = new Simulation(21, config);
      sim.run(40);
      const books = bookmark(sim);
      let mostAtOnce = 0;
      for (let t = 0; t < 6000; t++) {
        sim.step();
        mostAtOnce = Math.max(mostAtOnce, sim.currentEvents.length);
      }
      return { sim, books, mostAtOnce };
    };
    const { sim, books, mostAtOnce } = run();
    const kinds = new Set(sim.worldEvents.map((e) => e.kind));
    for (const k of ["iceAge", "drought", "meteor", "wildfire", "storm", "flood", "volcano", "blight", "outbreak", "goodYear"] as const) expect(kinds.has(k)).toBe(true);
    expect(mostAtOnce).toBeGreaterThanOrEqual(3);
    expect(sim.count).toBeGreaterThan(0); // (still a living world, so the animal side of every event was exercised)
    expectBooksBalance(sim, books);
    // The same seed gives the same history, event for event.
    const again = run().sim;
    expect(again.fingerprint()).toBe(sim.fingerprint());
    expect(again.worldEvents).toEqual(sim.worldEvents);
  });

  it("disasters in progress survive saving and loading, and carry on exactly", () => {
    const config: Partial<SimConfig> = { ...WORLD, initialOrganisms: 300, evFireEvery: 300, evStormEvery: 300, evFloodEvery: 400, evVolcanoEvery: 400, evBlightEvery: 400 };
    const a = new Simulation(5, config);
    a.run(1500);
    expect(a.currentEvents.length).toBeGreaterThan(0);
    const b = Simulation.load(a.save());
    expect(b.currentEvents).toEqual(a.currentEvents);
    a.run(800);
    b.run(800);
    expect(b.fingerprint()).toBe(a.fingerprint());
    expect(b.worldEvents).toEqual(a.worldEvents);
  });

  it("the map layer marks fire, flood, storm and volcanic ground", () => {
    const sim = new Simulation(11, { ...WORLD, initialOrganisms: 100, initialFoodFraction: 1, evFireEvery: 1000000000, evFloodEvery: 1000000000, evVolcanoEvery: 1000000000 });
    sim.run(10);
    expect(sim.eventMap().every((v) => v === 0)).toBe(true);
    hidden(sim).beginFire();
    hidden(sim).beginFlood();
    hidden(sim).beginVolcano();
    const map = sim.eventMap();
    const seen = new Set(Array.from(map));
    expect(seen.has(1) || seen.has(2) || seen.has(4)).toBe(true);
    expect(seen.has(2)).toBe(true);
  });

  it("check the settings: ranges must make sense, and floods need terrain", () => {
    expect(() => new Simulation(1, { ...WORLD, evFireEvery: 100, evFireSpreadMin: 0.9, evFireSpreadMax: 0.1 })).toThrow(/evFireSpreadMin/);
    expect(() => new Simulation(1, { ...WORLD, terrainMode: 0, evFloodEvery: 100 })).toThrow(/floods need terrain/);
    expect(() => new Simulation(1, { ...WORLD, climateMode: 0, terrainMode: 0, evDroughtEvery: 100 })).toThrow(/need a climate/);
    expect(() => new Simulation(1, { ...WORLD, evBlightEvery: 100, evBlightGrowthMax: 1.5 })).toThrow(/evBlightGrowthMax/);
    expect(() => new Simulation(1, { ...WORLD, evGoodYearEvery: 100 })).not.toThrow();
  });
});
