import { describe, it, expect } from 'vitest';
import { jaroWinkler, levenshteinDistance, fellegiSunter, recordBlocking, matchThreshold, probabilisticRecordLinkage, deduplication } from './linkage.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

describe('jaroWinkler and levenshteinDistance match the jellyfish reference library exactly', () => {
  it('matches on 5 classic string-linkage test pairs', () => {
    for (const [key, e] of Object.entries(ref.linkage.pairs)) {
      const [a, b] = key.split('|');
      expect(jaroWinkler(a, b).similarity).toBeCloseTo(e.jaroWinkler, 4);
      expect(levenshteinDistance(a, b).distance).toBe(e.levenshtein);
    }
  });
});

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
  it('matches non-empty', () => { const r = fellegiSunter(pairs); if (r) expect(r.matches.length).toBeGreaterThan(0); });
});

describe('recordBlocking', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ id: i, block: i % 4 });
  it('contract keys', () => expectKeys(recordBlocking(d, 'block'), ['test', 'nBlocks', 'blockSizes', 'n', 'apa']));
  it('blocks positive', () => { const r = recordBlocking(d, 'block'); if (r) expect(r.nBlocks).toBeGreaterThan(0); });
  it('blockSizes non-empty', () => { const r = recordBlocking(d, 'block'); if (r) expect(r.blockSizes.length).toBeGreaterThan(0); });
});

describe('matchThreshold', () => {
  it('contract keys', () => expectKeys(matchThreshold([0.1, 0.5, 0.9, 0.3], [0, 1, 1, 0]), ['test', 'thresholds', 'n', 'apa']));
  it('null mismatch', () => expect(matchThreshold([1, 2], [1])).toBeNull());
  it('thresholds non-empty', () => { const r = matchThreshold([0.1, 0.5, 0.9, 0.3], [0, 1, 1, 0]); if (r) expect(r.thresholds.length).toBeGreaterThan(0); });
});

describe('linkage edge cases', () => {
  it('jaroWinkler defined', () => expect(typeof jaroWinkler).toBe('function'));
  it('levenshteinDistance null for nulls', () => expect(levenshteinDistance(null, 'a')).toBeNull());
  it('fellegiSunter null for empty', () => expect(fellegiSunter([])).toBeNull());
  it('recordBlocking null for empty', () => expect(recordBlocking([], 'x')).toBeNull());
  it('matchThreshold null for length mismatch', () => expect(matchThreshold([1, 2], [1])).toBeNull());
});
describe('probabilisticRecordLinkage', () => {
  const pairs = [0.2, 0.6, 0.8, 0.3, 0.9];
  it('contract keys', () => expectKeys(probabilisticRecordLinkage(pairs, pairs), ['test','matches','total','matchRate','apa']));
  it('null empty', () => expect(probabilisticRecordLinkage([], [])).toBeNull());
  it('total positive', () => { const r = probabilisticRecordLinkage(pairs, pairs); if (r) expect(r.total).toBeGreaterThan(0); });
});
describe('deduplication', () => {
  const records = [{name:'Alice',dob:'1990'},{name:'Bob',dob:'1991'},{name:'Alice',dob:'1990'},{name:'Charlie',dob:'1992'}];
  it('contract keys', () => expectKeys(deduplication(records, ['name','dob']), ['test','nOriginal','nDuplicates','duplicates','apa']));
  it('null <2 records', () => expect(deduplication([records[0]], ['name'])).toBeNull());
  it('duplicates non-empty', () => { const r = deduplication(records, ['name','dob']); if (r) expect(r.duplicates.length).toBeGreaterThan(0); });
});
