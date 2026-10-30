import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import { instantToArenaWallClock } from "@/lib/calendar/arena-wall-clock";
import { dateOnly } from "./plan-transfer-calculation";
import { applyDuePlanPriceChanges } from "./plan-price-changes";

export function academyToday(now = new Date()) {
  const local = instantToArenaWallClock(now);
  return dateOnly(`${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`);
}
export async function processPlanPriceChanges(now = new Date()) {
  const today = academyToday(now);
  const arenas = await prisma.arena.findMany({ select: { id: true } });
  let applied = 0; let failed = 0;
  for (const arena of arenas) {
    try { applied += await withArenaTransaction(arena.id, tx => applyDuePlanPriceChanges(tx, arena.id, today), { timeout: 60_000 }); }
    catch (error) {
      failed++; console.error("Could not apply scheduled plan prices", { arenaId: arena.id, error });
      try {
        await withArenaTransaction(arena.id, async tx => {
          const type = "PLAN_PRICE_CHANGE_REVIEW";
          if (!await tx.arenaNotification.findFirst({ where: { arenaId: arena.id, type, readAt: null }, select: { id: true } })) await tx.arenaNotification.create({ data: { arenaId: arena.id, type, title: "Reajuste pendente de conferência", message: "Não foi possível concluir um reajuste programado. Confira os planos e os vínculos dos alunos. O sistema tentará novamente automaticamente.", href: "/professores" } });
        });
      } catch { console.error("Could not record scheduled price review alert", { arenaId: arena.id }); }
    }
  }
  return { applied, failed };
}
let started = false;
export function startPlanPriceWorker() {
  if (started) return;
  started = true;
  let running = false; let lastDay = "";
  const tick = async () => {
    const day = academyToday().toISOString();
    if (running || lastDay === day) return;
    running = true;
    try { const result = await processPlanPriceChanges(); if (!result.failed) lastDay = day; }
    catch (error) { console.error("Scheduled plan price worker failed", error); }
    finally { running = false; }
  };
  void tick();
  setInterval(() => void tick(), 60_000).unref();
}
