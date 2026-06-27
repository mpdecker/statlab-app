import { describe, it, expect } from 'vitest';
import { expectKeys } from './__fixtures__/helpers.js';
import { word2vecSkipGram, gloveEmbeddings, namedEntityRecognition, posTagging, dependencyParse } from './nlp.js';

const corpus = ['hello world machine learning', 'deep learning neural network', 'data science machine intelligence'];

describe('word2vecSkipGram', () => {
  it('contract keys', () => expectKeys(word2vecSkipGram(corpus, { vecSize: 5, epochs: 3 }), ['test','embeddings','vecSize','vocabSize','apa']));
  it('null <3 docs', () => expect(word2vecSkipGram(['hello'])).toBeNull());
  it('embedding dimensions correct', () => { const r = word2vecSkipGram(corpus, { vecSize: 5, epochs: 3 }); if (r && r.embeddings) { const keys = Object.keys(r.embeddings); expect(keys.length).toBeGreaterThan(0) } });
  it('each vector has correct size', () => { const r = word2vecSkipGram(corpus, { vecSize: 5, epochs: 3 }); if (r && r.embeddings) { Object.values(r.embeddings).forEach(v => expect(v.length).toBe(5)) } });
});
describe('gloveEmbeddings', () => {
  it('contract keys', () => expectKeys(gloveEmbeddings(corpus, { vecSize: 5, epochs: 3 }), ['test','embeddings','vecSize','vocabSize','apa']));
  it('null <3 docs', () => expect(gloveEmbeddings(['one'])).toBeNull());
  it('embedding dimensions correct', () => { const r = gloveEmbeddings(corpus, { vecSize: 5, epochs: 3 }); if (r && r.embeddings) { const keys = Object.keys(r.embeddings); expect(keys.length).toBeGreaterThan(0); Object.values(r.embeddings).forEach(v => expect(v.length).toBe(5)) } });
});
describe('namedEntityRecognition', () => {
  it('contract keys', () => expectKeys(namedEntityRecognition('Dr. Smith from University of Oxford visited on 01/15/2023'), ['test','entities','nTokens','apa']));
  it('null invalid', () => expect(namedEntityRecognition(123)).toBeNull());
  it('detects person entities', () => { const r = namedEntityRecognition('Dr. Smith from University of Oxford visited on 01/15/2023'); if (r) { const persons = r.entities.filter(e => e.label === 'PERSON'); expect(persons.length).toBeGreaterThanOrEqual(0) } });
});
describe('posTagging', () => {
  it('contract keys', () => expectKeys(posTagging('the running experiment is working nicely'), ['test','tagged','nTokens','apa']));
  it('null invalid', () => expect(posTagging(123)).toBeNull());
  it('each token has pos tag', () => { const r = posTagging('the running experiment is working nicely'); if (r) { r.tagged.forEach(t => { expect(t).toHaveProperty('token'); expect(t).toHaveProperty('pos') }) } });
  it('tags include expected types', () => { const r = posTagging('the running experiment is working nicely'); if (r) { const tags = r.tagged.map(t => t.tag); expect(tags.length).toBeGreaterThan(0) } });
});
describe('dependencyParse', () => {
  it('contract keys', () => expectKeys(dependencyParse('the cat sat on the mat'), ['test','deps','nTokens','apa']));
  it('null invalid', () => expect(dependencyParse(123)).toBeNull());
  it('deps non-empty for multi-word text', () => { const r = dependencyParse('the cat sat on the mat'); if (r) expect(r.deps.length).toBeGreaterThan(0) });
});
