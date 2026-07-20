/**
 * Runs `prisma generate` with build-safe URL placeholders when
 * DATABASE_URL / DIRECT_URL are unset.
 *
 * Prisma schema requires both via env(); generate never opens a DB
 * connection, but the CLI still fails validation (P1012) if they are
 * missing — a common Vercel failure when env is incomplete at install/build.
 */

import { spawnSync } from 'node:child_process';

const PLACEHOLDER =
  'postgresql://build:build@127.0.0.1:5432/eyeq_build_placeholder?schema=public';

const env = { ...process.env };
if (!env.DATABASE_URL) {
  env.DATABASE_URL = PLACEHOLDER;
  console.warn(
    '[prisma-generate] DATABASE_URL unset — using build placeholder (generate only).',
  );
}
if (!env.DIRECT_URL) {
  env.DIRECT_URL = env.DATABASE_URL;
  console.warn(
    '[prisma-generate] DIRECT_URL unset — using DATABASE_URL (generate only).',
  );
}

const result = spawnSync('npx', ['prisma', 'generate', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env,
  shell: true,
});

process.exit(result.status === null ? 1 : result.status);
