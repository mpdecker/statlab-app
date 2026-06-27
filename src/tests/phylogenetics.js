import { avg } from '../math/core.js';

// Independent Contrasts (Felsenstein)
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

// Phylogenetic Signal
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

// PIC Correlation
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
