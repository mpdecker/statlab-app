import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { calculatorPages, generateSeoCalculatorPages, renderCalculatorPage, renderSitemap } from '../scripts/generate-seo-calculators.mjs';

describe('SEO calculator pages', () => {
  it('declares the milestone 82 statistical calculator suite', () => {
    expect(calculatorPages.map((page) => page.slug)).toEqual([
      'welch-t-test',
      'student-t-test',
      'paired-t-test',
      'one-sample-t-test',
      't-test-effect-size-calculator',
      'z-score-calculator',
      't-score-calculator',
      'f-distribution-calculator',
      'chi-square-distribution-calculator',
      'pca-variance-explained',
      'manova-calculator',
      'odds-ratio-relative-risk',
      'mantel-haenszel-test',
      'granger-causality',
      'sharpe-ratio-calculator',
      'ljung-box-test',
      'negative-binomial-regression',
      'quantile-regression',
      'mann-whitney-u',
      'wilcoxon-signed-rank',
      'kruskal-wallis',
      'rank-biserial-correlation',
      'friedman-test',
      'dunn-test',
      'kolmogorov-smirnov-test',
      'one-way-anova',
      'welch-anova',
      'two-way-anova',
      'rm-anova',
      'ancova-calculator',
      'tukey-hsd',
      'eta-squared-calculator',
      'bayesian-ab-test',
      'bayesian-t-test',
      'kaplan-meier-survival',
      'weibull-reliability',
      'log-rank-test',
      'hazard-ratio-calculator',
      'shapiro-wilk-test',
      'levene-test',
      'vif-multicollinearity',
      'durbin-watson-test',
      'augmented-dickey-fuller',
      'confusion-matrix-precision-recall',
      'roc-auc-calculator',
      'cohens-kappa-calculator',
      'fleiss-kappa-calculator',
      'icc-intraclass-correlation',
      'brier-score-calculator',
      'standardized-root-mean-residual',
      'chi-square-test',
      'cramers-v-calculator',
      'fishers-exact-test',
      'mcnemar-test',
      'z-test-two-proportions',
      'pearson-correlation',
      'spearman-rank-correlation',
      'kendall-tau-correlation',
      'linear-regression',
      'logistic-regression',
      'poisson-regression',
      'ab-test-significance',
      'latency-percentile-significance',
      'llm-eval-significance',
      'sample-size-power',
      'random-effects-meta-analysis',
      'kl-divergence-calculator',
      'shannon-entropy-calculator',
      'cross-entropy-loss-calculator',
      'cpk-process-capability-calculator',
      'xbar-r-control-chart-calculator',
      'six-sigma-dpmo-calculator',
      'auto-correlation-acf-pacf',
      'arch-garch-volatility',
      'cointegration-johansen-eg',
      'number-needed-to-treat',
      'diagnostic-likelihood-ratio',
      'bland-altman-plot',
      'ridge-lasso-elasticnet',
      'ndcg-ranking-metrics',
      'mean-absolute-percentage-error',
      'mtbf-mttr-reliability',
      'bootstrap-confidence-interval',
      'permutation-test-two-samples',
      'response-surface-methodology',
      'plackett-burman-screening',
      'taguchi-signal-to-noise',
      'cosine-similarity-calculator',
      'wasserstein-distance-earth-movers',
      'mahalanobis-distance-calculator',
      'vector-euclidean-manhattan-distance',
      'morans-i-spatial-autocorrelation',
      'var-vector-autoregression',
      'value-at-risk-var',
      'cronbach-alpha-reliability',
      'rasch-item-response-theory',
      'point-biserial-correlation',
      'matthews-correlation-coefficient',
      'concordance-correlation-coefficient',
      'cusum-control-chart',
      'bray-curtis-dissimilarity',
      'minkowski-p-norm-distance',
      'gev-generalized-extreme-value',
      'pareto-distribution-calculator',
      'survival-nelson-aalen',
      'hazard-ratio-logrank-ci',
      'cochran-q-test',
      'cochran-armitage-trend',
      'jonckheere-terpstra-test',
      'kendall-w-concordance',
      'goodman-kruskal-gamma',
      'somers-d-calculator',
      'hoeffding-d-dependence',
      'mutual-information-score',
      'huber-loss-robust-regression',
      'quantal-response-probit',
      'tobit-censored-regression',
      'grubbs-outlier-test',
      'dixon-q-test',
      'reliability-block-diagram',
      'half-life-decay-rate',
      'arrhenius-equation-activation',
      'logistic-growth-carrying-capacity',
      'hill-equation-ec50',
      'michaelis-menten-kinetics',
      'gumbel-distribution-calculator',
      'weibull-two-parameter-fit',
      'log-normal-distribution-calculator',
      'gamma-distribution-calculator',
      'cauchy-distribution-calculator',
      'beta-distribution-calculator',
      'dirichlet-distribution-calculator',
      'hypergeometric-distribution-calculator',
      'negative-binomial-distribution',
      'multinomial-distribution-calculator',
      'box-cox-transformation',
      'yeo-johnson-transformation',
      'spectral-density-periodogram',
      'signal-to-noise-ratio-snr',
      'cusum-mean-variance-spc',
      'exponential-distribution-calculator',
      'poisson-distribution-calculator',
      'log-logistic-distribution',
      'rayleigh-distribution-calculator',
      'studentized-range-distribution',
      'cox-proportional-hazards-ratio',
      'partial-correlation-calculator',
      'sem-path-analysis-fit',
      'canonical-correlation-analysis',
      'k-means-silhouette-score',
      'davies-bouldin-index',
      'calinski-harabasz-index',
      'jaccard-similarity-index',
      'hamming-distance-calculator',
      'haversine-great-circle-distance',
      'ewma-control-chart-calculator',
      'p-chart-binomial-spc',
      'c-chart-poisson-spc',
      'median-absolute-deviation',
      'winsorized-mean-trimmed-mean',
      'log-rank-test-trend',
      'cox-snell-residuals',
      'mcnemar-bowker-symmetry',
      'stuart-maxwell-test',
      'biserial-correlation-calculator',
      'tetrachoric-correlation-calculator',
      'polychoric-correlation-calculator',
      'guttman-scale-reproducibility',
      'bhattacharyya-distance-calculator',
      'hellinger-distance-calculator',
      'interquartile-range-iqr',
      'bowley-skewness-calculator',
      'kurtosis-calculator',
      'zero-inflated-poisson-zip',
      'log-gamma-distribution',
      'maxwell-boltzmann-distribution',
      'welch-power-calculator',
      'cohen-w-chi-square-effect',
      'cohen-f2-regression-effect',
      'dunnett-test-control',
      'logistic-regression-odds-ratio',
      'cooks-distance-outliers',
      'breusch-pagan-test',
      'white-test-heteroscedasticity',
      'goldfeld-quandt-test',
      'breusch-godfrey-test',
      'hansen-j-statistic',
      'sargan-test-overidentification',
      'hausman-specification-test',
      'pesaran-cd-dependence',
      'dickey-fuller-gls-dfgls',
      'kpss-stationarity-test',
      'zivot-andrews-unit-root',
      'chow-test-structural-break',
      'bds-test-independence',
      'diebold-mariano-test',
      'mendershausen-overlap-coefficient',
      'mood-median-test',
      'brown-forsythe-test',
      'fligner-killeen-test',
      'morans-i-spatial-autocorrelation',
      'gearys-c-spatial-association',
      'ripleys-k-function-spatial-points',
      'semi-variogram-spatial-interpolation',
      'gower-distance-mixed-data',
      'hopkins-statistic-clustering-tendency',
      'cusum-sq-structural-stability',
      'ljung-box-portmanteau-test',
      'toda-yamamoto-granger-causality',
      'auto-regressive-distributed-lag-ardl',
      'tost-two-one-sided-tests',
      'rayleigh-test-circular-uniformity',
      'watson-williams-circular-test',
      'two-parameter-logistic-irt-2pl',
      'mcdonald-omega-reliability',
      'cochran-q-meta-analysis-heterogeneity',
      'funnel-plot-egger-regression',
      'lasso-ridge-elastic-net-cv-score',
      'concordance-index-c-index',
      'brier-skill-score-bss',
      'generalized-additive-model-gam-spline',
      'beta-regression-proportions',
      'zero-inflated-negative-binomial-zinb',
      'hurdle-poisson-model',
      'continuous-wavelet-transform-cwt',
      'cross-wavelet-coherence',
      'hilbert-transform-instantaneous-phase',
      'graph-density-centrality-metrics',
      'betweenness-closeness-centrality',
      'modularity-community-detection',
      'competing-risks-cumulative-incidence',
      'restricted-mean-survival-time-rmst',
      'frailty-model-clustered-survival',
      'pot-peaks-over-threshold-gpd',
      'return-period-extreme-events',
      'transfer-entropy-time-series',
      'conditional-mutual-information',
      'accelerated-life-testing-alt',
      'gage-rr-measurement-system',
      'tolerance-interval-normal',
    ]);
    expect(calculatorPages.length).toBe(240);
  });

  it('renders static HTML with canonical metadata, math formulas, code snippets, JSON-LD, and open CTAs', () => {
    const page = calculatorPages.find((candidate) => candidate.slug === 'mann-whitney-u');
    const html = renderCalculatorPage(page);
    expect(html).toContain('<title>Mann-Whitney U calculator | StatLab</title>');
    expect(html).toContain('<link rel="canonical" href="https://statlab.fyi/calculators/mann-whitney-u/">');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('Run this test live in StatLab');
    expect(html).toContain('Python (SciPy / Statsmodels)');
    expect(html).toContain('TypeScript (@statlab/core)');
    expect(html).toContain('StatLab Interactive Workbench');
    expect(html).toContain('@statlab/core TypeScript Library');
  });

  it('renders new statistical families (Probability distributions, SPC, Information theory, Reliability, Resampling, DOE, Vector Distance, Extreme Value, Kinetic Growth)', () => {
    const decayPage = calculatorPages.find((c) => c.slug === 'half-life-decay-rate');
    expect(renderCalculatorPage(decayPage)).toContain('Half-life, decay constant &amp; mean lifetime calculator');

    const lognormPage = calculatorPages.find((c) => c.slug === 'log-normal-distribution-calculator');
    expect(renderCalculatorPage(lognormPage)).toContain('Log-normal distribution &amp; geometric mean calculator');

    const psdPage = calculatorPages.find((c) => c.slug === 'spectral-density-periodogram');
    expect(renderCalculatorPage(psdPage)).toContain('Fast Fourier Transform (FFT) Power Spectral Density calculator');

    const bcPage = calculatorPages.find((c) => c.slug === 'box-cox-transformation');
    expect(renderCalculatorPage(bcPage)).toContain('Box-Cox power transformation calculator');
  });

  it('writes calculator routes plus sitemap and robots files', () => {
    const root = mkdtempSync(join(tmpdir(), 'statlab-seo-'));
    generateSeoCalculatorPages(root);
    expect(existsSync(join(root, 'calculators', 'index.html'))).toBe(true);
    expect(existsSync(join(root, 'calculators', 'welch-t-test', 'index.html'))).toBe(true);
    expect(existsSync(join(root, 'calculators', 'z-score-calculator', 'index.html'))).toBe(true);
    expect(existsSync(join(root, 'calculators', 'pca-variance-explained', 'index.html'))).toBe(true);
    expect(existsSync(join(root, 'calculators', 'granger-causality', 'index.html'))).toBe(true);

    const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8');
    expect(sitemap.match(/<loc>/g)).toHaveLength(calculatorPages.length + 2);
    expect(sitemap).toContain('https://statlab.fyi/calculators/granger-causality/');
    expect(readFileSync(join(root, 'robots.txt'), 'utf8')).toContain('Sitemap: https://statlab.fyi/sitemap.xml');
  });

  it('keeps sitemap URLs aligned with calculator pages', () => {
    const sitemap = renderSitemap();
    for (const page of calculatorPages) {
      expect(sitemap).toContain(`https://statlab.fyi/calculators/${page.slug}/`);
    }
  });
});
