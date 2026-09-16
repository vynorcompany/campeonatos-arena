"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePublicPlayerAuth } from "@/lib/auth/player-session";
import { getFinancialEntryBalance } from "@/lib/finance/ledger";
import { createHostedCheckout } from "@/lib/payments/mercado-pago";
import { withArenaTransaction } from "@/lib/rls";
import { env } from "@/lib/env";

const paymentSchema = z.object({
  arenaSlug: z.string().trim().min(1),
});

export async function startPublicFinancialEntryPaymentAction(formData: FormData) {
  const parsed = paymentSchema.safeParse({ arenaSlug: formData.get("arenaSlug") });
  if (!parsed.success) throw new Error("Cobrança inválida.");
  const entryIds = [...new Set(formData.getAll("entryId").map((value) => String(value).trim()).filter(Boolean))];
  if (!entryIds.length) throw new Error("Selecione ao menos um débito para pagar.");
  const auth = await requirePublicPlayerAuth(parsed.data.arenaSlug);
  const entries = await withArenaTransaction(auth.arenaId, (tx) => tx.financialEntry.findMany({
    where: { id: { in: entryIds }, arenaId: auth.arenaId, playerId: auth.playerId, type: "REVENUE", status: { in: ["PENDING", "OVERDUE"] } },
    include: { settlements: { select: { amountCents: true, interestCents: true } }, player: { select: { email: true } } }
  }));
  if (entries.length !== entryIds.length) throw new Error("Um ou mais lançamentos não estão disponíveis para pagamento.");
  if (!entries[0]?.player?.email) throw new Error("Informe um e-mail no seu perfil antes de prosseguir com o pagamento.");
  const items = entries.map((entry) => ({ entry, amountCents: getFinancialEntryBalance(entry.amountCents, entry.settlements, entry.status).outstandingCents })).filter((item) => item.amountCents > 0);
  if (items.length !== entries.length) throw new Error("Um ou mais lançamentos já foram liquidados.");
  const amountCents = items.reduce((total, item) => total + item.amountCents, 0);
  const checkout = await withArenaTransaction(auth.arenaId, (tx) => tx.onlinePaymentCheckout.create({ data: { arenaId: auth.arenaId, playerId: auth.playerId, amountCents, items: { create: items.map((item) => ({ financialEntryId: item.entry.id, amountCents: item.amountCents })) } } }));

  const returnUrl = `${env.appUrl ?? ""}/home?arena=${encodeURIComponent(parsed.data.arenaSlug)}&section=finance`;
  let charge;
  try {
    charge = await createHostedCheckout({ arenaId: auth.arenaId, amountCents, description: entryIds.length === 1 ? items[0].entry.description || "Pagamento da arena" : `${entryIds.length} débitos da arena`, payerEmail: entries[0].player!.email, externalReference: checkout.id, returnUrl });
  } catch (error) {
    await withArenaTransaction(auth.arenaId, (tx) => tx.onlinePaymentCheckout.update({ where: { id: checkout.id }, data: { status: "FAILED" } }));
    throw error;
  }
  if (!charge.checkoutUrl) {
    await withArenaTransaction(auth.arenaId, (tx) => tx.onlinePaymentCheckout.update({ where: { id: checkout.id }, data: { status: "FAILED" } }));
    throw new Error("O Mercado Pago não retornou um link de pagamento.");
  }
  await withArenaTransaction(auth.arenaId, (tx) => tx.onlinePaymentCheckout.update({ where: { id: checkout.id }, data: { mercadoPagoPaymentId: charge.paymentId, checkoutUrl: charge.checkoutUrl } }));
  revalidatePath(`/classificacao/${parsed.data.arenaSlug}`);
  revalidatePath("/home");
  return { checkoutUrl: charge.checkoutUrl };
}
