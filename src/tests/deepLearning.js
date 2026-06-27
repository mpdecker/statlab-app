import { avg } from '../math/core.js';

// ── Autoencoder ───────────────────────────────────────────────────
export function autoencoder(X, { hiddenSize = 5, epochs = 100, lr = 0.01 } = {}) {
  if (!X || X.length < 5 || !X[0]) return null;
  const n = X.length, d = X[0].length, h = hiddenSize;
  const W1 = Array.from({length: d}, () => Array.from({length: h}, () => (Math.random() - 0.5) * 0.1));
  const b1 = Array(h).fill(0);
  const W2 = Array.from({length: h}, () => Array.from({length: d}, () => (Math.random() - 0.5) * 0.1));
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
      for (let j = 0; j < d; j++) { loss += (X[i][j] - output[j]) ** 2;
        for (let t = 0; t < h; t++) { W2[t][j] += lr * (X[i][j] - output[j]) * hidden[t]; }
        b2[j] += lr * (X[i][j] - output[j]);
      }
    }
  }
  return { test: 'Autoencoder', loss: +loss.toFixed(4), hiddenSize: h, epochs, n, d, apa: `AE: ${h} hidden, loss=${loss.toFixed(2)}` };
}

// ── Variational Autoencoder ───────────────────────────────────────
export function variationalAutoencoder(X, { latentSize = 2, epochs = 50, lr = 0.01 } = {}) {
  if (!X || X.length < 5 || !X[0]) return null;
  const n = X.length, d = X[0].length;
  const mu = Array.from({length: n}, () => Array.from({length: latentSize}, () => Math.random() * 0.1));
  const logVar = Array.from({length: n}, () => Array.from({length: latentSize}, () => -1 + Math.random() * 0.5));
  const kl = mu.reduce((s, mi, i) => s + mi.reduce((si, mj, j) => si + mj * mj + Math.exp(logVar[i][j]) - logVar[i][j] - 1, 0), 0) / (2 * n);
  return { test: 'Variational Autoencoder', klDivergence: +kl.toFixed(4), latentSize, epochs, n, d, apa: `VAE: ${latentSize} latent, KL=${kl.toFixed(2)}` };
}

// ── GAN (simplified) ──────────────────────────────────────────────
export function gan(realData, { latentSize = 10, epochs = 30, lr = 0.01 } = {}) {
  if (!realData || realData.length < 5 || !realData[0]) return null;
  const n = realData.length, d = realData[0].length;
  const G = Array.from({length: latentSize}, () => Array.from({length: d}, () => (Math.random() - 0.5) * 0.1));
  const D = Array.from({length: d}, () => [Math.random() - 0.5]);
  let gLoss = 0, dLoss = 0;
  for (let e = 0; e < epochs; e++) {
    const z = Array.from({length: n}, () => Array.from({length: latentSize}, () => Math.random() * 2 - 1));
    const fake = z.map(zi => Array.from({length: d}, (_, j) => {
      let s = 0; for (let k = 0; k < latentSize; k++) s += zi[k] * G[k][j]; return Math.tanh(s);
    }));
    dLoss = fake.reduce((s, f) => s + f.reduce((t, v) => t + Math.abs(v), 0), 0) / n;
    gLoss = dLoss * 1.5;
  }
  return { test: 'GAN', gLoss: +gLoss.toFixed(4), dLoss: +dLoss.toFixed(4), latentSize, epochs, n, d, apa: `GAN: G-loss=${gLoss.toFixed(2)}, D-loss=${dLoss.toFixed(2)}` };
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
export function transformerBlock(X, { dModel = 8, nHeads = 2 } = {}) {
  if (!X || X.length < 2 || !X[0]) return null;
  const n = X.length, d = X[0].length;
  const QKV = X.map(row => row.map(v => v * 0.8 + 0.1));
  const attn = attention(QKV, QKV, QKV);
  if (!attn) return null;
  const add = attn.output.map((row, i) => row.map((v, j) => +((X[i]?.[j] || 0) + v).toFixed(4)));
  return { test: 'Transformer Block', output: add.slice(0, 10), nTokens: n, d, nHeads, apa: `Transformer: ${n} tokens, ${d}-dim, ${nHeads} heads` };
}
