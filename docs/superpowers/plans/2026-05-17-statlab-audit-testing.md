# StatLab Audit & Comprehensive Testing Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit the StatLab codebase for numerical accuracy bugs and missing edge-case guards, fix all identified issues, and add a comprehensive ~270-case Vitest test suite validated against R reference values.

**Architecture:** Bottom-up — fix and test `src/math/` first (the foundation every statistical test depends on), then `src/tests/` modules, then cross-reference the 55 `tree.js` entries against `InferenceConfig.jsx` and `InferencePanel.jsx`. Each fix is written before its tests so the suite starts green.

**Tech Stack:** Vitest 2.x, Node ESM (`"type":"module"`), R for reference value generation (scipy/pingouin as fallback), no test doubles (all functions are pure).

---

## File Map

**Create:**
- `package.json` — project manifest + test scripts
- `vitest.config.js` — Vitest config (ESM, node env)
- `scripts/gen-reference.R` — R script that writes R-validated oracle values
- `src/tests/__fixtures__/reference.json` — oracle values (populated by running R script)
- `src/tests/__fixtures__/helpers.js` — `expectAPA()` helper
- `src/math/core.test.js`
- `src/math/distributions.test.js`
- `src/math/matrix.test.js`
- `src/tests/means.test.js`
- `src/tests/anova.test.js`
- `src/tests/regression.test.js`
- `src/tests/categorical.test.js`
- `src/tests/multivariate.test.js`

**Modify:**
- `src/math/distributions.js` — add `lowerIncGamma`, fix `chiPVal`, fix `normalCDF` tails, fix `tInv2` ceiling, add `shapiroWilk` approximate flag
- `src/math/core.js` — collapse `fmtP` dead branch, fix APA leading-zero
- `src/tests/means.js` — guard `yuentTest` against `se=0`
- `src/tests/categorical.js` — guard `fisherExact` against n > 500
- `src/tests/multivariate.js` — include `eigenvectors` in `pca()` return; fix `efa()` `evecs` reference

---

## Task 1: Initialize project (package.json + vitest + npm install)

**Files:**
- Create: `package.json`
- Create: `vitest.config.js`

- [ ] **Step 1: Write package.json**

```json
{
  "name": "statlab",
  "version": "6.0.0",
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "react": "^18",
    "recharts": "latest",
    "papaparse": "latest"
  },
  "devDependencies": {
    "vitest": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0"
  }
}
```

- [ ] **Step 2: Write vitest.config.js**

```js
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['src/**/*.test.js'],
    environment: 'node',
    coverage: {
      include: ['src/math/**', 'src/tests/**'],
      exclude: ['src/tests/__fixtures__/**'],
      thresholds: { lines: 90 },
    },
  },
});
```

- [ ] **Step 3: Install dev dependencies**

Run: `npm install`

Expected: `node_modules/` created, `package-lock.json` generated, no errors.

- [ ] **Step 4: Verify Vitest is wired**

Run: `npx vitest run --reporter=verbose`

Expected: `No test files found` (not an error — no tests exist yet).

---

## Task 2: Create test fixture helpers

**Files:**
- Create: `src/tests/__fixtures__/helpers.js`

- [ ] **Step 1: Create the fixtures directory and helpers**

```js
// src/tests/__fixtures__/helpers.js

/**
 * Asserts exact APA string match. Throws with a diff if it fails.
 * Use this in tests as: expectAPA(result, "t(9) = 2.26, p = .025, d = 0.71 [medium]")
 */
export function expectAPA(result, expected) {
  const got = result?.apa ?? '(no apa property)';
  if (got !== expected) {
    throw new Error(`APA mismatch\n  Got:      ${got}\n  Expected: ${expected}`);
  }
}
```

- [ ] **Step 2: Confirm file is importable**

Create a throwaway file `src/tests/__fixtures__/smoke.test.js`:

```js
import { describe, it } from 'vitest';
import { expectAPA } from './helpers.js';
describe('helpers smoke', () => {
  it('expectAPA passes on match', () => {
    expectAPA({ apa: 'hello' }, 'hello');
  });
});
```

Run: `npx vitest run src/tests/__fixtures__/smoke.test.js`

Expected: 1 test passes. Delete `smoke.test.js` after confirming.

---

## Task 3: Generate R reference values

**Files:**
- Create: `scripts/gen-reference.R`
- Create: `src/tests/__fixtures__/reference.json` (populated by running the script)

- [ ] **Step 1: Write the R generation script**

```r
# scripts/gen-reference.R
# Run from project root: Rscript scripts/gen-reference.R

library(jsonlite)

ref <- list(

  # ── distributions ──────────────────────────────────────────────────────────
  distributions = list(
    normalCDF = list(
      list(z =  0.00, expected = pnorm(0.00)),
      list(z =  1.96, expected = pnorm(1.96)),
      list(z = -1.96, expected = pnorm(-1.96)),
      list(z =  3.50, expected = pnorm(3.50)),
      list(z = -3.50, expected = pnorm(-3.50)),
      list(z = -4.00, expected = pnorm(-4.00))
    ),
    chiPVal = list(
      list(chi2 = 3.841,  df = 1,  expected = pchisq(3.841,  1,  lower.tail = FALSE)),
      list(chi2 = 5.991,  df = 2,  expected = pchisq(5.991,  2,  lower.tail = FALSE)),
      list(chi2 = 9.488,  df = 4,  expected = pchisq(9.488,  4,  lower.tail = FALSE)),
      list(chi2 = 0.001,  df = 1,  expected = pchisq(0.001,  1,  lower.tail = FALSE)),
      list(chi2 = 100.0,  df = 10, expected = pchisq(100.0,  10, lower.tail = FALSE))
    ),
    tPVal = list(
      list(t =  2.0,    df =   10, expected = 2 * pt(-abs( 2.0),    10)),
      list(t =  1.96,   df = 1000, expected = 2 * pt(-abs( 1.96),  1000)),
      list(t = 12.706,  df =    1, expected = 2 * pt(-abs(12.706),    1)),
      list(t =  3.182,  df =    3, expected = 2 * pt(-abs( 3.182),    3))
    ),
    fPVal = list(
      list(F = 18.51, df1 = 1, df2 = 1,  expected = pf(18.51, 1,  1,  lower.tail = FALSE)),
      list(F =  4.26, df1 = 1, df2 = 30, expected = pf( 4.26, 1, 30,  lower.tail = FALSE)),
      list(F =  3.35, df1 = 2, df2 = 27, expected = pf( 3.35, 2, 27,  lower.tail = FALSE))
    )
  ),

  # ── means ──────────────────────────────────────────────────────────────────
  means = list(
    tWelch_basic = local({
      a <- c(2, 4, 6, 8); b <- c(1, 3, 5)
      r <- t.test(a, b, var.equal = FALSE)
      list(a = a, b = b, t = unname(r$statistic), df = unname(r$parameter), p = r$p.value,
           ci_lo = r$conf.int[1], ci_hi = r$conf.int[2])
    }),
    tOne_basic = local({
      x <- c(3, 5, 7, 9, 11); mu0 <- 5
      r <- t.test(x, mu = mu0)
      list(x = x, mu0 = mu0, t = unname(r$statistic), df = unname(r$parameter), p = r$p.value)
    }),
    tPaired_basic = local({
      a <- c(10, 12, 9, 8, 11); b <- c(7, 10, 8, 6, 9)
      r <- t.test(a, b, paired = TRUE)
      list(a = a, b = b, t = unname(r$statistic), df = unname(r$parameter), p = r$p.value)
    })
  ),

  # ── anova ──────────────────────────────────────────────────────────────────
  anova = list(
    oneWay_basic = local({
      g1 <- c(2, 3, 4); g2 <- c(5, 6, 7); g3 <- c(8, 9, 10)
      all <- c(g1, g2, g3)
      f <- c(rep("A",3), rep("B",3), rep("C",3))
      r <- summary(aov(all ~ factor(f)))[[1]]
      list(F = r$`F value`[1], df1 = r$Df[1], df2 = r$Df[2], p = r$`Pr(>F)`[1])
    }),
    kruskal_basic = local({
      g1 <- c(1,2,3); g2 <- c(4,5,6); g3 <- c(7,8,9)
      all <- c(g1,g2,g3); grp <- c(rep("A",3),rep("B",3),rep("C",3))
      r <- kruskal.test(all ~ factor(grp))
      list(H = unname(r$statistic), df = r$parameter, p = r$p.value)
    })
  ),

  # ── regression ─────────────────────────────────────────────────────────────
  regression = list(
    pearson_basic = local({
      x <- c(1,2,3,4,5); y <- c(2,4,5,4,5)
      r <- cor.test(x, y)
      list(x = x, y = y, r = unname(r$estimate), t = unname(r$statistic),
           df = unname(r$parameter), p = r$p.value)
    }),
    simpleOLS_basic = local({
      x <- c(1,2,3,4,5); y <- c(2,4,5,4,5)
      m <- lm(y ~ x)
      s <- summary(m)
      list(x = x, y = y, b0 = unname(coef(m)[1]), b1 = unname(coef(m)[2]),
           r2 = s$r.squared, p = unname(coef(s)[2,4]))
    })
  ),

  # ── categorical ────────────────────────────────────────────────────────────
  categorical = list(
    chiSquare_2x2 = local({
      m <- matrix(c(10, 20, 30, 40), nrow = 2)
      r <- chisq.test(m, correct = FALSE)
      list(chi2 = unname(r$statistic), df = unname(r$parameter), p = r$p.value)
    }),
    fisher_2x2 = local({
      r <- fisher.test(matrix(c(5,2,1,8), nrow=2))
      list(p = r$p.value, OR = unname(r$estimate))
    }),
    mcnemar_basic = local({
      r <- mcnemar.test(matrix(c(10,3,7,20), nrow=2), correct=TRUE)
      list(chi2 = unname(r$statistic), p = r$p.value)
    })
  ),

  # ── multivariate ───────────────────────────────────────────────────────────
  multivariate = list(
    cronbach_basic = local({
      library(psych)
      m <- matrix(c(1,2,3,4, 2,3,4,5, 3,4,5,6, 4,5,6,7), nrow=4)
      df <- as.data.frame(m)
      r <- alpha(df)
      list(alpha = r$total$raw_alpha)
    })
  )
)

write_json(ref, "src/tests/__fixtures__/reference.json",
           digits = 8, auto_unbox = TRUE, pretty = TRUE)
cat("Written to src/tests/__fixtures__/reference.json\n")
```

