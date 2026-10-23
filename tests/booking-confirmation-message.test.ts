import assert from "node:assert/strict";
import test from "node:test";
import { bookingConfirmationMessage } from "../src/lib/calendar/booking-confirmation-message";
import { playerReturnPath } from "../src/lib/auth/player-return-path";

test("confirmação aplica todas as variáveis da mensagem configurada", () => {
  assert.equal(bookingConfirmationMessage({ template: "{cliente}: {quadra}, {data} às {horario} · {arena}. {cliente}", clientName: "Ana", courtName: "Quadra 2", arenaName: "Clube", startsAt: new Date(2026, 9, 23, 19, 30) }), "Ana: Quadra 2, 23/10/2026 às 19:30 · Clube. Ana");
});
test("mensagem vazia usa confirmação padrão", () => {
  assert.match(bookingConfirmationMessage({ template: " ", clientName: "Ana", courtName: "Quadra 2", arenaName: "Clube", startsAt: new Date(2026, 9, 23, 19, 30) }), /Ana.*Clube.*19:30/);
});
test("login retorna somente ao agendamento canônico da mesma arena", () => {
  assert.equal(playerReturnPath("clube", "/clube/portaldoatleta/agendamento?data=2026-10-24"), "/clube/portaldoatleta/agendamento?data=2026-10-24");
  assert.equal(playerReturnPath("clube", "/outra/portaldoatleta/agendamento"), "/reservar/clube");
});
