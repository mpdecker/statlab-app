import { avg, rank, effR, fmtP, sampleVar } from '../math/core.js';
import { normalCDF, chiPVal } from '../math/distributions.js';
import { mulberry32 } from '../math/rng.js';

// Kolmogorov distribution survival function Q(λ) = 2 Σ_{k=1}^∞ (-1)^{k-1} e^{-2k²λ²}
// (the full alternating series, not just its leading term) with early termination
// once terms stop changing the sum to machine precision — the standard algorithm
// from Numerical Recipes' `probks`.
function _ksProb(lambda) {
  if (lambda < 1e-8) return 1;
  const a2 = -2 * lambda * lambda;
  let fac = 2, sum = 0, termbf = 0;
  for (let j = 1; j <= 100; j++) {
    const term = fac * Math.exp(a2 * j * j);
    sum += term;
    if (Math.abs(term) <= 1e-3 * termbf || Math.abs(term) <= 1e-10 * Math.abs(sum)) return Math.min(1, Math.max(0, sum));
    fac = -fac;
    termbf = Math.abs(term);
  }
  return 1; // failed to converge (λ too small for the asymptotic form) — conservative
}

/** One-sample Kolmogorov–Smirnov test against a theoretical CDF. @param {number[]} sample @param {(x: number) => number} cdf */
export function ksTestOneSample(sample, cdf) {
  if (!sample || sample.length < 5) return null;
  const n = sample.length;
  const sorted = [...sample].sort((a, b) => a - b);
  let D = 0;
  for (let i = 0; i < n; i++) {
    const ecdf = (i + 1) / n;
    const ecdfLow = i / n;
    const tcdf = cdf(sorted[i]);
    D = Math.max(D, Math.abs(ecdf - tcdf), Math.abs(ecdfLow - tcdf));
  }
  // Stephens (1970) finite-sample correction to the asymptotic Kolmogorov statistic.
  const sqrtN = Math.sqrt(n);
  const lambda = (sqrtN + 0.12 + 0.11 / sqrtN) * D;
  const p = _ksProb(lambda);
  return {
    test: "Kolmogorov-Smirnov (one-sample)",
    D: +D.toFixed(6),
    n,
    p: +p.toFixed(6),
    apa: `KS one-sample D = ${D.toFixed(4)}, ${fmtP(p)}, n = ${n}`,
  };
}

/** Two-sample Kolmogorov–Smirnov test. @param {number[]} a @param {number[]} b */
export function ksTestTwoSample(a, b) {
  if (!a || !b || a.length < 5 || b.length < 5) return null;
  const combined = [...a, ...b].sort((c, d) => c - d);
  let D = 0;
  const na = a.length, nb = b.length;
  for (let i = 0; i < combined.length; i++) {
    const val = combined[i];
    const cdfA = a.filter(x => x <= val).length / na;
    const cdfB = b.filter(x => x <= val).length / nb;
    D = Math.max(D, Math.abs(cdfA - cdfB));
  }
  const en = Math.sqrt((na * nb) / (na + nb));
  const lambda = (en + 0.12 + 0.11 / en) * D;
  const p = _ksProb(lambda);
  return {
    test: "Kolmogorov-Smirnov (two-sample)",
    D: +D.toFixed(6),
    na, nb,
    p: +p.toFixed(6),
    apa: `KS two-sample D = ${D.toFixed(4)}, ${fmtP(p)}, n₁ = ${na}, n₂ = ${nb}`,
  };
}

/** Two-group permutation test of an arbitrary statistic. @param {number[]} a @param {number[]} b @param {(a: number[], b: number[]) => number} statisticFn @param {{nPerms?: number}} [options] */
export function permutationTest(a, b, statisticFn, { nPerms = 9999 } = {}) {
  if (!a || !b || a.length < 3 || b.length < 3) return null;
  const seed = 42;
  const rng = mulberry32(seed);
  const observed = statisticFn(a, b);
  const pooled = [...a, ...b];
  const na = a.length;
  let nExtreme = 1;
  for (let p = 0; p < nPerms; p++) {
    const shuffled = [...pooled];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const permA = shuffled.slice(0, na);
    const permB = shuffled.slice(na);
    const permStat = statisticFn(permA, permB);
    if (Math.abs(permStat) >= Math.abs(observed)) nExtreme++;
  }
  const pVal = nExtreme / (nPerms + 1);
  return {
    test: "Permutation Test",
    observedStat: +observed.toFixed(6),
    nPerms,
    p: +pVal.toFixed(6),
    apa: `Permutation test: observed = ${observed.toFixed(4)}, ${fmtP(pVal)}, B = ${nPerms}`,
  };
}

