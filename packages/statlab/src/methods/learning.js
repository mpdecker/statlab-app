import { avg, sampleSD, sampleVar, fmtP } from '../math/core.js';
import { matInv } from '../math/matrix.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

function weightedOLS(Y, X, weights = null) {
  if (!Y || !X || Y.length < 2) return null;
  const n = Y.length;
  const isSimple = typeof X[0] === 'number';
  /* v8 ignore start */
  if (isSimple) {
    const xs = X, ys = Y;
    const w = weights || Array(n).fill(1);
    let sw = 0, swx = 0, swy = 0, swxx = 0, swxy = 0;
    for (let i = 0; i < n; i++) {
      sw += w[i]; swx += w[i] * xs[i]; swy += w[i] * ys[i];
      swxx += w[i] * xs[i] * xs[i]; swxy += w[i] * xs[i] * ys[i];
    }
    const denom = sw * swxx - swx * swx;
    const b1 = denom ? (sw * swxy - swx * swy) / denom : 0;
    const b0 = denom ? (swxx * swy - swx * swxy) / denom : 0;
    const fitted = xs.map(x => b0 + b1 * x);
    const resid = ys.map((y, i) => y - fitted[i]);
    return { coefficients: [b0, b1], fitted, resid, n, k: 2 };
  }
  /* v8 ignore stop */
  const k = X[0].length;
  const w = weights || Array(n).fill(1);
  const XtWX = Array.from({ length: k }, (_, i) =>
    Array.from({ length: k }, (_, j) => X.reduce((s, row, r) => s + w[r] * row[i] * row[j], 0))
  );
  const XtWY = Array.from({ length: k }, (_, i) => X.reduce((s, row, r) => s + w[r] * row[i] * Y[r], 0));
  const inv = matInv(XtWX);
  if (!inv) return null;
  const coeffs = Array.from({ length: k }, (_, i) => inv[i].reduce((s, v, j) => s + v * XtWY[j], 0));
  const fitted = Y.map((_, i) => X[i].reduce((s, x, j) => s + coeffs[j] * x, 0));
  const resid = Y.map((y, i) => y - fitted[i]);
  return { coefficients: coeffs, fitted, resid, n, k };
}

/** @param {number[]} y @param {number[][]} X */
export function elasticNet(y, X, { lambda = 0.1, alpha = 0.5, maxIter = 200, tolerance = 1e-5 } = {}) {
  if (!y || !X || y.length < 3 || lambda < 0 || alpha < 0 || alpha > 1) return null;
  const n = y.length;
  const isSimple = typeof X[0] === 'number';
  const Xmat = isSimple ? X.map(x => [1, x]) : X.map(row => [1, ...row]);
  const k = Xmat[0].length;
  let coef = Array(k).fill(0);
  const yc = y.map(v => v - avg(y));
  const Xc = Xmat.map(row => {
    const means = row.map((_, j) => j === 0 ? 0 : avg(Xmat.map(r => r[j])));
    return row.map((v, j) => j === 0 ? 1 : v - means[j]);
  });
  for (let iter = 0; iter < maxIter; iter++) {
    let maxDelta = 0;
    for (let j = 1; j < k; j++) {
      let rho = 0, phi = 0;
      for (let i = 0; i < n; i++) {
        let pred = 0;
        for (let p = 0; p < k; p++) if (p !== j) pred += coef[p] * Xc[i][p];
        const resid = yc[i] - pred;
        rho += Xc[i][j] * resid;
        phi += Xc[i][j] * Xc[i][j];
      }
      rho /= n; phi /= n;
      const old = coef[j];
      coef[j] = Math.max(0, Math.abs(rho) - lambda * alpha) / (phi + lambda * (1 - alpha) + 1e-10) * Math.sign(rho);
      maxDelta = Math.max(maxDelta, Math.abs(coef[j] - old));
    }
    let sumPred = 0;
    for (let i = 0; i < n; i++) {
      let pred = 0;
      for (let p = 1; p < k; p++) pred += coef[p] * Xc[i][p];
      sumPred += yc[i] - pred;
    }
    coef[0] = sumPred / n;
    if (maxDelta < tolerance) break;
  }
  const fitted = Xmat.map(row => row.reduce((s, v, j) => s + coef[j] * v, 0));
  const resid = y.map((v, i) => v - fitted[i]);
  const mse = resid.reduce((s, e) => s + e * e, 0) / n;
  const Xnames = isSimple ? ['x'] : Array.from({ length: X[0].length }, (_, j) => `X${j + 1}`);
  return {
    test: alpha === 0 ? 'Ridge Regression' : alpha === 1 ? 'Lasso Regression' : 'Elastic Net',
    coefficients: [['Intercept', +coef[0].toFixed(6)], ...Xnames.map((name, j) => [name, +coef[j + 1].toFixed(6)])],
    lambda, alpha, mse: +mse.toFixed(6), n,
    fitted: fitted.map(v => +v.toFixed(6)),
    apa: `${alpha === 0 ? 'Ridge' : alpha === 1 ? 'Lasso' : 'Elastic Net'} (Î» = ${lambda}, Î± = ${alpha}): MSE = ${mse.toFixed(4)}`,
  };
}

