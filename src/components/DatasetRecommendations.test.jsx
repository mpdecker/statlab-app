// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { DatasetRecommendations } from './DatasetRecommendations.jsx';

afterEach(cleanup);

describe('DatasetRecommendations', () => {
  test('renders nothing for a test with no mapping', () => {
    const { container } = render(
      <DatasetRecommendations activeTest="pow_anova" dsKey="iris" onSelectDataset={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders the recommended dataset chip for a mapped test', () => {
    const { getByText } = render(
      <DatasetRecommendations activeTest="efa" dsKey="iris" onSelectDataset={() => {}} />
    );
    expect(getByText('Life Satisfaction Survey')).toBeTruthy();
  });

  test('clicking a chip calls onSelectDataset with the dataset key', () => {
    const onSelectDataset = vi.fn();
    const { getByText } = render(
      <DatasetRecommendations activeTest="t_welch" dsKey="iris" onSelectDataset={onSelectDataset} />
    );
    fireEvent.click(getByText('Salaries'));
    expect(onSelectDataset).toHaveBeenCalledWith('salaries');
  });

  test('marks the active dataset chip distinctly from inactive ones', () => {
    const { getByText } = render(
      <DatasetRecommendations activeTest="t_welch" dsKey="salaries" onSelectDataset={() => {}} />
    );
    const activeChip = getByText('Salaries').closest('button');
    const inactiveChip = getByText('CPS 1985').closest('button');
    expect(activeChip.style.color).not.toBe(inactiveChip.style.color);
  });
});
