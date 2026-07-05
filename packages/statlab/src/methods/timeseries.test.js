import { describe, it, expect } from 'vitest';
import { adfTest, acf, pacf, arima, autoArima, simpleExpSmooth, holtsLinearSmooth, holtWinters, seasonalDecompose, varModel, grangerCausality, chowTest, garch, egarch, stateSpace, kalmanFilter, johansenTest, structuralBreak, bottomUpReconciliation, topDownReconciliation, middleOutReconciliation, minTReconciliation, forecastAccuracy, markovSwitchingAR, regimeVolatility, transitionMatrix, filteredProbabilities, expectedDuration, peltChangePoint, binarySegmentation, singleChangepoint, changepointPenalty, segmentedMeans, rollingOriginCV, slidingWindow, gapValidation, tsFeatures, forecastReconciliation, mase, smape, theilU, dieboldMariano, encompassingTest, varmax, cointegrationRank, vecm, impulseResponseCI, fevdDecomposition, dccGarch, bekkGarch, cccGarch, mgarchForecast, mgarchDiagnostics } from './timeseries.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };
const tsRef = ref.timeseries;

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

  it('a near-perfectly linear series is trend-stationary once detrended (matches statsmodels adfuller)', () => {
    // trendSeries is (almost) a deterministic straight line with tiny rounding
    // noise — with the trend term included, ADF correctly detects that the
    // DETRENDED residuals have essentially no unit-root behavior left, so this
    // rejects the null (stationary around the trend). Verified against
    // statsmodels.tsa.stattools.adfuller(trendSeries, regression='ct',
    // autolag=None): tau≈-7.07, p≈9.6e-9 — a previous version of this test
    // asserted the opposite, which matched a bug where `trend`/`maxLag` never
    // actually affected the computed statistic (see adfTest's docstring).
    const r = adfTest(trendSeries, { trend: true });
    expect(r.tauStat).toBeCloseTo(-7.0745, 2);
    expect(r.stationary).toBe(true);
  });

  it('a genuine random walk with drift is NOT detected as trend-stationary', () => {
    let x = 0; const rw = [];
    let s = 5; const rnd = () => { s = (1103515245 * s + 12345) & 0x7fffffff; return s / 0x7fffffff - 0.5; };
    for (let i = 0; i < 40; i++) { x += 0.5 + rnd() * 2; rw.push(x); }
    const r = adfTest(rw, { trend: true });
    expect(r.stationary).toBe(false);
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

  it('matches a statsmodels.tsa.stattools.adfuller oracle across trend/lag specifications', () => {
    const e = tsRef.adf_basic;
    const rCt0 = adfTest(e.series, { trend: true, maxLag: 0 });
    expect(rCt0.tauStat).toBeCloseTo(e.trend_lag0.tau, 3);
    expect(rCt0.pValue).toBeCloseTo(e.trend_lag0.p, 1);
    const rC0 = adfTest(e.series, { trend: false, maxLag: 0 });
    expect(rC0.tauStat).toBeCloseTo(e.const_lag0.tau, 3);
    expect(rC0.pValue).toBeCloseTo(e.const_lag0.p, 1);
    const rCt3 = adfTest(e.series, { trend: true, maxLag: 3 });
    expect(rCt3.tauStat).toBeCloseTo(e.trend_lag3.tau, 3);
    expect(rCt3.pValue).toBeCloseTo(e.trend_lag3.p, 1);
    // The three specifications must actually differ — the bug this fixes made
    // trend/maxLag no-ops, so tauStat was identical across all three calls.
    expect(rCt0.tauStat).not.toBeCloseTo(rC0.tauStat, 1);
    expect(rCt0.tauStat).not.toBeCloseTo(rCt3.tauStat, 1);
  });

  it('a perfectly constant series is a singular design (y_{t-1} collinear with the intercept) and returns null', () => {
    // With zero variation, y_{t-1} is identical to the intercept column, so
    // (X'X) is singular and the ADF regression is genuinely undefined — null is
    // the honest answer here (same convention as every other matInv-based
    // function in this codebase), not a fabricated statistic.
    const constant = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
    const r = adfTest(constant);
    expect(r).toBeNull();
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

  it('matches a statsmodels.tsa.stattools.acf oracle on an AR(1) series', () => {
    const e = tsRef.acf_pacf_basic;
    const r = acf(e.series, 8);
    r.forEach((row, i) => expect(row.autocorrelation).toBeCloseTo(e.acf[i], 5));
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

  it('matches a statsmodels.tsa.stattools.pacf(method="ywm") oracle on an AR(1) series', () => {
    const e = tsRef.acf_pacf_basic;
    const r = pacf(e.series, 8);
    r.forEach((row, i) => expect(row.partialAutocorrelation).toBeCloseTo(e.pacf[i], 4));
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
  it('null for missing data', () => {
    expect(johansenTest(null, 1)).toBeNull();
    expect(johansenTest({}, 1)).toBeNull();
  });
  it('contract keys', () => { const r = johansenTest(series, 1); if (r) expectKeys(r, ['test', 'traceStats', 'maxEigenStats', 'rank', 'cointegratingVectors', 'n', 'p', 'apa']); });
  it('traceStats and maxEigenStats have k entries', () => {
    const r = johansenTest(series, 1);
    if (r) { const k = Object.keys(series).length; expect(r.traceStats).toHaveLength(k); expect(r.maxEigenStats).toHaveLength(k); }
  });
  it('n and p match input', () => {
    const r = johansenTest(series, 1);
    if (r) { expect(r.n).toBe(50); expect(r.p).toBe(1); }
  });
});

describe('structuralBreak', () => {
  const data = Array.from({ length: 40 }, (_, i) => i < 20 ? 10 + i * 0.2 : 15 + (i - 20) * 0.1);
  it('null small', () => expect(structuralBreak(data.slice(0, 10))).toBeNull());
  it('contract keys', () => expectKeys(structuralBreak(data), ['test', 'breakpoints', 'segmentMeans', 'bic', 'n', 'apa']));
  it('breakpoints within range', () => { const r = structuralBreak(data); r.breakpoints.forEach(b => { expect(b).toBeGreaterThan(0); expect(b).toBeLessThan(data.length); }); });
});

describe('bottomUpReconciliation', () => {
  it('null for empty forecasts', () => {
    expect(bottomUpReconciliation([], [[0, 1]])).toBeNull();
    expect(bottomUpReconciliation(null, [[0, 1]])).toBeNull();
  });
  it('contract keys', () => expectKeys(bottomUpReconciliation([10, 20, 30], [[0, 1], [2]]), ['test', 'bottom', 'groups', 'total', 'n', 'nGroups', 'apa']));
  it('reconciled non-empty', () => { const r = bottomUpReconciliation([10, 20, 30], [[0, 1], [2]]); if (r) expect(r.bottom.length).toBeGreaterThan(0); });
  it('total equals sum of bottom forecasts', () => {
    const r = bottomUpReconciliation([10, 20, 30], [[0, 1], [2]]);
    if (r) expect(r.total).toBeCloseTo(60, 1);
  });
  it('groups length matches hierarchy', () => {
    const r = bottomUpReconciliation([10, 20, 30], [[0, 1], [2]]);
    if (r) expect(r.groups).toHaveLength(2);
  });
});
describe('topDownReconciliation', () => {
  it('is defined', () => expect(typeof topDownReconciliation).toBe('function'));
  it('null for missing proportions', () => {
    expect(topDownReconciliation(100, null)).toBeNull();
    expect(topDownReconciliation(null, null)).toBeNull();
  });
  it('reconciled non-empty', () => { const r = topDownReconciliation([10, 20, 30]); if (r && r.reconciled) expect(r.reconciled.length).toBeGreaterThan(0); });
  it('returns null with only one arg', () => {
    expect(topDownReconciliation([10, 20, 30])).toBeNull();
  });
});
describe('middleOutReconciliation', () => {
  it('null for empty forecasts', () => {
    expect(middleOutReconciliation([], null, null, null)).toBeNull();
    expect(middleOutReconciliation(null, null, null, null)).toBeNull();
  });
  it('contract keys', () => expectKeys(middleOutReconciliation([30, 40, 50], null, null, null), ['test', 'middle', 'upper', 'lower', 'n', 'apa']));
  it('reconciled non-empty', () => { const r = middleOutReconciliation([30, 40, 50], null, null, null); if (r) expect(r.middle.length).toBeGreaterThan(0); });
  it('n matches middle forecasts length', () => {
    const r = middleOutReconciliation([30, 40, 50], null, null, null);
    if (r) expect(r.n).toBe(3);
  });
  it('upper and lower are arrays', () => {
    const r = middleOutReconciliation([30, 40, 50], [0, 1], [2, 3, 3], null);
    if (r) { expect(Array.isArray(r.upper)).toBe(true); expect(Array.isArray(r.lower)).toBe(true); }
  });
});
describe('minTReconciliation', () => {
  const S = [[1, 0], [0, 1], [1, 1]];
  it('null for empty S', () => {
    expect(minTReconciliation([10, 20], [])).toBeNull();
    expect(minTReconciliation(null, null, null)).toBeNull();
  });
  it('contract keys', () => { const r = minTReconciliation([10, 20, 30], S, null); if (r) expectKeys(r, ['test', 'reconciled', 'n', 'm', 'apa']); });
  it('reconciled has m entries', () => {
    const r = minTReconciliation([10, 20, 30], S, null);
    if (r) { expect(r.reconciled).toHaveLength(r.m); }
  });
  it('n matches base forecast count', () => {
    const r = minTReconciliation([10, 20, 30], S, null);
    if (r) expect(r.n).toBe(3);
  });
});
describe('forecastAccuracy', () => {
  it('null length mismatch', () => expect(forecastAccuracy([1, 2], [1])).toBeNull());
  it('null for null inputs', () => {
    expect(forecastAccuracy(null, [1,2])).toBeNull();
    expect(forecastAccuracy([1,2], null)).toBeNull();
  });
  it('contract keys', () => expectKeys(forecastAccuracy([1, 2, 3, 4], [1.1, 1.9, 3.2, 3.8]), ['test', 'rmse', 'mae', 'mape', 'mase', 'n', 'apa']));
  it('rmse, mae, mape are non-negative', () => {
    const r = forecastAccuracy([1, 2, 3, 4], [1.1, 1.9, 3.2, 3.8]);
    if (r) { expect(r.rmse).toBeGreaterThanOrEqual(0); expect(r.mae).toBeGreaterThanOrEqual(0); expect(r.mape).toBeGreaterThanOrEqual(0); }
  });
  it('n matches input length', () => {
    const r = forecastAccuracy([1, 2, 3, 4], [1.1, 1.9, 3.2, 3.8]);
    if (r) expect(r.n).toBe(4);
  });
});

describe('markovSwitchingAR', () => {
  const msard = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
  it('null <20', () => expect(markovSwitchingAR([1, 2, 3])).toBeNull());
  it('null for null input', () => expect(markovSwitchingAR(null)).toBeNull());
  it('contract keys', () => {
    const r = markovSwitchingAR([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    expectKeys(r, ['test', 'states', 'transitionMatrix', 'n', 'nRegimes', 'p', 'apa']);
  });
  it('states has n entries', () => {
    const r = markovSwitchingAR(msard);
    if (r) expect(r.states).toHaveLength(Math.min(r.n, 30));
  });
  it('nRegimes defaults to 2', () => {
    const r = markovSwitchingAR(msard);
    if (r) expect(r.nRegimes).toBe(2);
  });
});

describe('regimeVolatility', () => {
  const rvd = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const rvs = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1];
  it('null <10', () => expect(regimeVolatility([1, 2], [0, 1])).toBeNull());
  it('null for null inputs', () => expect(regimeVolatility(null, null)).toBeNull());
  it('contract keys', () => expectKeys(regimeVolatility(rvd, rvs), ['test', 'volatilities', 'n', 'apa']));
  it('each volatility is non-negative', () => {
    const r = regimeVolatility(rvd, rvs);
    if (r) r.volatilities.forEach(v => { expect(v.volatility).toBeGreaterThanOrEqual(0); });
  });
  it('volatilities per unique regime', () => {
    const r = regimeVolatility(rvd, rvs);
    if (r) expect(r.volatilities.length).toBe(new Set(rvs).size);
  });
});

describe('transitionMatrix', () => {
  const tms = [1, 1, 2, 1, 2, 2, 1, 2, 1, 1];
  it('null <10', () => expect(transitionMatrix([1, 2, 1])).toBeNull());
  it('null for null input', () => expect(transitionMatrix(null)).toBeNull());
  it('contract keys', () => expectKeys(transitionMatrix(tms), ['test', 'P', 'k', 'n', 'apa']));
  it('P is k×k matrix', () => {
    const r = transitionMatrix(tms);
    if (r) { expect(r.P).toHaveLength(r.k); r.P.forEach(row => expect(row).toHaveLength(r.k)); }
  });
  it('each row in P sums to ~1', () => {
    const r = transitionMatrix(tms);
    if (r) r.P.forEach(row => expect(row.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 1));
  });
});

describe('filteredProbabilities', () => {
  const fpd = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  it('null <10', () => expect(filteredProbabilities([1, 2, 3])).toBeNull());
  it('null for null input', () => expect(filteredProbabilities(null)).toBeNull());
  it('contract keys', () => expectKeys(filteredProbabilities(fpd), ['test', 'probs', 'n', 'k', 'apa']));
  it('probs between 0-1', () => { const r = filteredProbabilities(fpd); if (r && typeof r.probs === 'object') { const vals = Object.values(r.probs).flat(Infinity); vals.forEach(p => { expect(p).toBeGreaterThanOrEqual(0); expect(p).toBeLessThanOrEqual(1); }); } });
  it('k defaults to 2', () => {
    const r = filteredProbabilities(fpd);
    if (r) expect(r.k).toBe(2);
  });
});

describe('expectedDuration', () => {
  const tm = [[0.8, 0.2], [0.3, 0.7]];
  it('null empty', () => expect(expectedDuration([])).toBeNull());
  it('null for null input', () => expect(expectedDuration(null)).toBeNull());
  it('contract keys', () => expectKeys(expectedDuration(tm), ['test', 'durations', 'k', 'apa']));
  it('durations has k entries', () => {
    const r = expectedDuration(tm);
    if (r) expect(r.durations).toHaveLength(r.k);
  });
  it('each duration is positive', () => {
    const r = expectedDuration(tm);
    if (r) r.durations.forEach(d => { expect(d).toBeGreaterThanOrEqual(0); });
  });
});

describe('peltChangePoint', () => {
  const cpd = Array.from({length:40},(_,i)=>i<20?10+i:20+i*0.5);
  it('null for short series', () => {
    expect(peltChangePoint([1,2,3,4,5])).toBeNull();
    expect(peltChangePoint(null)).toBeNull();
  });
  it('contract keys', () => {
    const r = peltChangePoint(cpd);
    expectKeys(r, ['test','breakpoints','n','pen','apa']);
    expect(r.pen).toBeGreaterThan(0);
    expect(Number.isFinite(r.pen)).toBe(true);
  });
  it('breakpoints within [0, n)', () => {
    const r = peltChangePoint(cpd);
    if (r) r.breakpoints.forEach(b => { expect(b).toBeGreaterThan(0); expect(b).toBeLessThan(r.n); });
  });
});
describe('binarySegmentation', () => {
  const bsd = Array.from({length:40},(_,i)=>i<20?5:15);
  it('null for short series', () => {
    expect(binarySegmentation([1,2,3])).toBeNull();
    expect(binarySegmentation(null)).toBeNull();
  });
  it('contract keys', () => {
    const r = binarySegmentation(bsd);
    expectKeys(r, ['test','breakpoints','n','maxBreaks','apa']);
  });
  it('breakpoints within [0, n)', () => {
    const r = binarySegmentation(bsd);
    if (r) r.breakpoints.forEach(b => { expect(b).toBeGreaterThan(0); expect(b).toBeLessThan(r.n); });
  });
  it('breakpoints count finite with limited depth', () => {
    const r = binarySegmentation(bsd, { maxBreaks: 1 });
    if (r) expect(r.breakpoints.length).toBeLessThanOrEqual(3);
  });
});
describe('singleChangepoint', () => {
  it('null for short series', () => {
    expect(singleChangepoint([1,2,3])).toBeNull();
    expect(singleChangepoint(null)).toBeNull();
  });
  it('contract keys', () => {
    const r = singleChangepoint([1,2,3,4,5,6,7,8,9,10]);
    expectKeys(r, ['test','changePoint','fStat','n','apa']);
  });
  it('changePoint within valid range', () => {
    const data = [1,1,1,1,1,1,10,10,10,10,10,10];
    const r = singleChangepoint(data);
    if (r && r.changePoint > 0) { expect(r.changePoint).toBeGreaterThanOrEqual(3); expect(r.changePoint).toBeLessThanOrEqual(r.n - 3); }
  });
  it('fStat is non-negative and finite', () => {
    const r = singleChangepoint([1,2,3,4,5,6,7,8,9,10,11,12]);
    if (r) { expect(r.fStat).toBeGreaterThanOrEqual(0); expect(Number.isFinite(r.fStat)).toBe(true); }
  });
});
describe('changepointPenalty', () => {
  const cppd = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
  it('null for short series', () => {
    expect(changepointPenalty([1,2,3])).toBeNull();
    expect(changepointPenalty(null)).toBeNull();
  });
  it('contract keys', () => {
    const r = changepointPenalty(cppd);
    expectKeys(r, ['test','penalties','n','apa']);
  });
  it('penalties length = maxChangepoints + 1', () => {
    const r = changepointPenalty(cppd, { maxChangepoints: 3 });
    if (r) expect(r.penalties).toHaveLength(4);
  });
  it('each penalty is positive and finite', () => {
    const r = changepointPenalty(cppd);
    if (r) r.penalties.forEach(p => { expect(p.penalty).toBeGreaterThan(0); expect(Number.isFinite(p.penalty)).toBe(true); });
  });
});
describe('segmentedMeans', () => {
  const smd = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
  it('null for missing data', () => {
    expect(segmentedMeans(null, null)).toBeNull();
    expect(segmentedMeans([], null)).toBeNull();
  });
  it('contract keys', () => {
    const r = segmentedMeans([10], smd);
    expectKeys(r, ['test','segments','n','apa']);
  });
  it('segments count = breakpoints.length + 1', () => {
    const r = segmentedMeans([5, 10, 15], smd);
    if (r) expect(r.segments).toHaveLength(4);
  });
  it('each segment has start, end, n, mean, sd', () => {
    const r = segmentedMeans([10], smd);
    if (r) r.segments.forEach(s => {
      expect(s.start).toBeGreaterThanOrEqual(0);
      expect(s.end).toBeGreaterThan(s.start);
      expect(s.n).toBeGreaterThan(0);
      expect(Number.isFinite(s.mean)).toBe(true);
      expect(Number.isFinite(s.sd)).toBe(true);
    });
  });
});

describe('rollingOriginCV', () => {
  const rocvd = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15];
  it('null for short series', () => {
    expect(rollingOriginCV([1,2,3], train => [train[0]*2])).toBeNull();
    expect(rollingOriginCV(null, train => [1])).toBeNull();
  });
  it('contract keys', () => {
    const r = rollingOriginCV(rocvd, train => [train[0]*2]);
    expectKeys(r, ['test', 'rmse', 'nFolds', 'initialWindow', 'horizon', 'n', 'apa']);
  });
  it('nFolds > 0', () => {
    const r = rollingOriginCV(rocvd, train => [train[0]*2]);
    if (r) expect(r.nFolds).toBeGreaterThan(0);
  });
  it('rmse is finite and non-negative', () => {
    const r = rollingOriginCV(rocvd, train => [train[0]*2]);
    if (r) { expect(r.rmse).toBeGreaterThanOrEqual(0); expect(Number.isFinite(r.rmse)).toBe(true); }
  });
});
describe('slidingWindow', () => {
  const swd = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
  it('null for data shorter than windowSize', () => {
    expect(slidingWindow([1,2,3], train => train[0])).toBeNull();
    expect(slidingWindow(null, train => 1)).toBeNull();
  });
  it('contract keys', () => {
    const r = slidingWindow(swd, train => train[0]);
    expectKeys(r, ['test', 'values', 'windowSize', 'step', 'n', 'apa']);
  });
  it('values array is non-empty', () => {
    const r = slidingWindow(swd, train => train[0], { windowSize: 5 });
    if (r) expect(r.values.length).toBeGreaterThan(0);
  });
  it('values are finite', () => {
    const r = slidingWindow(swd, train => train[0]);
    if (r) r.values.forEach(v => { expect(Number.isFinite(v)).toBe(true); });
  });
});
describe('gapValidation', () => {
  const gvd = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20];
  it('null for short series', () => {
    expect(gapValidation([1,2,3], (train, h) => [train[0]])).toBeNull();
    expect(gapValidation(null, (train, h) => [1])).toBeNull();
  });
  it('contract keys', () => {
    const r = gapValidation(gvd, (train, h) => [train[0]]);
    expectKeys(r, ['test', 'rmse', 'gapSize', 'n', 'apa']);
  });
  it('rmse is finite and non-negative', () => {
    const r = gapValidation(gvd, (train, h) => Array.from({ length: h }, (_, k) => train[train.length - 1]));
    if (r) { expect(r.rmse).toBeGreaterThanOrEqual(0); expect(Number.isFinite(r.rmse)).toBe(true); }
  });
  it('gapSize matches input', () => {
    const r = gapValidation(gvd, (train, h) => [train[0]], { gapSize: 3 });
    if (r) expect(r.gapSize).toBe(3);
  });
});
describe('tsFeatures', () => {
  it('null for short series', () => {
    expect(tsFeatures([1,2,3])).toBeNull();
    expect(tsFeatures(null)).toBeNull();
  });
  it('contract keys', () => {
    const r = tsFeatures([1,2,3,4,5,6,7,8,9,10]);
    expectKeys(r, ['test', 'features', 'n', 'apa']);
  });
  it('features has mean, variance, meanChange, entropy', () => {
    const r = tsFeatures([1,2,3,4,5,6,7,8,9,10]);
    if (r) {
      expect(Number.isFinite(r.features.mean)).toBe(true);
      expect(r.features.variance).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(r.features.meanChange)).toBe(true);
      expect(r.features.entropy).toBeGreaterThanOrEqual(0);
    }
  });
  it('features are finite', () => {
    const r = tsFeatures(stationarySeries);
    if (r) Object.values(r.features).forEach(v => { expect(Number.isFinite(v)).toBe(true); });
  });
});
describe('forecastReconciliation', () => {
  it('null for empty forecasts', () => {
    expect(forecastReconciliation([], [[0,1,2]], [12, 22, 28])).toBeNull();
    expect(forecastReconciliation(null, [[0,1,2]], [12, 22, 28])).toBeNull();
  });
  it('contract keys', () => {
    const r = forecastReconciliation([10, 20, 30], [[0,1,2]], [12, 22, 28]);
    expectKeys(r, ['test', 'reconciled', 'n', 'apa']);
  });
  it('reconciled array is non-empty', () => {
    const r = forecastReconciliation([10, 20, 30], [[0,1,2]], [12, 22, 28]);
    if (r) expect(r.reconciled.length).toBeGreaterThan(0);
  });
  it('n matches input length', () => {
    const r = forecastReconciliation([10, 20, 30], [[0,1,2]], [12, 22, 28]);
    if (r) expect(r.n).toBe(3);
  });
});

describe('mase', () => {
  it('null for length < 5', () => {
    expect(mase([1,2], [1,2], null)).toBeNull();
    expect(mase(null, null, null)).toBeNull();
  });
  it('null for length mismatch', () => {
    expect(mase([1,2,3,4,5], [1.5,2.5,3.5], null)).toBeNull();
  });
  it('contract keys', () => {
    const r = mase([1,2,3,4,5],[1.5,2.5,3.5,4.5,5.5],null);
    expectKeys(r, ['test','mase','n','apa']);
  });
  it('mase is non-negative and finite', () => {
    const r = mase([1,2,3,4,5],[1.5,2.5,3.5,4.5,5.5],null);
    if (r) { expect(r.mase).toBeGreaterThanOrEqual(0); expect(Number.isFinite(r.mase)).toBe(true); }
  });
});
describe('smape', () => {
  it('null for length < 5', () => {
    expect(smape([1,2], [1,2])).toBeNull();
    expect(smape(null, null)).toBeNull();
  });
  it('null for length mismatch', () => {
    expect(smape([1,2,3,4,5], [1.5,2.5,3.5])).toBeNull();
  });
  it('contract keys', () => {
    const r = smape([1,2,3,4,5],[1.5,2.5,3.5,4.5,5.5]);
    expectKeys(r, ['test','smape','n','apa']);
  });
  it('smape in [0, 200]', () => {
    const r = smape([1,2,3,4,5],[1.5,2.5,3.5,4.5,5.5]);
    if (r) { expect(r.smape).toBeGreaterThanOrEqual(0); expect(r.smape).toBeLessThanOrEqual(200); }
  });
});
describe('theilU', () => {
  it('null for length < 5', () => {
    expect(theilU([1,2], [1,2])).toBeNull();
    expect(theilU(null, null)).toBeNull();
  });
  it('null for length mismatch', () => {
    expect(theilU([1,2,3,4,5], [1.5,2.5,3.5])).toBeNull();
  });
  it('contract keys', () => {
    const r = theilU([1,2,3,4,5],[1.5,2.5,3.5,4.5,5.5]);
    expectKeys(r, ['test','U1','U2','n','apa']);
  });
  it('U1 and U2 are non-negative and finite', () => {
    const r = theilU([1,2,3,4,5],[1.5,2.5,3.5,4.5,5.5]);
    if (r) {
      expect(r.U1).toBeGreaterThanOrEqual(0); expect(Number.isFinite(r.U1)).toBe(true);
      expect(r.U2).toBeGreaterThanOrEqual(0); expect(Number.isFinite(r.U2)).toBe(true);
    }
  });
});
describe('dieboldMariano', () => {
  it('null for length < 5', () => {
    expect(dieboldMariano([0.1,0.2],[0.2,0.3])).toBeNull();
    expect(dieboldMariano(null, null)).toBeNull();
  });
  it('null for length mismatch', () => {
    expect(dieboldMariano([0.1,0.2,0.1,0.3,0.2],[0.2,0.1,0.2])).toBeNull();
  });
  it('contract keys', () => {
    const r = dieboldMariano([0.1,0.2,0.1,0.3,0.2],[0.2,0.1,0.2,0.2,0.3]);
    expectKeys(r, ['test','dm','p','h','n','apa']);
  });
  it('dm is finite, p in [0,1]', () => {
    const r = dieboldMariano([0.1,0.2,0.1,0.3,0.2],[0.2,0.1,0.2,0.2,0.3]);
    if (r) { expect(Number.isFinite(r.dm)).toBe(true); expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); }
  });
});
describe('encompassingTest', () => {
  it('null for actual.length < 5', () => {
    expect(encompassingTest([1,2],[1.5,2.5],[1,2])).toBeNull();
    expect(encompassingTest(null, null, null)).toBeNull();
  });
  it('contract keys', () => {
    const r = encompassingTest([1,2,3,4,5],[1.5,2.5,3.5,4.5,5.5],[1,2,3,4,5]);
    expectKeys(r, ['test','t','p','n','apa']);
  });
  it('t is finite, p in [0,1]', () => {
    const r = encompassingTest([1,2,3,4,5],[1.5,2.5,3.5,4.5,5.5],[1,2,3,4,5]);
    if (r) { expect(Number.isFinite(r.t)).toBe(true); expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); }
  });
  it('n matches minimum length', () => {
    const r = encompassingTest([1,2,3,4,5,6],[1.5,2.5,3.5,4.5,5.5,6.5],[1,2,3,4,5,6]);
    if (r) expect(r.n).toBe(6);
  });
});
describe('varmax', () => {
  it('is defined', () => expect(typeof varmax).toBe('function'));
  it('contract keys', () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ y: i, x1: i * 2, x2: i * 3 }));
    const r = varmax(data, 'y', ['x1', 'x2']);
    if (r) expectKeys(r, ['test', 'n', 'p', 'q', 'nExog', 'apa']);
  });
  it('null for data.length < 15', () => {
    expect(varmax([{y:1}], 'y', [])).toBeNull();
    expect(varmax(null, 'y', [])).toBeNull();
  });
  it('nExog matches xVars length', () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ y: i, x1: i * 2 }));
    const r = varmax(data, 'y', ['x1']);
    if (r) expect(r.nExog).toBe(1);
  });
});