/** @param {number[]} y @param {number[][]} X */
export function elasticNetCV(y, X, { alpha = 0.5, k = 5, lambdaGrid = null, maxIter = 200 } = {}) {
  if (!y || !X || y.length < 10) return null;
  const n = y.length;
  const Xmat = (!Array.isArray(X[0]) || X[0].length === undefined) ? X.map(x => [x]) : X;
  const lambdas = lambdaGrid || [0.001, 0.01, 0.1, 1, 10];
  const foldSize = Math.floor(n / k);
  let bestLambda = lambdas[0], bestMSE = Infinity, bestModel = null;
  for (const lam of lambdas) {
    let totalMSE = 0;
    for (let fold = 0; fold < k; fold++) {
      const testStart = fold * foldSize, testEnd = (fold === k - 1) ? n : (fold + 1) * foldSize;
      const trainY = y.filter((_, i) => i < testStart || i >= testEnd);
      const trainX = Xmat.filter((_, i) => i < testStart || i >= testEnd);
      const testY = y.slice(testStart, testEnd);
      const testX = Xmat.slice(testStart, testEnd);
      const model = elasticNet(trainY, trainX, { lambda: lam, alpha, maxIter: 100, tolerance: 1e-4 });
      if (!model) continue;
      const preds = testX.map(row => {
        let pred = model.coefficients[0]?.[1] ?? 0;
        for (let j = 0; j < row.length; j++) pred += (model.coefficients[j + 1]?.[1] ?? 0) * row[j];
        return pred;
      });
      let mse = 0;
      for (let i = 0; i < preds.length; i++) mse += (testY[i] - preds[i]) ** 2;
      totalMSE += mse / preds.length;
    }
    const avgMSE = totalMSE / k;
    if (avgMSE < bestMSE) { bestMSE = avgMSE; bestLambda = lam; }
  }
  bestModel = elasticNet(y, Xmat, { lambda: bestLambda, alpha, maxIter });
  return {
    bestLambda, bestMSE: +bestMSE.toFixed(6), model: bestModel, k, alpha,
    apa: `${alpha === 0 ? 'Ridge' : alpha === 1 ? 'Lasso' : 'Elastic Net'} CV (k = ${k}): best Î» = ${bestLambda}, MSE = ${bestMSE.toFixed(4)}`,
  };
}

/** @param {number[][]} X @param {number[]} y @param {(X: number[][], y: number[]) => any} trainFn @param {(model: any, X: number[][]) => number[]} predictFn */
export function kFoldCV(X, y, trainFn, predictFn, { k = 5 } = {}) {
  if (!X || !y || !trainFn || !predictFn || X.length < k) return null;
  const n = X.length;
  const foldSize = Math.floor(n / k);
  const msePerFold = [];
  for (let fold = 0; fold < k; fold++) {
    const testStart = fold * foldSize, testEnd = fold < k - 1 ? (fold + 1) * foldSize : n;
    const trainX = X.filter((_, i) => i < testStart || i >= testEnd);
    const trainY = y.filter((_, i) => i < testStart || i >= testEnd);
    const testX = X.slice(testStart, testEnd);
    const testY = y.slice(testStart, testEnd);
    const model = trainFn(trainX, trainY);
    const preds = predictFn(model, testX);
    let mse = 0;
    for (let i = 0; i < preds.length; i++) mse += (testY[i] - preds[i]) ** 2;
    msePerFold.push(mse / preds.length);
  }
  const meanMSE = avg(msePerFold);
  return {
    k, msePerFold: msePerFold.map(v => +v.toFixed(6)),
    meanMSE: +meanMSE.toFixed(6),
    sdMSE: +sampleSD(msePerFold).toFixed(6),
    apa: `k-fold CV (k = ${k}): mean MSE = ${meanMSE.toFixed(4)}`,
  };
}

// ── Huber Regression ──────────────────────────────────────────────

/** @param {number[]} y @param {number[][]} X */
export function huberRegression(y, X, { c = 1.345, maxIter = 50, tolerance = 1e-6 } = {}) {
  if (!y || !X || y.length < 3) return null;
  const n = y.length;
  const isSimple = typeof X[0] === 'number';
  const Xmat = isSimple ? X.map(x => [1, x]) : X.map(row => [1, ...row]);
  let result = weightedOLS(y, Xmat);
  if (!result) return null;
  for (let iter = 0; iter < maxIter; iter++) {
    const sigma = result.resid.reduce((s, e) => s + Math.abs(e), 0) / (n * 0.6745) || 1;
    const weights = result.resid.map(r => {
      const scaled = Math.abs(r) / (sigma || 1e-10);
      return scaled <= c ? 1 : c / scaled;
    });
    const newResult = weightedOLS(y, Xmat, weights);
    if (!newResult) break;
    let delta = 0;
    for (let j = 0; j < result.coefficients.length; j++) delta += (result.coefficients[j] - newResult.coefficients[j]) ** 2;
    result = newResult;
    if (delta < tolerance) break;
  }
  const Xnames = isSimple ? ['x'] : Array.from({ length: X[0].length }, (_, j) => `X${j + 1}`);
  return {
    test: 'Huber Regression',
    coefficients: [['Intercept', +result.coefficients[0].toFixed(6)], ...Xnames.map((name, j) => [name, +result.coefficients[j + 1].toFixed(6)])],
    c, n,
    apa: `Huber regression (c = ${c}): Î²â‚€ = ${result.coefficients[0].toFixed(4)}, n = ${n}`,
  };
}

