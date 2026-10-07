import Link from "next/link";
import { NfeImportWorkspace } from "./nfe-import-workspace";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";

type Invoice = { id: string; number: string; series: string; supplierName: string; issuedAt: Date | null; totalCents: number; _count: { items: number } };
const columns = "tw:grid-cols-[minmax(0,1fr)_130px_100px_140px] tw:viewport-760:grid-cols-[minmax(0,1fr)_auto] tw:viewport-440:grid-cols-1";
export function InvoicesWorkspace({ documents }: { documents: Invoice[] }) {
  return <section className={ui.page}><h1 className="tw:sr-only">Notas Fiscais</h1>
    <div className={ui.toolbar}><p>{documents.length} notas importadas · compras e entradas no estoque</p><Link href="/financeiro/configuracoes/notas-fiscais?secao=emissao" className={ui.secondary}>Configurações de Emissão</Link></div>
    <details className={`${ui.panel} tw:open:[&_summary]:mb-4`}><summary className={`${ui.primary} tw:w-fit tw:cursor-pointer tw:list-none`}>Importar NF-e</summary><NfeImportWorkspace /></details>
    <div className={ui.list}><div className={`${ui.head} ${columns}`}><span>Documento / fornecedor</span><span>Emissão</span><span>Itens</span><span>Total</span></div>{documents.map(document => <article key={document.id} className={`${ui.row} ${columns}`}><div><strong>NF-e {document.number || "sem número"}</strong><small>{document.supplierName || "Fornecedor não informado"} · série {document.series || "—"}</small></div><span className="tw:text-sm">{document.issuedAt ? new Intl.DateTimeFormat("pt-BR").format(document.issuedAt) : "Sem data"}</span><span className="tw:text-sm">{document._count.items} item(ns)</span><strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(document.totalCents / 100)}</strong></article>)}{!documents.length ? <p className={ui.empty}>Nenhuma nota fiscal importada.</p> : null}</div>
  </section>;
}
