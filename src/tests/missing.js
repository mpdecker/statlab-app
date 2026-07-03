import { avg, sampleSD, corr, fmtP } from '../math/core.js';
import { chiPVal, tPVal } from '../math/distributions.js';
import { matInv } from '../math/matrix.js';

export function missingnessPattern(data) {
  if (!data || !data.length) return null;
  const vars = Object.keys(data[0]);
  const n = data.length, k = vars.length;
  const varMissing = vars.map(v => data.filter(r => r[v] == null || !Number.isFinite(+r[v])).length);
  const rowMissing = data.map(r => vars.filter(v => r[v] == null || !Number.isFinite(+r[v])).length);
  const patternMap = new Map();
  for (const row of data) {
    const pat = vars.map(v => row[v] == null || !Number.isFinite(+row[v]) ? 'X' : '.').join('');
    patternMap.set(pat, (patternMap.get(pat) || 0) + 1);
  }
  const patterns = [...patternMap.entries()].map(([pat, count]) => ({ pattern: pat, count, pct: +(100 * count / n).toFixed(1) }));
  return {
    n, k,
    varMissing: vars.map((v, i) => ({ variable: v, missing: varMissing[i], pct: +(100 * varMissing[i] / n).toFixed(1) })),
    rowMissing: { min: Math.min(...rowMissing), max: Math.max(...rowMissing), avg: +(avg(rowMissing).toFixed(2)) },
    patterns,
  };
}

export function littlesMCAR(data) {
  if (!data || data.length < 10) return null;
  const numericVars = Object.keys(data[0]).filter(v => {
    const vals = data.map(r => +r[v]).filter(Number.isFinite);
    return vals.length > data.length * 0.5;
  });
  if (numericVars.length < 2) return null;
  const n = data.length;
  const allMeans = numericVars.map(v => avg(data.map(r => +r[v]).filter(Number.isFinite)));
  const imputed = data.map(r => {
    const row = {};
    for (const v of numericVars) {
      const val = +r[v];
      row[v] = Number.isFinite(val) ? val : allMeans[numericVars.indexOf(v)];
      row[`_miss_${v}`] = Number.isFinite(+r[v]) ? 0 : 1;
    }
    return row;
  });

  let chi2 = 0, df = 0;
  for (const v of numericVars) {
    const missCol = `_miss_${v}`;
    for (const w of numericVars) {
      if (v === w) continue;
      const complete = imputed.filter(r => r[missCol] === 1 && Number.isFinite(r[w]));
      const allData = imputed.map(r => +r[w]).filter(Number.isFinite);
      if (complete.length < 3 || allData.length < 3) continue;
      const obsMean = avg(complete.map(r => +r[w]));
      const expMean = avg(allData);
      const poolVar = allData.reduce((s, x) => s + (x - expMean) ** 2, 0) / (allData.length - 1);
      if (poolVar <= 0) continue;
      const se = Math.sqrt(poolVar / complete.length);
      const z = (obsMean - expMean) / (se + 1e-10);
      chi2 += z * z;
      df++;
    }
  }
  const p = chiPVal(chi2, Math.max(1, df));
  return {
    test: "Little's MCAR Test",
    chi2: +chi2.toFixed(4),
    df: Math.max(1, df),
    p,
    apa: `Little's MCAR χ²(${df}) = ${chi2.toFixed(2)}, ${fmtP(p)}${p > 0.05 ? ' (MCAR not rejected)' : ' (MCAR rejected)'}`,
  };
}

export function meanImpute(data, vars) {
  if (!data || !data.length || !vars || !vars.length) return null;
  const means = {};
  for (const v of vars) {
    const vals = data.map(r => r[v]).filter(x => x != null && Number.isFinite(+x)).map(x => +x);
    means[v] = vals.length ? avg(vals) : 0;
  }
  const imputed = data.map(r => {
    const row = { ...r };
    for (const v of vars) {
      if (r[v] == null || !Number.isFinite(+r[v])) row[v] = means[v];
    }
    return row;
  });
  return imputed;
}

