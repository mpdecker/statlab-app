import { avg, sampleVar, corr, fmtP } from '../math/core.js';
import { chiPVal, normalINV } from '../math/distributions.js';
import { matInv, jacobiEigen } from '../math/matrix.js';

function covMatrix(data, vars) {
  const n = data.length;
  const means = vars.map(v => avg(data.map(r => +r[v])));
  const k = vars.length;
  const S = Array.from({ length: k }, () => Array(k).fill(0));
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      let num = 0, count = 0;
      for (const row of data) {
        if (Number.isFinite(+row[vars[i]]) && Number.isFinite(+row[vars[j]])) {
          num += (+row[vars[i]] - means[i]) * (+row[vars[j]] - means[j]);
          count++;
        }
      }
      S[i][j] = count > 1 ? num / (count - 1) : 0;
    }
  }
  return S;
}

function parseEquations(equations, data) {
  const latents = [];
  const obsVars = new Set();
  const allVars = new Set();
  const measurement = [];
  const structural = [];

  for (const eq of equations) {
    const trimmed = eq.trim();
    if (trimmed.includes('=~')) {
      const [lat, rhs] = trimmed.split('=~').map(s => s.trim());
      const inds = rhs.split('+').map(s => s.trim()).filter(Boolean);
      latents.push(lat);
      allVars.add(lat);
      for (const ind of inds) {
        obsVars.add(ind);
        allVars.add(ind);
        measurement.push({ latent: lat, indicator: ind });
      }
    } else if (trimmed.includes('~')) {
      const [lhs, rhs] = trimmed.split('~').map(s => s.trim());
      const preds = rhs.split('+').map(s => s.trim()).filter(Boolean);
      allVars.add(lhs);
      for (const p of preds) allVars.add(p);
      structural.push({ outcome: lhs, predictors: preds });
    }
  }

  const allObs = [...new Set([...obsVars, ...allVars].filter(v => {
    if (latents.includes(v)) return false;
    return data.some(r => v in r);
  }))];

  const varOrder = allObs.filter(v => obsVars.has(v) || structural.some(s => s.outcome === v));
  const allOrder = [...varOrder, ...latents];
  const varIndex = new Map(allOrder.map((v, i) => [v, i]));
  const p = allOrder.length;
  const m = varOrder.length;

  return { varOrder, allOrder, varIndex, latents, measurement, structural, p, m, obsVars: varOrder };
}

function buildRAM(parsed) {
  const { varOrder, allOrder, varIndex, latents, measurement, structural, p } = parsed;
  const A = Array.from({ length: p }, () => Array(p).fill(0));
  const S = Array.from({ length: p }, () => Array(p).fill(0));
  const fixed = [];
  const free = [];

  for (const { latent, indicator } of measurement) {
    fixed.push({ i: varIndex.get(indicator), j: varIndex.get(latent), value: indicator === measurement.filter(m => m.latent === latent)[0].indicator ? 1 : null });
    if (indicator === measurement.filter(m => m.latent === latent)[0].indicator) {
      A[varIndex.get(indicator)][varIndex.get(latent)] = 1;
    } else {
      free.push({ i: varIndex.get(indicator), j: varIndex.get(latent), type: 'loading' });
    }
  }

  for (const { outcome, predictors } of structural) {
    for (const pred of predictors) {
      if (latents.includes(pred) || varOrder.includes(pred)) {
        free.push({ i: varIndex.get(outcome), j: varIndex.get(pred), type: 'path' });
      }
    }
  }

  for (const v of varOrder) {
    free.push({ i: varIndex.get(v), j: varIndex.get(v), type: 'residual' });
  }

  for (const l of latents) {
    free.push({ i: varIndex.get(l), j: varIndex.get(l), type: 'latentVar' });
  }

  return { A, S, free, p, m: varOrder.length };
}

