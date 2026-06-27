/**
 * Minimal runners for every TREE test id (integration / contract tests).
 */
import { tWelch, tOne, tPaired, yuentTest, zTestKnownSD, signTest } from '../means.js';
// tOne used by sensitivity runner
import {
  oneWayANOVA, welchANOVA, twoWayANOVA, ancova, rmANOVA, friedman, kruskalWallis, cochranQ,
} from '../anova.js';
import {
  chiSquare, chiGoF, fisherExact, mcnemar, binomialTest, onePropZ, twoPropZ,
} from '../categorical.js';
import {
  mannWhitney, wilcoxonSR,
} from '../nonparametric.js';
import {
  tost, bayesFactorT, bayesFactorCorr,
  grubbsTest, leveneTest, bartlettTest, bonferroni, holm, bh, sensitivityLOO,
} from '../categorical.js';
import {
  pearsonTest, spearman, kendallTau, partialCorr, pointBiserial,
  simpleOLS, multipleOLS, polynomialOLS, hierarchicalOLS, logisticReg,
  ordinalLogisticRegression, poissonRegression, negativeBinomialRegression,
  mediation, moderation,
} from '../regression.js';
import {
  pca, efa, cronbachAlpha, splitHalf, icc, cohensKappa,
  metaAnalysis, differencesInDifferences, convertEffectSize,
  manova, canonicalCorr, linearDiscriminant,
} from '../multivariate.js';
import { omegaMcDonald, parallelAnalysis, irtRasch1PL, irt2PL, scaleScore } from '../psychometrics.js';
import { kmeans, hierarchicalCluster, latentClassAnalysis } from '../clustering.js';
import { hlmRandomIntercept, hlmRandomSlope, iccMultilevel } from '../multilevel.js';
import {
  propensityScoreMatch, iv2sls, interruptedTimeSeries, regressionDiscontinuity,
} from '../causal.js';
import {
  centralityMeasures, communityDetection, sociogramLayout, networkFromEdgeList,
} from '../network.js';
import { normalityDP, shapiroWilk, bootstrapCI, requiredN, requiredNCorr } from '../../math/distributions.js';
import {
  powerANOVA, powerChi, powerLogistic, powerMixed, powerMediation,
} from '../../math/power.js';
import {
  mkGroups, mkTabular, mkRmMatrix, mkScaleMatrix, mk2x2Table, mkMetaStudies, GROUP_A, GROUP_B,
} from './core.js';
import { starEdgeList } from './phase3.js';
import { causalRows, nestedHLM, binaryMatrix } from './phase3.js';

const ROWS = mkTabular();
const GROUPS = mkGroups();
const RM = mkRmMatrix(ROWS);
const SCALE = mkScaleMatrix();
const VARS = ['item1', 'item2', 'item3', 'item4'];
const XS = ROWS.map(r => r.x);
const YS = ROWS.map(r => r.y);
const ZS = ROWS.map(r => r.z);
const MS = ROWS.map(r => r.m);

function dichotomize(matrix) {
  return matrix.map(row => row.map(v => (v > 2.5 ? 1 : 0)));
}

