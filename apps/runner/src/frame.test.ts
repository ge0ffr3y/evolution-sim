import { describe, expect, it } from "vitest";
import { createGifEncoder } from "./encoder";
import { Simulation } from "@evo/sim-core";
import { PALETTE, drawFrame } from "./frame";

const SMALL = { worldWidth: 64, worldHeight: 64, initialOrganisms: 40 };

describe("GIF frames", () => {
  it("fills every pixel with a valid palette color", () => {
    const sim = new Simulation(1, SMALL);
    sim.run(200);
    const pixels = new Uint8Array(128 * 128);
    drawFrame(sim, 128, pixels);
    expect(Math.max(...pixels)).toBeLessThan(PALETTE.length);
    expect(PALETTE.length).toBe(48);
  });

  it("draws organisms in diet colors on top of a plant-shaded ground", () => {
    const sim = new Simulation(2, SMALL);
    const pixels = new Uint8Array(128 * 128);
    drawFrame(sim, 128, pixels);
    const ground = pixels.filter((p) => p < 16).length;
    const organisms = pixels.filter((p) => p >= 16).length;
    expect(ground).toBeGreaterThan(organisms); // mostly ground
    expect(organisms).toBeGreaterThan(0); // but organisms are there
    // Everyone starts as a plant eater, so every organism pixel is the greenest diet color.
    for (const p of pixels) if (p >= 16) expect(p).toBe(16);
  });

  it("shows a meat eater in a redder color than a plant eater", () => {
    const sim = new Simulation(3, { ...SMALL, initialOrganisms: 2, initialDiet: 1, dietMin: 1, dietMax: 1 });
    const pixels = new Uint8Array(128 * 128);
    drawFrame(sim, 128, pixels);
    expect(Math.max(...pixels)).toBe(16 + 31);
  });

  it("is deterministic: the same seed draws the same picture", () => {
    const draw = (): Uint8Array => {
      const sim = new Simulation(4, SMALL);
      sim.run(300);
      const pixels = new Uint8Array(96 * 96);
      drawFrame(sim, 96, pixels);
      return pixels;
    };
    expect(draw()).toEqual(draw());
  });

  it("encodes into a real GIF file", () => {
    const sim = new Simulation(5, SMALL);
    const gif = createGifEncoder();
    const pixels = new Uint8Array(64 * 64);
    for (let f = 0; f < 3; f++) {
      sim.run(50);
      drawFrame(sim, 64, pixels);
      gif.writeFrame(pixels, 64, 64, { palette: PALETTE, delay: 80, repeat: 0 });
    }
    gif.finish();
    const bytes = gif.bytes();
    expect(String.fromCharCode(...bytes.slice(0, 6))).toBe("GIF89a");
    expect(bytes.at(-1)).toBe(0x3b); // the GIF end marker
    expect(bytes.length).toBeGreaterThan(200);
  });
});
