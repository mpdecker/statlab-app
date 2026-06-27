// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { InferenceResults } from './InferenceResults.jsx';

const mockResult = { test: 'Welch t-test', t: 2.26, df: 18, p: 0.036, apa: 't(18) = 2.26, p = .036' };

describe('InferenceResults', () => {
  test('renders result without crashing', () => {
    const { container } = render(
      <InferenceResults r={mockResult} active="t_welch" alpha={0.05} g1="" g2="" g1vals={[]} g2vals={[]} normG1={null} normG2={null} levene={null} scaleVars={[]} ds={{ numeric: [], categorical: [] }} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  test('renders APA text when present', () => {
    const { getAllByText } = render(
      <InferenceResults r={mockResult} active="t_welch" alpha={0.05} g1="" g2="" g1vals={[]} g2vals={[]} normG1={null} normG2={null} levene={null} scaleVars={[]} ds={{ numeric: [], categorical: [] }} />
    );
    expect(getAllByText(/t\(18\)/).length).toBeGreaterThanOrEqual(1);
  });

  test('handles null result gracefully', () => {
    const { container } = render(
      <InferenceResults r={null} active="t_welch" alpha={0.05} g1="" g2="" g1vals={[]} g2vals={[]} normG1={null} normG2={null} levene={null} scaleVars={[]} ds={{ numeric: [], categorical: [] }} />
    );
    expect(container.firstChild).toBeTruthy();
  });
});
