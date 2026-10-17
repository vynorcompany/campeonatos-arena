import assert from "node:assert/strict";
import test from "node:test";
import { mobileFinanceAttention } from "../src/lib/finance/mobile-finance-attention";

test("resumo financeiro mobile não chama comanda aberta de pagamentos em dia", () => {
  assert.deepEqual(mobileFinanceAttention({ overdueCount: 0, hasSoonPayment: false, openComandaCount: 1 }), {
    kind: "comanda", message: "Você tem uma comanda aberta para acompanhar",
  });
  assert.deepEqual(mobileFinanceAttention({ overdueCount: 0, hasSoonPayment: false, openComandaCount: 2 }), {
    kind: "comanda", message: "Você tem 2 comandas abertas para acompanhar",
  });
});

test("atraso e vencimento próximo têm prioridade sobre comandas abertas", () => {
  assert.equal(mobileFinanceAttention({ overdueCount: 1, hasSoonPayment: true, openComandaCount: 1 }).kind, "overdue");
  assert.equal(mobileFinanceAttention({ overdueCount: 0, hasSoonPayment: true, openComandaCount: 1 }).kind, "soon");
  assert.equal(mobileFinanceAttention({ overdueCount: 0, hasSoonPayment: false, openComandaCount: 0 }).kind, "healthy");
});
