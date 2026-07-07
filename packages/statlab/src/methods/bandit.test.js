import { describe, it, expect } from 'vitest';
import { expectKeys } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };
import { epsilonGreedy, ucb, thompsonSampling, contextualBandit, policyGradient, softmaxBandit, qLearning, sarsa, deepQNetwork } from './bandit.js';

const rb = ref.bandit;

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

describe('ucb oracle (constant rewards)', () => {
  it('valueEstimates match oracle', () => {
    const r = ucb(rb.ucb_basic.arms, rb.ucb_basic.arms, rb.ucb_basic.nIterations);
    expect(r.bestArm).toBe(rb.ucb_basic.bestArm);
    r.valueEstimates.forEach((v, i) => expect(v).toBeCloseTo(rb.ucb_basic.valueEstimates[i], 4));
    expect(r.counts).toEqual(rb.ucb_basic.counts);
    expect(r.totalReward).toBeCloseTo(rb.ucb_basic.totalReward, 4);
    expect(r.regret).toBeCloseTo(rb.ucb_basic.regret, 4);
  });
});

describe('hardening — bandit edge cases', () => {
  const detRew = [() => 1, () => 0, () => 1, () => 0, () => 1, () => 0];
  it('epsilonGreedy null for empty arms', () => expect(epsilonGreedy([], rew, 50)).toBeNull());
  it('epsilonGreedy null for null rewards', () => expect(epsilonGreedy(arms, null, 50)).toBeNull());
  it('epsilonGreedy reproducible', () => { const r1 = epsilonGreedy(arms, detRew, 50, { seed: 123 }); const r2 = epsilonGreedy(arms, detRew, 50, { seed: 123 }); expect(r1.totalReward).toBe(r2.totalReward); });
  it('ucb null for single arm', () => expect(ucb([0.5], [() => 1], 50)).toBeNull());
  it('ucb reproducible', () => { const r1 = ucb(arms, detRew, 50); const r2 = ucb(arms, detRew, 50); expect(r1.totalReward).toBe(r2.totalReward); });
  it('thompsonSampling null for empty', () => expect(thompsonSampling([], rew, 50)).toBeNull());
  it('thompsonSampling reproducible', () => { const r1 = thompsonSampling(arms, detRew, 100, { seed: 99 }); const r2 = thompsonSampling(arms, detRew, 100, { seed: 99 }); expect(r1.totalReward).toBe(r2.totalReward); });
  it('contextualBandit null for nContext<1', () => expect(contextualBandit(arms, 0, 40)).toBeNull());
  it('contextualBandit reproducible', () => { const r1 = contextualBandit(arms, 2, 40, { seed: 7 }); const r2 = contextualBandit(arms, 2, 40, { seed: 7 }); expect(r1.totalReward).toBe(r2.totalReward); });
  it('policyGradient null for single arm', () => expect(policyGradient([0.5], [() => 1], 40)).toBeNull());
  it('policyGradient reproducible', () => { const r1 = policyGradient(arms, detRew, 40, { seed: 42 }); const r2 = policyGradient(arms, detRew, 40, { seed: 42 }); expect(r1.totalReward).toBe(r2.totalReward); });
  it('softmaxBandit null <2 arms', () => expect(softmaxBandit([0.5], [() => 1], 50)).toBeNull());
  it('softmaxBandit reproducible', () => { const r1 = softmaxBandit(arms, detRew, 50, { seed: 11 }); const r2 = softmaxBandit(arms, detRew, 50, { seed: 11 }); expect(r1.totalReward).toBe(r2.totalReward); });
  it('qLearning null nActions<2', () => expect(qLearning(3, 1, null, null, { episodes: 5 })).toBeNull());
  it('qLearning reproducible', () => { const r1 = qLearning(3, 3, null, null, { episodes: 10, seed: 5 }); const r2 = qLearning(3, 3, null, null, { episodes: 10, seed: 5 }); expect(r1.totalReward).toBe(r2.totalReward); });
  it('sarsa null nStates<2', () => expect(sarsa(1, 3, null, null, { episodes: 5 })).toBeNull());
  it('sarsa reproducible', () => { const r1 = sarsa(3, 3, null, null, { episodes: 10, seed: 3 }); const r2 = sarsa(3, 3, null, null, { episodes: 10, seed: 3 }); expect(r1.totalReward).toBe(r2.totalReward); });
  it('deepQNetwork null episodes<5', () => expect(deepQNetwork(3, 3, { episodes: 2 })).toBeNull());
  it('deepQNetwork reproducible', () => { const r1 = deepQNetwork(3, 3, { episodes: 5, seed: 1 }); const r2 = deepQNetwork(3, 3, { episodes: 5, seed: 1 }); expect(r1.totalReward).toBe(r2.totalReward); });
});
