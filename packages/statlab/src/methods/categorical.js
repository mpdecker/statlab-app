import { avg, sampleSD, sampleVar, corr, rank, effR, effV, fmtP, sig } from '../math/core.js';
import { tPVal, fPVal, chiPVal, normalCDF, tInv2, lnBinom } from '../math/distributions.js';

// ── Chi-Square independence ───────────────────────────────────────────────────
/** Chi-square test of independence from long-format rows. @param {Array<Record<string, any>>} data @param {string} col1 @param {string} col2 */
export function chiSquare(data, col1, col2) {
  const c1 = [...new Set(data.map(r => r[col1]))].filter(v => v != null).sort();
  const c2 = [...new Set(data.map(r => r[col2]))].filter(v => v != null).sort();
  if (!c1.length || !c2.length) return null;
  const n = data.length;
  const obs = c1.map(a => c2.map(b => data.filter(r => r[col1] === a && r[col2] === b).length));
  const rowSums = obs.map(r => r.reduce((s, v) => s + v, 0));
  const colSums = c2.map((_, j) => obs.reduce((s, r) => s + r[j], 0));
  let chi2 = 0, lowExp = false;
  const exp = obs.map((row, i) => row.map((o, j) => {
    const e = rowSums[i] * colSums[j] / n;
    if (e < 5) lowExp = true;
    if (e > 0) chi2 += (o - e) ** 2 / e;
    return +e.toFixed(2);
  }));
  const df = (c1.length - 1) * (c2.length - 1);
  if (df <= 0) return null;
  const V = Math.sqrt(chi2 / (n * Math.min(c1.length - 1, c2.length - 1)));
  return {
    test: "Chi-Square", chi2: +chi2.toFixed(4), df, p: chiPVal(chi2, df),
    V: +V.toFixed(4), effV: effV(V), cats1: c1, cats2: c2, obs, exp,
    rowSums, colSums, n, lowExp,
    apa: `χ²(${df}) = ${chi2.toFixed(2)}, ${fmtP(chiPVal(chi2, df))}, V = ${V.toFixed(3)} [${effV(V)}]`,
  };
}

// ── Chi-Square goodness-of-fit ────────────────────────────────────────────────
/** Chi-square goodness-of-fit test. @param {number[]} observed @param {number[]} expected */
export function chiGoF(observed, expected) {
  if (!observed.length || observed.length !== expected.length) return null;
  const n = observed.reduce((s, v) => s + v, 0);
  if (n < 1) return null;
  if (expected.some(e => !(e > 0))) return null;
  const chi2 = observed.reduce((s, o, i) => s + (o - expected[i]) ** 2 / expected[i], 0);
  const df = observed.length - 1, p = chiPVal(chi2, df), w = Math.sqrt(chi2 / n);
  return {
    test: "Chi-Square GoF", chi2: +chi2.toFixed(4), df, p, w: +w.toFixed(4),
    observed, expected, n,
    apa: `χ²(${df}) = ${chi2.toFixed(2)}, ${fmtP(p)}, w = ${w.toFixed(3)}`,
  };
}

// ── Fisher's Exact ────────────────────────────────────────────────────────────
/** Fisher's exact test for a 2×2 table. @param {number} a @param {number} b @param {number} c @param {number} d */
export function fisherExact(a, b, c, d) {
  if (![a, b, c, d].every(v => Number.isFinite(v) && v >= 0)) return null;
  const n = a + b + c + d;
  if (n === 0) return null;
  if (n > 500) return { test: "Fisher's Exact", p: null, OR: null, warning: "n > 500: use chi-square instead" };
  const r1 = a + b, r2 = c + d, c1 = a + c;
  const lnP0 = lnBinom(r1, a) + lnBinom(r2, c) - lnBinom(n, c1);
  let pVal = 0;
  const lo = Math.max(0, c1 - r2), hi = Math.min(r1, c1);
  for (let k = lo; k <= hi; k++) {
    const lp = lnBinom(r1, k) + lnBinom(r2, c1 - k) - lnBinom(n, c1);
    if (lp <= lnP0 + 1e-8) pVal += Math.exp(lp);
  }
  const OR = (a * d) / ((b * c) || 1);
  const lnOR = Math.log(OR || 1e-9), seOR = Math.sqrt(1 / (a || .5) + 1 / (b || .5) + 1 / (c || .5) + 1 / (d || .5));
  const phi = (a * d - b * c) / Math.sqrt((a + b) * (c + d) * (a + c) * (b + d));
  return {
    test: "Fisher's Exact", p: +pVal.toFixed(6), OR: +OR.toFixed(4),
    orCI: [+Math.exp(lnOR - 1.96 * seOR).toFixed(3), +Math.exp(lnOR + 1.96 * seOR).toFixed(3)],
    phi: +phi.toFixed(4), a, b, c, d,
    RR: +(a / (a + b || 1)) / (c / (c + d || 1)),
    apa: `Fisher: p = ${pVal.toFixed(4)}, OR = ${OR.toFixed(2)} [${Math.exp(lnOR - 1.96 * seOR).toFixed(2)}, ${Math.exp(lnOR + 1.96 * seOR).toFixed(2)}], φ = ${phi.toFixed(3)}`,
  };
}

