import { TREE } from './tree.js';

// Headline categories get their own row; everything else (diagnostics, power
// calculators, and the long tail of specialty categories) is bucketed into
// "DIAGNOSTICS & TOOLS" so the summary stays readable as TREE grows. Counts are
// derived from TREE directly rather than hand-maintained, so they can't go stale.
//
// Shared between App.jsx (landing page, loads eagerly) and Workbench.jsx (the
// header's live test count, lazy-loaded) — kept in its own tiny module, rather
// than in either of those files, so neither has to import the other just for
// this.
const HEADLINE_CATS = [
  { cat: "COMPARE MEANS",       color: '#44dd88' },
  { cat: "ANALYSIS OF VARIANCE", label: "ANOVA", color: '#60a5fa' },
  { cat: "NONPARAMETRIC",       color: '#f0c040' },
  { cat: "CORRELATION",         color: '#c4ff00' },
  { cat: "REGRESSION",          color: '#ff6bd6' },
  { cat: "CATEGORICAL",         color: '#b980ff' },
  { cat: "EQUIVALENCE & BAYES", color: '#34d399' },
  { cat: "MULTIVARIATE",        color: '#34d399' },
  { cat: "PSYCHOMETRICS",       color: '#f472b6' },
  { cat: "MULTILEVEL MODELS",   color: '#2dd4bf' },
  { cat: "CLUSTERING",          color: '#fb923c' },
  { cat: "NETWORK",             color: '#a78bfa' },
  { cat: "META-ANALYSIS & CAUSAL", label: "META & CAUSAL", color: '#fbbf24' },
];

export const CORE_CATEGORY_NAMES = new Set(HEADLINE_CATS.map(h => h.cat));

export const TEST_CATEGORIES = (() => {
  const headlineNames = new Set(HEADLINE_CATS.map(h => h.cat));
  const rows = HEADLINE_CATS.map(h => ({
    cat: h.label || h.cat, color: h.color,
    n: TREE.find(c => c.cat === h.cat)?.tests.length || 0,
  }));
  const rest = TREE.filter(c => !headlineNames.has(c.cat)).reduce((s, c) => s + c.tests.length, 0);
  rows.push({ cat: "DIAGNOSTICS & TOOLS", n: rest, color: '#ff4444' });
  return rows;
})();

export const TOTAL_TEST_COUNT = TREE.reduce((s, c) => s + c.tests.length, 0);
