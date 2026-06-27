import { describe, it, expect } from 'vitest';
import { expectKeys } from './__fixtures__/helpers.js';
import { tsne, isomap, lle, umapApprox } from './dimReduction.js';

const X = Array.from({length: 15}, () => Array.from({length: 3}, () => Math.random() * 10));

describe('tsne', () => {
  it('contract keys', () => expectKeys(tsne(X, { perplexity: 5, maxIter: 10 }), ['test','embedding','n','p','nComponents','apa']));
  it('null <5', () => expect(tsne(X.slice(0,3))).toBeNull());
  it('embedding has correct dimensions', () => { const r = tsne(X, { perplexity: 5, maxIter: 10 }); if (r) { expect(r.embedding.length).toBe(X.length); expect(r.embedding[0].length).toBe(r.nComponents) } });
});
describe('isomap', () => {
  it('contract keys', () => expectKeys(isomap(X, { nNeighbors: 3, nComponents: 2 }), ['test','embedding','n','p','nComponents','apa']));
  it('null <5', () => expect(isomap(X.slice(0,3))).toBeNull());
  it('embedding has n rows', () => { const r = isomap(X, { nNeighbors: 3, nComponents: 2 }); if (r) expect(r.embedding.length).toBe(X.length) });
});
describe('lle', () => {
  it('contract keys', () => expectKeys(lle(X, { nNeighbors: 3, nComponents: 2 }), ['test','embedding','n','p','nComponents','apa']));
  it('null <5', () => expect(lle(X.slice(0,3))).toBeNull());
  it('embedding has nComponents columns', () => { const r = lle(X, { nNeighbors: 3, nComponents: 2 }); if (r) expect(r.embedding[0].length).toBe(r.nComponents) });
});
describe('umapApprox', () => {
  it('contract keys', () => expectKeys(umapApprox(X), ['test','embedding','n','p','nComponents','apa']));
  it('null <5', () => expect(umapApprox(X.slice(0,3))).toBeNull());
  it('embedding has correct dimensions', () => { const r = umapApprox(X); if (r) { expect(r.embedding.length).toBe(X.length); expect(r.embedding[0].length).toBe(r.nComponents) } });
});
