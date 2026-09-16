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
});
