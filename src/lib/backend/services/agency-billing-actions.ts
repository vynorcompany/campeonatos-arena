import "server-only";

export class AgencyBillingOperationError extends Error {}
type Refresh = () => void;
import { z } from "zod";
import { requireAgencyAccess } from "@/lib/auth/guards";
import { agencyDatabase as prisma } from "@/lib/auth/database";
import { agencyBillingDay } from "@/lib/finance/agency-billing-dates";
import { ensureAgencyCheckout, issueAgencyInvoice } from "@/lib/services/agency-billing";

async function requireAgencyBillingAdmin() {
  const auth = await requireAgencyAccess();
  if (!(["ADMIN", "SUPER_ADMIN"] as string[]).includes(auth.systemRole)) throw new AgencyBillingOperationError("Somente administradores da agência podem alterar planos e assinaturas.");
}

function priceToCents(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim().replace(/\s/g, "");
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const price = Number(normalized);
  if (!Number.isFinite(price) || price <= 0 || !/^\d+(?:[.,]\d{1,2})?$/.test(normalized)) throw new AgencyBillingOperationError("Informe um valor mensal válido, maior que zero.");
  return Math.round(price * 100);
}

export async function saveAgencyPlanAction(formData: FormData, refresh: Refresh = () => {}) {
  await requireAgencyBillingAdmin();
  const parsed = z.object({ id: z.string().default(""), name: z.string().trim().min(2).max(80) }).safeParse({ id: formData.get("id") ?? "", name: formData.get("name") });
  if (!parsed.success) throw new AgencyBillingOperationError("Informe o nome do plano.");
  const monthlyPriceCents = priceToCents(formData.get("monthlyPrice"));
  if (parsed.data.id) {
    const plan = await prisma.agencyPlan.findUnique({ where: { id: parsed.data.id } });
    if (!plan || plan.isTrial) throw new AgencyBillingOperationError("Este plano não pode ser alterado.");
    await prisma.agencyPlan.update({ where: { id: plan.id }, data: { name: parsed.data.name, monthlyPriceCents } });
  } else {
    await prisma.agencyPlan.create({ data: { name: parsed.data.name, monthlyPriceCents } });
  }
  refresh();
}

export async function assignAgencyPlanAction(formData: FormData, refresh: Refresh = () => {}) {
  await requireAgencyBillingAdmin();
  const parsed = z.object({ arenaId: z.string().min(1), planId: z.string().min(1) }).safeParse({ arenaId: formData.get("arenaId"), planId: formData.get("planId") });
  if (!parsed.success) throw new AgencyBillingOperationError("Selecione uma arena e um plano.");
  const [arena, plan, existing] = await Promise.all([
    prisma.arena.findUnique({ where: { id: parsed.data.arenaId }, select: { id: true } }),
    prisma.agencyPlan.findUnique({ where: { id: parsed.data.planId } }),
    prisma.agencySubscription.findUnique({ where: { arenaId: parsed.data.arenaId }, include: { plan: true } })
  ]);
  if (!arena || !plan || !plan.isActive) throw new AgencyBillingOperationError("Arena ou plano indisponível.");
  if (existing?.planId === plan.id && existing.status === "ACTIVE") return;
  if (plan.isTrial && existing) throw new AgencyBillingOperationError("O trial de 7 dias só pode ser utilizado uma vez por arena.");
  const now = new Date();
  const trialEndsAt = plan.isTrial ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) : existing?.plan.isTrial && existing.trialEndsAt && existing.trialEndsAt > now ? existing.trialEndsAt : null;
  const nextDueAt = plan.isTrial ? null : existing?.plan.isTrial && existing.trialEndsAt && existing.trialEndsAt > now ? existing.trialEndsAt : existing?.nextDueAt && existing.nextDueAt > now ? existing.nextDueAt : now;
  const billingDay = existing?.plan.isTrial ? agencyBillingDay(nextDueAt ?? now) : existing?.billingDay ?? agencyBillingDay(nextDueAt ?? now);
  const subscription = await prisma.agencySubscription.upsert({
    where: { arenaId: arena.id },
    create: { arenaId: arena.id, planId: plan.id, status: "ACTIVE", startsAt: now, trialEndsAt, nextDueAt, billingDay },
    update: { planId: plan.id, status: "ACTIVE", startsAt: now, trialEndsAt, nextDueAt, billingDay }
  });
  if (!plan.isTrial) await issueAgencyInvoice(subscription.id);
  refresh();
}

export async function setAgencySubscriptionStatusAction(formData: FormData, refresh: Refresh = () => {}) {
  await requireAgencyBillingAdmin();
  const parsed = z.object({ subscriptionId: z.string().min(1), status: z.enum(["ACTIVE", "PAUSED", "CANCELED"]) }).safeParse({ subscriptionId: formData.get("subscriptionId"), status: formData.get("status") });
  if (!parsed.success) throw new AgencyBillingOperationError("Assinatura ou status inválido.");
  const subscription = await prisma.agencySubscription.findUnique({ where: { id: parsed.data.subscriptionId }, include: { plan: true } });
  if (!subscription) throw new AgencyBillingOperationError("Assinatura não encontrada.");
  if (subscription.plan.isTrial && subscription.trialEndsAt && subscription.trialEndsAt <= new Date() && parsed.data.status === "ACTIVE") throw new AgencyBillingOperationError("O trial terminou. Selecione um plano pago para reativar a arena.");
  await prisma.agencySubscription.update({ where: { id: subscription.id }, data: { status: parsed.data.status, nextDueAt: parsed.data.status === "ACTIVE" && !subscription.plan.isTrial && !subscription.nextDueAt ? new Date() : undefined } });
  refresh();
}

export async function prepareAgencyInvoiceAction(formData: FormData, refresh: Refresh = () => {}) {
  await requireAgencyBillingAdmin();
  const invoiceId = String(formData.get("invoiceId") ?? "");
  if (!invoiceId) throw new AgencyBillingOperationError("Fatura inválida.");
  const url = await ensureAgencyCheckout(invoiceId);
  if (!url) return { error: "Conecte o Mercado Pago da agência ou verifique se esta fatura já foi paga." };
  refresh();
}

export async function saveAgencyBillingGraceAction(formData: FormData, refresh: Refresh = () => {}) {
  await requireAgencyBillingAdmin();
  const enabled = formData.get("enabled") === "on";
  const parsed = z.coerce.number().int().min(0).max(60).safeParse(formData.get("graceDays"));
  if (enabled && !parsed.success) throw new AgencyBillingOperationError("Informe um prazo de 0 a 60 dias.");
  await prisma.agencyPaymentConnection.upsert({
    where: { id: "platform" },
    create: { id: "platform", graceDays: enabled ? parsed.data : null },
    update: { graceDays: enabled ? parsed.data : null }
  });
  refresh();
}
