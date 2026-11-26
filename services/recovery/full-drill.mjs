import { readFile, writeFile, mkdtemp, mkdir, rm, chmod } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { decryptStream, atomicJson } from './vault.mjs';

export function objectPath(root, file) {
  if (!/^objects\/[a-zA-Z0-9][a-zA-Z0-9.-]*\.enc$/.test(file || '') || file.includes('..')) throw new Error('Unsafe recovery object reference.');
  return join(root, file);
}
export function isolatedEnvironment(runtimeUrl, port) {
  const url = new URL(runtimeUrl);
  if (url.hostname !== 'restore-db' || url.pathname !== '/arena_full_drill' || url.username !== 'arena_runtime') throw new Error('Only the isolated recovery database is accepted.');
  return { NODE_ENV: 'production', PORT: '8080', APP_DATABASE_URL: runtimeUrl, APP_URL: `http://127.0.0.1:${port}`, PORTAL_CHECKOUT_EXPIRY_WORKER_ENABLED: 'false' };
}
const docker = (args, options = {}) => execFileSync('docker', args, { encoding: 'utf8', timeout: 240_000, maxBuffer: 8 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'], ...options });
const delay = ms => new Promise(done => setTimeout(done, ms));

function extract(archive, destination) {
  // Python's data filter rejects absolute/traversing paths, devices and links outside the target.
  execFileSync('python3', ['-c', "import sys,tarfile,pathlib; safe=lambda member,path: None if 'node_modules' in pathlib.PurePosixPath(member.name).parts and '.bin' in pathlib.PurePosixPath(member.name).parts else tarfile.data_filter(member,path); tarfile.open(sys.argv[1]).extractall(sys.argv[2],filter=safe)", archive, destination], { timeout: 240_000, stdio: 'pipe' });
}
export function recoveryProbeQuery(name, phone, arenaId) {
  if (!/^Recovery drill [a-f0-9-]{36}$/.test(name) || !/^55119[0-9]{8}$/.test(phone) || !/^[A-Za-z0-9_-]{1,128}$/.test(arenaId)) throw new Error('Invalid isolated registration probe.');
  // Client names are title-cased by the application. Verify the stable phone identity
  // and arena as well as the name, without requiring its input capitalization.
  return `SELECT count(*) FROM "Player" WHERE lower(name)=lower('${name}') AND phone='${phone.slice(2)}' AND "arenaId"='${arenaId}'`;
}
export async function runFullDrill(config) {
  process.umask(0o077);
  const started = Date.now(), timings = {}, key = await readFile(config.keyFile);
  const status = JSON.parse(await readFile(join(config.directory, 'status.json'), 'utf8'));
  if (!status.ok || Date.now() - Date.parse(status.completedAt) > 7_200_000) throw new Error('A recent complete independent copy is required.');
  if (!resolve(status.manifest).startsWith(resolve(config.directory) + '/manifest-') || !status.manifest.endsWith('.enc')) throw new Error('Unsafe manifest reference.');
  const directory = await mkdtemp(join(config.directory, 'full-drill-'));
  const prefix = 'arena-full-drill-' + randomUUID(), containers = []; let network = false;
  const mark = name => { timings[name] = Math.round((Date.now() - started) / 1000); };
  const sql = (database, query) => docker(['exec', '-i', prefix + '-db', 'psql', '-U', 'postgres', '-d', database, '-X', '-At', '-v', 'ON_ERROR_STOP=1'], { input: query }).trim();
  try {
    const manifestFile = join(directory, 'manifest.json'); await decryptStream(status.manifest, manifestFile, key);
    const manifest = JSON.parse(await readFile(manifestFile, 'utf8'));
    if (!/^[a-f0-9]{40}$/.test(manifest.application?.revision || '')) throw new Error('A deployed application artifact is required.');
    const required = ['application', 'postgres', 'files', 'redis', 'configuration'];
    for (const kind of required) if (!manifest.snapshots.some(item => item.kind === kind)) throw new Error('Recovery component missing: ' + kind);
    const decoded = [];
    for (const [index, item] of manifest.snapshots.entries()) {
      if (item.kind === 'postgres-status') continue;
      const file = join(directory, 'snapshot-' + index);
      const verified = await decryptStream(objectPath(config.directory, item.file), file, key);
      if (verified.sha256 !== item.sha256 || verified.bytes !== item.bytes) throw new Error('Snapshot checksum mismatch.');
      decoded.push({ ...item, local: file });
    }
    const app = join(directory, 'app'), uploads = join(directory, 'uploads');
    await mkdir(app); await mkdir(uploads);
    extract(decoded.find(item => item.kind === 'application').local, app);
    const uploadSnapshot = decoded.find(item => item.kind === 'files' && item.name === 'uploads');
    if (!uploadSnapshot) throw new Error('Uploads snapshot missing.');
    extract(uploadSnapshot.local, uploads);
    if ((await readFile(join(app, '.next/BUILD_ID'), 'utf8')).trim() !== manifest.application.buildId) throw new Error('Application build mismatch.');
    for (const [index, item] of decoded.filter(item => item.kind === 'files' && item !== uploadSnapshot).entries()) { const target = join(directory, 'files-' + index); await mkdir(target); extract(item.local, target); }
    const configurations = decoded.filter(item => item.kind === 'configuration').map(item => JSON.parse(execFileSync('cat', [item.local], { encoding: 'utf8' })));
    if (!configurations.length || configurations.some(item => typeof item !== 'object' || Array.isArray(item))) throw new Error('Invalid configuration snapshot.');
    // Inspect completeness without importing provider credentials or workers into the restored application.
    mark('decryptAndExtract');
    docker(['network', 'create', '--internal', '--label', 'vynor.restore-drill=arena-full', prefix]); network = true;
    const password = randomBytes(32).toString('hex');
    const dbImage = 'postgres@sha256:10a5c69a83035ab5239f5620d708520e8b28f5aa1f2b20143e6024532edadfb5', redisImage = 'redis@sha256:7958cfbb9d152f87dadfbc89f1b0b15938f0b81ff8982feb327476f4911935c3', appImage = 'node@sha256:e13726ca604184d7a91fcacab1fc09eefd642dc28e79ac34e85540dd93b78cfb';
    docker(['run', '-d', '--name', prefix + '-db', '--label', 'vynor.restore-drill=arena-full', '--network', prefix, '--network-alias', 'restore-db', '--memory', '2g', '-e', 'POSTGRES_PASSWORD=' + randomBytes(32).toString('hex'), '-e', 'POSTGRES_HOST_AUTH_METHOD=scram-sha-256', dbImage]); containers.push(prefix + '-db');
    for (let attempt = 0; ; attempt++) { try { sql('postgres', 'SELECT 1'); break; } catch { if (attempt === 60) throw new Error('Recovery database did not start.'); await delay(1000); } }
    sql('postgres', 'CREATE ROLE arena_runtime LOGIN; CREATE ROLE arena_auth LOGIN; CREATE ROLE arena_agency LOGIN;');
    const databases = decoded.filter(item => item.kind === 'postgres');
    const main = databases.find(item => item.name === 'application-database');
    if (!main) throw new Error('Main application logical snapshot missing.');
    for (const [index, item] of databases.entries()) {
      const database = item === main ? 'arena_full_drill' : 'arena_aux_' + index;
      sql('postgres', 'CREATE DATABASE ' + database);
      docker(['cp', item.local, prefix + '-db:/tmp/restore.dump']);
      docker(['exec', prefix + '-db', 'pg_restore', '-U', 'postgres', '-d', database, '--exit-on-error', '--no-owner', '/tmp/restore.dump']);
    }
    const { authenticationDatabaseUrl } = await import(pathToFileURL(join(app, 'scripts/lib/auth-database.mjs')));
    const runtimeUrl = `postgresql://arena_runtime:${password}@restore-db:5432/arena_full_drill?schema=public`;
    for (const [role, secret] of [['arena_runtime', password], ...['auth', 'agency'].map(service => ['arena_' + service, new URL(authenticationDatabaseUrl(runtimeUrl, service)).password])]) sql('arena_full_drill', `ALTER ROLE ${role} LOGIN PASSWORD '${secret}';`);
    const counts = JSON.parse(sql('arena_full_drill', `SELECT json_build_object('arenas',(SELECT count(*) FROM "Arena"),'players',(SELECT count(*) FROM "Player"),'financialEntries',(SELECT count(*) FROM "FinancialEntry"),'rlsTables',(SELECT count(*) FROM pg_class WHERE relrowsecurity),'unsafeRoles',(SELECT count(*) FROM pg_roles WHERE rolname IN ('arena_runtime','arena_auth','arena_agency') AND (rolsuper OR rolbypassrls)))`));
    if (!counts.arenas || !counts.rlsTables || counts.unsafeRoles) throw new Error('Restored database or role isolation validation failed.');
    const unscopedRows = sql('arena_full_drill', 'SET ROLE arena_runtime; SELECT count(*) FROM \"Player\"; RESET ROLE;').split('\n').find(line => /^\d+$/.test(line));
    if (unscopedRows !== '0') throw new Error('Restored tenant RLS is not closed without arena context.');
    mark('databasesRestored');
    const redis = decoded.find(item => item.kind === 'redis');
    await chmod(redis.local, 0o644);
    docker(['run', '-d', '--name', prefix + '-redis', '--label', 'vynor.restore-drill=arena-full', '--network', prefix, '--network-alias', 'restore-redis', '--mount', `type=bind,src=${redis.local},dst=/data/dump.rdb,readonly`, redisImage, 'redis-server', '--save', '', '--appendonly', 'no']); containers.push(prefix + '-redis');
    let redisKeys;
    for (let attempt = 0; ; attempt++) { try { redisKeys = Number(docker(['exec', prefix + '-redis', 'redis-cli', 'DBSIZE']).trim()); if (!Number.isFinite(redisKeys)) throw new Error(); break; } catch { if (attempt === 30) throw new Error('Redis snapshot did not restore.'); await delay(1000); } }
    // runtime-server drops to nobody; archived files must be readable by the web uid.
    execFileSync('chmod', ['-R', 'a+rX', app, uploads]);
    await chmod(directory, 0o711);
    for (const path of ['.next/cache', '.next/server/route-cache', '.next/standalone/public/uploads']) await mkdir(join(app, path), { recursive: true });
    const port = 8080, environment = isolatedEnvironment(runtimeUrl, port);
    const envFile = join(directory, 'isolated.env'); await writeFile(envFile, Object.entries(environment).map(([name, value]) => name + '=' + value).join('\n'), { mode: 0o600 });
    const args = ['run', '-d', '--name', prefix + '-web', '--label', 'vynor.restore-drill=arena-full', '--network', prefix, '--memory', '2g', '--security-opt', 'no-new-privileges', '--mount', `type=bind,src=${app},dst=/app,readonly`, '--mount', `type=bind,src=${uploads},dst=/app/.next/standalone/public/uploads`, '--tmpfs', '/app/.next/cache:rw,size=256m', '--tmpfs', '/app/.next/server/route-cache:rw,size=64m', '--env-file', envFile, '-w', '/app', appImage, 'node', 'scripts/runtime-server.mjs'];
    containers.push(prefix + '-web'); docker(args);
    const origin = `http://127.0.0.1:${port}`;
    const request = (route, options = {}) => {
      const code = `let input='';for await (const chunk of process.stdin) input+=chunk;const {route,headers,form}=JSON.parse(input);let body;if(form){const values=new FormData();for(const [key,value] of form)values.set(key,value);const {createRequire}=await import('node:module');const {encodeReply}=createRequire('/app/package.json')('next/dist/compiled/react-server-dom-webpack/client.node');body=await encodeReply([values]);}const response=await fetch('http://127.0.0.1:8080'+route,{method:form?'POST':'GET',headers,body,redirect:'manual',signal:AbortSignal.timeout(30000)});console.log(JSON.stringify({status:response.status,ok:response.ok,body:route==='/api/health'?await response.json():form?await response.text():null}));`;
      return JSON.parse(docker(['exec', '-i', prefix + '-web', 'node', '--input-type=module', '-e', code], { input: JSON.stringify({ route, ...options }) }));
    };
    for (let attempt = 0; ; attempt++) { try { const health = request('/api/health'); if (health.ok && health.body.ok) break; } catch {} if (attempt === 60) throw new Error('Restored web application did not become healthy.'); await delay(1000); }
    const token = randomBytes(32).toString('hex'), userId = 'recovery-drill-' + randomUUID(), arenaId = sql('arena_full_drill', 'SELECT id FROM "Arena" ORDER BY id LIMIT 1');
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(arenaId)) throw new Error('Invalid restored arena identifier.');
    sql('arena_full_drill', `INSERT INTO "User" (id,name,email,"passwordHash","systemRole","updatedAt") VALUES ('${userId}','Recovery drill','${userId}@invalid.example','disabled','SUPER_ADMIN',now()); INSERT INTO "Session" (id,token,"userId","expiresAt") VALUES ('${randomUUID()}','${createHash('sha256').update(token).digest('hex')}','${userId}',now()+interval '30 minutes');`);
    const headers = { Cookie: `padel_session=${token}; padel_arena=${arenaId}` }, pages = [];
    for (const route of ['/portal', '/jogadores', '/financeiro/contas-a-receber', '/torneios']) {
      const response = request(route, { headers });
      if (response.status !== 200) throw new Error('Restored application page failed: ' + route);
      pages.push(route);
    }
    const actions = JSON.parse(await readFile(join(app, '.next/server/server-reference-manifest.json'), 'utf8'));
    const actionId = Object.entries(actions.node).find(([, action]) => action.exportedName === 'createQuickPlayerAction')?.[0];
    if (!actionId) throw new Error('Restored registration action unavailable.');
    const form = new FormData();
    const syntheticName = 'Recovery drill ' + randomUUID();
    const syntheticPhone = '55119' + String(Math.floor(Math.random() * 100000000)).padStart(8, '0');
    form.set('name', syntheticName); form.set('phone', syntheticPhone);
    const actionResponse = request('/agenda', { headers: { ...headers, Origin: origin, 'Next-Action': actionId }, form: [...form.entries()] });
    const created = Number(sql('arena_full_drill', recoveryProbeQuery(syntheticName, syntheticPhone, arenaId)));
    if (!actionResponse.ok || created !== 1) throw new Error('Restored application write/transaction validation failed: HTTP ' + actionResponse.status + ', inserted=' + created + ', response=' + String(actionResponse.body).slice(0,2000));
    mark('applicationValidated');
    const result = { ok: true, checkedAt: new Date().toISOString(), sourceCompletedAt: manifest.completedAt, revision: manifest.application.revision, buildId: manifest.application.buildId, elapsedSeconds: Math.round((Date.now() - started) / 1000), timings, counts, postgresSnapshots: databases.length, syntheticActionValidated: true, redisKeys, configurationSnapshots: configurations.length, filesSnapshotsVerified: decoded.filter(item => item.kind === 'files').length, pages, isolation: 'internal Docker network; container-loopback HTTP; fresh database credentials; external workers disabled', excluded: ['External provider delivery and settlement', 'Offline recovery-key custody', 'Provisioning a replacement host'] };
    await atomicJson(join(config.directory, 'full-drill-status.json'), result); return result;
  } catch (error) {
    await atomicJson(join(config.directory, 'full-drill-failure.json'), { ok: false, checkedAt: new Date().toISOString(), elapsedSeconds: Math.round((Date.now() - started) / 1000) });
    let logs = ''; for (const name of containers) { try { logs += '\n' + name + '\n' + docker(['logs', '--tail', '60', name]); } catch {} }
    await writeFile(join(config.directory, 'full-drill-error.log'), String(error.stack || error) + '\n' + String(error.stderr || '') + logs, { mode: 0o600 });
    throw new Error('Isolated complete recovery failed; production was not modified.', { cause: error });
  } finally {
    for (const name of containers.reverse()) { try { docker(['rm', '-f', name]); } catch {} }
    if (network) docker(['network', 'rm', prefix]);
    await rm(directory, { recursive: true, force: true });
  }
}
async function main() {
  try { console.log(JSON.stringify(await runFullDrill(JSON.parse(await readFile(process.argv[2], 'utf8'))))); }
  catch { console.error('Falha na recuperação completa isolada. Consulte o recibo privado.'); process.exitCode = 1; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