/** Wald–Wolfowitz runs test on a binary sequence. @param {Array<number|boolean>} binarySeq */
export function runsTestWaldWolfowitz(binarySeq) {
  if (!binarySeq || binarySeq.length < 10) return null;
  const n = binarySeq.length;
  const n1 = binarySeq.filter(v => v === 1 || v === true).length;
  const n2 = n - n1;
  if (n1 < 2 || n2 < 2) return null;
  let runs = 1;
  for (let i = 1; i < n; i++) {
    if (binarySeq[i] !== binarySeq[i - 1]) runs++;
  }
  const muR = 1 + (2 * n1 * n2) / n;
  const sigmaR = Math.sqrt((2 * n1 * n2 * (2 * n1 * n2 - n)) / (n * n * (n - 1)));
  const z = (runs - muR) / sigmaR;
  const p = 2 * (1 - normalCDF(Math.abs(z)));
  return {
    test: "Wald-Wolfowitz Runs Test",
    nRuns: runs,
    n, n1, n2,
    z: +z.toFixed(4),
    p,
    apa: `Runs test: ${runs} runs, z = ${z.toFixed(2)}, ${fmtP(p)}`,
  };
}

/** Runs test above/below the median. @param {number[]} continuousSeq */
export function runsTestAboveBelowMedian(continuousSeq) {
  if (!continuousSeq || continuousSeq.length < 10) return null;
  const med = continuousSeq.slice().sort((a, b) => a - b)[Math.floor(continuousSeq.length / 2)];
  const binary = continuousSeq.map(v => v > med ? 1 : 0);
  const result = runsTestWaldWolfowitz(binary);
  if (!result) return null;
  return { ...result, test: "Runs Test (above/below median)", median: med };
}

/** Mann–Whitney U test (tie-corrected normal approximation). @param {number[]} a @param {number[]} b */
export function mannWhitney(a, b) {
  if (a.length < 2 || b.length < 2) return null;
  const na = a.length, nb = b.length, N = na + nb;
  let u1 = 0;
  a.forEach(x => b.forEach(y => { if (x > y) u1++; else if (x === y) u1 += .5; }));
  const u2 = na * nb - u1, u = Math.min(u1, u2);
  // Tie correction for the normal-approximation variance (values tied *across* the
  // combined sample — including ties between a and b — reduce the variance of U
  // relative to the no-ties formula). Without this, z is understated whenever
  // values repeat between groups. Matches scipy.stats.mannwhitneyu(method=
  // 'asymptotic', use_continuity=False).
  const combined = [...a, ...b].slice().sort((p, q) => p - q);
  let tieSum = 0, i = 0;
  while (i < N) {
    let j = i;
    while (j < N && combined[j] === combined[i]) j++;
    const t = j - i;
    if (t > 1) tieSum += t ** 3 - t;
    i = j;
  }
  const variance = (na * nb / 12) * ((N + 1) - tieSum / (N * (N - 1)));
  const z = variance > 0 ? (u - na * nb / 2) / Math.sqrt(variance) : 0;
  const p = 2 * (1 - normalCDF(Math.abs(z)));
  const rb = u1 / (na * nb), cd = 2 * rb - 1;
  return {
    test: "Mann-Whitney U", u: +u.toFixed(1), u1: +u1.toFixed(1), u2: +u2.toFixed(1),
    z: +z.toFixed(4), p, rb: +rb.toFixed(4), cliffsDelta: +cd.toFixed(4), effR: effR(rb), na, nb,
    apa: `U = ${u.toFixed(0)}, z = ${z.toFixed(2)}, ${fmtP(p)}, r = ${rb.toFixed(3)} [${effR(rb)}]`,
  };
}

