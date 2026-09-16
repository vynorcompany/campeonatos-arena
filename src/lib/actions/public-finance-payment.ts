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
  entryId: z.string().trim().min(1),
});

export async function startPublicFinancialEntryPaymentAction(formData: FormData) {
  const parsed = paymentSchema.safeParse({ arenaSlug: formData.get("arenaSlug"), entryId: formData.get("entryId") });
  if (!parsed.success) throw new Error("Cobrança inválida.");
  const auth = await requirePublicPlayerAuth(parsed.data.arenaSlug);
  const entry = await withArenaTransaction(auth.arenaId, (tx) => tx.financialEntry.findFirst({
    where: { id: parsed.data.entryId, arenaId: auth.arenaId, playerId: auth.playerId, type: "REVENUE", status: { in: ["PENDING", "OVERDUE"] } },
    include: { settlements: { select: { amountCents: true, interestCents: true } }, player: { select: { email: true } } }
  }));
  if (!entry) throw new Error("Este lançamento não está disponível para pagamento.");
  if (!entry.player?.email) throw new Error("Informe um e-mail no seu perfil antes de prosseguir com o pagamento.");
  const outstandingCents = getFinancialEntryBalance(entry.amountCents, entry.settlements, entry.status).outstandingCents;
  if (!outstandingCents) throw new Error("Este lançamento já está liquidado.");

  const returnUrl = `${env.appUrl ?? ""}/home?arena=${encodeURIComponent(parsed.data.arenaSlug)}&section=finance`;
  const charge = await createHostedCheckout({
    arenaId: auth.arenaId,
    amountCents: outstandingCents,
    description: entry.description || "Pagamento da arena",
    payerEmail: entry.player.email,
    externalReference: entry.id,
    returnUrl,
  });
  if (!charge.checkoutUrl) throw new Error("O Mercado Pago não retornou um link de pagamento.");
  await withArenaTransaction(auth.arenaId, (tx) => tx.financialEntry.update({
    where: { id: entry.id },
    data: { onlineProvider: "MERCADO_PAGO", onlinePaymentId: charge.paymentId, onlinePaymentUrl: charge.checkoutUrl, onlinePaymentPublishedAt: new Date() }
  }));
  revalidatePath(`/classificacao/${parsed.data.arenaSlug}`);
  revalidatePath("/home");
  return { checkoutUrl: charge.checkoutUrl };
}
