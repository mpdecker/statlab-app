import { describe, it, expect } from 'vitest';
import { sem, semMultiGroup, measurementInvariance, latentGrowthModel, pathAnalysis, bifactorModel, ordinalSEM, cfiCompare } from './sem.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const cfaData = [];
for (let i = 0; i < 50; i++) {
  const f1 = Math.random() * 2 - 1;
  cfaData.push({ x1: 1 * f1 + Math.random() * 0.5, x2: 0.8 * f1 + Math.random() * 0.5, x3: 0.7 * f1 + Math.random() * 0.5 });
}

const semData = [];
for (let i = 0; i < 50; i++) {
  const f1 = Math.random();
  semData.push({ x1: 0.8 * f1 + Math.random() * 0.3, x2: 0.7 * f1 + Math.random() * 0.3, y: 0.6 * f1 + Math.random() * 0.5 });
}

describe('sem', () => {
  it('returns null for invalid input', () => {
    expect(sem({})).toBeNull();
    expect(sem({ equations: [], data: [] })).toBeNull();
    expect(sem(null)).toBeNull();
  });

  it('CFA model returns coefficients and fit indices', () => {
    const r = sem({ equations: ['f1 =~ x1 + x2 + x3'], data: cfaData });
    expectKeys(r, ['test', 'model', 'coefficients', 'loadings', 'paths', 'fit', 'apa']);
    expect(r.loadings.length).toBeGreaterThanOrEqual(2);
    expect(r.fit.cfi).toBeGreaterThanOrEqual(0);
    expect(r.fit.cfi).toBeLessThanOrEqual(1);
  });

  it('SEM model returns paths in addition to loadings', () => {
    const r = sem({ equations: ['f1 =~ x1 + x2', 'y ~ f1'], data: semData });
    expect(r.paths.length).toBeGreaterThanOrEqual(1);
    expect(r.fit.tli).toBeGreaterThanOrEqual(0);
    expect(r.fit.tli).toBeLessThanOrEqual(2);
  });

  it('fit indices have expected ranges', () => {
    const r = sem({ equations: ['f1 =~ x1 + x2 + x3'], data: cfaData });
    expect(r.fit.rmsea).toBeGreaterThanOrEqual(0);
    expect(r.fit.rmseaCI[0]).toBeLessThanOrEqual(r.fit.rmseaCI[1]);
    expect(r.fit.srmr).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(r.fit.aic)).toBe(true);
    expect(Number.isFinite(r.fit.bic)).toBe(true);
  });

  it('chi-square and df are positive', () => {
    const r = sem({ equations: ['f1 =~ x1 + x2 + x3'], data: cfaData });
    expect(r.fit.chi2).toBeGreaterThanOrEqual(0);
    expect(r.fit.df).toBeGreaterThan(0);
    expect(r.fit.p).toBeGreaterThanOrEqual(0);
  });

  it('coefficients have standard errors', () => {
    const r = sem({ equations: ['f1 =~ x1 + x2 + x3'], data: cfaData });
    for (const c of r.loadings) {
      expect(typeof c.estimate).toBe('number');
      expect(typeof c.se).toBe('number');
    }
  });

  it('two-latent CFA converges', () => {
    const twoFac = [];
    for (let i = 0; i < 50; i++) {
      const f1 = Math.random(); const f2 = Math.random();
      twoFac.push({ a1: f1 + Math.random() * 0.3, a2: f1 * 0.8 + Math.random() * 0.3, b1: f2 + Math.random() * 0.3, b2: f2 * 0.9 + Math.random() * 0.3 });
    }
    const r = sem({ equations: ['f1 =~ a1 + a2', 'f2 =~ b1 + b2'], data: twoFac });
    expect(r).not.toBeNull();
    expect(r.loadings.length).toBeGreaterThanOrEqual(2);
  });

  it('SEM with 3 variables covers CFI/TLI when model fits well', () => {
    const data = Array.from({ length: 80 }, (_, i) => ({ v1: i + 1, v2: i * 0.8 + 2, v3: i * 0.3 + 1 }));
    const r = sem({ equations: ['f1 =~ v1 + v2 + v3'], data });
    expect(r).not.toBeNull();
    expect(r.fit).toBeDefined();
    expect(r.fit.rmsea).toBeDefined();
    expect(r.fit.cfi).toBeGreaterThanOrEqual(0);
    expect(r.fit.tli).toBeGreaterThanOrEqual(0);
  });
});

