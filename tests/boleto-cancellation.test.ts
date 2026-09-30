import assert from "node:assert/strict";
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
