import { describe, expect, it } from "vitest";
import { CONN_MAX, INPUT, OUTPUT, OUTPUT_START, RAY_CHANNELS, HIDDEN_START, setConnectionForTests } from "./brain-test-helpers";
import { GENE, GENE_COUNT, traitToGene } from "./genome";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

const TURN = OUTPUT_START + OUTPUT.turn;
const SPEED = OUTPUT_START + OUTPUT.speed;
const ATTACK = OUTPUT_START + OUTPUT.attack;

/** A quiet 64x64 stage: no food growing, no random wobble, brains think every tick, nothing breeds. */
function stage(extra: Partial<SimConfig> = {}): Partial<SimConfig> {
  return {
    worldWidth: 64,
    worldHeight: 64,
    initialOrganisms: 2,
    maxOrganisms: 30,
    brainMode: 2,
    brainFounderReflex: 0,
    brainEvery: 1,
    brainTurnNoise: 0,
    brainVisionRange: 0, // the tests below give vision range through the sense gene
    initialSenseRange: 8,
    senseRangeMax: 12,
    foodRegrowPerTick: 0,
    initialFoodFraction: 0,
    reproThresholdPerSize: 1e9,
    initialEnergyFraction: 1e-4,
    initialSpeed: 0.5,
    speedMin: 0.1,
    mutationRateMin: 0,
    mutationRateMax: 0,
    initialMutationRate: 0,
    metaMutationStd: 0,
    attackMin: 0,
    attackMax: 0,
    ...extra,
  };
}

function setGene(sim: Simulation, i: number, gene: keyof typeof GENE, trait: number): void {
  sim.genes[i * GENE_COUNT + GENE[gene]] = traitToGene(trait, sim.ranges[gene]);
  sim.express(i);
}

function wire(sim: Simulation, i: number, from: number, to: number, weight: number): void {
  const base = i * CONN_MAX;
  sim.brainCount[i] = setConnectionForTests(sim.brainFrom, sim.brainTo, sim.brainWeight, base, sim.brainCount[i]!, from, to, weight);
  (sim as unknown as { refreshBrain(i: number): void }).refreshBrain(i);
}

function place(sim: Simulation, i: number, x: number, y: number, hx = 1, hy = 0): void {
  sim.x[i] = x;
  sim.y[i] = y;
  sim.headingX[i] = hx;
  sim.headingY[i] = hy;
}

/** What organism 0's brain saw on its last think (inputs), after running one tick. */
function seen(sim: Simulation): number[] {
  sim.traceId = sim.id[0]!;
  sim.step();
  const activity = sim.describe(sim.indexOfId(sim.traceId)).brain!.activity;
  return activity!.inputs;
}

function visionIndex(ray: number, channel: number): number {
  return INPUT.visionStart + ray * RAY_CHANNELS + channel;
}