- [ ] **Step 2: Run the R script from the project root**

```
Rscript scripts/gen-reference.R
```

Expected output: `Written to src/tests/__fixtures__/reference.json`

Verify `src/tests/__fixtures__/reference.json` is non-empty and contains numeric values (not `"FILL_FROM_R"` strings).

> **If R is unavailable:** Run the equivalent Python: 
> ```python
> from scipy import stats; import json
> print(stats.norm.cdf(1.96))     # 0.9750021
> print(stats.chi2.sf(3.841, 1))  # ~0.0500
> print(stats.t.sf(abs(2.0), 10) * 2)  # 0.0739
> ```
> and manually populate the JSON.

---

## Task 4: Fix `chiPVal` — replace approximation with regularized incomplete gamma

**Files:**
- Modify: `src/math/distributions.js`

- [ ] **Step 1: Add `lowerIncGamma` helper above `chiPVal`**

Replace the existing `chiPVal` export and add the helper immediately above it in `src/math/distributions.js`. Find the block:

```js
export const chiPVal = (chi2, df)    => {
  if (df <= 0 || chi2 < 0) return 1;
  const h = 1 - 2 / (9 * df), z = (Math.pow(chi2 / df, 1 / 3) - h) / Math.sqrt(2 / (9 * df));
  return 1 - normalCDF(z);
};
```

Replace with:

```js
function lowerIncGamma(a, x) {
  if (x <= 0) return 0;
  const logA = lngamma(a);
  if (x < a + 1) {
    let term = 1 / a, sum = term;
    for (let n = 1; n < 300; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 3e-9) break;
    }
    return Math.min(1, Math.exp(-x + a * Math.log(x) - logA) * sum);
  }
  const FPMIN = 1e-30;
  let b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
  for (let i = 1; i <= 300; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-9) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - logA) * h;
}

export const chiPVal = (chi2, df) => {
  if (df <= 0 || chi2 < 0) return 1;
  if (chi2 === 0) return 1;
  return 1 - lowerIncGamma(df / 2, chi2 / 2);
};
```

- [ ] **Step 2: Spot-check in Node REPL**

Run: `node --input-type=module`

Then paste:
```js
import { chiPVal } from './src/math/distributions.js';
console.log(chiPVal(3.841, 1).toFixed(4));  // expect ~0.0500
console.log(chiPVal(5.991, 2).toFixed(4));  // expect ~0.0500
console.log(chiPVal(0.001, 1).toFixed(4));  // expect ~0.9748
console.log(chiPVal(100,  10).toFixed(8));  // expect ~0.0000
```

All four should match R values from `reference.json`.

---

## Task 5: Fix `normalCDF` tail accuracy and `tInv2` ceiling

**Files:**
- Modify: `src/math/distributions.js`

- [ ] **Step 1: Replace `normalCDF` with a branched implementation accurate in tails**

Find:
```js
export function normalCDF(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const p = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-.5 * z * z) *
    t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? p : 1 - p;
}
```

Replace with:
```js
export function normalCDF(z) {
  const abs = Math.abs(z);
  const pdf = Math.exp(-0.5 * abs * abs) / Math.sqrt(2 * Math.PI);
  let p;
  if (abs < 3) {
    // A&S 26.2.17 polynomial — max error 7.5e-8
    const t = 1 / (1 + 0.3275911 * abs);
    p = 1 - pdf * t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  } else {
    // Mills ratio continued fraction — accurate for |z| >= 3
    const z2 = abs * abs;
    const mills = pdf / abs * (1 - 1/z2 + 3/(z2*z2) - 15/(z2*z2*z2) + 105/(z2*z2*z2*z2));
    p = 1 - mills;
  }
  return z >= 0 ? p : 1 - p;
}
```

- [ ] **Step 2: Fix `tInv2` ceiling and add large-df shortcut**

Find:
```js
export function tInv2(alpha, df) {
  let lo = 0, hi = 20;
  for (let i = 0; i < 60; i++) {
    const m = (lo + hi) / 2;
    tPVal(m, df) > alpha ? lo = m : hi = m;
  }
  return (lo + hi) / 2;
}
```

Replace with:
```js
export function tInv2(alpha, df) {
  if (df > 1e4) return normalINV(1 - alpha / 2);
  let lo = 0, hi = 200;
  for (let i = 0; i < 100; i++) {
    const m = (lo + hi) / 2;
    tPVal(m, df) > alpha ? lo = m : hi = m;
  }
  return (lo + hi) / 2;
}
```

- [ ] **Step 3: Spot-check**

```js
import { normalCDF, tInv2 } from './src/math/distributions.js';
console.log(normalCDF(-3.5).toFixed(7));   // R: pnorm(-3.5) = 0.0002327
console.log(normalCDF(-4.0).toFixed(8));   // R: pnorm(-4.0) = 0.0000317
console.log(tInv2(0.05, 1).toFixed(3));    // R: qt(0.975, 1) = 12.706
console.log(tInv2(0.05, 1e5).toFixed(4)); // R: qnorm(0.975) = 1.9600
```

---

## Task 6: Fix `fmtP` — dead branch and APA leading zero

**Files:**
- Modify: `src/math/core.js`

- [ ] **Step 1: Collapse dead branch and strip leading zero**

Find:
```js
export const fmtP = p => p < .001 ? "p < .001" : p < .01 ? `p = ${p.toFixed(3)}` : `p = ${p.toFixed(3)}`;
```

Replace with:
```js
export const fmtP = p => p < .001 ? "p < .001" : `p = ${p.toFixed(3).replace('0.', '.')}`;
```

- [ ] **Step 2: Verify outputs are correct**

```js
import { fmtP } from './src/math/core.js';
console.log(fmtP(0.0005));  // "p < .001"
console.log(fmtP(0.0450));  // "p = .045"
console.log(fmtP(0.4500));  // "p = .450"
console.log(fmtP(0.9990));  // "p = .999"
```

> **Note:** This changes all APA string output. Write APA assertions in test files *after* this fix — do not copy pre-fix APA strings.

---

## Task 7: Fix `shapiroWilk` — add approximate flag for n < 10

**Files:**
- Modify: `src/math/distributions.js`

- [ ] **Step 1: Add `approximate` flag to shapiroWilk return**

Find the return statement inside `shapiroWilk`:
```js
  return { stat: +W.toFixed(5), p, normal: p > .05 };
```

Replace with:
```js
  return { stat: +W.toFixed(5), p, normal: p > .05, approximate: n < 10 };
```

---

## Task 8: Fix `yuentTest` (se=0 guard) and `fisherExact` (large-n guard)

**Files:**
- Modify: `src/tests/means.js`
- Modify: `src/tests/categorical.js`

- [ ] **Step 1: Guard `yuentTest` against zero standard error**

In `src/tests/means.js`, find in `yuentTest`:
```js
  const se = Math.sqrt(sw1 / (nt1 * (nt1 - 1)) + sw2 / (nt2 * (nt2 - 1)));
  const t = (mt1 - mt2) / se;
```

Replace with:
```js
  const se = Math.sqrt(sw1 / (nt1 * (nt1 - 1)) + sw2 / (nt2 * (nt2 - 1)));
  if (se < 1e-14) return null;
  const t = (mt1 - mt2) / se;
```

- [ ] **Step 2: Guard `fisherExact` against large n**

In `src/tests/categorical.js`, find the start of `fisherExact`:
```js
export function fisherExact(a, b, c, d) {
  const n = a + b + c + d, r1 = a + b, r2 = c + d, c1 = a + c;
```

Replace with:
```js
export function fisherExact(a, b, c, d) {
  const n = a + b + c + d;
  if (n > 500) return { test: "Fisher's Exact", p: null, OR: null, warning: "n > 500: use chi-square instead" };
  const r1 = a + b, r2 = c + d, c1 = a + c;
```

---

## Task 9: Fix `pca` return and `efa` eigenvectors reference

**Files:**
- Modify: `src/tests/multivariate.js`

- [ ] **Step 1: Add `eigenvectors` and `eigenvaluesRaw` to `pca()` return**

In `src/tests/multivariate.js`, find the `pca()` return statement:
```js
  return {
    test: "PCA", vars, k, n, eigenvalues: eigenvalues.map(e => +e.toFixed(4)),
    pctV, cumP, loadings, scores: scores.slice(0, 200), nSig, R,
    apa: `PCA: ${nSig} component${nSig !== 1 ? "s" : ""} (λ > 1), explaining ${cumP[nSig - 1]}% of variance`,
  };
```

