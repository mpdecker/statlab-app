import { avg } from '../math/core.js';
import { tPVal } from '../math/distributions.js';

function toRad(angle, degrees) { return degrees ? angle * Math.PI / 180 : angle; }

// ── Circular Mean ──────────────────────────────────────────────────────────
export function circularMean(angles, { degrees = false } = {}) {
  if (!angles || angles.length < 5) return null;
  const n = angles.length;
  let s = 0, c = 0;
  for (const a of angles) { const r = toRad(a, degrees); s += Math.sin(r); c += Math.cos(r); }
  const mean = Math.atan2(s, c);
  const R = Math.sqrt(s * s + c * c) / n;
  return {
    test: 'Circular Mean', mean: +mean.toFixed(4), resultant: +R.toFixed(4), n,
    apa: `Circular mean = ${mean.toFixed(3)} rad, R = ${R.toFixed(3)}, n = ${n}`,
  };
}

// ── Circular Variance ──────────────────────────────────────────────────────
export function circularVariance(angles, { degrees = false } = {}) {
  if (!angles || angles.length < 5) return null;
  const n = angles.length;
  let s = 0, c = 0;
  for (const a of angles) { const r = toRad(a, degrees); s += Math.sin(r); c += Math.cos(r); }
  const R = Math.sqrt(s * s + c * c) / n;
  return {
    test: 'Circular Variance', variance: +(1 - R).toFixed(4), resultant: +R.toFixed(4), n,
    apa: `Circular var = ${(1 - R).toFixed(3)}, R = ${R.toFixed(3)}, n = ${n}`,
  };
}

// ── Rayleigh Test ──────────────────────────────────────────────────────────
export function rayleighTest(angles, { degrees = false } = {}) {
  if (!angles || angles.length < 8) return null;
  const n = angles.length;
  let s = 0, c = 0;
  for (const a of angles) { const r = toRad(a, degrees); s += Math.sin(r); c += Math.cos(r); }
  const R = Math.sqrt(s * s + c * c) / n;
  const z = n * R * R;
  const p = Math.exp(-z) * (1 + (2 * z - z * z) / (4 * n));
  return {
    test: 'Rayleigh Test', z: +z.toFixed(4), p: Math.min(1, Math.max(0, +p.toFixed(4))), n,
    apa: `Rayleigh z = ${z.toFixed(2)}, ${p < 0.05 ? 'significant' : 'not significant'} (uniform rejected?), n = ${n}`,
  };
}

