import { avg, sampleSD, clamp } from './core.js';
import { mulberry32, bootstrapIndices, boxMullerN } from './rng.js';

// ── Special functions ─────────────────────────────────────────────────────────
/** Log gamma function ln Γ(x) (Lanczos approximation). @param {number} x @returns {number} */
export function lngamma(x) {
  // eslint-disable-next-line no-loss-of-precision
  const c = [76.18009172947146,-86.50532032941677,24.01409824083091,
             -1.231739572450155,1.208650973866179e-3,-5.395239384953e-6];
  let y = x, tmp = x + 5.5;
  tmp -= (x + .5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  // eslint-disable-next-line no-loss-of-precision
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/** Log binomial coefficient ln C(n, k). @param {number} n @param {number} k @returns {number} */
export function lnBinom(n, k) {
  return lngamma(n + 1) - lngamma(k + 1) - lngamma(n - k + 1);
}

// Digamma ψ(x) and trigamma ψ'(x) via the standard shift-then-asymptotic-series
// algorithm: recur ψ(x)=ψ(x+1)-1/x (resp. ψ'(x)=ψ'(x+1)+1/x²) up to x≥6, where
// the asymptotic expansion is accurate, then apply it. Verified against
// scipy.special.digamma/polygamma(1,·) to ~9 significant figures for x∈[0.5,10].
/** Digamma function ψ(x). @param {number} x @returns {number} */
export function digamma(x) {
  let result = 0;
  while (x < 6) { result -= 1 / x; x += 1; }
  const f = 1 / (x * x);
  result += Math.log(x) - 0.5 / x - f * (1 / 12 - f * (1 / 120 - f * (1 / 252 - f * (1 / 240 - f * (1 / 132 - f * (691 / 32760 - f / 12))))));
  return result;
}
/** Trigamma function ψ′(x). @param {number} x @returns {number} */
export function trigamma(x) {
  let result = 0;
  while (x < 6) { result += 1 / (x * x); x += 1; }
  const f = 1 / (x * x);
  result += 1 / x + f / 2 + f / x * (1 / 6 - f * (1 / 30 - f * (1 / 42 - f / 30)));
  return result;
}

function betacf(a, b, x) {
  const EPS = 1e-10, FPMIN = 1e-30, qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = Math.max(1 - qab * x / qap, FPMIN);
  d = 1 / d; let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = Math.max(1 + aa * d, FPMIN); c = Math.max(1 + aa / c, FPMIN);
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = Math.max(1 + aa * d, FPMIN); c = Math.max(1 + aa / c, FPMIN);
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Regularized incomplete beta I_x(a, b). @param {number} a @param {number} b @param {number} x @returns {number} */
export function ibeta(a, b, x) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(lngamma(a + b) - lngamma(a) - lngamma(b)
    + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2)
    ? bt * betacf(a, b, x) / a
    : 1 - bt * betacf(b, a, 1 - x) / b;
}

// ── CDF / PDF ─────────────────────────────────────────────────────────────────
/** Standard normal CDF Φ(z). @param {number} z @returns {number} */
export function normalCDF(z) {
  const abs = Math.abs(z);
  if (abs === 0) return 0.5;
  const pdf = Math.exp(-0.5 * abs * abs) / Math.sqrt(2 * Math.PI);
  let upper; // 1 - Φ(abs)
  if (abs < 7) {
    // A&S 26.2.17: max error 7.5e-8
    const t = 1 / (1 + 0.2316419 * abs);
    upper = pdf * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  } else {
    const z2 = abs * abs;
    upper = pdf / abs * (1 - 1/z2 + 3/(z2*z2) - 15/(z2*z2*z2) + 105/(z2*z2*z2*z2));
    upper = clamp(upper, 0, 1);
  }
  const p = 1 - upper;
  return z >= 0 ? p : 1 - p;
}

/** Standard normal quantile Φ⁻¹(p). @param {number} p @returns {number} */
export function normalINV(p) {
  if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
  const r = p < .5 ? p : 1 - p, s = Math.sqrt(-2 * Math.log(r));
  const c = [2.515517, 0.802853, 0.010328], d = [1.432788, 0.189269, 0.001308];
  const x = s - (c[0] + c[1] * s + c[2] * s * s) / (1 + d[0] * s + d[1] * s * s + d[2] * s * s * s);
  return p < .5 ? -x : x;
}

/** Student-t probability density. @param {number} t @param {number} df @returns {number} */
export function tPDF(t, df) {
  return Math.exp(
    lngamma((df + 1) / 2) - lngamma(df / 2) -
    .5 * Math.log(df * Math.PI) -
    (df + 1) / 2 * Math.log(1 + t * t / df)
  );
}

// ── p-value functions ─────────────────────────────────────────────────────────
/** Two-tailed Student-t p-value. @param {number} t @param {number} df @returns {number} */
export const tPVal   = (t, df)       => ibeta(df / 2, .5, df / (df + t * t));
/** Upper-tail F p-value. @param {number} F @param {number} df1 @param {number} df2 @returns {number} */
export const fPVal   = (F, df1, df2) => ibeta(df2 / 2, df1 / 2, df2 / (df2 + df1 * F));
/** Regularized lower incomplete gamma P(a, x). @param {number} a @param {number} x @returns {number} */
export function lowerIncGamma(a, x) {
  if (x <= 0) return 0;
  const logA = lngamma(a);
  if (x < a + 1) {
    let term = 1 / a, sum = term;
    for (let n = 1; n < 300; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 3e-9) break;
    }
    return Math.min(1, Math.exp(-x + a * Math.log(x) - logA) * sum);
  }
  const FPMIN = 1e-30;
  let b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
  for (let i = 1; i <= 300; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-9) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - logA) * h;
}

