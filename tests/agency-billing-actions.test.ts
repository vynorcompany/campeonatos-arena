import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as zod from "zod";
import { readFileSync } from "node:fs";
import { agencyBillingDay } from "../src/lib/finance/agency-billing-dates";
function fixture(role = "ADMIN", existing: unknown = null, isTrial = false, checkout = false) {
  const exports: Record<string, Function> = {}, writes: unknown[] = [], invoices: string[] = [], changes: string[] = [];
  const plan = { id: "p", name: "Plano", isTrial, isActive: true, monthlyPriceCents: isTrial ? 0 : 15000 };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/backend/services/agency-billing-actions.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, Date, Error,
    require(name: string) {
      if (name === "server-only") return {};
      if (name === "zod") return zod;
      if (name.endsWith("auth/guards")) return { requireAgencyAccess: async () => ({ systemRole: role }) };
      if (name.endsWith("agency-billing-dates")) return { agencyBillingDay };
      if (name.endsWith("services/agency-billing")) return { issueAgencyInvoice: async (id: string) => invoices.push(id), ensureAgencyCheckout: async () => checkout ? "https://checkout.example.test/agency" : null };
      if (name.endsWith("auth/database")) return { agencyDatabase: { arena: { findUnique: async () => ({ id: "a" }) }, agencyPlan: { findUnique: async () => plan }, agencySubscription: { findUnique: async () => existing, upsert: async (data: unknown) => { writes.push(data); return { id: "s" }; } } } };
      throw Error("Unexpected " + name);
    },
  });
  return { exports, writes, invoices, refresh: () => changes.push("refresh"), changes, plan };
}
const form = () => { const f = new FormData(); f.set("arenaId", "a"); f.set("planId", "p"); return f; };
test("agency assignment preserves active no-op and trial reuse rejection without billing or cache invalidation", async () => {
  const current = fixture("ADMIN", { planId: "p", status: "ACTIVE" }); await current.exports.assignAgencyPlanAction(form(), current.refresh); assert.equal(current.writes.length, 0); assert.equal(current.invoices.length, 0); assert.equal(current.changes.length, 0);
  const trial = fixture("ADMIN", { planId: "other", status: "CANCELED" }, true); await assert.rejects(trial.exports.assignAgencyPlanAction(form(), trial.refresh), /só pode ser utilizado uma vez/); assert.equal(trial.writes.length, 0); assert.equal(trial.invoices.length, 0); assert.equal(trial.changes.length, 0);
});
test("only agency administrators assign paid plans and the first invoice follows the committed subscription", async () => {
  const manager = fixture("MANAGER"); await assert.rejects(manager.exports.assignAgencyPlanAction(form(), manager.refresh), /Somente administradores/); assert.equal(manager.writes.length, 0); assert.equal(manager.invoices.length, 0);
  const admin = fixture(); await admin.exports.assignAgencyPlanAction(form(), admin.refresh); assert.equal(admin.writes.length, 1); assert.deepEqual(admin.invoices, ["s"]); assert.deepEqual(admin.changes, ["refresh"]);
  const written = admin.writes[0] as { create: { status: string; planId: string; trialEndsAt: Date | null; nextDueAt: Date } }; assert.equal(written.create.status, "ACTIVE"); assert.equal(written.create.planId, "p"); assert.equal(written.create.trialEndsAt, null); assert.ok(written.create.nextDueAt instanceof Date);
});

test("agency checkout preserves missing-connection feedback and invalidates only after a link is prepared", async () => {
  const form = new FormData(); form.set("invoiceId", "invoice");
  const missing = fixture(); assert.match((await missing.exports.prepareAgencyInvoiceAction(form, missing.refresh)).error, /Conecte o Mercado Pago/); assert.equal(missing.changes.length, 0);
  const ready = fixture("ADMIN", null, false, true); assert.equal(await ready.exports.prepareAgencyInvoiceAction(form, ready.refresh), undefined); assert.deepEqual(ready.changes, ["refresh"]);
});
