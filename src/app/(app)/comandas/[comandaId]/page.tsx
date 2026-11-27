import { getComandaDocument } from "@/lib/comandas/query";
import { BookingServices } from "@/components/comandas/booking-services";
import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireModuleView } from "@/lib/auth/guards";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default async function ComandaDetailsPage({ params }: { params: Promise<{ comandaId: string }> }) {
  const auth = await requireModuleView("pos");
  const { comandaId } = await params;
  const data=await getComandaDocument(auth.arenaId,comandaId,"detail");
  if(!data)notFound();
  const {comanda,bookingServices}=data;
  const total = comanda.items.reduce((sum, item) => sum + item.totalCents, 0) + bookingServices.reduce((sum, service) => sum + service.chargedAmountCents, 0);

  return <div className={viewStyles.stack_md_workspace_page_comanda_details_page}>
    <header className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-end tw:gap-2"><h1 className="tw:sr-only">{comanda.label}</h1><Link href="/financeiro/contas-a-receber" className={viewStyles.button}>Voltar a contas a receber</Link></header>
    <section className={viewStyles.section_card_comanda_receipt_card}><header><div><h2>Itens da comanda</h2><p>Registro preservado mesmo após a finalização.</p></div><strong>{money(total)}</strong></header><div className={viewStyles.comanda_receipt_items}>{comanda.items.map((item) => <div key={item.id}><span><b>{item.quantity}×</b> {item.product.name}{item.compositionLabel ? <small className="tw:block tw:text-[11px] tw:font-normal">{item.compositionLabel}</small> : null}</span><strong>{money(item.totalCents)}</strong></div>)}<BookingServices services={bookingServices} historical /></div></section>
    <section className={viewStyles.section_card_comanda_receipt_card}><header><div><h2>Lançamentos gerados</h2><p>Recebimentos e contas a receber vinculados a esta comanda.</p></div></header>{comanda.financialEntries.length ? <div className={viewStyles.comanda_receipt_items}>{comanda.financialEntries.map((entry) => <div key={entry.id}><span>{entry.status === "PAID" ? "Recebido" : "Conta a receber"}<small>{entry.paidAt ? `Pago em ${entry.paidAt}` : entry.dueDate ? `Vencimento ${entry.dueDate}` : ""}</small></span><strong>{money(entry.amountCents)}</strong></div>)}</div> : <p className={viewStyles.muted}>Nenhum lançamento financeiro foi gerado para esta comanda.</p>}</section>
  </div>;
}
