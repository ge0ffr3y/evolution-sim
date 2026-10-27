import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";

/**
 * Golden fingerprints: with brains switched off (the default), these worlds must come
 * out exactly the same, forever. If one fails, behavior changed. If that was on purpose,
 * re-record the numbers (and say so in the devlog); if not, something broke.
 *
 * Recorded at the start of Phase 4, after the noise generator was made cheaper.
 */
const GOLDEN: { name: string; seed: number; ticks: number; config: object; fingerprint: number; population: number; kills: number }[] = [
  { name: "default world", seed: 42, ticks: 3000, config: {}, fingerprint: 1731478036, population: 1341, kills: 107 },
  {
    name: "small world",
    seed: 7,
    ticks: 4000,
    config: { worldWidth: 128, worldHeight: 128, initialOrganisms: 60 },
    fingerprint: 2196295624,
    population: 333,
    kills: 43,
  },
  {
    name: "boom and bust",
    seed: 3,
    ticks: 5000,
    config: { armorMin: 0, armorMax: 0, killCooldown: 5, worldWidth: 128, worldHeight: 128, initialOrganisms: 80 },
    fingerprint: 4141480267,
    population: 249,
    kills: 7,
  },
  {
    name: "sparse food",
    seed: 5,
    ticks: 4000,
    config: { foodRegrowPerTick: 0.04, worldWidth: 192, worldHeight: 192, initialOrganisms: 120 },
    fingerprint: 988378969,
    population: 248,
    kills: 19,
  },
];

describe("golden worlds (brains off)", () => {
  for (const g of GOLDEN) {
    it(`${g.name}: seed ${g.seed} for ${g.ticks} ticks is exactly as recorded`, () => {
      const sim = new Simulation(g.seed, g.config);
      sim.run(g.ticks);
      expect(sim.count).toBe(g.population);
      expect(sim.totalKills).toBe(g.kills);
      expect(sim.fingerprint()).toBe(g.fingerprint);
    }, 120_000);
  }
});

/**
 * The same idea for worlds with brains. Recorded when brains were first added (before
 * and after the "skip unused senses" speed-up, which must not change any result). Re-recorded in Phase 8b, when the brain layout grew (home, memory and chemical inputs, memory outputs, 16 hidden units), and in Phase 8e O2 (eleven new senses: nutrient store, plant richness, damaged ground, water, thirst; 576 connection slots), and in Phase 8e O3 (six colony senses; 640 connection slots), and in Phase 8f (nine learning and place senses; 704 connection slots), and again in Phase 8f (four memory gate outputs; 768 connection slots), and in Phase 9 (the fat-reserve sense, two mate-scent senses, then stomach fullness); and in Phase 11, when the room for thinking units grew from 16 to 64, which moved the action nodes (only the numbering changed: mapping the actions back gives the old fingerprints exactly, and population and kills are unchanged), then seven feelings and body senses).
 */
const GOLDEN_BRAINS: { name: string; seed: number; ticks: number; config: object; fingerprint: number; population: number; kills: number }[] = [
  {
    name: "evolvable brains",
    seed: 3,
    ticks: 6000,
    config: { brainMode: 2, worldWidth: 192, worldHeight: 192, initialOrganisms: 150, foodRegrowPerTick: 0.04 },
    fingerprint: 3560638248,
    population: 346,
    kills: 11,
  },
  {
    name: "fixed-layout brains",
    seed: 5,
    ticks: 4000,
    config: { brainMode: 1, brainHidden: 4, brainWeightZeroProb: 0.7, worldWidth: 192, worldHeight: 192, initialOrganisms: 150, foodRegrowPerTick: 0.04 },
    fingerprint: 903327458,
    population: 258,
    kills: 16,
  },
  {
    name: "fast-growing brains",
    seed: 4,
    ticks: 4000,
    config: { brainMode: 2, brainAddConnectionProb: 0.8, brainAddNodeProb: 0.4, brainWeightMutationProb: 0.2, brainRemoveConnectionProb: 0.01, worldWidth: 128, worldHeight: 128, initialOrganisms: 100 },
    fingerprint: 4287745964,
    population: 307,
    kills: 22,
  },
  {
    name: "brains that think every third tick",
    seed: 2,
    ticks: 5000,
    config: { brainMode: 2, brainEvery: 3, brainAddConnectionProb: 0.2, worldWidth: 192, worldHeight: 192, initialOrganisms: 120 },
    fingerprint: 730921598,
    population: 694,
    kills: 70,
  },
  {
    name: "appetite-shaped senses",
    seed: 6,
    ticks: 5000,
    config: { brainMode: 2, brainAppetiteSenses: 1, brainAddConnectionProb: 0.2, worldWidth: 192, worldHeight: 192, initialOrganisms: 120 },
    fingerprint: 494224258,
    population: 693,
    kills: 118,
  },
  {
    // Phase 11: units feeding units and loops (brainDepth), with room for 32 units. Grows chains two units deep.
    name: "deeper brains",
    seed: 9,
    ticks: 4000,
    config: { brainMode: 2, brainDepth: 1, brainHiddenMax: 32, brainAddConnectionProb: 0.8, brainAddNodeProb: 0.4, brainWeightMutationProb: 0.2, brainRemoveConnectionProb: 0.01, worldWidth: 128, worldHeight: 128, initialOrganisms: 100 },
    fingerprint: 2538567589,
    population: 222,
    kills: 0,
  },
  {
    // Phase 11: feelings (pain, joy, taste, sick, ready) and the curiosity gene.
    name: "feelings and curiosity",
    seed: 10,
    ticks: 5000,
    config: { brainMode: 2, feelings: 1, curiosity: 1, initialCuriosity: 0.5, brainAppetiteSenses: 1, brainAddConnectionProb: 0.3, worldWidth: 192, worldHeight: 192, initialOrganisms: 120 },
    fingerprint: 2478369519,
    population: 728,
    kills: 76,
  },
];

describe("golden worlds (with brains)", () => {
  for (const g of GOLDEN_BRAINS) {
    it(`${g.name}: seed ${g.seed} for ${g.ticks} ticks is exactly as recorded`, () => {
      const sim = new Simulation(g.seed, g.config);
      sim.run(g.ticks);
      expect(sim.count).toBe(g.population);
      expect(sim.totalKills).toBe(g.kills);
      expect(sim.fingerprint()).toBe(g.fingerprint);
    }, 120_000);
  }
});
