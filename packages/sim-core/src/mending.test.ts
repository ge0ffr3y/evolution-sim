import { describe, expect, it } from "vitest";
import { Simulation } from "./simulation";
import type { SimConfig } from "./config";

const WORLD: Partial<SimConfig> = { worldWidth: 128, worldHeight: 128, initialOrganisms: 200, speciesEvery: 0, mutationLoadRate: 1, mutationLoadCost: 0.02, mutationLoadModel: 1 };
const meanLoad = (sim: Simulation): number => {
  const load = (sim as unknown as { loadMask: Uint32Array }).loadMask;
  let sum = 0;
  for (let i = 0; i < sim.count; i++) sum += load[i]!;
  return sum / sim.count;
};

describe("mending harmful mutations (textbook ratchet)", () => {
  it("is off by default: setting it to 0 changes nothing", () => {
    const a = new Simulation(2, WORLD);
    const b = new Simulation(2, { ...WORLD, mutationLoadMend: 0 });
    a.run(1500);
    b.run(1500);
    expect(b.fingerprint()).toBe(a.fingerprint());
  });

  it("keeps the load of an asexual population lower, levelling off near new mutations / mending chance", () => {
    const plain = new Simulation(3, WORLD);
    const mended = new Simulation(3, { ...WORLD, mutationLoadMend: 0.25 });
    plain.run(6000);
    mended.run(6000);
    expect(meanLoad(mended)).toBeLessThan(meanLoad(plain));
    // With 1 new harmful mutation per birth and a 1-in-4 chance of mending each, the load cannot settle above about 4 (selection keeps it lower still).
    expect(meanLoad(mended)).toBeLessThan(4.5);
  });

  it("check the setting", () => {
    expect(() => new Simulation(1, { ...WORLD, mutationLoadMend: 1.5 })).toThrow(/mutationLoadMend/);
  });
});
