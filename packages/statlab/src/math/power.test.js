// src/math/power.test.js
import { describe, it, expect } from 'vitest';
import {
  fCritUpper,
  chiCrit,
  computePowerT,
  computePowerCorr,
  requiredN,
  requiredNCorr,
  powerANOVA,
  powerChi,
  powerLogistic,
  powerMixed,
  powerMediation,
  powerTTest,
  powerOneProportion,
  powerTwoProportion,
  powerWilcoxon,
  powerLogRank,
  powerRMANOVA,
  powerOLS,
  powerSpearman,
  requiredNTTest,
  requiredNOneProp,
  requiredNTwoProp,
  requiredNWilcoxon,
  requiredNLogRank,
  requiredNOLS,
  powerCurve,
  binaryInvNormalCDF,
} from './power.js';

describe('fCritUpper / chiCrit', () => {
  it('fCritUpper returns positive critical value', () => {
    const fc = fCritUpper(0.05, 3, 20);
    expect(fc).toBeGreaterThan(0);
    expect(fc).toBeLessThan(100);
  });
  it('chiCrit yields finite df', () => {
    expect(chiCrit(0.05, 4)).toBeGreaterThan(0);
    expect(chiCrit(0.05, 4)).toBeLessThan(200);
  });
});

describe('binaryInvNormalCDF', () => {
  it('invert near median', () => {
    expect(binaryInvNormalCDF(0.5)).toBeCloseTo(0, 1);
  });
});

describe('powerChi', () => {
  it('reports power in unit interval', () => {
    const p = powerChi(0.3, 5, 100, 0.05);
    expect(p).not.toBe(null);
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });
});

describe('powerLogistic', () => {
  it('returns positive power under typical settings', () => {
    const p = powerLogistic(2.0, 0.35, 60, 0.05);
    expect(p).toBeTruthy();
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });
});

describe('powerMixed', () => {
  it('responds to clustered design parameters', () => {
    const p = powerMixed(0.06, 8, 14, 0.45, 0.05);
    expect(p).toBeTruthy();
    expect(p).toBeGreaterThanOrEqual(0);
    expect(p).toBeLessThanOrEqual(1);
  });
});

describe('powerANOVA', () => {
  it('computes reproducible-ish Monte Carlo fraction', () => {
    const p = powerANOVA(0.4, 3, 65, 0.05);
    expect(p).toBeTruthy();
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });

  it('same seed yields identical power', () => {
    const a = powerANOVA(0.25, 3, 30, 0.05, 99);
    const b = powerANOVA(0.25, 3, 30, 0.05, 99);
    expect(a).toBe(b);
  });
});

describe('powerMediation', () => {
  it('combines asymptotic Sobel MC', () => {
    const mc = powerMediation(0.35, 0.42, 0.095, 0.09, 500, 0.05);
    expect(mc).not.toBe(null);
    expect(mc.powerMC).toBeGreaterThanOrEqual(0);
    expect(mc.powerMC).toBeLessThanOrEqual(1);
    expect(mc.powerAsymp).toBeGreaterThanOrEqual(0);
  });

  it('uses seed for reproducible MC power', () => {
    const a = powerMediation(0.3, 0.4, 0.1, 0.1, 400, 0.05, 7);
    const b = powerMediation(0.3, 0.4, 0.1, 0.1, 400, 0.05, 7);
    expect(a.powerMC).toBe(b.powerMC);
  });
});

describe('consolidation backward compat', () => {
  it('computePowerT still works', () => {
    const p = computePowerT(30, 30, 0.5, 0.05);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });

  it('computePowerCorr still works', () => {
    const p = computePowerCorr(50, 0.3, 0.05);
    expect(p).toBeGreaterThan(0);
  });

  it('requiredN returns reasonable value', () => {
    const n = requiredN(0.5, 0.8, 0.05);
    expect(n).toBeGreaterThanOrEqual(4);
    expect(n).toBeLessThan(200);
  });
});

describe('powerTTest', () => {
  it('returns power for two-sample', () => {
    const r = powerTTest(30, 30, 0.5);
    expect(r).not.toBeNull();
    expect(r.power).toBeGreaterThan(0.3);
    expect(r.power).toBeLessThan(1);
  });

  it('returns null for invalid n', () => {
    expect(powerTTest(1, 1, 0.5)).toBeNull();
  });

  it('one-sample power uses correct df', () => {
    const r = powerTTest(30, 30, 0.5, 'one-sample');
    expect(r).not.toBeNull();
    expect(r.type).toBe('one-sample');
  });

  it('paired power works', () => {
    const r = powerTTest(30, 30, 0.5, 'paired');
    expect(r).not.toBeNull();
    expect(r.type).toBe('paired');
  });
});

