import { z } from "zod";
import type { ArenaTransaction } from "@/lib/rls";
import { parseMoneyToCents } from "./inputs";

const inputSchema = z.object({
  teacherId: z.string().trim().min(1, "Selecione o professor."),
  name: z.string().trim().min(2, "Informe o nome do plano.").max(120, "Use até 120 caracteres no nome."),
  monthlyPrice: z.string().trim().min(1, "Informe o preço mensal."),
  classesPerMonth: z.coerce.number().int().min(0, "Quantidade de aulas inválida.").max(2147483647),
  notes: z.preprocess(value => value ?? "", z.string().trim().max(6000, "Use até 6.000 caracteres nas observações.")),
});

export async function createIndependentTeacherPlan(tx: ArenaTransaction, arenaId: string, actorId: string, input: unknown) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Revise os dados do plano.");
  const data = parsed.data;
  const monthlyPriceCents = parseMoneyToCents(data.monthlyPrice);
  if (monthlyPriceCents > 2147483647) throw new Error("Valor inválido.");
  const teacher = await tx.teacher.findFirst({ where: { id: data.teacherId, arenaId, active: true }, select: { id: true } });
  if (!teacher) throw new Error("Professor não encontrado nesta arena.");
  return tx.plan.create({ data: {
    arenaId, name: data.name, classesPerMonth: data.classesPerMonth, monthlyPriceCents, notes: data.notes,
    createdByUserId: actorId, updatedByUserId: actorId,
    teacherAssignments: { create: { arenaId, teacherId: teacher.id, monthlyPriceCents } },
  } });
}
