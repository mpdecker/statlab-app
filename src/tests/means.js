import { avg, sampleVar, sampleSD, winsorize, trimmedMean, corr, effD, fmtP } from '../math/core.js';
import { tPVal, tInv2, normalCDF, computePowerT, requiredN, lnBinom } from '../math/distributions.js';

// ── Welch two-sample t-test ───────────────────────────────────────────────────
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
    apa: `t(${df.toFixed(1)}) = ${t.toFixed(2)}, ${fmtP(p)}, d = ${Math.abs(d).toFixed(2)} [${effD(d)}], 95% CI [${(ma - mb - ci).toFixed(3)}, ${(ma - mb + ci).toFixed(3)}]`,
  };
}

// ── One-sample t-test ─────────────────────────────────────────────────────────
export function tOne(vals, mu0 = 0) {
  if (vals.length < 2) return null;
  const n = vals.length, m = avg(vals), sd = sampleSD(vals), se = sd / Math.sqrt(n);
  const t = (m - mu0) / se, df = n - 1, d = (m - mu0) / (sd || 1);
  const p = tPVal(t, df), ci = tInv2(.05, df) * se;
  return {
    test: "One-sample t-test", t: +t.toFixed(4), df, p,
    ci95: +ci.toFixed(4), m: +m.toFixed(4), mu0,
    sd: +sd.toFixed(4), se: +se.toFixed(4), n, d: +d.toFixed(4), effD: effD(d),
    apa: `t(${df}) = ${t.toFixed(2)}, ${fmtP(p)}, d = ${Math.abs(d).toFixed(2)} [${effD(d)}]`,
  };
}

// ── Paired t-test ─────────────────────────────────────────────────────────────
export function tPaired(a, b) {
  if (a.length !== b.length || a.length < 2) return null;
  const diffs = a.map((v, i) => v - b[i]), r = corr(a, b);
  const res = tOne(diffs, 0);
  return { ...res, test: "Paired t-test", r: +r.toFixed(4) };
}

// ── Yuen's trimmed t-test (robust) ───────────────────────────────────────────
export function yuentTest(a, b, p = 0.2) {
  const wa = winsorize(a, p), wb = winsorize(b, p);
  const na = a.length, nb = b.length;
  const g1 = Math.floor(p * na), g2 = Math.floor(p * nb);
  const nt1 = na - 2 * g1, nt2 = nb - 2 * g2;
  const mt1 = trimmedMean(a, p), mt2 = trimmedMean(b, p);
  const sw1 = a.reduce((s, x) => s + (Math.min(Math.max(x, wa[0]), wa[wa.length - 1]) - mt1) ** 2, 0) / (na - 1);
  const sw2 = b.reduce((s, x) => s + (Math.min(Math.max(x, wb[0]), wb[wb.length - 1]) - mt2) ** 2, 0) / (nb - 1);
  const se = Math.sqrt(sw1 / (nt1 * (nt1 - 1)) + sw2 / (nt2 * (nt2 - 1)));
  if (se < 1e-14) return null;
  const t = (mt1 - mt2) / se;
  const df = se ** 4 / (
    ((sw1 / (nt1 * (nt1 - 1))) ** 2 / (nt1 - 1)) +
    ((sw2 / (nt2 * (nt2 - 1))) ** 2 / (nt2 - 1))
  );
  const p_val = tPVal(t, df);
  return {
    test: "Yuen's Trimmed t-test", t: +t.toFixed(4), df: +df.toFixed(1), p: p_val,
    mt1: +mt1.toFixed(4), mt2: +mt2.toFixed(4), trim: p,
    apa: `Yuen t(${df.toFixed(1)}) = ${t.toFixed(2)}, ${fmtP(p_val)}, 20% trimmed`,
  };
}

// ── z-test (known σ) ──────────────────────────────────────────────────────────
export function zTestKnownSD(xbar, mu0, sigma, n) {
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
