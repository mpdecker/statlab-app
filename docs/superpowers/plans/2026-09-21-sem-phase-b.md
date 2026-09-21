# SEM Phase B (`bifactorModel` + `latentGrowthModel`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `latent_growth` (Latent Growth Model) and `bifactor`
(Bifactor Model) to the existing SEM Navigator category, wired end-to-end
through the app's "one TREE entry = one test" pattern. `latent_growth`
reuses two already-established patterns with zero new components;
`bifactor` needs a new `GroupEditor` config component (no existing
add/remove-group interaction anywhere in the app).

**Architecture:** Both tests call `@statlab/core/methods/sem` functions
directly against the full loaded dataset (`data`). `latent_growth` reuses
the existing `scaleVars`/`CheckList` control (its `selected` array
preserves click order, which the function reads as implicit time order)
plus a new optional custom-timepoints text field. `bifactor` gets a new
`GroupEditor` component (add/remove groups, each a checklist of items)
and a new `BifactorTable` result component matching `PathCoeffTable`'s
existing markup.

**Tech Stack:** React 18, Vite, Vitest, `@testing-library/react`,
`@statlab/core@0.1.1`.

## Global Constraints

- No new npm dependency — both functions are already exported by the
  installed `@statlab/core@0.1.1` at `@statlab/core/methods/sem`.
- `latent_growth` reuses the existing `scaleVars`/`setScaleVars` state
  (no new `useState` for variable selection) — only `semTimes` is new
  state for this test.
- `bifactor` always calls `bifactorModel(data, [], groupFactors)` — the
  `generalFactor` parameter is confirmed dead code (never referenced in
  the function body) and gets no UI control, ever.
- `bifactorModel`'s `maxIter` option is not exposed as a user control,
  matching `sem`'s own precedent (Phase A) of not exposing
  `maxIter`/`tolerance`.
- No new chart component or chart mode — both tests use the existing
  `'histogram'` `CHART_FOR_TEST` default.
- Every stale hardcoded test/mapping count literal touched by adding
  these 2 TREE ids must be bumped in the same task that adds them
  (`contracts.test.js`'s `TREE_IDS.length`, `chartMap.test.js`'s
  `CHART_FOR_TEST` count, including its test-title string) — a
  recurring, previously-documented bug class in this codebase.

---

### Task 1: `latent_growth` (Latent Growth Model)

**Files:**
- Modify: `src/config/tree.js` (1 new entry in the existing `SEM`
  category)
- Modify: `src/config/fixtures/runners.js` (1 new runner)
- Modify: `src/config/chartMap.js` (1 new entry, `'histogram'`)
- Modify: `src/config/chartMap.test.js` (bump `231` → `232`)
- Modify: `src/config/contracts.test.js` (bump `229` → `230`)
- Modify: `src/components/InferenceConfig.jsx` (1 config entry)
- Modify: `src/components/InferencePanel.jsx` (import, 1 `useState`, 1
  entry in the `useMemo` deps array, 1 entry in the `useInference`
  return object, 1 result branch)
- Modify: `src/components/InferenceResults.jsx` (1 result-render block —
  no new component)
- Modify: `src/config/methodNotes.js` (1 entry)

**Interfaces:**
- Consumes: `latentGrowthModel` from `@statlab/core/methods/sem` —
  signature `latentGrowthModel(data: Record<string, any>[], vars: string[], times?: number[] | null)`,
  returns `null` on insufficient input (`data.length < 10` or
  `vars.length < 2`), or
  `{ test: 'Latent Growth Model', coefficients: [{parameter, estimate}] (always exactly 5 entries), timePoints, n, apa }`.
  Also consumes the existing `parseNumList(str): number[]` helper (already
  imported in `InferencePanel.jsx` from `../utils/parse.js`).
- Produces: nothing consumed by Task 2 — `latent_growth` and `bifactor`
  are independent, order doesn't matter between them.

- [ ] **Step 1: Add the TREE entry**

In `src/config/tree.js`, find the `SEM` category (currently holds only
`path_analysis`):

```js
  { cat: "SEM", color: '#c4b5fd',
    tests: [
      { id: "path_analysis", label: "Path Analysis", tag: "direct · indirect · total effects" },
    ],
  },
];
```