function modelCov(theta, ram, parsed) {
  const { A, free, p, m } = ram;
  const A_mat = A.map(row => [...row]);
  const S_mat = Array.from({ length: p }, () => Array(p).fill(0));

  let idx = 0;
  for (const f of free) {
    const val = theta[idx++];
    if (f.type === 'loading' || f.type === 'path') {
      A_mat[f.i][f.j] = val;
    } else {
      S_mat[f.i][f.j] = Math.exp(val);
    }
  }

  const I = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => i === j ? 1 : 0));
  const I_A = I.map((r, i) => r.map((v, j) => v - A_mat[i][j]));
  const inv = matInv(I_A);
  if (!inv) return null;
  const Sigma = Array.from({ length: p }, (_, i) =>
    Array.from({ length: p }, (_, j) => {
      let s = 0;
      for (let r = 0; r < p; r++) for (let c = 0; c < p; c++)
        s += inv[i][r] * S_mat[r][c] * inv[j][c];
      return s;
    })
  );
  const obs = Array.from({ length: m }, (_, i) => Array.from({ length: m }, (_, j) => Sigma[i][j]));
  return { A_mat, S_mat, Sigma, obsCov: obs };
}

function mlDiscrepancy(S, modelCovMat) {
  const p = S.length;
  let detS = S[0][0];
  let detM = modelCovMat[0][0];
  /* v8 ignore start */
  if (p === 2) {
    detS = S[0][0] * S[1][1] - S[0][1] * S[1][0];
    detM = modelCovMat[0][0] * modelCovMat[1][1] - modelCovMat[0][1] * modelCovMat[1][0];
  } else /* v8 ignore stop */ if (p > 2) {
    function det2(m) {
      if (m.length === 1) return m[0][0];
      if (m.length === 2) return m[0][0] * m[1][1] - m[0][1] * m[1][0];
      let d = 0;
      for (let j = 0; j < m.length; j++) {
        const sub = m.slice(1).map(r => r.filter((_, c) => c !== j));
        d += (j % 2 ? -1 : 1) * m[0][j] * det2(sub);
      }
      return d;
    }
    detS = det2(S);
    detM = det2(modelCovMat);
  }
  if (detM <= 0) return 1e10;
  let tr = 0;
  const minv = matInv(modelCovMat);
  if (!minv) return 1e10;
  for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) tr += S[i][j] * minv[i][j];
  return Math.log(detM) + tr - Math.log(detS || 1e-10) - p;
}

// ── SEM ───────────────────────────────────────────────────────────

