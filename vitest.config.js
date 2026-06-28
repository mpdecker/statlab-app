import { defineConfig } from 'vitest/config';
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    include: ['src/**/*.test.js', 'src/**/*.test.jsx'],
    environment: 'node',
    dangerouslyIgnoreUnhandledErrors: true,
    coverage: {
      include: ['src/math/**', 'src/tests/**', 'src/utils/**', 'src/components/**', 'src/config/**', 'src/data/**'],
      exclude: ['src/tests/__fixtures__/**', 'src/tests/fixtures/**'],
      thresholds: { lines: 90 },
    },
  },
});