Add the new entry to the same category's `tests` array:

```js
  { cat: "SEM", color: '#c4b5fd',
    tests: [
      { id: "path_analysis", label: "Path Analysis", tag: "direct · indirect · total effects" },
      { id: "latent_growth", label: "Latent Growth Model", tag: "intercept · slope · growth factors" },
    ],
  },
];
```

- [ ] **Step 2: Add the runner fixture**

In `src/config/fixtures/runners.js`, find the `@statlab/core/methods/sem`
import:

```js
import { pathAnalysis } from '@statlab/core/methods/sem';
```

Change to:

```js
import { pathAnalysis, latentGrowthModel } from '@statlab/core/methods/sem';
```

Find the `path_analysis:` runner:

```js
  path_analysis: () => pathAnalysis(ROWS, ['y ~ x', 'm ~ x + y']),
```

Add immediately after it:

```js
  latent_growth: () => latentGrowthModel(ROWS, ['rm1', 'rm2', 'rm3']),
```

(`ROWS.rm1`/`rm2`/`rm3` are `mkTabular()`'s existing repeated-measures-
shaped columns — see `src/config/fixtures/core.js` — already consumed
by `mkRmMatrix()` for an unrelated existing test. No custom `times`
array passed here; the function's own index-order default (`[0, 1,
2]`) is exercised.)

- [ ] **Step 3: Run the contract test to verify the runner works**

Run: `pnpm vitest run src/config/contracts.test.js -t latent_growth`
Expected: initially FAILS (id not yet in TREE / count literal not yet
bumped — see Steps 6-7) or, if the runner itself throws/returns `null`,
FAILS with that error. Confirm `latentGrowthModel(ROWS, ['rm1', 'rm2',
'rm3'])` genuinely returns a non-null result with exactly 5
`coefficients` entries and `timePoints: 3` before proceeding — run it
directly in a scratch Node script against the real package if needed
(this function has no iterative fitting, so unlike Phase A's `sem`
there's no convergence risk to check for, but still confirm the
fixture produces a real, non-null result).

- [ ] **Step 4: Add the config UI entry**

In `src/components/InferencePanel.jsx`, find the `pathEquations` state
declaration:

```js
  const [pathEquations, setPathEquations] = useState(numeric.length >= 2 ? `${numeric[1]} ~ ${numeric[0]}` : '');
```

Add immediately after it:

```js
  const [semTimes, setSemTimes] = useState('');
```

Find the `useInference` return object's `pathEquations, setPathEquations,`
line and add immediately after it:

```js
    semTimes, setSemTimes,
```

In `src/components/InferenceConfig.jsx`, find the `path_analysis` config
entry:

```js
    path_analysis: <TA
      label="Equations (one per line: y ~ x1 + x2)"
      value={state.pathEquations} onChange={state.setPathEquations} rows={5}
    />,
```

Add immediately after it:

```js
    latent_growth: <>
      <CheckList label="Repeated measures (select in time order)" items={numeric} selected={scaleVars} onChange={setScaleVars} />
      <Inp label="Custom time points (optional, comma-separated)" value={state.semTimes} onChange={state.setSemTimes} width={200} placeholder="0, 6, 12" />
    </>,
```

(`scaleVars`/`setScaleVars` are already destructured at the top of this
file's giant `state` destructure block — the same generic state `pca`
already uses via `<CheckList label="Variables" items={numeric}
selected={scaleVars} onChange={setScaleVars} />`. `semTimes` is new,
newer-pattern state accessed via `state.semTimes` — not added to that
destructure block — matching exactly how `metaInput`/`pathEquations`
are accessed in this same file.)

- [ ] **Step 5: Wire the result computation**

In `src/components/InferencePanel.jsx`, find the `@statlab/core/methods/sem`
import:

```js
import { pathAnalysis } from '@statlab/core/methods/sem';
```

Change to:

```js
import { pathAnalysis, latentGrowthModel } from '@statlab/core/methods/sem';
```

Find the `path_analysis` result branch:

```js
      if (a === 'path_analysis') return pathAnalysis(data, pathEquations.trim().split('\n').map(l => l.trim()).filter(Boolean));
