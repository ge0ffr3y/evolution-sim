import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guardrails that enforce the rules in CLAUDE.md automatically,
 * so a mistake shows up as a failing test instead of a hidden bug.
 */

const root = join(import.meta.dirname, "..");
const simCoreSrc = join(root, "packages", "sim-core", "src");

function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) files.push(...sourceFiles(full));
    else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) files.push(full);
  }
  return files;
}

/** Strip comments so rules can be mentioned in documentation without tripping the check. */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const forbidden: { pattern: RegExp; why: string }[] = [
  { pattern: /Math\.random\s*\(/, why: "use the seeded Rng, never Math.random()" },
  { pattern: /Date\.now\s*\(/, why: "simulation time is ticks, never Date.now()" },
  { pattern: /new\s+Date\s*\(/, why: "simulation time is ticks, never Date" },
  { pattern: /performance\.now\s*\(/, why: "simulation time is ticks, never performance.now()" },
  { pattern: /\bcrypto\.getRandomValues\b/, why: "use the seeded Rng for all randomness" },
  {
    // Browsers may round these differently in the last digit, which would make
    // the same seed play out differently in Chrome vs Safari vs Firefox.
    // Exact operations (+ - * / sqrt floor fround min max abs) are safe.
    pattern: /Math\.(sin|cos|tan|asin|acos|atan2?|exp|expm1|log|log1p|log2|log10|pow|sinh|cosh|tanh|asinh|acosh|atanh|cbrt|hypot)\s*\(/,
    why: "this Math function is not bit-identical across browsers; use exact arithmetic",
  },
  { pattern: /\*\*/, why: "the ** operator is not bit-identical across browsers; multiply explicitly" },
  { pattern: /\b(window|document|navigator|localStorage|sessionStorage)\b/, why: "sim-core must not use browser APIs" },
  { pattern: /\b(HTMLElement|HTMLCanvasElement|CanvasRenderingContext2D|requestAnimationFrame)\b/, why: "sim-core must not use browser APIs" },
  { pattern: /from\s+["']node:/, why: "sim-core must stay runtime-neutral (no Node-only imports)" },
];

describe("sim-core guardrails", () => {
  const files = sourceFiles(simCoreSrc);

  it("finds sim-core source files to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const { pattern, why } of forbidden) {
    it(`contains no ${pattern.source} (${why})`, () => {
      const offenders = files.filter((file) =>
        pattern.test(stripComments(readFileSync(file, "utf8"))),
      );
      expect(offenders.map((f) => relative(root, f))).toEqual([]);
    });
  }
});
