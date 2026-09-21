// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary.jsx';

function Bomb() {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  test('renders children normally when nothing throws', () => {
    const { getByText } = render(<ErrorBoundary><div>ok</div></ErrorBoundary>);
    expect(getByText('ok')).toBeTruthy();
  });

  test('catches a render error and shows a fallback instead of propagating', () => {
    // React logs the caught error to console.error by default; keep the
    // test output clean without hiding a genuine assertion failure.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { getByText } = render(<ErrorBoundary><Bomb /></ErrorBoundary>);
    expect(getByText(/chart failed to render/i)).toBeTruthy();
    spy.mockRestore();
  });
});
