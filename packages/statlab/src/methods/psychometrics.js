import { avg, sampleVar, corr, fmtP } from '../math/core.js';
import { chiPVal } from '../math/distributions.js';
import { jacobiEigen, solveNormalEquations } from '../math/matrix.js';
import { mulberry32, boxMullerN } from '../math/rng.js';
import { pca } from './multivariate.js';

function sigmoid(z) {
  const c = Math.max(-20, Math.min(20, z));
  return 1 / (1 + Math.exp(-c));
}

function corrMatrixFromItems(matrix) {
  const k = matrix[0]?.length;
  if (!k) return null;
  return Array.from({ length: k }, (_, i) =>
    Array.from({ length: k }, (_, j) => +(corr(matrix.map(r => r[i]), matrix.map(r => r[j]))).toFixed(6)));
}

/** McDonald's ω (total) from 1-factor model on item correlation matrix */
export function omegaMcDonald(matrix) {
  const k = matrix[0]?.length;
  const n = matrix.length;
  if (!k || k < 2 || n < k + 3) return null;
  const R = corrMatrixFromItems(matrix);
  if (!R) return null;
  const { eigenvalues, eigenvectors } = jacobiEigen(R);
  const loadings = eigenvectors[0].map(v => v * Math.sqrt(Math.max(eigenvalues[0], 0)));
  const uniq = R.map((_, i) => Math.max(1e-6, 1 - loadings[i] ** 2));
  const sumL = loadings.reduce((s, l) => s + l, 0);
  const omegaT = (sumL ** 2) / ((sumL ** 2) + uniq.reduce((s, u) => s + u, 0));
  const omegaH = (sumL ** 2) / (sumL ** 2 + uniq.reduce((s, u) => s + u, 0));
  const label = omegaT >= .9 ? 'excellent' : omegaT >= .8 ? 'good' : omegaT >= .7 ? 'acceptable' : 'questionable';
  return {
    test: "McDonald's ω",
    omegaTotal: +omegaT.toFixed(4),
    omegaHierarchical: +omegaH.toFixed(4),
    label, k, n,
    loadings: loadings.map(l => +l.toFixed(4)),
    apa: `ω = ${omegaT.toFixed(3)} [${label}], k = ${k}, N = ${n}`,
  };
}

/** Parallel analysis (Monte Carlo) — compare data eigenvalues to random */

// ── Parallel Analysis ─────────────────────────────────────────────
export function parallelAnalysis(data, vars, nReps = 40, seed = 42) {
  const matrix = data.filter(r => vars.every(v => Number.isFinite(+r[v]))).map(r => vars.map(v => +r[v]));
  const n = matrix.length;
  const p = vars.length;
  if (n < p + 5 || p < 2) return null;
  const pcaRes = pca(data, vars);
  if (!pcaRes) return null;
  const dataEv = pcaRes.eigenvaluesRaw;
  const rand = mulberry32(seed ?? 42);
  const randMeans = Array(p).fill(0);
  for (let rep = 0; rep < nReps; rep++) {
    const Z = Array.from({ length: n }, () =>
      Array.from({ length: p }, () => boxMullerN(rand)));
    const R = Array.from({ length: p }, (_, i) =>
      Array.from({ length: p }, (_, j) => corr(Z.map(r => r[i]), Z.map(r => r[j]))));
    const { eigenvalues } = jacobiEigen(R);
    eigenvalues.forEach((e, i) => { randMeans[i] += e / nReps; });
  }
  const retain = dataEv.map((e, i) => e > randMeans[i]).filter(Boolean).length;
  const scree = dataEv.map((e, i) => ({
    pc: i + 1,
    data: +e.toFixed(4),
    random: +randMeans[i].toFixed(4),
    retain: e > randMeans[i],
  }));
  return {
    test: 'Parallel Analysis',
    nFactors: retain,
    scree,
    n, p, vars,
    apa: `Parallel analysis suggests ${retain} factor${retain !== 1 ? 's' : ''} (λ_data > λ_random), p = ${p}, N = ${n}`,
  };
}

/** Rasch 1PL — joint ML difficulties (discrimination fixed at 1) */

// ── IRT Rasch (1PL) ───────────────────────────────────────────────
export function irtRasch1PL(matrix) {
  const n = matrix.length;
  const k = matrix[0]?.length;
  if (!n || !k || n < 10) return null;
  const Y = matrix.map(r => r.map(v => (v > 0 ? 1 : 0)));
  let b = Array(k).fill(0);
  let theta = Array(n).fill(0);
  for (let it = 0; it < 80; it++) {
    for (let i = 0; i < n; i++) {
      let num = 0;
      let den = 0;
      for (let j = 0; j < k; j++) {
        const p = sigmoid(theta[i] - b[j]);
        num += Y[i][j] - p;
        den += p * (1 - p);
      }
      theta[i] += (den > 1e-8 ? num / den : 0) * 0.5;
    }
    for (let j = 0; j < k; j++) {
      let num = 0;
      let den = 0;
      for (let i = 0; i < n; i++) {
        const p = sigmoid(theta[i] - b[j]);
        num += Y[i][j] - p;
        den += p * (1 - p);
      }
      b[j] += (den > 1e-8 ? num / den : 0) * 0.5;
    }
    const m = avg(b);
    b = b.map(x => x - m);
    theta = theta.map(x => x - avg(theta));
  }
  const difficulties = b.map((v, j) => ({ item: j + 1, b: +v.toFixed(4) }));
  const icc = Array.from({ length: 41 }, (_, t) => {
    const th = -4 + t * 0.2;
    return {
      theta: +th.toFixed(2),
      curves: b.map(bj => +sigmoid(th - bj).toFixed(4)),
    };
  });
  return {
    test: 'IRT Rasch (1PL)',
    difficulties,
    thetaMean: +avg(theta).toFixed(4),
    thetaSD: +Math.sqrt(sampleVar(theta)).toFixed(4),
    n, k,
    icc,
    apa: `Rasch 1PL: k = ${k} items, N = ${n}, difficulty range [${Math.min(...b).toFixed(2)}, ${Math.max(...b).toFixed(2)}]`,
  };
}

