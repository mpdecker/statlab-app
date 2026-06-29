import { avg, sampleVar } from '../math/core.js';
import { mulberry32 } from '../math/rng.js';
import { solveNormalEquations } from '../math/matrix.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── Part-Worth Utilities ──────────────────────────────────────────
export function partWorthUtilities(ratings, profiles, attrs) {
  if (!ratings || !profiles || ratings.length < 5 || !attrs || attrs.length < 2) return null;
  const n = ratings.length, p = attrs.length;
  const X = profiles.map(row => attrs.flatMap(a => {
    const levels = [...new Set(profiles.map(r => r[a]))];
    const val = row[a];
    return levels.map((l, j) => j < levels.length - 1 && l === val ? 1 : j === levels.length - 1 ? -1 : 0);
  }));
  const Xt = X[0].map((_, j) => X.map(r => r[j]));
  const XtX = Xt.map(r1 => X[0].map((_, j) => r1.reduce((s, _, k) => s + X[k][j] * r1[k], 0)));
  const XtY = Xt.map(r1 => r1.reduce((s, v, k) => s + v * ratings[k], 0));
  const utilities = solveNormalEquations(XtX, XtY).map(v => +v.toFixed(4));
  const result = attrs.map((a, ai) => ({
    attribute: a,
    utilities: utilities.slice(ai * 2, (ai + 1) * 2).map((u, l) => ({ level: l + 1, utility: u || 0 }))
  }));
  return { test: 'Part-Worth Utilities', utilities: result, n, apa: `Part-worth: ${attrs.length} attributes, n=${n}` };
}

// ── Attribute Importance ──────────────────────────────────────────
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
export function choiceSimulation(profiles, attrs, { seed = 42, nRespondents = 50, nChoices = 3 } = {}) {
  __rng = mulberry32(seed);
  if (!profiles || profiles.length < 3 || !attrs || attrs.length < 2) return null;
  const k = profiles.length;
  const shares = Array(k).fill(0);
  for (let r = 0; r < nRespondents; r++) {
    const utils = profiles.map(() => __rng() * 10 - 5);
    const maxU = Math.max(...utils);
    const exps = utils.map(u => Math.exp(u - maxU));
    const sumExp = exps.reduce((s, e) => s + e, 0);
    const probs = exps.map(e => e / sumExp);
    let cum = 0, u = __rng();
    for (let j = 0; j < k; j++) { cum += probs[j]; if (u <= cum) { shares[j]++; break; } }
  }
  const marketShares = shares.map((s, i) => ({ profile: i + 1, share: +(100 * s / nRespondents).toFixed(2) }));
  return { test: 'Choice Simulation', marketShares, nRespondents, nProfiles: k, apa: `Choice sim: ${k} profiles, ${nRespondents} respondents` };
}

// ── Orthogonal Design ─────────────────────────────────────────────
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
