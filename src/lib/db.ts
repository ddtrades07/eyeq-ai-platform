import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
  });
}

/**
 * One PrismaClient per Node process. Never create additional instances —
 * Supabase session pooler caps total clients (~15); extra instances leak
 * connections until the dev server restarts.
 */
export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

if (process.env.NODE_ENV === 'development') {
  const disconnect = () => {
    void db.$disconnect();
  };
  process.once('beforeExit', disconnect);
  process.once('SIGINT', disconnect);
  process.once('SIGTERM', disconnect);
}
