import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Only the hand-written suites; test/fixtures and test/samples are lint targets, not tests
    include: ['test/code/**/*.test.ts'],
    // Spawning the CLI over many sample projects is slower than a plain unit test
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
})