describe('cointegrationRank', () => {
  it('is defined', () => expect(typeof cointegrationRank).toBe('function'));
  it('contract keys', () => {
    const r = cointegrationRank([1,2,3]);
    if (r) expectKeys(r, ['test', 'bestRank', 'testStats', 'maxRank', 'n', 'apa']);
  });
  it('null for empty data', () => {
    expect(cointegrationRank([])).toBeNull();
    expect(cointegrationRank(null)).toBeNull();
  });
  it('bestRank within [0, maxRank]', () => {
    const r = cointegrationRank([1,2,3], { maxRank: 3 });
    if (r) { expect(r.bestRank).toBeGreaterThanOrEqual(0); expect(r.bestRank).toBeLessThanOrEqual(3); }
  });
});
describe('vecm', () => {
  it('is defined', () => expect(typeof vecm).toBe('function'));
  it('contract keys', () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ y: i, x1: i * 2 }));
    const r = vecm(data, 'y', ['x1']);
    if (r) expectKeys(r, ['test', 'n', 'p', 'rank', 'apa']);
  });
  it('null for data.length < 15', () => {
    expect(vecm([{y:1}], 'y', [])).toBeNull();
    expect(vecm(null, 'y', [])).toBeNull();
  });
  it('rank, p, n are sensible', () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ y: i, x1: i * 2 }));
    const r = vecm(data, 'y', ['x1'], { p: 2, rank: 1 });
    if (r) { expect(r.n).toBe(20); expect(r.p).toBe(2); expect(r.rank).toBeGreaterThanOrEqual(0); expect(r.rank).toBeLessThanOrEqual(1); }
  });
  it('p and n are positive', () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ y: i, x1: i * 2 }));
    const r = vecm(data, 'y', ['x1'], { p: 2, rank: 1 });
    if (r) { expect(r.p).toBeGreaterThan(0); expect(r.n).toBeGreaterThan(0); }
  });
});
describe('impulseResponseCI', () => {
  it('null for empty irf', () => {
    expect(impulseResponseCI([])).toBeNull();
    expect(impulseResponseCI(null)).toBeNull();
  });
  it('contract keys', () => {
    const r = impulseResponseCI([1,0.8,0.6,0.4,0.2]);
    expectKeys(r, ['test','irf','ci','B','n','apa']);
  });
  it('ci has lo and hi arrays', () => {
    const r = impulseResponseCI([1,0.8,0.6,0.4,0.2]);
    if (r) { expect(Array.isArray(r.ci.lo)).toBe(true); expect(Array.isArray(r.ci.hi)).toBe(true); }
  });
  it('irf and ci lengths match', () => {
    const r = impulseResponseCI([1,0.8,0.6,0.4,0.2]);
    if (r) { expect(r.irf.length).toBe(r.ci.lo.length); expect(r.ci.lo.length).toBe(r.ci.hi.length); }
  });
});
describe('fevdDecomposition', () => {
  it('null for missing k', () => {
    expect(fevdDecomposition({})).toBeNull();
    expect(fevdDecomposition(null)).toBeNull();
  });
  it('contract keys', () => {
    const r = fevdDecomposition({k:3});
    expectKeys(r, ['test','fevd','k','horizon','apa']);
  });
  it('fevd array length = horizon', () => {
    const r = fevdDecomposition({k:3}, { horizon: 5 });
    if (r) expect(r.fevd).toHaveLength(5);
  });
  it('each horizon has decomposition per variable', () => {
    const r = fevdDecomposition({k:3}, { horizon: 3 });
    if (r) r.fevd.forEach(h => { expect(h.decomposition).toHaveLength(3); });
  });
});

