import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { boletoCancellationDisposition } from "../src/lib/payments/boleto-cancellation";

test("boletos pendentes podem ser cancelados, pagos e vencidos são preservados", () => {
  assert.equal(boletoCancellationDisposition("pending"), "cancel");
  assert.equal(boletoCancellationDisposition("in_process"), "cancel");
  assert.equal(boletoCancellationDisposition("authorized"), "cancel");
  assert.equal(boletoCancellationDisposition("approved"), "preserve");
  assert.equal(boletoCancellationDisposition("expired"), "closed");
  assert.equal(boletoCancellationDisposition("cancelled"), "closed");
  assert.equal(boletoCancellationDisposition("mystery"), "unsupported");
});

test("cancelamento consulta boletos futuros dentro do escopo da arena antes de chamar o provedor", () => {
  const action = readFileSync(new URL("../src/lib/actions/academy.ts", import.meta.url), "utf8");
  const removePlan = action.slice(action.indexOf("export async function removeTeacherPlanStudentAction"), action.indexOf("export async function createLessonAction"));
  assert.match(removePlan, /const entries = await withArenaTransaction\(auth\.arenaId, \(tx\) => tx\.financialEntry\.findMany/);
  assert.match(removePlan, /await cancelMercadoPagoPayment\(auth\.arenaId, payment\.id\)/);
  assert.match(removePlan, /if \(entries\.some\(\(entry\) => entry\.onlinePaymentId && !handledPaymentIds\.has/);
});
