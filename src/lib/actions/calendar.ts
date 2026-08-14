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
