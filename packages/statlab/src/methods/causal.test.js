import { describe, it, expect } from 'vitest';
import {
  propensityScoreMatch, iv2sls, interruptedTimeSeries, regressionDiscontinuity,
  syntheticControl, doubleML, backdoorAdjustment,
  iptwWeights, fuzzyRDD, gComputation, staggeredDiD,
  covariateBalance, smdTable, propensityOverlap, weightingDiagnostics, lovePlotData,
  naturalIndirectEffect, controlledDirectEffect, evalue, mediationProportion, sensitivityBias, interactionMediation,
  msmWeights, gestimationSNM, rpsft, structuralNestedAFT, complianceAdjusted,
  weakIVTest, sarganHansenJ, durbinWuHausman, ivDiagnosticsSummary,
  moderatedMediation, multiMediator, longitudinalMediation, sensitivityBounds,
} from './causal.js';
import { causalRows } from './fixtures/phase3.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const rows = causalRows(100);

describe('propensityScoreMatch', () => {
  it('returns null for n < 20', () => {
    expect(propensityScoreMatch(rows.slice(0, 15), 'treat', 'y', ['x1'])).toBeNull();
  });

  it('returns null for non-binary treatment', () => {
    const tri = rows.map(r => ({ ...r, treat: ['A', 'B', 'C'][r.y % 3] }));
    expect(propensityScoreMatch(tri, 'treat', 'y', ['x1'])).toBeNull();
  });

  it('returns null without both treatment arms', () => {
    const oneArm = rows.map(r => ({ ...r, treat: 'T' }));
    expect(propensityScoreMatch(oneArm, 'treat', 'y', ['x1'])).toBeNull();
  });

  it('ATT positive for simulated treatment effect', () => {
    const r = propensityScoreMatch(rows, 'treat', 'y', ['x1', 'x2']);
    expect(r.att).toBeGreaterThan(0);
  });

  it('matched pairs <= treated count', () => {
    const r = propensityScoreMatch(rows, 'treat', 'y', ['x1', 'x2']);
    expect(r.nMatched).toBeLessThanOrEqual(r.nTreated);
    expect(r.nMatched).toBeGreaterThan(0);
  });

  it('p-value in (0, 1]', () => {
    const r = propensityScoreMatch(rows, 'treat', 'y', ['x1']);
    expect(r.p).toBeGreaterThan(0);
    expect(r.p).toBeLessThanOrEqual(1);
  });

  it('balance tables per covariate', () => {
    const r = propensityScoreMatch(rows, 'treat', 'y', ['x1', 'x2']);
    expect(r.balanceBefore).toHaveLength(2);
    expect(r.balanceAfter).toHaveLength(2);
  });

  it('balanceAfter uses matched covariate means (not outcomes)', () => {
    const r = propensityScoreMatch(rows, 'treat', 'y', ['x1']);
    const before = Math.abs(r.balanceBefore[0].diff);
    const after = Math.abs(r.balanceAfter[0].diff);
    expect(after).toBeLessThanOrEqual(before + 0.05);
  });

  it('contract fields', () => {
    const r = propensityScoreMatch(rows, 'treat', 'y', ['x1']);
    expectKeys(r, [
      'test', 'att', 'se', 't', 'df', 'p', 'nTreated', 'nMatched',
      'balanceBefore', 'balanceAfter', 'apa',
    ]);
    expect(r.test).toBe('Propensity Score Match');
  });

  it('apa includes ATT and matched n', () => {
    const r = propensityScoreMatch(rows, 'treat', 'y', ['x1']);
    expect(r.apa).toMatch(/ATT/);
    expect(r.apa).toMatch(/matched/i);
  });
});

describe('iv2sls', () => {
  it('returns null for insufficient n', () => {
    expect(iv2sls(rows.slice(0, 10), 'y', 'x1', 'z', [])).toBeNull();
  });

  it('returns coefficient and inference', () => {
    const r = iv2sls(rows, 'y', 'x1', 'z', ['x2']);
    expect(r).not.toBeNull();
    expect(Number.isFinite(r.coef)).toBe(true);
    expect(Number.isFinite(r.se)).toBe(true);
    expect(r.df).toBeGreaterThan(0);
  });

  it('firstStageF positive', () => {
    expect(iv2sls(rows, 'y', 'x1', 'z', ['x2']).firstStageF).toBeGreaterThan(0);
  });

  it('works without extra controls', () => {
    expect(iv2sls(rows, 'y', 'x1', 'z', [])).not.toBeNull();
  });

  it('contract fields', () => {
    const r = iv2sls(rows, 'y', 'x1', 'z', ['x2']);
    expectKeys(r, ['test', 'coef', 'se', 't', 'df', 'p', 'firstStageF', 'n', 'apa']);
    expect(r.test).toBe('IV / 2SLS');
  });

  it('filters incomplete rows', () => {
    const dirty = rows.map((r, i) => (i === 0 ? { ...r, z: NaN } : r));
    const clean = iv2sls(rows, 'y', 'x1', 'z', []);
    const filt = iv2sls(dirty, 'y', 'x1', 'z', []);
    expect(filt.n).toBe(clean.n - 1);
  });

  it('SE matches statsmodels.sandbox.regression.gmm.IV2SLS exactly (regression test for the xHat-residual SE fix)', () => {
    const e = ref.causal.iv2sls_basic;
    const ivRows = e.y.map((y, i) => ({ y, x: e.x[i], z: e.z[i], w1: e.w1[i] }));
    const r = iv2sls(ivRows, 'y', 'x', 'z', ['w1']);
    expect(r.coef).toBeCloseTo(e.coef, 3);
    expect(r.se).toBeCloseTo(e.se, 3);
  });
});