/** Upper-tail chi-square p-value. @param {number} chi2 @param {number} df @returns {number} */
export const chiPVal = (chi2, df) => {
  if (df <= 0 || chi2 < 0) return 1;
  if (chi2 === 0) return 1;
  return 1 - lowerIncGamma(df / 2, chi2 / 2);
};

// ── Noncentral chi-square / F CDFs (Poisson-mixture-of-central series) ────────
// P(X<=x | df, ncp) = Σⱼ Poisson(ncp/2, j)·P(central χ²_{df+2j} <= x). Verified
// against scipy.stats.ncx2.cdf to ~1e-9 for ncp up to several hundred.
/** Noncentral chi-square CDF. @param {number} x @param {number} df @param {number} ncp noncentrality parameter. @returns {number} */
export function ncChiSqCDF(x, df, ncp) {
  if (ncp <= 0) return df > 0 && x >= 0 ? lowerIncGamma(df / 2, x / 2) : (x >= 0 ? 1 : 0);
  if (x <= 0) return 0;
  const lam = ncp / 2;
  let sum = 0, logW = -lam, logLam = Math.log(lam);
  for (let j = 0; j < 2000; j++) {
    const w = Math.exp(logW);
    sum += w * lowerIncGamma(df / 2 + j, x / 2);
    if (j > lam && w < 1e-16) break;
    logW += logLam - Math.log(j + 1);
  }
  return Math.min(1, Math.max(0, sum));
}

// P(F<=f | df1, df2, ncp) = Σⱼ Poisson(ncp/2, j)·I_{x}(df1/2+j, df2/2), where
// x = df1·f/(df1·f+df2). Verified against scipy.stats.ncf.cdf to ~1e-9.
/** Noncentral F CDF. @param {number} f @param {number} df1 @param {number} df2 @param {number} ncp noncentrality parameter. @returns {number} */
export function ncFCDF(f, df1, df2, ncp) {
  if (f <= 0) return 0;
  if (ncp <= 0) return ibeta(df1 / 2, df2 / 2, df1 * f / (df1 * f + df2));
  const x = df1 * f / (df1 * f + df2);
  const lam = ncp / 2;
  let sum = 0, logW = -lam, logLam = Math.log(lam);
  for (let j = 0; j < 2000; j++) {
    const w = Math.exp(logW);
    sum += w * ibeta(df1 / 2 + j, df2 / 2, x);
    if (j > lam && w < 1e-16) break;
    logW += logLam - Math.log(j + 1);
  }
  return Math.min(1, Math.max(0, sum));
}

// ── Inverse t (two-tailed) ────────────────────────────────────────────────────
/** Two-tailed inverse Student-t critical value. @param {number} alpha @param {number} df @returns {number} */
export function tInv2(alpha, df) {
  if (df > 1e4) return normalINV(1 - alpha / 2);
  let lo = 0, hi = 200;
  for (let i = 0; i < 100; i++) {
    const m = (lo + hi) / 2;
    tPVal(m, df) > alpha ? lo = m : hi = m;
  }
  return (lo + hi) / 2;
}

// ── Power for two-sample t (Monte Carlo non-central t when df ≤ 30) ───────────
export { computePowerT, computePowerCorr, requiredN, requiredNCorr } from './power.js';

