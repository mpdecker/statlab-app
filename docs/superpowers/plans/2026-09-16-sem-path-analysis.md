# SEM Phase A (`sem` + `pathAnalysis`) Implementation Plan

> **DEVIATION (2026-09-17):** Task 1 (`sem`) was implemented, reviewed
> clean, then **fully reverted post-verification** after Task 3's manual
> testing found `@statlab/core@0.1.1`'s factor-loading optimizer does not
> converge (see the design spec's Status section for the full writeup
> and `.superpowers/sdd/progress.md` for the commit-by-commit narrative).
> Only Task 2 (`path_analysis`) shipped. Do not execute Task 1 against
> this plan's literal text (its count-literal bumps, e.g. 228→229→230,
> reflect both tests together and no longer match shipped state) without
> first checking whether the upstream bug has been fixed.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `sem` (Structural Equation Model) and `path_analysis` (Path
Analysis) to the Navigator in a new SEM category, wired end-to-end
through the app's "one TREE entry = one test" pattern, establishing the
lavaan-equations-textarea config pattern and coefficients-table result
rendering that later SEM sub-phases (B and C) will reuse.

**Architecture:** Both tests call `@statlab/core/methods/sem` functions
directly against the full loaded dataset (`data`), configured via a
dedicated multi-line textarea per test holding lavaan-syntax equation
lines, following the existing `meta` test's `TA`-textarea config
pattern. Results render via two new small module-scope table components
in `InferenceResults.jsx` (`SemCoeffTable`, `PathCoeffTable`), matching
the file's own existing `CoeffTable` component convention exactly.

**Tech Stack:** React 18, Vite, Vitest, `@testing-library/react`,
`@statlab/core@0.1.1`.

## Global Constraints

- No new npm dependency — `sem`/`pathAnalysis` are already exported by
  the installed `@statlab/core@0.1.1` at `@statlab/core/methods/sem`.
- `semEquations`/`pathEquations` are dedicated state, never shared with
  each other or with `meta`'s existing `metaInput`.
- Both textareas default to a dataset-derived starter equation computed
  from `numeric` (never a hardcoded literal column name, never blank).
- `sem`'s non-convergence must surface as `{ error: '...' }` (the
  existing convention `InferenceResults.jsx` already renders in red via
  `if (r.error) return <div style={{ color: C.neg, ... }}>{r.error}</div>;`
  at line ~166) — not raw NaN/Infinity in chips or exports.
- `pathAnalysis` needs no equivalent guard — its own per-equation
  `if (!inv) return;` already drops unfittable equations silently
  rather than propagating NaN (confirmed by reading its source).
- No new chart component or chart mode — both tests use the existing
  `'histogram'` `CHART_FOR_TEST` default, matching other non-visual
  tests (e.g. `wmean`, `deff`).
- Every stale hardcoded test/mapping count literal touched by adding
  these 2 TREE ids must be bumped in the same task that adds them
  (`contracts.test.js`'s `TREE_IDS.length`, `chartMap.test.js`'s
  `CHART_FOR_TEST` count) — this is a recurring, previously-documented
  bug class in this codebase; don't leave a stale literal for a later
  task to trip over.

---

### Task 1: `sem` (Structural Equation Model)

**Files:**
- Modify: `src/config/tree.js` (new `SEM` category)
- Modify: `src/config/fixtures/runners.js` (1 new runner)
- Modify: `src/config/chartMap.js` (1 new entry, `'histogram'`)
- Modify: `src/config/chartMap.test.js` (bump `230` → `231`)
- Modify: `src/config/contracts.test.js` (bump `228` → `229`)
- Modify: `src/components/InferenceConfig.jsx` (1 config entry)
- Modify: `src/components/InferencePanel.jsx` (import, 1 `useState`, 1
  entry in the `useInference` return object, 1 result branch +
  `semResultOrError` helper)
- Modify: `src/components/InferenceResults.jsx` (new `SemCoeffTable`
  component, 1 result-render block)
- Modify: `src/config/methodNotes.js` (1 entry)
- Test: `src/components/InferencePanel.test.jsx` (1 new regression test
  for the non-convergence guard)

**Interfaces:**
- Consumes: `sem` from `@statlab/core/methods/sem` — signature
  `sem({ equations: string[], data: Record<string, any>[], method?: string })`,
  returns `null` on insufficient/malformed input, or
  `{ test: 'SEM' | 'SEM (CFA: N latent(s))', model: { equations, latents, observables, n }, coefficients, loadings, paths, fit: { chi2, df, p, cfi, tli, rmsea, rmseaCI: [lo, hi], srmr, aic, bic }, apa }`.