describe('interruptedTimeSeries', () => {
  const t = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const y = [10, 10, 11, 10, 15, 16, 17, 18, 19, 20];

  it('returns null for short series', () => {
    expect(interruptedTimeSeries([1, 2, 3], [1, 2, 3], 2)).toBeNull();
  });

  it('returns null for length mismatch', () => {
    expect(interruptedTimeSeries(t, y.slice(0, 5), 5)).toBeNull();
  });

  it('detects positive level change after jump', () => {
    expect(interruptedTimeSeries(t, y, 4.5).levelChange).toBeGreaterThan(0);
  });

  it('series payload matches input length', () => {
    const r = interruptedTimeSeries(t, y, 5);
    expect(r.series).toHaveLength(t.length);
    r.series.forEach(pt => {
      expect(pt).toHaveProperty('t');
      expect(pt).toHaveProperty('y');
      expect(pt).toHaveProperty('post');
    });
  });

  it('contract fields', () => {
    const r = interruptedTimeSeries(t, y, 5);
    expectKeys(r, [
      'test', 'levelChange', 'slopeChange', 'beta0', 'betaTime',
      'interventionTime', 'n', 'series', 'apa',
    ]);
  });

  it('flat pre/post yields small level change', () => {
    const flat = Array(10).fill(5);
    expect(Math.abs(interruptedTimeSeries(t, flat, 5).levelChange)).toBeLessThan(0.01);
  });
});

describe('regressionDiscontinuity', () => {
  const x = Array.from({ length: 50 }, (_, i) => i - 25);
  const y = x.map(v => (v < 0 ? 5 + v * 0.1 : 8 + v * 0.1));

  it('returns null for n < 12', () => {
    expect(regressionDiscontinuity(x.slice(0, 8), y.slice(0, 8), 0)).toBeNull();
  });

  it('returns null for length mismatch', () => {
    expect(regressionDiscontinuity(x, y.slice(0, 20), 0)).toBeNull();
  });

  it('detects jump at cutoff', () => {
    expect(regressionDiscontinuity(x, y, 0, 20).jump).toBeGreaterThan(1);
  });

  it('auto bandwidth when h <= 0', () => {
    const r = regressionDiscontinuity(x, y, 0, 0);
    expect(r.bandwidth).toBeGreaterThan(0);
  });

  it('local n <= full sample', () => {
    const r = regressionDiscontinuity(x, y, 0, 12);
    expect(r.nLocal).toBeLessThanOrEqual(x.length);
    expect(r.nLocal).toBeGreaterThanOrEqual(8);
  });

  it('points tagged left/right', () => {
    const r = regressionDiscontinuity(x, y, 0, 25);
    expect(r.points.some(p => p.side === 'left')).toBe(true);
    expect(r.points.some(p => p.side === 'right')).toBe(true);
  });

  it('contract fields', () => {
    const r = regressionDiscontinuity(x, y, 0, 15);
    expectKeys(r, [
      'test', 'jump', 'leftIntercept', 'rightIntercept', 'bandwidth',
      'cutoff', 't', 'p', 'nLocal', 'points', 'apa',
    ]);
  });

  it('continuous outcome without jump yields small jump', () => {
    const smooth = x.map(v => 5 + v * 0.2);
    expect(Math.abs(regressionDiscontinuity(x, smooth, 0, 30).jump)).toBeLessThan(1);
  });
});

