import { avg } from '../math/core.js';
import { normalCDF, chiPVal } from '../math/distributions.js';
import { matInv } from '../math/matrix.js';
import { mulberry32 } from '../math/rng.js';
import { mleFit } from '../math/inference.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

/**
 * McFadden conditional logit by Newton-Raphson on the conditional log-likelihood.
 * Each group is one choice set; the chosen alternative has y === 1.
 * Returns { beta, cov, se, ll, k } or null if it cannot be estimated.
 */
function _estimateCLogit(X, y, groupIdx, k, maxIter = 50) {
  let beta = Array(k).fill(0);
  let cov = null, ll = 0;
  let lastBeta = beta.slice(), lastCov = null;
  const RIDGE = 1e-6; // penalised MLE: keeps the information matrix PD under separation
  for (let iter = 0; iter < maxIter; iter++) {
    const grad = Array(k).fill(0);
    const info = Array.from({ length: k }, () => Array(k).fill(0)); // negative Hessian
    ll = 0;
    for (const idx of groupIdx) {
      if (idx.length < 2) continue;
      const scores = idx.map(i => X[i].reduce((s, v, j) => s + v * beta[j], 0));
      const mx = Math.max(...scores);
      const exps = scores.map(sc => Math.exp(sc - mx));
      const sumExp = exps.reduce((s, v) => s + v, 0) || 1e-12;
      const probs = exps.map(e => e / sumExp);
      // expected x under current probs
      const xbar = Array(k).fill(0);
      idx.forEach((i, a) => { for (let j = 0; j < k; j++) xbar[j] += probs[a] * X[i][j]; });
      idx.forEach((i, a) => {
        if (y[i] === 1) {
          ll += Math.log(Math.max(probs[a], 1e-300));
          for (let j = 0; j < k; j++) grad[j] += X[i][j] - xbar[j];
        }
      });
      // information: Σ_a p_a (x_a - xbar)(x_a - xbar)ᵀ
      idx.forEach((i, a) => {
        for (let r = 0; r < k; r++) for (let c = 0; c < k; c++)
          info[r][c] += probs[a] * (X[i][r] - xbar[r]) * (X[i][c] - xbar[c]);
      });
    }
    for (let j = 0; j < k; j++) info[j][j] += RIDGE;
    cov = matInv(info);
    if (!cov) { cov = lastCov; beta = lastBeta; break; } // fall back to last good estimate
    lastCov = cov; lastBeta = beta.slice();
    const step = cov.map(row => row.reduce((s, v, j) => s + v * grad[j], 0));
    let maxStep = 0;
    // Cap step length to avoid overflow under (quasi-)perfect separation.
    const stepNorm = Math.sqrt(step.reduce((s, v) => s + v * v, 0));
    const scale = stepNorm > 10 ? 10 / stepNorm : 1;
    for (let j = 0; j < k; j++) { beta[j] += scale * step[j]; maxStep = Math.max(maxStep, Math.abs(scale * step[j])); }
    if (maxStep < 1e-8) break;
  }
  if (!cov) return null;
  const se = cov.map((row, j) => Math.sqrt(Math.max(0, row[j])));
  return { beta, cov, se, ll, k };
}

// ── Conditional Logit ─────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string[]} xVars @param {string} groupVar */
export function conditionalLogit(data, yVar, xVars, groupVar, { maxIter = 50 } = {}) {
  if (!data || data.length < 15 || !yVar || !xVars || !groupVar) return null;
  const n = data.length;
  const groups = [...new Set(data.map(r => r[groupVar]))];
  const X = data.map(r => xVars.map(c => +r[c]));
  const y = data.map(r => +r[yVar]);
  const groupIdx = groups.map(g => data.reduce((arr, r, i) => { if (r[groupVar] === g) arr.push(i); return arr; }, []));
  const fit = _estimateCLogit(X, y, groupIdx, xVars.length, maxIter);
  const coefficients = xVars.map((name, j) => {
    const b = fit ? fit.beta[j] : 0;
    const se = fit ? fit.se[j] : 0;
    const z = se > 0 ? b / se : 0;
    const p = se > 0 ? 2 * (1 - normalCDF(Math.abs(z))) : 1;
    return { name, b: +b.toFixed(5), se: +se.toFixed(5), z: +z.toFixed(4), p: +p.toFixed(4) };
  });
  return { test: 'Conditional Logit', coefficients, logLik: fit ? +fit.ll.toFixed(4) : null, n, nGroups: groups.length, apa: `CLogit: ${groups.length} choice sets, n = ${n}` };
}

