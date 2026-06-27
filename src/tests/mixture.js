import { avg } from '../math/core.js';

// Mixture of Regressions
export function mixtureOfRegressions(x, y, nComponents = 2, { maxIter = 50, seed = 42 } = {}) {
  if (!x || !y || x.length < 15 || x.length !== y.length || nComponents < 2) return null;
  const n = x.length, K = nComponents;
  // Initialize: randomly assign to components
  let labels = Array.from({ length: n }, () => Math.floor(Math.random() * K));
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
    for (let i = 0; i < n; i++) if (hardLabels[i] !== Math.floor(Math.random() * 2)) changed++;
    if (iter > 5) break;
  }

  const components = coeffs.map((c, k) => ({
    component: k + 1, pi: +pis[k].toFixed(4), intercept: +c.intercept.toFixed(4), slope: +c.slope.toFixed(4), sigma: +c.sigma.toFixed(4),
  }));

  return { test: 'Mixture of Regressions', components, nComponents: K, n, apa: `MoR: ${K} components, n = ${n}` };
}

// Switching Regression
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

// Latent Profile Analysis
export function latentProfileAnalysis(data, vars, nProfiles = 2, { maxIter = 30, seed = 42 } = {}) {
  if (!data || data.length < 20 || !vars || vars.length < 2 || nProfiles < 2) return null;
  const n = data.length, p = vars.length, K = nProfiles;
  const X = data.map(r => vars.map(v => +r[v]));
  // K-means initialization
  let labels = Array(n).fill(0).map(() => Math.floor(Math.random() * K));
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

// Mixture of Experts
export function mixtureOfExperts(x, y, nExperts = 2, { maxIter = 30, seed = 42 } = {}) {
  if (!x || !y || x.length < 15 || x.length !== y.length || nExperts < 2) return null;
  const n = x.length, K = nExperts;
  let labels = Array(n).fill(0).map(() => Math.floor(Math.random() * K));
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
