// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  IRTCurves, LCAProfiles, SpaghettiPlot, CaterpillarPlot,
  ITSPlot, RDPlot, SociogramPlot, ScreePlot,
} from './charts.jsx';

describe('Phase 3 charts', () => {
  test('IRTCurves renders ICC label', () => {
    const icc = Array.from({ length: 5 }, (_, i) => ({
      theta: -1 + i * 0.5,
      curves: [0.3, 0.6],
    }));
    const { getByText } = render(<IRTCurves icc={icc} itemCount={2} />);
    expect(getByText(/ICC/)).toBeTruthy();
  });

  test('LCAProfiles renders class proportion chart', () => {
    const profiles = [
      { class: 1, proportion: 0.6, items: [{ var: 'c1', mode: 'yes' }] },
      { class: 2, proportion: 0.4, items: [{ var: 'c1', mode: 'no' }] },
    ];
    const { getByText, container } = render(<LCAProfiles profiles={profiles} />);
    expect(getByText(/Class proportions/)).toBeTruthy();
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
  });

  test('SpaghettiPlot renders chart shell', () => {
    const data = [
      { school: 'S1', x: 1, y: 10 },
      { school: 'S1', x: 2, y: 12 },
      { school: 'S2', x: 1, y: 8 },
    ];
    const { getByText, container } = render(
      <SpaghettiPlot data={data} xVar="x" yVar="y" groupVar="school" />,
    );
    expect(getByText(/Spaghetti/)).toBeTruthy();
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
  });

  test('CaterpillarPlot renders group mean dots', () => {
    const groups = [
      { name: 'S1', mean: 50, n: 10 },
      { name: 'S2', mean: 55, n: 12 },
    ];
    const { container } = render(<CaterpillarPlot groups={groups} />);
    expect(container.querySelectorAll('circle').length).toBe(2);
  });

  test('ITSPlot renders series', () => {
    const series = [
      { t: 1, y: 10, post: 0 },
      { t: 2, y: 12, post: 1 },
    ];
    const { container } = render(<ITSPlot series={series} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
  });

  test('RDPlot renders cutoff reference', () => {
    const points = [
      { x: -1, y: 5, side: 'left' },
      { x: 1, y: 8, side: 'right' },
    ];
    const { container } = render(<RDPlot points={points} cutoff={0} />);
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
  });

  test('SociogramPlot renders nodes', () => {
    const nodes = [{ id: 0, x: 0, y: 0 }, { id: 1, x: 1, y: 1 }];
    const edges = [{ from: 0, to: 1, weight: 1 }];
    const { container } = render(<SociogramPlot nodes={nodes} edges={edges} />);
    expect(container.querySelectorAll('circle').length).toBe(2);
  });

  test('ScreePlot accepts parallel analysis eigenvalues', () => {
    const { getByText } = render(<ScreePlot eigenvalues={[2.1, 1.2, 0.9, 0.5]} />);
    expect(getByText(/Scree/)).toBeTruthy();
  });
});
