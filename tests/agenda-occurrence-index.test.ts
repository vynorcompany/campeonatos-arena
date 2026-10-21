import assert from "node:assert/strict";
import test from "node:test";
import { buildAgendaOccurrenceIndex } from "../src/lib/calendar/agenda-occurrence-index";

const at = (hour: number, minute = 0) => new Date(2026, 9, 21, hour, minute);

test("agenda indexes an occurrence for each court without hiding its starting cell", () => {
  const occurrence = {
    id: "booking-a",
    startsAt: at(7),
    endsAt: at(8),
    occurrenceCourts: [{ courtId: "court-a" }, { courtId: "court-b" }],
  };
  const index = buildAgendaOccurrenceIndex([occurrence], [420, 450, 480]);

  for (const courtId of ["court-a", "court-b"]) {
    assert.equal(index.byCourtAndSlot.get(`${courtId}:420`), occurrence);
    assert.equal(index.occupiedCourtSlots.has(`${courtId}:420`), false);
    assert.equal(index.occupiedCourtSlots.has(`${courtId}:450`), true);
    assert.equal(index.occupiedCourtSlots.has(`${courtId}:480`), false);
  }
  assert.equal(index.occupiedCourtSlots.has("court-c:450"), false);
});

test("agenda keeps the first booking at a shared start and the existing occupied-cell precedence", () => {
  const first = { id: "first", startsAt: at(7), endsAt: at(8), occurrenceCourts: [{ courtId: "court-a" }] };
  const second = { id: "second", startsAt: at(7, 30), endsAt: at(8, 30), occurrenceCourts: [{ courtId: "court-a" }] };
  const duplicate = { id: "duplicate", startsAt: at(7), endsAt: at(8), occurrenceCourts: [{ courtId: "court-a" }] };
  const index = buildAgendaOccurrenceIndex([first, second, duplicate], [420, 450, 480]);

  assert.equal(index.byCourtAndSlot.get("court-a:420"), first);
  assert.equal(index.byCourtAndSlot.get("court-a:450"), second);
  assert.equal(index.occupiedCourtSlots.has("court-a:450"), true);
  assert.equal(index.occupiedCourtSlots.has("court-a:480"), true);
});