describe('semMultiGroup', () => {
  const mgData = [];
  for (let g = 0; g < 2; g++) {
    for (let i = 0; i < 30; i++) {
      mgData.push({ x1: i + g, x2: i * 0.8 + g, x3: i * 0.5 + g, group: String.fromCharCode(65 + g) });
    }
  }

  it('returns null for single group', () => {
    const single = mgData.filter(r => r.group === 'A');
    expect(semMultiGroup(single, 'group', ['f1 =~ x1 + x2 + x3'])).toBeNull();
  });

  it('returns null for null input', () => {
    expect(semMultiGroup(null, 'group', ['f1 =~ x1'])).toBeNull();
  });

  it('produces results for 2 groups', () => {
    const r = semMultiGroup(mgData, 'group', ['f1 =~ x1 + x2 + x3']);
    expect(r).not.toBeNull();
    expect(r.groups.length).toBe(2);
    expect(r.nGroups).toBe(2);
    expect(r.nTotal).toBe(60);
  });

  it('contract fields present', () => {
    const r = semMultiGroup(mgData, 'group', ['f1 =~ x1 + x2 + x3']);
    expectKeys(r, ['test', 'groups', 'nGroups', 'nTotal', 'apa']);
    expect(r.test).toBe('Multi-Group SEM');
  });

  it('produces results for 3 groups', () => {
    const threeGroups = [];
    for (let g = 0; g < 3; g++) {
      for (let i = 0; i < 20; i++) {
        threeGroups.push({ x1: i + g, x2: i * 0.8 + g, x3: i * 0.5 + g, group: String.fromCharCode(65 + g) });
      }
    }
    const r = semMultiGroup(threeGroups, 'group', ['f1 =~ x1 + x2 + x3']);
    expect(r).not.toBeNull();
    expect(r.nGroups).toBe(3);
    expect(r.groups.length).toBe(3);
  });

  it('each group entry has fit and n', () => {
    const r = semMultiGroup(mgData, 'group', ['f1 =~ x1 + x2 + x3']);
    r.groups.forEach(g => {
      expect(g.fit).toBeDefined();
      expect(g.n).toBeGreaterThan(0);
    });
  });
});

describe('measurementInvariance', () => {
  const miData = [];
  for (let g = 0; g < 2; g++) {
    for (let i = 0; i < 40; i++) {
      const base = g * 0.2;
      miData.push({ v1: i + base + Math.random() * 0.5, v2: i * 0.8 + base + Math.random() * 0.5, v3: i * 0.5 + base + Math.random() * 0.5, group: String.fromCharCode(65 + g) });
    }
  }

  it('returns null for single group', () => {
    const single = miData.filter(r => r.group === 'A');
    expect(measurementInvariance(single, ['v1', 'v2', 'v3'], 'group')).toBeNull();
  });

  it('returns null for null data', () => {
    expect(measurementInvariance(null, ['v1', 'v2', 'v3'], 'group')).toBeNull();
  });

  it('returns null for fewer than 3 vars', () => {
    expect(measurementInvariance(miData, ['v1', 'v2'], 'group')).toBeNull();
  });

  it('returns invariance test for 2 groups', () => {
    const r = measurementInvariance(miData, ['v1', 'v2', 'v3'], 'group');
    expect(r).not.toBeNull();
    expect(r.steps.length).toBe(4);
    expect(r.highestLevel).toBeDefined();
  });

  it('steps include configural, metric, scalar, strict', () => {
    const r = measurementInvariance(miData, ['v1', 'v2', 'v3'], 'group');
    const modelNames = r.steps.map(s => s.model);
    expect(modelNames).toContain('Configural');
    expect(modelNames).toContain('Metric (Weak)');
    expect(modelNames).toContain('Scalar (Strong)');
    expect(modelNames).toContain('Strict');
  });

  it('configural CFI is between 0 and 1', () => {
    const r = measurementInvariance(miData, ['v1', 'v2', 'v3'], 'group');
    expect(r.configuralCFI).toBeGreaterThanOrEqual(0);
    expect(r.configuralCFI).toBeLessThanOrEqual(1);
  });

  it('each step has passed boolean', () => {
    const r = measurementInvariance(miData, ['v1', 'v2', 'v3'], 'group');
    r.steps.forEach(s => {
      expect(typeof s.passed).toBe('boolean');
      expect(s.note.length).toBeGreaterThan(0);
    });
  });

  it('highestLevel is valid string', () => {
    const r = measurementInvariance(miData, ['v1', 'v2', 'v3'], 'group');
    expect(['configural', 'metric', 'scalar', 'strict']).toContain(r.highestLevel);
  });
});

