import * as esbuild from 'esbuild'

esbuild.build({
  entryPoints: ['client/main.ts'],
  bundle: true,
  outfile: 'dist/js/main.js',
  platform: 'browser',
  sourcemap: true,
}).catch(() => process.exit(1))
