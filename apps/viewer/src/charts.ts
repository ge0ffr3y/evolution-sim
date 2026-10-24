import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import type { HistoryPoint } from "./protocol";

const AXIS_COLOR = "#8b98a5";
const GRID_COLOR = "#222b34";
/** Keep at most this many points per chart; older detail is thinned out. */
const MAX_POINTS = 20_000;
const CHART_HEIGHT = 190;

function baseAxis(extra: Partial<uPlot.Axis> = {}): uPlot.Axis {
  return {
    stroke: AXIS_COLOR,
    grid: { stroke: GRID_COLOR, width: 1 },
    ticks: { stroke: GRID_COLOR, width: 1 },
    ...extra,
  };
}

/** Axis range for the food line: 0 up to a little above its 95th-percentile value. */
function foodRange(values: ArrayLike<number | null | undefined> | undefined, dataMax: number | null): [number, number] {
  const fallback = Math.max(dataMax ?? 1, 1);
  if (!values || values.length < 40) return [0, fallback];
  const sorted = Array.from(values as ArrayLike<number>).sort((a, b) => a - b);
  const high = sorted[Math.floor(sorted.length * 0.95)] ?? fallback;
  return [0, Math.max(high * 1.3, 1)];
}

/** The two live charts under the world view, fed one sample at a time. */
export class Charts {
  private readonly ticks: number[] = [];
  private readonly population: number[] = [];
  private readonly food: number[] = [];
  private readonly speed: number[] = [];
  private readonly size: number[] = [];
  private readonly metabolism: number[] = [];
  private readonly sense: number[] = [];
  private readonly herbivores: number[] = [];
  private readonly omnivores: number[] = [];
  private readonly carnivores: number[] = [];
  private readonly connHerb: number[] = [];
  private readonly connCarn: number[] = [];
  private readonly hiddenHerb: number[] = [];
  private readonly hiddenCarn: number[] = [];
  private stride = 1;
  private seen = 0;

  private readonly popChart: uPlot;
  private readonly traitChart: uPlot;
  private readonly webChart: uPlot;
  private readonly brainChart: uPlot;
  /** Each chart with the box it fills, so it can be fitted to that box when the window changes size. */
  private readonly fitted: [uPlot, HTMLElement][];

  constructor(popContainer: HTMLElement, traitContainer: HTMLElement, webContainer: HTMLElement, brainContainer: HTMLElement) {
    const width = (el: HTMLElement): number => Math.max(el.clientWidth, 280);

    this.popChart = new uPlot(
      {
        width: width(popContainer),
        height: CHART_HEIGHT,
        legend: { live: true },
        cursor: { drag: { x: false, y: false } },
        scales: {
          x: { time: false },
          // The starting pile of food is eaten within ~100 ticks and would flatten the
          // rest of the line, so size this axis to the typical value and let the spike clip.
          food: { range: (u, dataMin, dataMax) => foodRange(u.data[2], dataMax) },
        },
        axes: [
          baseAxis({ label: "tick" }),
          baseAxis({ label: "population", scale: "y" }),
          baseAxis({ label: "total food", scale: "food", side: 1, grid: { show: false } }),
        ],
        series: [
          { label: "tick" },
          { label: "population", stroke: "#4cc2ff", width: 2, scale: "y" },
          { label: "total food", stroke: "#7bd88f", width: 2, scale: "food" },
        ],
      },
      [[], [], []],
      popContainer,
    );

    this.traitChart = new uPlot(
      {
        width: width(traitContainer),
        height: CHART_HEIGHT,
        legend: { live: true },
        cursor: { drag: { x: false, y: false } },
        scales: { x: { time: false }, sense: { auto: true } },
        axes: [
          baseAxis({ label: "tick" }),
          baseAxis({ label: "speed, size, metabolism", scale: "y" }),
          baseAxis({ label: "sense range", scale: "sense", side: 1, grid: { show: false } }),
        ],
        series: [
          { label: "tick" },
          { label: "mean speed", stroke: "#ffb454", width: 2, scale: "y" },
          { label: "mean size", stroke: "#c792ea", width: 2, scale: "y" },
          { label: "mean metabolism", stroke: "#ff7a90", width: 2, scale: "y" },
          { label: "mean sense range", stroke: "#4cc2ff", width: 2, scale: "sense", dash: [6, 4] },
        ],
      },
      [[], [], [], [], []],
      traitContainer,
    );

    this.webChart = new uPlot(
      {
        width: width(webContainer),
        height: CHART_HEIGHT,
        legend: { live: true },
        cursor: { drag: { x: false, y: false } },
        scales: { x: { time: false } },
        axes: [baseAxis({ label: "tick" }), baseAxis({ label: "organisms" })],
        series: [
          { label: "tick" },
          { label: "plant eaters", stroke: "#7bd88f", width: 2 },
          { label: "mixed diet", stroke: "#ffd166", width: 2 },
          { label: "meat eaters", stroke: "#ff5d73", width: 2 },
        ],
      },
      [[], [], [], []],
      webContainer,
    );

    this.brainChart = new uPlot(
      {
        width: width(brainContainer),
        height: CHART_HEIGHT,
        legend: { live: true },
        cursor: { drag: { x: false, y: false } },
        scales: { x: { time: false }, hidden: { auto: true } },
        axes: [
          baseAxis({ label: "tick" }),
          baseAxis({ label: "working connections", scale: "y" }),
          baseAxis({ label: "thinking units", scale: "hidden", side: 1, grid: { show: false } }),
        ],
        series: [
          { label: "tick" },
          { label: "plant eaters: connections", stroke: "#7bd88f", width: 2, scale: "y" },
          { label: "meat eaters: connections", stroke: "#ff5d73", width: 2, scale: "y" },
          // Blue and orange (not the green and red of the connection lines) so the four lines can be told apart.
          { label: "plant eaters: thinking units", stroke: "#5aa9ff", width: 1.5, dash: [5, 4], scale: "hidden" },
          { label: "meat eaters: thinking units", stroke: "#ffa94d", width: 1.5, dash: [5, 4], scale: "hidden" },
        ],
      },
      [[], [], [], [], []],
      brainContainer,
    );

    // Watch every chart's own box, not just the first one. The brain chart starts out hidden (zero width),
    // so it must be re-measured the moment it is shown, or it stays squeezed at its minimum width.
    this.fitted = [
      [this.popChart, popContainer],
      [this.traitChart, traitContainer],
      [this.webChart, webContainer],
      [this.brainChart, brainContainer],
    ];
    const observer = new ResizeObserver(() => this.fit());
    for (const container of [popContainer, traitContainer, webContainer, brainContainer]) observer.observe(container);
  }

