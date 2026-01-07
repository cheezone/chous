import { defineConfig } from 'tsdown'

export default defineConfig({
  // Bundle both library entry and CLI entry
  entry: ['./src/index.ts', './src/cli.ts'],
  // Output to dist/
  outDir: 'dist',
  // Generate d.ts files (for library consumers)
  dts: true,
})