// ── McNemar's Test ────────────────────────────────────────────────────────────
/** McNemar's test for paired binary data (discordant cells). @param {number} b @param {number} c */
export function mcnemar(b, c) {
  if (!Number.isFinite(b) || !Number.isFinite(c) || b < 0 || c < 0) return null;
  if (b + c < 10) return null;
  if (b + c === 0) return null;
  const chi2 = (Math.abs(b - c) - 1) ** 2 / (b + c), p = chiPVal(chi2, 1);
  return { test: "McNemar's Test", chi2: +chi2.toFixed(4), p, b, c, apa: `χ²(1) = ${chi2.toFixed(2)}, ${fmtP(p)}` };
}

// ── Binomial exact test ───────────────────────────────────────────────────────
/** Exact binomial test. @param {number} k successes. @param {number} n trials. @param {number} [p0=0.5] */
export function binomialTest(k, n, p0 = .5) {
  if (!Number.isInteger(n) || n < 1 || !Number.isInteger(k) || k < 0 || k > n) return null;
  if (!(p0 > 0 && p0 < 1)) return null;
  const binom = k_ => Math.exp(lnBinom(n, k_) + k_ * Math.log(p0) + (n - k_) * Math.log(1 - p0));
  const obs = binom(k);
  let p = 0;
  for (let i = 0; i <= n; i++) if (binom(i) <= obs + 1e-10) p += binom(i);
  p = Math.min(1, p);
  const ph = k / n, se = Math.sqrt(ph * (1 - ph) / n);
  return {
    test: "Binomial Exact", k, n, p0, pHat: +ph.toFixed(4), p: +p.toFixed(6),
    ci95: [+Math.max(0, ph - 1.96 * se).toFixed(4), +Math.min(1, ph + 1.96 * se).toFixed(4)],
    apa: `k = ${k}, n = ${n}, p̂ = ${ph.toFixed(3)}, p = ${p.toFixed(4)}`,
  };
}

// ── One-proportion z ──────────────────────────────────────────────────────────
/** One-proportion z-test. @param {number} x successes. @param {number} n trials. @param {number} [p0=0.5] */
export function onePropZ(x, n, p0 = .5) {
  if (!Number.isFinite(n) || n < 1 || !Number.isFinite(x) || x < 0 || x > n) return null;
  if (!(p0 > 0 && p0 < 1)) return null;
  const ph = x / n, se = Math.sqrt(p0 * (1 - p0) / n);
  if (!se) return null;
  const z = (ph - p0) / se;
  const p = 2 * (1 - normalCDF(Math.abs(z)));
  const h = 2 * Math.asin(Math.sqrt(ph)) - 2 * Math.asin(Math.sqrt(p0));
  const ciSe = Math.sqrt(ph * (1 - ph) / n);
  return {
    test: "One-Proportion z", ph: +ph.toFixed(4), p0, z: +z.toFixed(4), p,
    ci95: [+Math.max(0, ph - 1.96 * ciSe).toFixed(4), +Math.min(1, ph + 1.96 * ciSe).toFixed(4)],
    h: +h.toFixed(4), n,
    apa: `z = ${z.toFixed(2)}, ${fmtP(p)}, p̂ = ${ph.toFixed(3)}, h = ${h.toFixed(3)}`,
  };
}

// ── Two-proportion z ──────────────────────────────────────────────────────────
/** Two-proportion z-test. @param {number} x1 @param {number} n1 @param {number} x2 @param {number} n2 */
export function twoPropZ(x1, n1, x2, n2) {
  if ([n1, n2].some(n => !Number.isFinite(n) || n < 1)) return null;
  if ([x1, x2].some((x, i) => !Number.isFinite(x) || x < 0 || x > [n1, n2][i])) return null;
  const p1 = x1 / n1, p2 = x2 / n2, pp = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(pp * (1 - pp) * (1 / n1 + 1 / n2));
  if (!se) return null;
  const z = (p1 - p2) / se;
  const p = 2 * (1 - normalCDF(Math.abs(z)));
  const OR = (x1 * (n2 - x2)) / ((x2 * (n1 - x1)) || 1);
  const ARR = p1 - p2, RR = p1 / (p2 || 1e-9);
  const h = 2 * Math.asin(Math.sqrt(p1)) - 2 * Math.asin(Math.sqrt(p2));
  return {
    test: "Two-Proportion z", p1: +p1.toFixed(4), p2: +p2.toFixed(4), z: +z.toFixed(4), p,
    ARR: +ARR.toFixed(4), RR: +RR.toFixed(4), NNT: +Math.abs(1 / ARR).toFixed(1),
    OR: +OR.toFixed(4), h: +h.toFixed(4), n1, n2,
    apa: `z = ${z.toFixed(2)}, ${fmtP(p)}, OR = ${OR.toFixed(2)}, ARR = ${ARR.toFixed(3)}, NNT = ${Math.abs(1 / ARR).toFixed(1)}`,
  };
}

