import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { Prisma, PrismaClient } from "@prisma/client";
import { verifyApprovedMercadoPagoPayment } from "../src/lib/payments/verified-payment";
import { publicRegistrationApprovalAfterHold } from "../src/lib/tournaments/registration-payment-hold";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/app/api/payments/mercado-pago/webhook/route.ts", import.meta.url), "utf8");

function loadWebhook(prisma: unknown, tx: unknown, getPayment: () => Promise<unknown>, ensurePair = async () => {}, database?: {
  arenaDatabase: (arenaId: string) => unknown;
  withArenaTransaction: (arenaId: string, operation: (client: Prisma.TransactionClient) => Promise<unknown>) => Promise<unknown>;
}) {
  const mockPrisma = prisma as { arena?: { findMany: () => Promise<Array<{ id: string }>> }; publicTournamentRegistration?: { findFirst: (input: unknown) => Promise<unknown> }; onlinePaymentCheckout?: { findFirst: (input: unknown) => Promise<unknown> }; financialEntry?: { findFirst: (input: unknown, arenaId: string) => Promise<unknown> } };
  mockPrisma.arena ??= { findMany: async () => [{ id: "arena-a" }, { id: "arena-b" }] };
  const exports: Record<string, (request: Request) => Promise<{ body: Record<string, unknown>; status: number }>> = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, Request, URL, Date, console: { error: () => undefined },
    require: (name: string) => {
      if (name === "next/server") return { NextResponse: { json: (body: Record<string, unknown>, options?: { status: number }) => ({ body, status: options?.status ?? 200 }) } };
      if (name === "@/lib/prisma") return { prisma };
      if (name === "@/lib/arena-database") return database ? { arenaDatabase: database.arenaDatabase } : { arenaDatabase: (arenaId: string) => ({
        publicTournamentRegistration: { findFirst: async (input: unknown) => {
          const found = await mockPrisma.publicTournamentRegistration?.findFirst(input) as { tournament?: { arenaId?: string } } | null | undefined;
          return found?.tournament?.arenaId === arenaId ? found : null;
        } },
        financialEntry: { findFirst: (input: unknown) => mockPrisma.financialEntry?.findFirst(input, arenaId) ?? Promise.resolve(null) },
        onlinePaymentCheckout: { findFirst: (input: unknown) => mockPrisma.onlinePaymentCheckout?.findFirst(input) ?? Promise.resolve(null) }
      }) };
      if (name === "@/lib/rls") return database ? { withArenaTransaction: database.withArenaTransaction } : { withArenaTransaction: async (_arenaId: string, operation: (client: unknown) => unknown) => operation(tx) };
      if (name === "@/lib/payments/mercado-pago") return { getMercadoPagoPayment: getPayment };
      if (name === "@/lib/finance/ledger") return { getFinancialEntryBalance: (amountCents: number, settlements: Array<{ amountCents: number }>) => ({ outstandingCents: amountCents - settlements.reduce((sum, item) => sum + item.amountCents, 0) }) };
      if (name === "@/lib/calendar/online-booking-hold") return { activeCourtOccurrenceWhere: () => ({ OR: [] }) };
      if (name === "@/lib/calendar/paid-booking-finalization") return { finalizePaidCourtBooking: async (client: { scheduleOccurrence: { update: (input: unknown) => Promise<unknown> }; arenaNotification: { create: (input: unknown) => Promise<unknown> }; playerNotification: { createMany: (input: unknown) => Promise<unknown> } }, _arenaId: string, _occurrenceId: string) => { await client.scheduleOccurrence.update({ where: { id: "booking-a" }, data: { status: "CANCELED", notes: "Pagamento recebido sem confirmação da reserva. Verificar atendimento/reembolso." } }); await client.arenaNotification.create({ data: { title: "Pagamento de reserva precisa de atendimento" } }); await client.playerNotification.createMany({ data: [] }); return false; } };
      if (name === "@/lib/services/registration-pair") return { ensureTournamentPairFromRegistration: ensurePair };
      if (name === "@/lib/env") return { env: {} };
      if (name === "@/lib/payments/mercado-pago-webhook-signature") return { verifyMercadoPagoWebhookSignature: () => true };
      if (name === "@/lib/payments/verified-payment") return { verifyApprovedMercadoPagoPayment };
      if (name === "@/lib/tournaments/registration-payment-hold") return { publicRegistrationApprovalAfterHold };
      if (name === "@/lib/calendar/booking-confirmation-whatsapp") return { sendBookingConfirmationForOccurrence: async () => ({ sent: 0, failed: 0 }) };
      if (name === "@/lib/integrations/evolution/client") return { sendEvolutionTextMessage: async () => ({}) };
      return require(name);
    },
  });
  return exports.POST;
}

const request = () => new Request("https://example.test/api/payments/mercado-pago/webhook", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: { id: "synthetic-payment" } }) });

test("late callbacks cannot resurrect expired checkouts or settle replacement debts", async () => {
  for (const providerStatus of ["pending", "cancelled", "rejected", "approved", "refunded", "charged_back"]) {
    const checkout = { id: "checkout-expired", arenaId: "arena-a", status: "EXPIRED" };
    let alerts = 0;
    const tx = {
      $queryRaw: async () => [],
      onlinePaymentCheckout: { findFirst: async () => checkout, update: async ({ data }: { data: any }) => Object.assign(checkout, data) },
      arenaNotification: { create: async () => { alerts++; } },
      financialSettlement: { create: async () => { throw new Error("Expired checkout must never settle money"); } },
    };
    const prisma = { publicTournamentRegistration: { findFirst: async () => null }, onlinePaymentCheckout: { findFirst: async () => checkout } };
    const webhook = loadWebhook(prisma, tx, async () => ({ id: "synthetic-payment", status: providerStatus, external_reference: checkout.id }));
    assert.equal((await webhook(request())).status, 200);
    assert.equal((await webhook(request())).status, 200);
    const review = ["approved", "refunded", "charged_back"].includes(providerStatus);
    assert.equal(checkout.status, review ? "REVIEW" : "EXPIRED");
    assert.equal(alerts, review ? 1 : 0);
  }
});

test("rejected hosted-checkout attempts keep the preference pending until every attempt is reconciled", async () => {
  for (const providerStatus of ["rejected", "cancelled", "canceled"]) {
    const checkout = { id: "hosted-checkout", arenaId: "arena-a", status: "PENDING", checkoutUrl: "https://checkout.example.test/active", mercadoPagoPreferenceId: "preference-a", items: [] };
    const tx = { $queryRaw: async () => [], onlinePaymentCheckout: { findFirst: async () => checkout, update: async ({ data }: { data: any }) => Object.assign(checkout, data) } };
    const prisma = { publicTournamentRegistration: { findFirst: async () => null }, onlinePaymentCheckout: { findFirst: async () => checkout } };
    const webhook = loadWebhook(prisma, tx, async () => ({ id: "synthetic-payment", status: providerStatus, external_reference: checkout.id }));
    assert.equal((await webhook(request())).status, 200);
    assert.equal(checkout.status, "PENDING");
  }
});

