import { describe, it, expect } from 'vitest';
import { tobitModel, heckmanSelection, bivariateProbit, psmCaliper, localLinearIV, panelFixedEffects, panelRandomEffects, hausmanTest, arellanoBond, sur, threeSLS, gmm, cointegration, vecm, structuralVAR } from './econometric.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

describe('panelFixedEffects matches statsmodels OLS with unit dummies (LSDV) exactly', () => {
  it('coefficients and SEs match on a 3-unit x 4-period panel', () => {
    const e = ref.econometric.panel_fe_basic;
    const data = e.ids.map((id, i) => ({ id, x1: e.x1[i], x2: e.x2[i], y: e.y[i] }));
    const r = panelFixedEffects(data, 'y', ['x1', 'x2'], { idVar: 'id' });
    const b = Object.fromEntries(r.coefficients.map(c => [c.name, c.b]));
    const se = Object.fromEntries(r.coefficients.map(c => [c.name, c.se]));
    expect(b.x1).toBeCloseTo(e.b.x1, 3);
    expect(b.x2).toBeCloseTo(e.b.x2, 3);
    expect(se.x1).toBeCloseTo(e.se.x1, 3);
    expect(se.x2).toBeCloseTo(e.se.x2, 3);
  });
});

const d = []; for (let i = 0; i < 30; i++) d.push({ y: Math.max(0, i * 2), x1: i, x2: i % 2, sel: i > 10 ? 1 : 0, z1: i % 3, y1: i % 2, y2: (i + 1) % 2, id: Math.floor(i / 5), time: i % 5 });

describe('tobitModel', () => {
  it('contract keys', () => expectKeys(tobitModel(d, 'y', ['x1', 'x2']), ['test', 'coefficients', 'sigma', 'n', 'nCensored', 'apa']));
  it('null <20', () => expect(tobitModel(d.slice(0, 10), 'y', ['x1'])).toBeNull());
  it('n positive', () => { const r = tobitModel(d, 'y', ['x1', 'x2']); if (r) expect(r.n).toBeGreaterThan(0); });
});

describe('heckmanSelection', () => { it('contract keys', () => expectKeys(heckmanSelection(d, 'y', ['x1'], 'sel', ['z1']), ['test', 'imr', 'n', 'nSelected', 'apa'])); it('imr non-empty', () => { const r = heckmanSelection(d, 'y', ['x1'], 'sel', ['z1']); expect(r.imr.length).toBeGreaterThan(0); }); it('nSelected positive', () => { const r = heckmanSelection(d, 'y', ['x1'], 'sel', ['z1']); if (r) expect(r.nSelected).toBeGreaterThan(0); }); });
describe('bivariateProbit', () => { it('contract keys', () => expectKeys(bivariateProbit(d, 'y1', 'y2', ['x1']), ['test', 'rho', 'n', 'nBoth', 'apa'])); it('rho between -1-1', () => { const r = bivariateProbit(d, 'y1', 'y2', ['x1']); expect(r.rho).toBeGreaterThanOrEqual(-1); expect(r.rho).toBeLessThanOrEqual(1); }); it('n positive', () => { const r = bivariateProbit(d, 'y1', 'y2', ['x1']); if (r) expect(r.n).toBeGreaterThan(0); }); });
describe('psmCaliper', () => { it('contract keys', () => { const r = psmCaliper(d, 'sel', 'y', ['x1', 'x2']); if (r) expectKeys(r, ['test', 'att', 'nTreated', 'nControl', 'caliper', 'nMatched', 'apa']); }); it('att finite', () => { const r = psmCaliper(d, 'sel', 'y', ['x1', 'x2']); if (r) expect(Number.isFinite(r.att)).toBe(true); }); it('caliper positive', () => { const r = psmCaliper(d, 'sel', 'y', ['x1', 'x2']); if (r) expect(r.caliper).toBeGreaterThan(0); }); });
describe('localLinearIV', () => { it('contract keys', () => expectKeys(localLinearIV(d, 'x1', 'y', 'z1'), ['test', 'late', 'firstStage', 'reducedForm', 'bandwidth', 'n', 'apa'])); it('late finite', () => { const r = localLinearIV(d, 'x1', 'y', 'z1'); expect(Number.isFinite(r.late)).toBe(true); }); it('n positive', () => { const r = localLinearIV(d, 'x1', 'y', 'z1'); if (r) expect(r.n).toBeGreaterThan(0); }); });

