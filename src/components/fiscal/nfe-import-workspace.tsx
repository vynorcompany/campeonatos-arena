"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importNfeXmlAction, previewNfeXmlAction } from "@/lib/actions/fiscal";

type Product = { id: string; name: string; sku: string; costCents: number; priceCents: number };
type InvoiceItem = { code: string; description: string; quantity: number; unitCostCents: number };
type Preview = { invoice: { number: string; supplierName: string; totalCents: number; items: InvoiceItem[] }; products: Product[] };
type Mapping = { index: number; productId: string; name: string; sku: string; costCents: number; priceCents: number };
const moneyInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
const cents = (value: string) => Math.max(0, Math.round(Number(value.replace(/\./g, "").replace(",", ".")) * 100) || 0);

export function NfeImportWorkspace() {
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [message, setMessage] = useState("");
  const prepare = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return setMessage("Selecione o XML da NF-e.");
    setMessage("");
    const form = new FormData(); form.set("xml", file);
    startTransition(async () => {
      try {
        const result = await previewNfeXmlAction(form) as Preview;
        setPreview(result);
        setMappings(result.invoice.items.map((item, index) => {
          const matched = result.products.find((product) => item.code && product.sku === item.code) ?? result.products.find((product) => product.name.trim().toLocaleLowerCase("pt-BR") === item.description.trim().toLocaleLowerCase("pt-BR"));
          return { index, productId: matched?.id ?? "", name: matched?.name ?? item.description, sku: matched?.sku ?? item.code, costCents: item.unitCostCents, priceCents: matched?.priceCents ?? 0 };
        }));
      } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível ler a NF-e."); }
    });
  };
  const update = (index: number, changes: Partial<Mapping>) => setMappings((rows) => rows.map((row) => row.index === index ? { ...row, ...changes } : row));
  const selectProduct = (index: number, productId: string) => {
    const product = preview?.products.find((entry) => entry.id === productId);
    update(index, product ? { productId, name: product.name, sku: product.sku, priceCents: product.priceCents } : { productId: "" });
  };
  const confirm = () => {
    const file = fileRef.current?.files?.[0]; if (!file) return;
    setMessage(""); const form = new FormData(); form.set("xml", file); form.set("items", JSON.stringify(mappings));
    startTransition(async () => { try { await importNfeXmlAction(form); setPreview(null); if (fileRef.current) fileRef.current.value = ""; setMessage("NF-e importada e estoque atualizado."); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível concluir a importação."); } });
  };
  return <>
    <div className="nfe-import-start"><label className="field">Arquivo XML da NF-e<input ref={fileRef} type="file" accept=".xml,text/xml,application/xml" disabled={pending} onChange={prepare} /><small>Ao selecionar o XML, a conciliação dos produtos abre automaticamente. O estoque só será alterado após a confirmação.</small></label>{pending ? <span className="nfe-import-reading">Lendo XML…</span> : null}</div>
    {message ? <p className="form-feedback">{message}</p> : null}
    {preview ? <div className="command-modal-backdrop" onMouseDown={() => !pending && setPreview(null)}><section className="nfe-reconcile-modal" role="dialog" aria-modal="true" aria-label="Conciliar produtos da NF-e" onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow">CONCILIAÇÃO DE NF-E</p><h2>Revise os produtos antes de importar</h2><p>{preview.invoice.supplierName || "Fornecedor não informado"} · NF-e {preview.invoice.number || "sem número"}</p></div><button type="button" className="button button-small" disabled={pending} onClick={() => setPreview(null)}>Fechar</button></header><div className="nfe-reconcile-list">{preview.invoice.items.map((item, index) => { const row = mappings[index]; if (!row) return null; const margin = row.costCents ? Math.round(((row.priceCents - row.costCents) / row.costCents) * 100) : 0; return <article key={index}><div className="nfe-reconcile-item-title"><strong>{item.description}</strong><small>{item.quantity} {item.code ? `· cód. ${item.code}` : ""}</small></div><label>Estoque<select value={row.productId} onChange={(event) => selectProduct(index, event.target.value)}><option value="">Criar novo produto</option>{preview.products.map((product) => <option key={product.id} value={product.id}>{product.name}{product.sku ? ` · ${product.sku}` : ""}</option>)}</select></label><label>Custo (R$)<input value={moneyInput(row.costCents)} inputMode="decimal" onChange={(event) => update(index, { costCents: cents(event.target.value) })} /></label><label>Margem (%)<input value={margin} type="number" min="0" onChange={(event) => { const value = Math.max(0, Number(event.target.value) || 0); update(index, { priceCents: Math.round(row.costCents * (1 + value / 100)) }); }} /></label><label>Venda (R$)<input value={moneyInput(row.priceCents)} inputMode="decimal" onChange={(event) => update(index, { priceCents: cents(event.target.value) })} /></label></article>; })}</div><footer><strong>Total da NF-e: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(preview.invoice.totalCents / 100)}</strong><div><button type="button" className="button" disabled={pending} onClick={() => setPreview(null)}>Cancelar</button><button type="button" className="button button-primary" disabled={pending} onClick={confirm}>{pending ? "Importando..." : "Confirmar entrada no estoque"}</button></div></footer></section></div> : null}
  </>;
}
