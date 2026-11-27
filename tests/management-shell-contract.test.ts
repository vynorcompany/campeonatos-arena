import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { managementShellSchema } from '../src/lib/backend/contracts/management-shell';

const source = readFileSync(new URL('../src/lib/backend/services/management-shell.ts', import.meta.url), 'utf8');
function fixture(permissions: string[]) {
  let loyalty = 0, whatsapp = 0, comandas = 0;
  const queries: any[] = [];
  const modules: Record<string, unknown> = {
    'server-only': {},
    '@/lib/permissions': { allPermissionModules: ['players', 'support', 'pos'], canViewModule: (module: string) => permissions.includes(module) },
    '@/lib/arena-database': { arenaDatabase: (arenaId: string) => {
      assert.equal(arenaId, 'arena-from-session');
      return { $transaction: async (operation: any, options: any) => {
        assert.equal(options.maxWait, 20000); assert.equal(options.timeout, 10000);
        return operation({ arenaNotification: { findMany: async (query: any) => { queries.push(query); assert.equal(query.where.arenaId, arenaId); return [{ id: 'notice', title: 'Notice', message: 'Message', href: '/painel', createdAt: new Date('2026-11-01T12:00:00Z') }]; } } });
      }, arenaNotification: { count: async ({ where }: any) => { assert.equal(where.arenaId, arenaId); comandas++; return 2; } } };
    } },
    '@/lib/services/refresh-loyalty-notifications': { refreshLoyaltyNotifications: async (arenaId: string) => { assert.equal(arenaId, 'arena-from-session'); loyalty++; } },
    '@/lib/services/client-loyalty-notifications': { loyaltyNotificationType: 'LOYALTY' },
    '@/lib/finance/agency-delinquency': { getAgencyDelinquency: async (arenaId: string) => { assert.equal(arenaId, 'arena-from-session'); return { id: 'invoice', daysRemaining: 2, deadline: new Date('2026-11-03T12:00:00Z'), checkoutUrl: 'https://payment.example.invalid', privateField: 'must-not-leave-backend' }; } },
    '@/lib/whatsapp-active-account': { getActiveWhatsAppUnreadCount: async (arenaId: string) => { assert.equal(arenaId, 'arena-from-session'); whatsapp++; return 3; } },
    '@/lib/backend/contracts/management-shell': { managementShellSchema },
  };
  const exports: Record<string, (...args: any[]) => Promise<any>> = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Promise, require: (name: string) => { assert.ok(name in modules, name); return modules[name]; } });
  return { load: () => exports.resolveManagementShell({ arenaId: 'arena-from-session', systemRole: 'VIEWER', arenaRole: 'STAFF', viewPermissions: permissions }), queries, calls: () => ({ loyalty, whatsapp, comandas }) };
}

test('shared shell keeps counters, loyalty scan and notification visibility bound to permissions', async () => {
  const restricted = fixture([]);
  const data = await restricted.load();
  assert.deepEqual(restricted.calls(), { loyalty: 0, whatsapp: 0, comandas: 0 });
  assert.equal(restricted.queries[0].where.type.notIn.includes('LOYALTY'), true);
  assert.equal(restricted.queries[0].where.type.notIn.includes('SYSTEM_RECOVERY'), true);
  assert.equal(data.notifications[0].createdAt, '2026-11-01T12:00:00.000Z');
  assert.equal(JSON.stringify(data).includes('privateField'), false);
  const full = fixture(['players', 'support', 'pos']);
  const fullData = await full.load();
  assert.deepEqual(full.calls(), { loyalty: 1, whatsapp: 1, comandas: 1 });
  assert.equal(fullData.whatsappUnreadCount, 3); assert.equal(fullData.comandaRequestCount, 2);
  assert.equal(full.queries[0].where.type.notIn.includes('LOYALTY'), false);
  assert.equal(managementShellSchema.safeParse({ ...fullData, databaseUrl: 'private' }).success, false);
});
