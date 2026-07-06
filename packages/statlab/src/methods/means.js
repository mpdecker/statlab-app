import { avg, sampleVar, sampleSD, winsorize, trimmedMean, corr, effD, fmtP } from '../math/core.js';
import { tPVal, tInv2, normalCDF, computePowerT, requiredN, lnBinom } from '../math/distributions.js';
import { requiredNTTest } from '../math/power.js';

// ── Welch two-sample t-test ───────────────────────────────────────────────────
/** Welch's two-sample t-test (unequal variances). @param {number[]} a @param {number[]} b */
export function tWelch(a, b) {
  if (a.length < 2 || b.length < 2) return null;
  const na = a.length, nb = b.length, ma = avg(a), mb = avg(b);
  const sa = sampleVar(a), sb = sampleVar(b), se = Math.sqrt(sa / na + sb / nb);
  if (!se) return null;
  const t = (ma - mb) / se;
  const df = (sa / na + sb / nb) ** 2 / ((sa / na) ** 2 / (na - 1) + (sb / nb) ** 2 / (nb - 1));
  const pool = Math.sqrt(((na - 1) * sa + (nb - 1) * sb) / (na + nb - 2));
  const d = (ma - mb) / (pool || 1);
  const g = d * (1 - 3 / (4 * (na + nb - 2) - 1));
  const p = tPVal(t, df), ci = tInv2(.05, df) * se;
  return {
    test: "Welch t-test", t: +t.toFixed(4), df: +df.toFixed(1), p,
    ci95: +ci.toFixed(4), ma: +ma.toFixed(4), mb: +mb.toFixed(4),
    sdA: +sampleSD(a).toFixed(4), sdB: +sampleSD(b).toFixed(4),
    na, nb, d: +d.toFixed(4), g: +g.toFixed(4), effD: effD(d),
    power: +computePowerT(na, nb, Math.abs(d)).toFixed(3),
    reqN: requiredN(Math.abs(d)),
    apa: `t(${df.toFixed(1)}) = ${t.toFixed(2)}, ${fmtP(p)}, d = ${d.toFixed(2)} [${effD(d)}], 95% CI [${(ma - mb - ci).toFixed(3)}, ${(ma - mb + ci).toFixed(3)}]`,
  };
}

// ── One-sample t-test ─────────────────────────────────────────────────────────
/** One-sample t-test against mu0. @param {number[]} vals @param {number} [mu0=0] */
export function tOne(vals, mu0 = 0) {
  if (vals.length < 2) return null;
  const n = vals.length, m = avg(vals), sd = sampleSD(vals), se = sd / Math.sqrt(n);
  if (!se) return null;
  const t = (m - mu0) / se, df = n - 1, d = (m - mu0) / (sd || 1);
  const p = tPVal(t, df), ci = tInv2(.05, df) * se;
  return {
    test: "One-sample t-test", t: +t.toFixed(4), df, p,
    ci95: +ci.toFixed(4), m: +m.toFixed(4), mu0,
    sd: +sd.toFixed(4), se: +se.toFixed(4), n, d: +d.toFixed(4), effD: effD(d),
    apa: `t(${df}) = ${t.toFixed(2)}, ${fmtP(p)}, d = ${d.toFixed(2)} [${effD(d)}]`,
  };
}

// ── Paired t-test ─────────────────────────────────────────────────────────────
/** Paired-samples t-test. @param {number[]} a @param {number[]} b */
export function tPaired(a, b) {
  if (a.length !== b.length || a.length < 2) return null;
  const diffs = a.map((v, i) => v - b[i]), r = corr(a, b);
  const res = tOne(diffs, 0);
  if (!res) return null;
  return { ...res, test: "Paired t-test", r: +r.toFixed(4) };
}