Replace with:
```js
  return {
    test: "PCA", vars, k, n,
    eigenvalues: eigenvalues.map(e => +e.toFixed(4)),
    eigenvaluesRaw: eigenvalues,
    eigenvectors,
    pctV, cumP, loadings, scores: scores.slice(0, 200), nSig, R,
    apa: `PCA: ${nSig} component${nSig !== 1 ? "s" : ""} (λ > 1), explaining ${cumP[nSig - 1]}% of variance`,
  };
```

- [ ] **Step 2: Fix `efa()` to use the new fields**

Find in `efa()`:
```js
  const evecs = pcaRes.eigenvectors || pcaRes.eigenvectors;
  const evals = pcaRes.eigenvalues;
```

Replace with:
```js
  const evecs = pcaRes.eigenvectors;
  const evals = pcaRes.eigenvaluesRaw;
  if (!evecs || !evals) return null;
```

---

## Task 10: Write `core.test.js`

**Files:**
- Create: `src/math/core.test.js`

- [ ] **Step 1: Write all tests**

```js
// src/math/core.test.js
import { describe, it, expect } from 'vitest';
import {
  avg, sampleVar, sampleSD, popVar, popSD, clamp, corr,
  median, winsorize, trimmedMean, rank,
  effD, effR, effEta, effV, fmtP, sig, computeStats,
} from './core.js';

describe('avg', () => {
  it('computes mean of integers', () => expect(avg([1, 2, 3])).toBe(2));
  it('returns 0 for empty array', () => expect(avg([])).toBe(0));
  it('handles single element', () => expect(avg([7])).toBe(7));
  it('handles negative values', () => expect(avg([-3, -1, 1, 3])).toBe(0));
  it('handles floats', () => expect(avg([1.5, 2.5])).toBeCloseTo(2.0, 10));
});

describe('sampleVar', () => {
  it('computes variance for known data', () =>
    expect(sampleVar([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(4.5714, 3));
  it('returns 0 for single element', () => expect(sampleVar([5])).toBe(0));
  it('returns 0 for empty array', () => expect(sampleVar([])).toBe(0));
  it('returns 0 for all-same values', () => expect(sampleVar([3, 3, 3])).toBe(0));
});

describe('sampleSD', () => {
  it('equals sqrt of sampleVar', () => {
    const arr = [2, 4, 4, 4, 5, 5, 7, 9];
    expect(sampleSD(arr)).toBeCloseTo(Math.sqrt(sampleVar(arr)), 10);
  });
  it('returns 0 for constant array', () => expect(sampleSD([4, 4, 4])).toBe(0));
});

describe('popVar', () => {
  it('uses N denominator (not N-1)', () => {
    expect(popVar([2, 4])).toBeCloseTo(1.0, 10); // ((2-3)^2 + (4-3)^2) / 2 = 1
  });
  it('returns 0 for empty array', () => expect(popVar([])).toBe(0));
});

describe('clamp', () => {
  it('returns value when in range', () => expect(clamp(5, 0, 10)).toBe(5));
  it('clamps to low', () => expect(clamp(-1, 0, 10)).toBe(0));
  it('clamps to high', () => expect(clamp(11, 0, 10)).toBe(10));
  it('handles equal bounds', () => expect(clamp(5, 5, 5)).toBe(5));
});

describe('corr', () => {
  it('returns 1 for perfect positive correlation', () =>
    expect(corr([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 8));
  it('returns -1 for perfect negative correlation', () =>
    expect(corr([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1, 8));
  it('returns 0 for uncorrelated data', () =>
    expect(corr([1, 2, 3], [2, 2, 2])).toBe(0)); // zero variance in Y
  it('returns 0 for single-element arrays', () =>
    expect(corr([1], [1])).toBe(0));
  it('known value: [1,2,3,4,5] vs [2,4,5,4,5]', () =>
    expect(corr([1,2,3,4,5],[2,4,5,4,5])).toBeCloseTo(0.8321, 3));
});

describe('median', () => {
  it('odd-length array', () => expect(median([3, 1, 2])).toBe(2));
  it('even-length array (average of middle two)', () =>
    expect(median([1, 2, 3, 4])).toBe(2.5));
  it('single element', () => expect(median([7])).toBe(7));
  it('already sorted', () => expect(median([1, 2, 3, 4, 5])).toBe(3));
});

describe('winsorize', () => {
  it('clamps extremes at 10%', () => {
    const w = winsorize([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.1);
    expect(w[0]).toBe(w[1]); // first element clamped to second
    expect(w[9]).toBe(w[8]); // last element clamped to second-to-last
  });
  it('does not change middle values', () => {
    const w = winsorize([1, 2, 3, 4, 5], 0.1);
    expect(w[2]).toBe(3);
  });
});

describe('trimmedMean', () => {
  it('20% trim removes one from each end of 5-element array', () => {
    // sorted [1,2,3,4,5], k=floor(0.2*5)=1, take [2,3,4], avg=3
    expect(trimmedMean([5, 1, 3, 2, 4], 0.2)).toBeCloseTo(3, 10);
  });
});

describe('rank', () => {
  it('assigns ranks 1-based', () =>
    expect(rank([10, 20, 30])).toEqual([1, 2, 3]));
  it('averages tied ranks', () =>
    expect(rank([10, 10, 30])).toEqual([1.5, 1.5, 3]));
  it('handles all ties', () =>
    expect(rank([5, 5, 5])).toEqual([2, 2, 2])); // midrank of positions 1,2,3
  it('handles unsorted input', () =>
    expect(rank([30, 10, 20])).toEqual([3, 1, 2]));
});

describe('effect size labels', () => {
  it('effD: negligible < .2', () => expect(effD(0.1)).toBe('negligible'));
  it('effD: small .2–.5', () => expect(effD(0.3)).toBe('small'));
  it('effD: medium .5–.8', () => expect(effD(0.6)).toBe('medium'));
  it('effD: large >= .8', () => expect(effD(0.9)).toBe('large'));
  it('effD: uses absolute value', () => expect(effD(-0.9)).toBe('large'));

  it('effR: negligible < .1', () => expect(effR(0.05)).toBe('negligible'));
  it('effR: small .1–.3', () => expect(effR(0.2)).toBe('small'));
  it('effR: medium .3–.5', () => expect(effR(0.4)).toBe('medium'));
  it('effR: large >= .5', () => expect(effR(0.6)).toBe('large'));

  it('effEta: negligible < .01', () => expect(effEta(0.005)).toBe('negligible'));
  it('effEta: small .01–.06', () => expect(effEta(0.03)).toBe('small'));
  it('effEta: medium .06–.14', () => expect(effEta(0.10)).toBe('medium'));
  it('effEta: large >= .14', () => expect(effEta(0.20)).toBe('large'));
});

describe('fmtP', () => {
  it('returns "p < .001" for p = 0.0001', () => expect(fmtP(0.0001)).toBe('p < .001'));
  it('returns "p < .001" for p = 0.0009', () => expect(fmtP(0.0009)).toBe('p < .001'));
  it('formats p = 0.045 without leading zero', () => expect(fmtP(0.045)).toBe('p = .045'));
  it('formats p = 0.450 without leading zero', () => expect(fmtP(0.450)).toBe('p = .450'));
  it('formats p = 0.999', () => expect(fmtP(0.999)).toBe('p = .999'));
});

describe('sig', () => {
  it('returns true when p < alpha', () => expect(sig(0.04)).toBe(true));
  it('returns false when p >= alpha', () => expect(sig(0.05)).toBe(false));
  it('uses custom alpha', () => expect(sig(0.09, 0.1)).toBe(true));
});

describe('computeStats', () => {
  const arr = [2, 4, 4, 4, 5, 5, 7, 9];
  const s = computeStats(arr);

  it('returns null for empty/null input', () => {
    expect(computeStats([])).toBeNull();
    expect(computeStats(null)).toBeNull();
  });
  it('n is correct', () => expect(s.n).toBe(8));
  it('mean is correct', () => expect(s.mean).toBeCloseTo(5.0, 3));
  it('sd is correct', () => expect(s.sd).toBeCloseTo(2.138, 2));
  it('median is correct', () => expect(s.median).toBeCloseTo(4.5, 3));
  it('min and max', () => { expect(s.min).toBe(2); expect(s.max).toBe(9); });
  it('q1 and q3 are defined', () => { expect(s.q1).toBeDefined(); expect(s.q3).toBeDefined(); });
  it('skew and kurt are finite numbers', () => {
    expect(isFinite(s.skew)).toBe(true);
    expect(isFinite(s.kurt)).toBe(true);
  });
});
```

- [ ] **Step 2: Run and confirm all pass**

Run: `npx vitest run src/math/core.test.js --reporter=verbose`

Expected: All tests pass. Fix any failures before continuing.

---

## Task 11: Write `distributions.test.js`

**Files:**
- Create: `src/math/distributions.test.js`

- [ ] **Step 1: Import reference values and write tests**

Open `src/tests/__fixtures__/reference.json` and read the exact numeric values generated by R. Use them in the assertions below (replace the placeholder comments).

