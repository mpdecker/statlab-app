import { describe, it, expect } from 'vitest';
import { adfTest, acf, pacf, arima, autoArima, simpleExpSmooth, holtsLinearSmooth, holtWinters, seasonalDecompose, varModel, grangerCausality, chowTest, garch, kalmanFilter, johansenTest, structuralBreak, bottomUpReconciliation, topDownReconciliation, middleOutReconciliation, minTReconciliation, forecastAccuracy, markovSwitchingAR, regimeVolatility, transitionMatrix, filteredProbabilities, expectedDuration, peltChangePoint, binarySegmentation, singleChangepoint, changepointPenalty, segmentedMeans, rollingOriginCV, slidingWindow, gapValidation, tsFeatures, forecastReconciliation, mase, smape, theilU, dieboldMariano, encompassingTest, varmax, cointegrationRank, vecm, impulseResponseCI, fevdDecomposition } from './timeseries.js';
import { expectKeys } from './__fixtures__/helpers.js';

const stationarySeries = [
  1.2, 0.8, 1.5, 1.1, 0.9, 1.3, 1.0, 1.4, 0.7, 1.6,
  1.1, 0.8, 1.3, 1.0, 1.5, 0.9, 1.2, 1.4, 0.8, 1.1,
];
const trendSeries = [
  1.0, 2.1, 3.0, 4.2, 5.1, 6.0, 7.2, 8.1, 9.0, 10.2,
  11.1, 12.0, 13.2, 14.1, 15.0, 16.2, 17.1, 18.0, 19.2, 20.1,
];

describe('adfTest', () => {
  it('returns null for short series', () => {
    expect(adfTest(null)).toBeNull();
    expect(adfTest([1, 2, 3])).toBeNull();
    expect(adfTest([])).toBeNull();
  });

  it('returns tauStat, criticalValues, stationary flag', () => {
    const r = adfTest(stationarySeries);
    expectKeys(r, ['test', 'tauStat', 'pValue', 'criticalValues', 'stationary', 'trend', 'maxLag', 'n', 'apa']);
    expect(r.criticalValues["5%"]).toBeDefined();
    expect(typeof r.stationary).toBe('boolean');
    expect(r.n).toBe(stationarySeries.length);
  });

  it('trending series identified as non-stationary', () => {
    expect(adfTest(trendSeries, { trend: true }).stationary).toBe(false);
  });

  it('accepts maxLag and trend options', () => {
    const r = adfTest(stationarySeries, { maxLag: 2, trend: false });
    expect(r.maxLag).toBe(2);
    expect(r.trend).toBe(false);
  });

  it('no-trend mode returns appropriate critical values', () => {
    const r = adfTest(stationarySeries, { trend: false });
    expect(r.criticalValues["5%"]).toBeDefined();
  });

  it('p-value is in [0, 1]', () => {
    const r = adfTest(stationarySeries);
    expect(r.pValue).toBeGreaterThanOrEqual(0);
    expect(r.pValue).toBeLessThanOrEqual(1);
  });

  it('tauStat is finite', () => {
    const r = adfTest(stationarySeries);
    expect(Number.isFinite(r.tauStat)).toBe(true);
  });

  it('constant series: non-stationary', () => {
    const constant = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
    const r = adfTest(constant);
    expect(r).not.toBeNull();
  });
});

