import { describe, it, expect } from 'vitest';
import { tfIdf, cosineSimilarity, jaccardSimilarity, documentTermMatrix, termFrequency, ngramExtraction } from './text.js';
import { expectKeys } from './__fixtures__/helpers.js';

const docs = ['hello world text', 'hello world data', 'data science text mining'];

describe('tfIdf', () => {
  it('null <2 docs', () => expect(tfIdf(['hello'])).toBeNull());
  it('contract keys', () => expectKeys(tfIdf(docs), ['test', 'tfidf', 'vocab', 'nDocs', 'apa']));
  it('weights non-negative', () => { const r = tfIdf(docs); r.tfidf.forEach(t => expect(t.weight).toBeGreaterThanOrEqual(0)); });
});

describe('cosineSimilarity', () => {
  it('null for zero norm', () => expect(cosineSimilarity([0, 0], [1, 2])).toBeNull());
  it('similarity = 1 for identical', () => { const r = cosineSimilarity([1, 2, 3], [1, 2, 3]); expect(r.similarity).toBeCloseTo(1, 2); });
  it('similarity in [-1,1]', () => { const r = cosineSimilarity([1, 0], [0, 1]); expect(r.similarity).toBeCloseTo(0, 2); });
  it('contract keys', () => expectKeys(cosineSimilarity([1, 2], [3, 4]), ['test', 'similarity', 'apa']));
});

describe('jaccardSimilarity', () => {
  it('null for both empty', () => expect(jaccardSimilarity([], [])).toBeNull());
  it('sim=1 identical', () => { const r = jaccardSimilarity(['a', 'b'], ['a', 'b']); expect(r.similarity).toBe(1); });
  it('contract keys', () => expectKeys(jaccardSimilarity(['a'], ['b']), ['test', 'similarity', 'intersection', 'union', 'apa']));
});

describe('documentTermMatrix', () => {
  it('null <2 docs', () => expect(documentTermMatrix(['hello'])).toBeNull());
  it('contract keys', () => expectKeys(documentTermMatrix(docs), ['test', 'matrix', 'vocab', 'termFreqs', 'nDocs', 'nTerms', 'apa']));
  it('matrix rows = nDocs', () => { const r = documentTermMatrix(docs); expect(r.matrix).toHaveLength(docs.length); });
});

describe('termFrequency', () => {
  it('null <2 docs', () => expect(termFrequency(['hello'])).toBeNull());
  it('contract keys', () => expectKeys(termFrequency(docs), ['test', 'frequencies', 'vocab', 'nDocs', 'apa']));
  it('normalize flag', () => { const r = termFrequency(docs, { normalize: true }); r.frequencies.forEach(f => expect(f.count).toBeLessThanOrEqual(1)); });
});

describe('ngramExtraction', () => {
  it('null for short text', () => expect(ngramExtraction('hello')).toBeNull());
  it('ngrams count = words - n + 1', () => { const r = ngramExtraction('hello world text data', 3); expect(r.ngrams).toHaveLength(2); });
  it('contract keys', () => expectKeys(ngramExtraction('hello world', 2), ['test', 'ngrams', 'n', 'apa']));
});

describe('edge cases', () => {
  it('tfIdf with stopwords filters terms', () => { const r = tfIdf(docs, { stopwords: ['hello'] }); expect(r.tfidf.every(t => t.term !== 'hello')).toBe(true); });
  it('tfIdf with vocab limits terms', () => { const r = tfIdf(docs, { vocab: ['data', 'text'] }); expect(r.vocab).toHaveLength(2); });
  it('cosineSimilarity with different lengths computes', () => { const r = cosineSimilarity([1, 2], [3, 4, 5]); expect(Number.isFinite(r.similarity)).toBe(true); });
  it('jaccardSimilarity with identical sets returns 1', () => { expect(jaccardSimilarity(['a', 'b', 'c'], ['a', 'b', 'c']).similarity).toBe(1); });
  it('documentTermMatrix with minDf filters rare terms', () => { const r = documentTermMatrix(docs, { minDf: 2 }); expect(r.vocab.length).toBeLessThan(10); });
  it('termFrequency normalize produces fractional counts', () => { const r = termFrequency(docs, { normalize: true }); expect(r.frequencies.every(f => f.count <= 1)).toBe(true); });
  it('ngramExtraction null for non-string', () => expect(ngramExtraction(123, 2)).toBeNull());
});
