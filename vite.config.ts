import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: "popup.html",
        options: "options.html",
        stats: "stats.html",
        "service-worker": "src/background/service-worker.ts"
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === "service-worker" ? "service-worker.js" : "assets/[name]-[hash].js"
      }
    }
  },
  test: {
    environment: "node",
    globals: true
  }
});
