import "server-only";
import { arenaDatabase } from "@/lib/arena-database";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
import { moneyToCents, timeToMinutes } from "@/lib/calendar/inputs";
import { copyWeeklyRule } from "@/lib/scheduling/copy-weekly-rule";
import { weeklyRangesOverlap } from "@/lib/scheduling/weekly-rule";
import { courtSchema, courtSettingsSchema, courtWeeklyRuleSchema, ensureBookingTypes, onlineBookingSettingsSchema, scheduleSettingsSchema, updateCourtWeeklyRuleSchema } from "@/lib/actions/calendar/shared";

export class CourtSettingsValidationError extends Error {}

export async function updateOnlineBookingSettingsAction(formData: FormData) {
  const auth = await requirePermission("calendar:settings:manage");
  const parsed = onlineBookingSettingsSchema.safeParse({
    layout: formData.get("layout"),
    leadTimeMinutes: formData.get("leadTimeMinutes"),
    overdueBlockDays: formData.get("overdueBlockDays"),
    whatsappMessage: formData.get("whatsappMessage")
  });
  if (!parsed.success) throw new CourtSettingsValidationError(parsed.error.issues[0]?.message ?? "Configuração inválida.");

  const arena = await withArenaTransaction(auth.arenaId, (tx) => tx.arena.update({
    where: { id: auth.arenaId },
    data: {
      onlineBookingLayout: parsed.data.layout,
      onlineBookingRequiresConfirmation: formData.get("requiresConfirmation") === "on",
      onlineBookingShowReserved: formData.get("showReserved") === "on",
      onlineBookingPaymentEnabled: formData.get("paymentOnlineEnabled") === "on",
      onlineBookingEnabled: formData.get("onlineBookingEnabled") === "on",
      onlineBookingWhatsappConfirmationEnabled: formData.get("whatsappConfirmationEnabled") === "on",
      onlineBookingLeadTimeMinutes: parsed.data.leadTimeMinutes,
      onlineBookingOverdueBlockDays: formData.get("overdueBlockEnabled") === "on" ? parsed.data.overdueBlockDays : null,
      onlineBookingWhatsappMessage: parsed.data.whatsappMessage
    },
    select: { slug: true }
  }));
  return {cacheSlugs:[arena.slug]};
}

export async function createBookingTypeAction(formData: FormData) {
  const auth = await requirePermission("arena:settings");
  const prisma = arenaDatabase(auth.arenaId);
  const name = z.string().trim().min(2, "Informe o tipo de reserva.").safeParse(formData.get("name"));
  if (!name.success) throw new CourtSettingsValidationError(name.error.issues[0]?.message ?? "Tipo inválido.");
  await ensureBookingTypes(auth.arenaId);
  await prisma.bookingType.create({ data: { arenaId: auth.arenaId, name: name.data } });

}

