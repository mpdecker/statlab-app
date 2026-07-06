import { avg, sampleVar } from '../math/core.js';
import { mulberry32 } from '../math/rng.js';
import { solveNormalEquations } from '../math/matrix.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── Part-Worth Utilities ──────────────────────────────────────────
/** @param {number[]} ratings @param {number[][]} profiles @param {string[]} attrs */
export function partWorthUtilities(ratings, profiles, attrs) {
  if (!ratings || !profiles || ratings.length < 5 || !attrs || attrs.length < 2) return null;
  const n = ratings.length;
  const attrLevels = attrs.map(a => [...new Set(profiles.map(r => r[a]))]);
  // Standard effects coding: an intercept, plus (L-1) columns per attribute.
  // For the first L-1 levels, +1 when that level is observed; the reference
  // (last) level is coded -1 in ALL of the attribute's columns, 0 elsewhere.
  // (The previous version emitted L columns per attribute with the last
  // column hardcoded to -1 regardless of the row's actual value — a constant,
  // perfectly-collinear column with no intercept — which produced nonsense
  // utilities.)
  const X = profiles.map(row => {
    const cols = [1];
    attrs.forEach((a, ai) => {
      const levels = attrLevels[ai];
      const val = row[a];
      for (let j = 0; j < levels.length - 1; j++) {
        cols.push(val === levels[j] ? 1 : val === levels[levels.length - 1] ? -1 : 0);
      }
    });
    return cols;
  });
  const Xt = X[0].map((_, j) => X.map(r => r[j]));
  const XtX = Xt.map(r1 => X[0].map((_, j) => r1.reduce((s, _, k) => s + X[k][j] * r1[k], 0)));
  const XtY = Xt.map(r1 => r1.reduce((s, v, k) => s + v * ratings[k], 0));
  const beta = solveNormalEquations(XtX, XtY);
  let idx = 1; // skip the intercept
  const result = attrs.map((a, ai) => {
    const levels = attrLevels[ai];
    const levelUtils = levels.slice(0, -1).map(() => beta[idx++]);
    const refUtil = -levelUtils.reduce((s, v) => s + v, 0); // part-worths sum to zero per attribute
    const utilities = [...levelUtils, refUtil].map((u, l) => ({ level: l + 1, utility: +(u || 0).toFixed(4) }));
    return { attribute: a, utilities };
  });
  return { test: 'Part-Worth Utilities', utilities: result, n, apa: `Part-worth: ${attrs.length} attributes, n=${n}` };
}

// ── Attribute Importance ──────────────────────────────────────────
/** @param {object} pwResult */
export function attributeImportance(pwResult) {
  if (!pwResult || !pwResult.utilities) return null;
  const ranges = pwResult.utilities.map(attr => {
    const vals = attr.utilities.map(u => u.utility);
    return Math.max(...vals) - Math.min(...vals);
  });
  const totalRange = ranges.reduce((s, r) => s + r, 0);
  const importance = totalRange > 0 ? ranges.map((r, i) => ({
    attribute: pwResult.utilities[i].attribute,
    importance: +(100 * r / totalRange).toFixed(1),
  })) : pwResult.utilities.map(a => ({ attribute: a.attribute, importance: 0 }));
  return { test: 'Attribute Importance', importance, apa: `Importance: ${importance.map(i => i.attribute + '=' + i.importance + '%').join(', ')}` };
}

// ── Choice Simulation ─────────────────────────────────────────────
/** @param {number[][]} profiles @param {string[]} attrs */
export function choiceSimulation(profiles, attrs, { seed = 42, nRespondents = 50, partWorths = null, scale = 1 } = {}) {
  if (!profiles || profiles.length < 3 || !attrs || attrs.length < 2) return null;
  const k = profiles.length;
  // Multinomial-logit (BTL) market shares from each profile's total utility.
  // Utility = Σ_attr part-worth(level); if no part-worths are supplied, use an
  // additive utility in the (mean-centred) numeric attribute levels. The old
  // version drew random utilities, ignoring the profiles and attributes.
  const means = {};
  if (!partWorths) attrs.forEach(a => { means[a] = avg(profiles.map(p => +p[a] || 0)); });
  const utility = p => attrs.reduce((s, a) => {
    if (partWorths) return s + ((partWorths[a] && partWorths[a][p[a]]) || 0);
    return s + ((+p[a] || 0) - means[a]);
  }, 0);
  const V = profiles.map(utility);
  const mx = Math.max(...V);
  const exps = V.map(v => Math.exp(scale * (v - mx)));
  const sumE = exps.reduce((s, e) => s + e, 0) || 1;
  const marketShares = exps.map((e, i) => ({ profile: i + 1, utility: +V[i].toFixed(4), share: +(100 * e / sumE).toFixed(2) }));
  return { test: 'Choice Simulation', marketShares, nRespondents, nProfiles: k, apa: `Choice sim (logit): ${k} profiles` };
}

// ── Orthogonal Design ─────────────────────────────────────────────
/** @param {string[]} attrs @param {number[]} levels */
export function orthogonalDesign(attrs, levels) {
  if (!attrs || attrs.length < 2 || !levels || levels.length !== attrs.length) return null;
  const runs = [];
  const L = levels.map(l => l || 2);
  const nRuns = Math.pow(2, attrs.length);
  for (let i = 0; i < nRuns; i++) {
    const run = {};
    attrs.forEach((a, j) => {
      const level = (i >> j) & 1;
      run[a] = level + 1;
    });
    runs.push(run);
  }
  return { test: 'Orthogonal Design', runs, nRuns, nAttrs: attrs.length, apa: `Orthogonal: ${nRuns} runs, ${attrs.length} attributes` };
}

// ── Market Simulator ──────────────────────────────────────────────
/** @param {object} pwResult @param {number[][]} scenarioProfiles */
export function marketSimulator(pwResult, scenarioProfiles) {
  if (!pwResult || !scenarioProfiles || scenarioProfiles.length < 2) return null;
  const totalU = scenarioProfiles.map((prof, pi) => {
    let util = 0;
    for (const attr of pwResult.utilities) {
      const level = prof[attr.attribute];
      const levelUtil = attr.utilities.find(u => u.level === level || u.level === +level);
      util += levelUtil ? levelUtil.utility : 0;
    }
    return Math.exp(util);
  });
  const sumU = totalU.reduce((s, u) => s + u, 0);
  const shares = sumU > 0 ? totalU.map(u => +(100 * u / sumU).toFixed(2)) : totalU.map(() => 0);
  const pref = shares.map((s, i) => ({ profile: i + 1, share: s }));
  return { test: 'Market Simulator', shares: pref, nProfiles: scenarioProfiles.length, apa: `Market sim: ${pref.map(p => p.profile + '=' + p.share + '%').join(', ')}` };
}
