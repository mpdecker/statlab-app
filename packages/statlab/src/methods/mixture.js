import { avg, sampleVar } from '../math/core.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── Mixture of Regressions ────────────────────────────────────────
/** @param {number[]} x @param {number[]} y @param {number} [nComponents] */
export function mixtureOfRegressions(x, y, nComponents = 2, { maxIter = 50, seed = 42 } = {}) {
  __rng = mulberry32(seed);
  if (!x || !y || x.length < 15 || x.length !== y.length || nComponents < 2) return null;
  const n = x.length, K = nComponents;
  const tol = 1e-7;
  // Initialise responsibilities from a random hard partition (one-hot rows).
  let gamma = Array.from({ length: n }, () => {
    const k = Math.floor(__rng() * K);
    return Array.from({ length: K }, (_, j) => (j === k ? 1 : 0));
  });
  let pis = Array(K).fill(1 / K);
  let coeffs = Array.from({ length: K }, () => ({ slope: 0, intercept: 0, sigma: 1 }));
  let prevLL = -Infinity;

  for (let iter = 0; iter < maxIter; iter++) {
    // M-step: weighted least squares per component (weights = responsibilities γ_ik).
    for (let k = 0; k < K; k++) {
      let sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
      for (let i = 0; i < n; i++) {
        const w = gamma[i][k];
        sw += w; sx += w * x[i]; sy += w * y[i]; sxx += w * x[i] * x[i]; sxy += w * x[i] * y[i];
      }
      if (sw < 1e-8) continue;
      const denom = sw * sxx - sx * sx;
      const slope = Math.abs(denom) > 1e-12 ? (sw * sxy - sx * sy) / denom : 0;
      const interc = (sy - slope * sx) / sw;
      let ss = 0;
      for (let i = 0; i < n; i++) { const r = y[i] - interc - slope * x[i]; ss += gamma[i][k] * r * r; }
      const sigma = Math.max(Math.sqrt(ss / sw) || 0, 1e-3);
      coeffs[k] = { slope, intercept: interc, sigma };
      pis[k] = sw / n;
    }
    // E-step: responsibilities γ_ik ∝ π_k·N(y_i; a_k+b_k x_i, σ_k²); accumulate log-lik.
    let ll = 0;
    gamma = x.map((xi, i) => {
      const probs = coeffs.map((c, k) => {
        const r = y[i] - c.intercept - c.slope * xi;
        const dens = Math.exp(-0.5 * (r * r) / (c.sigma * c.sigma)) / (Math.sqrt(2 * Math.PI) * c.sigma);
        return pis[k] * dens;
      });
      const s = probs.reduce((a, v) => a + v, 0);
      ll += Math.log(s + 1e-300);
      return s > 0 ? probs.map(p => p / s) : probs.map(() => 1 / K);
    });
    if (Math.abs(ll - prevLL) < tol) { prevLL = ll; break; }
    prevLL = ll;
  }

  const components = coeffs.map((c, k) => ({
    component: k + 1, pi: +pis[k].toFixed(4), intercept: +c.intercept.toFixed(4), slope: +c.slope.toFixed(4), sigma: +c.sigma.toFixed(4),
  }));

  return { test: 'Mixture of Regressions', components, nComponents: K, n, logLik: +prevLL.toFixed(4), apa: `MoR: ${K} components, n = ${n}` };
}

// ── Switching Regression ──────────────────────────────────────────
/** @param {number[]} x @param {number[]} y @param {number} threshold */
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

