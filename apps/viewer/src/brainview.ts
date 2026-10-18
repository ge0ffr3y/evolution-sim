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
export function drawBrain(canvas: HTMLCanvasElement, brain: BrainSnapshot): void {
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(canvas.clientWidth, 260);
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(HEIGHT * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(HEIGHT * ratio);
    canvas.style.height = `${HEIGHT}px`;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, HEIGHT);

  const activity = brain.activity;
  const inputX = Math.min(112, width * 0.4);
  const outputX = width - 64;
  const hiddenX = (inputX + outputX) / 2;

  // Positions of every node that is drawn.
  const inputY = (i: number): number => 12 + (i * (HEIGHT - 24)) / (INPUT_COUNT - 1);
  const outputY = (o: number): number => HEIGHT * (0.25 + 0.25 * o);
  const usedHidden = [...new Set(brain.links.flatMap((l) => [l.from, l.to]).filter((n) => n >= HIDDEN_START && n < OUTPUT_START))].sort((a, b) => a - b);
  const hiddenY = (node: number): number => {
    const k = usedHidden.indexOf(node);
    return 20 + ((k + 0.5) * (HEIGHT - 40)) / Math.max(usedHidden.length, 1);
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

  ctx.font = "9px system-ui, sans-serif";
  ctx.textBaseline = "middle";

  // Inputs, with labels (brighter when something is being sensed).
  const connectedInputs = new Set(brain.links.map((l) => l.from));
  for (let i = 0; i < INPUT_COUNT; i++) {
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
  for (let o = 0; o < OUTPUT_LABELS.length; o++) {
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
    ctx.fillText(OUTPUT_LABELS[o]!, x + 11, y - 5);
    ctx.fillStyle = "#8b98a5";
    ctx.fillText(value === null ? "" : value.toFixed(2), x + 11, y + 6);
  }
}
