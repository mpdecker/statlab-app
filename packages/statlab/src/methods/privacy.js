import { avg, sampleSD } from '../math/core.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── Laplace Mechanism (Differential Privacy) ───────────────────────────────
/** @param {number[]} data @param {number} [epsilon] */
export function laplaceMechanism(data, epsilon = 1, { seed = 42, sensitivity = null } = {}) {
  __rng = mulberry32(seed);
  if (!data || !data.length) return null;
  const n = data.length;
  const delta = sensitivity || (Math.max(...data) - Math.min(...data)) / n;
  const scale = delta / Math.max(epsilon, 0.01);
  const noisy = data.map((v, i) => {
    const u = __rng() - 0.5;
    const lap = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    return +(v + lap).toFixed(6);
  });
  return { test: 'Laplace Mechanism', originalMean: +avg(data).toFixed(4), noisyMean: +avg(noisy).toFixed(4), epsilon, n, apa: `Laplace DP: ε = ${epsilon}, n = ${n}` };
}

// ── Bootstrap Synthetic Data ───────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data */
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
/** @param {Array<Record<string, any>>} data @param {string[]} quasiIdentifiers */
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
/** @param {Array<{epsilon?: number}>} queries @param {number} epsilon @param {number} [delta] */
export function differentialPrivacy(queries, epsilon, delta = 0) {
  if (!queries || !queries.length || epsilon <= 0) return null;
  const n = queries.length;
  const consumed = queries.map(q => q.epsilon || epsilon / n).reduce((s, v) => s + v, 0);
  return { test: 'Differential Privacy', consumed, budget: epsilon, remaining: Math.max(0, epsilon - consumed), delta, apa: `DP: ${consumed.toFixed(2)}/${epsilon} budget used` };
}

// ── Data Masking ───────────────────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} column */
export function dataMasking(data, column, { seed = 42, method = 'swap', pct = 10 } = {}) {
  __rng = mulberry32(seed);
  if (!data || !data.length || !column) return null;
  const n = data.length;
  const masked = data.map(r => ({ ...r }));
  const nMask = Math.max(1, Math.floor(n * pct / 100));
  if (method === 'swap') {
    const indices = Array.from({ length: n }, (_, i) => i).sort(() => __rng() - 0.5).slice(0, nMask * 2);
    for (let i = 0; i < indices.length - 1; i += 2) {
      [masked[indices[i]][column], masked[indices[i + 1]][column]] = [masked[indices[i + 1]][column], masked[indices[i]][column]];
    }
  } else if (method === 'suppress') {
    const indices = Array.from({ length: n }, (_, i) => i).sort(() => __rng() - 0.5).slice(0, nMask);
    indices.forEach(i => { masked[i][column] = null; });
  }
  return { test: 'Data Masking', nMasked: nMask, method, column, pct, n, apa: `${method}: ${nMask} masked (${pct}%)` };
}

// ── l-Diversity ───────────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {number} [l] @param {string[]} qidCols @param {string} sensitiveCol */
export function lDiversity(data, qidCols, sensitiveCol, l = 2) {
  if (!data || data.length < 5 || !qidCols || !qidCols.length || !sensitiveCol) return null;
  const n = data.length;
  const groups = {};
  data.forEach(r => {
    const key = qidCols.map(c => r[c]).join('|');
    if (!groups[key]) groups[key] = [];
    groups[key].push(r[sensitiveCol]);
  });
  const diverse = Object.values(groups).filter(vals => new Set(vals).size >= l).length;
  const totalGroups = Object.keys(groups).length;
  const proportion = totalGroups > 0 ? diverse / totalGroups : 0;
  return { test: 'l-Diversity', l, diverseGroups: diverse, totalGroups, proportion: +proportion.toFixed(4), n, apa: `l-diversity(l=${l}): ${diverse}/${totalGroups} groups diverse` };
}

// ── t-Closeness ───────────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {number} [t] @param {string[]} qidCols @param {string} sensitiveCol */
export function tCloseness(data, qidCols, sensitiveCol, t = 0.2) {
  if (!data || data.length < 5 || !qidCols || !sensitiveCol) return null;
  const n = data.length;
  const globalDist = freqDist(data.map(r => r[sensitiveCol]));
  const groups = {};
  data.forEach(r => {
    const key = qidCols.map(c => r[c]).join('|');
    if (!groups[key]) groups[key] = [];
    groups[key].push(r[sensitiveCol]);
  });
  let closeCount = 0;
  const totalGroups = Object.keys(groups).length;
  for (const vals of Object.values(groups)) {
    const localDist = freqDist(vals);
    const emdDist = earthMover(localDist, globalDist);
    if (emdDist <= t) closeCount++;
  }
  const proportion = totalGroups > 0 ? closeCount / totalGroups : 0;
  return { test: 't-Closeness', t, closeGroups: closeCount, totalGroups, proportion: +proportion.toFixed(4), n, apa: `t-closeness(t=${t}): ${closeCount}/${totalGroups} close` };
}

function freqDist(arr) {
  const dist = {};
  arr.forEach(v => { dist[v] = (dist[v] || 0) + 1; });
  const total = arr.length || 1;
  Object.keys(dist).forEach(k => { dist[k] /= total; });
  return dist;
}

function earthMover(d1, d2) {
  const keys = [...new Set([...Object.keys(d1), ...Object.keys(d2)])].sort();
  let emd = 0, cum = 0;
  for (const k of keys) {
    cum += (d1[k] || 0) - (d2[k] || 0);
    emd += Math.abs(cum);
  }
  return emd / Math.max(keys.length - 1, 1);
}
