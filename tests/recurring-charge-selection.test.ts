import assert from "node:assert/strict";
import test from "node:test";
import { collectRecurringChargeCandidates } from "../src/lib/payments/recurring-charge-selection";

test("cobranças recorrentes são buscadas em todas as arenas sem exceder oito consultas simultâneas", async () => {
  const arenaIds = Array.from({ length: 19 }, (_, index) => `arena-${index}`);
  const scanned: string[] = [];
  let active = 0;
  let peak = 0;
  const result = await collectRecurringChargeCandidates(arenaIds, async (arenaId) => {
    active += 1;
    peak = Math.max(peak, active);
    scanned.push(arenaId);
    await Promise.resolve();
    active -= 1;
    return [{ id: `entry-${arenaId}`, arenaId, dueDate: new Date(`2026-10-${String(31 - Number(arenaId.split("-")[1])).padStart(2, "0")}T00:00:00.000Z`) }];
  }, 3);

  assert.deepEqual(scanned, arenaIds);
  assert.equal(peak, 8);
  assert.deepEqual(result.candidates.map((entry) => entry.arenaId), ["arena-18", "arena-17", "arena-16"]);
  assert.deepEqual(result.failures, []);
});

test("falha na consulta de uma arena não impede selecionar cobranças das demais", async () => {
  const result = await collectRecurringChargeCandidates(["arena-a", "arena-b", "arena-c"], async (arenaId) => {
    if (arenaId === "arena-b") throw new Error("Falha simulada na consulta");
    return [{ id: `entry-${arenaId}`, arenaId, dueDate: new Date("2026-10-15T00:00:00.000Z") }];
  });

  assert.deepEqual(result.candidates.map((entry) => entry.arenaId), ["arena-a", "arena-c"]);
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].arenaId, "arena-b");
  assert.match(String(result.failures[0].reason), /Falha simulada/);
});

test("o limite diário distribui tentativas entre arenas mesmo com vencimentos mais antigos em uma delas", async () => {
  const result = await collectRecurringChargeCandidates(["arena-a", "arena-b"], async (arenaId) =>
    arenaId === "arena-a"
      ? [1, 2, 3].map((day) => ({ id: `a-${day}`, arenaId, dueDate: new Date(`2026-10-0${day}T00:00:00.000Z`) }))
      : [{ id: "b-1", arenaId, dueDate: new Date("2026-10-10T00:00:00.000Z") }],
  3);

  assert.deepEqual(result.candidates.map((entry) => entry.id), ["a-1", "b-1", "a-2"]);
  assert.deepEqual(result.failures, []);
});

test("arena sem boletos elegíveis não é contada como falha", async () => {
  const result = await collectRecurringChargeCandidates(["arena-vazia"], async () => []);
  assert.deepEqual(result.candidates, []);
  assert.deepEqual(result.failures, []);
});

test("cem arenas recebem ao menos uma tentativa antes da segunda rodada", async () => {
  const ids = Array.from({ length: 100 }, (_, index) => `arena-${index}`);
  let active = 0;
  let peak = 0;
  const result = await collectRecurringChargeCandidates(ids, async (arenaId) => {
    active += 1;
    peak = Math.max(peak, active);
    await Promise.resolve();
    active -= 1;
    return [1, 2, 3].map((day) => ({ id: `${arenaId}-${day}`, arenaId, dueDate: new Date(`2026-10-0${day}T00:00:00.000Z`) }));
  });

  assert.equal(result.candidates.length, 250);
  assert.equal(new Set(result.candidates.slice(0, 100).map((entry) => entry.arenaId)).size, 100);
  assert.equal(peak, 8);
  assert.deepEqual(result.failures, []);
});
