# StatLab Workbench Decluttering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Declutter StatLab's Navigator (36 flat always-visible categories with
a drift-prone icon map and a stale test count) and AUTO-mode toolbar (9
unlabeled abbreviation buttons), without touching anything else in the
four-region workbench layout.

**Architecture:** The Navigator (`Navigator` in `src/components/
InferencePanel.jsx`) partitions its category list into a "Core" group (the
13 categories `testCategories.js` already treats as headline-worthy for the
landing page) and a collapsed-by-default "More categories" group, reusing
the same `Set`-of-expanded-names state the component already has for
individual categories. The drift-prone `CAT_ICON` map is deleted outright
(nothing replaces it — the existing per-category color + count already
carries the distinction). The stale `"84 modules"`/`"Search 84 tests..."`
strings are replaced with the already-correct `TOTAL_TEST_COUNT` export.
The AUTO-mode toolbar (`CHART_ICONS` in `src/Workbench.jsx`) swaps its
rendered abbreviation for the full-word `title` field the data already
carries.

**Tech Stack:** React 18, Vite, Vitest + `@testing-library/react` +
`happy-dom` (existing test stack — no new dependencies).

## Global Constraints

- No changes to the Calculation & Interface band or the Advanced panel
  (spec Non-goals).
- No changes to `statlab` computation, chart components, or anything from
  the Phase 1 viz-rendering-correctness work.
- No new build/runtime dependency.
- No new hand-maintained per-category metadata (spec Goal 4) — the whole
  point of this phase is removing that failure mode, not relocating it.
- Every existing test must keep passing (`pnpm test`) after every task.
- Follow the codebase's existing test convention: `// @vitest-environment
  happy-dom` header, `@testing-library/react`'s `render`/`screen`/
  `fireEvent`/`waitFor`, `describe`/`test`|`it`/`expect` from `vitest`.
- Work happens in the git worktree at `D:\Development\statlab-declutter`
  (branch `feat/workbench-declutter`, already created from the tip of
  `fix/viz-rendering-correctness`, since this phase's layout work sits on
  top of Phase 1's crash/sizing fixes). All file paths below are relative
  to that worktree root.

---

### Task 1: `CORE_CATEGORY_NAMES` — single source of truth for "core" categories

**Files:**
- Modify: `src/config/testCategories.js`
- Create: `src/config/testCategories.test.js`

**Interfaces:**
- Produces: `CORE_CATEGORY_NAMES` — a `Set<string>` exported from
  `src/config/testCategories.js`, containing exactly the `cat` values of
  `HEADLINE_CATS` (the module's existing, already-defined array). Task 2
  imports this to partition the Navigator's category list.

- [ ] **Step 1: Write the failing test**

Create `src/config/testCategories.test.js`:

```js
import { describe, test, expect } from 'vitest';
import { TREE } from './tree.js';
import { CORE_CATEGORY_NAMES, TEST_CATEGORIES, TOTAL_TEST_COUNT } from './testCategories.js';