// ── Mann-Whitney U and Wilcoxon signed-rank moved to nonparametric.js ──────

// ── TOST equivalence ──────────────────────────────────────────────────────────
/** Two one-sided tests (TOST) equivalence. @param {number[]} a @param {number[]} b @param {number} dL @param {number} dU @param {number} [alpha=0.05] */
export function tost(a, b, dL, dU, alpha = .05) {
  if (!a.length || !b.length) return null;
  const na = a.length, nb = b.length, ma = avg(a), mb = avg(b);
  const sa = sampleVar(a), sb = sampleVar(b), se = Math.sqrt(sa / na + sb / nb);
  if (!se) return null;
  const diff = ma - mb;
  const df = (sa / na + sb / nb) ** 2 / ((sa / na) ** 2 / (na - 1) + (sb / nb) ** 2 / (nb - 1));
  const t1 = (diff - dL) / se, t2 = (dU - diff) / se;
  const p1 = 1 - normalCDF(t1), p2 = 1 - normalCDF(t2), pE = Math.max(p1, p2), equiv = pE < alpha;
  return {
    test: "TOST Equivalence", diff: +diff.toFixed(4), dL, dU,
    t1: +t1.toFixed(4), t2: +t2.toFixed(4), p1: +p1.toFixed(4), p2: +p2.toFixed(4),
    pEquiv: +pE.toFixed(4), equiv, df: +df.toFixed(1),
    apa: `TOST: Δ = ${diff.toFixed(3)}, t₁ = ${t1.toFixed(2)}, t₂ = ${t2.toFixed(2)}, p_equiv = ${pE.toFixed(4)} → ${equiv ? "EQUIVALENT" : "NOT EQUIVALENT"}`,
  };
}

// ── Bayes factor for t-test (JZS Cauchy prior) ───────────────────────────────
import { tPDF } from '../math/distributions.js';
/** JZS Bayes factor for a t-test. @param {number} t @param {number} n1 @param {number} n2 @param {number} [r=0.707] prior scale. */
export function bayesFactorT(t, n1, n2, r = 0.707) {
  if (!Number.isFinite(t) || !Number.isFinite(n1) || n1 < 1) return null;
  const n = n2 ? n1 * n2 / (n1 + n2) : n1, df = n2 ? n1 + n2 - 2 : n1 - 1;
  const nPts = 500, lo = -6, hi = 6, dx = (hi - lo) / (nPts - 1);
  const logH0 = Math.log(tPDF(t, df) + 1e-300);
  const logPs = Array.from({ length: nPts }, (_, i) => {
    const d = lo + i * dx, ncp = d * Math.sqrt(n);
    const logT = Math.log(tPDF(t, df) + 1e-300);
    const logCauchy = -Math.log(Math.PI * r * (1 + (d / r) ** 2));
    return logT + logCauchy;
  });
  const mx = Math.max(...logPs);
  const logH1 = mx + Math.log(logPs.reduce((s, p) => s + Math.exp(p - mx), 0) * (hi - lo) / nPts);
  const BF10 = Math.exp(logH1 - logH0);
  const label = BF10 > 100 ? "extreme H₁" : BF10 > 30 ? "very strong H₁" : BF10 > 10 ? "strong H₁" :
    BF10 > 3 ? "moderate H₁" : BF10 > 1 ? "anecdotal H₁" : BF10 > 1 / 3 ? "anecdotal H₀" : "moderate/strong H₀";
  return {
    test: "Bayesian t-test (JZS)", BF10: +BF10.toFixed(4), BF01: +(1 / BF10).toFixed(4),
    logBF10: +(logH1 - logH0).toFixed(4), label, prior: `Cauchy(r=${r.toFixed(3)})`,
    apa: `BF₁₀ = ${BF10.toFixed(3)} [${label}]`,
  };
}

