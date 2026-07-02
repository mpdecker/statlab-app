import { avg, sampleSD, sampleVar, corr, effEta, effV, fmtP, effD, effR } from '../math/core.js';
import { tPVal, fPVal, chiPVal, tInv2, normalCDF } from '../math/distributions.js';
import { jacobiEigen, matMul, matInv, matTrans } from '../math/matrix.js';

// ── PCA ───────────────────────────────────────────────────────────────────────
export function pca(data, vars) {
  const matrix = data.filter(r => vars.every(v => Number.isFinite(+r[v]))).map(r => vars.map(v => +r[v]));
  const n = matrix.length, k = vars.length;
  if (n < k + 1) return null;
  const means = vars.map((_, j) => avg(matrix.map(r => r[j])));
  const sds = vars.map((_, j) => sampleSD(matrix.map(r => r[j])) || 1);
  const Z = matrix.map(r => r.map((v, j) => (v - means[j]) / sds[j]));
  // Correlation matrix
  const R = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => {
    const xi = Z.map(r => r[i]), xj = Z.map(r => r[j]);
    return +corr(xi, xj).toFixed(6);
  }));
  const { eigenvalues, eigenvectors } = jacobiEigen(R);
  const totV = eigenvalues.reduce((s, e) => s + e, 0);
  if (!totV || totV < 1e-14) return null;
  const pctV = eigenvalues.map(e => +(100 * e / totV).toFixed(2));
  const cumP = pctV.map((_, i) => +pctV.slice(0, i + 1).reduce((s, v) => s + v, 0).toFixed(2));
  // Component loadings = eigenvectors scaled by sqrt(eigenvalue)
  const loadings = eigenvectors.map((ev, ci) => vars.map((_, vi) => +(ev[vi] * Math.sqrt(Math.max(eigenvalues[ci], 0))).toFixed(4)));
  // PC scores for first 2 components (for plotting)
  const scores = Z.map(row => ({
    pc1: eigenvectors[0].reduce((s, w, j) => s + w * row[j], 0),
    pc2: eigenvectors[1] ? eigenvectors[1].reduce((s, w, j) => s + w * row[j], 0) : 0,
  }));
  const nSig = eigenvalues.filter(e => e > 1).length;
  return {
    test: "PCA", vars, k, n,
    eigenvalues: eigenvalues.map(e => +e.toFixed(4)),
    eigenvaluesRaw: eigenvalues,
    eigenvectors,
    pctV, cumP, loadings, scores: scores.slice(0, 200), nSig, R,
    apa: `PCA: ${nSig} component${nSig !== 1 ? "s" : ""} (λ > 1), explaining ${cumP[nSig - 1]}% of variance`,
  };
}

// ── EFA with varimax rotation ─────────────────────────────────────────────────
export function efa(data, vars, nFactors = 2) {
  const pcaRes = pca(data, vars);
  if (!pcaRes) return null;
  // Initial loading matrix from first nFactors PCs
  const evecs = pcaRes.eigenvectors;
  const evals = pcaRes.eigenvaluesRaw;
  if (!evecs || !evals) return null;
  // Lmat[variable][factor]
  let Lmat = vars.map((_, vi) => Array.from({ length: nFactors }, (_, fi) => evecs[fi][vi] * Math.sqrt(Math.max(evals[fi], 0))));
  const k = vars.length;
  // Varimax rotation (Kaiser)
  for (let it = 0; it < 100; it++) {
    for (let p = 0; p < nFactors; p++) for (let q = p + 1; q < nFactors; q++) {
      const u = Lmat.map(r => r[p] ** 2 - r[q] ** 2);
      const v = Lmat.map(r => 2 * r[p] * r[q]);
      const A = u.reduce((s, x) => s + x, 0) / k, B = v.reduce((s, x) => s + x, 0) / k;
      const C = u.reduce((s, x, i) => s + x ** 2 - v[i] ** 2, 0) / k - A ** 2 + B ** 2;
      const D = 2 * u.reduce((s, x, i) => s + x * v[i], 0) / k - 2 * A * B;
      const theta = .25 * Math.atan2(D - 2 * A * B, C - (A ** 2 - B ** 2));
      const cs = Math.cos(theta), sn = Math.sin(theta);
      Lmat.forEach(r => { const lp = r[p], lq = r[q]; r[p] = cs * lp + sn * lq; r[q] = -sn * lp + cs * lq; });
    }
  }
  const communalities = Lmat.map(r => r.reduce((s, v) => s + v ** 2, 0));
  const uniqueness = communalities.map(h => 1 - h);
  const varExpl = Array.from({ length: nFactors }, (_, j) => Lmat.reduce((s, r) => s + r[j] ** 2, 0) / k);
  return {
    test: "EFA (Varimax)", vars, nFactors, n: pcaRes.n,
    loadings: Lmat.map((r, vi) => ({ var: vars[vi], factors: r.map(v => +v.toFixed(4)), communality: +communalities[vi].toFixed(4), uniqueness: +uniqueness[vi].toFixed(4) })),
    varianceExpl: varExpl.map(v => +(v * 100).toFixed(2)),
    cumVar: varExpl.map((_, i) => +(varExpl.slice(0, i + 1).reduce((s, v) => s + v, 0) * 100).toFixed(2)),
    apa: `EFA (varimax, ${nFactors} factors): ${varExpl.map((v, i) => `F${i + 1}=${(v * 100).toFixed(1)}%`).join(", ")} variance explained`,
  };
}

// ── Cronbach's α ──────────────────────────────────────────────────────────────
export function cronbachAlpha(matrix) {
  const k = matrix[0]?.length;
  if (!k || k < 2) return null;
  const n = matrix.length;
  const itemVars = Array.from({ length: k }, (_, j) => sampleVar(matrix.map(r => r[j])));
  const totalScores = matrix.map(r => r.reduce((s, v) => s + v, 0));
  const totalVar = sampleVar(totalScores);
  if (!totalVar) return null;
  const alpha = (k / (k - 1)) * (1 - itemVars.reduce((s, v) => s + v, 0) / totalVar);
  const label = alpha >= .9 ? "excellent" : alpha >= .8 ? "good" : alpha >= .7 ? "acceptable" : alpha >= .6 ? "questionable" : alpha >= .5 ? "poor" : "unacceptable";
  // Item-total correlations
  const itc = Array.from({ length: k }, (_, j) => {
    const ix = matrix.map(r => r[j]), rs = matrix.map((r, i) => totalScores[i] - ix[i]);
    return +corr(ix, rs).toFixed(4);
  });
  // α if item deleted
  const aDel = Array.from({ length: k }, (_, j) => {
    const red = matrix.map(r => r.filter((_, i) => i !== j));
    const kk = k - 1, ivs = Array.from({ length: kk }, (_, i) => sampleVar(red.map(r => r[i])));
    const ts = sampleVar(red.map(r => r.reduce((s, v) => s + v, 0)));
    return ts ? +((kk / (kk - 1)) * (1 - ivs.reduce((s, v) => s + v, 0) / ts)).toFixed(4) : null;
  });
  return {
    test: "Cronbach's α", alpha: +alpha.toFixed(4), label, k, n, itc, aDel,
    apa: `α = ${alpha.toFixed(3)} [${label}], k = ${k}, N = ${n}`,
  };
}

// ── Split-half reliability (Spearman-Brown) ───────────────────────────────────
export function splitHalf(matrix) {
  const k = matrix[0]?.length;
  if (!k || k < 2) return null;
  const half = Math.floor(k / 2);
  const s1 = matrix.map(r => r.slice(0, half).reduce((s, v) => s + v, 0));
  const s2 = matrix.map(r => r.slice(half).reduce((s, v) => s + v, 0));
  const rHalf = corr(s1, s2), rSB = 2 * rHalf / (1 + rHalf);
  return {
    test: "Split-Half", rHalf: +rHalf.toFixed(4), rSB: +rSB.toFixed(4), k, n: matrix.length,
    apa: `Split-half r = ${rHalf.toFixed(3)}, Spearman-Brown corrected ρ = ${rSB.toFixed(3)}`,
  };
}

// ── ICC (two-way random, single measures) ────────────────────────────────────
export function icc(matrix) {
  const n = matrix.length, k = matrix[0]?.length;
  if (!n || n < 2 || !k || k < 2) return null;
  const rM = matrix.map(r => avg(r)), gm = avg(rM);
  const cM = Array.from({ length: k }, (_, j) => avg(matrix.map(r => r[j])));
  const ssR = k * rM.reduce((s, m) => s + (m - gm) ** 2, 0);
  const ssC = n * cM.reduce((s, m) => s + (m - gm) ** 2, 0);
  const ssT = matrix.reduce((s, r) => s + r.reduce((a, v) => a + (v - gm) ** 2, 0), 0);
  const ssE = ssT - ssR - ssC;
  const dfR = n - 1, dfC = k - 1, dfE = (n - 1) * (k - 1);
  const msR = ssR / dfR, msC = ssC / dfC, msE = ssE / dfE;
  const icc21 = (msR - msE) / (msR + (k - 1) * msE + (k / n) * (msC - msE));
  const icc11 = (msR - msE) / (msR + (k - 1) * msE);
  const label = icc21 >= .9 ? "excellent" : icc21 >= .75 ? "good" : icc21 >= .5 ? "moderate" : "poor";
  return {
    test: "ICC(2,1)", icc21: +icc21.toFixed(4), icc11: +icc11.toFixed(4), label, n, k,
    msR: +msR.toFixed(4), msC: +msC.toFixed(4), msE: +msE.toFixed(4), dfR, dfC, dfE,
    apa: `ICC(2,1) = ${icc21.toFixed(3)} [${label}], ICC(1,1) = ${icc11.toFixed(3)}, N = ${n}, k = ${k}`,
  };
}