describe('dccGarch', () => {
  const returns = [[0.01,-0.02],[0.03,0.01],[-0.005,0.02],[0.01,-0.01],[0.005,0.025],[-0.015,0.03],[0.01,0.01],[-0.01,-0.01],[0.02,0.01],[0.01,-0.01],[0.03,-0.02],[0.01,0.02],[0.02,0.01],[0.01,-0.01],[0.015,0.01],[-0.01,0.02],[0.01,0.01],[0.02,-0.01],[0.01,0.015],[0.01,0.02]].map(r=>[r[0],r[1]]);
  it('null for short returns', () => {
    expect(dccGarch([[1,2],[3,4]])).toBeNull();
    expect(dccGarch(null)).toBeNull();
  });
  it('contract keys', () => {
    const r = dccGarch(returns);
    expectKeys(r, ['test','n','k','p','q','apa']);
  });
  it('n matches input length, k matches dimensions', () => {
    const r = dccGarch(returns);
    if (r) { expect(r.n).toBe(20); expect(r.k).toBe(2); }
  });
  it('p and q match defaults', () => {
    const r = dccGarch(returns, { p: 2, q: 2 });
    if (r) { expect(r.p).toBe(2); expect(r.q).toBe(2); }
  });
});
describe('bekkGarch', () => {
  const returns = [[0.01,0.02],[0.03,0.01],[-0.005,0.02],[0.01,-0.01],[0.005,0.025],[-0.015,0.03],[0.01,0.01],[-0.01,-0.01],[0.02,0.01],[0.01,-0.01],[0.03,-0.02],[0.01,0.02],[0.02,0.01],[0.01,-0.01],[0.015,0.01],[-0.01,0.02],[0.01,0.01],[0.02,-0.01],[0.01,0.015],[0.01,0.02]].map(r=>[r[0],r[1]]);
  it('null for short returns', () => {
    expect(bekkGarch([[1,2],[3,4]])).toBeNull();
    expect(bekkGarch(null)).toBeNull();
  });
  it('contract keys', () => {
    const r = bekkGarch(returns);
    expectKeys(r, ['test','C','k','T','p','q','apa']);
  });
  it('k matches input dimensions', () => {
    const r = bekkGarch(returns);
    if (r) expect(r.k).toBe(2);
  });
  it('p and q match defaults', () => {
    const r = bekkGarch(returns, { p: 2, q: 2 });
    if (r) { expect(r.p).toBe(2); expect(r.q).toBe(2); }
  });
});
describe('cccGarch', () => {
  const returns = [[0.01,-0.02],[0.03,0.01],[-0.005,0.02],[0.01,-0.01],[0.005,0.025],[-0.015,0.03],[0.01,0.01],[-0.01,-0.01],[0.02,0.01],[0.01,-0.01],[0.03,-0.02],[0.01,0.02],[0.02,0.01],[0.01,-0.01],[0.015,0.01],[-0.01,0.02],[0.01,0.01],[0.02,-0.01],[0.01,0.015],[0.01,0.02]].map(r=>[r[0],r[1]]);
  it('is defined', () => expect(typeof cccGarch).toBe('function'));
  it('contract keys', () => {
    const r = cccGarch(returns);
    if (r) expectKeys(r, ['test','R','k','T','p','q','apa']);
  });
  it('null for short returns', () => {
    expect(cccGarch([[1,2],[3,4]])).toBeNull();
    expect(cccGarch(null)).toBeNull();
  });
  it('R matrix is square k×k', () => {
    const r = cccGarch(returns);
    if (r) { expect(r.R).toHaveLength(r.k); expect(r.R[0]).toHaveLength(r.k); }
  });
});
describe('mgarchForecast', () => {
  it('null for missing k', () => {
    expect(mgarchForecast({})).toBeNull();
    expect(mgarchForecast(null)).toBeNull();
  });
  it('contract keys', () => {
    const r = mgarchForecast({k:2});
    expectKeys(r, ['test','forecast','steps','k','apa']);
  });
  it('forecast array has steps entries', () => {
    const r = mgarchForecast({k:2}, 3);
    if (r) expect(r.forecast).toHaveLength(3);
  });
  it('each forecast matrix is k×k', () => {
    const r = mgarchForecast({k:2}, 2);
    if (r) r.forecast.forEach(m => { expect(m).toHaveLength(2); expect(m[0]).toHaveLength(2); });
  });
});
describe('mgarchDiagnostics', () => {
  it('null for null input', () => {
    expect(mgarchDiagnostics(null)).toBeNull();
  });
  it('contract keys', () => {
    const r = mgarchDiagnostics({n:100,k:2});
    expectKeys(r, ['test','n','k','apa']);
  });
  it('n and k match input', () => {
    const r = mgarchDiagnostics({n:100,k:2});
    if (r) { expect(r.n).toBe(100); expect(r.k).toBe(2); }
  });
  it('n and k are non-negative', () => {
    const r = mgarchDiagnostics({n:0,k:0});
    if (r) { expect(r.n).toBeGreaterThanOrEqual(0); expect(r.k).toBeGreaterThanOrEqual(0); }
  });
});

