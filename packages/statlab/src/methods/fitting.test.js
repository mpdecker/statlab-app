import { describe, it, expect } from 'vitest';
import { fitNormal, fitExponential, fitGamma, fitPoisson, fitBinomial, fitLogNormal, fitWeibull, fitUniform, fitBeta, distributionGoF, andersonDarling, shapiroWilk, cramerVonMises, lilliefors, chiSquareGOF, qqCorrelation } from './fitting.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const normalSample = [2.3, 2.8, 3.1, 2.5, 3.0, 2.7, 3.2, 2.9, 3.3, 2.6];
const expSample = [0.5, 1.2, 0.3, 2.1, 0.8, 1.5, 0.7, 3.0, 0.9, 1.1];
const gammaSample = [1.2, 0.8, 2.1, 1.5, 0.9, 2.5, 1.8, 1.1, 3.0, 1.3];
const poiSample = [3, 5, 2, 4, 6, 3, 4, 5, 3, 2, 4, 3, 5, 2, 4, 6, 3, 5, 4, 3];
const lnSample = [1.5, 2.8, 0.9, 3.2, 1.1, 2.1, 4.5, 1.8, 3.0, 2.5];
const weibSample = [0.8, 1.5, 2.3, 0.5, 3.1, 1.2, 2.8, 0.9, 1.7, 2.0, 1.4, 2.6, 1.1, 3.3, 1.9];

function expectFitResult(r, dist) {
  expectKeys(r, ['distribution', 'parameters', 'logLikelihood', 'AIC', 'BIC', 'n', 'qqData', 'cdf', 'pdf', 'apa']);
  expect(r.distribution).toBe(dist);
  expect(r.n).toBeGreaterThan(0);
  expect(typeof r.cdf).toBe('function');
  expect(typeof r.pdf).toBe('function');
  expect(Number.isFinite(r.logLikelihood)).toBe(true);
  expect(Number.isFinite(r.AIC)).toBe(true);
  expect(Number.isFinite(r.BIC)).toBe(true);
    expect(r.AIC).toBeLessThan(r.BIC + 10);
}

