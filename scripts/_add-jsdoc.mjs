#!/usr/bin/env node
// Comment-only JSDoc injector: inserts (or replaces a single-line) JSDoc block
// directly above each named export so `tsc` emits real parameter types. Never
// touches implementation code. Spec: { "<abs file>": { funcName: "<jsdoc inner>" } }.
//
// Usage: node scripts/_add-jsdoc.mjs <specfile.json>
import { readFileSync, writeFileSync } from 'node:fs';

const spec = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const SINGLE_LINE_JSDOC = /^\s*\/\*\*.*\*\/\s*$/;

for (const [file, funcs] of Object.entries(spec)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  let inserted = 0, replaced = 0, missing = [];

  for (const [name, inner] of Object.entries(funcs)) {
    const re = new RegExp(`^export\\s+(?:async\\s+)?(?:function\\s+${name}\\b|const\\s+${name}\\s*=)`);
    const declIdx = lines.findIndex((l) => re.test(l));
    if (declIdx < 0) { missing.push(name); continue; }
    let jsdoc = `/** ${inner} */`;
    if (declIdx > 0 && SINGLE_LINE_JSDOC.test(lines[declIdx - 1])) {
      // If the spec is tags-only (starts with @), keep the existing description
      // and append the tags; otherwise the spec's description replaces it.
      if (inner.startsWith('@')) {
        const existing = lines[declIdx - 1].replace(/^\s*\/\*\*\s?/, '').replace(/\s*\*\/\s*$/, '').trim();
        if (existing && !existing.startsWith('@')) jsdoc = `/** ${existing} ${inner} */`;
      }
      lines[declIdx - 1] = jsdoc;
      replaced++;
    } else {
      lines.splice(declIdx, 0, jsdoc);
      inserted++;
    }
  }

  writeFileSync(file, lines.join('\n'));
  const rel = file.split('/').slice(-2).join('/');
  console.log(`${rel}: +${inserted} inserted, ${replaced} replaced` + (missing.length ? `, MISSING: ${missing.join(', ')}` : ''));
}