/** @param {number[]} y @param {number[][]} X */
export function tukeyBisquareRegression(y, X, { c = 4.685, maxIter = 50, tolerance = 1e-6 } = {}) {
  if (!y || !X || y.length < 3) return null;
  const n = y.length;
  const isSimple = typeof X[0] === 'number';
  const Xmat = isSimple ? X.map(x => [1, x]) : X.map(row => [1, ...row]);
  let result = weightedOLS(y, Xmat);
  if (!result) return null;
  for (let iter = 0; iter < maxIter; iter++) {
    const sigma = result.resid.reduce((s, e) => s + Math.abs(e), 0) / (n * 0.6745) || 1;
    const weights = result.resid.map(r => {
      const scaled = Math.abs(r) / (sigma || 1e-10);
      return scaled <= c ? Math.pow(1 - (scaled / c) ** 2, 2) : 0;
    });
    const newResult = weightedOLS(y, Xmat, weights);
    if (!newResult) break;
    let delta = 0;
    for (let j = 0; j < result.coefficients.length; j++) delta += (result.coefficients[j] - newResult.coefficients[j]) ** 2;
    result = newResult;
    if (delta < tolerance) break;
  }
  const Xnames = isSimple ? ['x'] : Array.from({ length: X[0].length }, (_, j) => `X${j + 1}`);
  return {
    test: "Tukey's Bisquare Regression",
    coefficients: [['Intercept', +result.coefficients[0].toFixed(6)], ...Xnames.map((name, j) => [name, +result.coefficients[j + 1].toFixed(6)])],
    c, n,
    apa: `Tukey bisquare regression (c = ${c}): Î²â‚€ = ${result.coefficients[0].toFixed(4)}, n = ${n}`,
  };
}

/** @param {number[]} xs @param {number[]} ys */
export function lowess(xs, ys, { bandwidth = 0.3, deg = 1 } = {}) {
  if (!xs || !ys || xs.length < 5 || xs.length !== ys.length) return null;
  if (bandwidth <= 0 || bandwidth > 1) return null;
  if (ys.some(v => !Number.isFinite(v))) return null;
  const n = xs.length;
  const windowWidth = Math.max(3, Math.floor(bandwidth * n));
  const half = Math.floor(windowWidth / 2);
  const sorted = xs.map((x, i) => ({ x, y: ys[i], idx: i })).sort((a, b) => a.x - b.x);
  const result = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const target = sorted[i].x;
    const lo = Math.max(0, i - half);
    const hi = Math.min(n - 1, i + half);
    const points = [];
    for (let j = lo; j <= hi; j++) {
      const dst = Math.abs(sorted[j].x - target);
      const maxDst = Math.max(Math.abs(sorted[lo].x - target), Math.abs(sorted[hi].x - target));
      const u = dst / (maxDst || 1);
      const w = u < 1 ? Math.pow(1 - u * u * u, 3) : 0;
      points.push({ x: sorted[j].x, y: sorted[j].y, w, idx: sorted[j].idx });
    }
    if (deg === 1) {
      let sx = 0, sy = 0, sw = 0, sxx = 0, sxy = 0;
      for (const p of points) {
        sx += p.w * p.x; sy += p.w * p.y; sw += p.w;
        sxx += p.w * p.x * p.x; sxy += p.w * p.x * p.y;
      }
      const denom = sw * sxx - sx * sx;
      const a = denom ? (sxx * sy - sx * sxy) / denom : 0;
      const b = denom ? (sw * sxy - sx * sy) / denom : 0;
      result[sorted[i].idx] = a + b * target;
    } else {
      result[sorted[i].idx] = points.reduce((s, p) => s + p.w * p.y, 0) / (points.reduce((s, p) => s + p.w, 0) || 1);
    }
  }
  return result.map(v => +v.toFixed(6));
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function mode(arr) {
  const counts = {};
  for (const v of arr) counts[v] = (counts[v] || 0) + 1;
  let best = arr[0], bestC = 0;
  for (const k in counts) { if (counts[k] > bestC) { bestC = counts[k]; best = isNaN(+k) ? k : +k; } }
  return best;
}

function gini(vals) {
  const n = vals.length;
  const counts = {};
  for (const v of vals) counts[v] = (counts[v] || 0) + 1;
  let sum = 1;
  for (const c in counts) sum -= Math.pow(counts[c] / n, 2);
  return sum;
}

function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 2 ** 32; };
}

