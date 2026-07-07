import { avg, sampleVar, sampleSD, effEta, fmtP } from '../math/core.js';
import { tPVal, fPVal, chiPVal, tInv2 } from '../math/distributions.js';

// ── One-Way ANOVA + Tukey HSD ─────────────────────────────────────────────────
/** One-way (between-subjects) ANOVA. @param {Array<{vals: number[], name?: string}>} groups one array per group. */
export function oneWayANOVA(groups) {
  if (groups.length < 2) return null;
  const all = groups.flatMap(g => g.vals), N = all.length, k = groups.length;
  const gm = avg(all), gMeans = groups.map(g => avg(g.vals)), gSDs = groups.map(g => sampleSD(g.vals));
  const ssB = groups.reduce((s, g, i) => s + g.vals.length * (gMeans[i] - gm) ** 2, 0);
  const ssW = groups.reduce((s, g, i) => s + g.vals.reduce((a, v) => a + (v - gMeans[i]) ** 2, 0), 0);
  const dfB = k - 1, dfW = N - k;
  if (!dfW || !ssW) return null;
  const msB = ssB / dfB, msW = ssW / dfW, F = msB / msW;
  const eta2 = ssB / (ssB + ssW), omega2 = (ssB - dfB * msW) / (ssB + ssW + msW);
  const cohenF = eta2 < 1 - 1e-10 ? Math.sqrt(eta2 / (1 - eta2)) : null;
  const tukey = [];
  for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
    const diff = gMeans[i] - gMeans[j];
    const se = Math.sqrt(msW * (1 / groups[i].vals.length + 1 / groups[j].vals.length) / 2);
    const q = se ? Math.abs(diff) / se : 0;
    // Studentized range approximation accounting for k (number of groups)
    const pa = Math.min(1, Math.exp(-0.717 * q - 0.416 * q ** 2) * Math.min(1, k - 1));
    const d = diff / (Math.sqrt((sampleVar(groups[i].vals) + sampleVar(groups[j].vals)) / 2) || 1);
    tukey.push({ g1: groups[i].name, g2: groups[j].name, diff: +diff.toFixed(4), q: +q.toFixed(3), p: +pa.toFixed(3), pBon: +Math.min(1, pa * (k * (k - 1) / 2)).toFixed(3), sig: pa < .05, d: +d.toFixed(3) });
  }
  const p = fPVal(F, dfB, dfW);
  return {
    test: "One-Way ANOVA", F: +F.toFixed(4), dfB, dfW, p,
    eta2: +eta2.toFixed(4), omega2: +omega2.toFixed(4), cohenF: cohenF != null ? +cohenF.toFixed(4) : null, effEta: effEta(eta2),
    gMeans: gMeans.map((m, i) => ({ name: groups[i].name, mean: +m.toFixed(4), sd: +gSDs[i].toFixed(4), n: groups[i].vals.length })),
    tukey, msW: +msW.toFixed(4),
    apa: `F(${dfB},${dfW}) = ${F.toFixed(2)}, ${fmtP(p)}, η² = ${eta2.toFixed(3)} [${effEta(eta2)}], ω² = ${omega2.toFixed(3)}`,
  };
}

