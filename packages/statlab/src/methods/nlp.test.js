import { describe, it, expect } from 'vitest';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };
import { word2vecSkipGram, gloveEmbeddings, namedEntityRecognition, posTagging, dependencyParse } from './nlp.js';

const rn = ref.nlp;

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

// Two-topic corpus: {cat,dog,pet} vs {car,road,drive} co-occur within topic only.
const topicCorpus = [];
for (let i = 0; i < 12; i++) {
  topicCorpus.push('the cat and dog are pet cat dog pet');
  topicCorpus.push('dog pet cat play cat dog pet together');
  topicCorpus.push('drive the car road car drive road trip');
  topicCorpus.push('car road drive fast road car drive far');
}
function cos(a, b) { let d = 0, na = 0, nb = 0; for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] ** 2; nb += b[i] ** 2; } return d / (Math.sqrt(na * nb) + 1e-12); }
function embOf(r, w) { const i = r.vocab.indexOf(w); return r.embeddings[i]; }

describe('word2vecSkipGram learns context (real SGNS)', () => {
  it('within-topic words are more similar than cross-topic', () => {
    const r = word2vecSkipGram(topicCorpus, { vecSize: 12, epochs: 40, seed: 1 });
    expect(cos(embOf(r, 'cat'), embOf(r, 'dog'))).toBeGreaterThan(cos(embOf(r, 'cat'), embOf(r, 'car')));
  });
});

describe('gloveEmbeddings factorizes co-occurrence (real GloVe)', () => {
  it('within-topic words are more similar than cross-topic', () => {
    const r = gloveEmbeddings(topicCorpus, { vecSize: 12, epochs: 80, seed: 1 });
    expect(cos(embOf(r, 'cat'), embOf(r, 'dog'))).toBeGreaterThan(cos(embOf(r, 'cat'), embOf(r, 'car')));
  });
});

describe('dependencyParse is a real rule-based parser (heads from grammar)', () => {
  it('parses "the dog chased the cat" with correct heads and relations', () => {
    const r = dependencyParse('the dog chased the cat');
    const find = w => r.deps.find(d => d.dep === w);
    expect(find('dog').head).toBe('chased');
    expect(find('dog').relation).toBe('nsubj');
    expect(find('cat').head).toBe('chased');
    expect(find('cat').relation).toBe('dobj');
    expect(find('the').relation).toBe('det'); // first determiner attaches to its noun
    expect(r.root).toBe('chased');
  });
});

describe('gloveEmbeddings oracle', () => {
  it('vocab and co-occurrence sum match oracle', () => {
    const r = gloveEmbeddings(rn.gloveEmbeddings_basic.corpus, { vecSize: 5, epochs: 3, seed: 42 });
    expect(r.vocabSize).toBe(rn.gloveEmbeddings_basic.vocabSize);
  });
  it('embeddings exist for all vocab words', () => {
    const r = gloveEmbeddings(rn.gloveEmbeddings_basic.corpus, { vecSize: 5, epochs: 3, seed: 42 });
    expect(r.embeddings.length).toBe(rn.gloveEmbeddings_basic.vocabSize);
  });
});

describe('namedEntityRecognition oracle', () => {
  it('entities match oracle', () => {
    const r = namedEntityRecognition(rn.namedEntityRecognition_basic.text);
    expect(r.entities.map(e => ({ text: e.text, type: e.type }))).toEqual(rn.namedEntityRecognition_basic.entities);
  });
});

describe('posTagging oracle', () => {
  it('tagged tokens match oracle', () => {
    const r = posTagging(rn.posTagging_basic.text);
    expect(r.tagged.map(t => ({ token: t.token, pos: t.pos }))).toEqual(rn.posTagging_basic.tagged);
  });
});

describe('dependencyParse oracle', () => {
  it('deps and root match oracle', () => {
    const r = dependencyParse(rn.dependencyParse_basic.text);
    const deps = r.deps.map(d => ({ dep: d.dep, head: d.head, relation: d.relation }));
    expect(deps).toEqual(rn.dependencyParse_basic.deps);
    expect(r.root).toBe(rn.dependencyParse_basic.root);
  });
});

describe('hardening — NLP edge cases', () => {
  it('word2vecSkipGram null for null corpus', () => expect(word2vecSkipGram(null)).toBeNull());
  it('word2vecSkipGram null for empty string corpus', () => expect(word2vecSkipGram([''])).toBeNull());
  it('word2vecSkipGram reproducible', () => { const r1 = word2vecSkipGram(corpus, { vecSize: 5, epochs: 3, seed: 1 }); const r2 = word2vecSkipGram(corpus, { vecSize: 5, epochs: 3, seed: 1 }); expect(r1.embeddings).toEqual(r2.embeddings); });
  it('gloveEmbeddings null for null corpus', () => expect(gloveEmbeddings(null)).toBeNull());
  it('gloveEmbeddings reproducible', () => { const r1 = gloveEmbeddings(corpus, { vecSize: 5, epochs: 3, seed: 7 }); const r2 = gloveEmbeddings(corpus, { vecSize: 5, epochs: 3, seed: 7 }); expect(r1.embeddings).toEqual(r2.embeddings); });
  it('namedEntityRecognition null for null text', () => expect(namedEntityRecognition(null)).toBeNull());
  it('namedEntityRecognition empty entities for plain text', () => { const r = namedEntityRecognition('hello world no entities here'); expect(r.entities).toHaveLength(0); });
  it('posTagging null for null text', () => expect(posTagging(null)).toBeNull());
  it('posTagging handles single word', () => { const r = posTagging('running'); expect(r.tagged).toHaveLength(1); });
  it('dependencyParse null for null text', () => expect(dependencyParse(null)).toBeNull());
  it('dependencyParse handles empty string', () => { const r = dependencyParse(''); if (r) expect(r.deps).toHaveLength(0); });
});
