import { describe, it, expect } from 'vitest';
import { psnr, ssim, iou, bleuScore, rougeL, perplexity } from './metrics.js';
import { expectKeys } from './__fixtures__/helpers.js';

const a = [10, 20, 10, 20, 10, 20, 10, 20];
const b = [11, 19, 9, 21, 12, 18, 8, 22];

describe('psnr', () => { it('contract keys', () => expectKeys(psnr(a, b), ['test','psnr','maxVal','n','apa'])); it('null mismatch', () => expect(psnr([1,2],[1])).toBeNull()) });
describe('ssim', () => { it('contract keys', () => expectKeys(ssim(a, b), ['test','ssim','n','apa'])); it('SSIM in [0,1]', () => { const r = ssim(a, b); expect(r.ssim).toBeGreaterThanOrEqual(0); expect(r.ssim).toBeLessThanOrEqual(1) }) });
describe('iou', () => { it('contract keys', () => expectKeys(iou([0,0,2,2],[1,1,3,3]), ['test','iou','apa'])); it('IoU > 0 for overlapping', () => { const r = iou([0,0,2,2],[1,1,3,3]); expect(r.iou).toBeGreaterThan(0) }) });
describe('bleuScore', () => { it('contract keys', () => expectKeys(bleuScore('the cat sat on mat', ['the cat sat on the mat']), ['test','bleu','n','apa'])); it('null empty', () => expect(bleuScore([], ['test'])).toBeNull()) });
describe('rougeL', () => { it('contract keys', () => expectKeys(rougeL('cat sat mat', 'the cat sat on the mat'), ['test','precision','recall','f1','apa'])) });
describe('perplexity', () => { it('contract keys', () => expectKeys(perplexity(-50, 10), ['test','perplexity','logLik','nTokens','apa'])); it('perplexity > 0', () => { const r = perplexity(-50, 10); expect(r.perplexity).toBeGreaterThan(0) }) });
