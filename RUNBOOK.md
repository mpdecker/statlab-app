# StatLab Runbook

> Production-grade statistical analysis engine. Zero external stats libraries.
> 85 modules · 1,034 functions · 4,403 tests · 0 failures

---

## Quick Start

```bash
npm install          # install deps (react, recharts, papaparse)
npm run dev          # start Vite dev server → http://localhost:5173
npm test             # run full test suite (4,403 tests)
npm run docs:list    # browse all 84 modules and their functions
npm run docs:show bayesian   # show all functions in a module
npm run docs:search garch    # search functions by name/description
npm run docs:fn moransI      # show detailed signature + params
```

---

## Project Structure

```
statlab/
├── index.html                  Entry point
├── README.md                   Full documentation
├── RUNBOOK.md                  This file
├── package.json                Scripts + deps
├── vite.config.js              Vite configuration
│
├── scripts/
│   ├── statlab.mjs             CLI helper — browse function library
│   └── document.mjs            Auto-documenter — injects section headers
│
├── src/
│   ├── main.jsx                React entry
│   ├── App.jsx                 Root component
│   ├── palette.js              Colors, fonts, CSS tokens
│   │
│   ├── math/                   ** Pure math — no React, no DOM **
│   │   ├── core.js             avg, corr, sampleVar, rank, fmtP, effect labels
│   │   ├── distributions.js    All CDFs/PDFs, normalCDF, tPVal, chiPVal, fPVal, ...
│   │   └── matrix.js           matMul, matInv, matTrans, jacobiEigen
│   │
│   ├── tests/                  ** 85 statistical modules — 1,034 functions **
│   │   ├── __fixtures__/       Test helpers + reference oracles
│   │   ├── means.js            Descriptive stats, t-tests, Cohen's d, sample size
│   │   ├── anova.js            One/two-way, Welch, ANCOVA, RM, Friedman, Kruskal-Wallis
│   │   ├── regression.js       OLS, logistic, Poisson, NB, mediation, moderation, ...
│   │   ├── categorical.js      Chi², Fisher, CMH, McNemar, FDR corrections, ...
│   │   ├── multivariate.js     PCA, EFA, MANOVA, CCA, LDA, meta, Cronbach, ICC, ...
│   │   ├── ... (80+ more modules covering every major statistical domain)
│   │
│   ├── data/
│   │   └── datasets.js         Built-in: Iris (150), Diamonds (200), Gapminder (33)
│   │
│   ├── config/
│   │   ├── tree.js             UI Navigator — 84 interactive test entries
│   │   └── methodNotes.js      Per-test methodology documentation (APA/assumptions/citations)
│   │
│   └── components/
│       ├── ui.jsx              Reusable UI components
│       ├── charts.jsx          TDistViz, QQPlot, ScreePlot, ForestPlot, ...
│       ├── InferenceConfig.jsx  Per-test parameter panel
│       ├── InferenceResults.jsx Result renderer
│       └── InferencePanel.jsx   Main orchestrator
```

---

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm test` | Run full test suite (4,403 tests) |
| `npm run test:watch` | Watch mode — reruns on file changes |
| `npm run test:coverage` | Run with coverage report |
| `npm run docs` | CLI helper (help menu) |
| `npm run docs:list` | List all 84 modules with function counts |
| `npm run docs:list -- -d` | List all modules with every function name + signature |
| `npm run docs:show <module>` | Show all functions in a module |
| `npm run docs:fn <name>` | Show detailed function signature + params |
| `npm run docs:search <query>` | Search functions by name, domain, or return keys |
| `npm run docs:generate` | Auto-inject section headers into all source files |

---

## Adding a New Statistical Function

### Step 1: Implement the function

Add to the appropriate `src/tests/<module>.js` file:

```javascript
// src/tests/<module>.js

// ── Function Name ─────────────────────────────────────────────
export function functionName(data, options = {}) {
  // Null guard
  if (!data || data.length < 5) return null;

  // Compute
  const result = ...;

  // Return standardized object
  return {
    test: 'Function Name',          // human-readable test name
    result: +result.toFixed(4),      // numeric output (use toFixed for precision)
    n: data.length,                  // always include sample size
    apa: `APA sentence here`         // publication-ready APA 7 text
  };
}
```

**Rules:**
- Import from `../math/core.js`, `../math/distributions.js`, `../math/matrix.js` only
- Return `{ test, ..., apa }` — every function MUST have `test` and `apa` keys
- Use `+value.toFixed(N)` for numeric precision
- Null guard at the top: return `null` for invalid/missing data
- Section header comment: `// ── Name ──` (50+ dashes to reach ~80 cols)
- No external stats libraries

### Step 2: Write tests

Create or update `src/tests/<module>.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { expectKeys } from './__fixtures__/helpers.js';
import { functionName } from './<module>.js';

describe('functionName', () => {
  // Contract test — always first
  it('contract keys', () => expectKeys(functionName(data), [
    'test', 'result', 'n', 'apa'
  ]));

  // Null guard
  it('null for short data', () => expect(functionName(shortData)).toBeNull());

  // Behavioral — numeric range
  it('result between 0 and 1', () => {
    const r = functionName(data);
    if (r) {
      expect(r.result).toBeGreaterThanOrEqual(0);
      expect(r.result).toBeLessThanOrEqual(1);
    }
  });

  // Behavioral — array dimensions
  it('r.n matches input length', () => {
    const r = functionName(data);
    if (r) expect(r.n).toBe(data.length);
  });
});
```

