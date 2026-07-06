import { avg } from '../math/core.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── Weighted Mean ───────────────────────────────────────────────────────────
/** @param {number[]} values @param {number[]} weights */
export function weightedMean(values, weights) {
  if (!values || !weights || !values.length || values.length !== weights.length) return null;
  let sumW = 0, sumV = 0;
  for (let i = 0; i < values.length; i++) {
    sumW += weights[i];
    sumV += weights[i] * values[i];
  }
  if (!sumW) return null;
  return {
    test: 'Weighted Mean',
    mean: +(sumV / sumW).toFixed(4),
    n: values.length,
    sumWeights: +sumW.toFixed(4),
    apa: `Weighted mean = ${(sumV / sumW).toFixed(3)}, n = ${values.length}`,
  };
}

// ── Weighted Variance ───────────────────────────────────────────────────────
/** @param {number[]} values @param {number[]} weights */
export function weightedVar(values, weights) {
  if (!values || !weights || values.length < 2 || values.length !== weights.length) return null;
  const n = values.length;
  let sumW = 0, sumWV = 0, sumWSq = 0;
  for (let i = 0; i < n; i++) {
    sumW += weights[i];
    sumWSq += weights[i] * weights[i];
    sumWV += weights[i] * values[i];
  }
  if (!sumW) return null;
  const muW = sumWV / sumW;
  let num = 0;
  for (let i = 0; i < n; i++) num += weights[i] * (values[i] - muW) ** 2;
  const denom = sumW - sumWSq / sumW;
  if (denom <= 0) return null;
  const variance = num / denom;
  return {
    test: 'Weighted Variance',
    variance: +variance.toFixed(4),
    sd: +Math.sqrt(variance).toFixed(4),
    se: +(Math.sqrt(variance / n)).toFixed(4),
    n,
    apa: `Weighted var = ${variance.toFixed(3)}, SD = ${Math.sqrt(variance).toFixed(3)}, n = ${n}`,
  };
}

// ── Weighted Quantile ───────────────────────────────────────────────────────
/** @param {number[]} values @param {number[]} weights @param {number} [p] */
export function weightedQuantile(values, weights, p = 0.5) {
  if (!values || !weights || !values.length || values.length !== weights.length) return null;
  if (!(p >= 0 && p <= 1)) return null;
  const n = values.length;

  // Sort by value
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => values[a] - values[b]);
  const totalW = weights.reduce((s, w) => s + w, 0);
  if (!totalW) return null;

  const target = p * totalW;
  let cumW = 0;
  for (let i = 0; i < n; i++) {
    const prevCum = cumW;
    cumW += weights[idx[i]];
    if (cumW >= target) {
      if (i === 0 || prevCum === 0) return {
        test: 'Weighted Quantile',
        quantile: +values[idx[i]].toFixed(4),
        p,
        n,
        apa: `Weighted q${(p * 100).toFixed(0)} = ${values[idx[i]].toFixed(3)}, n = ${n}`,
      };
      // Linear interpolation
      const frac = (target - prevCum) / (cumW - prevCum);
      const q = values[idx[i - 1]] + frac * (values[idx[i]] - values[idx[i - 1]]);
      return {
        test: 'Weighted Quantile',
        quantile: +q.toFixed(4),
        p,
        n,
        apa: `Weighted q${(p * 100).toFixed(0)} = ${q.toFixed(3)}, n = ${n}`,
      };
    }
  }
  // Shouldn't reach here
  return {
    test: 'Weighted Quantile',
    quantile: +values[idx[n - 1]].toFixed(4),
    p,
    n,
    apa: `Weighted q${(p * 100).toFixed(0)} = ${values[idx[n - 1]].toFixed(3)}, n = ${n}`,
  };
}

// ── Design Effect ────────────────────────────────────────────────────────────
/** @param {number[]} weights */
export function designEffect(weights) {
  if (!weights || !weights.length) return null;
  const n = weights.length;
  let sumW = 0, sumWSq = 0;
  for (const w of weights) { sumW += w; sumWSq += w * w; }
  if (!sumW) return null;
  const deff = n * sumWSq / (sumW * sumW);
  const nEff = n / deff;
  const meanW = sumW / n;
  let varW = 0;
  for (const w of weights) varW += (w - meanW) ** 2;
  varW /= n;
  const cv = Math.sqrt(varW) / meanW;

  return {
    test: 'Design Effect',
    deff: +deff.toFixed(4),
    nEff: +nEff.toFixed(1),
    n,
    cv: +cv.toFixed(4),
    apa: `DEFF = ${deff.toFixed(2)}, n_eff = ${nEff.toFixed(0)}, n = ${n}`,
  };
}

