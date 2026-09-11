import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { calculatorPages, generateSeoCalculatorPages, renderCalculatorPage, renderSitemap } from '../scripts/generate-seo-calculators.mjs';

describe('SEO calculator pages', () => {
  it('declares the expansive statistical calculator suite (35 pages)', () => {
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
      'shapiro-wilk-test',
      'levene-test',
      'confusion-matrix-precision-recall',
      'roc-auc-calculator',
      'cohens-kappa-calculator',
      'ab-test-significance',
      'latency-percentile-significance',
      'llm-eval-significance',
      'chi-square-test',
      'pearson-correlation',
      'linear-regression',
      'sample-size-power',
      'random-effects-meta-analysis',
    ]);
    expect(calculatorPages.length).toBe(37);
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

  it('renders advanced statistical categories (Bayesian, Survival, AI ML Metrics, Diagnostics)', () => {
    const bayesPage = calculatorPages.find((c) => c.slug === 'bayesian-ab-test');
    expect(renderCalculatorPage(bayesPage)).toContain('Bayesian A/B testing calculator');

    const survivalPage = calculatorPages.find((c) => c.slug === 'kaplan-meier-survival');
    expect(renderCalculatorPage(survivalPage)).toContain('Kaplan-Meier survival analysis calculator');

    const mlPage = calculatorPages.find((c) => c.slug === 'confusion-matrix-precision-recall');
    expect(renderCalculatorPage(mlPage)).toContain('Confusion matrix, Precision, Recall, and F1 calculator');

    const diagPage = calculatorPages.find((c) => c.slug === 'shapiro-wilk-test');
    expect(renderCalculatorPage(diagPage)).toContain('Shapiro-Wilk normality test calculator');
  });

  it('writes calculator routes plus sitemap and robots files', () => {
    const root = mkdtempSync(join(tmpdir(), 'statlab-seo-'));
    generateSeoCalculatorPages(root);
    expect(existsSync(join(root, 'calculators', 'index.html'))).toBe(true);
    expect(existsSync(join(root, 'calculators', 'welch-t-test', 'index.html'))).toBe(true);
    expect(existsSync(join(root, 'calculators', 'bayesian-ab-test', 'index.html'))).toBe(true);
    expect(existsSync(join(root, 'calculators', 'kaplan-meier-survival', 'index.html'))).toBe(true);
    expect(existsSync(join(root, 'calculators', 'confusion-matrix-precision-recall', 'index.html'))).toBe(true);

    const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8');
    expect(sitemap.match(/<loc>/g)).toHaveLength(calculatorPages.length + 2);
    expect(sitemap).toContain('https://statlab-3z6.pages.dev/calculators/kaplan-meier-survival/');
    expect(readFileSync(join(root, 'robots.txt'), 'utf8')).toContain('Sitemap: https://statlab-3z6.pages.dev/sitemap.xml');
  });

  it('keeps sitemap URLs aligned with calculator pages', () => {
    const sitemap = renderSitemap();
    for (const page of calculatorPages) {
      expect(sitemap).toContain(`https://statlab-3z6.pages.dev/calculators/${page.slug}/`);
    }
  });
});
