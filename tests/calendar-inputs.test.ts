import assert from "node:assert/strict";
import test from "node:test";

import {
  moneyToCents,
  parseBookingParticipants,
  parseCourtIds,
  parseScheduledAt,
  timeToMinutes
} from "../src/lib/calendar/inputs";

test("calendar input helpers preserve valid booking values", () => {
  assert.equal(timeToMinutes("07:30"), 450);
  assert.equal(moneyToCents("R$ 1.234,56"), 123456);
  assert.deepEqual(parseCourtIds('["court-b", "court-a"]', "court-a"), ["court-a", "court-b"]);
  assert.deepEqual(
    parseBookingParticipants('[{"playerId":"player-1","amountCents":9000,"paymentMethod":"PIX"}]'),
    [{ playerId: "player-1", amountCents: 9000, paymentMethod: "PIX" }]
  );
  assert.equal(parseScheduledAt("2026-08-19T10:00:00.000Z").toISOString(), "2026-08-19T10:00:00.000Z");
});

test("calendar input helpers reject invalid values with the existing errors", () => {
  assert.throws(() => moneyToCents("-10"), /Informe um valor válido/);
  assert.throws(() => parseCourtIds("invalid", "court-a"), /Quadras inválidas/);
  assert.throws(
    () => parseBookingParticipants('[{"playerId":"player-1","amountCents":0},{"playerId":"player-1","amountCents":0}]'),
    /Cada atleta só pode participar uma vez/
  );
  assert.throws(() => parseScheduledAt("invalid"), /Data e hora invalidas/);
});