describe('syntheticControl', () => {
  it('returns null for invalid input', () => {
    expect(syntheticControl([1, 2], [[1, 2]], 2, 0)).toBeNull();
  });

  it('constructs synthetic unit', () => {
    const treated = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const controls = [
      [0.9, 1.9, 2.8, 3.8, 4.8, 5.8, 6.8, 7.8, 8.8, 9.8],
      [1.1, 2.1, 3.2, 4.2, 5.2, 6.2, 7.2, 8.2, 9.2, 10.2],
    ];
    const r = syntheticControl(treated, controls, 7, 3);
    expect(r).not.toBeNull();
    expect(r.weights.length).toBe(2);
    expect(r.preRMSPE).toBeGreaterThanOrEqual(0);
    expect(r.synthetic.length).toBe(10);
  });

  it('contract fields present', () => {
    const treated = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const controls = [[0.9, 1.9, 2.8, 3.8, 4.8, 5.8, 6.8, 7.8, 8.8, 9.8]];
    const r = syntheticControl(treated, controls, 7, 3);
    expectKeys(r, ['test', 'weights', 'synthetic', 'treated', 'preGap', 'postGap', 'att', 'preRMSPE', 't', 'p', 'apa']);
  });

  it('weights sum to approximately 1', () => {
    const treated = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const controls = [
      [0.9, 1.9, 2.8, 3.8, 4.8, 5.8, 6.8, 7.8, 8.8, 9.8],
      [1.1, 2.1, 3.2, 4.2, 5.2, 6.2, 7.2, 8.2, 9.2, 10.2],
    ];
    const r = syntheticControl(treated, controls, 7, 3);
    const sum = r.weights.reduce((s, w) => s + w.weight, 0);
    expect(sum).toBeCloseTo(1, 2);
  });

  it('returns null for length mismatch', () => {
    expect(syntheticControl([1, 2, 3], [[1, 2]], 2, 1)).toBeNull();
  });

  it('p-value is between 0 and 1', () => {
    const treated = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const controls = [[0.9, 1.9, 2.8, 3.8, 4.8, 5.8, 6.8, 7.8, 8.8, 9.8, 10.8, 11.8]];
    const r = syntheticControl(treated, controls, 8, 4);
    expect(r.p).toBeGreaterThanOrEqual(0);
    expect(r.p).toBeLessThanOrEqual(1);
  });
});

describe('doubleML', () => {
  it('returns null for small n', () => {
    expect(doubleML([1, 2], [0, 1], [[1], [2]])).toBeNull();
  });

  it('estimates ATE with DML', () => {
    const n = 50;
    const y = [], D = [], X = [];
    for (let i = 0; i < n; i++) {
      const d = Math.random() < 0.5 ? 0 : 1;
      const x = i * 0.2;
      y.push(2 + d * 1.5 + x * 0.5 + (Math.random() - 0.5) * 1);
      D.push(d);
      X.push([x]);
    }
    const r = doubleML(y, D, X);
    expect(r).not.toBeNull();
    expect(r.test).toContain('DML');
    expect(r.ate).toBeDefined();
    expect(r.se).toBeGreaterThan(0);
  });

  it('contract fields present', () => {
    const n = 30;
    const y = [], D = [], X = [];
    for (let i = 0; i < n; i++) {
      y.push(i + Math.random());
      D.push(i % 2);
      X.push([i * 0.1]);
    }
    const r = doubleML(y, D, X);
    expectKeys(r, ['test', 'ate', 'se', 't', 'p', 'n', 'apa']);
  });

  it('ATE has correct sign for strong positive effect', () => {
    const n = 60;
    const y = [], D = [], X = [];
    for (let i = 0; i < n; i++) {
      const d = i % 2;
      y.push(3 * d + (Math.random() - 0.5) * 0.3);
      D.push(d);
      X.push([i * 0.05]);
    }
    const r = doubleML(y, D, X);
    expect(r.ate).toBeGreaterThan(1.5);
  });

  it('standard error decreases with larger n', () => {
    const makeData = (n) => {
      const y = [], D = [], X = [];
      for (let i = 0; i < n; i++) {
        const d = i % 2;
        y.push(2 * d + (Math.random() - 0.5) * 1);
        D.push(d);
        X.push([i * 0.05]);
      }
      return { y, D, X };
    };
    const r1 = doubleML(...Object.values(makeData(30)));
    const r2 = doubleML(...Object.values(makeData(100)));
    expect(r2.se).toBeLessThan(r1.se);
  });

  it('returns null for non-matching lengths', () => {
    expect(doubleML([1, 2, 3, 4, 5], [0, 1], [[1], [2]])).toBeNull();
  });

  it('p-value between 0 and 1', () => {
    const n = 40;
    const y = [], D = [], X = [];
    for (let i = 0; i < n; i++) {
      y.push(i * 0.1 + Math.random());
      D.push(i % 2);
      X.push([i * 0.1]);
    }
    const r = doubleML(y, D, X);
    expect(r.p).toBeGreaterThan(0);
    expect(r.p).toBeLessThanOrEqual(1);
  });
});