// ── Rake Weights (IPF) ──────────────────────────────────────────────────────
/** @param {number[]} initialWeights @param {object[]} targets margin targets. */
export function rakeWeights(initialWeights, targets, { maxIter = 50, tolerance = 1e-6 } = {}) {
  if (!initialWeights || !initialWeights.length || !targets || !targets.length) return null;
  const n = initialWeights.length;
  let weights = [...initialWeights];

  for (let iter = 0; iter < maxIter; iter++) {
    let maxDelta = 0;
    for (const t of targets) {
      const { cats, targets: tgt } = t;
      if (!cats || cats.length !== n || !tgt) return null;
      // Compute current marginals
      const current = {};
      for (let i = 0; i < n; i++) {
        const cat = cats[i];
        current[cat] = (current[cat] || 0) + weights[i];
      }
      // Scale weights
      for (const cat in tgt) {
        const cur = current[cat] || 0;
        const tar = tgt[cat];
        if (tar <= 0 && cur > 0) continue;
        const factor = cur > 0 ? tar / cur : 1;
        for (let i = 0; i < n; i++) {
          if (cats[i] === cat) {
            const oldW = weights[i];
            weights[i] *= factor;
            if (oldW > 0) maxDelta = Math.max(maxDelta, Math.abs(weights[i] / oldW - 1));
          }
        }
      }
    }
    if (maxDelta < tolerance) {
      return {
        test: 'Rake Weights',
        weights: weights.map(w => +w.toFixed(6)),
        nIter: iter + 1,
        converged: true,
        n,
        apa: `Raked weights: converged in ${iter + 1} iterations, n = ${n}`,
      };
    }
  }

  return {
    test: 'Rake Weights',
    weights: weights.map(w => +w.toFixed(6)),
    nIter: maxIter,
    converged: false,
    n,
    apa: `Raked weights: did not converge in ${maxIter} iterations, n = ${n}`,
  };
}

// ── Calibration Weights ────────────────────────────────────────────────────
/** @param {number[]} initialWeights @param {number[][]} auxVars @param {number[]} targets */
export function calibrationWeights(initialWeights, auxVars, targets, { lo = 0, hi = Infinity, maxIter = 50 } = {}) {
  if (!initialWeights || initialWeights.length < 10 || !auxVars || !auxVars.length || !targets || auxVars.length !== targets.length) return null;
  const n = initialWeights.length;
  let weights = [...initialWeights];
  const k = auxVars.length;

  for (let iter = 0; iter < maxIter; iter++) {
    // Compute current totals
    const current = Array(k).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < k; j++) current[j] += weights[i] * auxVars[j][i];
    }
    const residuals = targets.map((t, j) => t - current[j]);
    // Newton: J_kj = Σ w_i * aux_ik * aux_ij
    const J = Array.from({ length: k }, () => Array(k).fill(0));
    for (let a = 0; a < k; a++) {
      for (let b = 0; b < k; b++) {
        for (let i = 0; i < n; i++) J[a][b] += weights[i] * auxVars[a][i] * auxVars[b][i];
      }
    }
    // Cholesky-like solve: J * eta = residuals
    // Simple: scale weights proportionally (iterative proportional)
    let maxDelta = 0;
    for (let j = 0; j < k; j++) {
      let currentTotal = 0;
      for (let i = 0; i < n; i++) currentTotal += weights[i] * auxVars[j][i];
      const factor = currentTotal > 0 ? targets[j] / currentTotal : 1;
      for (let i = 0; i < n; i++) {
        if (auxVars[j][i] > 0) {
          const oldW = weights[i];
          weights[i] *= factor;
          weights[i] = Math.max(lo, Math.min(hi, weights[i]));
          maxDelta = Math.max(maxDelta, Math.abs(weights[i] / Math.max(oldW, 1e-10) - 1));
        }
      }
    }
    if (maxDelta < 1e-6) {
      return {
        test: 'Calibration Weights',
        weights: weights.map(w => +w.toFixed(6)),
        converged: true,
        nIter: iter + 1,
        n,
        apa: `Calibration: converged in ${iter + 1} iterations, n = ${n}`,
      };
    }
  }
  return {
    test: 'Calibration Weights',
    weights: weights.map(w => +w.toFixed(6)),
    converged: false,
    nIter: maxIter,
    n,
    apa: `Calibration: did not converge in ${maxIter} iterations, n = ${n}`,
  };
}

