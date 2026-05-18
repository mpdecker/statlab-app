import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('papaparse', () => ({
  default: {
    parse: vi.fn((url, opts) => {
      opts.complete({ data: [{ wage: 1, education: 2 }], errors: [] });
    }),
  },
}));

describe('loadDataset', () => {
  beforeEach(async () => {
    const mod = await import('./datasets.js');
    Object.keys(mod._cache).forEach(k => delete mod._cache[k]);
  });

  test('loadDataset returns cached result on second call', async () => {
    const { loadDataset } = await import('./datasets.js');
    const a = await loadDataset('salaries');
    const b = await loadDataset('salaries');
    expect(a).toBe(b);
  });

  test('BUILTIN has salaries entry with url', async () => {
    const { BUILTIN } = await import('./datasets.js');
    expect(BUILTIN.salaries).toBeDefined();
    expect(BUILTIN.salaries.url).toContain('Salaries.csv');
  });
});