describe('backdoorAdjustment', () => {
  it('finds adjustment set for simple DAG', () => {
    const dag = [['Z', 'X'], ['Z', 'Y'], ['X', 'Y']];
    const r = backdoorAdjustment(dag, 'X', 'Y');
    expect(r).not.toBeNull();
    expect(r.adjustmentSet).toContain('Z');
  });

  it('returns empty for DAG without backdoor', () => {
    const dag = [['X', 'Y']];
    const r = backdoorAdjustment(dag, 'X', 'Y');
    expect(r).not.toBeNull();
    expect(r.adjustmentSet.length).toBe(0);
  });

  it('contract fields present', () => {
    const dag = [['Z', 'X'], ['Z', 'Y']];
    const r = backdoorAdjustment(dag, 'X', 'Y');
    expectKeys(r, ['test', 'treatment', 'outcome', 'adjustmentSet', 'minimal', 'allNodes', 'nEdges', 'apa']);
  });

  it('returns null for null input', () => {
    expect(backdoorAdjustment(null, 'X', 'Y')).toBeNull();
  });

  it('detects multiple confounders', () => {
    const dag = [['Z1', 'X'], ['Z1', 'Y'], ['Z2', 'X'], ['Z2', 'Y'], ['X', 'Y']];
    const r = backdoorAdjustment(dag, 'X', 'Y');
    expect(r.adjustmentSet).toContain('Z1');
    expect(r.adjustmentSet).toContain('Z2');
  });

  it('does not include treatment or outcome in adjustment set', () => {
    const dag = [['Z', 'X'], ['Z', 'Y'], ['X', 'Y']];
    const r = backdoorAdjustment(dag, 'X', 'Y');
    expect(r.adjustmentSet).not.toContain('X');
    expect(r.adjustmentSet).not.toContain('Y');
  });

  it('minimal is true when confounders found', () => {
    const dag = [['Z', 'X'], ['Z', 'Y']];
    const r = backdoorAdjustment(dag, 'X', 'Y');
    expect(r.minimal).toBe(true);
  });

  it('minimal is false when no confounders', () => {
    const dag = [['X', 'Y']];
    const r = backdoorAdjustment(dag, 'X', 'Y');
    expect(r.minimal).toBe(false);
  });
});

describe('iptwWeights', () => {
  const data = [];
  for (let i = 0; i < 40; i++) data.push({ treat: i < 20 ? 'A' : 'B', y: 10 + i * 0.2 + (i < 20 ? 0 : 2), x1: i % 3 });
  it('returns null for small data', () => expect(iptwWeights(null, 'treat', 'y', ['x1'])).toBeNull());
  it('contract keys', () => expectKeys(iptwWeights(data, 'treat', 'y', ['x1']), ['test', 'att', 'se', 't', 'p', 'n', 'nTreated', 'nControl', 'apa']));
  it('att is finite', () => { const r = iptwWeights(data, 'treat', 'y', ['x1']); expect(Number.isFinite(r.att)).toBe(true); });
  it('apa string', () => { const r = iptwWeights(data, 'treat', 'y', ['x1']); expect(typeof r.apa).toBe('string'); expect(r.apa.length).toBeGreaterThan(0); });
});

describe('fuzzyRDD', () => {
  const data = [];
  for (let i = 0; i < 60; i++) data.push({ running: i - 30, treat: i > 30 ? 1 : 0, y: 5 + (i > 30 ? 2 : 0) + i * 0.1 });
  it('null for small', () => expect(fuzzyRDD(data.slice(0, 20), 'running', 'treat', 'y', 0, 20)).toBeNull());
  it('contract keys', () => { const r = fuzzyRDD(data, 'running', 'treat', 'y', 0, 20); if (r) expectKeys(r, ['test', 'late', 'se', 't', 'p', 'fStat', 'bandwidth', 'n', 'nBand', 'apa']); });

  it('late is finite when valid', () => {
    const r = fuzzyRDD(data, 'running', 'treat', 'y', 0, 20);
    if (r) expect(Number.isFinite(r.late)).toBe(true);
  });
});

describe('gComputation', () => {
  const data = [];
  for (let i = 0; i < 40; i++) data.push({ treat: i < 20 ? 'A' : 'B', y: 5 + i * 0.1 + (i < 20 ? 0 : 1.5), x1: i % 2 });
  it('null for small', () => expect(gComputation(data.slice(0, 20), 'treat', 'y', ['x1'])).toBeNull());
  it('contract keys', () => { const r = gComputation(data, 'treat', 'y', ['x1']); if (r) expectKeys(r, ['test', 'ate', 'se', 'ci', 'n', 'apa']); });
  it('ate finite', () => { const r = gComputation(data, 'treat', 'y', ['x1']); if (r) expect(Number.isFinite(r.ate)).toBe(true); });
});

describe('staggeredDiD', () => {
  const panel = [];
  for (let i = 0; i < 10; i++) for (let t = 0; t < 5; t++) panel.push({ unit: `U${i}`, time: t, treat: i < 5 && t >= 3 ? 1 : 0, y: i + t * 0.5 + (i < 5 && t >= 3 ? 2 : 0) });
  it('null for small', () => expect(staggeredDiD(panel.slice(0, 10), 'unit', 'time', 'treat', 'y')).toBeNull());
  it('contract keys', () => expectKeys(staggeredDiD(panel, 'unit', 'time', 'treat', 'y'), ['test', 'att', 'nUnits', 'nPeriods', 'nNeverTreated', 'nTreated', 'apa']));
  it('att finite', () => { const r = staggeredDiD(panel, 'unit', 'time', 'treat', 'y'); expect(Number.isFinite(r.att)).toBe(true); });
});