describe("vision", () => {
  /** Organism 0 looks east from the middle; organism 1 sits `dist` away at `angle` degrees. */
  function look(angleDeg: number, dist: number, setup?: (sim: Simulation) => void): number[] {
    const sim = new Simulation(1, stage());
    place(sim, 0, 32, 32);
    const a = (angleDeg * Math.PI) / 180;
    place(sim, 1, 32 + dist * Math.cos(a), 32 + dist * Math.sin(a), 0, 1);
    setGene(sim, 1, "speed", 0.1);
    setup?.(sim);
    return seen(sim);
  }
  const nonZeroVision = (inputs: number[]): number[] => inputs.slice(0, 5 * RAY_CHANNELS).flatMap((v, i) => (v !== 0 ? [i] : []));

  it("sees something straight ahead in the middle ray, and how near it is", () => {
    const inputs = look(0, 4);
    expect(inputs[visionIndex(2, 0)]).toBeCloseTo(1 - 4 / 8, 3);
    expect(nonZeroVision(inputs).filter((i) => Math.floor(i / RAY_CHANNELS) !== 2).length).toBe(0);
  });

  it("puts things on the left in the left rays and things on the right in the right rays", () => {
    expect(look(25, 4)[visionIndex(3, 0)]).toBeGreaterThan(0);
    expect(look(-25, 4)[visionIndex(1, 0)]).toBeGreaterThan(0);
    expect(look(60, 4)[visionIndex(4, 0)]).toBeGreaterThan(0);
    expect(look(-60, 4)[visionIndex(0, 0)]).toBeGreaterThan(0);
  });

  it("uses only one ray per object", () => {
    for (const angle of [0, 25, -25, 60, -60]) {
      const rays = new Set(nonZeroVision(look(angle, 4)).map((i) => Math.floor(i / RAY_CHANNELS)));
      expect(rays.size).toBe(1);
    }
  });

  it("cannot see sideways or behind", () => {
    expect(nonZeroVision(look(90, 4))).toEqual([]);
    expect(nonZeroVision(look(-90, 4))).toEqual([]);
    expect(nonZeroVision(look(180, 4))).toEqual([]);
    expect(nonZeroVision(look(120, 4))).toEqual([]);
  });

  it("cannot see beyond its sense range, and sees nothing with a sense range of zero", () => {
    expect(nonZeroVision(look(0, 9))).toEqual([]);
    expect(nonZeroVision(look(0, 4, (sim) => setGene(sim, 0, "senseRange", 0)))).toEqual([]);
  });

  it("every brained organism sees at least the baseline vision range, even with no sense range at all", () => {
    const sim = new Simulation(1, stage({ brainVisionRange: 6, initialSenseRange: 0 }));
    place(sim, 0, 32, 32);
    place(sim, 1, 35, 32, 0, 1);
    setGene(sim, 1, "speed", 0.1);
    expect(seen(sim)[visionIndex(2, 0)]).toBeCloseTo(1 - 3 / 6, 3);
    const far = new Simulation(1, stage({ brainVisionRange: 6, initialSenseRange: 0 }));
    place(far, 0, 32, 32);
    place(far, 1, 40, 32, 0, 1);
    setGene(far, 1, "speed", 0.1);
    expect(nonZeroVision(seen(far))).toEqual([]);
  });

  it("the sense gene adds reach on top of the baseline", () => {
    const sim = new Simulation(1, stage({ brainVisionRange: 4, initialSenseRange: 4, senseRangeMax: 8 }));
    place(sim, 0, 32, 32);
    place(sim, 1, 39, 32, 0, 1); // 7 away: beyond 4, within 4 + 4
    setGene(sim, 1, "speed", 0.1);
    expect(seen(sim)[visionIndex(2, 0)]).toBeCloseTo(1 - 7 / 8, 3);
  });

  it("closer means a stronger signal", () => {
    expect(look(0, 2)[visionIndex(2, 0)]).toBeGreaterThan(look(0, 6)[visionIndex(2, 0)]!);
  });

  it("separates smaller things (channels 0 and 1) from bigger things (channels 2 and 3)", () => {
    const smaller = look(0, 4, (sim) => setGene(sim, 1, "size", 0.6));
    expect(smaller[visionIndex(2, 0)]).toBeGreaterThan(0);
    expect(smaller[visionIndex(2, 2)]).toBe(0);
    const bigger = look(0, 4, (sim) => setGene(sim, 1, "size", 2.5));
    expect(bigger[visionIndex(2, 2)]).toBeGreaterThan(0);
    expect(bigger[visionIndex(2, 0)]).toBe(0);
  });

  it("reports how meaty the other looks: plant eater -1, meat eater +1", () => {
    expect(look(0, 4, (sim) => setGene(sim, 1, "diet", 0))[visionIndex(2, 1)]).toBeCloseTo(-1, 5);
    expect(look(0, 4, (sim) => setGene(sim, 1, "diet", 1))[visionIndex(2, 1)]).toBeCloseTo(1, 5);
  });

  it("sees across the wrap-around edge of the world", () => {
    const sim = new Simulation(1, stage());
    place(sim, 0, 62, 32);
    place(sim, 1, 2, 32, 0, 1); // 4 units ahead, through the edge
    setGene(sim, 1, "speed", 0.1);
    expect(seen(sim)[visionIndex(2, 0)]).toBeCloseTo(0.5, 3);
  });

  it("when two things share a ray, the nearer one is reported", () => {
    const sim = new Simulation(1, stage({ initialOrganisms: 3 }));
    place(sim, 0, 32, 32);
    place(sim, 1, 38, 32, 0, 1);
    place(sim, 2, 35, 32, 0, 1);
    setGene(sim, 1, "speed", 0.1);
    setGene(sim, 2, "speed", 0.1);
    expect(seen(sim)[visionIndex(2, 0)]).toBeCloseTo(1 - 3 / 8, 3);
  });
});

