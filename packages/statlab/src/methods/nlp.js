import { avg } from '../math/core.js';
import { mulberry32 } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── Word2Vec Skip-Gram (simplified) ───────────────────────────────
export function word2vecSkipGram(corpus, { seed = 42, vecSize = 10, windowSize = 2, epochs = 10, lr = 0.01 } = {}) {
  __rng = mulberry32(seed);
  if (!corpus || corpus.length < 3) return null;
  const words = corpus.join(' ').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 1);
  const vocab = [...new Set(words)];
  if (vocab.length < 5) return null;
  const V = vocab.length;
  const word2idx = {}; vocab.forEach((w, i) => { word2idx[w] = i; });
  const tokens = words.map(w => word2idx[w]);
  // Skip-gram with negative sampling: input (W1) and output (W2) embeddings,
  // trained so observed (centre, context) pairs score high and sampled
  // negatives score low (binary logistic objective).
  const W1 = Array.from({ length: V }, () => Array.from({ length: vecSize }, () => (__rng() - 0.5) / vecSize));
  const W2 = Array.from({ length: V }, () => Array(vecSize).fill(0));
  const freq = Array(V).fill(0); tokens.forEach(t => { freq[t]++; });
  const negTable = []; for (let i = 0; i < V; i++) { const c = Math.max(1, Math.round(Math.pow(freq[i], 0.75) * 10)); for (let r = 0; r < c; r++) negTable.push(i); }
  const sigmoid = z => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));
  const nNeg = 5;
  for (let e = 0; e < epochs; e++) {
    for (let i = 0; i < tokens.length; i++) {
      const c = tokens[i];
      const lo = Math.max(0, i - windowSize), hi = Math.min(tokens.length - 1, i + windowSize);
      for (let j = lo; j <= hi; j++) {
        if (j === i) continue;
        const o = tokens[j];
        const targets = [[o, 1]];
        for (let s = 0; s < nNeg; s++) { const neg = negTable[Math.floor(__rng() * negTable.length)]; if (neg !== o) targets.push([neg, 0]); }
        const grad1 = Array(vecSize).fill(0);
        for (const [t, label] of targets) {
          let dot = 0; for (let k = 0; k < vecSize; k++) dot += W1[c][k] * W2[t][k];
          const g = lr * (label - sigmoid(dot));
          for (let k = 0; k < vecSize; k++) { grad1[k] += g * W2[t][k]; W2[t][k] += g * W1[c][k]; }
        }
        for (let k = 0; k < vecSize; k++) W1[c][k] += grad1[k];
      }
    }
  }
  const embeddings = W1.map(row => row.map(v => +v.toFixed(4)));
  return { test: 'Word2Vec', embeddings, vocab, vecSize, vocabSize: V, apa: `Word2Vec: ${V} words, ${vecSize}-dim` };
}