describe('egarch', () => {
  const rets = Array.from({length: 30}, (_, i) => (Math.sin(i * 0.5) - 0.1) * 0.02 + 0.001);
  it('null <20', () => expect(egarch(rets.slice(0,10))).toBeNull());
  it('null for null input', () => expect(egarch(null)).toBeNull());
  it('contract keys', () => expectKeys(egarch(rets), ['test','params','condVar','n','apa']));
  it('params has omega, alpha, beta, gamma', () => {
    const r = egarch(rets);
    if (r) { expect(Number.isFinite(r.params.omega)).toBe(true); expect(Number.isFinite(r.params.alpha)).toBe(true); expect(Number.isFinite(r.params.beta)).toBe(true); expect(Number.isFinite(r.params.gamma)).toBe(true); }
  });
  it('condVar values are positive', () => {
    const r = egarch(rets);
    if (r) r.condVar.forEach(v => { expect(v).toBeGreaterThan(0); });
  });
});
describe('stateSpace', () => {
  const obs = Array.from({length: 30}, (_, i) => i * 0.5 + Math.sin(i * 0.4));
  it('null <5', () => expect(stateSpace(obs.slice(0,3))).toBeNull());
  it('null for null input', () => expect(stateSpace(null)).toBeNull());
  it('contract keys', () => expectKeys(stateSpace(obs), ['test','filtered','smoothed','n','apa']));
  it('filtered and smoothed have same length', () => {
    const r = stateSpace(obs);
    if (r) { expect(r.filtered.length).toBe(r.smoothed.length); }
  });
  it('filtered values trims to 15', () => {
    const r = stateSpace(obs);
    if (r) expect(r.filtered.length).toBeLessThanOrEqual(15);
  });
});

