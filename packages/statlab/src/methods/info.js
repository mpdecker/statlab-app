import { avg } from '../math/core.js';

// ── Shannon Entropy ────────────────────────────────────────────────────────
/** @param {number[]} data */
export function shannonEntropy(data, { discrete = true, bins = null } = {}) {
  if (!data || data.length < 3) return null;
  const n = data.length;
  if (new Set(data).size === 1) {
    const ent = 0;
    return { test: 'Shannon Entropy', entropy: 0, type: 'discrete', base: 2, normalized: 0, n, apa: `H = 0 (constant, n = ${n})` };
  }

  if (discrete || bins) {
    const b = bins || [...new Set(data)].length;
    if (bins) {
      const min = Math.min(...data), max = Math.max(...data);
      const width = (max - min) / bins;
      const counts = Array(bins).fill(0);
      data.forEach(v => { const idx = Math.min(bins - 1, Math.floor((v - min) / width)); counts[idx]++; });
      let h = 0;
      counts.forEach(c => { if (c > 0) { const p = c / n; h -= p * Math.log2(p); } });
      const maxH = Math.log2(bins);
      return { test: 'Shannon Entropy', entropy: +h.toFixed(4), type: 'continuous', base: 2, normalized: +(h / Math.max(maxH, 1e-10)).toFixed(4), n, apa: `H = ${h.toFixed(3)} (${bins} bins), n = ${n}` };
    }
    const freqs = {};
    data.forEach(v => { freqs[v] = (freqs[v] || 0) + 1; });
    const k = Object.keys(freqs).length;
    let h = 0;
    for (const key in freqs) { const p = freqs[key] / n; h -= p * Math.log2(p); }
    const maxH = Math.log2(k);
    return { test: 'Shannon Entropy', entropy: +h.toFixed(4), type: 'discrete', base: 2, normalized: +(h / Math.max(maxH, 1e-10)).toFixed(4), n, apa: `H = ${h.toFixed(3)} (${k} unique), n = ${n}` };
  }

  const sd = Math.sqrt(data.reduce((s, v) => s + (v - avg(data)) ** 2, 0) / (n - 1));
  const h = 0.5 * Math.log2(2 * Math.PI * Math.E * sd * sd);
  return { test: 'Shannon Entropy', entropy: +h.toFixed(4), type: 'continuous (normal ref)', base: 2, normalized: null, n, apa: `H ≈ ${h.toFixed(3)} (normal ref, σ = ${sd.toFixed(3)}), n = ${n}` };
}

// ── Mutual Information ─────────────────────────────────────────────────────
/** @param {number[]} x @param {number[]} y */
export function mutualInformation(x, y, { discrete = true, bins = 10 } = {}) {
  if (!x || !y || x.length < 5 || x.length !== y.length) return null;
  const n = x.length;

  let mi = 0;
  if (discrete) {
    const freqs = {};
    const cx = {}, cy = {};
    for (let i = 0; i < n; i++) { cx[x[i]] = (cx[x[i]] || 0) + 1; cy[y[i]] = (cy[y[i]] || 0) + 1; const k = `${x[i]}|${y[i]}`; freqs[k] = (freqs[k] || 0) + 1; }
    for (const k in freqs) {
      const [xi, yi] = k.split('|');
      const pxy = freqs[k] / n;
      const px = cx[xi] / n, py = cy[yi] / n;
      mi += pxy * Math.log2(pxy / (px * py));
    }
  } else {
    const xMin = Math.min(...x), xMax = Math.max(...x);
    const yMin = Math.min(...y), yMax = Math.max(...y);
    const xW = (xMax - xMin) / bins, yW = (yMax - yMin) / bins;
    const jt = Array.from({ length: bins }, () => Array(bins).fill(0));
    const cx = Array(bins).fill(0), cy = Array(bins).fill(0);
    for (let i = 0; i < n; i++) {
      const ix = Math.min(bins - 1, Math.floor((x[i] - xMin) / (xW || 1)));
      const iy = Math.min(bins - 1, Math.floor((y[i] - yMin) / (yW || 1)));
      jt[ix][iy]++; cx[ix]++; cy[iy]++;
    }
    for (let i = 0; i < bins; i++) {
      for (let j = 0; j < bins; j++) {
        if (!jt[i][j]) continue;
        const pxy = jt[i][j] / n;
        const px = cx[i] / n, py = cy[j] / n;
        mi += pxy * Math.log2(pxy / (px * py));
      }
    }
    mi -= (bins - 1) * (bins - 1) / (2 * n);
  }

  let hx = 0, hy = 0;
  if (discrete) {
    const cx = {}, cy = {};
    for (let i = 0; i < n; i++) { cx[x[i]] = (cx[x[i]] || 0) + 1; cy[y[i]] = (cy[y[i]] || 0) + 1; }
    for (const k in cx) { const p = cx[k] / n; hx -= p * Math.log2(p); }
    for (const k in cy) { const p = cy[k] / n; hy -= p * Math.log2(p); }
  }
  const norm = Math.min(hx || mi, hy || mi) > 0 ? mi / Math.min(hx || 1, hy || 1) : 0;

  return {
    test: 'Mutual Information', mi: +mi.toFixed(4), normalized: +norm.toFixed(4), n,
    apa: `MI = ${mi.toFixed(3)} (normalized = ${norm.toFixed(3)}), n = ${n}`,
  };
}

