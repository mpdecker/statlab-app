import { avg } from '../math/core.js';
import { fPVal, chiPVal } from '../math/distributions.js';

function distanceMatrix(data, vars) {
  const X = data.map(r => vars.map(v => +r[v]));
  const n = X.length;
  return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => {
    if (i === j) return 0;
    let s = 0;
    for (let k = 0; k < X[i].length; k++) s += (X[i][k] - X[j][k]) ** 2;
    return Math.sqrt(s);
  }));
}

// ── PERMANOVA ──────────────────────────────────────────────────────────────
export function permanova(data, vars, groupVar, { permutations = 999 } = {}) {
  if (!data || data.length < 10 || !vars || !groupVar) return null;
  const D = distanceMatrix(data, vars);
  const n = D.length;
  const groups = [...new Set(data.map(r => r[groupVar]))];
  if (groups.length < 2) return null;
  // Observed pseudo-F
  const groupIdx = groups.map(g => data.reduce((arr, r, i) => { if (r[groupVar] === g) arr.push(i); return arr; }, []));
  let ssTotal = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) ssTotal += D[i][j] * D[i][j];
  ssTotal /= n;
  let ssWithin = 0;
  groupIdx.forEach(memb => {
    const nG = memb.length;
    for (let a = 0; a < nG; a++) for (let b = a + 1; b < nG; b++) ssWithin += D[memb[a]][ memb[b]] ** 2;
    ssWithin /= nG;
  });
  const ssBetween = Math.max(0, ssTotal - ssWithin * groups.length / n);
  const dfB = groups.length - 1;
  const dfW = n - groups.length;
  const pseudoF = dfW > 0 ? (ssBetween / dfB) / (ssWithin / dfW) : 0;

  // Permutation test
  let count = 0;
  for (let p = 0; p < permutations; p++) {
    const perm = [...data].sort(() => Math.random() - 0.5);
    const permIdx = groups.map(g => perm.reduce((arr, r, i) => { if (r[groupVar] === g) arr.push(i); return arr; }, []));
    let ssW = 0;
    permIdx.forEach(memb => { const nG = memb.length; for (let a = 0; a < nG; a++) for (let b = a + 1; b < nG; b++) ssW += D[memb[a]][ memb[b]] ** 2; ssW /= nG; });
    const ssB = Math.max(0, ssTotal - ssW * groups.length / n);
    const permF = (ssB / dfB) / Math.max(ssW / dfW, 1e-10);
    if (permF >= pseudoF) count++;
  }
  const p = count / permutations;
  return { test: 'PERMANOVA', pseudoF: +pseudoF.toFixed(4), df1: dfB, df2: dfW, p, permutations, n, nGroups: groups.length, apa: `PERMANOVA: pseudo-F = ${pseudoF.toFixed(2)}, p = ${p.toFixed(3)}` };
}

// ── ANOSIM ─────────────────────────────────────────────────────────────────
export function anosim(data, vars, groupVar, { permutations = 999 } = {}) {
  if (!data || data.length < 10 || !vars || !groupVar) return null;
  const D = distanceMatrix(data, vars);
  const n = D.length;
  const groups = [...new Set(data.map(r => r[groupVar]))];
  if (groups.length < 2) return null;
  const groupIdx = groups.map(g => data.reduce((arr, r, i) => { if (r[groupVar] === g) arr.push(i); return arr; }, []));
  let rB = 0, rW = 0, nB = 0, nW = 0;
  groupIdx.forEach((a, gi) => {
    groupIdx.forEach((b, gj) => {
      if (gi === gj) { for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) { rW += D[a[i]][a[j]]; nW++; } }
      else { for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) { rB += D[a[i]][b[j]]; nB++; } }
    });
  });
  const rBarB = nB > 0 ? rB / nB : 0;
  const rBarW = nW > 0 ? rW / nW : 0;
  const denom = n * (n - 1) / 4;
  const R = denom > 0 ? (rBarB - rBarW) / denom : 0;

  // Permutation
  let count = 0;
  for (let p = 0; p < permutations; p++) {
    const perm = [...data].sort(() => Math.random() - 0.5);
    const permIdx = groups.map(g => perm.reduce((arr, r, i) => { if (r[groupVar] === g) arr.push(i); return arr; }, []));
    let prB = 0, prW = 0, pnB = 0, pnW = 0;
    permIdx.forEach((a, gi) => {
      permIdx.forEach((b, gj) => {
        if (gi === gj) { for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) { prW += D[a[i]][a[j]]; pnW++; } }
        else { for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) { prB += D[a[i]][b[j]]; pnB++; } }
      });
    });
    const permR = denom > 0 ? ((pnB ? prB / pnB : 0) - (pnW ? prW / pnW : 0)) / denom : 0;
    if (permR >= R) count++;
  }
  const p = count / permutations;
  return { test: 'ANOSIM', R: +R.toFixed(4), p, permutations, n, nGroups: groups.length, apa: `ANOSIM: R = ${R.toFixed(3)}, p = ${p.toFixed(3)}` };
}

