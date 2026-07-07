import { describe, it, expect } from 'vitest';
import { mixtureOfRegressions, switchingRegression, latentProfileAnalysis, mixtureOfExperts, gaussianMixtureModel, nonparametricMixture, mixturePosterior } from './mixture.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

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
  it('slopes match numpy polyfit oracle', () => {
    const o = ref.mixture.switchingRegression_basic;
    const r = switchingRegression(o.x, o.y, o.threshold);
    expect(r.regime1.slope).toBeCloseTo(o.slope1, 4);
    expect(r.regime1.intercept).toBeCloseTo(o.intercept1, 4);
    expect(r.regime2.slope).toBeCloseTo(o.slope2, 4);
    expect(r.regime2.intercept).toBeCloseTo(o.intercept2, 4);
  });
});

describe('latentProfileAnalysis', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ x1: i * 0.3, x2: Math.sin(i) });
  it('null <20', () => expect(latentProfileAnalysis(d.slice(0, 10), ['x1'])).toBeNull());
  it('contract keys', () => expectKeys(latentProfileAnalysis(d, ['x1', 'x2']), ['test', 'profiles', 'nProfiles', 'n', 'apa']));
  it('nProfiles positive', () => { const r = latentProfileAnalysis(d, ['x1', 'x2']); if (r) expect(r.nProfiles).toBeGreaterThan(0); });
});

describe('latentProfileAnalysis recovers real class-specific means and variances via EM (not k-means)', () => {
  it('recovers two well-separated profile centers and reports logLik/BIC', () => {
    let s = 21; const rnd = () => { s = (1103515245 * s + 12345) & 0x7fffffff; return s / 0x7fffffff - 0.5; };
    const d = [];
    for (let i = 0; i < 60; i++) {
      const grp = i < 30 ? 0 : 1;
      const shift = grp === 0 ? 0 : 10;
      d.push({ x1: shift + rnd(), x2: shift + rnd() });
    }
    const r = latentProfileAnalysis(d, ['x1', 'x2'], 2, { seed: 5 });
    const means1 = r.profiles.map(p => p.means[0].mean).sort((a, b) => a - b);
    expect(means1[0]).toBeLessThan(2);
    expect(means1[1]).toBeGreaterThan(8);
    expect(Number.isFinite(r.logLik)).toBe(true);
    expect(Number.isFinite(r.bic)).toBe(true);
    expect(r.profiles[0].means[0].sd).toBeGreaterThan(0); // class-specific SD reported (not k-means, which has none)
  });
});

describe('mixtureOfExperts', () => {
  it('null <15', () => expect(mixtureOfExperts(x.slice(0, 10), y.slice(0, 10))).toBeNull());
  it('contract keys', () => expectKeys(mixtureOfExperts(x, y), ['test', 'experts', 'nExperts', 'n', 'apa']));
  it('nExperts positive', () => { const r = mixtureOfExperts(x, y); if (r) expect(r.nExperts).toBeGreaterThan(0); });
});

