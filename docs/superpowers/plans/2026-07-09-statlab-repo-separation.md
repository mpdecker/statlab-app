# StatLab Repo Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the `packages/statlab` stats engine out of this pnpm workspace monorepo into a standalone repo (`github.com/mpdecker/statlab`), publish it to npm as `statlab`, and convert this repo (`github.com/mpdecker/statlab-app`, already renamed) into a flat, single-package Vite app that depends on the published `statlab` npm package.

**Architecture:** `git subtree split` extracts `packages/statlab`'s history into a new repo, which gets its own CI + npm-publish-on-tag workflow. Back in this repo, `packages/statlab` is deleted, `app/*` is flattened to the repo root, and the `workspace:*` dependency becomes a real semver range. A pre-existing app test (`contracts.test.js`) reaches into the engine's internal (unpublished) test fixtures via relative import — those fixture files get copied (not moved) into the app repo with their imports rewritten to the public package API, so the app repo has zero dependency on `packages/statlab` internals once split.

**Tech Stack:** pnpm, Vite, React, Vitest, tsup, GitHub Actions, `gh` CLI, npm registry.

## Global Constraints

- New library repo: `github.com/mpdecker/statlab` (already created, empty).
- This repo: `github.com/mpdecker/statlab-app` (already renamed from `Statlab`; local `origin` remote already updated).
- Published package name: `statlab`, initial version `0.1.0`.
- Publish mechanism: GitHub Actions on `v*` tag push, gated on an `NPM_TOKEN` repo secret the owner adds manually.
- No changes to statistical logic, function signatures, or UI behavior — this is a repo-topology change plus the fixture-decoupling fix described in the spec addendum.
- Full spec: [`docs/superpowers/specs/2026-07-09-statlab-repo-separation-design.md`](../specs/2026-07-09-statlab-repo-separation-design.md).

---

## PART A — Extract the library into `github.com/mpdecker/statlab`

**Before Task 1**, export two shell variables used throughout Part A (adjust `REPO_ROOT` if executing from a different clone/worktree):

```bash
export REPO_ROOT="C:/Development/statlab/.claude/worktrees/vigorous-roentgen-66558d"
export SCRATCH="C:/Users/andth/AppData/Local/Temp/claude/C--Development-statlab--claude-worktrees-vigorous-roentgen-66558d/15374f40-5d93-4c65-a50f-292370543b2e/scratchpad"
mkdir -p "$SCRATCH"
```

### Task 1: Subtree-split `packages/statlab` history and push it to the new repo

**Files:** none modified in this repo (branch + push only). Populates all of `github.com/mpdecker/statlab`'s `main` branch.

**Interfaces:**
- Produces: a `main` branch on `github.com/mpdecker/statlab` whose root contains `src/`, `package.json`, `tsconfig.json`, `tsconfig.ci.json`, `tsup.config.js`, `vitest.config.js`, `eslint.config.js`, `LICENSE`, `README.md` — i.e. today's `packages/statlab/*` with history preserved, flattened to repo root.

- [ ] **Step 1: Create the subtree-split branch**

Run from the repo root (this worktree):

```bash
git subtree split --prefix=packages/statlab -b statlab-extract
```

Expected: prints a commit SHA and exits 0. This creates a local branch `statlab-extract` whose tree is exactly what was under `packages/statlab/`, with history rewritten so those files sit at the branch root.

- [ ] **Step 2: Sanity-check the extracted branch**

```bash
git ls-tree -r statlab-extract --name-only | head -20
```

Expected: paths like `package.json`, `README.md`, `src/index.js`, `src/math/core.js`, `src/methods/anova.js` — **no** `packages/statlab/` prefix.

- [ ] **Step 3: Add the new repo as a temporary remote and push**

```bash
git remote add statlab-origin https://github.com/mpdecker/statlab.git
git push statlab-origin statlab-extract:main
```

Expected: push succeeds, `main` created on `github.com/mpdecker/statlab`.

- [ ] **Step 4: Verify on GitHub**

```bash
gh repo view mpdecker/statlab --json defaultBranchRef,pushedAt
```

Expected: `defaultBranchRef.name` is `main`, `pushedAt` is recent.

No commit in *this* repo for this task — it only pushes existing history to the new remote.

---

### Task 2: Adapt the new repo's package.json, scripts, and root docs for the flat layout

