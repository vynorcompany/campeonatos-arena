import assert from "node:assert/strict";
import test from "node:test";
import { agencyBillingInputSchema, agencyBillingPayload, agencyBillingOutcomeSchema } from "../src/lib/backend/contracts/agency-billing";
test("agency billing inputs accept only operation-specific form fields without caller role, token or price authority", () => {
  const values = { plan: { name: "Plano", monthlyPrice: "150,00" }, assign: { arenaId: "a", planId: "p" }, status: { subscriptionId: "s", status: "PAUSED" }, checkout: { invoiceId: "i" }, grace: { enabled: "on", graceDays: "7" } };
  for (const operation of Object.keys(values) as Array<keyof typeof values>) {
    assert.ok(agencyBillingInputSchema(operation).safeParse(values[operation]).success);
    for (const key of ["userId", "systemRole", "encryptedSecrets", "accessToken", "monthlyPriceCents", "paymentStatus"]) assert.equal(agencyBillingInputSchema(operation).safeParse({ ...values[operation], [key]: "forged" }).success, false);
  }
  assert.equal(agencyBillingOutcomeSchema.safeParse({ error: null, changed: true, connectionSecrets: "private" }).success, false);
});
test("agency billing form projection rejects duplicate scalars and files before transport", () => {
  const form = new FormData(); form.set("arenaId", "a"); form.set("planId", "p"); form.set("systemRole", "SUPER_ADMIN");
  assert.deepEqual(agencyBillingPayload("assign", form), { arenaId: "a", planId: "p" });
  form.append("arenaId", "other"); assert.throws(() => agencyBillingPayload("assign", form));
  form.delete("arenaId"); form.set("arenaId", new File(["not an id"], "id.txt")); assert.throws(() => agencyBillingPayload("assign", form));
});
