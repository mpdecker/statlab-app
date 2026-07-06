import { avg, sampleSD, sampleVar } from '../math/core.js';
import { mleFit } from '../math/inference.js';

// ── GEV MLE ────────────────────────────────────────────────────────────────
/** @param {number[]} data */
export function gevMLE(data) {
  if (!data || data.length < 20) return null;
  const n = data.length;
  const mu0 = avg(data);
  const sig0 = sampleSD(data) || 1;
  // GEV negative log-likelihood over [μ, ln σ, ξ]; tᵢ = 1 + ξ(xᵢ−μ)/σ must be > 0.
  const negLogLik = ([mu_, logSig, xi_]) => {
    const sigma_ = Math.exp(logSig);
    let nll = 0;
    for (const x of data) {
      const z = (x - mu_) / sigma_;
      if (Math.abs(xi_) < 1e-6) {
        nll += logSig + z + Math.exp(-z);
      } else {
        const t = 1 + xi_ * z;
        if (t <= 1e-10) return 1e10;
        nll += logSig + (1 + 1 / xi_) * Math.log(t) + Math.pow(t, -1 / xi_);
      }
    }
    return Number.isFinite(nll) ? nll : 1e10;
  };
  const fit = mleFit([mu0, Math.log(sig0), 0.1], negLogLik, { maxIter: 100 });
  const mu = fit.theta[0], sigma = Math.exp(fit.theta[1]), xi = fit.theta[2];

  // Return levels for 10, 50, 100 years
  const rp = [10, 50, 100];
  const returnLevels = rp.map(T => {
    const yp = -Math.log(1 - 1 / T);
    if (Math.abs(xi) < 0.001) return mu - sigma * Math.log(yp);
    return mu + sigma * (Math.pow(yp, -xi) - 1) / xi;
  });

  return {
    test: 'GEV MLE', mu: +mu.toFixed(4), sigma: +sigma.toFixed(4), xi: +xi.toFixed(4),
    returnLevels: returnLevels.map((v, i) => ({ period: rp[i], level: +v.toFixed(4) })), n,
    apa: `GEV: mu = ${mu.toFixed(3)}, sigma = ${sigma.toFixed(3)}, xi = ${xi.toFixed(3)}, n = ${n}`,
  };
}

// ── GPD MLE ────────────────────────────────────────────────────────────────
/** @param {number[]} data @param {number} [threshold] */
export function gpdMLE(data, threshold = null) {
  if (!data || data.length < 15) return null;
  const n = data.length;
  const mu = avg(data);
  const sd = Math.sqrt(data.reduce((s, v) => s + (v - mu) ** 2, 0) / n);
  const thresh = threshold != null ? threshold : mu + sd;
  const exceedances = data.filter(v => v > thresh).map(v => v - thresh);
  if (exceedances.length < 5) return null;
  const m = exceedances.length;
  // GPD negative log-likelihood in [logσ, ξ]; support 1 + ξy/σ > 0 ∀ y.
  const negLogLik = theta => {
    const sigma = Math.exp(theta[0]), xi = theta[1];
    if (Math.abs(xi) < 1e-6) return m * Math.log(sigma) + exceedances.reduce((s, y) => s + y, 0) / sigma;
    let nll = m * Math.log(sigma);
    for (const y of exceedances) {
      const t = 1 + xi * y / sigma;
      if (t <= 1e-12) return 1e10;
      nll += (1 / xi + 1) * Math.log(t);
    }
    return nll;
  };
  // Method-of-moments start values: mean = σ/(1−ξ), var = σ²/((1−ξ)²(1−2ξ)).
  const mean = avg(exceedances);
  const variance = exceedances.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, m - 1) || 1;
  let xi0 = 0.5 * (1 - (mean * mean) / variance);
  xi0 = Math.max(-0.45, Math.min(0.45, xi0));
  const sigma0 = Math.max(0.01, 0.5 * mean * ((mean * mean) / variance + 1));
  const fit = mleFit([Math.log(sigma0), xi0], negLogLik, { maxIter: 100 });
  const sigma = Math.exp(fit.theta[0]), xi = fit.theta[1];
  const seSigma = Number.isFinite(fit.se[0]) ? sigma * fit.se[0] : null; // delta method for σ=exp(logσ)
  const seXi = Number.isFinite(fit.se[1]) ? fit.se[1] : null;
  return {
    test: 'GPD MLE',
    sigma: +sigma.toFixed(4), xi: +xi.toFixed(4),
    seSigma: seSigma != null ? +seSigma.toFixed(4) : null, seXi: seXi != null ? +seXi.toFixed(4) : null,
    threshold: +thresh.toFixed(4), logLik: +(-negLogLik(fit.theta)).toFixed(4), nExceedances: m, n,
    apa: `GPD MLE: sigma = ${sigma.toFixed(3)}, xi = ${xi.toFixed(3)}, threshold = ${thresh.toFixed(2)}, ${m} exceedances`,
  };
}

