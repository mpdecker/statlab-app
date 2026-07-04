import { avg, sampleSD, corr, sampleVar } from '../math/core.js';
import { normalCDF, normalINV } from '../math/distributions.js';
import { matInv } from '../math/matrix.js';

// Helpers
function lcg(seed) { let s = seed >>> 0; return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 2 ** 32; }; }

function boxMuller(rand) {
  const u1 = rand(), u2 = rand();
  return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
}

// Pseudo-observations via average-rank empirical CDF (standard method for
// copula fitting). `sorted.indexOf(v)` (the previous approach) returns only
// the FIRST matching position, so every tied value collapsed onto the same
// rank instead of the tied (average) rank — biased whenever the data has
// any repeated values, which is the common case for real/rounded data.
function pseudoObs(col) {
  const n = col.length;
  const order = col.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = Array(n).fill(0);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n - 1 && order[j + 1].v === order[i].v) j++;
    const avgRank = (i + j) / 2; // 0-indexed average rank across the tied block
    for (let k = i; k <= j; k++) ranks[order[k].i] = avgRank;
    i = j + 1;
  }
  return ranks.map(r => (r + 0.5) / n);
}

// ── Gaussian Copula ────────────────────────────────────────────────────────
export function gaussianCopula(data, vars, { seed = 42 } = {}) {
  if (!data || data.length < 10 || !vars || vars.length < 2) return null;
  const n = data.length, d = vars.length;
  const X = data.map(r => vars.map(v => +r[v]));
  if (X.some(r => r.some(v => !Number.isFinite(v)))) return null;
  const R = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => corr(X.map(r => r[i]), X.map(r => r[j]))));
  const invR = matInv(R);
  if (!invR) return null;
  // Pseudo-observations: empirical CDF transformation
  const u = Array.from({ length: d }, (_, j) => {
    const col = X.map(r => r[j]);
    return pseudoObs(col);
  });
  // Simulate a few points
  const rand = lcg(seed);
  const sim = [];
  for (let s = 0; s < 10; s++) {
    const z = Array(d).fill(0).map(() => boxMuller(rand));
    const yn = Array(d).fill(0);
    // Cholesky decomposition of R into L
    const L = Array.from({ length: d }, () => Array(d).fill(0));
    for (let i = 0; i < d; i++) for (let j = 0; j <= i; j++) {
      L[i][j] = R[i][j];
      for (let k = 0; k < j; k++) L[i][j] -= L[i][k] * L[j][k];
      L[i][j] = j < i ? L[i][j] / L[j][j] : Math.sqrt(Math.max(L[i][j], 1e-10));
    }
    for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) yn[i] += L[i][j] * z[j];
    sim.push(yn.map(v => +normalCDF(v).toFixed(4)));
  }
  return {
    test: 'Gaussian Copula', correlation: R, pseudoObs: u.slice(0, 5).map(col => col.slice(0, 5).map(v => +v.toFixed(4))), simulated: sim, n, d,
    apa: `Gaussian copula: ${d} dimensions, n = ${n}`,
  };
}

// ── t-Copula ────────────────────────────────────────────────────────────────
export function tCopula(data, vars, { nu = 4, seed = 42 } = {}) {
  if (!data || data.length < 10 || !vars || vars.length < 2) return null;
  const n = data.length, d = vars.length;
  const X = data.map(r => vars.map(v => +r[v]));
  if (X.some(r => r.some(v => !Number.isFinite(v)))) return null;
  const R = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => corr(X.map(r => r[i]), X.map(r => r[j]))));

  // Simulate
  const rand = lcg(seed);
  const sim = [];
  for (let s = 0; s < 5; s++) {
    const chi = Math.sqrt(Math.max(0.5, math_gamma(nu / 2, rand())));
    const z = Array(d).fill(0).map(() => boxMuller(rand) / Math.sqrt(chi * 2 / nu));
    const L = Array.from({ length: d }, () => Array(d).fill(0));
    for (let i = 0; i < d; i++) for (let j = 0; j <= i; j++) {
      L[i][j] = R[i][j];
      for (let k = 0; k < j; k++) L[i][j] -= L[i][k] * L[j][k];
      L[i][j] = j < i ? L[i][j] / L[j][j] : Math.sqrt(Math.max(L[i][j], 1e-10));
    }
    const yn = Array(d).fill(0);
    for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) yn[i] += L[i][j] * z[j];
    sim.push(yn.map(v => +normalCDF(v).toFixed(4)));
  }

  return {
    test: 't-Copula', correlation: R, nu, simulated: sim, n, d,
    apa: `t-copula (nu=${nu}): ${d} dimensions, n = ${n}`,
  };
}

function math_gamma(shape, rand) {
  if (shape < 1) { const u = rand(); return math_gamma(shape + 1, rand) * Math.pow(Math.max(u, 1e-10), 1 / shape); }
  const d = shape - 1 / 3, c = 1 / Math.sqrt(9 * d);
  while (true) {
    let x, v;
    do { x = boxMuller(rand); } while (x <= -1 / c);
    x = x < 1 / c ? x : 1 / c - 0.001;
    v = (1 + c * Math.min(x, 10)) ** 3;
    const u = rand();
    if (u < 1 - 0.0331 * x ** 4) return d * v;
    if (Math.log(Math.max(u, 1e-10)) < 0.5 * x ** 2 + d * (1 - v + Math.log(Math.max(v, 1e-10)))) return d * v;
  }
}

