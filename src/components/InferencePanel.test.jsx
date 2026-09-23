// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor, cleanup, renderHook, act } from '@testing-library/react';
import { InferencePanel, useInference } from './InferencePanel.jsx';
import { makeIris } from '../data/datasets.js';

afterEach(cleanup);

const mockRows = Array.from({ length: 40 }, (_, i) => ({
  group: i % 2 === 0 ? 'A' : 'B',
  x: i + 1,
  y: 10 + i * 1.2 + (i % 2) * 2,
  m: 5 + i * 0.8,
  z: i % 3,
  cat1: i % 2 === 0 ? 'yes' : 'no',
  cat2: i % 3 === 0 ? 'low' : 'high',
}));

const mockDs = {
  numeric: ['x', 'y', 'm', 'z'],
  categorical: ['group', 'cat1', 'cat2'],
};

describe('InferencePanel', () => {
  it('renders navigator and Welch config', () => {
    render(
      <InferencePanel
        data={mockRows}
        ds={mockDs}
        active="t_welch"
        setActive={vi.fn()}
      />,
    );
    expect(screen.getAllByText(/Welch t-test/i).length).toBeGreaterThan(0);
  });

  it('bootstrap mediation run produces indirect effect chips', async () => {
    render(
      <InferencePanel
        data={mockRows}
        ds={mockDs}
        active="med_bootstrap"
        setActive={vi.fn()}
      />,
    );
    const btn = screen.getByRole('button', { name: /^RUN \(B=/ });
    fireEvent.click(btn);
    await waitFor(
      () => expect(screen.getByText(/indirect a×b/i)).toBeTruthy(),
      { timeout: 15_000 },
    );
  });

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

  it('"EXPAND ALL" reveals tests in both the core and more-categories sections, and "COLLAPSE" hides them again', () => {
    render(
      <InferencePanel
        data={mockRows}
        ds={mockDs}
        active="t_welch"
        setActive={vi.fn()}
      />,
    );

    // Use test labels distinct from the active test ("Welch t-test"), since
    // the active test is also mirrored in the "RECENT" section, which is
    // unaffected by the Navigator's expand/collapse state and would make
    // these assertions pass regardless of the bug being fixed.
    fireEvent.click(screen.getByText('COLLAPSE'));
    expect(screen.queryByText('One-sample t-test')).toBeNull();
    expect(screen.queryByText(/^PRIVACY/i)).toBeNull();

    fireEvent.click(screen.getByText('EXPAND ALL'));
    // A core category's test (under COMPARE MEANS) is visible: proves the
    // CORE section wrapper itself, not just the category name, is expanded.
    expect(screen.getByText('One-sample t-test')).toBeTruthy();
    // A long-tail category's test (under PRIVACY, in "More categories") is
    // visible: proves the MORE CATEGORIES section wrapper is expanded too.
    expect(screen.getByText('Differential Privacy')).toBeTruthy();

    fireEvent.click(screen.getByText('COLLAPSE'));
    expect(screen.queryByText('One-sample t-test')).toBeNull();
    expect(screen.queryByText(/^PRIVACY/i)).toBeNull();
  });

  it('auto-reveals the "More categories" section when the active test lives in a long-tail category', () => {
    render(
      <InferencePanel
        data={mockRows}
        ds={mockDs}
        active="priv_diff"
        setActive={vi.fn()}
      />,
    );

    // PRIVACY is not a CORE category, so "More categories" starts collapsed.
    // With no interaction at all, the active test's category header AND its
    // test row must already be visible — proving the '__more__' section
    // sentinel, not just the category name, got added to expandedCats.
    // A plain /^PRIVACY/i text match is ambiguous here: the active test's
    // own method-note assumptions (e.g. "Privacy budget ε is finite") are
    // shown unconditionally elsewhere on the page and also match it. Match
    // the category header's exact "PRIVACY (n)" span by full textContent
    // (including its nested count span) instead.
    const privacyHeader = screen.getByText(
      (_content, el) => el?.tagName === 'SPAN' && /^PRIVACY\s*\(\d+\)$/.test(el.textContent || ''),
    );
    expect(privacyHeader).toBeTruthy();
    // The active test also gets mirrored into the "RECENT" section (which
    // is unaffected by expandedCats), so scope this assertion to the
    // PRIVACY category's own container to prove its test list rendered too.
    const categoryContainer = privacyHeader.closest('div').parentElement;
    expect(within(categoryContainer).getByText('Differential Privacy')).toBeTruthy();
  });

  describe('wmean/deff row inclusion (regression: unrelated yVar must not drop rows)', () => {
    // Column 'a' -> xVar (Value), 'b' -> yVar (irrelevant to wmean/deff, not part
    // of either test's config or computation), 'c' -> zVar (Weight). Every row
    // has finite a & c; b is non-finite (undefined, so +b === NaN) for the first
    // 3 rows. Before the fix, both branches read from the shared `xyz` memo,
    // which requires ALL THREE of xVar/yVar/zVar finite per row -- so those 3
    // rows were silently dropped even though b is irrelevant to either test,
    // shrinking n from 8 to 5.
    const rows = Array.from({ length: 8 }, (_, i) => ({
      a: i + 1,
      b: i < 3 ? undefined : i + 2,
      c: i + 5,
    }));
    const ds = { numeric: ['a', 'b', 'c'], categorical: [] };

    it('wmean (Weighted Descriptives) reports n for all rows with finite Value+Weight, not fewer', () => {
      render(<InferencePanel data={rows} ds={ds} active="wmean" setActive={vi.fn()} />);
      expect(screen.getByText(/Weighted Descriptives · n=8/)).toBeTruthy();
      expect(screen.queryByText(/Weighted Descriptives · n=5/)).toBeNull();
    });

    it('deff (Design Effect) reports n for all rows with a finite Weight, not fewer', () => {
      render(<InferencePanel data={rows} ds={ds} active="deff" setActive={vi.fn()} />);
      expect(screen.getByText(/Design Effect · n=8/)).toBeTruthy();
      expect(screen.queryByText(/Design Effect · n=5/)).toBeNull();
    });
  });

  describe('MDS / Taylor bad-cell and degenerate-input guards (regression: final whole-branch review findings)', () => {
    // v1..v3 are clean numeric scale variables for MDS; one row (index 5)
    // has a non-numeric cell in v1. Before the fix, classicalMDS/sammonMapping/
    // nonMetricMDS return null on ANY non-finite cell across the whole
    // selected-column matrix, so this single bad row killed the entire
    // result ("Configure parameters to the left.") even though 11 of 12
    // rows were perfectly usable.
    const mdsRows = Array.from({ length: 12 }, (_, i) => ({
      v1: i === 5 ? undefined : i + 1,
      v2: (i + 1) * 2 + (i % 3),
      v3: (i + 1) * 1.5 - (i % 2),
    }));
    const mdsDs = { numeric: ['v1', 'v2', 'v3'], categorical: [] };

    it('Classical MDS computes from the rows with finite cells instead of returning nothing for one bad row', () => {
      render(<InferencePanel data={mdsRows} ds={mdsDs} active="mds_classical" setActive={vi.fn()} />);
      expect(screen.queryByText(/Configure parameters to the left\./)).toBeNull();
      expect(screen.getByText(/Classical MDS · 2D · n=11/)).toBeTruthy();
    });

    // Value column 'a' has a non-numeric cell for the first 3 of 25 rows.
    // taylorLinearization requires >=20 rows AFTER this component's own
    // rowFinite(xVar) pre-filter (not just >=20 raw rows), so 25 total
    // leaves 22 post-filter -- comfortably above that floor. cat1
    // (Strata, 4 groups) and cat2 (PSU, 3 groups, decoupled via a
    // different modulus) are chosen so every stratum has multiple PSUs --
    // this isolates the bad-cell path from the separate
    // single-PSU-per-stratum path tested below.
    const taylorRows = Array.from({ length: 25 }, (_, i) => ({
      a: i < 3 ? undefined : i + 1,
      cat1: `g${i % 4}`,
      cat2: `p${i % 3}`,
    }));
    const taylorDs = { numeric: ['a'], categorical: ['cat1', 'cat2'] };

    it('Taylor Linearization computes a real total/SE from the finite rows instead of NaN when the Value column has a bad cell', () => {
      render(<InferencePanel data={taylorRows} ds={taylorDs} active="taylor" setActive={vi.fn()} />);
      expect(screen.queryByText(/NaN/)).toBeNull();
      // 25 rows minus 3 with a non-finite Value cell = 22.
      expect(screen.getByText(/Taylor Linearization · 4 strata · n=22/)).toBeTruthy();
    });

    // Only one categorical column exists, so Strata and PSU both bind to
    // it (cat2 defaults to cat1 when there's no second categorical
    // column) -- every stratum has exactly 1 distinct PSU, and
    // taylorLinearization's own between-PSU variance (nH-1 in the
    // denominator) is genuinely undefined here, a real algorithmic
    // property of the method, not a data-quality bug. This must surface
    // as the explicit error message, not raw NaN. >=20 rows required.
    const degenerateRows = Array.from({ length: 21 }, (_, i) => ({
      a: i + 1,
      cat1: `s${i % 3}`,
    }));
    const degenerateDs = { numeric: ['a'], categorical: ['cat1'] };

    it('Taylor Linearization reports an explicit error, not raw NaN, when every stratum has only 1 PSU', () => {
      render(<InferencePanel data={degenerateRows} ds={degenerateDs} active="taylor" setActive={vi.fn()} />);
      expect(screen.queryByText(/NaN/)).toBeNull();
      expect(screen.getByText(/at least 2 distinct PSU\/cluster values/i)).toBeTruthy();
    });
  });

  describe('dataset switch revalidation (regression: stale cat1/cat2 silently survive a dataset switch)', () => {
    // Mirrors the reported repro: Iris (single categorical column, 'species')
    // switched to Salaries (categorical: rank/discipline/sex, no 'species').
    // Before the fix, cat1/cat2 (Strata/PSU) were initialized once via
    // useState(categorical[0] || '') and never revalidated, so they kept
    // pointing at 'species' after the switch even though the <select>
    // visually falls back to showing its first real option -- the test then
    // silently computed against r['species'] (undefined for every row).
    const irisRows = Array.from({ length: 25 }, (_, i) => ({ species: 'setosa', a: i + 1 }));
    const irisDs = { numeric: ['a'], categorical: ['species'] };

    const salariesRows = Array.from({ length: 25 }, (_, i) => ({
      rank: i % 3 === 0 ? 'Prof' : i % 3 === 1 ? 'AssocProf' : 'AsstProf',
      discipline: i % 2 === 0 ? 'A' : 'B',
      sex: i % 2 === 0 ? 'Male' : 'Female',
      salary: 80000 + i * 1000,
    }));
    const salariesDs = { numeric: ['salary'], categorical: ['rank', 'discipline', 'sex'] };

    it('does not silently compute Taylor Linearization against a stale cat1/cat2 column after a dataset switch', () => {
      const { rerender } = render(
        <InferencePanel data={irisRows} ds={irisDs} active="taylor" setActive={vi.fn()} />,
      );

      rerender(<InferencePanel data={salariesRows} ds={salariesDs} active="taylor" setActive={vi.fn()} />);

      // If cat1/cat2 silently kept pointing at 'species' (absent from Salaries),
      // every row's r['species'] is undefined, which collapses Strata and PSU
      // to a single implicit group each and trips the "needs at least 2
      // distinct PSU/cluster values" guard -- note a native <select> masks this
      // in its own displayed value by falling back to its first real option,
      // which is why this asserts on the actual computed result, not the
      // select's DOM value. With cat1/cat2 correctly reset to real Salaries
      // columns (rank/discipline), the computation runs for real: 3 strata,
      // n=25, no guard error, no NaN.
      expect(screen.queryByText(/at least 2 distinct PSU\/cluster values/i)).toBeNull();
      expect(screen.queryByText(/NaN/)).toBeNull();
      expect(screen.getByText(/Taylor Linearization · 3 strata · n=25/)).toBeTruthy();
    });

    // bifactorGroups holds a nested shape (Array<{items: string[]}>) the
    // generic revalidation logic above didn't originally cover: a stale
    // item name surviving inside a group's own `items` array is invisible
    // to the user (GroupEditor's checklist only ever renders checkboxes
    // for the CURRENT dataset's numeric columns, so a stale item can never
    // be seen or unchecked) yet still reaches bifactorModel's computation,
    // silently producing extra rows in the results table for columns that
    // no longer exist in the loaded dataset. Found during manual
    // verification against the real app, not a hypothetical.
    const bifactorIrisRows = Array.from({ length: 25 }, (_, i) => ({
      sepalLength: 4 + i * 0.1, sepalWidth: 2 + i * 0.05, petalLength: 1 + i * 0.15, petalWidth: 0.1 + i * 0.02,
    }));
    const bifactorIrisDs = { numeric: ['sepalLength', 'sepalWidth', 'petalLength', 'petalWidth'], categorical: [] };

    const bifactorSalariesRows = Array.from({ length: 25 }, (_, i) => ({
      yrs: 1 + i, svc: 1 + i * 0.9, sal: 50000 + i * 2000,
    }));
    const bifactorSalariesDs = { numeric: ['yrs', 'svc', 'sal'], categorical: [] };

    it('does not silently keep stale group items (invisible orphans) in bifactor groups after a dataset switch', () => {
      const { rerender } = render(
        <InferencePanel data={bifactorIrisRows} ds={bifactorIrisDs} active="bifactor" setActive={vi.fn()} />,
      );

      rerender(<InferencePanel data={bifactorSalariesRows} ds={bifactorSalariesDs} active="bifactor" setActive={vi.fn()} />);

      expect(screen.queryByText('sepalLength')).toBeNull();
      expect(screen.queryByText('sepalWidth')).toBeNull();
      expect(screen.queryByText('petalLength')).toBeNull();
      expect(screen.queryByText('petalWidth')).toBeNull();
      // Positive anchor: confirms the panel genuinely re-rendered real
      // content for the new dataset (via the fresh-default fallback
      // split) rather than silently rendering nothing at all. 'yrs'
      // legitimately appears multiple times (GroupEditor's per-group
      // checklist labels plus the results table), so assert presence,
      // not uniqueness.
      expect(screen.getAllByText('yrs').length).toBeGreaterThan(0);
    });

    it('shows bounded omega_t in the APA citation now that @statlab/core@0.1.2 caps general+group loadings', () => {
      // @statlab/core@0.1.2 now standardizes to a correlation matrix before
      // extraction and jointly caps general+group loadings, so omega_t and
      // per-item communality are correctly bounded to [0,1]. The APA citation
      // (rendered at the top of every result, and reused by "copy", "copy all",
      // and the Markdown export) now correctly includes omega_t.
      render(<InferencePanel data={bifactorSalariesRows} ds={bifactorSalariesDs} active="bifactor" setActive={vi.fn()} />);
      expect(screen.getByText(/omega_t/)).toBeTruthy();
      expect(screen.getByText(/omega_h = 0\.746/)).toBeTruthy();
    });

    it('resets all stale numeric/categorical generic state slots on dataset switch (hook-level)', () => {
      const { result, rerender: rerenderHook } = renderHook(
        ({ data, ds }) => useInference(data, ds, 'twoway', vi.fn()),
        { initialProps: { data: irisRows, ds: irisDs } },
      );

      expect(result.current.state.xVar).toBe('a');
      expect(result.current.state.grpVar).toBe('species');

      act(() => {
        rerenderHook({ data: salariesRows, ds: salariesDs });
      });

      const {
        xVar, yVar, zVar, mVar, tgtVar, grpVar, cat1, cat2,
        level2Var, treatVar, ivInstrument, abmValueField, preds, scaleVars, rmCols,
      } = result.current.state;

      for (const col of [xVar, yVar, zVar, mVar, tgtVar, ivInstrument, abmValueField]) {
        expect(col === '' || salariesDs.numeric.includes(col)).toBe(true);
      }
      for (const col of [grpVar, cat1, cat2, level2Var, treatVar]) {
        expect(col === '' || salariesDs.categorical.includes(col)).toBe(true);
      }
      for (const arr of [preds, scaleVars, rmCols]) {
        for (const col of arr) expect(salariesDs.numeric.includes(col)).toBe(true);
      }
    });
  });

  describe('SEM non-convergence guard', () => {
    // The original (pre-0.1.2) fixture for this test rescaled 3 identical-signal
    // columns across ~16 orders of magnitude to force a negative-determinant NaN
    // in mlDiscrepancy. @statlab/core@0.1.2 fixed that exact bug (detS || 1e-10
    // now also catches small negative determinants from floating-point error),
    // so that fixture no longer reproduces non-convergence — confirmed by
    // re-running it against the live 0.1.2 package during this plan's own
    // testing phase (chi2 comes back as a real finite number).
    //
    // A new fixture was found empirically against the live 0.1.2 package: a
    // constant (zero-variance) column mixed with two real-varying columns.
    // 0.1.2's Newton-step-descent-direction fix makes the optimizer converge to
    // a genuine (if nonsensical) finite chi2 here, but the model is still
    // singular enough that both loadings' standard errors come back Infinity —
    // exactly the case semResultOrError's coefsFinite check exists to catch.
    const semRows = Array.from({ length: 25 }, (_, i) => ({
      v1: i + 1,
      v2: i * 2 + 3,
      v3: 5,
    }));
    const semDs = { numeric: ['v1', 'v2'], categorical: [] };

    it('reports an explicit error, not raw NaN/Infinity, when the model does not converge', () => {
      const { container } = render(<InferencePanel data={semRows} ds={semDs} active="sem" setActive={vi.fn()} />);
      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea, { target: { value: 'f1 =~ v1 + v2 + v3' } });
      expect(screen.queryByText(/NaN/)).toBeNull();
      expect(screen.queryByText(/Infinity/)).toBeNull();
      expect(screen.getByText(/did not converge/i)).toBeTruthy();
    });
  });

  describe('Ordinal SEM non-convergence guard', () => {
    // ordinalSEM() reuses sem()'s _fitRAMByML optimizer internally (confirmed
    // against the real @statlab/core@0.1.2 package during this plan's testing
    // phase), so it fails the same way: a constant (zero-variance) column
    // mixed with varying columns produces a finite fit.chisq but a
    // degenerate se on the constant column's loading.
    //
    // This fixture uses 4 items (not 3) specifically so it exercises the
    // se<=0 guard (Bug 2) rather than being intercepted earlier by the
    // item-count/identification guard (Bug 4, see 'Ordinal SEM
    // identification guard' below) -- confirmed against the live
    // @statlab/core@0.1.2 package: with columns v1/v2/v3/v4 as below, v4's
    // loading comes back with se=0 (z=0, p=1), a degenerate "loading" that
    // is finite and so would pass a naive Number.isFinite(se) check.
    //
    // scaleVars defaults to numeric.slice(0, 4) (see InferencePanel.jsx), so
    // listing all 4 columns in ds.numeric selects them automatically — no
    // checkbox interaction needed to trigger computation.
    const ordinalRows = Array.from({ length: 25 }, (_, i) => ({
      v1: i % 2,
      v2: (i + 1) % 2,
      v3: 0,
      v4: i % 3 === 0 ? 1 : 0,
    }));
    const ordinalDs = { numeric: ['v1', 'v2', 'v3', 'v4'], categorical: [] };

    it('reports an explicit error, not raw NaN/Infinity, when the model does not converge', () => {
      render(<InferencePanel data={ordinalRows} ds={ordinalDs} active="ordinal_sem" setActive={vi.fn()} />);
      expect(screen.queryByText(/NaN/)).toBeNull();
      expect(screen.queryByText(/Infinity/)).toBeNull();
      expect(screen.getByText(/did not converge/i)).toBeTruthy();
    });
  });

  describe('SEM scale sensitivity guard', () => {
    // Verified against the live @statlab/core@0.1.2 package: sem() on RAW
    // (unstandardized) iris data with the default 4-indicator equation gives
    // a wrong optimum: chi2=482.09, cfi=0, rmsea=1.27 -- every fit chip would
    // render red for a model that actually fits well. z-scoring the input
    // (see zscoreCols in InferencePanel.jsx) fixes this: chi2=2.97, cfi=0.998,
    // rmsea=0.057, matching the true reference optimum. This test pins that
    // the app-level z-scoring mitigation is actually wired in, not just
    // present in isolation.
    it('does not show a false bad-fit result on real unequal-scale data (iris)', () => {
      const irisRows = makeIris();
      const irisDs = { numeric: ['sepalLength', 'sepalWidth', 'petalLength', 'petalWidth'], categorical: ['species'] };
      render(<InferencePanel data={irisRows} ds={irisDs} active="sem" setActive={vi.fn()} />);
      // With ds.numeric having exactly 4 columns, semEquations defaults to
      // all 4 via numeric.slice(0, Math.min(4, numeric.length)) -- no manual
      // equation entry needed to trigger this.
      expect(screen.queryByText(/did not converge/i)).toBeNull();
      // Chip renders its `value` prop raw (no toFixed formatting — see
      // ui.jsx's Chip component), so the exact fit.chi2 number (2.97,
      // confirmed via a live package run against this exact seeded
      // makeIris() fixture) renders as the literal string "2.97".
      expect(screen.getByText('2.97')).toBeTruthy();
    });
  });

  describe('SEM standard error rescale', () => {
    // @statlab/core@0.1.2's SEM optimizer returns loading/path SEs as the
    // raw sqrt(diag(Hessian^-1)) of its unscaled ML discrepancy function,
    // missing the sqrt(2/(n-1)) asymptotic-covariance factor standard
    // ML-SEM theory requires -- this inflates every SE by roughly
    // sqrt((n-1)/2) (about 8.6x at n=150), making genuinely significant
    // loadings look non-significant. Verified against the live package on
    // this exact seeded makeIris() fixture: uncorrected se=0.881467 on the
    // first loading becomes se=0.102124 (z=-6.5751) after rescaling --
    // this test pins that the app-level rescaleSemCoefs correction in
    // InferencePanel.jsx is actually wired into the sem() computation path.
    it('shows the rescaled (not raw) standard error for SEM loadings', () => {
      const irisRows = makeIris();
      const irisDs = { numeric: ['sepalLength', 'sepalWidth', 'petalLength', 'petalWidth'], categorical: ['species'] };
      render(<InferencePanel data={irisRows} ds={irisDs} active="sem" setActive={vi.fn()} />);
      expect(screen.getByText('0.102124')).toBeTruthy();
      expect(screen.queryByText('0.881467')).toBeNull();
    });
  });

  describe('Ordinal SEM identification guard', () => {
    // Verified: a 3-item one-factor model has 0 true degrees of freedom
    // (df = m*(m-3)/2), but ordinalSEM() internally clamps its reported df
    // to a minimum of 1 and shows a fake perfect fit (cfi=1, rmsea=0). The
    // app-level guard rejects this before it ever reaches ordinalSEM().
    it('rejects a 3-item selection with an explicit identification error, not a fake perfect fit', () => {
      const rows = Array.from({ length: 25 }, (_, i) => ({ v1: i % 4, v2: (i * 2) % 4, v3: (i * 3) % 4 }));
      const ds = { numeric: ['v1', 'v2', 'v3'], categorical: [] };
      render(<InferencePanel data={rows} ds={ds} active="ordinal_sem" setActive={vi.fn()} />);
      expect(screen.getByText(/needs 4\+ items to test model fit/i)).toBeTruthy();
    });
  });
});
