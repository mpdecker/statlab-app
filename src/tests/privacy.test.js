import { describe, it, expect } from 'vitest';
import { laplaceMechanism, bootstrapSynthetic, kAnonymityCheck, differentialPrivacy, dataMasking } from './privacy.js';
import { expectKeys } from './__fixtures__/helpers.js';

const data = [{ age: 25, zip: '12345' }, { age: 30, zip: '12345' }, { age: 25, zip: '67890' }, { age: 30, zip: '67890' }];

describe('laplaceMechanism', () => {
  it('contract keys', () => expectKeys(laplaceMechanism([1, 2, 3, 4, 5], 1), ['test', 'originalMean', 'noisyMean', 'epsilon', 'n', 'apa']));
  it('null empty', () => expect(laplaceMechanism([], 1)).toBeNull());
});

describe('bootstrapSynthetic', () => {
  it('contract keys', () => expectKeys(bootstrapSynthetic(data), ['test', 'nOriginal', 'nSynthetic', 'seed', 'apa']));
  it('synthetic rows correct', () => { const r = bootstrapSynthetic(data, { nRow: 8 }); expect(r.nSynthetic).toBe(8); });
});

describe('kAnonymityCheck', () => {
  it('contract keys', () => expectKeys(kAnonymityCheck(data, ['age', 'zip']), ['test', 'nGroups', 'minSize', 'vulnerable', 'k', 'n', 'pctSafe', 'apa']));
  it('null empty', () => expect(kAnonymityCheck([], ['x'])).toBeNull());
});

describe('differentialPrivacy', () => {
  it('contract keys', () => expectKeys(differentialPrivacy([{ epsilon: 0.3 }, { epsilon: 0.2 }], 1), ['test', 'consumed', 'budget', 'remaining', 'delta', 'apa']));
  it('null epsilon <= 0', () => expect(differentialPrivacy([], 0)).toBeNull());
});

describe('dataMasking', () => {
  it('contract keys', () => expectKeys(dataMasking(data, 'age'), ['test', 'nMasked', 'method', 'column', 'pct', 'n', 'apa']));
  it('suppress method', () => { const r = dataMasking(data, 'age', { method: 'suppress', pct: 50 }); expect(r.method).toBe('suppress'); });
});

describe('privacy edge cases', () => {
  it('laplaceMechanism null for empty', () => expect(laplaceMechanism([], 1)).toBeNull());
  it('bootstrapSynthetic null for empty', () => expect(bootstrapSynthetic([])).toBeNull());
  it('kAnonymityCheck null for empty', () => expect(kAnonymityCheck([], ['x'])).toBeNull());
  it('differentialPrivacy null for empty', () => expect(differentialPrivacy([], 1)).toBeNull());
  it('dataMasking null for empty', () => expect(dataMasking([], 'age')).toBeNull());
});