// ── Latent Profile Analysis (Gaussian mixture EM, class-varying diagonal Σ) ──
// LPA is a finite mixture of multivariate Gaussians over continuous indicators
// with local independence within class (diagonal covariance). Fit by EM with
// soft responsibilities (not k-means hard assignment); reports logLik/BIC/AIC
// for the model-selection workflow LPA is normally used for (choosing K).
/** @param {Array<Record<string, any>>} data @param {string[]} vars @param {number} [nProfiles] */
export function latentProfileAnalysis(data, vars, nProfiles = 2, { maxIter = 100, seed = 42, tol = 1e-6 } = {}) {
  __rng = mulberry32(seed);
  if (!data || data.length < 20 || !vars || vars.length < 2 || nProfiles < 2) return null;
  const n = data.length, p = vars.length, K = nProfiles;
  const X = data.map(r => vars.map(v => +r[v]));
  const colSd = Array.from({ length: p }, (_, j) => Math.sqrt(sampleVar(X.map(r => r[j]))) || 1);
  let mu = Array.from({ length: K }, (_, k) => X[Math.floor((k + 0.5) * n / K)].slice());
  let sigma2 = Array.from({ length: K }, () => colSd.map(s => s * s));
  let pis = Array(K).fill(1 / K);
  let gamma = Array.from({ length: n }, () => Array(K).fill(1 / K));
  let logLik = -Infinity, prevLL = -Infinity;

  const logDens = (xi, muk, sig2k) => {
    let ll = 0;
    for (let j = 0; j < p; j++) { const s2 = Math.max(sig2k[j], 1e-8), d = xi[j] - muk[j]; ll += -0.5 * Math.log(2 * Math.PI * s2) - 0.5 * d * d / s2; }
    return ll;
  };

  for (let iter = 0; iter < maxIter; iter++) {
    // E-step (log-sum-exp for numerical stability)
    let ll = 0;
    gamma = X.map(xi => {
      const logp = mu.map((muk, k) => Math.log(pis[k] + 1e-300) + logDens(xi, muk, sigma2[k]));
      const m = Math.max(...logp);
      const w = logp.map(lp => Math.exp(lp - m));
      const s = w.reduce((a, b) => a + b, 0);
      ll += m + Math.log(s + 1e-300);
      return w.map(v => v / s);
    });
    logLik = ll;
    if (Math.abs(ll - prevLL) < tol) break;
    prevLL = ll;
    // M-step
    const Nk = Array(K).fill(0);
    for (let i = 0; i < n; i++) for (let k = 0; k < K; k++) Nk[k] += gamma[i][k];
    mu = Array.from({ length: K }, (_, k) => {
      const m = Array(p).fill(0);
      for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) m[j] += gamma[i][k] * X[i][j];
      return m.map(v => (Nk[k] > 1e-8 ? v / Nk[k] : v));
    });
    sigma2 = Array.from({ length: K }, (_, k) => {
      const s2 = Array(p).fill(0);
      for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) { const d = X[i][j] - mu[k][j]; s2[j] += gamma[i][k] * d * d; }
      return s2.map(v => (Nk[k] > 1e-8 ? Math.max(v / Nk[k], 1e-6) : 1));
    });
    pis = Nk.map(v => v / n);
  }

  const labels = gamma.map(g => g.indexOf(Math.max(...g)));
  const nParams = K * p * 2 + (K - 1); // class means + class variances + mixing proportions
  const bic = -2 * logLik + nParams * Math.log(n);
  const aic = -2 * logLik + 2 * nParams;
  const profiles = mu.map((m, k) => ({
    profile: k + 1, n: labels.filter(l => l === k).length, pi: +pis[k].toFixed(4),
    means: vars.map((v, j) => ({ variable: v, mean: +m[j].toFixed(4), sd: +Math.sqrt(sigma2[k][j]).toFixed(4) })),
  }));

  return { test: 'Latent Profile Analysis', profiles, nProfiles: K, n, logLik: +logLik.toFixed(4), bic: +bic.toFixed(4), aic: +aic.toFixed(4), apa: `LPA: ${K} profiles (EM), logLik = ${logLik.toFixed(1)}, BIC = ${bic.toFixed(1)}` };
}

