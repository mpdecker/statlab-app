#!/usr/bin/env node
/**
 * StatLab CLI Helper — full function library documentation
 * Usage: node scripts/statlab.mjs [command] [args...]
 *        node scripts/statlab.mjs list
 *        node scripts/statlab.mjs show spatial
 *        node scripts/statlab.mjs fn moransI
 *        node scripts/statlab.mjs search regression
 *        node scripts/statlab.mjs help
 */

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const TESTS_DIR = join(__dirname, '..', 'src', 'tests');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const MAGENTA = '\x1b[35m';
const RED = '\x1b[31m';
const BLUE = '\x1b[34m';

function c(s, code) { return `${code}${s}${RESET}`; }

// ── Parser ──────────────────────────────────────────────────────────────────

async function parseModule(filePath) {
  const src = await readFile(filePath, 'utf-8');
  const lines = src.split('\n');
  const functions = [];
  let currentSection = '';
  let currentComment = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const secMatch = line.match(/^\/\/\s+──\s+(.+?)\s+──+/);
    if (secMatch) {
      currentSection = secMatch[1].trim();
      currentComment = '';
      continue;
    }
    if (line.trim().startsWith('//') && !line.trim().startsWith('// ──')) {
      currentComment += line.replace(/^\/\/\s*/, ' ') + ' ';
      continue;
    }
    const fnMatch = line.match(/^export\s+function\s+(\w+)\s*\(([^)]*)\)/);
    if (fnMatch) {
      const name = fnMatch[1];
      if (name.startsWith('_')) { currentComment = ''; continue; }

      // Collect full signature (may span lines)
      let sig = line;
      let j = i + 1;
      while (j < lines.length && !lines[j].includes('{')) {
        sig += '\n' + lines[j];
        j++;
      }

      // Parse parameters
      const rawArgs = fnMatch[2];  
      const params = parseParams(rawArgs);

      // Find return shape — look for `return { test: ... }` in function body
      const returnShape = [];
      let braceDepth = 0;
      let inFn = false;
      for (let k = i + 1; k < lines.length; k++) {
        const l = lines[k];
        braceDepth += (l.match(/{/g) || []).length;
        braceDepth -= (l.match(/}/g) || []).length;
        if (l.includes('export function')) inFn = true;
        if (!inFn && braceDepth <= 0 && l.trim() === '}') break;
        const retMatch = l.match(/\btest:\s*'([^']+)'/);
        if (retMatch && returnShape.length === 0) returnShape.push(`test: "${retMatch[1]}"`);

        // Collect return object keys on the line containing `return {`
        if (l.includes('return {') && l.includes('test:')) {
          const retKeys = l.match(/,\s*(\w+)\s*:/g);
          if (retKeys) {
            retKeys.forEach(rk => {
              const key = rk.replace(/,\s*(\w+)\s*:/, '$1');
              if (!['test', 'apa'].includes(key) && !returnShape.includes(key)) {
                returnShape.push(key);
              }
            });
          }
          break;
        }
      }

      const description = currentComment.trim();
      functions.push({
        name,
        section: currentSection,
        params,
        sig: sig.trim().replace(/^export\s+function\s+/, ''),
        returns: returnShape.length ? returnShape : ['{ test, ..., apa }'],
        description: description || undefined,
        line: i + 1,
      });
      currentComment = '';
    }
  }
  return functions;
}

function parseParams(raw) {
  raw = raw.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  const params = [];
  if (!raw) return params;

  // Split by outer commas (not inside braces or brackets)
  let depth = 0, start = 0;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '{' || raw[i] === '[') depth++;
    if (raw[i] === '}' || raw[i] === ']') depth--;
    if (raw[i] === ',' && depth === 0) {
      params.push(raw.slice(start, i).trim());
      start = i + 1;
    }
  }
  params.push(raw.slice(start).trim());

  return params.map(p => {
    p = p.trim();
    const eqIdx = p.indexOf('=');
    if (eqIdx > 0) {
      const name = p.slice(0, eqIdx).trim();
      let defaultVal = p.slice(eqIdx + 1).trim();
      if (defaultVal.length > 40) defaultVal = defaultVal.slice(0, 40) + '…}';
      return { name, defaultVal };
    }
    return { name: p, defaultVal: null };
  });
}

