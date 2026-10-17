import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/lib/services/agency-billing.ts", import.meta.url), "utf8");

test("one failed agency invoice or checkout does not stop the remaining work", async () => {
  const attempted: string[] = [];
  const errors: unknown[][] = [];
  const subscription = {
    id: "subscription-good", arenaId: "arena-a", status: "ACTIVE",
    nextDueAt: new Date("2035-01-01T00:00:00.000Z"), billingDay: 1,
    plan: { isTrial: false, monthlyPriceCents: 5000, name: "Test plan" },
  };
  const prisma = {
    agencySubscription: {
      updateMany: async () => ({ count: 0 }),
      findMany: async () => [{ id: "subscription-bad" }, { id: "subscription-good" }],
      findUnique: async ({ where }: { where: { id: string } }) => {
        attempted.push(where.id);
        if (where.id === "subscription-bad") throw new Error("synthetic invoice error");
        return subscription;
      },
    },
    agencyInvoice: {
      findMany: async () => [{ id: "checkout-bad" }, { id: "checkout-good" }],
      findUnique: async ({ where }: { where: { id: string } }) => {
        attempted.push(where.id);
        if (where.id === "checkout-bad") throw new Error("synthetic checkout error");
        return null;
      },
    },
    agencyPaymentConnection: { findUnique: async () => null },
    $transaction: async (action: (tx: unknown) => Promise<unknown>) => action({
      agencySubscription: {
        findUnique: async () => subscription,
        update: async () => ({}),
      },
      agencyInvoice: {
        findUnique: async () => null,
        create: async () => ({ id: "created-invoice" }),
      },
      financialEntry: { create: async () => ({ id: "created-entry" }) },
    }),
  };
  const exports: Record<string, (now: Date) => Promise<Record<string, number>>> = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, Date, URL, console: { error: (...args: unknown[]) => errors.push(args) },
    require: (name: string) => {
      if (name === "server-only") return {};
      if (name === "@prisma/client") return { Prisma: { PrismaClientKnownRequestError: class extends Error {} } };
      if (name === "@/lib/prisma") return { prisma };
      if (name === "@/lib/rls") return { setArenaRlsContext: async () => undefined, withArenaTransaction: async () => undefined };
      if (name === "@/lib/payments/agency-mercado-pago-token") return { getAgencyMercadoPagoToken: async () => "synthetic-token" };
      if (name === "@/lib/env") return { env: { appUrl: "https://arena.example.test" } };
      if (name === "@/lib/finance/agency-billing-dates") return {
        agencyInvoicePeriod: () => "2035-01",
        nextAgencyDueDate: () => new Date("2035-02-01T00:00:00.000Z"),
      };
      return require(name);
    },
  });
  const result = await exports.issueDueAgencyInvoices(new Date("2035-01-02T00:00:00.000Z"));
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    agencyInvoicesIssued: 1,
    agencyCheckoutRetries: 2,
    agencyInvoiceFailures: 1,
    agencyCheckoutFailures: 1,
  });
  assert.ok(attempted.includes("subscription-good"));
  assert.ok(attempted.includes("checkout-good"));
  assert.equal(errors.length, 2);
});

test("failed records in the first agency batch cannot starve later subscriptions or checkouts", async () => {
  const subscriptionIds = Array.from({ length: 205 }, (_, index) => `subscription-${String(index + 1).padStart(3, "0")}`);
  const invoiceIds = Array.from({ length: 205 }, (_, index) => `invoice-${String(index + 1).padStart(3, "0")}`);
  const attemptedSubscriptions: string[] = [];
  const attemptedInvoices: string[] = [];
  const subscriptionPages: string[][] = [];
  const invoicePages: string[][] = [];
  const page = (ids: string[], cursor: string) => ids.filter((id) => id > cursor).slice(0, 200).map((id) => ({ id }));
  const prisma = {
    agencySubscription: {
      updateMany: async () => ({ count: 0 }),
      findMany: async ({ where, orderBy, take }: { where: { id?: { gt: string } }; orderBy: { id: string }; take: number }) => {
        assert.equal(orderBy.id, "asc"); assert.equal(take, 200);
        const result = page(subscriptionIds, where.id?.gt ?? "");
        subscriptionPages.push(result.map((item) => item.id));
        return result;
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        attemptedSubscriptions.push(where.id);
        throw new Error("synthetic invoice error");
      },
    },
    agencyInvoice: {
      findMany: async ({ where, orderBy, take }: { where: { id?: { gt: string } }; orderBy: { id: string }; take: number }) => {
        assert.equal(orderBy.id, "asc"); assert.equal(take, 200);
        const result = page(invoiceIds, where.id?.gt ?? "");
        invoicePages.push(result.map((item) => item.id));
        return result;
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        attemptedInvoices.push(where.id);
        throw new Error("synthetic checkout error");
      },
    },
    agencyPaymentConnection: { findUnique: async () => null },
  };
  const exports: Record<string, (now: Date) => Promise<Record<string, number>>> = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, Date, URL, console: { error: () => undefined },
    require: (name: string) => {
      if (name === "server-only") return {};
      if (name === "@prisma/client") return { Prisma: { PrismaClientKnownRequestError: class extends Error {} } };
      if (name === "@/lib/prisma") return { prisma };
      if (name === "@/lib/rls") return { setArenaRlsContext: async () => undefined, withArenaTransaction: async () => undefined };
      if (name === "@/lib/payments/agency-mercado-pago-token") return { getAgencyMercadoPagoToken: async () => "synthetic-token" };
      if (name === "@/lib/env") return { env: { appUrl: "https://arena.example.test" } };
      if (name === "@/lib/finance/agency-billing-dates") return { agencyInvoicePeriod: () => "2035-01", nextAgencyDueDate: () => new Date("2035-02-01T00:00:00.000Z") };
      return require(name);
    },
  });
  const result = await exports.issueDueAgencyInvoices(new Date("2035-01-02T00:00:00.000Z"));
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    agencyInvoicesIssued: 0, agencyCheckoutRetries: 205, agencyInvoiceFailures: 205, agencyCheckoutFailures: 205,
  });
  assert.deepEqual(subscriptionPages.map((items) => items.length), [200, 5]);
  assert.deepEqual(invoicePages.map((items) => items.length), [200, 5]);
  assert.deepEqual(attemptedSubscriptions, subscriptionIds);
  assert.deepEqual(attemptedInvoices, invoiceIds);
});
