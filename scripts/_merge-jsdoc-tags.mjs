#!/usr/bin/env node
// Merges additional @param tags into existing single-line JSDoc blocks without
// disturbing tags already present (by param name). Functions with no JSDoc get
// the spec line inserted. Complements _add-jsdoc.mjs for incremental passes
// over already-annotated modules where hand fixes must be preserved.
//
// Usage: node scripts/_merge-jsdoc-tags.mjs <specfile.json>
import { readFileSync, writeFileSync } from 'node:fs';

const spec = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const SINGLE_LINE_JSDOC = /^\s*\/\*\*(.*)\*\/\s*$/;
const paramName = (tag) => tag.match(/@param \{[^}]*\} \[?([A-Za-z0-9_.]+)\]?/)?.[1];

for (const [file, funcs] of Object.entries(spec)) {
  const lines = readFileSync(file, 'utf8').split('\n');
  let appended = 0, inserted = 0, skipped = 0;
  for (const [name, inner] of Object.entries(funcs)) {
    const re = new RegExp(`^export\\s+(?:async\\s+)?(?:function\\s+${name}\\b|const\\s+${name}\\s*=)`);
    const declIdx = lines.findIndex((l) => re.test(l));
    if (declIdx < 0) continue;
    const newTags = inner.split(/(?=@param )/).map((s) => s.trim()).filter((s) => s.startsWith('@param'));
    const m = declIdx > 0 ? lines[declIdx - 1].match(SINGLE_LINE_JSDOC) : null;
    if (m) {
      const existing = m[1].trim();
      const have = new Set(existing.split(/(?=@param )/).map(paramName).filter(Boolean));
      const missing = newTags.filter((t) => !have.has(paramName(t)));
      if (!missing.length) { skipped++; continue; }
      lines[declIdx - 1] = `/** ${existing} ${missing.join(' ')} */`;
      appended++;
    } else if (declIdx > 0 && /\*\/\s*$/.test(lines[declIdx - 1]) ) {
      skipped++; // multi-line JSDoc present — leave it alone
    } else {
      lines.splice(declIdx, 0, `/** ${newTags.join(' ')} */`);
      inserted++;
    }
  }
  writeFileSync(file, lines.join('\n'));
  console.log(`${file.split('/').slice(-2).join('/')}: +${inserted} new, ${appended} merged, ${skipped} skipped`);
}