// ── Yuen's trimmed t-test (robust) ───────────────────────────────────────────
/** Yuen's trimmed-means t-test. @param {number[]} a @param {number[]} b @param {number} [p=0.2] trim proportion. */
export function yuentTest(a, b, p = 0.2) {
  const wa = winsorize(a, p), wb = winsorize(b, p);
  const na = a.length, nb = b.length;
  const g1 = Math.floor(p * na), g2 = Math.floor(p * nb);
  const nt1 = na - 2 * g1, nt2 = nb - 2 * g2;
  const mt1 = trimmedMean(a, p), mt2 = trimmedMean(b, p);
  // Winsorized variance: sum-of-squared-deviations / (h-1), h = trimmed sample size
  // (Yuen 1974 §1). Previously divided by (full n - 1) instead of (h - 1), which
  // understated the SE and inflated |t| — e.g. ~2.2x too large on an
  // outlier-containing sample, producing false-positive significance. Verified
  // against scipy.stats.ttest_ind(..., trim=p).
  const ssw1 = a.reduce((s, x) => s + (Math.min(Math.max(x, wa[0]), wa[wa.length - 1]) - mt1) ** 2, 0);
  const ssw2 = b.reduce((s, x) => s + (Math.min(Math.max(x, wb[0]), wb[wb.length - 1]) - mt2) ** 2, 0);
  const sw1 = ssw1 / Math.max(1, nt1 - 1);
  const sw2 = ssw2 / Math.max(1, nt2 - 1);
  const d1 = sw1 / nt1, d2 = sw2 / nt2;
  const se = Math.sqrt(d1 + d2);
  if (se < 1e-14) return null;
  const t = (mt1 - mt2) / se;
  const df = (d1 + d2) ** 2 / (d1 ** 2 / (nt1 - 1) + d2 ** 2 / (nt2 - 1));
  const p_val = tPVal(t, df);
  return {
    test: "Yuen's Trimmed t-test", t: +t.toFixed(4), df: +df.toFixed(1), p: p_val,
    mt1: +mt1.toFixed(4), mt2: +mt2.toFixed(4), trim: p,
    apa: `Yuen t(${df.toFixed(1)}) = ${t.toFixed(2)}, ${fmtP(p_val)}, 20% trimmed`,
  };
}

// ── z-test (known σ) ──────────────────────────────────────────────────────────
/** One-sample z-test with known population SD. @param {number} xbar @param {number} mu0 @param {number} sigma @param {number} n */
export function zTestKnownSD(xbar, mu0, sigma, n) {
  if (!Number.isFinite(n) || n < 1 || !Number.isFinite(sigma) || sigma <= 0) return null;
  const se = sigma / Math.sqrt(n), z = (xbar - mu0) / se;
  const p = 2 * (1 - normalCDF(Math.abs(z))), ci = 1.96 * se, d = (xbar - mu0) / sigma;
  return {
    test: "z-test (known σ)", z: +z.toFixed(4), p,
    ci95: [+(xbar - ci).toFixed(4), +(xbar + ci).toFixed(4)],
    d: +d.toFixed(4), xbar, mu0, sigma, n,
    apa: `z = ${z.toFixed(2)}, ${fmtP(p)}, d = ${d.toFixed(3)}`,
  };
}

// ── Sign test ─────────────────────────────────────────────────────────────────
/** Sign test against mu0. @param {number[]} a @param {number} [mu0=0] */
export function signTest(a, mu0 = 0) {
  const pos = a.filter(x => x > mu0).length;
  const neg = a.filter(x => x < mu0).length;
  const total = pos + neg;
  if (total < 5) return null;
  const binom = k => Math.exp(lnBinom(total, k) + k * Math.log(.5) + (total - k) * Math.log(.5));
  const obs = binom(Math.min(pos, neg));
  let p = 0;
  for (let k = 0; k <= total; k++) if (binom(k) <= obs + 1e-10) p += binom(k);
  p = Math.min(1, p);
  return {
    test: "Sign Test", pos, neg, total, p: +p.toFixed(6),
    apa: `Sign test: ${pos}+, ${neg}−, p = ${p.toFixed(4)}`,
  };
}

// Cohen's d (from group data)
/** Cohen's d for two independent groups. @param {number[]} group1 @param {number[]} group2 */
export function cohensDGroup(group1, group2) {
  if (!group1 || !group2 || group1.length < 3 || group2.length < 3) return null;
  const m1 = avg(group1), m2 = avg(group2);
  const s1 = sampleVar(group1), s2 = sampleVar(group2);
  const sp = Math.sqrt(((group1.length - 1) * s1 + (group2.length - 1) * s2) / (group1.length + group2.length - 2));
  const d = sp > 0 ? (m1 - m2) / sp : 0;
  const se = Math.sqrt(1 / group1.length + 1 / group2.length + d * d / (2 * (group1.length + group2.length)));
  const label = Math.abs(d) > 0.8 ? 'large' : Math.abs(d) > 0.5 ? 'medium' : 'small';
  return { test: "Cohen's d", d: +d.toFixed(4), se: +se.toFixed(4), label, n1: group1.length, n2: group2.length, apa: `d = ${d.toFixed(2)} (${label})` };
}

