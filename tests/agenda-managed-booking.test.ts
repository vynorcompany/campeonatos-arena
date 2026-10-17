import assert from "node:assert/strict";
import test from "node:test";
import { isAgendaManagedBooking } from "../src/lib/calendar/agenda-managed-booking";

test("agenda só gerencia reservas próprias ou online, sem regravar liga e reposições", () => {
  for (const sourceType of ["BOOKING", "COURT_BOOKING", "ONLINE_BOOKING"]) {
    assert.equal(isAgendaManagedBooking(sourceType), true);
  }
  for (const sourceType of ["LEAGUE_CHALLENGE", "LEAGUE_PROPOSAL", "LESSON_MAKEUP", "SUPER12", ""]) {
    assert.equal(isAgendaManagedBooking(sourceType), false);
  }
});