- Produces: `semResultOrError(r)` helper in `InferencePanel.jsx` (Task 2
  does not need this — `pathAnalysis` has its own, different, failure
  mode already handled by the package itself). `SemCoeffTable` in
  `InferenceResults.jsx`, reused by no other task in this plan (Task 2
  defines its own `PathCoeffTable` — the two result shapes differ:
  `{from, estimate, se, z, p}` vs `{from, to, direct, indirect, total}`).

- [ ] **Step 1: Add the TREE category and entry**

In `src/config/tree.js`, find the end of the file (the `SURVEY
METHODOLOGY` category is currently last):

```js
  { cat: "SURVEY METHODOLOGY", color: '#fb7185',
    tests: [
      { id: "wmean",  label: "Weighted Descriptives",   tag: "weighted mean · SD · SE" },
      { id: "wcorr",  label: "Weighted Correlation",    tag: "weighted Pearson r" },
      { id: "deff",   label: "Design Effect",           tag: "DEFF · effective n · weight CV" },
      { id: "taylor", label: "Taylor Linearization",    tag: "stratified/clustered total · SE" },
    ],
  },
];
```

Add a new category immediately after it, still before the closing `];`:

```js
  { cat: "SURVEY METHODOLOGY", color: '#fb7185',
    tests: [
      { id: "wmean",  label: "Weighted Descriptives",   tag: "weighted mean · SD · SE" },
      { id: "wcorr",  label: "Weighted Correlation",    tag: "weighted Pearson r" },
      { id: "deff",   label: "Design Effect",           tag: "DEFF · effective n · weight CV" },
      { id: "taylor", label: "Taylor Linearization",    tag: "stratified/clustered total · SE" },
    ],
  },
  { cat: "SEM", color: '#c4b5fd',
    tests: [
      { id: "sem", label: "Structural Equation Model", tag: "CFA · path model · fit indices" },
    ],
  },
];
```

(Task 2 adds `path_analysis` to this same `SEM` category.)

- [ ] **Step 2: Add the runner fixture**

In `src/config/fixtures/runners.js`, find the import block for
multivariate methods and the MDS runners added in the Survey/MDS phase:

```js
import { classicalMDS, sammonMapping, nonMetricMDS } from '@statlab/core/methods/mds';
```

Add immediately after it:

```js
import { sem } from '@statlab/core/methods/sem';
```

Find where the MDS runners are defined (e.g. `mds_classical: () =>
classicalMDS(ROWS, VARS, { nDimensions: 2 }),`) and add immediately
after that group:

```js
  sem: () => sem({ equations: ['f1 =~ item1 + item2 + item3'], data: ROWS }),
```

`ROWS` (from `mkTabular()`, 72 rows) has `item1`/`item2`/`item3`
columns already used as `VARS`-adjacent fixture data elsewhere in this
file — confirm by reading `src/config/fixtures/core.js`'s `mkTabular`
if the exact column names have changed since this plan was written.

- [ ] **Step 3: Run the contract test to verify the runner works**

Run: `pnpm vitest run src/config/contracts.test.js -t sem`
Expected: initially FAILS (id not yet in TREE / count literal not yet
bumped — see Steps 7-8) or, if the runner itself throws/returns `null`,
FAILS with that error. Either way, don't proceed past this step until
you've confirmed `sem({ equations: ['f1 =~ item1 + item2 + item3'],
data: ROWS })` genuinely returns a non-null result with all of
`fit.chi2`, `fit.cfi`, `fit.rmsea` finite (not `NaN`) — run it directly
in a scratch Node script against the real package if needed to confirm
convergence before wiring it into the fixture file. If it does not
converge with these 3 items, try a different combination of `item1`
through `item4`, or `rm1`/`rm2`/`rm3` (also present in `ROWS`), and
update both this fixture and Step 2's expected values accordingly.

- [ ] **Step 4: Add the config UI entry and dataset-derived default**

In `src/components/InferencePanel.jsx`, find the `metaInput` state
declaration:

```js
  const [metaInput, setMetaInput] = useState('Study1,0.5,0.20\nStudy2,0.3,0.25\nStudy3,0.8,0.18\nStudy4,0.4,0.22\nStudy5,0.6,0.19');
```

Add immediately after it:

```js
  const [semEquations, setSemEquations] = useState(numeric.length >= 3 ? `f1 =~ ${numeric.slice(0, 3).join(' + ')}` : '');
```

Find the `useInference` return object's `metaInput, setMetaInput,`
line (this is the object that becomes the `state` prop consumed by
`InferenceConfig.jsx`):

```js
    metaInput, setMetaInput,
