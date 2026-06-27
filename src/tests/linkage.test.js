import { describe, it, expect } from 'vitest';
import { jaroWinkler, levenshteinDistance, fellegiSunter, recordBlocking, matchThreshold } from './linkage.js';
import { expectKeys } from './__fixtures__/helpers.js';

const pairs = [{ id: 1, agree: 5, compared: 5 }, { id: 2, agree: 2, compared: 5 }, { id: 3, agree: 4, compared: 5 }];

describe('jaroWinkler', () => {
  it('null for empty', () => expect(jaroWinkler('', null)).toBeNull());
  it('similarity = 1 for identical', () => { const r = jaroWinkler('hello', 'hello'); expect(r.similarity).toBe(1); });
  it('contract keys', () => expectKeys(jaroWinkler('hello', 'hallo'), ['test', 'similarity', 'n1', 'n2', 'apa']));
});

describe('levenshteinDistance', () => {
  it('null for empty', () => expect(levenshteinDistance(null, 'a')).toBeNull());
  it('distance = 0 for identical', () => { const r = levenshteinDistance('abc', 'abc'); expect(r.distance).toBe(0); });
  it('contract keys', () => expectKeys(levenshteinDistance('abc', 'abd'), ['test', 'distance', 'similarity', 'n1', 'n2', 'apa']));
});

describe('fellegiSunter', () => {
  it('contract keys', () => expectKeys(fellegiSunter(pairs), ['test', 'matches', 'n', 'nMatches', 'apa']));
  it('null empty', () => expect(fellegiSunter(null)).toBeNull());
});

describe('recordBlocking', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ id: i, block: i % 4 });
  it('contract keys', () => expectKeys(recordBlocking(d, 'block'), ['test', 'nBlocks', 'blockSizes', 'n', 'apa']));
});

describe('matchThreshold', () => {
  it('contract keys', () => expectKeys(matchThreshold([0.1, 0.5, 0.9, 0.3], [0, 1, 1, 0]), ['test', 'thresholds', 'n', 'apa']));
  it('null mismatch', () => expect(matchThreshold([1, 2], [1])).toBeNull());
});

describe('linkage edge cases', () => {
  it('jaroWinkler defined', () => expect(typeof jaroWinkler).toBe('function'));
  it('levenshteinDistance null for nulls', () => expect(levenshteinDistance(null, 'a')).toBeNull());
  it('fellegiSunter null for empty', () => expect(fellegiSunter([])).toBeNull());
  it('recordBlocking null for empty', () => expect(recordBlocking([], 'x')).toBeNull());
  it('matchThreshold null for length mismatch', () => expect(matchThreshold([1, 2], [1])).toBeNull());
});