// ── IIA Test (Hausman-McFadden) ───────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string[]} xVars @param {string} groupVar */
export function iiaTest(data, yVar, xVars, groupVar, altVar) {
  if (!data || data.length < 15 || !yVar || !xVars || !groupVar || !altVar) return null;
  const n = data.length;
  const k = xVars.length;
  const buildFit = rows => {
    const groups = [...new Set(rows.map(r => r[groupVar]))];
    const X = rows.map(r => xVars.map(c => +r[c]));
    const y = rows.map(r => +r[yVar]);
    const groupIdx = groups.map(g => rows.reduce((arr, r, i) => { if (r[groupVar] === g) arr.push(i); return arr; }, []))
      .filter(idx => idx.length >= 2);
    if (groupIdx.length < 2) return null;
    return _estimateCLogit(X, y, groupIdx, k);
  };
  // Full choice set vs restricted set (one alternative removed) — under IIA the
  // coefficient estimates should not differ systematically.
  const refAlt = data[0]?.[altVar];
  const full = buildFit(data);
  const restricted = buildFit(data.filter(r => r[altVar] !== refAlt));
  if (!full || !restricted) return null;
  const dBeta = restricted.beta.map((b, j) => b - full.beta[j]);
  // Hausman statistic: Δβᵀ (V_r − V_f)⁻¹ Δβ
  const dCov = restricted.cov.map((row, r) => row.map((v, c) => v - full.cov[r][c]));
  const dInv = matInv(dCov);
  let chi2;
  if (dInv) {
    chi2 = 0;
    for (let r = 0; r < k; r++) for (let c = 0; c < k; c++) chi2 += dBeta[r] * dInv[r][c] * dBeta[c];
  } else {
    // Fall back to a diagonal approximation when V_r − V_f is not invertible.
    chi2 = dBeta.reduce((s, db, j) => {
      const vd = restricted.cov[j][j] - full.cov[j][j];
      return s + (vd > 1e-12 ? db * db / vd : 0);
    }, 0);
  }
  chi2 = Math.max(0, chi2);
  const p = chiPVal(chi2, k);
  return { test: 'IIA Test', chi2: +chi2.toFixed(4), df: k, p: +p.toFixed(4), n, apa: `IIA (Hausman-McFadden): χ²(${k}) = ${chi2.toFixed(2)}, ${p < 0.05 ? 'IIA violated' : 'IIA holds'}` };
}

/**
 * Fit a McFadden conditional logit on choice sets defined by groupVar
 * (chosen alternative has yVar === 1). Returns { beta, cov, se } or null.
 */
function _fitChoiceModel(data, yVar, xVars, groupVar) {
  if (!groupVar) return null;
  const groups = [...new Set(data.map(r => r[groupVar]))];
  const X = data.map(r => xVars.map(c => +r[c]));
  const y = data.map(r => +r[yVar]);
  const groupIdx = groups
    .map(g => data.reduce((arr, r, i) => { if (r[groupVar] === g) arr.push(i); return arr; }, []))
    .filter(idx => idx.length >= 2);
  if (groupIdx.length < 2) return null;
  return _estimateCLogit(X, y, groupIdx, xVars.length);
}