// ── Post-Stratification ────────────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {number[]} weights @param {string} strataVar @param {Record<string, number>} popTotals */
export function postStratification(data, weights, strataVar, popTotals) {
  if (!data || !weights || data.length < 10 || !strataVar || !popTotals) return null;
  const n = data.length;
  if (n !== weights.length) return null;
  const strata = [...new Set(data.map(r => r[strataVar]))];
  if (strata.length < 2) return null;

  const adjusted = [...weights];
  const strataInfo = strata.map(s => {
    const idx = [];
    data.forEach((r, i) => { if (r[strataVar] === s) idx.push(i); });
    const current = idx.reduce((sum, i) => sum + weights[i], 0);
    const target = popTotals[s] || current;
    const factor = current > 0 ? target / current : 1;
    idx.forEach(i => { adjusted[i] = adjusted[i] * factor; });
    return { stratum: s, factor: +factor.toFixed(4), n: idx.length };
  });

  return {
    test: 'Post-Stratification',
    weights: adjusted.map(w => +w.toFixed(6)),
    strata: strataInfo,
    n,
    apa: `Post-stratified: ${strata.length} strata, n = ${n}`,
  };
}

// ── Weighted Correlation ────────────────────────────────────────────────────
/** @param {number[]} x @param {number[]} y @param {number[]} weights */
export function weightedCorrelation(x, y, weights) {
  if (!x || !y || !weights || x.length < 5 || x.length !== y.length || x.length !== weights.length) return null;
  const n = x.length;
  let sw = 0, swx = 0, swy = 0;
  for (let i = 0; i < n; i++) { sw += weights[i]; swx += weights[i] * x[i]; swy += weights[i] * y[i]; }
  if (!sw) return null;
  const mx = swx / sw, my = swy / sw;
  let cov = 0, vx = 0, vy = 0;
  for (let i = 0; i < n; i++) {
    cov += weights[i] * (x[i] - mx) * (y[i] - my);
    vx += weights[i] * (x[i] - mx) ** 2;
    vy += weights[i] * (y[i] - my) ** 2;
  }
  if (!vx || !vy) return null;
  const r = cov / Math.sqrt(vx * vy);
  return {
    test: 'Weighted Correlation',
    r: +r.toFixed(4),
    n,
    apa: `Weighted r = ${r.toFixed(3)}, n = ${n}`,
  };
}

// ── Effective Sample Size ──────────────────────────────────────────────────
/** @param {number[]} weights */
export function effectiveSampleSize(weights) {
  if (!weights || !weights.length) return null;
  const n = weights.length;
  let sumW = 0, sumWSq = 0;
  for (const w of weights) { sumW += w; sumWSq += w * w; }
  if (!sumW) return null;
  const nEff = sumW * sumW / sumWSq;
  const deff = n / nEff;
  return {
    test: 'Effective Sample Size',
    nEff: +nEff.toFixed(1),
    deff: +deff.toFixed(4),
    n,
    apa: `n_eff = ${nEff.toFixed(0)}, DEFF = ${deff.toFixed(2)}, n = ${n}`,
  };
}

// ── BRR Weights ───────────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} strataVar @param {string} psuVar */
export function brrWeights(data, strataVar, psuVar, { method = 'fay', epsilon = 0.3 } = {}) {
  if (!data || data.length < 20 || !strataVar || !psuVar) return null;
  const n = data.length;
  const strata = [...new Set(data.map(r => r[strataVar]))];
  // Hadamard matrix for +/-1 weights
  const R = Math.ceil(Math.log2(strata.length)) + 2;
  const nRep = Math.max(2, R);
  const replicates = [];
  for (let r = 0; r < nRep; r++) {
    const w = Array(n).fill(1);
    strata.forEach((s, si) => {
      const idx = data.reduce((arr, row, i) => { if (row[strataVar] === s) arr.push(i); return arr; }, []);
      const factor = (si === r % strata.length) ? (1 + epsilon) : (1 - epsilon);
      idx.forEach(i => { w[i] *= factor; });
    });
    replicates.push(w.map(v => +v.toFixed(6)));
  }
  return { test: 'BRR Weights', replicates, nRep, nStrata: strata.length, n, apa: `BRR: ${nRep} replicates, ${strata.length} strata` };
}

