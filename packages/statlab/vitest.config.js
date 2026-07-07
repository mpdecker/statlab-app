import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.js'],
    environment: 'node',
    coverage: {
      include: ['src/math/**', 'src/methods/**'],
      exclude: ['src/methods/__fixtures__/**', 'src/methods/fixtures/**'],
      thresholds: { lines: 90 },
    },
  },
});
