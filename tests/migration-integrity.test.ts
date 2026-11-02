import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
// @ts-expect-error runtime module is shared with the deployment launcher
import { verifyAppliedMigrations } from '../scripts/lib/migration-integrity.mjs';
test('deployment refuses missing or edited applied migrations before migrate deploy', async()=>{
 const dir=await mkdtemp(join(tmpdir(),'arena-migrations-'));const text='SELECT 1;\n';
 const ledger=[{migration_name:'0001_initial',checksum:createHash('sha256').update(text).digest('hex')}];
 let calls=0;const db={$queryRaw:async()=>++calls%2===1?[{present:true}]:ledger};
 try { await assert.rejects(verifyAppliedMigrations(db,dir),/missing/);await mkdir(join(dir,'0001_initial'));await writeFile(join(dir,'0001_initial/migration.sql'),text);await verifyAppliedMigrations(db,dir);await writeFile(join(dir,'0001_initial/migration.sql'),'DROP TABLE x;');await assert.rejects(verifyAppliedMigrations(db,dir),/changed/); }finally{await rm(dir,{recursive:true,force:true})}
});