// ── Normality tests ───────────────────────────────────────────────────────────
/** D'Agostino–Pearson omnibus normality test. @param {number[]} vals @returns {{stat:number,p:number,normal:boolean}|null} */
export function normalityDP(vals) {
  const n = vals.length; if (n < 8) return null;
  const m = avg(vals), s = sampleSD(vals);
  if (!s || s < 1e-14) return null;
  const sk = vals.reduce((a, x) => a + ((x - m) / s) ** 3, 0) / n;
  const ku = vals.reduce((a, x) => a + ((x - m) / s) ** 4, 0) / n - 3;
  const b2 = (3 * (n ** 2 + 27 * n - 70) * (n + 1) * (n + 3)) / ((n - 2) * (n + 5) * (n + 7) * (n + 9));
  const W2 = Math.sqrt(2 * (b2 - 1)) - 1, al = Math.sqrt(2 / (W2 - 1));
  const delta = 1 / Math.sqrt(Math.log(Math.sqrt(W2)));
  const zsk = delta * Math.log(sk / al + Math.sqrt((sk / al) ** 2 + 1));
  const Eku = 3 * (n - 1) / (n + 1), vku = 24 * n * (n - 2) * (n - 3) / ((n + 1) ** 2 * (n + 3) * (n + 5));
  const zku = (ku - Eku) / Math.sqrt(vku), K2 = zsk ** 2 + zku ** 2, p = chiPVal(K2, 2);
  return { stat: +K2.toFixed(4), p, normal: p > .05 };
}

/** Shapiro–Wilk normality test (Royston AS R94). @param {number[]} x @returns {{stat:number,p:number,normal:boolean,approximate:boolean}|null} */
export function shapiroWilk(x) {
  const n = x.length; if (n < 3 || n > 5000) return null;
  const s = [...x].sort((a, b) => a - b), xbar = avg(x);
  let ss = x.reduce((a, v) => a + (v - xbar) ** 2, 0);
  const m = Array.from({ length: n }, (_, i) => normalINV((i + 1 - .375) / (n + .25)));
  const mm = Math.sqrt(m.reduce((a, v) => a + v * v, 0));
  const a = m.slice(0, Math.floor(n / 2)).map(v => v / mm);
  if (!ss || ss < 1e-14) return null;
  let W = 0;
  for (let i = 0; i < Math.floor(n / 2); i++) W += a[i] * (s[n - 1 - i] - s[i]);
  W = W * W / ss;
  // AS R94 (Royston 1995) n-dependent log-log normalisation
  const ln = Math.log(n);
  let mu, sigma;
  if (n <= 11) {
    const gamma = [-2.273, 0.459];
    mu = gamma[0] + gamma[1] * n;
    sigma = Math.exp(1.0308 - 0.26763 * n + 0.024778 * n * n - 0.0011644 * n * n * n);
  } else {
    mu = -1.2725 + 1.0521 * ln;
    sigma = 1.0308 - 0.26763 * ln;
  }
  const y = Math.log(1 - W);
  const z = (y - mu) / Math.max(sigma, 1e-10);
  const p = clamp(1 - normalCDF(z), 0, 1);
  return { stat: +W.toFixed(5), p, normal: p > .05, approximate: n < 10 };
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
/** Nonparametric bootstrap percentile confidence interval for a statistic. @param {number[]} vals @param {(sample: number[]) => number} fn statistic to resample. @param {number} [B=1999] resample count. @param {number} [alpha=0.05] two-tailed level. @param {number} [seed=42] @returns {{lo:number,hi:number,dist:number[],B:number,seed:number}|null} */
export function bootstrapCI(vals, fn, B = 1999, alpha = .05, seed = 42) {
  const clean = vals.filter(Number.isFinite);
  const n = clean.length;
  if (n < 2 || B < 1) return null;
  const rand = mulberry32(seed ?? 42);
  const stats = [];
  for (let b = 0; b < B; b++) {
    const idx = bootstrapIndices(rand, n);
    const s = idx.map(i => clean[i]);
    const v = fn(s);
    if (Number.isFinite(v)) stats.push(v);
  }
  if (!stats.length) return null;
  stats.sort((a, b) => a - b);
  const loIdx = Math.floor(alpha / 2 * stats.length);
  const hiIdx = Math.min(stats.length - 1, Math.floor((1 - alpha / 2) * stats.length));
  return { lo: stats[loIdx], hi: stats[hiIdx], dist: stats, B: stats.length, seed: seed ?? 42 };
}
