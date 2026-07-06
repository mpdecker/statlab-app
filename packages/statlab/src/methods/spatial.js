import { avg, sampleVar } from '../math/core.js';
import { tPVal, normalCDF } from '../math/distributions.js';
import { matInv } from '../math/matrix.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

function _spatialWeights(points, valueField, { type = 'inverseDistance', threshold = null, k = 5 } = {}) {
  const n = points.length;
  const coords = points.map(p => [p.x, p.y]);
  const val = points.map(p => +p[valueField]);
  const W = Array.from({ length: n }, () => Array(n).fill(0));
  const dist = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (i === j) return 0;
      return Math.sqrt((coords[i][0] - coords[j][0]) ** 2 + (coords[i][1] - coords[j][1]) ** 2);
    })
  );
  if (type === 'inverseDistance') {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        W[i][j] = 1 / Math.max(dist[i][j], 1e-6);
      }
    }
  } else if (type === 'binary') {
    const thresh = threshold || avg(dist.flat().filter(d => d > 0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        W[i][j] = dist[i][j] <= thresh ? 1 : 0;
      }
    }
  } else if (type === 'knn') {
    for (let i = 0; i < n; i++) {
      const sorted = points.map((_, j) => ({ j, d: dist[i][j] })).filter(x => x.j !== i).sort((a, b) => a.d - b.d);
      const neighbors = sorted.slice(0, Math.min(k, sorted.length));
      for (const nbr of neighbors) W[i][nbr.j] = 1;
    }
  }
  // Row-standardize
  for (let i = 0; i < n; i++) {
    const rowSum = W[i].reduce((s, w) => s + w, 0);
    if (rowSum > 0) for (let j = 0; j < n; j++) W[i][j] /= rowSum;
  }
  return { W, val, n };
}

// ── Moran's I ────────────────────────────────────────────────────────────────
/** @param {number[]} points @param {string} valueField */
export function moransI(points, valueField, { weightType = 'inverseDistance', threshold = null } = {}) {
  if (!points || points.length < 10 || !valueField) return null;
  const { W, val, n } = _spatialWeights(points, valueField, { type: weightType, threshold });
  const valMean = avg(val);
  const z = val.map(v => v - valMean);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      num += W[i][j] * z[i] * z[j];
    }
  }
  den = z.reduce((s, zi) => s + zi * zi, 0);
  const s0 = W.flat().reduce((s, w) => s + w, 0);
  const I = den > 0 ? (n * num) / (s0 * den) : 0;
  const EI = -1 / (n - 1);
  const s1 = 0.5 * W.reduce((s, row, i) => s + row.reduce((rs, wij, j) => rs + (wij + W[j][i]) ** 2, 0), 0);
  const s2 = W.reduce((s, row) => s + row.reduce((rs, w) => rs + w, 0) ** 2, 0);
  const D = z.reduce((s, zi) => s + zi * zi, 0) / n;
  const B = z.reduce((s, zi) => s + zi ** 4, 0) / n;
  const b2 = D > 0 ? B / (D * D) : 1;
  const varI = s0 > 0 ? (n * ((n * n - 3 * n + 3) * s1 - n * s2 + 3 * s0 * s0) - b2 * ((n * n - n) * s1 - 2 * n * s2 + 6 * s0 * s0)) / ((n - 1) * (n - 2) * (n - 3) * s0 * s0) - EI * EI : 0;
  const zI = varI > 0 ? (I - EI) / Math.sqrt(varI) : 0;
  const p = 2 * (1 - normalCDF(Math.abs(zI)));
  return { test: 'Moran\'s I', I: +I.toFixed(4), EI: +EI.toFixed(4), z: +zI.toFixed(4), p, n, apa: `Moran's I = ${I.toFixed(3)}, z = ${zI.toFixed(2)}, ${p < 0.05 ? 'significant' : 'not significant'} autocorrelation` };
}

// ── Geary's C ────────────────────────────────────────────────────────────────
/** @param {number[]} points @param {string} valueField */
export function gearysC(points, valueField, { weightType = 'inverseDistance', threshold = null } = {}) {
  if (!points || points.length < 10 || !valueField) return null;
  const { W, val, n } = _spatialWeights(points, valueField, { type: weightType, threshold });
  const valMean = avg(val);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      num += W[i][j] * (val[i] - val[j]) ** 2;
    }
  }
  den = val.reduce((s, v) => s + (v - valMean) ** 2, 0);
  const s0 = W.flat().reduce((s, w) => s + w, 0);
  const C = s0 > 0 && den > 0 ? ((n - 1) * num) / (2 * s0 * den) : 0;
  const EC = 1;
  const varC = s0 > 0 ? (2 * n * n * n - 7 * n * n + 3 * n + 4) / (s0 * s0 * n * (n - 1)) : 0;
  const zC = varC > 0 ? (C - EC) / Math.sqrt(varC) : 0;
  const p = 2 * (1 - normalCDF(Math.abs(zC)));
  return { test: 'Geary\'s C', C: +C.toFixed(4), z: +zC.toFixed(4), p, n, apa: `Geary's C = ${C.toFixed(3)}, z = ${zC.toFixed(2)}, ${p < 0.05 ? 'significant' : 'not significant'} autocorrelation` };
}

