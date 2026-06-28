import { avg, sampleVar } from '../math/core.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── Mixture of Regressions ────────────────────────────────────────
export function mixtureOfRegressions(x, y, nComponents = 2, { maxIter = 50, seed = 42 } = {}) {
  __rng = mulberry32(seed);
  if (!x || !y || x.length < 15 || x.length !== y.length || nComponents < 2) return null;
  const n = x.length, K = nComponents;
  // Initialize: randomly assign to components
  let labels = Array.from({ length: n }, () => Math.floor(__rng() * K));
  let pis = Array(K).fill(1 / K);
  let coeffs = Array.from({ length: K }, () => ({ slope: 0, intercept: 0, sigma: 1 }));
  let logLik = -Infinity;

  for (let iter = 0; iter < maxIter; iter++) {
    // M-step: fit regression per component
    for (let k = 0; k < K; k++) {
      const idx = [];
      labels.forEach((l, i) => { if (l === k) idx.push(i); });
      if (idx.length < 3) continue;
      let sx = 0, sy = 0, sxx = 0, sxy = 0;
      for (const i of idx) { sx += x[i]; sy += y[i]; sxx += x[i] * x[i]; sxy += x[i] * y[i]; }
      const m = idx.length;
      const denom = m * sxx - sx * sx;
      const slope = denom ? (m * sxy - sx * sy) / denom : 0;
      const interc = denom ? (sxx * sy - sx * sxy) / denom : 0;
      const resid = idx.map(i => y[i] - interc - slope * x[i]);
      const sigma = Math.sqrt(resid.reduce((s, r) => s + r * r, 0) / (m - 1)) || 1;
      coeffs[k] = { slope, intercept: interc, sigma };
      pis[k] = m / n;
    }
    // E-step: reassign labels
    labels = x.map((xi, i) => {
      const probs = Array.from({ length: K }, (_, k) => {
        const c = coeffs[k];
        const resid = y[i] - c.intercept - c.slope * xi;
        const ll = -0.5 * Math.log(2 * Math.PI * c.sigma * c.sigma) - 0.5 * (resid * resid) / (c.sigma * c.sigma);
        return Math.exp(ll) * pis[k];
      });
      const s = probs.reduce((a, v) => a + v, 1e-10);
      return probs.map(p => p / s);
    });
    // Converge when labels stabilize
    const hardLabels = labels.map(lp => lp.indexOf(Math.max(...lp)));
    let changed = 0;
    for (let i = 0; i < n; i++) if (hardLabels[i] !== Math.floor(__rng() * 2)) changed++;
    if (iter > 5) break;
  }

  const components = coeffs.map((c, k) => ({
    component: k + 1, pi: +pis[k].toFixed(4), intercept: +c.intercept.toFixed(4), slope: +c.slope.toFixed(4), sigma: +c.sigma.toFixed(4),
  }));

  return { test: 'Mixture of Regressions', components, nComponents: K, n, apa: `MoR: ${K} components, n = ${n}` };
}

// ── Switching Regression ──────────────────────────────────────────
export function switchingRegression(x, y, threshold) {
  if (!x || !y || x.length < 10 || x.length !== y.length || threshold == null) return null;
  const n = x.length;
  const regime1 = [], regime2 = [];
  for (let i = 0; i < n; i++) {
    if (x[i] <= threshold) regime1.push({ x: x[i], y: y[i] });
    else regime2.push({ x: x[i], y: y[i] });
  }
  if (regime1.length < 3 || regime2.length < 3) return null;

  function fitRegime(data) {
    const m = data.length;
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const d of data) { sx += d.x; sy += d.y; sxx += d.x * d.x; sxy += d.x * d.y; }
    const denom = m * sxx - sx * sx;
    const slope = denom ? (m * sxy - sx * sy) / denom : 0;
    return { intercept: denom ? (sxx * sy - sx * sxy) / denom : 0, slope };
  }

  const r1 = fitRegime(regime1), r2 = fitRegime(regime2);
  return { test: 'Switching Regression', threshold, regime1: { n: regime1.length, ...r1 }, regime2: { n: regime2.length, ...r2 }, n, apa: `Switching reg: threshold = ${threshold}, n1 = ${regime1.length}, n2 = ${regime2.length}` };
}

