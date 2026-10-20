import { describe, expect, it } from "vitest";
import { GENE, GENE_COUNT, traitToGene } from "./genome";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

/** A one-patch stage with no plants and no upkeep, so only what we set up matters. */
const STAGE: Partial<SimConfig> = {
  worldWidth: 16,
  worldHeight: 16,
  foodCellSize: 16,
  fertilityScale: 1,
  fertilityVariation: 0,
  speedMax: 4,
  senseRangeMax: 3,
  initialOrganisms: 1,
  initialSpeed: 0.1,
  initialFoodFraction: 0,
  foodRegrowPerTick: 0,
  reproThresholdPerSize: 1e9,
  initialEnergyFraction: 0.5,
  basalCostCoeff: 0,
  moveCostCoeff: 0,
  senseCostCoeff: 0,
  mutationRateMin: 0,
  mutationRateMax: 0,
  initialMutationRate: 0,
  metaMutationStd: 0,
  speciesEvery: 0,
  toxinStrength: 0.6,
  avoidLearn: 0.5,
  avoidFade: 0.01,
  avoidWidth: 0.1,
};

const hidden = (s: Simulation): { corpseToxin: Float32Array; avoidStrength: Float32Array; avoidHue: Float32Array; lastKillHue: Float32Array; lastKillTick: Uint32Array; basalCost: Float32Array; foldToxin(c: number, before: number, added: number, toxin: number): void } =>
  s as unknown as { corpseToxin: Float32Array; avoidStrength: Float32Array; avoidHue: Float32Array; lastKillHue: Float32Array; lastKillTick: Uint32Array; basalCost: Float32Array; foldToxin(c: number, before: number, added: number, toxin: number): void };

/** A meat eater on a patch with a corpse of the given toxicity. Returns its energy after one tick, and the meat energy it took. */
function meal(toxin: number, extra: Partial<SimConfig> = {}): { energy: number; eaten: number; sim: Simulation } {
  const sim = new Simulation(1, { ...STAGE, ...extra });
  sim.genes[GENE.diet] = 1;
  sim.express(0);
  sim.speed[0] = 0;
  sim.x[0] = 5;
  sim.y[0] = 5;
  sim.energy[0] = 5;
  sim.corpseMatter[0] = 10;
  sim.corpseEnergy[0] = 80;
  hidden(sim).corpseToxin[0] = toxin;
  sim.step();
  return { energy: sim.energy[0]!, eaten: sim.ledger.meatEaten, sim };
}

