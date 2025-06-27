import { defineConfig } from "vite";
import path from "path";
import { constWrapTsx } from "./const-wrap-tsx";

export default defineConfig({
  appType: "spa",
  base: "/",
  root: "../frontend", // Point to frontend directory
  plugins: [constWrapTsx()],
  // Configure JSX transformation for DCGView
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "dcgview/jsx",
    jsxDev: false, // Use jsx-runtime in both dev and prod (no jsx-dev-runtime needed)
  },

  // Configure path resolution to match tsconfig paths
  resolve: {
    alias: {
      dcgview: path.resolve(__dirname, "../frontend/dcgview"),
    },
  },
  // Most esbuild options map directly
  build: {
    target: "esnext",
    outDir: "dist",
    minify: true,
  },
  server: {
    host: "localhost",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        secure: false,
      },
    },
  },
});