```

Add immediately after it:

```js
    semEquations, setSemEquations,
```

In `src/components/InferenceConfig.jsx`, find the `meta` config entry:

```js
    meta: <TA
      label="Studies  (label, d, se — one per line)"
      value={state.metaInput} onChange={state.setMetaInput} rows={7}
    />,
```

Add immediately after it:

```js
    sem: <TA
      label="Model syntax (one equation per line: f =~ x1 + x2 for a latent factor, y ~ x for a regression)"
      value={state.semEquations} onChange={state.setSemEquations} rows={7}
    />,
```

(`state.semEquations`/`state.setSemEquations` — not a destructured
top-level variable — matching exactly how `metaInput`/`setMetaInput`
are accessed in this same file, both being newer additions not folded
into the file's large top-of-function destructure block.)

- [ ] **Step 5: Wire the result computation with the non-convergence guard**

In `src/components/InferencePanel.jsx`, find the `@statlab/core/methods/mds` import:

```js
import { classicalMDS, sammonMapping, nonMetricMDS } from '@statlab/core/methods/mds';
```

Add immediately after it:

```js
import { sem } from '@statlab/core/methods/sem';
```

Find the `mdsResultOrError` helper and the 3 MDS branches:

```js
      function mdsResultOrError(r) {
        if (!r) return r;
        const ok = r.points?.every(p => Number.isFinite(p?.[0]) && Number.isFinite(p?.[1]));
        return ok ? r : { error: 'MDS embedding did not converge for these variables — try different Variables.' };
      }
      if (a === 'mds_classical') { const cols = scaleVars.filter(c => numeric.includes(c)); return mdsResultOrError(classicalMDS(data.filter(r => rowFinite(r, cols)), cols, { nDimensions: 2 })); }
```

Add a new helper and branch immediately after the 3 MDS branches (i.e.
after the `mds_nonmetric` line):

```js
      function semResultOrError(r) {
        if (!r) return r;
        const finite = [r.fit?.chi2, r.fit?.cfi, r.fit?.tli, r.fit?.rmsea, r.fit?.srmr].every(Number.isFinite);
        return finite ? r : { error: 'SEM model did not converge — try a simpler model or check for near-collinear variables.' };
      }
      if (a === 'sem') return semResultOrError(sem({ equations: semEquations.trim().split('\n').map(l => l.trim()).filter(Boolean), data, method: 'ML' }));