// ── Welch's ANOVA (robust to unequal variances) ───────────────────────────────
// Welch (1951): F* = [Σwᵢ(X̄ᵢ-X̄')²/(k-1)] / [1 + 2(k-2)/(k²-1)·S], df2 = (k²-1)/(3S),
// where S = Σ(1-wᵢ/W)²/(nᵢ-1). The previous code used a single `lam` term with
// coefficient 2/(k²-1) for BOTH the F-statistic's denominator inflation (missing
// the (k-2) factor) AND df2=3/lam (using coefficient 2 instead of 3) — for k=3 the
// missing (k-2)=1 factor is invisible so F still matched a real oracle, but df2 was
// wrong for every k, understating p by orders of magnitude. Verified against
// statsmodels.stats.oneway.anova_oneway(..., use_var='unequal') at k=2,3,4.
/** Welch's ANOVA (unequal variances). @param {Array<{vals: number[], name?: string}>} groups */
export function welchANOVA(groups) {
  const valid = groups.filter(g => g.vals.length >= 2);
  if (valid.length < 2) return null;
  const k = valid.length;
  const ws = valid.map(g => {
    const v = sampleVar(g.vals);
    return v > 1e-14 ? g.vals.length / v : 0;
  });
  const Ws = ws.reduce((s, w) => s + w, 0);
  if (!Ws || !ws.some(w => w > 0)) return null;
  const Xw = valid.reduce((s, g, i) => s + ws[i] * avg(g.vals), 0) / Ws;
  const F_num = valid.reduce((s, g, i) => s + ws[i] * (avg(g.vals) - Xw) ** 2, 0) / (k - 1);
  const S = valid.reduce((s, g, i) => s + (1 - ws[i] / Ws) ** 2 / (g.vals.length - 1), 0);
  if (!S || !Number.isFinite(S)) return null;
  const lamF = (2 * (k - 2) / (k ** 2 - 1)) * S;
  const df2 = (k ** 2 - 1) / (3 * S);
  const F_stat = F_num / (1 + lamF), p = fPVal(F_stat, k - 1, df2);
  return {
    test: "Welch's ANOVA", F: +F_stat.toFixed(4), df1: k - 1, df2: +df2.toFixed(1), p,
    gMeans: valid.map(g => ({ name: g.name, mean: +avg(g.vals).toFixed(4), sd: +sampleSD(g.vals).toFixed(4), n: g.vals.length })),
    apa: `Welch F(${k - 1},${df2.toFixed(1)}) = ${F_stat.toFixed(2)}, ${fmtP(p)}`,
  };
}

// ── Two-Way ANOVA ─────────────────────────────────────────────────────────────
/** Two-way factorial ANOVA from long-format rows. @param {Array<Record<string, any>>} data @param {string} factA factor-A column. @param {string} factB factor-B column. @param {string} resp response column. */
export function twoWayANOVA(data, factA, factB, resp) {
  const aLevs = [...new Set(data.map(r => r[factA]))].filter(v => v != null);
  const bLevs = [...new Set(data.map(r => r[factB]))].filter(v => v != null);
  if (aLevs.length < 2 || bLevs.length < 2) return null;
  const cells = aLevs.map(al => bLevs.map(bl => data.filter(r => r[factA] === al && r[factB] === bl).map(r => +r[resp]).filter(Number.isFinite)));
  const cellMeans = cells.map(row => row.map(avg));
  const rowMeans = cellMeans.map(row => avg(row));
  const colMeans = bLevs.map((_, j) => avg(cellMeans.map(row => row[j])));
  const N = cells.flat().reduce((s, c) => s + c.length, 0);
  const gm = avg(data.map(r => +r[resp]).filter(Number.isFinite));
  const n_per = cells.flat().map(c => c.length), an = avg(n_per);
  const ssA = bLevs.length * an * aLevs.reduce((s, _, i) => s + (rowMeans[i] - gm) ** 2, 0);
  const ssB = aLevs.length * an * bLevs.reduce((s, _, j) => s + (colMeans[j] - gm) ** 2, 0);
  const ssAB = an * aLevs.reduce((s, _, i) => s + bLevs.reduce((t, _, j) => t + (cellMeans[i][j] - rowMeans[i] - colMeans[j] + gm) ** 2, 0), 0);
  const ssW = cells.flat().reduce((s, c, ci) => s + c.reduce((a, v) => a + (v - avg(c || [0])) ** 2, 0), 0);
  const dfA = aLevs.length - 1, dfBf = bLevs.length - 1, dfAB = (aLevs.length - 1) * (bLevs.length - 1), dfW = N - aLevs.length * bLevs.length;
  if (dfW < 1) return null;
  const msA = ssA / dfA, msB = ssB / dfBf, msAB = ssAB / dfAB, msW = ssW / dfW;
  const FA = msA / msW, FB = msB / msW, FAB = msAB / msW;
  const pA = fPVal(FA, dfA, dfW), pB = fPVal(FB, dfBf, dfW), pAB = fPVal(FAB, dfAB, dfW);
  const tot = ssA + ssB + ssAB + ssW;
  if (!tot || tot < 1e-14 || !Number.isFinite(msW)) return null;
  return {
    test: "Two-Way ANOVA", FA: +FA.toFixed(4), FB: +FB.toFixed(4), FAB: +FAB.toFixed(4),
    dfA, dfB: dfBf, dfAB, dfW, pA, pB, pAB,
    eta2A: +(ssA / tot).toFixed(4), eta2B: +(ssB / tot).toFixed(4), eta2AB: +(ssAB / tot).toFixed(4),
    aLevs, bLevs, cellMeans, rowMeans, colMeans, factA, factB, resp,
    apa: `${factA}: F(${dfA},${dfW})=${FA.toFixed(2)}, ${fmtP(pA)}; ${factB}: F(${dfBf},${dfW})=${FB.toFixed(2)}, ${fmtP(pB)}; interaction: F(${dfAB},${dfW})=${FAB.toFixed(2)}, ${fmtP(pAB)}`,
  };
}