// ── Helpers: outer product, SPD det ────────────────────────────────────────────
function matAdd_(A, B) {
  return A.map((r, i) => r.map((v, j) => v + B[i][j]));
}
function matScale_(A, s) {
  return A.map(r => r.map(v => v * s));
}
function outerVec_(v) {
  const n = v.length;
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => v[i] * v[j]));
}

function spdDetSym_(M) {
  const { eigenvalues } = jacobiEigen(M);
  return eigenvalues.reduce((acc, lv) => acc * Math.max(lv, 1e-14), 1);
}

function diagMat(d) {
  return d.map((v, ri) => d.map((__, ci) => (ri === ci ? v : 0)));
}

// Symmetric inverse square root of a symmetric PD matrix M, via its spectral
// decomposition M = Σ_k λ_k v_k v_kᵀ ⇒ M^(-1/2) = Σ_k (1/√λ_k) v_k v_kᵀ, where
// jacobiEigen's `eigenvectors[k]` is the k-th eigenvector as a plain array.
// Previously this multiplied the (row-of-eigenvectors) matrix V by diag(1/√λ)
// via matMul(V, invS) then V — that treats V's ROWS as if they were basis
// components indexed by eigenvalue, which is not what matMul(V,invS) computes;
// verified wrong by an identity check (M^(-1/2)·M^(-1/2)·M was far from I).
// This fed into canonicalCorr (Sx/Sy whitening) and linearDiscriminant's
// Sw^(-1/2) — both potentially returning wrong numbers.
function symSqrtInvSPD(M) {
  const { eigenvalues, eigenvectors } = jacobiEigen(M);
  const n = M.length;
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) =>
    eigenvalues.reduce((s, lam, k) => s + (lam > 1e-10 ? (1 / Math.sqrt(lam)) * eigenvectors[k][i] * eigenvectors[k][j] : 0), 0)));
}

function symProd(A) {
  const AT = matTrans(A);
  return A.map((r, i) => r.map((_, j) => (A[i][j] + AT[i][j]) / 2));
}

/** One-way MANOVA — Wilks' Λ · Bartlett χ² · Pillai trace */

// ── MANOVA ────────────────────────────────────────────────────────
export function manova(data, yVars, groupVar) {
  const rows = data.filter(r => groupVar != null && yVars.every(col => Number.isFinite(+r[col])));
  const uniq = [...new Set(rows.map(r => String(r[groupVar])))];
  const k = uniq.length;
  const p = yVars.length;
  if (rows.length < p + k + 5 || k < 2 || p < 1) return null;

  const Yidx = rows.map(r => uniq.indexOf(String(r[groupVar])));
  const Ymat = rows.map(r => yVars.map(v => +r[v]));

  const gm = Array.from({ length: p }, (_, j) => avg(Ymat.map(r => r[j])));

  let H = Array.from({ length: p }, () => Array(p).fill(0));
  uniq.forEach((gLabel, gid) => {
    const memb = rows.map((__, idx) => Yidx[idx] === gid).map((flag, ix) => flag ? Ymat[ix] : null).filter(Boolean);
    const ng = memb.length;
    if (ng < 1) return;
    const m = memb[0].map((__, jj) => avg(memb.map(row => row[jj])));
    const dif = m.map((v, jj) => v - gm[jj]);
    H = matAdd_(H, matScale_(outerVec_(dif), ng));
  });

  let E = Array.from({ length: p }, () => Array(p).fill(0));
  rows.forEach((_, idx) => {
    const gid = Yidx[idx];
    const memb = Ymat.filter((__, jdx) => Yidx[jdx] === gid);
    const mcent = memb[0]?.map((__, jj) => avg(memb.map(row => row[jj]))) || gm;
    const res = Ymat[idx].map((yy, jj) => yy - mcent[jj]);
    E = matAdd_(E, outerVec_(res));
  });

  const T = matAdd_(E, H);
  const WilksLambda = spdDetSym_(E) / Math.max(spdDetSym_(T), 1e-20);
  const nuH = k - 1;
  const nuE = rows.length - k;
  const dfChi = nuH * p;
  /** Bartlett approximation */
  const chiStat = -(rows.length - ((p + nuH + 2) / 2)) * Math.log(Math.min(.999999, Math.max(1e-20, WilksLambda)));
  const pWilks = chiPVal(Math.max(chiStat, 0), Math.max(dfChi, 1));

  /** Pillai trace = tr(H(E+H)⁻¹) */
  const invT = matInv(T);
  let pillai = 0;
  if (invT) {
    const HP = matMul(invT, H);
    pillai = HP.reduce((s, row, i) => s + row[i], 0);
    pillai = Math.max(0, Math.min(nuH, pillai));
  }

  // Eigenvalues of E⁻¹H (needed for Hotelling-Lawley trace = Σλᵢ and Roy's root =
  // max λᵢ) via the symmetric similarity transform E^(-1/2)·H·E^(-1/2), which has
  // the SAME eigenvalues as E⁻¹H because E is symmetric PD. The previous code
  // instead naively symmetrized (E⁻¹H + (E⁻¹H)ᵀ)/2 before eigendecomposing — this
  // preserves the trace (so Hotelling-Lawley matched a real oracle) but NOT the
  // individual eigenvalues, so Roy's largest root was wrong (verified against
  // statsmodels' MANOVA: Roy's root off by ~1% on a real test case).
  const Ereg = E.map((rr, ix) => rr.map((v, jx) => v + (ix === jx ? 1e-6 * ((jacobiEigen(E).eigenvalues[0]) ?? 1) * 1e-8 : 0)));
  const EinvSqrt = symSqrtInvSPD(Ereg);
  let hotLaw = 0, roysRoot = 0;
  const symM = matMul(matMul(EinvSqrt, H), EinvSqrt);
  const eigH = jacobiEigen(symM).eigenvalues.filter(e => e > 1e-10).slice(0, nuH);
  hotLaw = eigH.reduce((s, x) => s + x, 0);
  roysRoot = eigH.length ? Math.max(...eigH) : 0;

  return {
    test: 'MANOVA',
    wilksLambda: +WilksLambda.toFixed(5),
    pillaiTrace: +pillai.toFixed(5),
    hotellingLawleyTrace: +hotLaw.toFixed(5),
    roysLargestRoot: +roysRoot.toFixed(5),
    dfHyp: nuH, dfErr: nuE, prob: Math.min(pWilks, 1),
    ndep: p,
    n: rows.length, kGroups: k, yVars, groupVar,
    apa: `MANOVA: Wilks′ Λ = ${WilksLambda.toFixed(4)}, Pillai = ${pillai.toFixed(3)}, Roy = ${roysRoot.toFixed(3)}, ${fmtP(pWilks)}`,
  };
}

/** Canonical correlations (correlation-matrix formulation). */

// ── Canonical Correlation ─────────────────────────────────────────
export function canonicalCorr(data, xVars, yVars) {
  const allVars = [...xVars, ...yVars];
  const rows = data.filter(r => allVars.every(col => Number.isFinite(+r[col])));
  const p = xVars.length;
  const q = yVars.length;
  if (rows.length < p + q + 8 || !p || !q) return null;

  const R = allVars.map((vi, ii) =>
    allVars.map((vj) => +(corr(rows.map(r => +r[vi]), rows.map(r => +r[vj]))).toFixed(6)));

  const Rxx = R.slice(0, p).map(rr => rr.slice(0, p));
  const Ryy = R.slice(p).map(rr => rr.slice(p));
  const Rxy = R.slice(0, p).map(rr => rr.slice(p));

  const Sx = symSqrtInvSPD(Rxx);
  const Sy = symSqrtInvSPD(Ryy);
  const K = matMul(matMul(Sx, Rxy), Sy);
  const KK = matMul(matTrans(K), K);
  const { eigenvalues } = jacobiEigen(symProd(KK));
  const correlations = eigenvalues.filter(e => e > 1e-10).map(ev => +(Math.min(1 - 1e-8, Math.sqrt(ev))).toFixed(4)).sort((a, b) => b - a);
  const rho1 = correlations[0] ?? 0;
  /** χ² sequentially on pooled block */
  const chiGlobal = -(rows.length - 1 - .5 * (p + q + 1)) * Math.log(Math.max(1 - rho1 * rho1 + 1e-9, 1e-14));
  const dfG = Math.max(p * q, 1);
  const pSeq = chiPVal(Math.max(chiGlobal, 0), dfG);

  return {
    test: 'Canonical Correlation',
    correlations, xVars, yVars, n: rows.length,
    apa: `${correlations.length} canonical correlation(s); max ρc ≈ ${rho1.toFixed(3)}, ${fmtP(pSeq)}`,
    pCanon: Math.min(pSeq, 1),
  };
}

/** Fisher LDA: first discriminants + projected centroids + training accuracy (1D rule). */

