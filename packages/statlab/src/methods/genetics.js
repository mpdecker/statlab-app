import { avg, corr } from '../math/core.js';
import { chiPVal } from '../math/distributions.js';
import { matInv } from '../math/matrix.js';

// ── Polygenic Risk Score ──────────────────────────────────────────
/** @param {number[]} weights @param {number[][]} genotypes */
export function prsScore(genotypes, weights) {
  if (!genotypes || !genotypes.length || !weights || weights.length !== genotypes[0]?.length) return null;
  const n = genotypes.length;
  const scores = genotypes.map(g => g.reduce((s, v, j) => s + v * weights[j], 0));
  const totalScores = scores.map(v => +v.toFixed(4));
  return { test: 'PRS Score', scores: totalScores, n, nMarkers: weights.length, apa: `PRS: ${n} individuals, ${weights.length} markers` };
}

// ── ACE Heritability ──────────────────────────────────────────────
/** @param {number[][]} mz MZ twin pairs. @param {number[][]} dz DZ twin pairs. */
export function aceHeritability(mz, dz) {
  if (!mz || !dz || mz.length < 10 || dz.length < 10) return null;
  const n1 = mz.length, n2 = dz.length;
  // Twin correlations
  const mzPairs = [];
  for (let i = 0; i < n1; i += 2) { if (i + 1 < n1) mzPairs.push([mz[i], mz[i + 1]]); }
  const dzPairs = [];
  for (let i = 0; i < n2; i += 2) { if (i + 1 < n2) dzPairs.push([dz[i], dz[i + 1]]); }
  if (mzPairs.length < 5 || dzPairs.length < 5) return null;
  const rMZ = corr(mzPairs.map(p => p[0]), mzPairs.map(p => p[1]));
  const rDZ = corr(dzPairs.map(p => p[0]), dzPairs.map(p => p[1]));
  const A = 2 * (rMZ - rDZ);
  const C = 2 * rDZ - rMZ;
  const E = 1 - rMZ;
  return { test: 'ACE Heritability', A: +Math.max(0, Math.min(1, A)).toFixed(4), C: +Math.max(0, Math.min(1, C)).toFixed(4), E: +Math.max(0, Math.min(1, E)).toFixed(4), rMZ: +rMZ.toFixed(4), rDZ: +rDZ.toFixed(4), nPairs: mzPairs.length, apa: `ACE: A = ${(A * 100).toFixed(1)}%, C = ${(C * 100).toFixed(1)}%, E = ${(E * 100).toFixed(1)}%` };
}

// ── LD Pruning ────────────────────────────────────────────────────
/** @param {number[][]} genotypes */
export function ldPruning(genotypes, { threshold = 0.8, window = 50 } = {}) {
  if (!genotypes || !genotypes.length) return null;
  const n = genotypes.length;
  const kept = [];
  const removed = [];
  const markers = genotypes[0]?.length || 0;
  for (let j = 0; j < markers; j++) {
    if (removed.includes(j)) continue;
    kept.push(j);
    const end = Math.min(j + window, markers);
    for (let k = j + 1; k < end; k++) {
      if (removed.includes(k)) continue;
      const x = [], y = [];
      for (let i = 0; i < n; i++) { x.push(genotypes[i][j]); y.push(genotypes[i][k]); }
      const r = corr(x, y);
      if (Math.abs(r) > threshold) removed.push(k);
    }
  }
  return { test: 'LD Pruning', kept, nRemoved: removed.length, threshold, window, nMarkers: markers, apa: `LD pruning: kept ${kept.length}/${markers} markers, threshold r² = ${threshold}` };
}

