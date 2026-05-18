import { describe, it, expect } from 'vitest';
import {
  propensityScoreMatch, iv2sls, interruptedTimeSeries, regressionDiscontinuity,
} from './causal.js';
import { causalRows } from './fixtures/phase3.js';
import { expectKeys } from './__fixtures__/helpers.js';

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