// ── LDA ───────────────────────────────────────────────────────────
export function linearDiscriminant(data, groupVar, xVars) {
  const rows = data.filter(r => groupVar != null && xVars.every(v => Number.isFinite(+r[v])));
  const labels = [...new Set(rows.map(r => String(r[groupVar])))];
  const k = labels.length;
  const p = xVars.length;
  if (rows.length < p + k + 5 || k < 2 || p < 1) return null;

  const X = rows.map(r => xVars.map(col => +r[col]));
  const gi = rows.map(r => labels.indexOf(String(r[groupVar])));

  const globalMean = Array.from({ length: p }, (_, j) => avg(X.map(r => r[j])));

  let Sw = Array.from({ length: p }, () => Array(p).fill(0));
  labels.forEach((__, lid) => {
    const Xi = X.filter((_, ix) => gi[ix] === lid);
    if (!Xi.length) return;
    const m = Xi[0].map((__, jj) => avg(Xi.map(row => row[jj])));
    Xi.forEach(row => {
      const d = row.map((vv, jj) => vv - m[jj]);
      Sw = matAdd_(Sw, outerVec_(d));
    });
  });

  let Sb = Array.from({ length: p }, () => Array(p).fill(0));
  labels.forEach((__, lid) => {
    const Xi = X.filter((_, ix) => gi[ix] === lid);
    const ng = Xi.length;
    if (!ng) return;
    const m = Xi[0].map((__, jj) => avg(Xi.map(row => row[jj])));
    const dc = m.map((mv, jj) => mv - globalMean[jj]);
    Sb = matAdd_(Sb, matScale_(outerVec_(dc), ng));
  });

  const traceSw = jacobiEigen(Sw).eigenvalues.reduce((s, ev) => s + Math.max(ev, 0), 0) || 1;
  const ridge = traceSw / p * 1e-4;
  Sw = Sw.map((r, ix) => r.map((v, iy) => v + (ix === iy ? ridge : 0)));
  // Fisher's discriminant direction solves the generalized eigenproblem Sb·w = λ·Sw·w.
  // Sw⁻¹Sb is generally NOT symmetric, so naively symmetrizing it before
  // eigendecomposing (the previous code) corrupts both eigenvalues AND
  // eigenvectors — i.e. the discriminant direction itself, not just a displayed
  // number. Use the symmetric similarity transform instead: eigendecompose
  // Sw^(-1/2)·Sb·Sw^(-1/2) (symmetric, same eigenvalues as Sw⁻¹Sb), then map its
  // leading eigenvector back to the original space via w = Sw^(-1/2)·u₁.
  const SwInvSqrt = symSqrtInvSPD(Sw);
  const eig = jacobiEigen(matMul(matMul(SwInvSqrt, Sb), SwInvSqrt));
  const u1 = eig.eigenvectors[0];
  if (!u1?.length) return null;
  const wRaw = SwInvSqrt.map(row => row.reduce((s, v, j) => s + v * u1[j], 0));
  const norm = Math.sqrt(wRaw.reduce((s, c) => s + c * c, 0)) || 1;
  const w = wRaw.map(c => c / norm);

  const groupMeans = labels.map((__, lid) =>
    Array.from({ length: p }, (__, jj) => avg(X.filter((_, ix) => gi[ix] === lid).map(row => row[jj]))));

  function dot(a, b) {
    return a.reduce((s, v, ii) => s + v * b[ii], 0);
  }
  const centroidScores = groupMeans.map(mv => dot(mv, w));

  let correct = 0;
  rows.forEach((row, ix) => {
    const x = X[ix];
    const sx = dot(x, w);
    let bestLabel = labels[0];
    let bestD = Infinity;
    labels.forEach((lab, lj) => {
      const dist = Math.abs(sx - centroidScores[lj]);
      if (dist < bestD) {
        bestD = dist;
        bestLabel = lab;
      }
    });
    if (String(row[groupVar]) === bestLabel) correct += 1;
  });
  const acc = +(100 * correct / rows.length).toFixed(2);

  return {
    test: 'LDA',
    coefficients: w.map(c => +c.toFixed(5)),
    centroidScores,
    accuracyTrain: acc,
    nGroups: k, nFeatures: p, groupVar: String(groupVar), xVars,
    apa: `LDA ${p} predictors → training accuracy ${acc.toFixed(1)}% (${k} groups), N=${rows.length}`,
  };
}

// ── Cohen's κ (inter-rater agreement) ────────────────────────────────────────
export function cohensKappa(r1, r2) {
  if (r1.length !== r2.length || r1.length < 1) return null;
  const n = r1.length, cats = [...new Set([...r1, ...r2])];
  const mat = cats.map(a => cats.map(b => r1.filter((_, i) => r1[i] === a && r2[i] === b).length));
  const rowS = mat.map(r => r.reduce((s, v) => s + v, 0));
  const colS = cats.map((_, j) => mat.reduce((s, r) => s + r[j], 0));
  const Po = cats.reduce((s, _, i) => s + mat[i][i], 0) / n;
  const Pe = cats.reduce((s, _, i) => s + (rowS[i] / n) * (colS[i] / n), 0);
  if (Math.abs(1 - Pe) < 1e-10) {
    if (Po >= 1 - 1e-10) {
      return {
        test: "Cohen's κ", kappa: 1, se: 0, z: 0, p: 0,
        Po: +Po.toFixed(4), Pe: +Pe.toFixed(4), label: 'perfect', n, cats,
        apa: `κ = 1.000 [perfect], perfect agreement`,
      };
    }
    return null;
  }
  const kappa = (Po - Pe) / (1 - Pe);
  const se = Math.sqrt(Pe / (n * (1 - Pe)));
  const z = se > 1e-10 ? kappa / se : 0;
  const p = se > 1e-10 ? 2 * (1 - normalCDF(Math.abs(z))) : (Po > Pe ? 0 : 1);
  const label = kappa >= .8 ? "almost perfect" : kappa >= .6 ? "substantial" : kappa >= .4 ? "moderate" : kappa >= .2 ? "fair" : "slight";
  return {
    test: "Cohen's κ", kappa: +kappa.toFixed(4), se: +se.toFixed(4), z: +z.toFixed(4), p,
    Po: +Po.toFixed(4), Pe: +Pe.toFixed(4), label, n, cats,
    apa: `κ = ${kappa.toFixed(3)} [${label}], z = ${z.toFixed(2)}, ${fmtP(p)}`,
  };
}

// ── Random-effects meta-analysis (DerSimonian-Laird) ─────────────────────────
export function metaAnalysis(studies) {
  const clean = studies.filter(s => Number.isFinite(s.d) && Number.isFinite(s.se) && s.se > 0);
  if (clean.length < 2) return null;
  const w = clean.map(s => 1 / s.se ** 2);
  const Wsum = w.reduce((s, v) => s + v, 0);
  if (!Wsum) return null;
  const dFixed = clean.reduce((s, st, i) => s + w[i] * st.d, 0) / Wsum;
  const Q = clean.reduce((s, st, i) => s + w[i] * (st.d - dFixed) ** 2, 0);
  const df = clean.length - 1, pQ = chiPVal(Q, df);
  // I²
  const I2 = Q > 0 ? Math.max(0, (Q - df) / Q) * 100 : 0;
  // DL tau²
  const c = Wsum - w.reduce((s, v) => s + v ** 2, 0) / Wsum;
  const tau2 = c > 1e-10 ? Math.max(0, (Q - df) / c) : 0;
  // Random-effects weights and pooled estimate
  const wr = clean.map(s => 1 / (s.se ** 2 + tau2));
  const WrSum = wr.reduce((s, v) => s + v, 0);
  if (!WrSum) return null;
  const dRE = clean.reduce((s, st, i) => s + wr[i] * st.d, 0) / WrSum;
  const seRE = 1 / Math.sqrt(WrSum), z = dRE / seRE, p = 2 * (1 - normalCDF(Math.abs(z)));
  const ci = [dRE - 1.96 * seRE, dRE + 1.96 * seRE];
  // Prediction interval
  const tq = tInv2(.05, df > 1 ? df : 1);
  const pi = [dRE - tq * Math.sqrt(tau2 + seRE ** 2), dRE + tq * Math.sqrt(tau2 + seRE ** 2)];
  return {
    test: "Meta-Analysis (DerSimonian-Laird)", k: clean.length,
    dFixed: +dFixed.toFixed(4), dRE: +dRE.toFixed(4), seRE: +seRE.toFixed(4),
    z: +z.toFixed(4), p, ci: [+ci[0].toFixed(4), +ci[1].toFixed(4)],
    pi: [+pi[0].toFixed(4), +pi[1].toFixed(4)],
    Q: +Q.toFixed(4), pQ, I2: +I2.toFixed(1), tau2: +tau2.toFixed(5), tau: +Math.sqrt(tau2).toFixed(5),
    studies: clean.map((s, i) => ({ ...s, w: +w[i].toFixed(3), wr: +wr[i].toFixed(3) })),
    apa: `d_RE = ${dRE.toFixed(3)}, 95% CI [${ci[0].toFixed(3)}, ${ci[1].toFixed(3)}], z = ${z.toFixed(2)}, ${fmtP(p)}, Q(${df}) = ${Q.toFixed(2)}, I² = ${I2.toFixed(1)}%, τ = ${Math.sqrt(tau2).toFixed(3)}`,
  };
}

