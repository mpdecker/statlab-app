import { avg } from '../math/core.js';

function _tokenize(text, { stopwords = [], minLen = 2 } = {}) {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= minLen);
  const stopSet = new Set(stopwords.map(s => s.toLowerCase()));
  return words.filter(w => !stopSet.has(w));
}

// ── TF-IDF ──────────────────────────────────────────────────────────────────
export function tfIdf(documents, { vocab = null, stopwords = [], minDf = 1 } = {}) {
  if (!documents || documents.length < 2) return null;
  const nDocs = documents.length;
  const tokDocs = documents.map(d => _tokenize(d, { stopwords }));
  const allTerms = vocab || [...new Set(tokDocs.flat())];
  const df = {};
  tokDocs.forEach(tokens => {
    const seen = new Set(tokens);
    seen.forEach(t => { df[t] = (df[t] || 0) + 1; });
  });
  const filteredTerms = allTerms.filter(t => (df[t] || 0) >= minDf);
  if (!filteredTerms.length) return null;

  const idf = {};
  filteredTerms.forEach(t => { idf[t] = Math.log(nDocs / (1 + (df[t] || 0))); });
  const tfidf = [];
  filteredTerms.forEach(term => {
    tokDocs.forEach((tokens, di) => {
      const count = tokens.filter(t => t === term).length;
      if (count > 0) {
        const tf = count / Math.max(tokens.length, 1);
        tfidf.push({ docIndex: di, term, weight: +(tf * idf[term]).toFixed(6) });
      }
    });
  });

  return {
    test: 'TF-IDF',
    tfidf,
    vocab: filteredTerms,
    nDocs,
    apa: `TF-IDF: ${filteredTerms.length} terms, ${nDocs} documents`,
  };
}

// ── Cosine Similarity ───────────────────────────────────────────────────────
export function cosineSimilarity(a, b) {
  if (!a || !b || !a.length || !b.length) return null;
  let dot = 0, na = 0, nb = 0;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const ai = i < a.length ? a[i] : 0;
    const bi = i < b.length ? b[i] : 0;
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  const norm = Math.sqrt(na) * Math.sqrt(nb);
  if (norm < 1e-12) return null;
  const sim = dot / norm;
  return {
    test: 'Cosine Similarity',
    similarity: +sim.toFixed(4),
    apa: `Cosine similarity = ${sim.toFixed(3)}`,
  };
}

// ── Jaccard Similarity ──────────────────────────────────────────────────────
export function jaccardSimilarity(a, b) {
  if (!a || !b || (!a.length && !b.length)) return null;
  const setA = new Set(a), setB = new Set(b);
  let intersection = 0, union = new Set([...a, ...b]).size;
  setA.forEach(v => { if (setB.has(v)) intersection++; });
  const sim = union > 0 ? intersection / union : 0;
  return {
    test: 'Jaccard Similarity',
    similarity: +sim.toFixed(4),
    intersection,
    union,
    apa: `Jaccard = ${sim.toFixed(3)} (${intersection} / ${union})`,
  };
}

// ── Document-Term Matrix ────────────────────────────────────────────────────
export function documentTermMatrix(documents, { stopwords = [], minDf = 1 } = {}) {
  if (!documents || documents.length < 2) return null;
  const nDocs = documents.length;
  const tokDocs = documents.map(d => _tokenize(d, { stopwords }));
  const df = {};
  tokDocs.forEach(tokens => {
    const seen = new Set(tokens);
    seen.forEach(t => { df[t] = (df[t] || 0) + 1; });
  });
  const vocab = Object.keys(df).filter(t => df[t] >= minDf).sort();
  if (!vocab.length) return null;

  const matrix = tokDocs.map(tokens =>
    vocab.map(v => tokens.filter(t => t === v).length)
  );
  const termFreqs = vocab.map(v => df[v]);

  return {
    test: 'Document-Term Matrix',
    matrix,
    vocab,
    termFreqs,
    nDocs,
    nTerms: vocab.length,
    apa: `DTM: ${vocab.length} terms × ${nDocs} documents`,
  };
}

// ── Term Frequency ──────────────────────────────────────────────────────────
export function termFrequency(documents, { normalize = false, stopwords = [] } = {}) {
  if (!documents || documents.length < 2) return null;
  const tokDocs = documents.map(d => _tokenize(d, { stopwords }));
  const vocab = [...new Set(tokDocs.flat())].sort();
  if (!vocab.length) return null;

  const frequencies = [];
  tokDocs.forEach((tokens, di) => {
    const len = Math.max(tokens.length, 1);
    vocab.forEach(term => {
      const count = tokens.filter(t => t === term).length;
      if (count > 0) {
        frequencies.push({ docIndex: di, term, count: normalize ? +(count / len).toFixed(4) : count });
      }
    });
  });

  return {
    test: 'Term Frequency',
    frequencies,
    vocab,
    nDocs: tokDocs.length,
    apa: `TF: ${vocab.length} terms across ${tokDocs.length} docs`,
  };
}

// ── N-gram Extraction ──────────────────────────────────────────────────────
export function ngramExtraction(text, n = 2) {
  if (!text || typeof text !== 'string') return null;
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 0);
  if (words.length < n) return null;
  const ngrams = [];
  for (let i = 0; i <= words.length - n; i++) {
    ngrams.push(words.slice(i, i + n).join(' '));
  }
  return {
    test: 'N-gram Extraction',
    ngrams,
    n,
    apa: `N-grams (n=${n}): ${ngrams.length} from ${words.length} words`,
  };
}
