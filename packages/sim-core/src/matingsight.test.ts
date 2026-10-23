import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";
import { DEFAULT_CONFIG } from "./config";
import { GENE, GENE_COUNT } from "./genome";
import { INPUT } from "./brain";

// Phase 9 mating and sight: the pickiness gene, the eye gene and mate scent. All off by default.

type Hidden = {
  considerMate: (index: number, distSq: number) => void;
  seeOther: (index: number, distSq: number) => void;
  detects(viewer: number, target: number): boolean;
  layMateScent(n: number): void;
  ready: Uint8Array;
  sexMode: Uint8Array;
  mateMask: number[];
  mateSelf: number;
  mateBest: number;
  mateBestDistSq: number;
  mateBestScore: number;
  pickyCounting: boolean;
  pickyCount: number;
  pickyAlpha: number;
  eyeHalf: Float32Array;
  eyeReach: Float32Array;
  visSelf: number;
  visX: number;
  visY: number;
  visHx: number;
  visHy: number;
  visSizeLimit: number;
  visEyeHalf: number;
  rayTargetSmall: Int32Array;
  rayDistSmall: Float64Array;
  rayTargetLarge: Int32Array;
  rayDistLarge: Float64Array;
};
const h = (sim: Simulation): Hidden => sim as unknown as Hidden;
const setGene = (sim: Simulation, i: number, gene: number, value: number): void => {
  sim.genes[i * GENE_COUNT + gene] = value;
  sim.express(i);
};

describe("mating and sight settings", () => {
  it("are all off by default, and checked", () => {
    expect(DEFAULT_CONFIG.mateScent).toBe(0);
    expect(DEFAULT_CONFIG.matePickiness).toBe(0);
    expect(DEFAULT_CONFIG.eyeMode).toBe(0);
    expect(() => new Simulation(1, { matePickiness: 1 })).toThrow(/sexual reproduction/);
    expect(() => new Simulation(1, { eyeMode: 1 })).toThrow(/brains/);
    expect(() => new Simulation(1, { mateScent: 1, sexualReproduction: 1 })).toThrow(/brains/);
    expect(() => new Simulation(1, { initialEye: 2, brainMode: 2, eyeMode: 1 })).toThrow(/initialEye/);
  });
});

describe("pickiness", () => {
  // Four animals, all ready to mate and genetically close; 0 is the one choosing.
  const world = (): Simulation => {
    const sim = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 4, speciesEvery: 0, sexualReproduction: 1, matePickiness: 1, mateDistance: 1 });
    for (let i = 1; i < 4; i++) for (let g = 0; g < GENE_COUNT; g++) sim.genes[i * GENE_COUNT + g] = sim.genes[g]!;
    for (let i = 0; i < 4; i++) h(sim).ready[i] = 1;
    return sim;
  };
  const choose = (sim: Simulation, alpha: number, candidates: [number, number][]): number => {
    const x = h(sim);
    x.mateSelf = 0;
    x.pickyAlpha = alpha;
    x.mateBest = -1;
    x.mateBestDistSq = Infinity;
    x.mateBestScore = Infinity;
    for (const [index, distSq] of candidates) x.considerMate(index, distSq);
    return x.mateBest;
  };

  it("is a behavior, not part of what kind of animal it is (left out of relatedness)", () => {
    expect(h(world()).mateMask).not.toContain(GENE.pickiness);
  });

  it("with no choice (few mates around) it takes anyone; with plenty it turns down distant diets", () => {
    const sim = world();
    setGene(sim, 0, GENE.pickiness, 1);
    setGene(sim, 0, GENE.diet, 0.1);
    setGene(sim, 1, GENE.diet, 0.6); // a different eater
    expect(choose(sim, 0, [[1, 1]])).toBe(1);
    expect(choose(sim, 0.8, [[1, 1]])).toBe(-1); // allowed gap 1 - 0.8 = 0.2: 0.5 is too much
  });

  it("both partners must accept: a choosy partner can turn the chooser down", () => {
    const sim = world();
    setGene(sim, 0, GENE.pickiness, 0);
    setGene(sim, 1, GENE.pickiness, 1);
    setGene(sim, 0, GENE.diet, 0.1);
    setGene(sim, 1, GENE.diet, 0.6);
    expect(choose(sim, 0.8, [[1, 1]])).toBe(-1);
  });

  it("among acceptable mates it prefers the closer eater over the nearer animal", () => {
    const sim = world();
    setGene(sim, 0, GENE.pickiness, 0.5);
    setGene(sim, 0, GENE.diet, 0.3);
    setGene(sim, 1, GENE.diet, 0.6); // right next to it, different diet
    setGene(sim, 2, GENE.diet, 0.3); // further off, same diet
    // A diet gap of 0.3 here counts for about as much as being 3 units further away (mating range 6).
    expect(choose(sim, 0.8, [[1, 0.5], [2, 4]])).toBe(2);
    setGene(sim, 0, GENE.pickiness, 0); // not picky: the nearest
    expect(choose(sim, 0.8, [[1, 0.5], [2, 4]])).toBe(1);
  });

  it("counts the ready, compatible mates in range (how much choice there is)", () => {
    const sim = world();
    const x = h(sim);
    x.mateSelf = 0;
    x.pickyCounting = true;
    x.pickyCount = 0;
    for (const i of [1, 2, 3]) x.considerMate(i, 1);
    x.pickyCounting = false;
    expect(x.pickyCount).toBe(3);
  });
});

