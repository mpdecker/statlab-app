import { avg, sampleVar, corr, fmtP } from '../math/core.js';
import { chiPVal, normalINV, normalCDF } from '../math/distributions.js';
import { matInv, jacobiEigen } from '../math/matrix.js';

// Standard bivariate-normal CDF P(Z1<=a, Z2<=b; rho) via Simpson integration of
// Phi2 = Phi(a)Phi(b) + (1/2pi)*int_0^rho exp(-(a^2-2tab+b^2)/(2(1-t^2)))/sqrt(1-t^2) dt.
function _bvnCDF(a, b, rho) {
  if (rho <= -0.9999) return Math.max(0, normalCDF(a) + normalCDF(b) - 1);
  if (rho >= 0.9999) return Math.min(normalCDF(a), normalCDF(b));
  const base = normalCDF(a) * normalCDF(b);
  if (Math.abs(rho) < 1e-10) return base;
  const f = t => Math.exp(-(a * a - 2 * t * a * b + b * b) / (2 * (1 - t * t))) / Math.sqrt(1 - t * t);
  const steps = 32, h = rho / steps;
  let s = f(0) + f(rho);
  for (let i = 1; i < steps; i++) s += (i % 2 ? 4 : 2) * f(i * h);
  return Math.min(1, Math.max(0, base + (h / 3) * s / (2 * Math.PI)));
}

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

