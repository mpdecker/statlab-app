# Sample Datasets for Psychometrics + Per-Test Dataset Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new synthetic sample datasets that fill StatLab's Psychometrics
coverage gap, and a per-test "recommended datasets" mapping surfaced as
clickable chips in the Calculation & Interface band.

**Architecture:** Two new dataset generator functions in the existing
`src/data/datasets.js` (same seeded-PRNG style as `makeIris`/`makeDiamonds`),
a new plain-data config module mapping test id → recommended dataset keys,
and one new small presentational component consuming that module, wired into
`App.jsx`'s existing `CalcBand`.

**Tech Stack:** React 18, Vite, Vitest + @testing-library/react (happy-dom).

## Global Constraints

- No new npm dependencies.
- No changes to `InferenceConfig`'s prop signature or internals.
- No changes to `TREE` (`src/config/tree.js`) — `src/config/contracts.test.js`
  hardcodes `expect(TREE_IDS.length).toBe(212)`; this project adds no new
  tests, only new sample data and a recommendation UI.
- New datasets are generated locally via the existing `lcg`/`randn` PRNG
  helpers already in `src/data/datasets.js` — no external fetch.
- Two tests (`mcnemar`, `kappa`) deliberately have no recommendation entry —
  no current dataset has true paired-binary before/after or two-rater
  categorical-agreement structure. Do not force a fit for these.
- Every new component/config file gets its own `*.test.jsx`/`*.test.js` in
  the same directory, following the existing `// @vitest-environment happy-dom`
  + `@testing-library/react` pattern for components (see
  `src/components/DatasetPicker.test.jsx`) and plain `describe`/`test` for
  config modules (see `src/config/contracts.test.js`).
- Run `pnpm test` (full suite) after every task; it must show 0 failures
  before moving to the next task. Current baseline: 598 tests across 22
  files, 0 failures.

---

### Task 1: Add `lifesat` and `vocabtest` sample datasets

**Files:**
- Modify: `src/data/datasets.js`
- Modify: `src/data/datasets.exhaustive.test.js`

**Interfaces:**
- Produces: `makeLifeSat()` → array of 200 row objects, each with keys
  `auto1, auto2, auto3, auto4, comp1, comp2, comp3, comp4, rel1, rel2, rel3, rel4`
  (integers 1–5) and `cohort` (one of `'A' | 'B' | 'C'`).
- Produces: `makeVocabTest()` → array of 300 row objects, each with keys
  `q1..q15` (integers 0 or 1) and `grade` (one of
  `'9th' | '10th' | '11th' | '12th'`).
- Produces: `BUILTIN.lifesat` and `BUILTIN.vocabtest` entries (same shape as
  existing `BUILTIN.iris`: `{ label, desc, numeric, categorical, make }`).
- Produces: `DATASET_DEFAULTS.lifesat` and `DATASET_DEFAULTS.vocabtest`
  entries (same shape as existing entries: `{ x, y, color }`).
- Consumes: `lcg`, `randn` (already defined in `src/data/datasets.js`),
  `clamp` (already imported from `'statlab/math/core'` at the top of the
  file).

- [ ] **Step 1: Write the failing tests**

Append to `src/data/datasets.exhaustive.test.js` (add `makeLifeSat,
makeVocabTest, corr` to the existing import line from `'./datasets.js'`,
and add a new import for `corr` from `'statlab/math/core'`):

```js
import { describe, test, expect } from 'vitest';
import { makeIris, makeDiamonds, makeGapminder, makeLifeSat, makeVocabTest, detectCols, DATASET_DEFAULTS, BUILTIN } from './datasets.js';
import { corr } from 'statlab/math/core';
```

(this replaces the file's existing first two import lines — the rest of the
file, and all existing tests, stay exactly as they are)

Then add these tests at the end of the `describe('datasets exhaustive', ...)` block:

