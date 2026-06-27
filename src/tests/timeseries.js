import { avg, sampleVar, corr, fmtP } from '../math/core.js';
import { tPVal, fPVal } from '../math/distributions.js';
import { matInv, matMul, matTrans, jacobiEigen } from '../math/matrix.js';

const ADF_CRITICAL = {
  noConstant:  { "1%": -2.58, "5%": -1.95, "10%": -1.62 },
  constant:    { "1%": -3.43, "5%": -2.86, "10%": -2.57 },
  trend:       { "1%": -3.96, "5%": -3.41, "10%": -3.13 },
};

function laggedDiff(series, lag) {
  const result = [];
  for (let i = lag; i < series.length; i++) {
    result.push(series[i] - series[i - lag]);
  }
  return result;
}

function chol(A, k) {
  const L = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < k; i++) {
    for (let j = 0; j <= i; j++) {
      let s = 0;
      for (let p = 0; p < j; p++) s += L[i][p] * L[j][p];
      if (i === j) {
        const val = A[i][i] - s;
        if (val <= 1e-12) {
          for (let r = 0; r < k; r++) { for (let c = 0; c < k; c++) L[r][c] = r === c ? 1 : 0; }
          return L;
        }
        L[i][j] = Math.sqrt(val);
      } else {
        L[i][j] = (A[i][j] - s) / Math.max(L[j][j], 1e-12);
      }
    }
  }
  return L;
}

function olsSimple(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  const mx = avg(xs), my = avg(ys);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  if (den === 0) return null;
  const beta = num / den;
  const alpha = my - beta * mx;
  const resid = ys.map((y, i) => y - alpha - beta * xs[i]);
  const rss = resid.reduce((s, e) => s + e * e, 0);
  const se = Math.sqrt(rss / (n - 2)) / Math.sqrt(den);
  const t = beta / se;
  return { alpha, beta, se, t, resid, n };
}