**Files (in a fresh clone of the new repo, not this worktree):**
- Create: `<scratch>/statlab-new/` (clone of `github.com/mpdecker/statlab`)
- Modify: `<scratch>/statlab-new/package.json`
- Modify: `<scratch>/statlab-new/scripts/gen-barrel.mjs` (new file, copied+edited from this repo)
- Modify: `<scratch>/statlab-new/scripts/dump-fixtures.mjs` (new file, copied+edited)
- Modify: `<scratch>/statlab-new/scripts/generate-reference.mjs` (new file, copied+edited)
- Modify: `<scratch>/statlab-new/scripts/gen-reference.py` (new file, copied+edited)
- Create: `<scratch>/statlab-new/scripts/gen-reference.R`, `<scratch>/statlab-new/scripts/requirements.txt`, `<scratch>/statlab-new/scripts/document.mjs`, `<scratch>/statlab-new/scripts/statlab.mjs` (copied, edited where they reference old paths)
- Create: `<scratch>/statlab-new/.gitignore`
- Create: `<scratch>/statlab-new/AUDIT.md`, `<scratch>/statlab-new/BASELINE.md`, `<scratch>/statlab-new/EXTRACTION-PLAN.md` (copied from this repo's root)

**Interfaces:**
- Consumes: nothing from Task 1 beyond the pushed `main` branch.
- Produces: a buildable, testable standalone package at the new repo's root, ready for CI in Task 3.

- [ ] **Step 1: Clone the new repo into the scratchpad**

```bash
git clone https://github.com/mpdecker/statlab.git "$SCRATCH/statlab-new"
cd "$SCRATCH/statlab-new"
```

- [ ] **Step 2: Add `repository` field and fix script paths in `package.json`**

Open `package.json`. Add a `repository` field after `"license"` and fix the two script paths that pointed at `../../scripts/`:

```json
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/mpdecker/statlab.git"
  },
```

And change:

```json
  "scripts": {
    "prebuild": "node ../../scripts/gen-barrel.mjs",
    "build": "tsup && pnpm run build:types",
    "build:types": "tsc -p tsconfig.json",
    "barrel": "node ../../scripts/gen-barrel.mjs",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/",
    "typecheck": "tsc -p tsconfig.ci.json"
  },
```

to:

```json
  "scripts": {
    "prebuild": "node scripts/gen-barrel.mjs",
    "build": "tsup && pnpm run build:types",
    "build:types": "tsc -p tsconfig.json",
    "barrel": "node scripts/gen-barrel.mjs",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/",
    "typecheck": "tsc -p tsconfig.ci.json",
    "docs": "node scripts/statlab.mjs",
    "docs:list": "node scripts/statlab.mjs list",
    "docs:search": "node scripts/statlab.mjs search",
    "docs:generate": "node scripts/document.mjs",
    "reference:generate": "node scripts/dump-fixtures.mjs && python scripts/gen-reference.py"
  },
```

Leave every other field (`name`, `version`, `exports`, `files`, `dependencies`, `devDependencies`) untouched.

- [ ] **Step 3: Create `scripts/gen-barrel.mjs`** (copied from this repo's `scripts/gen-barrel.mjs`, with the package directory now being the repo root instead of `../packages/statlab`)

```javascript
#!/usr/bin/env node
// Generates the namespaced public API barrel (src/index.js)
// and the per-module `exports` map in package.json.
//
// Namespacing (one namespace per module) resolves the cross-module function-name
// collisions, so no `export *` flattening is attempted. Two modules share the
// basename `power` (math/power = low-level power primitives, methods/power =
// power-analysis methods); the barrel disambiguates the latter as `powerAnalysis`.
import { readdirSync, writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(here, '..');
const srcDir = join(pkgDir, 'src');

const isModule = (f) => f.endsWith('.js') && !f.endsWith('.test.js') && f !== 'index.js';
const listModules = (sub) =>
  readdirSync(join(srcDir, sub))
    .filter(isModule)
    .map((f) => f.replace(/\.js$/, ''))
    .sort();

const math = listModules('math');
const methods = listModules('methods');

// namespace disambiguation for duplicate basenames across dirs
const NS_OVERRIDE = { 'methods/power': 'powerAnalysis' };
const nsFor = (dir, name) => NS_OVERRIDE[`${dir}/${name}`] ?? name;

// sanity: no duplicate namespaces after overrides
const seen = new Map();
for (const [dir, names] of [['math', math], ['methods', methods]]) {
  for (const name of names) {
    const ns = nsFor(dir, name);
    if (seen.has(ns)) throw new Error(`namespace collision '${ns}': ${dir}/${name} vs ${seen.get(ns)}`);
    seen.set(ns, `${dir}/${name}`);
  }
}

// --- barrel ---
const lines = ['// AUTO-GENERATED by scripts/gen-barrel.mjs — do not edit by hand.', ''];
lines.push('// math primitives');
for (const name of math) lines.push(`export * as ${nsFor('math', name)} from './math/${name}.js';`);
lines.push('', '// statistical methods');
for (const name of methods) lines.push(`export * as ${nsFor('methods', name)} from './methods/${name}.js';`);
lines.push('');
writeFileSync(join(srcDir, 'index.js'), lines.join('\n'));

// --- exports map ---
const exportsMap = {
  '.': { types: './dist/index.d.ts', import: './src/index.js', require: './dist/index.cjs' },
};
const addSub = (dir, name) => {
  exportsMap[`./${dir}/${name}`] = {
    types: `./dist/${dir}/${name}.d.ts`,
    import: `./src/${dir}/${name}.js`,
    require: `./dist/${dir}/${name}.cjs`,
  };
};
for (const name of math) addSub('math', name);
for (const name of methods) addSub('methods', name);
exportsMap['./package.json'] = './package.json';

const pkgPath = join(pkgDir, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
pkg.exports = exportsMap;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

console.log(`barrel: ${math.length} math + ${methods.length} methods = ${math.length + methods.length} namespaces`);
console.log(`exports: ${Object.keys(exportsMap).length} entries`);
```

- [ ] **Step 4: Create `scripts/dump-fixtures.mjs`** (path-adjusted copy)

```javascript
// scripts/dump-fixtures.mjs
//
// Dumps the shared JS test fixtures (src/methods/fixtures/core.js) to JSON so
// scripts/gen-reference.py can compute oracle values on IDENTICAL inputs,
// rather than reimplementing the JS seeded PRNG (mulberry32) in Python.
//
// Run before gen-reference.py whenever src/methods/fixtures/core.js changes:
//   node scripts/dump-fixtures.mjs && python scripts/gen-reference.py
import { writeFileSync } from 'node:fs';
import { mkGroups, mkTabular } from '../src/methods/fixtures/core.js';
import { nestedHLM } from '../src/methods/fixtures/phase3.js';

const groups = mkGroups();
const tabular = mkTabular(42, 72);
const hlm = nestedHLM();

writeFileSync(new URL('./_fixtures_dump.json', import.meta.url), JSON.stringify({
  groups: groups.map(g => ({ name: g.name, vals: g.vals })),
  tabular_x: tabular.map(r => r.x),
  tabular_m: tabular.map(r => r.m),
  tabular_y: tabular.map(r => r.y),
  hlm: hlm,
}, null, 2));
console.log('Written to scripts/_fixtures_dump.json');
```

- [ ] **Step 5: Create `scripts/generate-reference.mjs`** (path-adjusted copy)

```javascript
/**
 * Regenerate regression-oracle snapshots for reference.json (fixture groups).
 * Run: node scripts/generate-reference.mjs
 */
import { writeFileSync, readFileSync } from 'fs';
import { oneWayANOVA, welchANOVA } from '../src/methods/anova.js';
import { mannWhitney, binomialTest, twoPropZ } from '../src/methods/categorical.js';
import { mediation } from '../src/methods/regression.js';
import { metaAnalysis } from '../src/methods/multivariate.js';
import { mkGroups, GROUP_A, GROUP_B, mkTabular } from '../src/methods/fixtures/core.js';

const ref = JSON.parse(readFileSync('src/methods/__fixtures__/reference.json', 'utf8'));
const rows = mkTabular();

ref.anova.oneWay_fixture_groups = (() => {
  const r = oneWayANOVA(mkGroups());
  return { F: r.F, dfB: r.dfB, dfW: r.dfW, p: r.p };
})();
ref.anova.welch_fixture_groups = (() => {
  const r = welchANOVA(mkGroups());
  return { F: r.F, p: r.p };
})();
ref.categorical.mannWhitney_ab = { p: mannWhitney(GROUP_A, GROUP_B).p };
ref.categorical.binomial_12_20 = { p: binomialTest(12, 20, 0.5).p };
ref.categorical.twoPropZ_35_50 = (() => {
  const r = twoPropZ(35, 50, 28, 50);
  return { z: r.z, p: r.p };
})();
ref.regression.mediation_tabular = (() => {
  const r = mediation(rows.map(x => x.x), rows.map(x => x.m), rows.map(x => x.y));
  return { ab: r.ab, z_sobel: r.z_sobel, p_sobel: r.p_sobel };
})();
ref.meta.two_studies = (() => {
  const r = metaAnalysis([{ label: 'a', d: 0.5, se: 0.1 }, { label: 'b', d: 0.3, se: 0.2 }]);
  return { dRE: r.dRE, p: r.p };
})();

writeFileSync('src/methods/__fixtures__/reference.json', `${JSON.stringify(ref, null, 2)}\n`);
console.log('Updated src/methods/__fixtures__/reference.json');
```

- [ ] **Step 6: Copy `document.mjs` and `statlab.mjs` from this repo, with path fixes**

From this worktree, copy the files, then hand-edit two lines in each:

```bash
cp scripts/document.mjs "$SCRATCH/statlab-new/scripts/document.mjs"
cp scripts/statlab.mjs "$SCRATCH/statlab-new/scripts/statlab.mjs"
```

In `$SCRATCH/statlab-new/scripts/document.mjs`, change:

```javascript
const TESTS_DIR = join(import.meta.dirname, '..', 'packages', 'statlab', 'src', 'methods');
```

to:

```javascript
const TESTS_DIR = join(import.meta.dirname, '..', 'src', 'methods');
```

In `$SCRATCH/statlab-new/scripts/statlab.mjs`, change:

```javascript
const TESTS_DIR = join(__dirname, '..', 'packages', 'statlab', 'src', 'methods');
```

to:

```javascript
const TESTS_DIR = join(__dirname, '..', 'src', 'methods');
```

and change:

```javascript
      path: `packages/statlab/src/methods/${file}`,
```

to:

```javascript
      path: `src/methods/${file}`,
```

- [ ] **Step 7: Copy `gen-reference.py`, `gen-reference.R`, `requirements.txt`, then fix paths in the `.py` file**

```bash
cp scripts/gen-reference.py "$SCRATCH/statlab-new/scripts/gen-reference.py"
cp scripts/gen-reference.R "$SCRATCH/statlab-new/scripts/gen-reference.R"
cp scripts/requirements.txt "$SCRATCH/statlab-new/scripts/requirements.txt"
cd "$SCRATCH/statlab-new"
sed -i 's#packages/statlab/src/methods#src/methods#g' scripts/gen-reference.py
grep -n "packages/statlab" scripts/gen-reference.py
```

Expected: the `grep` prints nothing (all occurrences replaced).

- [ ] **Step 8: Copy `AUDIT.md`, `BASELINE.md`, `EXTRACTION-PLAN.md` from this repo's root**

```bash
cp "$REPO_ROOT/AUDIT.md" "$SCRATCH/statlab-new/AUDIT.md"
cp "$REPO_ROOT/BASELINE.md" "$SCRATCH/statlab-new/BASELINE.md"
cp "$REPO_ROOT/EXTRACTION-PLAN.md" "$SCRATCH/statlab-new/EXTRACTION-PLAN.md"
```

- [ ] **Step 9: Create `.gitignore`**

```
node_modules/
dist/
coverage/
*.log
scripts/_fixtures_dump.json
```

- [ ] **Step 10: Install, build, and test locally before committing**

```bash
cd "$SCRATCH/statlab-new"
pnpm install
pnpm build
pnpm test
```

Expected: `pnpm install` resolves with zero errors (zero runtime deps), `pnpm build` regenerates `src/index.js` via `prebuild` and emits `dist/`, `pnpm test` passes all existing tests (same suite as `packages/statlab` had, ~4,700+ tests) with 0 failures.

- [ ] **Step 11: Commit and push**

```bash
git add -A
git commit -m "chore: adapt package for standalone repo (flat layout, script paths, docs)"
git push origin main
```

---

### Task 3: Add CI and the npm-publish-on-tag workflow

**Files:**
- Create: `<scratch>/statlab-new/.github/workflows/ci.yml`
- Create: `<scratch>/statlab-new/.github/workflows/publish.yml`

**Interfaces:**
- Consumes: the working `pnpm build`/`pnpm test`/`pnpm lint`/`pnpm typecheck` scripts from Task 2.
- Produces: a green CI badge on `main`, and a publish pipeline gated on the `NPM_TOKEN` secret (added in Task 4).

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-build:
    name: test & build (Node ${{ matrix.node }})
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node: ['22.x', '24.x']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm build

  lint:
    name: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  typecheck:
    name: type-check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck

  coverage:
    name: coverage
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec vitest run --coverage

  pack-verify:
    name: npm pack verify
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: pnpm pack --pack-destination /tmp
```

- [ ] **Step 2: Create `.github/workflows/publish.yml`**

```yaml
name: Publish

on:
  push:
    tags: ['v*']

jobs:
  publish:
    name: publish to npm
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: pnpm
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm build
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 3: Commit and push**

```bash
cd "$SCRATCH/statlab-new"
git add .github/workflows/ci.yml .github/workflows/publish.yml
git commit -m "ci: add standalone test/build/lint/typecheck/pack-verify pipeline and npm publish-on-tag workflow"
git push origin main
```

- [ ] **Step 4: Watch CI go green**

```bash
gh run list --repo mpdecker/statlab --limit 5
```

Expected: the run triggered by the push shows `completed` / `success` for all jobs (test-build ×2 node versions, lint, typecheck, coverage, pack-verify). If anything fails, fix it in this clone, commit, push, and re-check before moving on — do not proceed to Task 4 with red CI.

---

### Task 4: CHECKPOINT — owner adds the `NPM_TOKEN` secret

This step cannot be automated: creating an npm access token requires the owner's npm account credentials, and adding a repo secret is an explicit trust boundary I should not cross unprompted.

- [ ] **Step 1: Owner creates an npm automation token**

Ask the owner to run (on their own machine, logged into their npm account):

```bash
npm login          # if not already logged in
npm token create --read-only=false --cidr=0.0.0.0/0
```

Or via the npmjs.com UI: Account Settings → Access Tokens → Generate New Token → **Automation** type (works with 2FA-protected accounts and CI).

- [ ] **Step 2: Owner (or I, with the token pasted in) adds it as a repo secret**

```bash
gh secret set NPM_TOKEN --repo mpdecker/statlab
```

(This prompts for the token value on stdin — the owner should run this themselves rather than pasting the raw token into chat. If they'd rather I run it, they can paste the token and I'll pipe it directly into `gh secret set` without echoing it back.)

- [ ] **Step 3: Confirm the secret exists**

```bash
gh secret list --repo mpdecker/statlab
```

Expected: `NPM_TOKEN` appears in the list (value itself is never shown).

**Do not proceed to Task 5 until the owner confirms this is done** — pushing a tag before the secret exists will fail the publish job (recoverable, but noisy) or, worse, if `npm publish` partially succeeds on a retry it can leave the workflow in a confusing state.

---

### Task 5: Tag `v0.1.0` and verify the publish

**Files:** none — this is a tag push and a registry check.

**Interfaces:**
- Consumes: the green CI + secret from Tasks 3–4.
- Produces: `statlab@0.1.0` live on the public npm registry — this is what Part B's Task 8 depends on.

- [ ] **Step 1: Confirm with the owner before pushing the tag**

State plainly: "About to push tag `v0.1.0` to `mpdecker/statlab`, which will trigger `npm publish`. Once published, a version cannot be reused even if unpublished later (npm's 24-hour unpublish window has restrictions and leaves the version number burned). Proceed?" Wait for explicit go-ahead.

- [ ] **Step 2: Tag and push**

```bash
cd "$SCRATCH/statlab-new"
git tag v0.1.0
git push origin v0.1.0
```

- [ ] **Step 3: Watch the publish workflow**

```bash
gh run list --repo mpdecker/statlab --workflow=publish.yml --limit 3
```

Expected: the triggered run completes with `success`.

- [ ] **Step 4: Verify on the registry**

```bash
npm view statlab version
npm view statlab exports
```

Expected: `version` prints `0.1.0`; `exports` shows the full namespaced map (`.`, `./math/core`, `./methods/anova`, …).

- [ ] **Step 5: Smoke-test a real install in an isolated scratch dir**

```bash
mkdir -p "$SCRATCH/statlab-smoketest" && cd "$SCRATCH/statlab-smoketest"
npm init -y >/dev/null
npm install statlab
node -e "import('statlab/methods/means').then(m => console.log(typeof m.tWelch))"
node -e "import('statlab/math/core').then(m => console.log(typeof m.avg))"
```

Expected: both print `function`.

**Part A is complete once this task passes.** `statlab@0.1.0` is live and confirmed working from a clean install.

---

## PART B — Decouple this repo (`statlab-app`) from `packages/statlab`

All of Part B happens in this worktree, on the current branch (`claude/statlab-package-separation-2ad12f`) — already a feature branch, not `main`.

### Task 6: Decouple `contracts.test.js` from the engine's internal fixtures

**Files:**
- Create: `app/src/config/fixtures/core.js` (copy of `packages/statlab/src/methods/fixtures/core.js`, unchanged)
- Create: `app/src/config/fixtures/phase3.js` (copy of `packages/statlab/src/methods/fixtures/phase3.js`, 2 import lines rewritten)
- Create: `app/src/config/fixtures/helpers.js` (copy of `packages/statlab/src/methods/__fixtures__/helpers.js`, header comment updated)
- Create: `app/src/config/fixtures/runners.js` (copy of `packages/statlab/src/methods/fixtures/runners.js`, import block rewritten to package imports)
- Modify: `app/src/config/contracts.test.js` (2 import lines updated)

**Interfaces:**
- Produces: `app/src/config/fixtures/{core,phase3,helpers,runners}.js`, self-contained (only depend on the public `statlab` package + each other), consumed by `contracts.test.js`.

- [ ] **Step 1: Copy the four fixture files verbatim (preserves exact content, no manual retyping)**

```bash
mkdir -p app/src/config/fixtures
cp packages/statlab/src/methods/fixtures/core.js app/src/config/fixtures/core.js
cp packages/statlab/src/methods/fixtures/phase3.js app/src/config/fixtures/phase3.js
cp packages/statlab/src/methods/fixtures/runners.js app/src/config/fixtures/runners.js
cp packages/statlab/src/methods/__fixtures__/helpers.js app/src/config/fixtures/helpers.js
```

- [ ] **Step 2: Rewrite `phase3.js`'s two `mulberry32` imports to use the public package**

In `app/src/config/fixtures/phase3.js`, change:

```javascript
/** Deterministic fixtures for Phase 3 module tests */

// Single source of truth for the seeded PRNG — re-exported so existing fixture
// consumers keep importing `mulberry32` from here.
export { mulberry32 } from '../../math/rng.js';
import { mulberry32 } from '../../math/rng.js';
```

to:

```javascript
/** Deterministic fixtures for Phase 3 module tests */

// Single source of truth for the seeded PRNG — re-exported so existing fixture
// consumers keep importing `mulberry32` from here.
export { mulberry32 } from 'statlab/math/rng';
import { mulberry32 } from 'statlab/math/rng';
```

- [ ] **Step 3: Rewrite `runners.js`'s import block to use the public package**

In `app/src/config/fixtures/runners.js`, replace lines 1–64 (everything from the top comment through the last `import` statement, ending just before `const ROWS = mkTabular();`):

Old text (the full import block — match from `/**` on line 1 through the `import { localOutlierFactor, isolationForest } from '../outlier.js';` line):

```javascript
/**
 * Minimal runners for every TREE test id (integration / contract tests).
 */
import { tWelch, tOne, tPaired, yuentTest, zTestKnownSD, signTest } from '../means.js';
// tOne used by sensitivity runner
import {
  oneWayANOVA, welchANOVA, twoWayANOVA, ancova, rmANOVA, friedman, kruskalWallis, cochranQ,
} from '../anova.js';
import {
  chiSquare, chiGoF, fisherExact, mcnemar, binomialTest, onePropZ, twoPropZ,
} from '../categorical.js';
import {
  mannWhitney, wilcoxonSR,
} from '../nonparametric.js';
import {
  tost, bayesFactorT, bayesFactorCorr,
  grubbsTest, leveneTest, bartlettTest, bonferroni, holm, bh, sensitivityLOO,
} from '../categorical.js';
import {
  pearsonTest, spearman, kendallTau, partialCorr, pointBiserial,
  simpleOLS, multipleOLS, polynomialOLS, hierarchicalOLS, logisticReg,
  ordinalLogisticRegression, poissonRegression, negativeBinomialRegression,
  mediation, moderation,
} from '../regression.js';
import {
  pca, efa, cronbachAlpha, splitHalf, icc, cohensKappa,
  metaAnalysis, differencesInDifferences, convertEffectSize,
  manova, canonicalCorr, linearDiscriminant,
} from '../multivariate.js';
import { omegaMcDonald, parallelAnalysis, irtRasch1PL, irt2PL, scaleScore } from '../psychometrics.js';
import { kmeans, hierarchicalCluster, latentClassAnalysis } from '../clustering.js';
import { hlmRandomIntercept, hlmRandomSlope, iccMultilevel } from '../multilevel.js';
import {
  propensityScoreMatch, iv2sls, interruptedTimeSeries, regressionDiscontinuity,
} from '../causal.js';
import {
  centralityMeasures, communityDetection, sociogramLayout, networkFromEdgeList,
} from '../network.js';
import { normalityDP, shapiroWilk, bootstrapCI, requiredN, requiredNCorr } from '../../math/distributions.js';
import {
  powerANOVA, powerChi, powerLogistic, powerMixed, powerMediation,
} from '../../math/power.js';
import {
  mkGroups, mkTabular, mkRmMatrix, mkScaleMatrix, mk2x2Table, mkMetaStudies, GROUP_A, GROUP_B,
} from './core.js';
import { starEdgeList } from './phase3.js';
import { causalRows, nestedHLM, binaryMatrix } from './phase3.js';
import { moranIMulti, simulationConvergence, sobolSensitivity, agentSummaryStats, scenarioComparison, thresholdModel, networkDiffusion, segregationIndex } from '../abm.js';
import { epsilonGreedy, ucb, thompsonSampling, contextualBandit, policyGradient, softmaxBandit, qLearning, sarsa, deepQNetwork } from '../bandit.js';
import { jaroWinkler, levenshteinDistance, fellegiSunter, recordBlocking, matchThreshold, probabilisticRecordLinkage, deduplication } from '../linkage.js';
import { laplaceMechanism, bootstrapSynthetic, kAnonymityCheck, differentialPrivacy, dataMasking, lDiversity, tCloseness } from '../privacy.js';
import { reliableChangeIndex, minimalImportantDifference, responderAnalysis, eq5dIndex, standardizedResponseMean, clinicalTrialsGov, consortChecklist } from '../pro.js';
import { raCusum, vlad, raSprt, funnelPlot, cChartRiskAdjusted, safetySignal, prrAnalysis } from '../raMonitor.js';
import { collaborativeFilter, matrixFactorize, topNRecommend } from '../recommendation.js';
import { tauU, pnd, pem, nap, randomizationTest, baselineCorrectedTau, betweenCaseSMD } from '../sced.js';
import { morrisMethod, fastSensitivity, modelComparison, forecastCombination, sobolFirstOrder, sobolTotalIndex, deltaMethod, andrewsPlot } from '../sensitivity.js';
import { bootstrapMediation as bsMediation, bootstrapT_CI, empiricalInfluence, moderatedMediation, splitConformal, conformalPvalues, jackknife, jackknifePlus } from '../bootstrap.js';
import { powerCoxPH, powerMetaAnalysis, powerEquivalence, powerInteractionANOVA, powerCorrelation, requiredNOneProp, requiredNTwoProp, requiredNWilcoxon, requiredNLogRank, requiredNOLS, requiredNANOVA, powerTTestWrapper, powerProportionOne, powerProportionTwo, powerWilcoxonTest, powerLogRankTest, powerRMANOVA, powerOLS_apa, powerSpearmanTest } from '../power.js';
import { theilSenSlope, mmEstimator, madScale, hampelM, mcdCovariance, sEstimator, ltsRegression, qqConfidence } from '../robust.js';
import { bicBayesFactor, betaBinomialPosterior, gammaPoissonPosterior, normalNormalPosterior, normalInverseGammaPosterior, bayesianLinearRegression, bayesianLogisticRegression, bayesianPoissonRegression, bayesianDIC, bmaRegression } from '../bayesian.js';
import { littlesMCAR, mice, rubinPool, fmi, emImpute, missingnessPattern, completeCases } from '../missing.js';
import { kmEstimate, logRankTest, coxPH } from '../survival.js';
import { adfTest, acf as acfFn, pacf as pacfFn } from '../timeseries.js';
import { localOutlierFactor, isolationForest } from '../outlier.js';
```

New text (same names, package-style specifiers; `./core.js`/`./phase3.js` stay relative since they now live alongside `runners.js` in the same directory):

```javascript
/**
 * Minimal runners for every TREE test id (integration / contract tests).
 */
import { tWelch, tOne, tPaired, yuentTest, zTestKnownSD, signTest } from 'statlab/methods/means';
// tOne used by sensitivity runner
import {
  oneWayANOVA, welchANOVA, twoWayANOVA, ancova, rmANOVA, friedman, kruskalWallis, cochranQ,
} from 'statlab/methods/anova';
import {
  chiSquare, chiGoF, fisherExact, mcnemar, binomialTest, onePropZ, twoPropZ,
} from 'statlab/methods/categorical';
import {
  mannWhitney, wilcoxonSR,
} from 'statlab/methods/nonparametric';
import {
  tost, bayesFactorT, bayesFactorCorr,
  grubbsTest, leveneTest, bartlettTest, bonferroni, holm, bh, sensitivityLOO,
} from 'statlab/methods/categorical';
import {
  pearsonTest, spearman, kendallTau, partialCorr, pointBiserial,
  simpleOLS, multipleOLS, polynomialOLS, hierarchicalOLS, logisticReg,
  ordinalLogisticRegression, poissonRegression, negativeBinomialRegression,
  mediation, moderation,
} from 'statlab/methods/regression';
import {
  pca, efa, cronbachAlpha, splitHalf, icc, cohensKappa,
  metaAnalysis, differencesInDifferences, convertEffectSize,
  manova, canonicalCorr, linearDiscriminant,
} from 'statlab/methods/multivariate';
import { omegaMcDonald, parallelAnalysis, irtRasch1PL, irt2PL, scaleScore } from 'statlab/methods/psychometrics';
import { kmeans, hierarchicalCluster, latentClassAnalysis } from 'statlab/methods/clustering';
import { hlmRandomIntercept, hlmRandomSlope, iccMultilevel } from 'statlab/methods/multilevel';
import {
  propensityScoreMatch, iv2sls, interruptedTimeSeries, regressionDiscontinuity,
} from 'statlab/methods/causal';
import {
  centralityMeasures, communityDetection, sociogramLayout, networkFromEdgeList,
} from 'statlab/methods/network';
import { normalityDP, shapiroWilk, bootstrapCI, requiredN, requiredNCorr } from 'statlab/math/distributions';
import {
  powerANOVA, powerChi, powerLogistic, powerMixed, powerMediation,
} from 'statlab/math/power';
import {
  mkGroups, mkTabular, mkRmMatrix, mkScaleMatrix, mk2x2Table, mkMetaStudies, GROUP_A, GROUP_B,
} from './core.js';
import { starEdgeList } from './phase3.js';
import { causalRows, nestedHLM, binaryMatrix } from './phase3.js';
import { moranIMulti, simulationConvergence, sobolSensitivity, agentSummaryStats, scenarioComparison, thresholdModel, networkDiffusion, segregationIndex } from 'statlab/methods/abm';
import { epsilonGreedy, ucb, thompsonSampling, contextualBandit, policyGradient, softmaxBandit, qLearning, sarsa, deepQNetwork } from 'statlab/methods/bandit';
import { jaroWinkler, levenshteinDistance, fellegiSunter, recordBlocking, matchThreshold, probabilisticRecordLinkage, deduplication } from 'statlab/methods/linkage';
import { laplaceMechanism, bootstrapSynthetic, kAnonymityCheck, differentialPrivacy, dataMasking, lDiversity, tCloseness } from 'statlab/methods/privacy';
import { reliableChangeIndex, minimalImportantDifference, responderAnalysis, eq5dIndex, standardizedResponseMean, clinicalTrialsGov, consortChecklist } from 'statlab/methods/pro';
import { raCusum, vlad, raSprt, funnelPlot, cChartRiskAdjusted, safetySignal, prrAnalysis } from 'statlab/methods/raMonitor';
import { collaborativeFilter, matrixFactorize, topNRecommend } from 'statlab/methods/recommendation';
import { tauU, pnd, pem, nap, randomizationTest, baselineCorrectedTau, betweenCaseSMD } from 'statlab/methods/sced';
import { morrisMethod, fastSensitivity, modelComparison, forecastCombination, sobolFirstOrder, sobolTotalIndex, deltaMethod, andrewsPlot } from 'statlab/methods/sensitivity';
import { bootstrapMediation as bsMediation, bootstrapT_CI, empiricalInfluence, moderatedMediation, splitConformal, conformalPvalues, jackknife, jackknifePlus } from 'statlab/methods/bootstrap';
import { powerCoxPH, powerMetaAnalysis, powerEquivalence, powerInteractionANOVA, powerCorrelation, requiredNOneProp, requiredNTwoProp, requiredNWilcoxon, requiredNLogRank, requiredNOLS, requiredNANOVA, powerTTestWrapper, powerProportionOne, powerProportionTwo, powerWilcoxonTest, powerLogRankTest, powerRMANOVA, powerOLS_apa, powerSpearmanTest } from 'statlab/methods/power';
import { theilSenSlope, mmEstimator, madScale, hampelM, mcdCovariance, sEstimator, ltsRegression, qqConfidence } from 'statlab/methods/robust';
import { bicBayesFactor, betaBinomialPosterior, gammaPoissonPosterior, normalNormalPosterior, normalInverseGammaPosterior, bayesianLinearRegression, bayesianLogisticRegression, bayesianPoissonRegression, bayesianDIC, bmaRegression } from 'statlab/methods/bayesian';
import { littlesMCAR, mice, rubinPool, fmi, emImpute, missingnessPattern, completeCases } from 'statlab/methods/missing';
import { kmEstimate, logRankTest, coxPH } from 'statlab/methods/survival';
import { adfTest, acf as acfFn, pacf as pacfFn } from 'statlab/methods/timeseries';
import { localOutlierFactor, isolationForest } from 'statlab/methods/outlier';
```

The rest of the file (everything from `const ROWS = mkTabular();` to the closing `export { RUNNERS };`) is unchanged — it only references the names just imported.

- [ ] **Step 4: Tidy `helpers.js`'s header comment**

In `app/src/config/fixtures/helpers.js`, change the first line from:

```javascript
// src/tests/__fixtures__/helpers.js
```

to:

```javascript
// app/src/config/fixtures/helpers.js
```

- [ ] **Step 5: Point `contracts.test.js` at the local copies**

In `app/src/config/contracts.test.js`, change:

```javascript
// Integration test: validates the app's method TREE against the engine's shared
// test harness, which lives in the statlab package's internal test fixtures.
import { runTreeTest, RUNNERS } from '../../../packages/statlab/src/methods/fixtures/runners.js';
import { expectInferenceResult } from '../../../packages/statlab/src/methods/__fixtures__/helpers.js';
```

to:

```javascript
// Integration test: validates the app's method TREE against every statlab
// method it exposes, via runners defined locally in ./fixtures/.
import { runTreeTest, RUNNERS } from './fixtures/runners.js';
import { expectInferenceResult } from './fixtures/helpers.js';
```

- [ ] **Step 6: Run just this test file to confirm the rewrite works**

At this point `packages/statlab` still exists and the workspace link is still active, so this validates the rewritten imports resolve correctly before any deletion happens:

```bash
pnpm --filter statlab-app exec vitest run src/config/contracts.test.js
```

Expected: all tests in `contracts.test.js` pass (the `212 TREE ids` count assertion and all per-id runner/shape checks).

- [ ] **Step 7: Commit**

```bash
git add app/src/config/fixtures app/src/config/contracts.test.js
git commit -m "test: decouple contracts.test.js from packages/statlab internals

Copies runners.js/helpers.js/core.js/phase3.js into app/src/config/fixtures/
with imports rewritten to the public statlab package API, so the app no
longer reaches into packages/statlab's unpublished internal fixtures."
```

---

### Task 7: Delete `packages/statlab`, drop the workspace, flatten `app/*` to repo root

**Files:**
- Delete: `packages/statlab/` (entire directory)
- Delete: `pnpm-workspace.yaml`
- Move: `app/*` → repo root (`app/src` → `src`, `app/index.html` → `index.html`, `app/index.jsx` → `index.jsx`, `app/vite.config.js` → `vite.config.js`, `app/vitest.config.js` → `vitest.config.js`)
- Delete: `app/package.json` (superseded by Task 8's root `package.json` rewrite)

**Interfaces:**
- Consumes: nothing new.
- Produces: a flat single-package repo layout for Task 8 onward.

- [ ] **Step 1: Delete the library package**

```bash
git rm -r packages/statlab
```

- [ ] **Step 2: Delete the workspace manifest**

```bash
git rm pnpm-workspace.yaml
```

- [ ] **Step 3: Move `app/*` up to the repo root**

```bash
git mv app/src src
git mv app/index.html index.html
git mv app/index.jsx index.jsx
git mv app/vite.config.js vite.config.js
git mv app/vitest.config.js vitest.config.js
git rm app/package.json
rmdir app 2>/dev/null || true
```

Expected after this: `ls` at repo root shows `src/`, `index.html`, `index.jsx`, `vite.config.js`, `vitest.config.js` alongside the existing `package.json`, `scripts/`, `docs/`, etc. No `app/` or `packages/` directories remain.

- [ ] **Step 4: Verify `index.html`'s script tag still resolves**

```bash
grep -n 'src="/src/main.jsx"' index.html
```

Expected: one match — the path `/src/main.jsx` is root-relative and now correctly resolves to the flattened `src/main.jsx`, unchanged.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove packages/statlab, flatten app/ to repo root

packages/statlab is now published separately as the 'statlab' npm package
(github.com/mpdecker/statlab). This repo is no longer a pnpm workspace —
just the single Vite app, now living at the repo root instead of app/."
```

---

### Task 8: Rewrite the root `package.json` as a single (non-workspace) package

**Files:**
- Modify: `package.json` (full rewrite — was the workspace root, becomes the app's own manifest)

**Interfaces:**
- Consumes: the flattened file layout from Task 7.
- Produces: a package.json where `statlab` resolves from the npm registry, ready for `pnpm install` in Task 11.

- [ ] **Step 1: Replace `package.json`'s entire contents**

```json
{
  "name": "statlab-app",
  "version": "6.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "papaparse": "^5.5.3",
    "react": "^18",
    "react-dom": "^18.3.1",
    "recharts": "^2.12.7",
    "statlab": "^0.1.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "@testing-library/react": "^14.3.1",
    "@vitest/coverage-v8": "^2.0.0",
    "happy-dom": "^20.9.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.0"
  },
  "packageManager": "pnpm@11.10.0"
}
```

- [ ] **Step 2: Remove the now-stale root lockfile so it regenerates cleanly**

```bash
rm -f pnpm-lock.yaml
```

(Task 11 runs `pnpm install` fresh and produces a new lockfile against the real published `statlab` package — do not carry forward a lockfile that still pins the workspace link.)

- [ ] **Step 3: Commit**

```bash
git add package.json
git add -u pnpm-lock.yaml 2>/dev/null || true
git commit -m "chore: rewrite package.json for standalone app, drop workspace lockfile"
```

(The old lockfile's deletion is captured in this commit; Task 11 will add the regenerated one.)

---

### Task 9: Update CI for the flattened, non-workspace layout

**Files:**
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: the `pnpm build`/`pnpm test`/`pnpm test:coverage` scripts from Task 8.
- Produces: CI that matches the new repo shape (no lint/typecheck jobs — the app never had either; those lived only in `packages/statlab`, which is gone).

- [ ] **Step 1: Replace `.github/workflows/ci.yml`'s entire contents**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-build:
    name: test & build (Node ${{ matrix.node }})
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node: ['22.x', '24.x']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
      - run: pnpm build

  coverage:
    name: coverage
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:coverage

  deploy:
    name: deploy to Cloudflare Pages
    runs-on: ubuntu-latest
    needs: test-build
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    permissions:
      contents: read
      deployments: write
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - name: Deploy static app to Cloudflare Pages
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: npx wrangler@4 pages deploy dist --project-name=statlab --branch=main
```

Note the deploy step's path changed from `app/dist` to `dist` (Vite now builds to the repo-root `dist/`, per `vite.config.js`'s `build.outDir: 'dist'`), and the `--project-name=statlab` flag is unchanged (that's the Cloudflare Pages project name, independent of the GitHub repo name).

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: drop workspace filters and lint/typecheck jobs, fix deploy path to dist/"
```

---

### Task 10: Update repo docs for the standalone-app layout

**Files:**
- Modify: `README.md`
- Modify: `RUNBOOK.md`
- Modify: `DEPLOY.md`
- Modify: `READINESS.md`
- Delete: `AUDIT.md`, `BASELINE.md`, `EXTRACTION-PLAN.md` (now live in the `statlab` repo, per Task 2 Step 8)

**Interfaces:** none — documentation only.

- [ ] **Step 1: Remove the docs that moved to the library repo**

```bash
git rm AUDIT.md BASELINE.md EXTRACTION-PLAN.md
```

- [ ] **Step 2: Edit `DEPLOY.md`**

Change the `## Stack` section from:

```markdown
## Stack

npm-workspaces monorepo (repo root `Statlab/`, remote `github.com/mpdecker/Statlab`):

- `packages/statlab` — the dependency-free stats engine (publishable npm package)
- `app` — the browser-only Vite + React SPA that consumes the engine

The app is a pure client-side SPA. No backend, no server, no environment
variables — all computation runs in the browser.
```

to:

```markdown
## Stack

Single-package Vite + React SPA (repo root `statlab-app/`, remote
`github.com/mpdecker/statlab-app`), depending on the `statlab` npm package
(published from the separate `github.com/mpdecker/statlab` repo) for all
statistical computation.

The app is a pure client-side SPA. No backend, no server, no environment
variables — all computation runs in the browser.
```

Change:

```markdown
## Prerequisites

- Node 18+ and npm 9+ (workspaces support)
- No secrets, no `.env` file — the app has zero environment variables

## Local dev

```bash
cd Statlab
npm ci
npm run dev        # serves the app (vite) at the printed localhost URL
```

## Build & test

```bash
npm test           # runs library tests then app tests
npm run build      # builds the statlab package, then the app (app/dist)
```

Individual workspaces: `npm run test:lib` / `npm run test:app`,
`npm run build:lib` / `npm run build:app`.

## Host

Static hosting of the app build at **https://statlab-3z6.pages.dev** via Cloudflare
Pages direct upload (`npx wrangler@4 pages deploy app/dist`). CI builds with
`pnpm build` on push to `main`, then deploys `app/dist`. No `wrangler.toml`, no
Worker script, and do not connect this repo to **Workers Builds** in the
Cloudflare dashboard.

Other static hosts (Netlify, etc.) can use build command `pnpm build` and output
directory `app/dist`. No runtime config required.

The `packages/statlab` engine can be published separately to npm
(`npm publish -w statlab`) once versioned.
```

to:

```markdown
## Prerequisites

- Node 18+ and pnpm
- No secrets, no `.env` file — the app has zero environment variables

## Local dev

```bash
cd statlab-app
pnpm install
pnpm dev            # serves the app (vite) at the printed localhost URL
```

## Build & test

```bash
pnpm test           # runs the app test suite
pnpm build          # builds the app to dist/
```

## Host

Static hosting of the app build at **https://statlab-3z6.pages.dev** via Cloudflare
Pages direct upload (`npx wrangler@4 pages deploy dist`). CI builds with
`pnpm build` on push to `main`, then deploys `dist`. No `wrangler.toml`, no
Worker script, and do not connect this repo to **Workers Builds** in the
Cloudflare dashboard.

Other static hosts (Netlify, etc.) can use build command `pnpm build` and output
directory `dist`. No runtime config required.

The statistics engine (`statlab` on npm) is a separate package published from
[`github.com/mpdecker/statlab`](https://github.com/mpdecker/statlab).
```

- [ ] **Step 3: Edit `READINESS.md`**

Change:

```markdown
| DEPLOY.md | deep | rewritten 2026-07-06 for the monorepo layout |
```

to:

```markdown
| DEPLOY.md | deep | rewritten for the standalone single-package app layout |
```

- [ ] **Step 4: Rewrite `README.md`**

Replace the `## Architecture` code block (lines starting `statlab/` through the closing ` ``` ` before `## Navigator categories`) — i.e. everything from:

```
## Architecture

```
statlab/
├── index.jsx                   Root entry
```

through the end of that fenced block — with:

```markdown
## Architecture

```
statlab-app/
├── index.html                  Vite entry HTML
├── index.jsx                   Root entry
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
npm package ([source](https://github.com/mpdecker/statlab)) — 84+ method modules, 1,000+
functions, imported by namespaced subpath (e.g. `import { tWelch } from 'statlab/methods/means'`).
This app has zero statistical code of its own; it's a UI over the published library.
```

Then remove the entire `## Backend statistics library (85 modules, 1034 functions)` section (from that heading through the `---` right before `## Automatic diagnostics`) — that content now belongs to the `statlab` repo's own README.

Then replace the `## Adding a new test` section:

```markdown
## Adding a new test

1. Implement the test function in the appropriate `src/tests/*.js` file.
   Return `{ test: "Name", ..., apa: "APA sentence" }`.
2. Add an entry to `src/config/tree.js` under the appropriate category.
3. Add config controls to the `configMap` object in `InferenceConfig.jsx`.
4. Add result rendering to `InferenceResults.jsx` (chips, tables, plots).
5. Wire the test call in the `result` `useMemo` inside `InferencePanel.jsx`.
```

with:

```markdown
## Adding a new test

New statistical functions are added to the
[`statlab`](https://github.com/mpdecker/statlab) library, not this repo. To
expose an existing `statlab` function in this app's UI:

1. Add an entry to `src/config/tree.js` under the appropriate category,
   referencing the function's TREE id.
2. Add a runner for that id in `src/config/fixtures/runners.js` (used by the
   `contracts.test.js` integration test) and wire the real call in the
   `result` `useMemo` inside `InferencePanel.jsx`.
3. Add config controls to the `configMap` object in `InferenceConfig.jsx`.
4. Add result rendering to `InferenceResults.jsx` (chips, tables, plots).
5. Bump the `statlab` dependency in `package.json` if the function shipped
   in a newer library version.
```

- [ ] **Step 5: Rewrite `RUNBOOK.md`**

Replace the `## Quick Start` block:

```markdown
```bash
npm install          # install deps (react, recharts, papaparse)
npm run dev          # start Vite dev server → http://localhost:5173
npm test             # run full test suite (4,403 tests)
npm run docs:list    # browse all 84 modules and their functions
npm run docs:show bayesian   # show all functions in a module
npm run docs:search garch    # search functions by name/description
npm run docs:fn moransI      # show detailed signature + params
```
```

with:

```markdown
```bash
pnpm install         # install deps (react, recharts, papaparse, statlab)
pnpm dev              # start Vite dev server → http://localhost:5173
pnpm test             # run the app test suite
```

To browse the `statlab` library's own function catalog (`docs:list`,
`docs:show`, `docs:search`), clone [`github.com/mpdecker/statlab`](https://github.com/mpdecker/statlab)
— those commands live there now.
```

Replace the `## Project Structure` code block with the same flattened tree used in `README.md`'s Architecture section (Step 4 above), and drop the `scripts/statlab.mjs` / `scripts/document.mjs` bullet lines under it (those scripts moved to the `statlab` repo).

Replace the `## Development Commands` table:

```markdown
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
```

with:

```markdown
| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Vite dev server with HMR |
| `pnpm build` | Production build to `dist/` |
| `pnpm preview` | Preview production build |
| `pnpm test` | Run the app test suite |
| `pnpm test:watch` | Watch mode — reruns on file changes |
| `pnpm test:coverage` | Run with coverage report |
```

Remove the entire `## Adding a New Statistical Function` section's **Step 1: Implement the function** and **Step 2: Write tests** subsections (engine-side work, now in the `statlab` repo) — keep **Step 3/4/5** but renumber to 1/2/3 and retitle the section `## Exposing a statlab Function in the UI`, matching the updated `README.md` "Adding a new test" section from Step 4 above (reuse that exact text).

Remove the `## MATH Modules` section (those import paths — `../math/core.js` etc. — no longer apply; the app imports `statlab/math/core` etc. as a package now).

Leave `## Code Style`, `## Troubleshooting`, `## Git Workflow`, and `## Version History` as-is (still accurate/harmless).

- [ ] **Step 6: Commit**

```bash
git add README.md RUNBOOK.md DEPLOY.md READINESS.md
git add -u AUDIT.md BASELINE.md EXTRACTION-PLAN.md 2>/dev/null || true
git commit -m "docs: rewrite for standalone-app layout, remove docs that moved to the statlab repo"
```

---

### Task 11: Fresh install against the published package, full verification

**Files:** none modified — this is a verification-only task. May regenerate `pnpm-lock.yaml`.

**Interfaces:**
- Consumes: everything from Tasks 6–10.
- Produces: proof the app builds and tests green against the real `statlab@0.1.0` on npm (not a local link).

- [ ] **Step 1: Clean install**

```bash
rm -rf node_modules
pnpm install
```

Expected: resolves `statlab@^0.1.0` from the public registry (confirm with `pnpm why statlab` showing a registry-resolved version, not `link:`). A new `pnpm-lock.yaml` is generated.

- [ ] **Step 2: Run the full test suite**

```bash
pnpm test
```

Expected: all tests pass, including `contracts.test.js`'s full 212-id sweep — now running against the published package instead of the workspace link.

- [ ] **Step 3: Build**

```bash
pnpm build
```

Expected: succeeds, produces `dist/`.

- [ ] **Step 4: Manually smoke-test the dev server**

```bash
pnpm dev
```

Open the printed localhost URL in a browser, run one inference test end-to-end (e.g. Welch t-test on the built-in Iris dataset), confirm results render with APA output — the same golden-path check the project's `verify` skill would want before claiming this works. Stop the dev server after confirming.

- [ ] **Step 5: Commit the regenerated lockfile**

```bash
git add pnpm-lock.yaml
git commit -m "chore: regenerate lockfile against published statlab@0.1.0"
```

---

### Task 12: Push the branch — CHECKPOINT before merging to `main`

**Files:** none — push and PR only.

- [ ] **Step 1: Push the branch**

```bash
git push -u origin claude/statlab-package-separation-2ad12f
```

- [ ] **Step 2: Open a PR (do not merge)**

```bash
gh pr create --title "Split statlab into its own repo; app depends on it via npm" --body "$(cat <<'EOF'
## Summary
- Extracts packages/statlab into github.com/mpdecker/statlab (history preserved via git subtree split), published as statlab@0.1.0 on npm.
- Removes packages/statlab and the pnpm workspace from this repo; flattens app/ to the repo root.
- Decouples app/src/config/contracts.test.js from packages/statlab's internal (unpublished) test fixtures by copying them locally with imports rewritten to the public statlab package API.
- Updates CI (drops workspace filters and lint/typecheck jobs that only ever applied to the library; fixes the Cloudflare Pages deploy path from app/dist to dist).
- Updates README/RUNBOOK/DEPLOY/READINESS for the new layout; moves AUDIT.md/BASELINE.md/EXTRACTION-PLAN.md to the statlab repo.

Full design: docs/superpowers/specs/2026-07-09-statlab-repo-separation-design.md
Full plan: docs/superpowers/plans/2026-07-09-statlab-repo-separation.md

## Test plan
- [x] `pnpm install` resolves statlab from the public npm registry (not a workspace link)
- [x] `pnpm test` passes in full, including the 212-id contracts.test.js sweep
- [x] `pnpm build` succeeds
- [x] Manually verified the dev server renders a live inference result end-to-end
- [ ] CI green on this PR (test-build × 2 node versions, coverage, deploy preview if applicable)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: STOP — do not merge**

Merging to `main` triggers the Cloudflare Pages production deploy (`ci.yml`'s `deploy` job runs `if: github.ref == 'refs/heads/main'`). Report the PR URL to the owner and wait for their explicit go-ahead before merging — this is the last irreversible-ish step (a bad deploy is recoverable via Pages rollback, but shouldn't happen without a look first).

**Part B — and the whole migration — is complete once the owner merges this PR.**
