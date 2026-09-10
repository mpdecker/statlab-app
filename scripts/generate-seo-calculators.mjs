import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ORIGIN = process.env.STATLAB_SITE_ORIGIN || 'https://statlab-3z6.pages.dev';

export const calculatorPages = [
  {
    slug: 'welch-t-test',
    title: "Welch's t-test calculator",
    family: 'Compare means',
    description: "Run a Welch two-sample t-test for unequal variances, with t, degrees of freedom, p-value, effect size, confidence interval, and APA-ready language.",
    keywords: ['Welch t-test', 'two sample t-test', 'unequal variances', 'effect size'],
    inputs: ['Group A numeric values', 'Group B numeric values', 'Confidence level', 'Alternative hypothesis'],
    example: { a: [12, 14, 15, 15, 18, 21], b: [9, 11, 11, 13, 14, 16], result: 't ≈ 1.94, Welch df ≈ 9.8, two-sided p ≈ .082' },
    when: 'Use when two independent groups may have different variances or sample sizes.',
    cautions: ['Inspect outliers before treating the mean as representative.', 'Report the Welch degrees of freedom rather than forcing pooled-variance assumptions.'],
    workbenchId: 't_welch',
  },
  {
    slug: 'mann-whitney-u',
    title: 'Mann-Whitney U calculator',
    family: 'Nonparametric',
    description: 'Compare two independent groups with a rank-based Mann-Whitney U test, including U, z, p-value, rank-biserial effect size, and Cliff’s delta.',
    keywords: ['Mann-Whitney U', 'Wilcoxon rank-sum', 'nonparametric test', 'rank-biserial'],
    inputs: ['Group A numeric or ordinal values', 'Group B numeric or ordinal values', 'Tie handling', 'Alternative hypothesis'],
    example: { a: [1, 2, 3, 5, 8], b: [4, 6, 7, 9, 10], result: 'U = 4, rank-biserial r ≈ -0.68, asymptotic p reported in StatLab' },
    when: 'Use when a two-group comparison should be based on ranks rather than mean differences.',
    cautions: ['The test compares distributions, not only medians.', 'Large tie blocks deserve explicit reporting.'],
    workbenchId: 'mwu',
  },
  {
    slug: 'one-way-anova',
    title: 'One-way ANOVA calculator',
    family: 'ANOVA',
    description: 'Compare three or more group means with one-way ANOVA, effect sizes, and multiple-comparison follow-ups.',
    keywords: ['one-way ANOVA', 'F test', 'eta squared', 'Tukey HSD'],
    inputs: ['Groups of numeric values', 'Alpha level', 'Post-hoc correction'],
    example: { a: ['control: 5, 7, 8, 9', 'treatment A: 8, 9, 10, 12', 'treatment B: 11, 13, 13, 15'], result: 'F statistic, p-value, η², ω², Tukey and Bonferroni follow-ups' },
    when: 'Use when a continuous outcome is measured across three or more independent groups.',
    cautions: ['Use Welch ANOVA when variances are strongly unequal.', 'Pairwise comparisons should be corrected for multiplicity.'],
    workbenchId: 'anova',
  },
  {
    slug: 'chi-square-test',
    title: 'Chi-square test calculator',
    family: 'Categorical',
    description: 'Run chi-square tests for independence or goodness-of-fit with expected counts, χ², p-value, and Cramér’s V.',
    keywords: ['chi-square test', 'contingency table', 'Cramér V', 'goodness of fit'],
    inputs: ['Observed count table', 'Expected proportions or second categorical variable', 'Alpha level'],
    example: { a: ['rows: product A/B', 'columns: converted/not converted'], result: 'χ², df, p-value, expected cell counts, and Cramér’s V' },
    when: 'Use for count data organized by categories.',
    cautions: ['Small expected counts may require Fisher’s exact test.', 'Report the table shape and effect size with the p-value.'],
    workbenchId: 'chi_ind',
  },
  {
    slug: 'pearson-correlation',
    title: 'Pearson correlation calculator',
    family: 'Correlation',
    description: 'Estimate Pearson correlation with r, confidence interval, p-value, and APA-ready reporting language.',
    keywords: ['Pearson correlation', 'r', 'correlation p value', 'confidence interval'],
    inputs: ['X values', 'Y values', 'Confidence level'],
    example: { a: ['x: 1, 2, 3, 4, 5', 'y: 2, 3, 5, 7, 8'], result: 'r, t statistic, df, p-value, and confidence interval' },
    when: 'Use for linear association between two continuous variables.',
    cautions: ['Check scatterplots for nonlinearity and influential points.', 'Correlation is not a causal estimate.'],
    workbenchId: 'pearson',
  },
  {
    slug: 'linear-regression',
    title: 'Linear regression calculator',
    family: 'Regression',
    description: 'Fit simple or multiple OLS regression with coefficients, standard errors, intervals, model fit, and residual diagnostics.',
    keywords: ['linear regression', 'OLS', 'regression coefficients', 'R squared'],
    inputs: ['Outcome column', 'Predictor columns', 'Optional polynomial or hierarchical terms'],
    example: { a: ['y: outcome', 'x: predictor matrix'], result: 'β coefficients, standard errors, t tests, R², adjusted R², residual summaries' },
    when: 'Use when modeling a continuous outcome as a function of one or more predictors.',
    cautions: ['Inspect residuals and leverage.', 'Use robust or generalized models when assumptions fail materially.'],
    workbenchId: 'ols_simple',
  },
  {
    slug: 'sample-size-power',
    title: 'Sample size and power calculator',
    family: 'Power analysis',
    description: 'Estimate power or required sample size for common t-tests, correlations, proportions, ANOVA, regression, and survival designs.',
    keywords: ['power calculator', 'sample size', 'required N', 'statistical power'],
    inputs: ['Effect size', 'Alpha', 'Target power', 'Design family'],
    example: { a: ['effect size d = 0.5', 'alpha = .05', 'target power = .80'], result: 'Required N and achieved power estimates for the chosen design' },
    when: 'Use before data collection or when documenting detectable effect sizes.',
    cautions: ['Power is only as good as the effect-size assumption.', 'Pre-register assumptions when feasible.'],
    workbenchId: 'pow_t',
  },
  {
    slug: 'random-effects-meta-analysis',
    title: 'Random-effects meta-analysis calculator',
    family: 'Meta-analysis',
    description: 'Pool study-level effect sizes with random-effects meta-analysis, heterogeneity statistics, and prediction intervals.',
    keywords: ['random effects meta-analysis', 'DerSimonian Laird', 'I squared', 'tau squared'],
    inputs: ['Study labels', 'Effect sizes', 'Standard errors'],
    example: { a: ['study 1: d=.50, se=.20', 'study 2: d=.30, se=.25', 'study 3: d=.80, se=.18'], result: 'Random-effects pooled estimate, Q, I², τ², and prediction interval' },
    when: 'Use when combining comparable study-level effects while allowing between-study heterogeneity.',
    cautions: ['Inspect heterogeneity before treating the pooled effect as a single answer.', 'Document inclusion criteria and sensitivity checks.'],
    workbenchId: 'meta',
  },
];

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const calculatorPath = (page) => `/calculators/${page.slug}/`;

