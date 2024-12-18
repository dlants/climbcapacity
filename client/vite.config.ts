import { defineConfig } from "vite";

export default defineConfig({
  appType: "spa",
  base: "/",
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
  root: ".",
});