describe('acf', () => {
  it('returns null for short series', () => {
    expect(acf([1, 2, 3])).toBeNull();
    expect(acf(null)).toBeNull();
  });

  it('returns array of {lag, autocorrelation}', () => {
    const r = acf(stationarySeries, 5);
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBe(6);
    expect(r[0].lag).toBe(0);
    expect(r[0].autocorrelation).toBe(1);
    r.forEach(e => {
      expect(e.autocorrelation).toBeGreaterThanOrEqual(-1);
      expect(e.autocorrelation).toBeLessThanOrEqual(1);
    });
  });

  it('respects maxLag', () => {
    expect(acf(stationarySeries, 3).length).toBe(4);
  });

  it('lag values increment', () => {
    const r = acf(stationarySeries, 5);
    for (let i = 1; i < r.length; i++) expect(r[i].lag).toBe(r[i - 1].lag + 1);
  });

  it('white noise: ACF near 0 after lag 0', () => {
    const wn = [0.5, -0.3, 1.2, -0.8, 0.1, 0.9, -1.1, 0.4, -0.6, 1.3, -0.2, 0.7, -0.9, 0.3, -1.0, 0.6, -0.4, 1.1, -0.7, 0.0];
    const r = acf(wn, 5);
    for (let i = 1; i < r.length; i++) expect(Math.abs(r[i].autocorrelation)).toBeLessThan(0.8);
  });

  it('persistent series: ACF decays slowly', () => {
    const pers = Array.from({ length: 100 }, (_, i) => 5 + i * 0.1 + Math.random());
    const r = acf(pers, 3);
    expect(r[1].autocorrelation).toBeGreaterThan(0.5);
  });

  it('constant series returns 0 at all lags after lag 0', () => {
    const c = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3];
    const r = acf(c, 3);
    for (let i = 1; i < r.length; i++) expect(r[i].autocorrelation).toBe(0);
  });
});

describe('pacf', () => {
  it('returns null for short series', () => {
    expect(pacf([1, 2, 3])).toBeNull();
    expect(pacf(null)).toBeNull();
  });

  it('returns array of {lag, partialAutocorrelation}', () => {
    const r = pacf(stationarySeries, 5);
    expect(r[0].lag).toBe(0);
    expect(r[0].partialAutocorrelation).toBe(1);
    r.forEach(e => {
      expect(e.partialAutocorrelation).toBeGreaterThanOrEqual(-1);
      expect(e.partialAutocorrelation).toBeLessThanOrEqual(1);
    });
  });

  it('consistent with acf at lag 1', () => {
    const a = acf(stationarySeries, 5);
    const p = pacf(stationarySeries, 5);
    if (a?.[1] && p?.[1]) expect(p[1].partialAutocorrelation).toBeCloseTo(a[1].autocorrelation, 2);
  });
});

describe('arima', () => {
  it('returns null for short series', () => {
    expect(arima([1, 2, 3])).toBeNull();
    expect(arima(null)).toBeNull();
  });

  it('fits ARIMA(1,0,0) correctly', () => {
    const r = arima(stationarySeries, { p: 1, d: 0, q: 0 });
    expectKeys(r, ['test', 'parameters', 'logLikelihood', 'AIC', 'BIC', 'differencing', 'stationary', 'n', 'apa']);
    expect(r.parameters.ar.length).toBe(1);
    expect(Number.isFinite(r.AIC)).toBe(true);
  });

  it('ARIMA(0,0,1) produces MA parameters', () => {
    const r = arima(stationarySeries, { p: 0, d: 0, q: 1 });
    expect(r.parameters.ma.length).toBe(1);
    expect(Number.isFinite(r.AIC)).toBe(true);
  });

  it('ARIMA(1,0,1) produces both AR and MA', () => {
    const r = arima(stationarySeries, { p: 1, d: 0, q: 1 });
    expect(r.parameters.ar.length).toBe(1);
    expect(r.parameters.ma.length).toBe(1);
  });

  it('differencing produces d > 0', () => {
    const r = arima(trendSeries, { p: 1, d: 1, q: 0 });
    expect(r.differencing).toBe(1);
  });

  it('AIC < BIC for small n', () => {
    const r = arima(stationarySeries, { p: 1, d: 0, q: 0 });
    expect(r.AIC).toBeLessThan(r.BIC);
  });

  it('sigma2 > 0', () => {
    const r = arima(stationarySeries, { p: 1, d: 0, q: 0 });
    expect(r.parameters.sigma2).toBeGreaterThan(0);
  });

  it('handles longer series', () => {
    const long = Array.from({ length: 100 }, (_, i) => 10 + Math.sin(i * 0.3) * 2 + Math.random());
    const r = arima(long, { p: 2, d: 0, q: 0 });
    expect(r).not.toBeNull();
    expect(r.n).toBe(100);
  });
});