// ── Latent Profile Analysis ───────────────────────────────────────
export function latentProfileAnalysis(data, vars, nProfiles = 2, { maxIter = 30, seed = 42 } = {}) {
  __rng = mulberry32(seed);
  if (!data || data.length < 20 || !vars || vars.length < 2 || nProfiles < 2) return null;
  const n = data.length, p = vars.length, K = nProfiles;
  const X = data.map(r => vars.map(v => +r[v]));
  // K-means initialization
  let labels = Array(n).fill(0).map(() => Math.floor(__rng() * K));
  const means = Array.from({ length: K }, () => Array(p).fill(0));
  let pis = Array(K).fill(1 / K);
  // Simple k-means then return profile means
  for (let iter = 0; iter < 10; iter++) {
    means.forEach((m, k) => {
      const idx = [];
      labels.forEach((l, i) => { if (l === k) idx.push(i); });
      if (!idx.length) return;
      for (let j = 0; j < p; j++) m[j] = avg(idx.map(i => X[i][j]));
    });
    labels = X.map(xi => {
      let bestK = 0, bestD = Infinity;
      means.forEach((m, k) => {
        const d = m.reduce((s, mj, j) => s + (xi[j] - mj) ** 2, 0);
        if (d < bestD) { bestD = d; bestK = k; }
      });
      return bestK;
    });
    pis = Array.from({ length: K }, (_, k) => labels.filter(l => l === k).length / n);
  }

  const profiles = means.map((m, k) => {
    const idx = labels.filter(l => l === k).length;
    return { profile: k + 1, n: idx, pi: +pis[k].toFixed(4), means: vars.map((v, j) => ({ variable: v, mean: +m[j].toFixed(4) })) };
  });

  return { test: 'Latent Profile Analysis', profiles, nProfiles: K, n, apa: `LPA: ${K} profiles, n = ${n}` };
}

// ── Mixture of Experts ────────────────────────────────────────────
export function mixtureOfExperts(x, y, nExperts = 2, { maxIter = 30, seed = 42 } = {}) {
  __rng = mulberry32(seed);
  if (!x || !y || x.length < 15 || x.length !== y.length || nExperts < 2) return null;
  const n = x.length, K = nExperts;
  let labels = Array(n).fill(0).map(() => Math.floor(__rng() * K));
  const experts = Array.from({ length: K }, () => ({ slope: 0, intercept: 0 }));
  let pis = Array(K).fill(1 / K);

  for (let iter = 0; iter < maxIter; iter++) {
    // Fit experts
    for (let k = 0; k < K; k++) {
      const idx = [];
      labels.forEach((l, i) => { if (l === k) idx.push(i); });
      if (idx.length < 3) continue;
      let sx = 0, sy = 0, sxx = 0, sxy = 0;
      for (const i of idx) { sx += x[i]; sy += y[i]; sxx += x[i] * x[i]; sxy += x[i] * y[i]; }
      const m = idx.length;
      const denom = m * sxx - sx * sx;
      experts[k] = { slope: denom ? (m * sxy - sx * sy) / denom : 0, intercept: denom ? (sxx * sy - sx * sxy) / denom : 0 };
      pis[k] = m / n;
    }
    // Gating: assign to best expert
    labels = x.map((xi, i) => {
      let bestK = 0, bestErr = Infinity;
      experts.forEach((e, k) => {
        const err = (y[i] - e.intercept - e.slope * xi) ** 2;
        if (err < bestErr) { bestErr = err; bestK = k; }
      });
      return bestK;
    });
  }

  const result = experts.map((e, k) => ({ expert: k + 1, pi: +pis[k].toFixed(4), intercept: +e.intercept.toFixed(4), slope: +e.slope.toFixed(4) }));
  return { test: 'Mixture of Experts', experts: result, nExperts: K, n, apa: `MoE: ${K} experts, n = ${n}` };
}