```js
  test('makeLifeSat has expected schema and value ranges', () => {
    const rows = makeLifeSat();
    expect(rows.length).toBe(200);
    const itemCols = ['auto1', 'auto2', 'auto3', 'auto4', 'comp1', 'comp2', 'comp3', 'comp4', 'rel1', 'rel2', 'rel3', 'rel4'];
    itemCols.forEach(col => {
      rows.forEach(r => {
        expect(r[col]).toBeGreaterThanOrEqual(1);
        expect(r[col]).toBeLessThanOrEqual(5);
        expect(Number.isInteger(r[col])).toBe(true);
      });
    });
    expect(new Set(rows.map(r => r.cohort))).toEqual(new Set(['A', 'B', 'C']));
  });

  test('makeVocabTest has expected schema and binary values', () => {
    const rows = makeVocabTest();
    expect(rows.length).toBe(300);
    for (let i = 1; i <= 15; i++) {
      rows.forEach(r => {
        expect([0, 1]).toContain(r[`q${i}`]);
      });
    }
    expect(new Set(rows.map(r => r.grade))).toEqual(new Set(['9th', '10th', '11th', '12th']));
  });

  test('makeVocabTest items have real IRT structure (pass rate tracks difficulty)', () => {
    const rows = makeVocabTest();
    const nItems = 15;
    const difficulty = i => -2 + (4 * i) / (nItems - 1);
    const passRates = [];
    const difficulties = [];
    for (let i = 0; i < nItems; i++) {
      const col = `q${i + 1}`;
      const passRate = rows.reduce((s, r) => s + r[col], 0) / rows.length;
      passRates.push(passRate);
      difficulties.push(difficulty(i));
    }
    expect(corr(difficulties, passRates)).toBeLessThan(-0.5);
  });

  test('BUILTIN.lifesat and BUILTIN.vocabtest are wired up', () => {
    expect(BUILTIN.lifesat.make).toBe(makeLifeSat);
    expect(BUILTIN.vocabtest.make).toBe(makeVocabTest);
    expect(DATASET_DEFAULTS.lifesat).toBeDefined();
    expect(DATASET_DEFAULTS.vocabtest).toBeDefined();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/data/datasets.exhaustive.test.js`
Expected: FAIL — `makeLifeSat`/`makeVocabTest` are not exported yet.

- [ ] **Step 3: Implement the two generators**

In `src/data/datasets.js`, add these two functions immediately after the
existing `makeGapminder` function (before the `/** Per-dataset default axes... */` comment):

```js
export function makeLifeSat() {
  const rng = lcg(4242);
  const subscales = [['autonomy', 'auto'], ['competence', 'comp'], ['relatedness', 'rel']];
  const cohorts = ["A", "B", "C"];
  return Array.from({ length: 200 }, (_, i) => {
    const row = { cohort: cohorts[i % 3] };
    subscales.forEach(([, prefix]) => {
      const trait = clamp(randn(rng, 3, 0.8), 1, 5);
      for (let j = 1; j <= 4; j++) {
        const raw = j === 4 ? 6 - trait : trait;
        row[`${prefix}${j}`] = Math.round(clamp(raw + randn(rng, 0, 0.4), 1, 5));
      }
    });
    return row;
  });
}

export function makeVocabTest() {
  const rng = lcg(9001);
  const grades = ["9th", "10th", "11th", "12th"];
  const nItems = 15;
  const difficulty = (i) => -2 + (4 * i) / (nItems - 1);
  const discrimination = (i) => 0.7 + (i % 5) * 0.25;
  return Array.from({ length: 300 }, (_, p) => {
    const theta = randn(rng, 0, 1);
    const row = { grade: grades[p % 4] };
    for (let i = 0; i < nItems; i++) {
      const b = difficulty(i);
      const a = discrimination(i);
      const prob = 1 / (1 + Math.exp(-a * (theta - b)));
      row[`q${i + 1}`] = rng() < prob ? 1 : 0;
    }
    return row;
  });
}
```

- [ ] **Step 4: Add the `DATASET_DEFAULTS` entries**

In `src/data/datasets.js`, in the `DATASET_DEFAULTS` object, add two new
entries (after the existing `affairs` entry, before the closing `};`):

```js
  affairs: { x: 'age', y: 'affairs', color: 'gender' },
  lifesat: { x: 'auto1', y: 'comp1', color: 'cohort' },
  vocabtest: { x: 'q1', y: 'q2', color: 'grade' },
```

