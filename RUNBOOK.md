# StatLab Runbook

> A statistical workbench app powered by the `statlab` npm package.

---

## Quick Start

```bash
pnpm install         # install deps (react, recharts, papaparse, statlab)
pnpm dev              # start Vite dev server → http://localhost:5173
pnpm test             # run the app test suite
```

To browse the `statlab` library's own function catalog (`docs:list`,
`docs:show`, `docs:search`), clone [`github.com/mpdecker/statlab`](https://github.com/mpdecker/statlab)
— those commands live there now.

---

## Project Structure

```
statlab-app/
├── index.html                  Vite entry HTML
├── index.jsx                   Root entry
├── README.md                   Full documentation
├── RUNBOOK.md                  This file
├── package.json                Scripts + deps
├── vite.config.js              Vite configuration
│
└── src/
    ├── App.jsx                 Root component: header, sidebar, InferencePanel
    ├── palette.js               Color tokens, fonts, global CSS
    │
    ├── data/
    │   └── datasets.js         Built-in: Iris (150), Diamonds (200), Gapminder (33)
    │
    ├── config/
    │   ├── tree.js              Navigator — UI-accessible tests with labels + tags
    │   ├── methodNotes.js       Per-test methodology documentation
    │   ├── contracts.test.js    Integration test: TREE ids vs. statlab runners
    │   └── fixtures/            Local test harness (runners over the statlab package)
    │
    └── components/
        ├── ui.jsx               Chip, Sel, Inp, TA, CheckList, Toggle, APABlock, etc.
        ├── charts.jsx            TDistViz, QQPlot, ResidualPlot, Scree, Forest, etc.
        ├── InferenceConfig.jsx  Per-test parameter control panel
        ├── InferenceResults.jsx Result renderer — chips, tables, plots, APA output
        └── InferencePanel.jsx   Orchestrator: Navigator + Config + Results
```

All statistical computation comes from the [`statlab`](https://www.npmjs.com/package/statlab)
npm package — see [`github.com/mpdecker/statlab`](https://github.com/mpdecker/statlab) for its
own project structure and module list.

---

## Development Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server with HMR |
| `pnpm build` | Production build to `dist/` |
| `pnpm preview` | Preview production build |
| `pnpm test` | Run the app test suite |
| `pnpm test:watch` | Watch mode — reruns on file changes |
| `pnpm test:coverage` | Run with coverage report |

---

## Exposing a statlab Function in the UI

New statistical functions are added to the
[`statlab`](https://github.com/mpdecker/statlab) library, not this repo. Once
a function exists there (and the `statlab` dependency here is bumped to a
version that ships it), expose it in the UI:

### Step 1: Update tree.js (if UI-visible)

Add to `src/config/tree.js` under the appropriate category:

```javascript
{
  cat: "CATEGORY NAME",
  tests: [
    { id: "my_test_id", label: "My Test Label", tag: "short · description · tags" },
  ],
}
```

Add a runner for that id in `src/config/fixtures/runners.js` (used by the
`contracts.test.js` integration test) and wire the real call in the `result`
`useMemo` inside `InferencePanel.jsx`.

### Step 2: Update methodNotes.js (if UI-visible)

Add methodology documentation to `src/config/methodNotes.js`:

```javascript
my_test_id: {
  description: "...",
  usage: "...",
  assumptions: ["...", "..."],
  cite: "Author (Year). Title. Journal.",
},
```

### Step 3: Verify

```bash
pnpm test                         # ensure all tests pass
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
pnpm test                        # verify 0 failures
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