/** 2PL IRT — per-item a and b (simplified JML) */

// ── IRT 2PL ───────────────────────────────────────────────────────
export function irt2PL(matrix) {
  const n = matrix.length;
  const k = matrix[0]?.length;
  if (!n || !k || n < 15) return null;
  const Y = matrix.map(r => r.map(v => (v > 0 ? 1 : 0)));
  let a = Array(k).fill(1);
  let b = Array(k).fill(0);
  let theta = Array(n).fill(0);
  for (let it = 0; it < 60; it++) {
    for (let i = 0; i < n; i++) {
      let upd = 0;
      let w = 0;
      for (let j = 0; j < k; j++) {
        const z = a[j] * (theta[i] - b[j]);
        const p = sigmoid(z);
        const err = Y[i][j] - p;
        upd += a[j] * err;
        w += a[j] ** 2 * p * (1 - p);
      }
      theta[i] += (w > 1e-8 ? upd / w : 0) * 0.4;
    }
    for (let j = 0; j < k; j++) {
      let updB = 0;
      let updA = 0;
      let wB = 0;
      let wA = 0;
      for (let i = 0; i < n; i++) {
        const z = a[j] * (theta[i] - b[j]);
        const p = sigmoid(z);
        const err = Y[i][j] - p;
        updB += a[j] * err;
        wB += a[j] ** 2 * p * (1 - p);
        updA += (theta[i] - b[j]) * err;
        wA += (theta[i] - b[j]) ** 2 * p * (1 - p);
      }
      b[j] += (wB > 1e-8 ? updB / wB : 0) * 0.4;
      a[j] = Math.max(0.2, a[j] + (wA > 1e-8 ? updA / wA : 0) * 0.2);
    }
  }
  const items = a.map((aj, j) => ({ item: j + 1, a: +aj.toFixed(4), b: +b[j].toFixed(4) }));
  const icc = Array.from({ length: 41 }, (_, t) => {
    const th = -4 + t * 0.2;
    return {
      theta: +th.toFixed(2),
      curves: items.map(it => +sigmoid(it.a * (th - it.b)).toFixed(4)),
    };
  });
  return {
    test: 'IRT 2PL',
    items,
    n, k,
    icc,
    apa: `2PL IRT: k = ${k}, N = ${n}; discrimination M = ${avg(a).toFixed(2)}`,
  };
}

/** Composite scale scoring (sum/mean) with optional reverse coding */

// ── Scale Scoring ─────────────────────────────────────────────────
export function scaleScore(matrix, { method = 'sum', reverseIdx = [] } = {}) {
  const k = matrix[0]?.length;
  const n = matrix.length;
  if (!k || n < 1) return null;
  const revSet = new Set(reverseIdx);
  const scoreRows = matrix.map(row => {
    const adj = row.map((v, j) => {
      let x = +v;
      if (revSet.has(j)) {
        const col = matrix.map(r => +r[j]).filter(Number.isFinite);
        const lo = Math.min(...col);
        const hi = Math.max(...col);
        x = hi + lo - x;
      }
      return x;
    });
    const s = method === 'mean' ? avg(adj) : adj.reduce((a, b) => a + b, 0);
    return +s.toFixed(4);
  });
  const scores = scoreRows;
  return {
    test: 'Scale Scoring',
    method,
    nReversed: reverseIdx.length,
    scores: scores.slice(0, 200),
    mean: +avg(scores).toFixed(4),
    sd: +Math.sqrt(sampleVar(scores)).toFixed(4),
    n, k,
    apa: `${method === 'mean' ? 'Mean' : 'Sum'} composite: M = ${avg(scores).toFixed(2)}, SD = ${Math.sqrt(sampleVar(scores)).toFixed(2)}, k = ${k}, N = ${n}`,
  };
}

// ── IRT 3-parameter logistic model ─────────────────────────────────────────
function logistic(x) {
  return 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, x))));
}

// ── IRT 3PL ───────────────────────────────────────────────────────