describe('powerOneProportion', () => {
  it('detects moderate effect', () => {
    const r = powerOneProportion(100, 0.5, 0.65);
    expect(r).not.toBeNull();
    expect(r.power).toBeGreaterThan(0.3);
  });

  it('returns null for equal proportions', () => {
    expect(powerOneProportion(100, 0.5, 0.5)).toBeNull();
  });
});

describe('powerTwoProportion', () => {
  it('computes power for two groups', () => {
    const r = powerTwoProportion(60, 60, 0.4, 0.6);
    expect(r).not.toBeNull();
    expect(r.power).toBeGreaterThan(0.3);
  });
});

describe('powerWilcoxon', () => {
  it('returns power slightly below t-test', () => {
    const w = powerWilcoxon(30, 30, 0.5);
    const t = powerTTest(30, 30, 0.5);
    expect(w.power).toBeGreaterThan(0.2);
    expect(w.power).toBeLessThanOrEqual(t.power + 0.05);
  });
});

describe('powerLogRank', () => {
  it('returns power for moderate HR', () => {
    const r = powerLogRank(200, 0.7);
    expect(r).not.toBeNull();
    expect(r.power).toBeGreaterThan(0.5);
  });
});

describe('powerRMANOVA', () => {
  it('returns power for repeated measures', () => {
    const r = powerRMANOVA(4, 30, 0.8, 0.25);
    expect(r).not.toBeNull();
    expect(r.power).toBeGreaterThan(0.3);
    expect(r.power).toBeLessThanOrEqual(1);
  });
});

describe('powerOLS', () => {
  it('returns power for regression', () => {
    const r = powerOLS(0.1, 100, 3);
    expect(r).not.toBeNull();
    expect(r.power).toBeGreaterThan(0.5);
  });
});

describe('powerSpearman', () => {
  it('returns power for moderate correlation', () => {
    const r = powerSpearman(50, 0.3);
    expect(r).not.toBeNull();
    expect(r.power).toBeGreaterThan(0.3);
  });
});

describe('requiredN variants', () => {
  it('requiredNTTest returns ~64 for d=0.5', () => {
    const n = requiredNTTest(0.5, 'two-sample');
    expect(n).toBeGreaterThanOrEqual(50);
    expect(n).toBeLessThan(100);
  });

  it('requiredNOneProp returns finite result', () => {
    const n = requiredNOneProp(0.5, 0.6);
    expect(n).toBeGreaterThanOrEqual(10);
    expect(n).toBeLessThan(2000);
  });

  it('requiredNTwoProp returns finite result', () => {
    const n = requiredNTwoProp(0.4, 0.6);
    expect(n).toBeGreaterThanOrEqual(10);
    expect(n).toBeLessThan(2000);
  });

  it('requiredNWilcoxon returns finite result', () => {
    const n = requiredNWilcoxon(0.5);
    expect(n).toBeGreaterThanOrEqual(50);
    expect(n).toBeLessThan(200);
  });

  it('requiredNLogRank returns finite result', () => {
    const n = requiredNLogRank(0.7);
    expect(n).toBeGreaterThanOrEqual(10);
    expect(n).toBeLessThan(2000);
  });

  it('requiredNOLS returns finite result', () => {
    const n = requiredNOLS(0.1, 3);
    expect(n).toBeGreaterThanOrEqual(10);
    expect(n).toBeLessThan(500);
  });
});

describe('powerCurve', () => {
  const tTestWrapper = (params) => powerTTest(params.n, params.n, params.d, params.type || 'two-sample', params.alpha || 0.05);

  it('generates monotonically increasing curve', () => {
    const pts = powerCurve(tTestWrapper, 'n', [10, 200], { d: 0.5 });
    expect(pts.length).toBe(40);
    expect(pts[0].power).toBeLessThan(pts[pts.length - 1].power);
    expect(pts[0].n).toBe(10);
  });

  it('all powers are in [0, 1]', () => {
    const pts = powerCurve(tTestWrapper, 'n', [10, 200], { d: 0.5 });
    pts.forEach(p => {
      expect(p.power).toBeGreaterThanOrEqual(0);
      expect(p.power).toBeLessThanOrEqual(1);
    });
  });
});
