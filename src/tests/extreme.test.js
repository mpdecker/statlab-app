import { describe, it, expect } from 'vitest';
import { gevMLE, gpdMLE, returnLevel, blockMaxima, hillEstimator, peaksOverThreshold, thresholdSelection } from './extreme.js';
import { expectKeys } from './__fixtures__/helpers.js';

const data = []; for (let i = 0; i < 50; i++) data.push(10 + (i * 7 + 3) % 23 * 0.8 + Math.max(0, i - 40) * 3);

describe('gevMLE', () => {
  it('null <20', () => expect(gevMLE(data.slice(0, 10))).toBeNull());
  it('contract keys', () => expectKeys(gevMLE(data), ['test', 'mu', 'sigma', 'xi', 'returnLevels', 'n', 'apa']));
  it('returnLevels has 3 values', () => { const r = gevMLE(data); expect(r.returnLevels).toHaveLength(3); });
  it('sigma > 0', () => { const r = gevMLE(data); expect(r.sigma).toBeGreaterThan(0); });
});

describe('gpdMLE', () => {
  it('null <15', () => expect(gpdMLE(data.slice(0, 10))).toBeNull());
  it('contract keys', () => expectKeys(gpdMLE(data), ['test', 'sigma', 'xi', 'threshold', 'nExceedances', 'n', 'apa']));
  it('nExceedances >= 0', () => { const r = gpdMLE(data); expect(r.nExceedances).toBeGreaterThanOrEqual(0); });
});

describe('returnLevel', () => {
  it('null for invalid', () => expect(returnLevel(null, 10)).toBeNull());
  it('returns level', () => { const g = gevMLE(data); const r = returnLevel(g, 50); expect(Number.isFinite(r.level)).toBe(true); });
  it('contract keys', () => { const r = returnLevel(gevMLE(data), 50); expectKeys(r, ['test', 'returnPeriod', 'level', 'mu', 'sigma', 'xi', 'apa']); });
});

describe('blockMaxima', () => {
  it('null < 2*blockSize', () => expect(blockMaxima(data.slice(0, 15), 10)).toBeNull());
  it('contract keys', () => expectKeys(blockMaxima(data, 5), ['test', 'maxima', 'nBlocks', 'blockSize', 'gev', 'n', 'apa']));
  it('maxima non-empty', () => { const r = blockMaxima(data, 5); expect(r.maxima.length).toBeGreaterThan(0); });
});

describe('hillEstimator', () => {
  it('null <20', () => expect(hillEstimator(data.slice(0, 10))).toBeNull());
  it('alpha > 0', () => { const r = hillEstimator(data); expect(r.alpha).toBeGreaterThan(0); });
  it('contract keys', () => expectKeys(hillEstimator(data), ['test', 'alpha', 'xi', 'se', 'k', 'threshold', 'n', 'apa']));
});

describe('peaksOverThreshold', () => {
  const data = Array.from({length: 30}, (_, i) => i < 20 ? Math.random() * 5 : 20 + Math.random() * 30);
  it('contract keys', () => { const r = peaksOverThreshold(data); if (r) expectKeys(r, ['test','threshold','exceedances','xi','scale','nExceed','n','apa']); });
  it('null <10', () => expect(peaksOverThreshold([1,2,3,4])).toBeNull());
});
describe('thresholdSelection', () => {
  const data = Array.from({length: 30}, (_, i) => i < 25 ? Math.random() * 10 : 15 + Math.random() * 30);
  it('contract keys', () => expectKeys(thresholdSelection(data), ['test','candidates','selected','n','apa']));
  it('null <20', () => expect(thresholdSelection([1,2,3])).toBeNull());
});
