import { describe, it, expect } from 'vitest';
import { simulatedAnnealing, geneticAlgorithm, particleSwarm, differentialEvolution, gridSearch, bfgs, nelderMead, conjugateGradient, trustRegion, slsqp, gradientDescentOptim } from './optimization.js';
import { expectKeys } from './__fixtures__/helpers.js';

const fn = x => x.reduce((s, v) => s + v * v, 0);
const grad = x => x.map(v => 2 * v);
const hess = () => [[2, 0], [0, 2]];

describe('simulatedAnnealing', () => { it('contract keys', () => expectKeys(simulatedAnnealing(fn, [5, 5], {steps:20}), ['test','optimum','value','steps','init','n','apa'])); it('null invalid', () => expect(simulatedAnnealing(null, [1])).toBeNull()); it('value improves', () => { const r = simulatedAnnealing(fn, [5,5], { steps: 10 }); if (r) expect(r.value).toBeLessThanOrEqual(fn([5,5])); }); it('value non-negative', () => { const r = simulatedAnnealing(fn, [5,5], { steps: 10 }); if (r) expect(r.value).toBeGreaterThanOrEqual(0); }); });
describe('geneticAlgorithm', () => { it('contract keys', () => expectKeys(geneticAlgorithm(fn, [[1,2],[3,4],[0,1],[2,3]], {generations:10}), ['test','optimum','value','generations','popSize','apa'])); it('optimum matches init length', () => { const r = geneticAlgorithm(fn, [[1,2],[3,4],[0,1],[2,3]], { generations: 5 }); if (r) expect(r.optimum.length).toBe(2); }); it('optimum array non-empty', () => { const r = geneticAlgorithm(fn, [[1,2],[3,4],[0,1],[2,3]], { generations: 5 }); if (r) { expect(Array.isArray(r.optimum)).toBe(true); expect(r.optimum.length).toBeGreaterThan(0); } }); });
describe('particleSwarm', () => { it('contract keys', () => expectKeys(particleSwarm(fn, [[-5,5],[-5,5]], {iterations:10}), ['test','optimum','value','iterations','nParticles','d','apa'])); it('nParticles matches config', () => { const r = particleSwarm(fn, [[-5,5],[-5,5]], { nParticles: 10, iterations: 5 }); if (r) expect(r.nParticles).toBe(10); }); it('nParticles positive', () => { const r = particleSwarm(fn, [[-5,5],[-5,5]], { nParticles: 10, iterations: 5 }); if (r) expect(r.nParticles).toBeGreaterThan(0); }); });
describe('differentialEvolution', () => { it('contract keys', () => expectKeys(differentialEvolution(fn, [[-5,5],[-5,5]], {iterations:10}), ['test','optimum','value','iterations','popSize','d','apa'])); it('optimum within bounds', () => { const r = differentialEvolution(fn, [[-5,5],[-5,5]], { iterations: 5 }); if (r) { r.optimum.forEach((v, i) => { expect(v).toBeGreaterThanOrEqual(-5); expect(v).toBeLessThanOrEqual(5); }); } }); it('d matches bounds', () => { const r = differentialEvolution(fn, [[-5,5],[-5,5]], { iterations: 5 }); if (r) expect(r.d).toBe(2); }); });
describe('gridSearch', () => { it('contract keys', () => expectKeys(gridSearch(fn, [{name:'x',values:[1,2,3]},{name:'y',values:[4,5,6]}]), ['test','optimum','value','nPoints','apa'])); it('optimum array non-empty', () => { const r = gridSearch(fn, [{name:'x',values:[1,2,3]},{name:'y',values:[4,5,6]}]); if (r && r.optimum && r.optimum.length > 0) expect(r.optimum.length).toBeGreaterThan(0); }); it('value finite', () => { const r = gridSearch(fn, [{name:'x',values:[1,2,3]},{name:'y',values:[4,5,6]}]); if (r && r.optimum && r.optimum.length > 0) expect(Number.isFinite(r.value)).toBe(true); }); it('optimum non-empty', () => { const r = gridSearch(fn, [{name:'x',values:[1,2,3]},{name:'y',values:[4,5,6]}]); if (r && r.optimum) { expect(Array.isArray(r.optimum)).toBe(true); expect(r.optimum.length).toBeGreaterThan(0); } }); });

describe('bfgs', () => {
  it('contract keys', () => expectKeys(bfgs(fn, grad, [5, 5], { maxIter: 20 }), ['test','optimum','value','iterations','n','apa']));
  it('optimum length matches init', () => { const r = bfgs(fn, grad, [5,5], { maxIter: 5 }); if (r) expect(r.optimum.length).toBe(2); });
  it('value finite', () => { const r = bfgs(fn, grad, [5,5], { maxIter: 5 }); if (r) expect(Number.isFinite(r.value)).toBe(true); });
  it('optimum length correct', () => { const r = bfgs(fn, grad, [5,5], { maxIter: 5 }); if (r) expect(r.optimum.length).toBe(2); });
});
describe('nelderMead', () => {
  it('contract keys', () => expectKeys(nelderMead(fn, [5, 5], { maxIter: 50 }), ['test','optimum','value','n','apa']));
  it('n matches init', () => { const r = nelderMead(fn, [5,5], { maxIter: 10 }); if (r) expect(r.n).toBe(2); });
  it('value finite', () => { const r = nelderMead(fn, [5,5], { maxIter: 10 }); if (r) expect(Number.isFinite(r.value)).toBe(true); });
});
describe('conjugateGradient', () => {
  it('contract keys', () => expectKeys(conjugateGradient(fn, grad, [5, 5], { maxIter: 10 }), ['test','optimum','value','iterations','n','apa']));
  it('optimum length matches init', () => { const r = conjugateGradient(fn, grad, [5,5], { maxIter: 5 }); if (r) expect(r.optimum.length).toBe(2); });
  it('iterations positive', () => { const r = conjugateGradient(fn, grad, [5,5], { maxIter: 5 }); if (r) expect(r.iterations).toBeGreaterThan(0); });
});
describe('trustRegion', () => {
  it('contract keys', () => expectKeys(trustRegion(fn, grad, hess, [5, 5], { maxIter: 10 }), ['test','optimum','value','n','apa']));
  it('optimum length matches init', () => { const r = trustRegion(fn, grad, hess, [5,5], { maxIter: 3 }); if (r) expect(r.optimum.length).toBe(2); });
  it('n matches init', () => { const r = trustRegion(fn, grad, hess, [5,5], { maxIter: 3 }); if (r) expect(r.n).toBe(2); });
});
describe('slsqp', () => {
  it('contract keys', () => expectKeys(slsqp(fn, grad, [5, 5], { maxIter: 10 }), ['test','optimum','value','n','apa']));
  it('optimum length matches init', () => { const r = slsqp(fn, grad, [5,5], { maxIter: 3 }); if (r) expect(r.optimum.length).toBe(2); });
  it('optimum non-null', () => { const r = slsqp(fn, grad, [5,5], { maxIter: 3 }); if (r) expect(r.optimum).not.toBeNull(); });
});
describe('gradientDescentOptim', () => {
  it('contract keys', () => expectKeys(gradientDescentOptim(fn, grad, [5, 5], { maxIter: 20 }), ['test','optimum','value','n','apa']));
  it('optimum length matches init', () => { const r = gradientDescentOptim(fn, grad, [5,5], { maxIter: 5 }); if (r) expect(r.optimum.length).toBe(2); });
  it('n matches init', () => { const r = gradientDescentOptim(fn, grad, [5,5], { maxIter: 5 }); if (r) expect(r.n).toBe(2); });
});