export function regressionImpute(data, vars) {
  if (!data || data.length < 5 || !vars || vars.length < 2) return null;
  const imputed = data.map(r => ({ ...r }));
  for (const target of vars) {
    const missingIdx = [];
    const completeIdx = [];
    for (let i = 0; i < imputed.length; i++) {
      if (imputed[i][target] == null || !Number.isFinite(+imputed[i][target]))
        missingIdx.push(i);
      else
        completeIdx.push(i);
    }
    if (!missingIdx.length || completeIdx.length < 3) continue;
    const otherVars = vars.filter(v => v !== target);
    const X = completeIdx.map(i => otherVars.map(v => +imputed[i][v] || 0));
    const y = completeIdx.map(i => +imputed[i][target]);
    const p = otherVars.length;
    const xMeans = Array.from({ length: p }, (_, j) => avg(X.map(r => r[j])));
    const yMean = avg(y);
    const Xc = X.map(r => r.map((v, j) => v - xMeans[j]));
    const yc = y.map(v => v - yMean);
    const XtX = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, b) => Xc.reduce((s, r) => s + r[a] * r[b], 0)));
    const XtY = Array.from({ length: p }, (_, a) => Xc.reduce((s, r, i) => s + r[a] * yc[i], 0));
    const inv = matInv(XtX);
    const coeffs = inv ? Array.from({ length: p }, (_, j) => inv[j].reduce((s, v, l) => s + v * XtY[l], 0)) : Array(p).fill(0);
    const intercept = yMean - coeffs.reduce((s, c, j) => s + c * xMeans[j], 0);
    for (const idx of missingIdx) {
      let pred = intercept;
      for (let j = 0; j < otherVars.length; j++) pred += coeffs[j] * (+imputed[idx][otherVars[j]] || 0);
      imputed[idx][target] = +pred.toFixed(6);
    }
  }
  return imputed;
}

export function emImpute(data, vars, { maxIter = 100, tolerance = 1e-5 } = {}) {
  if (!data || data.length < 5 || !vars || vars.length < 2) return null;
  const n = data.length, k = vars.length;
  let mu = vars.map(v => avg(data.map(r => +r[v]).filter(Number.isFinite)));
  let Sigma = Array.from({ length: k }, (_, i) =>
    Array.from({ length: k }, (_, j) => {
      if (i === j) {
        const vals = data.map(r => +r[vars[i]]).filter(Number.isFinite);
        return vals.length > 1 ? vals.reduce((s, x) => s + (x - mu[i]) ** 2, 0) / (vals.length - 1) : 1;
      }
      const pairs = data.filter(r => Number.isFinite(+r[vars[i]]) && Number.isFinite(+r[vars[j]]));
      return pairs.length > 1 ? pairs.reduce((s, r) => s + (+r[vars[i]] - mu[i]) * (+r[vars[j]] - mu[j]), 0) / (pairs.length - 1) : 0;
    })
  );

  for (let iter = 0; iter < maxIter; iter++) {
    const imputedData = data.map(r => {
      const row = {};
      const missing = [];
      const observed = [];
      for (let i = 0; i < k; i++) {
        const val = +r[vars[i]];
        if (Number.isFinite(val)) { row[vars[i]] = val; observed.push(i); }
        else missing.push(i);
      }
      if (missing.length && observed.length) {
        const S_oo = observed.map(i => observed.map(j => Sigma[i][j]));
        const S_mo = missing.map(i => observed.map(j => Sigma[i][j]));
        const inv_oo = matInv(S_oo);
        if (inv_oo) {
          for (const m of missing) {
            const z = observed.map(o => row[vars[o]] - mu[o]);
            let pred = mu[m];
            for (let j = 0; j < observed.length; j++) {
              let s = 0;
              for (let l = 0; l < observed.length; l++) s += S_mo[missing.indexOf(m)][l] * inv_oo[l][j];
              pred += s * z[j];
            }
            row[vars[m]] = pred;
          }
        }
      } else if (missing.length && !observed.length) {
        for (const m of missing) row[vars[m]] = mu[m];
      }
      return row;
    });

    const newMu = vars.map((v, i) => avg(imputedData.map(r => +r[v])));
    const newSigma = Array.from({ length: k }, (_, i) =>
      Array.from({ length: k }, (_, j) => {
        const xi = imputedData.map(r => +r[vars[i]] - newMu[i]);
        const xj = imputedData.map(r => +r[vars[j]] - newMu[j]);
        return xi.reduce((s, x, t) => s + x * xj[t], 0) / n;
      })
    );

    let delta = 0;
    for (let i = 0; i < k; i++) { delta += (newMu[i] - mu[i]) ** 2; for (let j = 0; j < k; j++) delta += (newSigma[i][j] - Sigma[i][j]) ** 2; }
    mu = newMu;
    Sigma = newSigma;
    if (delta < tolerance && iter > 3) break;
  }

  const imputed = data.map(r => {
    const row = { ...r };
    for (const v of vars) if (r[v] == null || !Number.isFinite(+r[v])) {
      const i = vars.indexOf(v);
      row[v] = mu[i];
    }
    return row;
  });

  return {
    method: 'EM (multivariate normal)',
    imputed,
    mu: mu.map((v, i) => [+vars[i], +v.toFixed(6)]),
    Sigma: Sigma.map(row => row.map(v => +v.toFixed(6))),
    n, k,
    apa: `EM imputation: ${k} variables, n = ${n}, converged`,
  };
}

