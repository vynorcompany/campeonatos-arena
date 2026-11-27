import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { readFileSync } from 'node:fs';
import * as contracts from '../src/lib/backend/contracts/client-loyalty';
import { clientMutationInputSchema } from '../src/lib/backend/contracts/client-mutations';

test('loyalty reads send only a client target with the management session and reject unexpected authority', async () => {
  let request: any[] = [];
  const modules: Record<string, unknown> = {
    'server-only': {}, '@/lib/backend/contracts/client-loyalty': contracts,
    '@/lib/backend/management-context-client': { managementCookieHeader: async () => 'padel_session=staff' },
    '@/lib/backend/http-client': { readBackendContract: async (...args: any[]) => { request = args; return {}; } },
  };
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('src/lib/clients/loyalty.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, encodeURIComponent, process: { env: { VX4_BACKEND_ORIGIN: 'https://backend.example.test' } }, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  await exports.getClientLoyalty('player-id');
  assert.equal(request[1], '/api/management/clients/loyalty?playerId=player-id');
  assert.equal(request[3].cookie, 'padel_session=staff');
  assert.equal(contracts.clientLoyaltyQuerySchema.safeParse({ playerId: 'player', arenaId: 'other' }).success, false);
  assert.equal(clientMutationInputSchema('loyalty-settings').safeParse({ fields: { enabled: ['on'], visitsRequired: ['10'], rewardLabel: ['Água'] } }).success, true);
  assert.equal(clientMutationInputSchema('loyalty-redeem').safeParse({ fields: { playerId: ['player'], visitsDelta: ['100'] } }).success, false);
  assert.equal(clientMutationInputSchema('loyalty-fulfill').safeParse({ fields: { activityId: ['activity'], createdByUserId: ['other'] } }).success, false);
});