// ── CART Decision Tree (internal) ────────────────────────────────────────────
function cartTree(X, y, { type = 'regression', maxDepth = 5, minSamplesLeaf = 3, depth = 0 } = {}) {
  const n = y.length;
  if (n < minSamplesLeaf * 2 || depth >= maxDepth) {
    return type === 'regression'
      ? { leafValue: y.reduce((s, v) => s + v, 0) / n }
      : { leafValue: mode(y) };
  }

  if (type === 'regression') {
    const meanY = y.reduce((s, v) => s + v, 0) / n;
    const parentVar = y.reduce((s, v) => s + (v - meanY) ** 2, 0) / n;
    if (parentVar < 1e-10) return { leafValue: meanY };

    let bestReduction = 0, bestFeature = -1, bestThresh = 0;
    for (let f = 0; f < X.length; f++) {
      const vals = [...new Set(X[f])].sort((a, b) => a - b);
      for (let i = 0; i < vals.length - 1; i++) {
        const thresh = (vals[i] + vals[i + 1]) / 2;
        let sumL = 0, sumR = 0, sL = 0, sR = 0;
        const leftY = [], rightY = [];
        for (let j = 0; j < n; j++) {
          if (X[f][j] <= thresh) { leftY.push(y[j]); sumL += y[j]; sL++; }
          else { rightY.push(y[j]); sumR += y[j]; sR++; }
        }
        if (sL < minSamplesLeaf || sR < minSamplesLeaf) continue;
        const mL = sumL / sL, mR = sumR / sR;
        const vL = leftY.reduce((s, v) => s + (v - mL) ** 2, 0) / sL;
        const vR = rightY.reduce((s, v) => s + (v - mR) ** 2, 0) / sR;
        const reduction = parentVar - (sL / n) * vL - (sR / n) * vR;
        if (reduction > bestReduction) { bestReduction = reduction; bestFeature = f; bestThresh = thresh; }
      }
    }
    if (bestFeature < 0) return { leafValue: meanY };

    const lIdx = [], rIdx = [];
    X[bestFeature].forEach((v, i) => { if (v <= bestThresh) lIdx.push(i); else rIdx.push(i); });
    const lX = X.map(col => lIdx.map(i => col[i]));
    const lY = lIdx.map(i => y[i]);
    const rX = X.map(col => rIdx.map(i => col[i]));
    const rY = rIdx.map(i => y[i]);
    return {
      feature: bestFeature, threshold: bestThresh,
      left: cartTree(lX, lY, { type, maxDepth, minSamplesLeaf, depth: depth + 1 }),
      right: cartTree(rX, rY, { type, maxDepth, minSamplesLeaf, depth: depth + 1 }),
      leafValue: null,
    };
  }

  // classification
  let giniParent = gini(y);
  if (giniParent < 1e-10) return { leafValue: mode(y) };

  let bestReduction = 0, bestFeature = -1, bestThresh = 0;
  for (let f = 0; f < X.length; f++) {
    const vals = [...new Set(X[f])].sort((a, b) => a - b);
    for (let i = 0; i < vals.length - 1; i++) {
      const thresh = (vals[i] + vals[i + 1]) / 2;
      const leftY = [], rightY = [];
      X[f].forEach((v, j) => { if (v <= thresh) leftY.push(y[j]); else rightY.push(y[j]); });
      if (leftY.length < minSamplesLeaf || rightY.length < minSamplesLeaf) continue;
      const reduction = giniParent - (leftY.length / n) * gini(leftY) - (rightY.length / n) * gini(rightY);
      if (reduction > bestReduction) { bestReduction = reduction; bestFeature = f; bestThresh = thresh; }
    }
  }
  if (bestFeature < 0) return { leafValue: mode(y) };

  const lIdx = [], rIdx = [];
  X[bestFeature].forEach((v, i) => { if (v <= bestThresh) lIdx.push(i); else rIdx.push(i); });
  const lX = X.map(col => lIdx.map(i => col[i]));
  const lY = lIdx.map(i => y[i]);
  const rX = X.map(col => rIdx.map(i => col[i]));
  const rY = rIdx.map(i => y[i]);
  return {
    feature: bestFeature, threshold: bestThresh,
    left: cartTree(lX, lY, { type, maxDepth, minSamplesLeaf, depth: depth + 1 }),
    right: cartTree(rX, rY, { type, maxDepth, minSamplesLeaf, depth: depth + 1 }),
    leafValue: null,
  };
}

function treePredict(node, X) {
  const preds = [];
  for (let i = 0; i < X[0].length; i++) {
    let n = node;
    while (n && n.leafValue == null) {
      n = X[n.feature][i] <= n.threshold ? n.left : n.right;
    }
    preds.push(n ? n.leafValue : 0);
  }
  return preds;
}

