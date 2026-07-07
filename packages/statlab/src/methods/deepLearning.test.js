import { describe, it, expect } from 'vitest';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };
import { autoencoder, variationalAutoencoder, gan, attention, transformerBlock } from './deepLearning.js';

const rd = ref.deepLearning;

const X = Array.from({length: 8}, () => Array.from({length: 4}, () => Math.random()));

describe('autoencoder', () => {
  it('contract keys', () => expectKeys(autoencoder(X, { hiddenSize: 3, epochs: 10 }), ['test','loss','hiddenSize','epochs','n','d','apa']));
  it('null <5', () => expect(autoencoder([[1,2]], { epochs: 5 })).toBeNull());
  it('loss >= 0', () => { const r = autoencoder(X, { hiddenSize: 3, epochs: 10 }); if (r) expect(r.loss).toBeGreaterThanOrEqual(0) });
});
describe('variationalAutoencoder', () => {
  it('contract keys', () => expectKeys(variationalAutoencoder(X, { latentSize: 2, epochs: 5 }), ['test','klDivergence','latentSize','epochs','n','d','apa']));
  it('null <5', () => expect(variationalAutoencoder([[1]], { epochs: 2 })).toBeNull());
  it('klDivergence >= 0', () => { const r = variationalAutoencoder(X, { latentSize: 2, epochs: 5 }); if (r) expect(r.klDivergence).toBeGreaterThanOrEqual(0) });
});
describe('gan', () => {
  it('contract keys', () => expectKeys(gan(X, { latentSize: 5, epochs: 3 }), ['test','gLoss','dLoss','latentSize','epochs','n','d','apa']));
  it('null <5', () => expect(gan([[1,2]], { epochs: 2 })).toBeNull());
  it('loss values finite', () => { const r = gan(X, { latentSize: 5, epochs: 3 }); if (r) { expect(isFinite(r.gLoss)).toBe(true); expect(isFinite(r.dLoss)).toBe(true) } });
});
describe('attention', () => {
  const Q = [[1,2],[3,4],[5,6]]; const K = Q; const V = [[0.1,0.2],[0.3,0.4],[0.5,0.6]];
  it('contract keys', () => expectKeys(attention(Q, K, V), ['test','output','n','dk','dv','apa']));
  it('null empty', () => expect(attention([], [], [])).toBeNull());
  it('output shape matches V', () => { const r = attention(Q, K, V); if (r) expect(r.output.length).toBe(V.length) });
});
describe('transformerBlock', () => {
  it('contract keys', () => expectKeys(transformerBlock(X, { nHeads: 2 }), ['test','output','nTokens','d','nHeads','apa']));
  it('null <2', () => expect(transformerBlock([X[0]], { nHeads: 2 })).toBeNull());
  it('output has correct token count', () => { const r = transformerBlock(X, { nHeads: 2 }); if (r) expect(r.output.length).toBe(X.length) });
});

describe('autoencoder learns its encoder (full backprop)', () => {
  it('reconstructs low-rank data far better than the column-mean baseline', () => {
    // rank-1 data: each row = a * [0.5,1,1.5,2]
    const dir = [0.5, 1, 1.5, 2];
    const rows = Array.from({ length: 16 }, (_, i) => { const a = (i / 15) * 2 - 1; return dir.map(v => a * v); });
    const r = autoencoder(rows, { hiddenSize: 1, epochs: 800, lr: 0.05, seed: 1 });
    // baseline: predict each column's mean
    const cmean = dir.map((_, j) => rows.reduce((s, row) => s + row[j], 0) / rows.length);
    const baseline = rows.reduce((s, row) => s + row.reduce((t, v, j) => t + (v - cmean[j]) ** 2, 0), 0);
    expect(r.loss).toBeLessThan(0.2 * baseline);
  });
});

describe('transformerBlock has LayerNorm (scale-stable output)', () => {
  it('output magnitude is bounded regardless of input scale', () => {
    const Xs = Array.from({ length: 5 }, (_, i) => [i - 2, (i % 3) - 1, Math.sin(i), (i * 0.3) % 1]);
    const norm = o => Math.sqrt(o.reduce((s, row) => s + row.reduce((t, v) => t + v * v, 0), 0));
    const o1 = transformerBlock(Xs, { seed: 1, nHeads: 2 }).output;
    const o2 = transformerBlock(Xs.map(r => r.map(v => v * 100)), { seed: 1, nHeads: 2 }).output;
    expect(norm(o2) / Math.max(norm(o1), 1e-9)).toBeLessThan(5); // LayerNorm normalizes; old residual-only would scale ~100x
  });
});

