import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";
import { SNAPSHOT_FORMAT, snapshotFromBytes, snapshotToBytes, type SimSnapshot } from "./snapshot";
import type { SimConfig } from "./config";

const WORLDS: { name: string; seed: number; config: Partial<SimConfig> }[] = [
  { name: "plain world (no brains)", seed: 3, config: { worldWidth: 128, worldHeight: 128, initialOrganisms: 100 } },
  {
    name: "brains with everything on (trails, stamina, kill ownership, appetite senses)",
    seed: 7,
    config: { worldWidth: 128, worldHeight: 128, initialOrganisms: 120, brainMode: 2, brainAppetiteSenses: 1, sprintFatigue: 1, killOwnershipTicks: 30, brainAddConnectionProb: 0.3, speciesDistance: 0.1, speciesProbation: 300 },
  },
  { name: "terrain with a water barrier", seed: 9, config: { worldWidth: 128, worldHeight: 128, initialOrganisms: 100, terrainMode: 1, terrainBarrierWidth: 1 } },
  { name: "climate with the thermal gene, terrain and sexual reproduction", seed: 11, config: { worldWidth: 128, worldHeight: 128, initialOrganisms: 100, climateMode: 1, yearLength: 400, dayLength: 70, thermalCostCoeff: 1, terrainMode: 1, sexualReproduction: 1, mateRange: 10 } },
  { name: "fixed-layout brains", seed: 5, config: { worldWidth: 128, worldHeight: 128, initialOrganisms: 80, brainMode: 1, brainHidden: 3 } },
];

function bytesOf(sim: Simulation): Uint8Array {
  return snapshotToBytes(sim.save());
}

