import { avg } from '../math/core.js';
import { mulberry32 } from '../math/rng.js';
import { jacobiEigen } from '../math/matrix.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

function _tokenize(text, { stopwords = [], minLen = 2 } = {}) {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length >= minLen);
  const stopSet = new Set(stopwords.map(s => s.toLowerCase()));
  return words.filter(w => !stopSet.has(w));
}

// ── TF-IDF ──────────────────────────────────────────────────────────────────
/** @param {string[]} documents */
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
/** @param {number[]} a @param {number[]} b */
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
/** @param {Array<string|number>} a @param {Array<string|number>} b */
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
/** @param {string[]} documents */
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
/** @param {string[]} documents */
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
/** @param {number} [n] */
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

// ── LDA Topic Model ─────────────────────────────────────────────────────────
/** @param {string[]} documents @param {number} [nTopics] */
export function ldaTopicModel(documents, nTopics = 3, { seed = 42, iterations = 50, alpha = 0.1, beta = 0.01, stopwords = [] } = {}) {
  __rng = mulberry32(seed);
  if (!documents || documents.length < 3 || nTopics < 2) return null;
  const tokDocs = documents.map(d => _tokenize(d, { stopwords, minLen: 2 }));
  const vocab = [...new Set(tokDocs.flat())];
  if (vocab.length < nTopics * 3) return null;
  const V = vocab.length;
  const D = tokDocs.length;
  const wordToIdx = {}; vocab.forEach((w, i) => { wordToIdx[w] = i; });

  // Random initialize topic assignments
  const z = tokDocs.map(tokens => tokens.map(() => Math.floor(__rng() * nTopics)));
  const ndk = Array.from({ length: D }, () => Array(nTopics).fill(0));
  const nkw = Array.from({ length: nTopics }, () => Array(V).fill(0));
  const nk = Array(nTopics).fill(0);

  for (let d = 0; d < D; d++) {
    for (let i = 0; i < tokDocs[d].length; i++) {
      const w = tokDocs[d][i];
      const t = z[d][i];
      ndk[d][t]++;
      nkw[t][wordToIdx[w]]++;
      nk[t]++;
    }
  }

  for (let iter = 0; iter < iterations; iter++) {
    for (let d = 0; d < D; d++) {
      for (let i = 0; i < tokDocs[d].length; i++) {
        const w = tokDocs[d][i];
        const oldT = z[d][i];
        ndk[d][oldT]--;
        nkw[oldT][wordToIdx[w]]--;
        nk[oldT]--;
        const probs = Array(nTopics).fill(0);
        for (let t = 0; t < nTopics; t++) {
          probs[t] = ((ndk[d][t] + alpha) / (tokDocs[d].length + nTopics * alpha)) *
                     ((nkw[t][wordToIdx[w]] + beta) / (nk[t] + V * beta + 1e-10));
        }
        const sumP = probs.reduce((s, p) => s + p, 0);
        const u = __rng() * sumP;
        let cum = 0, newT = oldT;
        for (let t = 0; t < nTopics; t++) { cum += probs[t]; if (u <= cum) { newT = t; break; } }
        z[d][i] = newT;
        ndk[d][newT]++;
        nkw[newT][wordToIdx[w]]++;
        nk[newT]++;
      }
    }
  }

  const topics = Array.from({ length: nTopics }, (_, t) => {
    const topWords = vocab.map((w, i) => ({ word: w, prob: nkw[t][i] / (nk[t] + 1e-10) }))
      .sort((a, b) => b.prob - a.prob).slice(0, 10);
    return { topic: t + 1, topWords, proportion: +(nk[t] / nk.reduce((s, v) => s + v, 0)).toFixed(4) };
  });

  return { test: 'LDA Topic Model', topics, nTopics, iterations, nDocs: D, nVocab: V, apa: `LDA: ${nTopics} topics, ${D} docs, ${V} terms` };
}

