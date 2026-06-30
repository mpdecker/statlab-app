import { avg } from '../math/core.js';
import { mulberry32, boxMullerN } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── Autoencoder ───────────────────────────────────────────────────
export function autoencoder(X, { seed = 42, hiddenSize = 5, epochs = 100, lr = 0.01 } = {}) {
  __rng = mulberry32(seed);
  if (!X || X.length < 5 || !X[0]) return null;
  const n = X.length, d = X[0].length, h = hiddenSize;
  const W1 = Array.from({length: d}, () => Array.from({length: h}, () => (__rng() - 0.5) * 0.1));
  const b1 = Array(h).fill(0);
  const W2 = Array.from({length: h}, () => Array.from({length: d}, () => (__rng() - 0.5) * 0.1));
  const b2 = Array(d).fill(0);
  let loss = 0;
  for (let e = 0; e < epochs; e++) {
    loss = 0;
    for (let i = 0; i < n; i++) {
      const hidden = Array(h).fill(0).map((_, j) => {
        let s = b1[j]; for (let k = 0; k < d; k++) s += X[i][k] * W1[k][j]; return Math.tanh(s);
      });
      const output = Array(d).fill(0).map((_, j) => {
        let s = b2[j]; for (let k = 0; k < h; k++) s += hidden[k] * W2[k][j]; return s;
      });
      const err = Array(d).fill(0);
      for (let j = 0; j < d; j++) { err[j] = X[i][j] - output[j]; loss += err[j] ** 2; }
      // Backprop into the hidden layer (using the current W2) before updating it.
      const dHidden = Array(h).fill(0);
      for (let t = 0; t < h; t++) {
        let g = 0; for (let j = 0; j < d; j++) g += err[j] * W2[t][j];
        dHidden[t] = g * (1 - hidden[t] * hidden[t]); // tanh′
      }
      for (let j = 0; j < d; j++) { // decoder update
        for (let t = 0; t < h; t++) W2[t][j] += lr * err[j] * hidden[t];
        b2[j] += lr * err[j];
      }
      for (let t = 0; t < h; t++) { // encoder update (was missing → encoder stayed random)
        for (let k = 0; k < d; k++) W1[k][t] += lr * dHidden[t] * X[i][k];
        b1[t] += lr * dHidden[t];
      }
    }
  }
  return { test: 'Autoencoder', loss: +loss.toFixed(4), hiddenSize: h, epochs, n, d, apa: `AE: ${h} hidden, loss=${loss.toFixed(2)}` };
}

// ── Variational Autoencoder ───────────────────────────────────────
export function variationalAutoencoder(X, { seed = 42, latentSize = 2, epochs = 50, lr = 0.01, beta = 1 } = {}) {
  __rng = mulberry32(seed);
  if (!X || X.length < 5 || !X[0]) return null;
  const n = X.length, d = X[0].length, L = latentSize;
  const randMat = (r, c) => Array.from({ length: r }, () => Array.from({ length: c }, () => (__rng() - 0.5) * 0.2));
  // Linear encoder → (μ, logσ²), reparameterised sample z = μ + σ⊙ε, linear decoder.
  let WeMu = randMat(d, L), beMu = Array(L).fill(0);
  let WeLv = randMat(d, L), beLv = Array(L).fill(0);
  let Wd = randMat(L, d), bd = Array(d).fill(0);
  let reconLoss = 0, kl = 0;
  for (let e = 0; e < epochs; e++) {
    reconLoss = 0; kl = 0;
    for (let i = 0; i < n; i++) {
      const x = X[i];
      const mu = Array.from({ length: L }, (_, l) => { let s = beMu[l]; for (let k = 0; k < d; k++) s += x[k] * WeMu[k][l]; return s; });
      const lv = Array.from({ length: L }, (_, l) => { let s = beLv[l]; for (let k = 0; k < d; k++) s += x[k] * WeLv[k][l]; return s; });
      const eps = Array.from({ length: L }, () => boxMullerN(__rng));
      const sigma = lv.map(v => Math.exp(0.5 * v));
      const z = mu.map((m, l) => m + sigma[l] * eps[l]);
      const xhat = Array.from({ length: d }, (_, j) => { let s = bd[j]; for (let l = 0; l < L; l++) s += z[l] * Wd[l][j]; return s; });
      const err = Array.from({ length: d }, (_, j) => x[j] - xhat[j]);
      for (let j = 0; j < d; j++) reconLoss += err[j] ** 2;
      for (let l = 0; l < L; l++) kl += 0.5 * (mu[l] * mu[l] + Math.exp(lv[l]) - lv[l] - 1);
      // Decoder gradients.
      for (let j = 0; j < d; j++) { for (let l = 0; l < L; l++) Wd[l][j] += lr * err[j] * z[l]; bd[j] += lr * err[j]; }
      // Backprop recon to z, then split through the reparameterisation; add KL gradients.
      const gz = Array.from({ length: L }, (_, l) => { let g = 0; for (let j = 0; j < d; j++) g += err[j] * Wd[l][j]; return g; });
      for (let l = 0; l < L; l++) {
        const gMu = gz[l] - beta * mu[l];                           // recon ascent − β·dKL/dμ
        const gLv = gz[l] * 0.5 * sigma[l] * eps[l] - beta * 0.5 * (Math.exp(lv[l]) - 1);
        for (let k = 0; k < d; k++) { WeMu[k][l] += lr * gMu * x[k]; WeLv[k][l] += lr * gLv * x[k]; }
        beMu[l] += lr * gMu; beLv[l] += lr * gLv;
      }
    }
  }
  return { test: 'Variational Autoencoder', klDivergence: +(kl / n).toFixed(4), reconLoss: +reconLoss.toFixed(4), latentSize, epochs, n, d, apa: `VAE: ${latentSize} latent, KL=${(kl / n).toFixed(2)}` };
}

