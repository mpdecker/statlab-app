export const RECOMMENDED_DATASETS = {
  // Compare Means
  t_welch: ['salaries', 'cps', 'iris'],
  t_one: ['iris', 'gapminder'],
  t_paired: ['sleep'],
  trimmed: ['diamonds', 'salaries'],
  z_known: ['iris', 'gapminder'],
  sign: ['sleep'],
  // Analysis of Variance
  anova: ['iris', 'diamonds'],
  welch_anova: ['diamonds', 'iris'],
  twoway: ['salaries', 'schools'],
  ancova: ['salaries', 'cps'],
  rm_anova: ['sleep'],
  kruskal: ['iris', 'diamonds'],
  friedman: ['sleep'],
  cochranQ: ['vocabtest'],
  // Nonparametric
  mwu: ['salaries', 'cps', 'diamonds'],
  wilcoxon: ['sleep'],
  // Correlation
  pearson: ['gapminder', 'diamonds'],
  spearman: ['gapminder', 'diamonds'],
  kendall: ['gapminder', 'salaries'],
  partial: ['salaries', 'affairs'],
  pointbis: ['salaries', 'affairs'],
  // Regression
  ols_simple: ['diamonds', 'gapminder'],
  ols_multi: ['diamonds', 'salaries'],
  polynomial: ['diamonds', 'gapminder'],
  hierarchical: ['salaries', 'cps'],
  logistic: ['affairs'],
  ordinal: ['salaries', 'diamonds'],
  poisson: ['affairs'],
  negbinom: ['affairs'],
  mediation: ['salaries', 'affairs'],
  med_bootstrap: ['salaries', 'affairs'],
  moderation: ['salaries', 'cps'],
  // Categorical
  chisq: ['diamonds', 'cps'],
  chigof: ['diamonds'],
  fisher: ['cps', 'affairs'],
  binomial: ['affairs', 'vocabtest'],
  prop1: ['affairs', 'cps'],
  prop2: ['cps', 'affairs'],
  // Multivariate
  pca: ['iris', 'diamonds'],
  efa: ['lifesat'],
  manova: ['iris', 'lifesat'],
  cancorr: ['diamonds', 'salaries'],
  lda: ['iris'],
  cronbach: ['lifesat'],
  splithalf: ['lifesat', 'vocabtest'],
  icc: ['lifesat', 'vocabtest'],
  // Psychometrics
  omega: ['lifesat'],
  parallel: ['lifesat'],
  irt_1pl: ['vocabtest'],
  irt_2pl: ['vocabtest'],
  scale_score: ['lifesat'],
  // Multilevel Models
  hlm_ri: ['schools', 'mathachieve'],
  hlm_rs: ['mathachieve', 'schools'],
  icc_ml: ['schools', 'mathachieve'],
  // Clustering
  kmeans: ['iris', 'diamonds'],
  hclust: ['iris', 'diamonds'],
  lca: ['vocabtest', 'lifesat'],
};

export function getRecommendedDatasets(testId) {
  return RECOMMENDED_DATASETS[testId] ?? [];
}
