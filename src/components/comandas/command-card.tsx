"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addComandaProductAction, finishComandaAction, updateComandaItemQuantityAction } from "@/lib/actions/comanda";

type Product = { id: string; name: string; priceCents: number; stockQuantity: number };
type CommandItem = { id: string; quantity: number; totalCents: number; product: { name: string } };

function money(value: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100); }

export function CommandCard({ comanda, products }: { comanda: { id: string; code: string; label: string; type: string; playerName?: string | null; items: CommandItem[] }; products: Product[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [productId, setProductId] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [message, setMessage] = useState("");
  const totalCents = comanda.items.reduce((total, item) => total + item.totalCents, 0);
  const run = (operation: () => Promise<void>) => startTransition(async () => { try { setMessage(""); await operation(); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a comanda."); } });
  const form = (values: Record<string, string>) => { const data = new FormData(); Object.entries(values).forEach(([key, value]) => data.set(key, value)); return data; };

  return <article className="command-card">
    <header><div><strong>{comanda.label}</strong><span>{comanda.type === "AVULSA" ? "Avulsa" : comanda.playerName ?? "Cliente"}</span></div><small>{comanda.code}</small></header>
    <div className="command-items">{comanda.items.length ? comanda.items.map((item) => <div className="command-item" key={item.id}><span><b>{item.quantity}×</b> {item.product.name}</span><strong>{money(item.totalCents)}</strong><div className="command-item-controls"><button type="button" aria-label={`Diminuir ${item.product.name}`} onClick={() => run(() => updateComandaItemQuantityAction(form({ itemId: item.id, delta: "-1" })))} disabled={pending}>−</button><button type="button" aria-label={`Aumentar ${item.product.name}`} onClick={() => run(() => updateComandaItemQuantityAction(form({ itemId: item.id, delta: "1" })))} disabled={pending}>+</button></div></div>) : <p className="command-items-empty">Nenhum produto inserido.</p>}</div>
    {pickerOpen ? <div className="command-product-picker"><select value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">Selecione um produto</option>{products.map((product) => <option key={product.id} value={product.id} disabled={product.stockQuantity < 1}>{product.name} · {money(product.priceCents)}</option>)}</select><button type="button" className="button" disabled={!productId || pending} onClick={() => run(async () => { await addComandaProductAction(form({ comandaId: comanda.id, productId })); setProductId(""); setPickerOpen(false); })}>Adicionar</button></div> : null}
    <footer><div><span>Total atual</span><strong>{money(totalCents)}</strong></div><div className="command-card-actions"><button type="button" className="button" onClick={() => setPickerOpen((value) => !value)}>Inserir produtos</button><button type="button" className="button button-success" disabled={pending || !comanda.items.length} onClick={() => run(() => finishComandaAction(form({ comandaId: comanda.id })))}>Finalizar comanda</button></div></footer>{message ? <p className="command-card-message">{message}</p> : null}
  </article>;
}
