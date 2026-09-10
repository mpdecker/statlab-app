import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { calculatorPages, generateSeoCalculatorPages, renderCalculatorPage, renderSitemap } from '../scripts/generate-seo-calculators.mjs';

describe('SEO calculator pages', () => {
  it('declares the priority stat calculator families', () => {
    expect(calculatorPages.map((page) => page.slug)).toEqual([
      'welch-t-test',
      'mann-whitney-u',
      'one-way-anova',
      'chi-square-test',
      'pearson-correlation',
      'linear-regression',
      'sample-size-power',
      'random-effects-meta-analysis',
    ]);
  });

  it('renders static HTML with canonical metadata, JSON-LD, and funnel CTAs', () => {
    const page = calculatorPages.find((candidate) => candidate.slug === 'mann-whitney-u');
    const html = renderCalculatorPage(page);
    expect(html).toContain('<title>Mann-Whitney U calculator | StatLab</title>');
    expect(html).toContain('<link rel="canonical" href="https://statlab-3z6.pages.dev/calculators/mann-whitney-u/">');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('Run this test in StatLab');
    expect(html).toContain('VoxelPulse');
    expect(html).toContain('VoxelAssurance');
  });

  it('writes calculator routes plus sitemap and robots files', () => {
    const root = mkdtempSync(join(tmpdir(), 'statlab-seo-'));
    generateSeoCalculatorPages(root);
    expect(existsSync(join(root, 'calculators', 'index.html'))).toBe(true);
    expect(existsSync(join(root, 'calculators', 'welch-t-test', 'index.html'))).toBe(true);
    expect(existsSync(join(root, 'calculators', 'mann-whitney-u', 'index.html'))).toBe(true);
    const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8');
    expect(sitemap.match(/<loc>/g)).toHaveLength(calculatorPages.length + 2);
    expect(sitemap).toContain('https://statlab-3z6.pages.dev/calculators/random-effects-meta-analysis/');
    expect(readFileSync(join(root, 'robots.txt'), 'utf8')).toContain('Sitemap: https://statlab-3z6.pages.dev/sitemap.xml');
  });

  it('keeps sitemap URLs aligned with calculator pages', () => {
    const sitemap = renderSitemap();
    for (const page of calculatorPages) {
      expect(sitemap).toContain(`https://statlab-3z6.pages.dev/calculators/${page.slug}/`);
    }
  });
});
