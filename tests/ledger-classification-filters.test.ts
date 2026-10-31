import assert from "node:assert/strict";
import test from "node:test";
import { classificationFilter, classificationFilterOptions } from "@/lib/finance/classification-filter";

test("classificações de planos e vendas aparecem mesmo sem categorias cadastradas", () => {
  assert.deepEqual(classificationFilterOptions([], "REVENUE"), ["Plano de Aulas", "Vendas", "Reservas", "Comandas"]);
  assert.deepEqual(classificationFilterOptions(["Patrocínios", "VENDAS"], "REVENUE"), ["Plano de Aulas", "Vendas", "Reservas", "Comandas", "Patrocínios"]);
  assert.deepEqual(classificationFilterOptions([], "EXPENSE"), []);
});

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


test("reservation and comanda filters include singular historical categories", () => {
 assert.deepEqual(classificationFilter("Reservas"), {category:{in:["Reserva","Reservas"],mode:"insensitive"}});
 assert.deepEqual(classificationFilter("Comandas"), {category:{in:["Comanda","Comandas"],mode:"insensitive"}});
 assert.deepEqual(classificationFilterOptions(["Reserva","COMANDAS","Evento"],"REVENUE"),["Plano de Aulas","Vendas","Reservas","Comandas","Evento"]);
});
