import { defineConfig } from 'prisma/config';

/**
 * Prisma CLI config (replaces deprecated package.json#prisma).
 * Datasource URLs remain in prisma/schema.prisma for Prisma 6.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