// ── GAN (simplified) ──────────────────────────────────────────────
export function gan(realData, { seed = 42, latentSize = 10, epochs = 30, lr = 0.01 } = {}) {
  __rng = mulberry32(seed);
  if (!realData || realData.length < 5 || !realData[0]) return null;
  const n = realData.length, d = realData[0].length;
  const L = latentSize;
  // Generator z→x (linear+tanh) and discriminator x→σ(·) (logistic).
  const G = Array.from({ length: L }, () => Array.from({ length: d }, () => (__rng() - 0.5) * 0.2));
  const bg = Array(d).fill(0);
  const Dw = Array.from({ length: d }, () => (__rng() - 0.5) * 0.2);
  let bD = 0;
  const sigmoid = z => 1 / (1 + Math.exp(-z));
  const genOne = z => Array.from({ length: d }, (_, j) => { let s = bg[j]; for (let k = 0; k < L; k++) s += z[k] * G[k][j]; return Math.tanh(s); });
  let gLoss = 0, dLoss = 0;
  for (let e = 0; e < epochs; e++) {
    gLoss = 0; dLoss = 0;
    for (let i = 0; i < n; i++) {
      const z = Array.from({ length: L }, () => __rng() * 2 - 1);
      const fake = genOne(z);
      const real = realData[i];
      const dReal = sigmoid(real.reduce((s, v, j) => s + v * Dw[j], bD));
      const dFake = sigmoid(fake.reduce((s, v, j) => s + v * Dw[j], bD));
      dLoss += -(Math.log(dReal + 1e-9) + Math.log(1 - dFake + 1e-9));
      gLoss += -Math.log(dFake + 1e-9);
      // Discriminator ascent: real→1, fake→0  (logistic-regression gradient).
      for (let j = 0; j < d; j++) Dw[j] += lr * ((1 - dReal) * real[j] - dFake * fake[j]);
      bD += lr * ((1 - dReal) - dFake);
      // Generator ascent on log D(fake): push fake toward the real side of D.
      for (let j = 0; j < d; j++) {
        const gradFakeJ = (1 - dFake) * Dw[j] * (1 - fake[j] * fake[j]); // through σ and tanh
        for (let k = 0; k < L; k++) G[k][j] += lr * gradFakeJ * z[k];
        bg[j] += lr * gradFakeJ;
      }
    }
    gLoss /= n; dLoss /= n;
  }
  // Diagnostics: mean of freshly generated samples vs. the real-data mean.
  const gen = Array.from({ length: n }, () => genOne(Array.from({ length: L }, () => __rng() * 2 - 1)));
  const generatedMean = Array.from({ length: d }, (_, j) => +avg(gen.map(g => g[j])).toFixed(4));
  const realMean = Array.from({ length: d }, (_, j) => +avg(realData.map(r => r[j])).toFixed(4));
  return { test: 'GAN', gLoss: +gLoss.toFixed(4), dLoss: +dLoss.toFixed(4), generatedMean, realMean, latentSize, epochs, n, d, apa: `GAN: G-loss=${gLoss.toFixed(2)}, D-loss=${dLoss.toFixed(2)}` };
}

