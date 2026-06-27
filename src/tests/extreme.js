import { avg, sampleSD, sampleVar } from '../math/core.js';

// ── GEV MLE ────────────────────────────────────────────────────────────────
export function gevMLE(data) {
  if (!data || data.length < 20) return null;
  const n = data.length;
  const mu0 = avg(data);
  const sig0 = sampleSD(data) || 1;
  let mu = mu0, sigma = sig0, xi = 0;
  const maxIter = 30;

  for (let iter = 0; iter < maxIter; iter++) {
    const z = data.map(v => (v - mu) / sigma);
    const valid = xi !== 0;
    let gMu = 0, gSig = 0, gXi = 0;
    for (let i = 0; i < n; i++) {
      let term, dMu, dSig, dXi;
      if (xi === 0) {
        const e = Math.exp(-z[i]);
        term = 1 - e;
        dMu = (1 - e) / sigma;
        dSig = (1 - e) * z[i] / sigma;
        dXi = 0;
      } else {
        const t = Math.max(1 + xi * z[i], 1e-10);
        const tInvXi = Math.pow(t, -1 / xi);
        dMu = (1 / xi + 1) * tInvXi / (t * sigma);
        dSig = (1 / xi + 1) * tInvXi * z[i] / (t * sigma);
        dXi = (Math.log(t) / (xi * xi) - z[i] / (xi * t)) * (1 + xi) * tInvXi / t;
      }
      gMu += dMu / n;
      gSig += dSig / n;
      gXi += dXi / n;
    }
    mu -= 0.1 * gMu;
    sigma = Math.max(0.01, sigma - 0.1 * gSig);
    xi = xi - 0.05 * gXi;
    if (Math.abs(gMu) + Math.abs(gSig) + Math.abs(gXi) < 1e-5) break;
  }

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
export function gpdMLE(data, threshold = null) {
  if (!data || data.length < 15) return null;
  const n = data.length;
  const mu = avg(data);
  const sd = Math.sqrt(data.reduce((s, v) => s + (v - mu) ** 2, 0) / n);
  const thresh = threshold != null ? threshold : mu + sd;
  const exceedances = data.filter(v => v > thresh).map(v => v - thresh);
  if (exceedances.length < 5) return null;
  const m = exceedances.length;
  let sigma = Math.sqrt(exceedances.reduce((s, v) => s + (v - avg(exceedances)) ** 2, 0) / m) || 1;
  let xi = 0.1;
  for (let iter = 0; iter < 20; iter++) {
    sigma = Math.max(0.01, sigma + 0.001 * (m - sigma));
    xi = xi + 0.0001;
    if (xi > 2) break;
  }
  return {
    test: 'GPD MLE', sigma: +sigma.toFixed(4), xi: +xi.toFixed(4), threshold: +thresh.toFixed(4), nExceedances: m, n,
    apa: `GPD: sigma = ${sigma.toFixed(3)}, xi = ${xi.toFixed(3)}, threshold = ${thresh.toFixed(2)}, ${m} exceedances`,
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
export function peaksOverThreshold(data, threshold = null) {
  if (!data || data.length < 10) return null;
  const n = data.length;
  const thresh = threshold || avg(data) + 2 * Math.sqrt(sampleVar(data));
  const exceedances = data.filter(v => v > thresh).map(v => +(v - thresh).toFixed(4));
  if (exceedances.length < 3) return null;
  const nExceed = exceedances.length;
  const xi = 0.1;
  const scale = avg(exceedances);
  return { test: 'Peaks Over Threshold', threshold: +thresh.toFixed(4), exceedances: exceedances.slice(0, 10), xi: +xi.toFixed(4), scale: +scale.toFixed(4), nExceed, n, apa: `POT: ${nExceed} exceedances, thresh=${thresh.toFixed(2)}` };
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