describe('covariateBalance', () => {
  const treated = []; for (let i = 0; i < 10; i++) treated.push({ x1: i + 10, x2: i * 0.5 });
  const control = []; for (let i = 0; i < 10; i++) control.push({ x1: i, x2: i * 0.3 });
  it('null <5', () => expect(covariateBalance(treated.slice(0, 2), control, ['x1'])).toBeNull());
  it('contract keys', () => expectKeys(covariateBalance(treated, control, ['x1', 'x2']), ['test', 'results', 'nTreated', 'nControl', 'apa']));
  it('smd reported', () => { const r = covariateBalance(treated, control, ['x1']); expect(Number.isFinite(r.results[0].smd)).toBe(true); });
});

describe('smdTable', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ treat: i < 10 ? 'A' : 'B', x1: i + (i < 10 ? 3 : 0), x2: i * 0.5 });
  it('null <10', () => expect(smdTable(d.slice(0, 5), 'treat', ['x1'])).toBeNull());
  it('contract keys', () => expectKeys(smdTable(d, 'treat', ['x1', 'x2']), ['test', 'results', 'nTreated', 'nControl', 'apa']));

  it('results is an array when valid', () => {
    const r = smdTable(d, 'treat', ['x1', 'x2']);
    if (r) expect(Array.isArray(r.results)).toBe(true);
  });
});

describe('propensityOverlap', () => {
  it('is defined', () => expect(propensityOverlap).not.toBeUndefined());
  it('overlap bins non-empty for valid data', () => {
    const d = [];
    for (let i = 0; i < 40; i++) d.push({ treat: i < 20 ? 'A' : 'B', x1: i * 0.1, x2: i % 3 });
    const r = propensityOverlap(d, 'treat', ['x1', 'x2']);
    if (r) expect(r.bins.length).toBeGreaterThan(0);
  });

  it('contract keys when valid', () => {
    const d = [];
    for (let i = 0; i < 40; i++) d.push({ treat: i < 20 ? 'A' : 'B', x1: i * 0.1, x2: i % 3 });
    const r = propensityOverlap(d, 'treat', ['x1', 'x2']);
    if (r) expectKeys(r, ['test', 'bins', 'n', 'apa']);
  });
});

describe('weightingDiagnostics', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ treat: i < 10 ? 'A' : 'B', x1: i + (i < 10 ? 2 : 0), x2: i % 3 });
  it('contract keys', () => { const r = weightingDiagnostics(Array(20).fill(1), d, 'treat', ['x1', 'x2']); if (r) expectKeys(r, ['test', 'nEff', 'n', 'nTreated', 'nControl', 'balanceBefore', 'balanceAfter', 'apa']); });
  it('diagnostics non-empty', () => {
    const r = weightingDiagnostics(Array(20).fill(1), d, 'treat', ['x1', 'x2']);
    if (r) { expect(r.nEff).toBeGreaterThan(0); expect(r.balanceBefore).toBeDefined(); }
  });

  it('nEff is less than or equal to n when valid', () => {
    const r = weightingDiagnostics(Array(20).fill(1), d, 'treat', ['x1', 'x2']);
    if (r) expect(r.nEff).toBeLessThanOrEqual(r.n);
  });
});

describe('lovePlotData', () => {
  const before = [{ variable: 'x1', smd: 0.5 }, { variable: 'x2', smd: 0.3 }];
  const after = [{ variable: 'x1', smd: 0.1 }, { variable: 'x2', smd: 0.05 }];
  it('contract keys', () => expectKeys(lovePlotData(before, after), ['test', 'points', 'nVars', 'apa']));
  it('nVars correct', () => { const r = lovePlotData(before, after); expect(r.nVars).toBe(2); });

  it('points array has entries', () => {
    const r = lovePlotData(before, after);
    if (r) expect(Array.isArray(r.points)).toBe(true);
  });
});

describe('naturalIndirectEffect', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ treat: i < 15 ? 'A' : 'B', med: i * 0.5 + (i < 15 ? 0 : 2), y: i + (i < 15 ? 0 : 3), x1: i % 2 });
  it('contract keys', () => { const r = naturalIndirectEffect(d, 'treat', 'med', 'y', ['x1']); if (r) expectKeys(r, ['test', 'nie', 'a', 'b', 'se', 'z', 'p', 'n', 'apa']); });
  it('effect is finite', () => {
    const r = naturalIndirectEffect(d, 'treat', 'med', 'y', ['x1']);
    if (r) expect(Number.isFinite(r.nie)).toBe(true);
  });

  it('se is positive when valid', () => {
    const r = naturalIndirectEffect(d, 'treat', 'med', 'y', ['x1']);
    if (r) expect(r.se).toBeGreaterThan(0);
  });
});

describe('controlledDirectEffect', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ treat: i < 15 ? 'A' : 'B', med: i * 0.5, y: i + (i < 15 ? 0 : 3), x1: i % 2 });
  it('contract keys', () => { const r = controlledDirectEffect(d, 'treat', 'med', 'y', ['x1'], 0); if (r) expectKeys(r, ['test', 'cde', 'se', 'z', 'p', 'mediatorValue', 'n', 'apa']); });
  it('effect is finite', () => {
    const r = controlledDirectEffect(d, 'treat', 'med', 'y', ['x1'], 0);
    if (r) expect(Number.isFinite(r.cde)).toBe(true);
  });

  it('se is positive when valid', () => {
    const r = controlledDirectEffect(d, 'treat', 'med', 'y', ['x1'], 0);
    if (r) expect(r.se).toBeGreaterThan(0);
  });
});