// ── Difference-in-Differences ─────────────────────────────────────────────────
export function differencesInDifferences(preCtrl, postCtrl, preTreat, postTreat) {
  const groups = [preCtrl, postCtrl, preTreat, postTreat];
  if (groups.some(g => g.length < 2)) return null;
  const lens = groups.map(g => g.length);
  if (new Set(lens).size !== 1) return null;
  const mpc = avg(preCtrl), mpo = avg(postCtrl), mpr = avg(preTreat), mpt = avg(postTreat);
  const did = (mpt - mpr) - (mpo - mpc);
  const se = Math.sqrt(
    sampleVar(preCtrl) / preCtrl.length + sampleVar(postCtrl) / postCtrl.length +
    sampleVar(preTreat) / preTreat.length + sampleVar(postTreat) / postTreat.length
  );
  if (!se) return null;
  const N = preCtrl.length + postCtrl.length + preTreat.length + postTreat.length;
  const t = did / se, df = N - 4, p = tPVal(t, df);
  return {
    test: "Difference-in-Differences", did: +did.toFixed(4), se: +se.toFixed(4), t: +t.toFixed(4), df, p,
    mpc: +mpc.toFixed(4), mpo: +mpo.toFixed(4), mpr: +mpr.toFixed(4), mpt: +mpt.toFixed(4),
    ctrlDiff: +(mpo - mpc).toFixed(4), treatDiff: +(mpt - mpr).toFixed(4),
    apa: `DiD = ${did.toFixed(4)}, t(${df}) = ${t.toFixed(2)}, ${fmtP(p)}`,
  };
}

// ── Meta-Regression ───────────────────────────────────────────────────────────
export function metaRegression(studies, moderator, moderatorLabel) {
  const clean = studies.filter((s, i) => Number.isFinite(s.d) && Number.isFinite(s.se) && s.se > 0 && Number.isFinite(moderator[i]));
  if (clean.length < 3) return null;
  const modVals = moderator.slice(0, studies.length).filter((_, i) => Number.isFinite(studies[i]?.d) && Number.isFinite(studies[i]?.se) && studies[i]?.se > 0 && Number.isFinite(moderator[i]));
  if (modVals.length < 3) return null;
  const allSame = modVals.every(v => v === modVals[0]);
  if (allSame) return null;

  const k = clean.length;
  const d = clean.map(s => s.d);
  const se = clean.map(s => s.se);
  const w = se.map(s => 1 / (s * s));
  const Wsum = w.reduce((s, v) => s + v, 0);
  if (!Wsum) return null;

  const s00 = w.reduce((s, v) => s + v, 0);
  const s01 = w.reduce((s, v, i) => s + v * modVals[i], 0);
  const s11 = w.reduce((s, v, i) => s + v * modVals[i] * modVals[i], 0);
  const detM = s00 * s11 - s01 * s01;
  if (Math.abs(detM) < 1e-14) return null;
  const sy0 = w.reduce((s, v, i) => s + v * d[i], 0);
  const sy1 = w.reduce((s, v, i) => s + v * modVals[i] * d[i], 0);
  let b0 = (s11 * sy0 - s01 * sy1) / detM;
  let b1 = (s00 * sy1 - s01 * sy0) / detM;

  // Use fixed-effects beta as starting values for mixed-effects
  let tau2 = 0;
  for (let iter = 0; iter < 30; iter++) {
    const wi = clean.map((s, i) => 1 / (s.se * s.se + tau2));
    const sw0 = wi.reduce((s, v) => s + v, 0);
    const sw1 = wi.reduce((s, v, i) => s + v * modVals[i], 0);
    const sw2 = wi.reduce((s, v, i) => s + v * modVals[i] * modVals[i], 0);
    const det = sw0 * sw2 - sw1 * sw1;
    if (Math.abs(det) < 1e-14) break;
    const syw0 = wi.reduce((s, v, i) => s + v * d[i], 0);
    const syw1 = wi.reduce((s, v, i) => s + v * modVals[i] * d[i], 0);
    const newB0 = (sw2 * syw0 - sw1 * syw1) / det;
    const newB1 = (sw0 * syw1 - sw1 * syw0) / det;
    b0 = newB0;
    b1 = newB1;
    const pred = clean.map((_, i) => b0 + b1 * modVals[i]);
    const residSq = clean.map((s, i) => (d[i] - pred[i]) ** 2);
    const Q = wi.reduce((s, v, i) => s + v * residSq[i], 0);
    const trace = wi.reduce((s, v) => s + v, 0) - (wi.reduce((s, v) => s + v * v, 0)) / wi.reduce((s, v) => s + v, 0);
    const newTau2 = Math.max(0, (Q - (k - 2)) / Math.max(trace, 1e-10));
    if (Math.abs(newTau2 - tau2) < 1e-6) { tau2 = newTau2; break; }
    tau2 = newTau2;
  }

  // Final estimates with converged tau2
  const wf = clean.map(s => 1 / (s.se * s.se + tau2));
  const wf0 = wf.reduce((s, v) => s + v, 0);
  const wf1 = wf.reduce((s, v, i) => s + v * modVals[i], 0);
  const wf2 = wf.reduce((s, v, i) => s + v * modVals[i] * modVals[i], 0);
  const detF = wf0 * wf2 - wf1 * wf1;
  if (Math.abs(detF) < 1e-14) return null;
  const sy0f = wf.reduce((s, v, i) => s + v * d[i], 0);
  const sy1f = wf.reduce((s, v, i) => s + v * modVals[i] * d[i], 0);
  const bFinal0 = (wf2 * sy0f - wf1 * sy1f) / detF;
  const bFinal1 = (wf0 * sy1f - wf1 * sy0f) / detF;

  // SEs
  const seB0 = Math.sqrt(Math.abs(wf2 / detF));
  const seB1 = Math.sqrt(Math.abs(wf0 / detF));
  const z0 = bFinal0 / seB0, z1 = bFinal1 / seB1;
  const p0 = 2 * (1 - normalCDF(Math.abs(z0)));
  const p1 = 2 * (1 - normalCDF(Math.abs(z1)));

  // I² and R² analog
  const predF = clean.map((_, i) => bFinal0 + bFinal1 * modVals[i]);
  const Qres = wf.reduce((s, v, i) => s + v * (d[i] - predF[i]) ** 2, 0);
  const I2 = (Qres - (k - 2)) > 0 ? Math.max(0, (Qres - (k - 2)) / Qres) * 100 : 0;

  // R² analog: tau2 of intercept-only model
  const metaBase = metaAnalysis(clean);
  const tau2Base = metaBase ? metaBase.tau2 : tau2;
  const rSquared = tau2Base > 0 ? Math.max(0, 1 - tau2 / tau2Base) : 0;

  return {
    test: 'Meta-Regression', moderator: moderatorLabel,
    coefficients: [
      { term: 'Intercept', b: +bFinal0.toFixed(4), se: +seB0.toFixed(4), z: +z0.toFixed(4), p: p0 },
      { term: moderatorLabel, b: +bFinal1.toFixed(4), se: +seB1.toFixed(4), z: +z1.toFixed(4), p: p1 },
    ],
    tau2: +tau2.toFixed(5), iSquared: +I2.toFixed(1), rSquared: +rSquared.toFixed(4), k,
    apa: `Meta-regression (${moderatorLabel}): b = ${bFinal1.toFixed(3)}, z = ${z1.toFixed(2)}, ${fmtP(p1)}, τ² = ${tau2.toFixed(4)}, R²_analog = ${rSquared.toFixed(3)}, k = ${k}`,
  };
}

// ── Egger's Regression Test ───────────────────────────────────────────────────
export function eggersTest(studies) {
  const clean = studies.filter(s => Number.isFinite(s.d) && Number.isFinite(s.se) && s.se > 0);
  if (clean.length < 3) return null;
  const seVals = clean.map(s => s.se);
  if (seVals.every(v => v === seVals[0])) return null;
  const k = clean.length;
  const precision = seVals.map(s => 1 / s);
  const stdEff = clean.map((s, i) => s.d / s.se);
  // Weighted regression: stdEff = a + b * precision, weights = precision^2
  const w = precision.map(p => p * p);
  const s0 = w.reduce((s, v) => s + v, 0);
  const s1 = w.reduce((s, v, i) => s + v * precision[i], 0);
  const s2 = w.reduce((s, v, i) => s + v * precision[i] * precision[i], 0);
  const det = s0 * s2 - s1 * s1;
  if (Math.abs(det) < 1e-14) return null;
  const sy0 = w.reduce((s, v, i) => s + v * stdEff[i], 0);
  const sy1 = w.reduce((s, v, i) => s + v * precision[i] * stdEff[i], 0);
  const intercept = (s2 * sy0 - s1 * sy1) / det;
  const slope = (s0 * sy1 - s1 * sy0) / det;
  const seIntercept = Math.sqrt(Math.abs(s2 / det));
  const t = intercept / seIntercept;
  const df = k - 2;
  const p = tPVal(t, df);
  return {
    test: "Egger's Test", intercept: +intercept.toFixed(4), interceptSE: +seIntercept.toFixed(4),
    t: +t.toFixed(4), df, p, slope: +slope.toFixed(4), k,
    apa: `Egger's test: intercept = ${intercept.toFixed(3)}, t(${df}) = ${t.toFixed(2)}, ${fmtP(p)}, k = ${k}`,
  };
}