// ── ANCOVA ────────────────────────────────────────────────────────────────────
/** One-way ANCOVA with a single covariate. @param {Array<{vals: number[], name?: string}>} groups @param {number[][]} cov covariate values per group. */
export function ancova(groups, cov) {
  if (groups.length < 2) return null;
  const all = groups.flatMap((g, gi) => g.vals.map((v, i) => ({ y: v, x: cov[gi][i], g: gi }))).filter(r => Number.isFinite(r.x));
  const N = all.length, k = groups.length, xbar = avg(all.map(r => r.x));
  const W = groups.map((_, gi) => all.filter(r => r.g === gi));
  const ssxx = W.reduce((s, g) => { const mx = avg(g.map(r => r.x)); return s + g.reduce((a, r) => a + (r.x - mx) ** 2, 0); }, 0);
  const ssxy = W.reduce((s, g) => { const mx = avg(g.map(r => r.x)), my = avg(g.map(r => r.y)); return s + g.reduce((a, r) => a + (r.x - mx) * (r.y - my), 0); }, 0);
  const bw = ssxx ? ssxy / ssxx : 0;
  const adjMeans = groups.map((_, gi) => { const gm = avg(W[gi].map(r => r.y)), xm = avg(W[gi].map(r => r.x)); return gm - bw * (xm - xbar); });
  const gm_adj = avg(adjMeans);
  const ssB_adj = groups.reduce((s, g, i) => s + g.vals.length * (adjMeans[i] - gm_adj) ** 2, 0);
  const ssE = W.reduce((s, g) => { const my = avg(g.map(r => r.y)), mx = avg(g.map(r => r.x)), syy = g.reduce((a, r) => a + (r.y - my) ** 2, 0), sxx = g.reduce((a, r) => a + (r.x - mx) ** 2, 0), sxy2 = g.reduce((a, r) => a + (r.x - mx) * (r.y - my), 0); return s + syy - sxy2 ** 2 / (sxx || 1); }, 0);
  const dfB = k - 1, dfE = N - k - 1;
  if (dfE < 1) return null;
  const msB = ssB_adj / dfB, msE = ssE / dfE, F = msB / msE, p = fPVal(F, dfB, dfE), eta2 = ssB_adj / (ssB_adj + ssE);
  return {
    test: "ANCOVA", F: +F.toFixed(4), dfB, dfE, p, eta2: +eta2.toFixed(4), bWithin: +bw.toFixed(4),
    adjMeans: adjMeans.map((m, i) => ({ name: groups[i].name, adj: +m.toFixed(4), n: groups[i].vals.length })),
    apa: `ANCOVA: F(${dfB},${dfE}) = ${F.toFixed(2)}, ${fmtP(p)}, η² = ${eta2.toFixed(3)}`,
  };
}