// ── Watson U² ──────────────────────────────────────────────────────────────
export function watsonU2(angles, { degrees = false, dist = 'uniform' } = {}) {
  if (!angles || angles.length < 8) return null;
  const n = angles.length;
  const sorted = angles.map(a => ((toRad(a, degrees) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)).sort((a, b) => a - b);
  let s = 0, c = 0;
  for (const a of sorted) { s += Math.sin(a); c += Math.cos(a); }
  const mu = Math.atan2(s, c);
  const R = Math.sqrt(s * s + c * c) / n;
  let kappa;
  if (R < 0.53) kappa = 2 * R + R ** 3 + 5 * R ** 5 / 6;
  else if (R < 0.85) kappa = -0.4 + 1.39 * R + 0.43 / (1 - R);
  else kappa = 1 / (2 * (1 - R) - (1 - R) ** 2 - (1 - R) ** 3);

  // von Mises CDF by numerical integration of the normalized density over [0, 2π)
  const GRID = 720;
  const dθ = 2 * Math.PI / GRID;
  const weights = Array.from({ length: GRID }, (_, g) => Math.exp(kappa * Math.cos((g + 0.5) * dθ - mu)));
  const totalW = weights.reduce((acc, w) => acc + w, 0);
  const vmCDF = a => {
    let partial = 0;
    for (let g = 0; g < GRID; g++) { if ((g + 0.5) * dθ <= a) partial += weights[g]; else break; }
    return totalW > 0 ? partial / totalW : a / (2 * Math.PI);
  };
  let U2 = 0;
  for (let i = 0; i < n; i++) {
    const a = sorted[i];
    const Fi = dist === 'vonmises' ? vmCDF(a) : a / (2 * Math.PI);
    U2 += (Fi - (2 * i + 1) / (2 * n)) ** 2;
  }
  U2 = U2 + 1 / (12 * n);
  const p = U2 > 0.187 ? 0.01 : U2 > 0.152 ? 0.05 : U2 > 0.131 ? 0.10 : 0.5;

  return {
    test: "Watson's U²", statistic: +U2.toFixed(4), pValue: p, n,
    apa: `Watson U² = ${U2.toFixed(3)}, n = ${n}`,
  };
}

// ── von Mises MLE ──────────────────────────────────────────────────────────
export function vonMisesMLE(angles, { degrees = false } = {}) {
  if (!angles || angles.length < 8) return null;
  const n = angles.length;
  let s = 0, c = 0;
  for (const a of angles) { const r = toRad(a, degrees); s += Math.sin(r); c += Math.cos(r); }
  const mu = Math.atan2(s, c);
  const R = Math.sqrt(s * s + c * c) / n;
  let kappa;
  if (R < 0.53) kappa = 2 * R + R ** 3 + 5 * R ** 5 / 6;
  else if (R < 0.85) kappa = -0.4 + 1.39 * R + 0.43 / (1 - R);
  else kappa = 1 / (2 * (1 - R) - (1 - R) ** 2 - (1 - R) ** 3);
  kappa = Math.max(0.001, kappa);
  const seMu = 1 / Math.sqrt(n * R * kappa);
  const seKappa = 1 / Math.sqrt(n * R);
  return {
    test: 'von Mises MLE', mu: +mu.toFixed(4), kappa: +kappa.toFixed(4), seMu: +seMu.toFixed(4), seKappa: +seKappa.toFixed(4), n,
    apa: `von Mises: μ = ${mu.toFixed(3)}, κ = ${kappa.toFixed(3)}, n = ${n}`,
  };
}

// ── Circular Correlation ───────────────────────────────────────────────────
/** @param {number} alpha @param {number[]} beta */
export function circularCorrelation(alpha, beta, { degrees = false } = {}) {
  if (!alpha || !beta || alpha.length < 10 || alpha.length !== beta.length) return null;
  const n = alpha.length;
  const a = alpha.map(v => toRad(v, degrees)), b = beta.map(v => toRad(v, degrees));
  let sa = 0, ca = 0, sb = 0, cb = 0;
  for (let i = 0; i < n; i++) { sa += Math.sin(a[i]); ca += Math.cos(a[i]); sb += Math.sin(b[i]); cb += Math.cos(b[i]); }
  const ma = Math.atan2(sa, ca), mb = Math.atan2(sb, cb);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const dA = a[i] - ma, dB = b[i] - mb;
    num += Math.sin(dA) * Math.sin(dB);
    da += Math.sin(dA) ** 2;
    db += Math.sin(dB) ** 2;
  }
  const r = num / Math.sqrt(Math.max(da * db, 1e-10));
  const z = r * Math.sqrt(n - 2) / Math.sqrt(Math.max(1 - r * r, 1e-10));
  // p-value via normal approx
  const p = 2 * (1 - (0.5 + 0.5 * Math.tanh(z / Math.SQRT2))); // erf approximation
  return {
    test: 'Circular Correlation', r: +r.toFixed(4), z: +z.toFixed(4), p: Math.min(1, Math.max(0, +p.toFixed(4))), n,
    apa: `Circular r = ${r.toFixed(3)}, z = ${z.toFixed(2)}, ${p < 0.05 ? 'significant' : 'n.s.'}, n = ${n}`,
  };
}

// ── Circular-Linear Regression ─────────────────────────────────────────────
/** @param {number} theta @param {number[]} x */
export function circularLinearRegression(theta, x, { degrees = false } = {}) {
  if (!theta || !x || theta.length < 10 || theta.length !== x.length) return null;
  const n = theta.length;
  const a = theta.map(v => toRad(v, degrees));
  let s = 0, c = 0;
  for (const ai of a) { s += Math.sin(ai); c += Math.cos(ai); }
  const mu0 = Math.atan2(s, c);

  const y = a.map(ai => Math.sin(ai - mu0));
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += x[i]; sy += y[i]; sxx += x[i] * x[i]; sxy += x[i] * y[i]; }
  const denom = n * sxx - sx * sx;
  if (!denom) return null;
  const b1 = (n * sxy - sx * sy) / denom;
  const b0 = (sxx * sy - sx * sxy) / denom;
  const fitted = x.map(xi => b0 + b1 * xi);
  let ssRes = 0, ssTot = 0;
  const my = sy / n;
  for (let i = 0; i < n; i++) { ssRes += (y[i] - fitted[i]) ** 2; ssTot += (y[i] - my) ** 2; }
  const rSq = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const se = Math.sqrt(ssRes / (n - 2));
  const coefNames = ['Intercept', 'x'];
  const coefVals = [b0, b1];
  const coefSE = [se * Math.sqrt(1 / n + sx * sx / (n * denom)), se / Math.sqrt(denom / n)];
  const coeffs = coefNames.map((name, j) => {
    const t = coefSE[j] > 0 ? coefVals[j] / coefSE[j] : 0;
    const p = +tPVal(Math.abs(t), n - 2).toFixed(5); // two-tailed t-test, df = n − 2
    return { name, b: +coefVals[j].toFixed(5), se: +coefSE[j].toFixed(5), t: +t.toFixed(4), p };
  });

  return {
    test: 'Circular-Linear Regression', coefficients: coeffs, rSquared: +rSq.toFixed(4), n,
    apa: `Circ-linear: b₁ = ${b1.toFixed(3)}, R² = ${rSq.toFixed(3)}, n = ${n}`,
  };
}