// ── Mixture of Experts (Jacobs, Jordan, Nowlan & Hinton 1991) ──────
// A real MoE has an input-dependent *gating network* (here, multinomial
// softmax logits linear in x) that soft-assigns each point to experts, plus
// per-expert linear regressions. EM alternates: E-step soft responsibilities
// γ_ik ∝ gate_k(x_i)·N(y_i; expert_k(x_i), σ_k²); M-step refits each expert by
// weighted least squares and nudges the gate toward γ by gradient ascent on
// the (weighted) multinomial cross-entropy. This replaces hard nearest-expert
// assignment with the soft, jointly-trained gate that defines "mixture of
// experts" as distinct from a plain mixture of regressions.
/** @param {number[]} x @param {number[]} y @param {number} [nExperts] */
export function mixtureOfExperts(x, y, nExperts = 2, { maxIter = 60, seed = 42, gateLR = 0.5, gateSteps = 5 } = {}) {
  __rng = mulberry32(seed);
  if (!x || !y || x.length < 15 || x.length !== y.length || nExperts < 2) return null;
  const n = x.length, K = nExperts;
  const mx = avg(x), sx = Math.sqrt(sampleVar(x)) || 1;
  const xs = x.map(v => (v - mx) / sx);
  let W = Array.from({ length: K }, () => [(__rng() - 0.5) * 0.1, (__rng() - 0.5) * 0.1]);
  const experts = Array.from({ length: K }, () => ({ slope: 0, intercept: 0, sigma: 1 }));
  const gate = (xi) => {
    const logits = W.map(w => w[0] + w[1] * xi);
    const m = Math.max(...logits);
    const e = logits.map(l => Math.exp(l - m));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map(v => v / s);
  };
  // Break symmetry with a random hard partition (a near-uniform gate would keep both
  // experts fit to the same average line and never differentiate).
  let gamma = Array.from({ length: n }, () => {
    const k = Math.floor(__rng() * K);
    return Array.from({ length: K }, (_, j) => (j === k ? 1 : 0));
  });
  let logLik = -Infinity, prevLL = -Infinity;

  for (let iter = 0; iter < maxIter; iter++) {
    // M-step: experts via responsibility-weighted least squares.
    for (let k = 0; k < K; k++) {
      let sw = 0, sxk = 0, sy = 0, sxx = 0, sxy = 0;
      for (let i = 0; i < n; i++) { const w = gamma[i][k]; sw += w; sxk += w * x[i]; sy += w * y[i]; sxx += w * x[i] * x[i]; sxy += w * x[i] * y[i]; }
      if (sw < 1e-6) continue;
      const denom = sw * sxx - sxk * sxk;
      const slope = Math.abs(denom) > 1e-10 ? (sw * sxy - sxk * sy) / denom : 0;
      const interc = (sy - slope * sxk) / sw;
      let ss = 0; for (let i = 0; i < n; i++) { const r = y[i] - interc - slope * x[i]; ss += gamma[i][k] * r * r; }
      experts[k] = { slope, intercept: interc, sigma: Math.max(Math.sqrt(ss / sw) || 0, 1e-3) };
    }
    // M-step: gating network — weighted gradient-ascent steps of multinomial
    // logistic regression toward the current soft responsibilities.
    for (let g = 0; g < gateSteps; g++) {
      const grad = Array.from({ length: K }, () => [0, 0]);
      for (let i = 0; i < n; i++) {
        const p = gate(xs[i]);
        for (let k = 0; k < K; k++) { const err = gamma[i][k] - p[k]; grad[k][0] += err; grad[k][1] += err * xs[i]; }
      }
      for (let k = 0; k < K; k++) { W[k][0] += gateLR * grad[k][0] / n; W[k][1] += gateLR * grad[k][1] / n; }
    }
    // E-step: soft responsibilities ∝ gate(x)·N(y; expert(x), σ²)
    let ll = 0;
    gamma = x.map((xi, i) => {
      const g = gate(xs[i]);
      const probs = experts.map((e, k) => {
        const r = y[i] - e.intercept - e.slope * xi;
        return g[k] * Math.exp(-0.5 * (r * r) / (e.sigma * e.sigma)) / (Math.sqrt(2 * Math.PI) * e.sigma);
      });
      const s = probs.reduce((a, v) => a + v, 0);
      ll += Math.log(s + 1e-300);
      return s > 0 ? probs.map(p => p / s) : g;
    });
    logLik = ll;
    if (Math.abs(ll - prevLL) < 1e-7) break;
    prevLL = ll;
  }

  const avgPi = Array.from({ length: K }, (_, k) => avg(gamma.map(g => g[k])));
  const result = experts.map((e, k) => ({ expert: k + 1, pi: +avgPi[k].toFixed(4), intercept: +e.intercept.toFixed(4), slope: +e.slope.toFixed(4), sigma: +e.sigma.toFixed(4) }));
  return { test: 'Mixture of Experts', experts: result, nExperts: K, n, logLik: +logLik.toFixed(4), apa: `MoE: ${K} experts (soft gating), n = ${n}, logLik = ${logLik.toFixed(1)}` };
}

// ── Gaussian Mixture Model (EM) ───────────────────────────────────
/** @param {number[][]} data @param {number} [k] */
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
  return { test: 'Gaussian Mixture Model', mu: mu.map(m => m.map(v => +v.toFixed(4))), pi: pi.map(v => +v.toFixed(4)), sigma2: sigma2.map(v => +v.toFixed(6)), k, n, apa: `GMM: ${k} components, n=${n}` };
}