// ── Mixed Logit ───────────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string[]} xVars @param {string} groupVar */
export function mixedLogit(data, yVar, xVars, groupVar, { nDraws = 50, seed = 42 } = {}) {
  __rng = mulberry32(seed);
  if (!data || data.length < 15 || !yVar || !xVars || !groupVar) return null;
  const n = data.length, k = xVars.length;
  // Random-parameter logit by simulated maximum likelihood: each coefficient
  // β_j ~ N(μ_j, σ_j²), simulated with `nDraws` standard-normal draws shared
  // across choice sets. Params: [μ_0..μ_{k-1}, log σ_0..log σ_{k-1}].
  const groups = [...new Set(data.map(r => r[groupVar]))];
  const X = data.map(r => xVars.map(c => +r[c]));
  const y = data.map(r => +r[yVar]);
  const groupIdx = groups
    .map(g => data.reduce((arr, r, i) => { if (r[groupVar] === g) arr.push(i); return arr; }, []))
    .filter(idx => idx.length >= 2);
  if (groupIdx.length < 2) return null;
  // Standard-normal draws (Box-Muller) for each parameter dimension.
  const draws = Array.from({ length: nDraws }, () => Array.from({ length: k }, () => {
    let u = 0, v = 0; while (u === 0) u = __rng(); while (v === 0) v = __rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }));
  const negLogLik = theta => {
    const mu = theta.slice(0, k), logsd = theta.slice(k);
    let nll = 0;
    for (const idx of groupIdx) {
      let simProb = 0;
      for (let d = 0; d < nDraws; d++) {
        const beta = mu.map((m, j) => m + Math.exp(logsd[j]) * draws[d][j]);
        const sc = idx.map(i => X[i].reduce((s, v, j) => s + v * beta[j], 0));
        const mx = Math.max(...sc);
        let den = 0; for (const s of sc) den += Math.exp(s - mx);
        const chosen = idx.findIndex(i => y[i] === 1);
        if (chosen >= 0) simProb += Math.exp(sc[chosen] - mx) / den;
      }
      nll -= Math.log(Math.max(simProb / nDraws, 1e-300));
    }
    return nll;
  };
  const fit = mleFit([...Array(k).fill(0), ...Array(k).fill(Math.log(0.5))], negLogLik, { maxIter: 40 });
  const means = xVars.map((name, j) => {
    const m = fit.theta[j], se = fit.se[j], z = se > 0 ? m / se : 0;
    return { name, mean: +m.toFixed(5), sd: +Math.exp(fit.theta[k + j]).toFixed(5), seMean: +se.toFixed(5), z: +z.toFixed(4), p: +(2 * (1 - normalCDF(Math.abs(z)))).toFixed(4) };
  });
  return { test: 'Mixed Logit', means, n, nDraws, apa: `Mixed logit (SML): ${nDraws} draws, ${k} random coefficients` };
}

// ── WTP Space ─────────────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string[]} xVars @param {string} groupVar */
export function wtpSpace(data, yVar, xVars, priceVar, groupVar) {
  if (!data || data.length < 15 || !yVar || !priceVar) return null;
  const priceIdx = xVars.indexOf(priceVar);
  if (priceIdx < 0) return null;
  const fit = _fitChoiceModel(data, yVar, xVars, groupVar);
  if (!fit) return null;
  const betas = fit.beta;
  const bp = betas[priceIdx];
  // WTP for an attribute = −β_attr / β_price (preference-space ratio).
  const wtp = xVars.map((name, j) => j === priceIdx ? null : ({
    attribute: name,
    wtp: +(-betas[j] / (Math.abs(bp) < 1e-8 ? (bp < 0 ? -1e-8 : 1e-8) : bp)).toFixed(4),
  })).filter(Boolean);
  return { test: 'WTP Space', wtpEstimates: wtp, n: data.length, apa: `WTP: ${wtp.map(w => `${w.attribute}=${w.wtp}`).join(', ')}` };
}