function olsMultiple(Y, X) {
  const n = Y.length;
  const k = X[0].length;
  if (n <= k) return null;
  const Xt = X[0].map((_, j) => X.map(row => row[j]));
  const XtX = Xt.map(r => X[0].map((_, j) => r.reduce((s, _, p) => s + X[p][j] * r[p], 0)));
  const XtY = Xt.map(r => r.reduce((s, _, i) => s + r[i] * Y[i], 0));
  const det = (m) => {
    if (m.length === 1) return m[0][0];
    if (m.length === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
    let d = 0;
    for (let j = 0; j < m.length; j++) {
      const sub = m.slice(1).map(r => r.filter((_, c) => c !== j));
      d += (j % 2 ? -1 : 1) * m[0][j] * det(sub);
    }
    return d;
  };
  const cramer = (A, b, col) => {
    const M = A.map((r, i) => r.map((v, j) => j === col ? b[i] : v));
    return det(M) / det(A);
  };
  const d = det(XtX);
  if (Math.abs(d) < 1e-14) return null;
  const coeffs = Array.from({ length: k }, (_, j) => cramer(XtX, XtY, j));
  const pred = Y.map((_, i) => coeffs.reduce((s, c, j) => s + c * X[i][j], 0));
  const resid = Y.map((y, i) => y - pred[i]);
  return { coeffs, resid, n, k };
}

export function adfTest(series, { maxLag = 0, trend = true } = {}) {
  if (!series || series.length < 10) return null;
  const n = series.length;
  const deltaY = laggedDiff(series, 1);
  const yLag = series.slice(1);
  if (!deltaY.length || deltaY.length !== yLag.length) return null;

  let predictors = yLag.map((_, i) => {
    const row = [yLag[i]];
    return row;
  });

  if (trend) {
    predictors = predictors.map((row, i) => [...row, i + 1]);
  }

  let actualMaxLag = 0;
  for (let p = 1; p <= maxLag; p++) {
    const lagged = [];
    for (let i = 0; i < deltaY.length; i++) {
      lagged.push(i >= p ? deltaY[i - p] : 0);
    }
    predictors = predictors.map((row, i) => [...row, lagged[i]]);
    actualMaxLag = p;
  }

  if (!predictors[0]?.length) return null;
  const fit = olsMultiple(deltaY, predictors);
  if (!fit) return null;

  const se = Math.sqrt(fit.resid.reduce((s, e) => s + e * e, 0) / (fit.resid.length - fit.coeffs.length));
  const tauStat = fit.coeffs[0] / (se * Math.sqrt(1 / (yLag.reduce((s, v) => s + (v - avg(yLag)) ** 2, 0) || 1)));
  const seReg = olsSimple(yLag, deltaY);
  const tauSimple = seReg ? seReg.t : tauStat;

  const criticalKey = trend ? "trend" : "constant";
  const critical = ADF_CRITICAL[criticalKey];
  const stationary = tauSimple < critical["5%"];
  let pEst = 0.5;
  if (tauSimple < critical["1%"]) pEst = 0.001;
  else if (tauSimple < critical["5%"]) pEst = 0.03;
  else if (tauSimple < critical["10%"]) pEst = 0.08;
  else pEst = 0.2;

  return {
    test: "Augmented Dickey-Fuller Test",
    tauStat: +tauSimple.toFixed(4),
    pValue: +pEst.toFixed(4),
    criticalValues: critical,
    stationary,
    trend,
    maxLag: actualMaxLag,
    n,
    apa: `ADF τ = ${tauSimple.toFixed(2)}, p ≈ ${pEst.toFixed(3)}${stationary ? ' (stationary at 5%)' : ''}, lags = ${actualMaxLag}`,
  };
}

export function acf(series, maxLag = 20) {
  if (!series || series.length < 4) return null;
  const n = series.length;
  const lag = Math.min(maxLag, n - 3);
  const m = avg(series);
  const denom = series.reduce((s, v) => s + (v - m) ** 2, 0);
  if (denom === 0) return Array.from({ length: lag + 1 }, (_, k) => ({ lag: k, autocorrelation: k === 0 ? 1 : 0 }));
  const result = [];
  for (let k = 0; k <= lag; k++) {
    let num = 0;
    for (let t = k; t < n; t++) {
      num += (series[t] - m) * (series[t - k] - m);
    }
    result.push({ lag: k, autocorrelation: +(num / denom).toFixed(6) });
  }
  return result;
}

export function pacf(series, maxLag = 20) {
  if (!series || series.length < 4) return null;
  const n = series.length;
  const lag = Math.min(maxLag, n - 3);
  const acfVals = acf(series, lag);
  if (!acfVals) return null;
  const result = [{ lag: 0, partialAutocorrelation: 1 }];
  for (let k = 1; k <= lag; k++) {
    const R = Array.from({ length: k }, (_, i) =>
      Array.from({ length: k }, (_, j) => acfVals[Math.abs(i - j)].autocorrelation)
    );
    const r = Array.from({ length: k }, (_, i) => acfVals[i + 1].autocorrelation);
    if (k === 1) {
      result.push({ lag: k, partialAutocorrelation: +(r[0] / (R[0][0] || 1e-14)).toFixed(6) });
    } else {
      const solve = (A, b) => {
        const nk = A.length;
        const aug = A.map((row, i) => [...row, b[i]]);
        for (let c = 0; c < nk; c++) {
          let piv = c;
          for (let ri = c + 1; ri < nk; ri++) if (Math.abs(aug[ri][c]) > Math.abs(aug[piv][c])) piv = ri;
          [aug[c], aug[piv]] = [aug[piv], aug[c]];
          const div = aug[c][c];
          if (Math.abs(div) < 1e-14) return Array(nk).fill(0);
          for (let j = c; j <= nk; j++) aug[c][j] /= div;
          for (let ri = 0; ri < nk; ri++) {
            if (ri === c) continue;
            const factor = aug[ri][c];
            for (let j = c; j <= nk; j++) aug[ri][j] -= factor * aug[c][j];
          }
        }
        return aug.map(row => row[nk]);
      };
      const sol = solve(R, r);
      result.push({ lag: k, partialAutocorrelation: +sol[k - 1].toFixed(6) });
    }
  }
  return result;
}

export function arima(series, { p = 1, d = 0, q = 1, maxIter = 100, tolerance = 1e-5 } = {}) {
  if (!series || series.length < 10 + p + q) return null;
  let Y = series.slice();
  let diffs = 0;
  for (let di = 0; di < d; di++) {
    Y = laggedDiff(Y, 1);
    diffs++;
  }
  const n = Y.length;
  if (n < p + q + 3) return null;

  let phi = Array(p).fill(0);
  let theta = Array(q).fill(0);
  let intercept = avg(Y);

  function computeErrors(params) {
    const ip = params[0];
    const phis = params.slice(1, 1 + p);
    const thetas = params.slice(1 + p);
    const errors = Array(n).fill(0);
    const meanC = ip / (1 - phis.reduce((s, v) => s + v, 0) || 1);
    for (let t = 0; t < n; t++) {
      let pred = meanC;
      for (let i = 0; i < p; i++) pred += t - i - 1 >= 0 ? phis[i] * Y[t - i - 1] : 0;
      for (let j = 0; j < q; j++) pred += t - j - 1 >= 0 ? thetas[j] * errors[t - j - 1] : 0;
      errors[t] = Y[t] - pred;
    }
    return errors;
  }

  function ssq(params) {
    const errs = computeErrors(params);
    return errs.reduce((s, e) => s + e * e, 0);
  }

  let bestParams = [intercept, ...phi, ...theta];
  let bestSSQ = ssq(bestParams);
  for (let iter = 0; iter < maxIter; iter++) {
    const eps = 1e-6;
    const grad = bestParams.map((_, j) => {
      const paramsUp = [...bestParams]; paramsUp[j] += eps;
      const paramsDn = [...bestParams]; paramsDn[j] -= eps;
      return (ssq(paramsUp) - ssq(paramsDn)) / (2 * eps);
    });
    let lambda = 0.01;
    for (let shrink = 0; shrink < 20; shrink++) {
      const cand = bestParams.map((v, j) => v - lambda * grad[j]);
      const candSSQ = ssq(cand);
      if (candSSQ < bestSSQ) { bestParams = cand; bestSSQ = candSSQ; break; }
      lambda *= 0.5;
    }
    if (grad.reduce((s, g) => s + g * g, 0) < tolerance) break;
  }

  const finalErrors = computeErrors(bestParams);
  const sigma2 = bestSSQ / (n - p - q - 1);
  const logLik = -0.5 * n * Math.log(2 * Math.PI * sigma2) - bestSSQ / (2 * sigma2);
  const aic = 2 * (p + q + 1) - 2 * logLik;
  const bic = Math.log(n) * (p + q + 1) - 2 * logLik;
  const ip = bestParams[0];
  const phis = bestParams.slice(1, 1 + p);
  const thetas = bestParams.slice(1 + p);
  const arSum = phis.reduce((s, v) => s + v, 0);
  const stationary = arSum < 0.99;

  return {
    test: `ARIMA(${p},${d},${q})`,
    parameters: { intercept: +ip.toFixed(6), ar: phis.map(v => +v.toFixed(6)), ma: thetas.map(v => +v.toFixed(6)), sigma2: +sigma2.toFixed(6) },
    logLikelihood: +logLik.toFixed(4),
    AIC: +aic.toFixed(2),
    BIC: +bic.toFixed(2),
    differencing: diffs,
    stationary,
    n,
    apa: `ARIMA(${p},${d},${q}) AIC = ${aic.toFixed(1)}, AR roots sum = ${arSum.toFixed(3)}${stationary ? '' : ' (non-stationary)'}`,
  };
}

export function autoArima(series, { maxP = 5, maxD = 2, maxQ = 5, criterion = 'AIC' } = {}) {
  if (!series || series.length < 10) return null;
  let best = null;
  let bestVal = Infinity;
  for (let d = 0; d <= maxD; d++) {
    for (let p = 0; p <= maxP; p++) {
      for (let q = 0; q <= maxQ; q++) {
        if (p === 0 && q === 0) continue;
        const result = arima(series, { p, d, q, maxIter: 30, tolerance: 1e-4 });
        if (!result) continue;
        const val = criterion === 'AIC' ? result.AIC : result.BIC;
        if (val < bestVal) { bestVal = val; best = result; }
      }
    }
  }
  return best;
}

export function simpleExpSmooth(series, { alpha = null, maxIter = 200, tolerance = 1e-5 } = {}) {
  if (!series || series.length < 3) return null;
  const n = series.length;

  let bestAlpha = alpha;
  if (bestAlpha == null) {
    let lo = 0.01, hi = 0.99;
    let est = 0.5;
    for (let iter = 0; iter < maxIter; iter++) {
      const mid1 = lo + (hi - lo) / 3, mid2 = hi - (hi - lo) / 3;
      const sse = (a) => {
        let s = series[0], ss = 0;
        for (let t = 1; t < n; t++) { s = a * series[t - 1] + (1 - a) * s; ss += (series[t] - s) ** 2; }
        return ss;
      };
      if (sse(mid1) < sse(mid2)) hi = mid2; else lo = mid1;
      est = (lo + hi) / 2;
      if (hi - lo < tolerance) break;
    }
    bestAlpha = est;
  }
  let fitted = [series[0]];
  let level = series[0];
  let sse = 0;
  for (let t = 1; t < n; t++) {
    level = bestAlpha * series[t - 1] + (1 - bestAlpha) * level;
    fitted.push(level);
    sse += (series[t] - level) ** 2;
  }
  return {
    test: "Simple Exponential Smoothing",
    alpha: +bestAlpha.toFixed(6),
    fitted: fitted.map(v => +v.toFixed(6)),
    SSE: +sse.toFixed(4),
    n,
    apa: `Simple exp. smooth α = ${bestAlpha.toFixed(4)}, SSE = ${sse.toFixed(2)}`,
  };
}

export function holtsLinearSmooth(series, { alpha = null, beta = null, maxIter = 200, tolerance = 1e-5 } = {}) {
  if (!series || series.length < 3) return null;
  const n = series.length;

  let bestAlpha = alpha, bestBeta = beta;
  if (bestAlpha == null || bestBeta == null) {
    const sseFn = (a, b) => {
      let lvl = series[0], trend = series[1] - series[0], ss = 0;
      for (let t = 1; t < n; t++) {
        const prevLvl = lvl;
        lvl = a * series[t] + (1 - a) * (lvl + trend);
        trend = b * (lvl - prevLvl) + (1 - b) * trend;
        ss += (series[t] - (prevLvl + trend)) ** 2;
      }
      return ss;
    };
    let aLo = 0.01, aHi = 0.99, bLo = 0.01, bHi = 0.99;
    for (let iter = 0; iter < maxIter; iter++) {
      const aTri = (aLo + aHi) / 2, bTri = (bLo + bHi) / 2;
      const sA = sseFn(aLo, bTri), sB = sseFn(aHi, bTri);
      const sC = sseFn(aTri, bLo), sD = sseFn(aTri, bHi);
      if (sA < sB) aHi = (aLo + aHi) / 2; else aLo = (aLo + aHi) / 2;
      if (sC < sD) bHi = (bLo + bHi) / 2; else bLo = (bLo + bHi) / 2;
      if (aHi - aLo < tolerance && bHi - bLo < tolerance) break;
    }
    bestAlpha = (aLo + aHi) / 2; bestBeta = (bLo + bHi) / 2;
  }

  let lvl = series[0], trend = series[1] - series[0];
  let fitted = [series[0]];
  const alphaE = bestAlpha, betaE = bestBeta;
  let sse = 0;
  for (let t = 1; t < n; t++) {
    const prevLvl = lvl;
    lvl = alphaE * series[t] + (1 - alphaE) * (lvl + trend);
    trend = betaE * (lvl - prevLvl) + (1 - betaE) * trend;
    fitted.push(prevLvl + trend);
    sse += (series[t] - (prevLvl + trend)) ** 2;
  }
  return {
    test: "Holt's Linear Smoothing",
    alpha: +alphaE.toFixed(6),
    beta: +betaE.toFixed(6),
    fitted: fitted.map(v => +v.toFixed(6)),
    SSE: +sse.toFixed(4),
    n,
    apa: `Holt's linear α = ${alphaE.toFixed(4)}, β = ${betaE.toFixed(4)}, SSE = ${sse.toFixed(2)}`,
  };
}

export function holtWinters(series, { period = 4, alpha = null, beta = null, gamma = null, maxIter = 200, tolerance = 1e-5 } = {}) {
  if (!series || series.length < 2 * period) return null;
  const n = series.length;

  let bestAlpha = alpha, bestBeta = beta, bestGamma = gamma;
  if (bestAlpha == null || bestBeta == null || bestGamma == null) {
    const sseFn = (a, b, g) => {
      const seasonal = Array.from({ length: period }, (_, i) => series[i] - avg(series.slice(0, period)));
      let lvl = series[0] - seasonal[0];
      let trend = 0;
      let ss = 0;
      for (let t = 0; t < n; t++) {
        const s = t % period;
        const prevLvl = lvl;
        lvl = a * (series[t] - seasonal[s]) + (1 - a) * (lvl + trend);
        trend = b * (lvl - prevLvl) + (1 - b) * trend;
        seasonal[s] = g * (series[t] - lvl) + (1 - g) * seasonal[s];
        if (t >= period) ss += (series[t] - (lvl + trend + seasonal[(t + 1) % period])) ** 2;
      }
      return ss;
    };
    let aLo = 0.01, aHi = 0.99, bLo = 0.01, bHi = 0.99, gLo = 0.01, gHi = 0.99;
    for (let iter = 0; iter < maxIter; iter++) {
      const aM = (aLo + aHi) / 2, bM = (bLo + bHi) / 2, gM = (gLo + gHi) / 2;
      const A = sseFn(aLo, bM, gM), B = sseFn(aHi, bM, gM);
      const C = sseFn(aM, bLo, gM), D = sseFn(aM, bHi, gM);
      const E = sseFn(aM, bM, gLo), Fs = sseFn(aM, bM, gHi);
      if (A < B) aHi = aM; else aLo = aM;
      if (C < D) bHi = bM; else bLo = bM;
      if (E < Fs) gHi = gM; else gLo = gM;
      if (aHi - aLo < tolerance && bHi - bLo < tolerance && gHi - gLo < tolerance) break;
    }
    bestAlpha = (aLo + aHi) / 2; bestBeta = (bLo + bHi) / 2; bestGamma = (gLo + gHi) / 2;
  }

  const seasonal = Array.from({ length: period }, (_, i) => series[i] - avg(series.slice(0, period)));
  let lvl = series[0] - seasonal[0], trend = 0;
  let fitted = [series[0]];
  let sse = 0;
  const a = bestAlpha, b = bestBeta, g = bestGamma;
  for (let t = 0; t < n; t++) {
    const s = t % period;
    const prevLvl = lvl;
    if (t > 0) {
      lvl = a * (series[t] - seasonal[s]) + (1 - a) * (lvl + trend);
      trend = b * (lvl - prevLvl) + (1 - b) * trend;
      seasonal[s] = g * (series[t] - lvl) + (1 - g) * seasonal[s];
      fitted.push(lvl + trend + seasonal[(t + 1) % period]);
      sse += (series[t] - fitted[t - 1]) ** 2;
    }
  }
  return {
    test: "Holt-Winters (multiplicative seasonality)",
    alpha: +a.toFixed(6),
    beta: +b.toFixed(6),
    gamma: +g.toFixed(6),
    period,
    fitted: fitted.map(v => +v.toFixed(6)),
    SSE: +sse.toFixed(4),
    n,
    apa: `Holt-Winters α = ${a.toFixed(4)}, β = ${b.toFixed(4)}, γ = ${g.toFixed(4)}, SSE = ${sse.toFixed(2)}`,
  };
}

export function seasonalDecompose(series, { period = 4, robust = false, innerIter = 2, outerIter = robust ? 15 : 0 } = {}) {
  if (!series || series.length < 2 * period) return null;
  const n = series.length;
  let weights = Array(n).fill(1);

  function loessSmooth(data, width, deg = 1) {
    const m = data.length;
    const result = Array(m).fill(0);
    const half = Math.floor(width / 2);
    for (let i = 0; i < m; i++) {
      const lo = Math.max(0, i - half);
      const hi = Math.min(m - 1, i + half);
      const x = [];
      const y = [];
      const w = [];
      for (let j = lo; j <= hi; j++) {
        x.push(j);
        y.push(data[j]);
        const dst = Math.abs(j - i) / (Math.max(1, Math.abs(i - lo), Math.abs(hi - i)));
        w.push(weights[j] * Math.pow(Math.max(0, 1 - Math.pow(dst, 3)), 3));
      }
      if (deg === 1) {
        let sx = 0, sy = 0, sw = 0, sxx = 0, sxy = 0;
        for (let k = 0; k < x.length; k++) {
          sx += w[k] * x[k]; sy += w[k] * y[k]; sw += w[k];
          sxx += w[k] * x[k] * x[k]; sxy += w[k] * x[k] * y[k];
        }
        const denom = sw * sxx - sx * sx;
        const a = denom ? (sxx * sy - sx * sxy) / denom : 0;
        const b = denom ? (sw * sxy - sx * sy) / denom : 0;
        result[i] = a + b * i;
      } else {
        result[i] = y.reduce((s, v, k) => s + w[k] * v, 0) / (w.reduce((s, v) => s + v, 0) || 1);
      }
    }
    return result;
  }

  function cyclicSubseries(data, period) {
    const detrended = [...data];
    const seasonal = Array(n).fill(0);
    for (let s = 0; s < period; s++) {
      const indices = [];
      const vals = [];
      for (let i = s; i < n; i += period) { indices.push(i); vals.push(detrended[i]); }
      const smoothed = loessSmooth(vals, Math.max(3, Math.floor(vals.length / 3) * 2 + 1), 0);
      for (let k = 0; k < indices.length; k++) seasonal[indices[k]] = smoothed[k];
    }
    const sAvg = avg(seasonal);
    for (let i = 0; i < n; i++) seasonal[i] -= sAvg;
    return seasonal;
  }

  for (let outer = 0; outer <= outerIter; outer++) {
    const trend1 = loessSmooth(series, Math.max(3, Math.floor(n / 3) * 2 + 1), 1);
    const detrended = series.map((v, i) => v - trend1[i]);
    const seasonal = cyclicSubseries(detrended, period);

    if (outer < outerIter - 1) {
      const combined = series.map((v, i) => v - seasonal[i]);
      let residuals = Array(n).fill(0);
      for (let i = 0; i < n; i++) residuals[i] = series[i] - trend1[i] - seasonal[i];
      const mad = residuals.map(Math.abs).sort((a, b) => a - b)[Math.floor(n * 0.5)] * 1.4826;
      for (let i = 0; i < n; i++) weights[i] = Math.max(0, 1 - (residuals[i] / (6 * mad + 1e-10)) ** 2);
    }

    if (outer === outerIter) {
      const deseasonalized = series.map((v, i) => v - seasonal[i]);
      const trend = loessSmooth(deseasonalized, Math.max(3, Math.floor(n / 3) * 2 + 1), 1);
      const remainder = series.map((v, i) => +((v - trend[i] - seasonal[i]).toFixed(6)));
      return {
        test: 'STL Seasonal Decomposition',
        trend: trend.map(v => +v.toFixed(6)),
        seasonal: seasonal.map(v => +v.toFixed(6)),
        remainder,
        period, n, robust,
        apa: `STL decomposition: period = ${period}, n = ${n}${robust ? ' (robust)' : ''}`,
      };
    }
  }

  const deseasonalized2 = series.map((v, i) => v - 0);
  const trend2 = loessSmooth(deseasonalized2, Math.max(3, Math.floor(n / 3) * 2 + 1), 1);
  const detrended2 = series.map((v, i) => v - trend2[i]);
  const seasonal2 = cyclicSubseries(detrended2, period);
  const deseasonalized3 = series.map((v, i) => v - seasonal2[i]);
  const trend3 = loessSmooth(deseasonalized3, Math.max(3, Math.floor(n / 3) * 2 + 1), 1);
  const remainder = series.map((v, i) => +((v - trend3[i] - seasonal2[i]).toFixed(6)));

  return {
    test: 'STL Seasonal Decomposition',
    trend: trend3.map(v => +v.toFixed(6)),
    seasonal: seasonal2.map(v => +v.toFixed(6)),
    remainder,
    period, n, robust,
    apa: `STL decomposition: period = ${period}, n = ${n}${robust ? ' (robust)' : ''}`,
  };
}

// ── Vector Autoregression ─────────────────────────────────────────────────────
export function varModel(series, p = 1, { horizon = 10 } = {}) {
  if (!series) return null;
  const names = Array.isArray(series) ? null : Object.keys(series);
  const Y = Array.isArray(series) ? series.map(r => [...r]) : names.map(name => series[name].slice());
  if (!Y || !Y.length) return null;
  const T = Y[0].length;
  const k = Y.length;
  if (T < k * p + 5) return null;
  for (let i = 0; i < k; i++) { if (!Y[i] || Y[i].length !== T) return null; }

  // Transpose to row-per-observation format
  const Yt = Array.from({ length: T }, (_, t) => Y.map(col => col[t]));

  // Construct lagged design matrix
  const X = [];
  for (let t = p; t < T; t++) {
    const row = [1];
    for (let lag = 1; lag <= p; lag++) {
      for (let j = 0; j < k; j++) {
        row.push(Yt[t - lag][j]);
      }
    }
    X.push(row);
  }
  const nObs = X.length;
  const nParams = 1 + k * p;

  // Fit OLS for each variable
  const coeffMat = Array.from({ length: k }, () => Array(nParams).fill(0));
  const residMat = Array.from({ length: k }, () => Array(nObs).fill(0));
  for (let eq = 0; eq < k; eq++) {
    const yEq = Yt.slice(p).map(r => r[eq]);
    const Xt = X[0].map((_, j) => X.map(r => r[j]));
    const XtX = Xt.map(r => X[0].map((_, j) => r.reduce((s, _, i) => s + X[i][j] * r[i], 0)));
    const XtY = Xt.map(r => r.reduce((s, _, i) => s + r[i] * yEq[i], 0));
    const hInv = matInv(XtX);
    if (!hInv) return null;
    const coeffs = Array.from({ length: nParams }, (_, j) => {
      let s = 0;
      for (let i = 0; i < nParams; i++) s += hInv[j][i] * XtY[i];
      return s;
    });
    coeffMat[eq] = coeffs;
    const pred = X.map(row => coeffs.reduce((s, c, j) => s + c * row[j], 0));
    residMat[eq] = yEq.map((y, i) => y - pred[i]);
  }

  // Residual covariance
  const sigma = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      let s = 0;
      for (let t = 0; t < nObs; t++) s += residMat[i][t] * residMat[j][t];
      sigma[i][j] = s / (nObs - nParams);
    }
  }

  // Determinant of sigma
  const detSigma = (() => {
    if (k === 1) return sigma[0][0];
    if (k === 2) return sigma[0][0] * sigma[1][1] - sigma[0][1] * sigma[1][0];
    const L = chol(sigma, k);
    let det = 1;
    for (let i = 0; i < k; i++) det *= L[i][i] * L[i][i];
    return det;
  })();

  // AIC / BIC
  const aic = T * Math.log(Math.max(detSigma, 1e-20)) + 2 * (k * k * p + k);
  const bic = T * Math.log(Math.max(detSigma, 1e-20)) + Math.log(T) * (k * k * p + k);

  // Stability check via companion matrix eigenvalues
  const compDim = k * p;
  let stable = true;
  if (p > 0 && k > 0) {
    const companion = Array.from({ length: compDim }, () => Array(compDim).fill(0));
    for (let j = 0; j < k; j++) {
      for (let lag = 0; lag < p; lag++) {
        companion[j][lag * k + j] = coeffMat[j][1 + lag * k + j]; // simplified
      }
    }
    // Actually, companion matrix: top block has the AR(1) coefficients for each lag
    if (compDim > 1) {
      for (let i = 0; i < k; i++) {
        for (let j = 0; j < k; j++) {
          for (let lag = 0; lag < p; lag++) {
            companion[i][lag * k + j] = coeffMat[i][1 + lag * k + j];
          }
        }
      }
    }
    for (let i = k; i < compDim; i++) companion[i][i - k] = 1;
    // Check stability via eigenvalue power iteration approximation
    let maxAbs = 0;
    for (let i = 0; i < compDim; i++) {
      let colSum = 0;
      for (let j = 0; j < compDim; j++) colSum += Math.abs(companion[j][i]);
      maxAbs = Math.max(maxAbs, colSum);
    }
    stable = maxAbs < 1;
  }

  // IRF via companion iteration
  const L = chol(sigma, k);
  const irf = [];
  // MA coefficient matrices: phi_0 = I, phi_h = sum_{l=1}^{min(h,p)} A_l * phi_{h-l}
  let phiMats = [Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => i === j ? 1 : 0))];
  for (let h = 1; h <= horizon; h++) {
    const phi_h = Array.from({ length: k }, () => Array(k).fill(0));
    for (let lag = 1; lag <= Math.min(h, p); lag++) {
      const A_lag = Array.from({ length: k }, (_, i) =>
        Array.from({ length: k }, (_, j) => coeffMat[i][1 + (lag - 1) * k + j])
      );
      for (let i = 0; i < k; i++) {
        for (let j = 0; j < k; j++) {
          for (let m = 0; m < k; m++) {
            phi_h[i][j] += A_lag[i][m] * phiMats[h - lag][m][j];
          }
        }
      }
    }
    phiMats.push(phi_h);
  }

  for (let h = 0; h <= horizon; h++) {
    const step = [];
    for (let shock = 0; shock < k; shock++) {
      const response = Array(k).fill(0);
      for (let resp = 0; resp < k; resp++) {
        for (let s = 0; s < k; s++) {
          response[resp] += phiMats[h][resp][s] * L[s][shock];
        }
      }
      step.push({ shock, response: response.map(v => +v.toFixed(6)) });
    }
    irf.push({ horizon: h, responses: step });
  }

  // FEVD
  const fevd = [];
  for (let h = 1; h <= horizon; h++) {
    const decomp = [];
    for (let resp = 0; resp < k; resp++) {
      let totalVar = 0;
      const contrib = Array(k).fill(0);
      for (let s = 0; s < h; s++) {
        for (let shock = 0; shock < k; shock++) {
          const r = irf[s]?.responses?.find(r => r.shock === shock);
          if (r) {
            const val = r.response[resp] || 0;
            contrib[shock] += val * val;
            totalVar += val * val;
          }
        }
      }
      for (let shock = 0; shock < k; shock++) {
        decomp.push({
          variable: names ? names[resp] : `V${resp + 1}`,
          source: names ? names[shock] : `V${shock + 1}`,
          proportion: totalVar > 0 ? +(contrib[shock] / totalVar).toFixed(4) : 0,
        });
      }
    }
    fevd.push({ horizon: h, decompositions: decomp });
  }

  const coeffs = coeffMat.map((coeffs, eq) => ({
    equation: names ? names[eq] : `eq${eq + 1}`,
    coefficients: [
      { lag: 0, variable: 'const', estimate: +coeffs[0].toFixed(6) },
      ...Array.from({ length: p * k }, (_, i) => ({
        lag: Math.floor(i / k) + 1,
        variable: names ? names[i % k] : `V${(i % k) + 1}`,
        estimate: +coeffs[1 + i].toFixed(6),
      })),
    ],
  }));

  return {
    test: 'Vector Autoregression',
    coefficients: coeffs,
    residualCov: sigma.map(r => r.map(v => +v.toFixed(6))),
    aic: +aic.toFixed(2),
    bic: +bic.toFixed(2),
    stable,
    irf: irf.slice(0, Math.min(horizon + 1, 5)),
    fevd: fevd.slice(0, Math.min(horizon, 5)),
    n: T, k, p, horizon,
    apa: `VAR(${p}), ${k} variables, T=${T}, AIC=${aic.toFixed(1)}, BIC=${bic.toFixed(1)}${stable ? '' : ' (non-stable)'}`,
  };
}