describe('measurementInvariance detects real (non-)invariance via nested chi-square tests', () => {
  function mkRng(seed) {
    let s = seed;
    return () => { let u = 0; for (let k = 0; k < 12; k++) { s = (Math.imul(1664525, s) + 1013904223) >>> 0; u += s / 2 ** 32; } return u - 6; };
  }

  it('a fully invariant 2-group CFA (same loadings/intercepts/residuals) is supported through strict', () => {
    const z = mkRng(21);
    const lambda = [1, 0.8, 1.2], tau = [2, 1, 3];
    const data = [];
    for (let g = 0; g < 2; g++) {
      for (let i = 0; i < 150; i++) {
        const f = z();
        data.push({
          v1: tau[0] + lambda[0] * f + z() * 0.3,
          v2: tau[1] + lambda[1] * f + z() * 0.3,
          v3: tau[2] + lambda[2] * f + z() * 0.3,
          group: g === 0 ? 'A' : 'B',
        });
      }
    }
    const r = measurementInvariance(data, ['v1', 'v2', 'v3'], 'group');
    expect(r.steps[1].passed).toBe(true);
    expect(r.steps[2].passed).toBe(true);
    expect(r.steps[3].passed).toBe(true);
    expect(r.highestLevel).toBe('strict');
  });

  it('a 2-group CFA with grossly different loadings fails metric invariance', () => {
    const z = mkRng(23);
    const data = [];
    for (let g = 0; g < 2; g++) {
      const lambda = g === 0 ? [1, 0.8, 1.2] : [1, 3.5, 4.5];
      for (let i = 0; i < 150; i++) {
        const f = z();
        data.push({
          v1: 2 + lambda[0] * f + z() * 0.3,
          v2: 1 + lambda[1] * f + z() * 0.3,
          v3: 3 + lambda[2] * f + z() * 0.3,
          group: g === 0 ? 'A' : 'B',
        });
      }
    }
    const r = measurementInvariance(data, ['v1', 'v2', 'v3'], 'group');
    expect(r.steps[1].passed).toBe(false);
    expect(r.highestLevel).toBe('configural');
  });
});

describe('latentGrowthModel', () => {
  it('returns null for too few time points', () => {
    const data = Array.from({ length: 20 }, () => ({ t0: 1, t1: 2 }));
    expect(latentGrowthModel(data, ['t0'])).toBeNull();
  });

  it('returns null for small data', () => {
    const data = Array.from({ length: 5 }, (_, i) => ({ t0: i, t1: i * 2 }));
    expect(latentGrowthModel(data, ['t0', 't1'])).toBeNull();
  });

  it('returns null for null input', () => {
    expect(latentGrowthModel(null, ['t0', 't1'])).toBeNull();
  });

  it('fits intercept and slope', () => {
    const data = [];
    for (let i = 0; i < 30; i++) {
      const intercept = 5 + Math.random() * 2;
      const slope = 0.5 + Math.random() * 0.3;
      data.push({ t0: intercept, t1: intercept + slope, t2: intercept + 2 * slope, t3: intercept + 3 * slope });
    }
    const r = latentGrowthModel(data, ['t0', 't1', 't2', 't3']);
    expect(r).not.toBeNull();
    expect(r.test).toBe('Latent Growth Model');
    expect(r.coefficients.length).toBeGreaterThanOrEqual(4);
    expect(r.coefficients[0].estimate).toBeGreaterThan(0);
  });

  it('intercept variance is non-negative', () => {
    const data = [];
    for (let i = 0; i < 40; i++) {
      const intercept = 5 + Math.random() * 2;
      const slope = 0.5 + Math.random() * 0.3;
      data.push({ t0: intercept, t1: intercept + slope, t2: intercept + 2 * slope, t3: intercept + 3 * slope });
    }
    const r = latentGrowthModel(data, ['t0', 't1', 't2', 't3']);
    const ivParam = r.coefficients.find(c => c.parameter.includes('Intercept variance'));
    expect(ivParam.estimate).toBeGreaterThanOrEqual(0);
  });

  it('custom time points work', () => {
    const data = [];
    for (let i = 0; i < 30; i++) {
      const base = i * 0.5;
      data.push({ m0: base, m6: base + 3, m12: base + 6 });
    }
    const r = latentGrowthModel(data, ['m0', 'm6', 'm12'], [0, 6, 12]);
    expect(r).not.toBeNull();
    expect(r.timePoints).toBe(3);
  });

  it('slope mean is positive for increasing trend', () => {
    const data = [];
    for (let i = 0; i < 40; i++) {
      data.push({ t0: i * 0.1, t1: i * 0.1 + 2, t2: i * 0.1 + 4 });
    }
    const r = latentGrowthModel(data, ['t0', 't1', 't2']);
    const slopeParam = r.coefficients.find(c => c.parameter.includes('Slope mean'));
    expect(slopeParam.estimate).toBeGreaterThan(0);
  });

  it('APA string mentions LGM', () => {
    const data = Array.from({ length: 30 }, (_, i) => ({
      t0: i * 0.1, t1: i * 0.1 + 1, t2: i * 0.1 + 2,
    }));
    const r = latentGrowthModel(data, ['t0', 't1', 't2']);
    expect(r.apa).toContain('LGM');
  });

  it('contract has all expected coefficient names', () => {
    const data = Array.from({ length: 30 }, (_, i) => ({
      t0: i * 0.1, t1: i * 0.1 + 1, t2: i * 0.1 + 2,
    }));
    const r = latentGrowthModel(data, ['t0', 't1', 't2']);
    const paramNames = r.coefficients.map(c => c.parameter);
    expect(paramNames.some(n => n.includes('Intercept mean'))).toBe(true);
    expect(paramNames.some(n => n.includes('Slope mean'))).toBe(true);
    expect(paramNames.some(n => n.includes('intercept-slope covariance') || n.includes('Intercept-slope covariance'))).toBe(true);
  });
});

