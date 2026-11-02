import type { Prisma } from "@prisma/client";
import { weeklyRangesOverlap } from "./weekly-rule";

type Rule = { id: string; weekday: number; startsAtMinute: number; endsAtMinute: number; priceCents: number; available: boolean };

// Replace only the copied interval. Preserve the destination's hours outside it.
export function planWeeklyRuleCopy(source: Rule, rules: Rule[], days: number[]) {
  const targets = [...new Set(days)].filter(day => day !== source.weekday);
  const removed = rules.filter(rule => targets.includes(rule.weekday) && weeklyRangesOverlap(source.startsAtMinute, source.endsAtMinute, rule.startsAtMinute, rule.endsAtMinute));
  const retained = removed.flatMap(rule => {
    const fragments: Omit<Rule, "id">[] = [];
    const { id: _id, ...data } = rule;
    if (rule.startsAtMinute < source.startsAtMinute) fragments.push({ ...data, endsAtMinute: source.startsAtMinute });
    if (rule.endsAtMinute > source.endsAtMinute) fragments.push({ ...data, startsAtMinute: source.endsAtMinute });
    return fragments;
  });
  return { removeIds: removed.map(rule => rule.id), create: [...retained, ...targets.map(weekday => ({ weekday, startsAtMinute: source.startsAtMinute, endsAtMinute: source.endsAtMinute, priceCents: source.priceCents, available: source.available }))] };
}

export async function copyWeeklyRule(tx: Prisma.TransactionClient, arenaId: string, ruleId: string, target: number | "ALL") {
  const initial = await tx.courtWeeklyRule.findFirst({ where: { id: ruleId, court: { arenaId } }, select: { courtId: true } });
  if (!initial) return { error: "Faixa não encontrada." };
  await tx.$queryRaw`SELECT id FROM "Court" WHERE id = ${initial.courtId} AND "arenaId" = ${arenaId} FOR UPDATE`;
  const rules = await tx.courtWeeklyRule.findMany({ where: { courtId: initial.courtId, court: { arenaId } } });
  const source = rules.find(rule => rule.id === ruleId);
  if (!source) return { error: "A faixa foi alterada. Atualize a página e tente novamente." };
  if (target === source.weekday) return { error: "Selecione outro dia de destino." };
  const plan = planWeeklyRuleCopy(source, rules, target === "ALL" ? [0, 1, 2, 3, 4, 5, 6] : [target]);
  await tx.courtWeeklyRule.deleteMany({ where: { id: { in: plan.removeIds }, courtId: initial.courtId, court: { arenaId } } });
  await tx.courtWeeklyRule.createMany({ data: plan.create.map(rule => ({ ...rule, courtId: initial.courtId })) });
  return { success: true };
}
