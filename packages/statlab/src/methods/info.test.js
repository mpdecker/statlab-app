import { describe, it, expect } from 'vitest';
import { shannonEntropy, mutualInformation, klDivergence, jensenShannonDivergence, aicc, bicWeights } from './info.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const d1 = [1, 2, 2, 3, 3, 3, 4, 4, 4, 4];
const d2 = [0, 1, 0, 1, 1, 0, 0, 1, 0, 1];

describe('shannonEntropy', () => {
  it('null <3', () => expect(shannonEntropy([1, 2])).toBeNull());
  it('zero for constant', () => { const r = shannonEntropy([5, 5, 5]); expect(r.entropy).toBe(0); });
  it('entropy > 0 for varied', () => { const r = shannonEntropy(d1); expect(r.entropy).toBeGreaterThan(0); });
  it('normalized in [0,1]', () => { const r = shannonEntropy(d1); expect(r.normalized).toBeGreaterThanOrEqual(0); expect(r.normalized).toBeLessThanOrEqual(1); });
  it('continuous with bins', () => { const r = shannonEntropy([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], { discrete: false, bins: 5 }); expect(r.type).toBe('continuous'); });
  it('contract keys', () => expectKeys(shannonEntropy(d1), ['test', 'entropy', 'type', 'base', 'normalized', 'n', 'apa']));
  it('matches a scipy.stats.entropy(base=2) oracle', () => {
    const e = ref.info.entropy_basic;
    const r = shannonEntropy(e.data);
    expect(r.entropy).toBeCloseTo(e.entropy, 4);
  });
});

describe('mutualInformation', () => {
  it('null <5', () => expect(mutualInformation([1, 2, 3], [0, 1, 0])).toBeNull());
  it('MI >= 0', () => { const r = mutualInformation(d1, d2); expect(r.mi).toBeGreaterThanOrEqual(0); });
  it('normalized in [0,1]', () => { const r = mutualInformation(d1, d2); expect(r.normalized).toBeGreaterThanOrEqual(0); expect(r.normalized).toBeLessThanOrEqual(1.1); });
  it('contract keys', () => expectKeys(mutualInformation(d1, d2), ['test', 'mi', 'normalized', 'n', 'apa']));
  it('matches a sklearn.metrics.mutual_info_score oracle (bits)', () => {
    const e = ref.info.mi_basic;
    const r = mutualInformation(e.x, e.y);
    expect(r.mi).toBeCloseTo(e.mi, 4);
  });
});

describe('klDivergence', () => {
  it('null for length mismatch', () => expect(klDivergence([0.5, 0.5], [0.3])).toBeNull());
  it('KL >= 0', () => { const r = klDivergence([0.7, 0.3], [0.5, 0.5]); expect(r.divergence).toBeGreaterThanOrEqual(0); });
  it('KL=0 for identical', () => { const r = klDivergence([1, 2, 3], [1, 2, 3]); expect(r.divergence).toBeCloseTo(0, 2); });
  it('contract keys', () => expectKeys(klDivergence([1, 2], [2, 1]), ['test', 'divergence', 'direction', 'n', 'apa']));
});

describe('jensenShannonDivergence', () => {
  it('null mismatch', () => expect(jensenShannonDivergence([1, 2], [3])).toBeNull());
  it('JSD in [0,1]', () => { const r = jensenShannonDivergence([0.9, 0.1], [0.1, 0.9]); expect(r.divergence).toBeGreaterThanOrEqual(0); expect(r.distance).toBeGreaterThanOrEqual(0); });
  it('JSD=0 for identical', () => { const r = jensenShannonDivergence([1, 2, 3], [1, 2, 3]); expect(r.divergence).toBeCloseTo(0, 2); });
  it('contract keys', () => expectKeys(jensenShannonDivergence([2, 1], [1, 2]), ['test', 'divergence', 'distance', 'n', 'apa']));
});

describe('aicc', () => {
  it('null n <= k+1', () => expect(aicc(-50, 10, 10)).toBeNull());
  it('AICc > AIC', () => { const r = aicc(-50, 3, 30); expect(r.aicc).toBeGreaterThan(r.aic); });
  it('contract keys', () => expectKeys(aicc(-50, 3, 30), ['test', 'aic', 'aicc', 'logLik', 'nParams', 'n', 'apa']));
});

describe('bicWeights', () => {
  it('null <2 models', () => expect(bicWeights([{ name: 'A', bic: 100 }])).toBeNull());
  it('weights sum to 1', () => { const r = bicWeights([{ name: 'A', bic: 100 }, { name: 'B', bic: 105 }, { name: 'C', bic: 108 }]); const sum = r.models.reduce((s, m) => s + m.weight, 0); expect(sum).toBeCloseTo(1, 2); });
  it('contract keys', () => expectKeys(bicWeights([{ name: 'A', bic: 100 }, { name: 'B', bic: 105 }]), ['test', 'models', 'nModels', 'apa']));
});

describe('hardening — invalid inputs', () => {
  it('shannonEntropy null for empty', () => expect(shannonEntropy([])).toBeNull());
  it('mutualInformation null for empty', () => expect(mutualInformation([], [])).toBeNull());
  it('klDivergence null for empty', () => expect(klDivergence([], [])).toBeNull());
  it('jensenShannonDivergence null for empty', () => expect(jensenShannonDivergence([], [])).toBeNull());
  it('aicc null for non-finite logLik', () => expect(aicc(NaN, 3, 30)).toBeNull());
  it('bicWeights null for empty', () => expect(bicWeights([])).toBeNull());
  it('shannonEntropy null for null', () => expect(shannonEntropy(null)).toBeNull());
  it('mutualInformation null for mismatched lengths', () => expect(mutualInformation([1, 2, 3, 4, 5], [1, 2, 3])).toBeNull());
});

describe('hardening — degenerate data', () => {
  it('shannonEntropy zero for constant array', () => { const r = shannonEntropy([5, 5, 5, 5]); expect(r.entropy).toBe(0); });
  it('klDivergence zero for identical distributions', () => { const r = klDivergence([0.5, 0.5], [0.5, 0.5]); expect(r.divergence).toBeCloseTo(0, 2); });
  it('jensenShannonDivergence zero for identical distributions', () => { const r = jensenShannonDivergence([1, 2, 3], [1, 2, 3]); expect(r.divergence).toBeCloseTo(0, 2); });
  it('mutualInformation zero for independent', () => { const r = mutualInformation([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]); expect(r.mi).toBeGreaterThanOrEqual(0); });
});

describe('hardening — invariants', () => {
  it('aicc returns aicc > aic for small n', () => { const r = aicc(-30, 3, 15); expect(r.aicc).toBeGreaterThan(r.aic); });
  it('bicWeights weights sum to 1', () => { const r = bicWeights([{ name: 'M1', bic: 50 }, { name: 'M2', bic: 55 }]); const sum = r.models.reduce((s, m) => s + m.weight, 0); expect(sum).toBeCloseTo(1, 2); });
});
