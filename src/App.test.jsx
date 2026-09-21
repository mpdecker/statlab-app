// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, waitFor, screen } from '@testing-library/react';
import App from './App.jsx';

// happy-dom's localStorage is unusable in this Node version (Node's own
// experimental global Web Storage shadows it without a backing file, so
// methods like .clear() are missing) — mock it the same way Tutorial.test.jsx
// does.
const localStorageMock = {
  data: {},
  getItem(key) { return this.data[key] ?? null; },
  setItem(key, value) { this.data[key] = value; },
  removeItem(key) { delete this.data[key]; },
  clear() { this.data = {}; },
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('App', () => {
  test('renders the landing page before launch', () => {
    const { getByText } = render(<App />);
    expect(getByText(/LAUNCH APP/)).toBeTruthy();
  });

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
    // Toolbar button text now matches CHART_MODE_LABELS (the app's one
    // existing source of truth for chart-mode names) exactly, not a
    // second, independently-worded copy that can disagree with it.
    expect(getByText('Correlogram')).toBeTruthy();
    expect(getByText('Mosaic')).toBeTruthy();
    expect(getByText('Time Series')).toBeTruthy();
    // The default test (Welch t-test) auto-selects the "violin" mode,
    // which has its own toolbar button — its name must appear exactly
    // once in the toolbar row (the button), not twice (button + a
    // separate "current mode" label repeating the same word next to it).
    expect(screen.getAllByText('Violin').length).toBe(1);
  });

  test('survives a pre-Task-6 (navigator/config/quickView) localStorage panel layout blob', async () => {
    localStorage.setItem('statlab_panels_v1', JSON.stringify({
      navigator: { width: 240, visible: true },
      config: { width: 280, visible: true },
      quickView: { width: 260, visible: true, position: 'right' },
    }));
    const { getByText, container } = render(<App />);
    fireEvent.click(getByText(/LAUNCH APP/));
    await waitFor(() => expect(container.querySelector('[data-tutorial-target="calc"]')).toBeTruthy(), { timeout: 10000 });
    expect(container.querySelector('[data-tutorial-target="advanced"]')).toBeTruthy();
  });

  test('shows a dataset recommendation chip for a test with a mapping', async () => {
    const { getByText, findByText } = render(<App />);
    fireEvent.click(getByText(/LAUNCH APP/));
    // default activeTest is 't_welch', which recommends salaries/cps/iris
    expect(await findByText('Salaries', {}, { timeout: 10000 })).toBeTruthy();
  });
});