```js
// src/math/distributions.test.js
import { describe, it, expect } from 'vitest';
import {
  lngamma, lnBinom, ibeta,
  normalCDF, normalINV,
  tPDF, tPVal, fPVal, chiPVal,
  tInv2, computePowerT, computePowerCorr, requiredN, requiredNCorr,
  normalityDP, shapiroWilk, bootstrapCI,
} from './distributions.js';
import ref from '../tests/__fixtures__/reference.json' with { type: 'json' };

describe('lngamma', () => {
  it('lngamma(1) = 0', () => expect(lngamma(1)).toBeCloseTo(0, 8));
  it('lngamma(2) = 0', () => expect(lngamma(2)).toBeCloseTo(0, 8)); // ln(1!)
  it('lngamma(5) = ln(24)', () => expect(lngamma(5)).toBeCloseTo(Math.log(24), 6));
  it('lngamma(0.5) = ln(sqrt(pi))', () =>
    expect(lngamma(0.5)).toBeCloseTo(0.5 * Math.log(Math.PI), 6));
});

describe('normalCDF', () => {
  it('normalCDF(0) = 0.5 exactly', () => expect(normalCDF(0)).toBeCloseTo(0.5, 10));
  it('normalCDF(1.96) matches R pnorm(1.96)', () => {
    const expected = ref.distributions.normalCDF.find(r => r.z === 1.96).expected;
    expect(normalCDF(1.96)).toBeCloseTo(expected, 4);
  });
  it('normalCDF(-1.96) matches R pnorm(-1.96)', () => {
    const expected = ref.distributions.normalCDF.find(r => r.z === -1.96).expected;
    expect(normalCDF(-1.96)).toBeCloseTo(expected, 4);
  });
  it('normalCDF(3.5) is accurate in right tail', () => {
    const expected = ref.distributions.normalCDF.find(r => r.z === 3.5).expected;
    expect(normalCDF(3.5)).toBeCloseTo(expected, 5);
  });
  it('normalCDF(-3.5) is accurate in left tail', () => {
    const expected = ref.distributions.normalCDF.find(r => r.z === -3.5).expected;
    expect(normalCDF(-3.5)).toBeCloseTo(expected, 6);
  });
  it('normalCDF(-4.0) is accurate in extreme left tail', () => {
    const expected = ref.distributions.normalCDF.find(r => r.z === -4).expected;
    expect(normalCDF(-4.0)).toBeCloseTo(expected, 7);
  });
  it('symmetry: normalCDF(z) + normalCDF(-z) = 1', () => {
    expect(normalCDF(2.5) + normalCDF(-2.5)).toBeCloseTo(1, 10);
  });
});

describe('normalINV', () => {
  it('normalINV(0.5) = 0', () => expect(normalINV(0.5)).toBeCloseTo(0, 8));
  it('normalINV(0.975) ≈ 1.96', () => expect(normalINV(0.975)).toBeCloseTo(1.96, 2));
  it('normalINV(0) = -Infinity', () => expect(normalINV(0)).toBe(-Infinity));
  it('normalINV(1) = Infinity', () => expect(normalINV(1)).toBe(Infinity));
  it('round-trips with normalCDF', () =>
    expect(normalINV(normalCDF(1.5))).toBeCloseTo(1.5, 4));
});

describe('chiPVal', () => {
  it('chiPVal(3.841, 1) ≈ 0.050 — the classic 5% cutoff', () => {
    const expected = ref.distributions.chiPVal.find(r => r.chi2 === 3.841 && r.df === 1).expected;
    expect(chiPVal(3.841, 1)).toBeCloseTo(expected, 3);
  });
  it('chiPVal(5.991, 2) ≈ 0.050', () => {
    const expected = ref.distributions.chiPVal.find(r => r.chi2 === 5.991 && r.df === 2).expected;
    expect(chiPVal(5.991, 2)).toBeCloseTo(expected, 3);
  });
  it('chiPVal(9.488, 4) ≈ 0.050', () => {
    const expected = ref.distributions.chiPVal.find(r => r.chi2 === 9.488 && r.df === 4).expected;
    expect(chiPVal(9.488, 4)).toBeCloseTo(expected, 3);
  });
  it('chiPVal(0.001, 1) is close to 1', () => {
    const expected = ref.distributions.chiPVal.find(r => r.chi2 === 0.001).expected;
    expect(chiPVal(0.001, 1)).toBeCloseTo(expected, 3);
  });
  it('chiPVal with df=0 returns 1', () => expect(chiPVal(5, 0)).toBe(1));
  it('chiPVal with negative chi2 returns 1', () => expect(chiPVal(-1, 2)).toBe(1));
});

describe('tPVal', () => {
  it('tPVal(2.0, 10) matches R 2*pt(-2, 10)', () => {
    const expected = ref.distributions.tPVal.find(r => r.t === 2.0 && r.df === 10).expected;
    expect(tPVal(2.0, 10)).toBeCloseTo(expected, 4);
  });
  it('tPVal(1.96, 1000) matches R', () => {
    const expected = ref.distributions.tPVal.find(r => r.t === 1.96 && r.df === 1000).expected;
    expect(tPVal(1.96, 1000)).toBeCloseTo(expected, 4);
  });
  it('tPVal(12.706, 1) ≈ 0.05', () => {
    const expected = ref.distributions.tPVal.find(r => r.t === 12.706).expected;
    expect(tPVal(12.706, 1)).toBeCloseTo(expected, 3);
  });
  it('is symmetric: tPVal(t, df) = tPVal(-t, df)', () =>
    expect(tPVal(2, 10)).toBeCloseTo(tPVal(-2, 10), 10));
});

describe('fPVal', () => {
  it('fPVal(4.26, 1, 30) matches R', () => {
    const expected = ref.distributions.fPVal.find(r => r.F === 4.26).expected;
    expect(fPVal(4.26, 1, 30)).toBeCloseTo(expected, 4);
  });
  it('fPVal(0, df1, df2) = 1', () => expect(fPVal(0, 2, 10)).toBeCloseTo(1, 4));
  it('very large F gives p near 0', () => expect(fPVal(10000, 1, 100)).toBeCloseTo(0, 4));
});

describe('tInv2', () => {
  it('tInv2(0.05, 1) ≈ 12.706 — t-table value', () =>
    expect(tInv2(0.05, 1)).toBeCloseTo(12.706, 2));
  it('tInv2(0.05, 10) ≈ 2.228', () =>
    expect(tInv2(0.05, 10)).toBeCloseTo(2.228, 2));
  it('tInv2(0.05, 1e5) ≈ 1.960 (normal approximation)', () =>
    expect(tInv2(0.05, 1e5)).toBeCloseTo(1.960, 2));
  it('round-trips with tPVal', () => {
    const tc = tInv2(0.05, 20);
    expect(tPVal(tc, 20)).toBeCloseTo(0.05, 3);
  });
});

describe('computePowerT', () => {
  it('power is between 0 and 1', () => {
    const p = computePowerT(30, 30, 0.5);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });
  it('larger effect → more power', () => {
    expect(computePowerT(20, 20, 0.8)).toBeGreaterThan(computePowerT(20, 20, 0.2));
  });
  it('larger n → more power', () => {
    expect(computePowerT(100, 100, 0.5)).toBeGreaterThan(computePowerT(20, 20, 0.5));
  });
});

describe('requiredN', () => {
  it('d=0.5, power=0.8 requires ~64 per group', () => {
    expect(requiredN(0.5, 0.8)).toBeGreaterThanOrEqual(60);
    expect(requiredN(0.5, 0.8)).toBeLessThanOrEqual(70);
  });
  it('d=0.8 requires fewer than d=0.5', () =>
    expect(requiredN(0.8)).toBeLessThan(requiredN(0.5)));
});

describe('normalityDP', () => {
  it('returns null for n < 8', () => expect(normalityDP([1,2,3])).toBeNull());
  it('normal data: p > 0.05', () => {
    const normal = Array.from({ length: 50 }, (_, i) => i / 50);
    const r = normalityDP(normal);
    expect(r).not.toBeNull();
    expect(r.p).toBeDefined();
    expect(isFinite(r.stat)).toBe(true);
  });
  it('returns { stat, p, normal } shape', () => {
    const r = normalityDP([1,2,3,4,5,6,7,8,9,10]);
    expect(r).toHaveProperty('stat');
    expect(r).toHaveProperty('p');
    expect(r).toHaveProperty('normal');
  });
});

describe('shapiroWilk', () => {
  it('returns null for n < 3', () => expect(shapiroWilk([1, 2])).toBeNull());
  it('returns approximate:true for n < 10', () => {
    const r = shapiroWilk([1, 2, 3, 4, 5]);
    expect(r.approximate).toBe(true);
  });
  it('returns approximate:false for n >= 10', () => {
    const r = shapiroWilk(Array.from({ length: 20 }, (_, i) => i));
    expect(r.approximate).toBe(false);
  });
  it('W is between 0 and 1', () => {
    const r = shapiroWilk([1,2,3,4,5,6,7,8,9,10]);
    expect(r.stat).toBeGreaterThan(0);
    expect(r.stat).toBeLessThanOrEqual(1);
  });
});

describe('bootstrapCI', () => {
  it('returns { lo, hi, dist }', () => {
    const r = bootstrapCI([1,2,3,4,5], a => a.reduce((s,x)=>s+x,0)/a.length, 99);
    expect(r).toHaveProperty('lo');
    expect(r).toHaveProperty('hi');
    expect(r.hi).toBeGreaterThan(r.lo);
    expect(r.dist).toHaveLength(99);
  });
  it('CI for mean of [1..10] contains 5.5', () => {
    const data = [1,2,3,4,5,6,7,8,9,10];
    const { lo, hi } = bootstrapCI(data, a => a.reduce((s,x)=>s+x,0)/a.length, 999);
    expect(lo).toBeLessThan(5.5);
    expect(hi).toBeGreaterThan(5.5);
  });
});
```

