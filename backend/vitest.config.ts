import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Exclude compiled output and dependencies from test discovery
    exclude: ['dist/**', 'node_modules/**'],
  },
});