// ── Random Forest ────────────────────────────────────────────────────────────
/** @param {number[][]} X @param {number[]} y */
export function randomForest(X, y, { nTrees = 100, maxDepth = 5, type = 'regression', seed = 42 } = {}) {
  if (!X || !y || y.length < 5 || !X.length || X[0].length !== y.length) return null;
  const n = y.length;
  const rand = lcg(seed);
  const trees = [];
  const oobPreds = Array(n).fill(0);
  const oobCounts = Array(n).fill(0);
  const oobClassVotes = type === 'classification' ? Array.from({ length: n }, () => ({})) : null;

  for (let t = 0; t < nTrees; t++) {
    // Bootstrap sample
    const sampleX = X.map(col => []);
    const sampleY = [];
    const inBag = Array(n).fill(false);
    for (let j = 0; j < n; j++) {
      const idx = Math.floor(rand() * n);
      inBag[idx] = true;
      X.forEach((col, c) => sampleX[c].push(col[idx]));
      sampleY.push(y[idx]);
    }
    const tree = cartTree(sampleX, sampleY, { type, maxDepth });
    trees.push(tree);

    // OOB predictions
    const oobIdx = [];
    for (let j = 0; j < n; j++) if (!inBag[j]) oobIdx.push(j);
    if (oobIdx.length) {
      const oobX = X.map(col => oobIdx.map(i => col[i]));
      const preds = treePredict(tree, oobX);
      for (let p = 0; p < preds.length; p++) {
        const origIdx = oobIdx[p];
        if (type === 'classification') {
          oobClassVotes[origIdx][preds[p]] = (oobClassVotes[origIdx][preds[p]] || 0) + 1;
        } else {
          oobPreds[origIdx] += preds[p];
        }
        oobCounts[origIdx]++;
      }
    }
  }

  // OOB error
  let oobErr = 0;
  if (type === 'classification') {
    let wrong = 0, total = 0;
    for (let i = 0; i < n; i++) {
      if (!oobCounts[i]) continue;
      const votes = oobClassVotes[i];
      let bestV = 0, bestC = null;
      for (const c in votes) { if (votes[c] > bestV) { bestV = votes[c]; bestC = +c; } }
      if (bestC !== y[i]) wrong++;
      total++;
    }
    oobErr = total ? wrong / total : 0;
  } else {
    let sse = 0, total = 0;
    for (let i = 0; i < n; i++) {
      if (!oobCounts[i]) continue;
      const avg = oobPreds[i] / oobCounts[i];
      sse += (y[i] - avg) ** 2;
      total++;
    }
    oobErr = total ? sse / total : 0;
  }

  // Full predictions
  const fullPreds = [];
  for (let t = 0; t < n; t++) {
    const xpt = X.map(col => [col[t]]);
    if (type === 'classification') {
      const votes = {};
      for (const tree of trees) {
        const p = treePredict(tree, xpt)[0];
        votes[p] = (votes[p] || 0) + 1;
      }
      let bestV = 0, bestC = null;
      for (const c in votes) { if (votes[c] > bestV) { bestV = votes[c]; bestC = +c; } }
      fullPreds.push(bestC);
    } else {
      let sum = 0;
      for (const tree of trees) sum += treePredict(tree, xpt)[0];
      fullPreds.push(sum / nTrees);
    }
  }

  return {
    test: 'Random Forest',
    predictions: fullPreds.map(v => +v.toFixed(6)),
    nTrees,
    oobError: +oobErr.toFixed(4),
    type,
    n,
    apa: `Random Forest (${nTrees} trees, ${type}): OOB error = ${oobErr.toFixed(3)}, n = ${n}`,
  };
}

// ── Gradient Boosting ────────────────────────────────────────────────────────
/** @param {number[][]} X @param {number[]} y */
export function gradientBoosting(X, y, { nTrees = 50, learningRate = 0.1, maxDepth = 3, type = 'regression' } = {}) {
  if (!X || !y || y.length < 5 || !X.length || X[0].length !== y.length) return null;
  const n = y.length;

  if (type === 'classification') {
    if (y.some(v => v !== 0 && v !== 1)) return null;
    let f = Array(n).fill(0);
    const p = Array(n).fill(0);
    for (let t = 0; t < nTrees; t++) {
      for (let i = 0; i < n; i++) p[i] = 1 / (1 + Math.exp(-f[i]));
      const resid = y.map((yi, i) => yi - Math.max(0.001, Math.min(0.999, p[i])));
      const tree = cartTree(X, resid, { type: 'regression', maxDepth, minSamplesLeaf: 2 });
      const preds = treePredict(tree, X);
      for (let i = 0; i < n; i++) f[i] += learningRate * (preds[i] || 0);
    }
    const finalP = f.map(fi => 1 / (1 + Math.exp(-fi)));
    return {
      test: 'Gradient Boosting',
      predictions: finalP.map(v => +v.toFixed(6)),
      predictedClasses: finalP.map(p => p >= 0.5 ? 1 : 0),
      nTrees, learningRate, maxDepth, type, n,
      apa: `Gradient Boosting (${nTrees} trees, lr = ${learningRate}, ${type}): n = ${n}`,
    };
  }

  let f = Array(n).fill(y.reduce((s, v) => s + v, 0) / n);
  for (let t = 0; t < nTrees; t++) {
    const resid = y.map((yi, i) => yi - f[i]);
    const tree = cartTree(X, resid, { type: 'regression', maxDepth, minSamplesLeaf: 2 });
    const preds = treePredict(tree, X);
    for (let i = 0; i < n; i++) f[i] += learningRate * (preds[i] || 0);
  }

  return {
    test: 'Gradient Boosting',
    predictions: f.map(v => +v.toFixed(6)),
    nTrees, learningRate, maxDepth, type, n,
    apa: `Gradient Boosting (${nTrees} trees, lr = ${learningRate}, ${type}): n = ${n}`,
  };
}