// ── GloVe Embeddings (simplified co-occurrence) ───────────────────
export function gloveEmbeddings(corpus, { seed = 42, vecSize = 10, windowSize = 3, epochs = 10 } = {}) {
  __rng = mulberry32(seed);
  if (!corpus || corpus.length < 3) return null;
  const words = corpus.join(' ').toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 1);
  const vocab = [...new Set(words)];
  if (vocab.length < 5) return null;
  const V = vocab.length;
  const word2idx = {}; vocab.forEach((w, i) => { word2idx[w] = i; });
  const cooc = Array.from({length: V}, () => Array(V).fill(0));
  const tokens = words.map(w => word2idx[w]);
  for (let i = 0; i < tokens.length; i++) {
    for (let j = Math.max(0, i - windowSize); j <= Math.min(tokens.length - 1, i + windowSize); j++) {
      if (i !== j) cooc[tokens[i]][tokens[j]]++;
    }
  }
  // GloVe: factorise the log co-occurrence with the weighting f(X_ij)=min(1,(X/xmax)^0.75),
  // fitting w_iᵀw̃_j + b_i + b̃_j ≈ log X_ij by SGD.
  const lr = 0.05, xmax = 10;
  const W = Array.from({ length: V }, () => Array.from({ length: vecSize }, () => (__rng() - 0.5) / vecSize));
  const Wc = Array.from({ length: V }, () => Array.from({ length: vecSize }, () => (__rng() - 0.5) / vecSize));
  const b = Array(V).fill(0), bc = Array(V).fill(0);
  const pairs = [];
  for (let i = 0; i < V; i++) for (let j = 0; j < V; j++) if (cooc[i][j] > 0) pairs.push([i, j, cooc[i][j]]);
  for (let e = 0; e < epochs; e++) {
    for (const [i, j, x] of pairs) {
      const fw = x < xmax ? Math.pow(x / xmax, 0.75) : 1;
      let dot = b[i] + bc[j]; for (let k = 0; k < vecSize; k++) dot += W[i][k] * Wc[j][k];
      const diff = dot - Math.log(x);
      const g = fw * diff * lr;
      for (let k = 0; k < vecSize; k++) { const wi = W[i][k]; W[i][k] -= g * Wc[j][k]; Wc[j][k] -= g * wi; }
      b[i] -= g; bc[j] -= g;
    }
  }
  const embeddings = W.map((row, i) => row.map((v, k) => +(v + Wc[i][k]).toFixed(4))); // GloVe uses W + W̃
  return { test: 'GloVe', embeddings, vocab, vecSize, vocabSize: V, apa: `GloVe: ${V} words, ${vecSize}-dim` };
}

// ── Named Entity Recognition (regex-based) ────────────────────────
export function namedEntityRecognition(text) {
  if (!text || typeof text !== 'string') return null;
  const entities = [];
  const personMatch = text.match(/\b(?:Mr|Mrs|Ms|Dr|Prof)\.?\s+[A-Z][a-z]+/g);
  if (personMatch) personMatch.forEach(p => entities.push({ text: p, type: 'PERSON' }));
  const orgMatch = text.match(/\b(?:Inc|Corp|LLC|Ltd|University|Institute)\b/g);
  if (orgMatch) orgMatch.forEach(o => { if (!entities.some(e => e.text === o)) entities.push({ text: o, type: 'ORG' }); });
  const dateMatch = text.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g);
  if (dateMatch) dateMatch.forEach(d => entities.push({ text: d, type: 'DATE' }));
  return { test: 'Named Entity Recognition', entities, nTokens: text.split(/\s+/).length, apa: `NER: ${entities.length} entities found` };
}

// ── POS Tagging (simplified suffix-based) ─────────────────────────
export function posTagging(text) {
  if (!text || typeof text !== 'string') return null;
  const tokens = text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 0);
  const tagged = tokens.map(t => {
    if (t.endsWith('ing')) return { token: t, pos: 'VBG' };
    if (t.endsWith('ed')) return { token: t, pos: 'VBD' };
    if (t.endsWith('ly')) return { token: t, pos: 'RB' };
    if (t.endsWith('tion') || t.endsWith('ment') || t.endsWith('ness')) return { token: t, pos: 'NN' };
    if (['the','a','an'].includes(t)) return { token: t, pos: 'DT' };
    if (['is','am','are','was','were','be'].includes(t)) return { token: t, pos: 'VB' };
    return { token: t, pos: 'NN' };
  });
  return { test: 'POS Tagging', tagged: tagged.slice(0, 20), nTokens: tagged.length, apa: `POS: ${tagged.length} tokens` };
}

