import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("online booking enforces a configurable lead time and marks pending requests in the agenda", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/calendar.ts"), "utf8");
  const dialog = readFileSync(resolve(process.cwd(), "src/components/online-booking-settings-dialog.tsx"), "utf8");
  const agenda = readFileSync(resolve(process.cwd(), "src/app/(app)/agenda/page.tsx"), "utf8");
  const bookingPage = readFileSync(resolve(process.cwd(), "src/app/reservar/[arenaSlug]/page.tsx"), "utf8");
  const bookingForm = readFileSync(resolve(process.cwd(), "src/components/public-court-booking-form.tsx"), "utf8");
  const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

  assert.match(schema, /model Arena \{[\s\S]*onlineBookingLeadTimeMinutes\s+Int/);
  assert.match(actions, /onlineBookingLeadTimeMinutes/);
  assert.match(actions, /createPublicCourtBookingAction[\s\S]*antecedência/);
  assert.match(actions, /export async function confirmOnlineBookingAction/);
  assert.match(dialog, /Prazo mínimo para agendamento/);
  assert.match(agenda, /daily-court-event-online/);
  assert.match(agenda, /agenda-pending-confirmation/);
  assert.match(agenda, /Aguardando confirmação/);
  assert.match(actions, /playerNotification\.createMany/);
  assert.match(actions, /Reserva confirmada/);
  assert.match(bookingPage, /pendingReservations/);
  assert.match(bookingForm, /Aguardando confirmação/);
  assert.match(styles, /agenda-online-settings-trigger[\s\S]*background:/);
  assert.match(styles, /daily-court-event-online/);
});

test("each tournament stores rules and the public league page exposes them", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const form = readFileSync(resolve(process.cwd(), "src/components/tournaments/tournament-event-edit-form.tsx"), "utf8");
  const service = readFileSync(resolve(process.cwd(), "src/lib/services/public-standings.ts"), "utf8");
  const publicPage = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-standings.tsx"), "utf8");

  assert.match(schema, /model Tournament \{[\s\S]*rules\s+String/);
  assert.match(form, /Regras da liga/);
  assert.match(form, /name="rules"/);
  assert.match(service, /leagueRules/);
  assert.match(publicPage, />Regras</);
  assert.match(publicPage, /data\.leagueRules/);
});
