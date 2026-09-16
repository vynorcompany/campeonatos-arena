import { notFound, redirect } from "next/navigation";
import { getPublicPlayerAuth } from "@/lib/auth/player-session";
import { withArenaTransaction } from "@/lib/rls";

export default async function OpenPublicChargePage({ params }: { params: { arenaSlug: string; entryId: string } }) {
  const auth = await getPublicPlayerAuth(params.arenaSlug);
  if (!auth) redirect(`/classificacao/${encodeURIComponent(params.arenaSlug)}?section=finance`);
  const entry = await withArenaTransaction(auth.arenaId, async (tx) => {
    const current = await tx.financialEntry.findFirst({ where: { id: params.entryId, arenaId: auth.arenaId, playerId: auth.playerId, type: "REVENUE", status: { in: ["PENDING", "OVERDUE"] }, onlinePaymentUrl: { not: "" } }, select: { onlinePaymentUrl: true, onlinePaymentViewedAt: true } });
    if (current && !current.onlinePaymentViewedAt) await tx.financialEntry.update({ where: { id: params.entryId }, data: { onlinePaymentViewedAt: new Date() } });
    return current;
  });
  if (!entry) notFound();
  redirect(entry.onlinePaymentUrl);
}