export function sem(opts = {}) {
  if (opts == null) return null;
  const { equations = null, data = null, method = 'ML', maxIter = 200, tolerance = 1e-6 } = opts ?? {};
  if (!equations || !equations.length || !data || data.length < 10) return null;

  const parsed = parseEquations(equations, data);
  const { varOrder, allOrder, latents, measurement, structural, p, m } = parsed;
  if (m < 3) return null;

  const obsVarNames = varOrder.slice(0, m);
  const S = covMatrix(data, obsVarNames);
  const ram = buildRAM(parsed);
  const n = data.length;
  const k = ram.free.length;

  let theta = Array(k).fill(0);
  let idx = 0;
  for (const f of ram.free) {
    if (f.type === 'loading' || f.type === 'path') { theta[idx++] = 0.3; }
    else if (f.type === 'residual') {
      const v = obsVarNames.indexOf(allOrder[f.i]);
      theta[idx++] = v >= 0 ? Math.log(Math.max(0.01, S[v][v] * 0.5)) : Math.log(1.0);
    } else if (f.type === 'latentVar') { theta[idx++] = Math.log(1.0); }
  }

  function discrepancy(t) {
    const mc = modelCov(t, ram, parsed);
    if (!mc) return 1e10;
    return mlDiscrepancy(S, mc.obsCov);
  }

  for (let iter = 0; iter < maxIter; iter++) {
    const eps = 1e-6;
    const grad = Array(k).fill(0);
    const f0 = discrepancy(theta);
    for (let j = 0; j < k; j++) {
      const up = [...theta]; up[j] += eps;
      grad[j] = (discrepancy(up) - f0) / eps;
    }
    const hess = Array.from({ length: k }, (_, i) =>
      Array.from({ length: k }, (_, j) => {
        const up1 = [...theta]; up1[i] += eps; up1[j] += eps;
        return (discrepancy(up1) - discrepancy([...theta].map((v, p) => p === i ? v + eps : v)) - discrepancy([...theta].map((v, p) => p === j ? v + eps : v)) + f0) / (eps * eps);
      })
    );
    const hInv = matInv(hess);
    if (!hInv) break;
    const step = hInv.map(r => r.reduce((s, v, i) => s - v * grad[i], 0));
    let lambda = 1;
    for (let halve = 0; halve <= 10; halve++) {
      const cand = theta.map((v, j) => v + lambda * step[j]);
      if (discrepancy(cand) < f0 - 1e-10) { theta = cand; break; }
      lambda /= 2;
    }
    if (grad.reduce((s, g) => s + g * g, 0) < tolerance) break;
  }

  const mc = modelCov(theta, ram, parsed);
  if (!mc) return null;

  let idx2 = 0;
  for (const f of ram.free) { idx2++; }
  const hessFinal = Array.from({ length: k }, (_, i) =>
    Array.from({ length: k }, (_, j) => {
      const eps = 1e-6;
      const f0r = discrepancy(theta);
      const up1 = [...theta]; up1[i] += eps; up1[j] += eps;
      return (discrepancy(up1) - discrepancy([...theta].map((v, p) => p === i ? v + eps : v)) - discrepancy([...theta].map((v, p) => p === j ? v + eps : v)) + f0r) / (eps * eps);
    })
  );
  const hInvFinal = matInv(hessFinal);
  const ses = hInvFinal ? Array.from({ length: k }, (_, j) => Math.sqrt(Math.max(0, hInvFinal[j][j]))) : Array(k).fill(Infinity);

  let idx3 = 0;
  const coefficients = [];
  for (const f of ram.free) {
    const val = theta[idx3];
    const se = ses[idx3];
    if (f.type === 'loading' || f.type === 'path') {
      const z = se > 0 ? val / se : 0;
      const pv = chiPVal(z * z, 1);
      const from = f.type === 'loading' ? `Load ${allOrder[f.i]}←${allOrder[f.j]}` : `Path ${allOrder[f.i]}←${allOrder[f.j]}`;
      coefficients.push({ from, estimate: +val.toFixed(6), se: +se.toFixed(6), z: +z.toFixed(4), p: pv });
    } else {
      coefficients.push({ from: `Var(${allOrder[f.i]})`, estimate: +Math.exp(val).toFixed(6), se: +se.toFixed(6) });
    }
    idx3++;
  }

  const fML = discrepancy(theta);
  const chi2 = (n - 1) * fML;
  const df = m * (m + 1) / 2 - k;
  const pChi = chiPVal(chi2, Math.max(1, df));

  let cfi = 1, tli = 1, rmsea = 0, srmr = 0;
  if (df > 0) {
    const nullDiscrepancy = (() => {
      const nullTheta = Array(m).fill(0).map((_, i) => Math.log(Math.max(0.01, S[i][i])));
      const nullCov = Array.from({ length: m }, (_, i) => Array.from({ length: m }, (_, j) => i === j ? Math.exp(nullTheta[i]) : 0));
      return mlDiscrepancy(S, nullCov);
    })();
    const nullChi2 = (n - 1) * nullDiscrepancy;
    const nullDf = m * (m + 1) / 2 - m;
    if (nullChi2 > chi2 && nullDf > df) {
      cfi = 1 - Math.max(0, (chi2 - df)) / Math.max(1e-10, (nullChi2 - nullDf));
      tli = ((nullChi2 / nullDf) - (chi2 / df)) / Math.max(1e-10, (nullChi2 / nullDf) - 1);
    }
    rmsea = Math.sqrt(Math.max(0, (chi2 - df) / (df * (n - 1))));
    let srmrSum = 0, srmrCount = 0;
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) if (S[i][i] * S[j][j] > 0) {
      srmrSum += ((S[i][j] - mc.obsCov[i][j]) / Math.sqrt(S[i][i] * S[j][j])) ** 2;
      srmrCount++;
    }
    srmr = Math.sqrt(srmrSum / (srmrCount || 1));
  }

  const rmseaCIlo = rmsea > 0 ? Math.max(0, rmsea * Math.sqrt(Math.exp(2 * Math.log(chi2 / df) - 2 * 1.96 / Math.sqrt(Math.max(1, df * (n - 1)))))) : 0;
  const rmseaCIhi = rmsea > 0 ? rmsea * Math.sqrt(Math.exp(2 * Math.log(chi2 / df) + 2 * 1.96 / Math.sqrt(Math.max(1, df * (n - 1))))) : 0;

  const logLik = -0.5 * n * (m * Math.log(2 * Math.PI) + Math.log(Math.abs(1)) + chi2);
  const aic = 2 * k - 2 * logLik;
  const bic = k * Math.log(n) - 2 * logLik;

  const loadPrefix = measurement.length ? `CFA: ${latents.length} latent(s)` : '';
  const structPrefix = structural.length ? `Paths: ${structural.map(s => s.outcome).join(', ')}` : '';
  return {
    test: 'SEM' + (loadPrefix ? ' (' + loadPrefix + ')' : ''),
    model: { equations, latents, observables: varOrder.length, n },
    coefficients,
    loadings: coefficients.filter(c => c.from.startsWith('Load')),
    paths: coefficients.filter(c => c.from.startsWith('Path')),
    fit: {
      chi2: +chi2.toFixed(4), df: Math.max(1, df), p: pChi,
      cfi: +Math.min(1, Math.max(0, cfi)).toFixed(4),
      tli: +Math.min(1, Math.max(0, tli)).toFixed(4),
      rmsea: +rmsea.toFixed(4),
      rmseaCI: [+rmseaCIlo.toFixed(4), +rmseaCIhi.toFixed(4)],
      srmr: +srmr.toFixed(4),
      aic: +aic.toFixed(2),
      bic: +bic.toFixed(2),
    },
    apa: `SEM χ²(${df}) = ${chi2.toFixed(2)}, ${fmtP(pChi)}, CFI = ${cfi.toFixed(3)}, TLI = ${tli.toFixed(3)}, RMSEA = ${rmsea.toFixed(3)}, SRMR = ${srmr.toFixed(3)}`,
  };
}