export function irt3PL(matrix, { maxIter = 60, tolerance = 1e-5 } = {}) {
  if (!matrix || matrix.length < 10 || !matrix[0]) return null;
  const n = matrix.length, k = matrix[0].length;
  if (k < 2) return null;
  const binary = matrix.every(row => Array.isArray(row) && row.every(v => v === 0 || v === 1));
  if (!binary) return null;

  let a = Array(k).fill(1);
  let b = Array(k).fill(0);
  let c = Array(k).fill(0.2);
  const theta = Array(n).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    for (let i = 0; i < n; i++) {
      let lo = -4, hi = 4;
      for (let inner = 0; inner < 30; inner++) {
        const mid = (lo + hi) / 2;
        let d = 0;
        for (let j = 0; j < k; j++) {
          const p = c[j] + (1 - c[j]) * logistic(a[j] * (mid - b[j]));
          const pe = matrix[i][j] ? p : 1 - p;
          d += a[j] * (matrix[i][j] - p) * (pe > 0 ? (p - c[j]) / (pe * (1 - c[j]) + 1e-10) : 0);
        }
        if (d > 0) lo = mid; else hi = mid;
      }
      theta[i] = (lo + hi) / 2;
    }

    for (let j = 0; j < k; j++) {
      let numA = 0, denA = 0;
      let numB = 0, denB = 0;
      let numC = 0, denC = 0;
      for (let i = 0; i < n; i++) {
        const p = c[j] + (1 - c[j]) * logistic(a[j] * (theta[i] - b[j]));
        const w = p * (1 - p) / ((1 - c[j]) * (1 - c[j]) + 1e-10);
        numA += (matrix[i][j] - p) * (theta[i] - b[j]) * (p - c[j]) / Math.max(1e-10, p);
        denA += w * (theta[i] - b[j]) * (theta[i] - b[j]);
        numB += matrix[i][j] - p;
        denB += w;
        const pcj = logistic(a[j] * (theta[i] - b[j]));
        numC += (matrix[i][j] - p) / Math.max(1e-10, 1 - c[j]);
        denC += pcj;
      }
      a[j] = Math.max(0.3, Math.min(4, a[j] + (denA ? 0.2 * numA / denA : 0)));
      b[j] += denB ? 0.2 * numB / denB : 0;
      c[j] = Math.max(0, Math.min(0.4, c[j] + (denC ? 0.1 * numC / denC : 0)));
    }
  }

  const items = Array.from({ length: k }, (_, j) => ({
    item: j + 1, a: +a[j].toFixed(4), b: +b[j].toFixed(4), c: +c[j].toFixed(4),
  }));
  return {
    test: 'IRT 3PL',
    items,
    abilities: theta.map((t, i) => ({ person: i + 1, theta: +t.toFixed(4) })),
    n, k,
    apa: `IRT 3PL: ${k} items, ${n} persons. Mean a = ${(avg(a)).toFixed(2)}, mean b = ${(avg(b)).toFixed(2)}`,
  };
}

// ── Graded Response Model (Samejima) ─────────────────────────────────────────
export function gradedResponseModel(matrix, { maxIter = 50, tolerance = 1e-5 } = {}) {
  if (!matrix || matrix.length < 10 || !matrix[0]) return null;
  const n = matrix.length, k = matrix[0].length;
  if (k < 2) return null;

  const maxScore = Math.max(...matrix.flat());
  if (maxScore < 1) return null;

  const a = Array(k).fill(1);
  const thresholds = Array.from({ length: k }, () => Array(maxScore).fill(0));
  const theta = Array(n).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    for (let i = 0; i < n; i++) {
      let lo = -4, hi = 4;
      for (let inner = 0; inner < 30; inner++) {
        const mid = (lo + hi) / 2;
        let d = 0;
        for (let j = 0; j < k; j++) {
          const ts = thresholds[j];
          let prevCdf = 1;
          for (let s = 0; s <= maxScore; s++) {
            const currCdf = s < maxScore ? logistic(a[j] * (mid - ts[s])) : 0;
            const prob = prevCdf - currCdf;
            if (matrix[i][j] === s) {
              const p = Math.max(1e-10, prob);
              d += a[j] * (currCdf * (1 - currCdf) + prevCdf * (1 - prevCdf) - 2 * (s === 0 || s === maxScore ? 0 : 1)) / p;
            }
            prevCdf = currCdf;
          }
        }
        if (d > 0) lo = mid; else hi = mid;
      }
      theta[i] = (lo + hi) / 2;
    }

    for (let j = 0; j < k; j++) {
      const ts = thresholds[j];
      let sumA = 0, sumB = 0;
      for (let s = 0; s < maxScore; s++) {
        let num = 0, den = 0;
        for (let i = 0; i < n; i++) {
          const resp = matrix[i][j] > s ? 1 : 0;
          const eta = a[j] * (theta[i] - ts[s]);
          const pe = logistic(eta);
          num += resp - pe;
          den += pe * (1 - pe);
        }
        ts[s] -= den ? 0.3 * num / den : 0;
        sumA += Math.abs(ts[s]);
        sumB += Math.abs(1);
      }
      const meanT = sumB > 0 ? sumA / sumB : 0;
    }

    for (let j = 0; j < k; j++) {
      let num = 0, den = 0;
      const ts = thresholds[j];
      for (let i = 0; i < n; i++) {
        for (let s = 0; s < maxScore; s++) {
          const resp = matrix[i][j] > s ? 1 : 0;
          const pe = logistic(a[j] * (theta[i] - ts[s]));
          const w = pe * (1 - pe);
          num += (resp - pe) * (theta[i] - ts[s]);
          den += w * (theta[i] - ts[s]) * (theta[i] - ts[s]);
        }
      }
      a[j] = Math.max(0.3, Math.min(4, a[j] + (den ? 0.2 * num / den : 0)));
    }
  }

  return {
    test: 'Graded Response Model',
    items: Array.from({ length: k }, (_, j) => ({
      item: j + 1, a: +a[j].toFixed(4), thresholds: thresholds[j].map(t => +t.toFixed(4)),
    })),
    abilities: theta.map((t, i) => ({ person: i + 1, theta: +t.toFixed(4) })),
    n, k, maxScore,
    apa: `GRM: ${k} items, ${n} persons, ${maxScore + 1} categories. Mean a = ${(avg(a)).toFixed(2)}`,
  };
}

