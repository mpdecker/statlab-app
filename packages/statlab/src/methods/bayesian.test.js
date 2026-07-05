import { describe, it, expect } from 'vitest';
import {
  mcmc,
  posteriorSummary,
  hpdInterval,
  waic,
  normalNormalPosterior,
  normalInverseGammaPosterior,
  betaBinomialPosterior,
  gammaPoissonPosterior,
  dirichletMultinomialPosterior,
  bayesianLinearRegression,
  bicBayesFactor,
  savageDickeyBF,
  bayesianANOVA,
  bayesianMixedModel,
  bayesianLogisticRegression,
  bayesianPoissonRegression,
  jszBayesFactorT,
  bayesianDIC,
  posteriorPredictiveCheck,
  bmaRegression, posteriorInclusionProbs, bmaPredict, bmaSummary,
} from './bayesian.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };
const bRef = ref.bayesian;

const samples100 = Array.from({ length: 100 }, (_, i) => i * 0.1);

const lpFn = (theta) => -0.5 * (theta[0] * theta[0] + theta[1] * theta[1]);

const normalData = [2.3, 2.8, 3.1, 2.5, 3.0, 2.7, 3.2, 2.9, 3.3, 2.6];

const yReg = [1.5, 2.8, 3.1, 4.5, 5.2, 6.1, 7.3, 8.0, 9.1, 10.2];
const XReg = [[1], [2], [3], [4], [5], [6], [7], [8], [9], [10]];

const poissonCounts = [3, 5, 2, 4, 6, 3, 4, 5, 3, 2, 4, 3];

const dirichletCounts = [5, 3, 2];

const priorFn = (x) => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

const yBin = [0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1];
const XBin = [[0.1], [0.5], [0.2], [0.7], [0.3], [0.4], [0.8], [0.6], [0.2], [0.9], [0.1], [0.7]];

const yPois = [2, 4, 3, 5, 6, 2, 4, 5, 3, 6, 4, 3];
const XPois = [[0.1], [0.5], [0.2], [0.7], [0.3], [0.4], [0.8], [0.6], [0.2], [0.9], [0.1], [0.7]];

