import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import * as contracts from '../src/lib/backend/contracts/client-directory';
import * as financial from '../src/lib/finance/client-financial-status';
import { matchesSearch } from '../src/lib/clients/name-search';
import { normalizeBrazilianPhone } from '../src/lib/phone';

function fixture() {
  const player = (id: string, name: string, active = true) => ({
    id, name, active, guardianId: null, personType: 'PF', cnpj: '', allowOverdueComandas: null, photoUrl: '', phone: '5541997598452', email: '', cpf: '',
    addressZipCode: '', addressStreet: '', addressNumber: '', addressNeighborhood: '', addressCity: '', addressState: '', birthDate: null, gender: '', class: '',
    teacher: null, points: 1000, leagueAthleteTiers: [], student: null, financialEntries: [], billedEntries: [], scheduleParticipants: [], comandas: [], balanceMovements: [],
    privateField: 'must-not-leave-service',
  });
  const players = [player('a', 'Paulo Marcelo Kaufman'), player('b', 'Outro Cliente', false)];
  const queries: any[] = [];
  const table = (result: unknown) => ({ findMany: async (query: unknown) => { queries.push(query); return result; } });
  const db = { player: table(players), plan: table([{ id: 'plan', name: 'Plano' }]), teacher: table([]), arena: { findUniqueOrThrow: async () => ({ loyaltyEnabled: true, loyaltyStartedAt: null, loyaltyVisitsRequired: 10, loyaltyRewardLabel: 'Prêmio' }) }, arenaOperationalSettings: { findUnique: async () => ({ blockDelinquentComandas: true }) } };
  const modules: Record<string, unknown> = { 'server-only': {}, '@/lib/backend/contracts/client-directory': contracts, '@/lib/clients/name-search': { matchesSearch }, '@/lib/phone': { normalizeBrazilianPhone }, '@/lib/finance/client-financial-status': financial, '@/lib/arena-database': { arenaDatabase: (id: string) => { assert.equal(id, 'session-arena'); return db; } } };
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/backend/services/client-directory.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Map, Date, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  return { load: (filters: unknown) => exports.resolveClientDirectory('session-arena', filters), players, queries };
}

test('client directory preserves smart name/phone filters, options and explicit presentation fields', async () => {
  const data = fixture();
  const result = await data.load({ q: 'Paulo Kaufman', phone: '41997598452', active: 'ACTIVE', financial: 'CURRENT' });
  assert.deepEqual(result.clients.map((client: any) => client.id), ['a']);
  assert.deepEqual(result.guardians.map((client: any) => client.id), ['a']);
  assert.equal(result.clients[0].allowOverdueComandas, false);
  assert.equal(result.clients[0].financialStatus, 'Saudável');
  assert.equal(JSON.stringify(result).includes('must-not-leave-service'), false);
  for (const query of data.queries) assert.equal(query.where.arenaId, 'session-arena');
  assert.equal(data.queries[0].where.mergedIntoPlayerId, null);
  assert.equal((await data.load({ active: 'INACTIVE' })).clients[0].id, 'b');
  await assert.rejects(data.load({ arenaId: 'other' }));
  assert.equal(contracts.clientDirectorySchema.safeParse({ ...result, databaseUrl: 'secret' }).success, false);
});

test('client directory frontend sends filters and its session without sending an arena authority', async () => {
  let request: any[] = [];
  const modules: Record<string, unknown> = {
    'server-only': {}, '@/lib/backend/contracts/client-directory': contracts,
    '@/lib/backend/management-context-client': { managementCookieHeader: async () => 'padel_session=staff' },
    '@/lib/backend/http-client': { readBackendContract: async (...args: any[]) => { request = args; return {}; } },
  };
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/clients/directory.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, URLSearchParams, process: { env: { VX4_BACKEND_ORIGIN: 'https://backend.example.test' } }, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  await exports.getClientDirectory('do-not-trust-this-id', { q: 'Paulo Kaufman', active: 'ACTIVE' });
  assert.equal(request[0], 'https://backend.example.test');
  const url = new URL(request[1], request[0]);
  assert.equal(url.searchParams.get('q'), 'Paulo Kaufman');
  assert.equal(url.searchParams.has('arenaId'), false);
  assert.equal(request[3].cookie, 'padel_session=staff');
});