```

Add immediately after it:

```js
      if (a === 'latent_growth') { const vars = scaleVars.filter(c => numeric.includes(c)); const times = semTimes.trim() ? parseNumList(semTimes) : null; return latentGrowthModel(data, vars, times && times.length === vars.length ? times : null); }
```

(The `times && times.length === vars.length` guard falls back to the
function's own index-order default whenever the user's custom
time-points list doesn't match the number of selected variables —
`latentGrowthModel` itself does not validate this mismatch, so this
webapp-side guard prevents silently misaligning a shorter/longer custom
list against the wrong variables.)

Find the `useMemo`'s dependency array (the one that already lists
`pathEquations` — this is the exact class of bug the Survey/MDS and
Phase A reviews both caught: a new piece of config state that isn't in
this array means editing that control never triggers recomputation):

```js
    rmMatrix, rmCols, polDeg, metaInput, pathEquations, didPCStr, didPOStr, didPTStr, didPTtStr,
```

Change to:

```js
    rmMatrix, rmCols, polDeg, metaInput, pathEquations, semTimes, didPCStr, didPOStr, didPTStr, didPTtStr,
```

- [ ] **Step 6: Add result rendering**

In `src/components/InferenceResults.jsx`, find the `Path Analysis`
result block:

```js
      {r.test === 'Path Analysis' && <>
        <SectionHead label={`Path Analysis · n=${r.n}`} />
        <Row>
          {Object.entries(r.rSquared ?? {}).map(([k, v]) => <Chip key={k} label={`R² ${k}`} value={v} color={C.pos} />)}
        </Row>
        <PathCoeffTable coeffs={r.coefficients} />
      </>}
```

Add a new block immediately after it:

```js
      {r.test === 'Latent Growth Model' && <>
        <SectionHead label={`Latent Growth Model · ${r.timePoints} timepoints · n=${r.n}`} />
        <Row>
          {r.coefficients.map((c, i) => <Chip key={i} label={c.parameter} value={c.estimate} color={C.accent} />)}
        </Row>
      </>}
```

(No new table component — `r.coefficients` is always exactly 5 named
entries, matching the `bayes_linreg` block's existing
`r.coefficients.map((c, i) => <Chip .../>)` convention rather than
`Path Analysis`'s dynamic-length table.)

- [ ] **Step 7: Add the method note**

In `src/config/methodNotes.js`, find the `path_analysis` entry (last
entry before `METHOD_NOTES`'s closing `};`):

```js
  path_analysis: {
    description: "Path analysis fits a system of recursive OLS regression equations among observed variables (no latent factors), then traces indirect and total effects through chained equations via the reduced-form matrix (I − B)⁻¹ − I, where B holds every direct path coefficient in the system.",
    usage: "Use to decompose a variable's total effect on an outcome into its direct effect plus any indirect effects mediated through other variables in a multi-equation causal chain — the multi-equation generalization of a single mediation analysis.",
    assumptions: ["Each equation's residuals are (approximately) normal and homoscedastic", "The system is recursive (no feedback loops among equations)", "At least 10 observations"],
    cite: "Wright, S. (1934). The method of path coefficients. Annals of Mathematical Statistics, 5(3), 161–215.",
  },
};
```

Add immediately after it, still before the closing `};`:

```js
  latent_growth: {
    description: "A latent growth model summarizes each person's trajectory across repeated measures with two latent factors — an intercept (starting level) and a slope (rate of change) — estimated directly from the observed means and covariance structure via GLS, without iterative fitting.",
    usage: "Use to characterize both the average trajectory (mean intercept/slope) and individual differences in that trajectory (intercept/slope variance, and their covariance — do people who start higher also grow faster or slower?) across 2+ repeated measures.",
    assumptions: ["Measures are ordered consistently in time across all cases", "At least 10 observations, 2+ repeated measures", "Linear growth (a straight-line trajectory) between timepoints"],
    cite: "Meredith, W., & Tisak, J. (1990). Latent curve analysis. Psychometrika, 55(1), 107–122.",
  },
```

- [ ] **Step 8: Bump the stale count literals**

In `src/config/contracts.test.js`, find:

```js
    expect(TREE_IDS.length).toBe(229);
```

Change to:

```js
    expect(TREE_IDS.length).toBe(230);
