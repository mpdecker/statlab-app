import { describe, it, expect } from 'vitest';
import { expectKeys } from './__fixtures__/helpers.js';
import { epsilonGreedy, ucb, thompsonSampling, contextualBandit, policyGradient, softmaxBandit, qLearning, sarsa, deepQNetwork } from './bandit.js';

const arms = [0.2, 0.5, 0.3, 0.1, 0.4, 0.7];
const rew = arms.map(p => () => Math.random() < p ? 1 : 0);

describe('epsilonGreedy', () => {
  it('contract keys', () => { const r = epsilonGreedy(arms, rew, 50); expectKeys(r, ['test','bestArm','valueEstimates','counts','totalReward','regret','history','epsilon','nIterations','apa']); });
  it('null <2 arms', () => expect(epsilonGreedy([0.5], rew, 50)).toBeNull());
  it('valueEstimates between 0-1', () => { const r = epsilonGreedy(arms, rew, 50); if (r) r.valueEstimates.forEach(v => { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(1) }) });
});

describe('ucb', () => {
  it('contract keys', () => expectKeys(ucb(arms, rew, 50), ['test','bestArm','valueEstimates','counts','totalReward','regret','history','nIterations','apa']));
  it('counts sum to iterations', () => { const r = ucb(arms, rew, 50); if (r) { const sum = r.counts.reduce((s, v) => s + v, 0); expect(sum).toBe(50) } });
  it('regret finite', () => { const r = ucb(arms, rew, 50); if (r) expect(Number.isFinite(r.regret)).toBe(true); });
});

describe('thompsonSampling', () => {
  it('contract keys', () => expectKeys(thompsonSampling(arms, rew, 50), ['test','bestArm','valueEstimates','totalReward','history','nIterations','apa']));
  it('bestArm within range', () => { const r = thompsonSampling(arms, rew, 50); if (r) { expect(r.bestArm).toBeGreaterThanOrEqual(0); expect(r.bestArm).toBeLessThan(arms.length) } });
  it('totalReward finite', () => { const r = thompsonSampling(arms, rew, 50); if (r) expect(Number.isFinite(r.totalReward)).toBe(true); });
});

describe('contextualBandit', () => {
  it('contract keys', () => { const r = contextualBandit(arms, 2, 40); expectKeys(r, ['test','totalReward','nIterations','nArms','nContext','history','apa']); });
  it('nArms matches input', () => { const r = contextualBandit(arms, 2, 40); if (r) expect(r.nArms).toBe(arms.length) });
  it('totalReward finite', () => { const r = contextualBandit(arms, 2, 40); if (r) expect(Number.isFinite(r.totalReward)).toBe(true) });
});

describe('policyGradient', () => {
  it('contract keys', () => { const r = policyGradient(arms, rew, 40); expectKeys(r, ['test','bestArm','finalProbs','totalReward','nEpisodes','history','apa']); });
  it('finalProbs sum to 1', () => { const r = policyGradient(arms, rew, 40); if (r) { const sum = r.finalProbs.reduce((s, v) => s + v, 0); expect(sum).toBeCloseTo(1) } });
  it('bestArm within range', () => { const r = policyGradient(arms, rew, 40); if (r) { expect(r.bestArm).toBeGreaterThanOrEqual(0); expect(r.bestArm).toBeLessThan(arms.length) } });
});

describe('softmaxBandit', () => {
  it('contract keys', () => expectKeys(softmaxBandit(arms, rew, 50), ['test','bestArm','valueEstimates','counts','totalReward','regret','history','tau','nIterations','apa']));
  it('regret >= 0', () => { const r = softmaxBandit(arms, rew, 50); if (r) expect(r.regret).toBeGreaterThanOrEqual(0) });
  it('counts sum to iterations', () => { const r = softmaxBandit(arms, rew, 50); if (r) { const sum = r.counts.reduce((s, v) => s + v, 0); expect(sum).toBe(50); } });
});

