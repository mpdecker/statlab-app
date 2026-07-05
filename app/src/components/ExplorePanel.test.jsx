// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import ExplorePanel from './ExplorePanel.jsx';

const mockData = Array.from({ length: 20 }, (_, i) => ({
  x: i, y: i * 2, group: i % 2 === 0 ? 'A' : 'B',
}));

describe('ExplorePanel', () => {
  test('renders without crashing', () => {
    const { container } = render(<ExplorePanel data={mockData} seed={null} />);
    expect(container.firstChild).toBeTruthy();
  });

  test('seeds active chart from chartType mode', () => {
    const { container } = render(
      <ExplorePanel data={mockData} seed={{ chartType: 'heatmap', chartLabelDisplay: 'Correlogram' }} />,
    );
    expect(container.textContent).toMatch(/Correlogram\s+·\s+x/);
  });
});