describe("toxicity", () => {
  it("is off by default: the gene is not used and there are no extra arrays", () => {
    const sim = new Simulation(1, { worldWidth: 64, worldHeight: 64, initialOrganisms: 20 });
    expect(hidden(sim).corpseToxin).toHaveLength(0);
    expect(hidden(sim).avoidStrength).toHaveLength(0);
    expect(() => new Simulation(1, { toxinStrength: -1 })).toThrow(/toxinStrength/);
    expect(() => new Simulation(1, { toxinStrength: 0.5, avoidWidth: 0.9 })).toThrow(/avoidWidth/);
  });

  it("being toxic costs extra upkeep, in proportion to the gene", () => {
    const upkeep = (toxicity: number): number => {
      const sim = new Simulation(1, { ...STAGE, basalCostCoeff: 0.05, toxinUpkeep: 0.2 });
      sim.genes[GENE.toxicity] = toxicity;
      sim.express(0);
      return hidden(sim).basalCost[0]!;
    };
    expect(upkeep(1) / upkeep(0)).toBeCloseTo(1.2, 5);
    expect(upkeep(0.5) / upkeep(0)).toBeCloseTo(1.1, 5);
  });

  it("a body joining a corpse mixes its toxicity in, weighted by matter", () => {
    const sim = new Simulation(1, STAGE);
    const h = hidden(sim);
    h.corpseToxin[0] = 0;
    h.foldToxin(0, 0, 4, 1); // a clean cell, a toxic body of matter 4
    expect(h.corpseToxin[0]).toBeCloseTo(1, 6);
    h.foldToxin(0, 4, 4, 0); // an equally heavy harmless body joins it
    expect(h.corpseToxin[0]).toBeCloseTo(0.5, 6);
    h.foldToxin(0, 8, 8, 1); // twice as much again, all toxic
    expect(h.corpseToxin[0]).toBeCloseTo(0.75, 6);
  });

  it("a toxic animal that dies leaves a toxic corpse where it fell", () => {
    const sim = new Simulation(1, { ...STAGE, initialOrganisms: 1 });
    sim.genes[GENE.toxicity] = 0.8;
    sim.express(0);
    sim.speed[0] = 0;
    sim.energy[0] = 1e-9; // it cannot pay its upkeep, so it dies of hunger
    sim.config; // (no upkeep in the stage: make it die by hand)
    sim.energy[0] = 0;
    sim.step();
    expect(sim.count).toBe(0);
    expect(hidden(sim).corpseToxin[0]).toBeCloseTo(0.8, 5);
  });

  it("eating meat from a toxic corpse costs extra energy: strength x toxicity x the meat's energy, taken as heat", () => {
    const clean = meal(0);
    const poisoned = meal(1);
    expect(clean.eaten).toBeGreaterThan(0);
    expect(poisoned.eaten).toBeCloseTo(clean.eaten, 9);
    expect(clean.energy - poisoned.energy).toBeCloseTo(0.6 * 1 * clean.eaten, 5);
    expect(meal(0.5).energy - poisoned.energy).toBeCloseTo(0.6 * 0.5 * clean.eaten, 5);
    // The energy went out through the upkeep line, so the books balance.
    const L = poisoned.sim.ledger;
    expect(L.basalBurned).toBeCloseTo(0.6 * clean.eaten, 5);
  });

  it("a hunter poisoned just after its own kill remembers the color of what it killed; one that was not, does not", () => {
    const learn = (recentKill: boolean): { strength: number; hue: number } => {
      const sim = new Simulation(1, STAGE);
      const h = hidden(sim);
      sim.genes[GENE.diet] = 1;
      sim.express(0);
      sim.speed[0] = 0;
      sim.x[0] = 5;
      sim.y[0] = 5;
      sim.energy[0] = 5;
      sim.corpseMatter[0] = 10;
      sim.corpseEnergy[0] = 80;
      h.corpseToxin[0] = 0.8;
      if (recentKill) {
        h.lastKillHue[0] = 0.37;
        h.lastKillTick[0] = sim.tick + 1;
      }
      sim.step();
      return { strength: h.avoidStrength[0]!, hue: h.avoidHue[0]! };
    };
    const learned = learn(true);
    // avoidLearn 0.5 x toxicity 0.8, then one tick of fading (1%).
    expect(learned.strength).toBeCloseTo(0.5 * 0.8 * 0.99, 4);
    expect(learned.hue).toBeCloseTo(0.37, 5);
    expect(learn(false).strength).toBe(0);
  });

  it("the memory fades by a fixed share each tick", () => {
    const sim = new Simulation(1, STAGE);
    hidden(sim).avoidStrength[0] = 0.5;
    sim.step();
    expect(hidden(sim).avoidStrength[0]).toBeCloseTo(0.495, 6);
    sim.run(2000);
    expect(hidden(sim).avoidStrength[0]).toBe(0);
  });

  /** A hunter next to an easy target of a given color. Returns the kills after a few ticks. */
  function kills(preyHue: number, avoidHue: number, strength: number): number {
    const sim = new Simulation(1, { ...STAGE, initialOrganisms: 2, initialSize: 1, attackMax: 2 });
    for (let i = 0; i < 2; i++) for (let g = 0; g < GENE_COUNT; g++) sim.genes[i * GENE_COUNT + g] = 0.3;
    sim.genes[GENE.attack] = 1;
    sim.genes[GENE.diet] = 0.9;
    sim.genes[GENE.size] = traitToGene(1.5, sim.ranges.size);
    sim.genes[GENE_COUNT + GENE.size] = traitToGene(0.5, sim.ranges.size);
    sim.genes[GENE_COUNT + GENE.attack] = 0;
    sim.genes[GENE_COUNT + GENE.armor] = 0;
    sim.genes[GENE_COUNT + GENE.hue] = preyHue;
    sim.express(0);
    sim.express(1);
    const h = hidden(sim);
    h.avoidHue[0] = avoidHue;
    h.avoidStrength[0] = strength;
    for (let t = 0; t < 6; t++) {
      sim.step();
      sim.x[0] = 5;
      sim.y[0] = 5;
      if (sim.count > 1) {
        sim.x[1] = 5.5;
        sim.y[1] = 5;
      }
      sim.resting[0] = 0;
      h.avoidStrength[0] = strength; // hold the memory steady for the test
    }
    return sim.totalKills;
  }

  it("a hunter passes up prey of the color it remembers as poison, but not other colors", () => {
    expect(kills(0.5, 0.9, 1)).toBeGreaterThan(0); // a different color: it attacks
    expect(kills(0.5, 0.5, 0)).toBeGreaterThan(0); // it remembers nothing: it attacks
    expect(kills(0.5, 0.5, 1)).toBe(0); // the remembered color, remembered fully: it passes
    expect(kills(0.55, 0.5, 1)).toBe(0); // close enough on the color wheel
    expect(kills(0.62, 0.5, 1)).toBeGreaterThan(0); // just outside the width
    expect(kills(0.98, 0.04, 1)).toBe(0); // the wheel wraps round: 0.98 and 0.04 are 0.06 apart
  });

  it("in a real world with predators it conserves energy and matter, is deterministic, and saves and reloads exactly", () => {
    const config = { worldWidth: 128, worldHeight: 128, initialOrganisms: 300, initialAttack: 0.5, initialDiet: 0.5, toxinStrength: 0.7, founderSpread: 1, mutationRateMin: 0.02, initialMutationRate: 0.02 } as Partial<SimConfig>;
    const a = new Simulation(7, config);
    const b = new Simulation(7, config);
    const energy0 = a.energyAudit().total;
    const matter0 = a.matterAudit().total;
    a.run(3000);
    b.run(3000);
    const L = a.ledger;
    const burned = L.basalBurned + L.movementBurned + L.sensingBurned + L.attackBurned + L.armorBurned + L.brainBurned;
    const expected = energy0 + L.sunlightIn - burned - L.digestionLoss - L.decayLoss;
    expect(Math.abs(a.energyAudit().total - expected) / expected).toBeLessThan(1e-9);
    expect(Math.abs(a.matterAudit().total - matter0) / matter0).toBeLessThan(1e-9);
    expect(a.totalKills).toBeGreaterThan(0);
    expect(Math.max(...hidden(a).corpseToxin)).toBeGreaterThan(0);
    expect(a.fingerprint()).toBe(b.fingerprint());
    const loaded = Simulation.load(a.save());
    expect(Array.from(hidden(loaded).corpseToxin)).toEqual(Array.from(hidden(a).corpseToxin));
    a.run(500);
    loaded.run(500);
    expect(loaded.fingerprint()).toBe(a.fingerprint());
  }, 90_000);

  it("a world saved without toxicity still loads", () => {
    const plain = new Simulation(3, { worldWidth: 64, worldHeight: 64, initialOrganisms: 50 });
    plain.run(200);
    const loaded = Simulation.load(plain.save());
    expect(hidden(loaded).corpseToxin).toHaveLength(0);
    plain.run(50);
    loaded.run(50);
    expect(loaded.fingerprint()).toBe(plain.fingerprint());
  }, 60_000);
});
