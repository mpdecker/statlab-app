import { describe, it, expect } from 'vitest';
import { softmax, activate, softmaxCrossEntropy, gradientDescent, adamUpdate, xavierInit, backpropagation, convolution1D, conv2D, maxPooling, batchNorm, dropout } from './neural.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

describe('softmax', () => { it('contract keys', () => expectKeys(softmax([1,2,3]), ['test','probabilities','n','apa'])); it('sum to ~1', () => { const r = softmax([1,2,3]); expect(r.probabilities.reduce((s,v)=>s+v,0)).toBeCloseTo(1) }); it('probabilities sum to 1', () => { const r = softmax([5,10,15]); expect(r.probabilities.reduce((s,v)=>s+v,0)).toBeCloseTo(1); expect(r.probabilities.every(p => p >= 0 && p <= 1)).toBe(true) }); it('each prob between 0-1', () => { const r = softmax([5,10,15,2,8]); r.probabilities.forEach(p => { expect(p).toBeGreaterThanOrEqual(0); expect(p).toBeLessThanOrEqual(1); }) }) });
describe('activate', () => { it('contract keys', () => expectKeys(activate([1,2,3]), ['test','output','type','n','apa'])); it('relu >=0', () => { const r = activate([-1,0,1]); r.output.forEach(v => expect(v).toBeGreaterThanOrEqual(0)) }); it('relu non-negative', () => { const r = activate([-3,-1,0,2,5]); r.output.forEach(v => expect(v).toBeGreaterThanOrEqual(0)) }); it('sigmoid between 0-1', () => { const r = activate([-3,0,3], 'sigmoid'); r.output.forEach(v => { expect(v).toBeGreaterThan(0); expect(v).toBeLessThan(1) }) }); it('tanh between -1-1', () => { const r = activate([-3,0,3], 'tanh'); r.output.forEach(v => { expect(v).toBeGreaterThanOrEqual(-1); expect(v).toBeLessThanOrEqual(1) }) }) });
describe('softmaxCrossEntropy', () => { it('contract keys', () => expectKeys(softmaxCrossEntropy([1,2,3],[1,0,0]), ['test','loss','n','apa'])); it('null mismatch', () => expect(softmaxCrossEntropy([1,2],[1])).toBeNull()); it('loss >= 0', () => { const r = softmaxCrossEntropy([1,2,3],[1,0,0]); if (r) expect(r.loss).toBeGreaterThanOrEqual(0) }) });
describe('gradientDescent', () => { it('contract keys', () => expectKeys(gradientDescent([[1],[2],[3],[4],[5]],[2,4,6,8,10],{epochs:10}), ['test','weights','bias','finalLoss','epochs','n','apa'])); it('null <5', () => expect(gradientDescent([[1],[2]],[3,4])).toBeNull()); it('returns finite value', () => { const r = gradientDescent([[1],[2],[3],[4],[5]],[2,4,6,8,10],{epochs:10}); if (r) { expect(isFinite(r.finalLoss)).toBe(true); expect(r.weights.every(w => isFinite(w))).toBe(true) } }); it('value decreases over epochs', () => { const X = [[1],[2],[3],[4],[5]]; const y = [2,4,6,8,10]; const r10 = gradientDescent(X, y, {epochs:10}); const r50 = gradientDescent(X, y, {epochs:50}); if (r10 && r50) expect(r50.finalLoss).toBeLessThanOrEqual(r10.finalLoss); }) });
describe('adamUpdate', () => { it('contract keys', () => expectKeys(adamUpdate([0.5,0.3],[0.1,0.2],[0,0],[0,0],{t:1}), ['test','params','lr','t','n','apa'])); it('returns array', () => { const r = adamUpdate([0.5,0.3],[0.1,0.2],[0,0],[0,0],{t:1}); if (r) { expect(Array.isArray(r.params)).toBe(true); expect(r.params.length).toBe(2) } }); it('lr positive', () => { const r = adamUpdate([0.5,0.3],[0.1,0.2],[0,0],[0,0],{t:1}); if (r) expect(r.lr).toBeGreaterThan(0); }); });
describe('xavierInit', () => { it('contract keys', () => expectKeys(xavierInit(5,3), ['test','weights','nIn','nOut','limit','apa'])); it('weights finite', () => { const r = xavierInit(5,3); if (r) { r.weights.forEach(row => row.forEach(w => expect(isFinite(w)).toBe(true))) } }); it('nIn matches input', () => { const r = xavierInit(5,3); if (r) expect(r.nIn).toBe(5); }); });
describe('backpropagation', () => {
  const X = [[0],[1],[2],[3],[4],[5],[6],[7],[8],[9]];
  const y = X.map(r => r[0] * 2 + 1);
  it('contract keys', () => expectKeys(backpropagation(X, y, 3, { epochs: 20 }), ['test','loss','nHidden','epochs','n','p','apa']));
  it('null <5', () => expect(backpropagation([[1]], [2], 2)).toBeNull());
  it('loss non-negative', () => { const r = backpropagation(X, y, 3, { epochs: 20 }); if (r) expect(r.loss).toBeGreaterThanOrEqual(0); });
});
describe('convolution1D', () => {
  const sig = [1,2,3,4,5,6,7,8];
  const ker = [0.5, 0.5];
  it('contract keys', () => expectKeys(convolution1D(sig, ker), ['test','output','kernelSize','outputSize','n','apa']));
  it('null short signal', () => expect(convolution1D([1], ker)).toBeNull());
  it('outputSize correct', () => { const r = convolution1D(sig, ker); if (r) expect(r.outputSize).toBe(sig.length - ker.length + 1); });
});

