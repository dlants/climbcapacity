import * as esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const config: esbuild.BuildOptions = {
  entryPoints: ["client/main.tsx"],
  bundle: true,
  outfile: "dist/js/main.js",
  platform: "browser",
  sourcemap: true,
  target: ["es2020", "chrome58", "firefox57", "safari11"],
};

async function build() {
try {
  if (watch) {
    const ctx = await esbuild.context(config);
    await ctx.watch();
    console.log("Watching...");
  } else {
    await esbuild.build(config);
    console.log("Build complete");
  }
} catch (err) {
  console.error("Build failed:", err);
  process.exit(1);
}
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
