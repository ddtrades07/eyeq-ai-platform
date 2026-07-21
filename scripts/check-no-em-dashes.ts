/**
 * Fails if Unicode em dash (U+2014) or en dash (U+2013) appear in user-facing
 * source / docs. Does not flag ASCII hyphens (-) used in identifiers, routes, CSS, etc.
 *
 * Usage: npx tsx scripts/check-no-em-dashes.ts
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const ROOT = process.cwd();
const EM = '\u2014'; // U+2014 em dash
const EN = '\u2013'; // U+2013 en dash

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

type Finding = { file: string; line: number; col: number; char: string; excerpt: string };

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
    if (st.isDirectory()) {
      walk(full, out);
    } else if (st.isFile() && INCLUDE_EXT.has(extname(name))) {
      out.push(full);
    }
  }
}

function scanFile(file: string): Finding[] {
  const findings: Finding[] = [];
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return findings;
  }
  // Skip obvious binaries / null-heavy files
  if (text.includes('\u0000')) return findings;

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j]!;
      if (ch === EM || ch === EN) {
        findings.push({
          file: relative(ROOT, file).replace(/\\/g, '/'),
          line: i + 1,
          col: j + 1,
          char: ch === EM ? 'em-dash (U+2014)' : 'en-dash (U+2013)',
          excerpt: line.trim().slice(0, 120),
        });
      }
    }
  }
  return findings;
}

function main() {
  const files: string[] = [];
  for (const root of SCAN_ROOTS) {
    walk(join(ROOT, root), files);
  }
  for (const extra of EXTRA_FILES) {
    const full = join(ROOT, extra);
    try {
      if (statSync(full).isFile()) files.push(full);
    } catch {
      /* optional */
    }
  }

  const all: Finding[] = [];
  for (const f of files) {
    all.push(...scanFile(f));
  }

  if (all.length === 0) {
    console.log(
      `check-no-em-dashes: ok (${files.length} files scanned, no U+2013/U+2014 found)`,
    );
    process.exit(0);
  }

  console.error(`check-no-em-dashes: found ${all.length} em/en dash occurrence(s):\n`);
  for (const f of all.slice(0, 200)) {
    console.error(`  ${f.file}:${f.line}:${f.col}  ${f.char}`);
    console.error(`    ${f.excerpt}`);
  }
  if (all.length > 200) {
    console.error(`  … and ${all.length - 200} more`);
  }
  console.error(
    '\nReplace with commas, periods, colons, parentheses, or ASCII hyphens for ranges.',
  );
  process.exit(1);
}

main();