// ── Jackknife Replicates ──────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} strataVar @param {string} psuVar */
export function jackknifeReplicates(data, strataVar, psuVar, { method = 'JK1' } = {}) {
  if (!data || data.length < 20 || !strataVar || !psuVar) return null;
  const n = data.length;
  const strata = [...new Set(data.map(r => r[strataVar]))];
  const replicates = [];
  for (const s of strata) {
    const psus = [...new Set(data.filter(r => r[strataVar] === s).map(r => r[psuVar]))];
    for (const p of psus) {
      const w = Array(n).fill(1);
      const idx = data.reduce((arr, r, i) => { if (r[strataVar] === s && r[psuVar] === p) arr.push(i); return arr; }, []);
      const stratumIdx = data.reduce((arr, r, i) => { if (r[strataVar] === s) arr.push(i); return arr; }, []);
      const factor = psus.length / (psus.length - 1);
      idx.forEach(i => { w[i] = 0; });
      stratumIdx.forEach(i => { if (!idx.includes(i)) w[i] *= factor; });
      replicates.push(w.map(v => +v.toFixed(6)));
    }
  }
  return { test: 'Jackknife Replicates', replicates, nRep: replicates.length, nStrata: strata.length, n, apa: `JK: ${replicates.length} replicates, ${strata.length} strata` };
}

// Fay's Replicate Weights
/** @param {Array<Record<string, any>>} data @param {string} strataVar @param {string} psuVar */
export function fayReplicates(data, strataVar, psuVar, { epsilon = 0.3 } = {}) {
  if (!data || data.length < 20 || !strataVar || !psuVar) return null;
  const n = data.length;
  const strata = [...new Set(data.map(r => r[strataVar]))];
  const replicates = [];
  const R = Math.min(8, strata.length * 2);
  for (let r = 0; r < R; r++) {
    const w = Array(n).fill(1);
    strata.forEach((s, si) => {
      const idx = data.reduce((arr, row, i) => { if (row[strataVar] === s) arr.push(i); return arr; }, []);
      const mult = (si % (r + 2) === 0) ? (1 + epsilon) : (1 - epsilon / (strata.length));
      idx.forEach(i => { w[i] *= Math.max(0.1, mult); });
    });
    replicates.push(w.map(v => +v.toFixed(6)));
  }
  return { test: "Fay's Replicates", replicates, nRep: R, epsilon, n, apa: `Fay: ε=${epsilon}, ${R} reps` };
}

// ── Taylor Linearization ──────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string[]} xVars @param {string} strataVar @param {string} psuVar */
export function taylorLinearization(data, yVar, xVars, strataVar, psuVar) {
  if (!data || data.length < 20 || !yVar || !strataVar || !psuVar) return null;
  const n = data.length;
  const y = data.map(r => +r[yVar]);
  const total = y.reduce((s, v) => s + v, 0);
  const strata = [...new Set(data.map(r => r[strataVar]))];
  let se2 = 0;
  for (const s of strata) {
    const psus = [...new Set(data.filter(r => r[strataVar] === s).map(r => r[psuVar]))];
    const nH = psus.length;
    const means = psus.map(p => {
      const vals = data.filter(r => r[strataVar] === s && r[psuVar] === p).map(r => +r[yVar]);
      return vals.reduce((a, v) => a + v, 0) / vals.length;
    });
    const mH = means.reduce((a, v) => a + v, 0) / nH;
    const varH = means.reduce((a, v) => a + (v - mH) ** 2, 0) / (nH - 1);
    se2 += (nH / (nH - 1)) * varH;
  }
  return { test: 'Taylor Linearization', total: +total.toFixed(4), se: +Math.sqrt(se2).toFixed(4), n, nStrata: strata.length, apa: `Total = ${total.toFixed(2)}, SE = ${Math.sqrt(se2).toFixed(2)}` };
}

// ── Design Total (Horvitz-Thompson) ───────────────────────────────
/** @param {number[]} vals @param {number[]} weights */
export function designTotal(vals, weights) {
  if (!vals || !weights || !vals.length || vals.length !== weights.length) return null;
  const n = vals.length;
  let total = 0, sw = 0, sw2 = 0;
  for (let i = 0; i < n; i++) { total += weights[i] * vals[i]; sw += weights[i]; sw2 += weights[i] * weights[i]; }
  if (!sw) return null;
  const se = Math.sqrt(sw2 / (sw * sw) * vals.reduce((s, v) => s + (v - total / sw) ** 2, 0) / n);
  return { test: 'Design Total', total: +total.toFixed(4), se: +se.toFixed(4), n, apa: `HT total = ${total.toFixed(2)}, SE = ${se.toFixed(2)}` };
}

