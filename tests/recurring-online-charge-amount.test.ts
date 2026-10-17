import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { getFinancialEntryBalance } from "../src/lib/finance/ledger";
import { recurringBoletoEntryWhere } from "../src/lib/payments/recurring-charge-eligibility";
import { collectRecurringChargeCandidates, recurringChargeBatchLimit } from "../src/lib/payments/recurring-charge-selection";
import { getMissingBoletoPayerFields } from "../src/lib/payments/boleto-payer";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/lib/payments/recurring-online-charges.ts", import.meta.url), "utf8");

function loadRecurring(createBoleto: (input: Record<string, unknown>) => Promise<Record<string, unknown>>, candidateIds: string[] = [], scanFailures: string[] = [], scanEntries?: Array<Record<string, unknown>>, options: { phone?: string; missingPayer?: boolean; sendMessage?: () => Promise<void> } = {}) {
  const entry = {
    id: "entry-a", arenaId: "arena-a", amountCents: 5000, description: "Mensalidade de teste",
    dueDate: new Date("2035-01-05T12:00:00.000Z"),
    settlements: [{ amountCents: 2000, interestCents: 0 }],
    player: { name: "Atleta de teste", phone: options.phone ?? "", email: "athlete@example.test", cpf: "12345678901" },
  };
  const updates: Array<Record<string, unknown>> = [];
  const claims: Array<Record<string, unknown>> = [];
  const errors: unknown[][] = [];
  const queries: Array<Record<string, unknown>> = [];
  const alerts: Array<{ id: string; data: { type: string; href: string; message?: string; readAt?: Date | null } }> = [];
  const tx = {
    financialEntry: {
      updateMany: async (input: Record<string, unknown>) => { updates.push(input); return { count: 1 }; },
    },
    arenaNotification: {
      findFirst: async ({ where }: { where: { type: string; href: string } }) => alerts.find((alert) => alert.data.type === where.type && alert.data.href === where.href && !alert.data.readAt) ?? null,
      create: async (input: { data: { type: string; href: string; message?: string } }) => {
        const alert = { id: `alert-${alerts.length + 1}`, ...input };
        alerts.push(alert);
        return alert;
      },
      update: async ({ where, data }: { where: { id: string }; data: { message: string } }) => {
        const alert = alerts[Number(where.id.replace("alert-", "")) - 1];
        if (alert) Object.assign(alert.data, data);
        return alert;
      },
      updateMany: async ({ where, data }: { where: { type: string; href: string }; data: { readAt: Date } }) => {
        let count = 0;
        for (const alert of alerts) {
          if (alert.data.type === where.type && alert.data.href === where.href && !alert.data.readAt) {
            alert.data.readAt = data.readAt;
            count += 1;
          }
        }
        return { count };
      },
    },
  };
  const exports: Record<string, (...args: never[]) => Promise<unknown>> = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
    exports, Date, Intl, console: { error: (...args: unknown[]) => errors.push(args) },
    require: (name: string) => {
      if (name === "@/lib/payments/mercado-pago") return { createBoletoPayment: createBoleto, getMissingBoletoPayerFields: scanEntries ? getMissingBoletoPayerFields : () => options.missingPayer ? ["CPF"] : [] };
      if (name === "@/lib/integrations/evolution/client") return { sendEvolutionTextMessage: options.sendMessage ?? (async () => undefined) };
      if (name === "@/lib/prisma") return { prisma: { arena: { findMany: async () => [{ id: "arena-a" }] } } };
      if (name === "@/lib/arena-database") return { arenaDatabase: () => ({ financialEntry: {
        findFirst: async ({ where }: { where: { id: string } }) => ({ ...entry, id: where.id }),
        findMany: async (query: { cursor?: { id: string }; take: number }) => {
          if (scanFailures.includes("arena-a")) throw new Error("Falha simulada na consulta da arena");
          if (query.cursor && scanFailures.includes("arena-a:after-first-page")) throw new Error("Falha simulada após a primeira página");
          queries.push(query);
          const start = query.cursor ? scanEntries!.findIndex((item) => item.id === query.cursor!.id) + 1 : 0;
          return scanEntries!.slice(start, start + query.take);
        },
      } }) };
      if (name === "@/lib/rls") return { withArenaTransaction: async (_arenaId: string, action: (client: unknown) => Promise<unknown>) => action(tx) };
      if (name === "@/lib/payments/recurring-charge-selection") return { recurringChargeBatchLimit, collectRecurringChargeCandidates: scanEntries ? collectRecurringChargeCandidates : async () => ({ candidates: candidateIds.map((id) => ({ id, arenaId: "arena-a" })), failures: scanFailures.map((arenaId) => ({ arenaId, reason: new Error("Falha simulada na consulta") })) }) };
      if (name === "@/lib/finance/ledger") return { getFinancialEntryBalance };
      if (name === "@/lib/payments/financial-online-charge-claim") return { claimFinancialOnlineCharge: async (_tx: unknown, input: Record<string, unknown>) => { claims.push(input); return { ok: true, claimedAt: new Date("2035-01-01T12:00:00.000Z") }; } };
      if (name === "@/lib/payments/recurring-charge-eligibility") return { recurringBoletoEntryWhere };
      return require(name);
    },
  });
  return {
    issue: (arenaId: string, entryId: string, now = new Date("2034-12-25T12:00:00.000Z")) => (exports.issueRecurringOnlineChargeForEntry as (arenaId: string, entryId: string, now: Date) => Promise<{ created: boolean; skipped: boolean }>)(arenaId, entryId, now),
    batch: (now = new Date("2034-12-25T12:00:00.000Z")) => (exports.issueRecurringOnlineCharges as (now: Date) => Promise<{ scanned: number; created: number; skipped: number; failed: number }>)(now),
    candidates: exports.recurringOnlineChargeCandidates as () => Promise<{ candidates: Array<{ id: string }>; failures: Array<{ arenaId: string }>; ineligible: number; ineligibleByArena: Record<string, number> }>,
    claims, updates, errors, queries, alerts,
  };
}

