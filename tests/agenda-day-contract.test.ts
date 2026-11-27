import assert from "node:assert/strict";
import test from "node:test";
import { agendaDayInputSchema, agendaDaySchema, parseAgendaDay } from "../src/lib/backend/contracts/agenda-day";

test("agenda accepts real calendar dates and rejects normalization and scope injection", () => {
  for (const date of ["2026-11-27", "2028-02-29"]) {
    assert.ok(parseAgendaDay(date));
    assert.equal(agendaDayInputSchema.safeParse({ date }).success, true);
  }
  for (const date of ["2026-02-29", "2026-04-31", "2026-13-01", "2026-00-01", "2026-11-00", "27/11/2026", "2026-1-01", "2026-11-27T00:00:00Z"]) {
    assert.equal(parseAgendaDay(date), null, date);
    assert.equal(agendaDayInputSchema.safeParse({ date }).success, false, date);
  }
  assert.equal(agendaDayInputSchema.safeParse({ date: "2026-11-27", arenaId: "other-arena" }).success, false);
});

test("agenda response rejects accidental private fields at both root and player boundary", () => {
  const payload = {
    date: "2026-11-27", version: "a".repeat(64),
    arena: { slug: "fixture", scheduleStartMinute: 420, scheduleEndMinute: 1380, scheduleSlotMinutes: 30 },
    courts: [], scheduleOccurrences: [], players: [{ id: "p", name: "Atleta", photoUrl: "", reservationCredits: 0 }],
    teachers: [], bookingTypes: [], servicePriceValues: {}, bankAccounts: [], availableServices: [], onlineSettings: null,
  };
  assert.equal(agendaDaySchema.safeParse(payload).success, true);
  assert.equal(agendaDaySchema.safeParse({ ...payload, accessToken: "private" }).success, false);
  assert.equal(agendaDaySchema.safeParse({ ...payload, players: [{ ...payload.players[0], passwordHash: "private" }] }).success, false);
  assert.equal(agendaDaySchema.safeParse({ ...payload, players: [{ ...payload.players[0], reservationCredits: -1 }] }).success, false);
});
