import "server-only";
import { arenaDatabase } from "@/lib/arena-database";
import { z } from "zod";
import { refreshCalendarRoutes } from "@/lib/calendar/revalidation";

export const refreshCalendar = refreshCalendarRoutes;

export const calendarSchema = z.object({
  sourceType: z.enum(["lesson", "calendar"]).default("calendar"),
  lessonId: z.string().trim().default(""),
  calendarEventId: z.string().trim().default(""),
  eventType: z.string().trim().min(1),
  title: z.string().trim().min(2),
  scheduledAt: z.string().trim().min(1),
  durationMinutes: z.coerce.number().int().min(15).max(720).default(60),
  notes: z.string().trim().default("")
});

export function calendarFormValidationMessage(issue: z.ZodIssue | undefined) {
  if (issue?.path[0] === "title") return "Informe um título com pelo menos 2 caracteres.";
  if (issue?.path[0] === "eventType") return "Selecione o tipo do evento.";
  if (issue?.path[0] === "scheduledAt") return "Informe a data e a hora do evento.";
  if (issue?.path[0] === "durationMinutes") return "Informe uma duração entre 15 e 720 minutos.";
  return "Revise os dados do evento e tente novamente.";
}

export const courtSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da quadra.")
});

export const courtSettingsSchema = z.object({
  courtId: z.string().trim().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Informe uma cor válida."),
  onlineSlotMinutes: z.coerce.number().int().min(15).max(120),
  onlineDurationMinutes: z.array(z.coerce.number().int().min(15).max(720)).min(1)
});

export const scheduleSettingsSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Informe o horário de abertura."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Informe o horário de encerramento."),
  slotMinutes: z.coerce.number().int().min(15).max(120)
});

export const onlineBookingSettingsSchema = z.object({
  layout: z.enum(["BLOCKS", "LIST"]),
  leadTimeMinutes: z.coerce.number().int().min(0).max(10080, "O prazo máximo é de 7 dias."),
  overdueBlockDays: z.coerce.number().int().min(1, "Informe ao menos 1 dia.").max(365, "O prazo máximo é de 365 dias."),
  whatsappMessage: z.string().trim().max(1000, "A mensagem pode ter no máximo 1000 caracteres.")
});

export const publicBookingPaymentSchema = z.object({
  arenaSlug: z.string().trim().min(1),
  occurrenceId: z.string().trim().min(1),
  method: z.enum(["PIX", "CARD", "BOLETO"])
});

export const publicBookingCancellationSchema = z.object({
  arenaSlug: z.string().trim().min(1),
  occurrenceId: z.string().trim().min(1)
});

export const courtWeeklyRuleSchema = z.object({
  courtId: z.string().trim().min(1),
  weekday: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  price: z.string().trim().min(1),
  available: z.enum(["on"]).optional()
});

export const updateCourtWeeklyRuleSchema = courtWeeklyRuleSchema.pick({
  startTime: true,
  endTime: true,
  price: true,
  available: true
}).extend({ ruleId: z.string().trim().min(1) });

export const courtBookingSchema = z.object({
  courtPriceCents: z.coerce.number().int().min(0).max(100000000).optional(),
  occurrenceId: z.string().trim().default(""),
  courtId: z.string().trim().min(1),
  courtIds: z.string().trim().default("[]"),
  title: z.string().trim().min(2),
  startsAt: z.string().trim().min(1),
  durationMinutes: z.coerce.number().int().min(15).max(720),
  bookingTypeName: z.string().trim().min(1).default("Reserva"),
  repeatUntil: z.string().trim().default(""),
  teacherId: z.string().trim().default(""),
  responsiblePlayerId: z.string().trim().default(""),
  notes: z.string().trim().default(""),
  participants: z.string().trim().default("[]")
});

export type CourtBookingActionResult = { error?: string; version?: string };

export const visibleCourtBookingErrors = new Set([
  "Dados inválidos.",
  "Selecione a conta bancária do recebimento.",
  "Selecione uma conta bancária ativa desta arena.",
  "Data e hora invalidas.",
  "Participantes inválidos.",
  "Selecione pelo menos um cliente antes de salvar a reserva.",
  "Quadras inválidas.",
  "Uma ou mais quadras não pertencem à arena.",
  "Selecione o professor responsável.",
  "Selecione o responsável pela reserva fixa.",
  "Professor não encontrado.",
  "Informe até quando a reserva fixa deve se repetir.",
  "A data final da reserva fixa deve ser igual ou posterior ao primeiro horário.",
  "Um ou mais atletas não pertencem à arena.",
  "Já existe um agendamento nessa quadra para este horário.",
  "Um valor com recebimento já registrado não pode ser alterado pela grade. Ajuste pelo financeiro.",
  "Saldo do cliente insuficiente.",
  "Um crédito de reserva cobre apenas uma quadra.",
  "Sem crédito de reserva disponível para esta duração. Confira o pagamento do plano.",
  "Receba os serviços separadamente na comanda antes de usar o saldo de reservas.",
  "Reserva não encontrada nesta arena.",
  "Esta reserva aguarda pagamento e não pode ser editada agora.",
  "Esta reserva já tem pagamento ou cobrança online vinculada. Faça o ajuste financeiro antes de editá-la.",
  "Este horário é gerenciado pela origem e não pode ser editado pela agenda."
]);

export const publicCourtBookingSchema = z.object({
  matchId: z.string().trim().max(128).optional(),
  arenaSlug: z.string().trim().min(1),
  courtId: z.string().trim().min(1),
  startsAt: z.string().trim().min(1),
  durationMinutes: z.coerce.number().int().min(15).max(720),
  serviceIds: z.array(z.string().trim().min(1).max(128)).max(12).default([]),
  quotedTotalCents: z.coerce.number().int().min(0).max(2_147_483_647).optional()
});

export type PublicCourtBookingActionResult =
  | { ok: false; error: string }
  | { ok: true; occurrenceId: string; checkoutUrl: string; calendarUrl: string; reservationStatus: "PENDING_PAYMENT" | "PENDING_CONFIRMATION" | "SCHEDULED" };

export class PublicBookingConflictError extends Error {}

export const DEFAULT_BOOKING_TYPES = ["Aula", "Aula fixa", "Plano", "Super 12", "Liga", "Reserva"];

export async function ensureBookingTypes(arenaId: string) {
  await arenaDatabase(arenaId).bookingType.createMany({ data: DEFAULT_BOOKING_TYPES.map((name) => ({ arenaId, name })), skipDuplicates: true });
}