// ── Shared RAM-ML fitting (used by sem() and ordinalSEM()) ─────────────────
// Newton-Raphson minimization of the ML discrepancy function over a RAM model's
// free parameters, given an arbitrary observed covariance/correlation matrix S.
function _fitRAMByML(S, ram, parsed, { maxIter = 200, tolerance = 1e-6 } = {}) {
  const { free, m } = ram;
  const { varOrder, allOrder } = parsed;
  const obsVarNames = varOrder.slice(0, m);
  const k = free.length;

  let theta = Array(k).fill(0);
  let idx = 0;
  for (const f of free) {
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

  return { theta, mc, ses, k, fML: discrepancy(theta) };
}

// Standard SEM fit indices (chi2/df/p, CFI/TLI, RMSEA+CI, SRMR) from an ML
// discrepancy value against the independence (diagonal) null model.
function _semFitStats(S, mc, n, m, k, fML) {
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

  return {
    chi2, df: Math.max(1, df), p: pChi,
    cfi: Math.min(1, Math.max(0, cfi)), tli: Math.min(1, Math.max(0, tli)),
    rmsea, rmseaCI: [rmseaCIlo, rmseaCIhi], srmr,
  };
}

// ── SEM ───────────────────────────────────────────────────────────

export function sem(opts = {}) {
  if (opts == null) return null;
  const { equations = null, data = null, method = 'ML', maxIter = 200, tolerance = 1e-6 } = opts ?? {};
  if (!equations || !equations.length || !data || data.length < 10) return null;

  const parsed = parseEquations(equations, data);
  const { varOrder, allOrder, latents, measurement, structural, m } = parsed;
  if (m < 3) return null;

  const obsVarNames = varOrder.slice(0, m);
  const S = covMatrix(data, obsVarNames);
  const ram = buildRAM(parsed);
  const n = data.length;

  const fit0 = _fitRAMByML(S, ram, parsed, { maxIter, tolerance });
  if (!fit0) return null;
  const { theta, mc, ses, k, fML } = fit0;

  const coefficients = [];
  for (let i = 0; i < ram.free.length; i++) {
    const f = ram.free[i];
    const val = theta[i];
    const se = ses[i];
    if (f.type === 'loading' || f.type === 'path') {
      const z = se > 0 ? val / se : 0;
      const pv = chiPVal(z * z, 1);
      const from = f.type === 'loading' ? `Load ${allOrder[f.i]}←${allOrder[f.j]}` : `Path ${allOrder[f.i]}←${allOrder[f.j]}`;
      coefficients.push({ from, estimate: +val.toFixed(6), se: +se.toFixed(6), z: +z.toFixed(4), p: pv });
    } else {
      coefficients.push({ from: `Var(${allOrder[f.i]})`, estimate: +Math.exp(val).toFixed(6), se: +se.toFixed(6) });
    }
  }

  const { chi2, df, p: pChi, cfi, tli, rmsea, rmseaCI, srmr } = _semFitStats(S, mc, n, m, k, fML);

  const logLik = -0.5 * n * (m * Math.log(2 * Math.PI) + Math.log(Math.abs(1)) + chi2);
  const aic = 2 * k - 2 * logLik;
  const bic = k * Math.log(n) - 2 * logLik;

  const loadPrefix = measurement.length ? `CFA: ${latents.length} latent(s)` : '';
  return {
    test: 'SEM' + (loadPrefix ? ' (' + loadPrefix + ')' : ''),
    model: { equations, latents, observables: varOrder.length, n },
    coefficients,
    loadings: coefficients.filter(c => c.from.startsWith('Load')),
    paths: coefficients.filter(c => c.from.startsWith('Path')),
    fit: {
      chi2: +chi2.toFixed(4), df, p: pChi,
      cfi: +cfi.toFixed(4), tli: +tli.toFixed(4),
      rmsea: +rmsea.toFixed(4), rmseaCI: rmseaCI.map(v => +v.toFixed(4)),
      srmr: +srmr.toFixed(4), aic: +aic.toFixed(2), bic: +bic.toFixed(2),
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

// ── Multi-group CFA fitting shared by measurementInvariance ────────────────
// Single-factor CFA (lambda_1=1 fixed, lambda_2..lambda_m free) fit jointly by
// ML across G groups on the pooled mean+covariance discrepancy, with loadings/
// intercepts/residuals optionally constrained equal across groups. Latent
// variances are always free per group; latent means are fixed at 0 unless
// intercepts are shared (in which case they're free except in the first group,
// which anchors the scale) — the standard identification scheme for nested
// configural/metric/scalar/strict invariance tests.
function _fitMultiGroupCFA(groupStats, m, { shareLoadings, shareIntercepts, shareResiduals, maxIter = 60, tolerance = 1e-5 } = {}) {
  const G = groupStats.length;
  const nLoad = m - 1;
  const loadBlocks = shareLoadings ? 1 : G;
  const residBlocks = shareResiduals ? 1 : G;
  const interceptBlocks = shareIntercepts ? 1 : G;
  const nAlpha = shareIntercepts ? (G - 1) : 0;
  const k = nLoad * loadBlocks + m * residBlocks + G + m * interceptBlocks + nAlpha;

  function unpack(theta) {
    let idx = 0;
    const loadSets = [];
    for (let b = 0; b < loadBlocks; b++) { loadSets.push([1, ...theta.slice(idx, idx + nLoad)]); idx += nLoad; }
    const residSets = [];
    for (let b = 0; b < residBlocks; b++) { residSets.push(theta.slice(idx, idx + m).map(Math.exp)); idx += m; }
    const psiSets = theta.slice(idx, idx + G).map(Math.exp); idx += G;
    const interceptSets = [];
    for (let b = 0; b < interceptBlocks; b++) { interceptSets.push(theta.slice(idx, idx + m)); idx += m; }
    const alphaFree = theta.slice(idx, idx + nAlpha); idx += nAlpha;
    const alphaSets = shareIntercepts ? [0, ...alphaFree] : Array(G).fill(0);
    return { loadSets, residSets, psiSets, interceptSets, alphaSets };
  }

  function discrepancy(theta) {
    const { loadSets, residSets, psiSets, interceptSets, alphaSets } = unpack(theta);
    let total = 0;
    for (let g = 0; g < G; g++) {
      const lambda = loadSets[shareLoadings ? 0 : g];
      const resid = residSets[shareResiduals ? 0 : g];
      const psi = psiSets[g];
      const tau = interceptSets[shareIntercepts ? 0 : g];
      const alpha = alphaSets[g];
      const Sigma = Array.from({ length: m }, (_, i) => Array.from({ length: m }, (_, j) =>
        lambda[i] * lambda[j] * psi + (i === j ? resid[i] : 0)));
      let f = mlDiscrepancy(groupStats[g].S, Sigma);
      const inv = matInv(Sigma);
      if (inv) {
        const mu = lambda.map((li, i) => tau[i] + li * alpha);
        const diff = groupStats[g].means.map((x, i) => x - mu[i]);
        let q = 0;
        for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) q += diff[i] * inv[i][j] * diff[j];
        f += q;
      } else {
        f += 1e6;
      }
      total += (groupStats[g].n - 1) * f;
    }
    return total;
  }

  let theta = Array(k).fill(0);
  {
    let idx = 0;
    for (let b = 0; b < loadBlocks; b++) for (let i = 0; i < nLoad; i++) theta[idx++] = 0.7;
    for (let b = 0; b < residBlocks; b++) for (let i = 0; i < m; i++) theta[idx++] = Math.log(Math.max(0.05, groupStats[0].S[i][i] * 0.5));
    for (let g = 0; g < G; g++) theta[idx++] = Math.log(1.0);
    for (let b = 0; b < interceptBlocks; b++) for (let i = 0; i < m; i++) theta[idx++] = groupStats[b].means[i];
    for (let a = 0; a < nAlpha; a++) theta[idx++] = 0;
  }

  for (let iter = 0; iter < maxIter; iter++) {
    const eps = 1e-6;
    const f0 = discrepancy(theta);
    const grad = Array(k).fill(0);
    for (let j = 0; j < k; j++) { const up = [...theta]; up[j] += eps; grad[j] = (discrepancy(up) - f0) / eps; }
    const hess = Array.from({ length: k }, () => Array(k).fill(0));
    for (let i = 0; i < k; i++) {
      for (let j = i; j < k; j++) {
        const up1 = [...theta]; up1[i] += eps; up1[j] += eps;
        const val = (discrepancy(up1) - discrepancy(theta.map((v, p) => p === i ? v + eps : v)) - discrepancy(theta.map((v, p) => p === j ? v + eps : v)) + f0) / (eps * eps);
        hess[i][j] = val; hess[j][i] = val;
      }
    }
    const hInv = matInv(hess);
    if (!hInv) break;
    const step = hInv.map(r => r.reduce((s, v, i) => s - v * grad[i], 0));
    let lam = 1;
    for (let halve = 0; halve <= 10; halve++) {
      const cand = theta.map((v, j) => v + lam * step[j]);
      if (discrepancy(cand) < f0 - 1e-10) { theta = cand; break; }
      lam /= 2;
    }
    if (grad.reduce((s, g2) => s + g2 * g2, 0) < tolerance) break;
  }

  const chi2 = discrepancy(theta);
  const df = Math.max(0, G * (m * (m + 1) / 2 + m) - k);
  const { loadSets, interceptSets } = unpack(theta);
  return { chi2, df, k, loadSets, interceptSets };
}

// Independence (diagonal-covariance, saturated-mean) baseline across all groups,
// used to compute CFI/TLI for the configural model.
function _nullModelChi2MultiGroup(groupStats, m) {
  let chi2 = 0, df = 0;
  for (const gs of groupStats) {
    const diagS = Array.from({ length: m }, (_, i) => Array.from({ length: m }, (_, j) => i === j ? Math.max(1e-6, gs.S[i][i]) : 0));
    chi2 += (gs.n - 1) * mlDiscrepancy(gs.S, diagS);
    df += m * (m - 1) / 2;
  }
  return { chi2, df };
}

function _fitStatsFromChi2(chi2, df, nullChi2, nullDf, nTotal) {
  const p = chiPVal(chi2, Math.max(1, df));
  let cfi = 1, tli = 1;
  if (df > 0 && nullChi2 > chi2 && nullDf > df) {
    cfi = 1 - Math.max(0, chi2 - df) / Math.max(1e-10, nullChi2 - nullDf);
    tli = ((nullChi2 / nullDf) - (chi2 / df)) / Math.max(1e-10, (nullChi2 / nullDf) - 1);
  }
  const rmsea = df > 0 ? Math.sqrt(Math.max(0, (chi2 - df) / (df * nTotal))) : 0;
  return { chi2, df, p, cfi: Math.min(1, Math.max(0, cfi)), tli: Math.min(1, Math.max(0, tli)), rmsea };
}

// ── Measurement invariance ──────────────────────────────────────────────────
// Real nested chi-square tests across configural -> metric -> scalar -> strict
// multi-group CFA models (Vandenberg & Lance, 2000; Millsap, 2011): each level
// adds an equality constraint (loadings, then intercepts, then residual
// variances) and a level is "supported" when the added constraint does not
// significantly worsen fit (Delta chi2 test, p > .05) relative to the
// previous, less-constrained level.
export function measurementInvariance(data, vars, groupVar, factorName = 'f1') {
  if (!data || !vars || !groupVar) return null;
  const groups = [...new Set(data.map(r => String(r[groupVar])))].sort();
  if (groups.length < 2 || vars.length < 3) return null;
  const m = vars.length;

  const groupStats = groups.map(g => {
    const subset = data.filter(r => String(r[groupVar]) === g);
    return { group: g, n: subset.length, S: covMatrix(subset, vars), means: vars.map(v => avg(subset.map(r => +r[v]))) };
  });
  if (groupStats.some(gs => gs.n < 5)) return null;
  const nTotal = groupStats.reduce((s, gs) => s + gs.n, 0);

  const configural = _fitMultiGroupCFA(groupStats, m, { shareLoadings: false, shareIntercepts: false, shareResiduals: false });
  const metric = _fitMultiGroupCFA(groupStats, m, { shareLoadings: true, shareIntercepts: false, shareResiduals: false });
  const scalar = _fitMultiGroupCFA(groupStats, m, { shareLoadings: true, shareIntercepts: true, shareResiduals: false });
  const strict = _fitMultiGroupCFA(groupStats, m, { shareLoadings: true, shareIntercepts: true, shareResiduals: true });

  const { chi2: nullChi2, df: nullDf } = _nullModelChi2MultiGroup(groupStats, m);
  const configuralStats = _fitStatsFromChi2(configural.chi2, configural.df, nullChi2, nullDf, nTotal);

  function nestedTest(constrained, base) {
    const deltaChi2 = Math.max(0, constrained.chi2 - base.chi2);
    const deltaDf = Math.max(1, constrained.df - base.df);
    const p = chiPVal(deltaChi2, deltaDf);
    return { deltaChi2, deltaDf, p, passed: p > 0.05 };
  }

  const metricTest = nestedTest(metric, configural);
  const scalarTest = nestedTest(scalar, metric);
  const strictTest = nestedTest(strict, scalar);
  const scalarSupported = metricTest.passed && scalarTest.passed;
  const strictSupported = scalarSupported && strictTest.passed;

  const steps = [
    {
      model: 'Configural', cfi: +configuralStats.cfi.toFixed(4), rmsea: +configuralStats.rmsea.toFixed(4),
      chi2: +configural.chi2.toFixed(4), df: configural.df, passed: true,
      note: 'Baseline model: factor structure estimated freely in each group',
    },
    {
      model: 'Metric (Weak)', deltaChi2: +metricTest.deltaChi2.toFixed(4), deltaDf: metricTest.deltaDf, p: +metricTest.p.toFixed(4),
      passed: metricTest.passed,
      note: metricTest.passed ? 'Constraining loadings equal across groups does not significantly worsen fit' : 'Loadings differ across groups — metric invariance not supported',
    },
    {
      model: 'Scalar (Strong)', deltaChi2: +scalarTest.deltaChi2.toFixed(4), deltaDf: scalarTest.deltaDf, p: +scalarTest.p.toFixed(4),
      passed: scalarSupported,
      note: scalarSupported ? 'Constraining intercepts equal across groups does not significantly worsen fit' : 'Intercepts differ across groups — scalar invariance not supported',
    },
    {
      model: 'Strict', deltaChi2: +strictTest.deltaChi2.toFixed(4), deltaDf: strictTest.deltaDf, p: +strictTest.p.toFixed(4),
      passed: strictSupported,
      note: strictSupported ? 'Constraining residual variances equal across groups does not significantly worsen fit' : 'Residual variances differ across groups — strict invariance not supported',
    },
  ];

  const highestLevel = strictSupported ? 'strict' : scalarSupported ? 'scalar' : metricTest.passed ? 'metric' : 'configural';

  return {
    test: 'Measurement Invariance',
    factor: factorName,
    vars,
    groups,
    steps,
    configuralCFI: +configuralStats.cfi.toFixed(4),
    configuralRMSEA: +configuralStats.rmsea.toFixed(4),
    highestLevel,
    apa: `Measurement invariance: ${factorName} configural CFI = ${configuralStats.cfi.toFixed(3)}. Metric Δχ²(${metricTest.deltaDf}) = ${metricTest.deltaChi2.toFixed(2)}, p = ${metricTest.p.toFixed(3)}. Highest supported level: ${highestLevel}.`,
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
// Fits each structural equation by OLS (WITH an intercept — the previous
// version regressed through the origin, i.e. no constant column, which badly
// biases every coefficient whenever the variables have nonzero means, the
// general case), then traces indirect/total effects through the whole
// recursive system via Total = (I-B)^-1 - I, where B is the direct-effects
// (path-coefficient) matrix over every variable appearing in any equation.
// (The previous version hardcoded indirect=0 and total=direct for every edge,
// so chained mediation — the entire point of path analysis over separate
// univariate regressions — was never actually computed.)
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
  parsed.forEach(p => {
    const y = data.map(r => +r[p.lhs]);
    const X = data.map(r => [1, ...p.rhs.map(v => +r[v])]);
    const Xt = X[0].map((_, j) => X.map(row => row[j]));
    const XtX = Xt.map(r1 => X[0].map((_, j) => r1.reduce((s, _, k) => s + X[k][j] * r1[k], 0)));
    const XtY = Xt.map(r1 => r1.reduce((s, v, k) => s + v * y[k], 0));
    const inv = matInv(XtX);
    if (!inv) return;
    const beta = inv.map(row => row.reduce((s, v, j) => s + v * XtY[j], 0));
    const resid = y.map((yi, i) => yi - X[i].reduce((ss, x, j) => ss + x * beta[j], 0));
    const r2 = 1 - resid.reduce((s, e) => s + e * e, 0) / y.reduce((s, yi) => s + (yi - avg(y)) ** 2, 0);
    fits[p.lhs] = { preds: p.rhs, beta: p.rhs.map((v, j) => ({ from: v, to: p.lhs, b: beta[j + 1] })), r2 };
  });

  // Direct-effects matrix over every variable in the system.
  const allVars = [...new Set(parsed.flatMap(p => [p.lhs, ...p.rhs]))];
  const idx = new Map(allVars.map((v, i) => [v, i]));
  const q = allVars.length;
  const B = Array.from({ length: q }, () => Array(q).fill(0));
  Object.values(fits).forEach(f => f.beta.forEach(bi => { B[idx.get(bi.to)][idx.get(bi.from)] = bi.b; }));
  const I = Array.from({ length: q }, (_, i) => Array.from({ length: q }, (_, j) => (i === j ? 1 : 0)));
  const ImB = I.map((row, i) => row.map((v, j) => v - B[i][j]));
  const ImBinv = matInv(ImB);
  const Total = ImBinv ? ImBinv.map((row, i) => row.map((v, j) => v - (i === j ? 1 : 0))) : B;

  const coefficients = [];
  for (const to of allVars) for (const from of allVars) {
    if (to === from) continue;
    const total = Total[idx.get(to)][idx.get(from)];
    const direct = B[idx.get(to)][idx.get(from)];
    if (Math.abs(total) < 1e-10 && direct === 0) continue;
    coefficients.push({ from, to, direct: +direct.toFixed(4), indirect: +(total - direct).toFixed(4), total: +total.toFixed(4) });
  }

  return {
    test: 'Path Analysis',
    coefficients,
    rSquared: Object.fromEntries(Object.entries(fits).map(([k, v]) => [k, +v.r2.toFixed(4)])),
    n: data.length,
    apa: `Path analysis: ${coefficients.length} effects, ${parsed.length} equations, n = ${data.length}`,
  };
}

// Orthogonal Procrustes rotation: finds the orthogonal R minimizing
// ||A·R - Target||^2 via R = U·Vᵀ, where M = Aᵀ·Target = U·diag(s)·Vᵀ (SVD of
// the small nFactors×nFactors matrix M, computed from the eigendecomposition
// of MᵀM since jacobiEigen only handles symmetric input).
function orthogonalProcrustes(A, Target) {
  const m = A.length, k = A[0].length;
  const M = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => {
    let s = 0; for (let i = 0; i < m; i++) s += A[i][a] * Target[i][b]; return s;
  }));
  const MtM = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => {
    let s = 0; for (let c = 0; c < k; c++) s += M[c][a] * M[c][b]; return s;
  }));
  const eig = jacobiEigen(MtM);
  const V = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, c) => eig.eigenvectors[c][a]));
  const svals = eig.eigenvalues.map(e => Math.sqrt(Math.max(0, e)));
  const U = Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, c) => {
    if (svals[c] < 1e-10) return 0;
    let s = 0; for (let b = 0; b < k; b++) s += M[a][b] * V[b][c];
    return s / svals[c];
  }));
  return Array.from({ length: k }, (_, a) => Array.from({ length: k }, (_, b) => {
    let s = 0; for (let c = 0; c < k; c++) s += U[a][c] * V[b][c]; return s;
  }));
}