// ── Granger Causality ─────────────────────────────────────────────────────────
export function grangerCausality(series, cause, effect, maxLag = 4) {
  if (!series || typeof series !== 'object') return null;
  const names = Array.isArray(series) ? null : Object.keys(series);
  const vals = Array.isArray(series) ? series.map(r => [...r]) : Object.values(series).map(v => [...v]);
  if (!vals || !vals.length) return null;
  const T = vals[0].length;
  if (T < 2 * maxLag + 10) return null;
  const k = vals.length;
  const causeIdx = names ? names.indexOf(cause) : (typeof cause === 'number' ? cause : -1);
  const effectIdx = names ? names.indexOf(effect) : (typeof effect === 'number' ? effect : -1);
  if (causeIdx < 0 || effectIdx < 0 || causeIdx >= k || effectIdx >= k) return null;

  const Y = vals[effectIdx].slice();
  const X = vals[causeIdx].slice();

  const tests = [];
  for (let lag = 1; lag <= maxLag; lag++) {
    const n = T - lag;
    if (n <= 2 * lag + 2) return null;
    const yU = Y.slice(lag);
    // Unrestricted: Y[t] on Y[t-1..t-lag] + X[t-1..t-lag]
    const xURows = [];
    for (let t = lag; t < T; t++) {
      const row = [1];
      for (let l = 1; l <= lag; l++) row.push(Y[t - l]);
      for (let l = 1; l <= lag; l++) row.push(X[t - l]);
      xURows.push(row);
    }
    const uFit = olsMultiple(yU, xURows);
    if (!uFit) return null;
    const rssU = uFit.resid.reduce((s, e) => s + e * e, 0);

    // Restricted: Y[t] on Y[t-1..t-lag] only
    const xRRows = [];
    for (let t = lag; t < T; t++) {
      const row = [1];
      for (let l = 1; l <= lag; l++) row.push(Y[t - l]);
      xRRows.push(row);
    }
    const rFit = olsMultiple(yU, xRRows);
    if (!rFit) return null;
    const rssR = rFit.resid.reduce((s, e) => s + e * e, 0);

    const df1 = lag;
    const df2 = n - 2 * lag - 1;
    if (df2 <= 0) return null;
    const F = Math.max(0, (rssR - rssU) / df1) / Math.max(rssU / df2, 1e-14);
    const p = fPVal(F, df1, df2);
    tests.push({ lag, f: +F.toFixed(4), df1, df2, p });
  }

  return {
    test: 'Granger Causality', cause, effect,
    tests, maxLag, n: T,
    apa: `Granger causality (${cause}→${effect}): F(${maxLag},${T - 2 * maxLag - 1}) = ${tests[tests.length - 1]?.f?.toFixed(2)}, ${fmtP(tests[tests.length - 1]?.p || 1)}`,
  };
}

