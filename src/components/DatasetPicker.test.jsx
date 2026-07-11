// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { DatasetPicker } from './DatasetPicker.jsx';

afterEach(cleanup);

const datasets = [
  ['iris', { label: 'Iris', desc: '150 flowers · Fisher 1936' }],
  ['diamonds', { label: 'Diamonds', desc: '200 diamonds · cut/color/price' }],
];

describe('DatasetPicker', () => {
  test('shows the active dataset label and row count on the closed button', () => {
    const { getByText } = render(
      <DatasetPicker datasets={datasets} activeKey="iris" activeLabel="Iris" activeCount={150} onSelect={() => {}} />
    );
    expect(getByText(/Iris/)).toBeTruthy();
    expect(getByText(/n=150/)).toBeTruthy();
  });

  test('opens a popover listing all datasets and calls onSelect on click', () => {
    const onSelect = vi.fn();
    const { getByText, queryByText } = render(
      <DatasetPicker datasets={datasets} activeKey="iris" activeLabel="Iris" activeCount={150} onSelect={onSelect} />
    );
    expect(queryByText('Diamonds')).toBeNull();
    fireEvent.click(getByText(/Iris/));
    expect(getByText('Diamonds')).toBeTruthy();
    fireEvent.click(getByText('Diamonds'));
    expect(onSelect).toHaveBeenCalledWith('diamonds');
  });

  test('pins a custom upload entry above the built-ins when present', () => {
    const { getByText } = render(
      <DatasetPicker
        datasets={datasets} activeKey="custom" activeLabel="mydata" activeCount={40}
        customEntry={{ label: 'mydata', desc: '40 rows · custom' }}
        onSelect={() => {}}
      />
    );
    fireEvent.click(getByText(/mydata/));
    expect(getByText('40 rows · custom')).toBeTruthy();
  });

  test('renders a data-tutorial-target="dataset" root element', () => {
    const { container } = render(
      <DatasetPicker datasets={datasets} activeKey="iris" activeLabel="Iris" activeCount={150} onSelect={() => {}} />
    );
    expect(container.querySelector('[data-tutorial-target="dataset"]')).toBeTruthy();
  });
});