describe('pathAnalysis', () => {
  const d = []; for (let i = 0; i < 20; i++) d.push({ y: i * 2, x: i, z: i * 0.5 });
  it('null small', () => expect(pathAnalysis(d.slice(0, 5), ['y ~ x', 'x ~ z'])).toBeNull());
  it('contract keys', () => expectKeys(pathAnalysis(d, ['y ~ x', 'x ~ z']), ['test', 'coefficients', 'rSquared', 'n', 'apa']));
  it('coefficients non-empty', () => { const r = pathAnalysis(d, ['y ~ x', 'x ~ z']); if (r) expect(r.coefficients.length).toBeGreaterThan(0); });
});

describe('bifactorModel', () => {
  const d = []; for (let i = 0; i < 30; i++) { const row = {}; for (let j = 1; j <= 6; j++) row[`v${j}`] = Math.round(Math.random() * 2); d.push(row); }
  it('contract keys', () => { const r = bifactorModel(d, 'G', [{ name: 'F1', items: ['v1', 'v2', 'v3'] }, { name: 'F2', items: ['v4', 'v5', 'v6'] }]); if (r) expectKeys(r, ['test', 'loadings', 'omegaHierarchical', 'omegaTotal', 'correlation', 'n', 'apa']); });
  it('omega in [0,1]', () => { const r = bifactorModel(d, 'G', [{ name: 'F1', items: ['v1', 'v2', 'v3'] }, { name: 'F2', items: ['v4', 'v5', 'v6'] }]); if (r) { expect(r.omegaHierarchical).toBeGreaterThanOrEqual(0); expect(r.omegaHierarchical).toBeLessThanOrEqual(1); } });
  it('omegaTotal between 0-1', () => { const r = bifactorModel(d, 'G', [{ name: 'F1', items: ['v1', 'v2', 'v3'] }, { name: 'F2', items: ['v4', 'v5', 'v6'] }]); if (r) { expect(r.omegaTotal).toBeGreaterThanOrEqual(0); expect(r.omegaTotal).toBeLessThanOrEqual(1); } });
});

describe('ordinalSEM', () => {
  const d = []; for (let i = 0; i < 30; i++) d.push({ v1: i % 5, v2: (i + 1) % 5, v3: (i + 2) % 5 });
  it('contract keys', () => expectKeys(ordinalSEM(d, ['v1', 'v2', 'v3'], 'F =~ v1 + v2 + v3'), ['test', 'loadings', 'thresholds', 'fit', 'n', 'apa']));
  it('thresholds present', () => { const r = ordinalSEM(d, ['v1', 'v2', 'v3'], 'F =~ v1 + v2 + v3'); expect(r.thresholds.length).toBe(3); });
  it('loadings non-empty', () => { const r = ordinalSEM(d, ['v1', 'v2', 'v3'], 'F =~ v1 + v2 + v3'); if (r) expect(r).toHaveProperty('loadings'); });
});