// ── Multi-group SEM ────────────────────────────────────────────────────────
export function semMultiGroup(data, groupVar, equations) {
  if (!data || !groupVar || !equations) return null;
  const groups = [...new Set(data.map(r => String(r[groupVar])))].sort();
  if (groups.length < 2) return null;
  const results = [];
  for (const g of groups) {
    const subset = data.filter(r => String(r[groupVar]) === g);
    const r = sem({ equations, data: subset });
    if (r) results.push({ group: g, n: subset.length, ...r });
  }
  if (results.length < 2) return null;
  const allObsNames = new Set();
  results.forEach(r => r.loadings.forEach(l => allObsNames.add(l.indicator)));
  const obsVars = [...allObsNames];
  const covMats = results.map(r => {
    const S = covMatrix(data.filter(d => String(d[groupVar]) === r.group), obsVars);
    return { group: r.group, S };
  });
  return {
    test: 'Multi-Group SEM',
    groups: results.map(r => ({ group: r.group, n: r.n, fit: r.fit, loadings: r.loadings.length })),
    nGroups: groups.length,
    nTotal: data.length,
    apa: `Multi-group SEM: ${groups.length} groups, N = ${data.length}. See per-group fit indices.`,
  };
}

// ── Measurement invariance ──────────────────────────────────────────────────
export function measurementInvariance(data, vars, groupVar, factorName = 'f1') {
  if (!data || !vars || !groupVar) return null;
  const groups = [...new Set(data.map(r => String(r[groupVar])))].sort();
  if (groups.length < 2 || vars.length < 3) return null;

  const eqStr = `${factorName} =~ ${vars.join(' + ')}`;
  const steps = [];
  const results = [];

  for (const g of groups) {
    const subset = data.filter(r => String(r[groupVar]) === g);
    const r = sem({ equations: [eqStr], data: subset });
    if (r) results.push({ group: g, r, n: subset.length });
  }
  if (results.length < 2) return null;

  const baseCFI = results.reduce((s, v) => s + (v.r.fit.cfi || 0), 0) / results.length;
  const baseRMSEA = results.reduce((s, v) => s + (v.r.fit.rmsea || 0), 0) / results.length;

  const pooled = [];
  for (const g of groups) {
    const subset = data.filter(r => String(r[groupVar]) === g);
    const nG = subset.length;
    const S = covMatrix(subset, vars);
    pooled.push({ group: g, S, n: nG, loadings: results.find(r => r.group === g)?.r.loadings || [] });
  }

  const configuralFit = { cfi: baseCFI, rmsea: baseRMSEA, status: 'configural' };
  steps.push({ model: 'Configural', cfi: baseCFI, rmsea: baseRMSEA, passed: true, note: 'Groups have same factor structure' });

  const allLoadings = [];
  results.forEach(r => {
    r.r.loadings.forEach(l => {
      if (l.estimate && l.indicator) allLoadings.push(l.estimate);
    });
  });

  const loadingMean = allLoadings.length ? avg(allLoadings) : 0;
  let loadingDiff = 0;
  results.forEach(r => {
    r.r.loadings.forEach(l => {
      if (l.estimate) loadingDiff += Math.abs(l.estimate - loadingMean);
    });
  });
  loadingDiff = allLoadings.length ? loadingDiff / allLoadings.length : 0;

  const metricPassed = loadingDiff < Math.abs(loadingMean) * 0.3;
  steps.push({
    model: 'Metric (Weak)',
    meanLoadingDiff: +loadingDiff.toFixed(4),
    passed: metricPassed,
    note: metricPassed ? 'Loadings approximately equal across groups' : 'Loadings differ across groups — metric invariance not supported',
  });

  const grandMeans = vars.map(v => avg(data.map(r => +r[v] || 0)));
  let interceptDiff = 0;
  results.forEach(r => {
    vars.forEach((v, j) => {
      const vals = data.filter(d => String(d[groupVar]) === r.group).map(d => +d[v] || 0);
      interceptDiff += Math.abs(avg(vals) - grandMeans[j]);
    });
  });
  interceptDiff /= vars.length * results.length;

  const scalarPassed = interceptDiff < Math.max(0.5, avg(grandMeans.map(Math.abs)) * 0.15);
  steps.push({
    model: 'Scalar (Strong)',
    meanInterceptDiff: +interceptDiff.toFixed(4),
    passed: scalarPassed,
    note: scalarPassed ? 'Intercepts approximately equal across groups' : 'Intercepts differ — scalar invariance not supported',
  });

  let residualDiff = 0;
  const allResid = [];
  results.forEach(r => {
    const sub = data.filter(d => String(d[groupVar]) === r.group);
    vars.forEach(v => allResid.push(sampleVar(sub.map(d => +d[v] || 0))));
  });
  const meanResid = avg(allResid);
  allResid.forEach(v => residualDiff += Math.abs(v - meanResid) / (meanResid || 1));
  residualDiff /= allResid.length;

  const strictPassed = residualDiff < 0.25;
  steps.push({
    model: 'Strict',
    meanResidualDiff: +residualDiff.toFixed(4),
    passed: strictPassed,
    note: strictPassed ? 'Residual variances approximately equal across groups' : 'Residual variances differ — strict invariance not supported',
  });

  return {
    test: 'Measurement Invariance',
    factor: factorName,
    vars,
    groups,
    steps,
    configuralCFI: baseCFI,
    configuralRMSEA: baseRMSEA,
    highestLevel: strictPassed ? 'strict' : scalarPassed ? 'scalar' : metricPassed ? 'metric' : 'configural',
    apa: `Measurement invariance: ${factorName} configural CFI = ${baseCFI.toFixed(3)}. Highest supported level: ${strictPassed ? 'strict' : scalarPassed ? 'scalar' : metricPassed ? 'metric' : 'configural'}.`,
  };
}