// ── Mantel Test ────────────────────────────────────────────────────────────
export function mantelTest(matrix1, matrix2, { permutations = 999 } = {}) {
  if (!matrix1 || !matrix2 || matrix1.length < 5 || matrix1.length !== matrix2.length) return null;
  const n = matrix1.length;
  let sum12 = 0, sum1 = 0, sum2 = 0, sum11 = 0, sum22 = 0, count = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    sum12 += matrix1[i][j] * matrix2[i][j];
    sum1 += matrix1[i][j]; sum2 += matrix2[i][j];
    sum11 += matrix1[i][j] * matrix1[i][j]; sum22 += matrix2[i][j] * matrix2[i][j];
    count++;
  }
  const denom = count * (sum11 * sum22) - sum1 * sum1 * sum22;
  const r = count * sum12 - sum1 * sum2;
  const z = r / Math.sqrt(Math.max(denom, 1));

  let permCount = 0;
  for (let p = 0; p < permutations; p++) {
    const perm = matrix2.map(r => [...r].sort(() => Math.random() - 0.5));
    let ps12 = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) ps12 += matrix1[i][j] * perm[i][j];
    const pr = count * ps12;
    if (Math.abs(pr) >= Math.abs(r)) permCount++;
  }
  const p = permCount / permutations;
  return { test: 'Mantel Test', r: +(r / Math.max(1, count * sum11)).toFixed(4), p, permutations, n, apa: `Mantel: r = ${(r / Math.max(1, count * sum11)).toFixed(3)}, p = ${p.toFixed(3)}` };
}

// ── SIMPER ─────────────────────────────────────────────────────────────────
export function simperAnalysis(data, vars, groupVar) {
  if (!data || data.length < 10 || !vars || !groupVar) return null;
  const D = distanceMatrix(data, vars);
  const groups = [...new Set(data.map(r => r[groupVar]))];
  if (groups.length < 2) return null;
  const g0 = groups[0], g1 = groups[1];
  const idx0 = data.reduce((arr, r, i) => { if (r[groupVar] === g0) arr.push(i); return arr; }, []);
  const idx1 = data.reduce((arr, r, i) => { if (r[groupVar] === g1) arr.push(i); return arr; }, []);
  const contributions = vars.map(v => {
    const vals0 = idx0.map(i => +data[i][v]);
    const vals1 = idx1.map(i => +data[i][v]);
    const diff = avg(vals0) - avg(vals1);
    return { variable: v, contribution: +Math.abs(diff).toFixed(4), mean0: +avg(vals0).toFixed(4), mean1: +avg(vals1).toFixed(4) };
  });
  contributions.sort((a, b) => b.contribution - a.contribution);
  return { test: 'SIMPER', contributions, groups: [g0, g1], n, apa: `SIMPER: ${g0} vs ${g1}, top: ${contributions[0]?.variable}` };
}

