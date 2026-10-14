import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { getFinancialEntryBalance } from "../src/lib/finance/ledger";
import { recurringBoletoEntryWhere } from "../src/lib/payments/recurring-charge-eligibility";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/lib/payments/recurring-online-charges.ts", import.meta.url), "utf8");

function loadRecurring(createBoleto: (input: Record<string, unknown>) => Promise<Record<string, unknown>>, candidateIds: string[] = [], scanFailures: string[] = []) {
  const entry = {
    id: "entry-a", arenaId: "arena-a", amountCents: 5000, description: "Mensalidade de teste",
    dueDate: new Date("2035-01-05T12:00:00.000Z"),
    settlements: [{ amountCents: 2000, interestCents: 0 }],
    player: { name: "Atleta de teste", phone: "", email: "athlete@example.test", cpf: "12345678901" },
  };
  const updates: Array<Record<string, unknown>> = [];
  const claims: Array<Record<string, unknown>> = [];
  const errors: unknown[][] = [];
  const tx = {
    financialEntry: {
      updateMany: async (input: Record<string, unknown>) => { updates.push(input); return { count: 1 }; },
    },
  };
  const exports: Record<string, (...args: never[]) => Promise<unknown>> = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, Date, Intl, console: { error: (...args: unknown[]) => errors.push(args) },
    require: (name: string) => {
      if (name === "@/lib/payments/mercado-pago") return { createBoletoPayment: createBoleto, getMissingBoletoPayerFields: () => [] };
      if (name === "@/lib/integrations/evolution/client") return { sendEvolutionTextMessage: async () => undefined };
      if (name === "@/lib/prisma") return { prisma: { arena: { findMany: async () => [{ id: "arena-a" }] } } };
      if (name === "@/lib/arena-database") return { arenaDatabase: () => ({ financialEntry: { findFirst: async ({ where }: { where: { id: string } }) => ({ ...entry, id: where.id }) } }) };
      if (name === "@/lib/rls") return { withArenaTransaction: async (_arenaId: string, action: (client: unknown) => Promise<unknown>) => action(tx) };
      if (name === "@/lib/payments/recurring-charge-selection") return { collectRecurringChargeCandidates: async () => ({ candidates: candidateIds.map((id) => ({ id, arenaId: "arena-a" })), failures: scanFailures.map((arenaId) => ({ arenaId, reason: new Error("Falha simulada na consulta") })) }) };
      if (name === "@/lib/finance/ledger") return { getFinancialEntryBalance };
      if (name === "@/lib/payments/financial-online-charge-claim") return { claimFinancialOnlineCharge: async (_tx: unknown, input: Record<string, unknown>) => { claims.push(input); return { ok: true, claimedAt: new Date("2035-01-01T12:00:00.000Z") }; } };
      if (name === "@/lib/payments/recurring-charge-eligibility") return { recurringBoletoEntryWhere };
      return require(name);
    },
  });
  return {
    issue: exports.issueRecurringOnlineChargeForEntry as (arenaId: string, entryId: string) => Promise<{ created: boolean; skipped: boolean }>,
    batch: exports.issueRecurringOnlineCharges as () => Promise<{ scanned: number; created: number; skipped: number; failed: number }>,
    claims, updates, errors,
  };
}

test("boleto recorrente cobra só o saldo após pagamento parcial", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = loadRecurring(async (input) => {
    calls.push(input);
    return { paymentId: "payment-a", checkoutUrl: "https://example.test/pay", qrCode: "", expiresAt: null };
  });
  assert.deepEqual(JSON.parse(JSON.stringify(await service.issue("arena-a", "entry-a"))), { created: true, skipped: false });
  assert.equal(calls[0].amountCents, 3000);
  assert.equal(service.claims[0].expectedAmountCents, 3000);
  assert.equal(service.updates.length, 1);
});

test("falha do provedor libera a tentativa sem permitir troca automática de método", async () => {
  const service = loadRecurring(async () => { throw new Error("Falha simulada do provedor"); });
  await assert.rejects(service.issue("arena-a", "entry-a"), /Falha simulada/);
  assert.equal(service.updates.length, 1);
  const update = service.updates[0] as { where: { onlinePaymentClaimMethod: string }; data: { onlinePaymentClaimedAt: Date | null } };
  assert.equal(update.where.onlinePaymentClaimMethod, "BOLETO");
  assert.equal(update.data.onlinePaymentClaimedAt, null);
});

test("falha de um boleto não impede a emissão dos demais no mesmo ciclo", async () => {
  const service = loadRecurring(async (input) => {
    if (input.externalReference === "entry-failed") throw new Error("Falha simulada do provedor");
    return { paymentId: "payment-good", checkoutUrl: "https://example.test/pay", qrCode: "", expiresAt: null };
  }, ["entry-failed", "entry-good"]);
  assert.deepEqual(JSON.parse(JSON.stringify(await service.batch())), { scanned: 2, created: 1, skipped: 0, failed: 1 });
  assert.equal(service.claims.length, 2);
  assert.equal(service.errors.length, 1);
});

test("falha na consulta de uma arena é reportada sem interromper boletos de outra", async () => {
  const service = loadRecurring(async () => ({ paymentId: "payment-good", checkoutUrl: "https://example.test/pay", qrCode: "", expiresAt: null }), ["entry-good"], ["arena-b"]);
  assert.deepEqual(JSON.parse(JSON.stringify(await service.batch())), { scanned: 1, created: 1, skipped: 0, failed: 1 });
  assert.equal(service.claims.length, 1);
  assert.equal(service.errors.length, 1);
  assert.equal(service.errors[0][0], "Recurring boleto arena scan failed");
});
