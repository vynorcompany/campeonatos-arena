"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestPortalComandaProductAction } from "@/lib/actions/comanda";

type Data = { comandas: { id: string; code: string; openedAt: string; totalCents: number; items: { id: string; name: string; quantity: number; totalCents: number }[] }[]; products: { id: string; name: string; priceCents: number; stockQuantity: number; category: string }[] } | null;
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);

export function PortalClientComandas({ data, arenaSlug }: { data: Data; arenaSlug: string }) {
  const [pending, startTransition] = useTransition(); const [message, setMessage] = useState(""); const router = useRouter();
  const order = (comandaId: string, productId: string) => { const form = new FormData(); form.set("arenaSlug", arenaSlug); form.set("comandaId", comandaId); form.set("productId", productId); form.set("quantity", "1"); setMessage(""); startTransition(async () => { try { await requestPortalComandaProductAction(form); setMessage("Pedido adicionado à sua comanda."); router.refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível enviar o pedido."); } }); };
  if (!data) return <section className="athlete-portal-content-panel"><h2>Comandas indisponíveis</h2><p className="muted">Não foi possível carregar suas comandas agora.</p></section>;
  return <section className="athlete-portal-content-panel portal-comandas"><header><span>CONSUMO NA ARENA</span><h2>Minhas comandas</h2><p>Acompanhe os itens abertos hoje e peça direto para o bar.</p></header>{message ? <p className="form-feedback">{message}</p> : null}{data.comandas.length ? <div className="portal-comanda-list">{data.comandas.map((comanda) => <article key={comanda.id}><header><div><strong>Comanda aberta</strong><small>{comanda.code} · aberta às {comanda.openedAt}</small></div><b>{money(comanda.totalCents)}</b></header>{comanda.items.length ? <ul>{comanda.items.map((item) => <li key={item.id}><span>{item.quantity}× {item.name}</span><strong>{money(item.totalCents)}</strong></li>)}</ul> : <p className="muted">Nenhum item lançado ainda.</p>}<div className="portal-bar-products"><h3>Pedir ao bar</h3>{data.products.map((product) => <button type="button" key={product.id} disabled={pending} onClick={() => order(comanda.id, product.id)}><span><strong>{product.name}</strong><small>{product.category}</small></span><b>{money(product.priceCents)}</b><i>+</i></button>)}</div></article>)}</div> : <div className="portal-comanda-empty"><strong>Você não tem comanda aberta hoje.</strong><p>Peça à equipe da arena para abrir sua comanda. Assim que ela estiver aberta, os pedidos aparecem aqui em tempo real.</p></div>}</section>;
}
