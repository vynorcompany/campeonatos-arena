import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { comandaDebtOwnerId, selectedComandaDebtWhere } from "../src/lib/finance/comanda-debts";

test("comanda só atribui débito ao cliente vinculado, sem inferir pelo nome", () => {
  assert.equal(comandaDebtOwnerId({ playerId: "cliente-a", scheduleParticipant: null, sale: null }), "cliente-a");
  assert.equal(comandaDebtOwnerId({ playerId: null, scheduleParticipant: { playerId: "cliente-b" }, sale: null }), "cliente-b");
  assert.equal(comandaDebtOwnerId({ playerId: null, scheduleParticipant: null, sale: { comanda: { playerId: "cliente-c" } } }), "cliente-c");
  assert.equal(comandaDebtOwnerId({ playerId: null, scheduleParticipant: null, sale: null }), null);
});

test("baixa conjunta aceita vencidos mas restringe arena e receita antes de conferir o cliente", () => {
  assert.deepEqual(selectedComandaDebtWhere("arena-a", ["debito-a"]), {
    id: { in: ["debito-a"] },
    arenaId: "arena-a",
    type: { in: ["REVENUE", "INCOME"] },
    status: { in: ["PENDING", "OVERDUE"] },
  });
  const actions = readFileSync(new URL("../src/lib/actions/comanda.ts", import.meta.url), "utf8");
  assert.match(actions, /selectedDebts\.some\(\(debt\) => comandaDebtOwnerId\(debt\) !== comanda\.playerId\)/);
});
