import { avg } from '../math/core.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── Simulated Annealing ───────────────────────────────────────────
/** @param {Function} fn @param {number[]} init */
export function simulatedAnnealing(fn, init, { seed = 42, temp = 1000, cooling = 0.99, steps = 200 } = {}) {
  __rng = mulberry32(seed);
  if (!fn || !init) return null;
  let x = [...init]; let best = [...x]; let fx = fn(x); let bestFx = fx;
  let T = temp; const n = init.length;
  const history = [{ step: 0, value: +fx.toFixed(4), best: +bestFx.toFixed(4) }];
  for (let s = 1; s <= steps; s++) {
    const candidate = x.map(v => v + (__rng() - 0.5) * 2);
    const fc = fn(candidate);
    if (fc < fx || __rng() < Math.exp(-(fc - fx) / Math.max(T, 0.001))) { x = candidate; fx = fc; }
    if (fx < bestFx) { best = [...x]; bestFx = fx; }
    T *= cooling;
    if (s % 50 === 0) history.push({ step: s, value: +fx.toFixed(4), best: +bestFx.toFixed(4) });
  }
  return { test: 'Simulated Annealing', optimum: best.map(v => +v.toFixed(4)), value: +bestFx.toFixed(4), steps, init: init.map(v => +v.toFixed(4)), n, apa: `SA: minimum = ${bestFx.toFixed(4)}` };
}

// ── Genetic Algorithm ─────────────────────────────────────────────
export function geneticAlgorithm(fitness, population, { seed = 42, generations = 50, mutationRate = 0.1 } = {}) {
  __rng = mulberry32(seed);
  if (!fitness || !population || !population.length) return null;
  const n = population.length; const gSize = population[0]?.length || 0;
  let pop = population.map(p => ({ genes: [...p], fitness: fitness(p) }));
  let best = pop.reduce((b, p) => p.fitness < b.fitness ? p : b, pop[0]);
  for (let gen = 1; gen <= generations; gen++) {
    pop.sort((a, b) => a.fitness - b.fitness);
    const newPop = pop.slice(0, Math.floor(n / 2));
    while (newPop.length < n) {
      const p1 = pop[Math.floor(__rng() * n / 2)];
      const p2 = pop[Math.floor(__rng() * n / 2)];
      const child = p1.genes.map((g, i) => __rng() < 0.5 ? g : p2.genes[i]);
      if (__rng() < mutationRate) child[Math.floor(__rng() * gSize)] += (__rng() - 0.5);
      newPop.push({ genes: child, fitness: fitness(child) });
    }
    pop = newPop;
    const genBest = pop.reduce((b, p) => p.fitness < b.fitness ? p : b, pop[0]);
    if (genBest.fitness < best.fitness) best = genBest;
  }
  return { test: 'Genetic Algorithm', optimum: best.genes.map(v => +v.toFixed(4)), value: +best.fitness.toFixed(4), generations, popSize: n, apa: `GA: minimum = ${best.fitness.toFixed(4)}` };
}

// ── Particle Swarm ────────────────────────────────────────────────
/** @param {Function} fn */
export function particleSwarm(fn, bounds, { seed = 42, nParticles = 20, iterations = 50 } = {}) {
  __rng = mulberry32(seed);
  if (!fn || !bounds || !bounds.length) return null;
  const d = bounds.length; const n = nParticles;
  let positions = Array.from({ length: n }, () => bounds.map(([lo, hi]) => lo + __rng() * (hi - lo)));
  let velocities = Array.from({ length: n }, () => Array(d).fill(0));
  let personalBest = positions.map(p => ({ pos: [...p], val: fn(p) }));
  let globalBest = personalBest.reduce((b, p) => p.val < b.val ? p : b, personalBest[0]);
  const w = 0.5; const c1 = 1.5; const c2 = 1.5;
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < d; j++) {
        velocities[i][j] = w * velocities[i][j] + c1 * __rng() * (personalBest[i].pos[j] - positions[i][j]) + c2 * __rng() * (globalBest.pos[j] - positions[i][j]);
        positions[i][j] = Math.max(bounds[j][0], Math.min(bounds[j][1], positions[i][j] + velocities[i][j]));
      }
      const val = fn(positions[i]);
      if (val < personalBest[i].val) { personalBest[i] = { pos: [...positions[i]], val }; }
      if (val < globalBest.val) { globalBest = { pos: [...positions[i]], val }; }
    }
  }
  return { test: 'Particle Swarm', optimum: globalBest.pos.map(v => +v.toFixed(4)), value: +globalBest.val.toFixed(4), iterations, nParticles: n, d, apa: `PSO: minimum = ${globalBest.val.toFixed(4)}` };
}

