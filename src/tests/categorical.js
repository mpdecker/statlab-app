import { avg, sampleSD, sampleVar, corr, rank, effR, effV, fmtP, sig } from '../math/core.js';
import { tPVal, fPVal, chiPVal, normalCDF, tInv2, lnBinom } from '../math/distributions.js';

// ── Chi-Square independence ───────────────────────────────────────────────────
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
export function mcnemar(b, c) {
  if (!Number.isFinite(b) || !Number.isFinite(c) || b < 0 || c < 0) return null;
  if (b + c < 10) return null;
  if (b + c === 0) return null;
  const chi2 = (Math.abs(b - c) - 1) ** 2 / (b + c), p = chiPVal(chi2, 1);
  return { test: "McNemar's Test", chi2: +chi2.toFixed(4), p, b, c, apa: `χ²(1) = ${chi2.toFixed(2)}, ${fmtP(p)}` };
}

// ── Binomial exact test ───────────────────────────────────────────────────────
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

// ── Mann-Whitney U ────────────────────────────────────────────────────────────
export function mannWhitney(a, b) {
  if (a.length < 2 || b.length < 2) return null;
  const na = a.length, nb = b.length;
  let u1 = 0;
  a.forEach(x => b.forEach(y => { if (x > y) u1++; else if (x === y) u1 += .5; }));
  const u2 = na * nb - u1, u = Math.min(u1, u2);
  const z = (u - na * nb / 2) / Math.sqrt(na * nb * (na + nb + 1) / 12);
  const p = 2 * (1 - normalCDF(Math.abs(z)));
  const rb = u1 / (na * nb), cd = 2 * rb - 1;
  return {
    test: "Mann-Whitney U", u: +u.toFixed(1), u1: +u1.toFixed(1), u2: +u2.toFixed(1),
    z: +z.toFixed(4), p, rb: +rb.toFixed(4), cliffsDelta: +cd.toFixed(4), effR: effR(rb), na, nb,
    apa: `U = ${u.toFixed(0)}, z = ${z.toFixed(2)}, ${fmtP(p)}, r = ${rb.toFixed(3)} [${effR(rb)}]`,
  };
}

// ── Wilcoxon signed-rank ──────────────────────────────────────────────────────
export function wilcoxonSR(a, b = null) {
  const diffs = b ? a.map((v, i) => v - (b[i] ?? 0)) : a;
  const nonzero = diffs.filter(d => d !== 0), n = nonzero.length;
  if (n < 5) return null;
  const absD = nonzero.map(Math.abs), r = rank(absD);
  let wPlus = 0, wMinus = 0;
  nonzero.forEach((d, i) => { if (d > 0) wPlus += r[i]; else wMinus += r[i]; });
  const W = Math.min(wPlus, wMinus);
  const muW = n * (n + 1) / 4, sigW = Math.sqrt(n * (n + 1) * (2 * n + 1) / 24);
  const z = (W - muW) / sigW, p = 2 * (1 - normalCDF(Math.abs(z)));
  const rEff = Math.abs(z) / Math.sqrt(n);
  return {
    test: "Wilcoxon Signed-Rank", W: +W.toFixed(1), wPlus: +wPlus.toFixed(1), wMinus: +wMinus.toFixed(1),
    z: +z.toFixed(4), p, r: +rEff.toFixed(4), effR: effR(rEff), n,
    apa: `W = ${W.toFixed(0)}, z = ${z.toFixed(2)}, ${fmtP(p)}, r = ${rEff.toFixed(3)} [${effR(rEff)}]`,
  };
}

// ── TOST equivalence ──────────────────────────────────────────────────────────
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

// ── Grubbs outlier test ───────────────────────────────────────────────────────
export function grubbsTest(vals) {
  const n = vals.length; if (n < 7) return null;
  const m = avg(vals), s = sampleSD(vals);
  if (!s || s < 1e-14) return null;
  const devs = vals.map((x, i) => ({ val: x, z: Math.abs(x - m) / s, idx: i })).sort((a, b) => b.z - a.z);
  const G = devs[0].z, p = Math.min(1, 1 - Math.pow(1 - normalCDF(-G * Math.sqrt(n / (n - 1))), n));
  return {
    test: "Grubbs Outlier", G: +G.toFixed(4), outlierVal: devs[0].val, outlierIdx: devs[0].idx, p: +p.toFixed(4), n,
    apa: `G = ${G.toFixed(3)}, ${fmtP(p)} — ${p < .05 ? `outlier detected: ${devs[0].val}` : "no outlier"}`,
  };
}

// ── Levene + Bartlett homogeneity tests ───────────────────────────────────────
export function leveneTest(groups) {
  const k = groups.length, N = groups.reduce((s, g) => s + g.length, 0);
  const z = groups.map(g => g.map(x => Math.abs(x - avg(g))));
  const zm = z.map(g => avg(g)), gm = avg(z.flat());
  const num = groups.reduce((s, g, i) => s + g.length * (zm[i] - gm) ** 2, 0) / (k - 1);
  const den = groups.reduce((s, g, i) => s + g.reduce((a, _, j) => a + (z[i][j] - zm[i]) ** 2, 0), 0) / (N - k);
  const F = num / (den || 1e-9);
  return { F: +F.toFixed(4), p: fPVal(F, k - 1, N - k), equal: fPVal(F, k - 1, N - k) > .05 };
}
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
export function bonferroni(pairs) {
  const m = pairs.length;
  return pairs.map(p => ({ ...p, pAdj: Math.min(1, p.p * m), sig: Math.min(1, p.p * m) < .05 }));
}
export function holm(pairs) {
  const m = pairs.length, sorted = [...pairs].sort((a, b) => a.p - b.p);
  let prev = 0;
  return sorted.map((p, i) => { const adj = Math.max(prev, Math.min(1, p.p * (m - i))); prev = adj; return { ...p, pAdj: adj, sig: adj < .05 }; })
    .sort((a, b) => pairs.indexOf(a) - pairs.indexOf(b));
}
export function bh(pairs) {
  const m = pairs.length, sorted = [...pairs].sort((a, b) => a.p - b.p);
  let prev = 1;
  return sorted.map((_, i) => sorted[m - 1 - i]).map((p, i) => { const adj = Math.min(prev, p.p * m / (m - i)); prev = adj; return { ...p, pAdj: adj, sig: adj < .05 }; })
    .reverse().sort((a, b) => pairs.indexOf(a) - pairs.indexOf(b));
}

// ── Leave-one-out sensitivity ─────────────────────────────────────────────────
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