// ── Partial Credit Model (Masters) ──────────────────────────────────────────
export function partialCreditModel(matrix, { maxIter = 50, tolerance = 1e-5 } = {}) {
  if (!matrix || matrix.length < 10 || !matrix[0]) return null;
  const n = matrix.length, k = matrix[0].length;
  if (k < 2) return null;

  const maxScore = Math.max(...matrix.flat());
  const itemMax = Array.from({ length: k }, (_, j) => Math.max(...matrix.map(r => r[j])));
  const stepParams = Array.from({ length: k }, (_, j) => Array(itemMax[j]).fill(0));
  const theta = Array(n).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    for (let i = 0; i < n; i++) {
      let lo = -4, hi = 4;
      for (let inner = 0; inner < 30; inner++) {
        const mid = (lo + hi) / 2;
        let d = 0;
        for (let j = 0; j < k; j++) {
          const steps = stepParams[j];
          const mj = itemMax[j];
          let denom = 1;
          const exponentials = [1];
          for (let s = 1; s <= mj; s++) {
            let sum = 0;
            for (let v = 1; v <= s; v++) sum += mid - steps[v - 1];
            exponentials.push(Math.exp(sum));
            denom += exponentials[s];
          }
          const probs = exponentials.map(e => e / denom);
          const resp = matrix[i][j];
          let expScore = 0;
          for (let s = 0; s <= mj; s++) expScore += s * probs[s];
          d += resp - expScore;
        }
        if (d > 0) lo = mid; else hi = mid;
      }
      theta[i] = (lo + hi) / 2;
    }

    for (let j = 0; j < k; j++) {
      const steps = stepParams[j];
      const mj = itemMax[j];
      for (let s = 0; s < mj; s++) {
        let num = 0, den = 0;
        for (let i = 0; i < n; i++) {
          let denom = 1;
          const exponentials = [1];
          for (let v = 1; v <= mj; v++) {
            let sum = 0;
            for (let u = 1; u <= v; u++) sum += theta[i] - steps[u - 1];
            exponentials.push(Math.exp(sum));
            denom += exponentials[v];
          }
          const probAboveS = exponentials.slice(s + 2).reduce((a, b) => a + b, 0) / denom;
          const respAbove = matrix[i][j] > s ? 1 : 0;
          num += respAbove - probAboveS;
          den += probAboveS * (1 - probAboveS);
        }
        steps[s] -= den ? 0.3 * num / den : 0;
      }
    }
  }

  const items = Array.from({ length: k }, (_, j) => ({
    item: j + 1,
    maxScore: itemMax[j],
    steps: stepParams[j].map((s, si) => ({ step: si + 1, difficulty: +s.toFixed(4) })),
  }));

  return {
    test: 'Partial Credit Model',
    items,
    abilities: theta.map((t, i) => ({ person: i + 1, theta: +t.toFixed(4) })),
    n, k, maxScore,
    apa: `PCM: ${k} items, ${n} persons. Mean theta = ${(avg(theta)).toFixed(2)}`,
  };
}

// ── Test information function ────────────────────────────────────────────────
export function testInformation(items, thetaMin = -4, thetaMax = 4, nPoints = 81) {
  if (!items || !items.length) return null;
  const pts = [];
  const step = (thetaMax - thetaMin) / (nPoints - 1);
  for (let p = 0; p < nPoints; p++) {
    const theta = thetaMin + p * step;
    let info = 0;
    for (const item of items) {
      if (item.a && item.b != null) {
        const hasC = item.c != null;
        const p = (hasC ? item.c : 0) + (1 - (hasC ? item.c : 0)) * logistic(item.a * (theta - item.b));
        const q = 1 - p;
        const numer = item.a * item.a * (p - (hasC ? item.c : 0)) * (p - (hasC ? item.c : 0)) * q;
        const denom = p * (1 - (hasC ? item.c : 0)) * (1 - (hasC ? item.c : 0));
        info += denom > 0 ? numer / denom : 0;
      } else if (item.steps) {
        const steps = item.steps.map(s => s.difficulty);
        const m = steps.length;
        let denom = 1;
        const exponentials = [1];
        for (let s = 1; s <= m; s++) {
          let sum = 0;
          for (let v = 1; v <= s; v++) sum += theta - steps[v - 1];
          exponentials.push(Math.exp(sum));
          denom += exponentials[s];
        }
        const probs = exponentials.map(e => e / denom);
        let expScore = 0;
        for (let s = 0; s <= m; s++) expScore += s * probs[s];
        let varScore = 0;
        for (let s = 0; s <= m; s++) varScore += (s - expScore) ** 2 * probs[s];
        info += varScore;
      } else if (item.thresholds) {
        const a = item.a || 1;
        const ts = item.thresholds;
        let sum = 0;
        for (let s = 0; s < ts.length; s++) {
          const pe = logistic(a * (theta - ts[s]));
          sum += a * a * pe * (1 - pe);
        }
        info += sum / ts.length;
      }
    }
    pts.push({ theta: +theta.toFixed(2), info: +info.toFixed(4) });
  }
  const maxInfo = Math.max(...pts.map(p => p.info));
  const maxTheta = pts.find(p => p.info === maxInfo)?.theta || 0;
  return {
    test: 'Test Information',
    curve: pts,
    maxInfo: +maxInfo.toFixed(4),
    thetaAtMaxInfo: +maxTheta.toFixed(2),
    nItems: items.length,
    apa: `Test info: max = ${maxInfo.toFixed(2)} at \u03B8 = ${maxTheta.toFixed(1)} (${items.length} items)`,
  };
}

