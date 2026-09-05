"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleEdit } from "@/lib/auth/guards";
import { requirePublicPlayerAuth } from "@/lib/auth/player-session";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import {
  moneyToCents,
  parseBookingParticipants,
  parseCourtIds,
  parseScheduledAt,
  timeToMinutes
} from "@/lib/calendar/inputs";
import { weeklyRangesOverlap } from "@/lib/scheduling/weekly-rule";
import { calculateCourtIntervalPrice } from "@/lib/calendar/court-interval-pricing";
import { expandWeeklyOccurrences } from "@/lib/scheduling/recurrence";

const calendarSchema = z.object({
  sourceType: z.enum(["lesson", "calendar"]).default("calendar"),
  lessonId: z.string().trim().default(""),
  calendarEventId: z.string().trim().default(""),
  eventType: z.string().trim().min(1),
  title: z.string().trim().min(2),
  scheduledAt: z.string().trim().min(1),
  durationMinutes: z.coerce.number().int().min(15).max(720).default(60),
  notes: z.string().trim().default("")
});

const courtSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da quadra.")
});

const courtSettingsSchema = z.object({
  courtId: z.string().trim().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Informe uma cor válida."),
  onlineSlotMinutes: z.coerce.number().int().min(15).max(120),
  onlineDurationMinutes: z.array(z.coerce.number().int().min(15).max(720)).min(1)
});

const scheduleSettingsSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Informe o horário de abertura."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Informe o horário de encerramento."),
  slotMinutes: z.coerce.number().int().min(15).max(120)
});

const onlineBookingSettingsSchema = z.object({
  layout: z.enum(["BLOCKS", "LIST"]),
  leadTimeMinutes: z.coerce.number().int().min(0).max(10080, "O prazo máximo é de 7 dias."),
  whatsappMessage: z.string().trim().max(1000, "A mensagem pode ter no máximo 1000 caracteres.")
});

const courtWeeklyRuleSchema = z.object({
  courtId: z.string().trim().min(1),
  weekday: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  price: z.string().trim().min(1),
  available: z.enum(["on"]).optional()
});

const updateCourtWeeklyRuleSchema = courtWeeklyRuleSchema.pick({
  startTime: true,
  endTime: true,
  price: true,
  available: true
}).extend({ ruleId: z.string().trim().min(1) });

const courtBookingSchema = z.object({
  occurrenceId: z.string().trim().default(""),
  courtId: z.string().trim().min(1),
  courtIds: z.string().trim().default("[]"),
  title: z.string().trim().min(2),
  startsAt: z.string().trim().min(1),
  durationMinutes: z.coerce.number().int().min(15).max(720),
  bookingTypeName: z.string().trim().min(1).default("Reserva"),
  repeatUntil: z.string().trim().default(""),
  teacherId: z.string().trim().default(""),
  notes: z.string().trim().default(""),
  participants: z.string().trim().default("[]")
});

type CourtBookingActionResult = { error?: string };
const visibleCourtBookingErrors = new Set([
  "Dados inválidos.",
  "Data e hora invalidas.",
  "Participantes inválidos.",
  "Quadras inválidas.",
  "Uma ou mais quadras não pertencem à arena.",
  "Selecione o professor responsável.",
  "Professor não encontrado.",
  "Informe até quando a reserva fixa deve se repetir.",
  "A data final da reserva fixa deve ser igual ou posterior ao primeiro horário.",
  "Um ou mais atletas não pertencem à arena.",
  "Já existe um agendamento nessa quadra para este horário."
]);

const publicCourtBookingSchema = z.object({
  arenaSlug: z.string().trim().min(1),
  courtId: z.string().trim().min(1),
  startsAt: z.string().trim().min(1),
  durationMinutes: z.coerce.number().int().min(15).max(720)
});

const DEFAULT_BOOKING_TYPES = ["Aula", "Aula fixa", "Plano", "Super 12", "Liga", "Reserva"];

function isFixedBooking(bookingTypeName: string) {
  return ["aula fixa", "reserva fixa"].includes(bookingTypeName.trim().toLowerCase());
}

function refreshCalendar() {
  revalidatePath("/calendario");
  revalidatePath("/agenda");
  revalidatePath("/agenda/configuracao");
}

