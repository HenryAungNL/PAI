import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The dev server proxies /api, /media and /health to the Django backend so the
// browser talks to a single origin (which keeps cookie auth simple).
const backendTarget = process.env.VITE_PROXY_TARGET || "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": { target: backendTarget, changeOrigin: true },
      "/media": { target: backendTarget, changeOrigin: true },
      "/health": { target: backendTarget, changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
});
