import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { withArenaTransaction } from "@/lib/rls";
import { getAgencyMercadoPagoToken } from "@/lib/payments/agency-mercado-pago-token";
import { verifyMercadoPagoWebhookSignature } from "@/lib/payments/mercado-pago-webhook-signature";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const url = new URL(request.url);
  const paymentId = String(body?.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");
  if (!paymentId) return NextResponse.json({ ok: true, ignored: "missing_payment_id" });
  if (env.mercadoPagoWebhookSecret && !verifyMercadoPagoWebhookSignature({ secret: env.mercadoPagoWebhookSecret, signatureHeader: request.headers.get("x-signature"), requestId: request.headers.get("x-request-id"), dataId: paymentId })) return NextResponse.json({ ok: false }, { status: 401 });
  const accessToken = await getAgencyMercadoPagoToken().catch(() => null);
  if (!accessToken) return NextResponse.json({ ok: false }, { status: 503 });
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) return NextResponse.json({ ok: false }, { status: 502 });
  const payment = await response.json() as { id?: string | number; status?: string; external_reference?: string; transaction_amount?: number; currency_id?: string };
  const invoice = await prisma.agencyInvoice.findUnique({ where: { id: String(payment.external_reference ?? "") } });
  if (!invoice) return NextResponse.json({ ok: true, ignored: "unknown_invoice" });
  if (payment.currency_id !== "BRL" || Math.round(Number(payment.transaction_amount ?? 0) * 100) !== invoice.amountCents) return NextResponse.json({ ok: false, error: "amount_mismatch" }, { status: 409 });
  if (payment.status !== "approved") return NextResponse.json({ ok: true, ignored: "not_approved" });
  await withArenaTransaction(invoice.arenaId, async (tx) => {
    const current = await tx.agencyInvoice.findUnique({ where: { id: invoice.id } });
    if (!current || current.status === "PAID" || !current.financialEntryId) return;
    const claimed = await tx.agencyInvoice.updateMany({ where: { id: current.id, status: "PENDING" }, data: { status: "PROCESSING" } });
    if (!claimed.count) return;
    const paidAt = new Date();
    await tx.financialSettlement.create({ data: { arenaId: current.arenaId, financialEntryId: current.financialEntryId, amountCents: current.amountCents, paymentMethod: "Mercado Pago", paidAt, notes: `Fatura da agência ${current.period} · pagamento ${String(payment.id ?? paymentId)}` } });
    await tx.financialEntry.update({ where: { id: current.financialEntryId }, data: { status: "PAID", paidAt, paymentMethod: "Mercado Pago", onlinePaymentId: String(payment.id ?? paymentId) } });
    await tx.agencyInvoice.update({ where: { id: current.id }, data: { status: "PAID", paidAt, providerPaymentId: String(payment.id ?? paymentId) } });
  });
  return NextResponse.json({ ok: true });
}