// ── One-Way RM ANOVA (Greenhouse-Geisser) ────────────────────────────────────
/** One-way repeated-measures ANOVA. @param {number[][]} matrix subjects × conditions. */
export function rmANOVA(matrix) {
  if (!matrix?.length || !matrix[0]?.length) return null;
  const n = matrix.length, k = matrix[0].length;
  if (n < 2 || k < 2) return null;
  const gm = avg(matrix.flat()), colM = Array.from({ length: k }, (_, j) => avg(matrix.map(r => r[j]))), rowM = matrix.map(r => avg(r));
  const ssB = n * colM.reduce((s, m) => s + (m - gm) ** 2, 0);
  const ssS = k * rowM.reduce((s, m) => s + (m - gm) ** 2, 0);
  const ssT = matrix.flat().reduce((s, v) => s + (v - gm) ** 2, 0);
  const ssE = ssT - ssB - ssS;
  const dfB = k - 1, dfE = (n - 1) * (k - 1);
  if (dfE < 1) return null;
  const msB = ssB / dfB, msE = ssE / dfE, F = msB / msE, p = fPVal(F, dfB, dfE);
  const eta2 = ssB / (ssB + ssE), omega2 = (ssB - dfB * msE) / (ssT + msE);
  // Greenhouse-Geisser epsilon approximation
  const covM = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => {
    const xi = matrix.map((r, ri) => r[i] - rowM[ri]), xj = matrix.map((r, ri) => r[j] - rowM[ri]);
    return xi.reduce((s, x, idx) => s + x * xj[idx], 0) / (n - 1);
  }));
  const tr = covM.reduce((s, r, i) => s + r[i], 0);
  const trSq = covM.reduce((s, r) => s + r.reduce((a, v) => a + v ** 2, 0), 0);
  const ggEps = Math.max(1 / (k - 1), Math.min(1, tr ** 2 / ((k - 1) * trSq)));
  const pGG = fPVal(F, dfB * ggEps, dfE * ggEps);
  return {
    test: "One-Way RM ANOVA", F: +F.toFixed(4), dfBetween: dfB, dfError: dfE, p, pGG: +pGG.toFixed(5),
    ggEps: +ggEps.toFixed(4), eta2: +eta2.toFixed(4), omega2: +omega2.toFixed(4),
    colMeans: colM.map(m => +m.toFixed(4)), n, k,
    apa: `F(${dfB},${dfE}) = ${F.toFixed(2)}, ${fmtP(p)} [GG: ${fmtP(pGG)}, ε=${ggEps.toFixed(3)}], η² = ${eta2.toFixed(3)}`,
  };
}

// ── Friedman test ─────────────────────────────────────────────────────────────
import { rank } from '../math/core.js';
/** Friedman rank test for repeated measures. @param {number[][]} matrix subjects × conditions. */
export function friedman(matrix) {
  if (!matrix?.length || !matrix[0]?.length) return null;
  const n = matrix.length, k = matrix[0].length;
  if (n < 2 || k < 2) return null;
  const rowRanks = matrix.map(row => rank(row));
  const colSums = Array.from({ length: k }, (_, j) => rowRanks.reduce((s, r) => s + r[j], 0));
  const chi2 = (12 / (n * k * (k + 1))) * colSums.reduce((s, R) => s + (R - n * (k + 1) / 2) ** 2, 0);
  const df = k - 1, p = chiPVal(chi2, df), W_kendall = chi2 / (n * (k - 1));
  return {
    test: "Friedman Test", chi2: +chi2.toFixed(4), df, p, W_kendall: +W_kendall.toFixed(4),
    colRankMeans: colSums.map(R => +(R / n).toFixed(3)), n, k,
    apa: `χ²(${df}) = ${chi2.toFixed(2)}, ${fmtP(p)}, Kendall's W = ${W_kendall.toFixed(3)}`,
  };
}