// ── Equivalence T-test (TOST — Two One-Sided Tests, Schuirmann 1987) ─────────
// Each one-sided test needs the one-sided-alpha critical value, which is the
// tInv2(2·alpha, df) two-sided critical at *double* alpha (P(|T|>tc)=2α ⇔
// P(T>tc)=α) — not the fixed z=1.96 the old code used regardless of α or df.
// Reports one-sided p-values from the real t-distribution; equivalence holds
// iff both are below α (equivalently both t-stats exceed the one-sided tc).
function _tUpperP(t, df) {
  return t >= 0 ? tPVal(t, df) / 2 : 1 - tPVal(-t, df) / 2;
}
/** Two one-sided tests (TOST) equivalence via t. @param {number[]} group1 @param {number[]} group2 @param {number} dL lower bound. @param {number} dU upper bound. @param {number} [alpha=0.05] */
export function equivalenceT(group1, group2, dL, dU, alpha = 0.05) {
  if (!group1 || !group2 || group1.length < 3 || group2.length < 3 || dL >= dU) return null;
  const m1 = avg(group1), m2 = avg(group2);
  const v1 = sampleVar(group1) / group1.length, v2 = sampleVar(group2) / group2.length;
  const se = Math.sqrt(v1 + v2);
  const tLow = (m1 - m2 - dL) / Math.max(se, 0.001);
  const tHigh = (dU - (m1 - m2)) / Math.max(se, 0.001);
  const df = Math.max(1, Math.floor((v1 + v2) ** 2 / (v1 ** 2 / (group1.length - 1) + v2 ** 2 / (group2.length - 1))));
  const tCrit = tInv2(2 * alpha, df); // one-sided critical value at level alpha
  const pLow = _tUpperP(tLow, df), pHigh = _tUpperP(tHigh, df);
  const pTOST = Math.max(pLow, pHigh);
  const equivalent = tLow > tCrit && tHigh > tCrit;
  return { test: 'Equivalence T', tLow: +tLow.toFixed(4), tHigh: +tHigh.toFixed(4), tCrit: +tCrit.toFixed(4), pLow: +pLow.toFixed(4), pHigh: +pHigh.toFixed(4), p: +pTOST.toFixed(4), df, equivalent, dL, dU, alpha, apa: `TOST: ${equivalent ? 'Equivalent' : 'Not equivalent'} (dL=${dL}, dU=${dU}, p=${pTOST.toFixed(3)})` };
}

// ── Sample Size for T-test ──────────────────────────────────────────────────
// Delegates to the real iterative t-based search (requiredNTTest, honoring
// the actual t-critical at each candidate df via powerTTest/tInv2) instead of
// the fixed-z closed-form the old code used — which also silently ignored
// whatever `alpha`/`power` the caller passed in.
/** Required sample size for a t-test. @param {number} d Cohen's d. @param {number} [power=0.8] @param {number} [alpha=0.05] @param {'two-sample'|'paired'|'one-sample'} [type='two-sample'] */
export function sampleSizeT(d, power = 0.8, alpha = 0.05, type = 'two-sample') {
  if (!Number.isFinite(d) || d <= 0) return null;
  const isPaired = type === 'pair' || type === 'paired' || type === 'one-sample';
  const nPerGroup = requiredNTTest(Math.abs(d), isPaired ? 'paired' : 'two-sample', power, alpha);
  if (!Number.isFinite(nPerGroup)) return null;
  const total = isPaired ? nPerGroup : nPerGroup * 2;
  return { test: 'Sample Size T', nPerGroup, total, d, power, alpha, type, apa: `N = ${total} (${nPerGroup}${isPaired ? '' : '/group'}) for d=${d}` };
}
