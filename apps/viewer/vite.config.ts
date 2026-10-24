import { resolve } from "node:path";
import { defineConfig } from "vite";

// On GitHub Pages the site lives under /<repo-name>/, so the deploy workflow
// sets VITE_BASE. Locally it defaults to "/". Three pages: the front page (index.html), the world viewer
// (app.html) and the experiment results (analysis.html).
export default defineConfig({
  base: process.env["VITE_BASE"] ?? "/",
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, "index.html"),
        app: resolve(import.meta.dirname, "app.html"),
        analysis: resolve(import.meta.dirname, "analysis.html"),
      },
    },
  },
});
