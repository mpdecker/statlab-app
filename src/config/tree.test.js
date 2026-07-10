import { describe, it, expect } from 'vitest';
import { TREE } from './tree.js';

describe('TREE', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(TREE)).toBe(true);
    expect(TREE.length).toBeGreaterThan(5);
  });

  it('every category has cat, color, and tests array', () => {
    for (const cat of TREE) {
      expect(typeof cat.cat).toBe('string');
      expect(typeof cat.color).toBe('string');
      expect(Array.isArray(cat.tests)).toBe(true);
      expect(cat.tests.length).toBeGreaterThan(0);
    }
  });

  it('every test has id, label, and tag', () => {
    for (const cat of TREE) {
      for (const t of cat.tests) {
        expect(typeof t.id).toBe('string');
        expect(typeof t.label).toBe('string');
        expect(typeof t.tag).toBe('string');
      }
    }
  });

  it('no duplicate test IDs across categories', () => {
    const ids = new Set();
    for (const cat of TREE) {
      for (const t of cat.tests) {
        expect(ids.has(t.id)).toBe(false);
        ids.add(t.id);
      }
    }
  });
});
