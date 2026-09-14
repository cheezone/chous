import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Only the hand-written suites; tests/fixtures and tests/samples are lint targets, not tests
    include: ['tests/code/**/*.test.ts'],
    // Spawning the CLI over many sample projects is slower than a plain unit test
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
})
