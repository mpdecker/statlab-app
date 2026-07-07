import { describe, it, expect } from 'vitest';
import { psnr, ssim, iou, bleuScore, rougeL, perplexity, matthewsCorrelation, precisionRecallCurve } from './metrics.js';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const a = [10, 20, 10, 20, 10, 20, 10, 20];
const b = [11, 19, 9, 21, 12, 18, 8, 22];

describe('psnr', () => { it('contract keys', () => expectKeys(psnr(a, b), ['test','psnr','maxVal','n','apa'])); it('null mismatch', () => expect(psnr([1,2],[1])).toBeNull()); it('psnr positive', () => { const r = psnr(a, b); if (r) expect(r.psnr).toBeGreaterThan(0); });   it('identical signals give infinite psnr', () => { const r = psnr(a, a); if (r) expect(r.psnr).toBeGreaterThan(140); }) });
describe('ssim', () => { it('contract keys', () => expectKeys(ssim(a, b), ['test','ssim','n','apa'])); it('SSIM in [0,1]', () => { const r = ssim(a, b); expect(r.ssim).toBeGreaterThanOrEqual(0); expect(r.ssim).toBeLessThanOrEqual(1) }); it('ssim between -1 and 1', () => { const r = ssim(a, b); expect(r.ssim).toBeGreaterThanOrEqual(-1); expect(r.ssim).toBeLessThanOrEqual(1); }); it('ssim=1 for identical', () => { const r = ssim(a, a); expect(r.ssim).toBeCloseTo(1, 0); }) });
describe('iou', () => { it('contract keys', () => expectKeys(iou([0,0,2,2],[1,1,3,3]), ['test','iou','apa'])); it('IoU > 0 for overlapping', () => { const r = iou([0,0,2,2],[1,1,3,3]); expect(r.iou).toBeGreaterThan(0) }); it('IoU between 0 and 1', () => { const r = iou([0,0,2,2],[1,1,3,3]); expect(r.iou).toBeGreaterThanOrEqual(0); expect(r.iou).toBeLessThanOrEqual(1); }) });
describe('bleuScore', () => { it('contract keys', () => expectKeys(bleuScore('the cat sat on mat', ['the cat sat on the mat']), ['test','bleu','n','apa'])); it('null empty', () => expect(bleuScore([], ['test'])).toBeNull()); it('bleu between 0 and 1', () => { const r = bleuScore('the cat sat on mat', ['the cat sat on the mat']); if (r) { expect(r.bleu).toBeGreaterThanOrEqual(0); expect(r.bleu).toBeLessThanOrEqual(1); } }) });
describe('rougeL', () => { it('contract keys', () => expectKeys(rougeL('cat sat mat', 'the cat sat on the mat'), ['test','precision','recall','f1','apa'])); it('precision between 0 and 1', () => { const r = rougeL('cat sat mat', 'the cat sat on the mat'); expect(r.precision).toBeGreaterThanOrEqual(0); expect(r.precision).toBeLessThanOrEqual(1); }); it('f1 between 0 and 1', () => { const r = rougeL('cat sat mat', 'the cat sat on the mat'); expect(r.f1).toBeGreaterThanOrEqual(0); expect(r.f1).toBeLessThanOrEqual(1); }); it('rougeL between 0-1', () => { const r = rougeL('cat sat mat', 'the cat sat on the mat'); expect(r.f1).toBeGreaterThanOrEqual(0); expect(r.f1).toBeLessThanOrEqual(1); expect(r.precision).toBeGreaterThanOrEqual(0); expect(r.precision).toBeLessThanOrEqual(1); expect(r.recall).toBeGreaterThanOrEqual(0); expect(r.recall).toBeLessThanOrEqual(1); }) });
describe('perplexity', () => { it('contract keys', () => expectKeys(perplexity(-50, 10), ['test','perplexity','logLik','nTokens','apa'])); it('perplexity > 0', () => { const r = perplexity(-50, 10); expect(r.perplexity).toBeGreaterThan(0) }); it('perplexity >= 1', () => { const r = perplexity(-50, 10); expect(r.perplexity).toBeGreaterThanOrEqual(1); }); it('logLik negative', () => { const r = perplexity(-50, 10); expect(r.logLik).toBeLessThan(0); }) });
describe('matthewsCorrelation', () => {
  it('contract keys', () => expectKeys(matthewsCorrelation(50, 10, 30, 10), ['test','mcc','label','tp','fp','tn','fn','apa']));
  it('null invalid', () => expect(matthewsCorrelation(null, 10, 30, 10)).toBeNull());
  it('perfect classifier mcc=1', () => { const r = matthewsCorrelation(50, 0, 30, 0); expect(r.mcc).toBeCloseTo(1, 0); });
  it('mcc between -1 and 1', () => { const r = matthewsCorrelation(50, 10, 30, 10); expect(r.mcc).toBeGreaterThanOrEqual(-1); expect(r.mcc).toBeLessThanOrEqual(1); });
});
describe('precisionRecallCurve', () => {
  const scores = [0.9,0.8,0.3,0.6,0.95,0.1,0.7,0.4,0.85,0.2];
  const labels = [1,1,0,0,1,0,1,0,1,0];
  it('contract keys', () => expectKeys(precisionRecallCurve(scores, labels), ['test','curve','averagePrecision','n','apa']));
  it('null <5', () => expect(precisionRecallCurve([0.5,0.6], [0,1])).toBeNull());
  it('curve array non-empty', () => { const r = precisionRecallCurve(scores, labels); if (r) { expect(Array.isArray(r.curve)).toBe(true); expect(r.curve.length).toBeGreaterThan(0); } });
  it('averagePrecision between 0 and 1', () => { const r = precisionRecallCurve(scores, labels); if (r) { expect(r.averagePrecision).toBeGreaterThanOrEqual(0); expect(r.averagePrecision).toBeLessThanOrEqual(1); } });
});