async function loadAll() {
  const files = await readdir(TESTS_DIR);
  const jsFiles = files.filter(f => f.endsWith('.js') && !f.includes('.test.') && !f.includes('.contracts.'));
  const modules = [];

  for (const file of jsFiles.sort()) {
    const modName = file.replace('.js', '');
    const funcs = await parseModule(join(TESTS_DIR, file));
    if (funcs.length) modules.push({
      name: modName,
      path: `src/tests/${file}`,
      functions: funcs,
      count: funcs.length,
    });
  }
  return modules;
}

// ── Display ─────────────────────────────────────────────────────────────────

function printLine(label, value, color = CYAN) {
  process.stdout.write(`  ${DIM}${label.padEnd(12)}${RESET}${c(value, color)}\n`);
}

function printHeader(text) {
  process.stdout.write(`\n${c('┌─ ' + text, BOLD + YELLOW)}\n`);
}

function printDivider() {
  process.stdout.write(`  ${DIM}────────────────────────────────────────────────────────────${RESET}\n`);
}

function showFunction(fn, modName) {
  printHeader(`${modName}.${fn.name}()`);
  if (fn.description) process.stdout.write(`${c(fn.description, DIM)}\n\n`);
  if (fn.section) process.stdout.write(`  ${DIM}Section:${RESET} ${fn.section}\n`);
  process.stdout.write(`  ${DIM}Line:${RESET}    ${fn.line}\n`);
  process.stdout.write(`\n  ${GREEN}Signature:${RESET}\n`);
  process.stdout.write(`  ${c(fn.sig.slice(0, 200), CYAN)}\n`);
  if (fn.params.length) {
    process.stdout.write(`\n  ${GREEN}Parameters:${RESET}\n`);
    fn.params.forEach(p => {
      if (p.defaultVal) {
        process.stdout.write(`    ${CYAN}${p.name}${RESET} ${DIM}= ${p.defaultVal.slice(0, 50)}${RESET}\n`);
      } else {
        process.stdout.write(`    ${CYAN}${p.name}${RESET}\n`);
      }
    });
  }
  process.stdout.write(`\n  ${GREEN}Returns:${RESET}\n`);
  process.stdout.write(`    ${c(fn.returns.join(', '), MAGENTA)}\n`);
  process.stdout.write(`\n`);
}

function showModule(mod) {
  printHeader(`${mod.name} (${mod.count} functions)`);
  process.stdout.write(`  ${DIM}${mod.path}${RESET}\n\n`);
  const bySection = {};
  let noSection = [];
  for (const fn of mod.functions) {
    if (fn.section) {
      if (!bySection[fn.section]) bySection[fn.section] = [];
      bySection[fn.section].push(fn);
    } else {
      noSection.push(fn);
    }
  }
  for (const [sec, funcs] of Object.entries(bySection)) {
    process.stdout.write(`  ${c(sec, BOLD + BLUE)}\n`);
    funcs.forEach(fn => showFunctionInline(fn));
  }
  if (noSection.length) {
    noSection.forEach(fn => showFunctionInline(fn));
  }
  process.stdout.write(`\n`);
}

function showFunctionInline(fn) {
  const args = fn.params.map(p => p.defaultVal ? `${p.name}=${p.defaultVal.slice(0, 25)}` : p.name).join(', ');
  process.stdout.write(`    ${c(fn.name, GREEN)}(${c(args, CYAN)})\n`);
  process.stdout.write(`      → ${c(fn.returns.join(', '), DIM)}\n`);
}

// ── Commands ────────────────────────────────────────────────────────────────

async function cmdList(modules) {
  printHeader(`StatLab Function Library — ${modules.reduce((s, m) => s + m.count, 0)} functions in ${modules.length} modules`);
  process.stdout.write(`\n`);
  const maxName = Math.max(...modules.map(m => m.name.length));
  modules.forEach(m => {
    const cats = new Set(m.functions.map(f => f.section).filter(Boolean));
    process.stdout.write(`  ${c(m.name.padEnd(maxName + 2), CYAN)}${DIM}${String(m.count).padStart(3)} functions${RESET}`);
    if (cats.size) process.stdout.write(`  ${DIM}[${[...cats].join(' · ')}]${RESET}`);
    process.stdout.write(`\n`);
  });
  process.stdout.write(`\n`);
}

async function cmdShow(modules, name) {
  const mod = modules.find(m => m.name === name);
  if (!mod) {
    process.stderr.write(`${RED}Module '${name}' not found.${RESET}\n`);
    process.exit(1);
  }
  showModule(mod);
}