// New functions
describe('panelFixedEffects', () => {
  it('contract keys', () => expectKeys(panelFixedEffects(d, 'y', ['x1'], { idVar: 'id' }), ['test','coefficients','nUnits','nPeriods','nObs','apa']));
  it('null <10', () => expect(panelFixedEffects(d.slice(0, 5), 'y', ['x1'], { idVar: 'id' })).toBeNull());
  it('nUnits matches id count', () => { const r = panelFixedEffects(d, 'y', ['x1'], { idVar: 'id' }); if (r) { const ids = new Set(d.map(o => o.id)); expect(r.nUnits).toBe(ids.size); } });
});

describe('panelRandomEffects', () => {
  it('contract keys', () => expectKeys(panelRandomEffects(d, 'y', ['x1'], { idVar: 'id' }), ['test','coefficients','theta','nUnits','nPeriods','apa']));
  it('theta between 0-1', () => { const r = panelRandomEffects(d, 'y', ['x1'], { idVar: 'id' }); if (r) { expect(r.theta).toBeGreaterThanOrEqual(0); expect(r.theta).toBeLessThanOrEqual(1); } });
  it('nUnits positive', () => { const r = panelRandomEffects(d, 'y', ['x1'], { idVar: 'id' }); if (r) expect(r.nUnits).toBeGreaterThan(0); });
});

describe('hausmanTest', () => {
  it('contract keys', () => expectKeys(hausmanTest([0.5],[0.1],[0.3],[0.08]), ['test','H','df','p','apa']));
  it('p between 0-1', () => { const r = hausmanTest([0.5],[0.1],[0.3],[0.08]); if (r) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); } });
  it('H non-negative', () => { const r = hausmanTest([0.5],[0.1],[0.3],[0.08]); if (r) expect(r.H).toBeGreaterThanOrEqual(0); });
});

describe('arellanoBond', () => {
  // d has y = 2*x1 exactly, so Δy_{t-1} and Δx1 are perfectly collinear (both ∝ constant
  // steps) — a genuine non-identification, not an algorithm bug. Use a panel with
  // independent variation in x1 for these contract tests.
  let sAB = 55; const rndAB = () => { sAB = (1103515245 * sAB + 12345) & 0x7fffffff; return sAB / 0x7fffffff; };
  const dAB = [];
  for (let uid = 0; uid < 6; uid++) {
    let y = 5 + rndAB() * 3;
    for (let t = 0; t < 5; t++) { y = 0.4 * y + t + rndAB() * 2; dAB.push({ id: uid, time: t, y, x1: t + rndAB() }); }
  }
  it('contract keys', () => expectKeys(arellanoBond(dAB, 'y', ['x1'], { idVar: 'id', timeVar: 'time' }), ['test','b','se','ar2','nUnits','nPeriods','apa']));
  it('b finite', () => { const r = arellanoBond(dAB, 'y', ['x1'], { idVar: 'id', timeVar: 'time' }); if (r) expect(Number.isFinite(r.b)).toBe(true); });
  it('nUnits positive', () => { const r = arellanoBond(dAB, 'y', ['x1'], { idVar: 'id', timeVar: 'time' }); if (r) expect(r.nUnits).toBeGreaterThan(0); });
  it('reports AR(2) and Sargan overidentification diagnostics', () => expectKeys(arellanoBond(dAB, 'y', ['x1'], { idVar: 'id', timeVar: 'time' }), ['ar2','ar2p','sargan','sarganDf','nInstruments']));
});

describe('arellanoBond recovers the true AR(1) coefficient of a dynamic panel via GMM instruments (not naive difference-OLS)', () => {
  it('estimates the lagged-DV coefficient close to the true value despite the fixed effect', () => {
    let s = 41; const rnd = () => { s = (1103515245 * s + 12345) & 0x7fffffff; return s / 0x7fffffff - 0.5; };
    const alpha = 0.5, nUnits = 120, T = 6;
    const rows = [];
    for (let i = 0; i < nUnits; i++) {
      const eta = rnd() * 2; // unit fixed effect
      let y = eta + rnd();
      for (let t = 0; t < T; t++) {
        y = alpha * y + eta + rnd();
        rows.push({ id: i, time: t, y });
      }
    }
    const r = arellanoBond(rows, 'y', [], { idVar: 'id', timeVar: 'time' });
    expect(r).not.toBeNull();
    expect(r.b).toBeGreaterThan(0.25);
    expect(r.b).toBeLessThan(0.85);
    expect(Number.isFinite(r.ar2)).toBe(true);
    expect(Number.isFinite(r.sargan)).toBe(true);
    expect(r.nInstruments).toBeGreaterThan(0);
  });
});