// ── Bayes factor for correlation (approximation) ──────────────────────────────
/** Bayes factor for a correlation. @param {number} r @param {number} n */
export function bayesFactorCorr(r, n) {
  if (!n || n < 3) return null;
  // Jeffreys approximation: BF = (1-r²)^((n-1)/2) / B(0.5,0.5)
  const BF = Math.pow(1 - r ** 2, (n - 1) / 2) / Math.sqrt(Math.PI);
  const BF10 = 1 / BF;
  const label = BF10 > 100 ? "extreme" : BF10 > 30 ? "very strong" : BF10 > 10 ? "strong" :
    BF10 > 3 ? "moderate H₁" : BF10 > 1 ? "anecdotal H₁" : "H₀ favoured";
  return {
    test: "Bayesian Correlation", r: +r.toFixed(4), n, BF10: +BF10.toFixed(4), label,
    approximate: true,
    apa: `BF₁₀ ≈ ${BF10.toFixed(3)} [${label}] for r = ${r.toFixed(3)}, n = ${n} (Jeffreys approx.)`,
  };
}

// ── Grubbs outlier test (exact t-distribution reference; Grubbs 1950) ──────
// G = max|x-x̄|/s relates EXACTLY to a t-distributed statistic (not a normal
// one): t = G·√(n(n-2) / ((n-1)²-G²n)) ~ t(n-2) per candidate, Bonferroni-
// corrected over 2n one-sided comparisons (n possible outlier positions × 2
// tails). The previous normal-approximation formula understated significance
// by orders of magnitude (verified self-consistent: inverting the standard
// NIST Grubbs critical-value formula for a chosen α recovers exactly α under
// this p-value formula, and matches at G_crit(0.05, n=8)=2.1266 → p=0.05).
/** Grubbs' test for a single outlier. @param {number[]} vals */
export function grubbsTest(vals) {
  const n = vals.length; if (n < 7) return null;
  const m = avg(vals), s = sampleSD(vals);
  if (!s || s < 1e-14) return null;
  const devs = vals.map((x, i) => ({ val: x, z: Math.abs(x - m) / s, idx: i })).sort((a, b) => b.z - a.z);
  const G = devs[0].z;
  const denom = (n - 1) ** 2 - G ** 2 * n;
  const t = denom > 0 ? G * Math.sqrt((n * (n - 2)) / denom) : Infinity;
  // tPVal(t,df) is the two-tailed p-value 2·P(T>|t|); the one-sided upper tail is
  // half that (t is always ≥0 here), so p = min(1, 2n·[tPVal(t,df)/2]) = n·tPVal(t,df).
  const p = Math.min(1, n * tPVal(t, n - 2));
  return {
    test: "Grubbs Outlier", G: +G.toFixed(4), outlierVal: devs[0].val, outlierIdx: devs[0].idx, p: +p.toFixed(4), n,
    apa: `G = ${G.toFixed(3)}, ${fmtP(p)} — ${p < .05 ? `outlier detected: ${devs[0].val}` : "no outlier"}`,
  };
}

// ── Levene + Bartlett homogeneity tests ───────────────────────────────────────
/** Levene's test for equality of variances. @param {number[][]} groups */
export function leveneTest(groups) {
  const k = groups.length, N = groups.reduce((s, g) => s + g.length, 0);
  const z = groups.map(g => g.map(x => Math.abs(x - avg(g))));
  const zm = z.map(g => avg(g)), gm = avg(z.flat());
  const num = groups.reduce((s, g, i) => s + g.length * (zm[i] - gm) ** 2, 0) / (k - 1);
  const den = groups.reduce((s, g, i) => s + g.reduce((a, _, j) => a + (z[i][j] - zm[i]) ** 2, 0), 0) / (N - k);
  const F = num / (den || 1e-9);
  return { F: +F.toFixed(4), p: fPVal(F, k - 1, N - k), equal: fPVal(F, k - 1, N - k) > .05 };
}
/** Bartlett's test for equality of variances. @param {number[][]} groups */
export function bartlettTest(groups) {
  const k = groups.length, N = groups.reduce((s, g) => s + g.length, 0);
  const ni = groups.map(g => g.length), si = groups.map(g => sampleVar(g));
  const pooled = ni.reduce((s, n, i) => s + (n - 1) * si[i], 0) / (N - k);
  const T = (N - k) * Math.log(pooled) - ni.reduce((s, n, i) => s + (n - 1) * Math.log(si[i] || 1e-10), 0);
  const C = 1 + (ni.reduce((s, n) => s + 1 / (n - 1), 0) - 1 / (N - k)) / (3 * (k - 1));
  const B = T / C;
  return { B: +B.toFixed(4), p: chiPVal(B, k - 1) };
}

