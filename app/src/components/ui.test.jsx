// @vitest-environment happy-dom
import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { Chip, Sel, Inp, TA, CheckList, Toggle, NormBadge, APABlock, SigBadge, SectionHead, CTip, ActionBtn, LinkBtn } from './ui.jsx';

describe('ui components', () => {
  test('Chip renders label and value', () => {
    const { getByText } = render(<Chip label="TEST" value="0.05" />);
    expect(getByText('TEST')).toBeTruthy();
    expect(getByText('0.05')).toBeTruthy();
  });

  test('Chip renders sub when provided', () => {
    const { getByText } = render(<Chip label="N" value="100" sub="df=99" />);
    expect(getByText('df=99')).toBeTruthy();
  });

  test('Sel renders options and fires onChange', () => {
    let val = 'a';
    const { getByRole } = render(
      <Sel label="Group" value={val} onChange={v => val = v} options={[{value:'a',label:'A'},{value:'b',label:'B'}]} />
    );
    const sel = getByRole('combobox');
    fireEvent.change(sel, { target: { value: 'b' } });
    expect(val).toBe('b');
  });

  test('Inp renders and fires onChange', () => {
    let val = '';
    const { getByRole } = render(<Inp value={val} onChange={v => val = v} placeholder="type here" />);
    const inp = getByRole('textbox');
    fireEvent.change(inp, { target: { value: 'hello' } });
    expect(val).toBe('hello');
  });

  test('TA renders and fires onChange', () => {
    let val = '';
    const { container } = render(<TA value={val} onChange={v => val = v} rows={3} />);
    const ta = container.querySelector('textarea');
    fireEvent.change(ta, { target: { value: 'multi\nline' } });
    expect(val).toBe('multi\nline');
  });

  test('CheckList toggles selection', () => {
    let selected = ['a'];
    const onChange = (fn) => { selected = fn(selected); };
    const { getByLabelText } = render(
      <CheckList items={['a', 'b', 'c']} selected={selected} onChange={onChange} />
    );
    fireEvent.click(getByLabelText('b'));
    expect(selected).toContain('b');
    fireEvent.click(getByLabelText('a'));
    expect(selected).not.toContain('a');
  });

  test('Toggle switches on click', () => {
    let val = false;
    const { container } = render(<Toggle label="Enable" value={val} onChange={v => val = v} />);
    const switchEl = container.querySelector('[style*="cursor: pointer"]');
    fireEvent.click(switchEl);
    expect(val).toBe(true);
  });

  test('NormBadge returns null when nt is null', () => {
    const { container } = render(<NormBadge nt={null} label="test" />);
    expect(container.innerHTML).toBe('');
  });

  test('NormBadge shows checkmark for normal', () => {
    const { getByText } = render(<NormBadge nt={{ normal: true, stat: 0.5, p: 0.8 }} label="X" />);
    expect(getByText(/\u2713/)).toBeTruthy();
  });

  test('APABlock renders text and copy button', () => {
    const { getByText } = render(<APABlock text="t(9)=2.26" onCopy={() => {}} />);
    expect(getByText('t(9)=2.26')).toBeTruthy();
    expect(getByText('copy')).toBeTruthy();
  });

  test('APABlock returns null when no text', () => {
    const { container } = render(<APABlock text={null} />);
    expect(container.innerHTML).toBe('');
  });

  test('SigBadge shows significant when p < alpha', () => {
    const { getByText } = render(<SigBadge p={0.01} alpha={0.05} />);
    expect(getByText(/SIGNIFICANT/)).toBeTruthy();
  });

  test('SigBadge shows not significant when p >= alpha', () => {
    const { getByText } = render(<SigBadge p={0.5} alpha={0.05} />);
    expect(getByText(/NOT SIGNIFICANT/)).toBeTruthy();
  });

  test('SigBadge returns null for null p', () => {
    const { container } = render(<SigBadge p={null} />);
    expect(container.innerHTML).toBe('');
  });

  test('SectionHead renders label', () => {
    const { getByText } = render(<SectionHead label="Results" color="#fff" />);
    expect(getByText('Results')).toBeTruthy();
  });

  test('CTip renders payload values', () => {
    const { getByText } = render(
      <CTip active={true} payload={[{ name: 'x', value: 3.14159, color: '#f00' }]} label="Point" />
    );
    expect(getByText('3.1416')).toBeTruthy();
  });

  test('CTip returns null when inactive', () => {
    const { container } = render(<CTip active={false} payload={[]} />);
    expect(container.innerHTML).toBe('');
  });

  test('ActionBtn renders and clicks', () => {
    let clicked = false;
    const { getByText } = render(<ActionBtn label="Run" onClick={() => clicked = true} />);
    fireEvent.click(getByText('Run'));
    expect(clicked).toBe(true);
  });

  test('LinkBtn renders and clicks', () => {
    let clicked = false;
    const { getByText } = render(<LinkBtn label="Open" onClick={() => clicked = true} />);
    fireEvent.click(getByText('Open'));
    expect(clicked).toBe(true);
  });
});
