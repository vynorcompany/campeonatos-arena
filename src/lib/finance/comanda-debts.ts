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
    status: { in: ["PENDING", "OVERDUE"] },
  };
}
