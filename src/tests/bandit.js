import { avg } from '../math/core.js';
import { normalCDF } from '../math/distributions.js';
import { mulberry32, randBeta } from '../math/rng.js';

let __rng = mulberry32(42); // reseeded per stochastic call for reproducibility

// ── Epsilon-Greedy ──────────────────────────────────────────────────────────
export function epsilonGreedy(arms, rewards, nIterations = 100, { seed = 42, epsilon = 0.1 } = {}) {
  __rng = mulberry32(seed);
  if (!arms || arms.length < 2 || !rewards || nIterations < 10) return null;
  const k = arms.length;
  const counts = Array(k).fill(0);
  const values = Array(k).fill(0);
  const history = [];
  let totalReward = 0;

  function pull(arm) {
    const r = typeof rewards[arm] === 'function' ? rewards[arm]() : rewards[arm];
    counts[arm]++;
    values[arm] += (r - values[arm]) / counts[arm];
    return r;
  }

  for (let i = 0; i < k; i++) pull(i); // Initialize

  for (let t = k; t < nIterations; t++) {
    let arm;
    if (__rng() < epsilon) {
      arm = Math.floor(__rng() * k);
    } else {
      arm = values.indexOf(Math.max(...values));
    }
    const r = pull(arm);
    totalReward += r;
    if (t % Math.ceil(nIterations / 20) === 0) history.push({ iteration: t, arm, reward: +r.toFixed(4), bestArm: values.indexOf(Math.max(...values)), valueEst: values.map(v => +v.toFixed(4)) });
  }

  const bestArm = values.indexOf(Math.max(...values));
  const regret = nIterations * Math.max(...values) - totalReward;
  return { test: 'Epsilon-Greedy', bestArm, valueEstimates: values.map(v => +v.toFixed(4)), counts, totalReward: +totalReward.toFixed(4), regret: +regret.toFixed(4), history, epsilon, nIterations, apa: `ε-greedy (ε=${epsilon}): best arm = ${bestArm + 1}, regret = ${regret.toFixed(2)}` };
}

// ── Upper Confidence Bound (UCB) ────────────────────────────────────────────
export function ucb(arms, rewards, nIterations = 100) {
  if (!arms || arms.length < 2 || !rewards || nIterations < 10) return null;
  const k = arms.length;
  const counts = Array(k).fill(0);
  const values = Array(k).fill(0);
  const history = [];
  let totalReward = 0, t = 0;

  function pull(arm) {
    const r = typeof rewards[arm] === 'function' ? rewards[arm]() : rewards[arm];
    counts[arm]++;
    values[arm] += (r - values[arm]) / counts[arm];
    return r;
  }

  for (let i = 0; i < k; i++) { pull(i); t++; }

  while (t < nIterations) {
    const ucb = values.map((v, i) => counts[i] > 0 ? v + Math.sqrt((2 * Math.log(t + 1)) / counts[i]) : Infinity);
    const arm = ucb.indexOf(Math.max(...ucb));
    const r = pull(arm);
    totalReward += r;
    t++;
    if (t % Math.ceil(nIterations / 20) === 0) history.push({ iteration: t, arm, reward: +r.toFixed(4), ucb: ucb.map(v => +v.toFixed(4)) });
  }

  const bestArm = values.indexOf(Math.max(...values));
  const regret = nIterations * Math.max(...values) - totalReward;
  return { test: 'UCB', bestArm, valueEstimates: values.map(v => +v.toFixed(4)), counts, totalReward: +totalReward.toFixed(4), regret: +regret.toFixed(4), history, nIterations, apa: `UCB: best arm = ${bestArm + 1}, regret = ${regret.toFixed(2)}` };
}

