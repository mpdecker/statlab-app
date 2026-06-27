import { describe, it, expect } from 'vitest';
import { giniCoefficient, lorenzCurve, theilIndex, atkinsonIndex, concentrationIndex } from './inequality.js';
import { expectKeys } from './__fixtures__/helpers.js';

const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 50];

describe('giniCoefficient', () => {
  it('contract keys', () => expectKeys(giniCoefficient(data), ['test', 'gini', 'n', 'apa']));
  it('gini in [0,1]', () => { const r = giniCoefficient(data); expect(r.gini).toBeGreaterThanOrEqual(0); expect(r.gini).toBeLessThanOrEqual(1); });
  it('null <5', () => expect(giniCoefficient([1, 2])).toBeNull());
});

describe('lorenzCurve', () => {
  it('contract keys', () => expectKeys(lorenzCurve(data), ['test', 'points', 'n', 'apa']));
  it('points = n', () => { const r = lorenzCurve(data); expect(r.points).toHaveLength(data.length); });
  it('null for zero total', () => expect(lorenzCurve([0, 0, 0, 0, 0])).toBeNull());
});

describe('theilIndex', () => {
  it('contract keys', () => expectKeys(theilIndex(data), ['test', 'theil', 'n', 'apa']));
  it('null <5', () => expect(theilIndex([1, 2, 3])).toBeNull());
});

describe('atkinsonIndex', () => {
  it('contract keys', () => expectKeys(atkinsonIndex(data), ['test', 'atkinson', 'epsilon', 'n', 'apa']));
  it('epsilon=2 works', () => { const r = atkinsonIndex(data, { epsilon: 2 }); expect(r.epsilon).toBe(2); });
});

describe('concentrationIndex', () => {
  it('contract keys', () => expectKeys(concentrationIndex(data, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), ['test', 'ci', 'n', 'apa']));
  it('null <5', () => expect(concentrationIndex([1, 2], [3, 4])).toBeNull());
});