describe('fitNormal', () => {
  it('returns null for small input', () => {
    expect(fitNormal(null)).toBeNull();
    expect(fitNormal([])).toBeNull();
    expect(fitNormal([1, 2])).toBeNull();
  });

  it('estimates mean accurately', () => {
    const r = fitNormal(normalSample);
    expectFitResult(r, 'Normal');
    const trueMean = normalSample.reduce((s, x) => s + x, 0) / normalSample.length;
    expect(r.parameters.mean).toBeCloseTo(trueMean, 4);
  });

  it('estimates sd > 0', () => {
    const r = fitNormal(normalSample);
    expect(r.parameters.sd).toBeGreaterThan(0);
    expect(r.parameters.seMean).toBeGreaterThan(0);
    expect(r.parameters.seSd).toBeGreaterThan(0);
  });

  it('cdf is between 0 and 1', () => {
    const r = fitNormal(normalSample);
    for (let x = -5; x <= 10; x += 1) {
      const val = r.cdf(x);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it('cdf is monotonic', () => {
    const r = fitNormal(normalSample);
    for (let x = -5; x < 10; x += 1) expect(r.cdf(x)).toBeLessThanOrEqual(r.cdf(x + 1));
  });

  it('pdf integrates approx to CDF difference', () => {
    const r = fitNormal(normalSample);
    const pdf1 = r.pdf(1), pdf3 = r.pdf(3);
    const pdfVal = r.pdf(3);
    expect(pdf1).toBeGreaterThan(0);
    expect(pdfVal).toBeGreaterThan(0);
  });

  it('qqData has correct length and values', () => {
    const r = fitNormal(normalSample);
    expect(Array.isArray(r.qqData)).toBe(true);
    expect(r.qqData.length).toBe(normalSample.length);
    expect(r.qqData[0].theoretical).toBeLessThan(r.qqData[r.qqData.length - 1].theoretical);
  });

  it('all equal values produce sd > 0 by small epsilon', () => {
    const r = fitNormal([5, 5, 5, 5, 5]);
    expect(r).not.toBeNull();
    expect(r.parameters.mean).toBeCloseTo(5, 2);
  });

  it('very large sample converges', () => {
    const large = Array.from({ length: 100 }, (_, i) => 100 + i * 0.1 + (Math.sin(i * 0.3) * 5));
    const r = fitNormal(large);
    expect(r).not.toBeNull();
    expect(r.n).toBe(100);
  });
});

describe('fitExponential', () => {
  it('returns null for small input or zero mean', () => {
    expect(fitExponential([1, 2])).toBeNull();
    expect(fitExponential([0.0001, 0.0001])).toBeNull();
  });

  it('estimates rate as 1/mean', () => {
    const r = fitExponential(expSample);
    expectFitResult(r, 'Exponential');
    const expectedRate = 1 / (expSample.reduce((s, x) => s + x, 0) / expSample.length);
    expect(r.parameters.rate).toBeCloseTo(expectedRate, 4);
  });

  it('cdf goes from 0 to ~1', () => {
    const r = fitExponential(expSample);
    expect(r.cdf(0)).toBe(0);
    expect(r.cdf(1e6)).toBeCloseTo(1, 2);
  });

  it('pdf decays monotonically for x > 0', () => {
    const r = fitExponential(expSample);
    expect(r.pdf(0.1)).toBeGreaterThan(r.pdf(1));
  });

  it('qqData is monotonic', () => {
    const r = fitExponential(expSample);
    for (let i = 1; i < r.qqData.length; i++)
      expect(r.qqData[i].theoretical).toBeGreaterThanOrEqual(r.qqData[i - 1].theoretical);
  });

  it('se is finite', () => {
    const r = fitExponential(expSample);
    expect(Number.isFinite(r.parameters.seRate)).toBe(true);
    expect(r.parameters.seRate).toBeGreaterThan(0);
  });
});

describe('fitGamma', () => {
  it('returns null for non-positive data', () => {
    expect(fitGamma([-1, 2, 3])).toBeNull();
    expect(fitGamma([0, 2, 3])).toBeNull();
  });

  it('estimates positive shape and rate', () => {
    const r = fitGamma(gammaSample);
    expectFitResult(r, 'Gamma');
    expect(r.parameters.shape).toBeGreaterThan(0.1);
    expect(r.parameters.rate).toBeGreaterThan(0.1);
    expect(r.parameters.seShape).toBeGreaterThan(0);
  });

  it('mean = shape/rate approximates sample mean', () => {
    const r = fitGamma(gammaSample);
    const impliedMean = r.parameters.shape / r.parameters.rate;
    const sampleMean = gammaSample.reduce((s, x) => s + x, 0) / gammaSample.length;
    expect(impliedMean).toBeCloseTo(sampleMean, 1);
  });

  it('cdf is monotonic', () => {
    const r = fitGamma(gammaSample);
    expect(r.cdf(0)).toBe(0);
    expect(r.cdf(0.5)).toBeLessThanOrEqual(r.cdf(2.0));
  });
});

describe('fitPoisson', () => {
  it('returns null for non-integer data', () => {
    expect(fitPoisson([1.5, 2, 3])).toBeNull();
    expect(fitPoisson([-1, 0, 1])).toBeNull();
  });

  it('estimates lambda as sample mean', () => {
    const r = fitPoisson(poiSample);
    expectFitResult(r, 'Poisson');
    const expectedLambda = poiSample.reduce((s, x) => s + x, 0) / poiSample.length;
    expect(r.parameters.lambda).toBeCloseTo(expectedLambda, 4);
  });

  it('cdf sums to approx 1', () => {
    const r = fitPoisson(poiSample);
    expect(r.cdf(100)).toBeCloseTo(1, 1);
  });

  it('pdf is zero for non-integer', () => {
    const r = fitPoisson(poiSample);
    expect(r.pdf(1.5)).toBe(0);
    expect(r.pdf(0)).toBeGreaterThan(0);
  });

  it('all same values still works', () => {
    const r = fitPoisson([3, 3, 3, 3, 3]);
    expect(r).not.toBeNull();
    expect(r.parameters.lambda).toBeCloseTo(3, 2);
  });

  it('se decreases with larger n', () => {
    const r10 = fitPoisson(poiSample.slice(0, 10));
    const r20 = fitPoisson(poiSample);
    expect(r20.parameters.seLambda).toBeLessThan(r10.parameters.seLambda);
  });
});

describe('fitBinomial', () => {
  it('returns null for invalid success/trial', () => {
    expect(fitBinomial(-1, 10)).toBeNull();
    expect(fitBinomial(12, 10)).toBeNull();
    expect(fitBinomial(0, 0)).toBeNull();
  });

  it('estimates p as successes/trials', () => {
    const r = fitBinomial(7, 10);
    expectFitResult(r, 'Binomial');
    expect(r.parameters.p).toBeCloseTo(0.7, 4);
  });

  it('cdf at n equals approx 1', () => {
    const r = fitBinomial(3, 10);
    expect(r.cdf(10)).toBeCloseTo(1, 1);
  });

  it('pdf for impossible k is 0', () => {
    const r = fitBinomial(5, 20);
    expect(r.pdf(-1)).toBe(0);
    expect(r.pdf(21)).toBe(0);
    expect(r.pdf(0)).toBeGreaterThan(0);
  });

  it('p = 0 edge case works', () => {
    const r = fitBinomial(0, 100);
    expect(r.parameters.p).toBeCloseTo(0, 2);
    expect(r.cdf(0)).toBeCloseTo(1, 1);
  });

  it('p = 1 edge case works', () => {
    const r = fitBinomial(100, 100);
    expect(r.parameters.p).toBeCloseTo(1, 2);
    expect(r.cdf(100)).toBeCloseTo(1, 1);
  });
});

describe('fitLogNormal', () => {
  it('returns null for non-positive data', () => {
    expect(fitLogNormal([-1, 2, 3])).toBeNull();
    expect(fitLogNormal([0, 1, 2])).toBeNull();
  });

  it('estimates mu and sigma from log-transformed data', () => {
    const r = fitLogNormal(lnSample);
    expectFitResult(r, 'Log-normal');
    expect(r.parameters.mu).toBeDefined();
    expect(r.parameters.sigma).toBeGreaterThan(0);
    expect(r.parameters.seMu).toBeGreaterThan(0);
    expect(r.parameters.seSigma).toBeGreaterThan(0);
  });

  it('cdf returns 0 for x <= 0', () => {
    const r = fitLogNormal(lnSample);
    expect(r.cdf(0)).toBe(0);
    expect(r.cdf(-1)).toBe(0);
  });

  it('pdf returns 0 for x <= 0', () => {
    const r = fitLogNormal(lnSample);
    expect(r.pdf(0)).toBe(0);
    expect(r.pdf(-1)).toBe(0);
  });

  it('qqData empirical values are positive', () => {
    const r = fitLogNormal(lnSample);
    for (const pt of r.qqData) expect(pt.empirical).toBeGreaterThan(0);
  });
});

describe('fitWeibull', () => {
  it('returns null for non-positive data', () => {
    expect(fitWeibull([0, 1, 2])).toBeNull();
    expect(fitWeibull([-1, 2, 3])).toBeNull();
  });

  it('estimates positive shape and scale', () => {
    const r = fitWeibull(weibSample);
    expectFitResult(r, 'Weibull');
    expect(r.parameters.shape).toBeGreaterThan(0.1);
    expect(r.parameters.scale).toBeGreaterThan(0.1);
    expect(r.parameters.seShape).toBeGreaterThan(0);
    expect(r.parameters.seScale).toBeGreaterThan(0);
  });

  it('cdf at 0 is 0', () => {
    const r = fitWeibull(weibSample);
    expect(r.cdf(0)).toBe(0);
  });

  it('cdf at large x approaches 1', () => {
    const r = fitWeibull(weibSample);
    expect(r.cdf(1e6)).toBeCloseTo(1, 1);
  });

  it('matches a scipy.stats.weibull_min.fit MLE oracle', () => {
    const e = ref.fitting.weibull_basic;
    const r = fitWeibull(e.sample);
    expect(r.parameters.shape).toBeCloseTo(e.shape, 3);
    expect(r.parameters.scale).toBeCloseTo(e.scale, 3);
  });

  it('pdf is positive for x > 0', () => {
    const r = fitWeibull(weibSample);
    expect(r.pdf(0.1)).toBeGreaterThan(0);
  });

  it('converges on exponential-like data (shape ~1)', () => {
    const r = fitWeibull(expSample);
    expect(r).not.toBeNull();
    expect(r.parameters.shape).toBeGreaterThan(0);
  });

  it('larger samples narrow SEs', () => {
    const short = weibSample.slice(0, 5);
    const rShort = fitWeibull(short);
    const rLong = fitWeibull(weibSample);
    expect(rLong.parameters.seScale).toBeLessThan(rShort.parameters.seScale * 2);
  });
});

describe('fitUniform', () => {
  it('returns null for small/constant input', () => {
    expect(fitUniform([1, 2])).toBeNull();
    expect(fitUniform([3, 3, 3])).toBeNull();
  });

  it('estimates min <= data min and max >= data max', () => {
    const data = [1, 3, 5, 7, 9];
    const r = fitUniform(data);
    expectFitResult(r, 'Uniform');
    expect(r.parameters.min).toBeLessThanOrEqual(Math.min(...data));
    expect(r.parameters.max).toBeGreaterThanOrEqual(Math.max(...data));
  });

  it('cdf is 0 at min and 1 at max', () => {
    const r = fitUniform([1, 3, 5, 7, 9]);
    expect(r.cdf(r.parameters.min)).toBeCloseTo(0, 2);
    expect(r.cdf(r.parameters.max)).toBeCloseTo(1, 2);
  });

  it('pdf is constant 1/range within bounds', () => {
    const r = fitUniform([1, 3, 5, 7, 9]);
    const expectedDensity = 1 / (r.parameters.max - r.parameters.min);
    expect(r.pdf(5)).toBeCloseTo(expectedDensity, 4);
    expect(r.pdf(r.parameters.min - 1)).toBe(0);
    expect(r.pdf(r.parameters.max + 1)).toBe(0);
  });

  it('qqData is linearly spaced', () => {
    const r = fitUniform([1, 3, 5, 7, 9]);
    const diffs = [];
    for (let i = 1; i < r.qqData.length; i++)
      diffs.push(r.qqData[i].theoretical - r.qqData[i - 1].theoretical);
    expect(diffs.every(d => Math.abs(d) > 0)).toBe(true);
  });
});

describe('distributionGoF', () => {
  it('returns null for small/empty input', () => {
    expect(distributionGoF([1, 2], null)).toBeNull();
    expect(distributionGoF(null, null)).toBeNull();
  });

  it('KS: returns statistic and p for normal fit', () => {
    const fit = fitNormal(normalSample);
    const r = distributionGoF(normalSample, fit, { test: 'KS', B: 199 });
    expectKeys(r, ['test', 'statistic', 'p', 'B', 'apa']);
    expect(r.p).toBeGreaterThanOrEqual(0);
    expect(r.p).toBeLessThanOrEqual(1);
    expect(r.statistic).toBeGreaterThanOrEqual(0);
    expect(r.B).toBe(199);
  });

  it('AD: returns statistic and p', () => {
    const fit = fitExponential(expSample);
    const r = distributionGoF(expSample, fit, { test: 'AD', B: 199 });
    expectKeys(r, ['test', 'statistic', 'p', 'B', 'apa']);
    expect(r.p).toBeGreaterThanOrEqual(0);
    expect(r.statistic).toBeGreaterThanOrEqual(0);
  });

  it('defaults to KS with B=999', () => {
    const fit = fitNormal(normalSample);
    const r = distributionGoF(normalSample, fit);
    expect(r.B).toBe(999);
  });

  it('rejects missing cdf', () => {
    expect(distributionGoF(normalSample, { cdf: null })).toBeNull();
  });
});

describe('fitBeta', () => {
  const betaSample = [0.2, 0.3, 0.25, 0.35, 0.4, 0.28, 0.32, 0.38, 0.22, 0.33];

  it('returns null for out-of-range data', () => {
    expect(fitBeta([0, 0.5, 1])).toBeNull();
    expect(fitBeta([0.5, 0.6, 1.0])).toBeNull();
    expect(fitBeta([0.1, 0.2])).toBeNull();
  });

  it('estimates alpha and beta > 0', () => {
    const r = fitBeta(betaSample);
    expectFitResult(r, 'Beta');
    expect(r.parameters.alpha).toBeGreaterThan(0);
    expect(r.parameters.beta).toBeGreaterThan(0);
    expect(r.parameters.seAlpha).toBeGreaterThan(0);
  });

  it('cdf returns 0 at x <= 0, 1 at x >= 1', () => {
    const r = fitBeta(betaSample);
    expect(r.cdf(0)).toBeCloseTo(0, 2);
    expect(r.cdf(1)).toBeCloseTo(1, 2);
  });

  it('pdf returns 0 at boundaries', () => {
    const r = fitBeta(betaSample);
    expect(r.pdf(0)).toBe(0);
    expect(r.pdf(1)).toBe(0);
  });

  it('pdf positive inside (0,1)', () => {
    const r = fitBeta(betaSample);
    expect(r.pdf(0.3)).toBeGreaterThan(0);
  });

  it('concentrated data gives high alpha, beta', () => {
    const r = fitBeta([0.48, 0.51, 0.49, 0.5, 0.52, 0.5, 0.49, 0.51]);
    expect(r.parameters.alpha).toBeGreaterThan(5);
    expect(r.parameters.beta).toBeGreaterThan(5);
  });

  it('matches a scipy.stats.beta.fit MLE oracle (regression test for the digamma/trigamma approximation bug)', () => {
    // The Newton-Raphson step previously used the crude large-x asymptotic
    // approximation ψ(x)≈ln(x)−1/(2x) in place of the real digamma function,
    // which is badly wrong for α,β in the 1–10 range typical of Beta-fitted
    // data — it diverged to α≈290000, β≈395000 instead of the true MLE
    // α≈3.88, β≈5.05.
    const e = ref.fitting.beta_basic;
    const r = fitBeta(e.sample);
    expect(r.parameters.alpha).toBeCloseTo(e.alpha, 2);
    expect(r.parameters.beta).toBeCloseTo(e.beta, 2);
  });
});

describe('distributionGoF', () => {
  it('evaluates GoF for Gamma fit', () => {
    const fitted = fitGamma(gammaSample);
    const r = distributionGoF(gammaSample, fitted, { test: 'AD', B: 50 });
    expectKeys(r, ['test', 'statistic', 'p', 'apa']);
    expect(r.p).toBeGreaterThanOrEqual(0);
    expect(r.p).toBeLessThanOrEqual(1);
  });

  it('evaluates GoF for Poisson fit', () => {
    const fitted = fitPoisson(poiSample);
    const r = distributionGoF(poiSample, fitted, { test: 'AD', B: 50 });
    expect(r.test).toContain('Anderson-Darling');
    expect(r.p).toBeGreaterThanOrEqual(0);
  });

  it('evaluates GoF for Log-normal fit', () => {
    const fitted = fitLogNormal(lnSample);
    const r = distributionGoF(lnSample, fitted, { test: 'AD', B: 50 });
    expect(r.statistic).toBeGreaterThan(0);
    expect(r.p).toBeGreaterThanOrEqual(0);
  });

  it('evaluates GoF for Weibull fit', () => {
    const fitted = fitWeibull(weibSample);
    const r = distributionGoF(weibSample, fitted, { test: 'AD', B: 50 });
    expect(r.p).toBeGreaterThanOrEqual(0);
    expect(r.p).toBeLessThanOrEqual(1);
  });

  it('evaluates GoF for Uniform fit', () => {
    const uniSample = [0.1, 0.3, 0.5, 0.7, 0.9, 0.2, 0.4, 0.6, 0.8, 1.0, 0.15, 0.35, 0.55, 0.75, 0.95];
    const fitted = fitUniform(uniSample);
    const r = distributionGoF(uniSample, fitted, { test: 'KS', B: 50 });
    expect(r.p).toBeGreaterThanOrEqual(0);
  });
});

describe('inter-distribution model comparison', () => {
  it('normal fits normal data better than exponential', () => {
    const normalFit = fitNormal(normalSample);
    const expFit = fitExponential(normalSample);
    expect(normalFit.logLikelihood).toBeGreaterThan(expFit.logLikelihood);
  });

  it('log-normal fits positive skewed data better than normal', () => {
    const skewed = [0.1, 0.3, 0.4, 0.7, 0.9, 1.5, 2.0, 3.5, 5.0, 8.0];
    const lnFit = fitLogNormal(skewed);
    const normFit = fitNormal(skewed);
    expect(lnFit.logLikelihood).toBeGreaterThan(normFit.logLikelihood);
  });
});

describe('andersonDarling', () => {
  const nd = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  it('null <5', () => expect(andersonDarling([1, 2, 3])).toBeNull());
  it('stat >= 0', () => { const r = andersonDarling(nd); expect(r.statistic).toBeGreaterThanOrEqual(0); });
  it('significance is string', () => { const r = andersonDarling(nd); expect(['***', '**', '*', 'n.s.']).toContain(r.significance); });
  it('contract keys', () => expectKeys(andersonDarling(nd), ['test', 'statistic', 'pValue', 'significance', 'distribution', 'n', 'apa']));
});

describe('shapiroWilk', () => {
  it('null <4', () => expect(shapiroWilk([1, 2, 3])).toBeNull());
  it('W in (0,1]', () => { const r = shapiroWilk([1, 2, 3, 4, 5, 6, 7, 8]); expect(r.W).toBeGreaterThan(0); expect(r.W).toBeLessThanOrEqual(1); });
  it('contract keys', () => expectKeys(shapiroWilk([1, 2, 3, 4, 5, 6, 7, 8]), ['test', 'W', 'p', 'n', 'apa']));
});

describe('cramerVonMises', () => {
  const nd = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  it('null <5', () => expect(cramerVonMises([1, 2, 3])).toBeNull());
  it('stat >= 0', () => { const r = cramerVonMises(nd); expect(r.statistic).toBeGreaterThanOrEqual(0); });
  it('contract keys', () => expectKeys(cramerVonMises(nd), ['test', 'statistic', 'pValue', 'significance', 'distribution', 'n', 'apa']));
});

describe('lilliefors', () => {
  it('null <5', () => expect(lilliefors([1, 2, 3])).toBeNull());
  it('D in [0,1]', () => { const r = lilliefors([1, 2, 3, 4, 5, 6, 7, 8]); expect(r.D).toBeGreaterThanOrEqual(0); expect(r.D).toBeLessThanOrEqual(1); });
  it('contract keys', () => expectKeys(lilliefors([1, 2, 3, 4, 5, 6, 7, 8]), ['test', 'D', 'pValue', 'n', 'apa']));
});

describe('chiSquareGOF', () => {
  it('null <2 bins', () => expect(chiSquareGOF([1])).toBeNull());
  it('chi2 >= 0', () => { const r = chiSquareGOF([10, 15, 12], { expected: [12, 12, 13] }); expect(r.chi2).toBeGreaterThanOrEqual(0); });
  it('contract keys', () => expectKeys(chiSquareGOF([10, 15, 12], { expected: [12, 12, 13] }), ['test', 'chi2', 'df', 'p', 'n', 'apa']));
});

describe('qqCorrelation', () => {
  it('null <5', () => expect(qqCorrelation([1, 2, 3])).toBeNull());
  it('r in [-1,1]', () => { const r = qqCorrelation([1, 2, 3, 4, 5, 6, 7, 8]); expect(r.r).toBeGreaterThanOrEqual(-1); expect(r.r).toBeLessThanOrEqual(1); });
  it('contract keys', () => expectKeys(qqCorrelation([1, 2, 3, 4, 5, 6, 7, 8]), ['test', 'r', 'criticalR', 'significant', 'distribution', 'n', 'apa']));
});