describe('sur', () => {
  it('contract keys', () => expectKeys(sur(d, ['y1','y2'], ['x1']), ['test','equations','nEq','n','apa']));
  it('equations array present', () => { const r = sur(d, ['y1','y2'], ['x1']); if (r) expect(Array.isArray(r.equations)).toBe(true); });
  it('nEq matches', () => { const r = sur(d, ['y1','y2'], ['x1']); if (r) expect(r.nEq).toBe(2); });
});

describe('threeSLS', () => {
  it('contract keys', () => expectKeys(threeSLS(d, ['y1','y2'], ['x1'], ['z1']), ['test','equations','n','nInstruments','apa']));
  it('equations non-empty', () => { const r = threeSLS(d, ['y1','y2'], ['x1'], ['z1']); if (r && r.equations) expect(r.equations.length).toBeGreaterThan(0); });
  it('nInstruments positive', () => { const r = threeSLS(d, ['y1','y2'], ['x1'], ['z1']); if (r) expect(r.nInstruments).toBeGreaterThan(0); });
});

describe('gmm', () => {
  it('contract keys', () => expectKeys(gmm(d, 'y', ['x1'], ['z1']), ['test','jStat','jP','coefficients','n','nInstruments','apa']));
  it('null <20', () => expect(gmm(d.slice(0, 10), 'y', ['x1'], ['z1'])).toBeNull());
  it('jStat positive', () => { const r = gmm(d, 'y', ['x1'], ['z1']); if (r) expect(r.jStat).toBeGreaterThanOrEqual(0); });
});

describe('cointegration', () => {
  it('contract keys', () => expectKeys(cointegration(d, 'y', ['x1']), ['test','tStat','p','rho','apa']));
  it('rho between -1-1', () => { const r = cointegration(d, 'y', ['x1']); if (r) { expect(r.rho).toBeGreaterThanOrEqual(-1); expect(r.rho).toBeLessThanOrEqual(1); } });
  it('p between 0-1', () => { const r = cointegration(d, 'y', ['x1']); if (r) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); } });
  it('reports MacKinnon critical values keyed by N (not a t-distribution p-value)', () => { const r = cointegration(d, 'y', ['x1']); expectKeys(r, ['N','criticalValues']); expect(r.criticalValues[5]).toBeLessThan(0); });
});

describe('cointegration distinguishes a real cointegrated pair from a spurious-regression pair (Engle-Granger via MacKinnon reference distribution)', () => {
  it('detects cointegration between two series sharing a common stochastic trend', () => {
    let s = 71; const rnd = () => { s = (1103515245 * s + 12345) & 0x7fffffff; return s / 0x7fffffff - 0.5; };
    let trend = 0; const rows = [];
    for (let t = 0; t < 200; t++) {
      trend += rnd() * 0.5; // common I(1) stochastic trend
      const y = trend + rnd() * 0.3;   // stationary deviation from the trend
      const x1 = trend + rnd() * 0.3;  // shares the same trend -> y, x1 cointegrated
      rows.push({ y, x1 });
    }
    const r = cointegration(rows, 'y', ['x1']);
    expect(r.p).toBeLessThan(0.05);
  });
  it('does not flag cointegration between two independent random walks (classic spurious regression)', () => {
    let s = 13; const rnd = () => { s = (1103515245 * s + 12345) & 0x7fffffff; return s / 0x7fffffff - 0.5; };
    let ya = 0, xb = 0; const rows = [];
    for (let t = 0; t < 200; t++) { ya += rnd() * 0.5; xb += rnd() * 0.5; rows.push({ y: ya, x1: xb }); }
    const r = cointegration(rows, 'y', ['x1']);
    expect(r.p).toBeGreaterThan(0.10);
  });
});