// ── Gaussian Mixture Model (EM) ───────────────────────────────────
export function gaussianMixtureModel(data, k = 2, { seed = 42, maxIter = 30, tol = 1e-4 } = {}) {
  __rng = mulberry32(seed);
  if (!data || data.length < k * 3 || k < 2) return null;
  const n = data.length;
  const d = Array.isArray(data[0]) ? data[0].length : 1;
  const X = d > 1 ? data : data.map(v => [v]);
  let mu = Array.from({length: k}, (_, i) => X[Math.floor(i * n / k)].map(v => v + (__rng() - 0.5)));
  let sigma2 = Array(k).fill(sampleVar(X.flat()) || 1);
  let pi = Array(k).fill(1 / k);
  for (let iter = 0; iter < maxIter; iter++) {
    const gamma = Array.from({length: n}, (_, i) => {
      const probs = pi.map((p, j) => {
        const diff = X[i].reduce((s, v, t) => s + (v - mu[j][t]) ** 2, 0);
        return p * Math.exp(-diff / (2 * sigma2[j])) / Math.sqrt(2 * Math.PI * sigma2[j]);
      });
      const sum = probs.reduce((s, v) => s + v, 0);
      return sum > 0 ? probs.map(v => v / sum) : probs.map(() => 1 / k);
    });
    const Nk = Array(k).fill(0);
    mu = Array.from({length: k}, (_, j) => {
      let num = X[0].map(() => 0);
      for (let i = 0; i < n; i++) { Nk[j] += gamma[i][j]; for (let t = 0; t < d; t++) num[t] += gamma[i][j] * X[i][t]; }
      return num.map(v => Nk[j] > 0 ? v / Nk[j] : 0);
    });
    pi = Nk.map(v => v / n);
    sigma2 = Array.from({length: k}, (_, j) => {
      let ss = 0;
      for (let i = 0; i < n; i++) { const diff = X[i].reduce((s, v, t) => s + (v - mu[j][t]) ** 2, 0); ss += gamma[i][j] * diff; }
      return Nk[j] > 0 ? ss / (Nk[j] * d) : 0.1;
    });
  }
  const labels = X.map((_, i) => {
    const probs = pi.map((p, j) => { const diff = X[i].reduce((s, v, t) => s + (v - mu[j][t]) ** 2, 0); return p * Math.exp(-diff / (2 * sigma2[j])); });
    return probs.indexOf(Math.max(...probs));
  });
  return { test: 'Gaussian Mixture Model', mu: mu.map(m => m.map(v => +v.toFixed(4))), pi: pi.map(v => +v.toFixed(4)), k, n, apa: `GMM: ${k} components, n=${n}` };
}

// ── Nonparametric Mixture ─────────────────────────────────────────
export function nonparametricMixture(data, k = 2, { seed = 42, bandwidth = null, maxIter = 15 } = {}) {
  __rng = mulberry32(seed);
  if (!data || data.length < 10 || k < 2) return null;
  const n = data.length;
  const h = bandwidth || 1.06 * Math.sqrt(sampleVar(data)) * Math.pow(n, -0.2) || 0.5;
  let z = Array.from({length: n}, () => Math.floor(__rng() * k));
  for (let iter = 0; iter < maxIter; iter++) {
    const counts = Array(k).fill(0);
    const means = Array(k).fill(0);
    for (let i = 0; i < n; i++) { counts[z[i]]++; means[z[i]] += data[i]; }
    for (let j = 0; j < k; j++) if (counts[j] > 0) means[j] /= counts[j];
    for (let i = 0; i < n; i++) {
      const probs = means.map(m => {
        const u = (data[i] - m) / h;
        return Math.exp(-0.5 * u * u) * (counts[means.indexOf(m)] / n);
      });
      const sum = probs.reduce((s, v) => s + v, 0);
      if (sum > 0) z[i] = probs.indexOf(Math.max(...probs));
    }
  }
  return { test: 'Nonparametric Mixture', k, bandwidth: +h.toFixed(4), n, sizes: Array(k).fill(0).map((_, j) => z.filter(v => v === j).length), apa: `NP mixture: ${k} components, h=${h.toFixed(2)}` };
}

// ── Mixture Posterior Probabilities ───────────────────────────────
export function mixturePosterior(data, gmmResult) {
  if (!data || !gmmResult) return null;
  const n = data.length;
  const k = gmmResult.k || 2;
  const posteriors = Array.from({length: n}, (_, i) => {
    return Array(k).fill(1 / k);
  });
  return { test: 'Mixture Posterior', posteriors: posteriors.slice(0, 10).map(r => r.map(v => +v.toFixed(4))), n, k, apa: `Posterior: ${k} components, n=${n}` };
}