/** Wilcoxon signed-rank test (paired if b given, else one-sample). @param {number[]} a @param {number[]|null} [b=null] */
export function wilcoxonSR(a, b = null) {
  const diffs = b ? a.map((v, i) => v - (b[i] ?? 0)) : a;
  const nonzero = diffs.filter(d => d !== 0), n = nonzero.length;
  if (n < 5) return null;
  const absD = nonzero.map(Math.abs), r = rank(absD);
  let wPlus = 0, wMinus = 0;
  nonzero.forEach((d, i) => { if (d > 0) wPlus += r[i]; else wMinus += r[i]; });
  const W = Math.min(wPlus, wMinus);
  const muW = n * (n + 1) / 4;
  // Tie correction for the normal-approximation variance (values of |diff| that tie
  // reduce Var(W) relative to the no-ties formula). Without this, z is understated
  // whenever |diff| repeats — verified against scipy.stats.wilcoxon(method='approx',
  // correction=False).
  const sortedAbs = [...absD].sort((p, q) => p - q);
  let tieSum = 0, i = 0;
  while (i < n) {
    let j = i;
    while (j < n && sortedAbs[j] === sortedAbs[i]) j++;
    const t = j - i;
    if (t > 1) tieSum += t ** 3 - t;
    i = j;
  }
  const varW = n * (n + 1) * (2 * n + 1) / 24 - tieSum / 48;
  const sigW = Math.sqrt(Math.max(varW, 0));
  const z = sigW > 0 ? (W - muW) / sigW : 0;
  const p = 2 * (1 - normalCDF(Math.abs(z)));
  const rEff = Math.abs(z) / Math.sqrt(n);
  return {
    test: "Wilcoxon Signed-Rank", W: +W.toFixed(1), wPlus: +wPlus.toFixed(1), wMinus: +wMinus.toFixed(1),
    z: +z.toFixed(4), p, r: +rEff.toFixed(4), effR: effR(rEff), n,
    apa: `W = ${W.toFixed(0)}, z = ${z.toFixed(2)}, ${fmtP(p)}, r = ${rEff.toFixed(3)} [${effR(rEff)}]`,
  };
}

// ── Kernel Density Estimation ───────────────────────────────────────────────
function gaussKernel(z) {
  return Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
}

// ── Kernel Density Estimation ─────────────────────────────────────

/** Gaussian kernel density estimate. @param {number[]} vals @param {number|null} [bandwidth=null] Silverman's rule if null. @param {number} [nPoints=100] */
export function kde(vals, bandwidth = null, nPoints = 100) {
  if (!vals || vals.length < 3) return null;
  const n = vals.length;
  const sorted = [...vals].sort((a, b) => a - b);
  const h = bandwidth || 1.06 * Math.sqrt(sampleVar(sorted)) * Math.pow(n, -0.2);
  if (h <= 0) return null;

  const lo = sorted[0] - 3 * h;
  const hi = sorted[n - 1] + 3 * h;
  const step = (hi - lo) / (nPoints - 1);
  const pts = [];
  for (let i = 0; i < nPoints; i++) {
    const x = lo + i * step;
    let density = 0;
    for (const v of vals) density += gaussKernel((x - v) / h);
    density /= (n * h);
    pts.push({ x: +x.toFixed(4), density: +density.toFixed(6) });
  }
  const maxIdx = pts.findIndex(p => p.density === Math.max(...pts.map(p => p.density)));
  return {
    test: 'Kernel Density Estimation',
    bandwidth: +h.toFixed(4),
    n,
    curve: pts,
    mode: pts[maxIdx]?.x ?? null,
    apa: `KDE: bandwidth = ${h.toFixed(3)}, n = ${n}, mode ≈ ${(pts[maxIdx]?.x ?? 0).toFixed(2)}`,
  };
}

