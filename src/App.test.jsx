// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
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

  test('after launch, renders all four workbench regions and the dataset picker', () => {
    const { getByText, container } = render(<App />);
    fireEvent.click(getByText(/LAUNCH APP/));
    expect(container.querySelector('[data-tutorial-target="navigator"]')).toBeTruthy();
    expect(container.querySelector('[data-tutorial-target="viz"]')).toBeTruthy();
    expect(container.querySelector('[data-tutorial-target="calc"]')).toBeTruthy();
    expect(container.querySelector('[data-tutorial-target="advanced"]')).toBeTruthy();
    expect(container.querySelector('[data-tutorial-target="dataset"]')).toBeTruthy();
  });

  test('survives a pre-Task-6 (navigator/config/quickView) localStorage panel layout blob', () => {
    localStorage.setItem('statlab_panels_v1', JSON.stringify({
      navigator: { width: 240, visible: true },
      config: { width: 280, visible: true },
      quickView: { width: 260, visible: true, position: 'right' },
    }));
    const { getByText, container } = render(<App />);
    fireEvent.click(getByText(/LAUNCH APP/));
    expect(container.querySelector('[data-tutorial-target="calc"]')).toBeTruthy();
    expect(container.querySelector('[data-tutorial-target="advanced"]')).toBeTruthy();
  });

  test('shows a dataset recommendation chip for a test with a mapping', () => {
    const { getByText } = render(<App />);
    fireEvent.click(getByText(/LAUNCH APP/));
    // default activeTest is 't_welch', which recommends salaries/cps/iris
    expect(getByText('Salaries')).toBeTruthy();
  });
});
