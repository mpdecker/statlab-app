import { describe, it, expect } from 'vitest';
import { softmax, activate, softmaxCrossEntropy, gradientDescent, adamUpdate, xavierInit } from './neural.js';
import { expectKeys } from './__fixtures__/helpers.js';

describe('softmax', () => { it('contract keys', () => expectKeys(softmax([1,2,3]), ['test','probabilities','n','apa'])); it('sum to ~1', () => { const r = softmax([1,2,3]); expect(r.probabilities.reduce((s,v)=>s+v,0)).toBeCloseTo(1) }) });
describe('activate', () => { it('contract keys', () => expectKeys(activate([1,2,3]), ['test','output','type','n','apa'])); it('relu >=0', () => { const r = activate([-1,0,1]); r.output.forEach(v => expect(v).toBeGreaterThanOrEqual(0)) }) });
describe('softmaxCrossEntropy', () => { it('contract keys', () => expectKeys(softmaxCrossEntropy([1,2,3],[1,0,0]), ['test','loss','n','apa'])); it('null mismatch', () => expect(softmaxCrossEntropy([1,2],[1])).toBeNull()) });
describe('gradientDescent', () => { it('contract keys', () => expectKeys(gradientDescent([[1],[2],[3],[4],[5]],[2,4,6,8,10],{epochs:10}), ['test','weights','bias','finalLoss','epochs','n','apa'])); it('null <5', () => expect(gradientDescent([[1],[2]],[3,4])).toBeNull()) });
describe('adamUpdate', () => { it('contract keys', () => expectKeys(adamUpdate([0.5,0.3],[0.1,0.2],[0,0],[0,0],{t:1}), ['test','params','lr','t','n','apa'])) });
describe('xavierInit', () => { it('contract keys', () => expectKeys(xavierInit(5,3), ['test','weights','nIn','nOut','limit','apa'])) });