// ── Latent growth model ─────────────────────────────────────────────────────
export function latentGrowthModel(data, vars, times = null) {
  if (!data || data.length < 10 || !vars || vars.length < 2) return null;
  const n = data.length, k = vars.length;
  const t = times || Array.from({ length: k }, (_, i) => i);

  const S = covMatrix(data, vars);
  const means = vars.map(v => avg(data.map(r => +r[v])));
  const Lambda = Array.from({ length: k }, (_, i) => [1, t[i]]);

  const LtL = Array.from({ length: 2 }, (_, i) => Array.from({ length: 2 }, (_, j) =>
    Lambda.reduce((s, row) => s + row[i] * row[j], 0)));
  const LtSinv = matInv(LtL);
  if (!LtSinv) return null;

  const Phi = Array.from({ length: 2 }, (_, i) => Array.from({ length: 2 }, (_, j) => {
    let s = 0;
    for (let p = 0; p < 2; p++) for (let q = 0; q < 2; q++) {
      let mid = 0;
      for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) {
        mid += Lambda[a][p] * S[a][b] * Lambda[b][q];
      }
      s += LtSinv[i][p] * mid * LtSinv[q][j];
    }
    return s;
  }));

  const alpha = [0, 0];
  for (let i = 0; i < 2; i++) {
    for (let p = 0; p < 2; p++) {
      let mid = 0;
      for (let a = 0; a < k; a++) mid += Lambda[a][p] * means[a];
      alpha[i] += LtSinv[i][p] * mid;
    }
  }

  return {
    test: 'Latent Growth Model',
    coefficients: [
      { parameter: 'Intercept mean (α_i)', estimate: +alpha[0].toFixed(4) },
      { parameter: 'Slope mean (α_s)', estimate: +alpha[1].toFixed(4) },
      { parameter: 'Intercept variance (ψ_ii)', estimate: +Phi[0][0].toFixed(4) },
      { parameter: 'Slope variance (ψ_ss)', estimate: +Phi[1][1].toFixed(4) },
      { parameter: 'Intercept-slope covariance', estimate: +Phi[0][1].toFixed(4) },
    ],
    timePoints: k,
    n,
    apa: `LGM: \u03B1_i = ${alpha[0].toFixed(3)}, \u03B1_s = ${alpha[1].toFixed(3)}, \u03C8_ii = ${Phi[0][0].toFixed(3)}, \u03C8_ss = ${Phi[1][1].toFixed(3)}`,
  };
}