export async function createCourtWeeklyRuleAction(formData: FormData) {
  const auth = await requirePermission("calendar:settings:manage");
  const parsed = courtWeeklyRuleSchema.safeParse({
    courtId: formData.get("courtId"),
    weekday: formData.get("weekday"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    price: formData.get("price"),
    available: formData.get("available") ?? undefined
  });

  if (!parsed.success) {
    throw new CourtSettingsValidationError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const startsAtMinute = timeToMinutes(parsed.data.startTime);
  const endsAtMinute = timeToMinutes(parsed.data.endTime);
  if (startsAtMinute >= endsAtMinute) {
    throw new Error("O horário final deve ser posterior ao inicial.");
  }

  await withArenaTransaction(auth.arenaId, async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Court" WHERE "id" = ${parsed.data.courtId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    const prisma = tx;
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
  });
}

export async function updateCourtWeeklyRuleAction(formData: FormData) {
  const auth = await requirePermission("calendar:settings:manage");
  const parsed = updateCourtWeeklyRuleSchema.safeParse({
    ruleId: formData.get("ruleId"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    price: formData.get("price"),
    available: formData.get("available") ?? undefined
  });
  if (!parsed.success) throw new CourtSettingsValidationError(parsed.error.issues[0]?.message ?? "Dados inválidos.");

  const startsAtMinute = timeToMinutes(parsed.data.startTime);
  const endsAtMinute = timeToMinutes(parsed.data.endTime);
  if (startsAtMinute >= endsAtMinute) throw new Error("O horário final deve ser posterior ao inicial.");

  await withArenaTransaction(auth.arenaId, async tx => {
    const initial = await tx.courtWeeklyRule.findFirst({where:{id:parsed.data.ruleId,court:{arenaId:auth.arenaId}},select:{courtId:true}});
    if(!initial) throw new Error("Faixa não encontrada.");
    await tx.$queryRaw`SELECT "id" FROM "Court" WHERE "id" = ${initial.courtId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    const prisma = tx;
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
  });
}

export async function deleteCourtWeeklyRuleAction(formData: FormData) {
  const auth = await requirePermission("calendar:settings:manage");
  const ruleId = z.string().trim().min(1).safeParse(formData.get("ruleId"));
  if (!ruleId.success) {
    throw new Error("Regra inválida.");
  }

  await withArenaTransaction(auth.arenaId, async tx => {
    const initial = await tx.courtWeeklyRule.findFirst({where:{id:ruleId.data,court:{arenaId:auth.arenaId}},select:{courtId:true}});
    if(!initial) throw new Error("Regra não encontrada.");
    await tx.$queryRaw`SELECT "id" FROM "Court" WHERE "id" = ${initial.courtId} AND "arenaId" = ${auth.arenaId} FOR UPDATE`;
    const prisma = tx;
    const removed = await prisma.courtWeeklyRule.deleteMany({
      where: { id: ruleId.data, court: { arenaId: auth.arenaId } }
    });
    if (!removed.count) {
      throw new Error("Regra não encontrada.");
    }
  });
}

export async function copyCourtWeeklyRuleAction(formData: FormData) {
  const auth = await requirePermission("calendar:settings:manage");
  const parsed = z.object({ ruleId: z.string().trim().min(1), targetWeekday: z.union([z.string().regex(/^[0-6]$/).transform(Number), z.literal("ALL")]) }).safeParse({
    ruleId: formData.get("ruleId"), targetWeekday: formData.get("targetWeekday")
  });
  if (!parsed.success) return { error: "Selecione o dia de destino." };
  const result = await withArenaTransaction(auth.arenaId, tx => copyWeeklyRule(tx, auth.arenaId, parsed.data.ruleId, parsed.data.targetWeekday));
  if ("error" in result) return result;
  return result;
}

export async function updateScheduleSettingsAction(formData: FormData) {
  const auth = await requirePermission("calendar:settings:manage");
  const prisma = arenaDatabase(auth.arenaId);
  const parsed = scheduleSettingsSchema.safeParse({
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    slotMinutes: formData.get("slotMinutes")
  });

  if (!parsed.success) {
    throw new CourtSettingsValidationError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
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

}

export async function createCourtAction(formData: FormData) {
  const auth = await requirePermission("calendar:settings:manage");
  const parsed = courtSchema.safeParse({ name: formData.get("name") });

  if (!parsed.success) {
    throw new CourtSettingsValidationError(parsed.error.issues[0]?.message ?? "Dados invalidos.");
  }

  await withArenaTransaction(auth.arenaId, async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Arena" WHERE "id" = ${auth.arenaId} FOR UPDATE`;
    const prisma = tx;
    const lastCourt = await prisma.court.findFirst({ where: { arenaId: auth.arenaId }, orderBy: { displayOrder: "desc" }, select: { displayOrder: true } });
    await prisma.court.create({ data: { arenaId: auth.arenaId, name: parsed.data.name, displayOrder: (lastCourt?.displayOrder ?? -1) + 1 } });
  });
}

export async function updateCourtSettingsAction(formData: FormData) {
  const auth = await requirePermission("calendar:settings:manage");
  const prisma = arenaDatabase(auth.arenaId);
  const parsed = courtSettingsSchema.safeParse({
    courtId: formData.get("courtId"), color: formData.get("color"), onlineSlotMinutes: formData.get("onlineSlotMinutes"),
    onlineDurationMinutes: formData.getAll("onlineDurationMinutes")
  });
  if (!parsed.success) throw new CourtSettingsValidationError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  const durations = Array.from(new Set(parsed.data.onlineDurationMinutes)).sort((first, second) => first - second);
  if (durations.some((duration) => duration < parsed.data.onlineSlotMinutes || duration % parsed.data.onlineSlotMinutes !== 0)) {
    throw new Error("Cada duração deve respeitar o intervalo de reserva online.");
  }
  const updated = await prisma.court.updateMany({ where: { id: parsed.data.courtId, arenaId: auth.arenaId }, data: { color: parsed.data.color, onlineSlotMinutes: parsed.data.onlineSlotMinutes, onlineDurationMinutes: durations } });
  if (!updated.count) throw new Error("Quadra não encontrada.");
}

export async function moveCourtAction(formData: FormData) {
  const auth = await requirePermission("calendar:settings:manage");
  const parsed = z.object({ courtId: z.string().trim().min(1), direction: z.enum(["up", "down"]) }).safeParse({ courtId: formData.get("courtId"), direction: formData.get("direction") });
  if (!parsed.success) throw new Error("Movimentação inválida.");
  await withArenaTransaction(auth.arenaId, async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Court" WHERE "arenaId" = ${auth.arenaId} ORDER BY "id" FOR UPDATE`;
    const courts = await tx.court.findMany({ where: { arenaId: auth.arenaId }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] });
    const currentIndex = courts.findIndex((court) => court.id === parsed.data.courtId);
    const targetIndex = currentIndex + (parsed.data.direction === "up" ? -1 : 1);
    if (currentIndex < 0) throw new Error("Quadra não encontrada.");
    if (targetIndex < 0 || targetIndex >= courts.length) return;
    const current = courts[currentIndex];
    const target = courts[targetIndex];
    const first = await tx.court.updateMany({ where: { id: current.id, arenaId: auth.arenaId }, data: { displayOrder: target.displayOrder } });
    const second = await tx.court.updateMany({ where: { id: target.id, arenaId: auth.arenaId }, data: { displayOrder: current.displayOrder } });
    if (first.count !== 1 || second.count !== 1) throw new Error("Não foi possível reorganizar as quadras desta arena.");
  });
}

