import { HIDDEN_START, INPUT_COUNT, OUTPUT_LABELS, OUTPUT_START, inputLabel, type BrainSnapshot } from "@evo/sim-core";

const HEIGHT = 330;

/** A shorter label for the narrow diagram: "see far right smaller: near" becomes "far R: small near". */
function shortLabel(index: number): string {
  const label = inputLabel(index);
  if (!label.startsWith("see ")) return label;
  return label
    .slice(4)
    .replace("far right", "far R")
    .replace("far left", "far L")
    .replace("right", "R")
    .replace("left", "L")
    .replace("smaller:", "small")
    .replace("bigger:", "big")
    .replace(/^(\S+(?: \S)?) (small|big)/, "$1: $2");
}
const POSITIVE = "76, 194, 255"; // blue: pushes the output up
const NEGATIVE = "255, 93, 115"; // red: pushes the output down

/** A node's fill: dark when quiet, bright blue when strongly positive, bright red when strongly negative. */
function activationColor(value: number | null): string {
  if (value === null) return "#26313b";
  const strength = Math.min(Math.abs(value), 1);
  return `hsl(${value >= 0 ? 200 : 350} 80% ${14 + strength * 50}%)`;
}

/**
 * Draws a brain as three columns: what it senses (left), its hidden thinking units
 * (middle), and what it does (right). Lines are connections: blue pushes up, red pushes
 * down, thicker means stronger. Node brightness shows what the organism is thinking right now.
 */
/**
 * height: drawing height in pixels (a smaller panel can use a shorter one).
 * compact: show only the inputs the brain is wired to, spaced out, in larger text (for small panels, where all
 * 82 inputs would not be readable).
 */
export function drawBrain(canvas: HTMLCanvasElement, brain: BrainSnapshot, height = HEIGHT, compact = false): void {
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(canvas.clientWidth, 260);
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.height = `${height}px`;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const activity = brain.activity;
  ctx.font = compact ? "11px system-ui, sans-serif" : "9px system-ui, sans-serif";

  // Outputs: the three movement outputs always, the memory outputs only when the brain is wired to them (they
  // exist only in working-memory worlds). Spaced evenly, with room on the right for the longest label.
  const wiredTargets = new Set(brain.links.map((l) => l.to));
  const shownOutputs = OUTPUT_LABELS.map((_, o) => o).filter((o) => o < 3 || wiredTargets.has(OUTPUT_START + o));
  const outputRow = new Map(shownOutputs.map((o, k) => [o, k]));
  const longestLabel = Math.max(...shownOutputs.map((o) => ctx.measureText(OUTPUT_LABELS[o]!).width));
  // Each output's current value goes under its label, or beside it when the rows are too close for two lines.
  const valueBeside = height / (shownOutputs.length + 1) < (compact ? 28 : 22);
  const valueWidth = valueBeside ? ctx.measureText("-0.00").width + 6 : 0;
  const inputX = Math.min(112, width * 0.4);
  const outputX = width - Math.max(64, Math.ceil(longestLabel + valueWidth) + 18);
  const hiddenX = (inputX + outputX) / 2;

  // Positions of every node that is drawn.
  const wiredInputs = [...new Set(brain.links.map((l) => l.from).filter((n) => n < INPUT_COUNT))].sort((a, b) => a - b);
  const shownInputs = compact ? wiredInputs : Array.from({ length: INPUT_COUNT }, (_, i) => i);
  const inputRow = new Map(shownInputs.map((node, k) => [node, k]));
  const inputY = (i: number): number => (shownInputs.length <= 1 ? height / 2 : 12 + ((inputRow.get(i) ?? 0) * (height - 24)) / (shownInputs.length - 1));
  // With three outputs this is the old layout (a quarter, half and three quarters of the way down).
  const outputY = (o: number): number => (height * ((outputRow.get(o) ?? 0) + 1)) / (shownOutputs.length + 1);
  const usedHidden = [...new Set(brain.links.flatMap((l) => [l.from, l.to]).filter((n) => n >= HIDDEN_START && n < OUTPUT_START))].sort((a, b) => a - b);
  const hiddenY = (node: number): number => {
    const k = usedHidden.indexOf(node);
    return 20 + ((k + 0.5) * (height - 40)) / Math.max(usedHidden.length, 1);
  };
  const position = (node: number): [number, number] => {
    if (node < INPUT_COUNT) return [inputX, inputY(node)];
    if (node < OUTPUT_START) return [hiddenX, hiddenY(node)];
    return [outputX, outputY(node - OUTPUT_START)];
  };

  // Connections first, so nodes sit on top.
  for (const link of brain.links) {
    const [x1, y1] = position(link.from);
    const [x2, y2] = position(link.to);
    const strength = Math.min(Math.abs(link.weight), 3);
    ctx.strokeStyle = `rgba(${link.weight >= 0 ? POSITIVE : NEGATIVE}, ${0.3 + 0.12 * strength})`;
    ctx.lineWidth = 0.6 + strength * 0.9;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  ctx.textBaseline = "middle";

  // Inputs, with labels (brighter when something is being sensed).
  const connectedInputs = new Set(brain.links.map((l) => l.from));
  for (const i of shownInputs) {
    const value = activity ? activity.inputs[i]! : null;
    const [x, y] = position(i);
    ctx.fillStyle = activationColor(value);
    ctx.strokeStyle = connectedInputs.has(i) ? "#8b98a5" : "#3a4652";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "right";
    const active = value !== null && Math.abs(value) > 0.15;
    ctx.fillStyle = active ? "#e6edf3" : connectedInputs.has(i) ? "#8b98a5" : "#566370";
    ctx.fillText(shortLabel(i), x - 8, y);
  }

  // Hidden units.
  ctx.textAlign = "center";
  for (const node of usedHidden) {
    const [x, y] = position(node);
    const value = activity ? activity.hidden[node - HIDDEN_START]! : null;
    ctx.fillStyle = activationColor(value);
    ctx.strokeStyle = "#8b98a5";
    ctx.beginPath();
    ctx.arc(x, y, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  if (usedHidden.length > 0) {
    ctx.fillStyle = "#566370";
    ctx.fillText("thinking units", hiddenX, 8);
  }

  // Outputs.
  for (const o of shownOutputs) {
    const [x, y] = position(OUTPUT_START + o);
    const value = activity ? activity.outputs[o]! : null;
    ctx.fillStyle = activationColor(value);
    ctx.strokeStyle = "#e6edf3";
    ctx.beginPath();
    ctx.arc(x, y, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillStyle = "#e6edf3";
    ctx.fillText(OUTPUT_LABELS[o]!, x + 11, valueBeside ? y : y - 5);
    ctx.fillStyle = "#8b98a5";
    const valueText = value === null ? "" : value.toFixed(2);
    if (valueBeside) ctx.fillText(valueText, x + 11 + ctx.measureText(OUTPUT_LABELS[o]!).width + 6, y);
    else ctx.fillText(valueText, x + 11, y + 6);
  }
}
