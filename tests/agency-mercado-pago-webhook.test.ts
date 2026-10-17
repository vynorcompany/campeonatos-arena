import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/app/api/payments/mercado-pago/agency/webhook/route.ts", import.meta.url), "utf8");

function webhookFor(payment: { id: string; status: string; external_reference: string; transaction_amount: number; currency_id: string }) {
  const invoice = { id: "invoice-a", arenaId: "arena-a", amountCents: 5000, status: "PENDING", financialEntryId: "entry-a", period: "2026-10" };
  const writes = { settlements: 0, entries: 0, invoices: 0, arenaIds: [] as string[] };
  const exports: Record<string, (request: Request) => Promise<{ status: number; body: Record<string, unknown> }>> = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, URL, Date, Math, Number, String, console,
    require: (name: string) => {
      if (name === "next/server") return { NextResponse: { json: (body: Record<string, unknown>, options?: { status?: number }) => ({ body, status: options?.status ?? 200 }) } };
      if (name === "@/lib/env") return { env: { mercadoPagoWebhookSecret: "" } };
      if (name === "@/lib/prisma") return { prisma: { agencyInvoice: { findUnique: async ({ where }: { where: { id: string } }) => where.id === invoice.id ? { ...invoice } : null } } };
      if (name === "@/lib/rls") return { withArenaTransaction: async (arenaId: string, action: (tx: unknown) => Promise<unknown>) => {
        writes.arenaIds.push(arenaId);
        return action({
          agencyInvoice: {
            findUnique: async () => ({ ...invoice }),
            updateMany: async ({ where, data }: { where: { id: string; status: string }; data: { status: string } }) => {
              if (where.id !== invoice.id || where.status !== invoice.status) return { count: 0 };
              invoice.status = data.status;
              return { count: 1 };
            },
            update: async ({ data }: { data: { status: string } }) => { invoice.status = data.status; writes.invoices++; },
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
