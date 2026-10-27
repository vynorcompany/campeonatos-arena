import * as jsonBody from "../src/lib/http/json-body";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/app/api/payments/mercado-pago/agency/webhook/route.ts", import.meta.url), "utf8");

function webhookFor(payment: { id: string; status: string; status_detail?: string; external_reference: string; transaction_amount: number; currency_id: string }) {
  const invoice = { id: "invoice-a", arenaId: "arena-a", amountCents: 5000, status: "PENDING", financialEntryId: "entry-a", period: "2026-10", providerPaymentId: "", paymentReviewStatus: "", paymentReviewAt: null as Date | null };
  const notifications: { id: string; arenaId: string; type: string; title: string; message: string; href: string }[] = [];
  const writes = { settlements: 0, entries: 0, invoices: 0, arenaIds: [] as string[], notifications };
  const exports: Record<string, (request: Request) => Promise<{ status: number; body: Record<string, unknown> }>> = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, URL, Date, Math, Number, String, console,
    require: (name: string) => {
      if (name === "@/lib/http/json-body") return jsonBody;
      if (name === "next/server") return { NextResponse: { json: (body: Record<string, unknown>, options?: { status?: number }) => ({ body, status: options?.status ?? 200 }) } };
      if (name === "@/lib/env") return { env: { mercadoPagoWebhookSecret: "" } };
      if (name === "@/lib/prisma") return { prisma: { agencyInvoice: { findUnique: async ({ where }: { where: { id: string } }) => where.id === invoice.id ? { ...invoice } : null } } };
      if (name === "@/lib/rls") return { withArenaTransaction: async (arenaId: string, action: (tx: unknown) => Promise<unknown>) => {
        writes.arenaIds.push(arenaId);
        return action({
          agencyInvoice: {
            findUnique: async () => ({ ...invoice }),
            updateMany: async ({ where, data }: { where: { id: string; status: string; providerPaymentId?: string; paymentReviewStatus?: { not: string } }; data: { status?: string; paymentReviewStatus?: string; paymentReviewAt?: Date } }) => {
              if (where.id !== invoice.id || where.status !== invoice.status) return { count: 0 };
              if (where.providerPaymentId && where.providerPaymentId !== invoice.providerPaymentId) return { count: 0 };
              if (where.paymentReviewStatus && where.paymentReviewStatus.not === invoice.paymentReviewStatus) return { count: 0 };
              if (data.status) invoice.status = data.status;
              if (data.paymentReviewStatus) invoice.paymentReviewStatus = data.paymentReviewStatus;
              if (data.paymentReviewAt) invoice.paymentReviewAt = data.paymentReviewAt;
              return { count: 1 };
            },
            update: async ({ data }: { data: { status: string; providerPaymentId: string } }) => { invoice.status = data.status; invoice.providerPaymentId = data.providerPaymentId; writes.invoices++; },
          },
          arenaNotification: {
            createMany: async ({ data }: { data: { id: string; arenaId: string; type: string; title: string; message: string; href: string }[] }) => {
              for (const item of data) if (!notifications.some((existing) => existing.id === item.id)) notifications.push(item);
            },
          },
          financialSettlement: { create: async ({ data }: { data: { arenaId: string; financialEntryId: string; amountCents: number } }) => {
            assert.equal(data.arenaId, invoice.arenaId);
            assert.equal(data.financialEntryId, invoice.financialEntryId);
            assert.equal(data.amountCents, invoice.amountCents);
            writes.settlements++;
          } },
          financialEntry: { update: async ({ where }: { where: { id: string } }) => { assert.equal(where.id, invoice.financialEntryId); writes.entries++; } },
        });
      } };
      if (name === "@/lib/payments/agency-mercado-pago-token") return { getAgencyMercadoPagoToken: async () => "synthetic-token" };
      if (name === "@/lib/payments/mercado-pago-webhook-signature") return { verifyMercadoPagoWebhookSignature: () => true };
      return {};
    },
    fetch: async (_url: string, options: { headers: { Authorization: string } }) => {
      assert.equal(options.headers.Authorization, "Bearer synthetic-token");
      return { ok: true, json: async () => payment };
    },
  });
  const request = () => new Request("https://arena.example.test/api/payments/mercado-pago/agency/webhook", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: { id: payment.id } }),
  });
  return { post: () => exports.POST(request()), invoice, writes };
}

