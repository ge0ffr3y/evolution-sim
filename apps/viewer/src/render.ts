import type { FrameMessage } from "./protocol";

/** What the dot colors mean. */
export type ColorBy = "diet" | "speed" | "size" | "hue" | "energy" | "sense" | "health" | "colony" | "cell" | "palate" | "toxicity" | "nutrient" | "water";

/** What the map background shows. */
export type Overlay = "plants" | "nutrients" | "corpses" | "detritus" | "trails" | "terrain" | "temperature" | "light" | "background" | "plantKinds" | "grazing" | "fouling" | "erosion" | "events" | "plantQuality" | "moisture";

export const OVERLAYS: readonly { id: Overlay; label: string }[] = [
  { id: "plants", label: "Plants" },
  { id: "nutrients", label: "Soil nutrients" },
  { id: "corpses", label: "Corpses" },
  { id: "detritus", label: "Detritus" },
  { id: "trails", label: "Scent trails (brains only)" },
  { id: "terrain", label: "Terrain (worlds with terrain; ice shows white)" },
  { id: "moisture", label: "Moisture (worlds with climate biomes)" },
  { id: "temperature", label: "Temperature (worlds with a climate)" },
  { id: "light", label: "Plant growth (worlds with a climate)" },
  { id: "background", label: "Background color (worlds with camouflage)" },
  { id: "plantKinds", label: "Kinds of plant (worlds with several kinds)" },
  { id: "grazing", label: "Grazing damage (worlds with overgrazing)" },
  { id: "fouling", label: "Fouled ground (worlds with fouling)" },
  { id: "erosion", label: "Worn-away soil (worlds with erosion)" },
  { id: "plantQuality", label: "Plant nutrient (worlds with nutrient mode 2; poorest to richest right now)" },
  { id: "events", label: "Disasters (worlds with events): fire red, flood blue, storm white, volcano purple" },
];

export const COLOR_MODES: readonly { id: ColorBy; label: string; legendLow: string; legendHigh: string }[] = [
  { id: "diet", label: "Diet", legendLow: "eats plants", legendHigh: "eats meat" },
  { id: "speed", label: "Speed", legendLow: "slow", legendHigh: "fast (2+)" },
  { id: "size", label: "Body size", legendLow: "small", legendHigh: "large (2.5+)" },
  { id: "hue", label: "Color gene", legendLow: "", legendHigh: "(no effect on survival)" },
  { id: "energy", label: "Energy", legendLow: "empty", legendHigh: "ready to reproduce" },
  { id: "sense", label: "Sense range", legendLow: "none", legendHigh: "far (8+)" },
  { id: "health", label: "Health (worlds with disease)", legendLow: "healthy", legendHigh: "red = sick, blue = immune" },
  { id: "colony", label: "Colony size (worlds with bonding)", legendLow: "alone (gray)", legendHigh: "colony of 16" },
  { id: "cell", label: "Cell type (worlds with cell types)", legendLow: "generalist (gray)", legendHigh: "feeder, mover, sun, armor, sensor" },
  { id: "palate", label: "Palate (worlds with several kinds of plant)", legendLow: "first kind of plant", legendHigh: "last kind of plant" },
  { id: "toxicity", label: "Toxicity (worlds with toxicity)", legendLow: "safe to eat", legendHigh: "poisonous" },
  { id: "nutrient", label: "Nutrient store (worlds with nutrient mode)", legendLow: "starved of nutrient", legendHigh: "store full" },
  { id: "water", label: "Water (worlds with drinking)", legendLow: "parched", legendHigh: "just drank" },
];

const PALETTE_SIZE = 48;

/** Cell types: generalist gray, feeder orange, mover blue, photosynthesizer green, armor white, sensor magenta. */
const CELL_COLORS = ["#6b7480", "#ff9f43", "#4cc2ff", "#5fd38d", "#f2f5f7", "#d067ff"];