// ── Confusion Matrix ─────────────────────────────────────────────────────────
/** @param {number[]} actual @param {number[]} predicted @param {number[]} [labels] */
export function confusionMatrix(actual, predicted, labels = null) {
  if (!actual || !predicted || actual.length !== predicted.length || actual.length < 2) return null;
  const labs = labels || [...new Set([...actual, ...predicted])].sort();
  const n = actual.length;
  const k = labs.length;
  const matrix = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < n; i++) {
    const ai = labs.indexOf(actual[i]), pi = labs.indexOf(predicted[i]);
    if (ai >= 0 && pi >= 0) matrix[ai][pi]++;
  }
  let correct = 0;
  for (let i = 0; i < k; i++) correct += matrix[i][i];
  const accuracy = correct / n;
  const perClass = labs.map((lab, i) => {
    const tp = matrix[i][i];
    const fp = labs.reduce((s, _, j) => j !== i ? s + matrix[j][i] : s, 0);
    const fn = labs.reduce((s, _, j) => j !== i ? s + matrix[i][j] : s, 0);
    const tn = n - tp - fp - fn;
    const prec = tp + fp > 0 ? tp / (tp + fp) : 0;
    const rec = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = prec + rec > 0 ? 2 * prec * rec / (prec + rec) : 0;
    return { label: lab, tp, fp, tn, fn, precision: +prec.toFixed(4), recall: +rec.toFixed(4), f1: +f1.toFixed(4) };
  });
  const macroAvg = {
    precision: +(perClass.reduce((s, c) => s + c.precision, 0) / k).toFixed(4),
    recall: +(perClass.reduce((s, c) => s + c.recall, 0) / k).toFixed(4),
    f1: +(perClass.reduce((s, c) => s + c.f1, 0) / k).toFixed(4),
  };
  const microAvg = { precision: accuracy, recall: accuracy, f1: accuracy };
  return {
    test: 'Confusion Matrix',
    matrix, perClass, accuracy: +accuracy.toFixed(4), macroAvg, microAvg, n,
    apa: `Accuracy = ${accuracy.toFixed(3)}, macro F1 = ${macroAvg.f1.toFixed(3)}, n = ${n}`,
  };
}

// ── ROC AUC ──────────────────────────────────────────────────────────────────
/** @param {number[]} actual @param {number[]} scores */
export function rocAUC(actual, scores) {
  if (!actual || !scores || actual.length !== scores.length || actual.length < 5) return null;
  const labels = actual.map(v => +v);
  if (labels.every(v => v === 0) || labels.every(v => v === 1)) return null;
  const pairs = labels.map((l, i) => ({ l, s: +scores[i] })).sort((a, b) => b.s - a.s);
  let tp = 0, fp = 0;
  const totalP = labels.filter(v => v === 1).length;
  const totalN = labels.filter(v => v === 0).length;
  let prevFpr = 0, prevTpr = 0;
  let auc = 0;
  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i].l === 1) tp++; else fp++;
    if (i < pairs.length - 1 && pairs[i].s === pairs[i + 1].s) continue;
    const tpr = tp / totalP;
    const fpr = fp / totalN;
    auc += (fpr - prevFpr) * (tpr + prevTpr) / 2;
    prevFpr = fpr; prevTpr = tpr;
  }
  return {
    test: 'ROC AUC',
    auc: +auc.toFixed(4),
    n: actual.length,
    apa: `AUC = ${auc.toFixed(3)}, n = ${actual.length}`,
  };
}

// ── Classification Report ────────────────────────────────────────────────────
/** @param {number[]} actual @param {number[]} predicted @param {number[]} [labels] */
export function classificationReport(actual, predicted, labels = null) {
  const cm = confusionMatrix(actual, predicted, labels);
  if (!cm) return null;
  const perClass = cm.perClass.map(c => ({
    label: c.label,
    precision: c.precision,
    recall: c.recall,
    f1: c.f1,
    support: c.tp + c.fn,
  }));
  let weightedF1 = 0, totalSupport = 0;
  for (const c of perClass) { weightedF1 += c.f1 * c.support; totalSupport += c.support; }
  weightedF1 /= totalSupport || 1;
  return {
    test: 'Classification Report',
    accuracy: cm.accuracy,
    perClass,
    macroAvg: cm.macroAvg,
    weightedAvg: {
      precision: +(perClass.reduce((s, c) => s + c.precision * c.support, 0) / (totalSupport || 1)).toFixed(4),
      recall: cm.accuracy,
      f1: +weightedF1.toFixed(4),
    },
    n: cm.n,
    apa: `Accuracy = ${cm.accuracy.toFixed(3)}, macro F1 = ${cm.macroAvg.f1.toFixed(3)}, weighted F1 = ${weightedF1.toFixed(3)}, n = ${cm.n}`,
  };
}

// ── Label Propagation ─────────────────────────────────────────────
/** @param {number[]} X @param {number[]} y */
export function labelPropagation(X, y, { sigma = 1, maxIter = 20 } = {}) {
  if (!X || !y || X.length < 5 || X.length !== y.length) return null;
  const n = X.length;
  const W = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) =>
    i === j ? 0 : Math.exp(-X[i].reduce((s, v, k) => s + (v - X[j][k]) ** 2, 0) / (sigma * sigma))
  ));
  const D = W.map(row => row.reduce((s, v) => s + v, 0) || 1);
  const labels = [...y];
  for (let iter = 0; iter < maxIter; iter++) {
    const newLabels = labels.map((yi, i) => {
      if (yi !== null && yi !== -1) return yi;
      let s = 0, num = 0;
      for (let j = 0; j < n; j++) { s += W[i][j] * labels[j]; num += W[i][j] * (labels[j] >= 0 ? 1 : 0); }
      return num > 0 ? +(s / num).toFixed(4) : yi;
    });
    if (newLabels.every((v, i) => Math.abs(v - labels[i]) < 0.001)) break;
    for (let i = 0; i < n; i++) labels[i] = newLabels[i];
  }
  return { test: 'Label Propagation', labels: labels.map(v => +v.toFixed(4)).slice(0, 20), n, apa: `LP: ${n} nodes, ${y.filter(v => v >= 0).length} labeled` };
}

