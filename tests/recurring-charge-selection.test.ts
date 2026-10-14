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
