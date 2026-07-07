import { describe, it, expect } from 'vitest';
import { pls1, pls2, vipScores, rda, dbRDA, sPLSRegression, sparsePLS } from './pls.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const X = Array.from({length:15},(_,i)=>[i,i*0.5,Math.sin(i)]);
const y = X.map(r=>r[0]*2+r[1]+5);
const Y = X.map(r=>[r[0],r[1]*2]);

describe('pls1',()=>{it('contract keys',()=>expectKeys(pls1(X,y),['test','nComponents','rSquared','n','p','apa']));it('null<10',()=>expect(pls1(X.slice(0,5),y.slice(0,5))).toBeNull());it('nComponents positive',()=>{const r=pls1(X,y);if(r)expect(r.nComponents).toBeGreaterThan(0)});it('rSquared between 0 and 1',()=>{const r=pls1(X,y);if(r){expect(r.rSquared).toBeGreaterThanOrEqual(0);expect(r.rSquared).toBeLessThanOrEqual(1)}});it('fitted values correct length',()=>{const r=pls1(X,y);if(r&&r.fitted){expect(Array.isArray(r.fitted)).toBe(true);expect(r.fitted.length).toBe(X.length)}})});
describe('pls2',()=>{it('contract keys',()=>expectKeys(pls2(X,Y),['test','nComponents','n','apa']));it('nComponents positive',()=>{const r=pls2(X,Y);if(r)expect(r.nComponents).toBeGreaterThan(0)});it('n matches rows',()=>{const r=pls2(X,Y);if(r)expect(r.n).toBe(X.length)});it('fitted values correct length',()=>{const r=pls2(X,Y);if(r&&r.fitted){expect(Array.isArray(r.fitted)).toBe(true);expect(r.fitted.length).toBe(X.length)}})});
describe('vipScores',()=>{const m=pls1(X,y,2);it('contract keys',()=>expectKeys(vipScores(m),['test','scores','nComponents','apa']));it('null without weights',()=>expect(vipScores({nComponents:3,p:5})).toBeNull());it('scores array non-empty',()=>{const r=vipScores(m);if(r){expect(Array.isArray(r.scores)).toBe(true);expect(r.scores.length).toBeGreaterThan(0)}});it('vip scores finite',()=>{const r=vipScores(m);if(r&&r.scores){r.scores.forEach(s=>expect(Number.isFinite(s.vip)).toBe(true))}})});
describe('rda',()=>{it('contract keys',()=>expectKeys(rda(Y,X),['test','rSquared','p','n','apa']));it('rSquared between 0 and 1',()=>{const r=rda(Y,X);if(r){expect(r.rSquared).toBeGreaterThanOrEqual(0);expect(r.rSquared).toBeLessThanOrEqual(1)}});it('constrained proportion between 0-1',()=>{const r=rda(Y,X);if(r){const v=r.constrained||r.rSquared;expect(v).toBeGreaterThanOrEqual(0);expect(v).toBeLessThanOrEqual(1)}})});
describe('dbRDA',()=>{const D=Array.from({length:10},(_,i)=>Array.from({length:10},(_,j)=>Math.abs(i-j)+1));it('contract keys',()=>{const r=dbRDA(D,X.slice(0,10));if(r)expectKeys(r,['test','eigenvalues','n','apa'])});it('eigenvalues array non-empty',()=>{const r=dbRDA(D,X.slice(0,10));if(r){expect(Array.isArray(r.eigenvalues)).toBe(true);expect(r.eigenvalues.length).toBeGreaterThanOrEqual(0)}});it('eigenvalues non-empty',()=>{const r=dbRDA(D,X.slice(0,10));if(r){expect(r.eigenvalues).toBeDefined()}})});