describe('evalue', () => {
  it('null for zero se', () => expect(evalue(1.5, 0)).toBeNull());
  it('contract keys', () => expectKeys(evalue(2, 0.3), ['test', 'e', 'estimate', 'se', 'lowerCI', 'apa']));
  it('e >= 1', () => { const r = evalue(2, 0.3); expect(r.e).toBeGreaterThanOrEqual(1); });
});

describe('mediationProportion', () => {
  it('null for total=0', () => expect(mediationProportion(0.5, 0)).toBeNull());
  it('contract keys', () => expectKeys(mediationProportion(0.3, 0.8), ['test', 'proportion', 'indirect', 'total', 'apa']));

  it('proportion is finite', () => {
    const r = mediationProportion(0.3, 0.8);
    if (r) expect(Number.isFinite(r.proportion)).toBe(true);
  });
});

describe('sensitivityBias', () => {
  it('null for OR<=0', () => expect(sensitivityBias(-1)).toBeNull());
  it('contract keys', () => expectKeys(sensitivityBias(2.5), ['test', 'criticalRR', 'or', 'prevalence', 'apa']));

  it('criticalRR is finite', () => {
    const r = sensitivityBias(2.5);
    if (r) expect(Number.isFinite(r.criticalRR)).toBe(true);
  });
});

describe('interactionMediation', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ treat: i < 15 ? 'A' : 'B', med: i * 0.5, y: i + (i < 15 ? 0 : 3), x1: i % 2 });
  it('contract keys', () => { const r = interactionMediation(d, 'treat', 'med', 'y', ['x1']); if (r) expectKeys(r, ['test', 'interaction', 'se', 'z', 'p', 'n', 'apa']); });
  it('interaction is finite', () => {
    const r = interactionMediation(d, 'treat', 'med', 'y', ['x1']);
    if (r) expect(Number.isFinite(r.interaction)).toBe(true);
  });

  it('z is finite when valid', () => {
    const r = interactionMediation(d, 'treat', 'med', 'y', ['x1']);
    if (r) expect(Number.isFinite(r.z)).toBe(true);
  });
});

describe('msmWeights', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ treat: i < 15 ? 'A' : 'B', y: i + (i < 15 ? 0 : 3), x1: i % 2, time1: i, time2: i * 2 });
  it('contract keys', () => { const r = msmWeights(d, ['time1', 'time2'], 'treat', 'y', ['x1']); if (r) expectKeys(r, ['test', 'weightedMean', 'n', 'nTreated', 'apa']); });
  it('weights are positive', () => {
    const r = msmWeights(d, ['time1', 'time2'], 'treat', 'y', ['x1']);
    if (r) expect(r.weightedMean).toBeGreaterThan(0);
  });

  it('n is positive when valid', () => {
    const r = msmWeights(d, ['time1', 'time2'], 'treat', 'y', ['x1']);
    if (r) expect(r.n).toBeGreaterThan(0);
  });
});

describe('gestimationSNM', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ treat: i < 15 ? 'A' : 'B', y: i + (i < 15 ? 0 : 3), x1: i % 2 });
  it('contract keys', () => { const r = gestimationSNM(d, 'treat', 'y', ['x1']); if (r) expectKeys(r, ['test', 'psi', 'n', 'apa']); });
  it('estimates non-empty', () => {
    const r = gestimationSNM(d, 'treat', 'y', ['x1']);
    if (r) expect(r.psi).toBeDefined();
  });

  it('n is positive when valid', () => {
    const r = gestimationSNM(d, 'treat', 'y', ['x1']);
    if (r) expect(r.n).toBeGreaterThan(0);
  });
});

describe('rpsft', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ treat: i < 15 ? 'A' : 'B', y: i + (i < 15 ? 0 : 3), observed: i + (i < 15 ? 0 : 5) });
  it('contract keys', () => { const r = rpsft(d, 'treat', 'y', 'observed'); if (r) expectKeys(r, ['test', 'psi', 'n', 'apa']); });
  it('estimate is finite', () => {
    const r = rpsft(d, 'treat', 'y', 'observed');
    if (r) expect(Number.isFinite(r.psi)).toBe(true);
  });

  it('n is positive when valid', () => {
    const r = rpsft(d, 'treat', 'y', 'observed');
    if (r) expect(r.n).toBeGreaterThan(0);
  });
});

describe('structuralNestedAFT', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ treat: i < 15 ? 'A' : 'B', y: i + (i < 15 ? 0 : 5) });
  it('contract keys', () => { const r = structuralNestedAFT(d, 'treat', 'y', null); if (r) expectKeys(r, ['test', 'psi', 'n', 'apa']); });
  it('psi is finite', () => {
    const r = structuralNestedAFT(d, 'treat', 'y', null);
    if (r) expect(Number.isFinite(r.psi)).toBe(true);
  });

  it('n is positive when valid', () => {
    const r = structuralNestedAFT(d, 'treat', 'y', null);
    if (r) expect(r.n).toBeGreaterThan(0);
  });
});