describe('testCategories', () => {
  test('CORE_CATEGORY_NAMES contains exactly the 13 headline category names', () => {
    expect(CORE_CATEGORY_NAMES.size).toBe(13);
    expect(CORE_CATEGORY_NAMES.has('COMPARE MEANS')).toBe(true);
    expect(CORE_CATEGORY_NAMES.has('ANALYSIS OF VARIANCE')).toBe(true);
    expect(CORE_CATEGORY_NAMES.has('NONPARAMETRIC')).toBe(true);
    expect(CORE_CATEGORY_NAMES.has('CORRELATION')).toBe(true);
    expect(CORE_CATEGORY_NAMES.has('REGRESSION')).toBe(true);
    expect(CORE_CATEGORY_NAMES.has('CATEGORICAL')).toBe(true);
    expect(CORE_CATEGORY_NAMES.has('EQUIVALENCE & BAYES')).toBe(true);
    expect(CORE_CATEGORY_NAMES.has('MULTIVARIATE')).toBe(true);
    expect(CORE_CATEGORY_NAMES.has('PSYCHOMETRICS')).toBe(true);
    expect(CORE_CATEGORY_NAMES.has('MULTILEVEL MODELS')).toBe(true);
    expect(CORE_CATEGORY_NAMES.has('CLUSTERING')).toBe(true);
    expect(CORE_CATEGORY_NAMES.has('NETWORK')).toBe(true);
    expect(CORE_CATEGORY_NAMES.has('META-ANALYSIS & CAUSAL')).toBe(true);
  });

  test('CORE_CATEGORY_NAMES only contains names that exist in TREE (guards against drift)', () => {
    const treeCatNames = new Set(TREE.map(c => c.cat));
    for (const name of CORE_CATEGORY_NAMES) {
      expect(treeCatNames.has(name)).toBe(true);
    }
  });

  test('a non-headline category is not in CORE_CATEGORY_NAMES', () => {
    expect(CORE_CATEGORY_NAMES.has('PRIVACY')).toBe(false);
    expect(CORE_CATEGORY_NAMES.has('DISTANCE & DEPENDENCE')).toBe(false);
  });

  test('TOTAL_TEST_COUNT and TEST_CATEGORIES are unaffected by this change', () => {
    expect(TOTAL_TEST_COUNT).toBe(TREE.reduce((s, c) => s + c.tests.length, 0));
    expect(TEST_CATEGORIES.length).toBe(14); // 13 headline rows + "DIAGNOSTICS & TOOLS"
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/config/testCategories.test.js`
Expected: FAIL — `CORE_CATEGORY_NAMES` is not exported yet (`undefined`,
so `.size`/`.has` throw).

- [ ] **Step 3: Add the export**

In `src/config/testCategories.js`, the file currently ends with:

```js
export const TOTAL_TEST_COUNT = TREE.reduce((s, c) => s + c.tests.length, 0);
```

Add this export immediately after the `HEADLINE_CATS` array declaration
(before the `export const TEST_CATEGORIES = (() => { ... })();` block that
already exists), so it's available to reuse inside that same IIFE too if
useful later, and reads naturally right after the array it derives from:

```js
export const CORE_CATEGORY_NAMES = new Set(HEADLINE_CATS.map(h => h.cat));
```

The rest of the file (the `TEST_CATEGORIES` IIFE and `TOTAL_TEST_COUNT`)
stays exactly as-is — this is a pure addition, not a refactor of the
existing exports.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/config/testCategories.test.js`
Expected: PASS — all 4 tests pass.

- [ ] **Step 5: Run the full suite**

Run: `pnpm test`
Expected: PASS — no other file imports from `testCategories.js` in a way
this addition could break (it's a pure new export).

- [ ] **Step 6: Commit**

```bash
git add src/config/testCategories.js src/config/testCategories.test.js
git commit -m "$(cat <<'EOF'
feat: export CORE_CATEGORY_NAMES from testCategories.js

A Set of the 13 category names testCategories.js's existing
HEADLINE_CATS array already treats as landing-page-worthy. Gives
the Navigator (Task 2) a single source of truth for "core" vs
"long tail" categories, derived from data the app already commits
to, instead of a second hand-picked list that could drift from the
landing page's.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Navigator — Core/More grouping, drop `CAT_ICON`, fix the stale count

**Files:**
- Modify: `src/components/InferencePanel.jsx`
- Modify: `src/components/InferencePanel.test.jsx`

**Interfaces:**
- Consumes: `CORE_CATEGORY_NAMES`, `TOTAL_TEST_COUNT` from
  `../config/testCategories.js` (Task 1).
- No new exports — `Navigator`'s own exported signature
  (`{ active, setActive, width, borderRight }`) is unchanged.

- [ ] **Step 1: Write the failing tests**

`InferencePanel.test.jsx` currently renders `InferencePanel` (which wraps
`Navigator`). Add three new tests to the existing `describe('InferencePanel', ...)`
block in `src/components/InferencePanel.test.jsx` (after the two existing
`it(...)` blocks, using the same `mockRows`/`mockDs` fixtures already
defined at the top of that file):

```jsx
  it('shows a core category without interaction, and hides a long-tail one until "More categories" is expanded', () => {
    render(
      <InferencePanel
        data={mockRows}
        ds={mockDs}
        active="t_welch"
        setActive={vi.fn()}
      />,
    );
    // Core category header text is visible immediately.
    expect(screen.getByText(/COMPARE MEANS/i)).toBeTruthy();
    // A long-tail category's header is not rendered at all until the
    // "More categories" section is expanded (it starts collapsed).
    expect(screen.queryByText(/^PRIVACY/i)).toBeNull();

    const moreToggle = screen.getByText(/MORE CATEGORIES/i);
    fireEvent.click(moreToggle);

    expect(screen.getByText(/^PRIVACY/i)).toBeTruthy();
  });

  it('search still surfaces a match from the collapsed "More categories" section immediately', () => {
    render(
      <InferencePanel
        data={mockRows}
        ds={mockDs}
        active="t_welch"
        setActive={vi.fn()}
      />,
    );
    const search = screen.getByPlaceholderText(/Search \d+ tests\.\.\./i);
    fireEvent.change(search, { target: { value: 'Privacy' } });
    expect(screen.getByText(/^PRIVACY/i)).toBeTruthy();
  });

  it('the search placeholder and idle count reflect the real test total, not a hardcoded 84', () => {
    render(
      <InferencePanel
        data={mockRows}
        ds={mockDs}
        active="t_welch"
        setActive={vi.fn()}
      />,
    );
    expect(screen.queryByPlaceholderText('Search 84 tests...')).toBeNull();
    expect(screen.getByPlaceholderText(/Search \d{3} tests\.\.\./i)).toBeTruthy();
    expect(screen.queryByText('84 modules')).toBeNull();
    expect(screen.getByText(/^\d{3} modules$/)).toBeTruthy();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run src/components/InferencePanel.test.jsx`
Expected: FAIL — all 3 new tests fail. The "More categories" toggle
doesn't exist yet (categories are still one flat list), and the
placeholder/count are still the literal `"84"`.

- [ ] **Step 3: Add the `CORE_CATEGORY_NAMES`/`TOTAL_TEST_COUNT` import**

In `src/components/InferencePanel.jsx`, add to the existing import block
at the top of the file (after the `import { TREE } from '../config/tree.js';`
line):

```js
import { CORE_CATEGORY_NAMES, TOTAL_TEST_COUNT } from '../config/testCategories.js';
```

- [ ] **Step 4: Delete `CAT_ICON` and its call site**

In `src/components/InferencePanel.jsx`, delete the entire `CAT_ICON`
declaration (the comment above it and the object itself — currently
lines 173-211, starting `// Keys must match tree.js's...` through the
closing `};` of the `CAT_ICON` object).

Then find the category header's `<span>` (currently around line 442):

```jsx
                <span>{CAT_ICON[cat.cat] ? CAT_ICON[cat.cat] + ' ' : ''}{cat.cat} <span style={{ fontSize: 8, color: C.dim }}>({cat.tests.length})</span></span>
```

Replace it with:

```jsx
                <span>{cat.cat} <span style={{ fontSize: 8, color: C.dim }}>({cat.tests.length})</span></span>
```

- [ ] **Step 5: Fix the stale placeholder and idle count**

Find the search input's placeholder (currently around line 252):

```jsx
            placeholder="Search 84 tests..."
```

Replace with:

```jsx
            placeholder={`Search ${TOTAL_TEST_COUNT} tests...`}
```

Find the idle count (currently around line 287):

```jsx
            {searchQuery ? `${filteredTree.reduce((acc, cat) => acc + cat.tests.length, 0)} found` : '84 modules'}
```

Replace with:

```jsx
            {searchQuery ? `${filteredTree.reduce((acc, cat) => acc + cat.tests.length, 0)} found` : `${TOTAL_TEST_COUNT} modules`}
```

- [ ] **Step 6: Partition `filteredTree` into `coreCats`/`moreCats`**

Find the `isExpanded` function (currently around line 240):

```jsx
  const isExpanded = (catName) => {
    if (searchQuery.trim()) return true;
    return expandedCats.has(catName);
  };
```

Immediately after it, add:

```jsx
  const coreCats = filteredTree.filter(cat => CORE_CATEGORY_NAMES.has(cat.cat));
  const moreCats = filteredTree.filter(cat => !CORE_CATEGORY_NAMES.has(cat.cat));
```

(Plain `const`, not `useMemo` — `filteredTree` is itself already a
`useMemo` recomputed only on `searchQuery` change, and this is one cheap
`.filter()` pass over an array that's at most 36 entries long; matching
the file's existing style of not over-memoizing simple derived values —
see `activeCat`'s sibling `testLookup` `useMemo` for where memoization is
actually used, for genuinely more expensive work.)

- [ ] **Step 7: Extract category rendering into a `renderCategory` helper**

Find the `filteredTree.map(cat => { ... })` block (currently lines
419-524, immediately after the closing `)}` of the Recent section and
before the final `</div></div>` of the component). Its full current
content is:

```jsx
        {filteredTree.map(cat => {
          const expanded = isExpanded(cat.cat);
          return (
            <div key={cat.cat} style={{ borderBottom: `1px solid ${C.border}` }}>
              {/* Category Header */}
              <div
                onClick={() => toggleCategory(cat.cat)}
                style={{
                  position: 'sticky', top: 0, zIndex: 1,
                  fontSize: 9, ...mono,
                  color: cat.color,
                  textTransform: 'uppercase',
                  letterSpacing: '.12em',
                  padding: '6px 10px',
                  fontWeight: 700,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  background: C.bg,
                  userSelect: 'none',
                }}
              >
                <span>{cat.cat} <span style={{ fontSize: 8, color: C.dim }}>({cat.tests.length})</span></span>
                <span style={{ fontSize: 8, color: C.dim }}>
                  {expanded ? '\u25BC' : '\u25B6'}
                </span>
              </div>

              {/* Tests list */}
              {expanded && (
                <div style={{ background: 'rgba(0,0,0,0.1)' }}>
                  {cat.tests.map(t => {
                    const isFav = favorites.includes(t.id);
                    return (
                    <div key={t.id} style={{ borderTop: `1px dashed ${C.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <button
                          onClick={() => setActive(t.id)}
                          style={{
                            flex: 1, display: 'block', textAlign: 'left',
                            background: active === t.id ? 'rgba(255,255,255,.04)' : 'transparent',
                            color: active === t.id ? cat.color : C.text,
                            border: 'none',
                            borderLeft: active === t.id ? `3px solid ${cat.color}` : '3px solid transparent',
                            fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13,
                            padding: '6px 8px', cursor: 'pointer', lineHeight: 1.15, transition: 'all .1s',
                          }}
                        >
                          <span style={{ color: active === t.id ? cat.color : C.text }}>{t.label}</span>
                          <div style={{ fontSize: 8, ...mono, color: C.dim, fontWeight: 400, marginTop: 2 }}>{t.tag}</div>
                        </button>
                        <button
                          onClick={(e) => toggleFavorite(e, t.id)}
                          title={isFav ? 'Remove favorite' : 'Add favorite'}
                          style={{
                            background: 'transparent', border: 'none', color: isFav ? C.accent : C.dim,
                            cursor: 'pointer', fontSize: 11, padding: '6px 4px 6px 0', ...mono,
                          }}
                        >
                          {isFav ? '\u2605' : '\u2606'}
                        </button>
                        {METHOD_NOTES[t.id] && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedNote(expandedNote === t.id ? null : t.id); }}
                            title="Method info"
                            style={{
                              background: 'transparent', border: 'none', color: expandedNote === t.id ? C.accent : C.dim,
                              cursor: 'pointer', fontSize: 11, padding: '6px 8px 6px 0', ...mono,
                            }}
                          >
                            ?
                          </button>
                        )}
                      </div>
                      {expandedNote === t.id && METHOD_NOTES[t.id] && (
                        <div style={{
                          margin: '0 8px 6px 10px', padding: '6px 8px', background: C.panel, borderRadius: 3,
                          border: `1px solid ${C.border}`, fontSize: 9, color: C.text, lineHeight: 1.5,
                        }}>
                          {typeof METHOD_NOTES[t.id] === 'string'
                            ? METHOD_NOTES[t.id]
                            : (
                              <>
                                <div style={{ color: cat.color, fontWeight: 600, marginBottom: 3 }}>{METHOD_NOTES[t.id].description}</div>
                                {METHOD_NOTES[t.id].usage && <div style={{ color: C.dim, marginBottom: 4 }}><b style={{ color: C.text }}>Use:</b> {METHOD_NOTES[t.id].usage}</div>}
                                {METHOD_NOTES[t.id].assumptions && (
                                  <div style={{ marginBottom: 4 }}>
                                    <b style={{ color: C.text }}>Assumptions:</b>
                                    <ul style={{ margin: '2px 0 0 12px', padding: 0 }}>
                                      {METHOD_NOTES[t.id].assumptions.map((a, i) => <li key={i} style={{ color: C.dim, marginBottom: 1 }}>{a}</li>)}
                                    </ul>
                                  </div>
                                )}
                                {METHOD_NOTES[t.id].cite && <div style={{ color: C.dim, fontSize: 8, fontStyle: 'italic' }}>{METHOD_NOTES[t.id].cite}</div>}
                              </>
                            )}
                        </div>
                      )}
                    </div>
                  );})}
                </div>
              )}
            </div>
          );
        })}