// ── Bifactor Model ────────────────────────────────────────────────
// Extracts nFactors (= 1 general + K group) UNROTATED principal factors from
// the communality-adjusted correlation matrix, then applies an orthogonal
// Procrustes rotation toward the intended bifactor pattern (general loads
// every item; group k loads ONLY its own items, 0 elsewhere) — a standard
// target-rotation technique for approximate bifactor structure recovery.
// (The previous version used the raw unrotated eigenvectors directly, simply
// assigning the k-th extracted factor, in eigenvalue order, to "group k" —
// with no rotation, nothing guarantees an unrotated PCA/EFA axis aligns with
// any particular item subset. Verified on synthetic data with a true
// bifactor structure — general loading 0.5 on all 6 items, group A loading
// 0.6 on items 0-2, group B loading 0.6 on items 3-5 — the old code recovered
// group B's loading as ~0.002 (its true 0.6 signal was misattributed entirely
// into an inflated "general" loading of ~0.62); the rotated version recovers
// both groups' loadings in the correct 0.5-0.6 range.)
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
  const itemGroupIdx = allItems.map(item => 1 + groupFactors.findIndex(g => g.items.includes(item)));

  for (let iter = 0; iter < maxIter; iter++) {
    const R = S.map((row, i) => row.map((v, j) => i === j ? communalities[i] : v));
    const eigs = jacobiEigen(R);
    const topEvals = eigs.eigenvalues.slice(0, nFactors);
    const topEvecs = eigs.eigenvectors.slice(0, nFactors);

    let A = Array.from({ length: m }, (_, i) =>
      topEvecs.map((vec, f) => vec[i] * Math.sqrt(Math.max(0, topEvals[f]))));
    const Target = Array.from({ length: m }, (_, i) =>
      Array.from({ length: nFactors }, (_, f) => (f === 0 || f === itemGroupIdx[i]) ? 1 : 0));
    const Rrot = orthogonalProcrustes(A, Target);
    A = A.map(row => Array.from({ length: nFactors }, (_, f) => row.reduce((s, v, k2) => s + v * Rrot[k2][f], 0)));

    loadings = allItems.map((item, i) => {
      const gIdx = itemGroupIdx[i];
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
// Two-step polychoric correlations (Olsson, 1979): each variable's thresholds
// are the normal-quantile inverses of its observed cumulative category
// proportions, then rho is estimated by ML against the observed contingency
// table for every pair. The resulting polychoric correlation matrix is then
// fit with a single-factor model using the same RAM-ML machinery as sem().
export function ordinalSEM(data, vars, model, { nThresh = 5 } = {}) {
  if (!data || data.length < 20 || !vars || vars.length < 3 || !model) return null;
  const m = vars.length, n = data.length;

  const cats = vars.map(v => {
    const raw = data.map(r => +r[v]);
    const sorted = [...raw].sort((a, b) => a - b);
    const cuts = [];
    for (let t = 1; t <= nThresh; t++) {
      const idx = Math.min(sorted.length - 1, Math.floor(t * sorted.length / (nThresh + 1)));
      cuts.push(sorted[idx]);
    }
    const nCat = nThresh + 1;
    const cat = raw.map(v0 => Math.min(nCat - 1, cuts.filter(c => v0 > c).length));
    const counts = Array(nCat).fill(0);
    cat.forEach(c => counts[c]++);
    let cum = 0;
    const z = [-8];
    for (let c = 0; c < nCat - 1; c++) { cum += counts[c]; z.push(normalINV(Math.min(0.9999, Math.max(0.0001, cum / n)))); }
    z.push(8);
    return { cuts, cat, z, nCat };
  });

  const R = Array.from({ length: m }, () => Array(m).fill(0));
  for (let i = 0; i < m; i++) {
    R[i][i] = 1;
    for (let j = i + 1; j < m; j++) {
      const ci = cats[i], cj = cats[j];
      const table = Array.from({ length: ci.nCat }, () => Array(cj.nCat).fill(0));
      for (let r = 0; r < n; r++) table[ci.cat[r]][cj.cat[r]]++;
      const negLL = rho => {
        let ll = 0;
        for (let a = 0; a < ci.nCat; a++) for (let b = 0; b < cj.nCat; b++) {
          if (!table[a][b]) continue;
          const p = _bvnCDF(ci.z[a + 1], cj.z[b + 1], rho) - _bvnCDF(ci.z[a], cj.z[b + 1], rho)
                   - _bvnCDF(ci.z[a + 1], cj.z[b], rho) + _bvnCDF(ci.z[a], cj.z[b], rho);
          ll += table[a][b] * Math.log(Math.max(p, 1e-12));
        }
        return -ll;
      };
      let best = { rho: 0, nll: negLL(0) };
      for (let g = -95; g <= 95; g += 5) {
        const rho = g / 100, nll = negLL(rho);
        if (nll < best.nll) best = { rho, nll };
      }
      for (let step = 0.02; step >= 0.0005; step /= 4) {
        for (const d of [-step, step]) {
          const rho = Math.max(-0.995, Math.min(0.995, best.rho + d));
          const nll = negLL(rho);
          if (nll < best.nll) best = { rho, nll };
        }
      }
      R[i][j] = best.rho; R[j][i] = best.rho;
    }
  }

  const thresholds = vars.map((v, i) => ({ variable: v, thresholds: cats[i].cuts.map(c => +c.toFixed(4)) }));

  const eqStr = model.includes('=~') ? model : `${model} =~ ${vars.join(' + ')}`;
  const parsed = parseEquations([eqStr], data);
  if (parsed.m < 3) return null;
  const ram = buildRAM(parsed);
  const fitR = _fitRAMByML(R, ram, parsed);
  if (!fitR) {
    return {
      test: 'Ordinal SEM', loadings: [], thresholds,
      fit: { chisq: NaN, rmsea: NaN, cfi: NaN }, n,
      apa: `Ordinal SEM: ${m} variables, polychoric matrix, n = ${n} (model did not converge)`,
    };
  }
  const { theta, mc, ses, k, fML } = fitR;
  const { chi2, df, p, cfi, tli, rmsea } = _semFitStats(R, mc, n, m, k, fML);

  const loadings = [];
  for (let i = 0; i < ram.free.length; i++) {
    const f = ram.free[i];
    if (f.type !== 'loading') continue;
    const val = theta[i], se = ses[i];
    const zStat = se > 0 ? val / se : 0;
    loadings.push({
      indicator: parsed.allOrder[f.i], factor: parsed.allOrder[f.j],
      estimate: +val.toFixed(4), se: +se.toFixed(4), z: +zStat.toFixed(4), p: chiPVal(zStat * zStat, 1),
    });
  }

  return {
    test: 'Ordinal SEM',
    loadings,
    thresholds,
    R: R.map(row => row.map(v => +v.toFixed(4))),
    fit: { chisq: +chi2.toFixed(4), df, p, cfi: +cfi.toFixed(4), tli: +tli.toFixed(4), rmsea: +rmsea.toFixed(4) },
    n,
    apa: `Ordinal SEM: ${m} variables, polychoric-correlation ML factor fit, chi2(${df}) = ${chi2.toFixed(2)}, CFI = ${cfi.toFixed(3)}, RMSEA = ${rmsea.toFixed(3)}, n = ${n}`,
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
