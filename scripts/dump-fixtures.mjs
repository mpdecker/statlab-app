// scripts/dump-fixtures.mjs
//
// Dumps the shared JS test fixtures (src/tests/fixtures/core.js) to JSON so
// scripts/gen-reference.py can compute oracle values on IDENTICAL inputs,
// rather than reimplementing the JS seeded PRNG (mulberry32) in Python.
//
// Run before gen-reference.py whenever src/tests/fixtures/core.js changes:
//   node scripts/dump-fixtures.mjs && python scripts/gen-reference.py
import { writeFileSync } from 'node:fs';
import { mkGroups, mkTabular } from '../src/tests/fixtures/core.js';

const groups = mkGroups();
const tabular = mkTabular(42, 72);

writeFileSync(new URL('./_fixtures_dump.json', import.meta.url), JSON.stringify({
  groups: groups.map(g => ({ name: g.name, vals: g.vals })),
  tabular_x: tabular.map(r => r.x),
  tabular_m: tabular.map(r => r.m),
  tabular_y: tabular.map(r => r.y),
}, null, 2));
console.log('Written to scripts/_fixtures_dump.json');
