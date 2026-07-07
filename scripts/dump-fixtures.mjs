// scripts/dump-fixtures.mjs
//
// Dumps the shared JS test fixtures (packages/statlab/src/methods/fixtures/core.js) to JSON so
// scripts/gen-reference.py can compute oracle values on IDENTICAL inputs,
// rather than reimplementing the JS seeded PRNG (mulberry32) in Python.
//
// Run before gen-reference.py whenever packages/statlab/src/methods/fixtures/core.js changes:
//   node scripts/dump-fixtures.mjs && python scripts/gen-reference.py
import { writeFileSync } from 'node:fs';
import { mkGroups, mkTabular } from '../packages/statlab/src/methods/fixtures/core.js';
import { nestedHLM } from '../packages/statlab/src/methods/fixtures/phase3.js';

const groups = mkGroups();
const tabular = mkTabular(42, 72);
const hlm = nestedHLM();

writeFileSync(new URL('./_fixtures_dump.json', import.meta.url), JSON.stringify({
  groups: groups.map(g => ({ name: g.name, vals: g.vals })),
  tabular_x: tabular.map(r => r.x),
  tabular_m: tabular.map(r => r.m),
  tabular_y: tabular.map(r => r.y),
  hlm: hlm,
}, null, 2));
console.log('Written to scripts/_fixtures_dump.json');
