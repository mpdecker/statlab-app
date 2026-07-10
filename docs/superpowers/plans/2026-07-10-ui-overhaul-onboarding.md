# UI Overhaul + Onboarding Tutorial Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize StatLab's workbench into a four-region layout (left Navigator,
middle-top Viz, middle-bottom Calculation & Interface, right collapsible Advanced),
replace the top-bar dataset pill row with a Sample Datasets picker popover, and add
a first-run guided tutorial.

**Architecture:** Three new self-contained, independently-tested components
(`ResizableBand`, `DatasetPicker`, `Tutorial`) plus one small enhancement to the
existing `ResizablePanel`. `App.jsx` is restructured to compose these into the new
layout; `InferenceConfig` loses its now-relocated alpha control. No changes to
`statlab` computation, chart components, or dataset data files.

**Tech Stack:** React 18, Vite, Vitest + @testing-library/react (happy-dom for
DOM-rendering tests), PapaParse, `statlab` npm package.

## Global Constraints

- No new npm dependencies — implement the tutorial spotlight/overlay with plain
  SVG + CSS, no animation/tour library.
- Every new component file gets its own `*.test.jsx` in the same directory,
  following the existing `// @vitest-environment happy-dom` + `@testing-library/react`
  pattern (see `src/components/ExplorePanel.test.jsx`, `src/components/ResizablePanel.test.jsx`).
- Preserve all existing localStorage-persisted user data where reasonably possible;
  it is acceptable (and intended, per this plan) for the Advanced panel to use a
  fresh storage key rather than inherit the old Config panel's saved width.
- `InferenceConfig`, `InferenceResults`, `Navigator`, `ExplorePanel` keep their
  existing prop signatures **except** the one explicit `alpha`/`setAlpha` removal
  from `InferenceConfig` specified in Task 1 — do not change any other prop.
- Run `pnpm test` (full suite) after every task; it must show 0 failures before
  moving to the next task.

---

### Task 1: Remove the alpha control from `InferenceConfig`

`alpha` is the one setting in this codebase that is genuinely global (a single
`useState` in `useInference`, `src/components/InferencePanel.jsx:523`), so per the
design it moves to the new Advanced panel. Confirmed by grep: `alpha` is used
nowhere else inside `InferenceConfig.jsx` besides its own destructure and the
`<Inp>` render — safe to delete outright.

**Files:**
- Modify: `src/components/InferenceConfig.jsx:8` and `:743`
- Modify: `src/components/InferenceConfig.test.jsx:248`

**Interfaces:**
- Produces: `InferenceConfig({ active, ds, data, state, set, width, borderRight })`
  — `alpha`/`setAlpha` removed from the prop list. All later tasks that render
  `InferenceConfig` must NOT pass `alpha`/`setAlpha`.

- [ ] **Step 1: Update the failing call site in the test first**

In `src/components/InferenceConfig.test.jsx`, replace:

```jsx
    const { container } = render(
      <InferenceConfig active="t_welch" alpha={0.05} setAlpha={noop} ds={mockDs} data={[]} state={mockState} set={noop} />
    );
```

with:

```jsx
    const { container } = render(
      <InferenceConfig active="t_welch" ds={mockDs} data={[]} state={mockState} set={noop} />
    );
```

- [ ] **Step 2: Run the test to confirm it still passes (extra props were harmless, so this should already pass)**

Run: `pnpm exec vitest run src/components/InferenceConfig.test.jsx`
Expected: PASS (0 failures) — this step just confirms the baseline before the source change.

- [ ] **Step 3: Remove the alpha control from the component**

In `src/components/InferenceConfig.jsx`, change the export signature from:

```js
export function InferenceConfig({ active, alpha, setAlpha, ds, data, state, set, width = '100%', borderRight = false }) {
```

to:

```js
export function InferenceConfig({ active, ds, data, state, set, width = '100%', borderRight = false }) {
```

Then remove this line (immediately before `{configMap[active] || ...}` in the
returned JSX):

```jsx
      <Inp label="α (significance)" value={alpha} onChange={setAlpha} width={65} />
```

- [ ] **Step 4: Run tests to verify everything still passes**

