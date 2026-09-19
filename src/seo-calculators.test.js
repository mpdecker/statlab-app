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
    ]);
    expect(calculatorPages.length).toBe(82);
  });

  it('renders static HTML with canonical metadata, math formulas, code snippets, JSON-LD, and VoxelPulse/VoxelAssurance CTAs', () => {
    const page = calculatorPages.find((candidate) => candidate.slug === 'mann-whitney-u');
    const html = renderCalculatorPage(page);
    expect(html).toContain('<title>Mann-Whitney U calculator | StatLab</title>');
    expect(html).toContain('<link rel="canonical" href="https://statlab-3z6.pages.dev/calculators/mann-whitney-u/">');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('Run this test live in StatLab');
    expect(html).toContain('Python (SciPy / Statsmodels)');
    expect(html).toContain('TypeScript (@statlab/core)');
    expect(html).toContain('VoxelPulse Telemetry Control Plane');
    expect(html).toContain('VoxelAssurance Release Readiness');
  });

  it('renders new statistical families (Probability distributions, SPC, Information theory, Reliability)', () => {
    const klPage = calculatorPages.find((c) => c.slug === 'kl-divergence-calculator');
    expect(renderCalculatorPage(klPage)).toContain('Kullback-Leibler (KL) divergence calculator');

    const cpkPage = calculatorPages.find((c) => c.slug === 'cpk-process-capability-calculator');
    expect(renderCalculatorPage(cpkPage)).toContain('Cpk and Cp process capability index calculator');

    const acfPage = calculatorPages.find((c) => c.slug === 'auto-correlation-acf-pacf');
    expect(renderCalculatorPage(acfPage)).toContain('Autocorrelation (ACF) and Partial Autocorrelation (PACF) calculator');

    const mtbfPage = calculatorPages.find((c) => c.slug === 'mtbf-mttr-reliability');
    expect(renderCalculatorPage(mtbfPage)).toContain('MTBF, MTTR, and Availability reliability calculator');
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
    expect(sitemap).toContain('https://statlab-3z6.pages.dev/calculators/granger-causality/');
    expect(readFileSync(join(root, 'robots.txt'), 'utf8')).toContain('Sitemap: https://statlab-3z6.pages.dev/sitemap.xml');
  });

  it('keeps sitemap URLs aligned with calculator pages', () => {
    const sitemap = renderSitemap();
    for (const page of calculatorPages) {
      expect(sitemap).toContain(`https://statlab-3z6.pages.dev/calculators/${page.slug}/`);
    }
  });
});