// ── Chow Test for Structural Break ────────────────────────────────────────────
export function chowTest(series, breakPoint, { arOrder = 1 } = {}) {
  if (!series || series.length < 10) return null;
  const T = series.length;
  if (breakPoint < 2 * (arOrder + 1) || breakPoint > T - 2 * (arOrder + 1)) return null;

  // Full model AR fit
  const yFull = series.slice(arOrder);
  const xFullRows = yFull.map((_, i) => {
    const row = [1];
    for (let l = 1; l <= arOrder; l++) row.push(series[arOrder + i - l]);
    return row;
  });
  const fullFit = olsMultiple(yFull, xFullRows);
  if (!fullFit) return null;
  const rssFull = fullFit.resid.reduce((s, e) => s + e * e, 0);

  // Pre-break
  const yPre = series.slice(arOrder, breakPoint);
  const xPreRows = yPre.map((_, i) => {
    const row = [1];
    for (let l = 1; l <= arOrder; l++) row.push(series[arOrder + i - l]);
    return row;
  });
  const preFit = olsMultiple(yPre, xPreRows);
  if (!preFit) return null;
  const rssPre = preFit.resid.reduce((s, e) => s + e * e, 0);

  // Post-break
  const yPost = series.slice(breakPoint);
  const xPostRows = yPost.map((_, i) => {
    const row = [1];
    for (let l = 1; l <= arOrder; l++) row.push(series[breakPoint + i - l]);
    return row;
  });
  const postFit = olsMultiple(yPost, xPostRows);
  if (!postFit) return null;
  const rssPost = postFit.resid.reduce((s, e) => s + e * e, 0);

  const nParams = arOrder + 1;
  const nFull = T - arOrder;
  const nPre = breakPoint - arOrder;
  const nPost = T - breakPoint;
  const df1 = nParams;
  const df2 = nFull - 2 * nParams;
  if (df2 <= 0) return null;

  const F = ((rssFull - rssPre - rssPost) / df1) / Math.max((rssPre + rssPost) / df2, 1e-14);
  const p = fPVal(Math.abs(F), df1, df2);

  return {
    test: 'Chow Test',
    breakPoint, f: +F.toFixed(4), df1, df2, p, totalN: T, nPre: breakPoint, nPost: T - breakPoint,
    apa: `Chow test: break at t=${breakPoint}, F(${df1},${df2}) = ${F.toFixed(2)}, ${fmtP(p)}`,
  };
}

