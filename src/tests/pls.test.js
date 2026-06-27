import { describe, it, expect } from 'vitest';
import { pls1, pls2, vipScores, rda, dbRDA } from './pls.js';
import { expectKeys } from './__fixtures__/helpers.js';

const X = Array.from({length:15},(_,i)=>[i,i*0.5,Math.sin(i)]);
const y = X.map(r=>r[0]*2+r[1]+5);
const Y = X.map(r=>[r[0],r[1]*2]);

describe('pls1',()=>{it('contract keys',()=>expectKeys(pls1(X,y),['test','nComponents','rSquared','n','p','apa']));it('null<10',()=>expect(pls1(X.slice(0,5),y.slice(0,5))).toBeNull())});
describe('pls2',()=>{it('contract keys',()=>expectKeys(pls2(X,Y),['test','nComponents','n','apa']))});
describe('vipScores',()=>{it('contract keys',()=>expectKeys(vipScores({nComponents:3,p:5}),['test','scores','nComponents','apa']))});
describe('rda',()=>{it('contract keys',()=>expectKeys(rda(Y,X),['test','rSquared','p','n','apa']))});
describe('dbRDA',()=>{const D=Array.from({length:10},()=>Array(10).fill(1));it('contract keys',()=>{const r=dbRDA(D,X.slice(0,10));if(r)expectKeys(r,['test','eigenvalues','n','apa'])})});