```

In `src/config/chartMap.js`, find the `SEM` block:

```js
  // ── SEM ──────────────────────────────────────────────────────────────
  path_analysis: 'histogram',
};
```

Change to:

```js
  // ── SEM ──────────────────────────────────────────────────────────────
  path_analysis: 'histogram', latent_growth: 'histogram',
};
```

In `src/config/chartMap.test.js`, find:

```js
    expect(Object.keys(CHART_FOR_TEST).length).toBe(231);
```

Change to (bump both the literal and the test's own title string, per
this codebase's documented stale-title-drift pattern — see this same
mistake caught in Phase A's own review):

```js
  test('has exactly 232 mappings', () => {
    expect(Object.keys(CHART_FOR_TEST).length).toBe(232);
  });
```

- [ ] **Step 9: Run the contract tests again to verify they pass**

Run: `pnpm vitest run src/config/contracts.test.js src/config/chartMap.test.js`
Expected: PASS, including 2 new tests for `latent_growth`.

- [ ] **Step 10: Run the full suite**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/config/tree.js src/config/fixtures/runners.js src/config/chartMap.js src/config/chartMap.test.js src/config/contracts.test.js src/components/InferenceConfig.jsx src/components/InferencePanel.jsx src/components/InferenceResults.jsx src/config/methodNotes.js
git commit -m "$(cat <<'EOF'
feat: add Latent Growth Model test

Second and third tests in the SEM category (path_analysis was
first, Phase A) — reuses the existing scaleVars/CheckList control
verbatim (its click-order selection conveniently matches the
function's own implicit time-order default) plus a new optional
custom-timepoints field. No new UI component: the fixed 5-entry
coefficients array reuses the existing Chip-row-from-array
convention already used by e.g. bayes_linreg, not a table.

No convergence guard needed - unlike Phase A's sem, this function
is closed-form GLS with no iterative fitting to fail to converge.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `bifactor` (Bifactor Model)

**Files:**
- Create: nothing (new component added to existing `ui.jsx`)
- Modify: `src/components/ui.jsx` (new `GroupEditor` component)
- Test: `src/components/ui.test.jsx` (new tests for `GroupEditor` — if
  this file doesn't exist yet, check for an existing `ui.jsx` test file
  under a different name in `src/components/` before creating one; use
  its existing conventions if found)
- Modify: `src/config/tree.js` (1 new entry in the `SEM` category)
- Modify: `src/config/fixtures/runners.js` (1 new runner)
- Modify: `src/config/chartMap.js` (1 new entry, `'histogram'`)
- Modify: `src/config/chartMap.test.js` (bump `232` → `233`)
- Modify: `src/config/contracts.test.js` (bump `230` → `231`)
- Modify: `src/components/InferenceConfig.jsx` (1 config entry, imports
  `GroupEditor`)
- Modify: `src/components/InferencePanel.jsx` (import, 1 `useState`, 1
  entry in the `useMemo` deps array, 1 entry in the `useInference`
  return object, 1 result branch)
- Modify: `src/components/InferenceResults.jsx` (new `BifactorTable`
  component, 1 result-render block)
- Modify: `src/config/methodNotes.js` (1 entry)

**Interfaces:**
- Consumes: `bifactorModel` from `@statlab/core/methods/sem` —
  signature `bifactorModel(data: Record<string, any>[], generalFactor: string[], groupFactors: Array<{items: string[]}>, opts?: {maxIter?: number})`,
  returns `null` on insufficient input (`data.length < 20` or
  `!groupFactors.length`), or
  `{ test: 'Bifactor Model', loadings: [{item, general, group, communality}], omegaHierarchical, omegaTotal, correlation: {factorCorr}, n, apa }`.
  Always call with `generalFactor` as `[]` — confirmed dead parameter,
  see Global Constraints.
- Produces: `GroupEditor` in `src/components/ui.jsx` — exported for
  `InferenceConfig.jsx` to import, used only by `bifactor`'s own config
  entry in this plan. Props: `{ label, items, groups, onChange }` where
  `groups: Array<{ items: string[] }>` and `onChange(newGroups: Array<{items: string[]}>): void`.
  `BifactorTable` in `InferenceResults.jsx` — used only by `bifactor`'s
  own result block.

- [ ] **Step 1: Write the failing test for `GroupEditor`**

First, check whether a test file already exists for `ui.jsx`:

Run: `ls src/components/ui.test.jsx 2>&1 || echo "not found"`

If it exists, read it fully first and add the tests below matching its
existing import/render conventions. If it doesn't exist, create
`src/components/ui.test.jsx`:

```jsx
// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GroupEditor } from './ui.jsx';