// ── Clayton Copula ──────────────────────────────────────────────────────────
export function claytonCopula(data, vars, { theta = 2, seed = 42 } = {}) {
  if (!data || data.length < 10 || !vars || vars.length < 2) return null;
  const n = data.length, d = vars.length;
  if (theta <= 0) return null;
  // Pseudo-observations
  const u = Array.from({ length: d }, (_, j) => {
    const col = data.map(r => +r[vars[j]]);
    return pseudoObs(col);
  });
  // Kendall's tau -> theta
  let tau = 0;
  for (let j = 0; j < d; j++) for (let k = j + 1; k < d; k++) {
    let concordant = 0, discordant = 0;
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      if ((u[j][a] - u[j][b]) * (u[k][a] - u[k][b]) > 0) concordant++;
      else discordant++;
    }
    const total = concordant + discordant;
    if (total) tau = Math.max(tau, (concordant - discordant) / total);
  }
  const fittedTheta = Math.max(0.01, 2 * tau / (1 - tau));
  // Lower tail dependence
  const lambdaL = theta > 0 ? Math.pow(2, -1 / theta) : 0;
  return {
    test: 'Clayton Copula', theta: +theta.toFixed(4), fittedTheta: +fittedTheta.toFixed(4), tau: +tau.toFixed(4), tailDependence: { lower: +lambdaL.toFixed(4) }, n, d,
    apa: `Clayton: theta = ${theta.toFixed(2)}, tau = ${tau.toFixed(3)}, lower tail dep = ${lambdaL.toFixed(3)}`,
  };
}

// ── Gumbel Copula ───────────────────────────────────────────────────────────
export function gumbelCopula(data, vars, { theta = 2, seed = 42 } = {}) {
  if (!data || data.length < 10 || !vars || vars.length < 2) return null;
  const n = data.length, d = vars.length;
  if (theta < 1) return null;
  const u = Array.from({ length: d }, (_, j) => {
    const col = data.map(r => +r[vars[j]]);
    return pseudoObs(col);
  });
  let tau = 0, count = 0;
  for (let j = 0; j < d; j++) for (let k = j + 1; k < d; k++) {
    let concordant = 0, discordant = 0;
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      if ((u[j][a] - u[j][b]) * (u[k][a] - u[k][b]) > 0) concordant++;
      else discordant++;
    }
    const total = concordant + discordant;
    if (total) { tau = Math.max(tau, (concordant - discordant) / total); count++; }
  }
  const fittedTheta = tau > 0 ? 1 / (1 - tau) : 1.1;
  const lambdaU = theta > 1 ? 2 - Math.pow(2, 1 / theta) : 0;
  return {
    test: 'Gumbel Copula', theta: +theta.toFixed(4), fittedTheta: +fittedTheta.toFixed(4), tau: +tau.toFixed(4), tailDependence: { upper: +lambdaU.toFixed(4) }, n, d,
    apa: `Gumbel: theta = ${theta.toFixed(2)}, tau = ${tau.toFixed(3)}, upper tail dep = ${lambdaU.toFixed(3)}`,
  };
}

// ── Frank Copula ────────────────────────────────────────────────────────────
export function frankCopula(data, vars, { theta = 2, seed = 42 } = {}) {
  if (!data || data.length < 10 || !vars || vars.length < 2) return null;
  const n = data.length, d = vars.length;
  const u = Array.from({ length: d }, (_, j) => {
    const col = data.map(r => +r[vars[j]]);
    return pseudoObs(col);
  });
  let tau = 0;
  for (let j = 0; j < d; j++) for (let k = j + 1; k < d; k++) {
    let concordant = 0, discordant = 0;
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      if ((u[j][a] - u[j][b]) * (u[k][a] - u[k][b]) > 0) concordant++;
      else discordant++;
    }
    const total = concordant + discordant;
    if (total) tau = Math.max(tau, (concordant - discordant) / total);
  }
  const fittedTheta = tau > 0 && tau < 1 ? Math.max(0.01, (Math.log1p(1 - tau) + Math.log1p(tau)) / Math.LN2) : 2;
  return {
    test: 'Frank Copula', theta: +theta.toFixed(4), fittedTheta: +fittedTheta.toFixed(4), tau: +tau.toFixed(4), n, d,
    apa: `Frank: theta = ${theta.toFixed(2)}, tau = ${tau.toFixed(3)}`,
  };
}

// ── Copula Fit ──────────────────────────────────────────────────────────────
export function copulaFit(data, vars, { family = 'gaussian', seed = 42 } = {}) {
  if (family === 'gaussian') return gaussianCopula(data, vars, { seed });
  if (family === 't') return tCopula(data, vars, { seed });
  if (family === 'clayton') return claytonCopula(data, vars, { seed });
  if (family === 'gumbel') return gumbelCopula(data, vars, { seed });
  if (family === 'frank') return frankCopula(data, vars, { seed });
  return null;
}

// ── Tail Dependence ─────────────────────────────────────────────────────────
export function tailDependence(copulaFit) {
  if (!copulaFit || !copulaFit.tailDependence) return null;
  return {
    test: 'Tail Dependence',
    lower: copulaFit.tailDependence.lower != null ? copulaFit.tailDependence.lower : null,
    upper: copulaFit.tailDependence.upper != null ? copulaFit.tailDependence.upper : null,
    apa: `Tail dep: lower = ${copulaFit.tailDependence.lower ?? 'N/A'}, upper = ${copulaFit.tailDependence.upper ?? 'N/A'}`,
  };
}