// ── Multiple comparison corrections ──────────────────────────────────────────
/** Bonferroni p-value adjustment. @param {Array<{p: number}>} pairs */
export function bonferroni(pairs) {
  const m = pairs.length;
  return pairs.map(p => ({ ...p, pAdj: Math.min(1, p.p * m), sig: Math.min(1, p.p * m) < .05 }));
}
/** Holm–Bonferroni step-down adjustment. @param {Array<{p: number}>} pairs */
export function holm(pairs) {
  const m = pairs.length, sorted = [...pairs].sort((a, b) => a.p - b.p);
  let prev = 0;
  return sorted.map((p, i) => { const adj = Math.max(prev, Math.min(1, p.p * (m - i))); prev = adj; return { ...p, pAdj: adj, sig: adj < .05 }; })
    .sort((a, b) => pairs.indexOf(a) - pairs.indexOf(b));
}
/** Benjamini–Hochberg FDR adjustment. @param {Array<{p: number}>} pairs */
export function bh(pairs) {
  const m = pairs.length, sorted = [...pairs].sort((a, b) => a.p - b.p);
  let prev = 1;
  return sorted.map((_, i) => sorted[m - 1 - i]).map((p, i) => { const adj = Math.min(prev, p.p * m / (m - i)); prev = adj; return { ...p, pAdj: adj, sig: adj < .05 }; })
    .reverse().sort((a, b) => pairs.indexOf(a) - pairs.indexOf(b));
}

// ── Leave-one-out sensitivity ─────────────────────────────────────────────────
/** Leave-one-out sensitivity of a test statistic. @param {number[]} vals @param {(sample: number[]) => any} testFn */
export function sensitivityLOO(vals, testFn) {
  const n = vals.length; if (n < 10) return null;
  const ps = vals.map((_, i) => {
    const sub = vals.filter((_, j) => j !== i);
    const res = testFn(sub);
    return res?.p;
  }).filter(p => Number.isFinite(p));
  if (ps.length < n) return null;
  const mp = avg(ps), sdp = Math.sqrt(ps.reduce((s, p) => s + (p - mp) ** 2, 0) / ps.length);
  const nSig = ps.filter(p => p < .05).length;
  return { n, nSig, propSig: +(nSig / n).toFixed(3), mean_p: +mp.toFixed(4), sd_p: +sdp.toFixed(4), stable: sdp < .1, ps };
}

// Cochran-Mantel-Haenszel
/** Cochran–Mantel–Haenszel test across strata. @param {number[][][]} tables one 2×2 table per stratum. */
export function cmhTest(tables) {
  if (!tables || tables.length < 2) return null;
  const formatted = tables.map(t => {
    if (Array.isArray(t) && t.length === 4) return { a: +t[0], b: +t[1], c: +t[2], d: +t[3] };
    if (Array.isArray(t) && t.length === 2 && Array.isArray(t[0])) return { a: +t[0][0], b: +t[0][1], c: +t[1][0], d: +t[1][1] };
    if (typeof t === 'object' && 'a' in t) return { a: +t.a, b: +t.b, c: +t.c, d: +t.d };
    return null;
  });
  if (formatted.some(t => !t || t.a < 0 || t.b < 0 || t.c < 0 || t.d < 0)) return null;
  const k = formatted.length;
  let num = 0, den = 0;
  let sumA = 0, sumEA = 0, sumVA = 0;
  const orContrib = [];
  for (const t of formatted) {
    const n = t.a + t.b + t.c + t.d;
    if (n === 0) return null;
    num += t.a * t.d / n;
    den += t.b * t.c / n;
    const EA = (t.a + t.b) * (t.a + t.c) / n;
    const VA = (t.a + t.b) * (t.c + t.d) * (t.a + t.c) * (t.b + t.d) / (n * n * (n - 1));
    sumA += t.a;
    sumEA += EA;
    sumVA += VA;
    orContrib.push(+((t.a * t.d) / (t.b * t.c || 1)).toFixed(4));
  }
  if (!den) return null;
  const or = num / den;
  const orSE = Math.sqrt(or * or * (formatted.reduce((s, t) => {
    const n = t.a + t.b + t.c + t.d;
    return s + (1 / t.a + 1 / t.b + 1 / t.c + 1 / t.d) / n;
  }, 0)));
  const orCI = [or * Math.exp(-1.96 * orSE / or), or * Math.exp(1.96 * orSE / or)];
  const chi2 = sumVA > 0 ? (Math.abs(sumA - sumEA) - 0.5) ** 2 / sumVA : 0;
  const p = chiPVal(chi2, 1);
  // Breslow-Day homogeneity
  let chi2H = 0;
  for (const t of formatted) {
    const n = t.a + t.b + t.c + t.d;
    let aHat = 0;
    const f = (n - t.a - t.d) * or - t.a - t.d;
    const disc = Math.sqrt(f * f + 4 * or * t.a * t.d);
    aHat = (-f + disc) / (2 * or);
    const vHat = 1 / (1 / Math.max(aHat, 0.1) + 1 / Math.max(t.a + t.b - aHat, 0.1) + 1 / Math.max(t.a + t.c - aHat, 0.1) + 1 / Math.max(n - t.a - t.b - t.c + aHat, 0.1));
    chi2H += (t.a - aHat) ** 2 / Math.max(vHat, 0.1);
  }
  const dfH = k - 1;
  const pHomog = chiPVal(chi2H, Math.max(1, dfH));
  return {
    test: "Cochran-Mantel-Haenszel",
    or: +or.toFixed(4),
    orCI: [+orCI[0].toFixed(4), +orCI[1].toFixed(4)],
    chi2: +chi2.toFixed(4),
    df: 1,
    p,
    chi2Homog: +chi2H.toFixed(4),
    dfHomog: dfH,
    pHomog,
    k,
    apa: `CMH OR = ${or.toFixed(2)}, 95% CI [${orCI[0].toFixed(2)}, ${orCI[1].toFixed(2)}], chi2(1) = ${chi2.toFixed(2)}, ${fmtP(p)}, k = ${k}`,
  };
}

