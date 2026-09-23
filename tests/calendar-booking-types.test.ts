import assert from "node:assert/strict";
import test from "node:test";
import { isFixedBookingType } from "@/lib/calendar/booking-types";

test("recognizes recurring booking types regardless of whitespace or casing", () => {
  assert.equal(isFixedBookingType(" Aula fixa "), true);
  assert.equal(isFixedBookingType("Reserva avulsa"), false);
});