// ── Return Level ────────────────────────────────────────────────────────────
export function returnLevel(gevFit, returnPeriod) {
  if (!gevFit || !returnPeriod || returnPeriod < 2) return null;
  const { mu, sigma, xi } = gevFit;
  const yp = -Math.log(1 - 1 / returnPeriod);
  let level;
  if (Math.abs(xi) < 0.0001) level = mu - sigma * Math.log(yp);
  else level = mu + sigma * (Math.pow(yp, -xi) - 1) / xi;
  return {
    test: 'Return Level', returnPeriod, level: +level.toFixed(4), mu, sigma, xi,
    apa: `T=${returnPeriod}: level = ${level.toFixed(3)} (GEV: mu=${mu.toFixed(2)}, sigma=${sigma.toFixed(2)}, xi=${xi.toFixed(2)})`,
  };
}

// ── Block Maxima ────────────────────────────────────────────────────────────
/** @param {number} [blockSize] */
export function blockMaxima(data, blockSize = 10) {
  if (!data || data.length < 2 * blockSize) return null;
  const n = data.length;
  const maxima = [];
  for (let i = 0; i + blockSize <= n; i += blockSize) {
    maxima.push(Math.max(...data.slice(i, i + blockSize)));
  }
  if (maxima.length < 5) return null;
  const gevFit = gevMLE(maxima);
  return {
    test: 'Block Maxima', maxima: maxima.map(v => +v.toFixed(4)), nBlocks: maxima.length, blockSize, gev: gevFit, n,
    apa: `Block maxima: ${maxima.length} blocks of size ${blockSize}, n = ${n}`,
  };
}

// ── Hill Estimator ──────────────────────────────────────────────────────────
/** @param {number[]} data @param {number} [k] */
export function hillEstimator(data, k = null) {
  if (!data || data.length < 20) return null;
  const n = data.length;
  const sorted = [...data].sort((a, b) => b - a);
  const kUse = k || Math.floor(Math.sqrt(n));
  if (kUse < 5 || kUse > n / 2) return null;
  const threshold = sorted[kUse - 1];
  let sumLog = 0;
  for (let i = 0; i < kUse; i++) sumLog += Math.log(sorted[i] / Math.max(threshold, 1e-10));
  const alpha = kUse / Math.max(sumLog, 1e-10);
  const xi = 1 / alpha;
  const se = alpha / Math.sqrt(kUse);
  return {
    test: 'Hill Estimator', alpha: +alpha.toFixed(4), xi: +xi.toFixed(4), se: +se.toFixed(4), k: kUse, threshold: +threshold.toFixed(4), n,
    apa: `Hill: alpha = ${alpha.toFixed(2)}, xi = ${xi.toFixed(3)}, k = ${kUse}, n = ${n}`,
  };
}

// ── Peaks Over Threshold ──────────────────────────────────────────
/** @param {number[]} data @param {number} [threshold] */
export function peaksOverThreshold(data, threshold = null) {
  if (!data || data.length < 10) return null;
  const n = data.length;
  const thresh = threshold != null ? threshold : avg(data) + 2 * Math.sqrt(sampleVar(data));
  const exceedances = data.filter(v => v > thresh).map(v => +(v - thresh).toFixed(4));
  if (exceedances.length < 3) return null;
  const nExceed = exceedances.length;
  // Fit a Generalised Pareto distribution to the exceedances by ML (gpdMLE
  // filters at the same threshold); fall back to method-of-moments if it can't.
  const gpd = gpdMLE(data, thresh);
  let xi, scale;
  if (gpd) {
    xi = gpd.xi; scale = gpd.sigma;
  } else {
    const mean = avg(exceedances);
    const variance = exceedances.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, nExceed - 1) || 1;
    xi = +(0.5 * (1 - (mean * mean) / variance)).toFixed(4);
    scale = +(0.5 * mean * ((mean * mean) / variance + 1)).toFixed(4);
  }
  return { test: 'Peaks Over Threshold', threshold: +thresh.toFixed(4), exceedances: exceedances.slice(0, 10), xi: +xi.toFixed(4), scale: +scale.toFixed(4), nExceed, n, apa: `POT: ${nExceed} exceedances, thresh=${thresh.toFixed(2)}, ξ=${(+xi).toFixed(3)}` };
}

// ── Threshold Selection ───────────────────────────────────────────
export function thresholdSelection(data) {
  if (!data || data.length < 20) return null;
  const n = data.length;
  const sorted = [...data].sort((a, b) => b - a);
  const candidates = sorted.slice(Math.floor(n * 0.05), Math.floor(n * 0.3));
  const results = candidates.map(thresh => {
    const exceed = data.filter(v => v > thresh);
    if (exceed.length < 5) return null;
    const mean = avg(exceed.map(v => v - thresh));
    return { threshold: +thresh.toFixed(4), nExceed: exceed.length, meanExcess: +mean.toFixed(4) };
  }).filter(Boolean);
  if (!results.length) return null;
  const best = results[Math.floor(results.length / 2)];
  return { test: 'Threshold Selection', candidates: results, selected: best.threshold, n, apa: `Threshold: ${best.threshold.toFixed(2)}, ${best.nExceed} exceedances` };
}