// ── Relative Risk ─────────────────────────────────────────────────
/** Relative risk and odds ratio for a 2×2 table. @param {number} a @param {number} b @param {number} c @param {number} d */
export function relativeRisk(a, b, c, d) {
  if (![a, b, c, d].every(v => Number.isFinite(v) && v >= 0)) return null;
  if (a + b === 0 || c + d === 0) return null;
  if (a === 0 || c === 0) return null;
  const pExp = a / (a + b);
  const pUnexp = c / (c + d);
  const rr = pExp / pUnexp;
  const seLog = Math.sqrt(1 / a - 1 / (a + b) + 1 / c - 1 / (c + d));
  const rrCI = [Math.exp(Math.log(rr) - 1.96 * seLog), Math.exp(Math.log(rr) + 1.96 * seLog)];
  const arr = pExp - pUnexp;
  const nnt = arr !== 0 ? 1 / Math.abs(arr) : null;
  const nntCI = nnt ? [1 / Math.abs(Math.max(arr - 1.96 * Math.sqrt(pExp * (1 - pExp) / (a + b) + pUnexp * (1 - pUnexp) / (c + d)), 1e-10)), 1 / Math.abs(Math.max(arr + 1.96 * Math.sqrt(pExp * (1 - pExp) / (a + b) + pUnexp * (1 - pUnexp) / (c + d)), 1e-10))] : null;
  return {
    test: 'Relative Risk',
    rr: +rr.toFixed(4),
    rrCI: [+rrCI[0].toFixed(4), +rrCI[1].toFixed(4)],
    arr: +arr.toFixed(4),
    nnt: nnt != null ? +nnt.toFixed(1) : null,
    pExposed: +pExp.toFixed(4),
    pUnexposed: +pUnexp.toFixed(4),
    nTotal: a + b + c + d,
    apa: `RR = ${rr.toFixed(2)}, 95% CI [${rrCI[0].toFixed(2)}, ${rrCI[1].toFixed(2)}], ARR = ${arr.toFixed(3)}${nnt ? `, NNT = ${nnt.toFixed(0)}` : ''}`,
  };
}

// Cramer's V
/** Cramér's V effect size. @param {number} chiSquared @param {number} n @param {number} k min(rows, cols). */
export function cramersV(chiSquared, n, k) {
  if (!(chiSquared >= 0) || n <= 0) return null;
  let df;
  if (Array.isArray(k)) df = Math.min(k[0] - 1, k[1] - 1);
  else df = +k;
  if (!(df > 0)) return null;
  const v = Math.sqrt(chiSquared / (n * df));
  const label = v >= 0.5 ? 'large' : v >= 0.3 ? 'medium' : v >= 0.1 ? 'small' : 'negligible';
  return {
    test: "Cramer's V",
    v: +v.toFixed(4),
    df,
    label,
    n,
    apa: `V = ${v.toFixed(3)} [${label}], df = ${df}, n = ${n}`,
  };
}

