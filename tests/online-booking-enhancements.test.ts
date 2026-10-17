import { styleRules, utilityClasses } from "./helpers/utility-styles";
import { readFileSync } from "./helpers/style-source";
import assert from "node:assert/strict";

import { resolve } from "node:path";
import test from "node:test";

test("online booking enforces a configurable lead time and marks pending requests in the agenda", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/calendar.ts"), "utf8");
  const dialog = readFileSync(resolve(process.cwd(), "src/components/online-booking-settings-dialog.tsx"), "utf8");
  const agenda = readFileSync(resolve(process.cwd(), "src/app/(app)/agenda/page.tsx"), "utf8");
  const bookingPage = readFileSync(resolve(process.cwd(), "src/app/reservar/[arenaSlug]/page.tsx"), "utf8");
  const bookingForm = readFileSync(resolve(process.cwd(), "src/components/public-court-booking-form.tsx"), "utf8");
  const paymentChoice = readFileSync(resolve(process.cwd(), "src/components/public-booking-payment-choice.tsx"), "utf8");
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
  assert.match(bookingPage, /PublicBookingContent/);
  assert.match(bookingForm, /Aguardando confirmação/);
  assert.match(bookingForm, /Ir para pagamento/);
  assert.match(bookingForm, /pendingReservation\.status === "PENDING_PAYMENT" \? <a[^>]+href=\{`\/reservar\/\$\{encodeURIComponent\(arenaSlug\)\}\/pagamento\/\$\{encodeURIComponent\(pendingReservation\.id\)\}`\}/);
  assert.match(bookingForm, /paymentOnlineEnabled && selectedTotalCents > 0/);
  assert.match(actions, /const requiresPayment = arena\.onlineBookingPaymentEnabled && bookingAmountCents > 0/);
  assert.match(actions, /status: requiresPayment \? "PENDING_PAYMENT"/);
  assert.match(actions, /createPixPayment/);
  assert.doesNotMatch(actions, /financialEntry\.create\(\{ data: \{ arenaId: arena\.id, type: "REVENUE", category: "Reserva"/);
  assert.match(actions, /startPublicCourtBookingPaymentAction/);
  assert.match(paymentChoice, /Pix/);
  assert.match(paymentChoice, /Cartão/);
  assert.match(paymentChoice, /Boleto/);
  assert.match(styles, /agenda-online-settings-trigger[\s\S]*background:/);
  assert.ok(utilityClasses("daily-court-event-online").length);
});

test("online booking serializes same-court requests and reports a readable conflict", () => {
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/calendar.ts"), "utf8");
  const form = readFileSync(resolve(process.cwd(), "src/components/public-court-booking-form.tsx"), "utf8");
  assert.match(actions, /withArenaTransaction\(arena\.id, async \(tx\) => \{[\s\S]*FOR UPDATE[\s\S]*tx\.scheduleOccurrence\.findFirst[\s\S]*tx\.scheduleOccurrence\.create/);
  assert.match(actions, /PublicBookingConflictError[\s\S]*ok: false, error: error\.message/);
  assert.match(form, /if \(!result\.ok\) \{ setMessage\(result\.error\); return; \}/);
});

test("portal só cancela solicitação sem pagamento iniciado", () => {
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/calendar.ts"), "utf8");
  assert.match(actions, /cancelPublicCourtBookingRequestAction[\s\S]*cancelUnpaidOnlineBooking\(tx,/);
  assert.match(actions, /Se você iniciou o pagamento, aguarde a confirmação/);
});

test("bloqueio por inadimplência é configurável, validado no servidor e avisado no portal", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/calendar.ts"), "utf8");
  const dialog = readFileSync(resolve(process.cwd(), "src/components/online-booking-settings-dialog.tsx"), "utf8");
  const booking = readFileSync(resolve(process.cwd(), "src/components/public-booking-content.tsx"), "utf8");
  const notifications = readFileSync(resolve(process.cwd(), "src/lib/services/public-player-notifications.ts"), "utf8");
  assert.match(schema, /onlineBookingOverdueBlockDays\s+Int\?/);
  assert.match(dialog, /overdueBlockEnabled/);
  assert.match(dialog, /Bloquear reservas após/);
  assert.match(actions, /getBookingDelinquency\(tx, arena\.id, player\.id, arena\.onlineBookingOverdueBlockDays\)/);
  assert.match(booking, /bookingBlocked=\{delinquency\.blocked\}/);
  assert.match(notifications, /Reservas temporariamente bloqueadas/);
});

test("agenda interna respeita bloqueio de 15 minutos e serializa a gravação", () => {
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/calendar.ts"), "utf8");
  const agenda = readFileSync(resolve(process.cwd(), "src/app/(app)/agenda/page.tsx"), "utf8");
  const staffBooking = actions.split("export async function saveCourtBookingAction")[1]?.split("export async function ")[0] ?? "";
  assert.match(staffBooking, /FOR UPDATE[\s\S]*activeCourtOccurrenceWhere\(\)/);
  assert.match(staffBooking, /assertCourtBookingMayBeEdited\(tx, auth\.arenaId, parsed\.data\.occurrenceId\)/);
  assert.match(agenda, /activeCourtOccurrenceWhere\(\)/);
  assert.match(agenda, /Aguardando pagamento/);
});

test("each tournament stores rules and the public league page exposes them", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const form = readFileSync(resolve(process.cwd(), "src/components/tournaments/tournament-event-edit-form.tsx"), "utf8");
  const service = readFileSync(resolve(process.cwd(), "src/lib/services/public-standings.ts"), "utf8");
  const publicPage = readFileSync(resolve(process.cwd(), "src/components/tournaments/public-standings.tsx"), "utf8");

  assert.match(schema, /model Tournament \{[\s\S]*rules\s+String/);
  assert.match(form, /Regulamento/);
  assert.match(form, /name="rules"/);
  assert.match(service, /leagueRules/);
  assert.match(publicPage, /Regras/);
  assert.match(publicPage, /data\.leagueRules/);
});
