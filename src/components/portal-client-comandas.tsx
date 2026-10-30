"use client";
import { CompositionFields } from "@/components/products/composition-fields";
import { compositionCartKey, compositionComplete, compositionChoiceLabel, type IngredientChoices, type ProductComposition } from "@/lib/products/composition-types";
import { CloseRequestButton } from "@/components/comandas/close-request-button";
import type { BookingService } from "@/lib/comandas/booking-service";

import { useEffect, useMemo, useState, useTransition } from "react";
import { requestPortalComandaOpenAction, requestPortalComandaOrderAction } from "@/lib/actions/comanda";

type Data = { disabled?: boolean; comandas: { id: string; code: string; closeRequestedAt?: string | null; openedAt: string; openedBy: string; bookingServices: BookingService[]; totalCents: number; items: { id: string; name: string; quantity: number; totalCents: number }[] }[]; categories: { id: string; name: string }[]; products: { composition?: ProductComposition; id: string; name: string; priceCents: number; stockQuantity: number; category: string }[] } | null;
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);


function ReservationServices({ services }: { services: BookingService[] }) {
  if (!services.length) return null;
  return <section className="tw:mt-4 tw:border-t tw:border-[var(--portal-line,#d8e5e9)] tw:pt-3" aria-label="Serviços das reservas">
    <h3 className="tw:m-0 tw:mb-2 tw:text-sm tw:font-semibold">Serviços das reservas</h3>
    <ul className="tw:m-0 tw:grid tw:list-none tw:gap-3 tw:p-0">{services.map(service => <li key={service.id} className="tw:flex tw:items-start tw:justify-between tw:gap-3 tw:text-sm">
      <div className="tw:min-w-0"><strong className="tw:block">{service.name}</strong><small className="tw:block tw:text-[var(--portal-muted,#606874)]">{service.date} · {service.state}</small></div>
      <strong className="tw:shrink-0">{money(service.amountCents)}</strong>
    </li>)}</ul>
  </section>;
}

const field = "tw:min-h-10 tw:w-full tw:min-w-0 tw:rounded-md tw:border tw:border-[var(--portal-line,#d8e5e9)] tw:bg-[var(--portal-surface,white)] tw:px-3 tw:text-sm tw:text-[var(--portal-ink,#133047)]";
const primary = "tw:min-h-9 tw:cursor-pointer tw:rounded-md tw:border-0 tw:bg-[#174983] tw:px-3 tw:py-1.5 tw:text-xs tw:font-normal tw:text-white! tw:disabled:cursor-not-allowed tw:disabled:opacity-50";
const quantityButton = "tw:grid tw:size-9 tw:shrink-0 tw:cursor-pointer tw:place-items-center tw:rounded-md tw:border tw:border-[var(--portal-line,#d8e5e9)] tw:bg-[var(--portal-surface,white)] tw:text-base tw:text-[var(--portal-ink,#133047)] tw:disabled:opacity-40";

