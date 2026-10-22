import { resolve } from "node:path";
import { defineConfig } from "vite";

// On GitHub Pages the site lives under /<repo-name>/, so the deploy workflow
// sets VITE_BASE. Locally it defaults to "/". Two pages: the world viewer and the
// experiment results (analysis.html).
export default defineConfig({
  base: process.env["VITE_BASE"] ?? "/",
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        analysis: resolve(import.meta.dirname, "analysis.html"),
      },
    },
  },
});