- [ ] **Step 5: Add the `BUILTIN` entries**

In `src/data/datasets.js`, in the `BUILTIN` object, add two new entries
(after the existing `affairs` entry, before the closing `};`):

```js
  affairs: {
    label: 'Affairs',
    desc: 'extramarital affairs survey',
    url: 'https://vincentarelbundock.github.io/Rdatasets/csv/AER/Affairs.csv',
    make: null,
    numeric: ['affairs', 'age', 'yearsmarried', 'religiousness', 'education', 'occupation', 'rating'],
    categorical: ['gender', 'children'],
  },
  lifesat: {
    label: "Life Satisfaction Survey", desc: "200 respondents · 12-item scale · 3 subscales",
    numeric: ["auto1", "auto2", "auto3", "auto4", "comp1", "comp2", "comp3", "comp4", "rel1", "rel2", "rel3", "rel4"],
    categorical: ["cohort"],
    make: makeLifeSat,
  },
  vocabtest: {
    label: "Vocabulary Test", desc: "300 respondents · 15 binary items · IRT-structured",
    numeric: ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10", "q11", "q12", "q13", "q14", "q15"],
    categorical: ["grade"],
    make: makeVocabTest,
  },
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm exec vitest run src/data/datasets.exhaustive.test.js`
Expected: PASS, all tests green (including the 5 pre-existing ones, unchanged).

- [ ] **Step 7: Run the full suite**

Run: `pnpm test`
Expected: PASS, 0 failures.

- [ ] **Step 8: Commit**

```bash
git add src/data/datasets.js src/data/datasets.exhaustive.test.js
git commit -m "feat: add Life Satisfaction Survey and Vocabulary Test sample datasets"
```

---

### Task 2: Recommended-datasets mapping

**Files:**
- Create: `src/config/datasetRecommendations.js`
- Test: `src/config/datasetRecommendations.test.js`

**Interfaces:**
- Produces: `RECOMMENDED_DATASETS` — a plain object mapping test id (string)
  → array of dataset keys (strings), most-relevant first.
- Produces: `getRecommendedDatasets(testId: string): string[]` — returns
  `RECOMMENDED_DATASETS[testId] ?? []`.
- Consumes: `TREE` from `./tree.js` (test only, to verify ids are real) and
  `BUILTIN` from `../data/datasets.js` (test only, to verify dataset keys
  exist) — the module itself has no imports.

- [ ] **Step 1: Write the failing test**

Create `src/config/datasetRecommendations.test.js`:

```js
import { describe, test, expect } from 'vitest';
import { TREE } from './tree.js';
import { BUILTIN } from '../data/datasets.js';
import { RECOMMENDED_DATASETS, getRecommendedDatasets } from './datasetRecommendations.js';

const TREE_IDS = new Set(TREE.flatMap(c => c.tests.map(t => t.id)));

describe('datasetRecommendations', () => {
  test('every mapped test id exists in TREE', () => {
    const missing = Object.keys(RECOMMENDED_DATASETS).filter(id => !TREE_IDS.has(id));
    expect(missing, `unknown test ids: ${missing.join(', ')}`).toHaveLength(0);
  });

  test('every referenced dataset key exists in BUILTIN', () => {
    const allKeys = Object.values(RECOMMENDED_DATASETS).flat();
    const missing = allKeys.filter(key => !BUILTIN[key]);
    expect(missing, `unknown dataset keys: ${missing.join(', ')}`).toHaveLength(0);
  });

  test('mcnemar and kappa are deliberately unmapped', () => {
    expect(RECOMMENDED_DATASETS.mcnemar).toBeUndefined();
    expect(RECOMMENDED_DATASETS.kappa).toBeUndefined();
  });

  test('getRecommendedDatasets returns the mapped array for a known test', () => {
    expect(getRecommendedDatasets('efa')).toEqual(['lifesat']);
  });

  test('getRecommendedDatasets returns an empty array for an unmapped test', () => {
    expect(getRecommendedDatasets('pow_anova')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/config/datasetRecommendations.test.js`
