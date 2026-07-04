import { avg, sampleVar } from '../math/core.js';

// ── Enrichment Analysis (hypergeometric) ──────────────────────────
export function enrichmentAnalysis(geneset, background, pathwaySize, overlap, totalGenes = null) {
  const total = totalGenes || Math.max(background, geneset * 10);
  if (!overlap || overlap < 1) return null;
  if (pathwaySize < overlap || overlap > geneset || pathwaySize - overlap > total - geneset) return null;
  let pval = 0;
  for (let k = overlap; k <= Math.min(geneset, pathwaySize); k++) {
    let comb1 = 1, comb2 = 1, comb3 = 1;
    for (let i = 1; i <= k; i++) { comb1 *= (pathwaySize - k + i) / i; }
    for (let i = 1; i <= geneset - k; i++) { comb2 *= (total - pathwaySize - geneset + k + i) / i; }
    for (let i = 1; i <= geneset; i++) { comb3 *= (total - geneset + i) / i; }
    pval += comb1 * comb2 / Math.max(comb3, 1);
  }
  const oddsRatio = (overlap * (total - pathwaySize - geneset + overlap)) / Math.max((geneset - overlap) * (pathwaySize - overlap), 1);
  return { test: 'Enrichment Analysis', pValue: +Math.min(pval, 1).toFixed(6), oddsRatio: +oddsRatio.toFixed(4), overlap, pathwaySize, geneset, total, apa: `ORA: p=${Math.min(pval, 1).toFixed(4)}, OR=${oddsRatio.toFixed(2)}` };
}

// ── Volcano Test ──────────────────────────────────────────────────
export function volcanoTest(logFC, pValues, names = null) {
  if (!logFC || !pValues || logFC.length < 3 || logFC.length !== pValues.length) return null;
  const n = logFC.length;
  const results = logFC.map((fc, i) => ({
    name: names ? names[i] : `Gene${i+1}`,
    logFC: +fc.toFixed(4),
    negLog10P: +( -Math.log10(Math.max(pValues[i], 1e-16))).toFixed(4),
    significant: pValues[i] < 0.05 && Math.abs(fc) > 1,
  }));
  return { test: 'Volcano Test', results: results.slice(0, 20), nSig: results.filter(r => r.significant).length, n, apa: `Volcano: ${results.filter(r => r.significant).length}/${n} sig` };
}

// ── Fold Change ───────────────────────────────────────────────────
export function foldChange(groupA, groupB) {
  if (!groupA || !groupB || groupA.length < 3 || groupB.length < 3) return null;
  const mA = avg(groupA), mB = avg(groupB);
  const fc = mB > 0 ? mA / mB : (mA - mB);
  const log2FC = mB > 0 ? Math.log2(Math.max(fc, 0.01)) : Math.log2(Math.max(Math.abs(mA - mB), 0.01));
  const se = Math.sqrt(sampleVar(groupA) / groupA.length + sampleVar(groupB) / groupB.length);
  const tStat = se > 0 ? (mA - mB) / se : 0;
  return { test: 'Fold Change', fc: +fc.toFixed(4), log2FC: +log2FC.toFixed(4), tStat: +tStat.toFixed(4), nA: groupA.length, nB: groupB.length, apa: `FC: ${fc.toFixed(2)} (log2=${log2FC.toFixed(2)})` };
}

// ── FDR Correction (Benjamini-Hochberg) ───────────────────────────
export function fdrCorrection(pValues, alpha = 0.05) {
  if (!pValues || pValues.length < 2) return null;
  const n = pValues.length;
  const sorted = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  const thresholds = sorted.map((s, rank) => ({ ...s, rank: rank + 1, threshold: alpha * (rank + 1) / n }));
  // Standard Benjamini-Hochberg step-up: find the LARGEST rank whose p-value
  // crosses its threshold, then everything at or below that rank is significant
  // (not just the ranks that individually cross their own threshold).
  let maxCrossingRank = 0;
  for (const t of thresholds) if (t.p <= t.threshold) maxCrossingRank = t.rank;
  const sigCount = maxCrossingRank;
  return { test: 'FDR Correction', nTotal: n, nSig: sigCount, fdr: +(sigCount / n).toFixed(4), alpha, apa: `FDR: ${sigCount}/${n} sig at ${alpha}` };
}

// ── Heatmap Data ──────────────────────────────────────────────────
export function heatmapData(matrix, rowNames = null, colNames = null) {
  if (!matrix || !matrix.length || !matrix[0]) return null;
  const h = matrix.length, w = matrix[0].length;
  const scaled = matrix.map(row => {
    const m = avg(row);
    const s = Math.sqrt(sampleVar(row) || 1);
    return row.map(v => +((v - m) / s).toFixed(4));
  });
  return { test: 'Heatmap Data', data: scaled.slice(0, 20).map(r => r.slice(0, 10)), h, w, apa: `Heatmap: ${h}x${w}` };
}