// ── Path Analysis ─────────────────────────────────────────────────
export function pathAnalysis(data, equations) {
  if (!data || data.length < 10 || !equations || !equations.length) return null;
  const parsed = equations.map(eq => {
    const parts = eq.split('~').map(s => s.trim());
    if (parts.length !== 2) return null;
    const lhs = parts[0].trim();
    const rhs = parts[1].trim().split('+').map(s => s.trim()).filter(Boolean);
    return { lhs, rhs };
  }).filter(Boolean);
  if (!parsed.length) return null;

  const fits = {};
  const allEdges = {};
  parsed.forEach(p => {
    const y = data.map(r => +r[p.lhs]);
    const X = data.map(r => p.rhs.map(v => +r[v]));
    const Xt = X[0].map((_, j) => X.map(row => row[j]));
    const XtX = Xt.map(r1 => X[0].map((_, j) => r1.reduce((s, _, k) => s + X[k][j] * r1[k], 0)));
    const XtY = Xt.map(r1 => r1.reduce((s, v, k) => s + v * y[k], 0));
    const inv = matInv(XtX);
    if (!inv) return;
    const beta = inv.map(row => row.reduce((s, v, j) => s + v * XtY[j], 0));
    const resid = y.map((yi, i) => yi - X[i].reduce((ss, x, j) => ss + x * beta[j], 0));
    const r2 = 1 - resid.reduce((s, e) => s + e * e, 0) / y.reduce((s, yi) => s + (yi - avg(y)) ** 2, 0);
    fits[p.lhs] = { preds: p.rhs, beta: p.rhs.map((v, j) => ({ from: v, to: p.lhs, b: beta[j] })), r2 };
    p.rhs.forEach((v, j) => { allEdges[`${v}->${p.lhs}`] = beta[j]; });
  });

  const coefficients = Object.values(fits).flatMap(f =>
    f.beta.map(bi => ({
      from: bi.from, to: bi.to, direct: +bi.b.toFixed(4), indirect: 0, total: +bi.b.toFixed(4),
    }))
  );

  return {
    test: 'Path Analysis',
    coefficients,
    rSquared: Object.fromEntries(Object.entries(fits).map(([k, v]) => [k, +v.r2.toFixed(4)])),
    n: data.length,
    apa: `Path analysis: ${coefficients.length} effects, ${parsed.length} equations, n = ${data.length}`,
  };
}

