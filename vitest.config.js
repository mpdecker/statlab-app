import { defineConfig } from 'vitest/config';
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    include: ['src/**/*.test.js', 'src/**/*.test.jsx'],
    environment: 'node',
    dangerouslyIgnoreUnhandledErrors: true,
    // App.test.jsx waits on Workbench's dynamic import (lazy-loaded to keep
    // the landing page's bundle small) resolving through vitest's own module
    // graph, which is comfortably under 1s locally but can run long enough
    // on a colder/slower CI runner to blow past the 5s default.
    testTimeout: 15000,
    coverage: {
      include: ['src/utils/**', 'src/components/**', 'src/config/**', 'src/data/**'],
      thresholds: { lines: 90 },
    },
  },
});
