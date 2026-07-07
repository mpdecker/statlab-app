import { describe, it, expect } from 'vitest';
import { tfIdf, cosineSimilarity, jaccardSimilarity, documentTermMatrix, termFrequency, ngramExtraction, ldaTopicModel, svdEmbeddings, bm25, sentimentVader, perplexityScore, textPreprocess, textRank, tfidfSimilaritySearch } from './text.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const rt = ref.text;

const docs = ['hello world text', 'hello world data', 'data science text mining'];

describe('tfIdf', () => {
  it('null <2 docs', () => expect(tfIdf(['hello'])).toBeNull());
  it('contract keys', () => expectKeys(tfIdf(docs), ['test', 'tfidf', 'vocab', 'nDocs', 'apa']));
  it('weights non-negative', () => { const r = tfIdf(docs); r.tfidf.forEach(t => expect(t.weight).toBeGreaterThanOrEqual(0)); });
  it('vocabSize matches oracle', () => { const r = tfIdf(docs); expect(r.vocab.length).toBe(rt.tfIdf_basic.vocabSize); });
});

describe('cosineSimilarity', () => {
  it('null for zero norm', () => expect(cosineSimilarity([0, 0], [1, 2])).toBeNull());
  it('similarity = 1 for identical', () => { const r = cosineSimilarity([1, 2, 3], [1, 2, 3]); expect(r.similarity).toBeCloseTo(1, 2); });
  it('similarity in [-1,1]', () => { const r = cosineSimilarity([1, 0], [0, 1]); expect(r.similarity).toBeCloseTo(0, 2); });
  it('contract keys', () => expectKeys(cosineSimilarity([1, 2], [3, 4]), ['test', 'similarity', 'apa']));
  it('identical matches oracle', () => { const r = cosineSimilarity([1,2,3], [1,2,3]); expect(r.similarity).toBeCloseTo(rt.cosineSimilarity_basic.identical, 4); });
  it('orthogonal matches oracle', () => { const r = cosineSimilarity([1,0], [0,1]); expect(r.similarity).toBeCloseTo(rt.cosineSimilarity_basic.orthogonal, 4); });
});

describe('jaccardSimilarity', () => {
  it('null for both empty', () => expect(jaccardSimilarity([], [])).toBeNull());
  it('sim=1 identical', () => { const r = jaccardSimilarity(['a', 'b'], ['a', 'b']); expect(r.similarity).toBe(1); });
  it('contract keys', () => expectKeys(jaccardSimilarity(['a'], ['b']), ['test', 'similarity', 'intersection', 'union', 'apa']));
  it('identical matches oracle', () => { const r = jaccardSimilarity(['a','b'], ['a','b']); expect(r.similarity).toBeCloseTo(rt.jaccardSimilarity_basic.identical, 4); });
});