/** Slow = blue, fast = red/orange. Precomputed so drawing thousands of dots stays cheap. */
const RAINBOW = Array.from({ length: PALETTE_SIZE }, (_, i) => {
  const t = i / (PALETTE_SIZE - 1);
  return `hsl(${Math.round(215 - t * 205)} 85% 60%)`;
});

/** Plant eater = green, mixed diet = yellow, meat eater = red. */
const DIET = Array.from({ length: PALETTE_SIZE }, (_, i) => {
  const t = i / (PALETTE_SIZE - 1);
  return `hsl(${Math.round(125 - t * 125)} 85% 58%)`;
});

/** Empty = dark, full = bright yellow-green. */
const ENERGY = Array.from({ length: PALETTE_SIZE }, (_, i) => {
  const t = i / (PALETTE_SIZE - 1);
  return `hsl(${Math.round(30 + t * 90)} 85% ${Math.round(22 + t * 45)}%)`;
});

/** A full color wheel for the neutral color gene. */
const WHEEL = Array.from({ length: PALETTE_SIZE }, (_, i) => `hsl(${Math.round((i / PALETTE_SIZE) * 360)} 80% 62%)`);

function pick(palette: readonly string[], t: number): string {
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  return palette[Math.round(clamped * (PALETTE_SIZE - 1))]!;
}

/** Color for one organism under the chosen mode. */
export function organismColor(mode: ColorBy, frame: FrameMessage, i: number): string {
  switch (mode) {
    case "diet":
      return pick(DIET, frame.diet[i]!);
    case "speed":
      return pick(RAINBOW, frame.speed[i]! / 2);
    case "size":
      return pick(RAINBOW, (frame.size[i]! - frame.world.ranges.size.min) / 2.2);
    case "hue":
      return pick(WHEEL, frame.hue[i]!);
    case "energy":
      return pick(ENERGY, frame.energyFraction[i]!);
    case "sense":
      return pick(RAINBOW, frame.sense[i]! / 8);
    case "palate":
      return pick(RAINBOW, frame.palate ? frame.palate[i]! : 0.5);
    case "toxicity":
      return pick(RAINBOW, frame.toxicity ? frame.toxicity[i]! : 0);
    case "water":
      return pick(RAINBOW, frame.hydration ? frame.hydration[i]! : 0);
    case "nutrient":
      return pick(RAINBOW, frame.nutrientStore ? frame.nutrientStore[i]! : 0);
    case "cell": {
      const type = frame.cellType ? frame.cellType[i]! : 0;
      return CELL_COLORS[type] ?? "#6b7480";
    }
    case "colony": {
      const size = frame.colonySize ? frame.colonySize[i]! : 1;
      return size < 2 ? "#6b7480" : pick(RAINBOW, Math.min(size, 16) / 16);
    }
    case "health": {
      const state = frame.health ? frame.health[i]! : 0;
      return state === 1 ? "#ff4d4d" : state === 2 ? "#5fa8ff" : "#6bd36b";
    }
  }
}

/** CSS gradient for the legend swatch of a mode. */
export function legendGradient(mode: ColorBy): string {
  const palette = mode === "hue" ? WHEEL : mode === "energy" ? ENERGY : mode === "diet" ? DIET : RAINBOW;
  const stops = [0, 0.25, 0.5, 0.75, 1].map((t) => pick(palette, t));
  return `linear-gradient(90deg, ${stops.join(", ")})`;
}

/** Map colors for each biome: water, plains (grassland), forest (temperate), desert, mountains (highlands), then the climate biomes: tundra, boreal forest, savanna, tropical forest, swamp. */
const BIOME_COLORS: readonly (readonly [number, number, number])[] = [
  [28, 70, 128],
  [96, 140, 70],
  [30, 92, 56],
  [196, 170, 100],
  [128, 128, 134],
  [150, 160, 140],
  [36, 72, 64],
  [170, 160, 70],
  [10, 110, 40],
  [80, 90, 50],
];
const ICE_COLOR = [225, 235, 245] as const;