// ── Differential Evolution ────────────────────────────────────────
/** @param {Function} fn */
export function differentialEvolution(fn, bounds, { seed = 42, popSize = 20, iterations = 50 } = {}) {
  __rng = mulberry32(seed);
  if (!fn || !bounds || !bounds.length) return null;
  const d = bounds.length; const n = popSize; const F = 0.8; const CR = 0.9;
  let pop = Array.from({ length: n }, () => bounds.map(([lo, hi]) => lo + __rng() * (hi - lo)));
  let best = pop.reduce((b, p) => fn(p) < fn(b) ? p : b, pop[0]);
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < n; i++) {
      let a, b2, c;
      do { a = Math.floor(__rng() * n); } while (a === i);
      do { b2 = Math.floor(__rng() * n); } while (b2 === i || b2 === a);
      do { c = Math.floor(__rng() * n); } while (c === i || c === a || c === b2);
      const trial = pop[a].map((v, j) => {
        if (__rng() < CR) return Math.max(bounds[j][0], Math.min(bounds[j][1], pop[a][j] + F * (pop[b2][j] - pop[c][j])));
        return pop[i][j];
      });
      if (fn(trial) < fn(pop[i])) pop[i] = trial;
    }
    const newBest = pop.reduce((b, p) => fn(p) < fn(b) ? p : b, pop[0]);
    if (fn(newBest) < fn(best)) best = newBest;
  }
  return { test: 'Differential Evolution', optimum: best.map(v => +v.toFixed(4)), value: +fn(best).toFixed(4), iterations, popSize: n, d, apa: `DE: minimum = ${fn(best).toFixed(4)}` };
}

// ── Grid Search ───────────────────────────────────────────────────
/** @param {Function} fn */
export function gridSearch(fn, paramGrid) {
  if (!fn || !paramGrid || !paramGrid.length) return null;
  let bestVal = Infinity; let bestParams = null;
  function search(depth, params) {
    if (depth === paramGrid.length) { const val = fn(params.map(p => p.val)); if (val < bestVal) { bestVal = val; bestParams = [...params.map(p => p.val)]; } return; }
    paramGrid[depth].values.forEach(v => { search(depth + 1, [...params, { name: paramGrid[depth].name, val: v }]); });
  }
  search(0, []);
  return { test: 'Grid Search', optimum: bestParams?.map(v => +v.toFixed(4)) || [], value: +bestVal.toFixed(4), nPoints: paramGrid.reduce((p, g) => p * g.values.length, 1), apa: `Grid: minimum = ${bestVal.toFixed(4)}` };
}

// ── BFGS ────────────────────────────────────────────────────────────────────
/** @param {Function} fn @param {number[]} init @param {(theta: number[]) => number[]} grad */
export function bfgs(fn, grad, init, { maxIter = 100, tol = 1e-6 } = {}) {
  if (!fn || !grad || !init || !init.length) return null;
  const n = init.length;
  let x = [...init];
  let H = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0));
  let g = grad(x);
  const history = [{ iter: 0, value: +fn(x).toFixed(4) }];

  for (let iter = 0; iter < maxIter; iter++) {
    const p = H.map(row => row.reduce((s, hij, j) => s - hij * g[j], 0));
    let alpha = 1;
    for (let ls = 0; ls < 10; ls++) {
      const xNew = x.map((xi, i) => xi + alpha * p[i]);
      if (fn(xNew) < fn(x)) break;
      alpha *= 0.5;
    }
    const xNew = x.map((xi, i) => xi + alpha * p[i]);
    const gNew = grad(xNew);
    const s = xNew.map((xi, i) => xi - x[i]);
    const y = gNew.map((gi, i) => gi - g[i]);
    const rho = 1 / Math.max(y.reduce((ss, yi, i) => ss + yi * s[i], 0), 1e-10);

    if (rho < 1e10) {
      const Isy = Array.from({ length: n }, (_, i) => Array(n).fill(0));
      for (let i = 0; i < n; i++) { Isy[i][i] = 1; Isy[i][i] -= rho * s[i] * y[i]; }
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) Isy[i][j] -= i === j ? 0 : -rho * s[i] * y[j];
      H = H.map((row, i) => row.map((h, j) => {
        let v = 0;
        for (let k = 0; k < n; k++) v += Isy[i][k] * H[k][j];
        return v;
      }));
      H = H.map((row, i) => row.map((h, j) => h + rho * s[i] * s[j]));
    }

    x = xNew;
    g = gNew;
    if (Math.abs(g.reduce((s, gi) => s + gi * gi, 0)) < tol) break;
    if (iter % 20 === 0) history.push({ iter, value: +fn(x).toFixed(4) });
  }

  return { test: 'BFGS', optimum: x.map(v => +v.toFixed(4)), value: +fn(x).toFixed(4), iterations: history.length, n: init.length, apa: `BFGS: minimum = ${fn(x).toFixed(4)}` };
}