// ── PPS Sampling ──────────────────────────────────────────────────
/** @param {number} [seed] @param {number[]} sizes @param {number} nSample */
export function ppsSampling(sizes, nSample, seed = 42) {
  __rng = mulberry32(seed);
  if (!sizes || !sizes.length || nSample < 1) return null;
  const total = sizes.reduce((s, v) => s + v, 0);
  if (!total) return null;
  const probs = sizes.map(v => v / total);
  const sample = [];
  const used = new Set();
  while (sample.length < nSample) {
    const u = __rng();
    let cum = 0; let sel = 0;
    for (let i = 0; i < sizes.length; i++) { cum += probs[i]; if (u <= cum && !used.has(i)) { sel = i; break; } }
    used.add(sel);
    sample.push({ index: sel, size: sizes[sel], prob: +probs[sel].toFixed(4) });
  }
  return { test: 'PPS Sampling', sample, nPopulation: sizes.length, nSample, apa: `PPS: ${nSample} of ${sizes.length}` };
}

// ── Systematic Sample ─────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {number} [seed] @param {number} nSample */
export function systematicSample(data, nSample, seed = 42) {
  __rng = mulberry32(seed);
  if (!data || !data.length || nSample < 1) return null;
  const n = data.length, k = Math.floor(n / nSample);
  if (k < 1) return null;
  const start = Math.floor(__rng() * k);
  const sampled = [];
  for (let i = start; i < n; i += k) sampled.push(data[i]);
  return { test: 'Systematic Sample', sample: sampled, nOriginal: n, nSampled: sampled.length, interval: k, apa: `Systematic: ${sampled.length}/${n} sampled` };
}

// ── Multistage Variance ───────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} strataVar @param {string} clusterVar @param {string} yVar */
export function multistageVariance(data, strataVar, clusterVar, yVar) {
  if (!data || data.length < 10 || !strataVar || !clusterVar || !yVar) return null;
  const n = data.length;
  const y = data.map(r => +r[yVar]);
  const strata = [...new Set(data.map(r => r[strataVar]))];
  let totalVar = 0;
  strata.forEach(s => {
    const memb = data.filter(r => r[strataVar] === s);
    const clusters = [...new Set(memb.map(r => r[clusterVar]))];
    const means = clusters.map(c => avg(memb.filter(r => r[clusterVar] === c).map(r => +r[yVar])));
    const m = avg(means);
    totalVar += clusters.length > 2 ? means.reduce((s, v) => s + (v - m) ** 2, 0) / (clusters.length - 1) : 0;
  });
  return { test: 'Multistage Variance', variance: +totalVar.toFixed(4), n, nStrata: strata.length, apa: `Multistage var = ${totalVar.toFixed(3)}` };
}

// ── Domain Total/Mean ─────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string} domainVar */
export function domainTotal(data, yVar, domainVar) {
  if (!data || data.length < 5 || !yVar || !domainVar) return null;
  const domains = [...new Set(data.map(r => r[domainVar]))];
  const estimates = domains.map(d => {
    const memb = data.filter(r => r[domainVar] === d);
    const vals = memb.map(r => +r[yVar]);
    return { domain: d, n: vals.length, total: +vals.reduce((s, v) => s + v, 0).toFixed(4), mean: +avg(vals).toFixed(4) };
  });
  return { test: 'Domain Total', estimates, n: data.length, nDomains: domains.length, apa: `Domains: ${domains.length} groups` };
}

// ── Non-Response Adjustment (IPW) ─────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} responseVar @param {string[]} covarVars */
export function nonresponseAdjustment(data, responseVar, covarVars) {
  if (!data || data.length < 10 || !responseVar || !covarVars) return null;
  const n = data.length;
  const responded = data.map(r => r[responseVar] === 1 ? 1 : 0);
  const nr = responded.filter(r => r === 1).length;
  const pct = nr / n;
  const X = data.map(r => covarVars.map(c => +r[c]));
  const Xt = X[0].map((_, j) => X.map(r => r[j]));
  const XtX = Xt.map(r1 => X[0].map((_, j) => r1.reduce((s, _, k) => s + X[k][j] * r1[k], 0)));
  const XtR = Xt.map(r1 => r1.reduce((s, v, k) => s + v * responded[k], 0));
  const beta = solveNormalEquations(XtX, XtR);
  const weights = X.map(xi => 1 / Math.max(0.01, (beta.reduce((s, b, j) => s + b * xi[j], 0) / n)));
  const adjWt = weights.map((w, i) => +(w * (responded[i] ? 1 : 0)).toFixed(4));
  return { test: 'Non-Response Adjustment', adjustedWeights: adjWt.slice(0, 10), n, responseRate: +pct.toFixed(4), apa: `NR adjust: response rate = ${(pct * 100).toFixed(0)}%` };
}
