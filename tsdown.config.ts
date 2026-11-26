import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts', './src/cli.ts'],
  outDir: 'dist',
  dts: true,
  // devDependencies we ship inside dist: `npx chous` installs nothing extra for them.
  deps: { onlyBundle: ['i18next'] },
})
