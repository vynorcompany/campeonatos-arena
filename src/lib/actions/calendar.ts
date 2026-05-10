"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleEdit } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const createCalendarEventSchema = z.object({
  eventType: z.string().trim().min(1),
  title: z.string().trim().min(2),
  scheduledAt: z.string().trim().min(1),
  durationMinutes: z.coerce.number().int().min(15).max(720).default(60),
  notes: z.string().trim().default("")
});

export async function createCalendarEventAction(formData: FormData) {
  const auth = await requireModuleEdit("calendar");
  const parsed = createCalendarEventSchema.safeParse({
    eventType: formData.get("eventType"),
    title: formData.get("title"),
    scheduledAt: formData.get("scheduledAt"),
    durationMinutes: formData.get("durationMinutes"),
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados invalidos.");
  }

  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error("Data e hora invalidas.");
  }

  await prisma.lesson.create({
    data: {
      arenaId: auth.arenaId,
      title: `[${parsed.data.eventType}] ${parsed.data.title}`,
      scheduledAt,
      durationMinutes: parsed.data.durationMinutes,
      notes: parsed.data.notes,
      status: "SCHEDULED"
    }
  });

  revalidatePath("/calendario");
}
