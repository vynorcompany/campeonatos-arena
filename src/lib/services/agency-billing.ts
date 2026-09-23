import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { setArenaRlsContext, withArenaTransaction } from "@/lib/rls";
import { getAgencyMercadoPagoToken } from "@/lib/payments/agency-mercado-pago-token";
import { env } from "@/lib/env";
import { agencyInvoicePeriod, nextAgencyDueDate } from "@/lib/finance/agency-billing-dates";

export async function issueAgencyInvoice(subscriptionId: string, now = new Date()) {
  const subscription = await prisma.agencySubscription.findUnique({ where: { id: subscriptionId }, include: { plan: true, arena: true } });
  if (!subscription || subscription.status !== "ACTIVE" || subscription.plan.isTrial || !subscription.nextDueAt || subscription.nextDueAt > now) return null;
  const dueAt = subscription.nextDueAt;
  const period = agencyInvoicePeriod(dueAt);
  const invoice = await prisma.$transaction(async (tx) => {
    await setArenaRlsContext(tx, subscription.arenaId);
    const fresh = await tx.agencySubscription.findUnique({ where: { id: subscriptionId }, include: { plan: true } });
    if (!fresh || fresh.status !== "ACTIVE" || fresh.plan.isTrial || !fresh.nextDueAt || fresh.nextDueAt > now) return null;
    const existing = await tx.agencyInvoice.findUnique({ where: { subscriptionId_period: { subscriptionId, period } } });
    if (existing) {
      await tx.agencySubscription.update({ where: { id: subscriptionId }, data: { nextDueAt: nextAgencyDueDate(fresh.nextDueAt, fresh.billingDay) } });
      return existing;
    }
    const amountCents = fresh.plan.monthlyPriceCents;
    const entry = await tx.financialEntry.create({ data: {
      arenaId: fresh.arenaId,
      type: "EXPENSE",
      category: "Assinatura do sistema",
      description: `Assinatura da plataforma · ${fresh.plan.name} · ${period}`,
      counterpartyName: "Arena Padel Manager",
      amountCents,
      dueDate: fresh.nextDueAt,
      status: "PENDING",
      source: "AGENCY_SUBSCRIPTION",
      externalReference: `agency:${fresh.id}:${period}`
    } });
    const created = await tx.agencyInvoice.create({ data: {
      subscriptionId,
      arenaId: fresh.arenaId,
      period,
      amountCents,
      dueAt: fresh.nextDueAt,
      financialEntryId: entry.id
    } });
    await tx.agencySubscription.update({ where: { id: subscriptionId }, data: { nextDueAt: nextAgencyDueDate(fresh.nextDueAt, fresh.billingDay) } });
    return created;
  }).catch(async (error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return prisma.agencyInvoice.findUnique({ where: { subscriptionId_period: { subscriptionId, period } } });
    throw error;
  });
  if (invoice) await ensureAgencyCheckout(invoice.id).catch((error) => console.error("Agency checkout failed", error));
  return invoice;
}

export async function ensureAgencyCheckout(invoiceId: string) {
  const [invoice, connection] = await Promise.all([
    prisma.agencyInvoice.findUnique({ where: { id: invoiceId }, include: { arena: true } }),
    prisma.agencyPaymentConnection.findUnique({ where: { id: "platform" } })
  ]);
  if (!invoice || invoice.status !== "PENDING" || invoice.checkoutUrl || !connection || connection.status !== "CONNECTED" || !env.appUrl) return null;
  const accessToken = await getAgencyMercadoPagoToken();
  const backUrl = new URL("/financeiro/contas-a-pagar", env.appUrl).toString();
  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "X-Idempotency-Key": `agency-${invoice.id}` },
    body: JSON.stringify({
      items: [{ id: invoice.id, title: `Assinatura Arena Padel Manager · ${invoice.period}`, quantity: 1, currency_id: "BRL", unit_price: invoice.amountCents / 100 }],
      external_reference: invoice.id,
      payer: invoice.arena.email ? { email: invoice.arena.email } : undefined,
      back_urls: { success: backUrl, pending: backUrl, failure: backUrl },
      notification_url: new URL("/api/payments/mercado-pago/agency/webhook", env.appUrl).toString()
    }),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`O Mercado Pago recusou a fatura da agência (${response.status}).`);
  const preference = await response.json() as { init_point?: string; id?: string };
  if (!preference.init_point) throw new Error("O Mercado Pago não retornou o link de pagamento da fatura.");
  await withArenaTransaction(invoice.arenaId, async (tx) => {
    const updated = await tx.agencyInvoice.updateMany({ where: { id: invoice.id, status: "PENDING", checkoutUrl: "" }, data: { checkoutUrl: preference.init_point } });
    if (updated.count && invoice.financialEntryId) await tx.financialEntry.update({ where: { id: invoice.financialEntryId }, data: { onlineProvider: "MERCADO_PAGO", onlinePaymentUrl: preference.init_point, onlinePaymentPublishedAt: new Date() } });
  });
  return preference.init_point;
}

export async function issueDueAgencyInvoices(now = new Date()) {
  await prisma.agencySubscription.updateMany({ where: { status: "ACTIVE", trialEndsAt: { lte: now }, plan: { isTrial: true } }, data: { status: "EXPIRED" } });
  const subscriptions = await prisma.agencySubscription.findMany({ where: { status: "ACTIVE", nextDueAt: { lte: now }, plan: { isTrial: false } }, select: { id: true }, take: 200 });
  let issued = 0;
  for (const subscription of subscriptions) if (await issueAgencyInvoice(subscription.id, now)) issued++;
  const pending = await prisma.agencyInvoice.findMany({ where: { status: "PENDING", checkoutUrl: "" }, select: { id: true }, take: 200 });
  for (const invoice of pending) await ensureAgencyCheckout(invoice.id).catch((error) => console.error("Agency checkout retry failed", error));
  return { agencyInvoicesIssued: issued, agencyCheckoutRetries: pending.length };
}
