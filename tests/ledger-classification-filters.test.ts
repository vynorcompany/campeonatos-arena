import assert from "node:assert/strict";
import test from "node:test";
import { classificationFilter } from "@/lib/finance/classification-filter";

test("classificação de planos inclui categorias históricas e lançamentos vinculados", () => {
  assert.deepEqual(classificationFilter("Plano de Aulas"), {
    OR: [
      { category: { in: ["Plano de Aulas", "Planos de aulas"], mode: "insensitive" } },
      { planId: { not: null } },
    ],
  });
});

test("classificação de vendas inclui comandas e vendas vinculadas", () => {
  assert.deepEqual(classificationFilter("Vendas"), {
    OR: [
      { category: { in: ["Venda", "Vendas", "COMANDAS"], mode: "insensitive" } },
      { saleId: { not: null } },
    ],
  });
});

test("outras classificações ignoram diferenças de maiúsculas", () => {
  assert.deepEqual(classificationFilter("Patrocínios"), { category: { equals: "Patrocínios", mode: "insensitive" } });
});