// ── Nelder-Mead ─────────────────────────────────────────────────────────────
/** @param {Function} fn @param {number[]} init */
export function nelderMead(fn, init, { maxIter = 200, alpha = 1, gamma = 2, rho = 0.5, sigma = 0.5 } = {}) {
  if (!fn || !init || !init.length) return null;
  const n = init.length;
  const simplex = [init.map(v => +v)];
  const delta = 0.1;
  for (let i = 0; i < n; i++) {
    const p = init.map((v, j) => j === i ? v + delta : v);
    simplex.push(p);
  }
  let fvals = simplex.map(s => fn(s));

  for (let iter = 0; iter < maxIter; iter++) {
    const indices = fvals.map((f, i) => ({ f, i })).sort((a, b) => a.f - b.f);
    const best = simplex[indices[0].i];
    const worstIdx = indices[n].i;
    const secondWorst = simplex[indices[n - 1].i];
    const centroid = best.map((_, j) => avg(simplex.filter((_, i) => i !== worstIdx).map(s => s[j])));

    // Reflect
    const reflected = centroid.map((cj, j) => cj + alpha * (cj - simplex[worstIdx][j]));
    const fr = fn(reflected);

    if (fr < fvals[indices[0].i]) {
      // Expand
      const expanded = centroid.map((cj, j) => cj + gamma * (reflected[j] - cj));
      const fe = fn(expanded);
      if (fe < fr) { simplex[worstIdx] = expanded; fvals[worstIdx] = fe; }
      else { simplex[worstIdx] = reflected; fvals[worstIdx] = fr; }
    } else if (fr >= fvals[indices[n - 1].i]) {
      if (fr < fvals[worstIdx]) {
        // Outside contraction
        const contracted = centroid.map((cj, j) => cj + rho * (reflected[j] - cj));
        simplex[worstIdx] = contracted;
        fvals[worstIdx] = fn(contracted);
      } else {
        // Shrink
        for (let i = 1; i <= n; i++) {
          simplex[indices[i].i] = best.map((bj, j) => bj + sigma * (simplex[indices[i].i][j] - bj));
          fvals[indices[i].i] = fn(simplex[indices[i].i]);
        }
      }
    } else {
      simplex[worstIdx] = reflected;
      fvals[worstIdx] = fr;
    }

    const std = Math.sqrt(fvals.reduce((s, f) => s + (f - avg(fvals)) ** 2, 0) / n);
    if (std < 1e-8) break;
  }

  const bestVal = Math.min(...fvals);
  const bestIdx = fvals.indexOf(bestVal);
  return { test: 'Nelder-Mead', optimum: simplex[bestIdx].map(v => +v.toFixed(4)), value: +bestVal.toFixed(4), n: init.length, apa: `Nelder-Mead: minimum = ${bestVal.toFixed(4)}` };
}

// ── Conjugate Gradient ──────────────────────────────────────────────────────
/** @param {Function} fn @param {number[]} init @param {(theta: number[]) => number[]} grad */
export function conjugateGradient(fn, grad, init, { maxIter = 50, tol = 1e-6 } = {}) {
  if (!fn || !grad || !init || !init.length) return null;
  let x = [...init];
  let g = grad(x);
  let d = g.map(gi => -gi);
  const history = [{ iter: 0, value: +fn(x).toFixed(4) }];

  for (let iter = 0; iter < maxIter; iter++) {
    let step = 0.01;
    for (let ls = 0; ls < 15; ls++) {
      const xNew = x.map((xi, i) => xi + step * d[i]);
      if (fn(xNew) < fn(x)) break;
      step *= 0.5;
    }
    x = x.map((xi, i) => xi + step * d[i]);
    const gNew = grad(x);
    const beta = Math.max(0, (gNew.reduce((s, gi, i) => s + gi * (gi - g[i]), 0)) / Math.max(g.reduce((s, gi) => s + gi * gi, 0), 1e-10));
    d = gNew.map((gi, i) => -gi + beta * d[i]);
    g = gNew;
    if (Math.sqrt(g.reduce((s, gi) => s + gi * gi, 0)) < tol) break;
    if (iter % 10 === 0) history.push({ iter, value: +fn(x).toFixed(4) });
  }

  return { test: 'Conjugate Gradient', optimum: x.map(v => +v.toFixed(4)), value: +fn(x).toFixed(4), iterations: history.length, n: init.length, apa: `CG: minimum = ${fn(x).toFixed(4)}` };
}

