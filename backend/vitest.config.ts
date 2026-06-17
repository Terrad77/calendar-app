import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Exclude compiled output and dependencies from test discovery
    exclude: ['dist/**', 'node_modules/**'],
    // Cold Neon connection pool can exceed the 5s default on the first query.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
