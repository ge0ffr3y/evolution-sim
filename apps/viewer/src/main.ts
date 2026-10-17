import { Rng } from "@evo/sim-core";

// Phase 0 placeholder: proves the viewer can import and run the simulation package.
const rng = new Rng(42);
const samples = Array.from({ length: 3 }, () => rng.next().toFixed(4)).join(", ");

const app = document.getElementById("app");
if (app) {
  app.innerHTML = `
    <style>
      body { margin: 0; font-family: system-ui, sans-serif; background: #0f1419; color: #e6edf3; }
      main { min-height: 100vh; display: grid; place-content: center; text-align: center; gap: 0.5rem; }
      h1 { margin: 0; font-weight: 600; letter-spacing: 0.02em; }
      p { margin: 0; color: #8b98a5; }
    </style>
    <h1>Evolution Sim</h1>
    <p>Phase 0: foundations are in place.</p>
    <p>Seed 42 starts with ${samples}</p>
  `;
}