// ── DIF via Mantel-Haenszel ───────────────────────────────────────
export function difMH(data, groupVar, items) {
  if (!data || data.length < 20 || !groupVar || !items || items.length < 3) return null;
  const groups = [...new Set(data.map(r => r[groupVar]))];
  if (groups.length !== 2) return null;
  const g0 = groups[0], g1 = groups[1];
  const resp0 = data.filter(r => r[groupVar] === g0);
  const resp1 = data.filter(r => r[groupVar] === g1);
  if (resp0.length < 10 || resp1.length < 10) return null;

  const results = items.map(item => {
    const scores0 = resp0.map(r => items.reduce((s, it) => s + (+r[it] || 0), 0));
    const scores1 = resp1.map(r => items.reduce((s, it) => s + (+r[it] || 0), 0));
    const maxScore = items.length;
    let num = 0, den = 0;
    for (let s = 0; s <= maxScore; s++) {
      const a = resp0.filter((_, i) => scores0[i] === s && +resp0[i][item] === 1).length;
      const b = resp0.filter((_, i) => scores0[i] === s && +resp0[i][item] === 0).length;
      const c = resp1.filter((_, i) => scores1[i] === s && +resp1[i][item] === 1).length;
      const d = resp1.filter((_, i) => scores1[i] === s && +resp1[i][item] === 0).length;
      const nTotal = a + b + c + d;
      if (!nTotal) continue;
      num += a * d / nTotal;
      den += b * c / nTotal;
    }
    const alpha = den > 0 ? num / den : 1;
    let varLog = 0;
    for (let s = 0; s <= maxScore; s++) {
      const a = resp0.filter((_, i) => scores0[i] === s && +resp0[i][item] === 1).length;
      const b = resp0.filter((_, i) => scores0[i] === s && +resp0[i][item] === 0).length;
      const c = resp1.filter((_, i) => scores1[i] === s && +resp1[i][item] === 1).length;
      const d = resp1.filter((_, i) => scores1[i] === s && +resp1[i][item] === 0).length;
      const nTotal = a + b + c + d;
      if (!nTotal) continue;
      varLog += (a + d) * (a * d) / (2 * nTotal * nTotal);
    }
    const seLog = Math.sqrt(Math.max(0, varLog) / (num * den) || 1e-10);
    const chi2 = seLog > 0 ? (Math.log(alpha) / seLog) ** 2 : 0;
    const p = chi2 > 0 ? chiPVal(chi2, 1) : 1;
    const pBonf = Math.min(1, p * items.length);
    const logAlpha = Math.log(alpha);
    const classification = Math.abs(logAlpha) < 0.43 ? 'A' : Math.abs(logAlpha) < 0.64 ? 'B' : 'C';
    return { item, alpha: +alpha.toFixed(4), chi2: +chi2.toFixed(4), p, pBonf, classification };
  });

  return {
    test: 'DIF (Mantel-Haenszel)',
    items: results, n: data.length, nGroups: 2,
    apa: `DIF: ${results.filter(r => r.classification !== 'A').length} items with DIF, n = ${data.length}`,
  };
}

// ── EAP Scoring ───────────────────────────────────────────────────
export function eapScoring(itemParams, response, { nQPoints = 40 } = {}) {
  if (!itemParams || !itemParams.length || !response || response.length !== itemParams.length) return null;
  const n = itemParams.length;
  const thetaMin = -4, thetaMax = 4;
  const dTheta = (thetaMax - thetaMin) / (nQPoints - 1);
  let num = 0, den = 0, num2 = 0;

  for (let q = 0; q < nQPoints; q++) {
    const theta = thetaMin + q * dTheta;
    let logLike = 0;
    for (let i = 0; i < n; i++) {
      const p = itemParams[i];
      let prob;
      if (p.c != null) {
        // 3PL
        prob = p.c + (1 - p.c) / (1 + Math.exp(-p.a * (theta - p.b)));
        if (response[i] === 1) logLike += Math.log(Math.max(prob, 1e-10));
        else logLike += Math.log(Math.max(1 - prob, 1e-10));
      } else if (p.thresholds) {
        // Graded response / partial credit
        const th = [p.thresholds].flat();
        let cumP = 0;
        for (let k = 0; k < th.length; k++) {
          const pAbove = 1 / (1 + Math.exp(-p.a * (theta - th[k])));
          if (response[i] === k) {
            prob = k === 0 ? 1 / (1 + Math.exp(-p.a * (theta - th[0]))) : (1 / (1 + Math.exp(-p.a * (theta - th[k - 1]))) - pAbove);
            logLike += Math.log(Math.max(Math.abs(prob), 1e-10));
            break;
          }
        }
      } else {
        // 2PL
        prob = 1 / (1 + Math.exp(-p.a * (theta - p.b)));
        if (response[i] === 1) logLike += Math.log(Math.max(prob, 1e-10));
        else logLike += Math.log(Math.max(1 - prob, 1e-10));
      }
    }
    const prior = Math.exp(-0.5 * theta * theta) / Math.sqrt(2 * Math.PI);
    const weight = Math.exp(logLike) * prior * dTheta;
    num += theta * weight;
    num2 += theta * theta * weight;
    den += weight;
  }

  const theta = den > 0 ? num / den : 0;
  const se = den > 0 ? Math.sqrt(Math.max(0, num2 / den - theta * theta)) : 1;

  return {
    test: 'EAP Scoring',
    theta: +theta.toFixed(4), se: +se.toFixed(4), n, nQPoints,
    apa: `EAP theta = ${theta.toFixed(2)} (SE = ${se.toFixed(2)}), ${n} items`,
  };
}