// ── Thompson Sampling ───────────────────────────────────────────────────────
export function thompsonSampling(arms, rewards, nIterations = 100, { seed = 42, prior = 'beta' } = {}) {
  __rng = mulberry32(seed);
  if (!arms || arms.length < 2 || !rewards || nIterations < 10) return null;
  const k = arms.length;
  const successes = Array(k).fill(1); // Beta(1,1) prior
  const failures = Array(k).fill(1);
  const history = [];
  let totalReward = 0;

  for (let t = 0; t < nIterations; t++) {
    const samples = successes.map((s, i) => randBeta(__rng, s, failures[i])); // draw θ_i ~ Beta(α_i, β_i)
    const arm = samples.indexOf(Math.max(...samples));
    const r = typeof rewards[arm] === 'function' ? rewards[arm]() : rewards[arm];
    if (r > 0.5) successes[arm]++;
    else failures[arm]++;
    totalReward += r;
    if (t % Math.ceil(nIterations / 20) === 0) history.push({ iteration: t, arm, reward: +r.toFixed(4), successes: [...successes], failures: [...failures] });
  }

  const values = successes.map((s, i) => s / (s + failures[i] + 1e-6));
  const bestArm = values.indexOf(Math.max(...values));
  return { test: 'Thompson Sampling', bestArm, valueEstimates: values.map(v => +v.toFixed(4)), totalReward: +totalReward.toFixed(4), history, nIterations, apa: `Thompson: best arm = ${bestArm + 1}, total = ${totalReward.toFixed(2)}` };
}

// ── Contextual Bandit (LinUCB) ──────────────────────────────────────────────
export function contextualBandit(arms, nContext = 2, nIterations = 100, { seed = 42, alpha = 1 } = {}) {
  __rng = mulberry32(seed);
  if (!arms || arms.length < 2 || nContext < 1 || nIterations < 10) return null;
  const k = arms.length;
  const d = nContext;
  const A = Array.from({ length: k }, () => Array.from({ length: d }, (_, i2) => Array(d).fill(0)));
  const b = Array.from({ length: k }, () => Array(d).fill(0));
  for (let a = 0; a < k; a++) for (let i = 0; i < d; i++) A[a][i][i] = 1; // Id matrix
  
  const history = [];
  let totalReward = 0;

  for (let t = 0; t < nIterations; t++) {
    const context = Array.from({ length: d }, () => __rng() * 2 - 1);
    const scores = A.map((Aa, a) => {
      const theta = Aa.map((row, i) => row.reduce((s, Aij, j) => s + (A[a][i][j] || 0) * b[a][j], 0));
      const atx = Aa.reduce((s, row, i) => {
        const qdot = context.reduce((qs, cj, j) => qs + row[j] * cj, 0);
        return s + qdot * context[i];
      }, 0);
      return theta.reduce((s, ti, i) => s + ti * context[i], 0) + alpha * Math.sqrt(atx);
    });
    const arm = scores.indexOf(Math.max(...scores));
    const r = __rng() < 0.3 ? 1 : 0;
    totalReward += r;

    // Update A and b for the chosen arm
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) A[arm][i][j] += context[i] * context[j];
      b[arm][i] += r * context[i];
    }

    if (t % Math.ceil(nIterations / 20) === 0) history.push({ iteration: t, arm, reward: r, context: context.map(c => +c.toFixed(2)) });
  }

  return { test: 'Contextual Bandit (LinUCB)', totalReward: +totalReward.toFixed(4), nIterations, nArms: k, nContext: d, history, apa: `LinUCB: total = ${totalReward.toFixed(2)}, arms = ${k}, dim = ${d}` };
}