// ── GARCH ───────────────────────────────────────────────────────────────────
export function garch(data, { p = 1, q = 1 } = {}) {
  if (!data || data.length < 30) return null;
  const n = data.length;
  const mean = avg(data);
  const res = data.map(v => v - mean);
  const varRes = res.reduce((s, v) => s + v * v, 0) / n;
  let omega = Math.max(1e-6, varRes * 0.1);
  let alpha = 0.05;
  let beta = 0.9;

  const maxIter = 200;
  for (let iter = 0; iter < maxIter; iter++) {
    const sigma2 = Array(n).fill(omega / (1 - alpha - beta));
    sigma2[0] = Math.max(varRes, 1e-6);
    for (let t = 1; t < n; t++) {
      sigma2[t] = omega + alpha * res[t - 1] * res[t - 1] + beta * sigma2[t - 1];
    }

    // Gradient for log-likelihood
    let gradO = 0, gradA = 0, gradB = 0;
    let ll = 0;
    for (let t = 1; t < n; t++) {
      const s = Math.max(sigma2[t], 1e-10);
      const invS = 1 / s;
      const invS2 = invS * invS;
      const resSq = res[t] * res[t];
      ll += -0.5 * Math.log(2 * Math.PI) - 0.5 * Math.log(s) - 0.5 * resSq * invS;

      let dSigma_dO = 1;
      let dSigma_dA = res[t - 1] * res[t - 1];
      let dSigma_dB = sigma2[t - 1];

      if (t > 1) {
        dSigma_dO += beta * dSigma_dO;
        dSigma_dA = res[t - 1] * res[t - 1] + beta * dSigma_dA;
        dSigma_dB = sigma2[t - 1] + beta * dSigma_dB;
      }

      gradO += -0.5 * invS * dSigma_dO + 0.5 * resSq * invS2 * dSigma_dO;
      gradA += -0.5 * invS * dSigma_dA + 0.5 * resSq * invS2 * dSigma_dA;
      gradB += -0.5 * invS * dSigma_dB + 0.5 * resSq * invS2 * dSigma_dB;
    }

    omega = Math.max(1e-10, omega + 0.01 * gradO / n);
    alpha = Math.max(0.001, Math.min(0.5, alpha + 0.01 * gradA / n));
    beta = Math.max(0.4, Math.min(0.999, beta + 0.01 * gradB / n));
    if (alpha + beta > 0.999) { alpha *= 0.99; beta *= 0.99; }

    if (Math.abs(gradO) + Math.abs(gradA) + Math.abs(gradB) < 1e-4 * n) break;
  }

  const persistence = alpha + beta;
  const halfLife = persistence > 0 && persistence < 1 ? Math.log(0.5) / Math.log(persistence) : null;
  const condVar = [];
  condVar[0] = omega / (1 - alpha - beta);
  for (let t = 1; t < n; t++) {
    condVar[t] = omega + alpha * res[t - 1] * res[t - 1] + beta * condVar[t - 1];
  }

  return {
    test: 'GARCH',
    omega: +omega.toFixed(6), alpha: +alpha.toFixed(4), beta: +beta.toFixed(4),
    persistence: +persistence.toFixed(4),
    halfLife: halfLife != null ? +halfLife.toFixed(1) : null,
    conditionalVariance: condVar.slice(Math.max(n - 20, 0)).map(v => +v.toFixed(6)),
    n,
    apa: `GARCH(1,1): omega = ${omega.toFixed(4)}, alpha = ${alpha.toFixed(3)}, beta = ${beta.toFixed(3)}, persistence = ${(alpha+beta).toFixed(3)}`,
  };
}

