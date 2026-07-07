# Sub-batch 8c Deepening Pass — Bug Fixes

## Summary

The batch 8c implementation passes all 1038 tests (contract, chartMap, methodNotes, component). However, the deepening review found **5 runtime bugs in InferencePanel.jsx** that were fixed in runners.js but not carried over to the InferencePanel computation branches. These would cause incorrect results or silent failures when a user clicks those tests in the UI.

---

## Bugs Found

### Critical (runtime error or silent null)

| # | Test ID | Line | Issue | Fix |
|---|---------|------|-------|-----|
| 1 | `ord_varpart` | 2987 | `varpart([0.3,0.2,0.1], [0.1,0.05,0.1])` — passes array as `R2total` (expects scalar). Throws `toFixed is not a function`. | `varpart(0.5, [0.3, 0.2])` (matching runners.js:1565) |
| 2 | `pls_rda` | 2994 | `rda(allTgt.slice(0,25), ...)` — `allTgt` is 1D but `rda()` expects 2D Y. Throws `Y[0].map is not a function`. | `rda(allTgt.slice(0, 25).map(v => [v]), ...)` (matching runners.js:1571) |
| 3 | `prep_smote` | 2923 | `allTgt` is continuous (~10–35). `smote()` checks `y[i] === 1` / `=== 0` for minority/majority. Returns null. | `allTgt.slice(0,20).map(v => v > avg(allTgt) ? 1 : 0)` (matching runners.js:1507) |
| 4 | `prep_adasyn` | 2924 | Same as above — continuous y, `adasyn()` needs binary. | Same binarization approach. |
| 5 | `prep_undersample` | 2925 | Same as above. | Same binarization approach. |

### Moderate (wrong behavior, incorrect data shape)

| # | Test ID | Line | Issue | Fix |
|---|---------|------|-------|-----|
| 6 | `dist_matrix` | 2964 | `distanceMatrix()` returns a raw `Array[]`. Spreading it into `{...r, test:'Distance Matrix'}` creates a broken object with numeric keys. | Wrap like runners.js:1544: `const D = distanceMatrix(...); return D ? { test: 'Distance Matrix', matrix: D, n: D.length, apa: \`Distance matrix: \${D.length}×\${D.length}\` } : null;` |
| 7 | `prep_onehot` | 2919 | Uses `numeric[0] \|\| cat1 \|\| 'cat2'` for column. `numeric[0]` is a numeric column (e.g., 'x'), but `oneHotEncode()` needs a categorical column. Returns weak results or null. | Use `cat2` or a categorical column from data. The runner uses `'cat2'` (runners.js:1503). |
| 8 | `prep_freqencode` | 2922 | Same column-detection issue as #7. | Same fix — use a categorical column. |

---

## Implementation Plan

All fixes are in a single file: `src/components/InferencePanel.jsx`.

1. **Fix `ord_varpart`** (line 2987) — change first arg from array to scalar
2. **Fix `pls_rda`** (line 2994) — reshape Y to 2D with `.map(v => [v])`
3. **Fix `prep_smote/adasyn/undersample`** (lines 2923–2925) — binarize `allTgt` using threshold at mean
4. **Fix `dist_matrix`** (line 2964) — wrap raw distance matrix in proper object
5. **Fix `prep_onehot/freqencode`** (lines 2919, 2922) — use a categorical column (`cat2`) instead of `numeric[0]`

After editing, verify with:
```
npx vitest run src/components/InferencePanel.test.jsx src/tests/contracts.test.js
```

## Non-Issues Confirmed OK

- `fit_distgof` in runners.js: `distributionGoF()` already returns a `.test` property (verified at fitting.js:261), no wrapping needed.
- `fit_normal` through `fit_beta` in InferencePanel: wrapping with `{...r, test:'...'}` works — the `distribution` property is superseded by `test`.
- All chartMap entries match the plan spec (68 entries, 537 total).
- All methodNotes entries are present (15 string entries + 53 object entries = 68).
- State vars, deps, and configState are correctly wired in InferencePanel.
- InferenceConfig configMap entries are all present and correctly reference state vars.
