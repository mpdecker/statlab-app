import { describe, it, expect } from 'vitest';
import { mixtureOfRegressions, switchingRegression, latentProfileAnalysis, mixtureOfExperts, gaussianMixtureModel, nonparametricMixture, mixturePosterior } from './mixture.js';
import { expectKeys } from './__fixtures__/helpers.js';

const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const y = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68];

describe('mixtureOfRegressions', () => {
  it('null <15', () => expect(mixtureOfRegressions(x.slice(0, 10), y.slice(0, 10))).toBeNull());
  it('contract keys', () => expectKeys(mixtureOfRegressions(x, y), ['test', 'components', 'nComponents', 'n', 'apa']));
  it('nComponents correct', () => { const r = mixtureOfRegressions(x, y); expect(r.nComponents).toBe(2); });
});

describe('switchingRegression', () => {
  it('null <10', () => expect(switchingRegression(x.slice(0, 5), y.slice(0, 5), 10)).toBeNull());
  it('contract keys', () => expectKeys(switchingRegression(x, y, 10), ['test', 'threshold', 'regime1', 'regime2', 'n', 'apa']));
  it('both regimes present', () => { const r = switchingRegression(x, y, 10); expect(r.regime1.n).toBeGreaterThan(0); expect(r.regime2.n).toBeGreaterThan(0); });
});

describe('latentProfileAnalysis', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ x1: i * 0.3, x2: Math.sin(i) });
  it('null <20', () => expect(latentProfileAnalysis(d.slice(0, 10), ['x1'])).toBeNull());
  it('contract keys', () => expectKeys(latentProfileAnalysis(d, ['x1', 'x2']), ['test', 'profiles', 'nProfiles', 'n', 'apa']));
  it('nProfiles positive', () => { const r = latentProfileAnalysis(d, ['x1', 'x2']); if (r) expect(r.nProfiles).toBeGreaterThan(0); });
});

describe('mixtureOfExperts', () => {
  it('null <15', () => expect(mixtureOfExperts(x.slice(0, 10), y.slice(0, 10))).toBeNull());
  it('contract keys', () => expectKeys(mixtureOfExperts(x, y), ['test', 'experts', 'nExperts', 'n', 'apa']));
  it('nExperts positive', () => { const r = mixtureOfExperts(x, y); if (r) expect(r.nExperts).toBeGreaterThan(0); });
});

describe('gaussianMixtureModel', () => {
  const data = [1.1,1.2,0.9,5.1,4.9,5.2,5.0,1.0,4.8,5.3];
  it('contract keys', () => expectKeys(gaussianMixtureModel(data, 2), ['test','mu','pi','k','n','apa']));
  it('null k<2', () => expect(gaussianMixtureModel(data, 1)).toBeNull());
  it('mu array non-empty', () => { const r = gaussianMixtureModel(data, 2); if (r) expect(r.mu.length).toBeGreaterThan(0); });
});
describe('nonparametricMixture', () => {
  const data = [2.1,2.2,1.9,8.1,7.9,8.2,8.0,2.0,7.8,8.3];
  it('contract keys', () => expectKeys(nonparametricMixture(data, 2), ['test','k','bandwidth','n','sizes','apa']));
  it('null k<2', () => expect(nonparametricMixture(data, 1)).toBeNull());
  it('sizes non-empty', () => { const r = nonparametricMixture(data, 2); if (r) expect(r.sizes.length).toBeGreaterThan(0); });
});
describe('mixturePosterior', () => {
  const gmm = { k: 2, mu: [[1.5], [4.5]], pi: [0.5, 0.5], sigma2: [1, 1] };
  it('contract keys', () => expectKeys(mixturePosterior([1,2,3,4,5], gmm), ['test','posteriors','n','k','apa']));
  it('null invalid', () => expect(mixturePosterior([1,2], null)).toBeNull());
  it('null when gmm lacks fitted params', () => expect(mixturePosterior([1,2,3,4,5], { k: 2 })).toBeNull());
  it('posteriors non-empty', () => { const r = mixturePosterior([1,2,3,4,5], gmm); if (r) expect(r.posteriors.length).toBeGreaterThan(0); });
});

describe('mixturePosterior computes real responsibilities (not uniform 1/k)', () => {
  it('assigns each point almost entirely to its own cluster', () => {
    const data = [0, 0.2, -0.1, 0.1, 10, 10.1, 9.9, 10.2];
    const gmm = gaussianMixtureModel(data, 2, { seed: 1 });
    const post = mixturePosterior(data, gmm);
    const near0 = gmm.mu[0][0] < gmm.mu[1][0] ? 0 : 1; // component centred near 0
    expect(post.posteriors[0][near0]).toBeGreaterThan(0.9); // point 0 → low cluster
    expect(post.posteriors[4][near0]).toBeLessThan(0.1);    // point 10 → high cluster
  });
});

describe('mixtureOfRegressions recovers two distinct regression lines (real soft-EM)', () => {
  it('recovers slopes {2, -1} from a two-line mixture', () => {
    const x = [], y = [];
    for (let i = 0; i < 60; i++) {
      const comp = i % 2;            // interleave so both lines span the same x range
      const xi = Math.floor(i / 2) - 15;
      const noise = 0.04 * (((i * 7) % 5) - 2);
      x.push(xi);
      y.push(comp === 0 ? 2 * xi + 1 + noise : -1 * xi + 5 + noise);
    }
    const r = mixtureOfRegressions(x, y, 2, { seed: 3 });
    const slopes = r.components.map(c => c.slope).sort((a, b) => a - b);
    expect(slopes[0]).toBeCloseTo(-1, 1);
    expect(slopes[1]).toBeCloseTo(2, 1);
  });
});