// ── Nadaraya-Watson kernel regression ────────────────────────────────────────
/** Nadaraya–Watson kernel regression. @param {number[]} xs @param {number[]} ys @param {number|null} [bandwidth=null] @param {number[]|null} [xEval=null] */
export function nadarayaWatson(xs, ys, bandwidth = null, xEval = null) {
  if (!xs || !ys || xs.length !== ys.length || xs.length < 5) return null;
  const n = xs.length;
  const h = bandwidth || 1.06 * Math.sqrt(sampleVar(xs)) * Math.pow(n, -0.2);
  if (h <= 0) return null;

  const evalPts = xEval || Array.from({ length: 40 }, (_, i) => {
    const lo = Math.min(...xs);
    const hi = Math.max(...xs);
    return lo + (i / 39) * (hi - lo);
  });
  const nEval = evalPts.length;
  const fitted = [];
  for (let i = 0; i < nEval; i++) {
    const x0 = evalPts[i];
    let num = 0, den = 0;
    for (let j = 0; j < n; j++) {
      const w = gaussKernel((x0 - xs[j]) / h);
      num += w * ys[j];
      den += w;
    }
    fitted.push({ x: +x0.toFixed(4), yHat: +(den ? num / den : 0).toFixed(6) });
  }

  const inSample = xs.map((xi, i) => {
    let num = 0, den = 0;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const w = gaussKernel((xi - xs[j]) / h);
      num += w * ys[j];
      den += w;
    }
    const yHat = den ? num / den : 0;
    return { residual: ys[i] - yHat };
  });
  const rss = inSample.reduce((s, v) => s + v.residual * v.residual, 0);
  const tss = ys.reduce((s, y) => s + (y - avg(ys)) ** 2, 0);
  const rSquared = tss > 0 ? 1 - rss / tss : 0;

  return {
    test: 'Nadaraya-Watson Kernel Regression',
    bandwidth: +h.toFixed(4),
    n,
    fitted,
    rSquared: +Math.max(0, Math.min(1, rSquared)).toFixed(4),
    apa: `Kernel regression: h = ${h.toFixed(3)}, R\u00B2 \u2248 ${rSquared.toFixed(3)}, n = ${n}`,
  };
}

// Mood's Median Test
/** Mood's median test. @param {number[][]} groups */
export function moodsMedian(groups) {
  if (!groups || groups.length < 2) return null;
  const valid = groups.filter(g => g.vals && g.vals.length >= 3);
  if (valid.length < 2) return null;
  const all = valid.flatMap(g => g.vals).sort((a, b) => a - b);
  const median = all.length % 2 === 0 ? (all[all.length / 2 - 1] + all[all.length / 2]) / 2 : all[Math.floor(all.length / 2)];

  const table = valid.map(g => {
    const above = g.vals.filter(v => v > median).length;
    const below = g.vals.length - above;
    return { group: g.name, above, below };
  });

  let chi2 = 0;
  const nTotal = all.length;
  const pAbove = table.reduce((s, t) => s + t.above, 0) / nTotal;
  for (const t of table) {
    const eAbove = t.above + t.below > 0 ? (t.above + t.below) * pAbove : 0;
    const eBelow = t.above + t.below - eAbove;
    if (eAbove > 0) chi2 += (t.above - eAbove) ** 2 / eAbove;
    if (eBelow > 0) chi2 += (t.below - eBelow) ** 2 / eBelow;
  }
  const df = valid.length - 1;
  const p = chiPVal(Math.max(0, chi2), Math.max(1, df));

  return {
    test: "Mood's Median Test",
    chi2: +chi2.toFixed(4), df, p, median: +median.toFixed(4),
    table,
    n: nTotal,
    apa: `Mood's median: chi2(${df}) = ${chi2.toFixed(2)}, ${p < 0.05 ? 'significant' : 'n.s.'}, median = ${median.toFixed(2)}`,
  };
}

// ── Jonckheere-Terpstra Test ──────────────────────────────────────
/** Jonckheere–Terpstra trend test for ordered groups. @param {number[][]} groups */
export function jonckheereTerpstra(groups) {
  if (!groups || groups.length < 3) return null;
  const valid = groups.filter(g => g.vals && g.vals.length >= 2);
  if (valid.length < 3) return null;
  const k = valid.length;
  const allN = valid.map(g => g.vals.length);
  const N = allN.reduce((s, n) => s + n, 0);

  let J = 0;
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      for (const a of valid[i].vals) {
        for (const b of valid[j].vals) {
          if (b > a) J++;
          else if (b < a) J--;
          // tie: J += 0
        }
      }
    }
  }

  const sumN2 = allN.reduce((s, n) => s + n * n, 0);
  const EJ = (N * N - sumN2) / 4;
  const sumN3 = allN.reduce((s, n) => s + n * n * n, 0);
  const varJ = (N * N * (2 * N + 3) - sumN2 * (2 * N + 3) + sumN3) / 72;

  const z = varJ > 0 ? (J - EJ) / Math.sqrt(varJ) : 0;
  const direction = J > EJ ? 'increasing' : 'decreasing';
  const p = 2 * (1 - normalCDF(Math.abs(z)));

  return {
    test: 'Jonckheere-Terpstra',
    J: +J.toFixed(1), z: +z.toFixed(4), p, direction,
    n: N,
    apa: `JT: J = ${J.toFixed(0)}, z = ${z.toFixed(2)}, ${direction} trend, ${p < 0.05 ? 'significant' : 'n.s.'}`,
  };
}