describe('GroupEditor', () => {
  test('renders each group with its own checklist of items', () => {
    const groups = [{ items: ['a'] }, { items: ['b', 'c'] }];
    render(<GroupEditor label="Groups" items={['a', 'b', 'c']} groups={groups} onChange={vi.fn()} />);
    expect(screen.getByText('Group 1')).toBeTruthy();
    expect(screen.getByText('Group 2')).toBeTruthy();
    // 2 groups x 3 items each = 6 checkboxes total.
    expect(screen.getAllByRole('checkbox').length).toBe(6);
  });

  test('adding a group appends an empty group via onChange', () => {
    const onChange = vi.fn();
    render(<GroupEditor label="Groups" items={['a', 'b']} groups={[{ items: ['a'] }]} onChange={onChange} />);
    fireEvent.click(screen.getByText(/\+ Add group/i));
    expect(onChange).toHaveBeenCalledWith([{ items: ['a'] }, { items: [] }]);
  });

  test('removing a group drops it via onChange, keeping others intact', () => {
    const onChange = vi.fn();
    const groups = [{ items: ['a'] }, { items: ['b'] }];
    render(<GroupEditor label="Groups" items={['a', 'b']} groups={groups} onChange={onChange} />);
    fireEvent.click(screen.getAllByText('×')[0]);
    expect(onChange).toHaveBeenCalledWith([{ items: ['b'] }]);
  });

  test('checking an item in one group only updates that group, preserving item order as checked', () => {
    const onChange = vi.fn();
    const groups = [{ items: [] }, { items: ['b'] }];
    render(<GroupEditor label="Groups" items={['a', 'b']} groups={groups} onChange={onChange} />);
    // Group 1's checklist renders 'a' then 'b' (matching `items` order);
    // the first unchecked checkbox belongs to Group 1's 'a'.
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(onChange).toHaveBeenCalledWith([{ items: ['a'] }, { items: ['b'] }]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/components/ui.test.jsx -t GroupEditor`
Expected: FAIL — `GroupEditor` is not exported from `ui.jsx` yet.

- [ ] **Step 3: Write the component**

In `src/components/ui.jsx`, find the `CheckList` component (this new
component follows it, and reuses its checkbox-row visual style inline
rather than nesting a `<CheckList>` per group, since `CheckList`'s own
`selected` prop expects one single flat array, not one array per
group):

```js
export function CheckList({ label, items, selected, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {label && <div style={{ fontSize: 8, color: C.dim, ...mono, textTransform: "uppercase", letterSpacing: ".1em" }}>{label}</div>}
      {items.map(c => (
        <label key={c} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, ...mono, color: selected.includes(c) ? C.accent : C.text, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={selected.includes(c)}
            onChange={e => onChange(s => e.target.checked ? [...s, c] : s.filter(x => x !== c))}
            style={{ accentColor: C.accent }}
          />
          {c}
        </label>
      ))}
    </div>
  );
}
```

Add a new component immediately after it:

```js
// ── Group editor (add/remove named groups, each a checklist) ──────────────────
export function GroupEditor({ label, items, groups, onChange }) {
  function addGroup() { onChange([...groups, { items: [] }]); }
  function removeGroup(gi) { onChange(groups.filter((_, i) => i !== gi)); }
  function toggleItem(gi, item, checked) {
    onChange(groups.map((g, i) => i === gi
      ? { items: checked ? [...g.items, item] : g.items.filter(x => x !== item) }
      : g));
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <div style={{ fontSize: 8, color: C.dim, ...mono, textTransform: "uppercase", letterSpacing: ".1em" }}>{label}</div>}
      {groups.map((g, gi) => (
        <div key={gi} style={{ border: `1px solid ${C.border}`, borderRadius: 3, padding: 5, display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 9, ...mono, color: C.dim }}>Group {gi + 1}</span>
            <button
              type="button"
              onClick={() => removeGroup(gi)}
              style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.dim, padding: "1px 6px", borderRadius: 3, cursor: "pointer", fontSize: 10 }}
            >×</button>
          </div>
          {items.map(it => (
            <label key={it} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, ...mono, color: g.items.includes(it) ? C.accent : C.text, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={g.items.includes(it)}
                onChange={e => toggleItem(gi, it, e.target.checked)}
                style={{ accentColor: C.accent }}
              />
              {it}
            </label>
          ))}
        </div>
      ))}
      <button
        type="button"
        onClick={addGroup}
        style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.dim, padding: "3px 8px", borderRadius: 3, cursor: "pointer", fontSize: 9, ...mono, alignSelf: "flex-start" }}
      >+ Add group</button>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/components/ui.test.jsx -t GroupEditor`
Expected: PASS.

- [ ] **Step 5: Add the TREE entry**

In `src/config/tree.js`, find the `SEM` category (after Task 1, it has
2 entries: `path_analysis`, `latent_growth`):

```js
  { cat: "SEM", color: '#c4b5fd',
    tests: [
      { id: "path_analysis", label: "Path Analysis", tag: "direct · indirect · total effects" },
      { id: "latent_growth", label: "Latent Growth Model", tag: "intercept · slope · growth factors" },
    ],
  },
];
```

Add the new entry:

```js
  { cat: "SEM", color: '#c4b5fd',
    tests: [
      { id: "path_analysis", label: "Path Analysis", tag: "direct · indirect · total effects" },
      { id: "latent_growth", label: "Latent Growth Model", tag: "intercept · slope · growth factors" },
      { id: "bifactor", label: "Bifactor Model", tag: "general + group factors · ω hierarchical" },
    ],
  },
];
```

- [ ] **Step 6: Add the runner fixture**

In `src/config/fixtures/runners.js`, find the `@statlab/core/methods/sem`
import (after Task 1, it imports `pathAnalysis, latentGrowthModel`):

```js
import { pathAnalysis, latentGrowthModel } from '@statlab/core/methods/sem';
```

Change to:

```js
import { pathAnalysis, latentGrowthModel, bifactorModel } from '@statlab/core/methods/sem';
```

Find the `latent_growth:` runner and add immediately after it:

```js
  bifactor: () => bifactorModel(ROWS, [], [{ items: ['item1', 'item2'] }, { items: ['item3', 'item4'] }]),
