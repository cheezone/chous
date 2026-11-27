import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Only the hand-written suites; test/fixtures (pass, fail, samples) are lint targets, not tests
    include: ['test/code/**/*.test.ts'],
    // Spawning the CLI over many sample projects is slower than a plain unit test
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // The suite must not depend on the machine's own git excludes (a global `.DS_Store` rule is common).
    env: { GIT_CONFIG_GLOBAL: '/nonexistent/chous-test-gitconfig', XDG_CONFIG_HOME: '/nonexistent/chous-test-xdg' },
  },
})
