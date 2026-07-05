// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InferencePanel } from './InferencePanel.jsx';

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
    expect(screen.getByText(/α \(significance\)/i)).toBeTruthy();
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
    const btn = screen.getByRole('button', { name: /RUN/i });
    fireEvent.click(btn);
    await waitFor(
      () => expect(screen.getByText(/indirect a×b/i)).toBeTruthy(),
      { timeout: 15_000 },
    );
  });
});