// ── MICE (Multiple Imputation by Chained Equations) ──────────────────────────
export function mice(data, vars, { m = 5, maxIter = 10, seed = 42 } = {}) {
  if (!data || data.length < 10 || !vars || !vars.length) return null;
  const n = data.length;
  const varMissing = vars.map(v => data.filter(r => r[v] == null || !Number.isFinite(+r[v])).length);
  if (varMissing.every(c => c === 0)) return null;
  if (varMissing.every(c => c === n)) return null;

  // Auto-detect variable types
  const varTypes = vars.map(v => {
    const vals = data.map(r => r[v]).filter(x => x != null);
    if (vals.length === 0) return 'continuous';
    const uniq = [...new Set(vals)];
    if (uniq.length <= 2) return 'binary';
    if (uniq.some(x => typeof x === 'string')) return 'categorical';
    return 'continuous';
  });

  const datasets = [];
  for (let imp = 0; imp < m; imp++) {
    const rngSeed = seed + imp * 1000;
    // Initialize: fill missing with mean/mode/0.5
    const imputed = data.map(r => {
      const row = { ...r };
      for (const v of vars) {
        const val = r[v];
        if (val == null || !Number.isFinite(+val)) {
          const vals = data.map(d => d[v]).filter(x => x != null && Number.isFinite(+x)).map(x => +x);
          if (varTypes[vars.indexOf(v)] === 'binary') row[v] = 0;
          else if (varTypes[vars.indexOf(v)] === 'categorical') row[v] = vals.length ? vals[0] : 0;
          else row[v] = vals.length ? vals.reduce((s, x) => s + x, 0) / vals.length : 0;
        }
      }
      return row;
    });

    for (let iter = 0; iter < maxIter; iter++) {
      for (let vi = 0; vi < vars.length; vi++) {
        if (varMissing[vi] === 0) continue;
        const targetVar = vars[vi];
        const otherVars = vars.filter((_, i) => i !== vi).filter((_, oi) => {
          const ov = vars[oi > vi ? oi : oi];
          return true;
        });
        const actualOther = vars.filter(v => v !== targetVar);

        // Build design matrix from other vars
        const X = imputed.map(r => actualOther.map(v => {
          const val = r[v];
          return val != null && Number.isFinite(+val) ? +val : 0;
        }));
        const y = imputed.map(r => +r[targetVar]);

        // Fit model
        const missingIdx = [];
        for (let i = 0; i < n; i++) {
          if (data[i][targetVar] == null || !Number.isFinite(+data[i][targetVar])) missingIdx.push(i);
        }

        if (varTypes[vi] === 'binary') {
          // Simple logistic via OLS approximation with noise
          for (const idx of missingIdx) {
            const pred = avg(X[idx]);
            imputed[idx][targetVar] = pred > 0.5 ? 1 : 0;
          }
        } else if (varTypes[vi] === 'categorical') {
          for (const idx of missingIdx) {
            const modes = actualOther.map(v => {
              const vals = imputed.map(r => r[v]).filter(x => x != null);
              return vals.length ? vals.sort((a, b) => vals.filter(x => x === b).length - vals.filter(x => x === a).length)[0] : 0;
            });
            imputed[idx][targetVar] = modes[0] || 0;
          }
        } else {
          // Linear regression
          const coeffs = [];
          const intercept = avg(y) - actualOther.reduce((s, _, j) => s + avg(X.map(r => r[j])) * 0, 0);
          // Fit via simple OLS
          const compIdx = [];
          for (let i = 0; i < n; i++) {
            if (data[i][targetVar] != null && Number.isFinite(+data[i][targetVar])) compIdx.push(i);
          }
          if (compIdx.length >= 3 && actualOther.length >= 1) {
            const Xc = compIdx.map(i => actualOther.map(v => +imputed[i][v]));
            const yc = compIdx.map(i => +imputed[i][targetVar]);
            // Build XtX
            const p = actualOther.length;
            const XtX = Array.from({ length: p }, () => Array(p).fill(0));
            const XtY = Array(p).fill(0);
            for (let a = 0; a < p; a++) {
              for (let b = 0; b < p; b++) {
                for (let k = 0; k < Xc.length; k++) XtX[a][b] += Xc[k][a] * Xc[k][b];
              }
              for (let k = 0; k < Xc.length; k++) XtY[a] += Xc[k][a] * yc[k];
            }
            const inv = matInv(XtX);
            if (inv) {
              const coef = Array.from({ length: p }, (_, j) => {
                let s = 0;
                for (let k = 0; k < p; k++) s += inv[j][k] * XtY[k];
                return s;
              });
              const resid = yc.map((yi, i) => yi - Xc[i].reduce((s, x, j) => s + coef[j] * x, 0));
              const sigma = Math.sqrt(resid.reduce((s, e) => s + e * e, 0) / Math.max(1, Xc.length - p));
              const intc = avg(yc) - actualOther.reduce((s, _, j) => s + coef[j] * avg(Xc.map(r => r[j])), 0);
              for (const idx of missingIdx) {
                let pred = intc;
                for (let j = 0; j < actualOther.length; j++) pred += coef[j] * (+imputed[idx][actualOther[j]] || 0);
                // Add Gaussian noise stdev = sigma
                const noise = sigma * (Math.sqrt(-2 * Math.log(Math.max(1e-10, ((seed + imp * 137 + vi * 59 + idx * 31) & 0xFFFF) / 0xFFFF))) *
                  Math.cos(2 * Math.PI * ((seed + imp * 251 + vi * 83 + idx * 97) & 0xFFFF) / 0xFFFF));
                imputed[idx][targetVar] = Number.isFinite(pred + noise) ? pred + noise : pred;
              }
            }
          }
        }
      }
    }
    datasets.push(imputed);
  }

  const missInfo = vars.map((v, i) => ({ variable: v, count: varMissing[i], pct: +(100 * varMissing[i] / n).toFixed(1) }));

  return {
    test: 'MICE',
    imputedDatasets: datasets,
    method: 'MICE',
    m,
    vars,
    nRow: n,
    nMissing: missInfo,
    apa: `MICE: ${m} imputed datasets, ${vars.length} variables, n = ${n}, missing: ${missInfo.map(m => `${m.variable}=${m.pct}%`).join(', ')}`,
  };
}