// ── Nonparametric Mixture (weighted-KDE EM; Benaglia et al. 2009 npEM) ────
// Component densities are not assumed Gaussian: each f_j is re-estimated every
// iteration as a leave-one-out kernel density weighted by the current soft
// responsibilities, f_j(x_i) = Σ_{l≠i} γ_lj K((x_i-x_l)/h) / (h Σ_{l≠i} γ_lj).
// E-step then updates γ ∝ π_j f_j(x_i) from that nonparametric density — real
// alternation between a density estimate and soft cluster membership, not a
// single hard nearest-kernel-mode reassignment.
/** @param {number[]} data @param {number} [k] */
export function nonparametricMixture(data, k = 2, { seed = 42, bandwidth = null, maxIter = 40, tol = 1e-6 } = {}) {
  __rng = mulberry32(seed);
  if (!data || data.length < 10 || k < 2) return null;
  const n = data.length;
  const h = bandwidth || 1.06 * Math.sqrt(sampleVar(data)) * Math.pow(n, -0.2) || 0.5;
  const kernel = (u) => Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
  const sorted = [...data].sort((a, b) => a - b);
  // Span initial centers across the full sorted range (not equal-mass quantiles), so an
  // unbalanced mixture still seeds one center inside each component's support.
  const centers = Array.from({ length: k }, (_, j) => sorted[Math.round(j * (n - 1) / (k - 1))]);
  let gamma = data.map(xi => {
    const d = centers.map(c => Math.exp(-0.5 * ((xi - c) / h) ** 2));
    const s = d.reduce((a, b) => a + b, 0);
    return s > 0 ? d.map(v => v / s) : d.map(() => 1 / k);
  });
  let pis = Array(k).fill(1 / k);
  let logLik = -Infinity, prevLL = -Infinity;

  for (let iter = 0; iter < maxIter; iter++) {
    // M-step: leave-one-out weighted KDE density per component at every data point.
    const dens = Array.from({ length: n }, () => Array(k).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < k; j++) {
        let num = 0, wj = 0;
        for (let l = 0; l < n; l++) {
          if (l === i) continue;
          num += gamma[l][j] * kernel((data[i] - data[l]) / h);
          wj += gamma[l][j];
        }
        dens[i][j] = wj > 1e-8 ? num / (wj * h) : 1e-300;
      }
    }
    // E-step
    let ll = 0;
    gamma = data.map((_, i) => {
      const probs = pis.map((p, j) => p * dens[i][j]);
      const s = probs.reduce((a, v) => a + v, 0);
      ll += Math.log(s + 1e-300);
      return s > 0 ? probs.map(v => v / s) : probs.map(() => 1 / k);
    });
    pis = Array.from({ length: k }, (_, j) => avg(gamma.map(g => g[j])));
    logLik = ll;
    if (Math.abs(ll - prevLL) < tol) break;
    prevLL = ll;
  }

  const labels = gamma.map(g => g.indexOf(Math.max(...g)));
  return { test: 'Nonparametric Mixture', k, bandwidth: +h.toFixed(4), n, pis: pis.map(v => +v.toFixed(4)), sizes: Array(k).fill(0).map((_, j) => labels.filter(l => l === j).length), logLik: +logLik.toFixed(4), apa: `NP mixture: ${k} components (weighted-KDE EM), h = ${h.toFixed(2)}, logLik = ${logLik.toFixed(1)}` };
}

// ── Mixture Posterior Probabilities ───────────────────────────────
/** @param {Array<Record<string, any>>} data */
export function mixturePosterior(data, gmmResult) {
  if (!data || !data.length || !gmmResult || !gmmResult.mu || !gmmResult.pi) return null;
  const n = data.length;
  const mu = gmmResult.mu;
  const k = gmmResult.k || mu.length;
  const pi = gmmResult.pi;
  const d = mu[0].length;
  const sigma2 = gmmResult.sigma2 || Array(k).fill(1);
  // Coerce each observation to a numeric vector matching the component dimension.
  const X = data.map(row => (Array.isArray(row) ? row.map(Number) : [Number(row)]));
  // Bayes responsibility γ_ij = π_j N(x_i; μ_j, σ²_j I) / Σ_l π_l N(x_i; μ_l, σ²_l I).
  const posteriors = X.map(xi => {
    const probs = pi.map((p, j) => {
      let diff = 0;
      for (let t = 0; t < d; t++) { const e = (xi[t] ?? 0) - mu[j][t]; diff += e * e; }
      const s2 = Math.max(sigma2[j], 1e-12);
      return p * Math.exp(-diff / (2 * s2)) / Math.pow(2 * Math.PI * s2, d / 2);
    });
    const sum = probs.reduce((a, b) => a + b, 0);
    return sum > 0 ? probs.map(v => v / sum) : probs.map(() => 1 / k);
  });
  return { test: 'Mixture Posterior', posteriors: posteriors.slice(0, 10).map(r => r.map(v => +v.toFixed(4))), n, k, apa: `Posterior: ${k} components, n=${n}` };
}