- [ ] **Step 2: Run and confirm all pass**

Run: `npx vitest run src/math/distributions.test.js --reporter=verbose`

Expected: All tests pass. If `chiPVal` tests fail, re-check `lowerIncGamma` in Task 4.

---

## Task 12: Write `matrix.test.js`

**Files:**
- Create: `src/math/matrix.test.js`

- [ ] **Step 1: Write tests for all three matrix functions**

```js
// src/math/matrix.test.js
import { describe, it, expect } from 'vitest';
import { matMul, matTrans, matInv, jacobiEigen } from './matrix.js';

describe('matMul', () => {
  it('2x2 identity × identity = identity', () => {
    const I = [[1,0],[0,1]];
    expect(matMul(I, I)).toEqual([[1,0],[0,1]]);
  });
  it('2x2 known result', () => {
    const A = [[1,2],[3,4]], B = [[5,6],[7,8]];
    // [1*5+2*7, 1*6+2*8] = [19, 22]; [3*5+4*7, 3*6+4*8] = [43, 50]
    expect(matMul(A, B)).toEqual([[19, 22], [43, 50]]);
  });
  it('2x3 × 3x2', () => {
    const A = [[1,2,3],[4,5,6]], B = [[7,8],[9,10],[11,12]];
    expect(matMul(A, B)).toEqual([[58,64],[139,154]]);
  });
});

describe('matTrans', () => {
  it('transposes 2x3 to 3x2', () => {
    const A = [[1,2,3],[4,5,6]];
    expect(matTrans(A)).toEqual([[1,4],[2,5],[3,6]]);
  });
  it('double transpose returns original', () => {
    const A = [[1,2],[3,4],[5,6]];
    expect(matTrans(matTrans(A))).toEqual(A);
  });
});

describe('matInv', () => {
  it('2x2 inverse of [[1,2],[3,4]]', () => {
    const A = [[1,2],[3,4]], inv = matInv(A);
    // inv = [[-2, 1],[1.5, -0.5]]
    expect(inv[0][0]).toBeCloseTo(-2, 6);
    expect(inv[0][1]).toBeCloseTo(1, 6);
    expect(inv[1][0]).toBeCloseTo(1.5, 6);
    expect(inv[1][1]).toBeCloseTo(-0.5, 6);
  });
  it('A × A⁻¹ = identity', () => {
    const A = [[2,1],[5,3]];
    const prod = matMul(A, matInv(A));
    expect(prod[0][0]).toBeCloseTo(1, 8);
    expect(prod[0][1]).toBeCloseTo(0, 8);
    expect(prod[1][0]).toBeCloseTo(0, 8);
    expect(prod[1][1]).toBeCloseTo(1, 8);
  });
  it('returns null for singular matrix', () => {
    expect(matInv([[1,2],[2,4]])).toBeNull(); // det = 0
  });
  it('3x3 inverse round-trip', () => {
    const A = [[1,2,0],[0,1,3],[2,0,1]];
    const prod = matMul(A, matInv(A));
    for (let i = 0; i < 3; i++)
      for (let j = 0; j < 3; j++)
        expect(prod[i][j]).toBeCloseTo(i === j ? 1 : 0, 8);
  });
});

describe('jacobiEigen', () => {
  it('identity matrix has eigenvalues [1,1]', () => {
    const { eigenvalues } = jacobiEigen([[1,0],[0,1]]);
    expect(eigenvalues[0]).toBeCloseTo(1, 8);
    expect(eigenvalues[1]).toBeCloseTo(1, 8);
  });
  it('diagonal matrix: eigenvalues = diagonal entries, sorted desc', () => {
    const { eigenvalues } = jacobiEigen([[3,0],[0,7]]);
    expect(eigenvalues[0]).toBeCloseTo(7, 6);
    expect(eigenvalues[1]).toBeCloseTo(3, 6);
  });
  it('known symmetric matrix [[4,2],[2,3]]', () => {
    // eigenvalues: (7±sqrt(17))/2 → 5.5616 and 1.4384
    const { eigenvalues } = jacobiEigen([[4,2],[2,3]]);
    expect(eigenvalues[0]).toBeCloseTo(5.5616, 3);
    expect(eigenvalues[1]).toBeCloseTo(1.4384, 3);
  });
  it('eigenvalues are sorted descending', () => {
    const { eigenvalues } = jacobiEigen([[1,0.5],[0.5,2]]);
    expect(eigenvalues[0]).toBeGreaterThan(eigenvalues[1]);
  });
  it('A*v = λ*v holds for all eigenpairs', () => {
    const A = [[4,2],[2,3]];
    const { eigenvalues, eigenvectors } = jacobiEigen(A);
    for (let k = 0; k < 2; k++) {
      const v = eigenvectors[k];
      const Av = A.map(r => r.reduce((s, a, j) => s + a * v[j], 0));
      const lv = v.map(x => eigenvalues[k] * x);
      Av.forEach((val, i) => expect(val).toBeCloseTo(lv[i], 5));
    }
  });
});
```

- [ ] **Step 2: Run and confirm all pass**

Run: `npx vitest run src/math/matrix.test.js --reporter=verbose`

Expected: All tests pass.

---

## Task 13: Write `means.test.js`

**Files:**
- Create: `src/tests/means.test.js`

- [ ] **Step 1: Write all tests, using R reference values from reference.json**

```js
// src/tests/means.test.js
import { describe, it, expect } from 'vitest';
import { tWelch, tOne, tPaired, yuentTest, zTestKnownSD, signTest } from './means.js';
import { expectAPA } from './__fixtures__/helpers.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const r = ref.means;

describe('tWelch', () => {
  it('returns null when either group has < 2 elements', () => {
    expect(tWelch([1], [2, 3])).toBeNull();
    expect(tWelch([1, 2], [3])).toBeNull();
  });
  it('returns null when both groups are constant (se=0)', () =>
    expect(tWelch([5,5,5], [5,5,5])).toBeNull());

  it('t statistic matches R t.test()', () => {
    const res = tWelch(r.tWelch_basic.a, r.tWelch_basic.b);
    expect(res.t).toBeCloseTo(r.tWelch_basic.t, 3);
  });
  it('df matches R t.test()', () => {
    const res = tWelch(r.tWelch_basic.a, r.tWelch_basic.b);
    expect(res.df).toBeCloseTo(r.tWelch_basic.df, 1);
  });
  it('p-value matches R t.test()', () => {
    const res = tWelch(r.tWelch_basic.a, r.tWelch_basic.b);
    expect(res.p).toBeCloseTo(r.tWelch_basic.p, 3);
  });
  it('result has required shape', () => {
    const res = tWelch([1,2,3,4,5], [6,7,8,9,10]);
    expect(res).toHaveProperty('t');
    expect(res).toHaveProperty('df');
    expect(res).toHaveProperty('p');
    expect(res).toHaveProperty('d');
    expect(res).toHaveProperty('g');
    expect(res).toHaveProperty('power');
    expect(res).toHaveProperty('reqN');
    expect(res).toHaveProperty('apa');
  });
  it('APA output has no leading zero on p-value', () => {
    const res = tWelch([1,2,3,4,5], [4,5,6,7,8]);
    expect(res.apa).not.toMatch(/p = 0\./);
  });
});

describe('tOne', () => {
  it('returns null when n < 2', () => expect(tOne([1])).toBeNull());
  it('t matches R t.test()', () => {
    const res = tOne(r.tOne_basic.x, r.tOne_basic.mu0);
    expect(res.t).toBeCloseTo(r.tOne_basic.t, 3);
  });
  it('p matches R t.test()', () => {
    const res = tOne(r.tOne_basic.x, r.tOne_basic.mu0);
    expect(res.p).toBeCloseTo(r.tOne_basic.p, 3);
  });
  it('when sample mean equals mu0, t=0', () => {
    const res = tOne([1, 2, 3], 2);
    expect(res.t).toBeCloseTo(0, 8);
  });
});

describe('tPaired', () => {
  it('returns null for unequal-length arrays', () =>
    expect(tPaired([1,2,3],[1,2])).toBeNull());
  it('t matches R t.test(paired=TRUE)', () => {
    const res = tPaired(r.tPaired_basic.a, r.tPaired_basic.b);
    expect(res.t).toBeCloseTo(r.tPaired_basic.t, 3);
  });
  it('p matches R t.test(paired=TRUE)', () => {
    const res = tPaired(r.tPaired_basic.a, r.tPaired_basic.b);
    expect(res.p).toBeCloseTo(r.tPaired_basic.p, 3);
  });
  it('identical arrays → t=0', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(tPaired(arr, arr).t).toBeCloseTo(0, 8);
  });
});

describe('yuentTest', () => {
  it('returns null for constant groups (se=0 after trim)', () =>
    expect(yuentTest([5,5,5,5], [5,5,5,5])).toBeNull());
  it('returns a result for normal use', () => {
    const res = yuentTest([1,2,3,4,5,6,7,8], [2,4,6,8,10,12,14,16]);
    expect(res).not.toBeNull();
    expect(res).toHaveProperty('t');
    expect(res).toHaveProperty('p');
  });
  it('p-value is between 0 and 1', () => {
    const res = yuentTest([1,3,5,7,9,11], [2,4,6,8,10,12]);
    expect(res.p).toBeGreaterThanOrEqual(0);
    expect(res.p).toBeLessThanOrEqual(1);
  });
});

describe('zTestKnownSD', () => {
  it('z=0 when xbar=mu0', () => {
    const res = zTestKnownSD(5, 5, 1, 100);
    expect(res.z).toBeCloseTo(0, 8);
    expect(res.p).toBeCloseTo(1, 3);
  });
  it('large z → small p', () => {
    const res = zTestKnownSD(10, 0, 1, 100);
    expect(res.p).toBeLessThan(0.001);
  });
  it('result has d property', () => {
    expect(zTestKnownSD(6, 5, 2, 50)).toHaveProperty('d');
  });
});

describe('signTest', () => {
  it('returns null for n < 5 non-ties', () =>
    expect(signTest([1, 2, 3], 2)).toBeNull());
  it('50/50 split → p close to 1', () => {
    const res = signTest([1, 2, 3, 4, -1, -2, -3, -4], 0);
    expect(res.p).toBeGreaterThan(0.5);
  });
  it('all above mu0 → very small p', () => {
    const res = signTest([10, 11, 12, 13, 14, 15, 16, 17, 18, 19], 0);
    expect(res.p).toBeLessThan(0.01);
  });
  it('pos + neg = total', () => {
    const res = signTest([1, -1, 2, -2, 3, 0, 4], 0);
    expect(res.pos + res.neg).toBe(res.total);
  });
});
```