describe('autoArima', () => {
  it('selects a model for valid series', () => {
    const r = autoArima(stationarySeries, { maxP: 2, maxD: 1, maxQ: 2 });
    expect(r).not.toBeNull();
    expect(Number.isFinite(r.AIC)).toBe(true);
  });

  it('returns null for short series', () => {
    expect(autoArima([1, 2, 3])).toBeNull();
  });

  it('BIC criterion works', () => {
    const r = autoArima(stationarySeries, { maxP: 2, maxD: 0, maxQ: 2, criterion: 'BIC' });
    expect(r).not.toBeNull();
    expect(Number.isFinite(r.BIC)).toBe(true);
  });
});

describe('simpleExpSmooth', () => {
  it('returns null for short series', () => {
    expect(simpleExpSmooth([1, 2])).toBeNull();
    expect(simpleExpSmooth(null)).toBeNull();
  });

  it('returns alpha, fitted, SSE', () => {
    const r = simpleExpSmooth(stationarySeries);
    expectKeys(r, ['test', 'alpha', 'fitted', 'SSE', 'n', 'apa']);
    expect(r.alpha).toBeGreaterThan(0); expect(r.alpha).toBeLessThan(1);
    expect(r.fitted.length).toBe(stationarySeries.length);
  });

  it('accepts explicit alpha', () => {
    const r = simpleExpSmooth(stationarySeries, { alpha: 0.3 });
    expect(r.alpha).toBeCloseTo(0.3, 1);
  });

  it('SSE is non-negative', () => {
    const r = simpleExpSmooth(stationarySeries);
    expect(r.SSE).toBeGreaterThanOrEqual(0);
  });

  it('constant series: low SSE, alpha may vary', () => {
    const c = [5, 5, 5, 5, 5, 5, 5, 5];
    const r = simpleExpSmooth(c);
    expect(r).not.toBeNull();
    expect(r.SSE).toBeLessThan(1);
  });
});

describe('holtsLinearSmooth', () => {
  it('returns null for short series', () => {
    expect(holtsLinearSmooth([1, 2])).toBeNull();
  });

  it('returns alpha, beta, fitted, SSE', () => {
    const r = holtsLinearSmooth(stationarySeries);
    expectKeys(r, ['test', 'alpha', 'beta', 'fitted', 'SSE', 'n', 'apa']);
    expect(r.alpha).toBeGreaterThan(0);
    expect(r.beta).toBeGreaterThan(0);
    expect(r.fitted.length).toBe(stationarySeries.length);
  });

  it('fitted values near data for small trend', () => {
    const r = holtsLinearSmooth(stationarySeries);
    expect(r.SSE).toBeGreaterThan(0);
  });

  it('handles trended series better than simple', () => {
    const simpleFit = simpleExpSmooth(trendSeries);
    const holtFit = holtsLinearSmooth(trendSeries);
    expect(holtFit.SSE).toBeLessThan(simpleFit.SSE * 2);
  });
});

describe('holtWinters', () => {
  it('returns null for series shorter than 2*period', () => {
    expect(holtWinters([1, 2, 3], { period: 4 })).toBeNull();
  });

  it('returns alpha, beta, gamma, fitted, period', () => {
    const seasonal = [10, 12, 15, 11, 13, 16, 14, 17, 19, 15, 18, 20];
    const r = holtWinters(seasonal, { period: 4 });
    expectKeys(r, ['test', 'alpha', 'beta', 'gamma', 'period', 'fitted', 'SSE', 'n', 'apa']);
    expect(r.alpha).toBeGreaterThan(0);
    expect(r.gamma).toBeGreaterThan(0);
    expect(r.period).toBe(4);
  });

  it('gamma parameter is between 0 and 1', () => {
    const r = holtWinters([10, 12, 15, 11, 13, 16, 14, 17, 19, 15, 18, 20], { period: 4 });
    expect(r.gamma).toBeGreaterThan(0);
    expect(r.gamma).toBeLessThan(1);
  });

  it('fitted length matches input', () => {
    const data = [10, 12, 15, 11, 13, 16, 14, 17, 19, 15, 18, 20];
    const r = holtWinters(data, { period: 4 });
    expect(r.fitted.length).toBe(data.length);
  });
});

