import { describe, it, expect } from 'vitest';
import { hlmRandomIntercept, hlmRandomSlope, iccMultilevel } from './multilevel.js';
import { nestedHLM } from './fixtures/phase3.js';
import { expectKeys } from './__fixtures__/helpers.js';

const data = nestedHLM();

describe('hlmRandomIntercept', () => {
  it('returns null with fewer than 3 clusters', () => {
    const tiny = nestedHLM({ schools: 2, pupilsPer: 20 });
    expect(hlmRandomIntercept(tiny, 'y', 'school')).toBeNull();
  });

  it('returns null when n < J + 10', () => {
    expect(hlmRandomIntercept(data.slice(0, 12), 'y', 'school')).toBeNull();
  });

  it('ICC in [0, 1] after clamping', () => {
    const r = hlmRandomIntercept(data, 'y', 'school', ['x']);
    expect(r.icc).toBeGreaterThanOrEqual(0);
    expect(r.icc).toBeLessThanOrEqual(1);
  });

  it('variance components non-negative', () => {
    const r = hlmRandomIntercept(data, 'y', 'school');
    expect(r.tau00).toBeGreaterThanOrEqual(0);
    expect(r.sigma2).toBeGreaterThan(0);
  });

  it('design effect >= 1 when ICC > 0', () => {
    const r = hlmRandomIntercept(data, 'y', 'school');
    if (r.icc > 0) expect(r.designEffect).toBeGreaterThanOrEqual(1);
  });

  it('nested data yields ICC > 0.1', () => {
    expect(hlmRandomIntercept(data, 'y', 'school').icc).toBeGreaterThan(0.1);
  });

  it('gamma01 and se when predictor supplied', () => {
    const r = hlmRandomIntercept(data, 'y', 'school', ['x']);
    expect(r.gamma01).not.toBeNull();
    expect(r.seGamma01).toBeGreaterThan(0);
  });

  it('no predictor leaves gamma01 null', () => {
    expect(hlmRandomIntercept(data, 'y', 'school', []).gamma01).toBeNull();
  });

  it('groupMeans capped at 12 clusters', () => {
    const big = nestedHLM({ schools: 20, pupilsPer: 8 });
    expect(hlmRandomIntercept(big, 'y', 'school').groupMeans.length).toBeLessThanOrEqual(12);
  });

  it('contract fields', () => {
    const r = hlmRandomIntercept(data, 'y', 'school', ['x']);
    expectKeys(r, [
      'test', 'icc', 'tau00', 'sigma2', 'gamma00', 'gamma01', 'seGamma01',
      'designEffect', 'nClusters', 'n', 'clusterVar', 'yVar', 'groupMeans', 'apa',
    ]);
    expect(r.test).toBe('HLM Random Intercept');
  });

  it('filters rows missing y', () => {
    const dirty = data.map((r, i) => (i === 0 ? { ...r, y: NaN } : r));
    const r = hlmRandomIntercept(dirty, 'y', 'school');
    expect(r.n).toBe(data.length - 1);
  });

  it('apa includes ICC and cluster count', () => {
    const r = hlmRandomIntercept(data, 'y', 'school');
    expect(r.apa).toMatch(/ICC/);
    expect(r.apa).toMatch(/J =/);
  });
});

describe('hlmRandomSlope', () => {
  it('returns null when RI fails', () => {
    expect(hlmRandomSlope(data.slice(0, 5), 'y', 'school', 'x')).toBeNull();
  });

  it('extends RI with slope variance', () => {
    const r = hlmRandomSlope(data, 'y', 'school', 'x');
    expect(r.slopeVariance).toBeGreaterThanOrEqual(0);
    expect(r.meanSlope).toBeDefined();
  });

  it('slopes array per cluster (max 15)', () => {
    const r = hlmRandomSlope(data, 'y', 'school', 'x');
    expect(r.slopes.length).toBeGreaterThan(0);
    expect(r.slopes.length).toBeLessThanOrEqual(15);
    r.slopes.forEach(s => {
      expect(s).toHaveProperty('name');
      expect(s).toHaveProperty('slope');
      expect(s.n).toBeGreaterThan(0);
    });
  });

  it('test label updated', () => {
    expect(hlmRandomSlope(data, 'y', 'school', 'x').test).toBe('HLM Random Slope');
  });

  it('apa mentions slope variance', () => {
    expect(hlmRandomSlope(data, 'y', 'school', 'x').apa).toMatch(/slope var/i);
  });
});

describe('iccMultilevel', () => {
  it('returns null when RI null', () => {
    expect(iccMultilevel(data.slice(0, 4), 'y', 'school')).toBeNull();
  });

  it('ICC matches RI model', () => {
    const r = iccMultilevel(data, 'y', 'school');
    const ri = hlmRandomIntercept(data, 'y', 'school', []);
    expect(r.icc).toBe(ri.icc);
    expect(r.designEffect).toBe(ri.designEffect);
  });

  it('contract fields', () => {
    const r = iccMultilevel(data, 'y', 'school');
    expectKeys(r, ['test', 'icc', 'designEffect', 'tau00', 'sigma2', 'nClusters', 'n', 'apa']);
    expect(r.test).toBe('Multilevel ICC');
  });
});