**Test requirements per function (minimum):**
1. Contract keys test (check all return object keys exist)
2. Null guard test (check function returns null for invalid/short data)
3. At least 1 behavioral test (range check, numeric validation, array dimension)

### Step 3: Update tree.js (if UI-visible)

Add to `src/config/tree.js` under the appropriate category:

```javascript
{
  cat: "CATEGORY NAME",
  tests: [
    { id: "my_test_id", label: "My Test Label", tag: "short · description · tags" },
  ],
}
```

### Step 4: Update methodNotes.js (if UI-visible)

Add methodology documentation to `src/config/methodNotes.js`:

```javascript
my_test_id: {
  description: "...",
  usage: "...",
  assumptions: ["...", "..."],
  cite: "Author (Year). Title. Journal.",
},
```

### Step 5: Verify

```bash
npm test                          # ensure all 4,403+ tests pass
npm run docs:generate             # update section headers
npm run docs:list                 # verify function count
```

---

## Test Patterns

### Contract test (required)

```javascript
it('contract keys', () => expectKeys(func(data), ['test', 'key1', 'key2', 'n', 'apa']));
```

### Null guard (required)

```javascript
it('null for invalid data', () => expect(func(null)).toBeNull());
it('null for short data', () => expect(func([1, 2])).toBeNull());
it('null for mismatched lengths', () => expect(func([1, 2], [3])).toBeNull());
```

### Numeric range

```javascript
it('value between 0 and 1', () => {
  const r = func(data);
  if (r) {
    expect(r.someKey).toBeGreaterThanOrEqual(0);
    expect(r.someKey).toBeLessThanOrEqual(1);
  }
});
```

### Array dimension

```javascript
it('returns array of correct length', () => {
  const r = func(data);
  if (r) expect(r.values.length).toBe(data.length);
});
```

### Finiteness

```javascript
it('values are finite', () => {
  const r = func(data);
  if (r) r.values.forEach(v => expect(Number.isFinite(v)).toBe(true));
});
```

### The `if (r)` guard

Always wrap behavioral assertions in `if (r)` — many functions return `null` for edge cases:

```javascript
it('check', () => {
  const r = func(data);
  if (r) { /* assertions here */ }
});
```

---

## Code Style

| Rule | Example |
|------|---------|
| No comments in functions | Implementation should be self-documenting |
| Section headers | `// ── Name ──` with 50+ trailing dashes |
| Imports at top | `import { avg, corr } from '../math/core.js';` |
| Exports only `function` | `export function name(...) { ... }` |
| Internal helpers | Prefix with `_`: `function _helper(...)` |
| Return format | `{ test: 'Name', ..., apa: 'APA text' }` |
| Numeric precision | `+value.toFixed(N)` |
| Null for invalid input | `if (!data || data.length < N) return null;` |

---

## MATH Modules

Available imports from the math layer:

**`../math/core.js`**
`avg`, `corr`, `sampleVar`, `sampleSD`, `sampleCov`, `rank`, `fmtP`, `effectLabel`, `sum`, `min`, `max`, `median`, `quantile`, `iqr`

**`../math/distributions.js`**
`normalCDF`, `normalPDF`, `normalQuantile`, `tCDF`, `tPVal`, `chiCDF`, `chiPVal`, `fCDF`, `fPVal`, `ibeta`, `betaCDF`, `gamma`, `lngamma`

**`../math/matrix.js`**
`matMul`, `matInv`, `matTrans`, `matDet`, `jacobiEigen`, `solveLinear`, `cholesky`

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `n is not defined` in function | Add `const n = data.length;` before return |
| `corr is not defined` | Add `corr` to imports from `'../math/core.js'` |
| `const` reassignment error | Change `const` to `let` for loop-reassigned variables |
| Rollup "Expected ident" | Check for extra `});` closing brace or orphaned `it` blocks |
| Test "missing key" | Function returns null — add `if (r)` guard to test |
| Duplicate export name | Rename to avoid conflict with existing function in module |
| Vite "invalid JS syntax" | Check for BOM characters, unclosed braces, or template literal issues |

---

## Git Workflow

```bash
# Before starting
git pull origin main

# After changes
git add -A
git commit -m "descriptive message"
npm test                         # verify 0 failures
git push origin main
```

---

## Version History

| Version | Functions | Tests | Date |
|---------|-----------|-------|------|
| v6.0.0 | 1,034 | 4,403 | 2026-06-27 |
| v5.x | ~600 | ~2,000 | 2026-05 |
| v4.x | ~300 | ~1,200 | 2026-04 |
| v3.x | ~150 | ~600 | 2026-03 |
| v2.x | ~80 | ~300 | 2026-02 |
| v1.0 | 55 | 887 | 2026-01 |