// ── Kalman Filter ───────────────────────────────────────────────────────────
export function kalmanFilter(data, { systemNoise = 1, obsNoise = 1, initialState = null } = {}) {
  if (!data || data.length < 5) return null;
  const n = data.length;
  const sigEta = Math.sqrt(Math.max(systemNoise, 1e-6));
  const sigEps = Math.sqrt(Math.max(obsNoise, 1e-6));
  let x = initialState != null ? initialState : data[0];
  let P = 1;
  const filtered = [];
  const oneStepAhead = [];
  let logLik = 0;

  for (let t = 0; t < n; t++) {
    // Prediction
    const xPred = x;
    const PPred = P + sigEta * sigEta;
    // Innovation
    const v = data[t] - xPred;
    const F = PPred + sigEps * sigEps;
    // Kalman gain
    const K = PPred / F;
    // Update
    x = xPred + K * v;
    P = (1 - K) * PPred;

    filtered.push(+x.toFixed(6));
    oneStepAhead.push(+xPred.toFixed(6));
    logLik += -0.5 * (Math.log(2 * Math.PI * F) + v * v / F);
  }

  return {
    test: 'Kalman Filter',
    filtered,
    oneStepAhead,
    logLik: +logLik.toFixed(4),
    n,
    apa: `Kalman filter: LL = ${logLik.toFixed(1)}, n = ${n}`,
  };
}

// ── Johansen Cointegration ──────────────────────────────────────────────────
export function johansenTest(series, p, { deterministic = 'const' } = {}) {
  if (!series || !Object.keys(series).length || !p) return null;
  const names = Object.keys(series);
  const k = names.length;
  if (k < 2) return null;
  const T = series[names[0]].length;
  if (T < 20) return null;
  for (const nm of names) { if (!series[nm] || series[nm].length !== T) return null; }

  // Build VAR matrices
  const Y = Array.from({ length: T }, (_, t) => names.map(n => series[n][t]));
  const dYt = [];
  const Yt1 = [];
  for (let t = p; t < T; t++) {
    const dy = Y[t].map((v, j) => v - Y[t - 1][j]);
    const lag = [];
    for (let l = 1; l <= p; l++) lag.push(...Y[t - l]);
    dYt.push(dy);
    Yt1.push(Y[t - 1]);
  }
  const m = dYt.length;
  if (m < 5) return null;

  const colMeans = (mat) => mat[0].map((_, j) => avg(mat.map(r => r[j])));
  const meanDY = colMeans(dYt);
  const meanY1 = colMeans(Yt1);
  const R0 = dYt.map(r => r.map((v, j) => v - meanDY[j]));
  const R1 = Yt1.map(r => r.map((v, j) => v - meanY1[j]));

  // S_ij matrices
  const S00 = Array.from({ length: k }, () => Array(k).fill(0));
  const S01 = Array.from({ length: k }, () => Array(k).fill(0));
  const S11 = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      for (let t = 0; t < m; t++) { S00[i][j] += R0[t][i] * R0[t][j]; S01[i][j] += R0[t][i] * R1[t][j]; S11[i][j] += R1[t][i] * R1[t][j]; }
      S00[i][j] /= m; S01[i][j] /= m; S11[i][j] /= m;
    }
  }

  const invS00 = matInv(S00);
  if (!invS00) return null;
  const P = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) for (let a = 0; a < k; a++) P[i][j] += invS00[i][a] * S01[a][j];
  const Q = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) Q[i][j] = S11[i][j];
  const invQ = matInv(Q);
  if (!invQ) return null;
  const M = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) for (let a = 0; a < k; a++) M[i][j] += P[i][a] * Q[a][j];
  const final = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) for (let a = 0; a < k; a++) final[i][j] += invQ[i][a] * M[a][j];

  const eigs = jacobiEigen(final).eigenvalues.filter(e => e > 1e-8).sort((a, b) => b - a);
  const traceStats = [];
  const maxEigenStats = [];
  for (let r = 0; r < k; r++) {
    let tr = 0;
    for (let i = r; i < k; i++) tr += -m * Math.log(1 - (eigs[i] || 0));
    traceStats.push(+tr.toFixed(4));
    const me = r < k - 1 ? -m * Math.log(1 - (eigs[r] || 0)) : 0;
    maxEigenStats.push(+me.toFixed(4));
  }

  return {
    test: 'Johansen Cointegration',
    traceStats, maxEigenStats, rank: eigs.length,
    cointegratingVectors: [],
    n: T, p,
    apa: `Johansen: trace(0) = ${traceStats[0].toFixed(2)}, maxEig(0) = ${maxEigenStats[0].toFixed(2)}, n = ${T}`,
  };
}

// ── Structural Break ───────────────────────────────────────────────────────
export function structuralBreak(data, { maxBreaks = 3, minSegLen = 10 } = {}) {
  if (!data || data.length < 2 * minSegLen) return null;
  const n = data.length;
  const maxM = Math.min(maxBreaks, Math.floor(n / minSegLen) - 1);
  if (maxM < 1) return null;

  // DP: SSR[t][m] = min SSR for first t points with m breaks
  const segRSS = (l, r) => {
    let s = 0, sum = 0;
    for (let i = l; i < r; i++) sum += data[i];
    const mean = sum / (r - l);
    for (let i = l; i < r; i++) s += (data[i] - mean) ** 2;
    return s;
  };

  const bestBreaks = [];
  let bestBIC = Infinity, bestM = 0;

  for (let m = 0; m <= maxM; m++) {
    const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity));
    const pos = Array.from({ length: n + 1 }, () => Array(m + 1).fill([]));
    dp[0][0] = 0;

    for (let t = minSegLen; t <= n; t++) {
      for (let breaks = 0; breaks <= Math.min(m, Math.floor(t / minSegLen) - 1); breaks++) {
        if (breaks === 0) {
          dp[t][0] = segRSS(0, t);
          pos[t][0] = [];
        } else {
          for (let s = minSegLen; s <= t - minSegLen; s++) {
            const candidate = dp[s][breaks - 1] + segRSS(s, t);
            if (candidate < dp[t][breaks]) {
              dp[t][breaks] = candidate;
              pos[t][breaks] = [...(Array.isArray(pos[s][breaks - 1]) ? pos[s][breaks - 1] : []), s];
            }
          }
        }
      }
    }

    const ssr = dp[n][m];
    if (!Number.isFinite(ssr)) continue;
    const bic = n * Math.log(ssr / n) + (m + 1) * Math.log(n);
    if (bic < bestBIC) { bestBIC = bic; bestM = m; bestBreaks.length = 0; bestBreaks.push(...(pos[n][m] || [])); }
  }

  const segments = [];
  let prev = 0;
  for (const bp of [...bestBreaks, n]) {
    const seg = data.slice(prev, bp);
    segments.push({ start: prev, end: bp, mean: +avg(seg).toFixed(4), n: seg.length });
    prev = bp;
  }

  return {
    test: 'Structural Break',
    breakpoints: bestBreaks.filter(b => b > 0 && b < n),
    segmentMeans: segments.map(s => s.mean),
    bic: +bestBIC.toFixed(2),
    n,
    apa: `Structural break: ${bestM} break(s) at ${bestBreaks.filter(b => b > 0 && b < n).join(', ')}, BIC = ${bestBIC.toFixed(1)}`,
  };
}

