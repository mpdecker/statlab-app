// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { InferencePanel } from './InferencePanel.jsx';

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

  describe('SEM non-convergence guard', () => {
    // sem() requires m >= 3 distinct observed variables (returns null below
    // that) and floors residual variances at a sane minimum, so an equation
    // that merely repeats ONE column's name 3x (m collapses to 1) or uses 3
    // real but well-scaled duplicate/collinear columns both converge fine or
    // return null -- neither exercises the semResultOrError error branch.
    // What genuinely drives the real ML fit to a non-finite chi2 is 3
    // distinct columns carrying the exact same underlying signal (v1) but
    // rescaled across ~16 orders of magnitude (1e8 and 1e-8): the resulting
    // observed covariance matrix is singular enough that its determinant,
    // computed via cofactor expansion in floating point, comes out as a
    // tiny NEGATIVE number rather than exactly 0 -- and unlike the model
    // covariance's determinant (which sem.js does check for <=0), the
    // observed covariance's determinant is only guarded with `|| 1e-10`,
    // which does not catch a negative (non-zero) value. Math.log() of that
    // negative determinant yields NaN, which propagates into fit.chi2 (and
    // fit.aic/bic). Confirmed against the real package (not mocked): this
    // exact 30-row, 3-column fixture produces fit.chi2 = NaN while
    // fit.cfi/tli/rmsea/srmr stay finite (0 or 1, since df<=0 short-circuits
    // their computation) -- exactly the case semResultOrError exists to
    // catch. (The brief's originally-proposed 'f1 =~ v1 + v1 + v1' against a
    // 2-numeric-column fixture was tried first and does NOT reproduce this:
    // it collapses to m=1 and sem() returns null before ever fitting.)
    const semRows = Array.from({ length: 30 }, (_, i) => ({
      v1: i + 1,
      v2: (i + 1) * 1e8,
      v3: (i + 1) * 1e-8,
    }));
    // Only 2 numeric columns are advertised via ds.numeric (v3 exists in the
    // row data sem() reads directly, but is deliberately left out here) so
    // the dataset-derived default (numeric.length >= 3) does NOT kick in
    // and the textarea starts blank, same as the upstream Survey/MDS-phase
    // guard tests in this file.
    const semDs = { numeric: ['v1', 'v2'], categorical: [] };

    it('reports an explicit error, not raw NaN/Infinity, when the model does not converge', () => {
      const { container } = render(<InferencePanel data={semRows} ds={semDs} active="sem" setActive={vi.fn()} />);
      // TA (src/components/ui.jsx) renders a bare <textarea> with a plain
      // sibling <label> (no htmlFor/id pairing), so getByLabelText cannot
      // find it -- query the DOM node directly. This "sem" config panel
      // renders exactly one TA, so exactly one <textarea> exists here.
      const textarea = container.querySelector('textarea');
      fireEvent.change(textarea, { target: { value: 'f1 =~ v1 + v2 + v3' } });
      expect(screen.queryByText(/NaN/)).toBeNull();
      expect(screen.queryByText(/Infinity/)).toBeNull();
      expect(screen.getByText(/did not converge/i)).toBeTruthy();
    });
  });
});