// ── Local Outlier Factor ──────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string[]} vars */
export function localOutlierFactor(data, vars, { k = 5 } = {}) {
  if (!data || data.length < k + 2 || !vars || !vars.length) return null;
  const n = data.length;
  const X = data.map(r => vars.map(v => +r[v]));
  const dists = Array.from({ length: n }, (_, i) =>
    X.map((xj, j) => ({ j, d: Math.sqrt(X[i].reduce((s, v, k2) => s + (v - xj[k2]) ** 2, 0)) }))
      .sort((a, b) => a.d - b.d).slice(1, k + 1)
  );
  const lof = X.map((_, i) => {
    const lrd = 1 / (dists[i].reduce((s, d) => s + d.d, 0) / k);
    const lofVal = dists[i].reduce((s, d) => s + (d.d / lrd), 0) / k;
    return { index: i, lof: +lofVal.toFixed(4) };
  });
  return { test: 'Local Outlier Factor', lof, k, n, apa: `LOF: k = ${k}, n = ${n}` };
}

// ── Isolation Score (simplified isolation forest) ─────────────────
/** @param {Array<Record<string, any>>} data @param {string[]} vars */
export function isolationScore(data, vars, { seed = 42, nTrees = 100 } = {}) {
  __rng = mulberry32(seed);
  if (!data || data.length < 5 || !vars || !vars.length) return null;
  const n = data.length;
  const scores = Array(n).fill(0);
  for (let t = 0; t < nTrees; t++) {
    const idx1 = Math.floor(__rng() * n);
    const idx2 = Math.floor(__rng() * n);
    if (idx1 === idx2) continue;
    const v = vars[Math.floor(__rng() * vars.length)];
    const val1 = +data[idx1][v], val2 = +data[idx2][v];
    const thresh = (val1 + val2) / 2;
    data.forEach((r, i) => {
      const outlier = (+r[v] > thresh && val1 > val2) || (+r[v] < thresh && val1 < val2);
      if (!outlier) scores[i] += 1 / nTrees;
    });
  }
  const anomaly = scores.map((s, i) => ({ index: i, score: +(1 - s).toFixed(4), anomaly: s < 0.6 }));
  return { test: 'Isolation Score', anomalyScores: anomaly.slice(0, 10), nTrees, n, apa: `Isolation: ${anomaly.filter(a => a.anomaly).length} anomalies` };
}

// ── Self-Training (SSL) ───────────────────────────────────────────
/** @param {number[]} X @param {number[]} y */
export function selfTraining(X, y, { nIterations = 5 } = {}) {
  if (!X || !y || X.length < 5 || X.length !== y.length) return null;
  const n = X.length;
  const labels = [...y];
  for (let iter = 0; iter < nIterations; iter++) {
    const unlabeled = labels.map((l, i) => l < 0 ? i : -1).filter(i => i >= 0);
    if (!unlabeled.length) break;
    for (const i of unlabeled) {
      let bestJ = -1, bestD = Infinity;
      for (let j = 0; j < n; j++) {
        if (labels[j] >= 0) {
          const d = Math.sqrt(X[i].reduce((s, v, k) => s + (v - X[j][k]) ** 2, 0));
          if (d < bestD) { bestD = d; bestJ = j; }
        }
      }
      if (bestJ >= 0) labels[i] = labels[bestJ];
    }
  }
  return { test: 'Self-Training', labels: labels.slice(0, 20), n, nIterations, apa: `Self-training: ${labels.filter(l => l >= 0).length} labeled after ${nIterations} iters` };
}

// ── Anomaly Threshold ─────────────────────────────────────────────
/** @param {number[]} scores */
export function anomalyThreshold(scores, { pct = 95 } = {}) {
  if (!scores || !scores.length) return null;
  const n = scores.length;
  const sorted = [...scores].sort((a, b) => a - b);
  const idx = Math.floor(pct / 100 * n);
  const threshold = sorted[Math.min(idx, n - 1)];
  return { test: 'Anomaly Threshold', threshold: +threshold.toFixed(4), pct, n, nAnomalies: scores.filter(s => s > threshold).length, apa: `${pct}th percentile threshold = ${threshold.toFixed(4)}` };
}

// ── Partial Dependence ────────────────────────────────────────────
/** @param {number} model @param {Array<Record<string, any>>} data @param {string[]} vars @param {string} targetVar */
export function partialDependence(model, data, vars, targetVar, { grid = 10 } = {}) {
  if (!model || !data || !data.length || !vars || targetVar == null) return null;
  const n = data.length;
  const xVals = data.map(r => +r[targetVar]);
  const xMin = Math.min(...xVals), xMax = Math.max(...xVals);
  const pd = [];
  for (let g = 0; g < grid; g++) {
    const xVal = xMin + g * (xMax - xMin) / (grid - 1);
    let sum = 0;
    for (const row of data) {
      const rowCopy = { ...row, [targetVar]: xVal };
      const xVec = vars.map(v => +rowCopy[v]);
      sum += model(xVec);
    }
    pd.push({ x: +xVal.toFixed(4), y: +(sum / n).toFixed(4) });
  }
  return { test: 'Partial Dependence', pd, grid, n, apa: `PDP: var=${targetVar}, grid=${grid}` };
}

