// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  ViolinPlot, BoxPlot, BarCI, HeatmapCorr, QuickSlopes, IRTCurves,
  QQPlot, ResidualPlot, PowerCurve, ScreePlot, LCAProfiles, SpaghettiPlot,
  ITSPlot, RDPlot, BootstrapHist, MDSPlot,
} from './charts.jsx';

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

  test('QuickSlopes renders bars for simple slopes', () => {
    const slopes = [{ z: 'Z-1SD', slope: 0.2 }, { z: 'Z̄', slope: 0.5 }, { z: 'Z+1SD', slope: 0.8 }];
    const { container } = render(<QuickSlopes slopes={slopes} />);
    expect(container.querySelectorAll('rect').length).toBe(3);
  });

  test('IRTCurves renders ICC label and chart shell', () => {
    const icc = Array.from({ length: 10 }, (_, i) => ({
      theta: -2 + i * 0.4,
      curves: [0.2, 0.5, 0.8],
    }));
    const { getByText, container } = render(<IRTCurves icc={icc} itemCount={3} />);
    expect(getByText(/ICC/)).toBeTruthy();
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
  });

  test('HeatmapCorr renders n×n SVG cells', () => {
    const matrix = [[1, 0.5], [0.5, 1]];
    const labels = ['x', 'y'];
    const { container } = render(<HeatmapCorr matrix={matrix} labels={labels} width={160} height={160} />);
    expect(container.querySelectorAll('rect').length).toBe(4);
  });

  test('QQPlot honors a custom height prop', () => {
    const vals = [1, 2, 3, 4, 5, 6];
    const { container } = render(<QQPlot vals={vals} label="x" height={300} />);
    expect(container.firstChild.style.height).toBe('300px');
  });

  test('ResidualPlot honors a custom height prop', () => {
    const { container } = render(<ResidualPlot fitted={[1, 2, 3]} residuals={[.1, -.1, .05]} height={300} />);
    expect(container.firstChild.style.height).toBe('300px');
  });

  test('PowerCurve honors a custom height prop', () => {
    const { container } = render(<PowerCurve d={0.5} currentN={20} height={300} />);
    expect(container.firstChild.style.height).toBe('300px');
  });

  test('ScreePlot honors a custom height prop', () => {
    const { container } = render(<ScreePlot eigenvalues={[2, 1, 0.5]} height={300} />);
    expect(container.firstChild.style.height).toBe('300px');
  });

  test('IRTCurves honors a custom height prop', () => {
    const icc = [{ theta: -1, curves: [.2, .5] }, { theta: 1, curves: [.6, .7] }];
    const { container } = render(<IRTCurves icc={icc} itemCount={2} height={300} />);
    expect(container.firstChild.style.height).toBe('300px');
  });

  test('LCAProfiles honors a custom height prop', () => {
    const profiles = [{ class: 1, proportion: .5 }, { class: 2, proportion: .5 }];
    const { container } = render(<LCAProfiles profiles={profiles} height={300} />);
    expect(container.firstChild.style.height).toBe('300px');
  });

  test('SpaghettiPlot honors a custom height prop', () => {
    const data = [{ g: 'a', x: 1, y: 2 }, { g: 'a', x: 2, y: 3 }];
    const { container } = render(<SpaghettiPlot data={data} xVar="x" yVar="y" groupVar="g" height={300} />);
    expect(container.firstChild.style.height).toBe('300px');
  });

  test('ITSPlot honors a custom height prop', () => {
    const { container } = render(<ITSPlot series={[{ t: 1, y: 2 }, { t: 2, y: 3 }]} height={300} />);
    expect(container.firstChild.style.height).toBe('300px');
  });

  test('RDPlot honors a custom height prop', () => {
    const { container } = render(<RDPlot points={[{ x: 1, y: 2 }, { x: 5, y: 8 }]} cutoff={3} height={300} />);
    expect(container.firstChild.style.height).toBe('300px');
  });

  test('BootstrapHist honors a custom height prop', () => {
    const { container } = render(<BootstrapHist dist={[1, 2, 3, 4, 5, 6, 7, 8]} lo={2} hi={7} height={300} />);
    expect(container.firstChild.style.height).toBe('300px');
  });

  test('MDSPlot renders a scatter of 2D points', () => {
    const points = [[0.5, -0.2], [-0.3, 0.4], [0.1, 0.1], [-0.6, -0.5]];
    const { container } = render(<MDSPlot points={points} stress={0.05} n={4} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
  });

  test('MDSPlot returns null for empty points', () => {
    const { container } = render(<MDSPlot points={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
