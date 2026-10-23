import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const migration = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { stdio: 'inherit', env: process.env });
if (migration.status !== 0) process.exit(migration.status ?? 1);
// Migration credentials only; the serving process continues to use its restricted role.
const db = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } } });
try {
  await db.$executeRaw`SELECT public.install_change_audit_triggers()`;
} finally {
  await db.$disconnect();
}