test("callback com arena identifica inscrição e checkout dentro da própria arena", async () => {
  const registrationFilters: unknown[] = [];
  const checkoutFilters: unknown[] = [];
  const prisma = {
    publicTournamentRegistration: { findFirst: async ({ where }: { where: unknown }) => { registrationFilters.push(where); return null; } },
    onlinePaymentCheckout: { findFirst: async ({ where }: { where: unknown }) => { checkoutFilters.push(where); return null; } },
    financialEntry: { findFirst: async () => null },
  };
  const webhook = loadWebhook(prisma, {}, async () => ({ id: "synthetic-payment", status: "pending", external_reference: "" }));
  const hinted = new Request("https://example.test/api/payments/mercado-pago/webhook?arenaId=arena-a", { method: "POST", body: JSON.stringify({ data: { id: "synthetic-payment" } }) });
  assert.equal((await webhook(hinted)).status, 200);
  assert.equal(JSON.stringify(registrationFilters), JSON.stringify([{ mercadoPagoPaymentId: "synthetic-payment", tournament: { arenaId: "arena-a" } }]));
  assert.ok(checkoutFilters.length > 0);
  assert.ok(checkoutFilters.every((where) => (where as { arenaId?: string }).arenaId === "arena-a"));
});

test("falha interna não revela detalhes da integração na resposta do webhook", async () => {
  const webhook = loadWebhook({
    publicTournamentRegistration: { findFirst: async () => { throw new Error("detalhe-interno-sensível"); } },
  }, {}, async () => null);
  const response = await webhook(request());
  assert.equal(response.status, 500);
  assert.equal(response.body.error, "webhook_processing_failed");
  assert.doesNotMatch(JSON.stringify(response.body), /detalhe-interno-sensível/);
});

test("inscrição paga não volta a pendente quando o provedor entrega eventos fora de ordem", async () => {
  const current = { paymentStatus: "PENDING", status: "PENDING_PAYMENT", mercadoPagoPaymentId: "", amountCents: 500 };
  const registration = { id: "registration-a", tournament: { id: "tournament-a", arenaId: "arena-a" }, leadName: "Atleta Um", partnerName: "Atleta Dois" };
  let pairCalls = 0;
  const locked: string[] = [];
  const tx = {
    $queryRaw: async (strings: TemplateStringsArray) => { locked.push(strings.join("?")); return [{ id: registration.id }]; },
    publicTournamentRegistration: {
      findFirst: async () => current,
      update: async ({ data }: { data: Record<string, unknown> }) => Object.assign(current, data),
    },
  };
  const prisma = { publicTournamentRegistration: { findFirst: async () => registration }, onlinePaymentCheckout: { findFirst: async () => null } };
  const statuses = ["approved", "pending"];
  const webhook = loadWebhook(prisma, tx, async () => ({ id: "synthetic-payment", status: statuses.shift(), currency_id: "BRL", transaction_amount: 5, external_reference: registration.id }), async () => { pairCalls += 1; });
  const first = await webhook(request());
  const second = await webhook(request());
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.equal(second.status, 200, JSON.stringify(second.body));
  assert.equal(current.paymentStatus, "PAID");
  assert.equal(current.status, "CONFIRMED");
  assert.equal(pairCalls, 1);
  assert.equal(locked.length, 2);
  assert.ok(locked.every((sql) => sql.includes('"PublicTournamentRegistration"') && sql.includes("FOR UPDATE")));
});

test("hint de outra arena não alcança a inscrição nem confirma pagamento", async () => {
  const current = { paymentStatus: "PENDING", status: "PENDING_PAYMENT", mercadoPagoPaymentId: "synthetic-payment", amountCents: 500 };
  const registration = { id: "registration-a", tournament: { id: "tournament-a", arenaId: "arena-a" }, leadName: "Atleta Um", partnerName: "Atleta Dois" };
  const lookupArenas: string[] = [];
  const tx = {
    $queryRaw: async () => [{ id: registration.id }],
    publicTournamentRegistration: { findFirst: async () => current, update: async ({ data }: { data: Record<string, unknown> }) => Object.assign(current, data) },
  };
  const prisma = { publicTournamentRegistration: { findFirst: async () => registration }, onlinePaymentCheckout: { findFirst: async () => null } };
  const webhook = loadWebhook(prisma, tx, async (...args: unknown[]) => { lookupArenas.push(String(args[0])); return { id: "synthetic-payment", status: "approved", currency_id: "BRL", transaction_amount: 5, external_reference: registration.id }; });
  const wrongHint = new Request("https://example.test/api/payments/mercado-pago/webhook?arenaId=arena-b", { method: "POST", body: JSON.stringify({ data: { id: "synthetic-payment" } }) });
  assert.equal((await webhook(wrongHint)).status, 200);
  assert.deepEqual(lookupArenas, ["arena-b"]);
  assert.equal(current.paymentStatus, "PENDING");
});

test("pagamento após cancelamento vai para revisão uma única vez sem criar dupla", async () => {
  const current = { paymentStatus: "PENDING", status: "CANCELED", mercadoPagoPaymentId: "synthetic-payment", amountCents: 500 };
  const registration = { id: "registration-canceled", tournament: { id: "tournament-a", arenaId: "arena-a" }, leadName: "Atleta Um", partnerName: "Atleta Dois" };
  let pairCalls = 0;
  let alerts = 0;
  const tx = {
    $queryRaw: async () => [{ id: registration.id }],
    publicTournamentRegistration: { findFirst: async () => current, update: async ({ data }: { data: Record<string, unknown> }) => Object.assign(current, data) },
    arenaNotification: { create: async () => { alerts += 1; } },
  };
  const prisma = { publicTournamentRegistration: { findFirst: async () => registration }, onlinePaymentCheckout: { findFirst: async () => null } };
  const webhook = loadWebhook(prisma, tx, async () => ({ id: "synthetic-payment", status: "approved", currency_id: "BRL", transaction_amount: 5, external_reference: registration.id }), async () => { pairCalls += 1; });
  assert.equal((await webhook(request())).status, 200);
  assert.equal((await webhook(request())).status, 200);
  assert.equal(current.status, "CANCELED");
  assert.equal(current.paymentStatus, "REVIEW");
  assert.equal(alerts, 1);
  assert.equal(pairCalls, 0);
});

test("callback encontra inscrição pela referência antes de o paymentId ser gravado", async () => {
  const current = { paymentStatus: "PENDING", status: "PENDING_PAYMENT", mercadoPagoPaymentId: "", amountCents: 500 };
  const registration = { id: "registration-early", tournament: { id: "tournament-a", arenaId: "arena-a" }, leadName: "Atleta Um", partnerName: "Atleta Dois" };
  let pairCalls = 0;
  let providerCalls = 0;
  const tx = {
    $queryRaw: async () => [{ id: registration.id }],
    publicTournamentRegistration: { findFirst: async () => current, update: async ({ data }: { data: Record<string, unknown> }) => Object.assign(current, data) },
  };
  const prisma = {
    publicTournamentRegistration: { findFirst: async ({ where }: { where: { id?: string } }) => where.id === registration.id ? registration : null },
    onlinePaymentCheckout: { findFirst: async () => null },
  };
  const webhook = loadWebhook(prisma, tx, async () => { providerCalls += 1; return { id: "synthetic-payment", status: "approved", currency_id: "BRL", transaction_amount: 5, external_reference: registration.id }; }, async () => { pairCalls += 1; });
  const hinted = new Request("https://example.test/api/payments/mercado-pago/webhook?arenaId=arena-a", { method: "POST", body: JSON.stringify({ data: { id: "synthetic-payment" } }) });
  assert.equal((await webhook(hinted)).status, 200);
  assert.equal(current.status, "CONFIRMED");
  assert.equal(current.paymentStatus, "PAID");
  assert.equal(current.mercadoPagoPaymentId, "synthetic-payment");
  assert.equal(pairCalls, 1);
  assert.equal(providerCalls, 1);
});