test("primeiro boleto aguarda a janela de 15 dias antes de chamar o provedor", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = loadRecurring(async (input) => {
    calls.push(input);
    return { paymentId: "payment-a", checkoutUrl: "https://example.test/pay", qrCode: "", expiresAt: null };
  });
  assert.deepEqual(JSON.parse(JSON.stringify(await service.issue("arena-a", "entry-a", new Date("2034-12-20T12:00:00.000Z")))), { created: false, skipped: false });
  assert.equal(service.claims.length, 0);
  assert.equal(calls.length, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(await service.issue("arena-a", "entry-a", new Date("2034-12-21T12:00:00.000Z")))), { created: true, skipped: false });
  assert.equal(calls.length, 1);
});

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
  assert.equal(service.alerts[0].data.type, "ONLINE_CHARGE_ISSUANCE_REVIEW");
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

test("paginação ultrapassa 250 cadastros incompletos e encontra o boleto válido", async () => {
  const dueDate = new Date("2026-10-15T12:00:00.000Z");
  const incomplete = Array.from({ length: 251 }, (_, index) => ({
    id: `entry-${String(index).padStart(3, "0")}`, arenaId: "arena-a", dueDate, amountCents: 5000,
    settlements: [], player: { email: "", cpf: "" },
  }));
  const valid = {
    id: "entry-valid", arenaId: "arena-a", dueDate, amountCents: 5000, settlements: [],
    player: { email: "atleta@example.test", cpf: "12345678901", addressZipCode: "12345678", addressStreet: "Rua Teste", addressNumber: "1", addressNeighborhood: "Centro", addressCity: "Cidade", addressState: "SP" },
  };
  const service = loadRecurring(async () => ({}), [], [], [...incomplete, valid]);
  const result = await service.candidates();
  assert.deepEqual(result.candidates.map((item) => item.id), ["entry-valid"]);
  assert.equal(result.ineligible, 251);
  assert.equal(result.failures.length, 0);
  assert.equal(service.queries.length, 2);
  assert.equal((service.queries[1].cursor as { id: string }).id, "entry-249");
});