describe('vecm', () => {
  it('contract keys', () => expectKeys(vecm(d, ['y1','y2'], { lags: 1 }), ['test','rank','lags','adjustment','n','nVars','apa']));
  it('rank positive', () => { const r = vecm(d, ['y1','y2'], { lags: 1 }); if (r) expect(r.rank).toBeGreaterThan(0); });
  it('lags matches', () => { const r = vecm(d, ['y1','y2'], { lags: 1 }); if (r) expect(r.lags).toBe(1); });
});

describe('structuralVAR', () => {
  it('contract keys', () => expectKeys(structuralVAR(d, ['y1','y2']), ['test','lags','identification','periods','n','nVars','apa']));
  it('periods non-empty', () => { const r = structuralVAR(d, ['y1','y2']); if (r && r.periods) expect(r.periods.length).toBeGreaterThan(0); });
  it('nVars matches', () => { const r = structuralVAR(d, ['y1','y2']); if (r) expect(r.nVars).toBe(2); });
});

describe('panel estimators recover real coefficients', () => {
  // y = alpha_i + 2*x1 - 1*x2 exactly; unit fixed effects alpha=[10..50].
  const alphas = { A: 10, B: 20, C: 30, D: 40, E: 50 };
  const xs = {
    A: [[1,2],[2,1],[3,3],[4,2]], B: [[2,1],[3,2],[4,1],[5,3]],
    C: [[1,3],[3,1],[2,2],[5,4]], D: [[2,1],[4,3],[3,2],[1,4]], E: [[3,2],[1,4],[4,1],[2,3]],
  };
  const panelData = [];
  for (const id of Object.keys(alphas)) xs[id].forEach(([x1, x2], t) => panelData.push({ id, t: t + 1, x1, x2, y: alphas[id] + 2 * x1 - x2 }));

  it('FE within-estimator recovers [2, -1] (distinct per-regressor coefficients)', () => {
    const r = panelFixedEffects(panelData, 'y', ['x1', 'x2'], { idVar: 'id', timeVar: 't' });
    expect(r.coefficients.find(c => c.name === 'x1').b).toBeCloseTo(2, 3);
    expect(r.coefficients.find(c => c.name === 'x2').b).toBeCloseTo(-1, 3);
  });

  it('RE coefficients are data-dependent with correct signs (not a constant)', () => {
    const r = panelRandomEffects(panelData, 'y', ['x1', 'x2'], { idVar: 'id', timeVar: 't' });
    const b1 = r.coefficients.find(c => c.name === 'x1').b;
    const b2 = r.coefficients.find(c => c.name === 'x2').b;
    expect(b1).toBeGreaterThan(0);
    expect(b2).toBeLessThan(0);
  });
});

describe('tobitModel is a real censored-normal MLE', () => {
  // No censoring: y = 1 + 2x + tiny noise, all y > lowerBound. A real Tobit
  // reduces to OLS-with-intercept (slope→2); the old through-origin OLS gives ~2.13.
  const uncensored = [];
  for (let i = 0; i < 30; i++) {
    const x = 2 + (i % 10);
    uncensored.push({ x, y: 1 + 2 * x + 0.1 * (((i % 7) - 3) / 3) });
  }
  it('recovers the true slope when there is no censoring', () => {
    const r = tobitModel(uncensored, 'y', ['x'], { lowerBound: 0 });
    expect(r.coefficients.find(c => c.name === 'x').b).toBeCloseTo(2, 1);
  });
  it('reports a computed p-value (not hardcoded p=1)', () => {
    const r = tobitModel(uncensored, 'y', ['x'], { lowerBound: 0 });
    const co = r.coefficients.find(c => c.name === 'x');
    expect(co.p).toBeGreaterThanOrEqual(0);
    expect(co.p).toBeLessThan(0.05);
  });
  it('handles left-censored data and counts censored observations', () => {
    const censored = [];
    for (let i = 0; i < 30; i++) {
      const x = i % 10;                 // latent y* = -3 + 1.2x; censor at 0
      const ystar = -3 + 1.2 * x + 0.2 * (((i % 5) - 2) / 2);
      censored.push({ x, y: Math.max(0, ystar) });
    }
    const r = tobitModel(censored, 'y', ['x'], { lowerBound: 0 });
    expect(r.nCensored).toBeGreaterThan(0);
    expect(r.coefficients.every(c => Number.isFinite(c.se) && c.p >= 0 && c.p <= 1)).toBe(true);
  });
});