test("pagamento que chega após falha da API permanece cancelado e vai para revisão", async () => {
  const current = { paymentStatus: "PENDING", status: "CANCELED", mercadoPagoPaymentId: "", paymentProvider: "MERCADO_PAGO_FAILED", amountCents: 500 };
  const registration = { id: "registration-failed", tournament: { id: "tournament-a", arenaId: "arena-a" }, leadName: "Atleta Um", partnerName: "Atleta Dois" };
  let pairCalls = 0;
  let alerts = 0;
  const tx = {
    $queryRaw: async () => [{ id: registration.id }],
    publicTournamentRegistration: { findFirst: async () => current, update: async ({ data }: { data: Record<string, unknown> }) => Object.assign(current, data) },
    arenaNotification: { create: async () => { alerts += 1; } },
  };
  const prisma = {
    publicTournamentRegistration: { findFirst: async ({ where }: { where: { id?: string } }) => where.id === registration.id ? registration : null },
    onlinePaymentCheckout: { findFirst: async () => null },
  };
  const webhook = loadWebhook(prisma, tx, async () => ({ id: "synthetic-payment", status: "approved", currency_id: "BRL", transaction_amount: 5, external_reference: registration.id }), async () => { pairCalls += 1; });
  const hinted = new Request("https://example.test/api/payments/mercado-pago/webhook?arenaId=arena-a", { method: "POST", body: JSON.stringify({ data: { id: "synthetic-payment" } }) });
  assert.equal((await webhook(hinted)).status, 200);
  assert.equal(current.status, "CANCELED");
  assert.equal(current.paymentStatus, "REVIEW");
  assert.equal(alerts, 1);
  assert.equal(pairCalls, 0);
});

test("pagamento aprovado depois do prazo não confirma uma vaga expirada", async () => {
  const current = { paymentStatus: "PENDING", status: "PENDING_PAYMENT", mercadoPagoPaymentId: "synthetic-payment", paymentProvider: "MERCADO_PAGO", amountCents: 500, holdExpiresAt: new Date("2035-01-02T13:00:00Z") };
  const registration = { id: "registration-expired", tournament: { id: "tournament-a", arenaId: "arena-a" }, leadName: "Atleta Um", partnerName: "Atleta Dois" };
  let pairCalls = 0;
  let alerts = 0;
  const tx = {
    $queryRaw: async () => [{ id: registration.id }],
    publicTournamentRegistration: { findFirst: async () => current, update: async ({ data }: { data: Record<string, unknown> }) => Object.assign(current, data) },
    arenaNotification: { create: async () => { alerts += 1; } },
  };
  const prisma = {
    publicTournamentRegistration: { findFirst: async ({ where }: { where: { id?: string } }) => where.id === registration.id ? registration : null },
    onlinePaymentCheckout: { findFirst: async () => null },
  };
  const webhook = loadWebhook(prisma, tx, async () => ({ id: "synthetic-payment", status: "approved", date_approved: "2035-01-02T13:01:00Z", currency_id: "BRL", transaction_amount: 5, external_reference: registration.id }), async () => { pairCalls += 1; });
  const hinted = new Request("https://example.test/api/payments/mercado-pago/webhook?arenaId=arena-a", { method: "POST", body: JSON.stringify({ data: { id: "synthetic-payment" } }) });
  assert.equal((await webhook(hinted)).status, 200);
  assert.equal(current.status, "CANCELED");
  assert.equal(current.paymentStatus, "REVIEW");
  assert.equal(alerts, 1);
  assert.equal(pairCalls, 0);
});

test("primeiro pagamento de cartão legado substitui ID da preferência sem parecer duplicado", async () => {
  const current = { paymentStatus: "PENDING", status: "PENDING_PAYMENT", mercadoPagoPaymentId: "preference-id", paymentReference: "preference-id", paymentProvider: "MERCADO_PAGO", paymentQrCode: "", paymentCheckoutUrl: "https://checkout.example.test", amountCents: 500 };
  const registration = { id: "registration-card", tournament: { id: "tournament-a", arenaId: "arena-a" }, leadName: "Atleta Um", partnerName: "Atleta Dois" };
  let pairCalls = 0;
  let alerts = 0;
  const tx = {
    $queryRaw: async () => [{ id: registration.id }],
    publicTournamentRegistration: { findFirst: async () => current, update: async ({ data }: { data: Record<string, unknown> }) => Object.assign(current, data) },
    arenaNotification: { findFirst: async () => null, create: async () => { alerts += 1; } },
  };
  const prisma = {
    publicTournamentRegistration: { findFirst: async ({ where }: { where: { id?: string } }) => where.id === registration.id ? registration : null },
    onlinePaymentCheckout: { findFirst: async () => null },
  };
  const webhook = loadWebhook(prisma, tx, async () => ({ id: "actual-payment", status: "approved", currency_id: "BRL", transaction_amount: 5, external_reference: registration.id }), async () => { pairCalls += 1; });
  const hinted = new Request("https://example.test/api/payments/mercado-pago/webhook?arenaId=arena-a", { method: "POST", body: JSON.stringify({ data: { id: "actual-payment" } }) });
  assert.equal((await webhook(hinted)).status, 200);
  assert.equal(current.paymentStatus, "PAID");
  assert.equal(current.mercadoPagoPaymentId, "actual-payment");
  assert.equal(pairCalls, 1);
  assert.equal(alerts, 0);
});

test("referência de inscrição não atravessa arenas no fallback do webhook", async () => {
  const registration = { id: "registration-arena-a", tournament: { id: "tournament-a", arenaId: "arena-a" }, leadName: "Atleta Um", partnerName: "Atleta Dois" };
  let registrationArenaFilter = "";
  let pairCalls = 0;
  const prisma = {
    publicTournamentRegistration: { findFirst: async ({ where }: { where: { id?: string; tournament?: { arenaId: string } } }) => {
      if (!where.id) return null;
      registrationArenaFilter = where.tournament?.arenaId ?? "";
      return where.id === registration.id && where.tournament?.arenaId === registration.tournament.arenaId ? registration : null;
    } },
    onlinePaymentCheckout: { findFirst: async () => null },
    financialEntry: { findFirst: async () => null },
  };
  const webhook = loadWebhook(prisma, {}, async () => ({ id: "synthetic-payment", status: "approved", currency_id: "BRL", transaction_amount: 5, external_reference: registration.id }), async () => { pairCalls += 1; });
  const request = new Request("https://example.test/api/payments/mercado-pago/webhook?arenaId=arena-b", { method: "POST", body: JSON.stringify({ data: { id: "synthetic-payment" } }) });
  assert.equal((await webhook(request)).status, 200);
  assert.equal(registrationArenaFilter, "arena-b");
  assert.equal(pairCalls, 0);
});