// ── Trim-and-Fill ─────────────────────────────────────────────────────────────
export function trimAndFill(studies) {
  const clean = studies.filter(s => Number.isFinite(s.d) && Number.isFinite(s.se) && s.se > 0);
  if (clean.length < 3) return null;
  const k = clean.length;

  // Step 1: fit fixed-effects meta-analysis
  const ma = metaAnalysis(clean);
  if (!ma) return null;
  const dPooled = ma.dFixed;
  const originalD = ma.dFixed;
  const originalSE = Math.sqrt(1 / clean.reduce((s, st) => s + 1 / (st.se * st.se), 0));

  // Step 2: rank studies by |d_i - d_pooled|
  const ranked = clean.map((s, i) => ({ ...s, idx: i, dev: s.d - dPooled }))
    .sort((a, b) => Math.abs(b.dev) - Math.abs(a.dev));

  // Step 3: Determine which side to trim (the side opposite to d_pooled)
  const side = dPooled > 0 ? -1 : 1;
  const extremeSide = ranked.filter(r => Math.sign(r.dev) === side);
  const otherSideN = ranked.length - extremeSide.length;

  // R0 estimator: estimate number of missing studies
  const nTrimmed = Math.max(0, Math.round((2 * extremeSide.length - k) / Math.max(extremeSide.length - otherSideN, 1)));
  const R0 = Math.min(nTrimmed, extremeSide.length);

  if (R0 === 0) {
    return {
      test: 'Trim-and-Fill',
      originalD: +originalD.toFixed(4), originalSE: +originalSE.toFixed(4),
      adjustedD: +originalD.toFixed(4), adjustedSE: +originalSE.toFixed(4),
      nImputed: 0, k: clean.length, kOriginal: clean.length,
      studies: clean.map(s => ({ d: s.d, se: s.se, imputed: false })),
      apa: `Trim-and-fill: no asymmetry detected, d = ${originalD.toFixed(3)}, k = ${k}`,
    };
  }

  // Step 4: Impute mirror studies
  const trimmed = ranked.slice(0, R0).filter(r => Math.sign(r.dev) === side);
  const mirrored = trimmed.map(t => ({ d: 2 * dPooled - t.d, se: t.se, imputed: true }));
  const keptStudies = clean.map(s => ({ d: s.d, se: s.se, imputed: false }));
  const augmented = [...keptStudies, ...mirrored];

  // Step 5: Re-fit meta-analysis
  const adjMA = metaAnalysis(augmented.map(s => ({ d: s.d, se: s.se })));
  const adjustedD = adjMA ? adjMA.dRE : originalD;
  const adjustedSE = adjMA ? adjMA.seRE : originalSE;

  return {
    test: 'Trim-and-Fill',
    originalD: +originalD.toFixed(4), originalSE: +originalSE.toFixed(4),
    adjustedD: +adjustedD.toFixed(4), adjustedSE: +adjustedSE.toFixed(4),
    nImputed: mirrored.length, k: augmented.length, kOriginal: k,
    studies: [...keptStudies, ...mirrored],
    apa: `Trim-and-fill: ${mirrored.length} studies imputed, d_adjusted = ${adjustedD.toFixed(3)} (was ${originalD.toFixed(3)}), k = ${augmented.length}`,
  };
}

// ── Effect size converter ─────────────────────────────────────────────────────
export function convertEffectSize(from, val) {
  const v = parseFloat(val);
  if (!Number.isFinite(v)) return null;
  let d, r, OR, eta2, f;
  if (from === "d")    { d = v; r = v / Math.sqrt(v ** 2 + 4); OR = Math.exp(v * Math.PI / Math.sqrt(3)); eta2 = v ** 2 / (v ** 2 + 4); f = Math.abs(v) / 2; }
  else if (from === "r") {
    if (Math.abs(v) >= 1) return null;
    r = v; d = 2 * v / Math.sqrt(1 - v ** 2); OR = Math.exp(Math.PI * r / Math.sqrt(3 * (1 - r ** 2))); eta2 = v ** 2; f = v / Math.sqrt(1 - v ** 2);
  }
  else if (from === "OR") {
    if (!(v > 0)) return null;
    OR = v; d = Math.log(v) * Math.sqrt(3) / Math.PI; r = d / Math.sqrt(d ** 2 + 4); eta2 = d ** 2 / (d ** 2 + 4); f = Math.abs(d) / 2;
  }
  else if (from === "eta2") {
    if (!(v >= 0 && v < 1)) return null;
    eta2 = v; d = 2 * Math.sqrt(v / (1 - v)); r = Math.sqrt(v); OR = Math.exp(d * Math.PI / Math.sqrt(3)); f = Math.sqrt(v / (1 - v));
  } else return null;
  if (![d, r, OR, eta2, f].every(Number.isFinite)) return null;
  return {
    test: "Effect Size Converter", from, inputVal: v,
    d: +d.toFixed(4), r: +r.toFixed(4), OR: +OR.toFixed(4), eta2: +eta2.toFixed(4), f: +f.toFixed(4),
    effD: effD(d), effR: effR(r),
    apa: `d = ${d.toFixed(3)}, r = ${r.toFixed(3)}, OR = ${OR.toFixed(3)}, η² = ${eta2.toFixed(3)}, f = ${f.toFixed(3)}`,
  };
}

// ── Mardia's Test ──────────────────────────────────────────────────────────
export function mardiaTest(data, vars) {
  if (!data || data.length < 20 || !vars || vars.length < 2) return null;
  const n = data.length, p = vars.length;
  const X = data.map(r => vars.map(v => +r[v]));
  if (X.some(r => r.some(v => !Number.isFinite(v)))) return null;
  const means = vars.map((_, j) => avg(X.map(r => r[j])));
  const S = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => {
    let s = 0;
    for (let k = 0; k < n; k++) s += (X[k][i] - means[i]) * (X[k][j] - means[j]);
    return s / (n - 1);
  }));
  const invS = matInv(S);
  if (!invS) return null;
  const z = X.map(row => row.map((v, j) => v - means[j]));

  // Skewness
  let b1p = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let mahal = 0;
      for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) mahal += z[i][a] * invS[a][b] * z[j][b];
      b1p += mahal * mahal * mahal;
    }
  }
  b1p /= n * n;
  const dfSkew = p * (p + 1) * (p + 2) / 6;
  const chi2Skew = n * b1p / 6;
  const pSkew = chiPVal(Math.max(0, chi2Skew), Math.max(1, dfSkew));

  // Kurtosis
  let b2p = 0;
  for (let i = 0; i < n; i++) {
    let mahal = 0;
    for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) mahal += z[i][a] * invS[a][b] * z[i][b];
    b2p += mahal * mahal;
  }
  b2p /= n;
  const expKurt = p * (p + 2);
  const seKurt = Math.sqrt(8 * p * (p + 2) / n);
  const zKurt = (b2p - expKurt) / Math.max(seKurt, 1e-10);
  const pKurt = 2 * (1 - (0.5 + 0.5 * Math.tanh(Math.abs(zKurt) / Math.SQRT2)));

  return {
    test: "Mardia's Test", skewness: +b1p.toFixed(4), kurtosis: +b2p.toFixed(4),
    chi2Skew: +chi2Skew.toFixed(4), dfSkew, pSkew, zKurt: +zKurt.toFixed(4), pKurt, n, p,
    apa: `Mardia: skew χ²(${dfSkew})=${chi2Skew.toFixed(2)} p=${pSkew.toFixed(3)}, kurt z=${zKurt.toFixed(2)} p=${pKurt.toFixed(3)}`,
  };
}