// ── Nested Logit ──────────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string[]} xVars @param {string} groupVar */
export function nestedLogit(data, yVar, xVars, groupVar, nestVar, { seed = 42, maxIter = 60 } = {}) {
  __rng = mulberry32(seed);
  if (!data || data.length < 15 || !yVar || !nestVar || !groupVar || !xVars?.length) return null;
  const k = xVars.length;
  const allNests = [...new Set(data.map(r => r[nestVar]))];
  const nIdx = Object.fromEntries(allNests.map((nm, i) => [nm, i]));
  const groups = [...new Set(data.map(r => r[groupVar]))];
  const sets = groups
    .map(g => data.reduce((arr, r, i) => { if (r[groupVar] === g) arr.push(i); return arr; }, []))
    .filter(idx => idx.length >= 2);
  if (sets.length < 2) return null;
  const X = data.map(r => xVars.map(c => +r[c]));
  const y = data.map(r => +r[yVar]);
  const nest = data.map(r => nIdx[r[nestVar]]);
  const lamOf = raw => 0.05 + 0.95 / (1 + Math.exp(-raw)); // log-sum coefficient in (0.05, 1)

  // Two-level nested-logit FIML: P(i)=P(nest m)·P(i|m), with inclusive value
  // IV_m = log Σ_{j∈m} exp(V_j/λ_m). Params: [β_0..β_{k-1}, rawλ per nest].
  const negLogLik = theta => {
    const beta = theta.slice(0, k);
    const lam = theta.slice(k).map(lamOf);
    const V = i => X[i].reduce((s, v, j) => s + v * beta[j], 0);
    let nll = 0;
    for (const idx of sets) {
      const byNest = {};
      for (const i of idx) (byNest[nest[i]] = byNest[nest[i]] || []).push(i);
      const iv = {};
      for (const m of Object.keys(byNest)) {
        const lm = lam[m];
        const scaled = byNest[m].map(i => V(i) / lm);
        const mx = Math.max(...scaled);
        let s = 0; for (const v of scaled) s += Math.exp(v - mx);
        iv[m] = mx + Math.log(s);
      }
      const ch = idx.find(i => y[i] === 1);
      if (ch == null) continue;
      const mch = nest[ch];
      const logP_i_m = V(ch) / lam[mch] - iv[mch];
      const keys = Object.keys(byNest);
      const lse = keys.map(m => lam[m] * iv[m]);
      const mx2 = Math.max(...lse);
      let den = 0; for (const v of lse) den += Math.exp(v - mx2);
      const logP_m = lam[mch] * iv[mch] - mx2 - Math.log(den);
      nll -= (logP_i_m + logP_m);
    }
    return nll;
  };
  const fit = mleFit([...Array(k).fill(0), ...Array(allNests.length).fill(0)], negLogLik, { maxIter });
  const beta = fit.theta.slice(0, k);
  const lam = fit.theta.slice(k).map(lamOf);
  const coefficients = xVars.map((name, j) => {
    const b = beta[j], se = fit.se[j], z = se > 0 ? b / se : 0;
    return { name, b: +b.toFixed(5), se: +se.toFixed(5), z: +z.toFixed(4), p: +(2 * (1 - normalCDF(Math.abs(z)))).toFixed(4) };
  });
  const nests = allNests.map((nm, i) => ({ nest: nm, n: data.filter(r => r[nestVar] === nm).length, lambda: +lam[i].toFixed(4) }));
  return { test: 'Nested Logit', coefficients, nests, logLik: +(-negLogLik(fit.theta)).toFixed(4), n: data.length, apa: `Nested logit: ${allNests.length} nests, λ=${nests.map(x => x.lambda).join(', ')}` };
}

