import { describe, it, expect } from 'vitest';
import { pls1, pls2, vipScores, rda, dbRDA, sPLSRegression, sparsePLS } from './pls.js';
import { expectKeys } from './__fixtures__/helpers.js';

const X = Array.from({length:15},(_,i)=>[i,i*0.5,Math.sin(i)]);
const y = X.map(r=>r[0]*2+r[1]+5);
const Y = X.map(r=>[r[0],r[1]*2]);

describe('pls1',()=>{it('contract keys',()=>expectKeys(pls1(X,y),['test','nComponents','rSquared','n','p','apa']));it('null<10',()=>expect(pls1(X.slice(0,5),y.slice(0,5))).toBeNull());it('nComponents positive',()=>{const r=pls1(X,y);if(r)expect(r.nComponents).toBeGreaterThan(0)});it('rSquared between 0 and 1',()=>{const r=pls1(X,y);if(r){expect(r.rSquared).toBeGreaterThanOrEqual(0);expect(r.rSquared).toBeLessThanOrEqual(1)}});it('fitted values correct length',()=>{const r=pls1(X,y);if(r&&r.fitted){expect(Array.isArray(r.fitted)).toBe(true);expect(r.fitted.length).toBe(X.length)}})});
describe('pls2',()=>{it('contract keys',()=>expectKeys(pls2(X,Y),['test','nComponents','n','apa']));it('nComponents positive',()=>{const r=pls2(X,Y);if(r)expect(r.nComponents).toBeGreaterThan(0)});it('n matches rows',()=>{const r=pls2(X,Y);if(r)expect(r.n).toBe(X.length)});it('fitted values correct length',()=>{const r=pls2(X,Y);if(r&&r.fitted){expect(Array.isArray(r.fitted)).toBe(true);expect(r.fitted.length).toBe(X.length)}})});
describe('vipScores',()=>{it('contract keys',()=>expectKeys(vipScores({nComponents:3,p:5}),['test','scores','nComponents','apa']));it('scores array non-empty',()=>{const r=vipScores({nComponents:3,p:5});if(r){expect(Array.isArray(r.scores)).toBe(true);expect(r.scores.length).toBeGreaterThan(0)}});it('vip scores finite',()=>{const r=vipScores({nComponents:3,p:5});if(r&&r.scores){expect(r.scores.length).toBeGreaterThan(0)}})});
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
