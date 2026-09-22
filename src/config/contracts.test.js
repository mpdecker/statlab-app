import { describe, it, expect } from 'vitest';
import { TREE } from './tree.js';
import { CHART_FOR_TEST } from './chartMap.js';
// Integration test: validates the app's method TREE against every statlab
// method it exposes, via runners defined locally in ./fixtures/.
import { runTreeTest, RUNNERS } from './fixtures/runners.js';
import { expectInferenceResult } from './fixtures/helpers.js';

const TREE_IDS = TREE.flatMap(c => c.tests.map(t => t.id));
const NULL_OK = new Set(['bootstrap', 'med_bootstrap', 'partial_dep', 'perm_imp', 'feat_interact', 'discrete_vot']);

describe('TREE integration contracts', () => {
  it('every TREE id has a runner', () => {
    const missing = TREE_IDS.filter(id => !RUNNERS[id]);
    expect(missing, `missing runners: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('every TREE id has chart mapping', () => {
    const missing = TREE_IDS.filter(id => CHART_FOR_TEST[id] == null);
    expect(missing, `missing charts: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('runner count matches TREE size', () => {
    expect(TREE_IDS.length).toBe(232);
  });

  TREE_IDS.forEach(id => {
    it(`${id} executes without throw`, () => {
      expect(() => runTreeTest(id)).not.toThrow();
    });

    it(`${id} returns inference-shaped result`, () => {
      const r = runTreeTest(id);
      if (NULL_OK.has(id)) {
        expect(r).toBeNull();
        return;
      }
      expectInferenceResult(r);
    });
  });
});