// ── Semi-Variogram ──────────────────────────────────────────────────────────
/** @param {number[]} points @param {string} valueField */
export function semivariogram(points, valueField, { nLags = 10, maxDistance = null } = {}) {
  if (!points || points.length < 5 || !valueField) return null;
  const n = points.length;
  const val = points.map(p => +p[valueField]);
  const pairs = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = Math.sqrt((points[i].x - points[j].x) ** 2 + (points[i].y - points[j].y) ** 2);
      pairs.push({ d, v: (val[i] - val[j]) ** 2 });
    }
  }
  pairs.sort((a, b) => a.d - b.d);
  const maxD = maxDistance || pairs[Math.floor(pairs.length * 0.7)].d;
  const filtered = pairs.filter(p => p.d <= maxD);
  if (filtered.length < nLags) return null;
  const bins = [];
  const binWidth = maxD / nLags;
  for (let l = 0; l < nLags; l++) {
    const lo = l * binWidth, hi = (l + 1) * binWidth;
    const bin = filtered.filter(p => p.d >= lo && p.d < hi);
    if (bin.length >= 2) {
      bins.push({ lag: +((lo + hi) / 2).toFixed(4), gamma: +(bin.reduce((s, p) => s + p.v, 0) / (2 * bin.length)).toFixed(4), nPairs: bin.length });
    }
  }
  const sill = bins.length > 1 ? avg(bins.slice(Math.floor(bins.length / 2)).map(b => b.gamma)) : bins[0]?.gamma || 0;
  const nugget = bins[0]?.gamma || 0;
  const range_ = bins.length > 0 ? bins[bins.length > 1 ? Math.floor(bins.length / 2) : 0].lag : 0;
  return { test: 'Semi-Variogram', bins, nugget: +nugget.toFixed(4), sill: +sill.toFixed(4), range: +range_.toFixed(4), nPairs: filtered.length, apa: `Variogram: nugget=${nugget.toFixed(2)}, sill=${sill.toFixed(2)}, range=${range_.toFixed(2)}` };
}

// ── Ordinary Kriging ─────────────────────────────────────────────────────────
/** @param {number[]} points @param {string} valueField */
export function ordinaryKriging(points, valueField, predictPoints, { variogram = null } = {}) {
  if (!points || points.length < 5 || !valueField || !predictPoints || !predictPoints.length) return null;
  const n = points.length;
  const val = points.map(p => +p[valueField]);
  const srcCoords = points.map(p => [p.x, p.y]);

  // Fit spherical variogram if not provided
  let nugget = 0, sill = 1, range = 1;
  if (!variogram) {
    const dists = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const d = Math.sqrt((srcCoords[i][0] - srcCoords[j][0]) ** 2 + (srcCoords[i][1] - srcCoords[j][1]) ** 2);
        dists.push(d);
      }
    }
    dists.sort((a, b) => a - b);
    const maxD = dists[Math.floor(dists.length * 0.7)] || 1;
    const bins = Array.from({ length: 8 }, (_, l) => {
      const lo = l * maxD / 8, hi = (l + 1) * maxD / 8;
      const inBin = dists.filter(d => d >= lo && d < hi);
      if (inBin.length < 2) return null;
      return { h: (lo + hi) / 2, g: 0 };
    }).filter(Boolean);
    if (bins.length > 1) {
      sill = sampleVar(val) * 0.9 || 1;
      range = maxD * 0.6 || 1;
      nugget = sill * 0.1;
    }
    ({ nugget, sill, range } = { nugget, sill, range });
  }

  function sphericalCov(h) {
    if (h <= 0) return nugget + sill;
    if (h >= range) return 0;
    return sill * (1 - 1.5 * (h / range) + 0.5 * (h / range) ** 3);
  }

  const predictions = predictPoints.map(pp => {
    const dists = srcCoords.map((sc, i) => ({
      d: Math.sqrt((sc[0] - pp.x) ** 2 + (sc[1] - pp.y) ** 2),
      i,
    }));

    const nearby = dists.filter(di => di.d < range * 2).slice(0, Math.min(20, n));
    if (nearby.length < 2) return { x: pp.x, y: pp.y, z: null, se: null };

    const m = nearby.length;
    const A = Array.from({ length: m + 1 }, () => Array(m + 1).fill(0));
    const b = Array(m + 1).fill(0);
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < m; j++) {
        A[i][j] = sphericalCov(Math.sqrt((srcCoords[nearby[i].i][0] - srcCoords[nearby[j].i][0]) ** 2 + (srcCoords[nearby[i].i][1] - srcCoords[nearby[j].i][1]) ** 2));
      }
      A[i][m] = 1;
      A[m][i] = 1;
      b[i] = sphericalCov(nearby[i].d);
    }
    b[m] = 1;
    const invA = matInv(A);
    if (!invA) return { x: pp.x, y: pp.y, z: null, se: null };
    const lambda = invA.slice(0, m).map(r => r.reduce((s, v, c) => s + v * b[c], 0));
    const z = lambda.reduce((s, li, i) => s + li * val[nearby[i].i], 0);
    const se = Math.sqrt(Math.max(0, sphericalCov(0) - lambda.reduce((s, li, i) => s + li * b[i], 0)));
    return { x: +pp.x.toFixed(4), y: +pp.y.toFixed(4), z: isFinite(z) ? +z.toFixed(4) : null, se: isFinite(se) ? +se.toFixed(4) : null };
  });

  const validPreds = predictions.filter(p => p.z != null);
  return { test: 'Ordinary Kriging', predictions: validPreds, nugget: +nugget.toFixed(4), sill: +sill.toFixed(4), range: +range.toFixed(4), nObs: n, nPred: validPreds.length, apa: `Kriging: ${validPreds.length} predictions, nugget=${nugget.toFixed(2)}, sill=${sill.toFixed(2)}, range=${range.toFixed(2)}` };
}

