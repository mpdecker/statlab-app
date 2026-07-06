#!/usr/bin/env node
// Re-classifies `@param {Array<Record<string, any>>} data` annotations emitted
// by the bulk generator. The blanket rows-type was wrong for modules where
// `data` is a numeric vector or matrix. Decides from body evidence; drops the
// tag when inconclusive (untyped beats mistyped).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(import.meta.dirname, '..', 'packages', 'statlab', 'src', 'methods');
const ROWS_TAG = '@param {Array<Record<string, any>>} data';

const isRows = (b) =>
  /data\.(map|filter|forEach|flatMap|every|some)\(\(?r\b|\[yVar\]|\[xVar|\[groupVar|\[clusterVar|\[treatVar|\[timeVar|\[idVar|\[valueField|Object\.keys\(data\[0\]\)/.test(b);
const isMatrix = (b) => /data\[0\]\s*(\.length|\[)/.test(b);
const isVector = (b) =>
  /Number\.isFinite\(\s*\+?\s*data\[|avg\(data\)|sampleSD\(data\)|median\(data\)|\[\.\.\.data\]\.sort\(\(a, b\) => a - b\)|data\.reduce\(\(\s*s\s*,\s*(x|v|a)\s*\)|data\.filter\(Number\.isFinite\)/.test(b);

let kept = 0, toVec = 0, toMat = 0, dropped = 0;
for (const f of readdirSync(SRC)) {
  if (!f.endsWith('.js') || f.endsWith('.test.js')) continue;
  const path = join(SRC, f);
  const lines = readFileSync(path, 'utf8').split('\n');
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes(ROWS_TAG) || !lines[i].trim().startsWith('/**')) continue;
    const body = lines.slice(i + 1, i + 41).join('\n');
    if (isRows(body)) { kept++; continue; }
    let repl;
    if (isMatrix(body)) { repl = '@param {number[][]} data'; toMat++; }
    else if (isVector(body)) { repl = '@param {number[]} data'; toVec++; }
    else { repl = null; dropped++; }
    if (repl) lines[i] = lines[i].replace(ROWS_TAG, repl);
    else {
      lines[i] = lines[i].replace(` ${ROWS_TAG}`, '').replace(ROWS_TAG, '');
      // if the JSDoc is now empty, remove the line entirely
      if (/^\s*\/\*\*\s*\*\/\s*$/.test(lines[i])) { lines.splice(i, 1); i--; }
    }
    changed = true;
  }
  if (changed) writeFileSync(path, lines.join('\n'));
}
console.log(`rows kept: ${kept}, → number[]: ${toVec}, → number[][]: ${toMat}, tag dropped: ${dropped}`);
