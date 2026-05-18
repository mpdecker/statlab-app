/** Per-test methods notes — simplified implementations vs. reference software. */
export const METHOD_NOTES = {
  shapiroWilk: 'Shapiro–Wilk uses Blom-type scores and a simplified p-value mapping; flagged approximate when n < 10. Confirm with your lab’s standard package for publication.',
  bayes_r: 'Bayes factor for correlation uses a Jeffreys-style approximation, not the full JZS pipeline used for the t-test.',
  bayes_t: 'JZS Bayes factor via numerical integration (500-point quadrature). Compare to BayesFactor or JASP for critical decisions.',
  logistic: 'Logistic regression: Newton–Raphson MLE with Wald SEs from the observed Fisher information. No clustered SEs or exact LR tests.',
  ordinal: 'Proportional-odds ordinal model with monotone thresholds (softplus). Not full polr/ordinal::clm diagnostics.',
  poisson: 'Poisson GLM with deviance; no robust SEs. Check overdispersion before trusting Poisson.',
  negbinom: 'Negative binomial via iterative dispersion; simplified vs. MASS::glm.nb.',
  manova: 'MANOVA: Wilks Λ with Bartlett χ² approximation; Pillai, Hotelling–Lawley, and Roy’s largest root from E⁻¹H eigenvalues.',
  pca: 'PCA via correlation matrix and Jacobi eigen-decomposition (not SVD on centered data for all paths).',
  efa: 'EFA: PCA extraction + varimax rotation; not ML factor analysis.',
  hlm_ri: 'Two-level random-intercept model via variance-components OLS; not REML (lme4).',
  hlm_rs: 'Random slope extension with simplified growth specification.',
  irt_1pl: 'Rasch 1PL joint ML (JMLE-style), 80 iterations; not marginal ML (WINSTEPS).',
  irt_2pl: '2PL joint calibration; discrimination can be unstable in small samples.',
  lca: 'Latent class EM with hard assignment in BIC; 2–4 classes only.',
  psm: '1:1 nearest-neighbor propensity matching without caliper; check balance manually.',
  iv2sls: '2SLS with homoskedastic SEs; weak-instrument diagnostics are minimal.',
  its: 'Segmented regression ITS; no ARIMA errors or autocorrelation adjustment.',
  rdd: 'Local linear RD with optional bandwidth; no bias-corrected inference.',
  meta: 'Random-effects meta (DerSimonian–Laird τ²); not REML or Hartung–Knapp adjustment.',
  kmeans: 'Lloyd k-means with random init; local optima possible.',
  hclust: 'Hierarchical clustering on Euclidean distance; linkage height only (no full dendrogram object).',
  community: 'Greedy modularity communities; not Louvain/Leiden.',
  parallel: 'Parallel analysis with 40 Monte Carlo draws; increase reps in dedicated software for final decisions.',
  omega: "McDonald's ω from a 1-factor correlation model; ω_h equals ω_t in this formulation.",
  trimmed: 'Yuen trimmed-mean test (20% default); verify trim proportion for your design.',
  med_bootstrap: 'Percentile bootstrap for the indirect effect (B replicates); seed-controlled for reproducibility.',
  bootstrap: 'Percentile bootstrap CI; seed-controlled. Use BCa in R for publication if bias is a concern.',
};

export const APPROXIMATE_TESTS = new Set([
  'shapiroWilk', 'normality', 'bayes_r', 'bayes_t',
  'logistic', 'ordinal', 'poisson', 'negbinom',
  'hlm_ri', 'hlm_rs', 'irt_1pl', 'irt_2pl', 'lca',
  'psm', 'iv2sls', 'its', 'rdd', 'meta',
]);

export function methodNoteForTest(active, result) {
  if (result?.approximate) return 'This result uses an approximate method; see Methods note.';
  if (result?.sw?.approximate) return METHOD_NOTES.shapiroWilk;
  if (APPROXIMATE_TESTS.has(active) && METHOD_NOTES[active]) return METHOD_NOTES[active];
  if (active === 'normality' && result?.sw) return METHOD_NOTES.shapiroWilk;
  return METHOD_NOTES[active] || null;
}
