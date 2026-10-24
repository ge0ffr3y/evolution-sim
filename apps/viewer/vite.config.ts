import { resolve } from "node:path";
import { defineConfig } from "vite";

// On GitHub Pages the site lives under /<repo-name>/, so the deploy workflow
// sets VITE_BASE. Locally it defaults to "/". Four pages: the front page (index.html), the world viewer
// (app.html), the experiment results (analysis.html) and the reading page for findings and devlog (read.html).
export default defineConfig({
  base: process.env["VITE_BASE"] ?? "/",
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, "index.html"),
        app: resolve(import.meta.dirname, "app.html"),
        analysis: resolve(import.meta.dirname, "analysis.html"),
        read: resolve(import.meta.dirname, "read.html"),
      },
    },
  },
});
