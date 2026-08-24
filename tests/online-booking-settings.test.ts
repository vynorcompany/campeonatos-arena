import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("online booking settings are persisted and available from the daily agenda", () => {
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  const actions = readFileSync(resolve(process.cwd(), "src/lib/actions/calendar.ts"), "utf8");
  const agenda = readFileSync(resolve(process.cwd(), "src/app/(app)/agenda/page.tsx"), "utf8");
  const dialogPath = resolve(process.cwd(), "src/components/online-booking-settings-dialog.tsx");

  assert.match(schema, /model Arena \{[\s\S]*onlineBookingLayout\s+String/);
  assert.match(schema, /model Arena \{[\s\S]*onlineBookingRequiresConfirmation\s+Boolean/);
  assert.match(schema, /model Arena \{[\s\S]*onlineBookingShowReserved\s+Boolean/);
  assert.match(schema, /model Arena \{[\s\S]*onlineBookingPaymentEnabled\s+Boolean/);
  assert.match(schema, /model Arena \{[\s\S]*onlineBookingWhatsappMessage\s+String/);
  assert.match(actions, /export async function updateOnlineBookingSettingsAction/);
  assert.match(agenda, /OnlineBookingSettingsDialog/);
  assert.ok(existsSync(dialogPath));

  const dialog = readFileSync(dialogPath, "utf8");
  assert.match(dialog, /Copiar link/);
  assert.match(dialog, /Blocos/);
  assert.match(dialog, /Lista/);
  assert.match(dialog, /Confirmação de reserva/);
  assert.match(dialog, /Mostrar horários reservados/);
  assert.match(dialog, /Pagamento online/);
  assert.match(dialog, /Mensagem de WhatsApp/);
  assert.match(dialog, /\/agenda\/configuracao/);
});

test("a public reservation route exists for the arena link", () => {
  const pagePath = resolve(process.cwd(), "src/app/reservar/[arenaSlug]/page.tsx");
  const formPath = resolve(process.cwd(), "src/components/public-court-booking-form.tsx");
  assert.ok(existsSync(pagePath));
  const page = readFileSync(pagePath, "utf8");
  const form = readFileSync(formPath, "utf8");
  assert.match(page, /onlineBookingLayout/);
  assert.match(page, /onlineBookingShowReserved/);
  assert.match(page, /Reserva online/);
  assert.match(form, /public-booking-slot-blocks/);
  assert.match(form, /Horários reservados/);
});