// ── Accumulated Local Effects ─────────────────────────────────────
/** @param {number} model @param {Array<Record<string, any>>} data @param {string[]} vars @param {string} targetVar */
export function accumulatedLE(model, data, vars, targetVar, { grid = 10 } = {}) {
  if (!model || !data || !data.length || !vars || targetVar == null) return null;
  const n = data.length;
  const xVals = data.map(r => +r[targetVar]);
  const xMin = Math.min(...xVals), xMax = Math.max(...xVals);
  const binWidth = (xMax - xMin) / grid;
  const ale = [0];
  let cum = 0;
  for (let g = 1; g < grid; g++) {
    const lo = xMin + g * binWidth;
    const hi = xMin + (g + 1) * binWidth;
    const inBin = data.filter(r => +r[targetVar] >= lo && +r[targetVar] < hi);
    let dif = 0;
    for (const row of inBin) {
      const loRow = { ...row, [targetVar]: lo };
      const hiRow = { ...row, [targetVar]: hi };
      dif += model(vars.map(v => +hiRow[v])) - model(vars.map(v => +loRow[v]));
    }
    cum += inBin.length > 0 ? dif / inBin.length : 0;
    ale.push(+cum.toFixed(4));
  }
  return { test: 'Accumulated Local Effects', ale, grid, var: targetVar, n, apa: `ALE: var=${targetVar}, grid=${grid}` };
}

// ── Permutation Importance ────────────────────────────────────────
/** @param {number[]} X @param {number} y @param {object} model */
export function permutationImportance(model, X, y, { seed = 42, nPerm = 10 } = {}) {
  __rng = mulberry32(seed);
  if (!model || !X || !y || !X.length) return null;
  const n = X.length; const p = X[0]?.length || 0;
  const baseMSE = X.reduce((s, xi, i) => s + (model(xi) - y[i]) ** 2, 0) / n;
  const importance = Array(p).fill(0);
  for (let j = 0; j < p; j++) {
    let sumMSE = 0;
    for (let r = 0; r < nPerm; r++) {
      const permX = X.map(xi => { const xp = [...xi]; xp[j] = X[Math.floor(__rng() * n)][j]; return xp; });
      sumMSE += permX.reduce((s, xi, i) => s + (model(xi) - y[i]) ** 2, 0) / n;
    }
    importance[j] = +(sumMSE / nPerm - baseMSE).toFixed(4);
  }
  return { test: 'Permutation Importance', importance, nPerm, n, p, apa: `Perm VI: ${p} features` };
}

// ── SHAP Approximation ────────────────────────────────────────────
/** @param {number} model @param {number[]} baseline @param {number[][]} X */
export function shapleyApprox(model, X, baseline, { nSamples = 50 } = {}) {
  if (!model || !X || !baseline || !X.length) return null;
  const n = X.length; const p = X[0]?.length || 0;
  const shap = X.map((xi, i) => {
    const values = Array(p).fill(0);
    for (let j = 0; j < p; j++) {
      let withJ = 0, withoutJ = 0;
      for (let s = 0; s < nSamples; s++) {
        const maskWith = Array(p).fill(0);
        maskWith[j] = 1;
        const xWith = xi.map((v, k) => maskWith[k] ? v : baseline[k]);
        const xWithout = xi.map((v, k) => 0);
        withJ += model(xWith); withoutJ += model(xWithout);
      }
      values[j] = +(withJ - withoutJ) / nSamples;
    }
    return values.map(v => +v.toFixed(4));
  });
  return { test: 'SHAP Approximation', shap: shap.slice(0, 5), nSamples, n, p, apa: `SHAP: ${nSamples} samples, ${p} features` };
}

// ── Feature Interaction ───────────────────────────────────────────
/** @param {number} model @param {number[][]} X @param {number} i @param {number} j */
export function featureInteraction(model, X, i, j) {
  if (!model || !X || X.length < 3 || !X[0] || i == null || j == null) return null;
  const n = X.length;
  // Friedman's H statistic: variance of the pure interaction (joint PD minus
  // the two marginal PDs) relative to the variance of the joint PD.
  const pdJoint = (a, b) => avg(X.map(r => model(r.map((v, idx) => idx === i ? a : idx === j ? b : v))));
  const pdI = a => avg(X.map(r => model(r.map((v, idx) => idx === i ? a : v))));
  const pdJ = b => avg(X.map(r => model(r.map((v, idx) => idx === j ? b : v))));
  const fij = X.map(r => pdJoint(r[i], r[j]));
  const fi = X.map(r => pdI(r[i]));
  const fj = X.map(r => pdJ(r[j]));
  const center = a => { const m = avg(a); return a.map(v => v - m); };
  const cij = center(fij), ci = center(fi), cj = center(fj);
  let num = 0, den = 0;
  for (let k = 0; k < n; k++) {
    num += (cij[k] - ci[k] - cj[k]) ** 2;
    den += cij[k] ** 2;
  }
  const H = den > 1e-12 ? Math.sqrt(Math.max(0, num / den)) : 0;
  const interaction = { H: +H.toFixed(4) };
  return { test: 'Feature Interaction', interaction, i, j, n, apa: `Friedman's H(${i},${j}) = ${H.toFixed(4)}` };
}
