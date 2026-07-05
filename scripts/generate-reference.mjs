/**
 * Regenerate regression-oracle snapshots for reference.json (fixture groups).
 * Run: node scripts/generate-reference.mjs
 */
import { writeFileSync, readFileSync } from 'fs';
import { oneWayANOVA, welchANOVA } from '../packages/statlab/src/methods/anova.js';
import { mannWhitney, binomialTest, twoPropZ } from '../packages/statlab/src/methods/categorical.js';
import { mediation } from '../packages/statlab/src/methods/regression.js';
import { metaAnalysis } from '../packages/statlab/src/methods/multivariate.js';
import { mkGroups, GROUP_A, GROUP_B, mkTabular } from '../packages/statlab/src/methods/fixtures/core.js';

const ref = JSON.parse(readFileSync('packages/statlab/src/methods/__fixtures__/reference.json', 'utf8'));
const rows = mkTabular();

ref.anova.oneWay_fixture_groups = (() => {
  const r = oneWayANOVA(mkGroups());
  return { F: r.F, dfB: r.dfB, dfW: r.dfW, p: r.p };
})();
ref.anova.welch_fixture_groups = (() => {
  const r = welchANOVA(mkGroups());
  return { F: r.F, p: r.p };
})();
ref.categorical.mannWhitney_ab = { p: mannWhitney(GROUP_A, GROUP_B).p };
ref.categorical.binomial_12_20 = { p: binomialTest(12, 20, 0.5).p };
ref.categorical.twoPropZ_35_50 = (() => {
  const r = twoPropZ(35, 50, 28, 50);
  return { z: r.z, p: r.p };
})();
ref.regression.mediation_tabular = (() => {
  const r = mediation(rows.map(x => x.x), rows.map(x => x.m), rows.map(x => x.y));
  return { ab: r.ab, z_sobel: r.z_sobel, p_sobel: r.p_sobel };
})();
ref.meta.two_studies = (() => {
  const r = metaAnalysis([{ label: 'a', d: 0.5, se: 0.1 }, { label: 'b', d: 0.3, se: 0.2 }]);
  return { dRE: r.dRE, p: r.p };
})();

writeFileSync('packages/statlab/src/methods/__fixtures__/reference.json', `${JSON.stringify(ref, null, 2)}\n`);
console.log('Updated packages/statlab/src/methods/__fixtures__/reference.json');
