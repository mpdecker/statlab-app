// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ExHistogram, ExECDF, ExScatterFit, ExCorrelogram, ExBarCI } from './charts-explore.jsx';

describe('charts-explore', () => {
  test('ExHistogram renders bars', () => {
    const data = Array.from({ length: 30 }, (_, i) => ({ val: i }));
    const { container } = render(<ExHistogram data={data} xVar="val" width={300} height={200} />);
    expect(container.querySelector('svg, .recharts-wrapper')).toBeTruthy();
  });

  test('ExECDF renders a line', () => {
    const data = [{ x: 1 }, { x: 2 }, { x: 3 }];
    const { container } = render(<ExECDF data={data} xVar="x" width={300} height={200} />);
    expect(container.querySelector('.recharts-line')).toBeTruthy();
  });

  test('ExScatterFit renders scatter points', () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ x: i, y: i * 2 }));
    const { container } = render(<ExScatterFit data={data} xVar="x" yVar="y" width={300} height={200} />);
    expect(container.querySelector('.recharts-scatter')).toBeTruthy();
  });

  test('ExCorrelogram renders n×n cells for n vars', () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ a: i, b: i * 2, c: 20 - i }));
    const { container } = render(<ExCorrelogram data={data} vars={['a', 'b', 'c']} width={240} height={240} />);
    expect(container.querySelectorAll('rect').length).toBe(9);
  });

  test('ExBarCI renders bars from data groups', () => {
    const data = [
      { group: 'A', val: 1 }, { group: 'A', val: 2 }, { group: 'B', val: 3 }, { group: 'B', val: 4 },
    ];
    const { container } = render(<ExBarCI data={data} xVar="group" yVar="val" width={300} height={200} />);
    expect(container.querySelector('.recharts-bar')).toBeTruthy();
  });
});