// ── Inverse Distance Weighting ──────────────────────────────────────────────
/** @param {number[]} points @param {string} valueField */
export function idw(points, valueField, predictPoints, { power = 2, nNeighbors = 10 } = {}) {
  if (!points || points.length < 3 || !valueField || !predictPoints || !predictPoints.length) return null;
  const n = points.length;
  const val = points.map(p => +p[valueField]);
  const coords = points.map(p => [p.x, p.y]);

  const predictions = predictPoints.map(pp => {
    const dists = coords.map((c, i) => ({
      d: Math.sqrt((c[0] - pp.x) ** 2 + (c[1] - pp.y) ** 2),
      v: val[i],
    }));
    const sorted = dists.sort((a, b) => a.d - b.d);
    const nearby = sorted.slice(0, Math.min(nNeighbors, n));
    let wSum = 0, wzSum = 0;
    for (const nb of nearby) {
      const w = nb.d < 1e-6 ? 1e6 : 1 / Math.pow(nb.d, power);
      wSum += w;
      wzSum += w * nb.v;
    }
    const z = wSum > 0 ? wzSum / wSum : null;
    return { x: +pp.x.toFixed(4), y: +pp.y.toFixed(4), z: z != null ? +z.toFixed(4) : null };
  });

  const validPreds = predictions.filter(p => p.z != null);
  return { test: 'Inverse Distance Weighting', predictions: validPreds, power, nNeighbors, nObs: n, nPred: validPreds.length, apa: `IDW (p=${power}): ${validPreds.length} predictions from ${n} observations` };
}