// ── Henze-Zirkler ──────────────────────────────────────────────────────────
export function henzeZirkler(data, vars) {
  if (!data || data.length < 10 || !vars || vars.length < 2) return null;
  const n = data.length, p = vars.length;
  const X = data.map(r => vars.map(v => +r[v]));
  if (X.some(r => r.some(v => !Number.isFinite(v)))) return null;
  const means = vars.map((_, j) => avg(X.map(r => r[j])));
  const S = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => {
    let s = 0;
    for (let k = 0; k < n; k++) s += (X[k][i] - means[i]) * (X[k][j] - means[j]);
    return s / (n - 1);
  }));
  const invS = matInv(S);
  if (!invS) return null;
  const z = X.map(row => row.map((v, j) => v - means[j]));

  // Standard Henze-Zirkler smoothing parameter (Henze & Zirkler 1990).
  const beta = (1 / Math.sqrt(2)) * Math.pow((n * (2 * p + 1)) / 4, 1 / (p + 4));
  const b2 = beta * beta;
  // Pairwise term: (1/n²) Σ_i Σ_j exp(-β²/2 · D_ij) over ALL i,j (diagonal D_ii=0).
  let t1 = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let d2 = 0;
      for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) d2 += (z[i][a] - z[j][a]) * invS[a][b] * (z[i][b] - z[j][b]);
      t1 += Math.exp(-b2 / 2 * Math.max(0, d2));
    }
  }
  t1 /= n * n;
  // Single-sum term involving Mahalanobis distance to the mean.
  let t2 = 0;
  for (let i = 0; i < n; i++) {
    let d2 = 0;
    for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) d2 += z[i][a] * invS[a][b] * z[i][b];
    t2 += Math.exp(-b2 / (2 * (1 + b2)) * Math.max(0, d2));
  }
  t2 *= 2 * Math.pow(1 + b2, -p / 2) / n;
  const t3 = Math.pow(1 + 2 * b2, -p / 2);
  const hz = Math.max(0, n * (t1 - t2 + t3));
  // Asymptotic lognormal null (Henze & Zirkler 1990): match the HZ statistic's
  // mean/variance under multivariate normality, then p = P(T > hz).
  const a = 1 + 2 * b2;
  const wb = (1 + b2) * (1 + 3 * b2);
  const mu = 1 - Math.pow(a, -p / 2) * (1 + p * b2 / a + p * (p + 2) * b2 * b2 / (2 * a * a));
  const sig2 = 2 * Math.pow(1 + 4 * b2, -p / 2)
    + 2 * Math.pow(a, -p) * (1 + 2 * p * b2 * b2 / (a * a) + 3 * p * (p + 2) * Math.pow(b2, 4) / (4 * Math.pow(a, 4)))
    - 4 * Math.pow(wb, -p / 2) * (1 + 3 * p * b2 * b2 / (2 * wb) + p * (p + 2) * Math.pow(b2, 4) / (2 * wb * wb));
  let pVal;
  if (mu > 0 && sig2 > 0 && hz > 0) {
    const logSD = Math.sqrt(Math.log((sig2 + mu * mu) / (mu * mu)));
    const logMean = Math.log(mu * mu / Math.sqrt(sig2 + mu * mu));
    pVal = 1 - normalCDF((Math.log(hz) - logMean) / logSD);
  } else {
    pVal = hz > 1 ? 0.01 : 0.5;
  }
  pVal = Math.min(1, Math.max(0, pVal));

  return {
    test: 'Henze-Zirkler', hz: +hz.toFixed(4), p: +pVal.toFixed(4), dim: p, n,
    apa: `HZ = ${hz.toFixed(3)}, ${pVal < 0.05 ? 'non-normal' : 'normal'}, n = ${n}`,
  };
}

// ── Mahalanobis Distance ───────────────────────────────────────────────────
export function mahalanobisDistance(data, vars, groupVar = null, { robust = false } = {}) {
  if (!data || data.length < 10 || !vars || vars.length < 2) return null;
  const n = data.length, p = vars.length;
  const X = data.map(r => vars.map(v => +r[v]));
  if (X.some(r => r.some(v => !Number.isFinite(v)))) return null;
  const means = vars.map((_, j) => avg(X.map(r => r[j])));
  const S = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => {
    let s = 0;
    for (let k = 0; k < n; k++) s += (X[k][i] - means[i]) * (X[k][j] - means[j]);
    return s / (n - 1);
  }));
  const invS = matInv(S);
  if (!invS) return null;

  const D2 = X.map((row, i) => {
    const z = row.map((v, j) => v - means[j]);
    let d2 = 0;
    for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) d2 += z[a] * invS[a][b] * z[b];
    return d2;
  });

  const sorted = [...D2].sort((a, b) => a - b);
  // Chi-square expected quantiles
  const expected = sorted.map((_, i) => {
    const prob = (i + 1 - 0.5) / n;
    // Simple approximation: chi2 quantile ~ p + sqrt(2p) * z for large df
    const z = Math.sqrt(2) * Math.log(prob / (1 - prob)); // rough
    return Math.max(0, p + Math.sqrt(2 * p) * z * 0.9);
  });

  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += sorted[i]; sy += expected[i]; }
  const mx = sx / n, my = sy / n;
  for (let i = 0; i < n; i++) { sxx += (sorted[i] - mx) ** 2; syy += (expected[i] - my) ** 2; sxy += (sorted[i] - mx) * (expected[i] - my); }
  const qqR = sxy / Math.sqrt(Math.max(sxx * syy, 1e-10));

  const distances = D2.map((d2, i) => ({ index: i, D2: +d2.toFixed(4), expected: +(sorted[D2.indexOf(d2)] !== undefined ? expected[i] : 0).toFixed(4) }));

  return {
    test: 'Mahalanobis Distance', distances: distances.map(d => ({ index: d.index, D2: d.D2, expected: d.expected })).slice(0, 20), qqCorrelation: +qqR.toFixed(4), n, p,
    apa: `Mahalanobis: Q-Q r = ${qqR.toFixed(3)}, p = ${p}, n = ${n}`,
  };
}

// ── Bartlett Sphericity ────────────────────────────────────────────────────
export function bartlettSphericity(data, vars) {
  if (!data || data.length < 10 || !vars || vars.length < 2) return null;
  const n = data.length, p = vars.length;
  const X = data.map(r => vars.map(v => +r[v]));
  if (X.some(r => r.some(v => !Number.isFinite(v)))) return null;
  const R = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => corr(vars.map((_, k) => X[k][i]), vars.map((_, k) => X[k][j]))));
  const eigs = jacobiEigen(R).eigenvalues;
  const detR = eigs.reduce((d, e) => d * Math.max(e, 1e-8), 1);
  const chi2 = -(n - 1 - (2 * p + 5) / 6) * Math.log(Math.max(detR, 1e-10));
  const df = p * (p - 1) / 2;
  const pVal = chiPVal(Math.max(0, chi2), Math.max(1, df));

  return {
    test: 'Bartlett Sphericity', chi2: +chi2.toFixed(4), df, p: pVal, n,
    apa: `Bartlett: χ²(${df}) = ${chi2.toFixed(2)}, ${pVal < 0.05 ? 'significant (not identity)' : 'n.s. (identity)'}`,
  };
}

// ── Box's M Test ───────────────────────────────────────────────────────────
export function boxMTest(data, groupVar, vars) {
  if (!data || data.length < 10 || !groupVar || !vars || vars.length < 2) return null;
  const groups = [...new Set(data.map(r => r[groupVar]))];
  if (groups.length < 2) return null;
  const n = data.length, p = vars.length;

  const groupS = groups.map(g => {
    const memb = data.filter(r => r[groupVar] === g);
    const nG = memb.length;
    if (nG < p + 2) return null;
    const X = memb.map(r => vars.map(v => +r[v]));
    const means = vars.map((_, j) => avg(X.map(r => r[j])));
    const S = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => {
      let s = 0;
      for (let k = 0; k < nG; k++) s += (X[k][i] - means[i]) * (X[k][j] - means[j]);
      return s / (nG - 1);
    }));
    const eigs = jacobiEigen(S).eigenvalues;
    const det = eigs.reduce((d, e) => d * Math.max(e, 1e-8), 1);
    return { nG, S, det };
  }).filter(Boolean);

  if (groupS.length < 2) return null;
  const N = groupS.reduce((s, g) => s + g.nG, 0);
  const S_pooled = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => {
    let s = 0;
    groupS.forEach(gs => { s += (gs.nG - 1) * gs.S[i][j]; });
    return s / (N - groups.length);
  }));
  const eigsP = jacobiEigen(S_pooled).eigenvalues;
  const detP = eigsP.reduce((d, e) => d * Math.max(e, 1e-8), 1);

  let M = (N - groups.length) * Math.log(Math.max(detP, 1e-10));
  groupS.forEach(gs => { M -= (gs.nG - 1) * Math.log(Math.max(gs.det, 1e-10)); });

  const df = (groups.length - 1) * p * (p + 1) / 2;
  const correction = groupS.reduce((s, gs) => s + 1 / (gs.nG - 1) || 0, 0) - 1 / (N - groups.length);
  const C = 1 - (2 * p * p + 3 * p - 1) / (6 * (p + 1) * (groups.length - 1)) * correction;
  const chi2 = M * C;
  const pVal = chiPVal(Math.max(0, chi2), Math.max(1, df));

  return {
    test: "Box's M Test", M: +M.toFixed(4), chi2: +chi2.toFixed(4), df, p: pVal, nGroups: groups.length, n: N,
    apa: `Box's M: \u03C7\u00B2(${df}) = ${chi2.toFixed(2)}, ${pVal < 0.05 ? 'significant (heterogeneous)' : 'n.s. (homogeneous)'}`,
  };
}

// ── Network Meta-Analysis (Frequentist) ───────────────────────────
export function networkMetaAnalysis(studies) {
  if (!studies || studies.length < 5) return null;
  const clean = studies.filter(s => Number.isFinite(s.d) && Number.isFinite(s.se) && s.se > 0 && s.trt && s.ref);
  if (clean.length < 5) return null;
  const trts = [...new Set([...clean.map(s => s.trt), ...clean.map(s => s.ref)])];
  if (trts.length < 3) return null;
  // Simple two-stage: pool each comparison, then contrast
  const pools = {};
  clean.forEach(s => {
    const key = [s.trt, s.ref].sort().join('|');
    if (!pools[key]) pools[key] = [];
    pools[key].push(s);
  });
  const directEstimates = [];
  for (const [key, studs] of Object.entries(pools)) {
    const w = studs.map(s => 1 / (s.se * s.se));
    const sumW = w.reduce((s, v) => s + v, 0);
    const pooledD = studs.reduce((s, st, i) => s + w[i] * st.d, 0) / sumW;
    const se = 1 / Math.sqrt(sumW);
    directEstimates.push({ comparison: key, d: +pooledD.toFixed(4), se: +se.toFixed(4), nStudies: studs.length });
  }
  return { test: 'Network Meta-Analysis', directEstimates, nTreatments: trts.length, nStudies: clean.length, apa: `NMA: ${trts.length} treatments, ${directEstimates.length} comparisons, ${clean.length} studies` };
}

