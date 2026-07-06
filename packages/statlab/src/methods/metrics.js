import { avg } from '../math/core.js';

// ── PSNR ──────────────────────────────────────────────────────────
export function psnr(img1, img2, { maxVal = 255 } = {}) {
  if (!img1 || !img2 || img1.length !== img2.length || !img1.length) return null;
  const n = img1.length;
  let mse = 0;
  for (let i = 0; i < n; i++) mse += (img1[i] - img2[i]) ** 2;
  mse /= n;
  const psnrVal = 10 * Math.log10(maxVal * maxVal / Math.max(mse, 1e-10));
  return { test: 'PSNR', psnr: +psnrVal.toFixed(2), maxVal, n, apa: `PSNR = ${psnrVal.toFixed(1)} dB` };
}

// ── SSIM ──────────────────────────────────────────────────────────
export function ssim(img1, img2, { L = 255, k1 = 0.01, k2 = 0.03 } = {}) {
  if (!img1 || !img2 || img1.length !== img2.length || !img1.length) return null;
  const n = img1.length;
  const muX = avg(img1), muY = avg(img2);
  const sigX2 = img1.reduce((s, v) => s + (v - muX) ** 2, 0) / n;
  const sigY2 = img2.reduce((s, v) => s + (v - muY) ** 2, 0) / n;
  let sigXY = 0;
  for (let i = 0; i < n; i++) sigXY += (img1[i] - muX) * (img2[i] - muY);
  sigXY /= n;
  const c1 = (k1 * L) ** 2, c2 = (k2 * L) ** 2;
  const ssimVal = ((2 * muX * muY + c1) * (2 * sigXY + c2)) / ((muX * muX + muY * muY + c1) * (sigX2 + sigY2 + c2));
  return { test: 'SSIM', ssim: +ssimVal.toFixed(4), n, apa: `SSIM = ${ssimVal.toFixed(4)}` };
}

// ── IoU ───────────────────────────────────────────────────────────
export function iou(box1, box2) {
  if (!box1 || !box2 || box1.length < 4 || box2.length < 4) return null;
  const x1 = Math.max(box1[0], box2[0]), y1 = Math.max(box1[1], box2[1]);
  const x2 = Math.min(box1[2], box2[2]), y2 = Math.min(box1[3], box2[3]);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const area1 = (box1[2] - box1[0]) * (box1[3] - box1[1]);
  const area2 = (box2[2] - box2[0]) * (box2[3] - box2[1]);
  const union = area1 + area2 - inter;
  return { test: 'IoU', iou: +(inter / Math.max(union, 1)).toFixed(4), apa: `IoU = ${(inter / Math.max(union, 1)).toFixed(4)}` };
}

// ── BLEU Score ────────────────────────────────────────────────────
export function bleuScore(candidate, references, { n = 4 } = {}) {
  if (!candidate || !references || !candidate.length || !references.length) return null;
  const cand = Array.isArray(candidate) ? candidate : candidate.toLowerCase().split(/\s+/);
  const refs = references.map(r => Array.isArray(r) ? r : r.toLowerCase().split(/\s+/));
  let prec = 1;
  for (let g = 1; g <= n; g++) {
    let count = 0, total = Math.max(0, cand.length - g + 1);
    for (let i = 0; i < total; i++) {
      const ngram = cand.slice(i, i + g).join(' ');
      const match = refs.some(r => {
        for (let j = 0; j <= r.length - g; j++) if (r.slice(j, j + g).join(' ') === ngram) return true;
        return false;
      });
      if (match) count++;
    }
    prec *= total > 0 ? count / total : 0;
  }
  const bp = Math.exp(Math.min(0, 1 - refs[0].length / cand.length));
  const bleu = bp * Math.pow(prec, 1 / n);
  return { test: 'BLEU', bleu: +bleu.toFixed(4), n, apa: `BLEU = ${bleu.toFixed(4)}` };
}

// ── ROUGE-L ───────────────────────────────────────────────────────
export function rougeL(candidate, reference) {
  if (!candidate || !reference) return null;
  const cand = Array.isArray(candidate) ? candidate : String(candidate).toLowerCase().split(/\s+/);
  const ref = Array.isArray(reference) ? reference : String(reference).toLowerCase().split(/\s+/);
  const m = cand.length, n2 = ref.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n2 + 1).fill(0));
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n2; j++) {
    dp[i][j] = cand[i - 1] === ref[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  }
  const lcs = dp[m][n2];
  const prec = lcs / Math.max(m, 1), rec = lcs / Math.max(n2, 1);
  const f1 = prec + rec > 0 ? 2 * prec * rec / (prec + rec) : 0;
  return { test: 'ROUGE-L', precision: +prec.toFixed(4), recall: +rec.toFixed(4), f1: +f1.toFixed(4), apa: `ROUGE-L F1 = ${f1.toFixed(4)}` };
}

// ── Perplexity ────────────────────────────────────────────────────
export function perplexity(logLik, nTokens) {
  if (!Number.isFinite(logLik) || !nTokens || nTokens < 1) return null;
  const ppl = Math.exp(-logLik / nTokens);
  return { test: 'Perplexity', perplexity: +ppl.toFixed(2), logLik: +logLik.toFixed(4), nTokens, apa: `Perplexity = ${ppl.toFixed(1)}` };
}

// ── Matthews Correlation Coefficient ──────────────────────────────
/** @param {Function} fn @param {number} tp @param {number} fp @param {number} tn */
export function matthewsCorrelation(tp, fp, tn, fn) {
  if (tp == null || fp == null || tn == null || fn == null) return null;
  const num = tp * tn - fp * fn;
  const denom = Math.sqrt(Math.max((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn), 1));
  const mcc = denom > 0 ? num / denom : 0;
  const label = Math.abs(mcc) > 0.7 ? 'strong' : Math.abs(mcc) > 0.3 ? 'moderate' : 'weak';
  return { test: 'Matthews Correlation', mcc: +mcc.toFixed(4), label, tp, fp, tn, fn, apa: `MCC = ${mcc.toFixed(3)} (${label})` };
}

// ── Precision-Recall Curve ────────────────────────────────────────
/** @param {number[]} scores @param {number[]} labels */
export function precisionRecallCurve(scores, labels, { nThresholds = 10 } = {}) {
  if (!scores || !labels || scores.length < 5 || scores.length !== labels.length) return null;
  const n = scores.length;
  const sorted = scores.map((s, i) => ({ s, l: labels[i] })).sort((a, b) => b.s - a.s);
  const thresholds = Array.from({ length: nThresholds }, (_, i) => sorted[Math.floor(i * n / nThresholds)]?.s || 0);
  const curve = thresholds.map(t => {
    const pred = scores.map(s => s >= t ? 1 : 0);
    let tp = 0, fp = 0, fn = 0;
    for (let i = 0; i < n; i++) {
      if (labels[i] === 1 && pred[i] === 1) tp++;
      else if (labels[i] === 0 && pred[i] === 1) fp++;
      else if (labels[i] === 1 && pred[i] === 0) fn++;
    }
    const prec = tp + fp > 0 ? tp / (tp + fp) : 0;
    const rec = tp + fn > 0 ? tp / (tp + fn) : 0;
    return { threshold: +t.toFixed(4), precision: +prec.toFixed(4), recall: +rec.toFixed(4) };
  });
  const avgPrec = avg(curve.map(c => c.precision));
  return { test: 'Precision-Recall Curve', curve, averagePrecision: +avgPrec.toFixed(4), n, apa: `PR curve: AP = ${avgPrec.toFixed(3)}` };
}
