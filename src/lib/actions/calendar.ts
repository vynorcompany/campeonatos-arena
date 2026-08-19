"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleEdit } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import {
  moneyToCents,
  parseBookingParticipants,
  parseCourtIds,
  parseScheduledAt,
  timeToMinutes
} from "@/lib/calendar/inputs";
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
  courtIds: z.string().trim().default("[]"),
  title: z.string().trim().min(2),
  startsAt: z.string().trim().min(1),
  durationMinutes: z.coerce.number().int().min(15).max(720),
  bookingTypeName: z.string().trim().min(1).default("Reserva"),
  teacherId: z.string().trim().default(""),
  notes: z.string().trim().default(""),
  participants: z.string().trim().default("[]")
});

const DEFAULT_BOOKING_TYPES = ["Aula", "Aula fixa", "Plano", "Super 12", "Liga", "Reserva"];

function refreshCalendar() {
  revalidatePath("/calendario");
  revalidatePath("/agenda");
  revalidatePath("/agenda/configuracao");
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
    occurrenceId: formData.get("occurrenceId"), courtId: formData.get("courtId"), courtIds: formData.get("courtIds"), title: formData.get("title"),
    startsAt: formData.get("startsAt"), durationMinutes: formData.get("durationMinutes"), bookingTypeName: formData.get("bookingTypeName"),
    teacherId: formData.get("teacherId"), notes: formData.get("notes"), participants: formData.get("participants")
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const startsAt = parseScheduledAt(parsed.data.startsAt);
  const endsAt = new Date(startsAt.getTime() + parsed.data.durationMinutes * 60_000);
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
  const conflicts = await prisma.scheduleOccurrence.findFirst({ where: {
    arenaId: auth.arenaId, id: parsed.data.occurrenceId ? { not: parsed.data.occurrenceId } : undefined,
    status: { not: "CANCELED" }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt }, occurrenceCourts: { some: { courtId: { in: courtIds } } }
  } });
  if (conflicts) throw new Error("Já existe um agendamento nessa quadra para este horário.");

  await prisma.$transaction(async (tx) => {
    const occurrence = parsed.data.occurrenceId
      ? await tx.scheduleOccurrence.update({ where: { id: parsed.data.occurrenceId, arenaId: auth.arenaId }, data: { title: parsed.data.title, startsAt, endsAt, bookingTypeName: parsed.data.bookingTypeName, teacherId: parsed.data.teacherId || null, notes: parsed.data.notes, occurrenceCourts: { deleteMany: {}, create: courtIds.map((courtId) => ({ courtId })) } } })
      : await tx.scheduleOccurrence.create({ data: { arenaId: auth.arenaId, sourceType: "BOOKING", title: parsed.data.title, startsAt, endsAt, bookingTypeName: parsed.data.bookingTypeName, teacherId: parsed.data.teacherId || null, notes: parsed.data.notes, occurrenceCourts: { create: courtIds.map((courtId) => ({ courtId })) } } });
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
