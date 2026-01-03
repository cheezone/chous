import { defineConfig } from 'tsdown'

export default defineConfig({
  // 同时打包库入口与 CLI 入口
  entry: ['./src/index.ts', './src/cli.ts'],
  // 产物输出到 dist/
  outDir: 'dist',
  // 生成 d.ts（给库消费方用）
  dts: true,
})