// ── SVD Word Embeddings ─────────────────────────────────────────────────────
/** @param {string[]} documents */
export function svdEmbeddings(documents, { nDims = 50, windowSize = 3, stopwords = [] } = {}) {
  if (!documents || documents.length < 3) return null;
  const tokDocs = documents.map(d => _tokenize(d, { stopwords, minLen: 1 }));
  const vocab = [...new Set(tokDocs.flat())];
  if (vocab.length < 5) return null;
  const V = vocab.length;
  const wordToIdx = {}; vocab.forEach((w, i) => { wordToIdx[w] = i; });
  const cooc = Array.from({ length: V }, () => Array(V).fill(0));
  tokDocs.forEach(tokens => {
    for (let i = 0; i < tokens.length; i++) {
      for (let j = Math.max(0, i - windowSize); j <= Math.min(tokens.length - 1, i + windowSize); j++) {
        if (i !== j) cooc[wordToIdx[tokens[i]]][wordToIdx[tokens[j]]]++;
      }
    }
  });
  // Positive PMI matrix: PPMI_ij = max(0, log( X_ij·X_·· / (X_i·X_j) )).
  const total = cooc.reduce((s, row) => s + row.reduce((a, v) => a + v, 0), 0) || 1;
  const rowSum = cooc.map(row => row.reduce((s, v) => s + v, 0));
  const ppmi = Array.from({ length: V }, (_, i) => Array.from({ length: V }, (_, j) => {
    if (cooc[i][j] === 0 || rowSum[i] === 0 || rowSum[j] === 0) return 0;
    return Math.max(0, Math.log((cooc[i][j] * total) / (rowSum[i] * rowSum[j])));
  }));
  // Truncated SVD of the (symmetric) PPMI matrix = eigendecomposition; word
  // vector = top-d eigenvectors scaled by √λ.
  const eig = jacobiEigen(ppmi);
  const pairs = eig.eigenvalues.map((e, idx) => ({ e, vec: eig.eigenvectors[idx] })).sort((a, b) => b.e - a.e).slice(0, Math.min(nDims, V));
  const embeddings = vocab.map((word, i) => ({
    word,
    vector: pairs.map(p => +(p.vec[i] * Math.sqrt(Math.max(p.e, 0))).toFixed(4)),
  }));
  return { test: 'SVD Word Embeddings', embeddings, vocab, nDims, nVocab: V, nDocs: documents.length, apa: `SVD embeddings: ${V} words, ${nDims}-dim` };
}

// ── BM25 ─────────────────────────────────────────────────────────────────────
/** @param {string[]} documents */
export function bm25(documents, query, { k1 = 1.2, b = 0.75 } = {}) {
  if (!documents || documents.length < 2 || !query || typeof query !== 'string') return null;
  const tokDocs = documents.map(d => _tokenize(d, { minLen: 1 }));
  const qTokens = _tokenize(query, { minLen: 1 });
  if (!qTokens.length) return null;
  const D = tokDocs.length;
  const avgdl = avg(tokDocs.map(t => t.length));
  const df = {};
  tokDocs.forEach(tokens => {
    const seen = new Set(tokens);
    seen.forEach(t => { df[t] = (df[t] || 0) + 1; });
  });
  const scores = tokDocs.map((tokens, di) => {
    let score = 0;
    const dl = tokens.length;
    qTokens.forEach(qt => {
      const df_t = df[qt] || 0;
      if (!df_t) return;
      const idf = Math.log((D - df_t + 0.5) / (df_t + 0.5) + 1);
      const tf = tokens.filter(t => t === qt).length;
      const norm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (dl / (avgdl || 1))));
      score += idf * norm;
    });
    return { docIndex: di, score: +score.toFixed(4) };
  });
  scores.sort((a, b) => b.score - a.score);
  return { test: 'BM25', scores: scores.slice(0, 10), nDocs: D, queryLength: qTokens.length, apa: `BM25: ${D} docs, "${query.slice(0, 30)}"` };
}

// ── VADER Sentiment ─────────────────────────────────────────────────────────
export function sentimentVader(text) {
  if (!text || typeof text !== 'string') return null;
  const positive = new Set(['good', 'great', 'nice', 'excellent', 'happy', 'wonderful', 'fantastic', 'love', 'joy', 'beautiful', 'amazing', 'awesome', 'best', 'perfect']);
  const negative = new Set(['bad', 'terrible', 'awful', 'horrible', 'sad', 'angry', 'hate', 'worst', 'ugly', 'poor', 'disgusting', 'evil', 'wrong', 'fail']);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 1);
  let pos = 0, neg = 0;
  words.forEach(w => {
    if (positive.has(w)) pos++;
    if (negative.has(w)) neg++;
  });
  const N = Math.max(pos + neg, 1);
  const compound = +((pos - neg) / Math.sqrt(N + 1)).toFixed(4);
  const sentiment = compound > 0.05 ? 'positive' : compound < -0.05 ? 'negative' : 'neutral';
  return { test: 'VADER Sentiment', compound, pos: +pos.toFixed(4), neg: +neg.toFixed(4), words: words.length, sentiment, apa: `VADER: ${sentiment} (compound = ${compound.toFixed(3)})` };
}

