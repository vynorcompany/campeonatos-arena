"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAgencyAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { agencyBillingDay } from "@/lib/finance/agency-billing-dates";
import { ensureAgencyCheckout, issueAgencyInvoice } from "@/lib/services/agency-billing";

async function requireAgencyBillingAdmin() {
  const auth = await requireAgencyAccess();
  if (!(["ADMIN", "SUPER_ADMIN"] as string[]).includes(auth.systemRole)) throw new Error("Somente administradores da agência podem alterar planos e assinaturas.");
}

function priceToCents(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim().replace(/\s/g, "");
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const price = Number(normalized);
  if (!Number.isFinite(price) || price <= 0 || !/^\d+(?:[.,]\d{1,2})?$/.test(normalized)) throw new Error("Informe um valor mensal válido, maior que zero.");
  return Math.round(price * 100);
}

export async function saveAgencyPlanAction(formData: FormData) {
  await requireAgencyBillingAdmin();
  const parsed = z.object({ id: z.string().default(""), name: z.string().trim().min(2).max(80) }).safeParse({ id: formData.get("id") ?? "", name: formData.get("name") });
  if (!parsed.success) throw new Error("Informe o nome do plano.");
  const monthlyPriceCents = priceToCents(formData.get("monthlyPrice"));
  if (parsed.data.id) {
    const plan = await prisma.agencyPlan.findUnique({ where: { id: parsed.data.id } });
    if (!plan || plan.isTrial) throw new Error("Este plano não pode ser alterado.");
    await prisma.agencyPlan.update({ where: { id: plan.id }, data: { name: parsed.data.name, monthlyPriceCents } });
  } else {
    await prisma.agencyPlan.create({ data: { name: parsed.data.name, monthlyPriceCents } });
  }
  revalidatePath("/agencia/planos");
  revalidatePath("/agencia/financeiro");
  revalidatePath("/agencia");
}

export async function assignAgencyPlanAction(formData: FormData) {
  await requireAgencyBillingAdmin();
  const parsed = z.object({ arenaId: z.string().min(1), planId: z.string().min(1) }).safeParse({ arenaId: formData.get("arenaId"), planId: formData.get("planId") });
  if (!parsed.success) throw new Error("Selecione uma arena e um plano.");
  const [arena, plan, existing] = await Promise.all([
    prisma.arena.findUnique({ where: { id: parsed.data.arenaId }, select: { id: true } }),
    prisma.agencyPlan.findUnique({ where: { id: parsed.data.planId } }),
    prisma.agencySubscription.findUnique({ where: { arenaId: parsed.data.arenaId }, include: { plan: true } })
  ]);
  if (!arena || !plan || !plan.isActive) throw new Error("Arena ou plano indisponível.");
  if (existing?.planId === plan.id && existing.status === "ACTIVE") return;
  if (plan.isTrial && existing) throw new Error("O trial de 7 dias só pode ser utilizado uma vez por arena.");
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
  revalidatePath("/agencia/planos");
  revalidatePath("/agencia/financeiro");
  revalidatePath("/agencia");
}

export async function setAgencySubscriptionStatusAction(formData: FormData) {
  await requireAgencyBillingAdmin();
  const parsed = z.object({ subscriptionId: z.string().min(1), status: z.enum(["ACTIVE", "PAUSED", "CANCELED"]) }).safeParse({ subscriptionId: formData.get("subscriptionId"), status: formData.get("status") });
  if (!parsed.success) throw new Error("Assinatura ou status inválido.");
  const subscription = await prisma.agencySubscription.findUnique({ where: { id: parsed.data.subscriptionId }, include: { plan: true } });
  if (!subscription) throw new Error("Assinatura não encontrada.");
  if (subscription.plan.isTrial && subscription.trialEndsAt && subscription.trialEndsAt <= new Date() && parsed.data.status === "ACTIVE") throw new Error("O trial terminou. Selecione um plano pago para reativar a arena.");
  await prisma.agencySubscription.update({ where: { id: subscription.id }, data: { status: parsed.data.status, nextDueAt: parsed.data.status === "ACTIVE" && !subscription.plan.isTrial && !subscription.nextDueAt ? new Date() : undefined } });
  revalidatePath("/agencia/planos");
  revalidatePath("/agencia/financeiro");
  revalidatePath("/agencia");
}

export async function prepareAgencyInvoiceAction(formData: FormData) {
  await requireAgencyBillingAdmin();
  const invoiceId = String(formData.get("invoiceId") ?? "");
  if (!invoiceId) throw new Error("Fatura inválida.");
  const url = await ensureAgencyCheckout(invoiceId);
  if (!url) throw new Error("Conecte o Mercado Pago da agência ou verifique se esta fatura já foi paga.");
  revalidatePath("/agencia/planos");
}
