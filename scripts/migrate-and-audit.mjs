import { provisionAuthenticationRole } from './lib/auth-database.mjs';
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { verifyAppliedMigrations } from './lib/migration-integrity.mjs';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';

if(process.env.GITHUB_ACTIONS==='true' && process.env.GITHUB_EVENT_NAME==='pull_request' && process.env.ARENA_UPGRADE_CHILD!=='true'){
 const event=JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH,'utf8'));
 const checked=spawnSync(process.execPath,['scripts/verify-migration-upgrade-ci.mjs'],{stdio:'inherit',env:{...process.env,ARENA_BASE_SHA:event.pull_request.base.sha,ARENA_UPGRADE_CHILD:'true'}});
 if(checked.status!==0)process.exit(checked.status??1);
 const audit=spawnSync('npm',['audit','--prefix','services/recovery','--omit=dev','--audit-level=high'],{stdio:'inherit'});
 if(audit.status!==0)process.exit(audit.status??1);
}


const integrityDb = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } } });
try { await verifyAppliedMigrations(integrityDb, resolve('prisma/migrations')); } finally { await integrityDb.$disconnect(); }

const migration = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { stdio: 'inherit', env: process.env });
if (migration.status !== 0) process.exit(migration.status ?? 1);
// Migration credentials only; the serving process continues to use its restricted role.
const db = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } } });
try {
  if (process.env.APP_DATABASE_URL) await provisionAuthenticationRole(db, process.env.APP_DATABASE_URL);
  await db.$executeRaw`SELECT public.install_change_audit_triggers()`;
} finally {
  await db.$disconnect();
}

if(process.env.GITHUB_ACTIONS==='true' && process.env.ARENA_UPGRADE_CHILD!=='true'){
 const check=spawnSync(process.execPath,['scripts/verify-database-boundaries-ci.mjs'],{stdio:'inherit',env:process.env});
 if(check.status!==0)process.exit(check.status??1);
}