test("webhook da agência baixa fatura e lançamento uma vez no escopo da arena", async () => {
  const webhook = webhookFor({ id: "payment-a", status: "approved", external_reference: "invoice-a", transaction_amount: 50, currency_id: "BRL" });
  const simultaneous = await Promise.all([webhook.post(), webhook.post()]);
  assert.ok(simultaneous.every((response) => response.status === 200));
  assert.equal((await webhook.post()).status, 200);
  assert.equal(webhook.invoice.status, "PAID");
  assert.deepEqual({ settlements: webhook.writes.settlements, entries: webhook.writes.entries, invoices: webhook.writes.invoices }, { settlements: 1, entries: 1, invoices: 1 });
  assert.deepEqual(webhook.writes.arenaIds, ["arena-a", "arena-a", "arena-a"]);
});

test("webhook da agência não baixa pagamento com referência, valor ou moeda divergentes", async () => {
  for (const payment of [
    { id: "payment-b", status: "approved", external_reference: "invoice-b", transaction_amount: 50, currency_id: "BRL" },
    { id: "payment-c", status: "approved", external_reference: "invoice-a", transaction_amount: 10, currency_id: "BRL" },
    { id: "payment-d", status: "approved", external_reference: "invoice-a", transaction_amount: 50, currency_id: "USD" },
  ]) {
    const webhook = webhookFor(payment);
    const response = await webhook.post();
    assert.equal(response.status, payment.external_reference === "invoice-b" ? 200 : 409);
    assert.equal(webhook.writes.settlements, 0);
    assert.equal(webhook.invoice.status, "PENDING");
  }
});

test("estorno de fatura paga alerta para conciliação sem desfazer a baixa nem duplicar avisos", async () => {
  const payment = { id: "payment-a", status: "approved", external_reference: "invoice-a", transaction_amount: 50, currency_id: "BRL" };
  const webhook = webhookFor(payment);
  assert.equal((await webhook.post()).status, 200);
  payment.status = "refunded";
  assert.equal((await webhook.post()).status, 200);
  assert.equal((await webhook.post()).status, 200);
  assert.equal(webhook.invoice.status, "PAID");
  assert.equal(webhook.writes.settlements, 1);
  assert.equal(webhook.writes.entries, 1);
  assert.equal(webhook.writes.notifications.length, 1);
  assert.equal(webhook.invoice.paymentReviewStatus, "refunded");
  assert.ok(webhook.invoice.paymentReviewAt instanceof Date);
  assert.equal(webhook.writes.notifications[0].arenaId, "arena-a");
  assert.equal(webhook.writes.notifications[0].type, "AGENCY_PAYMENT_REVIEW");
  assert.equal(webhook.writes.notifications[0].href, "/financeiro/contas-a-pagar");
});

test("estorno de outro pagamento não altera a fatura quitada", async () => {
  const payment = { id: "payment-a", status: "approved", external_reference: "invoice-a", transaction_amount: 50, currency_id: "BRL" };
  const webhook = webhookFor(payment);
  await webhook.post();
  payment.id = "payment-b";
  payment.status = "charged_back";
  assert.equal((await webhook.post()).status, 200);
  assert.equal(webhook.writes.notifications.length, 0);
  assert.equal(webhook.invoice.status, "PAID");
  assert.equal(webhook.invoice.paymentReviewStatus, "");
});

test("reembolso parcial informado após a baixa exige conciliação sem segunda baixa", async () => {
  const payment = { id: "payment-a", status: "approved", status_detail: "accredited", external_reference: "invoice-a", transaction_amount: 50, currency_id: "BRL" };
  const webhook = webhookFor(payment);
  await webhook.post();
  payment.status_detail = "partially_refunded";
  assert.equal((await webhook.post()).status, 200);
  assert.equal(webhook.invoice.paymentReviewStatus, "partially_refunded");
  assert.equal(webhook.writes.settlements, 1);
  assert.equal(webhook.writes.notifications.length, 1);
});

test("contestação da fatura paga permanece em revisão sem bloquear nem rebaixar duas vezes", async () => {
  const payment = { id: "payment-a", status: "approved", external_reference: "invoice-a", transaction_amount: 50, currency_id: "BRL" };
  const webhook = webhookFor(payment);
  await webhook.post();
  payment.status = "charged_back";
  await webhook.post();
  await webhook.post();
  assert.equal(webhook.invoice.status, "PAID");
  assert.equal(webhook.invoice.paymentReviewStatus, "charged_back");
  assert.equal(webhook.writes.settlements, 1);
  assert.equal(webhook.writes.notifications.length, 1);
});