test("segundo pagamento da mesma inscrição gera alerta único sem substituir a cobrança original", async () => {
  const current = { paymentStatus: "PAID", status: "CONFIRMED", mercadoPagoPaymentId: "original-payment", amountCents: 500 };
  const registration = { id: "registration-duplicate", tournament: { id: "tournament-a", arenaId: "arena-a" }, leadName: "Atleta Um", partnerName: "Atleta Dois" };
  const alerts: string[] = [];
  let pairCalls = 0;
  const tx = {
    $queryRaw: async () => [{ id: registration.id }],
    publicTournamentRegistration: { findFirst: async () => current },
    arenaNotification: {
      findFirst: async ({ where }: { where: { message: string } }) => alerts.includes(where.message) ? { id: "alert" } : null,
      create: async ({ data }: { data: { message: string } }) => { alerts.push(data.message); },
    },
  };
  const prisma = {
    publicTournamentRegistration: { findFirst: async ({ where }: { where: { id?: string } }) => where.id === registration.id ? registration : null },
    onlinePaymentCheckout: { findFirst: async () => null },
  };
  const webhook = loadWebhook(prisma, tx, async () => ({ id: "synthetic-payment", status: "approved", currency_id: "BRL", transaction_amount: 5, external_reference: registration.id }), async () => { pairCalls += 1; });
  const hinted = () => new Request("https://example.test/api/payments/mercado-pago/webhook?arenaId=arena-a", { method: "POST", body: JSON.stringify({ data: { id: "synthetic-payment" } }) });
  assert.equal((await webhook(hinted())).status, 200);
  assert.equal((await webhook(hinted())).status, 200);
  assert.equal(alerts.length, 1);
  assert.equal(current.mercadoPagoPaymentId, "original-payment");
  assert.equal(pairCalls, 0);
});

test("entrega repetida de pagamento agrupado baixa os lançamentos apenas uma vez", async () => {
  const entry = { id: "entry-a", arenaId: "arena-a", status: "PENDING", category: "Plano", amountCents: 500, settlements: [] as Array<{ amountCents: number }>, paidAt: null, saleId: null };
  const checkout = { id: "checkout-a", arenaId: "arena-a", status: "PENDING", amountCents: 500, items: [{ amountCents: 500, financialEntry: entry }] };
  let settlementCalls = 0;
  const locked: string[] = [];
  const tx = {
    $queryRaw: async (strings: TemplateStringsArray) => { locked.push(strings.join("?")); return [{ id: checkout.id }]; },
    onlinePaymentCheckout: {
      findFirst: async () => checkout,
      update: async ({ data }: { data: Record<string, unknown> }) => Object.assign(checkout, data),
    },
    financialSettlement: { create: async ({ data }: { data: { amountCents: number } }) => { settlementCalls += 1; entry.settlements.push({ amountCents: data.amountCents }); } },
    financialEntry: { update: async ({ data }: { data: Record<string, unknown> }) => Object.assign(entry, data) },
  };
  const prisma = { publicTournamentRegistration: { findFirst: async () => null }, onlinePaymentCheckout: { findFirst: async () => checkout } };
  const webhook = loadWebhook(prisma, tx, async () => ({ id: "synthetic-payment", status: "approved", currency_id: "BRL", transaction_amount: 5, external_reference: checkout.id }));
  const firstResponse = await webhook(request());
  assert.equal(firstResponse.status, 200, JSON.stringify(firstResponse.body));
  const secondResponse = await webhook(request());
  assert.equal(secondResponse.status, 200, JSON.stringify(secondResponse.body));
  assert.equal(settlementCalls, 1);
  assert.equal(entry.settlements[0].amountCents, 500);
  assert.equal(checkout.status, "PAID");
  assert.equal(locked.length, 3);
  assert.equal(locked.filter((sql) => sql.includes('"OnlinePaymentCheckout"') && sql.includes("FOR UPDATE")).length, 2);
  assert.equal(locked.filter((sql) => sql.includes('"FinancialEntry"') && sql.includes("FOR UPDATE")).length, 1);
});

test("pagamento agrupado divergente não baixa lançamentos e abre revisão uma única vez", async () => {
  const checkout = { id: "checkout-a", arenaId: "arena-a", status: "PENDING", amountCents: 500, items: [{ amountCents: 500, financialEntry: { arenaId: "arena-a" } }] };
  let settlements = 0;
  let alerts = 0;
  const tx = {
    $queryRaw: async () => [{ id: checkout.id }],
    onlinePaymentCheckout: { findFirst: async () => checkout, update: async ({ data }: { data: Record<string, unknown> }) => Object.assign(checkout, data) },
    financialSettlement: { create: async () => { settlements += 1; } },
    arenaNotification: { create: async () => { alerts += 1; } },
  };
  const prisma = { publicTournamentRegistration: { findFirst: async () => null }, onlinePaymentCheckout: { findFirst: async () => checkout } };
  const webhook = loadWebhook(prisma, tx, async () => ({ id: "synthetic-payment", status: "approved", currency_id: "BRL", transaction_amount: 1, external_reference: checkout.id }));
  assert.equal((await webhook(request())).status, 200);
  assert.equal((await webhook(request())).status, 200);
  assert.equal(checkout.status, "REVIEW");
  assert.equal(settlements, 0);
  assert.equal(alerts, 1);
});

test("pagamento agrupado recebido após quitação por outro meio exige revisão sem baixar novamente", async () => {
  const entry = { id: "entry-a", arenaId: "arena-a", status: "PAID", category: "Plano", amountCents: 500, settlements: [{ amountCents: 500 }], paidAt: new Date(), saleId: null };
  const checkout = { id: "checkout-a", arenaId: "arena-a", status: "PENDING", amountCents: 500, items: [{ amountCents: 500, financialEntry: entry }] };
  let settlements = 0;
  let alerts = 0;
  const tx = {
    $queryRaw: async () => [{ id: checkout.id }],
    onlinePaymentCheckout: { findFirst: async () => checkout, update: async ({ data }: { data: Record<string, unknown> }) => Object.assign(checkout, data) },
    financialSettlement: { create: async () => { settlements += 1; } },
    arenaNotification: { create: async () => { alerts += 1; } },
  };
  const prisma = { publicTournamentRegistration: { findFirst: async () => null }, onlinePaymentCheckout: { findFirst: async () => checkout } };
  const webhook = loadWebhook(prisma, tx, async () => ({ id: "synthetic-payment", status: "approved", currency_id: "BRL", transaction_amount: 5, external_reference: checkout.id }));
  assert.equal((await webhook(request())).status, 200);
  assert.equal((await webhook(request())).status, 200);
  assert.equal(checkout.status, "REVIEW");
  assert.equal(settlements, 0);
  assert.equal(alerts, 1);
});

test("webhook mantém estados do checkout no vocabulário usado pelos relatórios", async () => {
  for (const [providerStatus, expected] of [["pending", "PENDING"], ["in_process", "PENDING"], ["rejected", "FAILED"], ["cancelled", "FAILED"], ["refunded", "REVIEW"], ["charged_back", "REVIEW"]] as const) {
    const checkout = { id: `checkout-${providerStatus}`, arenaId: "arena-a", status: "PENDING", amountCents: 500, items: [] };
    let alerts = 0;
    const tx = {
      $queryRaw: async () => [{ id: checkout.id }],
      onlinePaymentCheckout: { findFirst: async () => checkout, update: async ({ data }: { data: Record<string, unknown> }) => Object.assign(checkout, data) },
      arenaNotification: { create: async () => { alerts += 1; } },
    };
    const prisma = { publicTournamentRegistration: { findFirst: async () => null }, onlinePaymentCheckout: { findFirst: async () => checkout } };
    const webhook = loadWebhook(prisma, tx, async () => ({ id: "synthetic-payment", status: providerStatus, currency_id: "BRL", transaction_amount: 5, external_reference: checkout.id }));
    assert.equal((await webhook(request())).status, 200);
    assert.equal(checkout.status, expected);
    assert.equal(alerts, expected === "REVIEW" ? 1 : 0);
  }
});