// ── Kruskal-Wallis ────────────────────────────────────────────────────────────
/** Kruskal–Wallis rank test. @param {Array<{vals: number[], name?: string}>} groups */
export function kruskalWallis(groups) {
  if (groups.length < 2) return null;
  /** @type {Array<{v: number, gi: number, rank?: number}>} */ const all = groups.flatMap((g, gi) => g.vals.map(v => ({ v, gi }))).sort((a, b) => a.v - b.v);
  const N = all.length, k = groups.length;
  let i = 0;
  while (i < all.length) { let j = i; while (j < all.length && all[j].v === all[i].v) j++; const mr = (i + j + 1) / 2; for (let p = i; p < j; p++) all[p].rank = mr; i = j; }
  const H = (12 / (N * (N + 1))) * groups.reduce((s, g, gi) => {
    if (!g.vals.length) return s;
    const rs = all.filter(x => x.gi === gi).reduce((a, x) => a + x.rank, 0);
    return s + rs ** 2 / g.vals.length;
  }, 0) - 3 * (N + 1);
  const df = k - 1, p = chiPVal(H, df), eta2 = (H - k + 1) / (N - k);
  return {
    test: "Kruskal-Wallis", H: +H.toFixed(4), df, p, eta2: +eta2.toFixed(4), effEta: effEta(eta2), k, N,
    apa: `H(${df}) = ${H.toFixed(2)}, ${fmtP(p)}, η² = ${eta2.toFixed(3)}`,
  };
}

// ── Cochran's Q ───────────────────────────────────────────────────────────────
/** Cochran's Q test for k related binary samples. @param {number[][]} matrix subjects × conditions (0/1). */
export function cochranQ(matrix) {
  if (!matrix?.length || !matrix[0]?.length) return null;
  const n = matrix.length, k = matrix[0].length;
  if (n < 5 || k < 2) return null;
  const colSums = Array.from({ length: k }, (_, j) => matrix.reduce((s, r) => s + r[j], 0));
  const rowSums = matrix.map(r => r.reduce((s, v) => s + v, 0));
  const L = colSums.reduce((s, C) => s + C ** 2, 0), Lrow = rowSums.reduce((s, R) => s + R ** 2, 0), total = colSums.reduce((s, C) => s + C, 0);
  const denom = k * total - Lrow;
  if (!denom) return null;
  const Q = (k - 1) * (k * L - total ** 2) / denom, p = chiPVal(Q, k - 1);
  return {
    test: "Cochran's Q", Q: +Q.toFixed(4), df: k - 1, p,
    colProps: colSums.map(C => +(C / n).toFixed(4)), n, k,
    apa: `Q(${k - 1}) = ${Q.toFixed(2)}, ${fmtP(p)}`,
  };
}

// ── Hedges' g ─────────────────────────────────────────────────────────────────
/** Hedges' g (bias-corrected standardized mean difference). @param {number[]} a @param {number[]} b */
export function hedgesG(a, b) {
  if (!a || !b || a.length < 2 || b.length < 2) return null;
  const na = a.length, nb = b.length;
  if (na + nb < 5) return null;
  const ma = avg(a), mb = avg(b);
  const sa = sampleVar(a), sb = sampleVar(b);
  const pool = Math.sqrt(((na - 1) * sa + (nb - 1) * sb) / (na + nb - 2));
  if (!pool) return null;
  const d = (ma - mb) / pool;
  const g = d * (1 - 3 / (4 * (na + nb - 2) - 1));
  const se = Math.sqrt((na + nb) / (na * nb) + g * g / (2 * (na + nb)));
  const label = Math.abs(g) >= 0.8 ? 'large' : Math.abs(g) >= 0.5 ? 'medium' : Math.abs(g) >= 0.2 ? 'small' : 'negligible';
  return {
    test: "Hedges' g", g: +g.toFixed(4), d: +d.toFixed(4), se: +se.toFixed(4), label, n1: na, n2: nb,
    apa: `g = ${g.toFixed(3)}, 95% CI [${(g - 1.96 * se).toFixed(3)}, ${(g + 1.96 * se).toFixed(3)}], n₁ = ${na}, n₂ = ${nb}`,
  };
}