// ── Multidimensional 2PL ──────────────────────────────────────────
export function multidimensional2PL(data, items, dimensions) {
  if (!data || data.length < 20 || !items || !items.length || !dimensions || !dimensions.length) return null;
  const n = data.length;
  const m = items.length;

  const itemParams = {};
  dimensions.forEach(dim => {
    const dimItems = dim.items.map(it => typeof it === 'number' ? items[it] : it);
    const resp = dimItems.map(item => data.map(r => r[item] != null ? (+r[item] > 0 ? 1 : 0) : 0));
    const Xt = resp.map(col => col);
    if (Xt.length < 3) return;
    const fakeData = Xt[0].map((_, i) => {
      const row = {};
      row.resp = Xt.map(col => col[i]);
      dimItems.forEach((item, j) => { row[item] = Xt[j][i]; });
      return row;
    });
    // Use simple 2PL estimation per dimension
    try {
      const irt = irt2PL(fakeData, dimItems);
      if (irt) {
        dimItems.forEach((item, i) => {
          if (irt.items && irt.items[i]) {
            itemParams[item] = { dim: dim.name, a: irt.items[i].a, b: irt.items[i].b };
          }
        });
      }
    } catch (e) { /* skip */ }
  });

  const entries = Object.entries(itemParams).map(([item, p]) => ({ item, dim: p.dim, a: +p.a.toFixed(4), b: +p.b.toFixed(4) }));

  // Estimate trait correlation between dimensions (simplified)
  const dimNames = dimensions.map(d => d.name);
  const dimCorr = Array.from({ length: dimNames.length }, () => Array(dimNames.length).fill(0));
  for (let i = 0; i < dimNames.length; i++) {
    dimCorr[i][i] = 1;
    for (let j = i + 1; j < dimNames.length; j++) {
      const itemsI = entries.filter(e => e.dim === dimNames[i]).map(e => e.item);
      const itemsJ = entries.filter(e => e.dim === dimNames[j]).map(e => e.item);
      if (!itemsI.length || !itemsJ.length) continue;
      const scoresI = data.map(r => itemsI.reduce((s, it) => s + (+r[it] || 0), 0));
      const scoresJ = data.map(r => itemsJ.reduce((s, it) => s + (+r[it] || 0), 0));
      const rho = corr(scoresI, scoresJ);
      dimCorr[i][j] = +rho.toFixed(4);
      dimCorr[j][i] = +rho.toFixed(4);
    }
  }

  return {
    test: 'Multidimensional 2PL',
    parameters: entries,
    traitCorrelation: dimCorr,
    n,
    apa: `M2PL: ${m} items, ${dimNames.length} dimensions, n = ${n}`,
  };
}

// ── Item Fit ──────────────────────────────────────────────────────
export function itemFit(itemParams, responseMatrix, scores) {
  if (!itemParams || !itemParams.length || !responseMatrix || responseMatrix.length < 3) return null;
  const nItems = itemParams.length;
  const nPersons = responseMatrix.length;
  if (nItems !== responseMatrix[0].length) return null;
  if (scores && scores.length !== nPersons) return null;

  const personScores = scores || responseMatrix.map(row => row.reduce((s, v) => s + v, 0));
  const results = [];

  for (let j = 0; j < nItems; j++) {
    const p = itemParams[j];
    let sumW = 0, sumW2 = 0, sumR = 0, sumR2 = 0;
    for (let i = 0; i < nPersons; i++) {
      let prob;
      if (p.c != null) {
        prob = p.c + (1 - p.c) / (1 + Math.exp(-p.a * (personScores[i] - p.b)));
      } else if (p.b != null) {
        prob = 1 / (1 + Math.exp(-p.a * (personScores[i] - p.b)));
      } else {
        prob = 0.5;
      }
      const resid = (responseMatrix[i][j] - prob);
      const v = prob * (1 - prob);
      if (v > 0) {
        const z2 = resid * resid / v;
        const w = v;
        sumW += w; sumW2 += w * w;
        sumR += z2; sumR2 += z2 * z2;
      }
    }
    const infitMnsq = sumW > 0 ? sumR / sumW : 1;
    const outfitMnsq = nPersons > 0 ? sumR / nPersons : 1;
    const qInfit = Math.sqrt(2 / nPersons);
    const qOutfit = Math.sqrt(2 / nPersons);
    const infitZstd = infitMnsq > 0 ? (Math.pow(infitMnsq, 1 / 3) - 1) * (3 / qInfit) + qInfit / 3 : 0;
    const outfitZstd = outfitMnsq > 0 ? (Math.pow(outfitMnsq, 1 / 3) - 1) * (3 / qOutfit) + qOutfit / 3 : 0;

    results.push({
      item: j + 1,
      infitMnsq: +infitMnsq.toFixed(4),
      infitZstd: +infitZstd.toFixed(2),
      outfitMnsq: +outfitMnsq.toFixed(4),
      outfitZstd: +outfitZstd.toFixed(2),
    });
  }

  return {
    test: 'Item Fit',
    items: results, n: nPersons,
    apa: `Item fit: ${results.filter(r => Math.abs(r.infitZstd) > 2).length} items with |ZSTD| > 2`,
  };
}

// ── Nominal Response Model ────────────────────────────────────────
export function nominalResponseModel(itemResponses, categories) {
  if (!itemResponses || itemResponses.length < 10) return null;
  const n = itemResponses.length, k = categories || 3;
  const counts = Array(k).fill(0);
  itemResponses.forEach(r => { if (r >= 0 && r < k) counts[r]++; });
  const probs = counts.map(c => +((c / n)).toFixed(4));
  const info = probs.map(p => ({ category: p, probability: +p.toFixed(4) }));
  return { test: 'Nominal Response Model', probabilities: probs, n, nCategories: k, apa: `NRM: ${k} categories, n = ${n}` };
}

// ── Generalized Partial Credit Model ──────────────────────────────
export function generalizedPartialCredit(itemScores, nCategories) {
  if (!itemScores || itemScores.length < 10) return null;
  const n = itemScores.length, k = nCategories || 3;
  const counts = Array(k).fill(0);
  itemScores.forEach(s => { if (s >= 0 && s < k) counts[s]++; });
  const thresholds = Array(k - 1).fill(0).map((_, i) => {
    const below = counts.slice(0, i + 1).reduce((s, v) => s + v, 0);
    return +Math.log(below / Math.max(n - below, 1)).toFixed(4);
  });
  return { test: 'Generalized Partial Credit', thresholds, n, nCategories: k, apa: `GPCM: ${k} categories, n = ${n}` };
}