describe("smell and the body", () => {
  it("smells which way plants get richer, and how much is here", () => {
    const sim = new Simulation(1, stage({ initialOrganisms: 1 }));
    place(sim, 0, 36, 36); // cell (4,4)
    sim.food[4 * 8 + 5] = 8; // east
    sim.food[4 * 8 + 3] = 2; // west
    sim.food[4 * 8 + 4] = 5; // here
    const inputs = seen(sim);
    expect(inputs[INPUT.smellPlantAhead]).toBeGreaterThan(0.4); // facing east: richer ahead
    expect(inputs[INPUT.smellPlantSide]).toBeCloseTo(0, 5);
    expect(inputs[INPUT.plantHere]).toBeCloseTo(5 / sim.config.foodCap, 5);
  });

  it("richer ground to the left shows up as a positive side smell, to the right as negative", () => {
    const make = (northRich: boolean): number => {
      const sim = new Simulation(1, stage({ initialOrganisms: 1 }));
      place(sim, 0, 36, 36); // facing east (+x); +y is to the left in this world's turning convention
      sim.food[(northRich ? 5 : 3) * 8 + 4] = 9;
      return seen(sim)[INPUT.smellPlantSide]!;
    };
    expect(make(true)).toBeGreaterThan(0.3);
    expect(make(false)).toBeLessThan(-0.3);
  });

  it("smells corpses too", () => {
    const sim = new Simulation(1, stage({ initialOrganisms: 1 }));
    place(sim, 0, 36, 36);
    sim.corpseEnergy[4 * 8 + 5] = 30;
    sim.corpseEnergy[4 * 8 + 4] = 15;
    const inputs = seen(sim);
    expect(inputs[INPUT.smellMeatAhead]).toBeGreaterThan(0.3);
    expect(inputs[INPUT.meatHere]).toBeCloseTo(0.5, 3);
  });

  it("feels hunger, age, a constant bias, and some changing noise", () => {
    const sim = new Simulation(1, stage({ initialOrganisms: 1 }));
    sim.energy[0] = sim.threshold[0]! * 0.5;
    const first = seen(sim);
    expect(first[INPUT.energy]).toBeCloseTo(0, 2); // half way to reproducing reads as 0
    expect(first[INPUT.bias]).toBe(1);
    expect(first[INPUT.age]).toBeCloseTo(-1, 2);
    const second = seen(sim);
    expect(second[INPUT.noise]).not.toBe(first[INPUT.noise]);
    expect(Math.abs(first[INPUT.noise]!)).toBeLessThanOrEqual(1);
  });
});