describe('gmm is a real GMM/IV estimator', () => {
  // Overidentified IV: 1 endogenous x, 2 instruments; structural y = 2x + e.
  const data = [];
  for (let i = 0; i < 40; i++) {
    const z1 = (i % 7) - 3, z2 = (i % 11) - 5;
    const x = z1 + 0.5 * z2 + 0.2 * ((i % 3) - 1);
    const e = 0.1 * ((i % 5) - 2);
    data.push({ x, y: 2 * x + e, z1, z2 });
  }
  it('recovers the structural coefficient (~2), not the frozen init of 1', () => {
    const r = gmm(data, 'y', ['x'], ['z1', 'z2']);
    expect(r.coefficients[0].b).toBeGreaterThan(1.5);
    expect(r.coefficients[0].b).toBeLessThan(2.5);
  });
  it('computes Hansen J + p-value and real SE (not 3.14 / 0.54 / se=0.1)', () => {
    const r = gmm(data, 'y', ['x'], ['z1', 'z2']);
    expect(r.jStat).not.toBe(3.14);
    expect(r.jDf).toBe(1);              // q - k = 2 - 1
    expect(r.jStat).toBeGreaterThanOrEqual(0);
    expect(r.jP).toBeGreaterThanOrEqual(0);
    expect(r.jP).toBeLessThanOrEqual(1);
    expect(r.coefficients[0].se).not.toBe(0.1);
  });
});

describe('bivariateProbit is a real FIML estimator', () => {
  // Two probit equations: y1* = 0.5 + 1.2x + e1, y2* = -0.3 - 0.9x + e2,
  // corr(e1,e2) = 0.5. A real biprobit recovers β1_x>0, β2_x<0, ρ>0.
  let s = 987654321;
  const rand = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 2 ** 32; };
  const randn = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
  const rho = 0.5, Lc = Math.sqrt(1 - rho * rho);
  const data = [];
  for (let i = 0; i < 160; i++) {
    const x = (i % 20) / 5 - 2;
    const e1 = randn(), e2 = rho * e1 + Lc * randn();
    data.push({ x, y1: 0.5 + 1.2 * x + e1 > 0 ? 1 : 0, y2: -0.3 - 0.9 * x + e2 > 0 ? 1 : 0 });
  }
  it('recovers both equations coefficient signs and a positive error correlation', () => {
    const r = bivariateProbit(data, 'y1', 'y2', ['x']);
    expect(r.equation1.find(c => c.name === 'x').b).toBeGreaterThan(0);
    expect(r.equation2.find(c => c.name === 'x').b).toBeLessThan(0);
    expect(r.rho).toBeGreaterThan(0);
  });
});

describe('hausmanTest uses the correct chi-square tail', () => {
  it('rejects RE when FE and RE estimates differ sharply (small p)', () => {
    const r = hausmanTest([2, 3], [0.5, 0.5], [1, 1], [0.3, 0.3]);
    expect(r.p).toBeLessThan(0.01);
  });
});

describe('heckmanSelection runs a real two-step (probit + IMR-augmented OLS)', () => {
  it('recovers the outcome slope under selection on correlated errors', () => {
    let s = 71; const N = () => { let u = 0; for (let k = 0; k < 12; k++) { s = (Math.imul(1664525, s) + 1013904223) >>> 0; u += s / 2 ** 32; } return u - 6; };
    const rows = [];
    const betaTrue = 1.5, rho = 0.7;
    for (let i = 0; i < 400; i++) {
      const z = N(), x = N();
      const us = N();
      const eps = rho * us + Math.sqrt(1 - rho * rho) * N(); // outcome error correlated with selection
      const sel = (0.8 * z + 0.5 * x + us > 0) ? 1 : 0;       // selection equation
      const y = sel ? (betaTrue * x + 2 + eps) : null;        // observed only if selected
      rows.push({ y: y == null ? 0 : y, x1: x, z1: z, sel });
    }
    const r = heckmanSelection(rows, 'y', ['x1'], 'sel', ['z1', 'x1']);
    const xc = r.coefficients.find(c => c.name === 'x1');
    expect(Math.abs(xc.b - 1.5)).toBeLessThan(0.4);
  });
});