```

- [ ] **Step 6: Add result rendering**

In `src/components/InferenceResults.jsx`, find the `CoeffTable`
component (module scope, near the top of the file, right before
`export function InferenceResults`):

```js
function CoeffTable({ coeffs }) {
  if (!coeffs?.length) return null;
  const headers = ['predictor', 'b', 'β', 'SE', 't', 'p', 'OR/VIF'];
  ...
}
```

Add a new component immediately after it, before `export function
InferenceResults`:

```js
function SemCoeffTable({ coeffs }) {
  if (!coeffs?.length) return null;
  const headers = ['parameter', 'estimate', 'SE', 'z', 'p'];
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', ...mono, fontSize: 9, width: '100%' }}>
        <thead>
          <tr>{headers.map(h => <th key={h} style={{ padding: '2px 6px', textAlign: 'left', color: C.dim, borderBottom: `1px solid ${C.border}`, fontSize: 7, textTransform: 'uppercase' }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {coeffs.map((c, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : C.panel }}>
              <td style={{ padding: '2px 6px', color: PAL[i % PAL.length] }}>{c.from}</td>
              <td style={{ padding: '2px 6px', color: C.text }}>{c.estimate}</td>
              <td style={{ padding: '2px 6px', color: C.dim }}>{c.se ?? '—'}</td>
              <td style={{ padding: '2px 6px', color: C.dim }}>{c.z ?? '—'}</td>
              <td style={{ padding: '2px 6px', color: c.p != null ? (sig(c.p) ? C.ok : C.neg) : C.dim }}>{c.p != null ? fmtP(c.p) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

Find the MDS shared result block:

```js
      {(r.test === 'Classical MDS' || r.test === 'Sammon Mapping' || r.test === 'Non-Metric MDS') && <>
        <SectionHead label={`${r.test} · ${r.nDimensions}D · n=${r.n}`} />
        <Row>
          {r.stress != null && <Chip label="stress" value={r.stress} color={r.stress < .1 ? C.ok : r.stress < .2 ? C.warn : C.neg} />}
          <Chip label="dimensions" value={r.nDimensions} color={C.dim} />
        </Row>
      </>}
```

Add a new block immediately after it (before the `McDonald's ω` block):

```js
      {(r.test === 'SEM' || r.test?.startsWith('SEM (')) && <>
        <SectionHead label={`${r.test} · N=${r.model?.n}`} />
        <Row>
          <Chip label="χ²" value={r.fit?.chi2} sub={`df=${r.fit?.df}`} color={C.dim} />
          <Chip label="p" value={r.fit?.p != null ? fmtP(r.fit.p) : '—'} color={sig(r.fit?.p) ? C.neg : C.ok} />
          <Chip label="CFI" value={r.fit?.cfi} color={r.fit?.cfi >= .95 ? C.ok : r.fit?.cfi >= .90 ? C.warn : C.neg} />
          <Chip label="TLI" value={r.fit?.tli} color={C.dim} />
          <Chip label="RMSEA" value={r.fit?.rmsea} sub={r.fit?.rmseaCI ? `[${r.fit.rmseaCI[0]}, ${r.fit.rmseaCI[1]}]` : ''} color={r.fit?.rmsea <= .06 ? C.ok : r.fit?.rmsea <= .08 ? C.warn : C.neg} />
          <Chip label="SRMR" value={r.fit?.srmr} color={r.fit?.srmr <= .08 ? C.ok : C.warn} />
          <Chip label="AIC" value={r.fit?.aic} color={C.dim} />
          <Chip label="BIC" value={r.fit?.bic} color={C.dim} />
        </Row>
        {r.loadings?.length > 0 && <>
          <div style={{ fontSize: 8, color: C.dim, ...mono, textTransform: 'uppercase', margin: '6px 0 2px' }}>Loadings</div>
          <SemCoeffTable coeffs={r.loadings} />
        </>}
        {r.paths?.length > 0 && <>
          <div style={{ fontSize: 8, color: C.dim, ...mono, textTransform: 'uppercase', margin: '6px 0 2px' }}>Paths</div>
          <SemCoeffTable coeffs={r.paths} />
        </>}
      </>}
```

(`r.test?.startsWith('SEM (')` handles the CFA-variant test-name
suffix `sem()` appends when the model has a measurement component —
confirmed via `node_modules/@statlab/core/src/methods/sem.js:328`:
`test: 'SEM' + (loadPrefix ? ' (' + loadPrefix + ')' : '')`. No other
function in the package returns a `test` field starting with `'SEM'`
— confirmed by grepping the whole `methods/` directory — so this
cannot collide with an unrelated test.)

- [ ] **Step 7: Add the method note**

In `src/config/methodNotes.js`, find the `mds_nonmetric` entry (last
entry before `METHOD_NOTES`'s closing `};`):

```js
  mds_nonmetric: {
    description: "Non-metric MDS (Kruskal's method) preserves only the rank order of dissimilarities, not their exact magnitudes, minimizing a stress function over monotonic transformations of distance.",
    usage: "Use when your dissimilarity measure is ordinal or you only trust its rank order (e.g. subjective similarity ratings) rather than its exact numeric scale.",
    assumptions: ["Dissimilarities are at least ordinally meaningful", "At least 6 observations, 2+ numeric variables"],
    cite: "Kruskal, J. B. (1964). Nonmetric multidimensional scaling: A numerical method. Psychometrika, 29(2), 115–129.",
  },
};
```

Add immediately after it, still before the closing `};`:

```js
  sem: {
    description: "Structural equation modeling combines an optional latent-factor measurement model with structural regressions among factors and/or observed variables, fit by maximum likelihood, yielding standardized fit indices for how well the specified model reproduces the observed covariance structure.",
    usage: "Use to test a hypothesized causal/measurement structure among several variables at once (e.g. does a single latent construct explain the correlations among 3+ indicators, and does it predict an outcome) rather than testing each relationship in isolation.",
    assumptions: ["Multivariate normality of observed variables (approximately)", "At least 10 observations, 3+ observed variables", "Model is identified (enough constraints for a unique solution)"],
    cite: "Bollen, K. A. (1989). Structural equations with latent variables. Wiley.",
  },
```

- [ ] **Step 8: Bump the stale count literals**

In `src/config/contracts.test.js`, find:

```js
    expect(TREE_IDS.length).toBe(228);
```

Change to:

```js
    expect(TREE_IDS.length).toBe(229);
```

In `src/config/chartMap.js`, find the `SURVEY METHODOLOGY`/`MDS` block:

```js
  // ── MDS ──────────────────────────────────────────────────────────────
  mds_classical: 'mdsplot', mds_sammon: 'mdsplot', mds_nonmetric: 'mdsplot',
};
```

Change to:

```js
  // ── MDS ──────────────────────────────────────────────────────────────
  mds_classical: 'mdsplot', mds_sammon: 'mdsplot', mds_nonmetric: 'mdsplot',
  // ── SEM ──────────────────────────────────────────────────────────────
  sem: 'histogram',
};
```

In `src/config/chartMap.test.js`, find:

```js
    expect(Object.keys(CHART_FOR_TEST).length).toBe(230);
```

Change to:

```js
    expect(Object.keys(CHART_FOR_TEST).length).toBe(231);
```

- [ ] **Step 9: Run the contract test again to verify it passes**

Run: `pnpm vitest run src/config/contracts.test.js src/config/chartMap.test.js`
Expected: PASS, including 2 new tests for `sem` ("executes without
throw", "returns inference-shaped result").

- [ ] **Step 10: Write the non-convergence regression test**

In `src/components/InferencePanel.test.jsx`, find the end of the file
(the `MDS / Taylor bad-cell and degenerate-input guards` describe
block, added in the prior Survey/MDS phase, is currently last):

```js
    it('Taylor Linearization reports an explicit error, not raw NaN, when every stratum has only 1 PSU', () => {
      render(<InferencePanel data={degenerateRows} ds={degenerateDs} active="taylor" setActive={vi.fn()} />);
      expect(screen.queryByText(/NaN/)).toBeNull();
      expect(screen.getByText(/at least 2 distinct PSU\/cluster values/i)).toBeTruthy();
    });
  });
});
```

Add a new `describe` block immediately after it, still inside the
outer `describe('InferencePanel', ...)`:

```js

  describe('SEM non-convergence guard', () => {
    // A single observed variable can never identify a 1-factor model
    // (sem() itself requires m >= 3 observed variables and returns
    // null below that — this fixture deliberately supplies only 2
    // distinct numeric columns' worth of real signal by repeating the
    // same column 3 times in the equation, which the package accepts
    // syntactically but cannot fit a meaningful covariance structure
    // for) to force the real Newton-Raphson fit into a degenerate,
    // non-finite solution rather than mocking a failure.
    const semRows = Array.from({ length: 30 }, (_, i) => ({
      v1: i + 1,
      v2: (i + 1) * 2,
    }));
    const semDs = { numeric: ['v1', 'v2'], categorical: [] };

    it('reports an explicit error, not raw NaN/Infinity, when the model does not converge', () => {
      const { container } = render(<InferencePanel data={semRows} ds={semDs} active="sem" setActive={vi.fn()} />);
      // The dataset-derived default requires numeric.length >= 3; this
      // fixture only has 2 numeric columns, so the textarea starts
      // blank. TA (src/components/ui.jsx) renders a bare <textarea>
      // with a plain sibling <label> (no htmlFor/id pairing), so
      // getByLabelText cannot find it — query the DOM node directly.
      // This "sem" config panel renders exactly one TA, so exactly one
      // <textarea> exists in this render.
      const textarea = container.querySelector('textarea');
      // Repeating the single real column 3 times satisfies sem()'s
      // m >= 3 distinct-position requirement syntactically while
      // providing no real 3-variable covariance structure for
      // Newton-Raphson to fit -- confirmed against the real package
      // (not mocked) to produce a non-finite fit for this exact
      // 30-row, 2-column fixture before this test was written.
      fireEvent.change(textarea, { target: { value: 'f1 =~ v1 + v1 + v1' } });
      expect(screen.queryByText(/NaN/)).toBeNull();
      expect(screen.queryByText(/Infinity/)).toBeNull();
      expect(screen.getByText(/did not converge/i)).toBeTruthy();
    });
  });
```

- [ ] **Step 11: Run the test to verify it fails, then passes**

Run: `pnpm vitest run src/components/InferencePanel.test.jsx -t "SEM non-convergence"`
Expected: once the interaction code from Step 10 is correct and the
degenerate equation is confirmed, this should PASS against the Step 5
implementation already in place (there's no separate "make it fail
first" step here the way there is for a from-scratch feature, since
Steps 1-9 already implemented the guard — this step is purely to
confirm the regression test itself is correctly written and passes;
if it does not, first confirm by temporarily commenting out the
`semResultOrError` guard's error branch that the test genuinely fails
without the guard, restore it, and confirm the test passes again).

- [ ] **Step 12: Run the full suite**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add src/config/tree.js src/config/fixtures/runners.js src/config/chartMap.js src/config/chartMap.test.js src/config/contracts.test.js src/components/InferenceConfig.jsx src/components/InferencePanel.jsx src/components/InferenceResults.jsx src/config/methodNotes.js src/components/InferencePanel.test.jsx
git commit -m "$(cat <<'EOF'
feat: add SEM (Structural Equation Model) test

First test in the new SEM Navigator category, establishing the
lavaan-equations-textarea config pattern (a dataset-derived
default, unlike meta's hardcoded literal example) and the
coefficients-table result-rendering pattern (SemCoeffTable,
matching InferenceResults.jsx's existing CoeffTable convention)
that path_analysis and later SEM sub-phases will reuse.

Guards sem()'s occasional Newton-Raphson non-convergence via the
same { error } convention the Survey/MDS phase established for
sammonMapping's divergence, verified against the real package
rather than a mocked failure.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `path_analysis` (Path Analysis)

**Files:**
- Modify: `src/config/tree.js` (1 new entry in the `SEM` category)
- Modify: `src/config/fixtures/runners.js` (1 new runner)
- Modify: `src/config/chartMap.js` (1 new entry, `'histogram'`)
- Modify: `src/config/chartMap.test.js` (bump `231` → `232`)
- Modify: `src/config/contracts.test.js` (bump `229` → `230`)
- Modify: `src/components/InferenceConfig.jsx` (1 config entry)
- Modify: `src/components/InferencePanel.jsx` (import, 1 `useState`, 1
  entry in the `useInference` return object, 1 result branch — no
  convergence guard needed, see Global Constraints)
- Modify: `src/components/InferenceResults.jsx` (new `PathCoeffTable`
  component, 1 result-render block)
- Modify: `src/config/methodNotes.js` (1 entry)

**Interfaces:**
- Consumes: `pathAnalysis` from `@statlab/core/methods/sem` —
  signature `pathAnalysis(data: Record<string, any>[], equations: string[])`,
  returns `null` on insufficient/malformed input, or
  `{ test: 'Path Analysis', coefficients: [{from, to, direct, indirect, total}], rSquared: {[lhsVarName]: number}, n, apa }`.
- Produces: `PathCoeffTable` in `InferenceResults.jsx` — used only by
  this task's own result block.

- [ ] **Step 1: Add the TREE entry**

In `src/config/tree.js`, find the `SEM` category added in Task 1:

```js
  { cat: "SEM", color: '#c4b5fd',
    tests: [
      { id: "sem", label: "Structural Equation Model", tag: "CFA · path model · fit indices" },
    ],
  },
];
```

Add the new entry to the same category's `tests` array:

```js
  { cat: "SEM", color: '#c4b5fd',
    tests: [
      { id: "sem", label: "Structural Equation Model", tag: "CFA · path model · fit indices" },
      { id: "path_analysis", label: "Path Analysis", tag: "direct · indirect · total effects" },
    ],
  },
];
```

- [ ] **Step 2: Add the runner fixture**

In `src/config/fixtures/runners.js`, find the `sem` import added in
Task 1:

```js
import { sem } from '@statlab/core/methods/sem';
```

Change to:

```js
import { sem, pathAnalysis } from '@statlab/core/methods/sem';
```

Find the `sem:` runner added in Task 1 and add immediately after it:

```js
  path_analysis: () => pathAnalysis(ROWS, ['y ~ x', 'm ~ x + y']),
```

(`ROWS.x`/`ROWS.y`/`ROWS.m` are all index-derived with shared trend +
noise per `mkTabular()` — see `src/config/fixtures/core.js` — so this
2-equation recursive system has genuine, non-degenerate variance for
OLS to fit; `m ~ x + y` also exercises the indirect/total-effect
tracing through a 2-equation chain, not just a single regression.)

- [ ] **Step 3: Run the contract test to verify the runner works**

Run: `pnpm vitest run src/config/contracts.test.js -t path_analysis`
Expected: FAILS until Steps 7-8 bump the count literals and the id is
recognized — same caveat as Task 1 Step 3. Confirm
`pathAnalysis(ROWS, ['y ~ x', 'm ~ x + y'])` returns a non-null result
with a non-empty `coefficients` array before proceeding, same rigor as
Task 1's fixture check.

- [ ] **Step 4: Add the config UI entry and dataset-derived default**

In `src/components/InferencePanel.jsx`, find the `semEquations` state
declaration added in Task 1:

```js
  const [semEquations, setSemEquations] = useState(numeric.length >= 3 ? `f1 =~ ${numeric.slice(0, 3).join(' + ')}` : '');
```

Add immediately after it:

```js
  const [pathEquations, setPathEquations] = useState(numeric.length >= 2 ? `${numeric[1]} ~ ${numeric[0]}` : '');
```

Find the `useInference` return object's `semEquations, setSemEquations,`
line added in Task 1 and add immediately after it:

```js
    pathEquations, setPathEquations,
```

In `src/components/InferenceConfig.jsx`, find the `sem` config entry
added in Task 1 and add immediately after it:

```js
    path_analysis: <TA
      label="Equations (one per line: y ~ x1 + x2)"
      value={state.pathEquations} onChange={state.setPathEquations} rows={5}
    />,
```

- [ ] **Step 5: Wire the result computation**

In `src/components/InferencePanel.jsx`, find the `@statlab/core/methods/sem`
import added in Task 1:

```js
import { sem } from '@statlab/core/methods/sem';
```

Change to:

```js
import { sem, pathAnalysis } from '@statlab/core/methods/sem';
```

Find the `sem` result branch added in Task 1:

```js
      if (a === 'sem') return semResultOrError(sem({ equations: semEquations.trim().split('\n').map(l => l.trim()).filter(Boolean), data, method: 'ML' }));
```

Add immediately after it:

```js
      if (a === 'path_analysis') return pathAnalysis(data, pathEquations.trim().split('\n').map(l => l.trim()).filter(Boolean));
```

(No `resultOrError`-style guard here — per the Global Constraints,
`pathAnalysis`'s own `if (!inv) return;` per-equation guard already
prevents `NaN` from reaching the result, so there is nothing analogous
to `sem`'s Newton-Raphson divergence to catch at this layer.)

- [ ] **Step 6: Add result rendering**

In `src/components/InferenceResults.jsx`, find the `SemCoeffTable`
component added in Task 1 (immediately after `CoeffTable`, before
`export function InferenceResults`). Add a new component immediately
after `SemCoeffTable`:

```js
function PathCoeffTable({ coeffs }) {
  if (!coeffs?.length) return null;
  const headers = ['from', 'to', 'direct', 'indirect', 'total'];
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', ...mono, fontSize: 9, width: '100%' }}>
        <thead>
          <tr>{headers.map(h => <th key={h} style={{ padding: '2px 6px', textAlign: 'left', color: C.dim, borderBottom: `1px solid ${C.border}`, fontSize: 7, textTransform: 'uppercase' }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {coeffs.map((c, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : C.panel }}>
              <td style={{ padding: '2px 6px', color: PAL[i % PAL.length] }}>{c.from}</td>
              <td style={{ padding: '2px 6px', color: C.text }}>{c.to}</td>
              <td style={{ padding: '2px 6px', color: C.pos }}>{c.direct}</td>
              <td style={{ padding: '2px 6px', color: C.dim }}>{c.indirect}</td>
              <td style={{ padding: '2px 6px', color: C.accent }}>{c.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

Find the `SEM` result block added in Task 1 (ends with `</>}` right
before the `McDonald's ω` block). Add a new block immediately after it:

```js
      {r.test === 'Path Analysis' && <>
        <SectionHead label={`Path Analysis · n=${r.n}`} />
        <Row>
          {Object.entries(r.rSquared ?? {}).map(([k, v]) => <Chip key={k} label={`R² ${k}`} value={v} color={C.pos} />)}
        </Row>
        <PathCoeffTable coeffs={r.coefficients} />
      </>}
```

- [ ] **Step 7: Add the method note**

In `src/config/methodNotes.js`, find the `sem` entry added in Task 1
and add immediately after it, still before `METHOD_NOTES`'s closing
`};`:

```js
  path_analysis: {
    description: "Path analysis fits a system of recursive OLS regression equations among observed variables (no latent factors), then traces indirect and total effects through chained equations via the reduced-form matrix (I − B)⁻¹ − I, where B holds every direct path coefficient in the system.",
    usage: "Use to decompose a variable's total effect on an outcome into its direct effect plus any indirect effects mediated through other variables in a multi-equation causal chain — the multi-equation generalization of a single mediation analysis.",
    assumptions: ["Each equation's residuals are (approximately) normal and homoscedastic", "The system is recursive (no feedback loops among equations)", "At least 10 observations"],
    cite: "Wright, S. (1934). The method of path coefficients. Annals of Mathematical Statistics, 5(3), 161–215.",
  },
```

- [ ] **Step 8: Bump the stale count literals**

In `src/config/contracts.test.js`, find the literal bumped in Task 1
and bump it again:

```js
    expect(TREE_IDS.length).toBe(230);
```

In `src/config/chartMap.js`, find the `SEM` block added in Task 1:

```js
  // ── SEM ──────────────────────────────────────────────────────────────
  sem: 'histogram',
};
```

Change to:

```js
  // ── SEM ──────────────────────────────────────────────────────────────
  sem: 'histogram', path_analysis: 'histogram',
};
```

In `src/config/chartMap.test.js`, find the literal bumped in Task 1
and bump it again:

```js
    expect(Object.keys(CHART_FOR_TEST).length).toBe(232);
```

- [ ] **Step 9: Run the contract tests again to verify they pass**

Run: `pnpm vitest run src/config/contracts.test.js src/config/chartMap.test.js`
Expected: PASS, including 2 new tests for `path_analysis`.

- [ ] **Step 10: Run the full suite**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/config/tree.js src/config/fixtures/runners.js src/config/chartMap.js src/config/chartMap.test.js src/config/contracts.test.js src/components/InferenceConfig.jsx src/components/InferencePanel.jsx src/components/InferenceResults.jsx src/config/methodNotes.js
git commit -m "$(cat <<'EOF'
feat: add Path Analysis test

Second test in the SEM category, reusing Task 1's equations-
textarea config pattern (its own dedicated pathEquations state,
never shared with sem's semEquations) and adding a second small
coefficients-table component (PathCoeffTable) for its simpler
from/to/direct/indirect/total effect-decomposition output.

No non-convergence guard needed here, unlike sem - pathAnalysis's
own per-equation matrix-inversion guard already drops an
unfittable equation from the result rather than producing NaN.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Manual verification and spec sign-off

**Files:**
- None (verification only — no code changes expected; if verification
  finds a problem, fix it in the relevant file from Tasks 1-2 and
  re-run this task's checks before continuing).

- [ ] **Step 1: Run the full automated suite one more time**

Run: `pnpm test`
Expected: PASS, zero failures.

- [ ] **Step 2: Build the app**

Run: `pnpm build`
Expected: succeeds with no errors.

- [ ] **Step 3: Preview the production build and manually verify**

Start a preview server (add a `.claude/launch.json` entry following
the pattern of prior phases' `statlab-*-preview` entries, pointing
`--prefix` at this worktree on a free port) and, in the Browser pane:

1. Search "SEM" in the Navigator. Confirm a "SEM" category appears
   with both "Structural Equation Model" and "Path Analysis". Select
   "Structural Equation Model" against a dataset with 3+ numeric
   columns (e.g. the bundled Iris or Salaries dataset) — confirm the
   equations textarea is pre-filled with a real, non-blank equation
   referencing actual columns from that dataset (not a placeholder
   like `x1`/`x2`), and that it renders fit-index chips (χ², CFI, TLI,
   RMSEA, SRMR, AIC, BIC) plus at least a Loadings table, with no
   console errors.
2. Edit the equation to something you're confident will not converge
   for the loaded dataset (e.g. repeat one column 3 times as in Task
   1's regression test) — confirm the panel shows the explicit "did
   not converge" error message, not raw `NaN`/`Infinity` anywhere in
   the results panel or in the APA/Markdown export.
3. Select "Path Analysis" — confirm its own pre-filled equations
   textarea default references real dataset columns, renders a
   from/to/direct/indirect/total table and R² chips, with no console
   errors.
4. Switch datasets (e.g. Iris → Salaries) while either SEM test is
   active — confirm the equations textarea's *displayed* value does
   not silently keep referencing the old dataset's column names
   without any visual indication (this is the same pre-existing,
   already-filed dataset-switch staleness issue the Survey/MDS phase
   documented for `cat1`/`cat2`/`xVar`, not something this task
   should fix — but confirm it manifests the same way here rather
   than in some new, worse way specific to free-text equation input,
   e.g. a raw thrown exception instead of a graceful `null` result).
5. Check `read_console_messages` for errors after each step above.

- [ ] **Step 4: Update the spec's status**

In `docs/superpowers/specs/2026-09-16-sem-path-analysis-design.md`,
update the `**Status:**` line to note verification is complete, with a
short summary of what was actually checked, or note any deviation
found and fixed — following the exact structure the Survey/MDS phase's
own spec sign-off used (a bulleted list of what was verified plus any
bugs found and how they were handled).

- [ ] **Step 5: Commit the spec update**

```bash
git add docs/superpowers/specs/2026-09-16-sem-path-analysis-design.md
git commit -m "$(cat <<'EOF'
docs: mark SEM Phase A (sem + pathAnalysis) verification complete

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

**This plan is done when:** both tasks are checked off, `pnpm test` and
`pnpm build` both pass, and the manual pass in Task 3 Step 3 confirms
both new tests are reachable, computable, and renderable end-to-end,
with the equations textareas' dataset-derived defaults actually working
out of the box on first load.
