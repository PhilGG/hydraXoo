import { defineConfig } from "vitest/config";

// Builds one self-contained ES module served by the integration.
export default defineConfig({
  build: {
    lib: {
      entry: "src/hydraxoo-card.ts",
      formats: ["es"],
      fileName: () => "hydraxoo-card.js",
    },
    outDir: "../custom_components/hydraxoo/frontend",
    emptyOutDir: false,
    target: "es2022",
    minify: true,
    sourcemap: false,
  },
  test: {
    environment: "happy-dom",
    globals: true,
  },
});