// ── Latent Class Logit ────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string[]} xVars @param {string} groupVar */
export function latentClassLogit(data, yVar, xVars, groupVar, { seed = 42, nClasses = 2, maxIter = 50 } = {}) {
  __rng = mulberry32(seed);
  if (!data || data.length < 15 || !yVar || !xVars || !groupVar || nClasses < 2) return null;
  const k = xVars.length;
  const groups = [...new Set(data.map(r => r[groupVar]))];
  const sets = groups
    .map(g => data.reduce((arr, r, i) => { if (r[groupVar] === g) arr.push(i); return arr; }, []))
    .filter(idx => idx.length >= 2);
  const G = sets.length;
  if (G < nClasses + 1) return null;
  const X = data.map(r => xVars.map(c => +r[c]));
  const y = data.map(r => +r[yVar]);
  // Conditional-logit log-probability of the observed choice in a set under β.
  const groupLL = (idx, beta) => {
    const sc = idx.map(i => X[i].reduce((s, v, j) => s + v * beta[j], 0));
    const mx = Math.max(...sc);
    let den = 0; for (const s of sc) den += Math.exp(s - mx);
    const ch = idx.findIndex(i => y[i] === 1);
    return ch >= 0 ? (sc[ch] - mx) - Math.log(den) : 0;
  };
  // EM: E-step posterior class membership per choice set; M-step updates class
  // priors and class-specific conditional-logit coefficients (weighted MLE).
  let pi = Array(nClasses).fill(1 / nClasses);
  let beta = Array.from({ length: nClasses }, () => xVars.map(() => __rng() * 0.4 - 0.2));
  const post = Array.from({ length: G }, () => Array(nClasses).fill(1 / nClasses));
  let totalLL = -Infinity;
  for (let it = 0; it < maxIter; it++) {
    let ll = 0;
    for (let g = 0; g < G; g++) {
      const logw = beta.map((b, c) => Math.log(pi[c] + 1e-12) + groupLL(sets[g], b));
      const mx = Math.max(...logw);
      let den = 0; for (const lw of logw) den += Math.exp(lw - mx);
      for (let c = 0; c < nClasses; c++) post[g][c] = Math.exp(logw[c] - mx) / den;
      ll += mx + Math.log(den);
    }
    for (let c = 0; c < nClasses; c++) pi[c] = avg(post.map(p => p[c]));
    for (let c = 0; c < nClasses; c++) {
      const nll = b => { let v = 0; for (let g = 0; g < G; g++) v -= post[g][c] * groupLL(sets[g], b); return v; };
      beta[c] = mleFit(beta[c], nll, { maxIter: 15 }).theta;
    }
    if (Math.abs(ll - totalLL) < 1e-6 * Math.max(1, Math.abs(totalLL))) { totalLL = ll; break; }
    totalLL = ll;
  }
  const nParams = nClasses * k + (nClasses - 1);
  const bic = -2 * totalLL + nParams * Math.log(G);
  return {
    test: 'Latent Class Logit', classProbs: pi.map(p => +p.toFixed(4)),
    classBeta: beta.map(b => b.map(v => +v.toFixed(4))), logLik: +totalLL.toFixed(4),
    bic: +bic.toFixed(2), nClasses, n: data.length,
    apa: `LC logit: ${nClasses} classes, BIC = ${bic.toFixed(1)}, n = ${data.length}`,
  };
}

// ── Marginal Effects (Logit) ──────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string[]} xVars @param {string} groupVar */
export function marginalEffects(data, yVar, xVars, groupVar) {
  if (!data || data.length < 15 || !yVar || !xVars || !groupVar) return null;
  const n = data.length;
  const fit = _fitChoiceModel(data, yVar, xVars, groupVar);
  if (!fit) return null;
  const betas = fit.beta;
  // Average choice probability over the sample, then ME_j = β_j · p̄(1−p̄).
  const X = data.map(r => xVars.map(c => +r[c]));
  const pbar = avg(X.map(xi => 1 / (1 + Math.exp(-betas.reduce((s, b, j) => s + b * xi[j], 0)))));
  const me = xVars.map((name, j) => {
    const meVal = betas[j] * pbar * (1 - pbar);
    const se = fit.se[j] * pbar * (1 - pbar);
    return { variable: name, me: +meVal.toFixed(5), se: +se.toFixed(5) };
  });
  return { test: 'Marginal Effects (Logit)', effects: me, n, apa: `Marginal effects for logit, n = ${n}` };
}

