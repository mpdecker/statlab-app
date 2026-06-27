import { avg } from '../math/core.js';

// Current Life Table
export function lifeTable(mx, { ax = null } = {}) {
  if (!mx || mx.length < 5) return null;
  const n = mx.length;
  const a = ax || Array(n).fill(0.5);
  const qx = []; const lx = [1]; const dx = []; const Lx = []; const Tx = []; const ex = [];
  for (let i = 0; i < n; i++) {
    const qi = Math.min(1, mx[i] / (1 + (1 - a[i]) * mx[i]));
    qx.push(+qi.toFixed(6));
    if (i > 0) lx.push(+(lx[i - 1] * (1 - qx[i - 1])).toFixed(6));
    dx.push(+(l[i] * qi).toFixed(6));
    L[i] = +(lx[i] - dx[i] + a[i] * dx[i]).toFixed(4);
  }
  for (let i = n - 1; i >= 0; i--) Tx[i] = +(Tx[i + 1] + Lx[i]).toFixed(4);
  n.forEach((_, i) => { ex[i] = +(Tx[i] / Math.max(lx[i], 0.001)).toFixed(2); });
  return { test: 'Life Table', summary: { e0: ex[0], l0: lx[0], nAges: n }, n, apa: `Life table: e₀ = ${ex[0].toFixed(1)}, ${n} ages` };
}

// Lee-Carter Model
export function leeCarter(logMx, years, ages) {
  if (!logMx || !logMx.length || logMx.length !== years.length) return null;
  const n = logMx.length, m = logMx[0]?.length || 0;
  const ax = Array(m).fill(0).map((_, j) => avg(logMx.map(r => r[j])));
  const A = logMx.map(r => r.map((v, j) => v - ax[j]));
  const kt = A.map(r => r.reduce((s, v) => s + v, 0) / m);
  const bx = Array(m).fill(0).map((_, j) => {
    let num = 0, den = 0;
    for (let t = 0; t < n; t++) { num += A[t][j] * kt[t]; den += kt[t] * kt[t]; }
    return den > 0 ? num / den : 0;
  });
  return { test: 'Lee-Carter', ax: ax.slice(0, 5).map(v => +v.toFixed(4)), bx: bx.slice(0, 5).map(v => +v.toFixed(4)), kt: kt.slice(0, 10).map(v => +v.toFixed(4)), nYears: n, nAges: m, apa: `Lee-Carter: ${n} years × ${m} ages` };
}

// Population Projection (cohort-component)
export function populationProjection(basePop, fertility, mortality, { nYears = 5 } = {}) {
  if (!basePop || !fertility || !mortality || basePop.length < 3) return null;
  const n = basePop.length;
  const pop = [basePop.map(v => +v.toFixed(0))];
  for (let t = 1; t <= nYears; t++) {
    const newPop = Array(n).fill(0);
    for (let i = 1; i < n; i++) newPop[i] = +(pop[t - 1][i - 1] * (1 - mortality[i - 1])).toFixed(0);
    newPop[0] = +(pop[t - 1].slice(2, 6).reduce((s, v) => s + v * fertility, 0)).toFixed(0);
  }
  return { test: 'Population Projection', projection: pop, nYears, nCohorts: n, apa: `Projection: ${pop.length} years, initial = ${basePop.reduce((s, v) => s + v, 0)}` };
}

// Life Expectancy
export function lifeExpectancy(lt) {
  if (!lt || !lt.ex) return null;
  return { test: 'Life Expectancy', e0: lt.ex[0] || 0, n: lt.n || 0, apa: `e₀ = ${lt.ex[0].toFixed(1)}` };
}

// Population Growth Rate
export function populationGrowth(pop, { t = 1 } = {}) {
  if (!pop || !pop.length || !pop[0]) return null;
  const n = pop.length;
  const total = pop.map(r => r.reduce((s, v) => s + v, 0));
  const rates = [];
  for (let i = 1; i < n; i++) rates.push(Math.log(total[i] / Math.max(total[i - 1], 1)) / t);
  const meanRate = avg(rates);
  return { test: 'Population Growth', growthRate: +meanRate.toFixed(4), nPeriods: rates.length, t, apa: `Growth rate = ${meanRate.toFixed(4)} per period` };
}