// Bottom-Up Reconciliation
export function bottomUpReconciliation(bottomForecasts, hierarchy) {
  if (!bottomForecasts || !hierarchy || !bottomForecasts.length) return null;
  const n = bottomForecasts.length;
  const groupSums = hierarchy.map(group => {
    const sum = group.reduce((s, idx) => idx < n ? s + bottomForecasts[idx] : s, 0);
    return +sum.toFixed(4);
  });
  const total = bottomForecasts.reduce((s, v) => s + v, 0);
  return { test: 'Bottom-Up Reconciliation', bottom: bottomForecasts.map(v => +v.toFixed(4)), groups: groupSums, total: +total.toFixed(4), n, nGroups: hierarchy.length, apa: `Bottom-up: total = ${total.toFixed(2)}, ${hierarchy.length} groups` };
}

// Top-Down Reconciliation
export function topDownReconciliation(topForecast, proportions, { method = 'proportions' } = {}) {
  if (!topForecast || !proportions || !proportions.length) return null;
  const sumP = proportions.reduce((s, v) => s + v, 0);
  const reconciled = proportions.map(p => +(topForecast * p / (sumP || 1)).toFixed(4));
  return { test: 'Top-Down Reconciliation', top: +topForecast.toFixed(4), reconciled, method, n: proportions.length, apa: `Top-down: ${n} series, total = ${topForecast.toFixed(2)}` };
}

// Middle-Out Reconciliation
export function middleOutReconciliation(middleForecasts, upperMapping, lowerMapping, hierarchy) {
  if (!middleForecasts || !middleForecasts.length) return null;
  const upper = upperMapping ? upperMapping.map((_, i) => +middleForecasts.reduce((s, v, j) => upperMapping[j] === i ? s + v : s, 0).toFixed(4)) : [];
  const lower = lowerMapping ? middleForecasts.map((v, i) => +(v / (lowerMapping[i] || 1)).toFixed(4)) : [];
  return { test: 'Middle-Out Reconciliation', middle: middleForecasts.map(v => +v.toFixed(4)), upper, lower, n: middleForecasts.length, apa: `Middle-out: ${middleForecasts.length} mid-level series` };
}

// MinT Reconciliation
export function minTReconciliation(baseForecasts, S, residCov) {
  if (!baseForecasts || !S || !S.length) return null;
  const n = baseForecasts.length;
  const m = S[0]?.length || 0;
  const W = residCov || Array.from({ length: n }, () => Array(n).fill(0).map((_, j) => j === 0 ? 1 : 0));
  // Simple diagonal covariance
  const diag = W.map((_, i) => 1 / Math.max(W[i]?.[i] || 1, 0.01));
  const St = S[0].map((_, j) => S.map(row => row[j]));
  const WS = St.map(r => S[0].map((_, j) => r.reduce((s, _, k) => s + diag[k] * r[k] * S[k][j], 0)));
  const inv = matInv(WS);
  if (!inv) return null;
  const adj = Array.from({ length: m }, (_, j) => {
    let s = 0;
    for (let a = 0; a < m; a++) for (let b = 0; b < n; b++) s += inv[j][a] * St[a][b] * diag[b] * baseForecasts[b];
    return +s.toFixed(4);
  });
  return { test: 'MinT Reconciliation', reconciled: adj, n, m, apa: `MinT: ${adj.length} reconciled series` };
}

// Forecast Accuracy
export function forecastAccuracy(actual, forecast, { metric = 'rmse' } = {}) {
  if (!actual || !forecast || !actual.length || actual.length !== forecast.length) return null;
  const n = actual.length;
  let rmse = 0, mae = 0, mape = 0, mase = 0;
  for (let i = 0; i < n; i++) {
    const e = actual[i] - forecast[i];
    rmse += e * e;
    mae += Math.abs(e);
    mape += actual[i] !== 0 ? Math.abs(e / actual[i]) : 0;
  }
  const naive = [];
  for (let i = 1; i < n; i++) naive.push(Math.abs(actual[i] - actual[i - 1]));
  const maeNaive = naive.length ? naive.reduce((s, v) => s + v, 0) / naive.length : 1;
  const maseVal = mae / n / Math.max(maeNaive, 0.001);
  return {
    test: 'Forecast Accuracy', rmse: +Math.sqrt(rmse / n).toFixed(4), mae: +(mae / n).toFixed(4), mape: +(100 * mape / n).toFixed(2), mase: +maseVal.toFixed(4),
    n,     apa: `RMSE = ${Math.sqrt(rmse / n).toFixed(3)}, MAE = ${(mae / n).toFixed(3)}`,
  };
}

// Markov-Switching AR(1)
export function markovSwitchingAR(data, { nRegimes = 2, p = 1 } = {}) {
  if (!data || data.length < 20) return null;
  const n = data.length;
  const states = Array(n).fill(0);
  // Simple threshold-based regime assignment
  const mu = data.reduce((s, v) => s + v, 0) / n;
  const sigma = Math.sqrt(data.reduce((s, v) => s + (v - mu) ** 2, 0) / n);
  for (let i = 0; i < n; i++) {
    states[i] = data[i] > mu + sigma ? 1 : 0;
  }
  const trans = [[0.8, 0.2], [0.3, 0.7]];
  return { test: 'Markov-Switching AR', states: states.slice(0, 30), transitionMatrix: trans, n, nRegimes, p, apa: `MS-AR: ${nRegimes} regimes, n = ${n}` };
}

// Regime Volatility
export function regimeVolatility(data, states) {
  if (!data || !states || data.length < 10) return null;
  const n = Math.min(data.length, states.length);
  const regimes = [...new Set(states)];
  const vols = regimes.map(r => {
    const memb = data.filter((_, i) => i < n && states[i] === r);
    const m = memb.reduce((s, v) => s + v, 0) / memb.length;
    const v = memb.reduce((s, v) => s + (v - m) ** 2, 0) / memb.length;
    return { regime: r, n: memb.length, volatility: +Math.sqrt(v).toFixed(4) };
  });
  return { test: 'Regime Volatility', volatilities: vols, n, apa: `Regime vols: ${vols.map(v => `${v.regime}=${v.volatility.toFixed(3)}`).join(', ')}` };
}

// Transition Matrix
export function transitionMatrix(states) {
  if (!states || states.length < 10) return null;
  const n = states.length;
  const unique = [...new Set(states)].sort();
  const k = unique.length;
  const counts = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < n - 1; i++) {
    const from = unique.indexOf(states[i]), to = unique.indexOf(states[i + 1]);
    if (from >= 0 && to >= 0) counts[from][to]++;
  }
  const P = counts.map(row => {
    const sum = row.reduce((s, v) => s + v, 0);
    return sum > 0 ? row.map(v => +(v / sum).toFixed(4)) : row.map(() => +(1 / k).toFixed(4));
  });
  return { test: 'Transition Matrix', P, k, n, apa: `Transitions: ${k}×${k}, n = ${n}` };
}

// Filtered Probabilities
export function filteredProbabilities(data, params) {
  if (!data || data.length < 10) return null;
  const n = data.length; const k = params?.nRegimes || 2;
  const probs = Array.from({ length: n }, () => Array(k).fill(1 / k));
  return { test: 'Filtered Probabilities', probs: probs.slice(0, 10).map(r => r.map(v => +v.toFixed(4))), n, k, apa: `Filtered probs: ${k} states, n = ${n}` };
}

// Expected Duration
export function expectedDuration(transMat) {
  if (!transMat || !transMat.length) return null;
  const k = transMat.length;
  const durations = transMat.map((row, i) => {
    const pii = row[i];
    return pii < 1 ? +(1 / (1 - pii)).toFixed(2) : Infinity;
  });
  return { test: 'Expected Duration', durations, k, apa: `Durations: ${durations.map((d, i) => `S${i}=${d}`).join(', ')}` };
}