// ── Siegel-Tukey Test ─────────────────────────────────────────────
/** Siegel–Tukey test for scale differences. @param {number[]} a @param {number[]} b */
export function siegelTukey(a, b) {
  if (!a || !b || a.length < 5 || b.length < 5) return null;
  const n1 = a.length, n2 = b.length;
  const N = n1 + n2;
  const combined = [...a.map(v => ({ v, g: 0 })), ...b.map(v => ({ v, g: 1 }))].sort((x, y) => x.v - y.v);

  const ranks = Array(N).fill(0);
  let left = 0, right = N - 1, rk = 1;
  while (left <= right) {
    if (rk % 2 === 1) { ranks[left] = rk; left++; }
    else { ranks[right] = rk; right--; }
    rk++;
    if (rk % 2 === 1) { ranks[left] = rk; left++; }
    else { ranks[right] = rk; right--; }
    rk++;
  }

  // Re-apply ranks in sorted order
  // Assign ranks from extremes: 1, N, 2, N-1, 3, N-2, ...
  let L = 0, R = N - 1, count = 1;
  const assignedRanks = Array(N).fill(0);
  while (L <= R) {
    assignedRanks[L] = count++;
    if (L < R) { assignedRanks[R] = count++; R--; }
    L++;
  }

  let R1 = 0;
  for (let i = 0; i < N; i++) {
    if (combined[i].g === 0) R1 += assignedRanks[i];
  }

  const E = n1 * (N + 1) / 2;
  const V = n1 * n2 * (N + 1) / 12;
  const z = V > 0 ? (R1 - E) / Math.sqrt(V) : 0;
  const p = 2 * (1 - normalCDF(Math.abs(z)));

  return {
    test: 'Siegel-Tukey',
    R: +R1.toFixed(1), z: +z.toFixed(4), p, n1, n2,
    apa: `Siegel-Tukey: R1 = ${R1.toFixed(0)}, z = ${z.toFixed(2)}, ${p < 0.05 ? 'significant scale difference' : 'n.s.'}`,
  };
}

// ── LOESS Smoother ────────────────────────────────────────────────
/** LOESS locally weighted smoother. @param {number[]} x @param {number[]} y @param {{span?: number, degree?: number, iterations?: number}} [options] */
export function loessSmoother(x, y, { span = 0.5, degree = 1, iterations = 2 } = {}) {
  if (!x || !y || x.length < 5 || x.length !== y.length) return null;
  const n = x.length;
  const fitted = Array(n).fill(0);
  let resid = [...y];
  for (let iter = 0; iter <= iterations; iter++) {
    for (let i = 0; i < n; i++) {
      const dists = x.map((xi, j) => ({ j, d: Math.abs(xi - x[i]) })).sort((a, b) => a.d - b.d);
      const k = Math.max(3, Math.floor(span * n));
      const nearest = dists.slice(0, k);
      const maxD = nearest[nearest.length - 1].d || 1;
      const w = nearest.map(nr => Math.pow(1 - Math.pow(nr.d / maxD, 3), 3));
      let sx = 0, sy = 0, sxx = 0, sxy = 0;
      for (let j = 0; j < nearest.length; j++) {
        const xi2 = x[nearest[j].j], yi = resid[nearest[j].j], wi = w[j];
        sx += wi * xi2; sy += wi * yi; sxx += wi * xi2 * xi2; sxy += wi * xi2 * yi;
      }
      const denom = k * sxx - sx * sx;
      const b1 = denom ? (k * sxy - sx * sy) / denom : 0;
      const b0 = denom ? (sxx * sy - sx * sxy) / denom : 0;
      fitted[i] = b0 + b1 * x[i];
    }
    if (iter < iterations) resid = y.map((yi, i) => yi - fitted[i]);
  }
  return { test: 'LOESS', fitted: fitted.map(v => +v.toFixed(4)).slice(0, 15), span, degree, n, apa: `LOESS: span = ${span}, n = ${n}` };
}