describe('qLearning', () => {
  it('contract keys', () => expectKeys(qLearning(3, 3, null, null, { episodes: 10 }), ['test','optimalPolicy','nStates','nActions','episodes','totalReward','apa']));
  it('null <2 states', () => expect(qLearning(1, 3, null, null, { episodes: 5 })).toBeNull());
  it('optimalPolicy array correct size', () => { const r = qLearning(3, 3, null, null, { episodes: 10 }); if (r) expect(r.optimalPolicy.length).toBe(3) });
});
describe('sarsa', () => {
  it('contract keys', () => expectKeys(sarsa(3, 3, null, null, { episodes: 10 }), ['test','optimalPolicy','nStates','nActions','episodes','totalReward','apa']));
  it('null <2 actions', () => expect(sarsa(3, 1, null, null, { episodes: 5 })).toBeNull());
  it('optimalPolicy non-empty', () => { const r = sarsa(3, 3, null, null, { episodes: 10 }); if (r) expect(r.optimalPolicy.length).toBeGreaterThan(0) });
});
describe('deepQNetwork', () => {
  it('contract keys', () => expectKeys(deepQNetwork(3, 3, { episodes: 5 }), ['test','nStates','nActions','episodes','hiddenSize','totalReward','apa']));
  it('null <2 states', () => expect(deepQNetwork(1, 3, { episodes: 3 })).toBeNull());
  it('totalReward finite', () => { const r = deepQNetwork(3, 3, { episodes: 5 }); if (r) expect(isFinite(r.totalReward)).toBe(true) });
});

describe('thompsonSampling uses real Beta sampling and finds the best arm', () => {
  it('identifies the deterministically-best arm', () => {
    const rewards = [() => 0, () => 1, () => 0, () => 0]; // arm 1 always rewards
    const r = thompsonSampling([0, 1, 2, 3], rewards, 300, { seed: 5 });
    expect(r.bestArm).toBe(1);
    expect(r.valueEstimates[1]).toBeGreaterThan(0.8);
  });
});

describe('qLearning/sarsa use the supplied transition model', () => {
  // Deterministic MDP: reach state 2 (the goal) by taking action 1 from s0 then s1.
  const transitions = [[0, 1], [0, 2], [2, 2]];
  const rewards = [[0, 0], [0, 1], [1, 1]];
  it('qLearning recovers the optimal policy', () => {
    const r = qLearning(3, 2, rewards, transitions, { episodes: 100, seed: 1 });
    expect(r.optimalPolicy[0]).toBe(1);
    expect(r.optimalPolicy[1]).toBe(1);
  });
  it('sarsa recovers the optimal policy', () => {
    const r = sarsa(3, 2, rewards, transitions, { episodes: 200, seed: 1, epsilon: 0.1 });
    expect(r.optimalPolicy[0]).toBe(1);
    expect(r.optimalPolicy[1]).toBe(1);
  });
});

describe('contextualBandit (LinUCB) inverts A and uses a contextual reward', () => {
  it('beats random by exploiting context', () => {
    const armWeights = [[3, 0], [-3, 0], [0, 3], [0, -3]];
    const r = contextualBandit(armWeights, 2, 400, { seed: 1, alpha: 1 });
    expect(r.totalReward / 400).toBeGreaterThan(0.6); // random policy ~0.5
  });
});

describe('deepQNetwork learns Q-values with real backprop on an MDP', () => {
  const transitions = [[0, 1], [0, 2], [2, 2]];
  const rewards = [[0, 0], [0, 1], [1, 1]];
  it('recovers the optimal greedy action at the start state', () => {
    const r = deepQNetwork(3, 2, { rewards, transitions, episodes: 400, lr: 0.05, gamma: 0.9, seed: 2, epsilon: 0.2 });
    expect(r.optimalPolicy[0]).toBe(1);
  });
});