Expected: FAIL — `Cannot find module './datasetRecommendations.js'`.

- [ ] **Step 3: Implement the mapping**

Create `src/config/datasetRecommendations.js`:

```js
export const RECOMMENDED_DATASETS = {
  // Compare Means
  t_welch: ['salaries', 'cps', 'iris'],
  t_one: ['iris', 'gapminder'],
  t_paired: ['sleep'],
  trimmed: ['diamonds', 'salaries'],
  z_known: ['iris', 'gapminder'],
  sign: ['sleep'],
  // Analysis of Variance
  anova: ['iris', 'diamonds'],
  welch_anova: ['diamonds', 'iris'],
  twoway: ['salaries', 'schools'],
  ancova: ['salaries', 'cps'],
  rm_anova: ['sleep'],
  kruskal: ['iris', 'diamonds'],
  friedman: ['sleep'],
  cochranQ: ['vocabtest'],
  // Nonparametric
  mwu: ['salaries', 'cps', 'diamonds'],
  wilcoxon: ['sleep'],
  // Correlation
  pearson: ['gapminder', 'diamonds'],
  spearman: ['gapminder', 'diamonds'],
  kendall: ['gapminder', 'salaries'],
  partial: ['salaries', 'affairs'],
  pointbis: ['salaries', 'affairs'],
  // Regression
  ols_simple: ['diamonds', 'gapminder'],
  ols_multi: ['diamonds', 'salaries'],
  polynomial: ['diamonds', 'gapminder'],
  hierarchical: ['salaries', 'cps'],
  logistic: ['affairs'],
  ordinal: ['salaries', 'diamonds'],
  poisson: ['affairs'],
  negbinom: ['affairs'],
  mediation: ['salaries', 'affairs'],
  med_bootstrap: ['salaries', 'affairs'],
  moderation: ['salaries', 'cps'],
  // Categorical
  chisq: ['diamonds', 'cps'],
  chigof: ['diamonds'],
  fisher: ['cps', 'affairs'],
  binomial: ['affairs', 'vocabtest'],
  prop1: ['affairs', 'cps'],
  prop2: ['cps', 'affairs'],
  // Multivariate
  pca: ['iris', 'diamonds'],
  efa: ['lifesat'],
  manova: ['iris', 'lifesat'],
  cancorr: ['diamonds', 'salaries'],
  lda: ['iris'],
  cronbach: ['lifesat'],
  splithalf: ['lifesat', 'vocabtest'],
  icc: ['lifesat', 'vocabtest'],
  // Psychometrics
  omega: ['lifesat'],
  parallel: ['lifesat'],
  irt_1pl: ['vocabtest'],
  irt_2pl: ['vocabtest'],
  scale_score: ['lifesat'],
  // Multilevel Models
  hlm_ri: ['schools', 'mathachieve'],
  hlm_rs: ['mathachieve', 'schools'],
  icc_ml: ['schools', 'mathachieve'],
  // Clustering
  kmeans: ['iris', 'diamonds'],
  hclust: ['iris', 'diamonds'],
  lca: ['vocabtest', 'lifesat'],
};

export function getRecommendedDatasets(testId) {
  return RECOMMENDED_DATASETS[testId] ?? [];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/config/datasetRecommendations.test.js`
Expected: PASS, all 5 tests green.

- [ ] **Step 5: Run the full suite**

Run: `pnpm test`
Expected: PASS, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add src/config/datasetRecommendations.js src/config/datasetRecommendations.test.js
git commit -m "feat: add per-test recommended-datasets mapping"
```

---

### Task 3: `DatasetRecommendations` component

**Files:**
- Create: `src/components/DatasetRecommendations.jsx`
- Test: `src/components/DatasetRecommendations.test.jsx`

**Interfaces:**
- Consumes: `getRecommendedDatasets` from `../config/datasetRecommendations.js`
  (Task 2), `BUILTIN` from `../data/datasets.js` (Task 1 adds `lifesat`/
  `vocabtest` to it), `C` from `../palette.js`.
- Produces: `DatasetRecommendations({ activeTest, dsKey, onSelectDataset })`
  — renders `null` if there are no recommendations for `activeTest` (or none
  of the recommended keys exist in `BUILTIN`); otherwise renders a "Try this
  with" label and one chip button per recommended dataset (using its
  `BUILTIN[key].label`), calling `onSelectDataset(key)` on click. The chip
  whose key equals `dsKey` is styled distinctly (accent border/text) from
  the others.

- [ ] **Step 1: Write the failing test**

Create `src/components/DatasetRecommendations.test.jsx`:

```jsx
// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { DatasetRecommendations } from './DatasetRecommendations.jsx';

