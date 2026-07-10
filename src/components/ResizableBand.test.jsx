// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ResizableBand } from './ResizableBand.jsx';

describe('ResizableBand', () => {
  test('renders children when expanded', () => {
    const { getByText } = render(
      <ResizableBand title="Calc" defaultHeight={300} minHeight={120}>
        <div>Band content</div>
      </ResizableBand>
    );
    expect(getByText('Band content')).toBeTruthy();
  });

  test('hides children but keeps the title bar when collapsed', () => {
    const { queryByText, getByText } = render(
      <ResizableBand title="Calculation & Interface" collapsed onToggleCollapse={() => {}}>
        <div>Band content</div>
      </ResizableBand>
    );
    expect(queryByText('Band content')).toBeNull();
    expect(getByText('Calculation & Interface')).toBeTruthy();
  });

  test('clicking the chevron calls onToggleCollapse', () => {
    const onToggleCollapse = vi.fn();
    const { getByTitle } = render(
      <ResizableBand title="Calc" collapsed onToggleCollapse={onToggleCollapse}>
        <div>Band content</div>
      </ResizableBand>
    );
    fireEvent.click(getByTitle('Expand Calc'));
    expect(onToggleCollapse).toHaveBeenCalled();
  });

  test('forwards extra DOM attributes to the root element', () => {
    const { container } = render(
      <ResizableBand title="Calc" data-tutorial-target="calc">
        <div>x</div>
      </ResizableBand>
    );
    expect(container.querySelector('[data-tutorial-target="calc"]')).toBeTruthy();
  });
});
