import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import * as contracts from '../src/lib/backend/contracts/client-mutations';
import { backendOrigin } from '../src/lib/backend/http-client';

test('client mutation transport preserves repeated selection and files without forwarding authority fields or retrying writes', async () => {
  const requests: Array<{ url: URL; init: RequestInit }> = [];
  const modules: Record<string, unknown> = {
    'server-only': {}, 'next/headers': { headers: async () => new Headers({ origin: 'https://arena.example.test', authorization: 'private' }) },
    '@/lib/backend/http-client': { backendOrigin }, '@/lib/backend/management-context-client': { managementCookieHeader: async () => 'padel_session=staff' }, '@/lib/backend/contracts/client-mutations': contracts,
  };
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/backend/client-mutations-client.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Buffer, File, URL, AbortSignal, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; },
    fetch: async (url: URL, init: RequestInit) => { requests.push({ url, init }); return Response.json({ error: null }); },
  });
  const selection = new FormData(); selection.append('playerId', 'a'); selection.append('playerId', 'b'); selection.set('arenaId', 'forged'); selection.set('systemRole', 'SUPER_ADMIN');
  await exports.remoteClientMutation('https://backend.example.test', 'archive-many', selection);
  const first = requests[0];
  assert.equal(first.url.pathname, '/api/management/clients/actions/archive-many');
  assert.deepEqual(JSON.parse(first.init.body as string).fields, { playerId: ['a', 'b'] });
  assert.equal(new Headers(first.init.headers).get('authorization'), null);
  assert.equal(new Headers(first.init.headers).get('cookie'), 'padel_session=staff');
  assert.equal(first.init.redirect, 'error'); assert.equal(first.init.cache, 'no-store');
  const upload = new FormData(); upload.set('file', new File(['Nome;Telefone\nCliente Teste;41999990000'], 'clientes.csv', { type: 'text/csv' }));
  await exports.remoteClientMutation('https://backend.example.test', 'import', upload);
  const encoded = JSON.parse(requests[1].init.body as string);
  assert.equal(Buffer.from(encoded.file.base64, 'base64').toString(), await (upload.get('file') as File).text());
  assert.equal(encoded.file.name, 'clientes.csv');
  const photo = new FormData(); photo.set('photo', new File(['synthetic'], 'avatar.png', { type: 'image/png' }));
  await exports.remoteClientMutation('https://backend.example.test', 'update', photo);
  assert.equal(JSON.parse(requests[2].init.body as string).file.type, 'image/png');
  assert.equal(contracts.clientMutationInputSchema('update').safeParse({ fields: { arenaId: ['other'] } }).success, false);
  assert.equal(contracts.clientMutationInputSchema('balance').safeParse({ fields: {}, file: encoded.file }).success, false);
  assert.equal(contracts.clientMutationInputSchema('update').safeParse({ fields: { playerId: ['a', 'b'] } }).success, false);
});

test('client mutation facade refreshes existing routes only after a confirmed success', async () => {
  const paths: string[] = [];
  let fail = false;
  const modules: Record<string, unknown> = {
    'server-only': {}, 'next/cache': { revalidatePath: (path: string) => paths.push(path) },
    '@/lib/backend/client-mutations-client': { remoteClientMutation: async () => ({ error: fail ? 'Invalid change' : null }) },
    '@/lib/tournament/revalidation': { refreshTournamentRoutes: () => paths.push('tournament-routes') },
  };
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/clients/mutation.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, FormData, process: { env: { VX4_BACKEND_ORIGIN: 'https://backend.example.test' } }, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  await exports.runClientMutation('balance'); assert.deepEqual(paths, ['/jogadores', '/agenda', '/aulas']);
  paths.length = 0; await exports.runClientMutation('create'); assert.deepEqual(paths, ['tournament-routes', '/aulas', '/financeiro']);
  paths.length = 0; fail = true; await exports.runClientMutation('update'); assert.deepEqual(paths, []);
});
