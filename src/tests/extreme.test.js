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

describe('gpdMLE is a real GPD maximum-likelihood fit', () => {
  // Exceedances drawn from GPD(sigma=2, xi=0.3); inverse-CDF sampling.
  let s = 13579;
  const rand = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 2 ** 32; };
  const sigma = 2, xi = 0.3;
  const data = Array.from({ length: 150 }, () => (sigma / xi) * (Math.pow(1 - (rand() * 0.998 + 0.001), -xi) - 1));
  it('recovers the scale and shape parameters', () => {
    const r = gpdMLE(data, 0);
    expect(r.sigma).toBeGreaterThan(1.4);
    expect(r.sigma).toBeLessThan(2.6);
    expect(r.xi).toBeGreaterThan(0.05);
    expect(r.xi).toBeLessThan(0.6);
  });
});

describe('gevMLE is a real GEV maximum-likelihood fit', () => {
  it('recovers the shape parameter xi from simulated GEV data', () => {
    let s = 31; const U = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return (s >>> 0) / 2 ** 32 * 0.9998 + 0.0001; };
    const mu = 10, sigma = 2, xi = 0.25;
    const data = Array.from({ length: 400 }, () => mu + sigma * (Math.pow(-Math.log(U()), -xi) - 1) / xi); // GEV inverse CDF
    const r = gevMLE(data);
    expect(Math.abs(r.xi - 0.25)).toBeLessThan(0.15);
    expect(Math.abs(r.sigma - 2)).toBeLessThan(0.6);
  });
});

describe('peaksOverThreshold fits a real GPD to exceedances', () => {
  it('recovers a positive shape parameter from heavy-tailed exceedances', () => {
    let s = 47; const U = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return (s >>> 0) / 2 ** 32 * 0.9998 + 0.0001; };
    const sigma = 1, xi = 0.3;
    // body below 0, GPD-distributed exceedances above threshold 0
    const data = Array.from({ length: 200 }, (_, i) => i % 2 === 0 ? -U() * 2 : sigma * (Math.pow(U(), -xi) - 1) / xi);
    const r = peaksOverThreshold(data, 0);
    expect(r.xi).toBeGreaterThan(0.15); // estimated, not the hardcoded 0.1
  });
});
