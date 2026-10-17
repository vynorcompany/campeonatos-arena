import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/lib/services/agency.ts", import.meta.url), "utf8");

test("financeiro da agência separa faturas em revisão das efetivamente pagas", async () => {
  const exports: Record<string, () => Promise<Record<string, number>>> = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, Date, Intl,
    require: (name: string) => {
      if (name !== "@/lib/prisma") throw new Error(`Unexpected import: ${name}`);
      return { prisma: {
        arena: { findMany: async () => [] },
        user: { count: async () => 0 },
        agencySubscription: { findMany: async () => [] },
        supportTicket: { count: async () => 0 },
        agencyInvoice: { groupBy: async ({ by }: { by: string[] }) => {
          assert.deepEqual(Array.from(by), ["status", "paymentReviewStatus"]);
          return [
            { status: "PAID", paymentReviewStatus: "", _sum: { amountCents: 10000 } },
            { status: "PAID", paymentReviewStatus: "refunded", _sum: { amountCents: 5000 } },
            { status: "PAID", paymentReviewStatus: "charged_back", _sum: { amountCents: 7000 } },
            { status: "PENDING", paymentReviewStatus: "", _sum: { amountCents: 3000 } },
          ];
        } },
      } };
    },
  });
  const metrics = await exports.getAgencyMetrics();
  assert.equal(metrics.paidInvoiceCents, 10000);
  assert.equal(metrics.openInvoiceCents, 3000);
  assert.equal(metrics.reviewInvoiceCents, 12000);
});