describe("the eye", () => {
  const world = (extra: Partial<SimConfig> = {}): Simulation =>
    new Simulation(1, { worldWidth: 128, worldHeight: 128, initialOrganisms: 2, speciesEvery: 0, brainMode: 2, ...extra });
  /** Which ray (0 to 4) sees animal 1, placed at `degrees` off animal 0's heading (left positive), or -1 if unseen. */
  const rayAt = (sim: Simulation, degrees: number, eye = 0.5): number => {
    const x = h(sim);
    if (sim.config.eyeMode === 1) setGene(sim, 0, GENE.eye, eye);
    // Angles via fixed points on a circle (the test may use trigonometry; the simulation does not).
    const r = 5;
    const rad = (degrees * Math.PI) / 180;
    sim.x[0] = 64;
    sim.y[0] = 64;
    sim.x[1] = 64 + r * Math.cos(rad);
    sim.y[1] = 64 + r * Math.sin(rad);
    x.visSelf = 0;
    x.visX = 64;
    x.visY = 64;
    x.visHx = 1;
    x.visHy = 0;
    x.visSizeLimit = 100;
    x.visEyeHalf = sim.config.eyeMode === 1 ? x.eyeHalf[0]! : 0;
    x.rayTargetSmall.fill(-1);
    x.rayDistSmall.fill(Infinity);
    x.rayTargetLarge.fill(-1);
    x.rayDistLarge.fill(Infinity);
    x.seeOther(1, r * r);
    const ray = x.rayTargetSmall.indexOf(1);
    return ray;
  };

  it("in the middle (where founders start) it sees exactly as today's eye does", () => {
    const today = world();
    const eye = world({ eyeMode: 1 });
    for (const deg of [0, 10, 14, 16, 30, 44, 46, 60, 74, 76, 89, 100, 179, -10, -50, -80, -170]) {
      expect(rayAt(eye, deg, 0.5)).toBe(rayAt(today, deg));
    }
  });

  it("a wide eye sees behind it; a narrow one sees only straight ahead", () => {
    const sim = world({ eyeMode: 1 });
    expect(rayAt(sim, 140, 0)).toBe(4); // far left ray, behind (the widest eye reaches 150 degrees each side)
    expect(rayAt(sim, -140, 0)).toBe(0);
    expect(rayAt(sim, 160, 0)).toBe(-1);
    expect(rayAt(sim, 140, 0.5)).toBe(-1);
    expect(rayAt(sim, 40, 1)).toBe(-1); // narrow: 30 degrees each side
    expect(rayAt(sim, 20, 1)).toBe(4); // the outer left ray of a narrow eye
    expect(rayAt(sim, 10, 1)).toBe(3);
    expect(rayAt(sim, 0, 1)).toBe(2);
  });

  it("reaches shorter when wide and further when narrow, so every eye covers about the same area", () => {
    const sim = world({ eyeMode: 1 });
    setGene(sim, 0, GENE.eye, 0);
    expect(h(sim).eyeReach[0]).toBeCloseTo(Math.sqrt(0.5), 5);
    setGene(sim, 0, GENE.eye, 0.5);
    expect(h(sim).eyeReach[0]).toBeCloseTo(1, 6);
    setGene(sim, 0, GENE.eye, 1);
    expect(h(sim).eyeReach[0]).toBeCloseTo(Math.sqrt(2.5), 5);
  });

  it("with camouflage, the narrowest sharp eye always notices and the widest blurry one never does", () => {
    const sim = world({ eyeMode: 1, eyeSharpness: 1, camouflageMode: 1, initialOrganisms: 40 });
    setGene(sim, 0, GENE.eye, 1);
    for (let t = 1; t < sim.count; t++) expect(h(sim).detects(0, t)).toBe(true);
    setGene(sim, 0, GENE.eye, 0);
    for (let t = 1; t < sim.count; t++) expect(h(sim).detects(0, t)).toBe(false);
  });
});

