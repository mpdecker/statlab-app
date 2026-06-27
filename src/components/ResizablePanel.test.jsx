// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ResizablePanel } from './ResizablePanel.jsx';

describe('ResizablePanel', () => {
  test('renders children', () => {
    const { getByText } = render(
      <ResizablePanel defaultWidth={300} minWidth={200}>
        <div>Child content</div>
      </ResizablePanel>
    );
    expect(getByText('Child content')).toBeTruthy();
  });
});
