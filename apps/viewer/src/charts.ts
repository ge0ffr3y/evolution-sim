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
  private stride = 1;
  private seen = 0;

  private readonly popChart: uPlot;
  private readonly traitChart: uPlot;

  constructor(popContainer: HTMLElement, traitContainer: HTMLElement) {
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
        scales: { x: { time: false } },
        axes: [baseAxis({ label: "tick" }), baseAxis({ label: "average trait value" })],
        series: [
          { label: "tick" },
          { label: "mean speed", stroke: "#ffb454", width: 2 },
          { label: "mean size", stroke: "#c792ea", width: 2 },
        ],
      },
      [[], [], []],
      traitContainer,
    );

    const observer = new ResizeObserver(() => this.resize(popContainer, traitContainer));
    observer.observe(popContainer);
  }

  private resize(popContainer: HTMLElement, traitContainer: HTMLElement): void {
    const w = Math.max(popContainer.clientWidth, 280);
    this.popChart.setSize({ width: w, height: CHART_HEIGHT });
    this.traitChart.setSize({ width: Math.max(traitContainer.clientWidth, 280), height: CHART_HEIGHT });
  }

  /** Start over (the simulation restarted). */
  clear(): void {
    this.ticks.length = 0;
    this.population.length = 0;
    this.food.length = 0;
    this.speed.length = 0;
    this.size.length = 0;
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
      if (this.ticks.length > MAX_POINTS) this.thin();
    }
  }

  private thin(): void {
    for (const series of [this.ticks, this.population, this.food, this.speed, this.size]) {
      let write = 0;
      for (let read = 0; read < series.length; read += 2) series[write++] = series[read]!;
      series.length = write;
    }
    this.stride *= 2;
  }

  redraw(): void {
    this.popChart.setData([this.ticks, this.population, this.food]);
    this.traitChart.setData([this.ticks, this.speed, this.size]);
  }
}
