import { avg, sampleSD } from '../math/core.js';

// ── Laplace Mechanism (Differential Privacy) ───────────────────────────────
export function laplaceMechanism(data, epsilon = 1, { sensitivity = null } = {}) {
  if (!data || !data.length) return null;
  const n = data.length;
  const delta = sensitivity || (Math.max(...data) - Math.min(...data)) / n;
  const scale = delta / Math.max(epsilon, 0.01);
  const noisy = data.map((v, i) => {
    const u = Math.random() - 0.5;
    const lap = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    return +(v + lap).toFixed(6);
  });
  return { test: 'Laplace Mechanism', originalMean: +avg(data).toFixed(4), noisyMean: +avg(noisy).toFixed(4), epsilon, n, apa: `Laplace DP: ε = ${epsilon}, n = ${n}` };
}

// ── Bootstrap Synthetic Data ───────────────────────────────────────────────
export function bootstrapSynthetic(data, { nRow = null, seed = 42 } = {}) {
  if (!data || !data.length) return null;
  const n = data.length;
  const nOut = nRow || n;
  const rng = (s) => { let x = s; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 2 ** 32; }; };
  const rand = rng(seed);
  const synth = [];
  for (let i = 0; i < nOut; i++) {
    const idx = Math.floor(rand() * n);
    synth.push({ ...data[idx] });
  }
  return { test: 'Bootstrap Synthetic', nOriginal: n, nSynthetic: nOut, seed, apa: `Synthetic: ${nOut} rows from ${n}` };
}

// ── K-Anonymity Check ──────────────────────────────────────────────────────
export function kAnonymityCheck(data, quasiIdentifiers, { k = 2 } = {}) {
  if (!data || !data.length || !quasiIdentifiers || !quasiIdentifiers.length) return null;
  const groups = {};
  data.forEach((r, i) => {
    const key = quasiIdentifiers.map(q => r[q]).join('|');
    if (!groups[key]) groups[key] = [];
    groups[key].push(i);
  });
  const sizes = Object.values(groups).map(g => g.length);
  const vulnerable = sizes.filter(s => s < k).reduce((s, v) => s + v, 0);
  const total = data.length;
  return { test: 'K-Anonymity', nGroups: sizes.length, minSize: Math.min(...sizes), vulnerable, k, n: total, pctSafe: +(100 * (total - vulnerable) / total).toFixed(1), apa: `K = ${k}: ${(100 * (total - vulnerable) / total).toFixed(0)}% safe` };
}

// ── Differential Privacy Budget ────────────────────────────────────────────
export function differentialPrivacy(queries, epsilon, delta = 0) {
  if (!queries || !queries.length || epsilon <= 0) return null;
  const n = queries.length;
  const consumed = queries.map(q => q.epsilon || epsilon / n).reduce((s, v) => s + v, 0);
  return { test: 'Differential Privacy', consumed, budget: epsilon, remaining: Math.max(0, epsilon - consumed), delta, apa: `DP: ${consumed.toFixed(2)}/${epsilon} budget used` };
}

// ── Data Masking ───────────────────────────────────────────────────────────
export function dataMasking(data, column, { method = 'swap', pct = 10 } = {}) {
  if (!data || !data.length || !column) return null;
  const n = data.length;
  const masked = data.map(r => ({ ...r }));
  const nMask = Math.max(1, Math.floor(n * pct / 100));
  if (method === 'swap') {
    const indices = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, nMask * 2);
    for (let i = 0; i < indices.length - 1; i += 2) {
      [masked[indices[i]][column], masked[indices[i + 1]][column]] = [masked[indices[i + 1]][column], masked[indices[i]][column]];
    }
  } else if (method === 'suppress') {
    const indices = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, nMask);
    indices.forEach(i => { masked[i][column] = null; });
  }
  return { test: 'Data Masking', nMasked: nMask, method, column, pct, n, apa: `${method}: ${nMask} masked (${pct}%)` };
}