```

- [ ] **Step 7: Run the contract test to verify the runner works**

Run: `pnpm vitest run src/config/contracts.test.js -t bifactor`
Expected: FAILS until Steps 12-13 bump the count literals and the id is
recognized — same caveat as Task 1 Step 3. Confirm
`bifactorModel(ROWS, [], [{ items: ['item1', 'item2'] }, { items:
['item3', 'item4'] }])` returns a non-null result with `loadings.length
=== 4` and `omegaHierarchical`/`omegaTotal` both finite numbers in a
sane 0-1-ish range before proceeding (this function iterates
`jacobiEigen` + Procrustes rotation, not Newton-Raphson, but confirm
empirically anyway rather than assuming — run it in a scratch Node
script against the real package if needed).

- [ ] **Step 8: Add the config UI entry**

In `src/components/InferenceConfig.jsx`, find the import line:

```js
import { Sel, Inp, TA, CheckList } from './ui.jsx';
```

Change to:

```js
import { Sel, Inp, TA, CheckList, GroupEditor } from './ui.jsx';
```

Find the `latent_growth` config entry (added in Task 1) and add
immediately after it:

```js
    bifactor: <GroupEditor label="Item groups (2+ recommended)" items={numeric} groups={state.bifactorGroups} onChange={state.setBifactorGroups} />,
```

- [ ] **Step 9: Wire the state and result computation**

In `src/components/InferencePanel.jsx`, find the `semTimes` state
declaration (added in Task 1):

```js
  const [semTimes, setSemTimes] = useState('');
```

Add immediately after it:

```js
  const [bifactorGroups, setBifactorGroups] = useState(() => {
    const cols = numeric.slice(0, 4);
    const half = Math.ceil(cols.length / 2);
    return cols.length >= 2 ? [{ items: cols.slice(0, half) }, { items: cols.slice(half) }] : [];
  });
