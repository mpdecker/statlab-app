import { defineConfig } from 'tsup';
import { readdirSync } from 'node:fs';

const modulesIn = (sub) =>
  readdirSync(`src/${sub}`)
    .filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'))
    .map((f) => `src/${sub}/${f}`);

export default defineConfig({
  entry: ['src/index.js', ...modulesIn('math'), ...modulesIn('methods')],
  format: ['esm', 'cjs'],
  outDir: 'dist',
  target: 'es2022',
  splitting: false,
  treeshake: true,
  sourcemap: false,
  clean: true,
  // Types are emitted separately via `tsc` (build:types) — plain-JS sources
  // produce loose `any`-typed declarations; see EXTRACTION-PLAN.md §3.
  dts: false,
});