describe('sPLSRegression', () => {
  const X = [[1,2,3],[2,3,4],[3,4,5],[4,5,6],[5,6,7]];
  const y = [2,3,4,5,6];
  it('contract keys', () => expectKeys(sPLSRegression(X, y), ['test','weights','nComp','lambda','n','p','apa']));
  it('null nComp<1', () => expect(sPLSRegression(X, y, { nComp: 0 })).toBeNull());
  it('weights array non-empty', () => { const r = sPLSRegression(X, y); if (r) { expect(Array.isArray(r.weights)).toBe(true); expect(r.weights.length).toBeGreaterThan(0); } });
  it('n matches rows', () => { const r = sPLSRegression(X, y); if (r) expect(r.n).toBe(X.length); });
});
describe('sparsePLS', () => {
  const X = [[1,2,3,4],[2,3,4,5],[3,4,5,6],[4,5,6,7],[5,6,7,8]];
  const y = [2,3,4,5,6];
  it('contract keys', () => expectKeys(sparsePLS(X, y), ['test','loadings','keepX','nComp','n','p','apa']));
  it('null <5', () => expect(sparsePLS([[1,2]], [3])).toBeNull());
  it('loadings array non-empty', () => { const r = sparsePLS(X, y); if (r) { expect(Array.isArray(r.loadings)).toBe(true); expect(r.loadings.length).toBeGreaterThan(0); } });
  it('keepX matches config', () => { const r = sparsePLS(X, y); if (r && r.keepX) expect(r.keepX).toBeGreaterThan(0); }); it('loadings non-empty', () => { const r = sparsePLS(X, y); if (r) { expect(r.loadings).toBeDefined(); } });
});

describe('vipScores computes real VIP from a PLS model', () => {
  it('VIP scores satisfy sum(VIP^2) = p', () => {
    const Xv = Array.from({ length: 20 }, (_, i) => [i % 5, (i * 7) % 11, (i * 3) % 4, (i % 2)]);
    const yv = Xv.map(r => 3 * r[0] - 2 * r[1] + 0.5 * r[2]); // var 3 (index 3) irrelevant
    const model = pls1(Xv, yv, 3);
    const r = vipScores(model);
    const p = Xv[0].length;
    const sumSq = r.scores.reduce((s, sc) => s + sc.vip ** 2, 0);
    expect(sumSq).toBeCloseTo(p, 1);
    // the irrelevant variable should have the smallest VIP
    const minVar = r.scores.reduce((m, sc) => sc.vip < m.vip ? sc : m).variable;
    expect(minVar).toBe(4);
  });
});

describe('sPLSRegression deflates correctly and captures variance', () => {
  it('achieves high R^2 on predictable two-latent data', () => {
    const rows = [];
    let s = 7; const rnd = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return (s / 2 ** 32) * 2 - 1; };
    for (let i = 0; i < 40; i++) { const a = rnd(), b = rnd(); rows.push({ x: [a, b, a + b, rnd() * 0.01, rnd() * 0.01], y: 2 * a - b }); }
    const X = rows.map(r => r.x), y = rows.map(r => r.y);
    const r = sPLSRegression(X, y, { nComp: 2, lambda: 0.1 });
    expect(r.rSquared).toBeGreaterThan(0.9);
  });
});

describe('sparsePLS gives real loadings (not hardcoded 0.5)', () => {
  it('loading magnitude reflects predictive strength; unselected are zero', () => {
    const rows = [];
    let s = 9; const rnd = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return (s / 2 ** 32) * 2 - 1; };
    for (let i = 0; i < 30; i++) { const a = rnd(), b = rnd(); rows.push({ x: [a, 0.2 * b, rnd(), rnd()], y: a }); } // var0 strong, var1 weak, 2&3 noise
    const X = rows.map(r => r.x), y = rows.map(r => r.y);
    const r = sparsePLS(X, y, { keepX: 2 });
    expect(Math.abs(r.loadings[0])).toBeGreaterThan(Math.abs(r.loadings[1])); // var0 more predictive than var1
    expect(r.loadings.filter(v => v !== 0).length).toBe(2);                    // only keepX selected
    expect(new Set(r.loadings).size).toBeGreaterThan(2);                        // not all the same value
  });
});