export function PortalClientComandas({ data: initialData, arenaSlug }: { data: Data; arenaSlug: string }) {
  const [data, setData] = useState(initialData);
  useEffect(() => setData(initialData), [initialData]);
  useEffect(() => {
    if (initialData?.disabled) return;
    let active = true, loading = false, authenticated = true, etag: string | null = null;
    const abort = new AbortController();
    const refresh = async () => {
      if (!active || loading || !authenticated || !navigator.onLine || document.visibilityState === "hidden") return;
      loading = true;
      try {
        const response = await fetch(`/api/portal/comandas?arenaSlug=${encodeURIComponent(arenaSlug)}`, { cache: "no-store", signal: abort.signal, headers: etag ? { "If-None-Match": etag } : {} });
        if (response.status === 401) { authenticated = false; return; }
        if (response.status === 304 || !response.ok || !active) return;
        const snapshot = await response.json() as Pick<NonNullable<Data>, "disabled" | "comandas">;
        etag = response.headers.get("ETag");
        if (active) setData(current => ({ categories: [], products: [], ...current, ...snapshot }));
      } catch { /* Keep the current view and drafts during temporary network failures. */ }
      finally { loading = false; }
    };
    void refresh(); const timer = window.setInterval(refresh, 10_000);
    document.addEventListener("visibilitychange", refresh); window.addEventListener("online", refresh);
    return () => { active = false; abort.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("online", refresh); };
  }, [arenaSlug, initialData?.disabled]);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [messageFor, setMessageFor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [productChoices,setProductChoices] = useState<Record<string,IngredientChoices>>({});
  const [draftLines,setDraftLines] = useState<Record<string,{productId:string;choices:IngredientChoices}>>({});
  const [drafts, setDrafts] = useState<Record<string, { orderId: string; quantities: Record<string, number> }>>({});
  const categories = useMemo(() => ["Todos", ...Array.from(new Set(data?.products.map(product => product.category) ?? []))], [data]);
  const products = useMemo(() => (data?.products ?? []).filter(product => (category === "Todos" || product.category === category) && (!search.trim() || product.name.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR")))), [category, data, search]);
  const changeQuantity = (comandaId: string, productId: string, delta: number, selectedChoices?:IngredientChoices) => {
    const product = data?.products.find(row => row.id === productId);
    if (!product || pending) return;
    const choices=selectedChoices ?? productChoices[`${comandaId}:${productId}`] ?? {};
    if (delta > 0 && !compositionComplete(product.composition,choices)) {setMessageFor(comandaId);setMessage("Escolha as opções do produto antes de adicionar.");return;}
    const key=compositionCartKey(productId,choices);setDraftLines(current=>({...current,[key]:{productId,choices:{...choices}}}));
    setMessage("");
    setDrafts(current => {
      const quantities = { ...current[comandaId]?.quantities };
      quantities[key] = Math.max(0, Math.min(product.stockQuantity, 999, (quantities[key] ?? 0) + delta));
      if (!quantities[key]) delete quantities[key];
      return { ...current, [comandaId]: { orderId: crypto.randomUUID(), quantities } };
    });
  };
  const sendOrder = (comandaId: string) => {
    const draft = drafts[comandaId];
    if (pending || !draft || !Object.keys(draft.quantities).length) return;
    const form = new FormData(); form.set("arenaSlug", arenaSlug); form.set("comandaId", comandaId); form.set("orderId", draft.orderId);
    form.set("items", JSON.stringify(Object.entries(draft.quantities).map(([key, quantity]) => ({ ...draftLines[key], quantity }))));
    setMessage(""); setMessageFor(comandaId);
    startTransition(async () => {
      try {
        await requestPortalComandaOrderAction(form);
        setDrafts(current => { const next = { ...current }; delete next[comandaId]; return next; });
        setProductChoices(current=>Object.fromEntries(Object.entries(current).filter(([key])=>!key.startsWith(`${comandaId}:`))));
        setMessage("Pedido enviado à equipe. Aguarde a confirmação dos itens.");
      } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível enviar o pedido."); }
    });
  };
  if (data?.disabled) return <p className="tw:p-3 tw:text-sm">A arena desativou a consulta de consumos no Portal. Procure a recepção.</p>;
  if (!data) return <p role="status" className="tw:p-3 tw:text-sm">Não foi possível carregar suas comandas agora.</p>;
  if (!data.comandas.length) return <div className="tw:grid tw:justify-items-start tw:gap-3 tw:p-3"><button type="button" disabled={pending} className={primary} onClick={() => {
    const form = new FormData(); form.set("arenaSlug", arenaSlug); setMessage(""); setMessageFor(null);
    startTransition(async () => { try { await requestPortalComandaOpenAction(form); setMessage("Solicitação enviada à equipe. Aguarde a abertura da sua comanda."); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível enviar a solicitação."); } });
  }}>{pending ? "Enviando…" : "Solicitar abertura de comanda"}</button>{message && !messageFor ? <p role="status" className="tw:m-0 tw:text-sm">{message}</p> : null}</div>;
  return <section aria-label="Minhas comandas" className="tw:[&_strong]:font-medium tw:[&_b]:font-medium tw:grid tw:min-w-0 tw:gap-4 tw:p-3">
    {data.comandas.map(comanda => {
      const draft = drafts[comanda.id];
      const selected = Object.entries(draft?.quantities ?? {}).map(([key, quantity]) => ({ key, choices:draftLines[key]?.choices ?? {}, product: data.products.find(product => product.id === draftLines[key]?.productId), quantity })).filter(row => row.product);
      const count = selected.reduce((sum, row) => sum + row.quantity, 0);
      return <article key={comanda.id} className="portal-comanda-order tw:min-w-0 tw:rounded-lg tw:border tw:border-[var(--portal-line,#d8e5e9)] tw:bg-[var(--portal-surface,white)] tw:p-4 tw:text-[var(--portal-ink,#133047)]">
        <header className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-3"><div className="tw:grid tw:gap-1"><strong>Comanda {comanda.code}</strong><small className="tw:text-xs tw:text-[var(--portal-muted,#606874)]">{comanda.openedAt} · Aberta por {comanda.openedBy}</small></div><strong className="tw:text-lg">{money(comanda.totalCents)}</strong></header>
        <div className="tw:my-3 tw:border-y tw:border-[var(--portal-line,#d8e5e9)] tw:py-3">{comanda.items.length ? <ul className="tw:m-0 tw:grid tw:max-h-48 tw:list-none tw:gap-2 tw:overflow-y-auto tw:p-0">{comanda.items.map(item => <li key={item.id} className="tw:flex tw:justify-between tw:gap-3 tw:text-sm"><span>{item.quantity}× {item.name}</span><strong className="tw:shrink-0">{money(item.totalCents)}</strong></li>)}</ul> : <p className="tw:m-0 tw:text-sm tw:text-[var(--portal-muted,#606874)]">Nenhum item lançado.</p>}<ReservationServices services={comanda.bookingServices} /></div>
        <CloseRequestButton arenaSlug={arenaSlug} comandaId={comanda.id} requested={Boolean(comanda.closeRequestedAt)} />
        <div className="tw:mt-4 tw:grid tw:min-w-0 tw:items-start tw:gap-3 tw:lg:grid-cols-[minmax(0,1fr)_280px]">
          <section aria-label="Resumo de comanda" className="tw:order-first tw:grid tw:min-w-0 tw:gap-3 tw:rounded-md tw:border tw:border-[var(--portal-line,#d8e5e9)] tw:bg-[var(--portal-surface,white)] tw:p-3 tw:sticky tw:top-2 tw:z-20 tw:lg:order-last tw:lg:top-3">
            <h3 className="tw:m-0 tw:text-sm tw:font-medium">Resumo de comanda</h3>
            {selected.length ? <ul className="tw:m-0 tw:grid tw:max-h-40 tw:list-none tw:gap-2 tw:overflow-y-auto tw:p-0">{selected.map(row => <li key={row.key} className="tw:flex tw:min-w-0 tw:items-start tw:justify-between tw:gap-2 tw:text-xs"><span className="tw:min-w-0 tw:break-words">{row.quantity}× {row.product!.name}{compositionChoiceLabel(row.product!.composition,row.choices) ? <small className="tw:block tw:mt-1 tw:text-[var(--portal-muted,#606874)]">{compositionChoiceLabel(row.product!.composition,row.choices)}</small> : null}</span><button type="button" disabled={pending} aria-label={`Remover ${row.product!.name} do resumo`} className="tw:size-6 tw:shrink-0 tw:cursor-pointer tw:rounded tw:border-0 tw:bg-transparent tw:px-1 tw:text-[var(--portal-muted,#606874)]" onClick={() => changeQuantity(comanda.id, row.product!.id, -row.quantity,row.choices)}>×</button></li>)}</ul> : <p className="tw:m-0 tw:text-xs tw:text-[var(--portal-muted,#606874)]">Nenhum item selecionado.</p>}
            <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:border-t tw:border-[var(--portal-line,#d8e5e9)] tw:pt-3"><span className="tw:text-xs">{count} {count === 1 ? "item" : "itens"}</span><span className="tw:text-sm tw:tabular-nums">Estimativa {money(selected.reduce((sum, row) => sum + row.product!.priceCents * row.quantity, 0))}</span></div>
            <button type="button" disabled={pending || !selected.length} className={primary} onClick={() => sendOrder(comanda.id)}>{pending ? "Enviando…" : "Enviar pedido"}</button>
            {message && messageFor === comanda.id ? <p role="status" className="tw:m-0 tw:text-xs tw:leading-relaxed">{message}</p> : null}
          </section>
        <div className="tw:grid tw:min-w-0 tw:content-start tw:gap-3" aria-label={`Produtos para comanda ${comanda.code}`}>
          <div className="tw:grid tw:min-w-0 tw:gap-2 tw:sm:grid-cols-[minmax(0,1fr)_200px]"><input className={field} value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar produto" aria-label="Buscar produto" /><select className={field} value={category} onChange={event => setCategory(event.target.value)} aria-label="Filtrar categoria">{categories.map(entry => <option key={entry}>{entry}</option>)}</select></div>
          <div className="tw:grid tw:max-h-[min(55dvh,480px)] tw:min-w-0 tw:content-start tw:gap-2 tw:overflow-y-auto tw:overscroll-contain tw:pr-1" role="region" aria-label="Catálogo de produtos">{products.map(product => {
            const quantity = draft?.quantities[compositionCartKey(product.id,productChoices[`${comanda.id}:${product.id}`])] ?? 0;
            return <div key={product.id} className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:rounded-md tw:border tw:border-[var(--portal-line,#d8e5e9)] tw:p-3"><div className={`tw:min-w-0 tw:flex-1 tw:basis-40 ${product.composition?.groups.length ? "tw:viewport-620:basis-full!" : ""}`}><strong className="tw:block tw:break-words tw:text-sm">{product.name}</strong><small className="tw:text-xs tw:text-[var(--portal-muted,#606874)]">{product.category} · {money(product.priceCents)}</small><CompositionFields productName={product.name} composition={product.composition} value={productChoices[`${comanda.id}:${product.id}`] ?? {}} onChange={choices=>setProductChoices(current=>({...current,[`${comanda.id}:${product.id}`]:choices}))} disabled={pending} /></div><div className="tw:flex tw:items-center tw:gap-2"><button type="button" className={quantityButton} disabled={pending || !quantity} aria-label={`Remover ${product.name} do pedido`} onClick={() => changeQuantity(comanda.id, product.id, -1)}>−</button><output aria-label={`Quantidade de ${product.name}`} className="tw:min-w-6 tw:text-center tw:text-sm tw:tabular-nums">{quantity}</output><button type="button" className={quantityButton} disabled={pending || quantity >= product.stockQuantity || quantity >= 999} aria-label={`Adicionar ${product.name} ao pedido`} onClick={() => changeQuantity(comanda.id, product.id, 1)}>+</button></div></div>;
          })}</div>
          {!products.length ? <p className="tw:m-0 tw:text-sm">Nenhum produto encontrado.</p> : null}

        </div>
        </div>
      </article>;
    })}
  </section>;
}