// ── Attention Mechanism (Scaled Dot-Product) ──────────────────────
export function attention(Q, K, V) {
  if (!Q || !K || !V || !Q.length || !K[0] || !V[0]) return null;
  const n = Q.length, dk = K[0].length;
  const scores = Array.from({length: n}, (_, i) => Array.from({length: n}, (_, j) => {
    let s = 0; for (let t = 0; t < dk; t++) s += Q[i][t] * K[j][t]; return s / Math.sqrt(dk);
  }));
  const maxScore = scores.map(r => Math.max(...r));
  const exps = scores.map((row, i) => row.map(v => Math.exp(v - maxScore[i])));
  const sums = exps.map(row => row.reduce((s, v) => s + v, 0));
  const weights = exps.map((row, i) => row.map(v => +(v / sums[i]).toFixed(4)));
  const output = weights.map(w => Array.from({length: V[0].length}, (_, j) => {
    let s = 0; for (let i = 0; i < n; i++) s += w[i] * V[i][j]; return +s.toFixed(4);
  }));
  return { test: 'Attention', output: output.slice(0, 10), n, dk, dv: V[0].length, apa: `Attention: ${n} tokens, dk=${dk}` };
}

// ── Transformer Block (simplified) ────────────────────────────────
export function transformerBlock(X, { dModel = 8, nHeads = 2, seed = 42, dFF = null } = {}) {
  if (!X || X.length < 2 || !X[0]) return null;
  const n = X.length, d = X[0].length;
  __rng = mulberry32(seed);
  const dm = Math.max(nHeads, dModel), dh = Math.max(1, Math.floor(dm / nHeads));
  const dff = dFF || 2 * d;
  const randMat = (r, c) => Array.from({ length: r }, () => Array.from({ length: c }, () => (__rng() - 0.5) * Math.sqrt(2 / r)));
  const mm = (A, B) => A.map(row => B[0].map((_, j) => row.reduce((s, v, k) => s + v * B[k][j], 0)));
  const layerNorm = row => { const mu = row.reduce((s, v) => s + v, 0) / row.length; const vr = row.reduce((s, v) => s + (v - mu) ** 2, 0) / row.length; const sd = Math.sqrt(vr + 1e-6); return row.map(v => (v - mu) / sd); };
  // Learned (random-init) Q/K/V/output projections + position-wise FFN.
  const Wq = randMat(d, dm), Wk = randMat(d, dm), Wv = randMat(d, dm), Wo = randMat(dm, d);
  const W1 = randMat(d, dff), b1 = Array(dff).fill(0), W2 = randMat(dff, d), b2 = Array(d).fill(0);
  const Q = mm(X, Wq), K = mm(X, Wk), V = mm(X, Wv);
  // Multi-head scaled dot-product self-attention.
  const attnOut = Array.from({ length: n }, () => Array(dm).fill(0));
  for (let head = 0; head < nHeads; head++) {
    const c0 = head * dh, c1 = c0 + dh;
    for (let i = 0; i < n; i++) {
      const sc = [];
      for (let j = 0; j < n; j++) { let s = 0; for (let t = c0; t < c1; t++) s += Q[i][t] * K[j][t]; sc.push(s / Math.sqrt(dh)); }
      const mx = Math.max(...sc); const ex = sc.map(v => Math.exp(v - mx)); const sm = ex.reduce((a, b) => a + b, 0) || 1;
      const w = ex.map(v => v / sm);
      for (let t = c0; t < c1; t++) { let o = 0; for (let j = 0; j < n; j++) o += w[j] * V[j][t]; attnOut[i][t] = o; }
    }
  }
  const proj = mm(attnOut, Wo);                                  // back to model dim d
  const a1 = X.map((row, i) => layerNorm(row.map((v, j) => v + proj[i][j]))); // Add & Norm
  const ff = a1.map(row => {
    const hdn = Array.from({ length: dff }, (_, k) => { let s = b1[k]; for (let j = 0; j < d; j++) s += row[j] * W1[j][k]; return Math.max(0, s); }); // ReLU
    return Array.from({ length: d }, (_, j) => { let s = b2[j]; for (let k = 0; k < dff; k++) s += hdn[k] * W2[k][j]; return s; });
  });
  const out = a1.map((row, i) => layerNorm(row.map((v, j) => v + ff[i][j]))); // Add & Norm
  return { test: 'Transformer Block', output: out.slice(0, 10).map(r => r.map(v => +v.toFixed(4))), nTokens: n, d, nHeads, apa: `Transformer: ${n} tokens, ${d}-dim, ${nHeads} heads` };
}