Run: `pnpm test`
Expected: PASS, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/components/InferenceConfig.jsx src/components/InferenceConfig.test.jsx
git commit -m "refactor: move alpha control out of InferenceConfig ahead of UI overhaul"
```

---

### Task 2: Add DOM attribute passthrough to `ResizablePanel`

The tutorial overlay locates regions via `document.querySelector('[data-tutorial-target="…"]')`.
`ResizablePanel` wraps Navigator/Advanced in this plan, so it needs to forward
arbitrary extra props (like `data-tutorial-target`) onto its root `<div>`.

**Files:**
- Modify: `src/components/ResizablePanel.jsx:20-33` (signature) and `:104-120` (root div)
- Test: `src/components/ResizablePanel.test.jsx`

**Interfaces:**
- Produces: `ResizablePanel` now accepts and forwards any additional DOM props
  (e.g. `data-tutorial-target`) to its outermost `<div>`. All existing named
  props are unchanged.

- [ ] **Step 1: Write the failing test**

Append to `src/components/ResizablePanel.test.jsx`:

```jsx
  test('forwards extra DOM attributes to the root element', () => {
    const { container } = render(
      <ResizablePanel defaultWidth={200} data-tutorial-target="navigator">
        <div>Child content</div>
      </ResizablePanel>
    );
    expect(container.querySelector('[data-tutorial-target="navigator"]')).toBeTruthy();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/ResizablePanel.test.jsx`
Expected: FAIL — `data-tutorial-target` attribute not found (React drops unknown
props that aren't explicitly spread).

- [ ] **Step 3: Forward extra props**

In `src/components/ResizablePanel.jsx`, change the function signature from:

```js
export function ResizablePanel({
  title,
  collapsed,
  onToggleCollapse,
  width,
  minWidth = 100,
  maxWidth = 600,
  defaultWidth = 240,
  onResize,
  side = 'right',
  storageKey,
  collapsedRender,
  children,
}) {
```

to:

```js
export function ResizablePanel({
  title,
  collapsed,
  onToggleCollapse,
  width,
  minWidth = 100,
  maxWidth = 600,
  defaultWidth = 240,
  onResize,
  side = 'right',
  storageKey,
  collapsedRender,
  children,
  ...rest
}) {
```

Then change the root `<div>` (the one with `className="no-print"` and the big
`style={{...}}` object right after the `if (collapsed && !collapsedRender) return null;`
line) from:

```jsx
    <div
      className="no-print"
      style={{
        width: collapsed ? collapsedWidth : effectiveWidth,
        minWidth: collapsed ? 0 : minWidth,
        maxWidth: collapsed ? collapsedWidth : maxWidth,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
        transition: 'width 200ms ease',
        position: 'relative',
        borderRight: side === 'right' ? `1px solid ${C.border}` : 'none',
        borderLeft: side === 'left' ? `1px solid ${C.border}` : 'none',
      }}
    >
```

to:

```jsx
    <div
      className="no-print"
      style={{
        width: collapsed ? collapsedWidth : effectiveWidth,
        minWidth: collapsed ? 0 : minWidth,
        maxWidth: collapsed ? collapsedWidth : maxWidth,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
        transition: 'width 200ms ease',
        position: 'relative',
        borderRight: side === 'right' ? `1px solid ${C.border}` : 'none',
        borderLeft: side === 'left' ? `1px solid ${C.border}` : 'none',
      }}
      {...rest}
    >
```

- [ ] **Step 4: Run the full suite to verify it passes and nothing else broke**

Run: `pnpm test`
Expected: PASS, 0 failures (includes both `ResizablePanel.test.jsx` tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ResizablePanel.jsx src/components/ResizablePanel.test.jsx
git commit -m "feat: forward extra DOM props from ResizablePanel for tutorial targeting"
```

---

### Task 3: `ResizableBand` component (height-resizable, collapsible band)

A new sibling to `ResizablePanel` for the bottom Calculation & Interface band:
resize by dragging its top edge, collapse to a thin header-only strip via a
chevron (title bar always stays visible so it's always reachable, unlike
`ResizablePanel` which fully unmounts on collapse unless given `collapsedRender`).

**Files:**
- Create: `src/components/ResizableBand.jsx`
- Test: `src/components/ResizableBand.test.jsx`

**Interfaces:**
- Produces: `ResizableBand({ title, collapsed, onToggleCollapse, height, minHeight, maxHeight, defaultHeight, onResize, storageKey, children, ...rest })`
  — mirrors `ResizablePanel`'s width props but for height, forwards `...rest`
  to its root `<div>` (same pattern as Task 2), and always renders its title
  bar (with a collapse/expand chevron button) even when `collapsed`.
- Consumes: `C` from `../palette.js` (same as `ResizablePanel`).

- [ ] **Step 1: Write the failing test**

Create `src/components/ResizableBand.test.jsx`:

```jsx
// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ResizableBand } from './ResizableBand.jsx';

describe('ResizableBand', () => {
  test('renders children when expanded', () => {
    const { getByText } = render(
      <ResizableBand title="Calc" defaultHeight={300} minHeight={120}>
        <div>Band content</div>
      </ResizableBand>
    );
    expect(getByText('Band content')).toBeTruthy();
  });

  test('hides children but keeps the title bar when collapsed', () => {
    const { queryByText, getByText } = render(
      <ResizableBand title="Calculation & Interface" collapsed onToggleCollapse={() => {}}>
        <div>Band content</div>
      </ResizableBand>
    );
    expect(queryByText('Band content')).toBeNull();
    expect(getByText('Calculation & Interface')).toBeTruthy();
  });

  test('clicking the chevron calls onToggleCollapse', () => {
    const onToggleCollapse = vi.fn();
    const { getByTitle } = render(
      <ResizableBand title="Calc" collapsed onToggleCollapse={onToggleCollapse}>
        <div>Band content</div>
      </ResizableBand>
    );
    fireEvent.click(getByTitle('Expand Calc'));
    expect(onToggleCollapse).toHaveBeenCalled();
  });

  test('forwards extra DOM attributes to the root element', () => {
    const { container } = render(
      <ResizableBand title="Calc" data-tutorial-target="calc">
        <div>x</div>
      </ResizableBand>
    );
    expect(container.querySelector('[data-tutorial-target="calc"]')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/ResizableBand.test.jsx`
Expected: FAIL — `Cannot find module './ResizableBand.jsx'`.

- [ ] **Step 3: Implement `ResizableBand`**

Create `src/components/ResizableBand.jsx`:

```jsx
import { useState, useRef, useCallback, useEffect } from 'react';
import { C } from '../palette.js';

const mono = { fontFamily: "'IBM Plex Mono', monospace" };
const LS_PREFIX = 'statlab_band_v1.';

function loadHeight(key, fallback) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (raw != null) { const v = JSON.parse(raw); if (typeof v === 'number') return v; }
  } catch { /* ignore */ }
  return fallback;
}

function saveHeight(key, h) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(h)); } catch { /* ignore */ }
}

export function ResizableBand({
  title,
  collapsed,
  onToggleCollapse,
  height,
  minHeight = 120,
  maxHeight = 600,
  defaultHeight = 260,
  onResize,
  storageKey,
  children,
  ...rest
}) {
  const [internalHeight, setInternalHeight] = useState(() =>
    height != null ? height : loadHeight(storageKey, defaultHeight)
  );
  const [dragging, setDragging] = useState(false);
  const dragInfo = useRef(null);

  const effectiveHeight = height != null ? height : internalHeight;

  const beginDrag = useCallback((clientY) => {
    setDragging(true);
    dragInfo.current = { startY: clientY, startHeight: effectiveHeight };
    document.body.style.userSelect = 'none';
  }, [effectiveHeight]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    beginDrag(e.clientY);
  }, [beginDrag]);

  const handleTouchStart = useCallback((e) => {
    const t = e.touches[0];
    if (t) beginDrag(t.clientY);
  }, [beginDrag]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (clientY) => {
      const info = dragInfo.current;
      if (!info) return;
      const delta = info.startY - clientY;
      const newHeight = Math.max(minHeight, Math.min(maxHeight, info.startHeight + delta));
      if (height == null) setInternalHeight(newHeight);
      onResize?.(newHeight);
    };

    const handleMouseMove = (e) => onMove(e.clientY);
    const handleTouchMove = (e) => { const t = e.touches[0]; if (t) onMove(t.clientY); };

    const endDrag = () => {
      const info = dragInfo.current;
      if (info && storageKey) saveHeight(storageKey, height != null ? height : internalHeight);
      setDragging(false);
      dragInfo.current = null;
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', endDrag);
    document.addEventListener('touchcancel', endDrag);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', endDrag);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', endDrag);
      document.removeEventListener('touchcancel', endDrag);
    };
  }, [dragging, minHeight, maxHeight, height, onResize, storageKey, internalHeight]);

  const handleDoubleClick = useCallback(() => {
    onToggleCollapse?.();
  }, [onToggleCollapse]);

  return (
    <div
      className="no-print"
      style={{
        height: collapsed ? 28 : effectiveHeight,
        minHeight: collapsed ? 28 : minHeight,
        maxHeight: collapsed ? 28 : maxHeight,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
        transition: 'height 200ms ease',
        position: 'relative',
        borderTop: `1px solid ${C.border}`,
      }}
      {...rest}
    >
      {!collapsed && (
        <div
          className="no-print"
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          onTouchStart={handleTouchStart}
          style={{
            position: 'absolute', left: 0, right: 0, top: -2, height: 4,
            cursor: 'row-resize',
            background: dragging ? C.accent : 'transparent',
            transition: 'background 150ms',
            zIndex: 10,
          }}
          onMouseEnter={(e) => { if (!dragging) e.currentTarget.style.background = C.border; }}
          onMouseLeave={(e) => { if (!dragging) e.currentTarget.style.background = 'transparent'; }}
        />
      )}

      <div style={{
        padding: '4px 8px',
        borderBottom: collapsed ? 'none' : `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', gap: 6,
        flexShrink: 0, cursor: 'default',
      }}>
        <span style={{ fontSize: 8, color: C.dim, ...mono, textTransform: 'uppercase', letterSpacing: '.1em', flex: 1 }}>
          {title}
        </span>
        <button
          onClick={onToggleCollapse}
          title={collapsed ? `Expand ${title}` : `Collapse ${title}`}
          style={{
            background: 'transparent', border: 'none', color: C.dim,
            cursor: 'pointer', fontSize: 10, ...mono, padding: 0, lineHeight: 1,
          }}
        >
          {collapsed ? '▲' : '▼'}
        </button>
      </div>

      {!collapsed && (
        <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {children}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the full suite to verify it passes and nothing else broke**

Run: `pnpm test`
Expected: PASS, 0 failures (includes all 4 `ResizableBand.test.jsx` tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ResizableBand.jsx src/components/ResizableBand.test.jsx
git commit -m "feat: add ResizableBand, a height-resizable collapsible panel"
```

---

### Task 4: `DatasetPicker` component

Replaces the top-bar dataset pill row with a single button that opens a popover
listing all built-in datasets (plus a pinned custom-upload entry when present).

**Files:**
- Create: `src/components/DatasetPicker.jsx`
- Test: `src/components/DatasetPicker.test.jsx`

**Interfaces:**
- Produces: `DatasetPicker({ datasets, activeKey, activeLabel, activeCount, customEntry, onSelect })`
  where `datasets` is an array of `[key, { label, desc }]` pairs (i.e. the result
  of `Object.entries(BUILTIN)` from `src/data/datasets.js`), `customEntry` is
  either `null` or `{ label, desc }` for the currently-loaded custom CSV, and
  `onSelect(key)` is called (with `'custom'` for the pinned entry) when a row
  is clicked. Renders a root `<div data-tutorial-target="dataset">` — App.jsx
  does not need to add this attribute itself.

- [ ] **Step 1: Write the failing test**

Create `src/components/DatasetPicker.test.jsx`:

```jsx
// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { DatasetPicker } from './DatasetPicker.jsx';

const datasets = [
  ['iris', { label: 'Iris', desc: '150 flowers · Fisher 1936' }],
  ['diamonds', { label: 'Diamonds', desc: '200 diamonds · cut/color/price' }],
];

describe('DatasetPicker', () => {
  test('shows the active dataset label and row count on the closed button', () => {
    const { getByText } = render(
      <DatasetPicker datasets={datasets} activeKey="iris" activeLabel="Iris" activeCount={150} onSelect={() => {}} />
    );
    expect(getByText(/Iris/)).toBeTruthy();
    expect(getByText(/n=150/)).toBeTruthy();
  });

  test('opens a popover listing all datasets and calls onSelect on click', () => {
    const onSelect = vi.fn();
    const { getByText, queryByText } = render(
      <DatasetPicker datasets={datasets} activeKey="iris" activeLabel="Iris" activeCount={150} onSelect={onSelect} />
    );
    expect(queryByText('Diamonds')).toBeNull();
    fireEvent.click(getByText(/Iris/));
    expect(getByText('Diamonds')).toBeTruthy();
    fireEvent.click(getByText('Diamonds'));
    expect(onSelect).toHaveBeenCalledWith('diamonds');
  });

  test('pins a custom upload entry above the built-ins when present', () => {
    const { getByText } = render(
      <DatasetPicker
        datasets={datasets} activeKey="custom" activeLabel="mydata" activeCount={40}
        customEntry={{ label: 'mydata', desc: '40 rows · custom' }}
        onSelect={() => {}}
      />
    );
    fireEvent.click(getByText(/mydata/));
    expect(getByText(/mydata/)).toBeTruthy();
  });

  test('renders a data-tutorial-target="dataset" root element', () => {
    const { container } = render(
      <DatasetPicker datasets={datasets} activeKey="iris" activeLabel="Iris" activeCount={150} onSelect={() => {}} />
    );
    expect(container.querySelector('[data-tutorial-target="dataset"]')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/DatasetPicker.test.jsx`
Expected: FAIL — `Cannot find module './DatasetPicker.jsx'`.

- [ ] **Step 3: Implement `DatasetPicker`**

Create `src/components/DatasetPicker.jsx`:

```jsx
import { useState, useRef, useEffect } from 'react';
import { C } from '../palette.js';

const mono = { fontFamily: "'IBM Plex Mono', monospace" };

export function DatasetPicker({ datasets, activeKey, activeLabel, activeCount, customEntry, onSelect }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const rows = [
    ...(customEntry ? [{ key: 'custom', label: customEntry.label, desc: customEntry.desc, isCustom: true }] : []),
    ...datasets.map(([key, d]) => ({ key, label: d.label, desc: d.desc, isCustom: false })),
  ];

  return (
    <div ref={rootRef} style={{ position: 'relative' }} data-tutorial-target="dataset">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'transparent', border: `1px solid ${C.border}`, color: C.text,
          ...mono, fontSize: 10, padding: '3px 8px', borderRadius: 3, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <span>{`${activeLabel} · n=${activeCount}`}</span>
        <span style={{ color: C.dim, fontSize: 8 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 100,
          background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4,
          width: 260, maxHeight: 360, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,.5)',
        }}>
          <div style={{ padding: '6px 10px', fontSize: 7, color: C.dim, ...mono, textTransform: 'uppercase', letterSpacing: '.1em', borderBottom: `1px solid ${C.border}` }}>
            Sample datasets
          </div>
          {rows.map(row => (
            <button
              key={row.key}
              type="button"
              onClick={() => { onSelect(row.key); setOpen(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                background: row.key === activeKey ? 'rgba(196,255,0,.08)' : 'transparent',
                border: 'none', borderBottom: `1px solid ${C.border}`,
                color: row.key === activeKey ? C.accent : C.text,
                padding: '6px 10px', cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 600 }}>
                {`${row.isCustom ? '✓ ' : ''}${row.label}`}
              </div>
              <div style={{ fontSize: 8, color: C.dim, ...mono }}>{row.desc}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the full suite to verify it passes and nothing else broke**

Run: `pnpm test`
Expected: PASS, 0 failures (includes all 4 `DatasetPicker.test.jsx` tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/DatasetPicker.jsx src/components/DatasetPicker.test.jsx
git commit -m "feat: add DatasetPicker popover for browsing sample datasets"
```

---

### Task 5: `Tutorial` component

The first-run guided overlay. Self-contained: computes its own spotlight
target rects from `data-tutorial-target` attributes already produced by
`DatasetPicker` (Task 4) and about to be added to the four workbench regions
in Task 6.

**Files:**
- Create: `src/components/Tutorial.jsx`
- Test: `src/components/Tutorial.test.jsx`

**Interfaces:**
- Produces:
  - `Tutorial({ open, onClose, onStepChange })` — renders `null` when `!open`.
    Calls `onStepChange(stepId)` (a string, or `null` when closed) on mount and
    whenever the active step changes. Step ids in order:
    `'welcome' | 'navigator' | 'viz' | 'calc' | 'advanced' | 'dataset'`.
  - `hasTutorialSeen()` — reads `localStorage['statlab_tutorial_v1_seen']`, returns boolean.
  - `markTutorialSeen()` — writes that flag to `'1'`.
- Consumes: `C` from `../palette.js`.

- [ ] **Step 1: Write the failing test**

Create `src/components/Tutorial.test.jsx`:

```jsx
// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Tutorial, hasTutorialSeen, markTutorialSeen } from './Tutorial.jsx';

beforeEach(() => localStorage.clear());

describe('Tutorial', () => {
  test('hasTutorialSeen is false until markTutorialSeen is called', () => {
    expect(hasTutorialSeen()).toBe(false);
    markTutorialSeen();
    expect(hasTutorialSeen()).toBe(true);
  });

  test('renders nothing when closed', () => {
    const { container } = render(<Tutorial open={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  test('shows the welcome step first and advances with Next', () => {
    const { getByText } = render(<Tutorial open onClose={() => {}} />);
    expect(getByText('Welcome to StatLab')).toBeTruthy();
    fireEvent.click(getByText('Next'));
    expect(getByText('Pick a test')).toBeTruthy();
  });

  test('Back returns to the previous step', () => {
    const { getByText } = render(<Tutorial open onClose={() => {}} />);
    fireEvent.click(getByText('Next'));
    fireEvent.click(getByText('Back'));
    expect(getByText('Welcome to StatLab')).toBeTruthy();
  });

  test('Skip marks the tutorial seen and closes', () => {
    const onClose = vi.fn();
    const { getByText } = render(<Tutorial open onClose={onClose} />);
    fireEvent.click(getByText('Skip'));
    expect(hasTutorialSeen()).toBe(true);
    expect(onClose).toHaveBeenCalled();
  });

  test('Finish on the last step marks seen and closes', () => {
    const onClose = vi.fn();
    const { getByText } = render(<Tutorial open onClose={onClose} />);
    for (let i = 0; i < 5; i++) fireEvent.click(getByText('Next'));
    expect(getByText('Try other datasets')).toBeTruthy();
    fireEvent.click(getByText('Finish'));
    expect(hasTutorialSeen()).toBe(true);
    expect(onClose).toHaveBeenCalled();
  });

  test('calls onStepChange with the current step id', () => {
    const onStepChange = vi.fn();
    render(<Tutorial open onClose={() => {}} onStepChange={onStepChange} />);
    expect(onStepChange).toHaveBeenCalledWith('welcome');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/Tutorial.test.jsx`
Expected: FAIL — `Cannot find module './Tutorial.jsx'`.

- [ ] **Step 3: Implement `Tutorial`**

Create `src/components/Tutorial.jsx`:

```jsx
import { useState, useEffect, useCallback } from 'react';
import { C } from '../palette.js';

const mono = { fontFamily: "'IBM Plex Mono', monospace" };

const TUTORIAL_KEY = 'statlab_tutorial_v1_seen';

export function hasTutorialSeen() {
  try { return localStorage.getItem(TUTORIAL_KEY) === '1'; } catch { return false; }
}

export function markTutorialSeen() {
  try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch { /* ignore */ }
}

const STEPS = [
  { id: 'welcome', target: null, title: 'Welcome to StatLab', body: 'A quick tour of the workbench, using the built-in Iris dataset and a Welch t-test as an example.' },
  { id: 'navigator', target: 'navigator', title: 'Pick a test', body: 'Browse or search 84+ statistical tests here. Selecting one drives the chart, parameters, and results.' },
  { id: 'viz', target: 'viz', title: 'See your data', body: 'The chart updates automatically for the active test. Switch to EXPLORE for free-form charting of the whole dataset.' },
  { id: 'calc', target: 'calc', title: 'Configure and read results', body: 'Set test parameters on the left and read APA-ready results, tables, and diagnostics on the right.' },
  { id: 'advanced', target: 'advanced', title: 'Advanced settings', body: 'Map X/Y/Color variables and set the significance level here. Collapse this panel when you don’t need it.' },
  { id: 'dataset', target: 'dataset', title: 'Try other datasets', body: 'Click here anytime to browse the built-in sample datasets — Diamonds, Gapminder, Salaries, and more.' },
];

function useTargetRect(target) {
  const [rect, setRect] = useState(null);
  useEffect(() => {
    if (!target) { setRect(null); return undefined; }
    const measure = () => {
      const el = document.querySelector(`[data-tutorial-target="${target}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener('resize', measure);
    const id = setInterval(measure, 300);
    return () => { window.removeEventListener('resize', measure); clearInterval(id); };
  }, [target]);
  return rect;
}

export function Tutorial({ open, onClose, onStepChange }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const rect = useTargetRect(open ? current.target : null);

  useEffect(() => {
    onStepChange?.(open ? current.id : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, current.id]);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const finish = useCallback(() => {
    markTutorialSeen();
    onClose?.();
  }, [onClose]);

  if (!open) return null;

  const isLast = step === STEPS.length - 1;

  const captionStyle = rect
    ? {
        position: 'fixed',
        top: Math.min(window.innerHeight - 160, rect.bottom + 12),
        left: Math.max(12, Math.min(window.innerWidth - 320, rect.left)),
        width: 300,
      }
    : {
        position: 'fixed', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', width: 320,
      };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000 }}>
      <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <mask id="statlab-tutorial-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left - 6} y={rect.top - 6}
                width={rect.width + 12} height={rect.height + 12}
                rx={6} fill="black"
              />
            )}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(3,6,10,.75)" mask="url(#statlab-tutorial-mask)" />
      </svg>

      <div style={{ ...captionStyle, background: C.panel, border: `1px solid ${C.accent}`, borderRadius: 6, padding: 14, boxShadow: '0 12px 32px rgba(0,0,0,.6)', fontFamily: "'Barlow Condensed', sans-serif" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{current.title}</div>
        <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, marginBottom: 10 }}>{current.body}</div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ width: 6, height: 6, borderRadius: '50%', background: i === step ? C.accent : C.border }} />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button"
            onClick={finish}
            style={{ background: 'transparent', border: 'none', color: C.dim, ...mono, fontSize: 9, cursor: 'pointer' }}
          >
            Skip
          </button>
          <div style={{ display: 'flex', gap: 6 }}>
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.text, ...mono, fontSize: 9, padding: '4px 10px', borderRadius: 3, cursor: 'pointer' }}
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? finish() : setStep(s => s + 1))}
              style={{ background: C.accent, border: 'none', color: '#000', ...mono, fontSize: 9, fontWeight: 700, padding: '4px 12px', borderRadius: 3, cursor: 'pointer' }}
            >
              {isLast ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the full suite to verify it passes and nothing else broke**

Run: `pnpm test`
Expected: PASS, 0 failures (includes all 7 `Tutorial.test.jsx` tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/Tutorial.jsx src/components/Tutorial.test.jsx
git commit -m "feat: add first-run guided Tutorial overlay"
```

---

### Task 6: Restructure `App.jsx` into the four-region workbench

This is one atomic change to a single file — a half-migrated `App.jsx` won't
compile, so it isn't splittable into separately-committable sub-tasks. Work
through the steps in order; only run the test suite / start the dev server
once all steps are applied.

**Files:**
- Create: `src/App.test.jsx`
- Modify: `src/App.jsx` (throughout — see steps)

**Interfaces:**
- Consumes: `ResizableBand` from `./components/ResizableBand.jsx` (Task 3),
  `DatasetPicker` from `./components/DatasetPicker.jsx` (Task 4),
  `Tutorial`/`hasTutorialSeen` from `./components/Tutorial.jsx` (Task 5),
  `Sel`/`Inp` from `./components/ui.jsx` (existing, signatures confirmed:
  `Sel({ label, value, onChange, options, width })`, `Inp({ label, value, onChange, width, placeholder })`),
  `ResizablePanel` with its new passthrough props (Task 2), `InferenceConfig`
  without `alpha`/`setAlpha` (Task 1).
- Produces: no other file depends on `App.jsx`'s internals — it's the root
  component rendered by `src/main.jsx`.

- [ ] **Step 1: Write the failing smoke test**

Create `src/App.test.jsx`:

```jsx
// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import App from './App.jsx';

beforeEach(() => localStorage.clear());

describe('App', () => {
  test('renders the landing page before launch', () => {
    const { getByText } = render(<App />);
    expect(getByText(/LAUNCH APP/)).toBeTruthy();
  });

  test('after launch, renders all four workbench regions and the dataset picker', () => {
    localStorage.setItem('statlab_session_v2', JSON.stringify({ dsKey: 'iris', activeTest: 't_welch' }));
    const { container } = render(<App />);
    // hasLaunched is only true once a session was saved via handleLaunch, so
    // simulate a returning user by pre-seeding the session key above and
    // re-rendering after the landing page's own launch button (present on
    // first render regardless of saved session, per getInitialState).
    expect(container.querySelector('[data-tutorial-target="dataset"]')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify the first assertion passes and note the second needs the app "launched"**

Run: `pnpm exec vitest run src/App.test.jsx`
Expected: the first test passes (landing page always shows first); the second
fails because `hasLaunched` starts `false` until the user clicks "LAUNCH APP →"
regardless of a pre-seeded session (see `getInitialState`/`hasLaunched` in
`src/App.jsx`). Fix the test instead of the app — click launch first:

Replace the second test with:

```jsx
  test('after launch, renders all four workbench regions and the dataset picker', () => {
    const { getByText, container } = render(<App />);
    fireEvent.click(getByText(/LAUNCH APP/));
    expect(container.querySelector('[data-tutorial-target="navigator"]')).toBeTruthy();
    expect(container.querySelector('[data-tutorial-target="viz"]')).toBeTruthy();
    expect(container.querySelector('[data-tutorial-target="calc"]')).toBeTruthy();
    expect(container.querySelector('[data-tutorial-target="advanced"]')).toBeTruthy();
    expect(container.querySelector('[data-tutorial-target="dataset"]')).toBeTruthy();
  });
```

and add `fireEvent` to the `@testing-library/react` import.

Run: `pnpm exec vitest run src/App.test.jsx`
Expected: FAIL — none of the `data-tutorial-target` attributes exist yet in the
current `App.jsx`. This confirms the test correctly drives the rest of Task 6.

- [ ] **Step 3: Add new imports**

At the top of `src/App.jsx`, in the existing import block (after the
`ResizablePanel` import), add:

```js
import { ResizableBand } from './components/ResizableBand.jsx';
import { DatasetPicker } from './components/DatasetPicker.jsx';
import { Tutorial, hasTutorialSeen } from './components/Tutorial.jsx';
import { Sel, Inp } from './components/ui.jsx';
```

- [ ] **Step 4: Add a vertical-label style constant**

Immediately after the existing `const mono = { fontFamily: "'IBM Plex Mono', monospace" };`
line near the top of the file, add:

```js
const vLabel = { writingMode: 'vertical-rl', fontSize: 9, color: C.dim, ...mono, letterSpacing: '.1em', textTransform: 'uppercase' };
```

- [ ] **Step 5: Restructure `usePanelLayout`**

Replace the whole `defaultPanelLayout` / `getBreakpointLayout` / `usePanelLayout`
block (currently spanning roughly lines 190-237) with:

```js
// ── Panel layout hook ────────────────────────────────────────────────────────
const defaultPanelLayout = {
  navigator: { width: 240, visible: true },
  advanced: { width: 280, visible: false },
  calc: { height: 260, visible: true },
};

function getBreakpointLayout() {
  const w = window.innerWidth;
  const layout = JSON.parse(JSON.stringify(defaultPanelLayout));
  if (w < 1024) layout.navigator.visible = false;
  return layout;
}

function usePanelLayout() {
  const [layout, setLayout] = useState(() => {
    try {
      const raw = localStorage.getItem('statlab_panels_v1');
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return getBreakpointLayout();
  });

  useEffect(() => {
    try { localStorage.setItem('statlab_panels_v1', JSON.stringify(layout)); } catch { /* ignore */ }
  }, [layout]);

  const toggleVisible = useCallback((key) => setLayout(prev => ({
    ...prev, [key]: { ...prev[key], visible: !prev[key].visible }
  })), []);
  const setPanelWidth = useCallback((key) => (w) => setLayout(prev => ({
    ...prev, [key]: { ...prev[key], width: w }
  })), []);
  const setCalcHeight = useCallback((h) => setLayout(prev => ({
    ...prev, calc: { ...prev.calc, height: h }
  })), []);
  const resetPanels = useCallback(() => setLayout(getBreakpointLayout()), []);

  return { layout, toggleVisible, setPanelWidth, setCalcHeight, resetPanels };
}
```

- [ ] **Step 6: Rewrite the `Header` function**

Replace the entire existing `Header` function (currently roughly lines 240-338,
from `function Header({ ... }) {` through its closing `}`) with:

```jsx
// ── Header ────────────────────────────────────────────────────────────────────
function Header({ dsKey, customDef, switchDs, fileRef, handleCSV, uploadMsg, datasetStatus, ds, data, onOpenTutorial }) {
  return (
    <div style={{ padding: '7px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
      {/* Wordmark */}
      <div style={{ lineHeight: 1, marginRight: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '.05em', color: '#fff' }}>
          STAT<span style={{ color: C.accent }}>LAB</span>
        </div>
        <div style={{ fontSize: 8, color: C.dim, ...mono }}>{`v7 · ${TOTAL_TEST_COUNT} tests · social science edition`}</div>
      </div>

      <DatasetPicker
        datasets={Object.entries(BUILTIN)}
        activeKey={dsKey}
        activeLabel={ds?.label ?? ''}
        activeCount={data.length}
        customEntry={customDef ? { label: customDef.label, desc: customDef.desc } : null}
        onSelect={switchDs}
      />

      {datasetStatus === 'loading' && (
        <span style={{ fontSize: 9, color: C.warn, ...mono }}>loading dataset…</span>
      )}

      {/* CSV upload */}
      <button
        onClick={() => fileRef.current.click()}
        style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.text, ...mono, fontSize: 9, padding: '3px 8px', borderRadius: 3, cursor: 'pointer' }}
      >
        + CSV
      </button>
      <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} style={{ display: 'none' }} />
      {uploadMsg && <span style={{ fontSize: 9, color: C.accent, ...mono }}>{uploadMsg}</span>}

      <button
        onClick={onOpenTutorial}
        title="Replay tutorial"
        aria-label="Replay tutorial"
        style={{
          marginLeft: 'auto', background: 'transparent', border: `1px solid ${C.border}`, color: C.dim,
          ...mono, fontSize: 11, width: 22, height: 22, borderRadius: '50%', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
        }}
      >
        ?
      </button>
    </div>
  );
}
```

Note: the `QuickView` function directly below `Header` in the file is
untouched by this step — leave it exactly as-is, it's reused by `VizRegion`
in Step 8.

- [ ] **Step 7: Update `getInitialState`, session persistence, and mode-switch handlers**

Replace the `getInitialState` function with:

```js
function getInitialState() {
  const saved = loadSession();
  return {
    dsKey:      saved?.dsKey      || 'iris',
    xVar:       saved?.xVar       || 'sepalLength',
    yVar:       saved?.yVar       || 'petalLength',
    colorVar:   saved?.colorVar   || 'species',
    activeTest: saved?.activeTest || 't_welch',
    vizMode:    saved?.vizMode    || 'auto',
    hasLaunched: !!saved,
  };
}
```

In the `App` component body, replace:

```js
  const [activeTab, setActiveTab] = useState(init.activeTab);
```

with:

```js
  const [vizMode, setVizMode] = useState(init.vizMode);
  const [tutorialOpen, setTutorialOpen] = useState(() => !hasTutorialSeen());
  const forcedAdvancedRef = useRef(false);
```

Replace the session-persistence `useEffect` body and `handleLaunch`:

```js
  useEffect(() => {
    saveSession({ dsKey, xVar, yVar, colorVar, activeTest, vizMode });
  }, [dsKey, xVar, yVar, colorVar, activeTest, vizMode]);

  const handleLaunch = useCallback(() => {
    setHasLaunched(true);
    saveSession({ dsKey, xVar, yVar, colorVar, activeTest, vizMode });
  }, [dsKey, xVar, yVar, colorVar, activeTest, vizMode]);
```

Replace `handleTabSwitch` with `handleVizModeSwitch`:

```js
  const handleVizModeSwitch = useCallback(mode => {
    if (mode === 'explore' && vizMode === 'auto') {
      const chartMode_ = CHART_FOR_TEST[activeTest] ?? 'scatter';
      const resolved = resolveQuickViewVars(activeTest, { xVar, yVar, groupVar: colorVar }, inferenceContext);
      const inc = inferenceContext?.scaleVars?.length
        ? inferenceContext.scaleVars
        : [resolved.xVar, resolved.yVar, ...(ds?.numeric || []).slice(0, 4)];
      setExploreSeed({
        chartType: chartMode_,
        chartLabel: explorePanelChartFromMode(chartMode_),
        chartLabelDisplay: exploreChartLabel(chartMode_),
        xVar: resolved.xVar,
        yVar: resolved.yVar,
        groupVar: resolved.groupVar,
        catX: resolved.catX,
        catY: resolved.catY,
        includeVars: [...inc].filter((v, i, a) => v && a.indexOf(v) === i),
        inferenceResult,
        activeTest,
      });
    }
    setVizMode(mode);
  }, [vizMode, activeTest, xVar, yVar, colorVar, ds, inferenceContext, inferenceResult]);
```

Replace `handleBridgeToInference`:

```js
  const handleBridgeToInference = useCallback(({ row, col }) => {
    setXVar(row);
    setYVar(col);
    setActiveTest('pearson');
    setVizMode('auto');
  }, []);
```

Add a tutorial step-change handler right after `handleBridgeToInference`:

```js
  const handleTutorialStepChange = useCallback((stepId) => {
    if (stepId === 'advanced') {
      if (!panels.layout.advanced.visible) {
        forcedAdvancedRef.current = true;
        panels.toggleVisible('advanced');
      }
    } else if (forcedAdvancedRef.current) {
      forcedAdvancedRef.current = false;
      panels.toggleVisible('advanced');
    }
  }, [panels]);
```

- [ ] **Step 8: Add `VizRegion`, `CalcBand`, and `AdvancedPanel` local components**

Add these three functions directly after the existing `QuickView` function
(i.e. after its closing `}`, before the `// ── Landing page ──` comment):

```jsx
// ── Viz region (AUTO quick-view / EXPLORE free-form) ─────────────────────────
function VizRegion({ vizMode, setVizMode, data, xVar, yVar, colorVar, ds, activeTest, chartMode, setChartMode, inferenceResult, inferenceContext, exploreSeed, onBridgeToInference }) {
  const chipStyle = (active) => ({
    background: active ? 'rgba(196,255,0,.12)' : 'transparent',
    border: `1px solid ${active ? C.accent : C.border}`,
    color: active ? C.accent : C.dim,
    ...mono, fontSize: 9, padding: '3px 10px', borderRadius: 3, cursor: 'pointer', letterSpacing: '.08em',
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 4, padding: '5px 8px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button type="button" onClick={() => setVizMode('auto')} style={chipStyle(vizMode === 'auto')}>AUTO</button>
        <button type="button" onClick={() => setVizMode('explore')} style={chipStyle(vizMode === 'explore')}>EXPLORE</button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {vizMode === 'explore'
          ? <ExplorePanel data={data} ds={ds} seed={exploreSeed} inferenceContext={inferenceContext} onBridgeToInference={onBridgeToInference} />
          : (
            <QuickView
              data={data} xVar={xVar} yVar={yVar} colorVar={colorVar} ds={ds}
              activeTest={activeTest} chartMode={chartMode} setChartMode={setChartMode}
              inferenceResult={inferenceResult} inferenceContext={inferenceContext}
            />
          )}
      </div>
    </div>
  );
}

// ── Calculation & Interface band (Config + Results) ──────────────────────────
function CalcBand({ inference, activeTest, ds, data }) {
  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      <div style={{ width: 260, flexShrink: 0, borderRight: `1px solid ${C.border}`, overflowY: 'auto' }}>
        <InferenceConfig active={activeTest} ds={ds} data={data} state={inference.state} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', minWidth: 0 }}>
        {/* Bootstrap mediation path + CI */}
        {activeTest === 'med_bootstrap' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {inference.medBs && Number.isFinite(inference.medBs.lo) && Number.isFinite(inference.medBs.hi) && <>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[
                  { label: 'indirect a×b', value: inference.medBs.ab.toFixed(5), color: inference.medBs.sig ? C.ok : C.warn },
                  { label: `${Math.round((1 - inference.aval) * 100)}% CI lo`, value: inference.medBs.lo.toFixed(5), color: C.pos },
                  { label: `${Math.round((1 - inference.aval) * 100)}% CI hi`, value: inference.medBs.hi.toFixed(5), color: C.pos },
                  { label: 'CI excl. 0', value: inference.medBs.sig ? 'YES' : 'NO', color: inference.medBs.sig ? C.ok : C.neg },
                  { label: 'B', value: inference.medBs.B, color: C.dim },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3, padding: '3px 8px' }}>
                    <div style={{ fontSize: 7, color: C.dim, ...mono, textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ fontSize: 11, color, ...mono, fontWeight: 600 }}>{value}</div>
                  </div>
                ))}
              </div>
              <div style={{ height: 70 }}>
                <div style={{ fontSize: 8, color: C.dim, ...mono, marginBottom: 2 }}>{'Bootstrap a×b distribution '}(B={inference.medBs.B})</div>
                <div style={{ height: 60, background: C.panel, borderRadius: 3, display: 'flex', alignItems: 'flex-end', padding: '2px 4px', gap: 1, overflow: 'hidden' }}>
                  {(() => {
                    const dist = inference.medBs.dist, lo_ = Math.min(...dist), hi_ = Math.max(...dist), w = (hi_ - lo_) / 24 || 1, cs = Array(24).fill(0);
                    dist.forEach(x => { cs[Math.min(Math.floor((x - lo_) / w), 23)]++; });
                    const maxC = Math.max(...cs, 1);
                    return cs.map((c, i) => (
                      <div key={i} style={{ flex: 1, height: barHeightPct(c, maxC), background: C.warn, opacity: .7, borderRadius: '1px 1px 0 0' }} />
                    ));
                  })()}
                </div>
              </div>
            </>}
            {!inference.medBs && <div style={{ color: C.dim, ...mono, fontSize: 10 }}>Click RUN BOOTSTRAP in the config panel.</div>}
          </div>
        )}

        {/* Bootstrap CI */}
        {activeTest === 'bootstrap' && inference.bsResult?.dist?.length && Number.isFinite(inference.bsResult.lo) && Number.isFinite(inference.bsResult.hi) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[
                { label: inference.bsStat, value: (inference.bsStat === 'mean' ? avg : inference.bsStat === 'median' ? v => { const s = [...v].sort((a, b) => a - b), n = s.length; return n % 2 ? s[Math.floor(n / 2)] : (s[n / 2 - 1] + s[n / 2]) / 2; } : sampleSD)(inference.allTgt).toFixed(4), color: C.accent },
                { label: `${Math.round((1 - inference.aval) * 100)}% CI lo`, value: inference.bsResult.lo.toFixed(4), color: C.pos },
                { label: `${Math.round((1 - inference.aval) * 100)}% CI hi`, value: inference.bsResult.hi.toFixed(4), color: C.pos },
                { label: 'B', value: '1999', color: C.dim },
                { label: 'n', value: inference.allTgt.length, color: C.dim },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3, padding: '3px 8px' }}>
                  <div style={{ fontSize: 7, color: C.dim, ...mono, textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: 11, color, ...mono, fontWeight: 600 }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 8, color: C.dim, ...mono, marginBottom: 2 }}>Bootstrap distribution (B=1999)</div>
            <div style={{ height: 60, background: C.panel, borderRadius: 3, display: 'flex', alignItems: 'flex-end', padding: '2px 4px', gap: 1, overflow: 'hidden' }}>
              {(() => {
                const dist = inference.bsResult.dist, lo_ = Math.min(...dist), hi_ = Math.max(...dist), w = (hi_ - lo_) / 28 || 1, cs = Array(28).fill(0);
                dist.forEach(x => { cs[Math.min(Math.floor((x - lo_) / w), 27)]++; });
                const maxC = Math.max(...cs, 1);
                return cs.map((c, i) => (
                  <div key={i} style={{ flex: 1, height: barHeightPct(c, maxC), background: C.accent, opacity: .7, borderRadius: '1px 1px 0 0' }} />
                ));
              })()}
            </div>
          </div>
        )}

        {/* Power running indicator */}
        {POWER_TESTS_SET.has(activeTest) && inference.powerRunning && (
          <div style={{ color: C.dim, ...mono, fontSize: 10, padding: 8 }}>{'Computing power…'}</div>
        )}

        {/* InferenceResults */}
        {!['bootstrap', 'med_bootstrap'].includes(activeTest) && !(POWER_TESTS_SET.has(activeTest) && inference.powerRunning && !inference.powerResult) && (
          <InferenceResults
            r={inference.result}
            active={activeTest}
            alpha={inference.alpha}
            g1={inference.g1} g2={inference.g2}
            g1vals={inference.g1vals} g2vals={inference.g2vals}
            normG1={inference.normG1} normG2={inference.normG2}
            levene={inference.levene}
            scaleVars={inference.scaleVars}
            ds={ds}
          />
        )}
      </div>
    </div>
  );
}

// ── Advanced panel (variable mapping, global settings, layout reset) ─────────
function AdvancedPanel({ ds, xVar, setXVar, yVar, setYVar, colorVar, setColorVar, alpha, setAlpha, onResetLayout }) {
  const numeric     = ds?.numeric     || [];
  const categorical = ds?.categorical || [];
  return (
    <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', height: '100%' }}>
      <div>
        <div style={{ fontSize: 7, color: C.dim, ...mono, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Variable mapping</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Sel label="X" value={xVar} onChange={setXVar} options={[...numeric, ...categorical]} width="100%" />
          <Sel label="Y" value={yVar} onChange={setYVar} options={numeric} width="100%" />
          <Sel label="Color" value={colorVar} onChange={setColorVar} options={['(none)', ...categorical]} width="100%" />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 7, color: C.dim, ...mono, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 6 }}>Global settings</div>
        <Inp label="α (significance)" value={alpha} onChange={setAlpha} width={70} />
      </div>
      <button
        type="button"
        onClick={onResetLayout}
        style={{ marginTop: 'auto', background: 'transparent', border: `1px solid ${C.border}`, color: C.dim, ...mono, fontSize: 9, padding: '5px 8px', borderRadius: 3, cursor: 'pointer' }}
      >
        Reset panel layout
      </button>
    </div>
  );
}
```

- [ ] **Step 9: Rewrite the main return JSX**

Replace everything from `if (!hasLaunched) {` through the end of the `return (...)`
statement (i.e. the rest of the `App` function body) with:

```jsx
  if (!hasLaunched) {
    return <LandingPage onLaunch={handleLaunch} />;
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.bg, fontFamily: "'Barlow Condensed', sans-serif", color: C.text, overflow: 'hidden' }}>
      <style>{FONTS}</style>
      <style>{GLOBAL_CSS}</style>

      {narrowScreen && !dismissedNarrowNotice && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, background: C.bg,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 16, padding: 32, textAlign: 'center', fontFamily: "'Barlow Condensed', sans-serif",
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>StatLab works best on a larger screen</div>
          <div style={{ fontSize: 14, color: C.dim, maxWidth: 320, lineHeight: 1.5 }}>
            The multi-panel workbench layout isn't optimized for narrow viewports yet.
            For the full experience, open this on a tablet or desktop.
          </div>
          <button
            onClick={() => setDismissedNarrowNotice(true)}
            style={{ background: C.accent, color: C.bg, border: 'none', borderRadius: 4, padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', ...{ fontFamily: "'Barlow Condensed', sans-serif" } }}
          >
            Continue anyway
          </button>
        </div>
      )}

      <Header
        dsKey={dsKey} customDef={customDef} switchDs={switchDs}
        fileRef={fileRef} handleCSV={handleCSV} uploadMsg={uploadMsg} datasetStatus={datasetStatus}
        ds={ds} data={data}
        onOpenTutorial={() => setTutorialOpen(true)}
      />

      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <ResizablePanel
          title="Navigator"
          collapsed={!panels.layout.navigator.visible}
          onToggleCollapse={() => panels.toggleVisible('navigator')}
          width={panels.layout.navigator.width}
          minWidth={160}
          maxWidth={500}
          defaultWidth={240}
          onResize={panels.setPanelWidth('navigator')}
          side="right"
          storageKey="nav"
          collapsedRender={<span style={vLabel}>NAVIGATOR</span>}
          data-tutorial-target="navigator"
        >
          <Navigator active={activeTest} setActive={setActiveTest} />
        </ResizablePanel>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <div data-tutorial-target="viz" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <VizRegion
              vizMode={vizMode} setVizMode={handleVizModeSwitch}
              data={data} xVar={xVar} yVar={yVar} colorVar={colorVar} ds={ds}
              activeTest={activeTest} chartMode={chartMode} setChartMode={setChartMode}
              inferenceResult={inferenceResult} inferenceContext={inferenceContext}
              exploreSeed={exploreSeed} onBridgeToInference={handleBridgeToInference}
            />
          </div>

          <ResizableBand
            title="Calculation & Interface"
            collapsed={!panels.layout.calc.visible}
            onToggleCollapse={() => panels.toggleVisible('calc')}
            height={panels.layout.calc.height}
            minHeight={140}
            maxHeight={520}
            defaultHeight={260}
            onResize={panels.setCalcHeight}
            storageKey="calc"
            data-tutorial-target="calc"
          >
            <CalcBand inference={inference} activeTest={activeTest} ds={ds} data={data} />
          </ResizableBand>
        </div>

        <ResizablePanel
          title="Advanced"
          collapsed={!panels.layout.advanced.visible}
          onToggleCollapse={() => panels.toggleVisible('advanced')}
          width={panels.layout.advanced.width}
          minWidth={200}
          maxWidth={420}
          defaultWidth={280}
          onResize={panels.setPanelWidth('advanced')}
          side="left"
          storageKey="adv"
          collapsedRender={<span style={vLabel}>ADVANCED</span>}
          data-tutorial-target="advanced"
        >
          <AdvancedPanel
            ds={ds} xVar={xVar} setXVar={setXVar} yVar={yVar} setYVar={setYVar}
            colorVar={colorVar} setColorVar={setColorVar}
            alpha={inference.alpha} setAlpha={inference.setAlpha}
            onResetLayout={panels.resetPanels}
          />
        </ResizablePanel>
      </div>

      <Tutorial open={tutorialOpen} onClose={() => setTutorialOpen(false)} onStepChange={handleTutorialStepChange} />
    </div>
  );
}
```

- [ ] **Step 10: Run the full test suite**

Run: `pnpm test`
Expected: PASS, 0 failures, including the new `src/App.test.jsx`.

- [ ] **Step 11: Commit**

```bash
git add src/App.jsx src/App.test.jsx
git commit -m "feat: restructure workbench into four-region layout with tutorial and dataset picker"
```

---

### Task 7: Update `README.md` architecture section

**Files:**
- Modify: `README.md:8-33` (Architecture tree/description)

**Interfaces:** none (documentation only).

- [ ] **Step 1: Update the file tree and component list**

In `README.md`, replace the `components/` block inside the architecture code
fence:

```
    └── components/
        ├── ui.jsx               Chip, Sel, Inp, TA, CheckList, Toggle, APABlock, etc.
        ├── charts.jsx            TDistViz, QQPlot, ResidualPlot, Scree, Forest, etc.
        ├── InferenceConfig.jsx  Per-test parameter control panel
        ├── InferenceResults.jsx Result renderer — chips, tables, plots, APA output
        └── InferencePanel.jsx   Orchestrator: Navigator + Config + Results
```

with:

```
    └── components/
        ├── ui.jsx               Chip, Sel, Inp, TA, CheckList, Toggle, APABlock, etc.
        ├── charts.jsx            TDistViz, QQPlot, ResidualPlot, Scree, Forest, etc.
        ├── InferenceConfig.jsx  Per-test parameter control panel
        ├── InferenceResults.jsx Result renderer — chips, tables, plots, APA output
        ├── InferencePanel.jsx   Navigator + useInference hook
        ├── ExplorePanel.jsx     Free-form chart browser (EXPLORE mode of the Viz region)
        ├── ResizablePanel.jsx   Width-resizable, collapsible side panel
        ├── ResizableBand.jsx    Height-resizable, collapsible bottom band
        ├── DatasetPicker.jsx    Sample-datasets popover (top bar)
        └── Tutorial.jsx         First-run guided onboarding overlay
```

Update the paragraph above it (currently describing `App.jsx` as "header,
sidebar, InferencePanel") to:

```
├── App.jsx                 Root component: four-region workbench (Navigator,
│                            Viz, Calculation & Interface band, collapsible
│                            Advanced panel) plus the dataset picker and
│                            first-run tutorial
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update architecture section for the four-region workbench"
```

---

### Task 8: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite with coverage**

Run: `pnpm test:coverage`
Expected: 0 failures; coverage thresholds (90% lines on `src/utils`,
`src/components`, `src/config`, `src/data`) still met.

- [ ] **Step 2: Start the dev server and manually verify in a browser**

Run: `pnpm dev`, open the printed local URL.

Manually check, in order:
1. Clear browser localStorage (devtools → Application → Local Storage → clear), reload.
2. Click "LAUNCH APP →" — the tutorial overlay should appear automatically over the real four-region layout, starting on "Welcome to StatLab".
3. Step through all six steps with Next, confirming the spotlight highlights Navigator, Viz, Calculation & Interface, Advanced (which should auto-expand for its step then collapse again afterward), and the dataset control in turn.
4. Reload the page — the tutorial must not reappear.
5. Click the `?` button in the header — the tutorial replays from the welcome step.
6. Open the dataset control, switch to Diamonds, confirm the workbench updates (chart, results) and the popover closes.
7. In the Viz region, toggle AUTO/EXPLORE and confirm both render correctly and EXPLORE seeds from the active test's variables.
8. Drag the Calculation & Interface band's top edge to resize it, and collapse/expand it via its chevron.
9. Collapse the Navigator and Advanced panels and confirm each leaves a clickable vertical-label strip that reopens it.
10. Reload again and confirm dataset, test, viz mode, and panel layout all persisted.

Expected: all ten checks behave as described, no console errors.

- [ ] **Step 3: Report results**

No commit for this task — it's a verification checkpoint. If any check fails,
open a follow-up task fixing the specific regression before considering the
plan complete.