// ── Polygenic Prediction ──────────────────────────────────────────
/** @param {number[]} phenotype @param {number[][]} genotypes */
export function polygenicPrediction(phenotype, genotypes) {
  if (!phenotype || !genotypes || phenotype.length < 10 || phenotype.length !== genotypes.length) return null;
  const n = phenotype.length, m = genotypes[0]?.length || 0;
  const Xt = genotypes[0].map((_, j) => genotypes.map(r => r[j]));
  const XtX = Xt.map(r1 => genotypes[0].map((_, j) => r1.reduce((s, _, k) => s + genotypes[k][j] * r1[k], 0)));
  const XtY = Xt.map(r1 => r1.reduce((s, v, k) => s + v * phenotype[k], 0));
  // Ridge regression via diagonal loading
  const lambda = 0.1;
  const XtXI = XtX.map((r, i) => r.map((v, j) => j === i ? v + lambda : v));
  const inv = matInv(XtXI);
  if (!inv) return null;
  const beta = inv.map(row => row.reduce((s, v, j) => s + v * XtY[j], 0));
  const fitted = genotypes.map(g => g.reduce((s, v, j) => s + v * beta[j], 0));
  let ssr = 0, sst = 0;
  const my = avg(phenotype);
  for (let i = 0; i < n; i++) { ssr += (phenotype[i] - fitted[i]) ** 2; sst += (phenotype[i] - my) ** 2; }
  const rsq = sst > 0 ? 1 - ssr / sst : 0;
  return { test: 'Polygenic Prediction', rSquared: +rsq.toFixed(4), nMarkers: m, n, apa: `Polygenic pred: R² = ${rsq.toFixed(3)}, ${m} markers` };
}

// ── Manhattan Plot Data ───────────────────────────────────────────
/** @param {number[]} pValues @param {number[]} positions @param {Array<string|number>} chromosomes */
export function manhattanData(pValues, positions, chromosomes) {
  if (!pValues || !positions || !chromosomes || !pValues.length) return null;
  const n = pValues.length;
  const points = pValues.map((p, i) => {
    const chr = chromosomes ? chromosomes[i] : 1;
    const pos = positions ? positions[i] : i;
    return { snp: i + 1, chr, position: pos, pValue: +p.toFixed(6), negLog10P: +(Math.max(1e-15, p) ? -Math.log10(Math.max(p, 1e-15)) : 15).toFixed(4) };
  });
  const bonferroni = 0.05 / n;
  const sigLine = -Math.log10(bonferroni);
  return { test: 'Manhattan Plot Data', points, bonferroni: +sigLine.toFixed(2), n, apa: `Manhattan: ${points.filter(p => p.negLog10P > sigLine).length} significant (Bonferroni)` };
}

// ── GCTA Heritability ─────────────────────────────────────────────
/** @param {number[][]} GRM genetic relationship matrix. @param {number[]} phenotype */
export function heritabilityGCTA(GRM, phenotype) {
  if (!GRM || !phenotype || GRM.length < 10 || GRM.length !== phenotype.length) return null;
  const n = phenotype.length;
  const y = phenotype;
  const trGRM = GRM.reduce((s, r, i) => s + r[i], 0);
  let sg = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) sg += y[i] * y[j] * GRM[i][j];
  const sy = y.reduce((s, v) => s + v * v, 0);
  const h2 = sy > 0 ? Math.max(0, Math.min(1, sg / sy / trGRM * n)) : 0;
  return { test: 'GCTA Heritability', h2: +h2.toFixed(4), n, apa: `h2(GCTA) = ${h2.toFixed(3)}, n=${n}` };
}

// ── LD Score Regression ───────────────────────────────────────────
/** @param {number} n @param {number[]} chi2 @param {number[]} ldScores */
export function ldScoreRegression(chi2, ldScores, n) {
  if (!chi2 || !ldScores || chi2.length < 10 || chi2.length !== ldScores.length) return null;
  const m = chi2.length;
  let num = 0, den = 0;
  for (let i = 0; i < m; i++) { num += ldScores[i] * (chi2[i] - 1); den += ldScores[i] * ldScores[i]; }
  const h2 = den > 0 ? Math.max(0, num / den) : 0;
  const intercept = 1 + h2 * 0.1;
  return { test: 'LD Score Regression', h2: +h2.toFixed(4), intercept: +intercept.toFixed(4), m, n, apa: `LDSC: h2=${h2.toFixed(3)}, m=${m}` };
}

// ── Mendelian Randomization ───────────────────────────────────────
/** @param {number} betaYX @param {number} seYX @param {number} betaZX @param {number} seZX */
export function mendelianRandomization(betaYX, seYX, betaZX, seZX) {
  if (!Number.isFinite(betaYX) || !Number.isFinite(betaZX) || !betaZX) return null;
  const mrEstimate = betaYX / betaZX;
  const mrSE = Math.sqrt(seYX * seYX / (betaZX * betaZX) + betaYX * betaYX * seZX * seZX / (betaZX * betaZX * betaZX * betaZX));
  return { test: 'Mendelian Randomization', estimate: +mrEstimate.toFixed(4), se: +mrSE.toFixed(4), apa: `MR: ${mrEstimate.toFixed(3)} (se=${mrSE.toFixed(3)})` };
}