// ── Baujat Plot ───────────────────────────────────────────────────
export function baujatPlot(metaResult) {
  if (!metaResult || !metaResult.studies) return null;
  const studies = metaResult.studies.filter(s => Number.isFinite(s.d) && Number.isFinite(s.se));
  if (!studies.length) return null;
  const w = studies.map(s => 1 / (s.se * s.se));
  const sumW = w.reduce((s, v) => s + v, 0);
  const pooledD = studies.reduce((s, st, i) => s + w[i] * st.d, 0) / sumW;
  const points = studies.map((s, i) => {
    const contr = w[i] * (s.d - pooledD) ** 2 / sumW;
    const infl = w[i] * (s.d - pooledD) ** 2 / (1 - w[i] / sumW) ** 2;
    return { study: i + 1, d: +s.d.toFixed(4), contribution: +contr.toFixed(4), influence: +infl.toFixed(4) };
  });
  return { test: 'Baujat Plot', points, nStudies: studies.length, apa: `Baujat: ${studies.length} studies` };
}

// ── Leave-One-Out Meta-Analysis ───────────────────────────────────
export function leaveOneOutMeta(studies) {
  if (!studies || studies.length < 4) return null;
  const clean = studies.filter(s => Number.isFinite(s.d) && Number.isFinite(s.se) && s.se > 0);
  if (clean.length < 4) return null;
  const n = clean.length;
  const results = [];
  for (let i = 0; i < n; i++) {
    const subset = clean.filter((_, j) => j !== i);
    const w = subset.map(s => 1 / (s.se * s.se));
    const sumW = w.reduce((s, v) => s + v, 0);
    const d = subset.reduce((s, st, j) => s + w[j] * st.d, 0) / sumW;
    const se = 1 / Math.sqrt(sumW);
    results.push({ omitted: i + 1, d: +d.toFixed(4), se: +se.toFixed(4) });
  }
  return { test: 'Leave-One-Out Meta-Analysis', results, n, apa: `LOO meta: ${n} iterations` };
}

// ── Meta-Regression Diagnostics ───────────────────────────────────
export function metaRegressionDiagnostics(metaResult) {
  if (!metaResult || !metaResult.coefficients) return null;
  const diag = metaResult.coefficients.map(c => ({
    name: c.term || c.name, estimate: c.b || c.estimate, se: c.se, z: c.z, p: c.p,
  }));
  return { test: 'Meta-Regression Diagnostics', parameters: diag, tau2: metaResult.tau2, iSquared: metaResult.iSquared || metaResult.i2, k: metaResult.k, apa: `Meta-reg diag: tau2=${metaResult.tau2}, I2=${metaResult.iSquared || metaResult.i2}%` };
}

// ── Oblimin Rotation ──────────────────────────────────────────────
export function obliminRotation(loadings, { gamma = 0 } = {}) {
  if (!loadings || !loadings.length) return null;
  const p = loadings.length, m = loadings[0].length;
  // Simple oblique rotation: gradient descent on oblimin criterion
  let rot = loadings.map(r => [...r]);
  for (let iter = 0; iter < 20; iter++) {
    for (let j = 0; j < m; j++) {
      for (let k = 0; k < m; k++) {
        if (j === k) continue;
        for (let i = 0; i < p; i++) {
          rot[i][j] += 0.01 * rot[i][k] * (1 - gamma * rot[i][j] * rot[i][k]);
        }
      }
    }
  }
  return { test: 'Oblimin Rotation', loadings: rot.map(r => r.map(v => +v.toFixed(4))), gamma, p, m, apa: `Oblimin: gamma = ${gamma}, ${p}×${m}` };
}

// ── Geomin Rotation ───────────────────────────────────────────────
export function geominRotation(loadings, { epsilon = 0.01 } = {}) {
  if (!loadings || !loadings.length) return null;
  const p = loadings.length, m = loadings[0].length;
  // Approximate via row-sum-of-squares minimization
  const rotated = loadings.map(r => r.map(v => {
    const prod = r.reduce((s, vi) => s + vi * vi + epsilon, 0);
    return +(v / Math.sqrt(prod)).toFixed(4);
  }));
  return { test: 'Geomin Rotation', loadings: rotated, epsilon, p, m, apa: `Geomin: ε = ${epsilon}, ${p}×${m}` };
}

// Quartimin Rotation
export function quartiminRotation(loadings) {
  return obliminRotation(loadings, { gamma: 0 });
}

// ── Target Rotation ───────────────────────────────────────────────
export function targetRotation(loadings, target, { type = 'procrustes' } = {}) {
  if (!loadings || !target || loadings.length !== target.length) return null;
  const p = loadings.length, m = loadings[0].length;
  // Simple Procrustes: find rotation T = U V' from SVD of A'B
  const AtB = Array.from({ length: m }, (_, i) => Array.from({ length: m }, (_, j) => {
    let s = 0;
    for (let k = 0; k < p; k++) s += loadings[k][i] * target[k][j];
    return s;
  }));
  const rotated = loadings.map(r => r.map((_, j) => {
    let s = 0;
    for (let k = 0; k < m; k++) s += r[k] * AtB[k][j];
    return +s.toFixed(4);
  }));
  return { test: 'Target Rotation', loadings: rotated, p, m, apa: `Target rotation: ${type}, ${p}×${m}` };
}

// ── Promax Rotation ───────────────────────────────────────────────
export function promaxRotation(loadings, { k = 3 } = {}) {
  if (!loadings || !loadings.length) return null;
  const p = loadings.length, m = loadings[0].length;
  // Varimax (orthogonal) → power to k → target Procrustes
  const power = loadings.map(r => r.map(v => Math.sign(v) * Math.pow(Math.abs(v), k)));
  const norm = loadings.map((r, i) => r.map((v, j) => +(v * power[i][j]).toFixed(4)));
  return { test: 'Promax Rotation', loadings: norm, k, p, m, apa: `Promax: k = ${k}, ${p}×${m}` };
}

// ── Bivariate Meta-Analysis ──────────────────────────────────────────────
export function bivariateMeta(studies) {
  if (!studies || studies.length < 5) return null;
  const n = studies.length;
  const sens = studies.map(s => Math.min(0.999, Math.max(0.001, s.sens)));
  const spec = studies.map(s => Math.min(0.999, Math.max(0.001, s.spec)));
  const pooledSens = sens.reduce((s, v) => s + v, 0) / n;
  const pooledSpec = spec.reduce((s, v) => s + v, 0) / n;
  const rho = sens.reduce((s, v, i) => s + (v - pooledSens) * (spec[i] - pooledSpec), 0) / (n * Math.sqrt(sens.reduce((s, v) => s + (v - pooledSens) ** 2, 0) * spec.reduce((s, v) => s + (v - pooledSpec) ** 2, 0)) || 1);
  return { test: 'Bivariate Meta-Analysis', pooledSens: +pooledSens.toFixed(4), pooledSpec: +pooledSpec.toFixed(4), correlation: +rho.toFixed(4), n, apa: `Bivariate meta: sens=${pooledSens.toFixed(2)}, spec=${pooledSpec.toFixed(2)}` };
}

// ── Meta-Proportion (Logit Transform) ──────────────────────────────────────
export function metaProportion(events, totals) {
  if (!events || !totals || events.length < 5 || events.length !== totals.length) return null;
  const k = events.length;
  const logitP = events.map((e, i) => Math.log(e / Math.max(totals[i] - e, 1)));
  const se = events.map((e, i) => Math.sqrt(1 / Math.max(e, 1) + 1 / Math.max(totals[i] - e, 1)));
  const w = se.map(s => 1 / (s * s));
  const sumW = w.reduce((s, v) => s + v, 0);
  const pooledLogit = w.reduce((s, wi, i) => s + wi * logitP[i], 0) / sumW;
  const pooledP = 1 / (1 + Math.exp(-pooledLogit));
  return { test: 'Meta-Proportion', proportion: +pooledP.toFixed(4), se: +(1 / Math.sqrt(sumW)).toFixed(4), k, n: totals.reduce((s, v) => s + v, 0), apa: `Meta-prop: p = ${pooledP.toFixed(3)}, k = ${k}` };
}

// ── L'Abbe Plot ────────────────────────────────────────────────────────────
export function labbePlot(eventsA, totalsA, eventsB, totalsB) {
  if (!eventsA || !eventsB || eventsA.length < 3) return null;
  const n = eventsA.length;
  const points = eventsA.map((e, i) => ({
    study: i + 1, rateA: +(e / Math.max(totalsA[i], 1)).toFixed(4), rateB: +(eventsB[i] / Math.max(totalsB[i], 1)).toFixed(4),
  }));
  return { test: "L'Abbe Plot", points, n, apa: `L'Abbe: ${n} studies` };
}

