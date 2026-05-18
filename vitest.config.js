import { defineConfig } from 'vitest/config';
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    include: ['src/**/*.test.js', 'src/**/*.test.jsx'],
    environment: 'node',
    coverage: {
      include: ['src/math/**', 'src/tests/**'],
      exclude: ['src/tests/__fixtures__/**'],
      thresholds: { lines: 90 },
    },
  },
});