// ── Local Polynomial ──────────────────────────────────────────────
/** Local polynomial regression. @param {number[]} x @param {number[]} y @param {{degree?: number, bandwidth?: number|null}} [options] */
export function localPolynomial(x, y, { degree = 2, bandwidth = null } = {}) {
  if (!x || !y || x.length < 5 || x.length !== y.length) return null;
  const n = x.length;
  const h = bandwidth || (Math.max(...x) - Math.min(...x)) * 0.3;
  const fitted = x.map(xi => {
    const w = x.map(xj => Math.exp(-0.5 * ((xj - xi) / h) ** 2));
    let sumW = w.reduce((s, v) => s + v, 0);
    let pred = 0;
    for (let j = 0; j < n; j++) pred += w[j] * y[j] / sumW;
    return +pred.toFixed(4);
  });
  return { test: 'Local Polynomial', fitted: fitted.slice(0, 15), bandwidth: +h.toFixed(4), degree, n, apa: `Local poly: deg=${degree}, h = ${h.toFixed(2)}` };
}

// ── GCV Bandwidth Selection ───────────────────────────────────────
/** Generalized cross-validation bandwidth selection. @param {number[]} x @param {number[]} y @param {{degree?: number, bandwidths?: number[]|null}} [options] */
export function gcvBandwidth(x, y, { degree = 2, bandwidths = null } = {}) {
  if (!x || !y || x.length < 5) return null;
  const cand = bandwidths || [0.1, 0.2, 0.3, 0.5, 0.8, 1.0, 1.5, 2.0];
  let bestGCV = Infinity, bestH = cand[0];
  const n = x.length;
  for (const h of cand) {
    let sse = 0, tr = 0;
    for (let i = 0; i < n; i++) {
      const w = x.map(xj => Math.exp(-0.5 * ((xj - x[i]) / (h + 0.01)) ** 2));
      const sumW = w.reduce((s, v) => s + v, 0) || 1;
      const pred = w.reduce((s, v, j) => s + v * y[j], 0) / sumW;
      sse += (y[i] - pred) ** 2;
      tr += 1 / sumW;
    }
    const gcv = sse / (n * (1 - tr / n) ** 2);
    if (gcv < bestGCV) { bestGCV = gcv; bestH = h; }
  }
  return { test: 'GCV Bandwidth', bandwidth: +bestH.toFixed(4), gcv: +bestGCV.toFixed(4), n, apa: `GCV: h = ${bestH.toFixed(3)}` };
}

// ── LOESS Classification ──────────────────────────────────────────
/** LOESS-smoothed classification curve from rows. @param {Array<Record<string, number>>} data @param {string} yVar @param {string} xVar @param {{span?: number}} [options] */
export function loessClassification(data, yVar, xVar, { span = 0.5 } = {}) {
  if (!data || data.length < 10 || !yVar || !xVar) return null;
  const n = data.length;
  const x = data.map(r => +r[xVar]);
  const y = data.map(r => +r[yVar]);
  const fitted = loessSmoother(x, y, { span })?.fitted || [];
  const predicted = fitted.slice(0, x.length).map(v => v > 0.5 ? 1 : 0);
  return { test: 'LOESS Classification', predicted: predicted.slice(0, 15), span, n, apa: `LOESS class: span = ${span}, n = ${n}` };
}

// ── Local Likelihood ──────────────────────────────────────────────
/** Local likelihood regression. @param {number[]} x @param {number[]} y @param {{family?: string, bandwidth?: number|null}} [options] */
export function localLikelihood(x, y, { family = 'gaussian', bandwidth = null } = {}) {
  if (!x || !y || x.length < 10 || x.length !== y.length) return null;
  const n = x.length;
  const h = bandwidth || (Math.max(...x) - Math.min(...x)) * 0.3;
  const fitted = x.map(xi => {
    const w = x.map(xj => Math.exp(-0.5 * ((xj - xi) / h) ** 2));
    const sumW = w.reduce((s, v) => s + v, 0);
    const pred = family === 'binomial' ? (() => {
      const wSum = w.reduce((s, v, j) => s + v * y[j], 0);
      return Math.max(0.001, Math.min(0.999, wSum / sumW));
    })() : w.reduce((s, v, j) => s + v * y[j], 0) / sumW;
    return +pred.toFixed(4);
  });
  return { test: 'Local Likelihood', fitted: fitted.slice(0, 15), family, bandwidth: +h.toFixed(4), n, apa: `Local likelihood: ${family}, h = ${h.toFixed(2)}` };
}