// ── Policy Gradient (REINFORCE) ─────────────────────────────────────────────
export function policyGradient(arms, rewards, nEpisodes = 100, { seed = 42, lr = 0.01 } = {}) {
  __rng = mulberry32(seed);
  if (!arms || arms.length < 2 || !rewards || nEpisodes < 10) return null;
  const k = arms.length;
  const logits = Array(k).fill(0);
  const history = [];
  let totalReward = 0;

  for (let e = 0; e < nEpisodes; e++) {
    const exps = logits.map(l => Math.exp(l));
    const sumExp = exps.reduce((s, x) => s + x, 0);
    const probs = exps.map(x => x / sumExp);

    // Sample arm
    const u = __rng();
    let cum = 0, arm = 0;
    for (let i = 0; i < k; i++) { cum += probs[i]; if (u <= cum) { arm = i; break; } }

    const r = typeof rewards[arm] === 'function' ? rewards[arm]() : rewards[arm];
    totalReward += r;

    // Policy gradient update (no baseline for simplicity)
    for (let i = 0; i < k; i++) {
      const grad = i === arm ? 1 - probs[i] : -probs[i];
      logits[i] += lr * r * grad;
    }

    if (e % Math.ceil(nEpisodes / 20) === 0) {
      history.push({ episode: e, arm, reward: +r.toFixed(4), probs: probs.map(p => +p.toFixed(4)) });
    }
  }

  // Stabilize logits for final probabilities
  const finalLogits = logits.map(l => l > 50 ? 50 : l < -50 ? -50 : l);
  const exps = finalLogits.map(l => Math.exp(l));
  const sumExp = exps.reduce((s, x) => s + x, 0);
  const finalProbs = exps.map(x => +(x / sumExp).toFixed(4));
  const values = finalProbs; // Assign for regression reference

  const bestArm = finalProbs.indexOf(Math.max(...finalProbs));
  return { test: 'Policy Gradient', bestArm, finalProbs, totalReward: +totalReward.toFixed(4), nEpisodes, history, apa: `REINFORCE: best arm = ${bestArm + 1}, total = ${totalReward.toFixed(2)}` };
}

// ── Softmax Bandit ──────────────────────────────────────────────────────────
export function softmaxBandit(arms, rewards, nIterations = 100, { seed = 42, tau = 1, cooling = 0.99 } = {}) {
  __rng = mulberry32(seed);
  if (!arms || arms.length < 2 || !rewards || nIterations < 10) return null;
  const k = arms.length;
  const counts = Array(k).fill(0);
  const values = Array(k).fill(0);
  const history = [];
  let totalReward = 0, T = tau;

  function pull(arm) {
    const r = typeof rewards[arm] === 'function' ? rewards[arm]() : rewards[arm];
    counts[arm]++;
    values[arm] += (r - values[arm]) / counts[arm];
    return r;
  }

  for (let i = 0; i < k; i++) pull(i);

  for (let t = k; t < nIterations; t++) {
    const maxV = Math.max(...values);
    const exps = values.map(v => Math.exp((v - maxV) / T));
    const sumExp = exps.reduce((s, x) => s + x, 0);
    const probs = exps.map(x => x / Math.max(sumExp, 1e-10));
    const u = __rng();
    let cum = 0, arm = 0;
    for (let i = 0; i < k; i++) { cum += probs[i]; if (u <= cum) { arm = i; break; } }
    const r = pull(arm);
    totalReward += r;
    T *= cooling;
    if (t % Math.ceil(nIterations / 20) === 0) history.push({ iteration: t, arm, reward: +r.toFixed(4), temperature: +T.toFixed(4), probs: probs.map(p => +p.toFixed(4)) });
  }

  const bestArm = values.indexOf(Math.max(...values));
  const regret = nIterations * Math.max(...values) - totalReward;
  return { test: 'Softmax Bandit', bestArm, valueEstimates: values.map(v => +v.toFixed(4)), counts, totalReward: +totalReward.toFixed(4), regret: +regret.toFixed(4), history, tau, nIterations, apa: `Softmax (τ₀=${tau}): best arm = ${bestArm + 1}, regret = ${regret.toFixed(2)}` };
}

// ── Q-Learning ────────────────────────────────────────────────────
export function qLearning(nStates, nActions, rewards, transitions, { seed = 42, episodes = 50, lr = 0.1, gamma = 0.9, epsilon = 0.1 } = {}) {
  __rng = mulberry32(seed);
  if (!nStates || !nActions || nStates < 2 || nActions < 2 || episodes < 5) return null;
  const Q = Array.from({length: nStates}, () => Array(nActions).fill(0));
  const totalReward = 0;
  let cumulativeReward = 0;
  for (let ep = 0; ep < episodes; ep++) {
    let state = 0;
    for (let step = 0; step < 20; step++) {
      let action;
      if (__rng() < epsilon) action = Math.floor(__rng() * nActions);
      else action = Q[state].indexOf(Math.max(...Q[state]));
      const r = typeof rewards === 'function' ? rewards(state, action) : (rewards?.[state]?.[action] || __rng());
      const nextState = Math.floor(__rng() * nStates);
      const maxNext = Math.max(...(Q[nextState] || [0]));
      Q[state][action] += lr * (r + gamma * maxNext - Q[state][action]);
      state = nextState;
      cumulativeReward += r;
    }
  }
  return { test: 'Q-Learning', optimalPolicy: Q.map(row => row.indexOf(Math.max(...row))), nStates, nActions, episodes, totalReward: +cumulativeReward.toFixed(2), apa: `Q-learning: ${nStates} states, ${nActions} actions` };
}