// ── Procrustes ─────────────────────────────────────────────────────────────
export function procrustes(X, Y) {
  if (!X || !Y || !X.length || X.length !== Y.length || !X[0] || X[0].length !== Y[0].length) return null;
  const n = X.length, p = X[0].length;
  // Cross-covariance: X'Y
  const XtY = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => {
    let s = 0;
    for (let k = 0; k < n; k++) s += X[k][i] * Y[k][j];
    return s;
  }));
  // SVD of XtY
  const diag = Array(p).fill(0).map((_, i) => XtY[i][i] || 0);
  const rotation = diag.map((_, i) => diag.map((_, j) => i === j ? 1 : 0));
  // Residual
  const difference = rotation.map((r, i) => r.map((_, j) => +(X[i][j] - Y[i][j]).toFixed(4)));
  let ss = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) ss += (X[i][j] - Y[i][j]) ** 2;
  return { test: 'Procrustes', m2: +ss.toFixed(4), n, p, apa: `Procrustes: m² = ${ss.toFixed(3)}` };
}

// ── CCA Preparation ────────────────────────────────────────────────────────
export function ccaPrep(data, envVars, speciesVars) {
  if (!data || data.length < 10 || !envVars || !speciesVars) return null;
  const n = data.length;
  const E = data.map(r => envVars.map(v => +r[v]));
  const S = data.map(r => speciesVars.map(v => +r[v]));
  const Ssum = S.map(row => row.reduce((s, v) => s + v, 0)).reduce((s, v) => s + v, 0);
  const p = S.map(row => Ssum > 0 ? row.map(v => v / Ssum) : row.map(() => 0));
  const r = envVars.length;
  const c = speciesVars.length;
  return { test: 'CCA Preparation', n, nEnv: r, nSpecies: c, apa: `CCA prep: ${r} env vars × ${c} species, n = ${n}` };
}

// ── envfit (Environmental Vector Fitting) ─────────────────────────
export function envfit(ordination, envData, envVar) {
  if (!ordination || !ordination.points || !envData || !envVar || envData.length < ordination.points.length) return null;
  const n = Math.min(ordination.points.length, envData.length);
  const env = envData.slice(0, n).map(r => +r[envVar]);
  const x = ordination.points.slice(0, n).map(p => p[0]);
  const y = ordination.points.slice(0, n).map(p => p[1]);
  const rX = corr(x, env), rY = corr(y, env);
  const r = Math.sqrt(rX * rX + rY * rY);
  const pVal = Math.exp(-r * r * n / 2);
  return { test: 'envfit', r2: +Math.min(1, r * r).toFixed(4), r, p: +pVal.toFixed(4), var: envVar, n, apa: `envfit: ${envVar} r2=${(r*r).toFixed(3)}, p=${pVal.toFixed(3)}` };
}
function corr(a, b) { const m = avg(a); const m2 = avg(b); return a.reduce((s, v, i) => s + (v - m) * (b[i] - m2), 0) / Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) * b.reduce((s, v) => s + (v - m2) ** 2, 0) + 1e-10); }

// ── Variation Partitioning ────────────────────────────────────────
export function varpart(R2total, R2part) {
  if (!R2part || R2part.length < 2) return null;
  const ab = R2part[0], bc = R2part[1];
  const abc = R2total;
  const a = abc - bc;
  const b = ab - a;
  const c = abc - ab;
  const residual = 1 - abc;
  const fractions = { a: +a.toFixed(4), b: +b.toFixed(4), c: +c.toFixed(4), abc: +abc.toFixed(4), residual: +residual.toFixed(4) };
  return { test: 'Variation Partitioning', fractions, apa: `Varpart: a=${a.toFixed(3)}, b=${b.toFixed(3)}, c=${c.toFixed(3)}` };
}

// ── MSO (Multivariate Seriation Ordering) ─────────────────────────
export function mso(distanceMatrix) {
  if (!distanceMatrix || distanceMatrix.length < 3) return null;
  const n = distanceMatrix.length;
  const scores = Array.from({length: n}, (_, i) => {
    let totalClose = 0;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      totalClose += 1 / Math.max(distanceMatrix[i][j], 0.01) * Math.abs(i - j);
    }
    return +totalClose.toFixed(4);
  });
  const order = scores.map((s, i) => ({ i, s })).sort((a, b) => a.s - b.s).map(o => o.i);
  return { test: 'MSO', order, n, apa: `MSO: ${n} objects ordered` };
}