describe("what a brain can do", () => {
  it("turns left when the turn output is positive, and right when negative", () => {
    const turned = (weight: number): number => {
      const sim = new Simulation(1, stage({ initialOrganisms: 1 }));
      place(sim, 0, 32, 32);
      wire(sim, 0, INPUT.bias, TURN, weight);
      sim.step();
      return sim.headingY[0]!; // facing east, turning left makes y positive
    };
    expect(turned(2)).toBeGreaterThan(0.1);
    expect(turned(-2)).toBeLessThan(-0.1);
  });

  it("drives speed: a negative speed output slows it, a positive one speeds it up, within limits", () => {
    const travelled = (weight: number): number => {
      const sim = new Simulation(1, stage({ initialOrganisms: 1 }));
      place(sim, 0, 32, 32);
      wire(sim, 0, INPUT.bias, SPEED, weight);
      sim.step();
      return Math.hypot(sim.x[0]! - 32, sim.y[0]! - 32);
    };
    const normal = travelled(0);
    expect(normal).toBeCloseTo(0.5, 3);
    expect(travelled(-1)).toBeCloseTo(normal * 0.5, 3);
    expect(travelled(-1000)).toBeLessThan(0.01);
    expect(travelled(1)).toBeCloseTo(normal * 1.5, 3);
    expect(travelled(1000)).toBeLessThanOrEqual(normal * 2 + 1e-6);
  });

  it("moving faster costs more energy, and standing still costs almost none", () => {
    const movementCost = (weight: number): number => {
      const sim = new Simulation(1, stage({ initialOrganisms: 1, moveCostCoeff: 0.1 }));
      wire(sim, 0, INPUT.bias, SPEED, weight);
      sim.energy[0] = 1000;
      sim.step();
      return sim.ledger.movementBurned;
    };
    expect(movementCost(1000)).toBeGreaterThan(movementCost(0) * 3); // flat out is about 4x
    expect(movementCost(-1000)).toBeLessThan(movementCost(0) * 0.01);
  });

  it("standing still lets it eat faster: up to the configured bonus", () => {
    const eaten = (weight: number): number => {
      const sim = new Simulation(1, stage({ initialOrganisms: 1, initialFoodFraction: 1, brainStillEatBonus: 0.5, foodCap: 100, biteRate: 0.5 }));
      place(sim, 0, 8, 8);
      wire(sim, 0, INPUT.bias, SPEED, weight);
      sim.energy[0] = 1000;
      sim.step();
      return sim.plantTaken[0]!;
    };
    const moving = eaten(0);
    const still = eaten(-1000);
    expect(still / moving).toBeCloseTo(1.5, 2);
  });

  it("can hold back an attack by driving the attack output below the gate", () => {
    const attacks = (weight: number | null): number => {
      const sim = new Simulation(1, stage({ attackMax: 2, herbivoreAttackPenalty: 0, attackAttemptCost: 0, attackCostCoeff: 0 }));
      place(sim, 0, 32, 32);
      place(sim, 1, 33, 32, 0, 1);
      setGene(sim, 0, "attack", 1);
      setGene(sim, 0, "diet", 1);
      setGene(sim, 1, "speed", 0.1);
      sim.energy[0] = 1000;
      sim.energy[1] = 1000;
      if (weight !== null) wire(sim, 0, INPUT.bias, ATTACK, weight);
      sim.step();
      return sim.totalAttacks;
    };
    expect(attacks(null)).toBe(1); // blank brain: attacks as before
    expect(attacks(1000)).toBe(1); // eager: attacks
    expect(attacks(-1000)).toBe(0); // held back
  });

  it("thinks only every brainEvery ticks, and keeps its last decision in between", () => {
    const sim = new Simulation(1, stage({ initialOrganisms: 1, brainEvery: 3 }));
    wire(sim, 0, INPUT.noise, TURN, 2);
    const outputs: number[] = [];
    for (let t = 0; t < 12; t++) {
      sim.step();
      outputs.push(sim.outTurn[0]!);
    }
    let changes = 0;
    for (let t = 1; t < outputs.length; t++) if (outputs[t] !== outputs[t - 1]) changes++;
    expect(changes).toBeGreaterThanOrEqual(3);
    expect(changes).toBeLessThanOrEqual(4); // one new decision per three ticks
  });
});

describe("brain cost", () => {
  it("costs base + per hidden unit + per working connection, every tick", () => {
    const sim = new Simulation(1, stage({ initialOrganisms: 1, brainBaseCost: 0.01, brainCostPerNeuron: 0.1, brainCostPerConnection: 0.001 }));
    expect(sim.brainCost[0]).toBeCloseTo(0.01, 6);
    wire(sim, 0, INPUT.energy, HIDDEN_START, 1);
    wire(sim, 0, HIDDEN_START, TURN, 1);
    wire(sim, 0, INPUT.age, SPEED, 1);
    expect(sim.brainHidden[0]).toBe(1);
    expect(sim.brainConnections[0]).toBe(3);
    expect(sim.brainCost[0]).toBeCloseTo(0.01 + 0.1 + 3 * 0.001, 6);
    sim.energy[0] = 100;
    sim.step();
    expect(sim.ledger.brainBurned).toBeCloseTo(0.113, 6);
  });

  it("is zero in a world without brains", () => {
    const sim = new Simulation(2, { worldWidth: 128, worldHeight: 128, initialOrganisms: 40 });
    sim.run(300);
    expect(sim.ledger.brainBurned).toBe(0);
  });
});