export async function updateOnlineBookingSettingsAction(formData: FormData) {
  const auth = await requireModuleEdit("calendar");
  const parsed = onlineBookingSettingsSchema.safeParse({
    layout: formData.get("layout"),
    leadTimeMinutes: formData.get("leadTimeMinutes"),
    whatsappMessage: formData.get("whatsappMessage")
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Configuração inválida.");

  await prisma.arena.update({
    where: { id: auth.arenaId },
    data: {
      onlineBookingLayout: parsed.data.layout,
      onlineBookingRequiresConfirmation: formData.get("requiresConfirmation") === "on",
      onlineBookingShowReserved: formData.get("showReserved") === "on",
      onlineBookingPaymentEnabled: formData.get("paymentOnlineEnabled") === "on",
      onlineBookingLeadTimeMinutes: parsed.data.leadTimeMinutes,
      onlineBookingWhatsappMessage: parsed.data.whatsappMessage
    }
  });
  refreshCalendar();
}

export async function createPublicCourtBookingAction(formData: FormData) {
  const parsed = publicCourtBookingSchema.safeParse({
    arenaSlug: formData.get("arenaSlug"), courtId: formData.get("courtId"), startsAt: formData.get("startsAt"), durationMinutes: formData.get("durationMinutes")
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const playerAuth = await requirePublicPlayerAuth(parsed.data.arenaSlug);
  const arena = await prisma.arena.findUnique({ where: { slug: parsed.data.arenaSlug }, select: { id: true, slug: true, onlineBookingRequiresConfirmation: true, onlineBookingPaymentEnabled: true, onlineBookingLeadTimeMinutes: true } });
  if (!arena) throw new Error("Arena não encontrada.");
  const startsAt = parseScheduledAt(parsed.data.startsAt);
  const earliestStart = new Date(Date.now() + arena.onlineBookingLeadTimeMinutes * 60_000);
  if (startsAt.getTime() < earliestStart.getTime()) throw new Error(`Este horário exige antecedência mínima de ${arena.onlineBookingLeadTimeMinutes} minutos.`);
  const endsAt = new Date(startsAt.getTime() + parsed.data.durationMinutes * 60_000);
  const startsAtMinute = startsAt.getHours() * 60 + startsAt.getMinutes();
  const endsAtMinute = endsAt.getHours() * 60 + endsAt.getMinutes();
  const court = await prisma.court.findFirst({ where: { id: parsed.data.courtId, arenaId: arena.id, active: true }, include: { weeklyRules: true } });
  if (!court) throw new Error("Quadra não encontrada.");
  if (!court.onlineDurationMinutes.includes(parsed.data.durationMinutes)) throw new Error("Esta duração não está disponível para reserva online.");
  if (parsed.data.durationMinutes % court.onlineSlotMinutes !== 0) throw new Error("A duração deve respeitar o intervalo configurado para a quadra.");
  const bookingAmountCents = calculateCourtIntervalPrice({ startsAtMinute, durationMinutes: parsed.data.durationMinutes, intervalMinutes: court.onlineSlotMinutes, weekday: startsAt.getDay(), rules: court.weeklyRules });
  if (bookingAmountCents === null) throw new Error("Este horário não está disponível para reserva online.");
  const conflict = await withArenaTransaction(arena.id, (tx) => tx.scheduleOccurrence.findFirst({ where: { arenaId: arena.id, status: { not: "CANCELED" }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt }, occurrenceCourts: { some: { courtId: court.id } } }, select: { id: true } }));
  if (conflict) throw new Error("Este horário acabou de ser reservado. Selecione outro horário.");
  await withArenaTransaction(arena.id, async (tx) => {
    const player = await tx.player.findFirst({ where: { id: playerAuth.playerId, arenaId: arena.id, active: true }, select: { id: true, name: true } });
    if (!player) throw new Error("Cliente não encontrado.");
    const occurrence = await tx.scheduleOccurrence.create({ data: { arenaId: arena.id, sourceType: "ONLINE_BOOKING", title: `${player.name} - Reserva`, startsAt, endsAt, status: arena.onlineBookingRequiresConfirmation ? "PENDING_CONFIRMATION" : arena.onlineBookingPaymentEnabled ? "PENDING_PAYMENT" : "SCHEDULED", bookingTypeName: "Reserva", occurrenceCourts: { create: { courtId: court.id } }, participants: { create: { playerId: player.id, amountCents: bookingAmountCents } } } });
    const localDate = `${startsAt.getFullYear()}-${String(startsAt.getMonth() + 1).padStart(2, "0")}-${String(startsAt.getDate()).padStart(2, "0")}`;
    await tx.arenaNotification.create({ data: { arenaId: arena.id, title: arena.onlineBookingRequiresConfirmation ? "Reserva aguardando confirmação" : "Nova reserva online", message: `${player.name} solicitou ${court.name} às ${String(startsAt.getHours()).padStart(2, "0")}:${String(startsAt.getMinutes()).padStart(2, "0")}.`, href: `/agenda?data=${localDate}`, type: "ONLINE_BOOKING" } });
  });
  revalidatePath("/agenda");
  revalidatePath(`/reservar/${arena.slug}`);
}

export async function confirmOnlineBookingAction(formData: FormData) {
  const auth = await requireModuleEdit("calendar");
  const occurrenceId = z.string().trim().min(1).safeParse(formData.get("occurrenceId"));
  if (!occurrenceId.success) throw new Error("Reserva inválida.");
  await withArenaTransaction(auth.arenaId, async (tx) => {
    const occurrence = await tx.scheduleOccurrence.findFirst({ where: { id: occurrenceId.data, arenaId: auth.arenaId, sourceType: "ONLINE_BOOKING", status: "PENDING_CONFIRMATION" }, include: { arena: { select: { slug: true } }, participants: { select: { playerId: true } } } });
    if (!occurrence) throw new Error("Esta reserva já foi confirmada ou não foi encontrada.");
    await tx.scheduleOccurrence.update({ where: { id: occurrence.id }, data: { status: "SCHEDULED" } });
    if (occurrence.participants.length) {
      const dateLabel = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(occurrence.startsAt);
      await tx.playerNotification.createMany({ data: occurrence.participants.map((participant) => ({ playerId: participant.playerId, type: "ONLINE_BOOKING_CONFIRMED", title: "Reserva confirmada", message: `Sua reserva para ${dateLabel} foi confirmada pela arena.`, href: `/reservar/${occurrence.arena.slug}` })) });
    }
  });
  refreshCalendar();
}

export async function cancelCourtBookingAction(formData: FormData) {
  const auth = await requireModuleEdit("calendar");
  const parsed = z.object({ occurrenceId: z.string().trim().min(1), mode: z.enum(["CANCEL", "FREE"]).default("CANCEL") }).safeParse({ occurrenceId: formData.get("occurrenceId"), mode: formData.get("mode") });
  if (!parsed.success) throw new Error("Horário inválido.");
  const result = await withArenaTransaction(auth.arenaId, async (tx) => {
    const occurrence = await tx.scheduleOccurrence.findFirst({ where: { id: parsed.data.occurrenceId, arenaId: auth.arenaId, status: { not: "CANCELED" } }, select: { id: true, startsAt: true, bookingSeriesId: true } });
    if (!occurrence) return 0;
    if (parsed.data.mode === "FREE" || !occurrence.bookingSeriesId) {
      return (await tx.scheduleOccurrence.updateMany({ where: { id: occurrence.id, arenaId: auth.arenaId, status: { not: "CANCELED" } }, data: { status: "CANCELED" } })).count;
    }
    await tx.scheduleBookingSeries.updateMany({ where: { id: occurrence.bookingSeriesId, arenaId: auth.arenaId, status: "ACTIVE" }, data: { status: "CANCELED" } });
    return (await tx.scheduleOccurrence.updateMany({ where: { bookingSeriesId: occurrence.bookingSeriesId, arenaId: auth.arenaId, startsAt: { gte: occurrence.startsAt }, status: { not: "CANCELED" } }, data: { status: "CANCELED" } })).count;
  });
  if (!result) throw new Error("Este horário já foi cancelado ou não foi encontrado.");
  refreshCalendar();
}

async function ensureBookingTypes(arenaId: string) {
  await prisma.bookingType.createMany({ data: DEFAULT_BOOKING_TYPES.map((name) => ({ arenaId, name })), skipDuplicates: true });
}

export async function createBookingTypeAction(formData: FormData) {
  const auth = await requireModuleEdit("arena");
  const name = z.string().trim().min(2, "Informe o tipo de reserva.").safeParse(formData.get("name"));
  if (!name.success) throw new Error(name.error.issues[0]?.message ?? "Tipo inválido.");
  await ensureBookingTypes(auth.arenaId);
  await prisma.bookingType.create({ data: { arenaId: auth.arenaId, name: name.data } });
  revalidatePath("/arena"); revalidatePath("/agenda");
}

export async function createQuickPlayerAction(formData: FormData) {
  const auth = await requireModuleEdit("calendar");
  const parsed = z.object({ name: z.string().trim().min(3), phone: z.string().trim().min(8), cpf: z.string().trim().default(""), class: z.string().trim().default(""), gender: z.string().trim().default(""), birthDate: z.string().trim().default("") }).safeParse({ name: formData.get("name"), phone: formData.get("phone"), cpf: formData.get("cpf"), class: formData.get("class"), gender: formData.get("gender"), birthDate: formData.get("birthDate") });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const player = await prisma.player.create({ data: { arenaId: auth.arenaId, name: parsed.data.name, phone: parsed.data.phone, cpf: parsed.data.cpf.replace(/\D/g, ""), class: parsed.data.class, gender: parsed.data.gender, birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : null } });
  refreshCalendar(); return { id: player.id, name: player.name };
}

export async function saveCourtBookingAction(formData: FormData): Promise<CourtBookingActionResult> {
  try {
  const auth = await requireModuleEdit("calendar");
  const parsed = courtBookingSchema.safeParse({
    occurrenceId: String(formData.get("occurrenceId") ?? ""), courtId: formData.get("courtId"), courtIds: formData.get("courtIds"), title: formData.get("title"),
    startsAt: formData.get("startsAt"), durationMinutes: formData.get("durationMinutes"), bookingTypeName: formData.get("bookingTypeName"),
    repeatUntil: formData.get("repeatUntil"),
    teacherId: formData.get("teacherId"), notes: formData.get("notes"), participants: formData.get("participants")
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const startsAt = parseScheduledAt(parsed.data.startsAt);
  const endsAt = new Date(startsAt.getTime() + parsed.data.durationMinutes * 60_000);
  const fixedBooking = isFixedBooking(parsed.data.bookingTypeName);
  const repeatUntil = parsed.data.repeatUntil ? new Date(`${parsed.data.repeatUntil}T23:59:59`) : null;
  if (fixedBooking && !parsed.data.occurrenceId && !repeatUntil) throw new Error("Informe até quando a reserva fixa deve se repetir.");
  if (repeatUntil && (Number.isNaN(repeatUntil.getTime()) || repeatUntil < startsAt)) throw new Error("A data final da reserva fixa deve ser igual ou posterior ao primeiro horário.");
  const occurrenceTimes = fixedBooking && !parsed.data.occurrenceId && repeatUntil
    ? expandWeeklyOccurrences({ startsAt, endsAt, until: repeatUntil })
    : [{ startsAt, endsAt }];
  const participants = parseBookingParticipants(parsed.data.participants);
  const courtIds = parseCourtIds(parsed.data.courtIds, parsed.data.courtId);
  const courts = await prisma.court.findMany({ where: { arenaId: auth.arenaId, id: { in: courtIds } }, select: { id: true } });
  if (courts.length !== courtIds.length) throw new Error("Uma ou mais quadras não pertencem à arena.");
  const isLesson = ["aula", "aula fixa"].includes(parsed.data.bookingTypeName.toLowerCase());
  if (isLesson && !parsed.data.teacherId) throw new Error("Selecione o professor responsável.");
  if (parsed.data.teacherId) {
    const teacher = await prisma.teacher.findFirst({ where: { id: parsed.data.teacherId, arenaId: auth.arenaId, active: true }, select: { id: true } });
    if (!teacher) throw new Error("Professor não encontrado.");
  }
  const players = participants.length ? await prisma.player.findMany({ where: { arenaId: auth.arenaId, id: { in: participants.map((participant) => participant.playerId) } }, select: { id: true, name: true } }) : [];
  if (players.length !== participants.length) throw new Error("Um ou mais atletas não pertencem à arena.");
  const conflicts = await withArenaTransaction(auth.arenaId, (tx) => tx.scheduleOccurrence.findFirst({ where: {
    arenaId: auth.arenaId, id: parsed.data.occurrenceId ? { not: parsed.data.occurrenceId } : undefined,
    status: { not: "CANCELED" }, OR: occurrenceTimes.map((occurrence) => ({ startsAt: { lt: occurrence.endsAt }, endsAt: { gt: occurrence.startsAt } })), occurrenceCourts: { some: { courtId: { in: courtIds } } }
  } }));
  if (conflicts) throw new Error("Já existe um agendamento nessa quadra para este horário.");

  await withArenaTransaction(auth.arenaId, async (tx) => {
    const occurrences = parsed.data.occurrenceId
      ? [await tx.scheduleOccurrence.update({ where: { id: parsed.data.occurrenceId, arenaId: auth.arenaId }, data: { title: parsed.data.title, startsAt, endsAt, bookingTypeName: parsed.data.bookingTypeName, teacherId: parsed.data.teacherId || null, notes: parsed.data.notes, occurrenceCourts: { deleteMany: {}, create: courtIds.map((courtId) => ({ courtId })) } } })]
      : await (async () => {
        const series = fixedBooking ? await tx.scheduleBookingSeries.create({ data: { arenaId: auth.arenaId, title: parsed.data.title, bookingTypeName: parsed.data.bookingTypeName, startsAt, endsAt: occurrenceTimes.at(-1)!.endsAt, teacherId: parsed.data.teacherId || null, notes: parsed.data.notes } }) : null;
        return Promise.all(occurrenceTimes.map((occurrence) => tx.scheduleOccurrence.create({ data: { arenaId: auth.arenaId, sourceType: "BOOKING", bookingSeriesId: series?.id, title: parsed.data.title, startsAt: occurrence.startsAt, endsAt: occurrence.endsAt, bookingTypeName: parsed.data.bookingTypeName, teacherId: parsed.data.teacherId || null, notes: parsed.data.notes, occurrenceCourts: { create: courtIds.map((courtId) => ({ courtId })) } } })));
      })();
    for (const occurrence of occurrences) {
      const previous = await tx.scheduleParticipant.findMany({ where: { occurrenceId: occurrence.id } });
      for (const participant of previous) if (!participants.some((item) => item.playerId === participant.playerId) && participant.financialEntryId) await tx.financialEntry.delete({ where: { id: participant.financialEntryId } });
      await tx.scheduleParticipant.deleteMany({ where: { occurrenceId: occurrence.id, playerId: { notIn: participants.map((participant) => participant.playerId) } } });
      for (const participant of participants) {
        const existing = previous.find((item) => item.playerId === participant.playerId);
        const player = players.find((item) => item.id === participant.playerId)!;
        const hasCharge = participant.amountCents > 0;
        const paymentMethod = occurrence === occurrences[0] ? participant.paymentMethod : "";
        const entryData = { type: "INCOME", category: "COURT_BOOKING", description: `${parsed.data.title} · ${player.name}`, amountCents: participant.amountCents, paymentMethod, status: paymentMethod ? "PAID" : "PENDING", dueDate: occurrence.startsAt, paidAt: paymentMethod ? new Date() : null, notes: `Agendamento ${occurrence.id}`, arenaId: auth.arenaId };
        const financialEntryId = hasCharge ? (existing?.financialEntryId ? (await tx.financialEntry.update({ where: { id: existing.financialEntryId }, data: entryData })).id : (await tx.financialEntry.create({ data: entryData })).id) : null;
        if (!hasCharge && existing?.financialEntryId) await tx.financialEntry.delete({ where: { id: existing.financialEntryId } });
        await tx.scheduleParticipant.upsert({ where: { occurrenceId_playerId: { occurrenceId: occurrence.id, playerId: participant.playerId } }, update: { amountCents: participant.amountCents, paymentMethod, financialEntryId }, create: { occurrenceId: occurrence.id, playerId: participant.playerId, amountCents: participant.amountCents, paymentMethod, financialEntryId } });
      }
    }
  });
  refreshCalendar();
  return {};
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "";
    if (visibleCourtBookingErrors.has(message)) return { error: message };
    console.error("Falha ao salvar agendamento da grade", reason);
    return { error: "Não foi possível salvar o agendamento. Tente novamente." };
  }
}

export async function createCourtWeeklyRuleAction(formData: FormData) {
  const auth = await requireModuleEdit("calendar");
  const parsed = courtWeeklyRuleSchema.safeParse({
    courtId: formData.get("courtId"),
    weekday: formData.get("weekday"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    price: formData.get("price"),
    available: formData.get("available")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const startsAtMinute = timeToMinutes(parsed.data.startTime);
  const endsAtMinute = timeToMinutes(parsed.data.endTime);
  if (startsAtMinute >= endsAtMinute) {
    throw new Error("O horário final deve ser posterior ao inicial.");
  }

  const court = await prisma.court.findFirst({
    where: { id: parsed.data.courtId, arenaId: auth.arenaId },
    include: { weeklyRules: { where: { weekday: parsed.data.weekday } } }
  });
  if (!court) {
    throw new Error("Quadra não encontrada.");
  }

  const conflicts = court.weeklyRules.some((rule) =>
    weeklyRangesOverlap(startsAtMinute, endsAtMinute, rule.startsAtMinute, rule.endsAtMinute)
  );
  if (conflicts) {
    throw new Error("Esta faixa se sobrepõe a outra regra da mesma quadra.");
  }

  await prisma.courtWeeklyRule.create({
    data: {
      courtId: court.id,
      weekday: parsed.data.weekday,
      startsAtMinute,
      endsAtMinute,
      priceCents: moneyToCents(parsed.data.price),
      available: parsed.data.available === "on"
    }
  });
  refreshCalendar();
}

export async function updateCourtWeeklyRuleAction(formData: FormData) {
  const auth = await requireModuleEdit("calendar");
  const parsed = updateCourtWeeklyRuleSchema.safeParse({
    ruleId: formData.get("ruleId"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    price: formData.get("price"),
    available: formData.get("available")
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const startsAtMinute = timeToMinutes(parsed.data.startTime);
  const endsAtMinute = timeToMinutes(parsed.data.endTime);
  if (startsAtMinute >= endsAtMinute) throw new Error("O horário final deve ser posterior ao inicial.");

  const rule = await prisma.courtWeeklyRule.findFirst({
    where: { id: parsed.data.ruleId, court: { arenaId: auth.arenaId } },
    include: { court: { include: { weeklyRules: true } } }
  });
  if (!rule) throw new Error("Faixa não encontrada.");

  const conflicts = rule.court.weeklyRules.some((item) =>
    item.id !== rule.id &&
    item.weekday === rule.weekday &&
    weeklyRangesOverlap(startsAtMinute, endsAtMinute, item.startsAtMinute, item.endsAtMinute)
  );
  if (conflicts) throw new Error("Esta faixa se sobrepõe a outra regra da mesma quadra.");

  await prisma.courtWeeklyRule.update({
    where: { id: rule.id },
    data: {
      startsAtMinute,
      endsAtMinute,
      priceCents: moneyToCents(parsed.data.price),
      available: parsed.data.available === "on"
    }
  });
  refreshCalendar();
}

export async function deleteCourtWeeklyRuleAction(formData: FormData) {
  const auth = await requireModuleEdit("calendar");
  const ruleId = z.string().trim().min(1).safeParse(formData.get("ruleId"));
  if (!ruleId.success) {
    throw new Error("Regra inválida.");
  }

  const removed = await prisma.courtWeeklyRule.deleteMany({
    where: { id: ruleId.data, court: { arenaId: auth.arenaId } }
  });
  if (!removed.count) {
    throw new Error("Regra não encontrada.");
  }
  refreshCalendar();
}

export async function copyCourtWeeklyRuleAction(formData: FormData) {
  const auth = await requireModuleEdit("calendar");
  const parsed = z.object({ ruleId: z.string().trim().min(1), targetWeekday: z.union([z.string().regex(/^[0-6]$/).transform(Number), z.literal("ALL")]) }).safeParse({
    ruleId: formData.get("ruleId"),
    targetWeekday: formData.get("targetWeekday")
  });
  if (!parsed.success) throw new Error("Selecione o dia de destino.");

  const source = await prisma.courtWeeklyRule.findFirst({
    where: { id: parsed.data.ruleId, court: { arenaId: auth.arenaId } },
    include: { court: { include: { weeklyRules: true } } }
  });
  if (!source) throw new Error("Faixa não encontrada.");
  const targetWeekdays = parsed.data.targetWeekday === "ALL" ? [0, 1, 2, 3, 4, 5, 6] : [parsed.data.targetWeekday];
  const destinations = targetWeekdays.filter((weekday) => weekday !== source.weekday && !source.court.weeklyRules.some((rule) =>
    rule.weekday === weekday && weeklyRangesOverlap(source.startsAtMinute, source.endsAtMinute, rule.startsAtMinute, rule.endsAtMinute)
  ));
  if (!destinations.length) throw new Error("Já existe uma faixa sobreposta nos períodos selecionados.");

  await prisma.courtWeeklyRule.createMany({ data: destinations.map((weekday) => ({
    courtId: source.courtId,
    weekday,
    startsAtMinute: source.startsAtMinute,
    endsAtMinute: source.endsAtMinute,
    priceCents: source.priceCents,
    available: source.available
  })) });
  refreshCalendar();
}

export async function updateScheduleSettingsAction(formData: FormData) {
  const auth = await requireModuleEdit("calendar");
  const parsed = scheduleSettingsSchema.safeParse({
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    slotMinutes: formData.get("slotMinutes")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const scheduleStartMinute = timeToMinutes(parsed.data.startTime);
  const scheduleEndMinute = timeToMinutes(parsed.data.endTime);
  if (scheduleStartMinute >= scheduleEndMinute) {
    throw new Error("O encerramento deve ser posterior à abertura.");
  }

  await prisma.arena.update({
    where: { id: auth.arenaId },
    data: { scheduleStartMinute, scheduleEndMinute, scheduleSlotMinutes: parsed.data.slotMinutes }
  });

  refreshCalendar();
}

export async function createCourtAction(formData: FormData) {
  const auth = await requireModuleEdit("calendar");
  const parsed = courtSchema.safeParse({ name: formData.get("name") });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invalidos.");
  }

  const lastCourt = await prisma.court.findFirst({ where: { arenaId: auth.arenaId }, orderBy: { displayOrder: "desc" }, select: { displayOrder: true } });
  await prisma.court.create({ data: { arenaId: auth.arenaId, name: parsed.data.name, displayOrder: (lastCourt?.displayOrder ?? -1) + 1 } });

  refreshCalendar();
}

export async function updateCourtSettingsAction(formData: FormData) {
  const auth = await requireModuleEdit("calendar");
  const parsed = courtSettingsSchema.safeParse({
    courtId: formData.get("courtId"), color: formData.get("color"), onlineSlotMinutes: formData.get("onlineSlotMinutes"),
    onlineDurationMinutes: formData.getAll("onlineDurationMinutes")
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const durations = Array.from(new Set(parsed.data.onlineDurationMinutes)).sort((first, second) => first - second);
  if (durations.some((duration) => duration < parsed.data.onlineSlotMinutes || duration % parsed.data.onlineSlotMinutes !== 0)) {
    throw new Error("Cada duração deve respeitar o intervalo de reserva online.");
  }
  const updated = await prisma.court.updateMany({ where: { id: parsed.data.courtId, arenaId: auth.arenaId }, data: { color: parsed.data.color, onlineSlotMinutes: parsed.data.onlineSlotMinutes, onlineDurationMinutes: durations } });
  if (!updated.count) throw new Error("Quadra não encontrada.");
  refreshCalendar();
}

export async function moveCourtAction(formData: FormData) {
  const auth = await requireModuleEdit("calendar");
  const parsed = z.object({ courtId: z.string().trim().min(1), direction: z.enum(["up", "down"]) }).safeParse({ courtId: formData.get("courtId"), direction: formData.get("direction") });
  if (!parsed.success) throw new Error("Movimentação inválida.");
  const courts = await prisma.court.findMany({ where: { arenaId: auth.arenaId }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] });
  const currentIndex = courts.findIndex((court) => court.id === parsed.data.courtId);
  const targetIndex = currentIndex + (parsed.data.direction === "up" ? -1 : 1);
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= courts.length) return;
  await prisma.$transaction([
    prisma.court.update({ where: { id: courts[currentIndex].id }, data: { displayOrder: courts[targetIndex].displayOrder } }),
    prisma.court.update({ where: { id: courts[targetIndex].id }, data: { displayOrder: courts[currentIndex].displayOrder } })
  ]);
  refreshCalendar();
}

export async function copyCourtConfigurationAction(formData: FormData) {
  const auth = await requireModuleEdit("calendar");
  const sourceCourtId = z.string().trim().min(1).safeParse(formData.get("sourceCourtId"));
  const targetCourtIds = Array.from(new Set(formData.getAll("targetCourtId").flatMap((value) => typeof value === "string" && value.length > 0 ? [value] : [])));
  if (!sourceCourtId.success || !targetCourtIds.length) throw new Error("Selecione ao menos uma quadra de destino.");
  const source = await prisma.court.findFirst({ where: { id: sourceCourtId.data, arenaId: auth.arenaId }, include: { weeklyRules: true } });
  const targets = await prisma.court.findMany({ where: { arenaId: auth.arenaId, id: { in: targetCourtIds.filter((id) => id !== sourceCourtId.data) } }, select: { id: true } });
  if (!source || !targets.length) throw new Error("Quadras de origem ou destino inválidas.");
  await prisma.$transaction(async (tx) => {
    for (const target of targets) {
      await tx.court.update({ where: { id: target.id }, data: { onlineSlotMinutes: source.onlineSlotMinutes, onlineDurationMinutes: source.onlineDurationMinutes } });
      await tx.courtWeeklyRule.deleteMany({ where: { courtId: target.id } });
      if (source.weeklyRules.length) await tx.courtWeeklyRule.createMany({ data: source.weeklyRules.map((rule) => ({ courtId: target.id, weekday: rule.weekday, startsAtMinute: rule.startsAtMinute, endsAtMinute: rule.endsAtMinute, priceCents: rule.priceCents, available: rule.available })) });
    }
  });
  refreshCalendar();
}

export async function createCalendarEventAction(formData: FormData) {
  const auth = await requireModuleEdit("calendar");
  const parsed = calendarSchema.safeParse({
    sourceType: "calendar",
    lessonId: "",
    calendarEventId: "",
    eventType: formData.get("eventType"),
    title: formData.get("title"),
    scheduledAt: formData.get("scheduledAt"),
    durationMinutes: formData.get("durationMinutes"),
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invalidos.");
  }

  const scheduledAt = parseScheduledAt(parsed.data.scheduledAt);
  const normalizedType = parsed.data.eventType.toUpperCase();

  if (normalizedType === "AULA") {
    await prisma.lesson.create({
      data: {
        arenaId: auth.arenaId,
        title: parsed.data.title,
        scheduledAt,
        durationMinutes: parsed.data.durationMinutes,
        notes: parsed.data.notes,
        status: "SCHEDULED"
      }
    });
  } else {
    await prisma.calendarEvent.create({
      data: {
        arenaId: auth.arenaId,
        eventType: normalizedType,
        title: parsed.data.title,
        scheduledAt,
        durationMinutes: parsed.data.durationMinutes,
        notes: parsed.data.notes
      }
    });
  }

  refreshCalendar();
}

export async function updateCalendarEventAction(formData: FormData) {
  const auth = await requireModuleEdit("calendar");
  const parsed = calendarSchema.safeParse({
    sourceType: formData.get("sourceType"),
    lessonId: formData.get("lessonId"),
    calendarEventId: formData.get("calendarEventId"),
    eventType: formData.get("eventType"),
    title: formData.get("title"),
    scheduledAt: formData.get("scheduledAt"),
    durationMinutes: formData.get("durationMinutes"),
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invalidos.");
  }

  const scheduledAt = parseScheduledAt(parsed.data.scheduledAt);
  const normalizedType = parsed.data.eventType.toUpperCase();

  if (parsed.data.sourceType === "lesson") {
    if (!parsed.data.lessonId) {
      throw new Error("Evento invalido.");
    }

    const updated = await prisma.lesson.updateMany({
      where: {
        id: parsed.data.lessonId,
        arenaId: auth.arenaId
      },
      data: {
        title: parsed.data.title,
        scheduledAt,
        durationMinutes: parsed.data.durationMinutes,
        notes: parsed.data.notes
      }
    });

    if (!updated.count) {
      throw new Error("Evento nao encontrado.");
    }
    refreshCalendar();
    return;
  }

  if (!parsed.data.calendarEventId) {
    throw new Error("Evento invalido.");
  }

  if (normalizedType === "AULA") {
    await prisma.$transaction(async (tx) => {
      await tx.lesson.create({
        data: {
          arenaId: auth.arenaId,
          title: parsed.data.title,
          scheduledAt,
          durationMinutes: parsed.data.durationMinutes,
          notes: parsed.data.notes,
          status: "SCHEDULED"
        }
      });

      await tx.calendarEvent.deleteMany({
        where: {
          id: parsed.data.calendarEventId,
          arenaId: auth.arenaId
        }
      });
    });

    refreshCalendar();
    return;
  }

  const updated = await prisma.calendarEvent.updateMany({
    where: {
      id: parsed.data.calendarEventId,
      arenaId: auth.arenaId
    },
    data: {
      eventType: normalizedType,
      title: parsed.data.title,
      scheduledAt,
      durationMinutes: parsed.data.durationMinutes,
      notes: parsed.data.notes
    }
  });

  if (!updated.count) {
    throw new Error("Evento nao encontrado.");
  }

  refreshCalendar();
}

export async function deleteCalendarEventAction(formData: FormData) {
  const auth = await requireModuleEdit("calendar");
  const parsed = z
    .object({
      sourceType: z.enum(["lesson", "calendar"]).default("calendar"),
      lessonId: z.string().trim().default(""),
      calendarEventId: z.string().trim().default("")
    })
    .safeParse({
      sourceType: formData.get("sourceType"),
      lessonId: formData.get("lessonId"),
      calendarEventId: formData.get("calendarEventId")
    });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invalidos.");
  }

  if (parsed.data.sourceType === "lesson") {
    if (!parsed.data.lessonId) {
      throw new Error("Evento invalido.");
    }

    const removed = await prisma.lesson.deleteMany({
      where: {
        id: parsed.data.lessonId,
        arenaId: auth.arenaId
      }
    });

    if (!removed.count) {
      throw new Error("Evento nao encontrado.");
    }

    refreshCalendar();
    return;
  }

  if (!parsed.data.calendarEventId) {
    throw new Error("Evento invalido.");
  }

  const removed = await prisma.calendarEvent.deleteMany({
    where: {
      id: parsed.data.calendarEventId,
      arenaId: auth.arenaId
    }
  });

  if (!removed.count) {
    throw new Error("Evento nao encontrado.");
  }

  refreshCalendar();
}