// ── Elasticities ──────────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string[]} xVars @param {string} groupVar */
export function elasticities(data, yVar, xVars, groupVar) {
  if (!data || data.length < 15 || !yVar || !xVars) return null;
  const xMeans = xVars.map(v => avg(data.map(r => +r[v])));
  const fit = _fitChoiceModel(data, yVar, xVars, groupVar);
  if (!fit) return null;
  const betas = fit.beta;
  const prob = 1 / (1 + Math.exp(-betas.reduce((s, b, j) => s + b * xMeans[j], 0)));
  // Point elasticity at the means: e_j = (1 − p)·β_j·x̄_j.
  const elast = xVars.map((name, j) => ({ variable: name, elasticity: +((1 - prob) * betas[j] * xMeans[j]).toFixed(5) }));
  return { test: 'Elasticities', elasticities: elast, n: data.length, apa: `Elasticities for ${xVars.length} variables` };
}

// ── Choice Probability ────────────────────────────────────────────
/** @param {Array<Record<string, any>>} data @param {string} yVar @param {string[]} xVars @param {string} groupVar */
export function choiceProbability(data, yVar, xVars, groupVar) {
  if (!data || data.length < 15 || !yVar || !xVars) return null;
  const n = data.length;
  const X = data.map(r => xVars.map(c => +r[c]));
  const fit = _fitChoiceModel(data, yVar, xVars, groupVar);
  if (!fit) return null;
  const betas = fit.beta;
  const utils = X.map(xi => betas.reduce((s, b, j) => s + b * xi[j], 0));
  // Conditional-logit choice probabilities are computed within each choice set.
  const probs = Array(n).fill(0);
  if (groupVar) {
    const groups = [...new Set(data.map(r => r[groupVar]))];
    for (const g of groups) {
      const idx = data.reduce((arr, r, i) => { if (r[groupVar] === g) arr.push(i); return arr; }, []);
      const mx = Math.max(...idx.map(i => utils[i]));
      let den = 0; for (const i of idx) den += Math.exp(utils[i] - mx);
      for (const i of idx) probs[i] = +(Math.exp(utils[i] - mx) / den).toFixed(4);
    }
  } else {
    const mx = Math.max(...utils);
    let den = 0; for (const u of utils) den += Math.exp(u - mx);
    utils.forEach((u, i) => { probs[i] = +(Math.exp(u - mx) / den).toFixed(4); });
  }
  return { test: 'Choice Probability', probabilities: probs.slice(0, 10), n, apa: `Choice probs: ${probs.slice(0, 3).join(', ')}...` };
}

// ── Value of Time ─────────────────────────────────────────────────
/** @param {string} yVar @param {string[]} xVars @param {string} timeVar @param {string} groupVar @param {Array<Record<string, any>>} data */
export function valueOfTime(data, yVar, xVars, timeVar, costVar, groupVar) {
  if (!data || data.length < 15 || !yVar || !timeVar || !costVar) return null;
  const timeIdx = xVars.indexOf(timeVar);
  const costIdx = xVars.indexOf(costVar);
  if (timeIdx < 0 || costIdx < 0) return null;
  const fit = _fitChoiceModel(data, yVar, xVars, groupVar);
  if (!fit) return null;
  const bt = fit.beta[timeIdx], bc = fit.beta[costIdx];
  if (Math.abs(bc) < 1e-8) return null;
  const ratio = bt / bc;
  const vot = Math.abs(ratio);
  // Delta method for Var(β_t/β_c): g=[1/β_c, −β_t/β_c²]; Var = gᵀ Σ g.
  const vtt = fit.cov[timeIdx][timeIdx], vcc = fit.cov[costIdx][costIdx], vtc = fit.cov[timeIdx][costIdx];
  const gT = 1 / bc, gC = -bt / (bc * bc);
  const varRatio = gT * gT * vtt + gC * gC * vcc + 2 * gT * gC * vtc;
  const se = Math.sqrt(Math.max(0, varRatio));
  return { test: 'Value of Time', vot: +vot.toFixed(4), se: +se.toFixed(4), ciLow: +(ratio - 1.96 * se).toFixed(4), ciHigh: +(ratio + 1.96 * se).toFixed(4), n: data.length, apa: `VoT = ${vot.toFixed(2)} (${(ratio - 1.96 * se).toFixed(2)}–${(ratio + 1.96 * se).toFixed(2)})` };
}
