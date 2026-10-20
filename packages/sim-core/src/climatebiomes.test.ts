import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";
import { BIOME, climateBiome } from "./terrain";

const WORLD: Partial<SimConfig> = { worldWidth: 512, worldHeight: 512, initialOrganisms: 50, speciesEvery: 0, terrainMode: 2, climateMode: 1, yearLength: 2000 };
const hidden = (sim: Simulation): { tempBase: Float64Array; growthFactor: Float64Array; plantTypeOf: Uint8Array } => sim as unknown as { tempBase: Float64Array; growthFactor: Float64Array; plantTypeOf: Uint8Array };

type Books = { energy: number; matter: number; ledger: Simulation["ledger"] };
const bookmark = (sim: Simulation): Books => ({ energy: sim.energyAudit().total, matter: sim.matterAudit().total, ledger: { ...sim.ledger } });
function expectBooksBalance(sim: Simulation, from: Books): void {
  const L = sim.ledger;
  const B = from.ledger;
  const burned = (x: Simulation["ledger"]): number => x.basalBurned + x.movementBurned + x.sensingBurned + x.attackBurned + x.armorBurned + x.brainBurned;
  const expected = from.energy + (L.sunlightIn - B.sunlightIn) - (burned(L) - burned(B)) - (L.digestionLoss - B.digestionLoss) - (L.decayLoss - B.decayLoss);
  expect(Math.abs(sim.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
  expect(Math.abs(sim.matterAudit().total - from.matter) / from.matter).toBeLessThan(1e-9);
}

describe("climate biomes (terrainMode 2)", () => {
  it("have the same seas and highlands as the five-biome terrain for the same seed", () => {
    const old = new Simulation(4, { ...WORLD, terrainMode: 1 });
    const now = new Simulation(4, WORLD);
    for (let cell = 0; cell < now.biome.length; cell++) {
      expect(now.biome[cell] === BIOME.water).toBe(old.biome[cell] === BIOME.water);
      expect(now.biome[cell] === BIOME.mountain).toBe(old.biome[cell] === BIOME.mountain);
    }
  });

  it("every land biome appears, and each cell's biome follows from its average temperature and moisture", () => {
    const sim = new Simulation(1, WORLD);
    const seen = new Set<number>();
    for (let cell = 0; cell < sim.biome.length; cell++) {
      const b = sim.biome[cell]!;
      seen.add(b);
      if (b === BIOME.water || b === BIOME.mountain) continue;
      expect(b).toBe(climateBiome(sim.config, hidden(sim).tempBase[cell]!, sim.moistureBase[cell]!));
    }
    for (const b of [BIOME.plains, BIOME.forest, BIOME.desert, BIOME.mountain, BIOME.tundra, BIOME.boreal, BIOME.savanna, BIOME.tropical, BIOME.swamp]) expect(seen.has(b)).toBe(true);
  });

  it("ice spreads in an ice age and melts back afterwards; nothing grows on ice, and crossing it costs more", () => {
    const sim = new Simulation(1, { ...WORLD, catastropheKind: 1, catastropheAt: 100, catastropheLength: 2000, iceAgeCooling: 0.15 });
    const ice = (): number => sim.iced.reduce((a, b) => a + b, 0);
    sim.run(90);
    const before = ice();
    expect(before).toBeGreaterThan(0);
    sim.run(1010); // the middle of the ice age
    const worst = ice();
    expect(worst).toBeGreaterThan(before * 2);
    for (let cell = 0; cell < sim.iced.length; cell++) if (sim.iced[cell] === 1) expect(hidden(sim).growthFactor[cell]).toBe(0);
    sim.run(1100);
    expect(ice()).toBe(before);
  });

  it("with several kinds of plant, each place grows the kind that likes its temperature", () => {
    const sim = new Simulation(2, { ...WORLD, plantTypes: 3 });
    const h = hidden(sim);
    let coldest = 0;
    let hottest = 0;
    for (let cell = 0; cell < sim.biome.length; cell++) {
      if (h.tempBase[cell]! < h.tempBase[coldest]!) coldest = cell;
      if (h.tempBase[cell]! > h.tempBase[hottest]!) hottest = cell;
    }
    expect(h.plantTypeOf[coldest]).toBe(0);
    expect(h.plantTypeOf[hottest]).toBe(2);
  });

  it("the books balance exactly, the run repeats, and a saved world carries on exactly (with brains, disease and camouflage)", () => {
    const config: Partial<SimConfig> = { ...WORLD, worldWidth: 256, worldHeight: 256, initialOrganisms: 400, brainMode: 2, brainAddConnectionProb: 0.3, diseaseTransmission: 0.3, camouflageMode: 1, nutrientMode: 2, overgrazeDamage: 0.003, catastropheKind: 1, catastropheAt: 300, catastropheLength: 800 };
    const a = new Simulation(5, config);
    a.run(20);
    const books = bookmark(a);
    a.run(1000);
    const copy = Simulation.load(a.save());
    a.run(800);
    copy.run(800);
    expect(copy.fingerprint()).toBe(a.fingerprint());
    expectBooksBalance(a, books);
    const again = new Simulation(5, config);
    again.run(1820);
    expect(again.fingerprint()).toBe(a.fingerprint());
  }, 60_000);
});
