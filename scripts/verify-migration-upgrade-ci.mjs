import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, readFile, writeFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const url=process.env.DATABASE_URL;
if(process.env.GITHUB_ACTIONS!=='true'||!url?.startsWith('postgresql://postgres@127.0.0.1:55433/arena_goal?schema=public')||!process.env.ARENA_BASE_SHA?.match(/^[a-f0-9]{40}$/)) throw new Error('Upgrade drill requires disposable CI database and exact base revision.');
const db=new PrismaClient();const directory=await mkdtemp(join(tmpdir(),'arena-upgrade-'));
const run=(command,args)=>{const result=spawnSync(command,args,{stdio:'inherit',env:process.env});if(result.status!==0)throw new Error(`${command} failed`)};
const quote=name=>'"'+name.replaceAll('"','""')+'"';
try {
 const existing=await db.$queryRaw`SELECT count(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p')`;
 if(existing[0].count!==0)throw new Error('Upgrade drill requires a fresh empty database.');
 if(spawnSync('git',['cat-file','-e',process.env.ARENA_BASE_SHA+'^{commit}'],{stdio:'ignore'}).status!==0)run('git',['fetch','--no-tags','origin',process.env.ARENA_BASE_SHA]);
 run('git',['archive','--format=tar','--output='+join(directory,'baseline.tar'),process.env.ARENA_BASE_SHA,'prisma','scripts/seed-goal-ci.ts']);
 run('tar',['-xf',join(directory,'baseline.tar'),'-C',directory]);
 run(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy','--schema',join(directory,'prisma/schema.prisma')]);
 // Generate the base revision's client so the old dataset is created against the old columns.
 const schemaPath=join(directory,'prisma/schema.prisma');
 const clientPath=join(directory,'client');
 const schema=await readFile(schemaPath,'utf8');
 await writeFile(schemaPath,schema.replace(/(generator client \{)/,`$1\n  output = "${clientPath}"`));
 await symlink(new URL('../node_modules',import.meta.url).pathname,join(directory,'node_modules'),'dir');
 run(process.execPath,['node_modules/prisma/build/index.js','generate','--schema',schemaPath]);
 const seedPath=join(directory,'scripts/seed-goal-ci.ts');
 await writeFile(seedPath,(await readFile(seedPath,'utf8')).replace('from "@prisma/client"',`from "${clientPath}/index.js"`));
 run(process.execPath,['--import','tsx',seedPath]);
 const columns=await db.$queryRaw`SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name <> '_prisma_migrations' ORDER BY table_name,ordinal_position`;
 const tables=new Map();for(const row of columns){if(!tables.has(row.table_name))tables.set(row.table_name,[]);tables.get(row.table_name).push(row.column_name)}
 const signatures=new Map();
 const snapshot=async(name,fields)=>db.$queryRawUnsafe(`SELECT md5(row_to_json(__arena_upgrade_row)::text) AS digest FROM (SELECT ${fields.map(quote).join(',')} FROM ${quote(name)}) __arena_upgrade_row ORDER BY digest`);
 for(const [name,fields] of tables)signatures.set(name,await snapshot(name,fields));
 run(process.execPath,['scripts/migrate-and-audit.mjs']);
 for(const [name,fields]of tables){const after=await snapshot(name,fields);const counts=new Map();for(const row of after)counts.set(row.digest,(counts.get(row.digest)||0)+1);for(const row of signatures.get(name)){const count=counts.get(row.digest)||0;if(!count)throw new Error(`Upgrade removed or changed existing data in ${name}`);counts.set(row.digest,count-1)}}
 // Only this guarded, synthetic CI database is reset for the subsequent application suite.
 await db.$executeRawUnsafe('DROP SCHEMA public CASCADE');
 await db.$executeRawUnsafe('CREATE SCHEMA public');
 console.log(`Upgrade from main preserved all existing columns and records in ${tables.size} tables.`);
} finally {await db.$disconnect();await rm(directory,{recursive:true,force:true})}
