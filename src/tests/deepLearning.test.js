import { describe, it, expect } from 'vitest';
import { expectKeys } from './__fixtures__/helpers.js';
import { autoencoder, variationalAutoencoder, gan, attention, transformerBlock } from './deepLearning.js';

const X = Array.from({length: 8}, () => Array.from({length: 4}, () => Math.random()));

describe('autoencoder', () => {
  it('contract keys', () => expectKeys(autoencoder(X, { hiddenSize: 3, epochs: 10 }), ['test','loss','hiddenSize','epochs','n','d','apa']));
  it('null <5', () => expect(autoencoder([[1,2]], { epochs: 5 })).toBeNull());
  it('loss >= 0', () => { const r = autoencoder(X, { hiddenSize: 3, epochs: 10 }); if (r) expect(r.loss).toBeGreaterThanOrEqual(0) });
});
describe('variationalAutoencoder', () => {
  it('contract keys', () => expectKeys(variationalAutoencoder(X, { latentSize: 2, epochs: 5 }), ['test','klDivergence','latentSize','epochs','n','d','apa']));
  it('null <5', () => expect(variationalAutoencoder([[1]], { epochs: 2 })).toBeNull());
  it('klDivergence >= 0', () => { const r = variationalAutoencoder(X, { latentSize: 2, epochs: 5 }); if (r) expect(r.klDivergence).toBeGreaterThanOrEqual(0) });
});
describe('gan', () => {
  it('contract keys', () => expectKeys(gan(X, { latentSize: 5, epochs: 3 }), ['test','gLoss','dLoss','latentSize','epochs','n','d','apa']));
  it('null <5', () => expect(gan([[1,2]], { epochs: 2 })).toBeNull());
  it('loss values finite', () => { const r = gan(X, { latentSize: 5, epochs: 3 }); if (r) { expect(isFinite(r.gLoss)).toBe(true); expect(isFinite(r.dLoss)).toBe(true) } });
});
describe('attention', () => {
  const Q = [[1,2],[3,4],[5,6]]; const K = Q; const V = [[0.1,0.2],[0.3,0.4],[0.5,0.6]];
  it('contract keys', () => expectKeys(attention(Q, K, V), ['test','output','n','dk','dv','apa']));
  it('null empty', () => expect(attention([], [], [])).toBeNull());
  it('output shape matches V', () => { const r = attention(Q, K, V); if (r) expect(r.output.length).toBe(V.length) });
});
describe('transformerBlock', () => {
  it('contract keys', () => expectKeys(transformerBlock(X, { nHeads: 2 }), ['test','output','nTokens','d','nHeads','apa']));
  it('null <2', () => expect(transformerBlock([X[0]], { nHeads: 2 })).toBeNull());
  it('output has correct token count', () => { const r = transformerBlock(X, { nHeads: 2 }); if (r) expect(r.output.length).toBe(X.length) });
});
