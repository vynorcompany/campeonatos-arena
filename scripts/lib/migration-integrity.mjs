import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function verifyAppliedMigrations(db, directory) {
  const exists = await db.$queryRaw`SELECT to_regclass('public._prisma_migrations') IS NOT NULL AS present`;
  if (!exists[0]?.present) return;
  const applied = await db.$queryRaw`SELECT migration_name, checksum FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name`;
  for (const migration of applied) {
    const name = migration.migration_name;
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) throw new Error('Invalid migration name in ledger.');
    let contents;
    try { contents = await readFile(join(directory, name, 'migration.sql')); }
    catch { throw new Error(`Applied migration missing from release: ${name}`); }
    if (createHash('sha256').update(contents).digest('hex') !== migration.checksum) throw new Error(`Applied migration changed: ${name}. Create a new migration instead.`);
  }
  console.log(`Verified ${applied.length} applied migration checksums.`);
}
