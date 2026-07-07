// Structural hygiene guards for the published library. These protect invariants
// that ordinary unit tests won't catch — a module accidentally depending on a
// test fixture, or a utility being copy-pasted instead of imported.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const srcDir = join(dirname(fileURLToPath(import.meta.url)));

// Non-test source modules that ship in the package: the flat .js files in
// src/math and src/methods (excludes *.test.js and the fixtures/ helper dirs,
// which are test-only and stripped from the published tarball).
function engineModules() {
  const out = [];
  for (const sub of ['math', 'methods']) {
    for (const f of readdirSync(join(srcDir, sub))) {
      if (f.endsWith('.js') && !f.endsWith('.test.js')) out.push(join(sub, f));
    }
  }
  return out;
}

const IMPORT_RE = /(?:import|export)[^'"]*from\s+['"]([^'"]+)['"]/g;

describe('library structure', () => {
  it('no shipped module imports from a test fixture', () => {
    const offenders = [];
    for (const rel of engineModules()) {
      const src = readFileSync(join(srcDir, rel), 'utf8');
      for (const m of src.matchAll(IMPORT_RE)) {
        const spec = m[1];
        if (/(^|\/)(fixtures|__fixtures__)\//.test(spec)) {
          offenders.push(`${rel} -> ${spec}`);
        }
      }
    }
    expect(offenders, `shipped modules importing test fixtures:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('the seeded PRNG (mulberry32) has a single definition', () => {
    // One source of truth in math/rng.js; everything else imports it. Two
    // definitions previously diverged silently past ~4.9M draws.
    const defs = [];
    for (const sub of ['math', 'methods']) {
      const walk = (dir, base) => {
        for (const f of readdirSync(join(srcDir, base), { withFileTypes: true })) {
          const rel = join(base, f.name);
          if (f.isDirectory()) walk(dir, rel);
          else if (f.name.endsWith('.js') && !f.name.endsWith('.test.js')) {
            const src = readFileSync(join(srcDir, rel), 'utf8');
            if (/function mulberry32\b|mulberry32\s*=/.test(src)) defs.push(rel.replace(/\\/g, '/'));
          }
        }
      };
      walk(sub, sub);
    }
    expect(defs, `mulberry32 defined in: ${defs.join(', ')}`).toEqual(['math/rng.js']);
  });
});