describe('documentTermMatrix', () => {
  it('null <2 docs', () => expect(documentTermMatrix(['hello'])).toBeNull());
  it('contract keys', () => expectKeys(documentTermMatrix(docs), ['test', 'matrix', 'vocab', 'termFreqs', 'nDocs', 'nTerms', 'apa']));
  it('matrix rows = nDocs', () => { const r = documentTermMatrix(docs); expect(r.matrix).toHaveLength(docs.length); });
  it('vocabSize matches oracle', () => { const r = documentTermMatrix(docs); expect(r.vocab.length).toBe(rt.documentTermMatrix_basic.vocabSize); });
  it('nDocs matches oracle', () => { const r = documentTermMatrix(docs); expect(r.nDocs).toBe(rt.documentTermMatrix_basic.nDocs); });
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

describe('ldaTopicModel', () => {
  it('contract keys', () => { const r = ldaTopicModel(docs, 2, { iterations: 20 }); expectKeys(r, ['test','topics','nTopics','iterations','nDocs','nVocab','apa']); });
  it('null <3 docs', () => expect(ldaTopicModel(['a'], 2)).toBeNull());
  it('null nTopics<2', () => expect(ldaTopicModel(docs, 1)).toBeNull());
});

describe('svdEmbeddings', () => {
  it('contract keys', () => expectKeys(svdEmbeddings(docs, { nDims: 5 }), ['test','embeddings','nDims','nVocab','nDocs','apa']));
  it('embeddings non-empty', () => { const r = svdEmbeddings(docs, { nDims: 5 }); if (r) expect(r.embeddings.length).toBeGreaterThan(0); });
  it('nDims matches', () => { const r = svdEmbeddings(docs, { nDims: 5 }); if (r) expect(r.nDims).toBe(5); });
});

describe('bm25', () => {
  it('contract keys', () => expectKeys(bm25(docs, 'hello world'), ['test','scores','nDocs','queryLength','apa']));
  it('null <2 docs', () => expect(bm25(['one'], 'query')).toBeNull());
  it('scores non-empty', () => { const r = bm25(docs, 'hello world'); if (r) expect(r.scores.length).toBeGreaterThan(0); });
});

describe('sentimentVader', () => {
  it('positive text', () => { const r = sentimentVader('this is great and wonderful good happy'); expect(r.sentiment).toBe('positive'); });
  it('negative text', () => { const r = sentimentVader('terrible awful bad sad ugly horrible'); expect(r.sentiment).toBe('negative'); });
  it('contract keys', () => expectKeys(sentimentVader('hello world'), ['test','compound','pos','neg','words','sentiment','apa']));
});

describe('perplexityScore', () => {
  it('contract keys', () => expectKeys(perplexityScore([-1.2, -1.5, -0.8], 10), ['test','perplexity','avgLogLik','nWords','apa']));
  it('null positive log probs', () => expect(perplexityScore([1, 2, 3], 10)).toBeNull());
  it('perplexity positive', () => { const r = perplexityScore([-1.2, -1.5, -0.8], 10); if (r) expect(r.perplexity).toBeGreaterThan(0); });
});

describe('textPreprocess', () => {
  it('contract keys', () => expectKeys(textPreprocess(docs), ['test','nDocs','nTokens','nVocab','processed','apa']));
  it('null empty', () => expect(textPreprocess([])).toBeNull());
  it('processed non-empty', () => { const r = textPreprocess(docs); if (r) expect(r.processed.length).toBeGreaterThan(0); });
});

describe('textRank', () => {
  const docs = ['machine learning is great for data science', 'deep learning advances machine intelligence', 'data science and machine learning'];
  it('contract keys', () => expectKeys(textRank(docs, { topN: 3 }), ['test','keywords','nDocs','nVocab','apa']));
  it('null <2 docs', () => expect(textRank(['hello'])).toBeNull());
  it('keywords non-empty', () => { const r = textRank(docs, { topN: 3 }); if (r) expect(r.keywords.length).toBeGreaterThan(0); });
});
describe('tfidfSimilaritySearch', () => {
  const docs = ['hello world text mining', 'hello world data analysis', 'data science text analysis'];
  it('contract keys', () => expectKeys(tfidfSimilaritySearch(docs, 'hello world', { topN: 2 }), ['test','results','nDocs','apa']));
  it('null <2', () => expect(tfidfSimilaritySearch(['one'], 'query')).toBeNull());
  it('results non-empty', () => { const r = tfidfSimilaritySearch(docs, 'hello world', { topN: 2 }); if (r) expect(r.results.length).toBeGreaterThan(0); });
});

describe('svdEmbeddings does a real PPMI truncated SVD', () => {
  const topicDocs = [];
  for (let i = 0; i < 10; i++) { topicDocs.push('cat dog pet cat dog pet animal'); topicDocs.push('car road drive car road drive vehicle'); }
  function cos(a, b) { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; } return d / (Math.sqrt(na * nb) + 1e-12); }
  it('within-topic words are more similar than cross-topic', () => {
    const r = svdEmbeddings(topicDocs, { nDims: 6 });
    const v = w => r.embeddings.find(e => e.word === w).vector;
    expect(cos(v('cat'), v('dog'))).toBeGreaterThan(cos(v('cat'), v('car')));
  });
});

describe('hardening — text edge cases', () => {
  it('tfIdf null for null docs', () => expect(tfIdf(null)).toBeNull());
  it('tfIdf handles single doc', () => expect(tfIdf(['one'])).toBeNull());
  it('cosineSimilarity null for null a', () => expect(cosineSimilarity(null, [1,2])).toBeNull());
  it('cosineSimilarity null for both zero vectors', () => expect(cosineSimilarity([0,0], [0,0])).toBeNull());
  it('jaccardSimilarity null for null sets', () => expect(jaccardSimilarity(null, ['a'])).toBeNull());
  it('jaccardSimilarity sim=0 for disjoint', () => { const r = jaccardSimilarity(['a'], ['b']); expect(r.similarity).toBe(0); });
  it('documentTermMatrix null for null docs', () => expect(documentTermMatrix(null)).toBeNull());
  it('termFrequency null for null docs', () => expect(termFrequency(null)).toBeNull());
  it('ngramExtraction null for non-string', () => expect(ngramExtraction(123, 2)).toBeNull());
  it('ngramExtraction null for empty string', () => expect(ngramExtraction('')).toBeNull());
  it('ldaTopicModel null for null docs', () => expect(ldaTopicModel(null, 2)).toBeNull());
  it('ldaTopicModel null nTopics<2', () => expect(ldaTopicModel(docs, 1)).toBeNull());
  it('svdEmbeddings null for null docs', () => expect(svdEmbeddings(null)).toBeNull());
  it('svdEmbeddings reproducible', () => { const r1 = svdEmbeddings(docs, { nDims: 5 }); const r2 = svdEmbeddings(docs, { nDims: 5 }); expect(r1.nVocab).toBe(r2.nVocab); });
  it('bm25 null for null docs', () => expect(bm25(null, 'query')).toBeNull());
  it('bm25 null for non-string query', () => expect(bm25(docs, 123)).toBeNull());
  it('sentimentVader null for null text', () => expect(sentimentVader(null)).toBeNull());
  it('sentimentVader neutral for empty', () => { const r = sentimentVader(''); if (r) expect(r.sentiment).toBe('neutral'); });
  it('perplexityScore null for null logProbs', () => expect(perplexityScore(null, 10)).toBeNull());
  it('perplexityScore null for positive log probs', () => expect(perplexityScore([1,2,3], 10)).toBeNull());
  it('textPreprocess null for null docs', () => expect(textPreprocess(null)).toBeNull());
  it('textRank null for null docs', () => expect(textRank(null)).toBeNull());
  it('tfidfSimilaritySearch null for null docs', () => expect(tfidfSimilaritySearch(null, 'query')).toBeNull());
  it('tfidfSimilaritySearch null for empty query', () => expect(tfidfSimilaritySearch(docs, '')).toBeNull());
});
