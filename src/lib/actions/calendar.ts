"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleEdit } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { weeklyRangesOverlap } from "@/lib/scheduling/weekly-rule";

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

const scheduleSettingsSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Informe o horário de abertura."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Informe o horário de encerramento."),
  slotMinutes: z.coerce.number().int().min(15).max(120)
});

const courtWeeklyRuleSchema = z.object({
  courtId: z.string().trim().min(1),
  weekday: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  price: z.string().trim().min(1),
  available: z.enum(["on"]).optional()
});

const courtBookingSchema = z.object({
  occurrenceId: z.string().trim().default(""),
  courtId: z.string().trim().min(1),
  title: z.string().trim().min(2),
  startsAt: z.string().trim().min(1),
  durationMinutes: z.coerce.number().int().min(15).max(720),
  bookingTypeName: z.string().trim().min(1).default("Reserva"),
  notes: z.string().trim().default(""),
  participants: z.string().trim().default("[]")
});

const DEFAULT_BOOKING_TYPES = ["Aula", "Aula fixa", "Plano", "Super 12", "Liga", "Reserva"];

function parseScheduledAt(value: string) {
  const scheduledAt = new Date(value);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error("Data e hora invalidas.");
  }
  return scheduledAt;
}

function refreshCalendar() {
  revalidatePath("/calendario");
  revalidatePath("/agenda");
  revalidatePath("/agenda/configuracao");
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function moneyToCents(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Informe um valor válido.");
  }
  return Math.round(parsed * 100);
}

type BookingParticipant = { playerId: string; amountCents: number; paymentMethod: string };

function parseBookingParticipants(value: string): BookingParticipant[] {
  let raw: unknown;
  try { raw = JSON.parse(value); } catch { throw new Error("Participantes inválidos."); }
  const parsed = z.array(z.object({
    playerId: z.string().trim().min(1),
    amountCents: z.coerce.number().int().min(0),
    paymentMethod: z.string().trim().default("")
  })).safeParse(raw);
  if (!parsed.success) throw new Error("Participantes inválidos.");
  if (new Set(parsed.data.map((participant) => participant.playerId)).size !== parsed.data.length) {
    throw new Error("Cada atleta só pode participar uma vez.");
  }
  return parsed.data;
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

export async function saveCourtBookingAction(formData: FormData) {
  const auth = await requireModuleEdit("calendar");
  const parsed = courtBookingSchema.safeParse({
    occurrenceId: formData.get("occurrenceId"), courtId: formData.get("courtId"), title: formData.get("title"),
    startsAt: formData.get("startsAt"), durationMinutes: formData.get("durationMinutes"), bookingTypeName: formData.get("bookingTypeName"),
    notes: formData.get("notes"), participants: formData.get("participants")
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const startsAt = parseScheduledAt(parsed.data.startsAt);
  const endsAt = new Date(startsAt.getTime() + parsed.data.durationMinutes * 60_000);
  const participants = parseBookingParticipants(parsed.data.participants);
  const court = await prisma.court.findFirst({ where: { id: parsed.data.courtId, arenaId: auth.arenaId } });
  if (!court) throw new Error("Quadra não encontrada.");
  const players = participants.length ? await prisma.player.findMany({ where: { arenaId: auth.arenaId, id: { in: participants.map((participant) => participant.playerId) } }, select: { id: true, name: true } }) : [];
  if (players.length !== participants.length) throw new Error("Um ou mais atletas não pertencem à arena.");
  const conflicts = await prisma.scheduleOccurrence.findFirst({ where: {
    arenaId: auth.arenaId, id: parsed.data.occurrenceId ? { not: parsed.data.occurrenceId } : undefined,
    status: { not: "CANCELED" }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt }, occurrenceCourts: { some: { courtId: court.id } }
  } });
  if (conflicts) throw new Error("Já existe um agendamento nessa quadra para este horário.");

  await prisma.$transaction(async (tx) => {
    const occurrence = parsed.data.occurrenceId
      ? await tx.scheduleOccurrence.update({ where: { id: parsed.data.occurrenceId, arenaId: auth.arenaId }, data: { title: parsed.data.title, startsAt, endsAt, bookingTypeName: parsed.data.bookingTypeName, notes: parsed.data.notes } })
      : await tx.scheduleOccurrence.create({ data: { arenaId: auth.arenaId, sourceType: "BOOKING", title: parsed.data.title, startsAt, endsAt, bookingTypeName: parsed.data.bookingTypeName, notes: parsed.data.notes, occurrenceCourts: { create: { courtId: court.id } } } });
    const previous = await tx.scheduleParticipant.findMany({ where: { occurrenceId: occurrence.id } });
    for (const participant of previous) {
      if (!participants.some((item) => item.playerId === participant.playerId) && participant.financialEntryId) await tx.financialEntry.delete({ where: { id: participant.financialEntryId } });
    }
    await tx.scheduleParticipant.deleteMany({ where: { occurrenceId: occurrence.id, playerId: { notIn: participants.map((participant) => participant.playerId) } } });
    for (const participant of participants) {
      const existing = previous.find((item) => item.playerId === participant.playerId);
      const player = players.find((item) => item.id === participant.playerId)!;
      const hasCharge = participant.amountCents > 0;
      const entryData = { type: "INCOME", category: "COURT_BOOKING", description: `${parsed.data.title} · ${player.name}`, amountCents: participant.amountCents, paymentMethod: participant.paymentMethod, status: participant.paymentMethod ? "PAID" : "PENDING", dueDate: startsAt, paidAt: participant.paymentMethod ? new Date() : null, notes: `Agendamento ${occurrence.id}`, arenaId: auth.arenaId };
      const financialEntryId = hasCharge ? (existing?.financialEntryId ? (await tx.financialEntry.update({ where: { id: existing.financialEntryId }, data: entryData })).id : (await tx.financialEntry.create({ data: entryData })).id) : null;
      if (!hasCharge && existing?.financialEntryId) await tx.financialEntry.delete({ where: { id: existing.financialEntryId } });
      await tx.scheduleParticipant.upsert({ where: { occurrenceId_playerId: { occurrenceId: occurrence.id, playerId: participant.playerId } }, update: { amountCents: participant.amountCents, paymentMethod: participant.paymentMethod, financialEntryId }, create: { occurrenceId: occurrence.id, playerId: participant.playerId, amountCents: participant.amountCents, paymentMethod: participant.paymentMethod, financialEntryId } });
    }
  });
  refreshCalendar();
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

  await prisma.court.create({
    data: { arenaId: auth.arenaId, name: parsed.data.name }
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
