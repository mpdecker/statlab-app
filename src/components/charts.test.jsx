// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ViolinPlot, BoxPlot, BarCI, HeatmapCorr } from './charts.jsx';

describe('charts', () => {
  test('ViolinPlot renders an SVG', () => {
    const { container } = render(<ViolinPlot data={[1, 2, 3, 4, 5, 6, 7]} width={200} height={120} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  test('BoxPlot renders median line', () => {
    const { container } = render(<BoxPlot data={[1, 2, 3, 4, 5]} width={200} height={80} />);
    expect(container.querySelector('[data-testid="median"]')).toBeTruthy();
  });

  test('BarCI renders a BarChart', () => {
    const groups = [{ name: 'A', mean: 5, se: 0.5 }, { name: 'B', mean: 8, se: 0.7 }];
    const { container } = render(<BarCI groups={groups} width={300} height={200} />);
    expect(container.querySelector('.recharts-bar')).toBeTruthy();
  });

  test('HeatmapCorr renders n×n SVG cells', () => {
    const matrix = [[1, 0.5], [0.5, 1]];
    const labels = ['x', 'y'];
    const { container } = render(<HeatmapCorr matrix={matrix} labels={labels} width={160} height={160} />);
    expect(container.querySelectorAll('rect').length).toBe(4);
  });
});