describe('hardening — invalid inputs', () => {
  it('tobitModel null for empty data', () => expect(tobitModel([], 'y', ['x1'])).toBeNull());
  it('tobitModel null for null', () => expect(tobitModel(null, 'y', ['x1'])).toBeNull());
  it('heckmanSelection null for null data', () => expect(heckmanSelection(null, 'y', ['x1'], 'sel', ['z1'])).toBeNull());
  it('bivariateProbit null for empty data', () => expect(bivariateProbit([], 'y1', 'y2', ['x1'])).toBeNull());
  it('psmCaliper null for mismatched treatment variable', () => expect(psmCaliper([], 'sel', 'y', ['x1'])).toBeNull());
  it('localLinearIV null for empty data', () => expect(localLinearIV([], 'x1', 'y', 'z1')).toBeNull());
  it('panelFixedEffects null for null data', () => expect(panelFixedEffects(null, 'y', ['x1'])).toBeNull());
  it('panelRandomEffects null for empty', () => expect(panelRandomEffects([], 'y', ['x1'])).toBeNull());
  it('hausmanTest null for mismatched lengths', () => expect(hausmanTest([0.5], [0.1], [0.3, 0.25], [0.08, 0.08])).toBeNull());
  it('arellanoBond null for empty data', () => expect(arellanoBond([], 'y', ['x1'])).toBeNull());
  it('sur null for null data', () => expect(sur(null, ['y1'], ['x1'])).toBeNull());
  it('threeSLS null for empty data', () => expect(threeSLS([], ['y1'], ['x1'], ['z1'])).toBeNull());
  it('gmm null for empty', () => expect(gmm([], 'y', ['x1'], ['z1'])).toBeNull());
  it('cointegration null for empty data', () => expect(cointegration([], 'y', ['x1'])).toBeNull());
  it('vecm null for empty', () => expect(vecm([], ['y1'])).toBeNull());
  it('structuralVAR null for empty', () => expect(structuralVAR([], ['y1'])).toBeNull());
  it('tobitModel null for no xVars', () => expect(tobitModel(d, 'y', [])).toBeNull());
});

describe('hardening — degenerate data', () => {
  it('bivariateProbit rho in [-1, 1] with degenerate data', () => {
    const r = bivariateProbit(d, 'y1', 'y2', ['x1']);
    expect(r.rho).toBeGreaterThanOrEqual(-1);
    expect(r.rho).toBeLessThanOrEqual(1);
  });
  it('cointegration with stationary data', () => {
    const data = [{ y: 0, x1: 0 }];
    for (let i = 1; i < 30; i++) data.push({ y: Math.random() - 0.5, x1: Math.random() - 0.5 });
    const r = cointegration(data, 'y', ['x1']);
    if (r) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); }
  });
  it('panelFixedEffects handles single predictor', () => {
    const r = panelFixedEffects(d, 'y', ['x1'], { idVar: 'id' });
    if (r) expect(r.coefficients.length).toBe(1);
  });
  it('panelRandomEffects theta in [0, 1]', () => {
    const r = panelRandomEffects(d, 'y', ['x1'], { idVar: 'id' });
    if (r) { expect(r.theta).toBeGreaterThanOrEqual(0); expect(r.theta).toBeLessThanOrEqual(1); }
  });
  it('hausmanTest H non-negative', () => {
    const r = hausmanTest([0.5], [0.1], [0.3], [0.08]);
    if (r) expect(r.H).toBeGreaterThanOrEqual(0);
  });
  it('cointegration rho in [-1, 1]', () => {
    const r = cointegration(d, 'y', ['x1']);
    if (r) { expect(r.rho).toBeGreaterThanOrEqual(-1); expect(r.rho).toBeLessThanOrEqual(1); }
  });
  it('vecm reports positive rank', () => {
    const r = vecm(d, ['y1', 'y2'], { lags: 1 });
    if (r) expect(r.rank).toBeGreaterThan(0);
  });
  it('gmm jStat >= 0', () => {
    const r = gmm(d, 'y', ['x1'], ['z1']);
    if (r) expect(r.jStat).toBeGreaterThanOrEqual(0);
  });
});
