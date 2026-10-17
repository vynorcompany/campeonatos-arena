import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { boletoCancellationDisposition, selectFuturePlanBoletos } from "../src/lib/payments/boleto-cancellation";

test("boletos pendentes podem ser cancelados, pagos e vencidos são preservados", () => {
  assert.equal(boletoCancellationDisposition("pending"), "cancel");
  assert.equal(boletoCancellationDisposition("in_process"), "cancel");
  assert.equal(boletoCancellationDisposition("authorized"), "cancel");
  assert.equal(boletoCancellationDisposition("approved"), "preserve");
  assert.equal(boletoCancellationDisposition("expired"), "closed");
  assert.equal(boletoCancellationDisposition("cancelled"), "closed");
  assert.equal(boletoCancellationDisposition("mystery"), "unsupported");
});

test("lançamentos parcialmente pagos ficam fora do cancelamento no Mercado Pago", () => {
  const entries = [
    { id: "parcial", onlinePaymentId: "mp-parcial", settlements: [{ amountCents: 1000 }] },
    { id: "aberto", onlinePaymentId: "mp-aberto", settlements: [] },
    { id: "sem-boleto", onlinePaymentId: "", settlements: [] },
  ];
  const selection = selectFuturePlanBoletos(entries);
  assert.deepEqual([...selection.protectedEntryIds], ["parcial"]);
  assert.deepEqual(selection.issued.map((entry) => entry.id), ["aberto"]);
});

test("cancelamento consulta boletos futuros dentro do escopo da arena antes de chamar o provedor", () => {
  const action = readFileSync(new URL("../src/lib/actions/academy.ts", import.meta.url), "utf8");
  const removePlan = action.slice(action.indexOf("export async function removeTeacherPlanStudentAction"), action.indexOf("export async function createLessonAction"));
  assert.match(removePlan, /const entries = await withArenaTransaction\(auth\.arenaId, \(tx\) => tx\.financialEntry\.findMany/);
  assert.match(removePlan, /await cancelMercadoPagoPayment\(auth\.arenaId, payment\.id\)/);
  assert.match(removePlan, /const selection = selectFuturePlanBoletos\(entries\)/);
  assert.match(removePlan, /const currentSelection = selectFuturePlanBoletos\(entries\)/);
  assert.match(removePlan, /onlinePaymentClaimedAt: \{ not: null \}/);
  assert.match(removePlan, /if \(recurrenceIds\.length\) await assertNoIssuanceInProgress\(tx\)/);
  assert.match(removePlan, /currentSelection\.issued\.some\(\(entry\) => !handledPaymentIds\.has/);
});