describe('mcmc', () => {
  it('returns null when no logPosterior', () => {
    expect(mcmc(null, [0])).toBeNull();
    expect(mcmc(undefined, [0, 0])).toBeNull();
  });

  it('returns null when initialParams is null or empty', () => {
    expect(mcmc(lpFn, null)).toBeNull();
    expect(mcmc(lpFn, [])).toBeNull();
  });

  it('returns null when nIter < nBurnin + 100', () => {
    expect(mcmc(lpFn, [0, 0], { nIter: 50, nBurnin: 20 })).toBeNull();
  });

  it('returns null when logPosterior returns non-finite for initial params', () => {
    const badFn = () => NaN;
    expect(mcmc(badFn, [0, 0], { nIter: 200, nBurnin: 20 })).toBeNull();
  });

  it('valid run produces chains array with correct length', () => {
    const r = mcmc(lpFn, [0, 0], { nIter: 200, nBurnin: 20 });
    expectKeys(r, ['chains', 'acceptRate', 'nIter', 'nBurnin']);
    expect(Array.isArray(r.chains)).toBe(true);
    expect(r.chains.length).toBe(2);
    expect(r.chains[0].length).toBe(200);
    expect(r.chains[1].length).toBe(200);
  });

  it('acceptRate is between 0 and 1', () => {
    const r = mcmc(lpFn, [0, 0], { nIter: 200, nBurnin: 20 });
    expect(r.acceptRate).toBeGreaterThanOrEqual(0);
    expect(r.acceptRate).toBeLessThanOrEqual(1);
    expect(Number.isFinite(r.acceptRate)).toBe(true);
  });

  it('nIter and nBurnin are stored correctly', () => {
    const r = mcmc(lpFn, [0, 0], { nIter: 200, nBurnin: 20 });
    expect(r.nIter).toBe(200);
    expect(r.nBurnin).toBe(20);
  });

  it('chains contain finite numeric values', () => {
    const r = mcmc(lpFn, [0, 0], { nIter: 200, nBurnin: 20 });
    for (const chain of r.chains) {
      for (const v of chain) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });
});

describe('posteriorSummary', () => {
  it('returns null for null input', () => {
    expect(posteriorSummary(null)).toBeNull();
    expect(posteriorSummary(undefined)).toBeNull();
  });

  it('returns null for sample size less than 10', () => {
    expect(posteriorSummary([1, 2, 3, 4, 5])).toBeNull();
    expect(posteriorSummary([1, 2, 3, 4, 5, 6, 7, 8, 9])).toBeNull();
  });

  it('valid summary has expected keys', () => {
    const r = posteriorSummary(samples100);
    expectKeys(r, ['mean', 'sd', 'median', 'q025', 'q975', 'n']);
    expect(r.n).toBe(100);
  });

  it('mean and sd are finite', () => {
    const r = posteriorSummary(samples100);
    expect(Number.isFinite(r.mean)).toBe(true);
    expect(r.sd).toBeGreaterThan(0);
  });

  it('median is between q025 and q975', () => {
    const r = posteriorSummary(samples100);
    expect(r.median).toBeGreaterThanOrEqual(r.q025);
    expect(r.median).toBeLessThanOrEqual(r.q975);
  });

  it('q025 is less than q975', () => {
    const r = posteriorSummary(samples100);
    expect(r.q025).toBeLessThan(r.q975);
  });
});

describe('hpdInterval', () => {
  it('returns null for null input', () => {
    expect(hpdInterval(null)).toBeNull();
  });

  it('returns null for sample size less than 10', () => {
    expect(hpdInterval([1, 2, 3, 4, 5])).toBeNull();
  });

  it('valid result has expected keys', () => {
    const r = hpdInterval(samples100);
    expectKeys(r, ['lo', 'hi', 'prob']);
  });

  it('lo is less than or equal to hi', () => {
    const r = hpdInterval(samples100);
    expect(r.lo).toBeLessThanOrEqual(r.hi);
  });

  it('prob is stored correctly', () => {
    const r = hpdInterval(samples100, 0.95);
    expect(r.prob).toBe(0.95);
  });

  it('custom prob is stored', () => {
    const r = hpdInterval(samples100, 0.8);
    expect(r.prob).toBe(0.8);
    expect(r.lo).toBeLessThanOrEqual(r.hi);
  });
});

describe('normalNormalPosterior', () => {
  it('returns null when data is null or empty', () => {
    expect(normalNormalPosterior(null, 2.5, 1, 0.5)).toBeNull();
    expect(normalNormalPosterior([], 2.5, 1, 0.5)).toBeNull();
  });

  it('returns null when knownSigma <= 0', () => {
    expect(normalNormalPosterior(normalData, 2.5, 1, 0)).toBeNull();
    expect(normalNormalPosterior(normalData, 2.5, 1, -1)).toBeNull();
  });

  it('valid result has expected keys', () => {
    const r = normalNormalPosterior(normalData, 2.5, 1, 0.5);
    expectKeys(r, ['posteriorMean', 'posteriorSD', 'credible95', 'n']);
    expect(r.n).toBe(10);
  });

  it('posterior mean is between prior mean and data mean', () => {
    const dataMean = normalData.reduce((s, x) => s + x, 0) / normalData.length;
    const r = normalNormalPosterior(normalData, 2.5, 1, 0.5);
    const bounds = [Math.min(2.5, dataMean), Math.max(2.5, dataMean)];
    expect(r.posteriorMean).toBeGreaterThanOrEqual(bounds[0]);
    expect(r.posteriorMean).toBeLessThanOrEqual(bounds[1]);
  });

  it('posterior SD is positive', () => {
    const r = normalNormalPosterior(normalData, 2.5, 1, 0.5);
    expect(r.posteriorSD).toBeGreaterThan(0);
  });

  it('credible95 interval contains posterior mean', () => {
    const r = normalNormalPosterior(normalData, 2.5, 1, 0.5);
    expect(r.credible95[0]).toBeLessThanOrEqual(r.posteriorMean);
    expect(r.credible95[1]).toBeGreaterThanOrEqual(r.posteriorMean);
  });

  it('credible95 is an array of length 2', () => {
    const r = normalNormalPosterior(normalData, 2.5, 1, 0.5);
    expect(Array.isArray(r.credible95)).toBe(true);
    expect(r.credible95.length).toBe(2);
  });

  it('matches a closed-form conjugate-update oracle', () => {
    const e = bRef.normalNormal_basic;
    const r = normalNormalPosterior(e.data, e.priorMean, e.priorSD, e.knownSigma);
    expect(r.posteriorMean).toBeCloseTo(e.posteriorMean, 5);
    expect(r.posteriorSD).toBeCloseTo(e.posteriorSD, 5);
  });
});

describe('normalInverseGammaPosterior', () => {
  it('returns null for invalid input', () => {
    expect(normalInverseGammaPosterior(null, XReg)).toBeNull();
    expect(normalInverseGammaPosterior([1], XReg)).toBeNull();
    expect(normalInverseGammaPosterior(yReg, null)).toBeNull();
    expect(normalInverseGammaPosterior(yReg, [])).toBeNull();
    expect(normalInverseGammaPosterior(yReg, [[]])).toBeNull();
  });

  it('valid result has expected keys', () => {
    const r = normalInverseGammaPosterior(yReg, XReg);
    expectKeys(r, ['coefficients', 'sigma2', 'aStar', 'bStar', 'n', 'k']);
    expect(r.n).toBe(10);
    expect(r.k).toBe(1);
  });

  it('coefficients array has correct length', () => {
    const r = normalInverseGammaPosterior(yReg, XReg);
    expect(Array.isArray(r.coefficients)).toBe(true);
    expect(r.coefficients.length).toBe(1);
  });

  it('coefficients have posteriorMean, posteriorSD, credible95', () => {
    const r = normalInverseGammaPosterior(yReg, XReg);
    for (const c of r.coefficients) {
      expectKeys(c, ['posteriorMean', 'posteriorSD', 'credible95']);
      expect(Number.isFinite(c.posteriorMean)).toBe(true);
      expect(c.posteriorSD).toBeGreaterThan(0);
      expect(c.credible95[0]).toBeLessThanOrEqual(c.credible95[1]);
    }
  });

  it('sigma2 is positive', () => {
    const r = normalInverseGammaPosterior(yReg, XReg);
    expect(r.sigma2).toBeGreaterThan(0);
  });

  it('aStar and bStar are positive', () => {
    const r = normalInverseGammaPosterior(yReg, XReg);
    expect(r.aStar).toBeGreaterThan(0);
    expect(r.bStar).toBeGreaterThan(0);
  });
});

describe('betaBinomialPosterior', () => {
  it('returns null for successes > trials', () => {
    expect(betaBinomialPosterior(11, 10)).toBeNull();
  });

  it('returns null for negative successes', () => {
    expect(betaBinomialPosterior(-1, 10)).toBeNull();
  });

  it('returns null for trials < 1', () => {
    expect(betaBinomialPosterior(5, 0)).toBeNull();
    expect(betaBinomialPosterior(0, 0)).toBeNull();
  });

  it('returns null for non-finite inputs', () => {
    expect(betaBinomialPosterior(NaN, 10)).toBeNull();
    expect(betaBinomialPosterior(5, Infinity)).toBeNull();
  });

  it('valid result has expected keys', () => {
    const r = betaBinomialPosterior(7, 10);
    expectKeys(r, ['posteriorAlpha', 'posteriorBeta', 'posteriorMean', 'posteriorSD', 'credible95', 'successes', 'trials']);
    expect(r.successes).toBe(7);
    expect(r.trials).toBe(10);
  });

  it('posteriorAlpha equals priorAlpha + successes', () => {
    const r = betaBinomialPosterior(7, 10, 2, 3);
    expect(r.posteriorAlpha).toBeCloseTo(9, 4);
  });

  it('posteriorBeta equals priorBeta + (trials - successes)', () => {
    const r = betaBinomialPosterior(7, 10, 2, 3);
    expect(r.posteriorBeta).toBeCloseTo(6, 4);
  });

  it('credible95 values are within [0, 1]', () => {
    const r = betaBinomialPosterior(7, 10);
    expect(r.credible95[0]).toBeGreaterThanOrEqual(0);
    expect(r.credible95[1]).toBeLessThanOrEqual(1);
  });

  it('posteriorMean is between 0 and 1', () => {
    const r = betaBinomialPosterior(7, 10);
    expect(r.posteriorMean).toBeGreaterThan(0);
    expect(r.posteriorMean).toBeLessThan(1);
  });

  it('posteriorSD is positive', () => {
    const r = betaBinomialPosterior(7, 10);
    expect(r.posteriorSD).toBeGreaterThan(0);
  });

  it('works with successes = 0', () => {
    const r = betaBinomialPosterior(0, 10, 1, 1);
    expect(r).not.toBeNull();
    expect(r.posteriorAlpha).toBeCloseTo(1, 4);
    expect(r.posteriorBeta).toBeCloseTo(11, 4);
  });

  it('matches a scipy.stats.beta.ppf exact-quantile oracle (regression test for the normal-approximation-CI fix)', () => {
    // credible95 previously used a symmetric ±1.96·SD normal approximation,
    // measurably wrong for this skewed Beta(8,14) posterior.
    const e = bRef.betaBinomial_basic;
    const r = betaBinomialPosterior(e.successes, e.trials, e.priorAlpha, e.priorBeta);
    expect(r.posteriorMean).toBeCloseTo(e.posteriorMean, 6);
    expect(r.posteriorSD).toBeCloseTo(e.posteriorSD, 6);
    expect(r.credible95[0]).toBeCloseTo(e.credible95[0], 4);
    expect(r.credible95[1]).toBeCloseTo(e.credible95[1], 4);
  });
});

describe('gammaPoissonPosterior', () => {
  it('returns null for empty counts', () => {
    expect(gammaPoissonPosterior([])).toBeNull();
  });

  it('returns null for null input', () => {
    expect(gammaPoissonPosterior(null)).toBeNull();
  });

  it('valid result has expected keys', () => {
    const r = gammaPoissonPosterior(poissonCounts);
    expectKeys(r, ['posteriorShape', 'posteriorRate', 'posteriorMean', 'posteriorSD', 'credible95', 'n', 'sumX']);
    expect(r.n).toBe(12);
  });

  it('posteriorShape equals priorShape + sumX', () => {
    const sumX = poissonCounts.reduce((s, v) => s + v, 0);
    const r = gammaPoissonPosterior(poissonCounts, 2, 0.5);
    expect(r.posteriorShape).toBeCloseTo(2 + sumX, 4);
  });

  it('posteriorRate equals priorRate + n', () => {
    const r = gammaPoissonPosterior(poissonCounts, 2, 0.5);
    expect(r.posteriorRate).toBeCloseTo(0.5 + 12, 4);
  });

  it('sumX is stored correctly', () => {
    const sumX = poissonCounts.reduce((s, v) => s + v, 0);
    const r = gammaPoissonPosterior(poissonCounts);
    expect(r.sumX).toBe(sumX);
  });

  it('posteriorMean is positive', () => {
    const r = gammaPoissonPosterior(poissonCounts);
    expect(r.posteriorMean).toBeGreaterThan(0);
  });

  it('posteriorSD is positive', () => {
    const r = gammaPoissonPosterior(poissonCounts);
    expect(r.posteriorSD).toBeGreaterThan(0);
  });

  it('credible95 lo is non-negative', () => {
    const r = gammaPoissonPosterior(poissonCounts);
    expect(r.credible95[0]).toBeGreaterThanOrEqual(0);
    expect(r.credible95[1]).toBeGreaterThan(r.credible95[0]);
  });

  it('matches a scipy.stats.gamma.ppf exact-quantile oracle (regression test for the normal-approximation-CI fix)', () => {
    const e = bRef.gammaPoisson_basic;
    const r = gammaPoissonPosterior(e.counts, e.priorShape, e.priorRate);
    expect(r.posteriorMean).toBeCloseTo(e.posteriorMean, 6);
    expect(r.posteriorSD).toBeCloseTo(e.posteriorSD, 6);
    expect(r.credible95[0]).toBeCloseTo(e.credible95[0], 4);
    expect(r.credible95[1]).toBeCloseTo(e.credible95[1], 4);
  });
});

describe('dirichletMultinomialPosterior', () => {
  it('returns null for empty counts', () => {
    expect(dirichletMultinomialPosterior([])).toBeNull();
  });

  it('returns null for null input', () => {
    expect(dirichletMultinomialPosterior(null)).toBeNull();
  });

  it('returns null for priorAlpha length mismatch', () => {
    expect(dirichletMultinomialPosterior(dirichletCounts, [1, 1])).toBeNull();
  });

  it('valid result has expected keys', () => {
    const r = dirichletMultinomialPosterior(dirichletCounts);
    expectKeys(r, ['posteriorAlpha', 'posteriorMean', 'posteriorSD', 'k', 'sum']);
  });

  it('k equals number of categories', () => {
    const r = dirichletMultinomialPosterior(dirichletCounts);
    expect(r.k).toBe(3);
  });

  it('sum equals total count', () => {
    const r = dirichletMultinomialPosterior(dirichletCounts);
    expect(r.sum).toBe(10);
  });

  it('posteriorMean sums to approximately 1', () => {
    const r = dirichletMultinomialPosterior(dirichletCounts);
    const total = r.posteriorMean.reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it('posteriorAlpha equals counts plus priorAlpha', () => {
    const r = dirichletMultinomialPosterior(dirichletCounts, [2, 2, 2]);
    expect(r.posteriorAlpha[0]).toBe(7);
    expect(r.posteriorAlpha[1]).toBe(5);
    expect(r.posteriorAlpha[2]).toBe(4);
  });

  it('posteriorSD values are positive', () => {
    const r = dirichletMultinomialPosterior(dirichletCounts);
    for (const sd of r.posteriorSD) {
      expect(sd).toBeGreaterThan(0);
    }
  });

  it('posteriorAlpha and posteriorMean arrays have correct length', () => {
    const r = dirichletMultinomialPosterior(dirichletCounts);
    expect(r.posteriorAlpha.length).toBe(3);
    expect(r.posteriorMean.length).toBe(3);
    expect(r.posteriorSD.length).toBe(3);
  });
});

describe('bayesianLinearRegression', () => {
  it('returns null for invalid input', () => {
    expect(bayesianLinearRegression(null, XReg)).toBeNull();
    expect(bayesianLinearRegression([1], XReg)).toBeNull();
    expect(bayesianLinearRegression(yReg, null)).toBeNull();
    expect(bayesianLinearRegression(yReg, [[]])).toBeNull();
  });

  it('conjugate path has expected keys', () => {
    const r = bayesianLinearRegression(yReg, XReg);
    expectKeys(r, ['method', 'coefficients', 'sigma2', 'aStar', 'bStar', 'n', 'k', 'apa']);
    expect(r.method).toBe('conjugate (Normal-Inverse-Gamma)');
    expect(r.n).toBe(10);
    expect(r.k).toBe(1);
  });

  it('conjugate coefficients have posteriorMean', () => {
    const r = bayesianLinearRegression(yReg, XReg);
    expect(r.coefficients.length).toBe(1);
    expect(Number.isFinite(r.coefficients[0].posteriorMean)).toBe(true);
    expect(r.coefficients[0].posteriorSD).toBeGreaterThan(0);
  });

  it('conjugate sigma2 is positive', () => {
    const r = bayesianLinearRegression(yReg, XReg);
    expect(r.sigma2).toBeGreaterThan(0);
  });

  it('conjugate returns apa string', () => {
    const r = bayesianLinearRegression(yReg, XReg);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

describe('bmaRegression', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ y: i * 2, x1: i, x2: i * 0.5, x3: i % 3 });
  it('contract keys', () => { const r = bmaRegression(d, 'y', ['x1', 'x2', 'x3'], { nModels: 4 }); if (r) expectKeys(r, ['test', 'models', 'nModels', 'n', 'apa']); });
  it('models > 0', () => { const r = bmaRegression(d, 'y', ['x1', 'x2', 'x3'], { nModels: 4 }); if (r) expect(r.models.length).toBeGreaterThan(0); });
  it('n matches data length', () => { const r = bmaRegression(d, 'y', ['x1', 'x2', 'x3'], { nModels: 4 }); if (r) expect(r.n).toBe(20); });
});

describe('posteriorInclusionProbs', () => {
  const bma = { models: [{ vars: ['x1', 'x2'], weight: 0.7 }, { vars: ['x1'], weight: 0.3 }] };
  it('contract keys', () => expectKeys(posteriorInclusionProbs(bma), ['test', 'pips', 'apa']));
  it('PIP for x1 > PIP for x2', () => { const r = posteriorInclusionProbs(bma); const x1 = r.pips.find(p => p.variable === 'x1'); const x2 = r.pips.find(p => p.variable === 'x2'); expect(x1.pip).toBeGreaterThan(x2.pip); });
  it('pip values are between 0 and 1', () => { const r = posteriorInclusionProbs(bma); r.pips.forEach(p => { expect(p.pip).toBeGreaterThanOrEqual(0); expect(p.pip).toBeLessThanOrEqual(1); }); });
});

describe('bmaPredict', () => {
  const bma = { models: [{ vars: ['x1'], beta: [2], weight: 0.8 }, { vars: ['x1', 'x2'], beta: [1.5, 0.5], weight: 0.2 }] };
  it('contract keys', () => expectKeys(bmaPredict(bma, { x1: 3, x2: 4 }), ['test', 'prediction', 'apa']));
  it('predictions array', () => { const r = bmaPredict(bma, { x1: 3, x2: 4 }); if (r) expect(Number.isFinite(r.prediction)).toBe(true); });
  it('returns null for null bma or missing models', () => { expect(bmaPredict(null, { x1: 3 })).toBeNull(); expect(bmaPredict({}, { x1: 3 })).toBeNull(); });
});

describe('bmaSummary', () => {
  const bma = { models: [{ vars: ['x1', 'x2'], weight: 0.7, beta: [1.5, 0.5] }, { vars: ['x1'], weight: 0.3, beta: [2] }] };
  it('contract keys', () => expectKeys(bmaSummary(bma), ['test', 'coefficients', 'apa']));
  it('coefficients non-empty', () => { const r = bmaSummary(bma); if (r) expect(r.coefficients.length).toBeGreaterThan(0); });
  it('coefficients have postMean and pip', () => { const r = bmaSummary(bma); if (r && r.coefficients) r.coefficients.forEach(c => { expect(Number.isFinite(c.postMean)).toBe(true); expect(c.pip).toBeGreaterThanOrEqual(0); expect(c.pip).toBeLessThanOrEqual(1); }); });
});

describe('bayesianLinearRegression MCMC', () => {
  it('MCMC coefficients have credible95', () => {
    const r = bayesianLinearRegression(yReg, XReg, { nIter: 200, nBurnin: 20 });
    expect(r.coefficients.length).toBe(1);
    expect(Array.isArray(r.coefficients[0].credible95)).toBe(true);
    expect(r.coefficients[0].credible95.length).toBe(2);
    expect(r.coefficients[0].credible95[0]).toBeLessThanOrEqual(r.coefficients[0].credible95[1]);
  });

  it('MCMC acceptRate between 0 and 1', () => {
    const r = bayesianLinearRegression(yReg, XReg, { nIter: 200, nBurnin: 20 });
    expect(r.acceptRate).toBeGreaterThanOrEqual(0);
    expect(r.acceptRate).toBeLessThanOrEqual(1);
  });

  it('MCMC returns apa string', () => {
    const r = bayesianLinearRegression(yReg, XReg, { nIter: 200, nBurnin: 20 });
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });

  it('MCMC with multiple predictors uses multivariate BLM path', () => {
    const Xmulti = Array.from({ length: 20 }, (_, i) => [i, i * 0.5 + 0.1]);
    const yMulti = Xmulti.map(([a, b]) => 3 + 2 * a + 1.5 * b);
    const r = bayesianLinearRegression(yMulti, Xmulti, { nIter: 200, nBurnin: 20 });
    expect(r).not.toBeNull();
    expect(r.method).toBe('MCMC (adaptive Metropolis-Hastings)');
    expect(r.coefficients.length).toBe(2);
  });
});

describe('mcmc adaptive proposal', () => {
  it('uses adaptive proposal with sufficient burnin and multiple params', () => {
    const lp = (p) => -(p[0] * p[0] + p[1] * p[1]);
    const r = mcmc(lp, [0, 0], { nIter: 500, nBurnin: 100 });
    expect(r.chains).toHaveLength(2);
    expect(r.acceptRate).toBeGreaterThan(0);
    expect(r.acceptRate).toBeLessThan(1);
  });
});

describe('bicBayesFactor', () => {
  it('returns null for non-finite logLik0', () => {
    expect(bicBayesFactor(NaN, -140, 100, 2, 3)).toBeNull();
    expect(bicBayesFactor(Infinity, -140, 100, 2, 3)).toBeNull();
  });

  it('returns null for non-finite logLik1', () => {
    expect(bicBayesFactor(-150, NaN, 100, 2, 3)).toBeNull();
    expect(bicBayesFactor(-150, -Infinity, 100, 2, 3)).toBeNull();
  });

  it('returns null for n < 2', () => {
    expect(bicBayesFactor(-150, -140, 1, 2, 3)).toBeNull();
    expect(bicBayesFactor(-150, -140, 0, 2, 3)).toBeNull();
  });

  it('valid result has expected keys', () => {
    const r = bicBayesFactor(-150, -140, 100, 2, 3);
    expectKeys(r, ['test', 'BF10', 'logBF10', 'BIC0', 'BIC1', 'interpretation', 'apa']);
  });

  it('BIC0 and BIC1 are finite', () => {
    const r = bicBayesFactor(-150, -140, 100, 2, 3);
    expect(Number.isFinite(r.BIC0)).toBe(true);
    expect(Number.isFinite(r.BIC1)).toBe(true);
  });

  it('BF10 > 1 when H1 is better', () => {
    const r = bicBayesFactor(-150, -140, 100, 2, 3);
    expect(r.BF10).toBeGreaterThan(1);
  });

  it('BF10 < 1 when H0 is better', () => {
    const r = bicBayesFactor(-140, -150, 100, 2, 3);
    expect(r.BF10).toBeLessThan(1);
  });

  it('interpretation is a non-empty string', () => {
    const r = bicBayesFactor(-150, -140, 100, 2, 3);
    expect(typeof r.interpretation).toBe('string');
    expect(r.interpretation.length).toBeGreaterThan(0);
  });

  it('test label is correct', () => {
    const r = bicBayesFactor(-150, -140, 100, 2, 3);
    expect(r.test).toBe('Bayes Factor (BIC approximation)');
  });

  it('BF10 is positive', () => {
    const r = bicBayesFactor(-150, -140, 100, 2, 3);
    expect(r.BF10).toBeGreaterThan(0);
  });

  it('logBF10 is finite', () => {
    const r = bicBayesFactor(-150, -140, 100, 2, 3);
    expect(Number.isFinite(r.logBF10)).toBe(true);
  });
});

describe('savageDickeyBF', () => {
  const mcResult = mcmc(lpFn, [0, 0], { nIter: 200, nBurnin: 20 });
  const chain = mcResult.chains[0];

  it('returns null for small chain', () => {
    expect(savageDickeyBF([1, 2, 3], 0, priorFn)).toBeNull();
  });

  it('returns null when no priorDensityFn', () => {
    expect(savageDickeyBF(chain, 0, null)).toBeNull();
    expect(savageDickeyBF(chain, 0, undefined)).toBeNull();
  });

  it('returns null when priorDensity is zero', () => {
    expect(savageDickeyBF(chain, 0, () => 0)).toBeNull();
  });

  it('returns null when chain is null', () => {
    expect(savageDickeyBF(null, 0, priorFn)).toBeNull();
  });

  it('valid result has expected keys', () => {
    const r = savageDickeyBF(chain, 0, priorFn);
    expectKeys(r, ['test', 'BF10', 'logBF10', 'priorDensity', 'posteriorDensity', 'interpretation', 'apa']);
  });

  it('BF10 is finite and positive', () => {
    const r = savageDickeyBF(chain, 0, priorFn);
    expect(r.BF10).toBeGreaterThan(0);
    expect(Number.isFinite(r.BF10)).toBe(true);
  });

  it('priorDensity and posteriorDensity are positive', () => {
    const r = savageDickeyBF(chain, 0, priorFn);
    expect(r.priorDensity).toBeGreaterThan(0);
    expect(r.posteriorDensity).toBeGreaterThan(0);
  });

  it('interpretation is a non-empty string', () => {
    const r = savageDickeyBF(chain, 0, priorFn);
    expect(typeof r.interpretation).toBe('string');
    expect(r.interpretation.length).toBeGreaterThan(0);
  });

  it('test label is correct', () => {
    const r = savageDickeyBF(chain, 0, priorFn);
    expect(r.test).toBe('Bayes Factor (Savage-Dickey)');
  });

  it('logBF10 equals log of BF10 approximately', () => {
    const r = savageDickeyBF(chain, 0, priorFn);
    expect(r.logBF10).toBeCloseTo(Math.log(r.BF10 + 1e-10), 1);
  });
});

describe('bayesianLogisticRegression', () => {
  it('returns null for y length < 10', () => {
    expect(bayesianLogisticRegression([0, 1, 0, 1], XBin)).toBeNull();
  });

  it('returns null for y with non-binary values', () => {
    const badY = [0, 0.5, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0];
    expect(bayesianLogisticRegression(badY, XBin)).toBeNull();
  });

  it('returns null for null y or X', () => {
    expect(bayesianLogisticRegression(null, XBin)).toBeNull();
    expect(bayesianLogisticRegression(yBin, null)).toBeNull();
  });

  it('returns null when X has empty rows', () => {
    expect(bayesianLogisticRegression(yBin, [[]])).toBeNull();
  });

  it('valid result has expected keys', () => {
    const r = bayesianLogisticRegression(yBin, XBin, { nIter: 200, nBurnin: 20 });
    expectKeys(r, ['method', 'coefficients', 'acceptRate', 'nIter', 'nBurnin', 'n', 'k', 'apa']);
    expect(r.n).toBe(12);
    expect(r.nIter).toBe(200);
    expect(r.nBurnin).toBe(20);
  });

  it('coefficients array has correct length (k + 1)', () => {
    const r = bayesianLogisticRegression(yBin, XBin, { nIter: 200, nBurnin: 20 });
    expect(r.coefficients.length).toBeGreaterThanOrEqual(2);
    expect(r.k).toBe(2);
  });

  it('coefficients have posteriorMean, posteriorSD, posteriorMedian, credible95', () => {
    const r = bayesianLogisticRegression(yBin, XBin, { nIter: 200, nBurnin: 20 });
    for (const c of r.coefficients) {
      expect(Number.isFinite(c.posteriorMean)).toBe(true);
      expect(c.posteriorSD).toBeGreaterThan(0);
      expect(Number.isFinite(c.posteriorMedian)).toBe(true);
      if (c.credible95) {
        expect(c.credible95.length).toBe(2);
        expect(c.credible95[0]).toBeLessThanOrEqual(c.credible95[1]);
      }
    }
  });

  it('acceptRate between 0 and 1', () => {
    const r = bayesianLogisticRegression(yBin, XBin, { nIter: 200, nBurnin: 20 });
    expect(r.acceptRate).toBeGreaterThanOrEqual(0);
    expect(r.acceptRate).toBeLessThanOrEqual(1);
  });

  it('method is correct', () => {
    const r = bayesianLogisticRegression(yBin, XBin, { nIter: 200, nBurnin: 20 });
    expect(r.method).toBe('MCMC (logistic)');
  });

  it('apa is a non-empty string', () => {
    const r = bayesianLogisticRegression(yBin, XBin, { nIter: 200, nBurnin: 20 });
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

describe('bayesianPoissonRegression', () => {
  it('returns null for y length < 10', () => {
    expect(bayesianPoissonRegression([2, 3, 4], XPois)).toBeNull();
  });

  it('returns null for null y or X', () => {
    expect(bayesianPoissonRegression(null, XPois)).toBeNull();
    expect(bayesianPoissonRegression(yPois, null)).toBeNull();
  });

  it('returns null when X has empty rows', () => {
    expect(bayesianPoissonRegression(yPois, [[]])).toBeNull();
  });

  it('valid result has expected keys', () => {
    const r = bayesianPoissonRegression(yPois, XPois, { nIter: 200, nBurnin: 20 });
    expectKeys(r, ['method', 'coefficients', 'acceptRate', 'nIter', 'nBurnin', 'n', 'k', 'apa']);
    expect(r.n).toBe(12);
    expect(r.nIter).toBe(200);
    expect(r.nBurnin).toBe(20);
  });

  it('coefficients array has correct length (k + 1)', () => {
    const r = bayesianPoissonRegression(yPois, XPois, { nIter: 200, nBurnin: 20 });
    expect(r.coefficients.length).toBeGreaterThanOrEqual(2);
    expect(r.k).toBe(2);
  });

  it('coefficients have posteriorMean, posteriorSD, posteriorMedian, credible95', () => {
    const r = bayesianPoissonRegression(yPois, XPois, { nIter: 200, nBurnin: 20 });
    for (const c of r.coefficients) {
      expect(Number.isFinite(c.posteriorMean)).toBe(true);
      expect(c.posteriorSD).toBeGreaterThan(0);
      expect(Number.isFinite(c.posteriorMedian)).toBe(true);
      if (c.credible95) {
        expect(c.credible95.length).toBe(2);
        expect(c.credible95[0]).toBeLessThanOrEqual(c.credible95[1]);
      }
    }
  });

  it('acceptRate between 0 and 1', () => {
    const r = bayesianPoissonRegression(yPois, XPois, { nIter: 200, nBurnin: 20 });
    expect(r.acceptRate).toBeGreaterThanOrEqual(0);
    expect(r.acceptRate).toBeLessThanOrEqual(1);
  });

  it('method is correct', () => {
    const r = bayesianPoissonRegression(yPois, XPois, { nIter: 200, nBurnin: 20 });
    expect(r.method).toBe('MCMC (Poisson)');
  });

  it('apa is a non-empty string', () => {
    const r = bayesianPoissonRegression(yPois, XPois, { nIter: 200, nBurnin: 20 });
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

describe('waic', () => {
  it('returns null for invalid input', () => {
    expect(waic(null, () => 0, 10)).toBeNull();
    expect(waic({ chains: [] }, () => 0, 10)).toBeNull();
  });

  it('returns valid WAIC from MCMC chains', () => {
    const lp = (theta) => -0.5 * (theta[0] * theta[0] + theta[1] * theta[1]);
    const r = mcmc(lp, [0, 0], { nIter: 300, nBurnin: 50 });
    const logLikFn = (i, params) => -0.5 * (params[0] * params[0] + params[1] * params[1]);
    const w = waic(r, logLikFn, 20);
    expect(w).not.toBeNull();
    expectKeys(w, ['waic', 'pWAIC', 'lppd', 'n', 's', 'apa']);
    expect(w.pWAIC).toBeGreaterThan(0);
    expect(w.s).toBeGreaterThan(0);
  });

  it('waic is finite', () => {
    const lp = (theta) => -0.5 * (theta[0] * theta[0] + theta[1] * theta[1]);
    const r = mcmc(lp, [0, 0], { nIter: 300, nBurnin: 50 });
    const logLikFn = (i, params) => -0.5 * (params[0] * params[0] + params[1] * params[1]);
    const w = waic(r, logLikFn, 20);
    if (w) expect(Number.isFinite(w.waic)).toBe(true);
  });
});

describe('bayesianANOVA', () => {
  it('returns null for single group', () => {
    expect(bayesianANOVA([[1, 2, 3]])).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(bayesianANOVA(null)).toBeNull();
  });

  it('produces posterior summaries for 2 groups', () => {
    const g1 = [1.2, 1.4, 1.8, 2.0, 1.6, 1.9, 1.5, 1.7, 1.8, 1.6];
    const g2 = [2.5, 2.8, 3.0, 3.2, 2.7, 3.1, 2.9, 3.3, 2.6, 2.8];
    const r = bayesianANOVA([g1, g2], { nIter: 300, nBurnin: 50 });
    expect(r).not.toBeNull();
    expect(r.J).toBe(2);
    expect(r.groupMeans.length).toBe(2);
    expect(r.tau).toBeGreaterThan(0);
    expect(r.sigma).toBeGreaterThan(0);
    expect(r.acceptRate).toBeGreaterThan(0);
    expect(r.acceptRate).toBeLessThan(1);
  });

  it('produces posterior summaries for 3 groups', () => {
    const g1 = [1.1, 1.3, 1.5, 1.4, 1.6];
    const g2 = [2.1, 2.3, 2.5, 2.4, 2.6];
    const g3 = [3.1, 3.3, 3.5, 3.4, 3.6];
    const r = bayesianANOVA([g1, g2, g3], { nIter: 300, nBurnin: 50 });
    expect(r).not.toBeNull();
    expect(r.J).toBe(3);
    expect(r.groupMeans.length).toBe(3);
    expect(r.groupMeans[0]).toBeLessThan(r.groupMeans[2]);
  });
});

describe('bayesianMixedModel', () => {
  it('returns null for invalid input', () => {
    expect(bayesianMixedModel(null, [[1]], [0])).toBeNull();
    expect(bayesianMixedModel([1, 2], [[1], [2]], [0, 0], { nIter: 200, nBurnin: 20 })).toBeNull();
  });

  it('fits random intercept model with predictors', () => {
    const y = [];
    const X = [];
    const g = [];
    for (let j = 0; j < 3; j++) {
      for (let i = 0; i < 15; i++) {
        y.push(2.0 + j * 1.5 + i * 0.1 + (Math.random() - 0.5) * 0.3);
        X.push([i * 0.1]);
        g.push(j);
      }
    }
    const r = bayesianMixedModel(y, X, g, { nIter: 300, nBurnin: 50 });
    expect(r).not.toBeNull();
    expect(r.test).toBe('Bayesian Mixed Model (RI)');
    expect(r.coefficients.length).toBe(1);
    expect(r.tau).toBeGreaterThan(0);
    expect(r.sigma).toBeGreaterThan(0);
    expect(r.acceptRate).toBeGreaterThan(0);
  });

  it('coefficients have posteriorMean and posteriorSD', () => {
    const y = []; const X = [];
    for (let j = 0; j < 3; j++) for (let i = 0; i < 15; i++) { y.push(2.0 + j * 1.5 + i * 0.1); X.push([i * 0.1]); }
    const g = Array.from({ length: 45 }, (_, i) => Math.floor(i / 15));
    const r = bayesianMixedModel(y, X, g, { nIter: 300, nBurnin: 50 });
    if (r && r.coefficients) {
      r.coefficients.forEach(c => {
        expect(Number.isFinite(c.posteriorMean)).toBe(true);
        expect(c.posteriorSD).toBeGreaterThan(0);
      });
    }
  });
});

// ── JZS Bayes Factor t-test ────────────────────────────────────────────────
describe('jszBayesFactorT', () => {
  const a = [10, 11, 12, 10.5, 9.8, 10.2, 11.1];
  const b = [14, 13, 14.5, 14.2, 13.8, 15, 13.5];

  it('returns null for small groups', () => {
    expect(jszBayesFactorT(null, b)).toBeNull();
    expect(jszBayesFactorT([1], b)).toBeNull();
  });

  it('BF > 1 for separated groups', () => {
    const r = jszBayesFactorT(a, b);
    expect(r.bf10).toBeGreaterThan(1);
  });

  it('BF ≈ 1 for identical arrays', () => {
    const r = jszBayesFactorT(a, a);
    expect(r.bf10).toBeLessThan(2);
  });

  it('contract keys', () => {
    expectKeys(jszBayesFactorT(a, b), ['test', 'bf10', 'bf01', 't', 'nEff', 'r', 'label', 'apa']);
  });

  it('bf01 = 1 / bf10', () => {
    const r = jszBayesFactorT(a, b);
    expect(r.bf01).toBeCloseTo(1 / r.bf10, 2);
  });

  it('apa is a non-empty string', () => {
    const r = jszBayesFactorT(a, b);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── Bayesian DIC ────────────────────────────────────────────────────────────
describe('bayesianDIC', () => {
  it('returns null for invalid', () => {
    expect(bayesianDIC(NaN, 2)).toBeNull();
    expect(bayesianDIC(-10, -1)).toBeNull();
  });

  it('returns DIC without samples', () => {
    const r = bayesianDIC(-50, 3);
    expect(r.dic).toBeGreaterThan(0);
    expect(r.pd).toBeGreaterThan(0);
  });

  it('returns DIC with posterior samples', () => {
    const logLikFn = (params) => -10 - params[0] ** 2;
    const samples = [[0], [0.1], [-0.1], [0.2], [-0.2]];
    const r = bayesianDIC(logLikFn, 1, samples);
    expect(Number.isFinite(r.dic)).toBe(true);
    expect(r.pd).toBeGreaterThanOrEqual(0);
  });

  it('contract keys', () => {
    expectKeys(bayesianDIC(-50, 3), ['test', 'dic', 'pd', 'meanDeviance', 'dicAlt', 'apa']);
  });
});

// ── Posterior Predictive Check ──────────────────────────────────────────────
describe('posteriorPredictiveCheck', () => {
  const yObs = [1.2, 0.8, 1.5, 1.1, 0.9, 1.3, 1.0, 1.4, 0.7, 1.6];
  const yRep = Array.from({ length: 20 }, () => yObs.map(v => v + (Math.sin(v * 7) * 0.3)));

  it('returns null for invalid', () => {
    expect(posteriorPredictiveCheck(null, yRep)).toBeNull();
    expect(posteriorPredictiveCheck(yObs, [[1, 2]])).toBeNull();
  });

  it('ppp in [0,1]', () => {
    const r = posteriorPredictiveCheck(yObs, yRep);
    expect(r.ppp).toBeGreaterThanOrEqual(0);
    expect(r.ppp).toBeLessThanOrEqual(1);
  });

  it('contract keys', () => {
    expectKeys(posteriorPredictiveCheck(yObs, yRep), ['test', 'stat', 'ppp', 'obsStat', 'repStats', 'nRep', 'apa']);
  });

  it('apa is a non-empty string', () => {
    const r = posteriorPredictiveCheck(yObs, yRep);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});