describe("worlds with brains", () => {
  const SMALL = { worldWidth: 128, worldHeight: 128, initialOrganisms: 80, initialSenseRange: 6 };

  it("founders start with the plant-smell reflex when asked, and blank when not", () => {
    const withReflex = new Simulation(1, { ...SMALL, brainMode: 2, brainFounderReflex: 1 });
    expect(withReflex.brainCount[0]).toBe(1);
    expect(withReflex.brainFrom[0]).toBe(INPUT.smellPlantSide);
    expect(withReflex.brainTo[0]).toBe(TURN);
    expect(withReflex.brainWeight[0]).toBeGreaterThan(0);
    expect(new Simulation(1, { ...SMALL, brainMode: 2, brainFounderReflex: 0 }).brainCount[0]).toBe(0);
    const fixed = new Simulation(1, { ...SMALL, brainMode: 1, brainHidden: 4, brainFounderReflex: 1 });
    // Fully wired (every input->hidden and hidden->output connection), plus the one direct reflex.
    expect(fixed.brainCount[0]).toBe(4 * (INPUT.noise + 1) + 4 * 3 + 1);
    expect(fixed.brainConnections[0]).toBe(1);
  });

  it("founders with reflex 2 start with a pull toward smaller things: left prey turns them left, right prey right, bigger things do nothing", () => {
    const turnToward = (angleDeg: number, preySize: number): number => {
      const sim = new Simulation(1, stage({ brainFounderReflex: 2, brainVisionRange: 8, initialSenseRange: 0 }));
      place(sim, 0, 32, 32);
      const a = (angleDeg * Math.PI) / 180;
      place(sim, 1, 32 + 5 * Math.cos(a), 32 + 5 * Math.sin(a), 0, 1);
      setGene(sim, 1, "size", preySize);
      setGene(sim, 1, "speed", 0.1);
      sim.step();
      return sim.headingY[0]!; // facing east: positive y = turned left
    };
    expect(turnToward(35, 0.6)).toBeGreaterThan(0.05);
    expect(turnToward(-35, 0.6)).toBeLessThan(-0.05);
    expect(Math.abs(turnToward(35, 2.5))).toBeLessThan(0.01); // bigger: not chased
  });

  it("reflex 2 includes the plant-smell reflex too, and reflex 1 has no chase", () => {
    const two = new Simulation(1, { ...SMALL, brainMode: 2, brainFounderReflex: 2 });
    expect(two.brainCount[0]).toBeGreaterThanOrEqual(1 + 4 + 1);
    const one = new Simulation(1, { ...SMALL, brainMode: 2, brainFounderReflex: 1 });
    expect(one.brainCount[0]).toBe(1);
  });

  it("a newborn gets a copy of its parent's brain when nothing mutates", () => {
    const sim = new Simulation(3, {
      ...SMALL,
      initialOrganisms: 1,
      brainMode: 2,
      brainFounderReflex: 1,
      brainWeightMutationProb: 0,
      brainAddConnectionProb: 0,
      brainAddNodeProb: 0,
      brainRemoveConnectionProb: 0,
      brainRemoveNodeProb: 0,
      initialEnergyFraction: 0.999,
    });
    wire(sim, 0, INPUT.age, SPEED, 0.7);
    sim.step();
    expect(sim.count).toBe(2);
    const child = 1;
    expect(sim.brainCount[child]).toBe(sim.brainCount[0]);
    for (let k = 0; k < sim.brainCount[0]!; k++) {
      expect(sim.brainFrom[child * CONN_MAX + k]).toBe(sim.brainFrom[k]);
      expect(sim.brainWeight[child * CONN_MAX + k]).toBe(sim.brainWeight[k]);
    }
  });

  it("brains survive the shuffling that happens when organisms die", () => {
    const sim = new Simulation(5, { ...SMALL, brainMode: 2, brainFounderReflex: 1, brainAddConnectionProb: 0.5 });
    sim.run(1500);
    expect(sim.count).toBeGreaterThan(0);
    // Every living organism's recorded size matches what its connections actually add up to.
    for (let i = 0; i < sim.count; i++) {
      let working = 0;
      for (let k = 0; k < sim.brainCount[i]!; k++) {
        const w = sim.brainWeight[i * CONN_MAX + k]!;
        if (Math.abs(w) >= sim.config.brainPruneBelow) working++;
      }
      expect(sim.brainConnections[i]).toBe(working);
    }
  });

  for (const mode of [1, 2] as const) {
    it(`mode ${mode}: energy and matter are still conserved to better than a part in a billion`, () => {
      const sim = new Simulation(11, { worldWidth: 128, worldHeight: 128, initialOrganisms: 120, initialSenseRange: 6, brainMode: mode, brainHidden: 3, brainAddConnectionProb: 0.3, brainWeightMutationProb: 0.1 });
      for (let i = 0; i < sim.count; i += 20) {
        sim.genes[i * GENE_COUNT + GENE.attack] = 0.3;
        sim.genes[i * GENE_COUNT + GENE.diet] = 0.8;
        sim.express(i);
      }
      const energy0 = sim.energyAudit().total;
      const matter0 = sim.matterAudit().total;
      for (let block = 0; block < 6; block++) {
        sim.run(400);
        const L = sim.ledger;
        const burned = L.basalBurned + L.movementBurned + L.sensingBurned + L.attackBurned + L.armorBurned + L.brainBurned;
        const expected = energy0 + L.sunlightIn - burned - L.digestionLoss - L.decayLoss;
        expect(Math.abs(sim.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
        expect(Math.abs(sim.matterAudit().total - matter0) / matter0).toBeLessThan(1e-9);
      }
      expect(sim.ledger.brainBurned).toBeGreaterThan(0);
    }, 120_000);

    it(`mode ${mode}: the same seed gives exactly the same world`, () => {
      const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 100, initialSenseRange: 6, brainMode: mode, brainHidden: 3, brainAddConnectionProb: 0.3, brainWeightMutationProb: 0.1 };
      const a = new Simulation(21, config);
      const b = new Simulation(21, config);
      a.run(1500);
      b.run(1500);
      expect(a.fingerprint()).toBe(b.fingerprint());
      expect(new Simulation(22, config).fingerprint()).not.toBe(a.fingerprint());
    }, 120_000);
  }

  it("brains change the world: a brained world is not the same as the brains-off world", () => {
    const base = { worldWidth: 128, worldHeight: 128, initialOrganisms: 100, initialSenseRange: 6 };
    const off = new Simulation(4, base);
    const on = new Simulation(4, { ...base, brainMode: 2 });
    off.run(800);
    on.run(800);
    expect(on.fingerprint()).not.toBe(off.fingerprint());
  });

  it("the brain viewer data: working links, size, cost, and live activity for a traced organism", () => {
    const sim = new Simulation(1, stage({ initialOrganisms: 1 }));
    wire(sim, 0, INPUT.energy, HIDDEN_START, 1.5);
    wire(sim, 0, HIDDEN_START, TURN, -2);
    const before = sim.describe(0).brain!;
    expect(before.links).toHaveLength(2);
    expect(before.hidden).toBe(1);
    expect(before.activity).toBeNull(); // not traced yet
    sim.traceId = sim.id[0]!;
    sim.step();
    const after = sim.describe(0).brain!;
    expect(after.activity).not.toBeNull();
    expect(after.activity!.inputs).toHaveLength(INPUT.noise + 1);
    expect(after.activity!.outputs).toHaveLength(3);
    expect(after.activity!.outputs[OUTPUT.turn]).not.toBe(0);
  });

  it("describe() reports no brain in a world without brains", () => {
    expect(new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 5 }).describe(0).brain).toBeNull();
  });
});