// ── Test Equating (Tucker) ────────────────────────────────────────
export function testEquating(scoresA, scoresB) {
  if (!scoresA || !scoresB || scoresA.length < 10 || scoresB.length < 10) return null;
  const mA = avg(scoresA), mB = avg(scoresB);
  const sA = Math.sqrt(scoresA.reduce((s, v) => s + (v - mA) ** 2, 0) / scoresA.length);
  const sB = Math.sqrt(scoresB.reduce((s, v) => s + (v - mB) ** 2, 0) / scoresB.length);
  if (!sA || !sB) return null;
  const equated = scoresB.map(v => +(mA + sA / sB * (v - mB)).toFixed(4));
  return { test: 'Test Equating (Tucker)', equated: equated.slice(0, 10), slope: +(sA / sB).toFixed(4), intercept: +(mA - (sA / sB) * mB).toFixed(4), nA: scoresA.length, nB: scoresB.length, apa: `Equated: A ~ B, slope = ${(sA / sB).toFixed(2)}` };
}

// ── Mixed-Format IRT ──────────────────────────────────────────────
export function mixedFormatIRT(responses, formats) {
  if (!responses || !formats || responses.length !== formats.length || responses.length < 5) return null;
  const n = responses.length;
  const results = responses.map((r, i) => ({
    item: i + 1, format: formats[i], response: r, expected: formats[i] === 'binary' ? 0.5 : (formats[i] === 'ordinal' ? 2 : 1),
  }));
  return { test: 'Mixed-Format IRT', results, n, nBinary: formats.filter(f => f === 'binary').length, nOrdinal: formats.filter(f => f === 'ordinal').length, apa: `Mixed IRT: ${n} items` };
}

// ── DIF via Logistic Regression (Swaminathan & Rogers 1990; Zumbo 1999) ──
// Fits three nested logistic models by IRLS and compares them with
// likelihood-ratio chi-square tests:
//   M0: logit(p) = b0 + b1·score              (matching only)
//   M1: + b2·group                            (uniform DIF)
//   M2: + b3·group·score                      (non-uniform DIF)
// Uniform DIF = LR(M1 vs M0); non-uniform DIF = LR(M2 vs M1); each df=1.
function fitLogit(X, y, maxIter = 50, tol = 1e-8) {
  const n = X.length, p = X[0].length;
  let beta = Array(p).fill(0);
  for (let iter = 0; iter < maxIter; iter++) {
    const eta = X.map(row => row.reduce((s, x, j) => s + x * beta[j], 0));
    const mu = eta.map(sigmoid);
    const w = mu.map(m => Math.max(m * (1 - m), 1e-9));
    // Working response z = eta + (y - mu)/w; solve (XᵀWX)β = XᵀWz
    const z = eta.map((e, i) => e + (y[i] - mu[i]) / w[i]);
    const XtWX = Array.from({ length: p }, (_, a) =>
      Array.from({ length: p }, (_, b) => {
        let s = 0; for (let i = 0; i < n; i++) s += X[i][a] * w[i] * X[i][b]; return s;
      }));
    const XtWz = Array.from({ length: p }, (_, a) => {
      let s = 0; for (let i = 0; i < n; i++) s += X[i][a] * w[i] * z[i]; return s;
    });
    const next = solveNormalEquations(XtWX, XtWz);
    if (!next) break;
    const change = next.reduce((s, v, j) => s + Math.abs(v - beta[j]), 0);
    beta = next;
    if (change < tol) break;
  }
  const eta = X.map(row => row.reduce((s, x, j) => s + x * beta[j], 0));
  const mu = eta.map(sigmoid);
  let logLik = 0;
  for (let i = 0; i < n; i++) {
    const m = Math.min(1 - 1e-12, Math.max(1e-12, mu[i]));
    logLik += y[i] * Math.log(m) + (1 - y[i]) * Math.log(1 - m);
  }
  return { beta, logLik };
}

export function difLogistic(data, groupVar, item, totalScore) {
  if (!data || data.length < 20 || !groupVar || !item) return null;
  const n = data.length;
  const group = data.map(r => r[groupVar] === 1 ? 1 : 0);
  const resp = data.map(r => (+r[item] > 0 ? 1 : 0));
  // Reference (matching) score: supplied total, else rest score from the item's own column is
  // unavailable, so fall back to the group-blind rank position only if no total given.
  const score = totalScore ? data.map(r => +r[totalScore]) : data.map((_, i) => i % 10);
  const sMean = avg(score), sSd = Math.sqrt(sampleVar(score)) || 1;
  const zc = score.map(s => (s - sMean) / sSd); // centre/scale for IRLS conditioning
  const m0 = fitLogit(zc.map(s => [1, s]), resp);
  const m1 = fitLogit(zc.map((s, i) => [1, s, group[i]]), resp);
  const m2 = fitLogit(zc.map((s, i) => [1, s, group[i], group[i] * s]), resp);
  const chiUniform = 2 * (m1.logLik - m0.logLik);
  const chiNonUniform = 2 * (m2.logLik - m1.logLik);
  const chiTotal = 2 * (m2.logLik - m0.logLik);
  const pUniform = chiPVal(Math.max(0, chiUniform), 1);
  const pNonUniform = chiPVal(Math.max(0, chiNonUniform), 1);
  const pTotal = chiPVal(Math.max(0, chiTotal), 2);
  // Zumbo–Thomas effect-size flag on the total (2-df) DIF (Nagelkerke-style ΔR² proxy):
  const r2 = Math.max(0, 1 - Math.exp(-chiTotal / n));
  const flag = r2 < 0.13 ? 'A (negligible)' : r2 < 0.26 ? 'B (moderate)' : 'C (large)';
  return {
    test: 'DIF Logistic',
    uniform: +m1.beta[2].toFixed(4), nonUniform: +m2.beta[3].toFixed(4),
    chiUniform: +chiUniform.toFixed(4), pUniform: +pUniform.toFixed(4),
    chiNonUniform: +chiNonUniform.toFixed(4), pNonUniform: +pNonUniform.toFixed(4),
    chiTotal: +chiTotal.toFixed(4), pTotal: +pTotal.toFixed(4),
    r2: +r2.toFixed(4), flag, n,
    apa: `DIF logistic: uniform b=${m1.beta[2].toFixed(3)} (χ²(1)=${chiUniform.toFixed(2)}, ${fmtP(pUniform)}), non-uniform b=${m2.beta[3].toFixed(3)} (χ²(1)=${chiNonUniform.toFixed(2)}, ${fmtP(pNonUniform)})`,
  };
}