describe('mixtureOfExperts uses a real soft gating network (not hard nearest-expert assignment)', () => {
  it('recovers two distinct expert slopes with soft, non-degenerate mixing proportions', () => {
    const xs = [], ys = [];
    for (let i = 0; i < 80; i++) {
      const comp = i % 2;
      const xi = Math.floor(i / 2) - 20;
      const noise = 0.05 * (((i * 7) % 5) - 2);
      xs.push(xi);
      ys.push(comp === 0 ? 3 * xi + noise : -2 * xi + noise);
    }
    const r = mixtureOfExperts(xs, ys, 2, { seed: 9 });
    const slopes = r.experts.map(e => e.slope).sort((a, b) => a - b);
    expect(slopes[0]).toBeCloseTo(-2, 0);
    expect(slopes[1]).toBeCloseTo(3, 0);
    // Soft gating: mixing proportions should be non-degenerate (neither expert collapses to ~0 or ~1).
    r.experts.forEach(e => { expect(e.pi).toBeGreaterThan(0.05); expect(e.pi).toBeLessThan(0.95); });
    expect(Number.isFinite(r.logLik)).toBe(true);
  });
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

describe('nonparametricMixture uses real weighted-KDE EM (soft responsibilities, not hard nearest-mode reassignment)', () => {
  it('recovers an unbalanced mixing proportion (not forced toward 50/50)', () => {
    let s = 8; const rnd = () => { s = (1103515245 * s + 12345) & 0x7fffffff; return s / 0x7fffffff - 0.5; };
    // 80% of points near 0, 20% near 15 — a hard nearest-kernel assignment with equal-size
    // components would not recover this skew as cleanly as a proportion-aware soft EM.
    const data = [];
    for (let i = 0; i < 80; i++) data.push(rnd() * 1.5);
    for (let i = 0; i < 20; i++) data.push(15 + rnd() * 1.5);
    const r = nonparametricMixture(data, 2, { seed: 2 });
    const pis = r.pis.slice().sort((a, b) => a - b);
    expect(pis[0]).toBeLessThan(0.35);
    expect(pis[1]).toBeGreaterThan(0.65);
    expect(Number.isFinite(r.logLik)).toBe(true);
  });
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

describe('hardening — mixture edge cases', () => {
  it('mixtureOfRegressions null for mismatched lengths', () => expect(mixtureOfRegressions([1,2,3,4,5], [1,2,3,4])).toBeNull());
  it('mixtureOfRegressions null for null input', () => expect(mixtureOfRegressions(null, y)).toBeNull());
  it('switchingRegression null for mismatched lengths', () => expect(switchingRegression([1,2], [1,2,3], 10)).toBeNull());
  it('switchingRegression null for null threshold', () => expect(switchingRegression(x, y, null)).toBeNull());
  it('latentProfileAnalysis null for <20 rows', () => expect(latentProfileAnalysis([{x1:1,x2:2}], ['x1','x2'])).toBeNull());
  it('latentProfileAnalysis null for <2 vars', () => { const ld = [{x1:1,x2:2},{x1:3,x2:4},{x1:5,x2:6},{x1:7,x2:8},{x1:9,x2:10},{x1:11,x2:12},{x1:13,x2:14},{x1:15,x2:16},{x1:17,x2:18},{x1:19,x2:20},{x1:21,x2:22},{x1:23,x2:24},{x1:25,x2:26},{x1:27,x2:28},{x1:29,x2:30},{x1:31,x2:32},{x1:33,x2:34},{x1:35,x2:36},{x1:37,x2:38},{x1:39,x2:40}]; expect(latentProfileAnalysis(ld, ['x1'])).toBeNull(); });
  it('mixtureOfExperts null for mismatched lengths', () => expect(mixtureOfExperts([1,2,3], [1,2])).toBeNull());
  it('mixtureOfExperts null for nExperts<2', () => { const xs = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15]; const ys = [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30]; expect(mixtureOfExperts(xs, ys, 1)).toBeNull(); });
  it('gaussianMixtureModel null for k<2', () => expect(gaussianMixtureModel([1,2,3,4,5,6,7], 1)).toBeNull());
  it('gaussianMixtureModel null for null data', () => expect(gaussianMixtureModel(null, 2)).toBeNull());
  it('nonparametricMixture null for <10 data points', () => expect(nonparametricMixture([1,2,3], 2)).toBeNull());
  it('nonparametricMixture null for null data', () => expect(nonparametricMixture(null, 2)).toBeNull());
  it('mixturePosterior null for null data', () => expect(mixturePosterior(null, {k:2, mu:[[1],[2]], pi:[0.5,0.5]})).toBeNull());
  it('mixturePosterior null for missing mu', () => expect(mixturePosterior([1,2,3], {k:2, pi:[0.5,0.5]})).toBeNull());
});