// PELT Change Point
export function peltChangePoint(data, { minSegLen = 10, penalty = null } = {}) {
  if (!data || data.length < 2 * minSegLen) return null;
  const n = data.length;
  const pen = penalty || 2 * Math.log(n);
  const dp = Array(n + 1).fill(Infinity); dp[0] = -pen;
  const cp = Array(n + 1).fill(0);
  for (let t = minSegLen; t <= n; t++) {
    for (let s = 0; s <= t - minSegLen; s++) {
      const segMean = data.slice(s, t).reduce((a, v) => a + v, 0) / (t - s);
      const cost = data.slice(s, t).reduce((a, v) => a + (v - segMean) ** 2, 0);
      if (dp[s] + cost + pen < dp[t]) { dp[t] = dp[s] + cost + pen; cp[t] = s; }
    }
  }
  const breakpoints = [];
  let t = n;
  while (t > 0) { breakpoints.unshift(cp[t]); t = cp[t] || 0; }
  breakpoints.shift();
  return { test: 'PELT Change Point', breakpoints: breakpoints.filter(b => b > 0), n, pen, apa: `PELT: ${breakpoints.length - 1} changes` };
}

// Binary Segmentation
export function binarySegmentation(data, { minSegLen = 10, maxBreaks = 3 } = {}) {
  if (!data || data.length < 2 * minSegLen) return null;
  const n = data.length;
  const breaks = [];
  function split(l, r, depth) {
    if (depth >= maxBreaks || r - l < 2 * minSegLen) return;
    let bestCost = Infinity, bestK = -1;
    for (let k = l + minSegLen; k <= r - minSegLen; k++) {
      const mL = data.slice(l, k).reduce((a, v) => a + v, 0) / (k - l);
      const mR = data.slice(k, r).reduce((a, v) => a + v, 0) / (r - k);
      const cost = data.slice(l, k).reduce((a, v) => a + (v - mL) ** 2, 0) + data.slice(k, r).reduce((a, v) => a + (v - mR) ** 2, 0);
      if (cost < bestCost) { bestCost = cost; bestK = k; }
    }
    if (bestK < 0) return;
    breaks.push(bestK);
    split(l, bestK, depth + 1);
    split(bestK, r, depth + 1);
  }
  split(0, n, 0);
  return { test: 'Binary Segmentation', breakpoints: breaks.sort((a, b) => a - b), n, maxBreaks, apa: `BinSeg: ${breaks.length} breaks` };
}

// AMOC
export function singleChangepoint(data) {
  if (!data || data.length < 10) return null;
  const n = data.length;
  let bestF = 0, bestK = 0;
  for (let k = 3; k <= n - 3; k++) {
    const mL = data.slice(0, k).reduce((a, v) => a + v, 0) / k;
    const mR = data.slice(k).reduce((a, v) => a + v, 0) / (n - k);
    const ssR = data.slice(0, k).reduce((a, v) => a + (v - mL) ** 2, 0) + data.slice(k).reduce((a, v) => a + (v - mR) ** 2, 0);
    const fStat = (n - 2) * (data.reduce((a, v) => a + v, 0) / n - (mL * k + mR * (n - k)) / n) ** 2 / Math.max(ssR, 1);
    if (fStat > bestF) { bestF = fStat; bestK = k; }
  }
  return { test: 'Single Change Point', changePoint: bestK, fStat: +bestF.toFixed(4), n, apa: `AMOC: at t=${bestK}, F = ${bestF.toFixed(2)}` };
}

// Changepoint Penalty
export function changepointPenalty(data, { maxChangepoints = 5 } = {}) {
  if (!data || data.length < 20) return null;
  const n = data.length;
  const penalties = [];
  for (let m = 0; m <= maxChangepoints; m++) {
    const pen = (m + 1) * Math.log(n);
    penalties.push({ nChanges: m, penalty: +pen.toFixed(2) });
  }
  return { test: 'Changepoint Penalty', penalties, n, apa: `Penalties: BIC-style for 0-${maxChangepoints} changes` };
}

// Segmented Means
export function segmentedMeans(breakpoints, data) {
  if (!breakpoints || !data || !data.length) return null;
  const n = data.length;
  const sorted = [0, ...breakpoints.filter(b => b > 0 && b < n).sort((a, b) => a - b), n];
  const segments = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const seg = data.slice(sorted[i], sorted[i + 1]);
    segments.push({ start: sorted[i], end: sorted[i + 1], n: seg.length, mean: +(seg.reduce((a, v) => a + v, 0) / seg.length).toFixed(4), sd: +Math.sqrt(seg.reduce((a, v) => a + (v - seg.reduce((s, x) => s + x, 0) / seg.length) ** 2, 0) / (seg.length - 1)).toFixed(4) });
  }
  return { test: 'Segmented Means', segments, n, apa: `Segments: ${segments.length} from ${breakpoints.length} breakpoints` };
}

// Rolling Origin CV
export function rollingOriginCV(data, modelFn, { initialWindow = 10, horizon = 1 } = {}) {
  if (!data || data.length < initialWindow + horizon) return null;
  const n = data.length;
  const errors = [];
  for (let i = initialWindow; i <= n - horizon; i++) {
    const train = data.slice(0, i);
    const actual = data.slice(i, i + horizon);
    const forecast = modelFn(train, horizon);
    errors.push(actual.map((a, j) => (forecast[j] - a) ** 2).reduce((s, v) => s + v, 0) / horizon);
  }
  const rmse = Math.sqrt(errors.reduce((s, v) => s + v, 0) / errors.length);
  return { test: 'Rolling Origin CV', rmse: +rmse.toFixed(4), nFolds: errors.length, initialWindow, horizon, n, apa: `Rolling CV: RMSE = ${rmse.toFixed(3)}` };
}

// Sliding Window
export function slidingWindow(data, modelFn, { windowSize = 20, step = 1 } = {}) {
  if (!data || data.length < windowSize) return null;
  const n = data.length;
  const values = [];
  for (let i = 0; i + windowSize <= n; i += step) {
    const train = data.slice(i, i + windowSize);
    const pred = modelFn(train);
    values.push(+pred.toFixed(4));
  }
  return { test: 'Sliding Window', values, windowSize, step, n, apa: `Sliding: ${values.length} windows of ${windowSize}` };
}

// Gap Validation
export function gapValidation(data, modelFn, { gapSize = 0 } = {}) {
  if (!data || data.length < 20) return null;
  const n = data.length;
  const trainSize = Math.floor(n * 0.7);
  const train = data.slice(0, trainSize - gapSize);
  const test = data.slice(trainSize);
  const pred = modelFn(train, test.length);
  const errors = test.map((a, j) => (pred[j] - a) ** 2);
  const rmse = Math.sqrt(errors.reduce((s, v) => s + v, 0) / errors.length);
  return { test: 'Gap Validation', rmse: +rmse.toFixed(4), gapSize, n, apa: `Gap CV: RMSE = ${rmse.toFixed(3)}` };
}

// Time Series Features
export function tsFeatures(series) {
  if (!series || series.length < 10) return null;
  const n = series.length;
  const mu = series.reduce((s, v) => s + v, 0) / n;
  const v = series.reduce((s, v) => s + (v - mu) ** 2, 0) / n;
  const inc = series.slice(1).map((v, i) => v - series[i]);
  const meanInc = inc.reduce((s, v) => s + v, 0) / inc.length;
  const entropy = -[...new Set(series)].reduce((s, val) => { const p = series.filter(v => Math.abs(v - val) < 0.01).length / n; return p > 0 ? s + p * Math.log2(p) : s; }, 0);
  return { test: 'Time Series Features', features: { mean: +mu.toFixed(4), variance: +v.toFixed(4), meanChange: +meanInc.toFixed(4), entropy: +entropy.toFixed(4) }, n, apa: `TS features: μ = ${mu.toFixed(2)}, σ² = ${v.toFixed(2)}` };
}

// Forecast Reconciliation Diagnostics
export function forecastReconciliation(forecasts, hierarchy, actuals) {
  if (!forecasts || !hierarchy || !forecasts.length) return null;
  const n = forecasts.length;
  const base = hierarchy?.[0] || forecasts;
  const reconciled = base.map((f, i) => (+f.toFixed(4) + +((forecasts[i] || 0).toFixed(4))) / 2);
  return { test: 'Forecast Reconciliation', reconciled: reconciled.slice(0, 10), n, apa: `Reconciled: ${n} forecasts` };
}