export async function copyCourtConfigurationAction(formData: FormData) {
  const auth = await requirePermission("calendar:settings:manage");
  const sourceCourtId = z.string().trim().min(1).safeParse(formData.get("sourceCourtId"));
  const targetCourtIds = Array.from(new Set(formData.getAll("targetCourtId").flatMap((value) => typeof value === "string" && value.length > 0 ? [value] : [])));
  if (!sourceCourtId.success || !targetCourtIds.length) throw new Error("Selecione ao menos uma quadra de destino.");
  const wanted = targetCourtIds.filter(id => id !== sourceCourtId.data);
  await withArenaTransaction(auth.arenaId, async (tx) => {
    const ids = [sourceCourtId.data,...wanted].sort();
    await tx.$queryRaw`SELECT "id" FROM "Court" WHERE "arenaId" = ${auth.arenaId} AND "id" = ANY(${ids}::text[]) ORDER BY "id" FOR UPDATE`;
    const source = await tx.court.findFirst({where:{id:sourceCourtId.data,arenaId:auth.arenaId},include:{weeklyRules:true}});
    const targets = await tx.court.findMany({where:{arenaId:auth.arenaId,id:{in:wanted}},select:{id:true}});
    if(!source || !targets.length || targets.length !== wanted.length) throw new Error("Quadras de origem ou destino inválidas.");
    for (const target of targets) {
      const updated = await tx.court.updateMany({ where: { id: target.id, arenaId: auth.arenaId }, data: { onlineSlotMinutes: source.onlineSlotMinutes, onlineDurationMinutes: source.onlineDurationMinutes } });
      if (updated.count !== 1) throw new Error("Quadra de destino não encontrada nesta arena.");
      await tx.courtWeeklyRule.deleteMany({ where: { courtId: target.id, court: { arenaId: auth.arenaId } } });
      if (source.weeklyRules.length) await tx.courtWeeklyRule.createMany({ data: source.weeklyRules.map((rule) => ({ courtId: target.id, weekday: rule.weekday, startsAtMinute: rule.startsAtMinute, endsAtMinute: rule.endsAtMinute, priceCents: rule.priceCents, available: rule.available })) });
    }
  });
}