describe('variationalAutoencoder actually trains (real ELBO)', () => {
  it('reconstruction loss beats the column-mean baseline on structured data', () => {
    const dir = [0.4, -0.3, 0.5, 0.2];
    const rows = Array.from({ length: 20 }, (_, i) => { const a = (i / 19) * 2 - 1; return dir.map(v => a * v + 0.05); });
    const r = variationalAutoencoder(rows, { latentSize: 2, epochs: 600, lr: 0.02, seed: 1, beta: 0.05 });
    const cmean = dir.map((_, j) => rows.reduce((s, row) => s + row[j], 0) / rows.length);
    const baseline = rows.reduce((s, row) => s + row.reduce((t, v, j) => t + (v - cmean[j]) ** 2, 0), 0);
    expect(r.reconLoss).toBeLessThan(baseline);
  });
});

describe('gan trains a generator toward the data (real adversarial loop)', () => {
  it('generated mean moves toward the real-data mean', () => {
    const rows = Array.from({ length: 24 }, () => [0.5, -0.4, 0.3].map(v => v + (Math.random() - 0.5) * 0.05));
    const r = gan(rows, { latentSize: 4, epochs: 400, lr: 0.05, seed: 1 });
    const distTrained = Math.hypot(...r.generatedMean.map((v, j) => v - r.realMean[j]));
    const distZero = Math.hypot(...r.realMean); // an untrained generator outputs ~0
    expect(distTrained).toBeLessThan(distZero);
  });
});

describe('attention oracle', () => {
  it('output matches oracle', () => {
    const r = attention(rd.attention_basic.Q, rd.attention_basic.K, rd.attention_basic.V);
    expect(r.output).toEqual(rd.attention_basic.output);
  });
});

describe('transformerBlock oracle', () => {
  it('output has correct shape', () => {
    const r = transformerBlock(rd.transformerBlock_basic.X, { nHeads: 2, seed: 1 });
    expect(r.output.length).toBe(rd.transformerBlock_basic.X.length);
    expect(r.output[0].length).toBe(rd.transformerBlock_basic.X[0].length);
  });
  it('output values are finite and well-formed', () => {
    const r = transformerBlock(rd.transformerBlock_basic.X, { nHeads: 2, seed: 1 });
    for (const row of r.output) {
      for (const v of row) {
        expect(Number.isFinite(v)).toBe(true);
        expect(Math.abs(v)).toBeLessThan(100);
      }
    }
  });
  it('output is stable (LayerNorm bound)', () => {
    const r = transformerBlock(rd.transformerBlock_basic.X, { nHeads: 2, seed: 1 });
    const norm = Math.sqrt(r.output.reduce((s, row) => s + row.reduce((t, v) => t + v * v, 0), 0));
    expect(norm).toBeGreaterThan(0);
    expect(norm).toBeLessThan(50);
  });
});

describe('hardening — deep learning edge cases', () => {
  it('autoencoder null for null X', () => expect(autoencoder(null, { hiddenSize: 3, epochs: 10 })).toBeNull());
  it('autoencoder reproducible', () => { const r1 = autoencoder(X, { hiddenSize: 3, epochs: 10, seed: 1 }); const r2 = autoencoder(X, { hiddenSize: 3, epochs: 10, seed: 1 }); expect(r1.loss).toBe(r2.loss); });
  it('autoencoder loss finite for degenerate data', () => { const r = autoencoder([[5,5,5,5],[5,5,5,5],[5,5,5,5],[5,5,5,5],[5,5,5,5]], { hiddenSize: 2, epochs: 5 }); if (r) expect(Number.isFinite(r.loss)).toBe(true); });
  it('variationalAutoencoder null for null X', () => expect(variationalAutoencoder(null, { latentSize: 2, epochs: 5 })).toBeNull());
  it('variationalAutoencoder reproducible', () => { const r1 = variationalAutoencoder(X, { latentSize: 2, epochs: 5, seed: 7 }); const r2 = variationalAutoencoder(X, { latentSize: 2, epochs: 5, seed: 7 }); expect(r1.klDivergence).toBe(r2.klDivergence); });
  it('gan null for null data', () => expect(gan(null, { latentSize: 5, epochs: 3 })).toBeNull());
  it('gan reproducible', () => { const r1 = gan(X, { latentSize: 5, epochs: 3, seed: 3 }); const r2 = gan(X, { latentSize: 5, epochs: 3, seed: 3 }); expect(r1.gLoss).toBe(r2.gLoss); });
  it('attention handles mismatched K gracefully', () => expect(attention([[1,2]], [[1]], [[1]])).not.toBeNull());
  it('attention reproducible yields same output', () => { const Q = [[1,2],[3,4]]; const K = Q; const V = [[0.1,0.2],[0.3,0.4]]; const r1 = attention(Q, K, V); const r2 = attention(Q, K, V); expect(r1.output).toEqual(r2.output); });
  it('transformerBlock null for single token', () => expect(transformerBlock([[1,2]], { nHeads: 2 })).toBeNull());
  it('transformerBlock reproducible', () => { const r1 = transformerBlock(X, { nHeads: 2, seed: 9 }); const r2 = transformerBlock(X, { nHeads: 2, seed: 9 }); expect(r1.output).toEqual(r2.output); });
});