describe('matthewsCorrelation matches sklearn.metrics.matthews_corrcoef exactly', () => {
  it('matches across a normal and a zero-TP confusion matrix', () => {
    ref.metrics.mcc_basic.forEach(e => {
      const r = matthewsCorrelation(e.tp, e.fp, e.tn, e.fn);
      expect(r.mcc).toBeCloseTo(e.mcc, 4);
    });
  });
});

describe('psnr matches the independent MSE-based dB formula exactly', () => {
  it('matches on a 15-value signal pair', () => {
    const e = ref.metrics.psnr_basic;
    const r = psnr(e.img1, e.img2);
    expect(r.psnr).toBeCloseTo(e.psnr, 2);
  });
});

describe('iou matches the independent box-intersection formula exactly', () => {
  it('matches for partial overlap, no overlap, and containment', () => {
    ref.metrics.iou_basic.forEach(e => {
      const r = iou(e.box1, e.box2);
      expect(r.iou).toBeCloseTo(e.iou, 4);
    });
  });
});

describe('hardening — invalid inputs and invariants', () => {
  it('psnr rejects mismatched lengths', () => {
    expect(psnr(null, [1,2])).toBeNull();
    expect(psnr([], [])).toBeNull();
  });
  it('ssim rejects null/empty input', () => {
    expect(ssim(null, [1,2,3])).toBeNull();
    expect(ssim([], [1,2,3])).toBeNull();
  });
  it('iou rejects short boxes', () => {
    expect(iou([0,0], [1,1,2,2])).toBeNull();
    expect(iou(null, [1,1,2,2])).toBeNull();
  });
  it('perplexity rejects invalid logLik/nTokens', () => {
    expect(perplexity(NaN, 10)).toBeNull();
    expect(perplexity(-50, 0)).toBeNull();
    expect(perplexity(-50, -1)).toBeNull();
  });
  it('rougeL handles empty strings', () => {
    expect(rougeL(null, 'test')).toBeNull();
    expect(rougeL('test', null)).toBeNull();
    const r = rougeL('test', 'test');
    expect(r.f1).toBeCloseTo(1, 0);
  });
});