// ── Kernel Regression (Nadaraya-Watson) ───────────────────────────
/** Kernel regression with a fixed bandwidth. @param {number[]} x @param {number[]} y @param {number|null} [h=null] */
export function kernelRegression(x, y, h = null) {
  if (!x || !y || x.length < 10 || x.length !== y.length) return null;
  const n = x.length;
  const band = h || 1.06 * Math.sqrt(sampleVar(x)) * Math.pow(n, -0.2) || 0.5;
  const fitted = x.map((xi, i) => {
    let num = 0, den = 0;
    for (let j = 0; j < n; j++) {
      const u = (xi - x[j]) / band;
      const w = Math.exp(-0.5 * u * u);
      num += w * y[j];
      den += w;
    }
    return den > 0 ? +(num / den).toFixed(4) : 0;
  });
  const resid = y.map((yi, i) => yi - fitted[i]);
  const rmse = Math.sqrt(resid.reduce((s, r) => s + r * r, 0) / n);
  return { test: 'Kernel Regression', fitted: fitted.slice(0, 15), bandwidth: +band.toFixed(4), rmse: +rmse.toFixed(4), n, apa: `Kernel regression: h = ${band.toFixed(2)}, RMSE = ${rmse.toFixed(2)}` };
}

// ── Loess CV ──────────────────────────────────────────────────────
/** Cross-validation for LOESS bandwidths. @param {number[]} x @param {number[]} y @param {number[]|null} [bandwidths=null] */
export function loessCV(x, y, bandwidths = null) {
  if (!x || !y || x.length < 10 || x.length !== y.length) return null;
  const n = x.length;
  const candidates = bandwidths || [0.2, 0.3, 0.4, 0.5, 0.6, 0.7];
  let bestH = candidates[0], bestCV = Infinity;
  const results = candidates.map(h => {
    let cvScore = 0;
    for (let i = 0; i < n; i++) {
      const dists = x.map((xj, j) => ({ j, d: Math.abs(x[i] - xj) }));
      dists.sort((a, b) => a.d - b.d);
      const span = Math.max(3, Math.floor(n * h));
      const nearby = dists.slice(1, span + 1);
      const weights = nearby.map(nb => { const u = nb.d / Math.max(nearby[nearby.length-1].d, 1e-6); return u < 1 ? (1 - u**3)**3 : 0; });
      let num = 0, den = 0;
      nearby.forEach((nb, k) => { num += weights[k] * y[nb.j]; den += weights[k]; });
      const pred = den > 0 ? num / den : y[i];
      cvScore += (y[i] - pred) ** 2;
    }
    cvScore /= n;
    if (cvScore < bestCV) { bestCV = cvScore; bestH = h; }
    return { bandwidth: h, cvScore: +cvScore.toFixed(4) };
  });
  return { test: 'Loess CV', optimalBandwidth: +bestH.toFixed(4), optimalCV: +bestCV.toFixed(4), results, n, apa: `Loess CV: optimal h = ${bestH.toFixed(2)}, CV = ${bestCV.toFixed(2)}` };
}

// ── Isotonic Regression (PAVA) ────────────────────────────────────
/** Isotonic (monotone) regression via pool-adjacent-violators. @param {number[]} y */
export function isotonicRegression(y) {
  if (!y || y.length < 3) return null;
  const n = y.length;
  const fitted = [...y];
  const weights = Array(n).fill(1);
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 1; i < n; i++) {
      if (fitted[i] < fitted[i-1]) {
        const merged = (fitted[i] * weights[i] + fitted[i-1] * weights[i-1]) / (weights[i] + weights[i-1]);
        fitted[i] = merged; fitted[i-1] = merged;
        weights[i] += weights[i-1]; weights[i-1] = weights[i];
        changed = true;
      }
    }
  }
  const blocks = [];
  let blockStart = 0;
  for (let i = 1; i <= n; i++) {
    if (i === n || Math.abs(fitted[i] - fitted[i-1]) > 1e-8) {
      blocks.push({ from: blockStart, to: i - 1, value: +fitted[blockStart].toFixed(4) });
      blockStart = i;
    }
  }
  return { test: 'Isotonic Regression', fitted: fitted.slice(0, 15).map(v => +v.toFixed(4)), nBlocks: blocks.length, n, apa: `Isotonic: ${blocks.length} blocks, n=${n}` };
}
