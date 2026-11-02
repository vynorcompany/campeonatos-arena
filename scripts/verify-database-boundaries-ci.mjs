import { PrismaClient } from '@prisma/client';
const url=new URL(process.env.DATABASE_URL||'');
if(url.hostname!=='127.0.0.1'||url.port!=='55433'||url.pathname!=='/arena_goal')throw new Error('Boundary checks require disposable CI database.');
const db=new PrismaClient();
try{
 const uncovered=await db.$queryRaw`SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity) AND EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='arenaId' AND NOT a.attisdropped)`;
 // These are public discovery/legal documents. Acceptance and all private tenant data require RLS.
 const publicCatalogs=new Set(['ArenaPublicSlug','RegulationDocument']);
 const missing=uncovered.filter(row=>!publicCatalogs.has(row.name));
 if(missing.length)throw new Error('Private tables without RLS: '+missing.map(r=>r.name).join(', '));
 for(const role of ['arena_runtime','arena_auth','arena_agency']){
  const [settings]=await db.$queryRaw`SELECT rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls FROM pg_roles WHERE rolname=${role}`;
  if(!settings||Object.values(settings).some(Boolean))throw new Error('Excessive role authority: '+role);
 }
 const [privileges]=await db.$queryRaw`SELECT has_table_privilege('arena_agency','"Arena"','DELETE') AS agency_deletes_arena,has_table_privilege('arena_runtime','"Arena"','DELETE') AS deletes_arena,has_table_privilege('arena_auth','"FinancialEntry"','SELECT') AS auth_finance,has_table_privilege('arena_auth','"ScheduleOccurrence"','UPDATE') AS auth_booking,pg_has_role('arena_runtime','arena_auth','MEMBER') AS auth_member,pg_has_role('arena_runtime','arena_agency','MEMBER') AS agency_member`;
 if(Object.values(privileges).some(Boolean))throw new Error('Operational/authentication privilege boundary failed.');
 const links=await db.$queryRaw`SELECT count(*)::int AS total FROM pg_constraint WHERE conname LIKE 'tenant_link_%' AND convalidated`;
 const missingLinks=await db.$queryRaw`SELECT child.relname AS table_name, col.attname AS column_name FROM pg_constraint fk JOIN pg_class child ON child.oid=fk.conrelid JOIN pg_namespace ns ON ns.oid=child.relnamespace JOIN pg_attribute col ON col.attrelid=child.oid AND col.attnum=fk.conkey[1] JOIN pg_attribute ca ON ca.attrelid=child.oid AND ca.attname='arenaId' AND NOT ca.attisdropped JOIN pg_attribute pa ON pa.attrelid=fk.confrelid AND pa.attname='arenaId' AND pa.attnotnull AND NOT pa.attisdropped WHERE fk.contype='f' AND cardinality(fk.conkey)=1 AND col.attname<>'arenaId' AND ns.nspname='public' AND NOT EXISTS(SELECT 1 FROM pg_constraint guard WHERE guard.contype='f' AND guard.conrelid=fk.conrelid AND guard.confrelid=fk.confrelid AND guard.convalidated AND cardinality(guard.conkey)=2 AND guard.conkey @> ARRAY[fk.conkey[1],ca.attnum]::smallint[] AND guard.confkey @> ARRAY[fk.confkey[1],pa.attnum]::smallint[] AND array_position(guard.conkey,ca.attnum)=array_position(guard.confkey,pa.attnum))`;
 if(missingLinks.length)throw new Error('Private tenant relationship guards missing: '+missingLinks.map(row=>row.table_name+'.'+row.column_name).join(', '));
 const [adminAccess]=await db.$queryRaw`SELECT (SELECT count(*) FROM pg_class WHERE relowner=(SELECT oid FROM pg_roles WHERE rolname='arena_runtime'))::int AS owned_objects,has_schema_privilege('arena_runtime','public','CREATE') AS creates_objects,has_table_privilege('arena_runtime','"_prisma_migrations"','SELECT') AS reads_migrations,has_table_privilege('arena_runtime','"AuditEvent"','UPDATE') AS edits_audit,has_table_privilege('arena_runtime','"AuditEvent"','DELETE') AS deletes_audit`;
 if(Object.values(adminAccess).some(Boolean))throw new Error('Runtime administrative or audit permissions are excessive.');
 console.log(`Private arena tables use RLS; ${links[0].total} additional tenant relationships validated; service roles separated.`);
}finally{await db.$disconnect()}
