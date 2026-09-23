import assert from "node:assert/strict";
import test from "node:test";
import { getClassGroupName, parseMoneyToCents, parseScheduledAt } from "@/lib/academy/inputs";
import { studentSchema } from "@/lib/academy/action-schemas";

test("class group name uses the first weekday and time without changing the input", () => {
  const schedules = [
    { weekday: 0, startTime: "08:00" },
    { weekday: 1, startTime: "19:00" },
    { weekday: 1, startTime: "07:00" },
  ];
  assert.equal(getClassGroupName(schedules), "Seg 07:00");
  assert.equal(schedules[0].weekday, 0);
  assert.throws(() => getClassGroupName([]), /Informe ao menos um horário/);
});

test("academy money and date inputs retain their validation", () => {
  assert.equal(parseMoneyToCents("1.234,56"), 123456);
  assert.equal(parseMoneyToCents(""), 0);
  assert.throws(() => parseMoneyToCents("-1"), /Valor inválido/);
  assert.equal(parseScheduledAt(""), null);
  assert.equal(parseScheduledAt("invalida"), null);
});

test("student input keeps optional fields and rejects negative credits", () => {
  const valid = studentSchema.parse({ name: "Aluno", playerId: "", phone: "", email: "", remainingClasses: "0", notes: "" });
  assert.equal(valid.remainingClasses, 0);
  assert.equal(studentSchema.safeParse({ ...valid, remainingClasses: -1 }).success, false);
});
