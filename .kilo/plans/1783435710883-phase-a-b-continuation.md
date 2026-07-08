# Phase A + B Continuation

## Context

- **Branch**: `feat/batch9-wiring`, 25+ commits ahead of `main`
- **Remote**: `origin https://github.com/mpdecker/Statlab.git`
- **Uncommitted**: 8 files with typecheck JSDoc fixes (45 insertions, 44 deletions), 1 untracked `.kilo/kilo.jsonc` (local config — do NOT commit)
- **Tests**: 6,023 library pass with uncommitted changes
- **Build**: ESM + CJS succeed
- **CI workflow**: exists on branch with 5 jobs (test-build, lint, typecheck, coverage, pack-verify), typecheck is non-blocking (`continue-on-error: true`)

## Current State

| Gate | Status |
|------|--------|
| Typecheck errors | 338 remaining (was 512, 174 fixed in uncommitted changes) |
| Lint warnings | 366 `no-unused-vars` (untouched) |
| CI on main | Not yet — needs PR + merge |

## Phase A — Commit, PR, Merge to Main

### Goal
Land the current CI pipeline + typecheck fixes on `main` so CI gates all future work.

### Steps

1. **Add `.kilo/kilo.jsonc` to `.gitignore`** — local Kilo config, should not be committed
2. **Stage and commit** the 8 modified files as a single commit:
   ```
   git add packages/statlab/src/math/matrix.js
   git add packages/statlab/src/math/power.js
   git add packages/statlab/src/methods/anova.js
   git add packages/statlab/src/methods/bandit.js
   git add packages/statlab/src/methods/categorical.js
   git add packages/statlab/src/methods/clinical.js
   git add packages/statlab/src/methods/experimental.js
   git add packages/statlab/src/methods/multivariate.js
   git commit -m "fix(statlab): refine JSDoc types in 8 method modules — 174 typecheck errors resolved"
   ```
3. **Push** to remote:
   ```
   git push origin feat/batch9-wiring
   ```
4. **Create PR** with `gh pr create`:
   - Base: `main`, Head: `feat/batch9-wiring`
   - Title: `feat(ci): CI pipeline + pnpm migration + 8-module typecheck hardening`
   - Body MUST note: 338 typecheck errors (non-blocking), 366 lint warnings — tracked for future PRs

5. **Wait for CI** to run all 5 jobs on the PR. Expected:
   - test-build: green (Node 22.x + 24.x matrix)
   - lint: green (0 errors, 366 warnings)
   - typecheck: yellow (non-blocking, 338 errors)
   - coverage: green (98.88% > 90%)
   - pack-verify: green

6. **Merge PR** to `main`:
   ```
   gh pr merge <PR-URL> --merge
   ```

### Risks
- CI may fail on first push if remote has drifted — check `git fetch` first
- PR description must be accurate about known gaps so reviewers aren't surprised

### Validation
- PR shows all 5 CI jobs green (typecheck may be yellow but non-blocking)
- `main` branch has CI workflow after merge

---

## Phase B — Typecheck Hardening (338 → 0)

### Goal
Fix all 338 typecheck errors via JSDoc annotation refinement. After fixing, remove `continue-on-error: true` and make typecheck a blocking CI job.

### Error Type Breakdown (338 remaining)

| Code | Count | Root Cause | Fix Pattern |
|------|-------|-----------|-------------|
| TS2339 | 174 | Property access on vague type | Refine `@param {object}` → specific type or `{{prop: type}}` |
| TS2349 | 35 | Calling non-function | Refine to callable type (`@param {Function}`) |
| TS2345 | 29 | Wrong argument type | Refine parameter `@param` |
| TS2365 | 22 | Operator on incompatible types | Refine operand types |
| TS2362 | 21 | Arithmetic left-side type | Refine to `{number}` |
| TS2363 | 17 | Arithmetic right-side type | Refine to `{number}` |
| TS2322 | 12 | Wrong return type | Refine `@returns` |
| TS2488 | 9 | Not iterable | Refine to array type |
| TS2554 | 5 | Wrong arg count | Fix `@param` count or reorder |
| TS2353 | 4 | Object literal mismatch | Refine object shape types |
| TS2538 | 3 | Cannot index with key | Add index signature or type guard |
| TS1016 | 3 | Required after optional | Reorder params: optional last |
| TS2367 | 2 | Comparison overlap | Refine so types don't trivially overlap |
| TS18047 | 1 | Possibly null | Add null check or non-null type |
| TS2769 | 1 | No overload matches | Fix call signature |

### File-by-File Fix Order (by error count, descending)

