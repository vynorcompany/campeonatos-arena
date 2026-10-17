import type { Prisma } from "@prisma/client";

const generatedPlanNotes: Prisma.StringFilter = {
  in: ["Ativação do plano de aulas.", "Renovação anual do plano de aulas."],
};

export function planRecurrenceOwnerWhere({ arenaId, planId, studentId, studentName, playerId, startedAt }: {
  arenaId: string;
  planId: string;
  studentId: string;
  studentName: string;
  playerId: string | null;
  startedAt?: Date;
}): Prisma.FinancialRecurrenceWhereInput {
  return {
    arenaId,
    planId,
    active: true,
    ...(startedAt ? { startsAt: startedAt } : {}),
    OR: [
      { studentId },
      {
        studentId: null,
        category: "Planos de aulas",
        ...(playerId ? { playerId } : { playerId: null, counterpartyName: studentName }),
        OR: [
          { notes: generatedPlanNotes },
          { notes: { startsWith: "Gerado pelo plano do professor." } },
        ],
      },
    ],
  };
}