// ── KL Divergence ──────────────────────────────────────────────────────────
/** @param {number} p @param {number} q */
export function klDivergence(p, q, { smoothing = 1e-10 } = {}) {
  if (!p || !q || p.length !== q.length || p.length < 2) return null;
  const n = p.length;
  let sumP = 0, sumQ = 0;
  for (let i = 0; i < n; i++) { sumP += p[i]; sumQ += q[i]; }
  if (!sumP || !sumQ) return null;
  const normP = p.map(v => v / sumP);
  const normQ = q.map(v => v / sumQ);
  let kl = 0;
  for (let i = 0; i < n; i++) {
    if (normP[i] > 0) kl += normP[i] * Math.log2(normP[i] / Math.max(normQ[i], smoothing));
  }
  return {
    test: 'KL Divergence', divergence: +kl.toFixed(4), direction: 'P||Q', n,
    apa: `D_KL(P||Q) = ${kl.toFixed(3)}`,
  };
}

// ── Jensen-Shannon Divergence ──────────────────────────────────────────────
/** @param {number} p @param {number} q */
export function jensenShannonDivergence(p, q) {
  if (!p || !q || p.length !== q.length || p.length < 2) return null;
  const n = p.length;
  let sumP = 0, sumQ = 0;
  for (let i = 0; i < n; i++) { sumP += p[i]; sumQ += q[i]; }
  if (!sumP || !sumQ) return null;
  const np = p.map(v => v / sumP), nq = q.map(v => v / sumQ);
  const m = np.map((v, i) => (v + nq[i]) / 2);
  let jsd = 0;
  for (let i = 0; i < n; i++) {
    if (np[i] > 0) jsd += 0.5 * np[i] * Math.log2(np[i] / Math.max(m[i], 1e-10));
    if (nq[i] > 0) jsd += 0.5 * nq[i] * Math.log2(nq[i] / Math.max(m[i], 1e-10));
  }
  return {
    test: 'Jensen-Shannon Divergence', divergence: +jsd.toFixed(4), distance: +Math.sqrt(Math.max(0, jsd)).toFixed(4), n,
    apa: `JSD = ${jsd.toFixed(3)}, distance = ${Math.sqrt(Math.max(0, jsd)).toFixed(3)}`,
  };
}

// ── AICc ───────────────────────────────────────────────────────────────────
/** @param {number} n @param {number} logLik @param {number} nParams */
export function aicc(logLik, nParams, n) {
  if (!Number.isFinite(logLik) || !Number.isFinite(nParams) || !Number.isFinite(n)) return null;
  if (n <= nParams + 1) return null;
  const aic = -2 * logLik + 2 * nParams;
  const aiccVal = aic + 2 * nParams * (nParams + 1) / (n - nParams - 1);
  return {
    test: 'AICc', aic: +aic.toFixed(2), aicc: +aiccVal.toFixed(2), logLik: +logLik.toFixed(4), nParams, n,
    apa: `AIC = ${aic.toFixed(1)}, AICc = ${aiccVal.toFixed(1)} (${nParams} params, n = ${n})`,
  };
}

// ── BIC Weights ────────────────────────────────────────────────────────────
/** @param {Array<{bic: number}>} models */
export function bicWeights(models) {
  if (!models || models.length < 2) return null;
  const valid = models.filter(m => Number.isFinite(m.bic));
  if (valid.length < 2) return null;
  const minBic = Math.min(...valid.map(m => m.bic));
  const deltas = valid.map(m => ({ ...m, deltaBic: m.bic - minBic }));
  const weights = deltas.map(m => Math.exp(-m.deltaBic / 2));
  const sumW = weights.reduce((s, v) => s + v, 0);
  const results = deltas.map((m, i) => {
    const w = weights[i] / sumW;
    return { name: m.name, bic: +m.bic.toFixed(2), deltaBic: +m.deltaBic.toFixed(2), weight: +w.toFixed(4), evidenceRatio: 0 };
  });
  const bestW = Math.max(...results.map(r => r.weight));
  results.forEach(r => { r.evidenceRatio = +(bestW / Math.max(r.weight, 1e-10)).toFixed(1); });

  return {
    test: 'BIC Weights', models: results, nModels: results.length,
    apa: `BIC weights: ${results.map(r => `${r.name}: ${r.weight.toFixed(3)}`).join(', ')}`,
  };
}