```

(Note: this is already Task 2 Step 4's post-edit version — `CAT_ICON` is
already gone from the `<span>` by this point in the sequence.)

Replace that entire block with a helper function defined just above the
component's `return (`, plus two grouped invocations of it inside the
return. First, immediately before `return (` (i.e. right after the
`coreCats`/`moreCats` `const`s from Step 6), add:

```jsx
  const renderCategory = (cat) => {
    const expanded = isExpanded(cat.cat);
    return (
      <div key={cat.cat} style={{ borderBottom: `1px solid ${C.border}` }}>
        {/* Category Header */}
        <div
          onClick={() => toggleCategory(cat.cat)}
          style={{
            position: 'sticky', top: 0, zIndex: 1,
            fontSize: 9, ...mono,
            color: cat.color,
            textTransform: 'uppercase',
            letterSpacing: '.12em',
            padding: '6px 10px',
            fontWeight: 700,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            background: C.bg,
            userSelect: 'none',
          }}
        >
          <span>{cat.cat} <span style={{ fontSize: 8, color: C.dim }}>({cat.tests.length})</span></span>
          <span style={{ fontSize: 8, color: C.dim }}>
            {expanded ? '\u25BC' : '\u25B6'}
          </span>
        </div>

        {/* Tests list */}
        {expanded && (
          <div style={{ background: 'rgba(0,0,0,0.1)' }}>
            {cat.tests.map(t => {
              const isFav = favorites.includes(t.id);
              return (
              <div key={t.id} style={{ borderTop: `1px dashed ${C.border}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <button
                    onClick={() => setActive(t.id)}
                    style={{
                      flex: 1, display: 'block', textAlign: 'left',
                      background: active === t.id ? 'rgba(255,255,255,.04)' : 'transparent',
                      color: active === t.id ? cat.color : C.text,
                      border: 'none',
                      borderLeft: active === t.id ? `3px solid ${cat.color}` : '3px solid transparent',
                      fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13,
                      padding: '6px 8px', cursor: 'pointer', lineHeight: 1.15, transition: 'all .1s',
                    }}
                  >
                    <span style={{ color: active === t.id ? cat.color : C.text }}>{t.label}</span>
                    <div style={{ fontSize: 8, ...mono, color: C.dim, fontWeight: 400, marginTop: 2 }}>{t.tag}</div>
                  </button>
                  <button
                    onClick={(e) => toggleFavorite(e, t.id)}
                    title={isFav ? 'Remove favorite' : 'Add favorite'}
                    style={{
                      background: 'transparent', border: 'none', color: isFav ? C.accent : C.dim,
                      cursor: 'pointer', fontSize: 11, padding: '6px 4px 6px 0', ...mono,
                    }}
                  >
                    {isFav ? '\u2605' : '\u2606'}
                  </button>
                  {METHOD_NOTES[t.id] && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setExpandedNote(expandedNote === t.id ? null : t.id); }}
                      title="Method info"
                      style={{
                        background: 'transparent', border: 'none', color: expandedNote === t.id ? C.accent : C.dim,
                        cursor: 'pointer', fontSize: 11, padding: '6px 8px 6px 0', ...mono,
                      }}
                    >
                      ?
                    </button>
                  )}
                </div>
                {expandedNote === t.id && METHOD_NOTES[t.id] && (
                  <div style={{
                    margin: '0 8px 6px 10px', padding: '6px 8px', background: C.panel, borderRadius: 3,
                    border: `1px solid ${C.border}`, fontSize: 9, color: C.text, lineHeight: 1.5,
                  }}>
                    {typeof METHOD_NOTES[t.id] === 'string'
                      ? METHOD_NOTES[t.id]
                      : (
                        <>
                          <div style={{ color: cat.color, fontWeight: 600, marginBottom: 3 }}>{METHOD_NOTES[t.id].description}</div>
                          {METHOD_NOTES[t.id].usage && <div style={{ color: C.dim, marginBottom: 4 }}><b style={{ color: C.text }}>Use:</b> {METHOD_NOTES[t.id].usage}</div>}
                          {METHOD_NOTES[t.id].assumptions && (
                            <div style={{ marginBottom: 4 }}>
                              <b style={{ color: C.text }}>Assumptions:</b>
                              <ul style={{ margin: '2px 0 0 12px', padding: 0 }}>
                                {METHOD_NOTES[t.id].assumptions.map((a, i) => <li key={i} style={{ color: C.dim, marginBottom: 1 }}>{a}</li>)}
                              </ul>
                            </div>
                          )}
                          {METHOD_NOTES[t.id].cite && <div style={{ color: C.dim, fontSize: 8, fontStyle: 'italic' }}>{METHOD_NOTES[t.id].cite}</div>}
                        </>
                      )}
                  </div>
                )}
              </div>
            );})}
          </div>
        )}
      </div>
    );
  };
```

Then, in the `return (...)` JSX, replace the (now-removed)
`{filteredTree.map(cat => {...})}` block with two grouped sections. Place
them where that block used to sit (immediately after the Recent section's
closing `)}` and before the final `</div>\n    </div>\n  );`):

```jsx
        {/* Core categories */}
        {coreCats.length > 0 && (
          <div style={{ borderBottom: `1px solid ${C.border}` }}>
            <div
              onClick={() => toggleCategory('__core__')}
              style={{
                position: 'sticky', top: 0, zIndex: 1,
                fontSize: 9, ...mono, fontWeight: 700, color: C.accent,
                textTransform: 'uppercase', letterSpacing: '.12em',
                padding: '6px 10px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', cursor: 'pointer', background: C.bg,
                userSelect: 'none', borderBottom: `1px solid ${C.border}`,
              }}
            >
              <span>CORE ({coreCats.reduce((acc, cat) => acc + cat.tests.length, 0)})</span>
              <span style={{ fontSize: 8, color: C.dim }}>{isExpanded('__core__') ? '\u25BC' : '\u25B6'}</span>
            </div>
            {isExpanded('__core__') && coreCats.map(renderCategory)}
          </div>
        )}

        {/* Long-tail categories */}
        {moreCats.length > 0 && (
          <div style={{ borderBottom: `1px solid ${C.border}` }}>
            <div
              onClick={() => toggleCategory('__more__')}
              style={{
                position: 'sticky', top: 0, zIndex: 1,
                fontSize: 9, ...mono, fontWeight: 700, color: C.dim,
                textTransform: 'uppercase', letterSpacing: '.12em',
                padding: '6px 10px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', cursor: 'pointer', background: C.bg,
                userSelect: 'none', borderBottom: `1px solid ${C.border}`,
              }}
            >
              <span>MORE CATEGORIES ({moreCats.length})</span>
              <span style={{ fontSize: 8, color: C.dim }}>{isExpanded('__more__') ? '\u25BC' : '\u25B6'}</span>
            </div>
            {isExpanded('__more__') && moreCats.map(renderCategory)}
          </div>
        )}
```

`toggleCategory` is reused unmodified — it already just flips membership
of whatever string key it's given in `expandedCats`, so `'__core__'`/
`'__more__'` work exactly like any category name would.

- [ ] **Step 8: Seed `'__core__'` as expanded by default**

Find the `expandedCats` initial state (currently around line 107):

```jsx
  const [expandedCats, setExpandedCats] = useState(() => {
    const initial = new Set();
    if (activeCat) initial.add(activeCat);
    return initial;
  });
```

Replace with:

```jsx
  const [expandedCats, setExpandedCats] = useState(() => {
    const initial = new Set(['__core__']);
    if (activeCat) initial.add(activeCat);
    return initial;
  });
```

(`'__more__'` is intentionally NOT added — it starts collapsed, per the
spec.)

- [ ] **Step 9: Run tests to verify they pass**

Run: `pnpm vitest run src/components/InferencePanel.test.jsx`
Expected: PASS — all 5 tests pass (2 pre-existing + 3 new).

- [ ] **Step 10: Run the full suite**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/components/InferencePanel.jsx src/components/InferencePanel.test.jsx
git commit -m "$(cat <<'EOF'
feat: Navigator Core/More grouping, drop CAT_ICON, fix stale count

Partitions the 36-category Navigator into an always-open "Core"
section (the 13 categories testCategories.js already calls
headline-worthy) and a collapsed-by-default "More categories"
section, reusing the same expandedCats Set the component already
had for individual categories.

Deletes CAT_ICON, the hand-maintained glyph map that had already
silently dropped icons for new categories twice (its own in-code
comment documented the first drift; a second batch of categories
added later reproduced it). Nothing replaces it — the existing
per-category color plus test count already distinguish categories
without a second, uncoordinated visual signal.

Search placeholder and idle count now read from the already-correct
TOTAL_TEST_COUNT instead of a hardcoded "84".

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Toolbar — full labels instead of abbreviations

**Files:**
- Modify: `src/Workbench.jsx`
- Modify: `src/App.test.jsx`

**Interfaces:**
- No new exports or props — `CHART_ICONS`'s shape (`{id, label, title}`)
  is unchanged; only which field is rendered changes.

- [ ] **Step 1: Write the failing test**

`App.test.jsx` already has a test that launches the app and waits for the
workbench to be ready (`'after launch, renders all four workbench regions
and the dataset picker'`). Extend that same test — after its existing
`waitFor`/assertions — with one more assertion, so this reuses the
already-working launch sequence instead of duplicating it. In
`src/App.test.jsx`, find:

```jsx
  test('after launch, renders all four workbench regions and the dataset picker', async () => {
    const { getByText, container } = render(<App />);
    fireEvent.click(getByText(/LAUNCH APP/));
    // Workbench is lazy-loaded (code-split from the landing page so first
    // paint doesn't wait on recharts) — its dynamic import resolves
    // asynchronously even in the test environment, so assertions on its
    // content need to wait for the Suspense boundary to settle.
    await waitFor(() => expect(container.querySelector('[data-tutorial-target="navigator"]')).toBeTruthy(), { timeout: 10000 });
    expect(container.querySelector('[data-tutorial-target="viz"]')).toBeTruthy();
    expect(container.querySelector('[data-tutorial-target="calc"]')).toBeTruthy();
    expect(container.querySelector('[data-tutorial-target="advanced"]')).toBeTruthy();
    expect(container.querySelector('[data-tutorial-target="dataset"]')).toBeTruthy();
  });
```

Add one line right before the closing `});` of that test body:

```jsx
    expect(getByText('Correlogram heatmap')).toBeTruthy();
```

(`"Correlogram heatmap"` is `CHART_ICONS`'s longest/most distinctive
`title` — asserting on it rather than a short one like `"Scatter"`
minimizes any chance of an accidental substring collision with other page
text.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/App.test.jsx -t "after launch"`
Expected: FAIL — the button currently renders `"HM"`, not `"Correlogram
heatmap"`.

- [ ] **Step 3: Swap the rendered field**

In `src/Workbench.jsx`, find the toolbar button (currently around line
200-216, inside `QuickView`'s `chartIcons`):

```jsx
      {CHART_ICONS.map(({ id, label, title }) => (
        <button
          key={id}
          type="button"
          title={title}
          onClick={() => setChartMode(id === chartMode ? null : id)}
          style={{
            background: effectiveMode === id ? 'rgba(196,255,0,.15)' : 'transparent',
            border: `1px solid ${effectiveMode === id ? C.accent : C.border}`,
            color: effectiveMode === id ? C.accent : C.dim,
            padding: '3px 8px', borderRadius: 3, fontSize: 9, cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {label}
        </button>
      ))}
```

Change the button's rendered child from `{label}` to `{title}`:

```jsx
      {CHART_ICONS.map(({ id, label, title }) => (
        <button
          key={id}
          type="button"
          title={title}
          onClick={() => setChartMode(id === chartMode ? null : id)}
          style={{
            background: effectiveMode === id ? 'rgba(196,255,0,.15)' : 'transparent',
            border: `1px solid ${effectiveMode === id ? C.accent : C.border}`,
            color: effectiveMode === id ? C.accent : C.dim,
            padding: '3px 8px', borderRadius: 3, fontSize: 9, cursor: 'pointer',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {title}
        </button>
      ))}
```

(`label` stays destructured and stays in the `CHART_ICONS` array —
unused now, but removing it is out of scope for this task: it's dead
weight, not clutter a user sees, and deleting it would touch a data
array this task doesn't otherwise need to change.)

The button row's own container already has `flexWrap: 'wrap'` set
(`QuickView`'s `chartIcons`, the `<div style={{ padding: '4px 6px',
display: 'flex', gap: 4, flexWrap: 'wrap', ... }}>` wrapping this `.map`)
— confirmed by reading the current source before writing this plan, so
no layout change is needed for longer labels to wrap instead of
overflowing.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/App.test.jsx -t "after launch"`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/Workbench.jsx src/App.test.jsx
git commit -m "$(cat <<'EOF'
feat: AUTO-mode toolbar shows full labels instead of abbreviations

CHART_ICONS already carried a full-word title for every button
("Violin", "Correlogram heatmap", "Time series"...) — it was only
used as the HTML title hover attribute. The button now renders that
same field directly instead of the 2-4 letter abbreviation, so the
toolbar is self-explanatory without hovering. The row already wraps
(flexWrap already set), so longer labels don't overflow.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Manual verification and spec sign-off

**Files:**
- None (verification only — no code changes expected; if verification
  finds a problem, fix it in the relevant file from Tasks 1-3 and re-run
  this task's checks before continuing).

- [x] **Step 1: Run the full automated suite one more time**

Run: `pnpm test`
Expected: PASS, zero failures.
**Result:** PASS — 30 files / 714 tests, zero failures.

- [x] **Step 2: Build the app**

Run: `pnpm build`
Expected: succeeds with no errors.
**Result:** PASS — `vite build` succeeded (same pre-existing chunk-size
warning on `Workbench`/`recharts` as Phase 1, unrelated to this change).

- [x] **Step 3: Preview the production build and manually verify**

Start a preview server (e.g. via the Browser pane's `preview_start` with
a `.claude/launch.json` entry pointing `--prefix` at this worktree, on a
port distinct from any other running preview — check
`preview_list`/existing `.claude/launch.json` entries first rather than
assuming a name/port is free) and, in the Browser pane:

1. Launch the app (default test: Welch t-test). Confirm the Navigator
   shows a "CORE" section already expanded with categories like "COMPARE
   MEANS", "ANALYSIS OF VARIANCE", "CORRELATION" visible, and a "MORE
   CATEGORIES (23)" section below it, collapsed, with no per-category
   glyphs — just the category name (in its color) and a count.
2. Click "MORE CATEGORIES" — confirm it expands to show the long-tail
   categories (e.g. "PRIVACY", "MULTI-ARMED BANDITS", "DISTANCE &
   DEPENDENCE").
3. Type a query that only matches something in the long tail (e.g.
   "privacy") into the search box — confirm it's found immediately
   without needing to expand "More categories" first, and that the
   placeholder/idle count above it read "221" (or whatever
   `TOTAL_TEST_COUNT` currently is), not "84".
4. Confirm the AUTO-mode toolbar buttons now read "Violin", "Box plot",
   "Scatter", "Histogram", "Bar + CI", "Correlogram heatmap", "Mosaic
   plot", "Time series", "Bootstrap" instead of the old abbreviations,
   and that they still function (clicking one still switches the chart
   mode — this logic wasn't touched, but confirm nothing broke).
5. Resize the browser viewport narrower (e.g. via `resize_window`) and
   confirm the toolbar wraps to a second line instead of overflowing or
   causing horizontal scroll.
6. Check `read_console_messages` for errors after each step above.

**Result:** Added a `statlab-declutter-preview` entry to the global
`C:\Development\.claude\launch.json` (port 4175, distinct from Phase 1's
4174 and the pre-existing `statlab-preview` at 4173 — none touched).
All 6 manual checks passed: "CORE (71)" expanded by default with no
glyphs, "MORE CATEGORIES (23)" collapsed by default; expanding it
revealed PRIVACY/other long-tail categories; searching "privacy"
force-expanded straight to the PRIVACY category with zero extra clicks
and showed "221" in the placeholder/count, not "84"; toolbar read full
words ("Violin", "Correlogram heatmap", etc.) and switching modes still
worked; at 900px width the toolbar wrapped cleanly to two rows with no
overflow. Also exercised "EXPAND ALL"/"COLLAPSE" directly (beyond what
this step listed) since that control's interaction with the new
`'__core__'`/`'__more__'` sentinel keys was the one real regression task
review caught and fixed (see Task 2's history above) — confirmed both
buttons now correctly expand/collapse the two new sections together with
every individual category. Zero console errors throughout.

- [x] **Step 4: Update the spec's status**

In
`docs/superpowers/specs/2026-09-16-workbench-declutter-design.md`,
update the `**Status:**` line to note verification is complete, and add
a short note of what was actually checked (mirroring how Phase 1's spec
recorded its own verification results), or note any deviation found and
fixed.
**Result:** Done — status updated with a verification summary.

- [ ] **Step 5: Commit the spec update**

```bash
git add docs/superpowers/specs/2026-09-16-workbench-declutter-design.md
git commit -m "$(cat <<'EOF'
docs: mark workbench decluttering verification complete

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

**This plan is done when:** all 4 tasks are checked off, `pnpm test` and
`pnpm build` both pass, and the manual pass in Task 4 Step 3 confirms the
Navigator's Core/More split, the removed icons, the fixed count, and the
toolbar's full labels all work as designed.