// ── Trust Region ────────────────────────────────────────────────────────────
/** @param {Function} fn @param {number[]} init @param {(theta: number[]) => number[]} grad */
export function trustRegion(fn, grad, hess, init, { maxIter = 30, delta0 = 1, eta = 0.1, tol = 1e-6 } = {}) {
  if (!fn || !grad || !hess || !init || !init.length) return null;
  const n = init.length;
  let x = [...init];
  let delta = delta0;
  const history = [];

  for (let iter = 0; iter < maxIter; iter++) {
    const g = grad(x);
    const H = hess(x);
    const p = H.map((row, i) => row.reduce((s, hw, j) => s - hw * g[j], 0) * 0.01);
    const xNew = x.map((xi, i) => xi + p[i]);
    const rhoNum = fn(x) - fn(xNew);
    const rhoDen = -(g.reduce((s, gi, i) => s + gi * p[i], 0) + 0.5 * p.reduce((s, pi, i) => s + pi * H[i].reduce((hs, hw, j) => hs + hw * p[j], 0), 0));
    const rho = rhoDen > 0 ? rhoNum / rhoDen : 0;

    if (rho > eta) x = xNew;
    delta = rho > 0.75 ? delta * 2 : rho < 0.1 ? delta * 0.5 : delta;
    if (Math.abs(fn(x) - fn(xNew)) < tol) break;
    history.push({ iter, value: +fn(x).toFixed(4), rho: +rho.toFixed(4) });
  }

  return { test: 'Trust Region', optimum: x.map(v => +v.toFixed(4)), value: +fn(x).toFixed(4), n, apa: `Trust region: minimum = ${fn(x).toFixed(4)}` };
}

// ── SLSQP ───────────────────────────────────────────────────────────────────
/** @param {Function} fn @param {number[]} init @param {(theta: number[]) => number[]} grad */
export function slsqp(fn, grad, init, { constraints = [], maxIter = 50, tol = 1e-6 } = {}) {
  if (!fn || !grad || !init || !init.length) return null;
  let x = [...init];
  const history = [];

  for (let iter = 0; iter < maxIter; iter++) {
    const g = grad(x);
    const p = g.map(gi => -0.01 * gi);
    let alpha = 1;
    for (let ls = 0; ls < 10; ls++) {
      const xNew = x.map((xi, i) => xi + alpha * p[i]);
      let feasible = true;
      for (const con of constraints) {
        if (typeof con === 'function' && con(xNew) > 0) { feasible = false; break; }
      }
      if (feasible && fn(xNew) < fn(x)) break;
      alpha *= 0.5;
    }
    x = x.map((xi, i) => xi + alpha * p[i]);
    if (Math.sqrt(g.reduce((s, gi) => s + gi * gi, 0)) < tol) break;
    if (iter % 10 === 0) history.push({ iter, value: +fn(x).toFixed(4) });
  }

  return { test: 'SLSQP', optimum: x.map(v => +v.toFixed(4)), value: +fn(x).toFixed(4), n: init.length, apa: `SLSQP: minimum = ${fn(x).toFixed(4)}` };
}

// ── Stochastic Gradient Descent ─────────────────────────────────────────────
/** @param {Function} fn @param {number[]} init @param {(theta: number[]) => number[]} grad */
export function gradientDescentOptim(fn, grad, init, { lr = 0.01, maxIter = 200, tol = 1e-6 } = {}) {
  if (!fn || !grad || !init || !init.length) return null;
  let x = [...init];
  let lrNow = lr;
  const history = [];

  for (let iter = 0; iter < maxIter; iter++) {
    const g = grad(x);
    x = x.map((xi, i) => xi - lrNow * g[i]);
    lrNow = lr / (1 + iter * 0.01);
    if (Math.sqrt(g.reduce((s, gi) => s + gi * gi, 0)) < tol) break;
    if (iter % 40 === 0) history.push({ iter, value: +fn(x).toFixed(4), lr: +lrNow.toFixed(6) });
  }

  return { test: 'Gradient Descent', optimum: x.map(v => +v.toFixed(4)), value: +fn(x).toFixed(4), n: init.length, apa: `GD: minimum = ${fn(x).toFixed(4)}` };
}
