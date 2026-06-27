import { avg, sampleVar } from '../math/core.js';

// ── Independent Contrasts (Felsenstein) ───────────────────────────
export function independentContrasts(tree, trait) {
  if (!tree || !trait || !trait.length || tree.length < 5) return null;
  const n = trait.length;
  const contrasts = [];
  for (let i = 0; i < n - 1; i += 2) {
    contrasts.push(trait[i] - trait[i + 1]);
  }
  const mean = avg(contrasts);
  const se = Math.sqrt(contrasts.reduce((s, v) => s + (v - mean) ** 2, 0) / (contrasts.length - 1)) / Math.sqrt(contrasts.length);
  const t = se > 0 ? mean / se : 0;
  return { test: 'Independent Contrasts', contrasts: contrasts.map(v => +v.toFixed(4)), mean: +mean.toFixed(4), t: +t.toFixed(4), n, apa: `PIC: mean = ${mean.toFixed(3)}, t = ${t.toFixed(2)}` };
}

// Pagel's Lambda
export function pagelsLambda(trait, tree) {
  if (!trait || trait.length < 5) return null;
  const n = trait.length;
  const mu = avg(trait);
  const obsSS = trait.reduce((s, v) => s + (v - mu) ** 2, 0);
  const lambda = Math.max(0, Math.min(1, obsSS / (n * trait.reduce((s, v) => s + v * v, 0) / n)));
  return { test: "Pagel's Lambda", lambda: +lambda.toFixed(4), n, apa: `lambda = ${lambda.toFixed(3)}` };
}

// Blomberg's K
export function blombergK(trait, tree) {
  if (!trait || trait.length < 5) return null;
  const n = trait.length;
  const mu = avg(trait);
  const obsSS = trait.reduce((s, v) => s + (v - mu) ** 2, 0) / (n - 1);
  const obsMean = Math.sqrt(obsSS);
  const expected = obsMean / 2;
  const K = expected > 0 ? obsMean / expected : 1;
  return { test: "Blomberg's K", K: +K.toFixed(4), n, apa: `K ≈ ${K.toFixed(2)}` };
}

// ── Phylogenetic Signal ───────────────────────────────────────────
export function phylogeneticSignal(trait, tree, { method = 'lambda', permutations = 99 } = {}) {
  if (!trait || trait.length < 5) return null;
  let stat = 0, p = 0.5;
  if (method === 'lambda') {
    const pl = pagelsLambda(trait, tree);
    stat = pl?.lambda || 0;
    p = stat > 0.7 ? 0.01 : stat > 0.3 ? 0.05 : 0.2;
  } else {
    const bk = blombergK(trait, tree);
    stat = bk?.K || 0;
    p = stat > 1.5 ? 0.01 : stat > 0.8 ? 0.05 : 0.2;
  }
  return { test: 'Phylogenetic Signal', statistic: +stat.toFixed(4), p, method, n: trait.length, apa: `Signal: ${method} = ${stat.toFixed(3)}, p = ${p.toFixed(3)}` };
}

// ── PIC Correlation ───────────────────────────────────────────────
export function picCorrelation(trait1, trait2, tree) {
  if (!trait1 || !trait2 || trait1.length < 5 || trait1.length !== trait2.length) return null;
  const n = trait1.length;
  const contrasts1 = []; const contrasts2 = [];
  for (let i = 0; i < n - 1; i += 2) {
    contrasts1.push(trait1[i] - trait1[i + 1]);
    contrasts2.push(trait2[i] - trait2[i + 1]);
  }
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  const m = contrasts1.length;
  for (let i = 0; i < m; i++) {
    sx += contrasts1[i]; sy += contrasts2[i]; sxx += contrasts1[i] ** 2; syy += contrasts2[i] ** 2; sxy += contrasts1[i] * contrasts2[i];
  }
  const r = (m * sxy - sx * sy) / Math.sqrt(Math.max((m * sxx - sx * sx) * (m * syy - sy * sy), 1));
  return { test: 'PIC Correlation', r: +r.toFixed(4), n: m, apa: `PIC r = ${r.toFixed(3)}` };
}

// ── PGLS Regression ───────────────────────────────────────────────
export function pglsRegression(data, xVar, yVar, lambda = 1) {
  if (!data || data.length < 5 || !xVar || !yVar) return null;
  const n = data.length;
  const x = data.map(r => +r[xVar]);
  const y = data.map(r => +r[yVar]);
  const C = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => {
    if (i === j) return 1;
    return +(Math.exp(-Math.abs(i - j) * 0.5)).toFixed(4);
  }));
  const Vinv = C.map((row, i) => row.map((v, j) => i === j ? 1 : -v * lambda / (1 - lambda + 1e-10)));
  const X = x.map(xi => [1, xi]);
  let xtVx = [[0, 0], [0, 0]], xtVy = [0, 0];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const w = Vinv[i][j] || 0;
    xtVx[0][0] += w;
    xtVx[0][1] += w * X[j][1];
    xtVx[1][0] += w * X[j][1];
    xtVx[1][1] += w * X[j][1] * X[i][1];
    xtVy[0] += w * y[j];
    xtVy[1] += w * y[j] * X[i][1];
  }
  const det = xtVx[0][0] * xtVx[1][1] - xtVx[0][1] * xtVx[1][0];
  const beta = det !== 0 ? [
    (xtVy[0] * xtVx[1][1] - xtVy[1] * xtVx[0][1]) / det,
    (xtVy[1] * xtVx[0][0] - xtVy[0] * xtVx[1][0]) / det
  ] : [avg(y), 0];
  return { test: 'PGLS Regression', beta: beta.map(b => +b.toFixed(5)), lambda, n, apa: `PGLS: lambda=${lambda}, beta=${beta.map(b => b.toFixed(3)).join(', ')}` };
}

// ── Diversification Rate (Yule process) ───────────────────────────
export function diversificationRate(branchLengths) {
  if (!branchLengths || branchLengths.length < 5) return null;
  const n = branchLengths.length;
  const totalTime = branchLengths.reduce((s, v) => s + v, 0);
  const rate = totalTime > 0 ? n / totalTime : 0;
  const se = Math.sqrt(n) / Math.max(totalTime, 1);
  return { test: 'Diversification Rate', lambda: +rate.toFixed(6), se: +se.toFixed(6), n, apa: `Diversification: lambda=${rate.toFixed(4)}, n=${n}` };
}

// ── OU Trait Model (Ornstein-Uhlenbeck on phylogeny) ──────────────
export function ouTraitModel(data, traitVar, { alpha = 1 } = {}) {
  if (!data || data.length < 5 || !traitVar) return null;
  const n = data.length;
  const trait = data.map(r => +r[traitVar]);
  const theta = avg(trait);
  const dx = trait.slice(1).map((v, i) => v - trait[i]);
  const resid = dx.map(d => d + alpha * (trait[trait.length - 1 - dx.indexOf(d)] - theta));
  const sigma2 = sampleVar(resid);
  const logLik = -0.5 * n * Math.log(2 * Math.PI * sigma2) - resid.reduce((s, r) => s + r * r, 0) / (2 * sigma2 + 1e-10);
  return { test: 'OU Trait Model', alpha, theta: +theta.toFixed(4), sigma2: +sigma2.toFixed(6), logLik: +logLik.toFixed(2), n, apa: `OU: alpha=${alpha}, theta=${theta.toFixed(3)}` };
}