| Batch | File | Errors |
|-------|------|--------|
| 1 | `methods/learning.js` | 21 |
| 1 | `methods/timeseries.js` | 18 |
| 1 | `methods/bandit.js` | 18 |
| 1 | `methods/causalDiscovery.js` | 16 |
| 1 | `methods/pk.js` | 14 |
| 2 | `methods/info.js` | 13 |
| 2 | `methods/metrics.js` | 13 |
| 2 | `methods/spc.js` | 13 |
| 2 | `methods/abTesting.js` | 13 |
| 2 | `methods/regression.js` | 13 |
| 2 | `methods/psychometrics.js` | 13 |
| 3 | `methods/pgm.js` | 12 |
| 3 | `methods/sem.js` | 11 |
| 3 | `methods/nonparametric.js` | 11 |
| 3 | `methods/mixture.js` | 10 |
| 3 | `methods/pointProcess.js` | 10 |
| 3 | `methods/sensitivity.js` | 10 |
| 3 | `methods/spatial.js` | 10 |
| 4 | `methods/bayesian.js` | 9 |
| 4 | `methods/circular.js` | 8 |
| 4 | `methods/causal.js` | 8 |
| 5 | `methods/raMonitor.js` | 6 |
| 5 | `methods/econometric.js` | 6 |
| 5 | `methods/spatialEconometric.js` | 5 |
| 5 | `methods/privacy.js` | 5 |
| 5 | `methods/interpretability.js` | 5 |
| 5 | `methods/tensor.js` | 5 |
| 6 (tail) | Remaining 20 files | 1–4 each | 43 total |

Tail files (1–4 errors each): `robust.js` (4), `power.js` (4), `preprocessing.js` (4), `neural.js` (3), `optimization.js` (3), `discrete.js` (3), `signal.js` (3), `stochastic.js` (2), `spatialTemporal.js` (2), `survival.js` (2), `trials.js` (2), `demo.js` (2), `genetics.js` (2), `means.js` (1), `ordination.js` (1), `distance.js` (1), `smc.js` (1), `clustering.js` (1), `pls.js` (1)

### Fix Process (per file)

1. Open the file and read all TS error locations
2. Apply the appropriate JSDoc fix pattern (see below)
3. Run `pnpm --filter statlab typecheck` to verify error count decreases
4. Run `pnpm --filter statlab test` after every 3–5 files to catch regressions
5. Commit each batch separately (one commit per file or per 5 files)

### Fix Patterns (repeated from existing plan)

**TS2339 — Property on vague type:**
```js
// Before: @param {object} data
// After:  @param {number[]} data
export function mean(data) { return avg(data) }

// Before: @param {object} options
// After:  @param {{alpha?: number, beta?: number}} options
export function test(data, options = {}) {
  const { alpha = 0.05 } = options
}
```

**TS2362/TS2363 — Arithmetic on non-number:**
```js
// Before: @param {*} x
// After:  @param {number} x
export function square(x) { return x * x }
```

**TS1016 — Required after optional:**
```js
// Before: export function foo(a, b = 1, c) { ... }
// After:  export function foo(a, b = 1, c = 0) { ... }
```

**TS2349 — Calling non-function:**
```js
// Before: @param {object} callback
// After:  @param {Function} callback
export function compute(data, callback) { return callback(data) }
```

### CI Hardening (after 338 → 0)

1. Remove `continue-on-error: true` from the `typecheck` job in `.github/workflows/ci.yml`
2. Verify `pnpm --filter statlab typecheck` exits 0 locally
3. Commit CI change with message: `fix(ci): make typecheck a blocking job`
4. Push and verify CI goes green (including typecheck)

### Risks

- JSDoc refinement may narrow types too aggressively — if any test breaks, revert and widen the type
- Files touched in Phase A (anova, clinical, experimental, multivariate, categorical, bandit, matrix, power) already have fixes applied — don't re-edit unless they still have errors
- The `bandit.js` file appears in both committed fixes (2 lines changed) and still has 18 remaining errors — those are in different functions

### Validation (End of Phase B)

```
pnpm --filter statlab test       # 6,023 pass
pnpm --filter statlab build      # ESM + CJS succeed
pnpm --filter statlab typecheck  # 0 errors (exit 0)
pnpm --filter statlab lint       # 0 errors, 366 warnings (Phase C not started)
pnpm -r test                     # 6,544 pass (library + app)
```

---

## Open Questions

- **Phase C (lint 366 → 0)**: Not covered in this plan. Tackle after Phase B is complete and CI typecheck is blocking.
- **`main` branch drift**: If `main` has received new commits since `feat/batch9-wiring` was created, a rebase or merge may be needed before the Phase A PR.
