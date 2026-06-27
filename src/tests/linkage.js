import { avg } from '../math/core.js';

// ── Jaro-Winkler Similarity ──────────────────────────────────────────────
export function jaroWinkler(s1, s2, { prefixWeight = 0.1 } = {}) {
  if (!s1 || !s2) return null;
  if (s1 === s2) return { test: 'Jaro-Winkler', similarity: 1, n1: s1.length, n2: s2.length, apa: `JW = 1.000` };
  const len1 = s1.length, len2 = s2.length;
  const matchDist = Math.floor(Math.max(len1, len2) / 2) - 1;
  const m1 = Array(len1).fill(false), m2 = Array(len2).fill(false);
  let m = 0;
  for (let i = 0; i < len1; i++) {
    const lo = Math.max(0, i - matchDist), hi = Math.min(len2 - 1, i + matchDist);
    for (let j = lo; j <= hi; j++) {
      if (!m2[j] && s1[i] === s2[j]) { m1[i] = m2[j] = true; m++; break; }
    }
  }
  if (!m) return { test: 'Jaro-Winkler', similarity: 0, n1: len1, n2: len2, apa: 'JW = 0.000' };
  let t = 0; let k = 0;
  for (let i = 0; i < len1; i++) {
    if (m1[i]) { while (!m2[k]) k++; if (s1[i] !== s2[k]) t++; k++; }
  }
  t /= 2;
  const jaro = (m / len1 + m / len2 + (m - t) / m) / 3;
  let pref = 0;
  for (let i = 0; i < Math.min(4, len1, len2); i++) { if (s1[i] === s2[i]) pref++; else break; }
  const jw = jaro + pref * prefixWeight * (1 - jaro);
  return { test: 'Jaro-Winkler', similarity: +jw.toFixed(4), n1: len1, n2: len2, apa: `JW = ${jw.toFixed(3)}` };
}

// ── Levenshtein Distance ──────────────────────────────────────────────────
export function levenshteinDistance(s1, s2) {
  if (s1 == null || s2 == null) return null;
  const m = s1.length, n = s2.length;
  const d = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (s1[i - 1] === s2[j - 1] ? 0 : 1));
    }
  }
  const sim = 1 - d[m][n] / Math.max(m, n, 1);
  return { test: 'Levenshtein Distance', distance: d[m][n], similarity: +sim.toFixed(4), n1: m, n2: n, apa: `Levenshtein = ${d[m][n]}, sim = ${sim.toFixed(2)}` };
}

// ── Fellegi-Sunter Probabilistic Matching ─────────────────────────────────
export function fellegiSunter(pairs, { uProb = 0.3, mProb = 0.9 } = {}) {
  if (!pairs || !pairs.length) return null;
  const n = pairs.length;
  const matches = pairs.map(p => {
    const agree = p.agree || 0;
    const disagree = (p.compared || 1) - agree;
    const ratio = Math.pow(mProb, agree) * Math.pow(1 - mProb, disagree) / (Math.pow(uProb, agree) * Math.pow(1 - uProb, disagree));
    return { id: p.id || p.i, ratio: +ratio.toFixed(4), match: ratio > 1 ? 'match' : 'non-match' };
  });
  return { test: 'Fellegi-Sunter', matches, n, nMatches: matches.filter(m => m.match === 'match').length, apa: `FS: ${matches.filter(m => m.match === 'match').length}/${n} matches` };
}

// ── Record Blocking ───────────────────────────────────────────────────────
export function recordBlocking(data, blockVar, { blockSize = 100 } = {}) {
  if (!data || !blockVar || !data.length) return null;
  const blocks = {};
  data.forEach((r, i) => {
    const key = r[blockVar];
    if (!blocks[key]) blocks[key] = [];
    blocks[key].push(i);
  });
  const blockList = Object.entries(blocks).map(([k, v]) => ({ block: k, n: v.length })).sort((a, b) => b.n - a.n);
  return { test: 'Record Blocking', nBlocks: blockList.length, blockSizes: blockList.slice(0, 10), n: data.length, apa: `Blocking: ${blockList.length} blocks, n = ${data.length}` };
}

// ── Match Threshold ────────────────────────────────────────────────────────
export function matchThreshold(scores, labels, { nThresholds = 20 } = {}) {
  if (!scores || !labels || scores.length !== labels.length) return null;
  const n = scores.length;
  const min = Math.min(...scores), max = Math.max(...scores);
  const thresholds = [];
  for (let i = 0; i < nThresholds; i++) {
    const t = min + (i + 1) * (max - min) / (nThresholds + 1);
    let tp = 0, fp = 0, tn = 0, fn = 0;
    for (let j = 0; j < n; j++) {
      const pred = scores[j] >= t ? 1 : 0;
      if (pred === 1 && labels[j] === 1) tp++;
      else if (pred === 1 && labels[j] === 0) fp++;
      else if (pred === 0 && labels[j] === 0) tn++;
      else fn++;
    }
    const sens = tp / Math.max(tp + fn, 1);
    const spec = tn / Math.max(tn + fp, 1);
    thresholds.push({ threshold: +t.toFixed(4), sens: +sens.toFixed(4), spec: +spec.toFixed(4), f1: +((2 * tp) / Math.max(2 * tp + fp + fn, 1)).toFixed(4) });
  }
  return { test: 'Match Threshold', thresholds, n, apa: `Threshold: ${nThresholds} candidates` };
}

// ── Probabilistic Record Linkage (Fellegi-Sunter) ─────────────────
export function probabilisticRecordLinkage(pairs, matchWeights) {
  if (!pairs || !pairs.length) return null;
  const n = pairs.length;
  const results = pairs.map((pair, i) => {
    const weights = Array.isArray(matchWeights) ? matchWeights[i] || 0 : 0.5;
    const prob = 1 / (1 + Math.exp(-weights));
    const match = prob > 0.5;
    return { pair: i + 1, prob: +prob.toFixed(4), match };
  });
  const nMatches = results.filter(r => r.match).length;
  return { test: 'Probabilistic Record Linkage', matches: nMatches, total: n, matchRate: +(nMatches / n).toFixed(4), apa: `PRL: ${nMatches}/${n} matched` };
}

// ── Deduplication ─────────────────────────────────────────────────
export function deduplication(records, keyFields) {
  if (!records || records.length < 2 || !keyFields || !keyFields.length) return null;
  const seen = new Map();
  const duplicates = [];
  records.forEach((r, i) => {
    const key = keyFields.map(f => r[f]).join('|');
    if (seen.has(key)) {
      duplicates.push({ original: seen.get(key), duplicate: i });
    } else {
      seen.set(key, i);
    }
  });
  return { test: 'Deduplication', nOriginal: records.length - duplicates.length, nDuplicates: duplicates.length, duplicates: duplicates.slice(0, 10), apa: `Dedup: ${duplicates.length} duplicates removed` };
}