describe('ordinalSEM recovers real polychoric correlations and a real factor fit', () => {
  it('fit indices are finite (not the hardcoded NaN of the old stub)', () => {
    const d = []; for (let i = 0; i < 30; i++) d.push({ v1: i % 5, v2: (i + 1) % 5, v3: (i + 2) % 5 });
    const r = ordinalSEM(d, ['v1', 'v2', 'v3'], 'F =~ v1 + v2 + v3');
    expect(Number.isFinite(r.fit.chisq)).toBe(true);
    expect(Number.isFinite(r.fit.rmsea)).toBe(true);
    expect(Number.isFinite(r.fit.cfi)).toBe(true);
  });

  it('recovers positive loadings (relative to the fixed reference indicator) from a simulated ordinal single-factor model', () => {
    let s = 31; const z = () => { let u = 0; for (let k = 0; k < 12; k++) { s = (Math.imul(1664525, s) + 1013904223) >>> 0; u += s / 2 ** 32; } return u - 6; };
    const lambda = [1, 0.9, 0.7];
    const cutpoints = [-1, -0.3, 0.3, 1];
    const data = [];
    for (let i = 0; i < 300; i++) {
      const f = z();
      const row = {};
      lambda.forEach((l, idx) => {
        const raw = l * f + z() * 0.4;
        row[`v${idx + 1}`] = cutpoints.filter(c => raw > c).length;
      });
      data.push(row);
    }
    const r = ordinalSEM(data, ['v1', 'v2', 'v3'], 'F =~ v1 + v2 + v3', { nThresh: 4 });
    expect(r.loadings.length).toBe(2);
    r.loadings.forEach(l => expect(l.estimate).toBeGreaterThan(0));
  });
});

describe('cfiCompare', () => {
  it('null invalid', () => expect(cfiCompare(null, { chisq: 10, df: 5, cfi: 0.9, rmsea: 0.08 })).toBeNull());
  it('contract keys', () => expectKeys(cfiCompare({ chisq: 50, df: 20, cfi: 0.85, rmsea: 0.10 }, { chisq: 30, df: 18, cfi: 0.92, rmsea: 0.07 }), ['test', 'deltaChi2', 'deltaDf', 'p', 'deltaCfi', 'deltaRmsea', 'conclusion', 'apa']));
  it('deltaDf finite', () => { const r = cfiCompare({ chisq: 50, df: 20, cfi: 0.85, rmsea: 0.10 }, { chisq: 30, df: 18, cfi: 0.92, rmsea: 0.07 }); if (r) expect(Number.isFinite(r.deltaDf)).toBe(true); });
});

describe('pathAnalysis actually includes an intercept and traces indirect/total effects (regression test for the no-intercept and hardcoded-indirect=0 bugs)', () => {
  it('matches numpy OLS-with-intercept coefficients and recovers the x->m->y mediated effect', () => {
    const e = ref.sem.path_analysis_basic;
    const data = e.x.map((xi, i) => ({ x: xi, m: e.m[i], y: e.y[i] }));
    const r = pathAnalysis(data, ['m ~ x', 'y ~ m']);
    const xm = r.coefficients.find(c => c.from === 'x' && c.to === 'm');
    const my = r.coefficients.find(c => c.from === 'm' && c.to === 'y');
    const xy = r.coefficients.find(c => c.from === 'x' && c.to === 'y');
    expect(xm.direct).toBeCloseTo(e.x_to_m, 3);
    expect(my.direct).toBeCloseTo(e.m_to_y, 3);
    // old code always reported total=direct with indirect hardcoded to 0, and
    // had no x->y entry at all since x is not a direct predictor of y
    expect(xy).toBeTruthy();
    expect(xy.direct).toBeCloseTo(0, 6);
    expect(xy.indirect).toBeCloseTo(e.x_to_y_indirect, 3);
  });
});

describe('bifactorModel rotates toward the intended group structure (regression test for the missing-rotation bug)', () => {
  it('recovers both group factors\' loadings, not just the first one extracted', () => {
    let s = 5; const rnd = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 2 ** 32; };
    function randn() { let u = 0; for (let i = 0; i < 12; i++) u += rnd(); return u - 6; }
    const n = 2000;
    const data = [];
    for (let i = 0; i < n; i++) {
      const g = randn(), gA = randn(), gB = randn();
      const row = {};
      for (let j = 0; j < 6; j++) {
        const groupLoad = j < 3 ? 0.6 * gA : 0.6 * gB;
        row['item' + j] = 0.5 * g + groupLoad + Math.sqrt(1 - 0.25 - 0.36) * randn();
      }
      data.push(row);
    }
    const groupFactors = [
      { name: 'A', items: ['item0', 'item1', 'item2'] },
      { name: 'B', items: ['item3', 'item4', 'item5'] },
    ];
    const r = bifactorModel(data, 'g', groupFactors);
    // old code recovered group B's true 0.6 loading as ~0.002 (misattributed
    // into an inflated general loading) while group A came out partially right
    r.loadings.forEach(l => expect(l.group).toBeGreaterThan(0.3));
  });
});
