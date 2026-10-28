import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModuleView } from "@/lib/auth/guards";
import { arenaDatabase } from "@/lib/arena-database";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { z } from "zod";
const snapshot = z.object({ title: z.string(), reason: z.string(), items: z.array(z.object({ productId: z.string(), name: z.string(), sku: z.string(), systemQuantity: z.number().int(), countedQuantity: z.number().int(), difference: z.number().int() })) });
export default async function BalanceDetail({ params }: { params: Promise<{ balanceId: string }> }) {
  const auth = await requireModuleView("stock"); const { balanceId } = await params;
  const balance = await arenaDatabase(auth.arenaId).auditEvent.findFirst({ where: { id: balanceId, arenaId: auth.arenaId, action: "STOCK_BALANCE_COMPLETED" } });
  if (!balance) notFound(); const parsed = snapshot.safeParse(balance.details); if (!parsed.success) notFound();
  const { title, reason, items } = parsed.data;
  return <section className={ui.page}><header className={ui.toolbar}><div><h1>{title}</h1><p>{balance.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · {balance.actorName}</p></div><Link href="/pdv/balanco" className={ui.secondary}>Voltar aos balanços</Link></header>{reason ? <p className="tw:text-sm tw:text-[#354f70]">{reason}</p> : null}<div className={ui.list}><div className={`${ui.head} tw:grid-cols-[minmax(0,1fr)_100px_100px_100px]`}><span>Produto</span><span>Sistema</span><span>Contado</span><span>Diferença</span></div>{items.map(item => <article key={item.productId} className={`${ui.row} tw:grid-cols-[minmax(0,1fr)_100px_100px_100px] tw:viewport-760:grid-cols-1`}><div><strong>{item.name}</strong><small>{item.sku}</small></div><span>Sistema: {item.systemQuantity}</span><span>Contado: {item.countedQuantity}</span><strong className={item.difference < 0 ? "tw:text-red-700" : item.difference > 0 ? "tw:text-emerald-700" : "tw:text-[#354f70]"}>{item.difference > 0 ? "+" : ""}{item.difference}</strong></article>)}</div></section>;
}