describe("measuring purposeful behavior", () => {
  /** An arena with a hunter (organism 0) facing east and a smaller plant eater up and to its left. */
  function chaseArena(wired: boolean): Simulation {
    const sim = new Simulation(1, stage({ attackMax: 2, attackAttemptCost: 0, attackCostCoeff: 0, herbivoreAttackPenalty: 0 }));
    place(sim, 0, 20, 20);
    setGene(sim, 0, "attack", 1);
    setGene(sim, 0, "diet", 1);
    place(sim, 1, 24, 23, 0, 1);
    setGene(sim, 1, "size", 0.6);
    setGene(sim, 1, "speed", 0.1);
    if (wired) {
      wire(sim, 0, visionIndex(3, 0), TURN, 2); // a smaller thing on the left turns me left
      wire(sim, 0, visionIndex(4, 0), TURN, 2);
    }
    sim.energy.fill(1000);
    return sim;
  }

  it("a hunter wired to chase turns toward prey that is off to one side", () => {
    const sim = chaseArena(true);
    sim.behaviorBefore();
    sim.step();
    const stats = sim.behaviorAfter();
    expect(stats.chaseSamples).toBe(1);
    expect(stats.chase).toBe(1);
  });

  it("a hunter wired the wrong way turns away from the prey, and the measure says so", () => {
    const sim = chaseArena(false);
    wire(sim, 0, visionIndex(3, 0), TURN, -2);
    wire(sim, 0, visionIndex(4, 0), TURN, -2);
    sim.behaviorBefore();
    sim.step();
    expect(sim.behaviorAfter().chase).toBe(0);
  });

  it("a plant eater wired to flee turns away from a big armed meat eater off to one side", () => {
    const sim = new Simulation(1, stage({ attackMax: 2, attackAttemptCost: 0, attackCostCoeff: 0, herbivoreAttackPenalty: 0 }));
    place(sim, 0, 20, 20); // the plant eater, facing east
    setGene(sim, 0, "size", 0.6);
    place(sim, 1, 24, 23, 0, 1); // a big hunter up and to the left
    setGene(sim, 1, "size", 2);
    setGene(sim, 1, "attack", 1);
    setGene(sim, 1, "diet", 1);
    setGene(sim, 1, "speed", 0.1);
    wire(sim, 0, visionIndex(3, 2), TURN, -2); // a bigger thing on the left turns me right
    wire(sim, 0, visionIndex(4, 2), TURN, -2);
    sim.energy.fill(1000);
    sim.behaviorBefore();
    sim.step();
    const stats = sim.behaviorAfter();
    expect(stats.fleeSamples).toBe(1);
    expect(stats.flee).toBe(1);
  });

  it("ignores targets that are dead ahead, out of range, or outside the field of view", () => {
    const sim = chaseArena(true);
    place(sim, 1, 30, 20, 0, 1); // dead ahead
    sim.behaviorBefore();
    expect(sim.behaviorAfter().chaseSamples).toBe(0);
    place(sim, 1, 20, 28, 0, 1); // straight to the side: outside the cone
    sim.behaviorBefore();
    expect(sim.behaviorAfter().chaseSamples).toBe(0);
    place(sim, 1, 40, 30, 0, 1); // out of range
    sim.behaviorBefore();
    expect(sim.behaviorAfter().chaseSamples).toBe(0);
  });

  it("with no brains, turning toward prey is about as likely as turning away (0.5)", () => {
    const sim = new Simulation(3, { worldWidth: 128, worldHeight: 128, initialOrganisms: 500, initialSenseRange: 6 });
    // One in six becomes an armed meat eater; the rest stay plant eaters (prey).
    for (let i = 0; i < sim.count; i += 6) {
      sim.genes[i * GENE_COUNT + GENE.attack] = 0.1;
      sim.genes[i * GENE_COUNT + GENE.diet] = 0.9;
      sim.express(i);
    }
    let towardSum = 0;
    let total = 0;
    for (let t = 0; t < 120; t++) {
      sim.behaviorBefore();
      sim.step();
      const s = sim.behaviorAfter();
      towardSum += s.chase * s.chaseSamples;
      total += s.chaseSamples;
    }
    expect(total).toBeGreaterThan(30);
    expect(towardSum / total).toBeGreaterThan(0.3);
    expect(towardSum / total).toBeLessThan(0.7);
  });
});
