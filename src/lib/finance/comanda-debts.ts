import { arenaWallClockToInstant } from "../calendar/arena-wall-clock";

export type ComandaDebtOwner = {
  playerId: string | null;
  scheduleParticipant: { playerId: string } | null;
  sale: { comanda: { playerId: string | null } | null } | null;
};

export function comandaDebtOwnerId(debt: ComandaDebtOwner) {
  return debt.playerId ?? debt.scheduleParticipant?.playerId ?? debt.sale?.comanda?.playerId ?? null;
}

export function selectedComandaDebtWhere(arenaId: string, ids: string[]) {
  return {
    id: { in: ids },
    arenaId,
    type: { in: ["REVENUE", "INCOME"] },
    status: { in: ["PENDING", "OVERDUE", "PARTIAL"] },
  };
}

/** Due dates use financial calendar days; undated imports fall back to creation time. */
export function listedComandaDebtWhere(arenaId: string, selectedDay: Date) {
  const nextDay = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), selectedDay.getDate() + 1);
  const dueBefore = new Date(Date.UTC(nextDay.getFullYear(), nextDay.getMonth(), nextDay.getDate()));
  return {
    arenaId,
    type: { in: ["REVENUE", "INCOME"] },
    status: { in: ["PENDING", "OVERDUE", "PARTIAL"] },
    OR: [
      { dueDate: { lt: dueBefore } },
      { dueDate: null, createdAt: { lt: arenaWallClockToInstant(nextDay) } },
    ],
  };
}