test("estorno de checkout já baixado alerta uma vez sem alterar a conta antes da conciliação", async () => {
  const checkout = { id: "checkout-a", arenaId: "arena-a", status: "PAID", amountCents: 500, items: [] };
  let alerts = 0;
  let savedMessage = "";
  let updates = 0;
  const tx = {
    $queryRaw: async () => [{ id: checkout.id }],
    onlinePaymentCheckout: { findFirst: async () => checkout, update: async () => { updates += 1; } },
    arenaNotification: {
      findFirst: async ({ where }: { where: { message: string } }) => savedMessage === where.message ? { id: "alert-a" } : null,
      create: async ({ data }: { data: { message: string } }) => { savedMessage = data.message; alerts += 1; },
    },
  };
  const prisma = { publicTournamentRegistration: { findFirst: async () => null }, onlinePaymentCheckout: { findFirst: async () => checkout } };
  const webhook = loadWebhook(prisma, tx, async () => ({ id: "synthetic-payment", status: "refunded", currency_id: "BRL", transaction_amount: 5, external_reference: checkout.id }));
  assert.equal((await webhook(request())).status, 200);
  assert.equal((await webhook(request())).status, 200);
  assert.equal(checkout.status, "PAID");
  assert.equal(updates, 0);
  assert.equal(alerts, 1);
});

test("estorno de reserva já paga alerta uma vez sem cancelar a reserva ou rebaixar o lançamento", async () => {
  const entry = { id: "entry-a", arenaId: "arena-a", source: "ONLINE_BOOKING", externalReference: "booking-a" };
  const current = { ...entry, status: "PAID", settlements: [{ amountCents: 5000, interestCents: 0 }] };
  let savedMessage = "";
  let alerts = 0;
  let entryUpdates = 0;
  let bookingUpdates = 0;
  const tx = {
    $queryRaw: async () => [{ id: "locked" }],
    scheduleOccurrence: {
      findFirst: async () => ({ occurrenceCourts: [{ courtId: "court-a" }] }),
      update: async () => { bookingUpdates += 1; },
    },
    financialEntry: {
      findFirst: async () => current,
      update: async () => { entryUpdates += 1; },
    },
    arenaNotification: {
      findFirst: async ({ where }: { where: { message: string } }) => savedMessage === where.message ? { id: "alert-a" } : null,
      create: async ({ data }: { data: { message: string } }) => { savedMessage = data.message; alerts += 1; },
    },
  };
  const prisma = {
    publicTournamentRegistration: { findFirst: async () => null },
    onlinePaymentCheckout: { findFirst: async () => null },
    financialEntry: { findFirst: async () => entry },
  };
  const webhook = loadWebhook(prisma, tx, async () => ({ id: "synthetic-payment", status: "refunded", currency_id: "BRL", transaction_amount: 50, external_reference: "online_booking:booking-a" }));
  const hinted = () => new Request("https://example.test/api/payments/mercado-pago/webhook?arenaId=arena-a", { method: "POST", body: JSON.stringify({ data: { id: "synthetic-payment" } }) });
  assert.equal((await webhook(hinted())).status, 200);
  assert.equal((await webhook(hinted())).status, 200);
  assert.equal(alerts, 1);
  assert.match(savedMessage, /concilie o caixa e a reserva/);
  assert.equal(current.status, "PAID");
  assert.equal(entryUpdates, 0);
  assert.equal(bookingUpdates, 0);
});

test("estorno de inscrição confirmada alerta uma vez sem desfazer a dupla automaticamente", async () => {
  const registration = { id: "registration-a", tournament: { id: "tournament-a", arenaId: "arena-a" }, leadName: "Atleta Um", partnerName: "Atleta Dois" };
  const current = { paymentStatus: "PAID", status: "CONFIRMED", mercadoPagoPaymentId: "synthetic-payment", amountCents: 500 };
  let savedMessage = "";
  let alerts = 0;
  let updates = 0;
  let pairCalls = 0;
  const tx = {
    $queryRaw: async () => [{ id: registration.id }],
    publicTournamentRegistration: {
      findFirst: async () => current,
      update: async () => { updates += 1; },
    },
    arenaNotification: {
      findFirst: async ({ where }: { where: { message: string } }) => savedMessage === where.message ? { id: "alert-a" } : null,
      create: async ({ data }: { data: { message: string } }) => { savedMessage = data.message; alerts += 1; },
    },
  };
  const prisma = { publicTournamentRegistration: { findFirst: async () => registration }, onlinePaymentCheckout: { findFirst: async () => null } };
  const webhook = loadWebhook(prisma, tx, async () => ({ id: "synthetic-payment", status: "refunded", currency_id: "BRL", transaction_amount: 5, external_reference: registration.id }), async () => { pairCalls += 1; });
  assert.equal((await webhook(request())).status, 200);
  assert.equal((await webhook(request())).status, 200);
  assert.equal(alerts, 1);
  assert.match(savedMessage, /concilie a inscrição/);
  assert.equal(current.paymentStatus, "PAID");
  assert.equal(current.status, "CONFIRMED");
  assert.equal(updates, 0);
  assert.equal(pairCalls, 0);
});

test("callback repetido não reabre checkout cujo estorno já foi conferido", async () => {
  const checkout = { id: "checkout-a", arenaId: "arena-a", status: "REFUNDED", amountCents: 500, items: [] };
  let updates = 0;
  const tx = {
    $queryRaw: async () => [{ id: checkout.id }],
    onlinePaymentCheckout: { findFirst: async () => checkout, update: async () => { updates += 1; } },
  };
  const prisma = { publicTournamentRegistration: { findFirst: async () => null }, onlinePaymentCheckout: { findFirst: async () => checkout } };
  const webhook = loadWebhook(prisma, tx, async () => ({ id: "synthetic-payment", status: "approved", currency_id: "BRL", transaction_amount: 5, external_reference: checkout.id }));
  assert.equal((await webhook(request())).status, 200);
  assert.equal(checkout.status, "REFUNDED");
  assert.equal(updates, 0);
});

test("lançamento individual com valor divergente permanece aberto e alerta uma única vez", async () => {
  const entry = { id: "entry-a", arenaId: "arena-a", status: "PENDING", amountCents: 1000, settlements: [], source: "MANUAL", externalReference: "", notes: "", onlinePaymentId: "synthetic-payment" };
  let settlements = 0;
  let alerts = 0;
  const tx = {
    $queryRaw: async () => [{ id: entry.id }],
    financialEntry: { findFirst: async () => entry, update: async ({ data }: { data: Record<string, unknown> }) => Object.assign(entry, data) },
    financialSettlement: { create: async () => { settlements += 1; } },
    arenaNotification: { create: async () => { alerts += 1; } },
  };
  const prisma = { publicTournamentRegistration: { findFirst: async () => null }, onlinePaymentCheckout: { findFirst: async () => null }, financialEntry: { findFirst: async () => entry } };
  const webhook = loadWebhook(prisma, tx, async () => ({ id: "synthetic-payment", status: "approved", currency_id: "BRL", transaction_amount: 1, external_reference: entry.id }));
  const hintedRequest = () => new Request("https://example.test/api/payments/mercado-pago/webhook?arenaId=arena-a", { method: "POST", body: JSON.stringify({ data: { id: "synthetic-payment" } }) });
  const firstResponse = await webhook(hintedRequest());
  assert.equal(firstResponse.status, 200, JSON.stringify(firstResponse.body));
  const secondResponse = await webhook(hintedRequest());
  assert.equal(secondResponse.status, 200, JSON.stringify(secondResponse.body));
  assert.equal(entry.status, "PENDING");
  assert.match(entry.notes, /MP_REVIEW:synthetic-payment/);
  assert.equal(settlements, 0);
  assert.equal(alerts, 1);
});