describe('cointegrationRank runs real Johansen on multivariate series', () => {
  function rwTrend(seed) { let s = seed; const z = () => { let u = 0; for (let i = 0; i < 12; i++) { s = (Math.imul(1664525, s) + 1013904223) >>> 0; u += s / 2 ** 32; } return u - 6; }; return z; }
  it('detects rank 1 for two cointegrated series, rank 0 for independent walks', () => {
    const z = rwTrend(123); let w = 0;
    const coint = [];
    for (let t = 0; t < 150; t++) { w += z(); coint.push([w + z() * 0.3, w + z() * 0.3]); } // share the trend w
    expect(cointegrationRank(coint).bestRank).toBe(1);
    const z2 = rwTrend(77); let a = 0, b = 0; const indep = [];
    for (let t = 0; t < 150; t++) { a += z2(); b += z2(); indep.push([a, b]); } // independent random walks
    expect(cointegrationRank(indep).bestRank).toBe(0);
  });
});

describe('egarch estimates its parameters by MLE', () => {
  it('recovers a strong ARCH effect from simulated EGARCH data', () => {
    // simulate EGARCH(1,1) with strong ARCH (alpha=0.4) and leverage (gamma<0)
    let s = 4321; const z = () => { let u = 0; for (let i = 0; i < 12; i++) { s = (Math.imul(1664525, s) + 1013904223) >>> 0; u += s / 2 ** 32; } return u - 6; };
    const omega = -0.2, alpha = 0.4, beta = 0.9, gamma = -0.2;
    let lh = omega / (1 - beta); const data = [];
    for (let t = 0; t < 800; t++) { const zt = z(); data.push(Math.sqrt(Math.exp(lh)) * zt); lh = omega + beta * lh + alpha * (Math.abs(zt) - Math.sqrt(2 / Math.PI)) + gamma * zt; }
    const r = egarch(data);
    expect(r.params.alpha).toBeGreaterThan(0.2); // estimated strong ARCH, not the hardcoded 0.1
    expect(r.params.gamma).toBeLessThan(0);      // estimated leverage, not the hardcoded +0.05
  });
});

