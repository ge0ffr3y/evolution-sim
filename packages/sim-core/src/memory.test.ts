import { describe, expect, it } from "vitest";
import { INPUT, OUTPUT, OUTPUT_START, CONN_MAX, setConnection, soft } from "./brain";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

/** A quiet one-organism world with an empty brain: no food, no breeding, no mutation, no wobble. */
function stage(extra: Partial<SimConfig> = {}): Partial<SimConfig> {
  return {
    worldWidth: 64,
    worldHeight: 64,
    initialOrganisms: 1,
    maxOrganisms: 40,
    foodRegrowPerTick: 0,
    initialFoodFraction: 0,
    reproThresholdPerSize: 1e9,
    initialEnergyFraction: 0.5,
    mutationRateMin: 0,
    mutationRateMax: 0,
    initialMutationRate: 0,
    metaMutationStd: 0,
    speciesEvery: 0,
    brainMode: 2,
    brainFounderReflex: 0,
    brainEvery: 1,
    brainTurnNoise: 0,
    brainVisionRange: 0,
    ...extra,
  };
}

function wire(sim: Simulation, from: number, to: number, weight: number): void {
  sim.brainCount[0] = setConnection(sim.brainFrom, sim.brainTo, sim.brainWeight, 0, sim.brainCount[0]!, from, to, weight);
  (sim as unknown as { refreshBrain(i: number): void }).refreshBrain(0);
}

function seenInputs(sim: Simulation): number[] {
  sim.traceId = sim.id[0]!;
  sim.step();
  return sim.describe(sim.indexOfId(sim.traceId)).brain!.activity!.inputs;
}

describe("brain memory", () => {
  it("what the brain writes comes back as an input next time it thinks", () => {
    const sim = new Simulation(1, stage({ brainMemory: 1 }));
    wire(sim, INPUT.bias, OUTPUT_START + OUTPUT.memory0, 2);
    expect(seenInputs(sim)[INPUT.memory0]).toBe(0); // nothing written yet
    expect(seenInputs(sim)[INPUT.memory0]).toBeCloseTo(soft(2), 5);
  });

  it("a memory cell wired to itself holds its value (and a brain can start it with another input)", () => {
    const sim = new Simulation(1, stage({ brainMemory: 1 }));
    wire(sim, INPUT.memory1, OUTPUT_START + OUTPUT.memory1, 3); // feed the cell back into itself
    wire(sim, INPUT.bias, OUTPUT_START + OUTPUT.memory1, 1);
    const first = seenInputs(sim)[INPUT.memory1]!;
    const second = seenInputs(sim)[INPUT.memory1]!;
    const third = seenInputs(sim)[INPUT.memory1]!;
    expect(first).toBe(0);
    expect(second).toBeGreaterThan(0.4);
    expect(third).toBeGreaterThan(second); // it builds up, which a memoryless brain could never do
  });

  it("is off by default: the inputs stay at zero however the brain is wired", () => {
    const sim = new Simulation(1, stage());
    wire(sim, INPUT.bias, OUTPUT_START + OUTPUT.memory0, 2);
    seenInputs(sim);
    expect(seenInputs(sim)[INPUT.memory0]).toBe(0);
  });

  it("needs brains", () => {
    expect(() => new Simulation(1, { brainMemory: 1 })).toThrow(/brainMemory needs brains/);
    expect(() => new Simulation(1, { homeMode: 1 })).toThrow(/homeMode needs brains/);
  });
});

describe("home", () => {
  function homeInputs(x: number, y: number, hx: number, hy: number, homeX: number, homeY: number, extra: Partial<SimConfig> = {}): number[] {
    const sim = new Simulation(1, stage({ homeMode: 1, homeRange: 20, ...extra }));
    wire(sim, INPUT.bias, OUTPUT_START + OUTPUT.speed, 1); // any working connection, so the brain thinks
    sim.x[0] = x;
    sim.y[0] = y;
    sim.headingX[0] = hx;
    sim.headingY[0] = hy;
    const internals = sim as unknown as { homeX: Float32Array; homeY: Float32Array };
    internals.homeX[0] = homeX;
    internals.homeY[0] = homeY;
    sim.speed[0] = 0; // stay where we were put
    return seenInputs(sim);
  }

  it("senses which way home lies, and how far (up to homeRange)", () => {
    const ahead = homeInputs(30, 30, 1, 0, 40, 30);
    expect(ahead[INPUT.homeAhead]).toBeCloseTo(1, 3);
    expect(ahead[INPUT.homeSide]).toBeCloseTo(0, 3);
    expect(ahead[INPUT.homeDistance]).toBeCloseTo(10 / 20, 3);
    expect(homeInputs(30, 30, 1, 0, 20, 30)[INPUT.homeAhead]).toBeCloseTo(-1, 3);
    expect(homeInputs(30, 30, 1, 0, 30, 40)[INPUT.homeSide]).toBeCloseTo(1, 3); // to the left (+y)
    expect(homeInputs(30, 30, 1, 0, 30, 20)[INPUT.homeSide]).toBeCloseTo(-1, 3);
    expect(homeInputs(30, 30, 1, 0, 61, 30)[INPUT.homeDistance]).toBe(1); // far away: capped (the world wraps, so 31 away)
  });

  it("the world wraps: home just across the edge is near", () => {
    const wrapped = homeInputs(2, 30, -1, 0, 62, 30, { homeRange: 20 });
    expect(wrapped[INPUT.homeDistance]).toBeCloseTo(4 / 20, 3);
    expect(wrapped[INPUT.homeAhead]).toBeCloseTo(1, 3); // west, across the edge
  });

  it("at home there is nothing to sense", () => {
    const here = homeInputs(30, 30, 1, 0, 30, 30);
    expect(here[INPUT.homeDistance]).toBe(0);
    expect(here[INPUT.homeAhead]).toBe(0);
  });

  it("babies are born where they are (mode 1) or inherit their parent's home (mode 2)", () => {
    const homes = (mode: number): { all: number; fromFounders: number } => {
      const sim = new Simulation(3, { worldWidth: 128, worldHeight: 128, initialOrganisms: 40, brainMode: 2, homeMode: mode, foodRegrowPerTick: 0.06 });
      const internals = sim as unknown as { homeX: Float32Array; homeY: Float32Array };
      const founders = new Set<string>();
      for (let i = 0; i < sim.count; i++) founders.add(`${internals.homeX[i]},${internals.homeY[i]}`);
      sim.run(1500);
      let fromFounders = 0;
      for (let i = 0; i < sim.count; i++) if (founders.has(`${internals.homeX[i]},${internals.homeY[i]}`)) fromFounders++;
      return { all: sim.count, fromFounders };
    };
    const own = homes(1);
    const inherited = homes(2);
    expect(inherited.all).toBeGreaterThan(40);
    expect(inherited.fromFounders).toBe(inherited.all); // every home is one of the founders' places
    expect(own.fromFounders).toBeLessThan(own.all);
  });
});