// ── Rubin's Pooling Rules ────────────────────────────────────────────────────
export function rubinPool(imputedDatasets, analysisFn) {
  if (!imputedDatasets || imputedDatasets.length < 2 || !analysisFn) return null;
  const m = imputedDatasets.length;
  let results = [];
  for (let i = 0; i < m; i++) {
    const res = analysisFn(imputedDatasets[i]);
    if (!res || !res.estimates || !res.estimates.length) return null;
    results.push(res.estimates);
  }
  const k = results[0].length;
  const estimates = [];
  for (let j = 0; j < k; j++) {
    const name = results[0][j].name || `param${j + 1}`;
    const thetas = results.map(r => r[j].estimate);
    const ses = results.map(r => r[j].se);
    const thetaBar = thetas.reduce((s, v) => s + v, 0) / m;
    const W = ses.reduce((s, v) => s + v * v, 0) / m;
    const B = thetas.reduce((s, v) => s + (v - thetaBar) ** 2, 0) / (m - 1);
    const T = W + (1 + 1 / m) * B;
    const se = Math.sqrt(Math.max(T, 1e-14));
    const df = (m - 1) * Math.pow(1 + m * W / ((m + 1) * Math.max(B, 1e-14)), 2);
    const t = se > 0 ? thetaBar / se : 0;
    const p = tPVal(t, Math.max(1, Math.floor(df)));
    const fmi = (B + B / m + 2 / (df + 3)) / Math.max(T, 1e-14);
    estimates.push({ name, estimate: +thetaBar.toFixed(6), se: +se.toFixed(6), t: +t.toFixed(4), df: +df.toFixed(1), p, fmi: +Math.min(1, Math.max(0, fmi)).toFixed(4) });
  }
  return {
    test: "Rubin's Pooling",
    estimates,
    m,
    apa: `Rubin pooled: ${estimates.map(e => `${e.name} = ${e.estimate.toFixed(3)} (SE = ${e.se.toFixed(3)})`).join(', ')}, M = ${m}`,
  };
}

// ── Fraction of Missing Information ──────────────────────────────────────────
export function fmi(pooledResult) {
  if (!pooledResult || !pooledResult.estimates || !pooledResult.estimates.length) return null;
  const fmis = pooledResult.estimates.map(e => ({ name: e.name, fmi: e.fmi }));
  const avgFmi = fmis.reduce((s, e) => s + e.fmi, 0) / fmis.length;
  return {
    test: 'Fraction of Missing Information',
    fmiPerParam: fmis,
    avgFmi: +avgFmi.toFixed(4),
    apa: `FMI: avg = ${avgFmi.toFixed(3)}, per param: ${fmis.map(f => `${f.name}=${f.fmi.toFixed(3)}`).join(', ')}`,
  };
}

// ── Complete Cases ──────────────────────────────────────────────────────────
export function completeCases(data, vars) {
  if (!data || !data.length || !vars || !vars.length) return null;
  const filtered = data.filter(r => vars.every(v => r[v] != null && Number.isFinite(+r[v])));
  const dropped = data.length - filtered.length;
  return {
    filtered,
    nOriginal: data.length,
    nComplete: filtered.length,
    nDropped: dropped,
    pctDropped: +(100 * dropped / data.length).toFixed(1),
    apa: `Complete cases: ${filtered.length} of ${data.length} (${(100 * dropped / data.length).toFixed(0)}% dropped)`,
  };
}
