import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { publicBookingViewInputSchema, publicBookingViewSchema } from "../src/lib/backend/contracts/public-booking-view";
test("public availability accepts only an arena slug, valid day and optional match", () => {
  assert.equal(publicBookingViewInputSchema.safeParse({ arenaSlug: "own", date: "2026-12-07" }).success, true);
  for (const input of [{ arenaSlug: "own", date: "2026-02-29" }, { arenaSlug: "own", arenaId: "foreign" }, { arenaSlug: "own", playerId: "other" }, { arenaSlug: "own", matchId: "" }]) assert.equal(publicBookingViewInputSchema.safeParse(input).success, false);
});
test("public availability response excludes personal profile and provider fields", () => {
  const minimal = { selectedDate: "2026-12-07", today: "2026-11-27", arena: { name: "Own", logoUrl: "", checkinEnabled: false, onlineBookingEnabled: true, onlineBookingLayout: "BLOCKS", onlineBookingPaymentEnabled: false, operationalSettings: null }, currentClient: { name: "Own athlete" }, matchSummary: null, delinquency: { blocked: false, requiresReview: false, reviewReference: null }, courts: [], bookingServices: [], pendingReservation: null };
  assert.equal(publicBookingViewSchema.safeParse(minimal).success, true);
  assert.equal(publicBookingViewSchema.safeParse({ ...minimal, currentClient: { name: "Own athlete", email: "private@example.test" } }).success, false);
  assert.equal(publicBookingViewSchema.safeParse({ ...minimal, arena: { ...minimal.arena, accessToken: "private" } }).success, false);
  assert.equal(publicBookingViewSchema.safeParse({ ...minimal, occurrences: [{ notes: "private" }] }).success, false);
});
test("public booking renderer contains no database or provider import", () => {
  const source = readFileSync(new URL("../src/components/public-booking-view.tsx", import.meta.url), "utf8");
  assert.match(source, /getPublicBookingView/);
  assert.doesNotMatch(source, /@\/lib\/(?:prisma|rls|arena-database|payments)\b/);
});
