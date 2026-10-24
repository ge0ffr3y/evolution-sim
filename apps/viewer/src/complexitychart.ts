import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import type { HistoryPoint } from "./protocol";

const AXIS_COLOR = "#8b98a5";
const GRID_COLOR = "#222b34";
const MAX_POINTS = 20_000;
const HEIGHT = 190;

function axis(extra: Partial<uPlot.Axis> = {}): uPlot.Axis {
  return { stroke: AXIS_COLOR, grid: { stroke: GRID_COLOR, width: 1 }, ticks: { stroke: GRID_COLOR, width: 1 }, ...extra };
}

/**
 * How complex the colonies are, over time: the share of organisms that live in a colony, and (right axis) the
 * average colony's size, number of different cell types and symmetry.
 */
export class ComplexityChart {
  private readonly ticks: number[] = [];
  private readonly share: number[] = [];
  private readonly size: number[] = [];
  private readonly types: number[] = [];
  private readonly symmetry: number[] = [];
  private stride = 1;
  private seen = 0;
  private readonly chart: uPlot;

  constructor(private readonly container: HTMLElement, private readonly height = HEIGHT) {
    this.chart = new uPlot(
      {
        width: Math.max(container.clientWidth, 280),
        height: this.height,
        legend: { live: true },
        cursor: { drag: { x: false, y: false } },
        scales: { x: { time: false }, share: { range: [0, 1] }, count: { auto: true } },
        axes: [
          axis({ label: "tick" }),
          axis({ label: "share in colonies / symmetry", scale: "share" }),
          axis({ label: "cells, cell types", scale: "count", side: 1, grid: { show: false } }),
        ],
        series: [
          { label: "tick" },
          { label: "share of organisms in colonies", stroke: "#ffffff", width: 2, scale: "share" },
          { label: "symmetry", stroke: "#d067ff", width: 1.5, scale: "share" },
          { label: "mean colony size", stroke: "#4cc2ff", width: 2, scale: "count" },
          { label: "mean cell types per colony", stroke: "#ff9f43", width: 2, scale: "count" },
        ],
      },
      [[], [], [], [], []],
      container,
    );
    new ResizeObserver(() => this.fit()).observe(container);
  }

  /** Fit the chart to its box (also checked at every redraw: see Charts.fit). */
  private fit(): void {
    const width = Math.max(this.container.clientWidth, 280);
    if (this.chart.width !== width) this.chart.setSize({ width, height: this.height });
  }

  add(points: readonly HistoryPoint[]): void {
    for (const p of points) {
      if (this.seen++ % this.stride !== 0) continue;
      this.ticks.push(p.tick);
      this.share.push(p.colonyShare);
      this.symmetry.push(p.colonySymmetry);
      this.size.push(p.colonyMeanSize);
      this.types.push(p.colonyMeanTypes);
      if (this.ticks.length > MAX_POINTS) this.thin();
    }
  }

  private thin(): void {
    for (const series of [this.ticks, this.share, this.symmetry, this.size, this.types]) {
      let write = 0;
      for (let read = 0; read < series.length; read += 2) series[write++] = series[read]!;
      series.length = write;
    }
    this.stride *= 2;
  }

  clear(): void {
    for (const series of [this.ticks, this.share, this.symmetry, this.size, this.types]) series.length = 0;
    this.stride = 1;
    this.seen = 0;
    this.redraw();
  }

  redraw(): void {
    this.fit();
    this.chart.setData([this.ticks, this.share, this.symmetry, this.size, this.types]);
  }
}