/** A color for a position (0 to 1) on the color wheel, matching the "Color gene" dot colors (hsl, 80% saturation, 62% lightness). */
function hueToRgb(h: number): [number, number, number] {
  const sat = 0.8;
  const light = 0.62;
  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const hp = (h - Math.floor(h)) * 6;
  const x = chroma * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [chroma, x, 0];
  else if (hp < 2) [r, g, b] = [x, chroma, 0];
  else if (hp < 3) [r, g, b] = [0, chroma, x];
  else if (hp < 4) [r, g, b] = [0, x, chroma];
  else if (hp < 5) [r, g, b] = [x, 0, chroma];
  else [r, g, b] = [chroma, 0, x];
  const m = light - chroma / 2;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** Draws the food grid and the organisms onto a canvas. */
export class WorldRenderer {
  colorBy: ColorBy = "diet";
  overlay: Overlay = "plants";

  private readonly ctx: CanvasRenderingContext2D;
  private readonly foodCanvas = document.createElement("canvas");
  private readonly foodCtx: CanvasRenderingContext2D;
  private foodImage: ImageData | null = null;
  private readonly trailCanvas = document.createElement("canvas");
  private readonly trailCtx: CanvasRenderingContext2D;
  private trailImage: ImageData | null = null;
  /** Most food each cell can hold, so rich and barren land look different even when full. */
  private capacity: Float64Array | null = null;
  private maxCapacity = 1;
  /** The biome of every cell (kept from the first frame after a restart). */
  private terrain: Uint8Array | null = null;
  /** The background color of every cell (kept from the first frame after a restart). */
  private background: Float32Array | null = null;
  /** Which kind of plant grows in each cell (kept from the first frame after a restart). */
  private plantKinds: Float32Array | Uint8Array | null = null;
  /** Each cell's lasting wetness, with climate biomes (kept from the first frame after a restart). */
  private moisture: Float32Array | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    const foodCtx = this.foodCanvas.getContext("2d");
    const trailCtx = this.trailCanvas.getContext("2d");
    if (!ctx || !foodCtx || !trailCtx) throw new Error("This browser cannot draw on a canvas");
    this.ctx = ctx;
    this.foodCtx = foodCtx;
    this.trailCtx = trailCtx;
  }

  /** Match the canvas's pixel size to how big it is on screen (sharp on high-DPI screens). */
  fitToScreen(): void {
    const ratio = window.devicePixelRatio || 1;
    const size = Math.round(this.canvas.clientWidth * ratio);
    if (size > 0 && (this.canvas.width !== size || this.canvas.height !== size)) {
      this.canvas.width = size;
      this.canvas.height = size;
    }
  }

  /**
   * Take in the land's fixed facts (how fertile each cell is, and its biome), which the worker
   * sends only with the first frame after a restart. Called for every frame as it arrives, so
   * it is not lost if the page skips drawing that particular frame.
   */
  setLand(frame: FrameMessage): void {
    if (!frame.capacity) return;
    this.terrain = frame.terrain;
    this.background = frame.background;
    this.plantKinds = frame.plantKindMap;
    this.moisture = frame.moisture;
    this.capacity = frame.capacity;
    this.maxCapacity = Math.max(...frame.capacity, 1);
  }

  draw(frame: FrameMessage): void {
    this.fitToScreen();
    const { ctx, canvas } = this;
    const { world } = frame;

    this.setLand(frame);

    ctx.imageSmoothingEnabled = false;
    if (this.overlay === "trails" && frame.preyScent.length > 0) {
      this.drawTrails(frame);
      ctx.drawImage(this.trailCanvas, 0, 0, canvas.width, canvas.height);
    } else {
      this.drawFood(frame);
      ctx.drawImage(this.foodCanvas, 0, 0, canvas.width, canvas.height);
    }

    const scaleX = canvas.width / world.width;
    const scaleY = canvas.height / world.height;
    // Bonds between cells, as thin lines (skipped where they wrap round the edge of the world).
    if (frame.bonds && frame.bonds.length > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = Math.max(1, scaleX * 0.35);
      ctx.beginPath();
      for (let k = 0; k + 1 < frame.bonds.length; k += 2) {
        const a = frame.bonds[k]!;
        const b = frame.bonds[k + 1]!;
        const ax = frame.x[a]!;
        const ay = frame.y[a]!;
        const bx = frame.x[b]!;
        const by = frame.y[b]!;
        if (Math.abs(ax - bx) > world.width / 2 || Math.abs(ay - by) > world.height / 2) continue;
        ctx.moveTo(ax * scaleX, ay * scaleY);
        ctx.lineTo(bx * scaleX, by * scaleY);
      }
      ctx.stroke();
    }
    for (let i = 0; i < frame.count; i++) {
      // Dot area grows with body size.
      // (never smaller than about a pixel and a half, so organisms stay visible in big worlds)
      const radius = Math.max(scaleX * (0.35 + 0.45 * Math.sqrt(frame.size[i]!)), 1.5);
      ctx.fillStyle = organismColor(this.colorBy, frame, i);
      ctx.beginPath();
      ctx.arc(frame.x[i]! * scaleX, frame.y[i]! * scaleY, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // A ring around the organism being inspected.
    const inspected = frame.inspected;
    if (inspected && inspected.alive) {
      const px = inspected.snapshot.x * scaleX;
      const py = inspected.snapshot.y * scaleY;
      ctx.lineWidth = Math.max(2, scaleX * 0.5);
      ctx.strokeStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(px, py, scaleX * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /** Scent trails on their own finer grid: plant-eater scent in green, meat-eater scent in red. */
  private drawTrails(frame: FrameMessage): void {
    const { scentWidth, scentHeight } = frame.world;
    if (this.trailCanvas.width !== scentWidth || this.trailCanvas.height !== scentHeight) {
      this.trailCanvas.width = scentWidth;
      this.trailCanvas.height = scentHeight;
      this.trailImage = this.trailCtx.createImageData(scentWidth, scentHeight);
    }
    const data = this.trailImage!.data;
    // Shade each trail relative to how much of it there is overall (at least a few
    // passing animals' worth), so a crowded world does not wash out into one color and
    // the few meat-eater trails still stand out.
    let preyTotal = 0;
    let hunterTotal = 0;
    for (let k = 0; k < frame.preyScent.length; k++) {
      preyTotal += frame.preyScent[k]!;
      hunterTotal += frame.hunterScent[k]!;
    }
    const cells = Math.max(frame.preyScent.length, 1);
    const preyFull = Math.max(frame.world.overlayScale.scent, (4 * preyTotal) / cells);
    const hunterFull = Math.max(frame.world.overlayScale.scent, (4 * hunterTotal) / cells);
    for (let k = 0; k < frame.preyScent.length; k++) {
      const prey = Math.min(Math.sqrt(frame.preyScent[k]! / preyFull), 1);
      const hunter = Math.min(Math.sqrt(frame.hunterScent[k]! / hunterFull), 1);
      const o = k * 4;
      data[o] = Math.round(14 + hunter * 220);
      data[o + 1] = Math.round(18 + prey * 150 + hunter * 30);
      data[o + 2] = Math.round(22 + prey * 40);
      data[o + 3] = 255;
    }
    this.trailCtx.putImageData(this.trailImage!, 0, 0);
  }

  private drawFood(frame: FrameMessage): void {
    const { gridWidth, gridHeight, foodCap, overlayScale } = frame.world;
    if (this.foodCanvas.width !== gridWidth || this.foodCanvas.height !== gridHeight) {
      this.foodCanvas.width = gridWidth;
      this.foodCanvas.height = gridHeight;
      this.foodImage = this.foodCtx.createImageData(gridWidth, gridHeight);
    }
    const data = this.foodImage!.data;
    const capacity = this.capacity;
    const overlay = this.overlay;
    let wearMax = 0;
    if (overlay === "erosion" && frame.soilHealth) for (let cell = 0; cell < frame.soilHealth.length; cell++) if (1 - frame.soilHealth[cell]! > wearMax) wearMax = 1 - frame.soilHealth[cell]!;
    let foulMax = 0;
    // (Plant nutrient is shown from the poorest to the richest plants on the map right now, so differences show even when they are small.)
    let qLow = Infinity;
    let qHigh = -Infinity;
    if (overlay === "plantQuality" && frame.plantQuality) {
      for (let cell = 0; cell < frame.plantQuality.length; cell++) {
        if (capacity && !(capacity[cell]! > 0)) continue;
        const q = frame.plantQuality[cell]!;
        if (q < qLow) qLow = q;
        if (q > qHigh) qHigh = q;
      }
    }
    if (overlay === "fouling" && frame.foul) for (let cell = 0; cell < frame.foul.length; cell++) if (frame.foul[cell]! > foulMax) foulMax = frame.foul[cell]!;
    for (let cell = 0; cell < frame.food.length; cell++) {
      // A faint base tint shows how fertile the land underneath is.
      const fertility = capacity ? capacity[cell]! / this.maxCapacity : 1;
      const o = cell * 4;
      let r = 14 + fertility * 10;
      let g = 18 + fertility * 22;
      let b = 22 + fertility * 6;
      const biome = this.terrain ? this.terrain[cell]! : -1;
      if (overlay === "background" && this.background) {
        // Round the color wheel, in the same hues the dots use for the color gene.
        const h = this.background[cell]!;
        const [hr, hg, hb] = hueToRgb(h);
        data[o] = hr;
        data[o + 1] = hg;
        data[o + 2] = hb;
        data[o + 3] = 255;
        continue;
      }
      if (overlay === "plantKinds" && this.plantKinds) {
        // Each kind has its own hue (on the same scale as the palate dots); brighter where more plant is standing.
        const kinds = frame.world.plantKinds;
        const [kr, kg, kb] = hueToRgb(kinds > 1 ? (this.plantKinds[cell]! / (kinds - 1)) * 0.75 : 0.3);
        const cover = 0.25 + 0.75 * Math.min(frame.food[cell]! / Math.max(this.maxCapacity, foodCap), 1);
        data[o] = Math.round(kr * cover);
        data[o + 1] = Math.round(kg * cover);
        data[o + 2] = Math.round(kb * cover);
        data[o + 3] = 255;
        continue;
      }
      if (frame.climate && (overlay === "temperature" || overlay === "light")) {
        if (overlay === "temperature") {
          // Cold = blue, mild = green-yellow, hot = red (on a scale from 0 to 1).
          const t = Math.max(0, Math.min(1, frame.climate.temperature[cell]! / 1.0));
          data[o] = Math.round(30 + 225 * Math.max(0, (t - 0.4) / 0.6));
          data[o + 1] = Math.round(60 + 150 * (1 - Math.abs(t - 0.5) * 2));
          data[o + 2] = Math.round(70 + 180 * Math.max(0, (0.6 - t) / 0.6));
        } else {
          const g = Math.max(0, Math.min(1, frame.climate.growth[cell]!));
          data[o] = Math.round(20 + 200 * g);
          data[o + 1] = Math.round(24 + 190 * g);
          data[o + 2] = Math.round(30 + 40 * g);
        }
        data[o + 3] = 255;
        continue;
      }
      if (overlay === "terrain" && biome >= 0) {
        const [br, bg, bb] = frame.ice && frame.ice[cell] === 1 ? ICE_COLOR : BIOME_COLORS[biome]!;
        // A little of the plant cover shows through so you can still see where food is.
        const cover = biome === 0 ? 0 : Math.min(frame.food[cell]! / Math.max(this.maxCapacity, foodCap), 1) * 0.35;
        data[o] = Math.round(br * (1 - cover) + 40 * cover);
        data[o + 1] = Math.round(bg * (1 - cover) + 200 * cover);
        data[o + 2] = Math.round(bb * (1 - cover) + 80 * cover);
        data[o + 3] = 255;
        continue;
      }
      if (biome === 0) {
        // Water is always drawn as water, whatever the overlay.
        data[o] = BIOME_COLORS[0]![0];
        data[o + 1] = BIOME_COLORS[0]![1];
        data[o + 2] = BIOME_COLORS[0]![2];
        data[o + 3] = 255;
        continue;
      }
      if (overlay === "plants") {
        const amount = Math.min(frame.food[cell]! / Math.max(this.maxCapacity, foodCap), 1);
        g += amount * 100;
        b += amount * 24;
      } else if (overlay === "nutrients") {
        const amount = Math.min(frame.nutrient[cell]! / overlayScale.nutrient, 1);
        r += amount * 120;
        g += amount * 70;
        b += amount * 10;
      } else if (overlay === "corpses") {
        const amount = Math.min(Math.sqrt(frame.corpse[cell]! / overlayScale.corpse), 1);
        r += amount * 200;
        g += amount * 20;
      } else if (overlay === "grazing") {
        // Healthy ground stays dark; damaged ground turns orange (brighter = slower to regrow).
        const damage = frame.grazing ? frame.grazing[cell]! : 0;
        r += damage * 190;
        g += damage * 90;
      } else if (overlay === "moisture") {
        // Dry ground is pale sand, wet ground deep blue-green (from each cell's lasting wetness).
        const m = this.moisture ? this.moisture[cell]! : 0;
        r += 150 - 120 * m;
        g += 120 - 20 * m;
        b += 60 + 110 * m;
      } else if (overlay === "plantQuality") {
        // How much nutrient the plants on each piece of land hold (however many there are): poor is dark brown, rich bright yellow-green.
        const q = frame.plantQuality && qHigh > qLow ? (frame.plantQuality[cell]! - qLow) / (qHigh - qLow) : 0;
        const land = !capacity || capacity[cell]! > 0 ? 1 : 0;
        r += land * (60 + 110 * q);
        g += land * (30 + 200 * q);
        b += land * 15;
      } else if (overlay === "events") {
        // Quiet ground stays dark. Fire is red-orange, flood blue, storm pale grey, volcanic ground purple.
        const what = frame.eventMap ? frame.eventMap[cell]! : 0;
        if (what === 1) {
          r += 230;
          g += 90;
        } else if (what === 2) {
          g += 80;
          b += 200;
        } else if (what === 3) {
          r += 150;
          g += 150;
          b += 160;
        } else if (what === 4) {
          r += 110;
          b += 130;
        }
      } else if (overlay === "erosion") {
        // Healthy soil stays dark; worn-away soil turns brown. Brightness is relative to the most worn cell right now.
        const wear = frame.soilHealth && wearMax > 0 ? Math.min((1 - frame.soilHealth[cell]!) / wearMax, 1) : 0;
        r += wear * 170;
        g += wear * 105;
        b += wear * 40;
      } else if (overlay === "fouling") {
        // Clean ground stays dark; fouled ground turns a murky purple. Brightness is relative to the most fouled cell in the world right now (square-rooted so the milder patches show too).
        const amount = frame.foul && foulMax > 0 ? Math.sqrt(Math.min(frame.foul[cell]! / foulMax, 1)) : 0;
        r += amount * 150;
        g += amount * 40;
        b += amount * 150;
      } else {
        const amount = Math.min(frame.detritus[cell]! / overlayScale.detritus, 1);
        r += amount * 90;
        g += amount * 60;
        b += amount * 110;
      }
      data[o] = Math.round(r);
      data[o + 1] = Math.round(g);
      data[o + 2] = Math.round(b);
      data[o + 3] = 255;
    }
    this.foodCtx.putImageData(this.foodImage!, 0, 0);
  }
}