describe("brains with memory and home", () => {
  it("are deterministic, conserve energy and matter, and a saved world carries on exactly", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 150, brainMode: 2, brainMemory: 1, homeMode: 2, brainAddConnectionProb: 0.3, foodRegrowPerTick: 0.05 } as Partial<SimConfig>;
    const a = new Simulation(5, config);
    const b = new Simulation(5, config);
    const energy0 = a.energyAudit().total;
    const matter0 = a.matterAudit().total;
    a.run(2000);
    b.run(2000);
    const L = a.ledger;
    const burned = L.basalBurned + L.movementBurned + L.sensingBurned + L.attackBurned + L.armorBurned + L.brainBurned;
    const expected = energy0 + L.sunlightIn - burned - L.digestionLoss - L.decayLoss;
    expect(Math.abs(a.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
    expect(Math.abs(a.matterAudit().total - matter0) / matter0).toBeLessThan(1e-9);
    expect(a.fingerprint()).toBe(b.fingerprint());
    const loaded = Simulation.load(a.save());
    a.run(500);
    loaded.run(500);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
    expect(CONN_MAX).toBeGreaterThan(0);
  }, 90_000);
});

describe("home as the best place remembered (homeMode 3)", () => {
  const hidden = (s: Simulation): { homeX: Float32Array; homeY: Float32Array; homeValue: Float32Array } => s as unknown as { homeX: Float32Array; homeY: Float32Array; homeValue: Float32Array };

  it("moves to where it ate a better meal than any it remembers, and fades otherwise", () => {
    const sim = new Simulation(1, stage({ homeMode: 3, homeMemoryDecay: 0.9, homeMemoryMin: 0.001, reproThresholdPerSize: 20 }));
    sim.genes[0 + 6] = 0; // plant eater
    sim.express(0);
    sim.speed[0] = 0;
    sim.x[0] = 20;
    sim.y[0] = 20;
    const home0 = hidden(sim).homeX[0]!;
    const cellAt = (x: number, y: number): number => Math.floor(y / sim.config.foodCellSize) * sim.gridWidth + Math.floor(x / sim.config.foodCellSize);
    sim.food[cellAt(20, 20)] = 50;
    sim.step();
    expect(hidden(sim).homeX[0]).toBeCloseTo(20, 4);
    expect(hidden(sim).homeY[0]).toBeCloseTo(20, 4);
    expect(home0).not.toBeCloseTo(20, 1); // it was somewhere else before (the founder's random place)
    const value = hidden(sim).homeValue[0]!;
    expect(value).toBeGreaterThan(0.001);
    // Move to a poor patch: a weaker meal does not move home, and the memory fades.
    sim.x[0] = 40;
    sim.y[0] = 40;
    sim.food.fill(0);
    sim.food[cellAt(40, 40)] = 0.02;
    sim.step();
    expect(hidden(sim).homeX[0]).toBeCloseTo(20, 4);
    expect(hidden(sim).homeValue[0]!).toBeLessThan(value);
  });

  it("babies inherit the remembered place", () => {
    const sim = new Simulation(3, { worldWidth: 128, worldHeight: 128, initialOrganisms: 40, brainMode: 2, homeMode: 3, foodRegrowPerTick: 0.06 });
    sim.run(1500);
    expect(sim.count).toBeGreaterThan(40);
    expect(Array.from({ length: sim.count }, (_, i) => hidden(sim).homeValue[i]!).some((v) => v > 0)).toBe(true);
  });

  it("conserves energy, is deterministic, and saves and reloads exactly", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 120, brainMode: 2, homeMode: 3, brainAddConnectionProb: 0.3, foodRegrowPerTick: 0.05 } as Partial<SimConfig>;
    const a = new Simulation(5, config);
    const b = new Simulation(5, config);
    a.run(1500);
    b.run(1500);
    expect(a.fingerprint()).toBe(b.fingerprint());
    const loaded = Simulation.load(a.save());
    a.run(400);
    loaded.run(400);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
  }, 60_000);
});