test("inscrição com referência divergente não é confirmada automaticamente", async () => {
  const registration = { id: "registration-a", tournament: { id: "tournament-a", arenaId: "arena-a" } };
  const current = { paymentStatus: "PENDING", status: "PENDING_PAYMENT", amountCents: 500 };
  let alerts = 0;
  let pairs = 0;
  const tx = {
    $queryRaw: async () => [{ id: registration.id }],
    publicTournamentRegistration: { findFirst: async () => current, update: async ({ data }: { data: Record<string, unknown> }) => Object.assign(current, data) },
    arenaNotification: { create: async () => { alerts += 1; } },
  };
  const prisma = { publicTournamentRegistration: { findFirst: async () => registration }, onlinePaymentCheckout: { findFirst: async () => null } };
  const webhook = loadWebhook(prisma, tx, async () => ({ id: "synthetic-payment", status: "approved", currency_id: "BRL", transaction_amount: 5, external_reference: "registration-b" }), async () => { pairs += 1; });
  assert.equal((await webhook(request())).status, 200);
  assert.equal((await webhook(request())).status, 200);
  assert.equal(current.paymentStatus, "REVIEW");
  assert.equal(current.status, "PENDING_PAYMENT");
  assert.equal(pairs, 0);
  assert.equal(alerts, 1);
});

test("todas as quatro baixas do webhook são serializadas por registro", () => {
  for (const table of ["OnlinePaymentCheckout", "ScheduleOccurrence", "FinancialEntry", "PublicTournamentRegistration"]) {
    assert.match(source, new RegExp(`SELECT "id" FROM "${table}"[^;]*FOR UPDATE`));
  }
  assert.match(source, /entry\.arenaId !== current\.arenaId/);
});

test("cobrança de reserva bloqueia quadras antes do lançamento financeiro", async () => {
  const entry = { id: "entry-a", arenaId: "arena-a", externalReference: "booking-a", source: "ONLINE_BOOKING" };
  const locks: Array<{ sql: string; values: unknown[] }> = [];
  const tx = {
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => { locks.push({ sql: strings.join("?"), values }); return [{ id: "locked" }]; },
    scheduleOccurrence: { findFirst: async () => ({ occurrenceCourts: [{ courtId: "court-b" }, { courtId: "court-a" }] }) },
    financialEntry: {
      findFirst: async () => ({ ...entry, status: "PENDING", amountCents: 500, settlements: [], notes: "" }),
      update: async () => ({}),
    },
  };
  const prisma = {
    publicTournamentRegistration: { findFirst: async () => null },
    onlinePaymentCheckout: { findFirst: async () => null },
    financialEntry: { findFirst: async () => entry },
  };
  const webhook = loadWebhook(prisma, tx, async () => ({ id: "synthetic-payment", status: "pending", external_reference: entry.id }));
  const hinted = new Request("https://example.test/api/payments/mercado-pago/webhook?arenaId=arena-a", { method: "POST", body: JSON.stringify({ data: { id: "synthetic-payment" } }) });
  assert.equal((await webhook(hinted)).status, 200);
  assert.deepEqual(locks.map((lock) => lock.sql.includes('"Court"') ? "Court" : lock.sql.includes('"FinancialEntry"') ? "FinancialEntry" : "other"), ["Court", "Court", "FinancialEntry"]);
  assert.deepEqual(locks.slice(0, 2).map((lock) => lock.values[0]), ["court-a", "court-b"]);
});

test("webhook localiza boleto no escopo da arena e preserva callbacks antigos sem arenaId", async () => {
  const searched: string[] = [];
  const entry = { id: "entry-b", arenaId: "arena-b", externalReference: "" };
  const prisma = {
    arena: { findMany: async () => [{ id: "arena-a" }, { id: "arena-b" }] },
    publicTournamentRegistration: { findFirst: async () => null },
    onlinePaymentCheckout: { findFirst: async () => null },
    financialEntry: { findFirst: async (_input: unknown, arenaId: string) => { searched.push(arenaId); return arenaId === "arena-b" ? entry : null; } }
  };
  const tx = {
    $queryRaw: async () => [{ id: entry.id }],
    financialEntry: {
      findFirst: async () => ({ ...entry, status: "PENDING", settlements: [], amountCents: 1000 }),
      update: async () => ({})
    }
  };
  let providerLookups = 0;
  const webhook = loadWebhook(prisma, tx, async () => { providerLookups += 1; return { id: "synthetic-payment", status: "pending" }; });
  const hinted = new Request("https://example.test/api/payments/mercado-pago/webhook?arenaId=arena-b", { method: "POST", body: JSON.stringify({ data: { id: "synthetic-payment" } }) });
  assert.equal((await webhook(hinted)).status, 200);
  assert.deepEqual(searched, ["arena-b"]);
  assert.equal(providerLookups, 1);

  searched.length = 0;
  assert.equal((await webhook(request())).status, 200);
  assert.deepEqual(searched, ["arena-a", "arena-b"]);
  assert.equal(providerLookups, 2);
});

test("pagamento tardio com horário ocupado é registrado sem confirmar reserva e alerta a arena", async () => {
  const booking = { id: "booking-a", arenaId: "arena-a", status: "PENDING_PAYMENT", sourceType: "ONLINE_BOOKING", startsAt: new Date("2026-10-19T10:00:00Z"), endsAt: new Date("2026-10-19T11:00:00Z"), notes: "", arena: { onlineBookingWhatsappConfirmationEnabled: false }, occurrenceCourts: [{ courtId: "court-a", court: { name: "Quadra 1" } }], participants: [{ id: "participant-a", playerId: "player-a", amountCents: 5000, financialEntryId: null, player: { id: "player-a", name: "Atleta", phone: "" } }] };
  const alerts: string[] = [];
  const lockQueries: string[] = [];
  let entryCount = 0;
  const tx = {
    $queryRaw: async (strings: TemplateStringsArray) => { lockQueries.push(strings.join("?")); return [{ id: "locked" }]; },
    scheduleOccurrence: {
      findFirst: async ({ where }: { where: { id?: unknown } }) => typeof where.id === "object" ? { id: "other-booking" } : booking,
      update: async ({ data }: { data: { status: string; notes?: string } }) => Object.assign(booking, data),
    },
    financialEntry: { findFirst: async () => null, create: async () => { entryCount += 1; return { id: "entry-a" }; } },
    financialSettlement: { create: async () => ({}) },
    scheduleParticipant: { update: async ({ data }: { data: { financialEntryId: string } }) => { booking.participants[0].financialEntryId = data.financialEntryId as never; } },
    arenaNotification: { create: async ({ data }: { data: { title: string } }) => { alerts.push(data.title); } },
    playerNotification: { createMany: async () => ({}) },
  };
  const prisma = { publicTournamentRegistration: { findFirst: async () => null }, onlinePaymentCheckout: { findFirst: async () => null }, financialEntry: { findFirst: async () => null } };
  const webhook = loadWebhook(prisma, tx, async () => ({ id: "synthetic-payment", status: "approved", external_reference: "online_booking:booking-a", transaction_amount: 50, currency_id: "BRL" }));
  const response = await webhook(new Request("https://example.test/api/payments/mercado-pago/webhook?arenaId=arena-a", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: { id: "synthetic-payment" } }) }));
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(booking.status, "CANCELED");
  assert.equal(entryCount, 1);
  assert.equal(alerts.length, 1);
  assert.match(booking.notes, /reembolso/);
  assert.match(lockQueries[0], /FROM "Court".*FOR UPDATE/);
  assert.match(lockQueries[1], /FROM "ScheduleOccurrence".*FOR UPDATE/);
});