  /**
   * Fit each chart to its box. Also checked at every redraw, because a size watcher alone was not always told when the
   * window narrowed, and a chart left at its old width pushes the page wider than the window.
   */
  private fit(): void {
    for (const [chart, container] of this.fitted) {
      const width = Math.max(container.clientWidth, 280);
      if (chart.width !== width) chart.setSize({ width, height: CHART_HEIGHT });
    }
  }

  /** Start over (the simulation restarted). */
  clear(): void {
    this.ticks.length = 0;
    this.population.length = 0;
    this.food.length = 0;
    this.speed.length = 0;
    this.size.length = 0;
    this.metabolism.length = 0;
    this.sense.length = 0;
    this.herbivores.length = 0;
    this.omnivores.length = 0;
    this.carnivores.length = 0;
    this.connHerb.length = 0;
    this.connCarn.length = 0;
    this.hiddenHerb.length = 0;
    this.hiddenCarn.length = 0;
    this.stride = 1;
    this.seen = 0;
    this.redraw();
  }

  add(points: readonly HistoryPoint[]): void {
    for (const p of points) {
      // Only keep every `stride`-th sample so very long runs stay light.
      if (this.seen++ % this.stride !== 0) continue;
      this.ticks.push(p.tick);
      this.population.push(p.population);
      this.food.push(p.totalFood);
      this.speed.push(p.meanSpeed);
      this.size.push(p.meanSize);
      this.metabolism.push(p.meanMetabolism);
      this.sense.push(p.meanSense);
      this.herbivores.push(p.herbivores);
      this.omnivores.push(p.omnivores);
      this.carnivores.push(p.carnivores);
      this.connHerb.push(p.connectionsHerbivores);
      this.connCarn.push(p.connectionsCarnivores);
      this.hiddenHerb.push(p.hiddenHerbivores);
      this.hiddenCarn.push(p.hiddenCarnivores);
      if (this.ticks.length > MAX_POINTS) this.thin();
    }
  }

  private thin(): void {
    for (const series of [this.ticks, this.population, this.food, this.speed, this.size, this.metabolism, this.sense, this.herbivores, this.omnivores, this.carnivores, this.connHerb, this.connCarn, this.hiddenHerb, this.hiddenCarn]) {
      let write = 0;
      for (let read = 0; read < series.length; read += 2) series[write++] = series[read]!;
      series.length = write;
    }
    this.stride *= 2;
  }

  redraw(): void {
    this.fit();
    this.popChart.setData([this.ticks, this.population, this.food]);
    this.traitChart.setData([this.ticks, this.speed, this.size, this.metabolism, this.sense]);
    this.webChart.setData([this.ticks, this.herbivores, this.omnivores, this.carnivores]);
    this.brainChart.setData([this.ticks, this.connHerb, this.connCarn, this.hiddenHerb, this.hiddenCarn]);
  }
}
