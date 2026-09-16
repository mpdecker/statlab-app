// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
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
});