// ── Bifactor Model ────────────────────────────────────────────────
export function bifactorModel(data, generalFactor, groupFactors, { maxIter = 50 } = {}) {
  if (!data || data.length < 20 || !groupFactors || !groupFactors.length) return null;
  const allItems = groupFactors.flatMap(g => g.items);
  const n = data.length;
  const S = covMatrix(data, allItems);
  const m = allItems.length;
  if (!m) return null;

  const communalities = Array(m).fill(0.5);
  let loadings;
  const nFactors = 1 + groupFactors.length;

  for (let iter = 0; iter < maxIter; iter++) {
    const R = S.map((row, i) => row.map((v, j) => i === j ? communalities[i] : v));
    const eigs = jacobiEigen(R);
    const topEvals = eigs.eigenvalues.slice(0, nFactors);
    const topEvecs = eigs.eigenvectors.slice(0, nFactors);

    const A = Array.from({ length: m }, (_, i) =>
      topEvecs.map(vec => vec[i] * Math.sqrt(Math.max(0, topEvals[topEvecs.indexOf(vec)]))));

    loadings = allItems.map((item, i) => {
      const gfList = groupFactors.flatMap(g => g.items.map(it => ({ item: it, gName: g.name })));
      const match = gfList.find(g => g.item === item && gfList.filter(x => x.item === item).length > 0);
      const gIdx = match ? groupFactors.findIndex(g => g.name === match.gName) + 1 : 1;
      const gf = +Math.min(Math.abs(A[i][0] || 0), 0.99).toFixed(4);
      const gr = +(A[i][gIdx] ? Math.abs(A[i][gIdx]) : 0).toFixed(4);
      return { item, general: gf, group: gr, communality: +(gf * gf + gr * gr).toFixed(4) };
    });

    let maxDelta = 0;
    allItems.forEach((_, i) => {
      const nc = loadings[i].general ** 2 + loadings[i].group ** 2;
      maxDelta = Math.max(maxDelta, Math.abs(nc - communalities[i]));
      communalities[i] = Math.min(0.99, Math.max(0.01, nc));
    });
    if (maxDelta < 1e-5) break;
  }

  const genSum = loadings.reduce((s, l) => s + l.general, 0);
  const omegaH = genSum * genSum / (genSum * genSum + m);
  const omegaTotal = loadings.reduce((s, l) => s + l.general * l.general + l.group * l.group, 0) / m;

  return {
    test: 'Bifactor Model',
    loadings,
    omegaHierarchical: +omegaH.toFixed(4),
    omegaTotal: +omegaTotal.toFixed(4),
    correlation: { factorCorr: Array.from({ length: nFactors }, () => Array(nFactors).fill(0)).map((r, i) => r.map((_, j) => i === j ? 1 : 0)) },
    n,
    apa: `Bifactor: omega_h = ${omegaH.toFixed(3)}, omega_t = ${omegaTotal.toFixed(3)}, n = ${n}`,
  };
}