test("agendador avisa a arena sobre cadastros inelegíveis sem gerar um alerta por lançamento", async () => {
  const dueDate = new Date("2026-10-15T12:00:00.000Z");
  const incomplete = Array.from({ length: 3 }, (_, index) => ({
    id: `incomplete-${index}`, arenaId: "arena-a", dueDate, amountCents: 5000,
    settlements: [], player: { email: "", cpf: "" },
  }));
  const scanFailures: string[] = [];
  const service = loadRecurring(async () => { throw new Error("O provedor não deveria ser chamado"); }, [], scanFailures, incomplete);
  assert.deepEqual(JSON.parse(JSON.stringify(await service.batch())), { scanned: 0, created: 0, skipped: 3, failed: 0 });
  assert.equal(service.alerts.length, 1);
  assert.equal(service.alerts[0].data.type, "ONLINE_CHARGE_ISSUANCE_REVIEW");
  assert.equal(service.alerts[0].data.href, "/financeiro/contas-a-receber");
  assert.deepEqual(JSON.parse(JSON.stringify(await service.batch())), { scanned: 0, created: 0, skipped: 3, failed: 0 });
  assert.equal(service.alerts.length, 1);
  assert.equal(service.claims.length, 0);
  assert.equal(service.errors.length, 0);
  scanFailures.push("arena-a");
  assert.deepEqual(JSON.parse(JSON.stringify(await service.batch())), { scanned: 0, created: 0, skipped: 0, failed: 1 });
  assert.equal(service.alerts[0].data.readAt, undefined);
  scanFailures.length = 0;
  incomplete.length = 0;
  assert.deepEqual(JSON.parse(JSON.stringify(await service.batch())), { scanned: 0, created: 0, skipped: 0, failed: 0 });
  assert.equal(Object.prototype.toString.call(service.alerts[0].data.readAt), "[object Date]");
});

test("falha após uma página descarta contagem parcial e não reconcilia o alerta", async () => {
  const dueDate = new Date("2026-10-15T12:00:00.000Z");
  const incomplete = Array.from({ length: 251 }, (_, index) => ({
    id: `incomplete-${index}`, arenaId: "arena-a", dueDate, amountCents: 5000,
    settlements: [], player: { email: "", cpf: "" },
  }));
  const service = loadRecurring(async () => { throw new Error("O provedor não deveria ser chamado"); }, [], ["arena-a:after-first-page"], incomplete);
  const candidates = await service.candidates();
  assert.deepEqual(JSON.parse(JSON.stringify(candidates.failures.map((failure) => failure.arenaId))), ["arena-a"]);
  assert.deepEqual(JSON.parse(JSON.stringify(candidates.ineligibleByArena)), {});
  assert.deepEqual(JSON.parse(JSON.stringify(await service.batch())), { scanned: 0, created: 0, skipped: 0, failed: 1 });
  assert.equal(service.alerts.length, 0);
  assert.equal(service.queries.length, 2);
});

test("dados incompletos deixam alerta operacional sem tentar emitir boleto", async () => {
  const service = loadRecurring(async () => { throw new Error("O provedor não deveria ser chamado"); }, [], [], undefined, { missingPayer: true });
  assert.deepEqual(JSON.parse(JSON.stringify(await service.issue("arena-a", "entry-a"))), { created: false, skipped: true });
  assert.equal(service.claims.length, 0);
  assert.equal(service.alerts[0].data.type, "ONLINE_CHARGE_ISSUANCE_REVIEW");
});

test("falha no WhatsApp mantém o boleto emitido e deixa alerta sem reenviar", async () => {
  const service = loadRecurring(async () => ({ paymentId: "payment-a", checkoutUrl: "https://example.test/pay", qrCode: "", expiresAt: null }), [], [], undefined, {
    phone: "5511999999999",
    sendMessage: async () => { throw new Error("Falha simulada no WhatsApp"); },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(await service.issue("arena-a", "entry-a"))), { created: true, skipped: false });
  assert.equal(service.updates.length, 1);
  assert.equal(service.alerts[0].data.type, "ONLINE_CHARGE_DELIVERY_REVIEW");
  assert.equal(service.errors[0][0], "Could not send recurring boleto by WhatsApp");
});

test("boleto emitido sem telefone gera um único alerta de entrega", async () => {
  const service = loadRecurring(async () => ({ paymentId: "payment-a", checkoutUrl: "https://example.test/pay", qrCode: "", expiresAt: null }));
  await service.issue("arena-a", "entry-a");
  await service.issue("arena-a", "entry-a");
  assert.equal(service.alerts.length, 1);
  assert.equal(service.alerts[0].data.type, "ONLINE_CHARGE_DELIVERY_REVIEW");
});
