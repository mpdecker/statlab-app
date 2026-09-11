import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { calculatorPages, generateSeoCalculatorPages, renderCalculatorPage, renderSitemap } from '../scripts/generate-seo-calculators.mjs';

describe('SEO calculator pages', () => {
  it('declares the milestone 50 statistical calculator suite', () => {
    expect(calculatorPages.map((page) => page.slug)).toEqual([
      'welch-t-test',
      'student-t-test',
      'paired-t-test',
      'one-sample-t-test',
      't-test-effect-size-calculator',
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
    ]);
    expect(calculatorPages.length).toBe(53);
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

  it('renders time series, regression, multi-rater agreement, and exact categorical tests', () => {
    const adfPage = calculatorPages.find((c) => c.slug === 'augmented-dickey-fuller');
    expect(renderCalculatorPage(adfPage)).toContain('Augmented Dickey-Fuller (ADF) stationarity test calculator');

    const logitPage = calculatorPages.find((c) => c.slug === 'logistic-regression');
    expect(renderCalculatorPage(logitPage)).toContain('Logistic regression calculator');

    const fleissPage = calculatorPages.find((c) => c.slug === 'fleiss-kappa-calculator');
    expect(renderCalculatorPage(fleissPage)).toContain("Fleiss' Kappa calculator for 3+ raters");

    const fisherPage = calculatorPages.find((c) => c.slug === 'fishers-exact-test');
    expect(renderCalculatorPage(fisherPage)).toContain("Fisher's exact test calculator");
  });

  it('writes calculator routes plus sitemap and robots files', () => {
    const root = mkdtempSync(join(tmpdir(), 'statlab-seo-'));
    generateSeoCalculatorPages(root);
    expect(existsSync(join(root, 'calculators', 'index.html'))).toBe(true);
    expect(existsSync(join(root, 'calculators', 'welch-t-test', 'index.html'))).toBe(true);
    expect(existsSync(join(root, 'calculators', 'augmented-dickey-fuller', 'index.html'))).toBe(true);
    expect(existsSync(join(root, 'calculators', 'fleiss-kappa-calculator', 'index.html'))).toBe(true);
    expect(existsSync(join(root, 'calculators', 'fishers-exact-test', 'index.html'))).toBe(true);

    const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8');
    expect(sitemap.match(/<loc>/g)).toHaveLength(calculatorPages.length + 2);
    expect(sitemap).toContain('https://statlab-3z6.pages.dev/calculators/augmented-dickey-fuller/');
    expect(readFileSync(join(root, 'robots.txt'), 'utf8')).toContain('Sitemap: https://statlab-3z6.pages.dev/sitemap.xml');
  });

  it('keeps sitemap URLs aligned with calculator pages', () => {
    const sitemap = renderSitemap();
    for (const page of calculatorPages) {
      expect(sitemap).toContain(`https://statlab-3z6.pages.dev/calculators/${page.slug}/`);
    }
  });
});
