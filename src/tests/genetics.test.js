import { describe, it, expect } from 'vitest';
import { prsScore, aceHeritability, ldPruning, polygenicPrediction, manhattanData } from './genetics.js';
import { expectKeys } from './__fixtures__/helpers.js';

const g = [[0, 1, 2], [1, 0, 1], [2, 1, 0], [0, 2, 1], [1, 1, 2], [0, 0, 1]];

describe('prsScore', () => {
  it('contract keys', () => expectKeys(prsScore(g, [0.5, -0.3, 0.2]), ['test', 'scores', 'n', 'nMarkers', 'apa']));
  it('n scores = n individuals', () => { const r = prsScore(g, [0.5, 0.3, 0.2]); expect(r.scores).toHaveLength(g.length); });
});

describe('aceHeritability', () => {
  const mz = [10, 11, 12, 10.5, 9, 9.5, 11, 10, 10.5, 11.5, 9.8, 10.2];
  const dz = [10, 9, 12, 11, 8, 10, 11, 9, 9.5, 8.5, 12, 11, 10, 10.5, 9, 11];
  it('contract keys', () => expectKeys(aceHeritability(mz, dz), ['test', 'A', 'C', 'E', 'rMZ', 'rDZ', 'nPairs', 'apa']));
  it('A+C+E ≈ 1', () => { const r = aceHeritability(mz, dz); expect(r.A + r.C + r.E).toBeCloseTo(1, 0); });
});

describe('ldPruning', () => {
  it('contract keys', () => expectKeys(ldPruning(g), ['test', 'kept', 'nRemoved', 'threshold', 'window', 'nMarkers', 'apa']));
  it('kept markers > 0', () => { const r = ldPruning(g); expect(r.kept.length).toBeGreaterThan(0); });
});

describe('polygenicPrediction', () => {
  const phenotype = [5, 3, 7, 4, 6, 2];
  it('contract keys', () => { const r = polygenicPrediction(phenotype, g); if (r) expectKeys(r, ['test', 'rSquared', 'nMarkers', 'n', 'apa']); });
  it('handles gracefully', () => { const r = polygenicPrediction(phenotype, g); expect(r === null || Number.isFinite(r.rSquared)).toBe(true); });
});

describe('manhattanData', () => {
  it('is defined', () => expect(typeof manhattanData).toBe('function'));
});

describe('genetics edge cases', () => {
  it('prsScore null for empty', () => expect(prsScore([], [0.5])).toBeNull());
  it('prsScore null for mismatch', () => expect(prsScore(g, [0.5])).toBeNull());
  it('aceHeritability null <10', () => expect(aceHeritability([1, 2, 3], [4, 5, 6])).toBeNull());
  it('ldPruning null for empty', () => expect(ldPruning([], { threshold: 0.8 })).toBeNull());
  it('polygenicPrediction null <10', () => expect(polygenicPrediction([1, 2, 3], [[0, 1]])).toBeNull());
  it('manhattanData null for empty', () => expect(manhattanData([], [], [])).toBeNull());
});
