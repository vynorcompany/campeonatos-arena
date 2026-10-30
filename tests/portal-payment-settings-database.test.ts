import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
const nodeRequire = createRequire(import.meta.url);
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const isolated = /^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);
test("portal payment settings require the arena's connector, permission and isolated audited writes", { skip: !isolated }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } }); const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } }); const ids: string[] = [];
  try {
    for (const name of ["A", "B"]) { const arena = await admin.arena.create({ data: { name: `Portal payment settings ${name}`, slug: `portal-payment-settings-${randomUUID()}`, createdById: "goal-test" } }); ids.push(arena.id); }
    await admin.paymentConnection.create({ data: { arenaId: ids[1], provider: "MERCADO_PAGO", status: "CONNECTED" } });
    const actions: Record<string, (form: FormData) => Promise<{ error: string | null }>> = {}; let allowed = true;
    const mocks: Record<string, unknown> = {
      "next/cache": { revalidatePath() {} },
      "@/lib/auth/guards": { requireModuleView: async () => { if (!allowed) throw Error("Forbidden"); }, requirePermission: async () => ({ arenaId: ids[0], userId: "goal-test", userName: "Portal settings QA" }) },
      "@/lib/rls": { withArenaTransaction: (arenaId: string, operation: (tx: Prisma.TransactionClient) => Promise<unknown>) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`; return operation(tx); }) },
    };
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/portal-payment-settings.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: actions, FormData, require: (name: string) => mocks[name] ?? nodeRequire(name) });
    const form = (extra: Record<string, string> = {}) => { const data = new FormData(); for (const [key, value] of Object.entries({ portalConsumptionEnabled: "on", portalPaymentEnabled: "on", portalPixEnabled: "on", checkoutExpiryMinutes: "15", arenaId: ids[1], printerPaper: "INVALID", ...extra })) data.set(key, value); return data; };
    assert.match((await actions.savePortalPaymentSettingsAction(form())).error ?? "", /Conecte/);
    assert.equal(await admin.arenaOperationalSettings.count({ where: { arenaId: ids[0] } }), 0);
    await admin.paymentConnection.create({ data: { arenaId: ids[0], provider: "MERCADO_PAGO", status: "CONNECTED" } });
    assert.match((await actions.savePortalPaymentSettingsAction(form())).error ?? "", /Selecione a conta bancária/);
    const ownBank = await admin.bankAccount.create({ data: { arenaId: ids[0], name: "Recebimentos Portal QA" } });
    assert.equal((await actions.savePortalPaymentSettingsAction(form({ portalPaymentBankAccountId: ownBank.id }))).error, null);
    const saved = await admin.arenaOperationalSettings.findUniqueOrThrow({ where: { arenaId: ids[0] } });
    assert.equal(saved.portalPaymentsConfigured, true); assert.equal(saved.checkoutExpiryMinutes, 15); assert.equal(saved.portalCreditCardEnabled, false); assert.equal(saved.printerPaper, "80MM");
    assert.equal(await admin.arenaOperationalSettings.count({ where: { arenaId: ids[1] } }), 0);
    assert.match((await actions.savePortalPaymentSettingsAction(form({ portalPixEnabled: "" }))).error ?? "", /Ative Pix/);
    assert.ok((await actions.savePortalPaymentSettingsAction(form({ checkoutExpiryMinutes: "-1" }))).error);

    const foreignBank = await admin.bankAccount.create({ data: { arenaId: ids[1], name: "Outro banco QA" } });
    assert.match((await actions.savePortalPaymentSettingsAction(form({ portalPaymentBankAccountId: foreignBank.id }))).error ?? "", /nesta arena/);
    assert.equal((await actions.savePortalPaymentSettingsAction(form({ portalPaymentBankAccountId: ownBank.id }))).error, null);
    assert.equal((await admin.arenaOperationalSettings.findUniqueOrThrow({ where: { arenaId: ids[0] } })).portalPaymentBankAccountId, ownBank.id);
    await assert.rejects(admin.arenaOperationalSettings.update({ where: { arenaId: ids[0] }, data: { portalPaymentBankAccountId: foreignBank.id } }));
    allowed = false; await assert.rejects(actions.savePortalPaymentSettingsAction(form()), /Forbidden/);
    assert.equal(await admin.auditEvent.count({ where: { arenaId: ids[0], action: "PORTAL_PAYMENT_SETTINGS_UPDATED" } }), 2);
  } finally { await admin.arena.deleteMany({ where: { id: { in: ids } } }); await runtime.$disconnect(); await admin.$disconnect(); }
});
