import assert from "node:assert/strict";
import test from "node:test";
import { agencyPlansPageSchema, agencyConnectionsPageSchema, agencyTicketHistorySchema, agencyMetricsSchema } from "../src/lib/backend/contracts/agency-pages";
const connection = { status: "CONNECTED", displayName: "Agency", accountReference: "reference", graceDays: 7 };
const plans = { plans: [], arenas: [], subscriptions: [], invoices: [], connection };
test("agency page DTOs reject credentials and private account fields", () => {
  assert.ok(agencyPlansPageSchema.safeParse(plans).success);
  for (const key of ["encryptedAccessToken", "encryptedRefreshToken", "webhookSecret", "apiKey"]) assert.equal(agencyPlansPageSchema.safeParse({ ...plans, connection: { ...connection, [key]: "private" } }).success, false);
  const row = { id: "arena", name: "Arena", whatsappConnection: { status: "CONNECTED", instanceName: "instance", connectedPhone: "5541999990000", lastConnectedAt: null, lastError: "" } };
  assert.ok(agencyConnectionsPageSchema.safeParse({ arenas: [row] }).success);
  for (const key of ["encryptedToken", "webhookSecretHash", "qrCodeDataUrl"]) assert.equal(agencyConnectionsPageSchema.safeParse({ arenas: [{ ...row, whatsappConnection: { ...row.whatsappConnection, [key]: "private" } }] }).success, false);
  const ticket = { id: "ticket", code: "A001", title: "Title", status: "CLOSED", arena: { name: "Arena" }, updatedAt: "2035-01-10T10:00:00.000Z", assignee: { name: "Agent" } };
  assert.ok(agencyTicketHistorySchema.safeParse({ tickets: [ticket] }).success);
  assert.equal(agencyTicketHistorySchema.safeParse({ tickets: [{ ...ticket, requester: { passwordHash: "private" } }] }).success, false);
});
test("agency invoice links are HTTP-only and aggregate metrics admit no unprojected records", () => {
  const invoice = { id: "invoice", period: "2035-01", amountCents: 15000, dueAt: "2035-01-10T10:00:00.000Z", status: "PENDING", paymentReviewStatus: "", providerPaymentId: "", checkoutUrl: "https://checkout.example.test/invoice", arena: { name: "Arena" } };
  assert.ok(agencyPlansPageSchema.safeParse({ ...plans, invoices: [invoice] }).success);
  assert.equal(agencyPlansPageSchema.safeParse({ ...plans, invoices: [{ ...invoice, checkoutUrl: "javascript:alert(1)" }] }).success, false);
  const metrics = { arenas: [], usersCount: 0, activeSubscriptions: [], openTickets: 0, paidInvoiceCents: 0, openInvoiceCents: 0, reviewInvoiceCents: 0, mrrCents: 0 };
  assert.ok(agencyMetricsSchema.safeParse(metrics).success);
  assert.equal(agencyMetricsSchema.safeParse({ ...metrics, encryptedSecrets: "private" }).success, false);
});