async function cmdFn(modules, name) {
  let found = null;
  let modName = '';
  for (const mod of modules) {
    const fn = mod.functions.find(f => f.name === name);
    if (fn) { found = fn; modName = mod.name; break; }
  }
  if (!found) {
    // Try partial match
    const matches = [];
    for (const mod of modules) {
      for (const fn of mod.functions) {
        if (fn.name.toLowerCase().includes(name.toLowerCase())) {
          matches.push({ mod: mod.name, fn });
        }
      }
    }
    if (matches.length) {
      process.stdout.write(`${YELLOW}Exact match not found. Did you mean:${RESET}\n\n`);
      matches.forEach(m => process.stdout.write(`  ${c(m.mod + '.' + m.fn.name, CYAN)}\n`));
    } else {
      process.stderr.write(`${RED}Function '${name}' not found.${RESET}\n`);
    }
    process.exit(1);
  }
  showFunction(found, modName);
}

async function cmdSearch(modules, query) {
  const q = query.toLowerCase();
  const results = [];
  for (const mod of modules) {
    for (const fn of mod.functions) {
      const text = `${fn.name} ${fn.section || ''} ${fn.description || ''} ${fn.returns.join(' ')}`.toLowerCase();
      if (text.includes(q)) results.push({ mod: mod.name, fn });
    }
  }
  if (!results.length) {
    process.stdout.write(`${YELLOW}No functions match '${query}'.${RESET}\n`);
    return;
  }
  printHeader(`Search: "${query}" — ${results.length} matches`);
  results.forEach(r => {
    process.stdout.write(`  ${c(r.mod, DIM)}.${c(r.fn.name, GREEN)}`);
    if (r.fn.section) process.stdout.write(`  ${DIM}— ${r.fn.section}${RESET}`);
    process.stdout.write(`\n`);
    const args = r.fn.params.map(p => p.name).join(', ');
    process.stdout.write(`    ${c(args, DIM)}\n`);
  });
  process.stdout.write(`\n`);
}

async function cmdHelp() {
  const txt = `
${BOLD}StatLab CLI Helper${RESET} — browse the full function library (1,034 functions in 85 modules)

${BOLD}Commands:${RESET}

  ${GREEN}list${RESET}                    List all modules with function counts
  ${GREEN}list --detail${RESET}           List all modules with every function name
  ${GREEN}show ${MAGENTA}<module>${RESET}            Show all functions in a module with signatures
  ${GREEN}fn ${MAGENTA}<function>${RESET}          Show detailed signature, params, and return shape
  ${GREEN}search ${MAGENTA}<query>${RESET}          Search functions by name, description, or return keys
  ${GREEN}help${RESET}                    Show this help

${BOLD}Examples:${RESET}

  node scripts/statlab.mjs list
  node scripts/statlab.mjs show spatial
  node scripts/statlab.mjs fn moransI
  node scripts/statlab.mjs search kriging

${DIM}Run from the statlab project directory.${RESET}
`;
  process.stdout.write(txt);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || 'help';
  const arg = args[1];

  const modules = await loadAll();

  switch (cmd) {
    case 'list':
      if (arg === '--detail' || arg === '-d') {
        for (const mod of modules) {
          process.stdout.write(`\n${c(mod.name, BOLD + CYAN)} (${mod.count})\n`);
          mod.functions.forEach(fn => process.stdout.write(`  ${GREEN}${fn.name}${RESET}${DIM}(${fn.params.map(p => p.name).join(', ')})${RESET} → ${MAGENTA}${fn.returns.join(', ')}${RESET}\n`));
        }
        process.stdout.write(`\n`);
      } else {
        await cmdList(modules);
      }
      break;
    case 'show':
      if (!arg) { process.stderr.write(`${RED}Usage: statlab show <module>${RESET}\n`); process.exit(1); }
      await cmdShow(modules, arg);
      break;
    case 'fn':
      if (!arg) { process.stderr.write(`${RED}Usage: statlab fn <function>${RESET}\n`); process.exit(1); }
      await cmdFn(modules, arg);
      break;
    case 'search':
      if (!arg) { process.stderr.write(`${RED}Usage: statlab search <query>${RESET}\n`); process.exit(1); }
      await cmdSearch(modules, arg);
      break;
    case 'help':
    default:
      await cmdHelp();
      break;
  }
}

main().catch(err => {
  process.stderr.write(`${RED}Error: ${err.message}${RESET}\n`);
  process.exit(1);
});