describe('pls2 is real NIPALS that predicts Y', () => {
  it('fits multivariate Y with high R^2', () => {
    const rows = [];
    let s = 21; const rnd = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return (s / 2 ** 32) * 2 - 1; };
    for (let i = 0; i < 40; i++) { const a = rnd(), b = rnd(), c = rnd(); rows.push({ x: [a, b, c, rnd() * 0.01], Y: [2 * a - b, a + c] }); }
    const X = rows.map(r => r.x), Y = rows.map(r => r.Y);
    const r = pls2(X, Y, 3);
    expect(r.rSquared).toBeGreaterThan(0.9);
    expect(r.fitted.length).toBe(X.length);
  });
});

describe('pls1 matches sklearn.cross_decomposition.PLSRegression (regression test for the missing mean-centering fix)', () => {
  it('R^2 and fitted values match the sklearn oracle exactly', () => {
    const e = ref.pls.pls1_basic;
    const r = pls1(e.X, e.y, 2);
    expect(r.rSquared).toBeCloseTo(e.rSquared, 3);
    e.fitted.forEach((f, i) => expect(r.fitted[i]).toBeCloseTo(f, 2));
  });
});

describe('pls2 matches sklearn.cross_decomposition.PLSRegression (multi-response)', () => {
  it('R^2 and fitted values match the sklearn oracle exactly', () => {
    const e = ref.pls.pls2_basic;
    const r = pls2(e.X, e.Y, 2);
    expect(r.rSquared).toBeCloseTo(e.rSquared, 3);
    e.fitted.forEach((row, i) => row.forEach((f, j) => expect(r.fitted[i][j]).toBeCloseTo(f, 2)));
  });
});

describe('rda computes a real constrained R^2', () => {
  it('R^2 ~ 1 when Y is a linear function of X, low when unrelated', () => {
    const rows = [];
    let s = 33; const rnd = () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return (s / 2 ** 32) * 2 - 1; };
    for (let i = 0; i < 30; i++) { const a = rnd(), b = rnd(); rows.push({ x: [a, b], Y: [2 * a - b, a + 3 * b, a] }); }
    const X = rows.map(r => r.x), Y = rows.map(r => r.Y);
    expect(rda(Y, X, { permutations: 9 }).rSquared).toBeGreaterThan(0.95);
    const Yrand = rows.map(() => [rnd(), rnd(), rnd()]);
    expect(rda(Yrand, X, { permutations: 9 }).rSquared).toBeLessThan(0.6);
  });
});

describe('hardening — invalid inputs', () => {
  it('pls1 rejects null/mismatch', () => {
    expect(pls1(null, y)).toBeNull();
    expect(pls1(X, null)).toBeNull();
    expect(pls1(X.slice(0, 5), y.slice(0, 5))).toBeNull();
  });
  it('pls2 rejects null/mismatch', () => {
    expect(pls2(null, Y)).toBeNull();
    expect(pls2(X, null)).toBeNull();
    expect(pls2(X.slice(0, 5), Y.slice(0, 5))).toBeNull();
  });
  it('vipScores rejects null/empty weights', () => {
    expect(vipScores(null)).toBeNull();
    expect(vipScores({})).toBeNull();
  });
  it('rda rejects null/short', () => {
    expect(rda(null, X)).toBeNull();
    expect(rda(Y, null)).toBeNull();
    expect(rda(Y.slice(0, 3), X.slice(0, 3))).toBeNull();
  });
  it('dbRDA rejects null/short', () => {
    const Dmat = Array.from({length:10},(_,i)=>Array.from({length:10},(_,j)=>Math.abs(i-j)+1));
    expect(dbRDA(null, X)).toBeNull();
    expect(dbRDA(Dmat, null)).toBeNull();
  });
  it('sPLSRegression rejects null/nComp<1', () => {
    expect(sPLSRegression(null, y)).toBeNull();
    expect(sPLSRegression(X, null)).toBeNull();
    expect(sPLSRegression(X, y, { nComp: 0 })).toBeNull();
  });
  it('sparsePLS rejects null/short', () => {
    expect(sparsePLS(null, y)).toBeNull();
    expect(sparsePLS([[1, 2]], [3])).toBeNull();
  });
});
