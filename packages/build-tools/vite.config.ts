import { defineConfig } from "vite";
import path from "path";
import { constWrapTsx } from "../scripts/esbuild/const-wrap-tsx";

export default defineConfig({
  appType: "spa",
  base: "/",
  root: "../client", // Point to client directory
  plugins: [
    constWrapTsx()
  ],
  // Configure JSX transformation for DCGView
  esbuild: {
    jsx: "transform",
    jsxFactory: "DCGViewRuntime.createElement",
    jsxFragment: "DCGViewRuntime.Fragment",
    jsxInject: "import * as DCGViewRuntime from 'dcgview/jsx/jsx-runtime'"
  },
  // Configure path resolution to match tsconfig paths
  resolve: {
    alias: {
      "dcgview": path.resolve(__dirname, "../client/dcgview"),
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
