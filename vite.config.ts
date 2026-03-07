import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/jspdf")) return "vendor-export";
          if (id.includes("node_modules/jszip")) return "vendor-gsk";
          if (id.includes("/src/core/gschema/")) return "gsk-core";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  }
});