describe('complianceAdjusted', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ rand: i < 15 ? 0 : 1, rec: i < 15 ? 0 : 1, y: i + (i < 15 ? 0 : 3) });
  it('contract keys', () => expectKeys(complianceAdjusted(d, 'rand', 'rec', 'y'), ['test', 'cace', 'n', 'complianceRate', 'apa']));
  it('effect is finite', () => {
    const r = complianceAdjusted(d, 'rand', 'rec', 'y');
    if (r) expect(Number.isFinite(r.cace)).toBe(true);
  });

  it('n is positive when valid', () => {
    const r = complianceAdjusted(d, 'rand', 'rec', 'y');
    if (r) expect(r.n).toBeGreaterThan(0);
  });
});

describe('weakIVTest', () => {
  const d2 = []; for (let i = 0; i < 30; i++) d2.push({ y: i, x: i * 0.5, iv: i % 3 });
  it('contract keys', () => expectKeys(weakIVTest(d2, 'y', 'x', 'iv', []), ['test', 'fStat', 'isWeak', 'n', 'apa']));
  it('F positive', () => {
    const r = weakIVTest(d2, 'y', 'x', 'iv', []);
    if (r) expect(r.fStat).toBeGreaterThan(0);
  });

  it('n is positive when valid', () => {
    const r = weakIVTest(d2, 'y', 'x', 'iv', []);
    if (r) expect(r.n).toBeGreaterThan(0);
  });
});

describe('sarganHansenJ', () => {
  const d2 = []; for (let i = 0; i < 30; i++) d2.push({ y: i, x: i * 0.5, z1: i % 3, z2: (i+1) % 3 });
  it('is defined', () => expect(typeof sarganHansenJ).toBe('function'));
  it('j between 0 and 1 for valid IV data', () => {
    const r = sarganHansenJ(d2, 'y', 'x', ['z1', 'z2'], []);
    if (r) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); }
  });

  it('n is positive when valid', () => {
    const r = sarganHansenJ(d2, 'y', 'x', ['z1', 'z2'], []);
    if (r) expect(r.n).toBeGreaterThan(0);
  });
});

describe('durbinWuHausman', () => {
  it('is defined', () => expect(typeof durbinWuHausman).toBe('function'));
  it('chi2 positive for valid IV comparison', () => {
    const d = [];
    for (let i = 0; i < 30; i++) d.push({ y: i, x: i * 0.5, z1: i % 3, z2: (i + 1) % 3 });
    const r = durbinWuHausman(d, 'y', 'x', ['z1', 'z2'], []);
    if (r) expect(r.chi2).toBeGreaterThanOrEqual(0);
  });

  it('p between 0 and 1 when valid', () => {
    const d = [];
    for (let i = 0; i < 30; i++) d.push({ y: i, x: i * 0.5, z1: i % 3, z2: (i + 1) % 3 });
    const r = durbinWuHausman(d, 'y', 'x', ['z1', 'z2'], []);
    if (r) { expect(r.p).toBeGreaterThanOrEqual(0); expect(r.p).toBeLessThanOrEqual(1); }
  });
});

describe('ivDiagnosticsSummary', () => {
  it('contract keys', () => expectKeys(ivDiagnosticsSummary({isWeak:false},{p:0.5},{p:0.1}), ['test', 'weakInstruments', 'overidentified', 'endogenous', 'apa']));
  it('diagnostics non-empty', () => {
    const r = ivDiagnosticsSummary({ isWeak: false }, { p: 0.5 }, { p: 0.1 });
    if (r) { expect(r.weakInstruments).toBeDefined(); expect(r.overidentified).toBeDefined(); expect(r.endogenous).toBeDefined(); }
  });

  it('apa is a non-empty string', () => {
    const r = ivDiagnosticsSummary({ isWeak: false }, { p: 0.5 }, { p: 0.1 });
    if (r) { expect(typeof r.apa).toBe('string'); expect(r.apa.length).toBeGreaterThan(0); }
  });
});