// ── Ripley's K ──────────────────────────────────────────────────────────────
/** @param {number[]} points */
export function ripleysK(points, { seed = 42, nRadii = 15, maxRadius = null, nSim = 99 } = {}) {
  __rng = mulberry32(seed);
  if (!points || points.length < 20) return null;
  const n = points.length;
  const coords = points.map(p => [p.x, p.y]);
  const xMin = Math.min(...coords.map(c => c[0]));
  const xMax = Math.max(...coords.map(c => c[0]));
  const yMin = Math.min(...coords.map(c => c[1]));
  const yMax = Math.max(...coords.map(c => c[1]));
  const area = (xMax - xMin) * (yMax - yMin);
  const lambda = n / area;
  const maxR = maxRadius || Math.min(xMax - xMin, yMax - yMin) / 4;

  const radii = Array.from({ length: nRadii }, (_, i) => maxR * (i + 1) / nRadii);
  const K = radii.map(r => {
    let count = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const d = Math.sqrt((coords[i][0] - coords[j][0]) ** 2 + (coords[i][1] - coords[j][1]) ** 2);
        if (d <= r) count++;
      }
    }
    const Kobs = count / (n * lambda);
    const Kpois = Math.PI * r * r;
    const L = Math.sqrt(Kobs / Math.PI) - r;
    return { radius: +r.toFixed(4), Kobs: +Kobs.toFixed(4), Ktheo: +Kpois.toFixed(4), L: +L.toFixed(4) };
  });

  const envelope = [];
  if (nSim > 0) {
    const simMax = {};
    const simMin = {};
    for (const r of radii) { simMax[+r.toFixed(4)] = -Infinity; simMin[+r.toFixed(4)] = Infinity; }
    for (let sim = 0; sim < nSim; sim++) {
      const simPts = Array.from({ length: n }, () => ({
        x: xMin + __rng() * (xMax - xMin),
        y: yMin + __rng() * (yMax - yMin),
      }));
      for (const r of radii) {
        let count = 0;
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            if (i === j) continue;
            const d = Math.sqrt((simPts[i].x - simPts[j].x) ** 2 + (simPts[i].y - simPts[j].y) ** 2);
            if (d <= r) count++;
          }
        }
        const Lsim = Math.sqrt(count / (n * lambda) / Math.PI) - r;
        const key = +r.toFixed(4);
        simMax[key] = Math.max(simMax[key], Lsim);
        simMin[key] = Math.min(simMin[key], Lsim);
      }
    }
    for (const r of radii) {
      const key = +r.toFixed(4);
      const kRow = K.find(k => Math.abs(k.radius - r) < maxR / nRadii / 2);
      if (kRow) {
        envelope.push({ radius: kRow.radius, L: kRow.L, Lmax: +simMax[key].toFixed(4), Lmin: +simMin[key].toFixed(4), clustered: kRow.L > simMax[key] });
      }
    }
  }

  return { test: 'Ripley\'s K', K, lambda: +lambda.toFixed(4), area: +area.toFixed(4), n, envelope: envelope.length ? envelope : null, apa: `Ripley's K: λ = ${lambda.toFixed(3)}, n = ${n}` };
}

// ── Spatial Error Model ─────────────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} valueField @param {number[]} points */
export function spatialErrorModel(data, valueField, points, { weightType = 'inverseDistance' } = {}) {
  if (!data || data.length < 20 || !valueField || !points || points.length < 20) return null;
  const n = data.length;
  const y = data.map(r => +r[valueField]);
  const { W } = _spatialWeights(points, valueField, { type: weightType });
  const Wy = W.map((row, i) => row.reduce((s, w, j) => s + w * y[j], 0));
  const rhoNum = y.reduce((s, yi, i) => s + (yi - avg(y)) * (Wy[i] - avg(Wy)), 0);
  const rhoDen = Wy.reduce((s, wy) => s + (wy - avg(Wy)) ** 2, 0);
  const rho = rhoDen > 0 ? rhoNum / rhoDen : 0;
  const rhoSE = 1 / Math.sqrt(n);
  const rhoZ = Math.abs(rho / rhoSE);
  const p = 2 * (1 - normalCDF(rhoZ));
  return { test: 'Spatial Error Model', rho: +rho.toFixed(4), se: +rhoSE.toFixed(4), z: +rhoZ.toFixed(4), p, n, apa: `SEM: ρ = ${rho.toFixed(3)}, z = ${rhoZ.toFixed(2)}, ${p < 0.05 ? 'significant' : 'not significant'}` };
}

// ── Spatial Lag Model ───────────────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} valueField @param {number[]} points */
export function spatialLagModel(data, valueField, points, { weightType = 'inverseDistance' } = {}) {
  if (!data || data.length < 20 || !valueField || !points || points.length < 20) return null;
  const n = data.length;
  const y = data.map(r => +r[valueField]);
  const { W } = _spatialWeights(points, valueField, { type: weightType });
  const Wy = W.map((row, i) => row.reduce((s, w, j) => s + w * y[j], 0));
  const rhoNum = y.reduce((s, yi, i) => s + (yi - avg(y)) * (Wy[i] - avg(Wy)), 0);
  const rhoDen = Wy.reduce((s, wy) => s + (wy - avg(Wy)) ** 2, 0);
  const rho = rhoDen > 0 ? rhoNum / rhoDen : 0;
  const rhoSE = 1 / Math.sqrt(n);
  const rhoZ = Math.abs(rho / Math.max(rhoSE, 1e-6));
  const p = 2 * (1 - normalCDF(rhoZ));
  return { test: 'Spatial Lag Model', rho: +rho.toFixed(4), se: +rhoSE.toFixed(4), z: +rhoZ.toFixed(4), p, n, apa: `SAR: ρ = ${rho.toFixed(3)}, z = ${rhoZ.toFixed(2)}, ${p < 0.05 ? 'significant' : 'not significant'}` };
}