// Kendall's W
/** Kendall's W coefficient of concordance. @param {Array<Record<string, any>>} data @param {string[]} vars rater columns. */
export function kendallW(data, vars) {
  if (!data || data.length < 8 || !vars || vars.length < 2) return null;
  const n = data.length, k = vars.length;
  const ranks = vars.map(v => {
    const col = data.map(r => +r[v]);
    const sorted = [...col].sort((a, b) => a - b);
    return col.map(val => sorted.indexOf(val) + 1);
  });
  const Rj = ranks.map(r => r.reduce((s, v) => s + v, 0));
  const Rbar = Rj.reduce((s, v) => s + v, 0) / k;
  let S = 0;
  for (const rj of Rj) S += (rj - Rbar) ** 2;
  const W = S / (k * k * (n * n * n - n) / 12);
  const chi2 = k * (n - 1) * W;
  const df = n - 1;
  const p = chiPVal(Math.max(0, chi2), Math.max(1, df));
  return {
    test: "Kendall's W", W: +W.toFixed(4), chi2: +chi2.toFixed(4), df, p, n, k,
    apa: `Kendall W = ${W.toFixed(3)}, χ²(${df}) = ${chi2.toFixed(2)}, ${p < 0.05 ? 'significant' : 'n.s.'}`,
  };
}

// Dunn's Test
/** Dunn's post-hoc test after Kruskal–Wallis. @param {number[][]} groups @param {{alpha?: number}} [options] */
export function dunnTest(groups, { alpha = 0.05 } = {}) {
  if (!groups || groups.length < 2) return null;
  const valid = groups.filter(g => g.vals && g.vals.length >= 3);
  if (valid.length < 2) return null;
  const allVals = valid.flatMap(g => g.vals);
  const N = allVals.length;
  const rankedAll = rank(allVals);
  const Rbar = valid.map((g, gi) => {
    const offset = valid.slice(0, gi).reduce((s, gg) => s + gg.vals.length, 0);
    return avg(g.vals.map((_, li) => rankedAll[offset + li]));
  });
  const k = valid.length;
  const pairs = [];
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const se = Math.sqrt(N * (N + 1) / 12 * (1 / valid[i].vals.length + 1 / valid[j].vals.length));
      const z = Math.abs(Rbar[i] - Rbar[j]) / se;
      const pRaw = 2 * (1 - normalCDF(z));
      const p = Math.min(1, pRaw * k * (k - 1) / 2);
      pairs.push({ g1: valid[i].name, g2: valid[j].name, z: +z.toFixed(4), p, sig: p < alpha });
    }
  }
  return {
    test: "Dunn's Test", pairs, alpha, k,
    apa: `Dunn: ${pairs.filter(p => p.sig).length} of ${pairs.length} pairs significant at alpha = ${alpha}`,
  };
}

// ── Nemenyi Test ──────────────────────────────────────────────────
/** Nemenyi post-hoc test. @param {number[][]} groups @param {{alpha?: number}} [options] */
export function nemenyiTest(groups, { alpha = 0.05 } = {}) {
  if (!groups || groups.length < 2) return null;
  const valid = groups.filter(g => g.vals && g.vals.length >= 3);
  if (valid.length < 2) return null;
  const k = valid.length, n = valid[0].vals.length;
  const Rbar = valid.map(g => avg(g.vals.map((v, j) => {
    const ranks = valid.map(gg => gg.vals[j]);
    const sorted = [...ranks].sort((a, b) => a - b);
    return sorted.indexOf(v) + 1;
  })));
  const se = Math.sqrt(k * (k + 1) / (6 * n));
  const qCrit = k <= 10 ? [0, 0, 2.772, 3.314, 3.633, 3.858, 4.030, 4.170, 4.286, 4.387, 4.474][k] || 4.5 : 4.5;
  const pairs = [];
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const q = Math.abs(Rbar[i] - Rbar[j]) / se;
      pairs.push({ g1: valid[i].name, g2: valid[j].name, q: +q.toFixed(4), criticalQ: qCrit, sig: q > qCrit });
    }
  }
  return {
    test: 'Nemenyi Test', pairs, k, n, alpha,
    apa: `Nemenyi: ${pairs.filter(p => p.sig).length} of ${pairs.length} pairs significant`,
  };
}

// Cochran's Q Post-Hoc
/** Post-hoc pairwise comparisons after Cochran's Q. @param {Array<Record<string, any>>} data @param {string[]} vars @param {{alpha?: number}} [options] */
export function cochranQPost(data, vars, { alpha = 0.05 } = {}) {
  if (!data || data.length < 3 || !vars || vars.length < 3) return null;
  const k = vars.length, nSubjects = data.length;
  const colSums = vars.map(v => data.reduce((s, r) => s + (+r[v] || 0), 0));
  const pairs = [];
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const diff = colSums[i] - colSums[j];
      const b = data.map(row => {
        const xi = +row?.[vars[i]] || 0, xj = +row?.[vars[j]] || 0;
        return xi - xj;
      });
      const se = sampleSDp(b) / Math.sqrt(nSubjects);
      const q = Math.abs(diff / nSubjects) / Math.max(se, 1e-10);
      const pRaw = 2 * (1 - normalCDF(q));
      const nComp = k * (k - 1) / 2;
      const p = Math.min(1, pRaw * nComp);
      pairs.push({ g1: vars[i], g2: vars[j], q: +q.toFixed(4), p, sig: p < alpha });
    }
  }
  return {
    test: "Cochran's Q Post-Hoc", pairs, k, nSubjects, alpha,
    apa: `CQ post-hoc: ${pairs.filter(p => p.sig).length} of ${pairs.length} pairs significant`,
  };
}