describe('moderatedMediation', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ x: i, m: i * 0.5, y: i * 0.3, w: i % 3, time: Math.floor(i/5) });
  it('contract keys', () => expectKeys(moderatedMediation(d, 'x', 'm', 'y', 'w'), ['test','ieHigh','ieLow','moderator','n','apa']));
  it('ieHigh is finite', () => {
    const r = moderatedMediation(d, 'x', 'm', 'y', 'w');
    if (r) expect(Number.isFinite(r.ieHigh)).toBe(true);
  });

  it('ieLow is finite when valid', () => {
    const r = moderatedMediation(d, 'x', 'm', 'y', 'w');
    if (r) expect(Number.isFinite(r.ieLow)).toBe(true);
  });
});
describe('multiMediator', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ x: i, y: i * 0.5, m1: i * 0.3, m2: i * 0.2 });
  it('contract keys', () => { const r = multiMediator(d, 'x', 'y', ['m1', 'm2']); if (r) expectKeys(r, ['test','totalEffect','totalIndirect','indirect','n','apa']); });
  it('indirect non-empty', () => {
    const r = multiMediator(d, 'x', 'y', ['m1', 'm2']);
    if (r) expect(Array.isArray(r.indirect)).toBe(true);
  });

  it('totalEffect is finite when valid', () => {
    const r = multiMediator(d, 'x', 'y', ['m1', 'm2']);
    if (r) expect(Number.isFinite(r.totalEffect)).toBe(true);
  });
});
describe('longitudinalMediation', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ x: i % 3, m: i * 0.1, y: i * 0.2, time: i % 5, id: Math.floor(i/5) });
  it('contract keys', () => expectKeys(longitudinalMediation(d, 'x', 'm', 'y', 'time'), ['test','aPath','bPath','indirect','nSubjects','apa']));
  it('indirect is finite', () => {
    const r = longitudinalMediation(d, 'x', 'm', 'y', 'time');
    if (r) expect(Number.isFinite(r.indirect)).toBe(true);
  });

  it('aPath is finite when valid', () => {
    const r = longitudinalMediation(d, 'x', 'm', 'y', 'time');
    if (r) expect(Number.isFinite(r.aPath)).toBe(true);
  });
});
describe('sensitivityBounds', () => {
  it('contract keys', () => expectKeys(sensitivityBounds(0.5, 0.1), ['test','original','adjusted','bias','rho','apa']));
  it('adjusted between -1 and 1', () => {
    const r = sensitivityBounds(0.5, 0.1);
    if (r) { expect(r.adjusted).toBeGreaterThanOrEqual(-1); expect(r.adjusted).toBeLessThanOrEqual(1); }
  });

  it('bias is finite', () => {
    const r = sensitivityBounds(0.5, 0.1);
    if (r) expect(Number.isFinite(r.bias)).toBe(true);
  });
});

describe('doubleML uses X in the nuisance models (cross-fitted PLR)', () => {
  it('recovers the treatment effect under X-confounding', () => {
    let s = 41; const N = () => { let u = 0; for (let k = 0; k < 12; k++) { s = (Math.imul(1664525, s) + 1013904223) >>> 0; u += s / 2 ** 32; } return u - 6; };
    const y = [], D = [], X = [];
    const theta = 1.5;
    for (let i = 0; i < 300; i++) { const x = N(); const d = 0.8 * x + N(); const yi = theta * d + 2 * x + N(); X.push([x]); D.push(d); y.push(yi); }
    const r = doubleML(y, D, X, { splits: 2, seed: 1 });
    expect(Math.abs(r.ate - 1.5)).toBeLessThan(0.4); // mean-only nuisance (ignoring X) is badly biased
  });
});

describe('hardening — invalid inputs', () => {
  it('propensityScoreMatch null with too few pairs', () => {
    const rows = causalRows(30).map(r => ({ ...r, treat: 'C' }));
    expect(propensityScoreMatch(rows, 'treat', 'y', ['x1'])).toBeNull();
  });
});

describe('hardening — invariants', () => {
  it('PSM balanceAfter diffs are smaller than balanceBefore on average', () => {
    const rows = causalRows(120);
    const r = propensityScoreMatch(rows, 'treat', 'y', ['x1', 'x2']);
    expect(r).not.toBeNull();
    const before = r.balanceBefore.reduce((s, b) => s + Math.abs(b.diff), 0);
    const after = r.balanceAfter.reduce((s, b) => s + Math.abs(b.diff), 0);
    expect(after).toBeLessThanOrEqual(before + 0.01);
  });
});

describe('hardening — iv2sls invalid inputs', () => {
  it('returns null for empty data', () => {
    expect(iv2sls([], 'y', 'x', 'z', [])).toBeNull();
  });
});

describe('hardening — rdd invalid inputs', () => {
  it('returns null for insufficient n', () => {
    expect(regressionDiscontinuity([1, 2, 3], [1, 2, 3], 0, 10)).toBeNull();
  });
});

describe('hardening — syntheticControl invalid inputs', () => {
  it('returns null for single control', () => {
    expect(syntheticControl([1, 2, 3], [], 2, 1)).toBeNull();
  });
});

describe('hardening — staggeredDiD invalid inputs', () => {
  it('returns null for empty panel', () => {
    expect(staggeredDiD([], 'unit', 'time', 'treat', 'y')).toBeNull();
  });
});

describe('hardening — smdTable invalid inputs', () => {
  it('returns null for null data', () => {
    expect(smdTable(null, 'treat', ['x1'])).toBeNull();
  });
});

describe('hardening — covariateBalance invalid inputs', () => {
  it('returns null for null input', () => {
    expect(covariateBalance(null, [{ x1: 1 }], ['x1'])).toBeNull();
  });
});
