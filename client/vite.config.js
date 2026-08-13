import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(path.dirname(fileURLToPath(import.meta.url)), "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (
            id.includes("/three/") ||
            id.includes("@react-three") ||
            id.includes("postprocessing")
          ) {
            return "vendor-3d";
          }
          if (id.includes("recharts") || id.includes("/d3-")) {
            return "vendor-charts";
          }
          if (
            id.includes("/react/") ||
            id.includes("react-dom") ||
            id.includes("react-router")
          ) {
            return "vendor-react";
          }
          return undefined;
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
    maxWorkers: 1,
    minWorkers: 1,
    testTimeout: 10_000,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