```

Find the `useInference` return object's `semTimes, setSemTimes,` line
and add immediately after it:

```js
    bifactorGroups, setBifactorGroups,
```

Find the `@statlab/core/methods/sem` import (after Task 1, it imports
`pathAnalysis, latentGrowthModel`):

```js
import { pathAnalysis, latentGrowthModel } from '@statlab/core/methods/sem';
```

Change to:

```js
import { pathAnalysis, latentGrowthModel, bifactorModel } from '@statlab/core/methods/sem';
```

Find the `latent_growth` result branch (added in Task 1) and add
immediately after it:

```js
      if (a === 'bifactor') return bifactorModel(data, [], bifactorGroups.filter(g => g.items.length));
```

Find the `useMemo`'s dependency array (the one already listing
`semTimes` after Task 1):

```js
    rmMatrix, rmCols, polDeg, metaInput, pathEquations, semTimes, didPCStr, didPOStr, didPTStr, didPTtStr,
```

Change to:

```js
    rmMatrix, rmCols, polDeg, metaInput, pathEquations, semTimes, bifactorGroups, didPCStr, didPOStr, didPTStr, didPTtStr,
```

- [ ] **Step 10: Add result rendering**

In `src/components/InferenceResults.jsx`, find the `PathCoeffTable`
component (module scope, before `export function InferenceResults`):

```js
function PathCoeffTable({ coeffs }) {
  if (!coeffs?.length) return null;
  const headers = ['from', 'to', 'direct', 'indirect', 'total'];
  ...
}
```

Add a new component immediately after it:

```js
function BifactorTable({ loadings }) {
  if (!loadings?.length) return null;
  const headers = ['item', 'general', 'group', 'communality'];
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', ...mono, fontSize: 9, width: '100%' }}>
        <thead>
          <tr>{headers.map(h => <th key={h} style={{ padding: '2px 6px', textAlign: 'left', color: C.dim, borderBottom: `1px solid ${C.border}`, fontSize: 7, textTransform: 'uppercase' }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {loadings.map((l, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : C.panel }}>
              <td style={{ padding: '2px 6px', color: PAL[i % PAL.length] }}>{l.item}</td>
              <td style={{ padding: '2px 6px', color: C.text }}>{l.general}</td>
              <td style={{ padding: '2px 6px', color: C.text }}>{l.group}</td>
              <td style={{ padding: '2px 6px', color: C.dim }}>{l.communality}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

Find the `Latent Growth Model` result block (added in Task 1). Add a
new block immediately after it:

```js
      {r.test === 'Bifactor Model' && <>
        <SectionHead label={`Bifactor Model · n=${r.n}`} />
        <Row>
          <Chip label="ω hierarchical" value={r.omegaHierarchical} color={r.omegaHierarchical >= .5 ? C.ok : C.warn} />
          <Chip label="ω total" value={r.omegaTotal} color={C.dim} />
        </Row>
        <BifactorTable loadings={r.loadings} />
      </>}
```

- [ ] **Step 11: Add the method note**

In `src/config/methodNotes.js`, find the `latent_growth` entry (added
in Task 1, last before `METHOD_NOTES`'s closing `};`) and add
immediately after it, still before the closing `};`:

```js
  bifactor: {
    description: "A bifactor model decomposes each item's variance into a general factor (loading on every item) and a specific group factor (loading only on its own item subset), extracted via eigendecomposition with a target (Procrustes) rotation toward that general-plus-groups pattern.",
    usage: "Use when you suspect items measure both one broad overall construct AND their own narrower sub-domain simultaneously (e.g. a wellbeing scale with a general wellbeing factor plus separate physical/emotional/social sub-factors) — omega hierarchical tells you how much of the total reliable variance is attributable to the general factor alone.",
    assumptions: ["Each item belongs to exactly one specified group", "At least 20 observations", "2+ groups with 2+ items each recommended for a meaningful general/group split"],
    cite: "Reise, S. P. (2012). The rediscovery of bifactor measurement models. Multivariate Behavioral Research, 47(5), 667–696.",
  },
```

- [ ] **Step 12: Bump the stale count literals**

In `src/config/contracts.test.js`, find the literal bumped in Task 1
and bump it again:

```js
    expect(TREE_IDS.length).toBe(231);
```

In `src/config/chartMap.js`, find the `SEM` block:

```js
  // ── SEM ──────────────────────────────────────────────────────────────
  path_analysis: 'histogram', latent_growth: 'histogram',
};
```

Change to:

```js
  // ── SEM ──────────────────────────────────────────────────────────────
  path_analysis: 'histogram', latent_growth: 'histogram', bifactor: 'histogram',
};
```

In `src/config/chartMap.test.js`, find the literal and title bumped in
Task 1 and bump both again:

```js
  test('has exactly 233 mappings', () => {
    expect(Object.keys(CHART_FOR_TEST).length).toBe(233);
  });
```

- [ ] **Step 13: Run the contract tests again to verify they pass**

Run: `pnpm vitest run src/config/contracts.test.js src/config/chartMap.test.js`
Expected: PASS, including 2 new tests for `bifactor`.

- [ ] **Step 14: Run the full suite**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 15: Commit**

```bash
git add src/components/ui.jsx src/components/ui.test.jsx src/config/tree.js src/config/fixtures/runners.js src/config/chartMap.js src/config/chartMap.test.js src/config/contracts.test.js src/components/InferenceConfig.jsx src/components/InferencePanel.jsx src/components/InferenceResults.jsx src/config/methodNotes.js
git commit -m "$(cat <<'EOF'
feat: add Bifactor Model test

Third test in the SEM category. Introduces GroupEditor, a new
add/remove-group config component (no existing precedent for this
interaction anywhere in the app) reusing CheckList's checkbox-row
styling inline per group, since CheckList's own `selected` prop
expects one flat array rather than one array per group. Defaults
to a working 2-group split of the first 4 numeric columns rather
than starting empty, matching this app's "never blank on first
load" convention for generic dataset-derived defaults.

generalFactor is always passed as [] - confirmed dead parameter,
never referenced in bifactorModel's own implementation. maxIter is
not exposed, matching sem's own precedent from Phase A.

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

Start a preview server (add a `.claude/launch.json` entry following the
pattern of prior phases' `statlab-*-preview` entries, pointing
`--prefix` at this worktree on a free port) and, in the Browser pane:

1. Search "SEM" in the Navigator. Confirm the category now shows all 3
   tests: Path Analysis, Latent Growth Model, Bifactor Model.
2. Select "Latent Growth Model" against a dataset with 2+ numeric
   columns. Confirm the repeated-measures checklist starts with
   whatever was last selected (or empty) — select 2-3 columns in a
   specific order, confirm the result's chip row renders 5 named
   parameters (Intercept mean, Slope mean, Intercept variance, Slope
   variance, Intercept-slope covariance) with no console errors. Try
   the optional custom time-points field with a mismatched-length list
   (e.g. 2 values for 3 selected variables) — confirm it falls back to
   the default index order rather than crashing or misaligning.
3. Select "Bifactor Model". Confirm it's pre-filled with a working
   2-group default (not empty) that computes immediately — check
   `ωh`/`ωt` land in a plausible 0-1 range (not exactly 0, not exactly
   1, not `NaN`) and the loadings table shows one row per item across
   both groups. Use "+ Add group" to add a 3rd group, move an item
   between groups via the checkboxes, remove a group — confirm each
   interaction updates the result correctly and no console errors
   appear at any step.
4. Check `read_console_messages` for errors after each step above.

- [ ] **Step 4: Update the spec's status**

In `docs/superpowers/specs/2026-09-21-sem-phase-b-design.md`, update the
`**Status:**` line to note verification is complete, with a short
summary of what was actually checked, or note any deviation found and
fixed — following the exact structure Phase A's own spec sign-off used.

- [ ] **Step 5: Commit the spec update**

```bash
git add docs/superpowers/specs/2026-09-21-sem-phase-b-design.md
git commit -m "$(cat <<'EOF'
docs: mark SEM Phase B verification complete

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

**This plan is done when:** both tasks are checked off, `pnpm test` and
`pnpm build` both pass, and the manual pass in Task 3 Step 3 confirms
all 3 SEM-category tests (including Phase A's `path_analysis`) are
reachable, computable, and renderable end-to-end, with `bifactor`'s
default group split working out of the box on first load.