// ── Cohen's d ─────────────────────────────────────────────────────────────────
/** Cohen's d (pooled-SD standardized mean difference). @param {number[]} a @param {number[]} b */
export function cohensD(a, b) {
  if (!a || !b || a.length < 2 || b.length < 2) return null;
  const na = a.length, nb = b.length;
  const ma = avg(a), mb = avg(b);
  const sa = sampleVar(a), sb = sampleVar(b);
  const pool = Math.sqrt(((na - 1) * sa + (nb - 1) * sb) / (na + nb - 2));
  if (!pool) return null;
  const d = (ma - mb) / pool;
  const se = Math.sqrt((na + nb) / (na * nb) + d * d / (2 * (na + nb)));
  const ciLo = d - 1.96 * se, ciHi = d + 1.96 * se;
  const label = Math.abs(d) >= 0.8 ? 'large' : Math.abs(d) >= 0.5 ? 'medium' : Math.abs(d) >= 0.2 ? 'small' : 'negligible';
  return {
    test: "Cohen's d", d: +d.toFixed(4), se: +se.toFixed(4), ciLo: +ciLo.toFixed(4), ciHi: +ciHi.toFixed(4), label, n1: na, n2: nb,
    apa: `d = ${d.toFixed(3)}, 95% CI [${ciLo.toFixed(3)}, ${ciHi.toFixed(3)}], n₁ = ${na}, n₂ = ${nb}`,
  };
}

// ── Games-Howell post-hoc ─────────────────────────────────────────────────────
/** Games–Howell post-hoc test (unequal variances). @param {Array<{vals: number[], name?: string}>} groups @param {number} [alpha=0.05] */
export function gamesHowell(groups, alpha = 0.05) {
  if (!groups || groups.length < 2) return null;
  const valid = groups.filter(g => g.vals && g.vals.length >= 2);
  if (valid.length < 2) return null;
  const k = valid.length;
  const means = valid.map(g => avg(g.vals));
  const vars = valid.map(g => sampleVar(g.vals));
  const ns = valid.map(g => g.vals.length);
  const pairs = [];
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const diff = means[i] - means[j];
      const se = Math.sqrt(0.5 * (vars[i] / ns[i] + vars[j] / ns[j]));
      if (!se) continue;
      const q = Math.abs(diff) / se;
      const num = (vars[i] / ns[i] + vars[j] / ns[j]) ** 2;
      const den = (vars[i] / ns[i]) ** 2 / (ns[i] - 1) + (vars[j] / ns[j]) ** 2 / (ns[j] - 1);
      const df = den > 0 ? num / den : ns[i] + ns[j] - 2;
      const nComp = k * (k - 1) / 2;
      const tVal = q / Math.SQRT2;
      const pRaw = tPVal(tVal, df);
      const p = Math.min(1, pRaw * nComp);
      pairs.push({
        g1: valid[i].name, g2: valid[j].name,
        diff: +diff.toFixed(4), se: +se.toFixed(4), df: +df.toFixed(1), q: +q.toFixed(3),
        p, sig: p < alpha,
      });
    }
  }
  return {
    test: 'Games-Howell Post-Hoc',
    pairs, alpha, k,
    apa: `Games-Howell: ${pairs.filter(p => p.sig).length} of ${pairs.length} pairs significant at α = ${alpha}`,
  };
}

