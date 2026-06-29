import { describe, it, expect } from 'vitest';
import { expectKeys } from './__fixtures__/helpers.js';
import { clrTransform, ilrTransform, alrTransform, compPCA, compRegression } from './compositional.js';

const d = []; for (let i = 0; i < 20; i++) d.push({ a: 10 + Math.random() * 5, b: 20 + Math.random() * 8, c: 5 + Math.random() * 3, d: 15 + Math.random() * 6, y: i + Math.random() });

describe('clrTransform', () => {
  it('contract keys', () => expectKeys(clrTransform(d, ['a','b','c','d']), ['test','transformed','p','n','apa']));
  it('null <2 vars', () => expect(clrTransform(d, ['a'])).toBeNull());
  it('each row sums to 0 approximately', () => { const r = clrTransform(d, ['a','b','c','d']); if (r) r.transformed.forEach(row => { const sum = row.reduce((s, v) => s + v, 0); expect(sum).toBeCloseTo(0) }) });
});
describe('ilrTransform', () => {
  it('contract keys', () => expectKeys(ilrTransform(d, ['a','b','c','d']), ['test','transformed','p','n','apa']));
  it('null <2 vars', () => expect(ilrTransform(d, ['a'])).toBeNull());
  it('output has one less column', () => { const r = ilrTransform(d, ['a','b','c','d']); if (r) expect(r.transformed[0].length).toBe(3) });
});
describe('alrTransform', () => {
  it('contract keys', () => expectKeys(alrTransform(d, ['a','b','c','d'], 0), ['test','transformed','p','denominator','n','apa']));
  it('null <2 vars', () => expect(alrTransform(d, ['a'])).toBeNull());
  it('output has one less column', () => { const r = alrTransform(d, ['a','b','c','d'], 0); if (r) expect(r.transformed[0].length).toBe(3) });
});
describe('compPCA', () => {
  it('contract keys', () => expectKeys(compPCA(d, ['a','b','c','d']), ['test','eigenvalues','cumulative','n','p','apa']));
  it('null <2 vars', () => expect(compPCA(d, ['a'])).toBeNull());
  it('eigenvalues positive', () => { const r = compPCA(d, ['a','b','c','d']); if (r) r.eigenvalues.forEach(v => expect(v).toBeGreaterThanOrEqual(-0.01)) });
});
describe('compRegression', () => {
  it('contract keys', () => expectKeys(compRegression(d, 'y', ['a','b','c'], []), ['test','coefficients','n','p','apa']));
  it('null <2 parts', () => expect(compRegression(d, 'y', ['a'])).toBeNull());
  it('coefficients array present', () => { const r = compRegression(d, 'y', ['a','b','c'], []); if (r) expect(r.coefficients.length).toBeGreaterThan(0) });
});

describe('compRegression real inference', () => {
  it('reports computed SEs and p-values, not a hardcoded se=0.1', () => {
    const data = [];
    for (let i = 0; i < 16; i++) {
      const a = 1 + (i % 5), b = 2 + ((i * 3) % 7), c = 1 + ((i * 2) % 4);
      data.push({ a, b, c, y: a * 0.5 - b * 0.3 + c * 0.2 + (i % 3) * 0.1 });
    }
    const r = compRegression(data, 'y', ['a', 'b', 'c']);
    expect(r).not.toBeNull();
    r.coefficients.forEach(co => {
      expect(co.p).toBeGreaterThanOrEqual(0);
      expect(co.p).toBeLessThanOrEqual(1);
      expect(Number.isFinite(co.se)).toBe(true);
    });
    expect(r.coefficients.every(co => co.se === 0.1)).toBe(false);
  });
});

describe('compPCA full-data', () => {
  it('uses all observations, not the 5-row display slice', () => {
    const data = [];
    for (let i = 0; i < 16; i++) data.push({ a: 1 + (i % 5), b: 2 + ((i * 3) % 7), c: 1 + ((i * 2) % 4) });
    const r = compPCA(data, ['a', 'b', 'c']);
    expect(r.n).toBe(16);
  });
});