export function renderCalculatorPage(page) {
  const url = `${ORIGIN}${calculatorPath(page)}`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: page.title,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    url,
    description: page.description,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: 'StatLab' },
  };
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(page.title)} | StatLab</title>
  <meta name="description" content="${esc(page.description)}">
  <meta name="keywords" content="${esc(page.keywords.join(', '))}">
  <link rel="canonical" href="${url}">
  <meta property="og:title" content="${esc(page.title)} | StatLab">
  <meta property="og:description" content="${esc(page.description)}">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="website">
  <script type="application/ld+json">${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>
  <style>
    :root{color-scheme:dark;--bg:#080b10;--panel:#111722;--panel2:#0d121b;--text:#edf4ff;--muted:#9db0c7;--accent:#5df2b6;--line:#243246;--gold:#ffd166}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top left,#152033 0,#080b10 42rem);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.55}.wrap{max-width:1120px;margin:0 auto;padding:28px 20px 64px}a{color:var(--accent)}.nav{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:56px}.brand{font-weight:900;letter-spacing:.08em;text-decoration:none;color:var(--text)}.brand span{color:var(--accent)}.hero{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(320px,.8fr);gap:28px;align-items:start}.eyebrow{color:var(--accent);font-size:13px;text-transform:uppercase;letter-spacing:.16em;font-weight:800}h1{font-size:clamp(40px,7vw,76px);line-height:.92;margin:12px 0 18px;letter-spacing:-.04em}p.lede{font-size:20px;color:#c9d7e8;max-width:720px}.panel{background:linear-gradient(180deg,var(--panel),var(--panel2));border:1px solid var(--line);border-radius:22px;padding:24px;box-shadow:0 20px 80px rgba(0,0,0,.28)}.button{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:13px 18px;background:var(--accent);color:#06100c;text-decoration:none;font-weight:900;margin:8px 10px 8px 0}.button.secondary{background:transparent;color:var(--text);border:1px solid var(--line)}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:28px}.card{background:rgba(255,255,255,.035);border:1px solid var(--line);border-radius:18px;padding:20px}.card h2,.card h3{margin-top:0}.muted{color:var(--muted)}code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.example{background:#071018;border:1px solid #1b2a3d;border-radius:16px;padding:16px;margin-top:14px}.list{padding-left:20px}.footer{border-top:1px solid var(--line);margin-top:48px;padding-top:24px;color:var(--muted);font-size:14px}@media(max-width:860px){.hero,.grid{grid-template-columns:1fr}.nav{align-items:flex-start;flex-direction:column}h1{font-size:44px}}
  </style>
</head>
<body>
  <main class="wrap">
    <nav class="nav" aria-label="Primary">
      <a class="brand" href="/">STAT<span>LAB</span></a>
      <div><a href="/calculators/">Calculators</a> · <a href="/?launch=1#workbench">Open workbench</a> · <a href="https://www.npmjs.com/package/@statlab/core">@statlab/core</a></div>
    </nav>
    <section class="hero">
      <div>
        <div class="eyebrow">${esc(page.family)} calculator</div>
        <h1>${esc(page.title)}</h1>
        <p class="lede">${esc(page.description)}</p>
        <a class="button" href="/?launch=1&test=${encodeURIComponent(page.workbenchId)}#workbench">Run this test in StatLab</a>
        <a class="button secondary" href="https://www.npmjs.com/package/@statlab/core">Use @statlab/core</a>
      </div>
      <aside class="panel">
        <h2>Example</h2>
        <div class="example"><strong>Inputs</strong><ul class="list">${page.example.a.map((item) => `<li>${esc(Array.isArray(item) ? item.join(', ') : item)}</li>`).join('')}</ul><strong>Output</strong><p>${esc(page.example.result)}</p></div>
        <p class="muted">The full workbench computes live results in your browser; data is not uploaded.</p>
      </aside>
    </section>
    <section class="grid" aria-label="Method notes">
      <article class="card"><h2>When to use it</h2><p>${esc(page.when)}</p></article>
      <article class="card"><h2>Inputs</h2><ul class="list">${page.inputs.map((input) => `<li>${esc(input)}</li>`).join('')}</ul></article>
      <article class="card"><h2>Reporting cautions</h2><ul class="list">${page.cautions.map((caution) => `<li>${esc(caution)}</li>`).join('')}</ul></article>
      <article class="card"><h2>Technical teams</h2><p>Need repeatable statistical validation in a product or release pipeline? StatLab feeds into VoxelPulse for technical telemetry and VoxelAssurance for release-readiness review.</p><p><a href="mailto:decker.matthieu@gmail.com?subject=StatLab%20technical%20tier">Ask about the technical tier</a></p></article>
    </section>
    <section class="panel" style="margin-top:28px"><h2>Related calculator URLs</h2><p class="muted">Each page is statically rendered for indexing and sharing.</p><ul class="list">${calculatorPages.filter((candidate) => candidate.slug !== page.slug).slice(0, 5).map((candidate) => `<li><a href="${calculatorPath(candidate)}">${esc(candidate.title)}</a></li>`).join('')}</ul></section>
    <footer class="footer">StatLab is a zero-runtime-dependency statistical engine and browser workbench. Confirm high-stakes analyses with domain review and reference software.</footer>
  </main>
</body>
</html>`;
}

export function renderCalculatorIndex() {
  const cards = calculatorPages.map((page) => `<a class="card" href="${calculatorPath(page)}"><h2>${esc(page.title)}</h2><p>${esc(page.description)}</p><span>${esc(page.family)} →</span></a>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>StatLab statistical calculators</title><meta name="description" content="Static SEO entry points for StatLab calculators: Welch t-test, Mann-Whitney U, ANOVA, chi-square, correlation, regression, power, and meta-analysis."><link rel="canonical" href="${ORIGIN}/calculators/"><style>body{margin:0;background:#080b10;color:#edf4ff;font-family:Inter,ui-sans-serif,system-ui,sans-serif}.wrap{max-width:1120px;margin:auto;padding:40px 20px}a{color:#5df2b6}.brand{font-weight:900;letter-spacing:.08em;text-decoration:none;color:#edf4ff}.brand span{color:#5df2b6}h1{font-size:clamp(40px,7vw,78px);line-height:.9}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.card{display:block;text-decoration:none;color:#edf4ff;background:#111722;border:1px solid #243246;border-radius:18px;padding:20px}.card p{color:#9db0c7}@media(max-width:760px){.grid{grid-template-columns:1fr}}</style></head><body><main class="wrap"><a class="brand" href="/">STAT<span>LAB</span></a><h1>Statistical calculators</h1><p>Static, shareable method pages backed by the zero-dependency StatLab engine.</p><section class="grid">${cards}</section></main></body></html>`;
}

export function renderSitemap() {
  const urls = ['/', '/calculators/', ...calculatorPages.map(calculatorPath)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((path) => `  <url><loc>${ORIGIN}${path}</loc></url>`).join('\n')}\n</urlset>\n`;
}

export function generateSeoCalculatorPages(root = join(process.cwd(), 'public')) {
  const calculatorsDir = join(root, 'calculators');
  rmSync(calculatorsDir, { recursive: true, force: true });
  mkdirSync(calculatorsDir, { recursive: true });
  writeFileSync(join(calculatorsDir, 'index.html'), renderCalculatorIndex());
  for (const page of calculatorPages) {
    const dir = join(calculatorsDir, page.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'index.html'), renderCalculatorPage(page));
  }
  writeFileSync(join(root, 'sitemap.xml'), renderSitemap());
  writeFileSync(join(root, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  generateSeoCalculatorPages();
  console.log(`Generated ${calculatorPages.length} calculator pages in public/calculators`);
}