// ── Perplexity ──────────────────────────────────────────────────────────────
export function perplexityScore(logProbs, nWords) {
  if (!logProbs || logProbs.length < 2 || !nWords || nWords < 2) return null;
  const avgLogLik = avg(logProbs);
  if (avgLogLik > 0) return null;
  const perplexity = Math.exp(-avgLogLik);
  return { test: 'Perplexity', perplexity: +perplexity.toFixed(4), avgLogLik: +avgLogLik.toFixed(4), nWords, apa: `Perplexity = ${perplexity.toFixed(2)} (n=${nWords})` };
}

// ── Text Preprocessing Pipeline ──────────────────────────────────────────────
/** @param {string[]} documents */
export function textPreprocess(documents, { lowercase = true, removePunct = true, stopwords = [], minLen = 2, stem = false } = {}) {
  if (!documents || !documents.length) return null;
  const simpleStem = (word) => {
    if (!stem) return word;
    if (word.endsWith('ing') && word.length > 5) return word.slice(0, -3);
    if (word.endsWith('ed') && word.length > 4) return word.slice(0, -2);
    if (word.endsWith('s') && word.length > 3) return word.slice(0, -1);
    return word;
  };
  const processed = documents.map(doc => {
    const tokens = _tokenize(doc, { stopwords, minLen });
    return tokens.map(simpleStem);
  });
  const vocab = [...new Set(processed.flat())];
  return { test: 'Text Preprocessing', nDocs: documents.length, nTokens: processed.flat().length, nVocab: vocab.length, processed: processed.slice(0, 3), apa: `Preprocessed: ${processed.flat().length} tokens, ${vocab.length} unique` };
}

// ── TextRank Keyword Extraction ───────────────────────────────────
/** @param {string[]} documents */
export function textRank(documents, { topN = 10, damping = 0.85 } = {}) {
  if (!documents || documents.length < 2) return null;
  const tokens = documents.flatMap(d => _tokenize(d, {}));
  const vocab = [...new Set(tokens)];
  if (vocab.length < 3) return null;
  const n = vocab.length;
  const cooc = Array.from({length: n}, () => Array(n).fill(0));
  for (const doc of documents) {
    const words = _tokenize(doc, {});
    for (let i = 0; i < words.length; i++) {
      for (let j = i + 1; j < Math.min(i + 4, words.length); j++) {
        const a = vocab.indexOf(words[i]), b = vocab.indexOf(words[j]);
        if (a >= 0 && b >= 0) { cooc[a][b]++; cooc[b][a]++; }
      }
    }
  }
  let scores = Array(n).fill(1 / n);
  for (let iter = 0; iter < 20; iter++) {
    const newScores = Array(n).fill((1 - damping) / n);
    for (let i = 0; i < n; i++) {
      const rowSum = cooc[i].reduce((s, v) => s + v, 0);
      if (rowSum > 0) {
        for (let j = 0; j < n; j++) {
          const colSum = cooc.reduce((s, r) => s + r[j], 0);
          if (colSum > 0 && cooc[i][j] > 0) newScores[i] += damping * scores[j] * cooc[i][j] / colSum;
        }
      }
    }
    scores = newScores;
  }
  const ranked = vocab.map((w, i) => ({ word: w, score: +scores[i].toFixed(4) })).sort((a, b) => b.score - a.score).slice(0, topN);
  return { test: 'TextRank', keywords: ranked, nDocs: documents.length, nVocab: n, apa: `TextRank: ${ranked.length} keywords` };
}

// ── TF-IDF Similarity Search ──────────────────────────────────────
/** @param {string[]} documents */
export function tfidfSimilaritySearch(documents, query, { topN = 3 } = {}) {
  if (!documents || documents.length < 2 || !query) return null;
  const tfidfRes = tfIdf(documents, {});
  if (!tfidfRes) return null;
  const queryTokens = _tokenize(query, {});
  const queryVec = tfidfRes.vocab.map(term => queryTokens.filter(t => t === term).length);
  const docScores = documents.map((_, di) => {
    const docVec = [...Array(tfidfRes.vocab.length)].map((_, vi) => {
      const entry = tfidfRes.tfidf.find(e => e.docIndex === di && e.term === tfidfRes.vocab[vi]);
      return entry ? entry.weight : 0;
    });
    let dot = 0, n1 = 0, n2 = 0;
    for (let i = 0; i < docVec.length; i++) {
      dot += docVec[i] * queryVec[i];
      n1 += docVec[i] * docVec[i];
      n2 += queryVec[i] * queryVec[i];
    }
    const sim = Math.sqrt(n1 * n2) > 0 ? dot / Math.sqrt(n1 * n2) : 0;
    return { docIndex: di, similarity: +sim.toFixed(4) };
  });
  const top = docScores.sort((a, b) => b.similarity - a.similarity).slice(0, topN);
  return { test: 'TF-IDF Similarity Search', results: top, nDocs: documents.length, apa: `TF-IDF search: ${topN} results` };
}