// ── SARSA ─────────────────────────────────────────────────────────
export function sarsa(nStates, nActions, rewards, transitions, { seed = 42, episodes = 50, lr = 0.1, gamma = 0.9, epsilon = 0.1 } = {}) {
  __rng = mulberry32(seed);
  if (!nStates || !nActions || nStates < 2 || nActions < 2 || episodes < 5) return null;
  const Q = Array.from({length: nStates}, () => Array(nActions).fill(0));
  let cumulativeReward = 0;
  for (let ep = 0; ep < episodes; ep++) {
    let state = 0;
    let action = Math.floor(__rng() * nActions);
    for (let step = 0; step < 20; step++) {
      const r = typeof rewards === 'function' ? rewards(state, action) : (rewards?.[state]?.[action] || __rng());
      const nextState = Math.floor(__rng() * nStates);
      let nextAction;
      if (__rng() < epsilon) nextAction = Math.floor(__rng() * nActions);
      else nextAction = Q[nextState].indexOf(Math.max(...Q[nextState]));
      Q[state][action] += lr * (r + gamma * Q[nextState][nextAction] - Q[state][action]);
      state = nextState;
      action = nextAction;
      cumulativeReward += r;
    }
  }
  return { test: 'SARSA', optimalPolicy: Q.map(row => row.indexOf(Math.max(...row))), nStates, nActions, episodes, totalReward: +cumulativeReward.toFixed(2), apa: `SARSA: ${nStates} states, ${nActions} actions` };
}

// ── Deep Q-Network (simplified neural Q-function) ─────────────────
export function deepQNetwork(nStates, nActions, { seed = 42, episodes = 30, lr = 0.01, gamma = 0.9, hiddenSize = 8 } = {}) {
  __rng = mulberry32(seed);
  if (!nStates || !nActions || nStates < 2 || nActions < 2 || episodes < 5) return null;
  const W1 = Array.from({length: nStates}, () => Array.from({length: hiddenSize}, () => (__rng() - 0.5) * 0.1));
  const b1 = Array(hiddenSize).fill(0);
  const W2 = Array.from({length: hiddenSize}, () => Array.from({length: nActions}, () => (__rng() - 0.5) * 0.1));
  const b2 = Array(nActions).fill(0);
  let cumulativeReward = 0;
  for (let ep = 0; ep < episodes; ep++) {
    let state = 0;
    for (let step = 0; step < 15; step++) {
      // Forward
      const h = W1[state].map((w, j) => {
        let s = b1[j];
        for (let i = 0; i < nStates; i++) s += (i === state ? 1 : 0) * (W1[i]?.[j] || 0);
        return Math.tanh(s);
      });
      const qVals = b2.map((v, j) => {
        let s = v;
        for (let i = 0; i < hiddenSize; i++) s += h[i] * W2[i][j];
        return s;
      });
      const action = qVals.indexOf(Math.max(...qVals));
      const r = __rng();
      cumulativeReward += r;
      const target = r + gamma * Math.max(...qVals);
      const td = target - qVals[action];
      for (let j = 0; j < hiddenSize; j++) {
        W2[j][action] += lr * td * h[j];
        W1[state][j] += lr * td * Math.tanh(W1[state][j]) || lr * 0.01;
      }
      b2[action] += lr * td;
    }
  }
  return { test: 'Deep Q-Network', nStates, nActions, episodes, hiddenSize, totalReward: +cumulativeReward.toFixed(2), apa: `DQN: ${nStates} states, ${nActions} actions` };
}