function same(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

describe("saving and loading a world", () => {
  for (const world of WORLDS) {
    it(`${world.name}: a reloaded world carries on exactly like the original`, () => {
      const original = new Simulation(world.seed, world.config);
      original.run(1500);
      const snapshot = original.save();
      const loaded = Simulation.load(snapshot);
      // Right after loading the two worlds are indistinguishable...
      expect(loaded.tick).toBe(original.tick);
      expect(loaded.fingerprint()).toBe(original.fingerprint());
      expect(same(bytesOf(loaded), bytesOf(original))).toBe(true);
      // ...and they stay that way (this is what proves nothing was left out of the save).
      for (let block = 0; block < 3; block++) {
        original.run(500);
        loaded.run(500);
        expect(loaded.fingerprint()).toBe(original.fingerprint());
      }
      expect(same(bytesOf(loaded), bytesOf(original))).toBe(true);
      expect(JSON.stringify(loaded.speciesRecords)).toBe(JSON.stringify(original.speciesRecords));
      expect(JSON.stringify(loaded.events)).toBe(JSON.stringify(original.events));
    }, 120_000);

    it(`${world.name}: saving to bytes and back changes nothing`, () => {
      const original = new Simulation(world.seed, world.config);
      original.run(800);
      const bytes = snapshotToBytes(original.save());
      const loaded = Simulation.load(snapshotFromBytes(bytes));
      expect(same(snapshotToBytes(loaded.save()), bytes)).toBe(true);
      original.run(600);
      loaded.run(600);
      expect(loaded.fingerprint()).toBe(original.fingerprint());
    }, 120_000);
  }

  it("saving does not disturb the running world", () => {
    const a = new Simulation(2, WORLDS[1]!.config);
    const b = new Simulation(2, WORLDS[1]!.config);
    a.run(700);
    b.run(700);
    a.save();
    a.run(300);
    b.run(300);
    expect(a.fingerprint()).toBe(b.fingerprint());
  });

  it("a snapshot is a copy: running the original on does not change it", () => {
    const sim = new Simulation(4, WORLDS[0]!.config);
    sim.run(500);
    const snapshot = sim.save();
    const before = snapshotToBytes(snapshot);
    sim.run(500);
    expect(same(snapshotToBytes(snapshot), before)).toBe(true);
  });

  it("branching: the same moment with a different seed gives a different but repeatable future", () => {
    const sim = new Simulation(6, WORLDS[1]!.config);
    sim.run(1000);
    const snapshot = sim.save();
    const same1 = Simulation.load(snapshot);
    const branchA = Simulation.load(snapshot, { seed: 99 });
    const branchA2 = Simulation.load(snapshot, { seed: 99 });
    const branchB = Simulation.load(snapshot, { seed: 100 });
    expect(branchA.tick).toBe(1000);
    expect(branchA.fingerprint()).not.toBe(sim.fingerprint()); // the generator differs from the start
    for (const s of [same1, branchA, branchA2, branchB]) s.run(800);
    expect(branchA.fingerprint()).toBe(branchA2.fingerprint());
    expect(branchA.fingerprint()).not.toBe(branchB.fingerprint());
    expect(branchA.fingerprint()).not.toBe(same1.fingerprint());
    // Everything that was already true stays true in the branch.
    expect(branchA.tick).toBe(1800);
    expect(branchA.totalBirths).toBeGreaterThan(sim.totalBirths);
  });

  it("rejects files that are not saved worlds, are cut short, or come from another version", () => {
    expect(() => snapshotFromBytes(new Uint8Array(40))).toThrow(/not a saved Evolution Sim world/);
    const sim = new Simulation(1, WORLDS[0]!.config);
    sim.run(50);
    const bytes = snapshotToBytes(sim.save());
    expect(() => snapshotFromBytes(bytes.slice(0, bytes.length - 500))).toThrow(/cut short/);
    const old: SimSnapshot = { ...sim.save(), format: SNAPSHOT_FORMAT + 1 };
    expect(() => snapshotFromBytes(snapshotToBytes(old))).toThrow(/different version/);
    expect(() => Simulation.load(old)).toThrow(/format/);
  });

  it("text with accents and emoji survives the trip through bytes", () => {
    const sim = new Simulation(1, WORLDS[0]!.config);
    const snapshot = sim.save();
    snapshot.state = { ...snapshot.state, note: "héllo ✓ 🦊" };
    const back = snapshotFromBytes(snapshotToBytes(snapshot));
    expect(back.state.note).toBe("héllo ✓ 🦊");
  });

  it("every piece of the world's state is either saved or knowingly left out (guard for future changes)", () => {
    // If this fails after you add a field to Simulation: decide whether it must be saved (add it
    // to save() and restore()) or is scratch space rebuilt every tick, then list it below.
    const rebuilt = new Set([
      // Settings and layout worked out from the config when a world is built.
      "config", "ranges", "seed", "gridHeight", "gridWidth", "terrainOn", "agingOn", "litterOn", "catKind", "catStart", "catEnd", "worldEvents", "thermalOn", "thermalScale", "activeGene", "climateOn", "temperature", "growthFactor", "tempBase", "tempSwing", "lightBase", "scentWidth", "scentHeight", "scentOn", "guardOn", "staminaOn", "hash", "tracker",
      "float32Fields", "float64Fields", "uint32Fields", "uint16Fields", "uint8Fields", "seeOther", "considerPrey",
      // Scratch space: filled in and used up within one tick, or only used while measuring.
      "behaviorHeading", "behaviorIds", "behaviorIsHunter", "behaviorSideLeft",
      "pickAttacker", "pickBest", "pickBestDistSq", "pickSizeLimit",
      "rayDistLarge", "rayDistSmall", "rayTargetLarge", "rayTargetSmall",
      "visHx", "visHy", "visSelf", "visSizeLimit", "visX", "visY",
      "thinkHidden", "thinkInputs", "thinkOutputs", "traceHidden", "traceInputs", "traceOutputs", "traceValid", "traceId",
      "meatClaim", "plantClaim", "plantShare", "meatShare", "meatDensity", "parents",
      "ready", "pairs", "mateMask", "mateSelf", "mateBest", "mateBestDistSq", "mateBestScore", "considerMate", "sexOn",
    ]);
    const sim = new Simulation(1, WORLDS[1]!.config);
    sim.run(600);
    const loaded = Simulation.load(sim.save());
    const n = sim.count;
    for (const key of Object.keys(sim)) {
      if (rebuilt.has(key)) continue;
      const a = (sim as unknown as Record<string, unknown>)[key];
      const b = (loaded as unknown as Record<string, unknown>)[key];
      if (ArrayBuffer.isView(a)) {
        const x = a as unknown as ArrayLike<number>;
        const y = b as unknown as ArrayLike<number>;
        // Per-organism arrays hold stale leftovers past the living ones; the land arrays are compared whole.
        const length = x.length === 0 ? 0 : x.length >= n * 2 && x.length !== sim.food.length && x.length !== sim.preyScent.length && x.length !== sim.corpseOwner.length ? n : x.length;
        for (let i = 0; i < length; i++) {
          if (x[i] !== y[i]) throw new Error(`"${key}" differs after loading (at ${i}: ${x[i]} against ${y[i]})`);
        }
      } else {
        expect(JSON.stringify(b), `field "${key}"`).toBe(JSON.stringify(a));
      }
    }
  }, 60_000);
});