test("segunda cobrança paga para a mesma reserva é registrada uma vez e sinalizada para reembolso", async () => {
  const booking = {
    id: "booking-a", arenaId: "arena-a", status: "SCHEDULED", sourceType: "ONLINE_BOOKING",
    startsAt: new Date("2026-10-19T10:00:00Z"), arena: { slug: "arena-a", onlineBookingWhatsappConfirmationEnabled: false },
    occurrenceCourts: [{ courtId: "court-a", court: { name: "Quadra 1" } }],
    participants: [{ id: "participant-a", amountCents: 5000, financialEntryId: "first-payment-entry", player: { id: "player-a", name: "Atleta", phone: "" } }]
  };
  const recorded: Array<Record<string, unknown>> = [];
  const alerts: string[] = [];
  let settlements = 0;
  let participantUpdates = 0;
  const tx = {
    $queryRaw: async () => [{ id: booking.id }],
    scheduleOccurrence: { findFirst: async () => booking },
    financialEntry: {
      findFirst: async () => recorded.length ? { id: "duplicate-entry" } : null,
      create: async ({ data }: { data: Record<string, unknown> }) => { recorded.push(data); return { id: "duplicate-entry" }; }
    },
    financialSettlement: { create: async () => { settlements += 1; } },
    scheduleParticipant: { update: async () => { participantUpdates += 1; } },
    arenaNotification: { create: async ({ data }: { data: { title: string } }) => { alerts.push(data.title); } },
    playerNotification: { createMany: async () => ({}) }
  };
  const prisma = { publicTournamentRegistration: { findFirst: async () => null }, onlinePaymentCheckout: { findFirst: async () => null }, financialEntry: { findFirst: async () => null } };
  const webhook = loadWebhook(prisma, tx, async () => ({ id: "second-payment", status: "approved", external_reference: "online_booking:booking-a", transaction_amount: 50, currency_id: "BRL" }));
  const duplicateRequest = () => new Request("https://example.test/api/payments/mercado-pago/webhook?arenaId=arena-a", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: { id: "second-payment" } }) });
  assert.equal((await webhook(duplicateRequest())).status, 200);
  assert.equal((await webhook(duplicateRequest())).status, 200);
  assert.equal(recorded.length, 1);
  assert.equal(recorded[0].category, "Pagamento duplicado");
  assert.equal(recorded[0].onlinePaymentId, "second-payment");
  assert.equal(settlements, 1);
  assert.deepEqual(alerts, ["Pagamento duplicado de reserva"]);
  assert.equal(participantUpdates, 0);
});

test("pagamento com valor divergente não confirma a reserva nem atribui a cobrança ao atleta", async () => {
  const booking = {
    id: "booking-a", arenaId: "arena-a", status: "PENDING_PAYMENT", sourceType: "ONLINE_BOOKING",
    startsAt: new Date("2026-10-19T10:00:00Z"), arena: { slug: "arena-a", onlineBookingWhatsappConfirmationEnabled: false },
    occurrenceCourts: [{ courtId: "court-a", court: { name: "Quadra 1" } }],
    participants: [{ id: "participant-a", amountCents: 5000, financialEntryId: null, player: { id: "player-a", name: "Atleta", phone: "" } }]
  };
  const entries: Array<Record<string, unknown>> = [];
  const alerts: string[] = [];
  let participantUpdates = 0;
  const tx = {
    $queryRaw: async () => [{ id: booking.id }],
    scheduleOccurrence: { findFirst: async () => booking },
    financialEntry: { findFirst: async () => null, create: async ({ data }: { data: Record<string, unknown> }) => { entries.push(data); return { id: "review-entry" }; } },
    financialSettlement: { create: async () => ({}) },
    scheduleParticipant: { update: async () => { participantUpdates += 1; } },
    arenaNotification: { create: async ({ data }: { data: { title: string } }) => { alerts.push(data.title); } },
    playerNotification: { createMany: async () => ({}) }
  };
  const prisma = { publicTournamentRegistration: { findFirst: async () => null }, onlinePaymentCheckout: { findFirst: async () => null }, financialEntry: { findFirst: async () => null } };
  const webhook = loadWebhook(prisma, tx, async () => ({ id: "underpaid", status: "approved", external_reference: "online_booking:booking-a", transaction_amount: 1, currency_id: "BRL" }));
  const response = await webhook(new Request("https://example.test/api/payments/mercado-pago/webhook?arenaId=arena-a", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: { id: "underpaid" } }) }));
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(booking.status, "PENDING_PAYMENT");
  assert.equal(participantUpdates, 0);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].amountCents, 100);
  assert.equal(entries[0].category, "Pagamento divergente");
  assert.deepEqual(alerts, ["Valor de pagamento divergente"]);
});

const goalDatabaseUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableGoalDatabase = (() => {
  try {
    const url = new URL(goalDatabaseUrl);
    return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal";
  } catch { return false; }
})();

