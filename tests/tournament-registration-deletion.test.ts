import assert from "node:assert/strict";
import test from "node:test";
import { canDeleteTournamentRegistration, canEditManualTournamentRegistration } from "../src/lib/tournaments/registration-deletion";

const manualPending = {
  status: "PENDING_PAYMENT",
  paymentStatus: "PENDING",
  paymentProvider: "MANUAL",
  paymentReference: "",
  mercadoPagoPaymentId: "",
  paymentCheckoutUrl: "",
};

test("somente inscrição manual pendente sem cobrança pode ser excluída", () => {
  assert.equal(canDeleteTournamentRegistration(manualPending), true);
  assert.equal(canDeleteTournamentRegistration({ ...manualPending, paymentStatus: "PAID", status: "CONFIRMED" }), false);
  assert.equal(canDeleteTournamentRegistration({ ...manualPending, paymentProvider: "" }), false);
  assert.equal(canDeleteTournamentRegistration({ ...manualPending, paymentProvider: "MERCADO_PAGO" }), false);
  assert.equal(canDeleteTournamentRegistration({ ...manualPending, paymentReference: "pref-123" }), false);
  assert.equal(canDeleteTournamentRegistration({ ...manualPending, mercadoPagoPaymentId: "123" }), false);
  assert.equal(canDeleteTournamentRegistration({ ...manualPending, paymentCheckoutUrl: "https://checkout.example.test" }), false);
  assert.equal(canDeleteTournamentRegistration({ ...manualPending, paymentStatus: "REVIEW" }), false);
  assert.equal(canDeleteTournamentRegistration({ ...manualPending, paymentStatus: "REFUNDED", status: "CANCELED" }), false);
});

test("edição manual não confirma uma cobrança iniciada no portal", () => {
  assert.equal(canEditManualTournamentRegistration(manualPending), true);
  assert.equal(canEditManualTournamentRegistration({ ...manualPending, paymentStatus: "PAID", status: "CONFIRMED" }), false);
  assert.equal(canEditManualTournamentRegistration({ ...manualPending, paymentProvider: "" }), false);
  assert.equal(canEditManualTournamentRegistration({ ...manualPending, paymentProvider: "PIX", mercadoPagoPaymentId: "123" }), false);
  assert.equal(canEditManualTournamentRegistration({ ...manualPending, paymentReference: "pref-123" }), false);
  assert.equal(canEditManualTournamentRegistration({ ...manualPending, paymentCheckoutUrl: "https://checkout.example.test" }), false);
});
