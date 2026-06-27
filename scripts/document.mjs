#!/usr/bin/env node
/**
 * Auto-documenter: injects section headers into all statlab source modules.
 * Reads each `export function` block, finds its `test: 'Name'` return value,
 * and injects a `// ── Name ──` comment before each exported function.
 * Files that already have headers are skipped.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';

const TESTS_DIR = join(import.meta.dirname, '..', 'src', 'tests');

async function findTestName(lines, fnStartLine) {
  let braceDepth = 0;
  for (let i = fnStartLine; i < lines.length; i++) {
    const l = lines[i];
    braceDepth += (l.match(/{/g) || []).length;
    braceDepth -= (l.match(/}/g) || []).length;
    const m = l.match(/test:\s*'([^']+)'/);
    if (m) return m[1];
    if (braceDepth <= 0 && l.trim() === '}') break;
    // Safety: stop after 200 lines to avoid runaway
    if (i - fnStartLine > 200) break;
  }
  return null;
}

async function processFile(filePath) {
  const src = await readFile(filePath, 'utf-8');
  const lines = src.split('\n');

  // Find all export function declarations
  const fnLines = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^export\s+function\s+\w/.test(lines[i]) && !/^export\s+function\s+_/.test(lines[i])) {
      fnLines.push(i);
    }
  }

  // Extract test names
  let modified = false;
  const newLines = [...lines];
  for (let idx = fnLines.length - 1; idx >= 0; idx--) {
    const lineNum = fnLines[idx];
    const testName = await findTestName(lines, lineNum);
    if (!testName) continue;

    // Check if section header already exists within 3 lines above
    const checkStart = Math.max(0, lineNum - 4);
    let hasHeader = false;
    for (let j = lineNum - 1; j >= checkStart; j--) {
      if (/\/\/\s+──\s+/.test(newLines[j])) {
        hasHeader = true;
        break;
      }
      if (/^\s*$/.test(newLines[j])) continue;
      break;
    }
    if (hasHeader) continue;

    // Insert section header
    const header = `// ── ${testName} ──${'─'.repeat(Math.max(1, 60 - testName.length))}`;
    const insertAt = lineNum - (newLines[lineNum - 1]?.trim() === '' ? 1 : 0);
    
    // If the line above is a comment, use it as the section name instead
    const prevLine = newLines[insertAt - 1]?.trim() || '';
    if (prevLine.startsWith('//') && !prevLine.includes('──') && prevLine.length < 80) {
      // Replace the existing comment with a formatted section header
      const commentText = prevLine.replace(/^\/\/\s*/, '');
      const formattedHeader = `// ── ${commentText} ──${'─'.repeat(Math.max(1, 60 - commentText.length))}`;
      newLines[insertAt - 1] = formattedHeader;
    } else {
      newLines.splice(insertAt, 0, header);
      // Add blank line before header if not at start
      if (insertAt > 1 && newLines[insertAt - 1]?.trim() !== '') {
        newLines.splice(insertAt, 0, '');
      }
    }
    modified = true;
  }

  if (modified) {
    await writeFile(filePath, newLines.join('\n'), 'utf-8');
    return true;
  }
  return false;
}

async function main() {
  const files = await readdir(TESTS_DIR);
  const jsFiles = files.filter(f => f.endsWith('.js') && !f.includes('.test.') && !f.includes('.contracts.'));

  let totalUpdated = 0;
  for (const file of jsFiles.sort()) {
    const filePath = join(TESTS_DIR, file);
    const updated = await processFile(filePath);
    if (updated) {
      process.stdout.write(`  ✅ ${file}\n`);
      totalUpdated++;
    } else {
      process.stdout.write(`  ⏭️  ${file} (already documented)\n`);
    }
  }
  process.stdout.write(`\n${totalUpdated} files updated.\n`);
}

main().catch(err => {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
});