test("webhook de checkout real baixa a cobrança uma vez sob RLS", { skip: !disposableGoalDatabase }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: goalDatabaseUrl } } });
  const runtimeUrl = new URL(goalDatabaseUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const unique = randomUUID();
  const playerId = `goal-webhook-player-${unique}`;
  const entryId = `goal-webhook-entry-${unique}`;
  const checkoutId = `goal-webhook-checkout-${unique}`;
  const paymentId = `goal-webhook-payment-${unique}`;
  try {
    const arena = await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    await admin.player.create({ data: { id: playerId, arenaId: arena.id, name: "Atleta descartável webhook", email: `goal-${unique}@example.test` } });
    await admin.financialEntry.create({ data: { id: entryId, arenaId: arena.id, playerId, type: "REVENUE", category: "Teste descartável", description: "Pagamento webhook descartável", amountCents: 5000 } });
    await admin.onlinePaymentCheckout.create({ data: { id: checkoutId, arenaId: arena.id, playerId, amountCents: 5000, mercadoPagoPaymentId: paymentId, items: { create: { financialEntryId: entryId, amountCents: 5000 } } } });
    const database = {
      arenaDatabase: (arenaId: string) => ({
        publicTournamentRegistration: { findFirst: async () => null },
        onlinePaymentCheckout: { findFirst: (input: Prisma.OnlinePaymentCheckoutFindFirstArgs) => runtime.$transaction(async (tx) => {
          await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`;
          return tx.onlinePaymentCheckout.findFirst(input);
        }) },
      }),
      withArenaTransaction: <T>(arenaId: string, operation: (tx: Prisma.TransactionClient) => Promise<T>) => runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`;
        return operation(tx);
      }),
    };
    const webhook = loadWebhook(runtime, {}, async () => ({ id: paymentId, status: "approved", currency_id: "BRL", transaction_amount: 50, external_reference: checkoutId }), async () => {}, database);
    const callback = () => new Request(`https://example.test/api/payments/mercado-pago/webhook?arenaId=${arena.id}`, { method: "POST", body: JSON.stringify({ data: { id: paymentId } }) });
    assert.equal((await webhook(callback())).status, 200);
    assert.equal((await webhook(callback())).status, 200);
    assert.equal((await admin.onlinePaymentCheckout.findUniqueOrThrow({ where: { id: checkoutId } })).status, "PAID");
    assert.equal((await admin.financialEntry.findUniqueOrThrow({ where: { id: entryId } })).status, "PAID");
    const settlements = await admin.financialSettlement.findMany({ where: { financialEntryId: entryId } });
    assert.equal(settlements.length, 1);
    assert.equal(settlements[0].amountCents, 5000);
  } finally {
    await admin.financialSettlement.deleteMany({ where: { financialEntryId: entryId } });
    await admin.onlinePaymentCheckout.deleteMany({ where: { id: checkoutId } });
    await admin.financialEntry.deleteMany({ where: { id: entryId } });
    await admin.player.deleteMany({ where: { id: playerId } });
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});

test("checkout registra a conta escolhida e exige revisão para reclassificar recebimentos anteriores", async () => {
  for (const previousBank of [null, "bank-other"]) {
    const entry = { id: "entry-a", arenaId: "arena-a", bankAccountId: previousBank, status: previousBank ? "PARTIAL" : "PENDING", category: "Plano", amountCents: previousBank ? 600 : 500, settlements: previousBank ? [{ amountCents: 100 }] : [] as Array<{ amountCents: number }>, paidAt: null, saleId: null };
    const checkout = { id: "checkout-bank", arenaId: "arena-a", bankAccountId: "bank-selected", status: "PENDING", amountCents: 500, items: [{ amountCents: 500, financialEntry: entry }] };
    let settlements = 0; const alerts: string[] = [];
    const tx = {
      $queryRaw: async () => [{ id: checkout.id }],
      bankAccount: { findFirst: async (input: { where: { arenaId: string; id: string } }) => { assert.equal(input.where.arenaId, "arena-a"); assert.equal(input.where.id, "bank-selected"); return { id: "bank-selected" }; } },
      onlinePaymentCheckout: { findFirst: async () => checkout, update: async ({ data }: { data: Record<string, unknown> }) => Object.assign(checkout, data) },
      financialSettlement: { create: async ({ data }: { data: { amountCents: number } }) => { settlements++; entry.settlements.push({ amountCents: data.amountCents }); } },
      financialEntry: { update: async ({ data }: { data: Record<string, unknown> }) => Object.assign(entry, data) },
      arenaNotification: { create: async ({ data }: { data: { title: string } }) => { alerts.push(data.title); } },
    };
    const prisma = { publicTournamentRegistration: { findFirst: async () => null }, onlinePaymentCheckout: { findFirst: async () => checkout } };
    const webhook = loadWebhook(prisma, tx, async () => ({ id: "bank-payment", status: "approved", currency_id: "BRL", transaction_amount: 5, external_reference: checkout.id }));
    const response = await webhook(request()); assert.equal(response.status, 200, JSON.stringify(response.body));
    if (previousBank) { assert.equal(checkout.status, "REVIEW"); assert.equal(entry.bankAccountId, "bank-other"); assert.equal(settlements, 0); assert.deepEqual(alerts, ["Conta de recebimento exige conferência"]); }
    else { assert.equal(checkout.status, "PAID"); assert.equal(entry.bankAccountId, "bank-selected"); assert.equal(settlements, 1); }
  }
});

test("pagamento com desconto e juros baixa o valor líquido uma única vez sem alterar o principal", async () => {
 const entry={id:"entry-quote",arenaId:"arena-a",status:"PENDING",amountCents:10000,settlements:[],source:"MANUAL",externalReference:"",notes:"",onlinePaymentId:"synthetic-payment",onlinePaymentUrl:"https://example.test/pay",onlineChargeAmountCents:9500,onlineChargeDiscountCents:1000,onlineChargeInterestCents:500};
 const settlements:Record<string,unknown>[]=[];
 const tx={$queryRaw:async()=>[],financialEntry:{findFirst:async()=>entry,update:async({data}:{data:Record<string,unknown>})=>Object.assign(entry,data)},financialSettlement:{create:async({data}:{data:Record<string,unknown>})=>{settlements.push(data);return data;}},arenaNotification:{create:async()=>{throw Error("A valid quote must not require review")}}};
 const prisma={publicTournamentRegistration:{findFirst:async()=>null},onlinePaymentCheckout:{findFirst:async()=>null},financialEntry:{findFirst:async()=>entry}};
 const webhook=loadWebhook(prisma,tx,async()=>({id:"synthetic-payment",status:"approved",currency_id:"BRL",transaction_amount:95,external_reference:entry.id}));
 const request=()=>new Request("https://example.test/api/payments/mercado-pago/webhook?arenaId=arena-a",{method:"POST",body:JSON.stringify({data:{id:"synthetic-payment"}})});
 assert.equal((await webhook(request())).status,200);assert.equal((await webhook(request())).status,200);
 assert.equal(entry.status,"PAID");assert.equal(entry.amountCents,10000);assert.equal(settlements.length,1);
 assert.equal(settlements[0].amountCents,9500);assert.equal(settlements[0].discountCents,1000);assert.equal(settlements[0].interestCents,500);
});

test("pagamento com cotação cujo saldo mudou é enviado à revisão sem conceder desconto", async () => {
 const entry={id:"entry-stale-quote",arenaId:"arena-a",status:"PENDING",amountCents:12000,settlements:[],source:"MANUAL",externalReference:"",notes:"",onlinePaymentId:"synthetic-payment",onlineChargeAmountCents:9000,onlineChargeDiscountCents:1000,onlineChargeInterestCents:0};let alerts=0;
 const tx={$queryRaw:async()=>[],financialEntry:{findFirst:async()=>entry,update:async({data}:{data:Record<string,unknown>})=>Object.assign(entry,data)},financialSettlement:{create:async()=>{throw Error("Stale quote must never settle")}},arenaNotification:{create:async()=>{alerts++}}};
 const prisma={publicTournamentRegistration:{findFirst:async()=>null},onlinePaymentCheckout:{findFirst:async()=>null},financialEntry:{findFirst:async()=>entry}};
 const webhook=loadWebhook(prisma,tx,async()=>({id:"synthetic-payment",status:"approved",currency_id:"BRL",transaction_amount:90,external_reference:entry.id}));
 const request=()=>new Request("https://example.test/api/payments/mercado-pago/webhook?arenaId=arena-a",{method:"POST",body:JSON.stringify({data:{id:"synthetic-payment"}})});
 await webhook(request());await webhook(request());assert.equal(entry.status,"PENDING");assert.equal(alerts,1);assert.match(entry.notes,/MP_REVIEW/);
});
