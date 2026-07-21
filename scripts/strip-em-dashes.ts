/**
 * One-shot helper: replace Unicode em/en dashes in scanned text files.
 * Em dash (U+2014) -> ", " when spaced, otherwise ": "; en dash (U+2013) -> "-".
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/strip-em-dashes.ts
 *
 * Prefer scripts/check-no-em-dashes.ts for CI. This helper is for bulk cleanup only.
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.cwd();
const EM = '\u2014';
const EN = '\u2013';

const SCAN_ROOTS = ['docs', 'src', 'scripts'];
const EXTRA_FILES = ['package.json', 'README.md', '.env.example'];
const INCLUDE_EXT = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.md',
  '.mdx',
  '.css',
  '.json',
  '.mjs',
  '.cjs',
]);
const SKIP_DIR_NAMES = new Set([
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  '.git',
  'remotion',
]);

function walk(dir: string, out: string[]) {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (SKIP_DIR_NAMES.has(name)) continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, out);
    else if (st.isFile() && INCLUDE_EXT.has(extname(name))) out.push(full);
  }
}

function rewrite(text: string): string {
  const em = EM;
  const en = EN;
  // Spaced em dash -> comma (most common prose pattern in this repo)
  let out = text.split(`${' '}${em}${' '}`).join(', ');
  // Em dash glued to words -> colon bridge
  out = out.replace(new RegExp(`(\\S)${em}(\\S)`, 'g'), '$1: $2');
  // Remaining em dashes
  out = out.split(em).join(',');
  // En dash -> ASCII hyphen (ranges, table placeholders)
  out = out.split(en).join('-');
  return out;
}

function main() {
  const files: string[] = [];
  for (const root of SCAN_ROOTS) walk(join(ROOT, root), files);
  for (const extra of EXTRA_FILES) {
    try {
      const full = join(ROOT, extra);
      if (statSync(full).isFile()) files.push(full);
    } catch {
      /* optional */
    }
  }

  let changed = 0;
  for (const file of files) {
    const before = readFileSync(file, 'utf8');
    if (!before.includes(EM) && !before.includes(EN)) continue;
    const after = rewrite(before);
    if (after !== before) {
      writeFileSync(file, after, 'utf8');
      changed++;
      console.log('updated', file.replace(ROOT + '\\', '').replace(ROOT + '/', ''));
    }
  }
  console.log(`strip-em-dashes: updated ${changed} file(s)`);
}

main();
