import { describe, it, expect } from 'vitest';
import { METHOD_NOTES } from './methodNotes.js';
import { TREE } from './tree.js';

describe('methodNotes', () => {
  it('is a non-empty object', () => {
    expect(typeof METHOD_NOTES).toBe('object');
    expect(Object.keys(METHOD_NOTES).length).toBeGreaterThan(10);
  });

  it('every entry has description, usage, assumptions, cite', () => {
    for (const [key, note] of Object.entries(METHOD_NOTES)) {
      if (typeof note === 'string') {
        expect(note.length).toBeGreaterThan(0);
        continue;
      }
      expect(typeof note.description).toBe('string');
      if (note.usage !== undefined) expect(typeof note.usage).toBe('string');
      if (note.assumptions !== undefined) expect(Array.isArray(note.assumptions)).toBe(true);
      if (note.cite !== undefined) expect(typeof note.cite).toBe('string');
    }
  });

  it('all TREE test IDs have corresponding notes', () => {
    const treeIds = new Set();
    for (const cat of TREE) {
      for (const t of cat.tests) treeIds.add(t.id);
    }
    const noteIds = new Set(Object.keys(METHOD_NOTES));
    for (const id of treeIds) {
      expect(noteIds.has(id)).toBe(true);
    }
  });
});