function sampleSDp(arr) {
  const n = arr.length;
  const m = avg(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1));
}

// ── Storey q-value ────────────────────────────────────────────────
/** Storey q-values from p-values. @param {number[]} pValues */
export function storeyQValue(pValues) {
  if (!pValues || !pValues.length) return null;
  const n = pValues.length;
  const sorted = [...pValues].sort((a, b) => a - b);
  const pi0 = Math.min(1, sorted.filter(p => p > 0.5).length / n * 2);
  const qVals = sorted.map((p, i) => Math.min(1, n * pi0 * p / (i + 1)));
  return { test: 'Storey q-value', qValues: qVals.slice(0, 10).map(v => +v.toFixed(4)), pi0: +pi0.toFixed(4), n, apa: `q-values: π₀ = ${pi0.toFixed(2)}, n = ${n}` };
}

// ── Benjamini-Yekutieli ───────────────────────────────────────────
/** Benjamini–Yekutieli FDR adjustment. @param {number[]} pValues */
export function benjaminiYekutieli(pValues) {
  if (!pValues || !pValues.length) return null;
  const n = pValues.length;
  const sorted = [...pValues].sort((a, b) => a - b);
  const cNorm = Array.from({ length: n }, (_, i) => 1 / (i + 1)).reduce((s, v) => s + v, 0);
  const thresholds = sorted.map((p, i) => p * cNorm / (i + 1) * n);
  return { test: 'Benjamini-Yekutieli', thresholds: thresholds.slice(0, 10).map(v => +v.toFixed(4)), n, apa: `BY: ${thresholds.filter((t, i) => sorted[i] <= t).length} discoveries` };
}

// ── Local FDR ─────────────────────────────────────────────────────
/** Local false discovery rate. @param {number[]} pValues @param {{nullProportion?: number|null}} [options] */
export function localFDR(pValues, { nullProportion = null } = {}) {
  if (!pValues || !pValues.length) return null;
  const n = pValues.length;
  const pi0 = nullProportion || 0.9;
  const lfdrs = pValues.map(p => Math.min(1, pi0 / Math.max(p, 0.001) / n));
  return { test: 'Local FDR', lfdr: lfdrs.slice(0, 10).map(v => +v.toFixed(4)), pi0: +pi0.toFixed(4), n, apa: `Local FDR: π₀ = ${pi0.toFixed(2)}, n = ${n}` };
}

// ── Stratified FDR ────────────────────────────────────────────────
/** Stratified FDR control. @param {number[]} pValues @param {Array<string|number>} strata */
export function stratifiedFDR(pValues, strata) {
  if (!pValues || !strata || pValues.length !== strata.length || !pValues.length) return null;
  const n = pValues.length;
  const uniqueStrata = [...new Set(strata)];
  const results = uniqueStrata.map(s => {
    const idx = strata.reduce((arr, v, i) => { if (v === s) arr.push(i); return arr; }, []);
    const ps2 = idx.map(i => pValues[i]);
    const bhSorted = [...ps2].sort((a, b) => a - b).map((p, i) => p * idx.length / (i + 1));
    return { stratum: s, n: idx.length, nDisc: bhSorted.filter((t, i) => ps2.sort()[i] <= t).length };
  });
  return { test: 'Stratified FDR', results, n, nStrata: uniqueStrata.length, apa: `Strat FDR: ${uniqueStrata.length} strata` };
}

// ── FWER Control (Hochberg) ───────────────────────────────────────
/** Family-wise error rate control. @param {number[]} pValues @param {{method?: string}} [options] */
export function fwerControl(pValues, { method = 'hochberg' } = {}) {
  if (!pValues || !pValues.length) return null;
  const n = pValues.length;
  const sorted = [...pValues].sort((a, b) => a - b);
  const hoThresh = sorted.map((p, i) => 0.05 / (n - i));
  const rejected = sorted.filter((p, i) => p <= hoThresh[i]).length;
  return { test: 'FWER Control', rejected, method, n, apa: `FWER (${method}): ${rejected} rejected` };
}
