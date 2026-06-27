import { describe, it, expect } from 'vitest';
import { classicalMDS, sammonMapping, nonMetricMDS } from './mds.js';
import { expectKeys } from './__fixtures__/helpers.js';

const data = []; for (let i = 0; i < 12; i++) data.push({ x1: i, x2: i * 0.5, x3: Math.sin(i), x4: i % 3 });

describe('classicalMDS', () => {
  it('null <5', () => expect(classicalMDS(data.slice(0, 3), ['x1', 'x2'])).toBeNull());
  it('contract keys', () => expectKeys(classicalMDS(data, ['x1', 'x2', 'x3', 'x4']), ['test', 'points', 'nDimensions', 'stress', 'n', 'apa']));
  it('points correct count', () => { const r = classicalMDS(data, ['x1', 'x2']); expect(r.points).toHaveLength(data.length); });
  it('stress >= 0', () => { const r = classicalMDS(data, ['x1', 'x2']); expect(r.stress).toBeGreaterThanOrEqual(0); });
});

describe('sammonMapping', () => {
  it('null <5', () => expect(sammonMapping(data.slice(0, 3), ['x1', 'x2'])).toBeNull());
  it('contract keys', () => expectKeys(sammonMapping(data, ['x1', 'x2']), ['test', 'points', 'nDimensions', 'n', 'apa']));
  it('points correct count', () => { const r = sammonMapping(data, ['x1', 'x2']); expect(r.points).toHaveLength(data.length); });
});

describe('nonMetricMDS', () => {
  it('null <6', () => expect(nonMetricMDS(data.slice(0, 4), ['x1', 'x2'])).toBeNull());
  it('contract keys', () => expectKeys(nonMetricMDS(data, ['x1', 'x2']), ['test', 'points', 'nDimensions', 'stress', 'n', 'apa']));
  it('stress >= 0', () => { const r = nonMetricMDS(data, ['x1', 'x2']); expect(r.stress).toBeGreaterThanOrEqual(0); });
});
