"use server";
import { requireModuleEdit } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
import { refreshAcademyRoutes } from "@/lib/academy/revalidation";
import { planTransferQuote, transferStudentPlan, type TransferInput } from "@/lib/academy/plan-transfer";
import { schedulePlanPriceChange } from "@/lib/academy/plan-price-changes";
import { academyToday } from "@/lib/academy/plan-price-worker";
import { dateOnly } from "@/lib/academy/plan-transfer-calculation";
import { parseMoneyToCents } from "@/lib/academy/inputs";
import { getMercadoPagoPayment, cancelMercadoPagoPayment } from "@/lib/payments/mercado-pago";
import { boletoCancellationDisposition } from "@/lib/payments/boleto-cancellation";
import { revalidatePath } from "next/cache";
function errorResult(error: unknown) {
  if (error && typeof error === "object" && "code" in error) return { error: "Não foi possível salvar. Verifique se já existe um reajuste nesta data e tente novamente." };
  const message = error instanceof Error ? error.message : "";
  return { error: /^(Aluno|Plano|O aluno|Os dados|Há |A assinatura|Informe|Data inválida|Revise|Vincule|A cobrança|Provedor|O reajuste|Reajuste)/.test(message) ? message : "Não foi possível concluir a operação. Confira as cobranças e tente novamente." };
}
function transferInput(form: FormData): TransferInput {
  return { teacherId: String(form.get("teacherId") ?? ""), subscriptionId: String(form.get("subscriptionId") ?? ""), targetPlanId: String(form.get("targetPlanId") ?? ""), newDueDate: String(form.get("newDueDate") ?? "") };
}
export async function previewPlanTransferAction(form: FormData) {
  const auth = await requireModuleEdit("teachers");
  try { const result = await withArenaTransaction(auth.arenaId, tx => planTransferQuote(tx, auth.arenaId, transferInput(form), academyToday())); return { quote: result.quote }; }
  catch (error) { return errorResult(error); }
}
export async function transferStudentPlanAction(form: FormData) {
  const auth = await requireModuleEdit("teachers");
  try {
    const input = transferInput(form);
    await withArenaTransaction(auth.arenaId, tx => transferStudentPlan(tx, auth.arenaId, input, String(form.get("quoteToken") ?? ""), academyToday(), async entry => {
      if (entry.onlineProvider !== "MERCADO_PAGO") throw new Error("Provedor da cobrança não suportado para transferência automática.");
      const payment = await getMercadoPagoPayment(auth.arenaId, entry.onlinePaymentId);
      const disposition = boletoCancellationDisposition(String(payment.status ?? ""));
      if (disposition === "preserve" || disposition === "unsupported") throw new Error("A cobrança foi paga ou mudou no provedor. Concilie o pagamento e confira a transferência novamente.");
      if (disposition === "cancel") await cancelMercadoPagoPayment(auth.arenaId, entry.onlinePaymentId);
    }), { timeout: 120_000 });
    refreshAcademyRoutes(); revalidatePath(`/professores/${input.teacherId}`); revalidatePath("/financeiro"); revalidatePath("/home"); return {};
  } catch (error) { return errorResult(error); }
}
export async function schedulePlanPriceChangeAction(form: FormData) {
  const auth = await requireModuleEdit("teachers");
  try {
    const teacherId = String(form.get("teacherId") ?? "");
    if (!String(form.get("amount") ?? "").trim()) throw new Error("Informe o novo preço mensal.");
    await withArenaTransaction(auth.arenaId, tx => schedulePlanPriceChange(tx, { arenaId: auth.arenaId, teacherId, planId: String(form.get("planId") ?? ""), amountCents: parseMoneyToCents(String(form.get("amount") ?? "")), effectiveDate: dateOnly(String(form.get("effectiveDate") ?? "")), userId: auth.userId }, academyToday()));
    refreshAcademyRoutes(); revalidatePath(`/professores/${teacherId}`); return {};
  } catch (error) { return errorResult(error); }
}
export async function cancelPlanPriceChangeAction(form: FormData) {
  const auth = await requireModuleEdit("teachers");
  try {
    await withArenaTransaction(auth.arenaId, async tx => {
      const change = await tx.planPriceChange.findFirst({ where: { id: String(form.get("changeId") ?? ""), arenaId: auth.arenaId, status: "SCHEDULED" }, include: { teacherPlan: { include: { plan: true } } } });
      if (!change) throw new Error("Reajuste não encontrado ou já aplicado.");
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`teacher-prices:${auth.arenaId}:${change.teacherPlan.teacherId}`}, 0))::text`;
      const updated = await tx.planPriceChange.updateMany({ where: { id: change.id, arenaId: auth.arenaId, status: "SCHEDULED" }, data: { status: "CANCELLED" } });
      if (!updated.count) throw new Error("O reajuste já foi aplicado. Atualize a página.");
      const subscriptions = await tx.studentSubscription.findMany({ where: { arenaId: auth.arenaId, planId: change.teacherPlan.planId, status: "ACTIVE", student: { teacherAssignments: { some: { teacherId: change.teacherPlan.teacherId, active: true } } } }, select: { student: { select: { playerId: true } } } });
      const players = [...new Set(subscriptions.map(s => s.student.playerId).filter((id): id is string => Boolean(id)))];
      if (players.length) await tx.playerNotification.createMany({ data: players.map(playerId => ({ playerId, type: "PLAN_PRICE_CHANGE", title: "Reajuste cancelado", message: `O reajuste programado de ${change.teacherPlan.plan.name} em ${change.effectiveDate.toLocaleDateString("pt-BR", { timeZone: "UTC" })} foi cancelado.`, href: "/home?section=lessons" })) });
    });
    refreshAcademyRoutes(); return {};
  } catch (error) { return errorResult(error); }
}