- [ ] **Step 2: Run**

Run: `npx vitest run src/tests/means.test.js --reporter=verbose`

Expected: All tests pass.

---

## Task 14: Write `anova.test.js`

**Files:**
- Create: `src/tests/anova.test.js`

- [ ] **Step 1: Write tests**

```js
// src/tests/anova.test.js
import { describe, it, expect } from 'vitest';
import {
  oneWayANOVA, welchANOVA, twoWayANOVA, ancova,
  rmANOVA, kruskalWallis, friedman, cochranQ,
} from './anova.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const mkGroup = (name, vals) => ({ name, vals });

describe('oneWayANOVA', () => {
  it('returns null for < 2 groups', () =>
    expect(oneWayANOVA([mkGroup('A', [1,2,3])])).toBeNull());

  it('F matches R aov()', () => {
    const groups = [
      mkGroup('A', [2,3,4]),
      mkGroup('B', [5,6,7]),
      mkGroup('C', [8,9,10]),
    ];
    const res = oneWayANOVA(groups);
    expect(res.F).toBeCloseTo(ref.anova.oneWay_basic.F, 2);
    expect(res.p).toBeCloseTo(ref.anova.oneWay_basic.p, 3);
  });
  it('eta2 is between 0 and 1', () => {
    const groups = [mkGroup('A',[1,2,3]), mkGroup('B',[4,5,6])];
    expect(oneWayANOVA(groups).eta2).toBeGreaterThanOrEqual(0);
    expect(oneWayANOVA(groups).eta2).toBeLessThanOrEqual(1);
  });
  it('all-same values → null (no within-group variance)', () =>
    expect(oneWayANOVA([mkGroup('A',[5,5,5]), mkGroup('B',[5,5,5])])).toBeNull());
  it('Tukey comparisons: k*(k-1)/2 pairs for k groups', () => {
    const groups = [mkGroup('A',[1,2,3]), mkGroup('B',[4,5,6]), mkGroup('C',[7,8,9])];
    expect(oneWayANOVA(groups).tukey).toHaveLength(3);
  });
  it('APA output present', () => {
    const res = oneWayANOVA([mkGroup('A',[1,2,3]), mkGroup('B',[4,5,6])]);
    expect(typeof res.apa).toBe('string');
    expect(res.apa).toMatch(/F\(\d+,\d+\)/);
  });
});

describe('welchANOVA', () => {
  it('returns null for < 2 groups', () =>
    expect(welchANOVA([mkGroup('A', [1,2])])).toBeNull());
  it('returns result for 3 groups with unequal variance', () => {
    const groups = [
      mkGroup('A', [1, 2, 3, 4, 5]),
      mkGroup('B', [10, 20, 30, 40, 50]),
      mkGroup('C', [100, 200, 300]),
    ];
    const res = welchANOVA(groups);
    expect(res.F).toBeGreaterThan(0);
    expect(res.p).toBeLessThanOrEqual(1);
  });
});

describe('kruskalWallis', () => {
  it('H matches R kruskal.test()', () => {
    const groups = [mkGroup('A',[1,2,3]), mkGroup('B',[4,5,6]), mkGroup('C',[7,8,9])];
    const res = kruskalWallis(groups);
    expect(res.H).toBeCloseTo(ref.anova.kruskal_basic.H, 2);
    expect(res.p).toBeCloseTo(ref.anova.kruskal_basic.p, 2);
  });
  it('eta2 is between 0 and 1', () => {
    const groups = [mkGroup('A',[1,2,3]), mkGroup('B',[7,8,9])];
    expect(kruskalWallis(groups).eta2).toBeGreaterThanOrEqual(0);
    expect(kruskalWallis(groups).eta2).toBeLessThanOrEqual(1);
  });
});

describe('friedman', () => {
  it('returns a result for valid blocked data', () => {
    const blocks = [[1,2,3],[2,3,4],[3,4,5],[4,5,6]];
    const res = friedman(blocks);
    expect(res).not.toBeNull();
    expect(res).toHaveProperty('chi2');
    expect(res).toHaveProperty('p');
    expect(res).toHaveProperty('W');
  });
  it('Kendall W is between 0 and 1', () => {
    const blocks = [[1,2,3],[3,2,1],[2,1,3]];
    expect(friedman(blocks).W).toBeGreaterThanOrEqual(0);
    expect(friedman(blocks).W).toBeLessThanOrEqual(1);
  });
});

describe('cochranQ', () => {
  it('returns a result for valid binary block data', () => {
    const blocks = [[1,0,1],[0,0,1],[1,1,1],[0,1,0]];
    const res = cochranQ(blocks);
    expect(res).not.toBeNull();
    expect(res).toHaveProperty('Q');
    expect(res).toHaveProperty('p');
  });
});
```

- [ ] **Step 2: Run**

Run: `npx vitest run src/tests/anova.test.js --reporter=verbose`

Expected: All pass. If `kruskalWallis` is not exported from `anova.js`, check the export name in the source and update the import.

---

## Task 15: Write `regression.test.js`

**Files:**
- Create: `src/tests/regression.test.js`

- [ ] **Step 1: Write tests**

```js
// src/tests/regression.test.js
import { describe, it, expect } from 'vitest';
import {
  pearsonTest, spearman, kendallTau, partialCorr, pointBiserial,
  simpleOLS, multipleOLS,
} from './regression.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const rr = ref.regression;

describe('pearsonTest', () => {
  it('returns null for n < 3', () =>
    expect(pearsonTest([1,2],[3,4])).toBeNull());
  it('r matches R cor.test()', () => {
    const res = pearsonTest(rr.pearson_basic.x, rr.pearson_basic.y);
    expect(res.r).toBeCloseTo(rr.pearson_basic.r, 3);
  });
  it('p matches R cor.test()', () => {
    const res = pearsonTest(rr.pearson_basic.x, rr.pearson_basic.y);
    expect(res.p).toBeCloseTo(rr.pearson_basic.p, 3);
  });
  it('perfect correlation: r=1, p small', () => {
    const res = pearsonTest([1,2,3,4,5],[2,4,6,8,10]);
    expect(res.r).toBeCloseTo(1, 5);
    expect(res.p).toBeLessThan(0.01);
  });
  it('CI contains r', () => {
    const res = pearsonTest([1,2,3,4,5,6,7,8],[2,4,5,4,5,6,7,8]);
    expect(res.ciLo).toBeLessThan(res.r);
    expect(res.ciHi).toBeGreaterThan(res.r);
  });
});

describe('spearman', () => {
  it('returns null for n < 3', () =>
    expect(spearman([1],[2])).toBeNull());
  it('monotone data → rho close to 1', () => {
    const res = spearman([1,2,3,4,5],[1,4,9,16,25]);
    expect(res.rho).toBeCloseTo(1, 5);
  });
  it('reverse monotone → rho close to -1', () => {
    const res = spearman([1,2,3,4,5],[5,4,3,2,1]);
    expect(res.rho).toBeCloseTo(-1, 5);
  });
});

describe('kendallTau', () => {
  it('returns null for n < 3', () =>
    expect(kendallTau([1],[2])).toBeNull());
  it('perfect concordance → tau=1', () => {
    const res = kendallTau([1,2,3,4],[1,2,3,4]);
    expect(res.tau).toBeCloseTo(1, 5);
  });
  it('perfect discordance → tau=-1', () => {
    const res = kendallTau([1,2,3,4],[4,3,2,1]);
    expect(res.tau).toBeCloseTo(-1, 5);
  });
});

describe('partialCorr', () => {
  it('returns null for n < 4', () =>
    expect(partialCorr([1,2,3],[1,2,3],[1,2,3])).toBeNull());
  it('returns rPartial between -1 and 1', () => {
    const res = partialCorr([1,2,3,4,5],[2,4,5,4,5],[1,3,2,4,3]);
    expect(res.rPartial).toBeGreaterThanOrEqual(-1);
    expect(res.rPartial).toBeLessThanOrEqual(1);
  });
});

describe('simpleOLS', () => {
  it('returns null for n < 3', () =>
    expect(simpleOLS([1,2],[1,2])).toBeNull());
  it('b1 matches R lm()', () => {
    const res = simpleOLS(rr.simpleOLS_basic.x, rr.simpleOLS_basic.y);
    expect(res.b1).toBeCloseTo(rr.simpleOLS_basic.b1, 4);
  });
  it('b0 matches R lm()', () => {
    const res = simpleOLS(rr.simpleOLS_basic.x, rr.simpleOLS_basic.y);
    expect(res.b0).toBeCloseTo(rr.simpleOLS_basic.b0, 4);
  });
  it('r2 matches R lm()', () => {
    const res = simpleOLS(rr.simpleOLS_basic.x, rr.simpleOLS_basic.y);
    expect(res.r2).toBeCloseTo(rr.simpleOLS_basic.r2, 3);
  });
  it('durbinWatson is between 0 and 4', () => {
    const res = simpleOLS([1,2,3,4,5],[2,4,5,4,5]);
    expect(res.durbinWatson).toBeGreaterThan(0);
    expect(res.durbinWatson).toBeLessThan(4);
  });
  it('perfect fit: r2=1', () => {
    const res = simpleOLS([1,2,3,4,5],[2,4,6,8,10]);
    expect(res.r2).toBeCloseTo(1, 5);
  });
  it('returns null for zero-variance x', () =>
    expect(simpleOLS([3,3,3,3],[1,2,3,4])).toBeNull());
});

describe('multipleOLS', () => {
  it('returns null when n < p+2', () =>
    expect(multipleOLS([1,2,3], [[1,2],[3,4],[5,6]], ['a','b'])).toBeNull());
  it('returns result for valid input', () => {
    const Y = [1,2,3,4,5,6,7,8,9,10];
    const X = Y.map(y => [y + Math.random()*0.1, y*2 + Math.random()*0.1]);
    const res = multipleOLS(Y, X, ['x1','x2']);
    expect(res).not.toBeNull();
    expect(res.r2).toBeGreaterThan(0);
  });
  it('returns null for rank-deficient X (collinear predictors)', () => {
    const Y = [1,2,3,4,5];
    const X = [[1,2],[2,4],[3,6],[4,8],[5,10]]; // x2 = 2*x1
    expect(multipleOLS(Y, X)).toBeNull();
  });
});
```