describe('VAR cluster: real estimation (varmax, vecm, FEVD, IRF CI)', () => {
  function lcg(seed) { let s = seed; return () => { let u = 0; for (let k = 0; k < 12; k++) { s = (Math.imul(1664525, s) + 1013904223) >>> 0; u += s / 2 ** 32; } return u - 6; }; }

  it('varmax (ARMAX) recovers the AR and exogenous coefficients', () => {
    const z = lcg(3); const data = []; let yPrev = 0;
    for (let i = 0; i < 200; i++) { const x = z(); const y = 0.5 * yPrev + 1.5 * x + z() * 0.3; data.push({ y, x1: x }); yPrev = y; }
    const r = varmax(data, 'y', ['x1'], { p: 1, q: 1 });
    const ar = r.coefficients.find(c => c.term === 'ar1');
    const ex = r.coefficients.find(c => c.term === 'x1');
    expect(Math.abs(ar.estimate - 0.5)).toBeLessThan(0.2);
    expect(Math.abs(ex.estimate - 1.5)).toBeLessThan(0.3);
  });

  it('vecm recovers a negative error-correction adjustment for cointegrated series', () => {
    const z = lcg(7); const data = []; let x = 0;
    for (let i = 0; i < 200; i++) { x += z(); const y = x + z() * 0.5; data.push({ y, x1: x }); } // y,x cointegrated (y≈x)
    const r = vecm(data, 'y', ['x1'], { p: 1 });
    expect(r.adjustment).toBeLessThan(0);        // error-correction pulls back toward equilibrium
    expect(Math.abs(r.cointegratingVector[0] - 1)).toBeLessThan(0.3); // β ≈ 1
  });

  it('fevdDecomposition computes a real orthogonalized FEVD from a fitted VAR', () => {
    const z = lcg(11); const v0 = [], v1 = []; let a = 0, b = 0;
    for (let i = 0; i < 200; i++) { const na = z() * 0.1, nb = z(); a = 0.2 * a + 0.9 * b + na; b = 0.5 * b + nb; v0.push(a); v1.push(b); } // y0 driven by LAGGED y1
    const var2 = varModel({ y0: v0, y1: v1 }, 1, { horizon: 10 });
    const r = fevdDecomposition(var2, { horizon: 8 });
    // y0 is driven mostly by y1's shock → at a longer horizon, shock(y1) share of y0 > own share
    const last = r.fevd[r.fevd.length - 1].decomposition.find(d => d.variable.includes('0') || d.variable === 'y0' || d.variable === 'V1');
    const fromY1 = last.contributions.find(c => c.source.includes('1') || c.source === 'y1' || c.source === 'V2');
    expect(fromY1.pct).toBeGreaterThan(40);
  });

  it('impulseResponseCI does a real residual bootstrap (data-driven width)', () => {
    const z = lcg(5); const y0 = [], y1 = []; let a = 0, b = 0;
    for (let i = 0; i < 200; i++) { a = 0.6 * a + 0.0001 * z(); b = 0.5 * b + 0.0001 * z(); y0.push(a); y1.push(b); } // near-deterministic
    const r = impulseResponseCI({ y0, y1 }, { p: 1, horizon: 6, shock: 0, respond: 0, B: 100, seed: 1 });
    // low-noise data → narrow CI, unlike the old fixed ±1.96·|v|·0.3 (≈0.59·|v|)
    const width = (r.ci.hi[1] - r.ci.lo[1]);
    expect(width).toBeLessThan(0.3 * Math.abs(r.irf[1]) + 0.05);
  });
});

