// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { Tutorial, hasTutorialSeen, markTutorialSeen } from './Tutorial.jsx';

// Mock localStorage for happy-dom
const localStorageMock = {
  data: {},
  getItem(key) { return this.data[key] || null; },
  setItem(key, value) { this.data[key] = value; },
  clear() { this.data = {}; },
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('Tutorial', () => {
  test('hasTutorialSeen is false until markTutorialSeen is called', () => {
    expect(hasTutorialSeen()).toBe(false);
    markTutorialSeen();
    expect(hasTutorialSeen()).toBe(true);
  });

  test('renders nothing when closed', () => {
    const { container } = render(<Tutorial open={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  test('shows the welcome step first and advances with Next', () => {
    const { getByText } = render(<Tutorial open onClose={() => {}} />);
    expect(getByText('Welcome to StatLab')).toBeTruthy();
    fireEvent.click(getByText('Next'));
    expect(getByText('Pick a test')).toBeTruthy();
  });

  test('Back returns to the previous step', () => {
    const { getByText } = render(<Tutorial open onClose={() => {}} />);
    fireEvent.click(getByText('Next'));
    fireEvent.click(getByText('Back'));
    expect(getByText('Welcome to StatLab')).toBeTruthy();
  });

  test('Skip marks the tutorial seen and closes', () => {
    const onClose = vi.fn();
    const { getByText } = render(<Tutorial open onClose={onClose} />);
    fireEvent.click(getByText('Skip'));
    expect(hasTutorialSeen()).toBe(true);
    expect(onClose).toHaveBeenCalled();
  });

  test('Finish on the last step marks seen and closes', () => {
    const onClose = vi.fn();
    const { getByText } = render(<Tutorial open onClose={onClose} />);
    for (let i = 0; i < 5; i++) fireEvent.click(getByText('Next'));
    expect(getByText('Try other datasets')).toBeTruthy();
    fireEvent.click(getByText('Finish'));
    expect(hasTutorialSeen()).toBe(true);
    expect(onClose).toHaveBeenCalled();
  });

  test('calls onStepChange with the current step id', () => {
    const onStepChange = vi.fn();
    render(<Tutorial open onClose={() => {}} onStepChange={onStepChange} />);
    expect(onStepChange).toHaveBeenCalledWith('welcome');
  });
});