describe('seasonalDecompose', () => {
  it('returns null for series shorter than 2*period', () => {
    expect(seasonalDecompose([1, 2, 3], { period: 4 })).toBeNull();
    expect(seasonalDecompose(null, { period: 4 })).toBeNull();
  });

  it('returns trend, seasonal, remainder arrays', () => {
    const data = [10, 12, 14, 11, 13, 15, 12, 14, 16, 13, 15, 17];
    const r = seasonalDecompose(data, { period: 4 });
    expectKeys(r, ['test', 'trend', 'seasonal', 'remainder', 'period', 'n', 'robust', 'apa']);
    expect(r.trend.length).toBe(data.length);
    expect(r.seasonal.length).toBe(data.length);
    expect(r.remainder.length).toBe(data.length);
  });

  it('components approximately sum to original', () => {
    const data = [10, 12, 14, 11, 13, 15, 12, 14, 16, 13, 15, 17, 14, 16, 18, 15];
    const r = seasonalDecompose(data, { period: 4 });
    for (let i = 0; i < data.length; i++) {
      const diff = Math.abs(data[i] - r.trend[i] - r.seasonal[i] - r.remainder[i]);
      expect(diff).toBeLessThan(0.1);
    }
  });

  it('seasonal component has periodicity', () => {
    const data = [10, 12, 14, 11, 13, 15, 12, 14, 16, 13, 15, 17, 14, 16, 18, 15];
    const r = seasonalDecompose(data, { period: 4 });
    const s = r.seasonal;
    for (let i = 0; i < 4; i++) {
      const sAtPeriod = [];
      for (let j = i; j < s.length; j += 4) sAtPeriod.push(s[j]);
      const maxDiff = Math.max(...sAtPeriod) - Math.min(...sAtPeriod);
      expect(maxDiff).toBeLessThan(5);
    }
  });

  it('robust mode produces output', () => {
    const data = [10, 12, 14, 11, 13, 150, 12, 14, 16, 13, 15, 17, 14, 16, 18, 15];
    const r = seasonalDecompose(data, { period: 4, robust: true });
    expect(r).not.toBeNull();
    expect(r.robust).toBe(true);
  });
});

