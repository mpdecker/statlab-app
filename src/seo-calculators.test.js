import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { calculatorPages, generateSeoCalculatorPages, renderCalculatorPage, renderSitemap } from '../scripts/generate-seo-calculators.mjs';

describe('SEO calculator pages', () => {
  it('declares the expansive statistical calculator suite', () => {
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
      'one-way-anova',
      'welch-anova',
      'two-way-anova',
      'rm-anova',
      'tukey-hsd',
      'eta-squared-calculator',
      'ab-test-significance',
      'latency-percentile-significance',
      'llm-eval-significance',
      'chi-square-test',
      'pearson-correlation',
      'linear-regression',
      'sample-size-power',
      'random-effects-meta-analysis',
    ]);
    expect(calculatorPages.length).toBe(23);
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

  it('renders developer performance benchmarking pages (A/B testing, latency percentiles, LLM evals)', () => {
    const abPage = calculatorPages.find((c) => c.slug === 'ab-test-significance');
    const abHtml = renderCalculatorPage(abPage);
    expect(abHtml).toContain('A/B testing statistical significance calculator');
    expect(abHtml).toContain('VoxelPulse');

    const latencyPage = calculatorPages.find((c) => c.slug === 'latency-percentile-significance');
    const latencyHtml = renderCalculatorPage(latencyPage);
    expect(latencyHtml).toContain('Latency percentile (p95 / p99) significance calculator');
    expect(latencyHtml).toContain('VoxelAssurance');

    const llmPage = calculatorPages.find((c) => c.slug === 'llm-eval-significance');
    const llmHtml = renderCalculatorPage(llmPage);
    expect(llmHtml).toContain('LLM evaluation benchmark significance calculator');
  });

  it('writes calculator routes plus sitemap and robots files', () => {
    const root = mkdtempSync(join(tmpdir(), 'statlab-seo-'));
    generateSeoCalculatorPages(root);
    expect(existsSync(join(root, 'calculators', 'index.html'))).toBe(true);
    expect(existsSync(join(root, 'calculators', 'welch-t-test', 'index.html'))).toBe(true);
    expect(existsSync(join(root, 'calculators', 'mann-whitney-u', 'index.html'))).toBe(true);
    expect(existsSync(join(root, 'calculators', 'ab-test-significance', 'index.html'))).toBe(true);
    expect(existsSync(join(root, 'calculators', 'latency-percentile-significance', 'index.html'))).toBe(true);
    expect(existsSync(join(root, 'calculators', 'llm-eval-significance', 'index.html'))).toBe(true);

    const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8');
    expect(sitemap.match(/<loc>/g)).toHaveLength(calculatorPages.length + 2);
    expect(sitemap).toContain('https://statlab-3z6.pages.dev/calculators/llm-eval-significance/');
    expect(readFileSync(join(root, 'robots.txt'), 'utf8')).toContain('Sitemap: https://statlab-3z6.pages.dev/sitemap.xml');
  });

  it('keeps sitemap URLs aligned with calculator pages', () => {
    const sitemap = renderSitemap();
    for (const page of calculatorPages) {
      expect(sitemap).toContain(`https://statlab-3z6.pages.dev/calculators/${page.slug}/`);
    }
  });
});