// ── Dependency Parse (simplified) ─────────────────────────────────
export function dependencyParse(text) {
  if (!text || typeof text !== 'string') return null;
  const tokens = text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 0);
  const n = tokens.length;
  if (!n) return { test: 'Dependency Parse', deps: [], root: null, nTokens: 0, apa: 'Dep parse: 0 dependencies' };
  // Lexicon-based POS tagging (small closed-class lists + light morphology).
  const DT = new Set(['the', 'a', 'an', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their']);
  const IN = new Set(['in', 'on', 'at', 'by', 'for', 'with', 'from', 'of', 'over', 'under', 'into', 'to', 'about']);
  const PRP = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they', 'him', 'them', 'us', 'me']);
  const COP = new Set(['is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'do', 'does', 'did', 'has', 'have', 'had', 'will', 'can', 'could', 'would', 'should', 'may', 'might']);
  const VERBS = new Set(['chase', 'chased', 'chases', 'run', 'ran', 'runs', 'sit', 'sat', 'sits', 'eat', 'ate', 'eats', 'see', 'saw', 'sees', 'like', 'likes', 'liked', 'love', 'loves', 'loved', 'make', 'made', 'go', 'goes', 'went', 'come', 'came', 'play', 'plays', 'played', 'jump', 'jumps', 'jumped', 'walk', 'walks', 'walked', 'drive', 'drives', 'drove', 'read', 'reads', 'write', 'wrote', 'give', 'gave', 'take', 'took', 'find', 'found', 'know', 'knew', 'think', 'thought', 'say', 'said', 'tell', 'told']);
  const JJ = new Set(['big', 'small', 'red', 'blue', 'green', 'fast', 'slow', 'good', 'bad', 'happy', 'sad', 'old', 'new', 'tall', 'short', 'hot', 'cold', 'quick', 'lazy', 'brown', 'black', 'white']);
  const tag = t => {
    if (DT.has(t)) return 'DT';
    if (IN.has(t)) return 'IN';
    if (PRP.has(t)) return 'PRP';
    if (COP.has(t)) return 'VB';
    if (VERBS.has(t)) return 'VB';
    if (JJ.has(t)) return 'JJ';
    if (t.endsWith('ing')) return 'VBG';
    if (t.endsWith('ly')) return 'RB';
    if (t.endsWith('ed')) return 'VBD';
    return 'NN';
  };
  const pos = tokens.map(tag);
  const isVerb = p => p === 'VB' || p === 'VBD' || p === 'VBG';
  const isNoun = p => p === 'NN' || p === 'PRP';
  // Root = first finite verb (fallback: last token).
  let root = pos.findIndex(isVerb);
  if (root < 0) root = n - 1;
  const nextNoun = i => { for (let j = i + 1; j < n; j++) if (isNoun(pos[j])) return j; for (let j = i - 1; j >= 0; j--) if (isNoun(pos[j])) return j; return root; };
  const deps = [];
  for (let i = 0; i < n; i++) {
    if (i === root) { deps.push({ dep: tokens[i], head: 'ROOT', relation: 'root', headIdx: -1, idx: i }); continue; }
    let headIdx, relation;
    const p = pos[i];
    if (p === 'DT') { headIdx = nextNoun(i); relation = 'det'; }
    else if (p === 'JJ') { headIdx = nextNoun(i); relation = 'amod'; }
    else if (p === 'RB') { headIdx = root; relation = 'advmod'; }
    else if (p === 'IN') { headIdx = root; relation = 'prep'; }
    else if (isNoun(p)) {
      // noun governed by a preceding preposition (skipping DT/JJ) → object of preposition
      let prep = -1; for (let j = i - 1; j >= 0; j--) { if (pos[j] === 'DT' || pos[j] === 'JJ') continue; if (pos[j] === 'IN') prep = j; break; }
      if (prep >= 0) { headIdx = prep; relation = 'pobj'; }
      else if (i < root) { headIdx = root; relation = 'nsubj'; }
      else { headIdx = root; relation = 'dobj'; }
    } else { headIdx = root; relation = isVerb(p) ? 'conj' : 'dep'; }
    deps.push({ dep: tokens[i], head: tokens[headIdx], relation, headIdx, idx: i });
  }
  return { test: 'Dependency Parse', deps, root: tokens[root], nTokens: n, apa: `Dep parse: ${deps.length} dependencies, root="${tokens[root]}"` };
}