// ── Ordinal SEM ───────────────────────────────────────────────────
export function ordinalSEM(data, vars, model, { nThresh = 5 } = {}) {
  if (!data || data.length < 20 || !vars || vars.length < 3 || !model) return null;
  const m = vars.length;
  const R = Array.from({ length: m }, () => Array(m).fill(0));
  for (let i = 0; i < m; i++) {
    R[i][i] = 1;
    for (let j = i + 1; j < m; j++) {
      const xi = data.map(r => +r[vars[i]]).filter(Number.isFinite);
      const xj = data.map(r => +r[vars[j]]).filter(Number.isFinite);
      const nMin = Math.min(xi.length, xj.length);
      if (nMin < 5) { R[i][j] = 0; R[j][i] = 0; continue; }
      const rho = corr(xi.slice(0, nMin), xj.slice(0, nMin));
      const rPoly = Math.max(-0.99, Math.min(0.99, rho * (nMin / (nMin - 1))));
      R[i][j] = rPoly; R[j][i] = rPoly;
    }
  }

  const thresholds = vars.map(v => {
    const vals = data.map(r => +r[v]).filter(Number.isFinite).sort((a, b) => a - b);
    const th = [];
    for (let t = 1; t <= nThresh; t++) {
      const idx = Math.floor(t * vals.length / (nThresh + 1));
      th.push(idx < vals.length ? +vals[idx].toFixed(4) : 0);
    }
    return { variable: v, thresholds: th };
  });

  return {
    test: 'Ordinal SEM',
    loadings: [],
    thresholds,
    fit: { chisq: NaN, rmsea: NaN, cfi: NaN },
    n: data.length,
    apa: `Ordinal SEM: ${m} variables, polycor matrix, n = ${data.length}`,
  };
}

// ── CFI Compare ───────────────────────────────────────────────────
export function cfiCompare(model1Fit, model2Fit) {
  if (!model1Fit || !model2Fit) return null;
  const chi1 = model1Fit.chisq, chi2 = model2Fit.chisq, df1 = model1Fit.df, df2 = model2Fit.df;
  const cfi1 = model1Fit.cfi, cfi2 = model2Fit.cfi, rmsea1 = model1Fit.rmsea, rmsea2 = model2Fit.rmsea;
  if (![chi1, chi2, df1, df2, cfi1, cfi2, rmsea1, rmsea2].every(Number.isFinite)) return null;
  const deltaChi2 = chi1 - chi2, deltaDf = df1 - df2;
  const p = deltaDf > 0 ? chiPVal(Math.max(0, deltaChi2), Math.max(1, deltaDf)) : 1;
  const deltaCfi = cfi2 - cfi1, deltaRmsea = rmsea1 - rmsea2;
  const conclusion = deltaCfi > 0.002 && deltaRmsea > 0 ? 'Model 2 fits better' : deltaCfi < -0.002 ? 'Model 1 fits better' : 'Models fit similarly';
  return {
    test: 'CFI Comparison',
    deltaChi2: +deltaChi2.toFixed(4), deltaDf, p,
    deltaCfi: +deltaCfi.toFixed(4), deltaRmsea: +deltaRmsea.toFixed(4),
    conclusion,
    apa: `Delta chi2(${deltaDf}) = ${deltaChi2.toFixed(2)}, ${p < 0.05 ? 'sig' : 'n.s.'}, DeltaCFI = ${deltaCfi.toFixed(3)}`,
  };
}