describe('MGARCH family: real multivariate volatility estimation', () => {
  // Simulate two GARCH(1,1) series with correlated innovations (corr rho).
  function simMGARCH(T, rho, seed) {
    let s = seed; const N = () => { let u = 0; for (let k = 0; k < 12; k++) { s = (Math.imul(1664525, s) + 1013904223) >>> 0; u += s / 2 ** 32; } return u - 6; };
    const om = 0.00002, al = 0.08, be = 0.9;
    let h0 = om / (1 - al - be), h1 = h0; const out = [];
    for (let t = 0; t < T; t++) {
      const z0 = N(), z1 = rho * z0 + Math.sqrt(1 - rho * rho) * N();
      const e0 = Math.sqrt(h0) * z0, e1 = Math.sqrt(h1) * z1;
      out.push([e0, e1]);
      h0 = om + al * e0 * e0 + be * h0; h1 = om + al * e1 * e1 + be * h1;
    }
    return out;
  }

  it('cccGarch recovers the constant conditional correlation', () => {
    const r = cccGarch(simMGARCH(600, 0.6, 3));
    expect(Math.abs(r.R[0][1] - 0.6)).toBeLessThan(0.15);
    expect(r.R[0][0]).toBeCloseTo(1, 6);
  });

  it('dccGarch estimates valid DCC parameters and a time-varying correlation', () => {
    const r = dccGarch(simMGARCH(600, 0.6, 5));
    expect(r.a).toBeGreaterThanOrEqual(0);
    expect(r.b).toBeGreaterThanOrEqual(0);
    expect(r.a + r.b).toBeLessThan(1);
    expect(Math.abs(r.meanCorr - 0.6)).toBeLessThan(0.2); // average dynamic correlation
  });

  it('bekkGarch targets the unconditional covariance', () => {
    const data = simMGARCH(600, 0.6, 7);
    const r = bekkGarch(data);
    expect(r.a + r.b).toBeLessThan(1);
    expect(r.a).toBeGreaterThan(0);
  });

  it('mgarchForecast produces a valid covariance forecast from a fitted CCC model', () => {
    const model = cccGarch(simMGARCH(600, 0.6, 9));
    const r = mgarchForecast(model, 3);
    expect(r.forecast[0][0][0]).toBeGreaterThan(0);               // positive variance
    expect(Math.sign(r.forecast[0][0][1])).toBe(Math.sign(model.R[0][1])); // covariance sign matches correlation
  });

  it('mgarchDiagnostics finds no remaining ARCH in standardized residuals of a fit', () => {
    const model = cccGarch(simMGARCH(600, 0.6, 11));
    const r = mgarchDiagnostics(model);
    expect(r.archTests[0].p).toBeGreaterThan(0.05); // standardized resids are ~white
  });
});