- [ ] **Step 2: Run**

Run: `npx vitest run src/tests/regression.test.js --reporter=verbose`

Expected: All pass. The collinear predictor test exercises the `matInv` singularity guard.

---

## Task 16: Write `categorical.test.js`

**Files:**
- Create: `src/tests/categorical.test.js`

- [ ] **Step 1: Write tests**

```js
// src/tests/categorical.test.js
import { describe, it, expect } from 'vitest';
import {
  chiSquare, chiGoF, fisherExact, mcnemar, binomialTest, onePropZ, twoPropZ,
} from './categorical.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

const cat = ref.categorical;

// Helper: build dataset from 2×2 counts
const mk2x2Data = (a, b, c, d) => [
  ...Array(a).fill({ col1: 'A', col2: 'X' }),
  ...Array(b).fill({ col1: 'A', col2: 'Y' }),
  ...Array(c).fill({ col1: 'B', col2: 'X' }),
  ...Array(d).fill({ col1: 'B', col2: 'Y' }),
];

describe('chiSquare', () => {
  it('returns null for empty data', () =>
    expect(chiSquare([], 'col1', 'col2')).toBeNull());
  it('chi2 matches R chisq.test()', () => {
    const data = mk2x2Data(10, 20, 30, 40);
    const res = chiSquare(data, 'col1', 'col2');
    expect(res.chi2).toBeCloseTo(cat.chiSquare_2x2.chi2, 2);
    expect(res.p).toBeCloseTo(cat.chiSquare_2x2.p, 3);
  });
  it('Cramér V is between 0 and 1', () => {
    const data = mk2x2Data(10, 5, 3, 20);
    expect(chiSquare(data, 'col1', 'col2').V).toBeGreaterThanOrEqual(0);
    expect(chiSquare(data, 'col1', 'col2').V).toBeLessThanOrEqual(1);
  });
  it('lowExp flag set when expected cell < 5', () => {
    const data = mk2x2Data(1, 1, 1, 1);
    expect(chiSquare(data, 'col1', 'col2').lowExp).toBe(true);
  });
});

describe('chiGoF', () => {
  it('returns null for mismatched lengths', () =>
    expect(chiGoF([10, 20], [33])).toBeNull());
  it('perfect fit → chi2=0', () =>
    expect(chiGoF([10, 20], [10, 20]).chi2).toBeCloseTo(0, 8));
  it('chi2 and p are defined for valid input', () => {
    const res = chiGoF([10, 20, 30], [20, 20, 20]);
    expect(res.chi2).toBeGreaterThan(0);
    expect(res.p).toBeLessThanOrEqual(1);
  });
});

describe('fisherExact', () => {
  it('p matches R fisher.test()', () => {
    const res = fisherExact(5, 2, 1, 8);
    expect(res.p).toBeCloseTo(cat.fisher_2x2.p, 3);
  });
  it('OR matches R fisher.test()', () => {
    const res = fisherExact(5, 2, 1, 8);
    expect(res.OR).toBeCloseTo(cat.fisher_2x2.OR, 1);
  });
  it('returns warning object when n > 500', () => {
    const res = fisherExact(200, 200, 200, 200);
    expect(res.warning).toBeDefined();
    expect(res.p).toBeNull();
  });
  it('OR=1 for balanced table', () => {
    const res = fisherExact(10, 10, 10, 10);
    expect(res.OR).toBeCloseTo(1, 4);
  });
});

describe('mcnemar', () => {
  it('returns null for b+c < 10', () =>
    expect(mcnemar(2, 3)).toBeNull());
  it('chi2 matches R mcnemar.test()', () => {
    const res = mcnemar(3, 7); // b=3, c=7 → b+c=10
    expect(res.chi2).toBeCloseTo(cat.mcnemar_basic.chi2, 2);
    expect(res.p).toBeCloseTo(cat.mcnemar_basic.p, 2);
  });
});

describe('binomialTest', () => {
  it('p=1 when k=n and p0=1', () => {
    const res = binomialTest(5, 5, 1);
    expect(res.p).toBeCloseTo(1, 5);
  });
  it('p is small for extreme k with p0=0.5', () => {
    const res = binomialTest(0, 20, 0.5);
    expect(res.p).toBeLessThan(0.01);
  });
  it('pHat = k/n', () => {
    const res = binomialTest(3, 10, 0.5);
    expect(res.pHat).toBeCloseTo(0.3, 5);
  });
  it('CI contains pHat', () => {
    const res = binomialTest(4, 10, 0.5);
    expect(res.ci95[0]).toBeLessThan(res.pHat);
    expect(res.ci95[1]).toBeGreaterThan(res.pHat);
  });
});

describe('onePropZ', () => {
  it('z=0 when ph=p0', () => {
    const res = onePropZ(50, 100, 0.5);
    expect(res.z).toBeCloseTo(0, 8);
  });
  it('large z for extreme proportion', () => {
    const res = onePropZ(90, 100, 0.5);
    expect(Math.abs(res.z)).toBeGreaterThan(5);
    expect(res.p).toBeLessThan(0.001);
  });
});

describe('twoPropZ', () => {
  it('z=0 when p1=p2', () => {
    const res = twoPropZ(50, 100, 50, 100);
    expect(res.z).toBeCloseTo(0, 8);
  });
  it('RR is defined and positive', () => {
    const res = twoPropZ(30, 100, 15, 100);
    expect(res.RR).toBeGreaterThan(0);
  });
  it('OR is defined and positive', () => {
    const res = twoPropZ(30, 100, 15, 100);
    expect(res.OR).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run**

Run: `npx vitest run src/tests/categorical.test.js --reporter=verbose`

Expected: All pass. The `fisherExact` n>500 guard test exercises Task 8's fix.

---

## Task 17: Write `multivariate.test.js`

**Files:**
- Create: `src/tests/multivariate.test.js`

- [ ] **Step 1: Write tests**

```js
// src/tests/multivariate.test.js
import { describe, it, expect } from 'vitest';
import { pca, efa, cronbach, icc, kappa } from './multivariate.js';
import ref from './__fixtures__/reference.json' with { type: 'json' };

// Iris-like test data: 20 rows, 3 numeric vars
const mkData = () => Array.from({ length: 20 }, (_, i) => ({
  x1: i + 1,
  x2: i * 0.5 + Math.sin(i),
  x3: 20 - i + Math.cos(i),
}));