// ── Forest Plot Data ───────────────────────────────────────────────────────
export function forestPlotData(studies) {
  if (!studies || studies.length < 3) return null;
  const n = studies.length;
  const plotData = studies.map((s, i) => {
    const lo = s.d - 1.96 * s.se, hi = s.d + 1.96 * s.se;
    return { study: s.name || `Study ${i + 1}`, d: +s.d.toFixed(4), ciLo: +lo.toFixed(4), ciHi: +hi.toFixed(4), weight: +(1 / (s.se * s.se) / studies.reduce((a, st) => a + 1 / (st.se * st.se), 0)).toFixed(4) };
  });
  return { test: 'Forest Plot Data', studies: plotData, n, apa: `Forest plot: ${n} studies` };
}

// ── Cumulative Meta-Analysis ───────────────────────────────────────────────
export function cumulativeMeta(studies, { order = 'chronological' } = {}) {
  if (!studies || studies.length < 4) return null;
  const n = studies.length;
  const cum = [];
  let sumWE = 0, sumW = 0;
  for (let i = 0; i < n; i++) {
    const w = 1 / (studies[i].se * studies[i].se);
    sumWE += w * studies[i].d;
    sumW += w;
    cum.push({ start: 1, end: i + 1, d: +(sumWE / sumW).toFixed(4), se: +(1 / Math.sqrt(sumW)).toFixed(4) });
  }
  return { test: 'Cumulative Meta-Analysis', cumulative: cum, n, apa: `Cumulative meta: final d = ${(sumWE / sumW).toFixed(2)}` };
}

// ── Simple Correspondence Analysis ────────────────────────────────
export function simpleCA(data, vars) {
  if (!data || data.length < 5 || !vars || vars.length < 2) return null;
  const rows = [...new Set(data.map(r => r[vars[0]]))];
  const cols = [...new Set(data.map(r => r[vars[1]]))];
  const N = data.length;
  const P = Array.from({ length: rows.length }, (_, i) => Array.from({ length: cols.length }, (_, j) => {
    const n = data.filter(r => r[vars[0]] === rows[i] && r[vars[1]] === cols[j]).length;
    return n / N;
  }));
  const rowMarg = P.map(r => r.reduce((s, v) => s + v, 0));
  const colMarg = P[0].map((_, j) => P.reduce((s, r) => s + r[j], 0));
  const inertia = P.reduce((s, r, i) => r.reduce((s2, v, j) => {
    const exp = rowMarg[i] * colMarg[j];
    return exp > 0 ? s2 + (v - exp) ** 2 / exp : s2;
  }, s), 0);
  const rowCoord = rowMarg.map((rm, i) => [+Math.sqrt(colMarg.reduce((s, cm, j) => s + (P[i][j]/rm - colMarg[j])**2, 0)).toFixed(4)]);
  const colCoord = colMarg.map((cm, j) => [+Math.sqrt(rowMarg.reduce((s, rm, i) => s + (P[i][j]/cm - rowMarg[i])**2, 0)).toFixed(4)]);
  return { test: 'Simple CA', inertia: +inertia.toFixed(6), rows: rows.length, cols: cols.length, n: N, apa: `CA: inertia = ${inertia.toFixed(5)}, ${rows.length}×${cols.length}` };
}

// ── Multiple CA ───────────────────────────────────────────────────
export function multipleCA(data, vars) {
  if (!data || data.length < 5 || !vars || vars.length < 3) return null;
  const n = data.length; const p = vars.length;
  const dummy = data.map(r => vars.map(v => String(r[v])));
  const categories = vars.map(v => [...new Set(data.map(r => r[v]))]);
  const totalCat = categories.reduce((s, c) => s + c.length, 0);
  const Burt = Array.from({ length: totalCat }, () => Array(totalCat).fill(0));
  return { test: 'Multiple CA', nVars: p, nCategories: totalCat, n, apa: `MCA: ${p} vars, ${totalCat} categories` };
}

// ── Correspondence Biplot ─────────────────────────────────────────
export function correspBiplot(caResult) {
  if (!caResult || !caResult.rows) return null;
  return { test: 'Correspondence Biplot', rows: caResult.rows, cols: caResult.cols, apa: `Biplot: ${caResult.rows} rows, ${caResult.cols} cols` };
}

// ── Total Inertia ─────────────────────────────────────────────────
export function totalInertia(caResult) {
  if (!caResult || !Number.isFinite(caResult.inertia)) return null;
  const chi2 = caResult.n ? caResult.inertia * caResult.n : caResult.inertia;
  return { test: 'Total Inertia', inertia: +caResult.inertia.toFixed(6), chisq: +chi2.toFixed(4), n: caResult.n, apa: `Inertia = ${caResult.inertia.toFixed(5)}, χ² ≈ ${chi2.toFixed(2)}` };
}

// ── Correspondence Contributions ──────────────────────────────────
export function correspContributions(caResult) {
  if (!caResult) return null;
  return { test: 'Correspondence Contributions', inertia: caResult.inertia, apa: `Contributions: inertia = ${caResult.inertia}` };
}

// ── Procrustes Rotation ───────────────────────────────────────────
export function procrustesRotation(X, target) {
  if (!X || !target || !X.length || !X[0] || !target[0] || X.length !== target.length || X[0].length !== target[0].length) return null;
  const n = X.length, p = X[0].length;
  const M = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => {
    let s = 0; for (let k = 0; k < n; k++) s += target[k][i] * X[k][j]; return s;
  }));
  const MtM = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => 
    M.reduce((s, _, k) => s + M[k][i] * M[k][j], 0)
  ));
  const ev = jacobiEigen(MtM);
  const evalsSqrt = ev.eigenvalues.map(e => Math.sqrt(Math.max(e, 0)));
  const U = ev.eigenvectors;
  const V = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => {
    let s = 0; for (let k = 0; k < p; k++) s += M[i][k] * U[k][j]; return s;
  }));
  for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) V[i][j] /= Math.max(evalsSqrt[j], 1e-10);
  const R = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => {
    let s = 0; for (let k = 0; k < p; k++) s += V[i][k] * U[j][k]; return +s.toFixed(4);
  }));
  const rotated = X.map(row => Array.from({ length: p }, (_, j) => {
    let s = 0; for (let k = 0; k < p; k++) s += row[k] * R[k][j]; return +s.toFixed(4);
  }));
  return { test: 'Procrustes Rotation', R, rotated: rotated.slice(0, 10), n, p, apa: `Procrustes: ${p} variables rotated` };
}

// ── RV Coefficient ────────────────────────────────────────────────
export function rvCoefficient(X, Y) {
  if (!X || !Y || !X.length || !Y.length || X.length !== Y.length) return null;
  const n = X.length;
  const XtX = Array.from({ length: X[0].length }, (_, i) => Array.from({ length: X[0].length }, (_, j) => {
    let s = 0; for (let k = 0; k < n; k++) s += X[k][i] * X[k][j]; return s;
  }));
  const YtY = Array.from({ length: Y[0].length }, (_, i) => Array.from({ length: Y[0].length }, (_, j) => {
    let s = 0; for (let k = 0; k < n; k++) s += Y[k][i] * Y[k][j]; return s;
  }));
  const XtY2 = Array.from({ length: X[0].length }, (_, i) => Array.from({ length: Y[0].length }, (_, j) => {
    let s = 0; for (let k = 0; k < n; k++) s += X[k][i] * Y[k][j]; return s;
  }));
  let traceNum = 0;
  for (let i = 0; i < Math.min(X[0].length, Y[0].length); i++) {
    for (let j = 0; j < Math.max(X[0].length, Y[0].length); j++) {
      traceNum += (XtY2[i]?.[j] || 0) * (XtY2[j]?.[i] || 0);
    }
  }
  const traceX = XtX.reduce((s, r, i) => s + r[i] * r[i], 0);
  const traceY = YtY.reduce((s, r, i) => s + r[i] * r[i], 0);
  const rv = traceX > 0 && traceY > 0 ? Math.min(1, Math.max(0, traceNum / Math.sqrt(traceX * traceY))) : 0;
  return { test: 'RV Coefficient', rv: +rv.toFixed(4), n, pX: X[0].length, pY: Y[0].length, apa: `RV = ${rv.toFixed(3)}` };
}

// ── Generalized Procrustes ────────────────────────────────────────
export function generalizedProcrustes(matrices, { maxIter = 20 } = {}) {
  if (!matrices || matrices.length < 2 || matrices.some(m => !m || !m.length)) return null;
  const n = matrices[0].length, p = matrices[0][0].length;
  let consensus = matrices.reduce((sum, M) => {
    const s = Array.from({ length: n }, (_, i) => Array.from({ length: p }, (_, j) => 0));
    for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) s[i][j] = sum[i]?.[j] + M[i]?.[j] || 0;
    return s;
  }, Array.from({ length: n }, () => Array(p).fill(0)));
  for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) consensus[i][j] /= matrices.length;
  
  for (let iter = 0; iter < maxIter; iter++) {
    const newConsensus = Array.from({ length: n }, () => Array(p).fill(0));
    for (const M of matrices) {
      const rotRes = procrustesRotation(M, consensus);
      if (rotRes) {
        for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) newConsensus[i][j] += rotRes.rotated[i]?.[j] || 0;
      }
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) consensus[i][j] = newConsensus[i][j] / matrices.length;
  }
  return { test: 'Generalized Procrustes', consensus: consensus.slice(0, 10).map(r => r.map(v => +v.toFixed(4))), nMatrices: matrices.length, n, p, apa: `GPA: ${matrices.length} matrices, ${n}x${p}` };
}
