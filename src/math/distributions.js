// ── Special functions ─────────────────────────────────────────────────────────
export function lngamma(x) {
  const c = [76.18009172947146,-86.50532032941677,24.01409824083091,
             -1.231739572450155,1.208650973866179e-3,-5.395239384953e-6];
  let y = x, tmp = x + 5.5;
  tmp -= (x + .5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

export function lnBinom(n, k) {
  return lngamma(n + 1) - lngamma(k + 1) - lngamma(n - k + 1);
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

export function ibeta(a, b, x) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(lngamma(a + b) - lngamma(a) - lngamma(b)
    + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2)
    ? bt * betacf(a, b, x) / a
    : 1 - bt * betacf(b, a, 1 - x) / b;
}

// ── CDF / PDF ─────────────────────────────────────────────────────────────────
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
  }
  const p = 1 - upper;
  return z >= 0 ? p : 1 - p;
}

export function normalINV(p) {
  if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
  const r = p < .5 ? p : 1 - p, s = Math.sqrt(-2 * Math.log(r));
  const c = [2.515517, 0.802853, 0.010328], d = [1.432788, 0.189269, 0.001308];
  const x = s - (c[0] + c[1] * s + c[2] * s * s) / (1 + d[0] * s + d[1] * s * s + d[2] * s * s * s);
  return p < .5 ? -x : x;
}

export function tPDF(t, df) {
  return Math.exp(
    lngamma((df + 1) / 2) - lngamma(df / 2) -
    .5 * Math.log(df * Math.PI) -
    (df + 1) / 2 * Math.log(1 + t * t / df)
  );
}

// ── p-value functions ─────────────────────────────────────────────────────────
export const tPVal   = (t, df)       => ibeta(df / 2, .5, df / (df + t * t));
export const fPVal   = (F, df1, df2) => ibeta(df2 / 2, df1 / 2, df2 / (df2 + df1 * F));
function lowerIncGamma(a, x) {
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

export const chiPVal = (chi2, df) => {
  if (df <= 0 || chi2 < 0) return 1;
  if (chi2 === 0) return 1;
  return 1 - lowerIncGamma(df / 2, chi2 / 2);
};

// ── Inverse t (two-tailed) ────────────────────────────────────────────────────
export function tInv2(alpha, df) {
  if (df > 1e4) return normalINV(1 - alpha / 2);
  let lo = 0, hi = 200;
  for (let i = 0; i < 100; i++) {
    const m = (lo + hi) / 2;
    tPVal(m, df) > alpha ? lo = m : hi = m;
  }
  return (lo + hi) / 2;
}

// ── Power for two-sample t ────────────────────────────────────────────────────
export function computePowerT(n1, n2, d, alpha = .05) {
  const df = n1 + n2 - 2, ncp = d * Math.sqrt(n1 * n2 / (n1 + n2)), tc = tInv2(alpha, df);
  return normalCDF(ncp - tc) + normalCDF(-ncp - tc);
}
export function computePowerCorr(n, r, alpha = .05) {
  const z = .5 * Math.log((1 + r) / (1 - r)), se = 1 / Math.sqrt(n - 3), zc = normalINV(1 - alpha / 2);
  return normalCDF(Math.abs(z) / se - zc);
}
export function requiredN(d, power = .8, alpha = .05) {
  let n = 4;
  while (n < 10000) { if (computePowerT(n, n, Math.abs(d), alpha) >= power) return n; n++; }
  return n;
}
export function requiredNCorr(r, power = .8, alpha = .05) {
  let n = 5;
  while (n < 10000) { if (computePowerCorr(n, Math.abs(r), alpha) >= power) return n; n++; }
  return n;
}

// ── Normality tests ───────────────────────────────────────────────────────────
import { avg, sampleSD, clamp } from './core.js';

export function normalityDP(vals) {
  const n = vals.length; if (n < 8) return null;
  const m = avg(vals), s = sampleSD(vals) || 1;
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

export function shapiroWilk(x) {
  const n = x.length; if (n < 3 || n > 5000) return null;
  const s = [...x].sort((a, b) => a - b), xbar = avg(x);
  let ss = x.reduce((a, v) => a + (v - xbar) ** 2, 0);
  const m = Array.from({ length: n }, (_, i) => normalINV((i + 1 - .375) / (n + .25)));
  const mm = Math.sqrt(m.reduce((a, v) => a + v * v, 0));
  const a = m.slice(0, Math.floor(n / 2)).map(v => v / mm);
  let W = 0;
  for (let i = 0; i < Math.floor(n / 2); i++) W += a[i] * (s[n - 1 - i] - s[i]);
  W = W * W / ss;
  const z = (Math.log(-Math.log(1 - W)) - -.0006) / 0.8;
  const p = clamp(1 - normalCDF(z), 0, 1);
  return { stat: +W.toFixed(5), p, normal: p > .05, approximate: n < 10 };
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
export function bootstrapCI(vals, fn, B = 1999, alpha = .05) {
  const n = vals.length, stats = [];
  for (let b = 0; b < B; b++) {
    const s = Array.from({ length: n }, () => vals[Math.floor(Math.random() * n)]);
    stats.push(fn(s));
  }
  stats.sort((a, b) => a - b);
  return {
    lo:   stats[Math.floor(alpha / 2 * B)],
    hi:   stats[Math.floor((1 - alpha / 2) * B)],
    dist: stats,
  };
}