describe("mate scent", () => {
  const world = (): Simulation =>
    new Simulation(3, { worldWidth: 64, worldHeight: 64, initialOrganisms: 2, speciesEvery: 0, brainMode: 2, sexualReproduction: 2, mateScent: 1, mateScentDecay: 0.1, mateScentCost: 0.01, brainEvery: 1 });

  it("only animals looking for a mate lay it, by their diet, and it costs them energy (on the books)", () => {
    const sim = world();
    const x = h(sim);
    setGene(sim, 0, GENE.diet, 0.75);
    x.sexMode[0] = 2; // looking for a mate
    x.sexMode[1] = 1; // not
    const before = sim.energy[0]!;
    const burned = sim.ledger.sensingBurned;
    const before1 = sim.energy[1]!;
    x.layMateScent(sim.count);
    const total = (a: Float64Array): number => a.reduce((s, v) => s + v, 0);
    expect(total(sim.mateMeatScent)).toBeCloseTo(0.75, 9);
    expect(total(sim.matePlantScent)).toBeCloseTo(0.25, 9);
    expect(before - sim.energy[0]!).toBeCloseTo(0.01, 9);
    expect(sim.ledger.sensingBurned - burned).toBeCloseTo(0.01, 9);
    expect(sim.energy[1]).toBe(before1);
  });

  it("each animal smells the layer that matches its own diet", () => {
    const sim = world();
    const ss = sim.config.scentCellSize;
    const sw = sim.config.worldWidth / ss;
    // Put animal 0 at a scent square, facing east, with meat-eater scent to its east and plant-eater scent to its west.
    sim.x[0] = 10 * ss + 1;
    sim.y[0] = 8 * ss + 1;
    sim.headingX[0] = 1;
    sim.headingY[0] = 0;
    sim.mateMeatScent[8 * sw + 11] = 2;
    sim.matePlantScent[8 * sw + 9] = 2;
    const ahead = (diet: number): number => {
      setGene(sim, 0, GENE.diet, diet);
      sim.traceId = sim.id[0]!;
      sim.step();
      return sim.describe(sim.indexOfId(sim.traceId)).brain!.activity!.inputs[INPUT.mateScentAhead]!;
    };
    expect(ahead(1)).toBeGreaterThan(0); // a meat eater is drawn east
  });

  it("the books balance, and a saved world carries on exactly, with all three on", () => {
    const config: Partial<SimConfig> = { worldWidth: 128, worldHeight: 128, initialOrganisms: 200, speciesEvery: 0, brainMode: 2, sexualReproduction: 2, sexAcceptAny: 1, mateReadyFraction: 0.6, mateScent: 1, matePickiness: 1, initialPickiness: 0.5, eyeMode: 1, camouflageMode: 1 };
    const sim = new Simulation(9, config);
    sim.run(20);
    const e0 = sim.energyAudit().total;
    const m0 = sim.matterAudit().total;
    const L0 = { ...sim.ledger };
    sim.run(1500);
    const L = sim.ledger;
    expect(sim.count).toBeGreaterThan(0);
    const burned = (x: typeof L): number => x.basalBurned + x.movementBurned + x.sensingBurned + x.attackBurned + x.armorBurned + x.brainBurned;
    const expected = e0 + (L.sunlightIn - L0.sunlightIn) - (burned(L) - burned(L0)) - (L.digestionLoss - L0.digestionLoss) - (L.decayLoss - L0.decayLoss);
    expect(Math.abs(sim.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
    expect(Math.abs(sim.matterAudit().total - m0) / m0).toBeLessThan(1e-9);
    const copy = Simulation.load(sim.save());
    sim.run(300);
    copy.run(300);
    expect(copy.fingerprint()).toBe(sim.fingerprint());
  }, 120_000);
});