const RUNNERS = {
  t_welch: () => tWelch(GROUP_A, GROUP_B),
  t_one: () => tOne(GROUP_A, 5),
  t_paired: () => tPaired(ROWS.map(r => r.rm1), ROWS.map(r => r.rm2)),
  trimmed: () => yuentTest(GROUP_A, GROUP_B),
  z_known: () => zTestKnownSD(avg(GROUP_A), 5, 2, GROUP_A.length),
  sign: () => signTest(GROUP_A, 5),

  anova: () => oneWayANOVA(GROUPS),
  welch_anova: () => welchANOVA(GROUPS),
  twoway: () => twoWayANOVA(ROWS, 'cat1', 'cat2', 'y'),
  ancova: () => ancova(GROUPS, GROUPS.map(g => ROWS.filter(r => r.group === g.name).map(r => r.x))),
  rm_anova: () => rmANOVA(RM),
  kruskal: () => kruskalWallis(GROUPS),
  friedman: () => friedman(RM),
  cochranQ: () => cochranQ(RM.map(row => row.map(v => (v > 43 ? 1 : 0)))),

  mwu: () => mannWhitney(GROUP_A, GROUP_B),
  wilcoxon: () => wilcoxonSR(GROUP_A, GROUP_B),

  pearson: () => pearsonTest(XS, YS),
  spearman: () => spearman(XS, YS),
  kendall: () => kendallTau(XS, YS),
  partial: () => partialCorr(XS, YS, ZS),
  pointbis: () => pointBiserial(ROWS.map(r => (r.cat1 === 'yes' ? 1 : 0)), ROWS.map(r => r.y)),

  ols_simple: () => simpleOLS(XS, YS),
  ols_multi: () => multipleOLS(YS, ROWS.map(r => [r.x, r.z]), ['x', 'z']),
  polynomial: () => polynomialOLS(XS, YS, 2),
  hierarchical: () => hierarchicalOLS(YS, ROWS.map(r => [r.x]), ROWS.map(r => [r.z]), ['x'], ['z']),
  logistic: () => logisticReg(ROWS.map(r => (r.y > 14 ? 1 : 0)), ROWS.map(r => [r.x, r.z]), ['x', 'z']),
  ordinal: () => ordinalLogisticRegression(
    ROWS.map(r => 1 + Math.min(4, Math.floor(r.y / 4))),
    ROWS.map(r => [r.x]),
    ['x'],
  ),
  poisson: () => poissonRegression(ROWS.map(r => Math.max(0, Math.round(r.y / 3))), ROWS.map(r => [r.x]), ['x']),
  negbinom: () => negativeBinomialRegression(ROWS.map(r => Math.max(0, Math.round(r.y / 3))), ROWS.map(r => [r.x]), ['x']),
  mediation: () => mediation(XS, MS, YS),
  med_bootstrap: () => null,
  moderation: () => moderation(XS, ZS, YS, 'x', 'z'),

  chisq: () => chiSquare(mk2x2Table(), 'col1', 'col2'),
  chigof: () => chiGoF([10, 12, 8, 15, 11, 14], [12, 12, 12, 12, 12, 12]),
  fisher: () => fisherExact(10, 15, 12, 20),
  mcnemar: () => mcnemar(8, 14),
  binomial: () => binomialTest(12, 20, 0.5),
  prop1: () => onePropZ(35, 50, 0.5),
  prop2: () => twoPropZ(35, 50, 28, 50),

  tost: () => tost(GROUP_A, GROUP_B, -0.5, 0.5),
  bayes_t: () => {
    const tw = tWelch(GROUP_A, GROUP_B);
    return tw ? { ...tw, ...bayesFactorT(tw.t, tw.na, tw.nb), test: 'Bayesian t-test (JZS)' } : null;
  },
  bayes_r: () => {
    const pr = pearsonTest(XS, YS);
    return pr ? { ...pr, ...bayesFactorCorr(pr.r, pr.n), test: 'Bayesian Correlation' } : null;
  },

  pca: () => pca(ROWS, VARS),
  efa: () => efa(ROWS, VARS, 2),
  manova: () => manova(ROWS, ['item1', 'item2'], 'group'),
  cancorr: () => canonicalCorr(ROWS, ['item1', 'item2'], ['x', 'y']),
  lda: () => linearDiscriminant(ROWS, 'group', ['x', 'y']),
  cronbach: () => cronbachAlpha(SCALE),
  splithalf: () => splitHalf(SCALE),
  icc: () => icc(SCALE),
  kappa: () => cohensKappa(ROWS.map(r => r.cat1), ROWS.map(r => r.cat2)),

  omega: () => omegaMcDonald(SCALE),
  parallel: () => parallelAnalysis(ROWS, VARS),
  irt_1pl: () => irtRasch1PL(dichotomize(SCALE)),
  irt_2pl: () => irt2PL(binaryMatrix(50, 4)),
  scale_score: () => scaleScore(SCALE, { method: 'sum' }),

  hlm_ri: () => hlmRandomIntercept(nestedHLM(), 'y', 'school', ['x']),
  hlm_rs: () => hlmRandomSlope(nestedHLM(), 'y', 'school', 'x'),
  icc_ml: () => iccMultilevel(nestedHLM(), 'y', 'school'),

  kmeans: () => kmeans(ROWS, ['x', 'y'], 3),
  hclust: () => hierarchicalCluster(ROWS, ['x', 'y']),
  lca: () => latentClassAnalysis(ROWS, ['cat1', 'cat2'], 2),

  centrality: () => centralityMeasures(networkFromEdgeList(starEdgeList()).A),
  community: () => communityDetection(networkFromEdgeList(starEdgeList()).A),
  sociogram: () => sociogramLayout(networkFromEdgeList(starEdgeList()).A),

  meta: () => metaAnalysis(mkMetaStudies()),
  did: () => differencesInDifferences([10, 11], [12, 13], [15, 16], [18, 19]),
  psm: () => propensityScoreMatch(causalRows(), 'treat', 'y', ['x1', 'x2']),
  iv2sls: () => iv2sls(causalRows(), 'y', 'x1', 'z', ['x2']),
  its: () => interruptedTimeSeries([1, 2, 3, 4, 5, 6, 7, 8], [10, 10, 11, 10, 15, 16, 17, 18], 4.5),
  rdd: () => regressionDiscontinuity(
    Array.from({ length: 40 }, (_, i) => i - 20),
    Array.from({ length: 40 }, (_, i) => (i < 20 ? 5 : 8) + i * 0.05),
    0, 18,
  ),

  grubbs: () => grubbsTest([...GROUP_A, 99]),
  normality: () => {
    const dp = normalityDP(GROUP_A);
    const sw = shapiroWilk(GROUP_A);
    return { test: 'Normality Tests', dp, sw, apa: 'normality' };
  },
  homogeneity: () => ({
    test: 'Homogeneity',
    levene: leveneTest(GROUPS.map(g => g.vals)),
    bartlett: bartlettTest(GROUPS.map(g => g.vals)),
    apa: 'homogeneity',
  }),
  samplesize: () => ({
    test: 'Sample Size',
    ntTest: requiredN(0.5, 0.8),
    nCorr: requiredNCorr(0.3, 0.8),
    apa: 'sample size',
  }),
  pow_anova: () => ({ test: 'ANOVA Power', power: powerANOVA(0.25, 3, 40), apa: 'pow' }),
  pow_chi: () => ({ test: 'Chi Power', power: powerChi(0.2, 4, 80), apa: 'pow' }),
  pow_logit: () => ({ test: 'Logistic Power', power: powerLogistic(2, 0.3, 50), apa: 'pow' }),
  pow_mixed: () => ({ test: 'Mixed Power', power: powerMixed(0.05, 8, 12, 0.4), apa: 'pow' }),
  pow_med: () => ({ test: 'Mediation Power', ...powerMediation(0.3, 0.4, 0.1, 0.1, 400), apa: 'pow' }),

  effectconv: () => convertEffectSize('d', 0.5),
  corrections: () => {
    const pairs = [{ label: 'a', p: 0.04 }, { label: 'b', p: 0.03 }, { label: 'c', p: 0.2 }];
    return { test: 'Multiple Comparisons', pairs: bonferroni(pairs), apa: 'corr' };
  },
  bootstrap: () => null,
  sensitivity: () => {
    const r = sensitivityLOO(
      Array.from({ length: 15 }, (_, i) => 4 + i * 0.3),
      v => tOne(v, 5),
    );
    return r ? {
      test: 'LOO Sensitivity',
      ...r,
      apa: `LOO: ${r.nSig}/${r.n} significant, mean p = ${r.mean_p}, stable = ${r.stable}`,
    } : null;
  },
};

function avg(a) {
  return a.reduce((s, x) => s + x, 0) / (a.length || 1);
}

export function runTreeTest(id) {
  const fn = RUNNERS[id];
  if (!fn) throw new Error(`no runner for ${id}`);
  return fn();
}

export { RUNNERS };