// ── Dunnett's Test ────────────────────────────────────────────────────────────
/** Dunnett's test vs a control group. @param {Array<{vals: number[], name?: string}>} groups @param {number} [controlIndex=0] @param {number} [alpha=0.05] */
export function dunnettTest(groups, controlIndex = 0, alpha = 0.05) {
  if (!groups || groups.length < 2) return null;
  const valid = groups.filter(g => g.vals && g.vals.length >= 2);
  if (valid.length < 2) return null;
  if (controlIndex < 0 || controlIndex >= valid.length) return null;
  const k = valid.length;
  const allVals = valid.flatMap(g => g.vals);
  const N = allVals.length;
  const gMeans = valid.map(g => avg(g.vals));
  const gNs = valid.map(g => g.vals.length);
  const gm = avg(allVals);
  const ssW = valid.reduce((s, g, i) => s + g.vals.reduce((a, v) => a + (v - gMeans[i]) ** 2, 0), 0);
  const dfE = N - k;
  if (dfE < 1) return null;
  const mse = ssW / dfE;
  const comparisons = [];
  const ctrlMean = gMeans[controlIndex];
  const ctrlN = gNs[controlIndex];
  for (let i = 0; i < k; i++) {
    if (i === controlIndex) continue;
    const diff = gMeans[i] - ctrlMean;
    const se = Math.sqrt(mse * (1 / gNs[i] + 1 / ctrlN));
    if (!se) continue;
    const t = diff / se;
    const pRaw = tPVal(t, dfE);
    const p = Math.min(1, pRaw * (k - 1));
    comparisons.push({ name: valid[i].name, diff: +diff.toFixed(4), se: +se.toFixed(4), t: +t.toFixed(4), df: dfE, p, sig: p < alpha });
  }
  return {
    test: "Dunnett's Test",
    control: valid[controlIndex].name, comparisons, mse: +mse.toFixed(4), dfError: dfE, alpha,
    apa: `Dunnett vs ${valid[controlIndex].name}: ${comparisons.filter(c => c.sig).length} of ${comparisons.length} significant, MSE = ${mse.toFixed(3)}, df = ${dfE}`,
  };
}

// ── Partial Eta-Squared ───────────────────────────────────────────────────────
/** Partial eta-squared. @param {number} ssEffect @param {number} ssError */
export function eta2Partial(ssEffect, ssError) {
  if (!(ssEffect >= 0) || !(ssError > 0)) return null;
  const total = ssEffect + ssError;
  if (!total) return null;
  const eta2p = ssEffect / total;
  const label = eta2p >= 0.14 ? 'large' : eta2p >= 0.06 ? 'medium' : eta2p >= 0.01 ? 'small' : 'negligible';
  return {
    test: 'Partial Eta-Squared',
    eta2p: +eta2p.toFixed(4), label,
    apa: `η²p = ${eta2p.toFixed(3)} [${label}]`,
  };
}

// ── Partial Omega-Squared ─────────────────────────────────────────────────────
/** Partial omega-squared. @param {number} msEffect @param {number} msError @param {number} dfEffect @param {number} dfError @param {number} N */
export function omega2Partial(msEffect, msError, dfEffect, dfError, N) {
  if (!(msEffect >= 0) || !(msError >= 0) || !(dfEffect > 0) || !(dfError > 0) || !(N > dfEffect)) return null;
  const num = dfEffect * (msEffect - msError);
  const den = dfEffect * msEffect + (N - dfEffect) * msError + msError;
  if (den <= 0) return null;
  const omega2p = num / den;
  return {
    test: 'Partial Omega-Squared',
    omega2p: +omega2p.toFixed(4),
    apa: `ω²p = ${omega2p.toFixed(3)}`,
  };
}