afterEach(cleanup);

describe('DatasetRecommendations', () => {
  test('renders nothing for a test with no mapping', () => {
    const { container } = render(
      <DatasetRecommendations activeTest="pow_anova" dsKey="iris" onSelectDataset={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders the recommended dataset chip for a mapped test', () => {
    const { getByText } = render(
      <DatasetRecommendations activeTest="efa" dsKey="iris" onSelectDataset={() => {}} />
    );
    expect(getByText('Life Satisfaction Survey')).toBeTruthy();
  });

  test('clicking a chip calls onSelectDataset with the dataset key', () => {
    const onSelectDataset = vi.fn();
    const { getByText } = render(
      <DatasetRecommendations activeTest="t_welch" dsKey="iris" onSelectDataset={onSelectDataset} />
    );
    fireEvent.click(getByText('Salaries'));
    expect(onSelectDataset).toHaveBeenCalledWith('salaries');
  });

  test('marks the active dataset chip distinctly from inactive ones', () => {
    const { getByText } = render(
      <DatasetRecommendations activeTest="t_welch" dsKey="salaries" onSelectDataset={() => {}} />
    );
    const activeChip = getByText('Salaries').closest('button');
    const inactiveChip = getByText('CPS 1985').closest('button');
    expect(activeChip.style.color).not.toBe(inactiveChip.style.color);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/DatasetRecommendations.test.jsx`
Expected: FAIL — `Cannot find module './DatasetRecommendations.jsx'`.

- [ ] **Step 3: Implement the component**

Create `src/components/DatasetRecommendations.jsx`:

```jsx
import { C } from '../palette.js';
import { BUILTIN } from '../data/datasets.js';
import { getRecommendedDatasets } from '../config/datasetRecommendations.js';

const mono = { fontFamily: "'IBM Plex Mono', monospace" };

export function DatasetRecommendations({ activeTest, dsKey, onSelectDataset }) {
  const keys = getRecommendedDatasets(activeTest).filter(key => BUILTIN[key]);
  if (!keys.length) return null;

  return (
    <div style={{ padding: '8px 10px', borderBottom: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 7, color: C.dim, ...mono, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>
        Try this with
      </div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {keys.map(key => {
          const active = key === dsKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDataset(key)}
              style={{
                background: active ? 'rgba(196,255,0,.12)' : 'transparent',
                border: `1px solid ${active ? C.accent : C.border}`,
                color: active ? C.accent : C.text,
                ...mono, fontSize: 9, padding: '3px 8px', borderRadius: 3, cursor: 'pointer',
              }}
            >
              {BUILTIN[key].label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/DatasetRecommendations.test.jsx`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Run the full suite**

Run: `pnpm test`
Expected: PASS, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add src/components/DatasetRecommendations.jsx src/components/DatasetRecommendations.test.jsx
git commit -m "feat: add DatasetRecommendations chip component"
```

---

### Task 4: Wire `DatasetRecommendations` into the Calculation & Interface band

**Files:**
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `DatasetRecommendations` from `./components/DatasetRecommendations.jsx`
  (Task 3) with props `{ activeTest, dsKey, onSelectDataset }`; `switchDs`
  and `dsKey` already exist as state/handlers in `App`'s component body
  (unchanged by this task — `switchDs` is the same function `Header`/
  `DatasetPicker` already use).
- Produces: no other file depends on this — `CalcBand`'s new `dsKey`/
  `switchDs` props are purely additive (existing `inference`/`activeTest`/
  `ds`/`data` props are unchanged).

- [ ] **Step 1: Write the failing smoke-test addition**

In `src/App.test.jsx`, add this test inside the existing `describe('App', ...)` block
(the file already imports `fireEvent` at the top via
`import { render, fireEvent, cleanup } from '@testing-library/react';` —
use it directly as `fireEvent.click(...)`, the same way the other tests in
this file already do; do not destructure it from `render()`'s return value):

```jsx
  test('shows a dataset recommendation chip for a test with a mapping', () => {
    const { getByText } = render(<App />);
    fireEvent.click(getByText(/LAUNCH APP/));
    // default activeTest is 't_welch', which recommends salaries/cps/iris
    expect(getByText('Salaries')).toBeTruthy();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/App.test.jsx`
Expected: FAIL — no "Salaries" text present yet.

- [ ] **Step 3: Add the import**

In `src/App.jsx`, add this line to the import block, immediately after the
existing `import { DatasetPicker } from './components/DatasetPicker.jsx';` line:

```js
import { DatasetRecommendations } from './components/DatasetRecommendations.jsx';
```

- [ ] **Step 4: Update `CalcBand`'s signature and render `DatasetRecommendations`**

In `src/App.jsx`, change:

```jsx
function CalcBand({ inference, activeTest, ds, data }) {
  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      <div style={{ width: 260, flexShrink: 0, borderRight: `1px solid ${C.border}`, overflowY: 'auto' }}>
        <InferenceConfig active={activeTest} ds={ds} data={data} state={inference.state} />
      </div>
```

to:

```jsx
function CalcBand({ inference, activeTest, ds, data, dsKey, switchDs }) {
  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      <div style={{ width: 260, flexShrink: 0, borderRight: `1px solid ${C.border}`, overflowY: 'auto' }}>
        <DatasetRecommendations activeTest={activeTest} dsKey={dsKey} onSelectDataset={switchDs} />
        <InferenceConfig active={activeTest} ds={ds} data={data} state={inference.state} />
      </div>
```

- [ ] **Step 5: Pass the new props at the call site**

In `src/App.jsx`, change:

```jsx
            <CalcBand inference={inference} activeTest={activeTest} ds={ds} data={data} />
```

to:

```jsx
            <CalcBand inference={inference} activeTest={activeTest} ds={ds} data={data} dsKey={dsKey} switchDs={switchDs} />
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm exec vitest run src/App.test.jsx`
Expected: PASS, all tests green.

- [ ] **Step 7: Run the full suite**

Run: `pnpm test`
Expected: PASS, 0 failures.

- [ ] **Step 8: Commit**

```bash
git add src/App.jsx src/App.test.jsx
git commit -m "feat: surface recommended-dataset chips in the Calculation & Interface band"
```

---

### Task 5: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full suite**

Run: `pnpm test`
Expected: 0 failures.

- [ ] **Step 2: Start the dev server and manually verify in a browser**

Run: `pnpm dev`, open the printed local URL, launch the app.

Manually check:
1. Default test is Welch t-test — confirm chips "Salaries", "CPS 1985", "Iris" appear above the test config, and clicking "Salaries" switches the loaded dataset (dataset control in the header updates to show Salaries).
2. Pick "EFA (Varimax)" in the Navigator — confirm only one chip, "Life Satisfaction Survey", appears; click it, confirm the dataset loads (12 numeric item columns available in the Advanced panel's variable selectors), then configure EFA with those 12 items and confirm it runs without error and produces a multi-factor result.
3. Pick "IRT Rasch (1PL)" — confirm the "Vocabulary Test" chip appears; click it and run IRT 1PL on the 15 `q`-prefixed items, confirm it produces difficulty estimates.
4. Pick a test with no mapping (e.g. "ANOVA Power" under Power Analysis) — confirm no recommendation row renders (no empty box, nothing at all).
5. Open the Sample Datasets picker in the header — confirm "Life Satisfaction Survey" and "Vocabulary Test" both appear in the list with their descriptions, alongside the original 9.

Expected: all five checks behave as described, no console errors.

- [ ] **Step 3: Report results**

No commit for this task — it's a verification checkpoint. If any check
fails, open a follow-up task fixing the specific regression before
considering the plan complete.
