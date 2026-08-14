"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleEdit } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

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