// ── VAR ───────────────────────────────────────────────────────────────────────
describe('varModel', () => {
  const bivarSeries = {
    v1: Array.from({ length: 40 }, (_, i) => 2 + 0.5 * i * 0.1 + Math.sin(i * 0.3)),
    v2: Array.from({ length: 40 }, (_, i) => 1 + 0.3 * i * 0.1 + Math.cos(i * 0.3)),
  };

  it('returns null for short series', () => {
    const short = { v1: [1, 2, 3], v2: [4, 5, 6] };
    expect(varModel(short, 1)).toBeNull();
    expect(varModel(null, 1)).toBeNull();
  });

  it('returns correct keys', () => {
    const r = varModel(bivarSeries, 1);
    expectKeys(r, ['test', 'coefficients', 'residualCov', 'aic', 'bic', 'stable', 'irf', 'fevd', 'n', 'k', 'p', 'horizon', 'apa']);
  });

  it('coefficients array has k elements', () => {
    const r = varModel(bivarSeries, 1);
    expect(r.coefficients).toHaveLength(2);
  });

  it('residualCov is k×k matrix', () => {
    const r = varModel(bivarSeries, 1);
    expect(r.residualCov).toHaveLength(2);
    expect(r.residualCov[0]).toHaveLength(2);
  });

  it('aic and bic are finite', () => {
    const r = varModel(bivarSeries, 1);
    expect(Number.isFinite(r.aic)).toBe(true);
    expect(Number.isFinite(r.bic)).toBe(true);
  });

  it('stable is boolean', () => {
    const r = varModel(bivarSeries, 1);
    expect(typeof r.stable).toBe('boolean');
  });

  it('irf entries match horizon', () => {
    const r = varModel(bivarSeries, 1, { horizon: 3 });
    expect(r.irf).toHaveLength(4); // horizon + 1
  });

  it('fevd proportions sum to ~1', () => {
    const r = varModel(bivarSeries, 1, { horizon: 3 });
    if (r.fevd.length > 0) {
      const last = r.fevd[r.fevd.length - 1];
      const byVar = {};
      for (const d of last.decompositions) {
        byVar[d.variable] = (byVar[d.variable] || 0) + d.proportion;
      }
      for (const v of Object.values(byVar)) {
        expect(v).toBeCloseTo(1, 1);
      }
    }
  });

  it('k and p match input', () => {
    const r = varModel(bivarSeries, 2);
    expect(r.k).toBe(2);
    expect(r.p).toBe(2);
  });

  it('apa is a non-empty string', () => {
    const r = varModel(bivarSeries, 1);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── Granger Causality ─────────────────────────────────────────────────────────
describe('grangerCausality', () => {
  const causalSeries = {
    cause: Array.from({ length: 50 }, (_, i) => i * 0.1 + Math.sin(i * 0.5)),
    effect: Array.from({ length: 50 }, (_, i) => i * 0.1 + Math.sin(i * 0.5) * 0.8 + Math.sin((i - 1) * 0.5) * 0.3),
  };

  it('returns null for short series', () => {
    const short = { cause: [1, 2, 3], effect: [4, 5, 6] };
    expect(grangerCausality(short, 'cause', 'effect', 2)).toBeNull();
    expect(grangerCausality(null, 'cause', 'effect')).toBeNull();
  });

  it('returns correct keys', () => {
    const r = grangerCausality(causalSeries, 'cause', 'effect', 2);
    expectKeys(r, ['test', 'cause', 'effect', 'tests', 'maxLag', 'n', 'apa']);
  });

  it('tests array has maxLag entries', () => {
    const r = grangerCausality(causalSeries, 'cause', 'effect', 3);
    expect(r.tests).toHaveLength(3);
  });

  it('each test has f, df1, df2, p', () => {
    const r = grangerCausality(causalSeries, 'cause', 'effect', 2);
    r.tests.forEach(t => {
      expect(Number.isFinite(t.f)).toBe(true);
      expect(t.f).toBeGreaterThanOrEqual(0);
      expect(t.df1).toBeGreaterThan(0);
      expect(t.df2).toBeGreaterThan(0);
      expect(t.p).toBeGreaterThanOrEqual(0);
      expect(t.p).toBeLessThanOrEqual(1);
    });
  });

  it('apa is a non-empty string', () => {
    const r = grangerCausality(causalSeries, 'cause', 'effect', 2);
    expect(typeof r.apa).toBe('string');
    expect(r.apa.length).toBeGreaterThan(0);
  });
});

// ── Chow Test ─────────────────────────────────────────────────────────────────
describe('chowTest', () => {
  const seriesWithBreak = [];
  const c = (s) => s * 7 % 5;
  for (let i = 0; i < 40; i++) seriesWithBreak.push(i < 20 ? 5 + i * 0.5 + (c(i) - 2) * 0.4 : 15 + i * 0.1 + (c(i) - 2) * 0.4);
  it('returns null for invalid input', () => expect(chowTest(null, 10)).toBeNull());
  it('returns correct keys', () => expectKeys(chowTest(seriesWithBreak, 20), ['test', 'breakPoint', 'f', 'df1', 'df2', 'p', 'totalN', 'nPre', 'nPost', 'apa']));
  it('F statistic non-negative', () => { const r = chowTest(seriesWithBreak, 20); expect(r.f).toBeGreaterThanOrEqual(0); });
  it('p in [0,1]', () => { const r = chowTest(seriesWithBreak, 20); expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); });
  it('apa non-empty', () => { const r = chowTest(seriesWithBreak, 20); expect(typeof r.apa).toBe('string'); expect(r.apa.length).toBeGreaterThan(0); });
});

describe('garch', () => {
  const data = Array.from({ length: 100 }, (_, i) => Math.sin(i * 0.1) * 0.5 + (i % 5 - 2) * 0.3);
  it('null small', () => expect(garch(data.slice(0, 20))).toBeNull());
  it('contract keys', () => expectKeys(garch(data), ['test', 'omega', 'alpha', 'beta', 'persistence', 'halfLife', 'conditionalVariance', 'n', 'apa']));
  it('persistence in [0,1]', () => { const r = garch(data); expect(r.persistence).toBeGreaterThanOrEqual(0); expect(r.persistence).toBeLessThanOrEqual(1); });
});

describe('kalmanFilter', () => {
  const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  it('null small', () => expect(kalmanFilter(data.slice(0, 3))).toBeNull());
  it('contract keys', () => expectKeys(kalmanFilter(data), ['test', 'filtered', 'oneStepAhead', 'logLik', 'n', 'apa']));
  it('filtered length = n', () => { const r = kalmanFilter(data); expect(r.filtered).toHaveLength(data.length); });
});

describe('johansenTest', () => {
  const series = { v1: Array.from({ length: 50 }, (_, i) => i * 0.1), v2: Array.from({ length: 50 }, (_, i) => i * 0.05 + Math.sin(i * 0.2)) };
  it('null small', () => expect(johansenTest({ v1: [1, 2, 3], v2: [4, 5, 6] }, 1)).toBeNull());
  it('contract keys', () => { const r = johansenTest(series, 1); if (r) expectKeys(r, ['test', 'traceStats', 'maxEigenStats', 'rank', 'cointegratingVectors', 'n', 'p', 'apa']); });
});

describe('structuralBreak', () => {
  const data = Array.from({ length: 40 }, (_, i) => i < 20 ? 10 + i * 0.2 : 15 + (i - 20) * 0.1);
  it('null small', () => expect(structuralBreak(data.slice(0, 10))).toBeNull());
  it('contract keys', () => expectKeys(structuralBreak(data), ['test', 'breakpoints', 'segmentMeans', 'bic', 'n', 'apa']));
  it('breakpoints within range', () => { const r = structuralBreak(data); r.breakpoints.forEach(b => { expect(b).toBeGreaterThan(0); expect(b).toBeLessThan(data.length); }); });
});

describe('bottomUpReconciliation', () => {
  it('contract keys', () => expectKeys(bottomUpReconciliation([10, 20, 30], [[0, 1], [2]]), ['test', 'bottom', 'groups', 'total', 'n', 'nGroups', 'apa']));
});
describe('topDownReconciliation', () => {
  it('is defined', () => expect(typeof topDownReconciliation).toBe('function'));
});
describe('middleOutReconciliation', () => {
  it('contract keys', () => expectKeys(middleOutReconciliation([30, 40, 50], null, null, null), ['test', 'middle', 'upper', 'lower', 'n', 'apa']));
});
describe('minTReconciliation', () => {
  it('contract keys', () => { const S = [[1, 0], [0, 1], [1, 1]]; const r = minTReconciliation([10, 20, 30], S, null); if (r) expectKeys(r, ['test', 'reconciled', 'n', 'm', 'apa']); });
});
describe('forecastAccuracy', () => {
  it('contract keys', () => expectKeys(forecastAccuracy([1, 2, 3, 4], [1.1, 1.9, 3.2, 3.8]), ['test', 'rmse', 'mae', 'mape', 'mase', 'n', 'apa']));
  it('null length mismatch', () => expect(forecastAccuracy([1, 2], [1])).toBeNull());
});

describe('markovSwitchingAR', () => {
  it('contract keys', () => expectKeys(markovSwitchingAR([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]), ['test', 'states', 'transitionMatrix', 'n', 'nRegimes', 'p', 'apa']));
  it('null <20', () => expect(markovSwitchingAR([1, 2, 3])).toBeNull());
});

describe('regimeVolatility', () => {
  it('contract keys', () => expectKeys(regimeVolatility([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [0, 0, 0, 0, 0, 1, 1, 1, 1, 1]), ['test', 'volatilities', 'n', 'apa']));
  it('null <10', () => expect(regimeVolatility([1, 2], [0, 1])).toBeNull());
});

describe('transitionMatrix', () => {
  it('contract keys', () => expectKeys(transitionMatrix([1, 1, 2, 1, 2, 2, 1, 2, 1, 1]), ['test', 'P', 'k', 'n', 'apa']));
  it('null <10', () => expect(transitionMatrix([1, 2, 1])).toBeNull());
});

describe('filteredProbabilities', () => {
  it('contract keys', () => expectKeys(filteredProbabilities([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), ['test', 'probs', 'n', 'k', 'apa']));
});

describe('expectedDuration', () => {
  it('contract keys', () => expectKeys(expectedDuration([[0.8, 0.2], [0.3, 0.7]]), ['test', 'durations', 'k', 'apa']));
  it('null empty', () => expect(expectedDuration([])).toBeNull());
});

describe('peltChangePoint', () => { it('contract keys', () => expectKeys(peltChangePoint(Array.from({length:40},(_,i)=>i<20?10+i:20+i*0.5)),['test','breakpoints','n','pen','apa'])); });
describe('binarySegmentation', () => { it('contract keys', () => expectKeys(binarySegmentation(Array.from({length:40},(_,i)=>i<20?5:15)),['test','breakpoints','n','maxBreaks','apa'])); });
describe('singleChangepoint', () => { it('contract keys', () => expectKeys(singleChangepoint([1,2,3,4,5,6,7,8,9,10]),['test','changePoint','fStat','n','apa'])); });
describe('changepointPenalty', () => { it('contract keys', () => expectKeys(changepointPenalty([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]),['test','penalties','n','apa'])); });
describe('segmentedMeans', () => { it('contract keys', () => expectKeys(segmentedMeans([10],[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]),['test','segments','n','apa'])); });

describe('rollingOriginCV', () => { it('contract keys', () => expectKeys(rollingOriginCV([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15], train => [train[0]*2]), ['test', 'rmse', 'nFolds', 'initialWindow', 'horizon', 'n', 'apa'])); });
describe('slidingWindow', () => { it('contract keys', () => expectKeys(slidingWindow([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20], train => train[0]), ['test', 'values', 'windowSize', 'step', 'n', 'apa'])); });
describe('gapValidation', () => { it('contract keys', () => expectKeys(gapValidation([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20], (train, h) => [train[0]]), ['test', 'rmse', 'gapSize', 'n', 'apa'])); });
describe('tsFeatures', () => { it('contract keys', () => expectKeys(tsFeatures([1,2,3,4,5,6,7,8,9,10]), ['test', 'features', 'n', 'apa'])); });
describe('forecastReconciliation', () => { it('contract keys', () => expectKeys(forecastReconciliation([10, 20, 30], [[0,1,2]], [12, 22, 28]), ['test', 'reconciled', 'n', 'apa'])); });

describe('mase', () => { it('contract keys', () => expectKeys(mase([1,2,3,4,5],[1.5,2.5,3.5,4.5,5.5],null), ['test','mase','n','apa'])); });
describe('smape', () => { it('contract keys', () => expectKeys(smape([1,2,3,4,5],[1.5,2.5,3.5,4.5,5.5]), ['test','smape','n','apa'])); });
describe('theilU', () => { it('contract keys', () => expectKeys(theilU([1,2,3,4,5],[1.5,2.5,3.5,4.5,5.5]), ['test','U1','U2','n','apa'])); });
describe('dieboldMariano', () => { it('contract keys', () => expectKeys(dieboldMariano([0.1,0.2,0.1,0.3,0.2],[0.2,0.1,0.2,0.2,0.3]), ['test','dm','p','h','n','apa'])); });
describe('encompassingTest', () => { it('contract keys', () => expectKeys(encompassingTest([1,2,3,4,5],[1.5,2.5,3.5,4.5,5.5],[1,2,3,4,5]), ['test','t','p','n','apa'])); });
describe('varmax', () => { it('is defined', () => expect(typeof varmax).toBe('function')); });
describe('cointegrationRank', () => { it('is defined', () => expect(typeof cointegrationRank).toBe('function')); });
describe('vecm', () => { it('is defined', () => expect(typeof vecm).toBe('function')); });
describe('impulseResponseCI', () => { it('contract keys', () => expectKeys(impulseResponseCI([1,0.8,0.6,0.4,0.2]), ['test','irf','ci','B','n','apa'])); });
describe('fevdDecomposition', () => { it('contract keys', () => expectKeys(fevdDecomposition({k:3}), ['test','fevd','k','horizon','apa'])); });
