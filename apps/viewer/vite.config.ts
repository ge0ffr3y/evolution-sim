import { defineConfig } from "vite";

// On GitHub Pages the site lives under /<repo-name>/, so the deploy workflow
// sets VITE_BASE. Locally it defaults to "/".
export default defineConfig({
  base: process.env["VITE_BASE"] ?? "/",
});