// ── Test-Retest Reliability ───────────────────────────────────────
export function testRetestReliability(t1, t2) {
  if (!t1 || !t2 || t1.length < 5 || t1.length !== t2.length) return null;
  const n = t1.length;
  const r = corr(t1, t2);
  const diff = t1.map((v, i) => v - t2[i]);
  const meanDiff = avg(diff);
  const sdDiff = Math.sqrt(sampleVar(diff));
  const loa = [meanDiff - 1.96 * sdDiff, meanDiff + 1.96 * sdDiff];
  return { test: 'Test-Retest Reliability', r: +r.toFixed(4), meanDiff: +meanDiff.toFixed(4), loa: loa.map(v => +v.toFixed(4)), n, apa: `Test-retest: r = ${r.toFixed(3)}, mean diff = ${meanDiff.toFixed(2)}` };
}

// ── Inter-Rater Reliability (Fleiss Kappa expansion) ──────────────
export function interRaterReliability(ratings) {
  if (!ratings || !ratings.length || ratings.length < 3) return null;
  const nSubjects = ratings[0].length;
  const nRaters = ratings.length;
  const categories = [...new Set(ratings.flat())];
  if (categories.length < 2) return null;
  const k = categories.length;
  const nij = Array.from({ length: nSubjects }, () => Array(k).fill(0));
  for (let i = 0; i < nSubjects; i++) {
    for (const rater of ratings) {
      const idx = categories.indexOf(rater[i]);
      if (idx >= 0) nij[i][idx]++;
    }
  }
  const pj = Array(k).fill(0);
  for (let i = 0; i < nSubjects; i++) for (let j = 0; j < k; j++) pj[j] += nij[i][j];
  for (let j = 0; j < k; j++) pj[j] /= nSubjects * nRaters;
  const Pi = nij.map(ni => {
    let sum = 0;
    for (let j = 0; j < k; j++) sum += ni[j] * (ni[j] - 1);
    return sum / (nRaters * (nRaters - 1));
  });
  const Pbar = avg(Pi);
  const Pe = pj.reduce((s, p) => s + p * p, 0);
  const fleissKappa = Pe < 1 ? (Pbar - Pe) / (1 - Pe) : 0;
  return { test: 'Inter-Rater Reliability', kappa: +fleissKappa.toFixed(4), nSubjects, nRaters, apa: `Fleiss k = ${fleissKappa.toFixed(3)}, ${nRaters} raters` };
}

// ── Parallel Forms Reliability ────────────────────────────────────
export function parallelFormsReliability(formA, formB) {
  if (!formA || !formB || formA.length < 5 || formA.length !== formB.length) return null;
  const n = formA.length;
  const r = corr(formA, formB);
  const rCorrected = 2 * r / (1 + r);
  return { test: 'Parallel Forms Reliability', r: +r.toFixed(4), corrected: +rCorrected.toFixed(4), n, apa: `Parallel forms: r = ${r.toFixed(3)}, corrected = ${rCorrected.toFixed(3)}` };
}

// ── Item Difficulty Index (P-value) ───────────────────────────────
export function itemDifficultyIndex(responses) {
  if (!responses || responses.length < 5 || !responses[0]?.length) return null;
  const nItems = responses[0].length;
  const nExaminees = responses.length;
  const difficulties = Array.from({ length: nItems }, (_, j) => {
    const correct = responses.filter(r => r[j] === 1).length;
    return +((correct / nExaminees)).toFixed(4);
  });
  return { test: 'Item Difficulty Index', difficulties, nItems, nExaminees, apa: `Item difficulty: ${difficulties.map(d => d.toFixed(2)).join(', ')}` };
}

// ── Item Discrimination Index ─────────────────────────────────────
export function itemDiscriminationIndex(responses, totalScores = null) {
  if (!responses || responses.length < 10 || !responses[0]?.length) return null;
  const nExaminees = responses.length;
  const nItems = responses[0].length;
  const totals = totalScores || responses.map(r => r.reduce((s, v) => s + v, 0));
  const sorted = totals.map((t, i) => ({ i, t })).sort((a, b) => b.t - a.t);
  const nTop = Math.floor(nExaminees * 0.27);
  const topIdx = new Set(sorted.slice(0, nTop).map(s => s.i));
  const bottomIdx = new Set(sorted.slice(-nTop).map(s => s.i));
  const discriminations = Array.from({ length: nItems }, (_, j) => {
    let topCorrect = 0, bottomCorrect = 0;
    for (let i = 0; i < nExaminees; i++) {
      if (topIdx.has(i)) topCorrect += responses[i][j];
      if (bottomIdx.has(i)) bottomCorrect += responses[i][j];
    }
    return +((topCorrect - bottomCorrect) / nTop).toFixed(4);
  });
  return { test: 'Item Discrimination Index', discriminations, nItems, nExaminees, apa: `Item disc: ${discriminations.map(d => d.toFixed(2)).join(', ')}` };
}
