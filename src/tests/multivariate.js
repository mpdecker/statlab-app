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

function symSqrtInvSPD(M) {
  const { eigenvalues: ev, eigenvectors: V } = jacobiEigen(M);
  const invS = diagMat(ev.map(x => Math.sqrt(1 / Math.max(x, 1e-8))));
  const VD = matMul(V, invS), Vt = matTrans(V);
  return matMul(VD, Vt);
}

function symProd(A) {
  const AT = matTrans(A);
  return A.map((r, i) => r.map((_, j) => (A[i][j] + AT[i][j]) / 2));
}

/** One-way MANOVA — Wilks' Λ · Bartlett χ² · Pillai trace */
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

  const invE = matInv(E.map((rr, ix) =>
    rr.map((v, jx) => v + ((ix === jx ? 1e-6 : 0) * (jacobiEigen(E).eigenvalues[0] ?? 1) * 1e-8))));
  let hotLaw = 0, roysRoot = 0;
  if (invE) {
    const EiHprod = symProd(matMul(invE, H));
    const eigH = jacobiEigen(EiHprod).eigenvalues.filter(e => e > 1e-10).slice(0, nuH);
    hotLaw = eigH.reduce((s, x) => s + x, 0);
    roysRoot = eigH.length ? Math.max(...eigH) : 0;
  }

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

  const traceSw = jacobiEigen(symProd(Sw)).eigenvalues.reduce((s, ev) => s + Math.max(ev, 0), 0) || 1;
  const ridge = traceSw / p * 1e-4;
  Sw = Sw.map((r, ix) => r.map((v, iy) => v + (ix === iy ? ridge : 0)));
  const invSw = matInv(Sw);
  if (!invSw) return null;
  const eig = jacobiEigen(symProd(matMul(invSw, Sb)));
  /** jacobiEigen sorts λ descending — first column eigenvector corresponds to λ₁ */
  const wRaw = eig.eigenvectors[0];
  if (!wRaw?.length) return null;
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