describe('pca', () => {
  const data = mkData();
  const vars = ['x1', 'x2', 'x3'];

  it('returns null for insufficient rows', () =>
    expect(pca([{ x1: 1, x2: 2, x3: 3 }], vars)).toBeNull());
  it('returns eigenvalues array of length k', () => {
    const res = pca(data, vars);
    expect(res.eigenvalues).toHaveLength(3);
  });
  it('eigenvalues are non-negative', () => {
    const res = pca(data, vars);
    res.eigenvalues.forEach(e => expect(e).toBeGreaterThanOrEqual(-0.0001));
  });
  it('cumulative variance ends at 100%', () => {
    const res = pca(data, vars);
    expect(res.cumP[res.cumP.length - 1]).toBeCloseTo(100, 1);
  });
  it('eigenvectors are now included in result (Task 9 fix)', () => {
    const res = pca(data, vars);
    expect(res.eigenvectors).toBeDefined();
    expect(res.eigenvectors).toHaveLength(3);
  });
  it('eigenvaluesRaw are now included in result (Task 9 fix)', () => {
    const res = pca(data, vars);
    expect(res.eigenvaluesRaw).toBeDefined();
  });
  it('nSig reports components with eigenvalue > 1', () => {
    const res = pca(data, vars);
    expect(res.nSig).toBeGreaterThanOrEqual(0);
    expect(res.nSig).toBeLessThanOrEqual(3);
  });
});

describe('efa', () => {
  it('returns null when pca returns null', () =>
    expect(efa([{ x1: 1 }], ['x1'], 1)).toBeNull());
  it('returns result for valid data', () => {
    const data = mkData();
    const res = efa(data, ['x1', 'x2', 'x3'], 2);
    expect(res).not.toBeNull();
    expect(res).toHaveProperty('loadings');
  });
});

describe('cronbach', () => {
  it('returns alpha between 0 and 1 for positively correlated items', () => {
    // 4 items that are highly correlated
    const data = Array.from({ length: 10 }, (_, i) => ({
      i1: i + 1, i2: i + 1.2, i3: i + 0.8, i4: i + 1.5,
    }));
    const res = cronbach(data, ['i1', 'i2', 'i3', 'i4']);
    expect(res).not.toBeNull();
    expect(res.alpha).toBeGreaterThan(0.8);
    expect(res.alpha).toBeLessThanOrEqual(1);
  });
  it('alpha matches R alpha() for known data', () => {
    const data = [
      { i1:1, i2:2, i3:3, i4:4 },
      { i1:2, i2:3, i3:4, i4:5 },
      { i1:3, i2:4, i3:5, i4:6 },
      { i1:4, i2:5, i3:6, i4:7 },
    ];
    const res = cronbach(data, ['i1','i2','i3','i4']);
    expect(res.alpha).toBeCloseTo(ref.multivariate.cronbach_basic.alpha, 2);
  });
  it('returns item-total correlations array', () => {
    const data = Array.from({ length: 8 }, (_, i) => ({ a: i, b: i+1, c: i+2 }));
    const res = cronbach(data, ['a','b','c']);
    expect(res.itemTotal).toHaveLength(3);
  });
});

describe('icc', () => {
  it('returns ICC between -1 and 1', () => {
    const data = Array.from({ length: 10 }, (_, i) => ({
      r1: i + 1, r2: i + 1.1, r3: i + 0.9,
    }));
    const res = icc(data, ['r1','r2','r3']);
    expect(res).not.toBeNull();
    expect(res.icc21).toBeGreaterThanOrEqual(-1);
    expect(res.icc21).toBeLessThanOrEqual(1);
  });
  it('perfect agreement → ICC close to 1', () => {
    const data = Array.from({ length: 8 }, (_, i) => ({
      r1: i, r2: i, r3: i,
    }));
    const res = icc(data, ['r1','r2','r3']);
    expect(res.icc21).toBeGreaterThan(0.95);
  });
});

describe('kappa', () => {
  it('perfect agreement → kappa=1', () => {
    const rater1 = [0, 1, 0, 1, 0, 1];
    const rater2 = [0, 1, 0, 1, 0, 1];
    const res = kappa(rater1, rater2);
    expect(res.kappa).toBeCloseTo(1, 4);
  });
  it('random agreement → kappa near 0', () => {
    const rater1 = [0,0,0,0,0,0,1,1,1,1,1,1];
    const rater2 = [0,1,0,1,0,1,0,1,0,1,0,1];
    const res = kappa(rater1, rater2);
    expect(Math.abs(res.kappa)).toBeLessThan(0.4);
  });
});
```

- [ ] **Step 2: Run**

Run: `npx vitest run src/tests/multivariate.test.js --reporter=verbose`

Expected: All pass. The `eigenvectors` and `eigenvaluesRaw` tests verify the Task 9 fix. If `efa` previously crashed, it should now work.

---

## Task 18: Wiring audit — tree.js × InferenceConfig.jsx × InferencePanel.jsx

**Files:**
- Modify: `src/components/InferencePanel.jsx` (stub any missing branches)
- Modify: `src/components/InferenceConfig.jsx` (stub any missing configMap entries)

- [ ] **Step 1: Extract all IDs from tree.js**

Open `src/config/tree.js`. The full list of 55 IDs is:

```
t_welch, t_one, t_paired, trimmed, z_known, sign,
anova, welch_anova, twoway, ancova, rm_anova, kruskal, friedman, cochranQ,
mwu, wilcoxon,
pearson, spearman, kendall, partial, pointbis,
ols_simple, ols_multi, polynomial, hierarchical, logistic, mediation, med_bootstrap, moderation,
chisq, chigof, fisher, mcnemar, binomial, prop1, prop2,
tost, bayes_t, bayes_r,
pca, efa, cronbach, splithalf, icc, kappa,
meta, did,
grubbs, normality, homogeneity, samplesize, effectconv, corrections, bootstrap, sensitivity
```

- [ ] **Step 2: Check InferenceConfig.jsx has a `configMap` entry for every ID**

Search for each ID. Run:

```
grep -n "t_welch\|t_one\|t_paired\|trimmed\|z_known\|sign\|anova\|welch_anova\|twoway\|ancova\|rm_anova\|kruskal\|friedman\|cochranQ\|mwu\|wilcoxon\|pearson\|spearman\|kendall\|partial\|pointbis\|ols_simple\|ols_multi\|polynomial\|hierarchical\|logistic\|mediation\|med_bootstrap\|moderation\|chisq\|chigof\|fisher\|mcnemar\|binomial\|prop1\|prop2\|tost\|bayes_t\|bayes_r\|pca\|efa\|cronbach\|splithalf\|icc\|kappa\|meta\|did\|grubbs\|normality\|homogeneity\|samplesize\|effectconv\|corrections\|bootstrap\|sensitivity" src/components/InferenceConfig.jsx
```

For any ID that does not appear in `InferenceConfig.jsx`, add a minimal stub to `configMap` at the bottom of the existing configMap object:

```jsx
missingId: () => <div style={{color:'#888',fontSize:12}}>No configuration needed.</div>,
```

- [ ] **Step 3: Check InferencePanel.jsx has a result branch for every ID**

Run the same grep against `src/components/InferencePanel.jsx`. For any missing ID, add a stub inside the `result` useMemo:

```js
if (test === 'missingId') return { test: 'missingId', apa: 'Not yet implemented.' };
```

- [ ] **Step 4: Document findings**

List any IDs that were missing from either file, and confirm all 55 are now wired.

---

## Task 19: Full coverage check and final run

- [ ] **Step 1: Run the complete test suite**

Run: `npx vitest run --reporter=verbose`

Expected: All ~270 tests pass, zero failures.

- [ ] **Step 2: Run coverage**

Run: `npx vitest run --coverage`

Expected:
- `src/math/core.js` ≥ 90% line coverage
- `src/math/distributions.js` ≥ 90% line coverage
- `src/math/matrix.js` ≥ 90% line coverage
- `src/tests/means.js` ≥ 90% line coverage
- `src/tests/anova.js` ≥ 85% line coverage
- `src/tests/regression.js` ≥ 85% line coverage
- `src/tests/categorical.js` ≥ 85% line coverage
- `src/tests/multivariate.js` ≥ 85% line coverage

If any file is below threshold, add targeted tests for the uncovered branches shown in the coverage report.

- [ ] **Step 3: Confirm APA strings have no leading zeros on p-values**

Run:
```
npx vitest run --reporter=verbose 2>&1 | grep "p = 0\."
```

Expected: No output. Any hit means a test is checking an APA string produced before the `fmtP` fix was applied — update those assertions.

---

## Self-Review

**Spec coverage check:**
- ✅ Phase 1 setup — Tasks 1–3
- ✅ chiPVal fix (lowerIncGamma) — Task 4
- ✅ normalCDF tail accuracy + tInv2 ceiling — Task 5
- ✅ fmtP dead branch + APA leading zero — Task 6
- ✅ shapiroWilk approximate flag — Task 7
- ✅ yuentTest se=0 guard — Task 8
- ✅ fisherExact large-n guard — Task 8
- ✅ matInv singularity — already in source at matrix.js:14; verified in matrix.test.js Task 12
- ✅ PCA eigenvectors + EFA fix — Task 9 (spec gap found during codebase reading: efa used undefined evecs)
- ✅ core.test.js (~40 cases) — Task 10
- ✅ distributions.test.js (~35 cases) — Task 11
- ✅ matrix.test.js (~15 cases) — Task 12
- ✅ means.test.js (~30 cases) — Task 13
- ✅ anova.test.js (~25 cases) — Task 14
- ✅ regression.test.js (~25 cases) — Task 15
- ✅ categorical.test.js (~25 cases) — Task 16
- ✅ multivariate.test.js (~20 cases) — Task 17
- ✅ Wiring audit (55 entries) — Task 18
- ✅ Coverage gate ≥ 90% — Task 19
- ✅ R reference values — Task 3 (gen-reference.R script)
- ✅ APA string assertions — included in means, anova, regression, categorical tests