describe('conv2D', () => {
  const input = [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16]];
  const kernel = [[1,1],[1,1]];
  it('contract keys', () => expectKeys(conv2D(input, kernel), ['test','output','outputShape','kernelShape','apa']));
  it('output correct dimensions', () => { const r = conv2D(input, kernel); if (r) { expect(r.output.length).toBe(3); expect(r.output[0].length).toBe(3); } });
  it('outputShape matches', () => { const r = conv2D(input, kernel); if (r) { expect(r.outputShape[0]).toBe(3); expect(r.outputShape[1]).toBe(3); } });
});
describe('maxPooling', () => {
  const input = [[1,2,3,4],[5,6,7,8],[9,10,11,12],[13,14,15,16]];
  it('contract keys', () => expectKeys(maxPooling(input, { poolSize: 2 }), ['test','output','outputShape','poolSize','apa']));
  it('output dimensions halved', () => { const r = maxPooling(input, { poolSize: 2 }); if (r) { expect(r.output.length).toBe(2); expect(r.output[0].length).toBe(2); } });
  it('outputShape matches', () => { const r = maxPooling(input, { poolSize: 2 }); if (r) { expect(r.outputShape[0]).toBe(2); expect(r.outputShape[1]).toBe(2); } });
});
describe('batchNorm', () => {
  const X = [[1,2],[3,4],[5,6],[7,8]];
  it('contract keys', () => expectKeys(batchNorm(X), ['test','normalized','n','d','apa']));
  it('each column mean near 0', () => { const r = batchNorm(X); if (r && r.normalized) { for (let j = 0; j < r.d; j++) { const mean = r.normalized.reduce((s, row) => s + row[j], 0) / r.n; expect(mean).toBeCloseTo(0, 1); } } });
  it('n matches input rows', () => { const r = batchNorm(X); if (r) expect(r.n).toBe(X.length); });
});
describe('dropout', () => {
  const X = [[1,2,3],[4,5,6],[7,8,9]];
  it('contract keys', () => expectKeys(dropout(X, 0.3, { seed: 42 }), ['test','output','rate','scale','activeRatio','n','d','apa']));
  it('activeRatio near 1-rate', () => { const r = dropout(X, 0.3, { seed: 42 }); if (r) expect(r.activeRatio).toBeCloseTo(0.7, 0); });
  it('null invalid rate', () => expect(dropout(X, 1)).toBeNull());
});

describe('conv2D actually zero-pads the input (regression test for the padding-offset fix)', () => {
  it('matches a from-scratch zero-pad + cross-correlate reference for padding=1', () => {
    const e = ref.neural.conv2d_padding_basic;
    const r = conv2D(e.input, e.kernel, { stride: 1, padding: e.padding });
    expect(r.outputShape).toEqual([e.output.length, e.output[0].length]);
    r.output.forEach((row, i) => row.forEach((v, j) => expect(v).toBeCloseTo(e.output[i][j], 4)));
  });
});
