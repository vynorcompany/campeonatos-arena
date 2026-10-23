"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { MoneyInput } from "@/components/forms/money-input";
import { equalComandaShares, type ComandaShare } from "@/lib/comandas/split";

export type SplitPerson = { id: string; name: string; openComanda?: string };
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
export function SplitCommandDialog({ open, onClose, totalCents, ownerId, ownerName, people, shares, onApply }: { open: boolean; onClose: () => void; totalCents: number; ownerId: string | null; ownerName: string; people: SplitPerson[]; shares: ComandaShare[]; onApply: (parts: ComandaShare[]) => void }) {
  const [draft, setDraft] = useState<ComandaShare[]>([]);
  const [query, setQuery] = useState("");
  const close = useCallback(onClose, [onClose]);
  useEffect(() => { if (open) { setDraft(shares.length ? shares : [{ playerId: ownerId, amountCents: totalCents }]); setQuery(""); } }, [open, shares, ownerId, totalCents]);
  const sum = draft.reduce((total, share) => total + share.amountCents, 0);
  const equalize = (parts: ComandaShare[]) => { const values = equalComandaShares(totalCents, parts.length); setDraft(parts.map((part, index) => ({ ...part, amountCents: values[index] }))); };
  const options = people.filter(person => !draft.some(part => part.playerId === person.id) && person.name.toLocaleLowerCase("pt-BR").includes(query.trim().toLocaleLowerCase("pt-BR"))).sort((a, b) => Number(Boolean(b.openComanda)) - Number(Boolean(a.openComanda))).slice(0, 8);
  return <Modal title="Dividir comanda" open={open} onClose={close}>
    <p className="tw:m-0 tw:text-xs tw:leading-5 tw:text-[var(--muted)]">Selecione as outras pessoas e informe o valor de cada parte. As partes em aberto serão registradas no Contas a Receber de cada pessoa. Pagamentos abatem primeiro a parte do titular; saldo do cliente só abate a parte dele.</p>
    <label className={ui.field}>Adicionar pessoa<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar cliente ou titular de comanda aberta" /></label>
    <div className="tw:grid tw:max-h-40 tw:overflow-y-auto tw:rounded-lg tw:border tw:border-[var(--line)]">{options.map(person => <button key={person.id} type="button" disabled={draft.length >= 20} onClick={() => { equalize([...draft, { playerId: person.id, amountCents: 0 }]); setQuery(""); }} className="tw:flex tw:cursor-pointer tw:items-center tw:justify-between tw:gap-2 tw:border-0 tw:border-b tw:border-[var(--line)] tw:bg-white tw:px-3 tw:py-2 tw:text-left tw:last:border-b-0 tw:hover:bg-slate-50"><span className="tw:min-w-0 tw:text-xs tw:font-medium">{person.name}<small className="tw:block tw:text-[11px] tw:font-normal tw:text-[var(--muted)]">{person.openComanda ? `Comanda aberta · ${person.openComanda}` : "Cliente cadastrado"}</small></span><span className="tw:text-xs tw:text-[var(--primary)]">Adicionar</span></button>)}{!options.length ? <p className={ui.empty}>Nenhuma outra pessoa encontrada.</p> : null}</div>
    <div className={ui.list}>{draft.map((part, index) => <div key={part.playerId ?? "owner"} className={`${ui.row} tw:grid-cols-[minmax(0,1fr)_120px_32px] tw:viewport-440:grid-cols-[minmax(0,1fr)_100px_28px]`}><span className="tw:text-xs tw:font-medium">{index === 0 ? ownerName : people.find(person => person.id === part.playerId)?.name}<small>{index === 0 ? "Titular" : "Outra pessoa"}</small></span><label className={ui.field}><span className="tw:sr-only">Valor de {index === 0 ? ownerName : people.find(person => person.id === part.playerId)?.name}</span><MoneyInput valueCents={part.amountCents} onValueCentsChange={amountCents => setDraft(current => current.map((item, position) => position === index ? { ...item, amountCents } : item))} /></label>{index ? <button type="button" aria-label={`Remover ${people.find(person => person.id === part.playerId)?.name}`} className="tw:size-7 tw:rounded tw:border tw:border-[var(--line)] tw:bg-white tw:text-[var(--muted)]" onClick={() => equalize(draft.filter((_, position) => position !== index))}>×</button> : <span />}</div>)}</div>
    <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2"><button type="button" className={ui.secondary} onClick={() => equalize(draft)}>Dividir igualmente</button><span className="tw:text-xs tw:tabular-nums">Dividido: {money(sum)} · Total: {money(totalCents)}</span></div>
    {sum !== totalCents ? <p role="alert" className="tw:m-0 tw:text-xs tw:text-red-700">Ajuste os valores: a soma das partes deve ser igual ao total.</p> : null}
    <footer className="tw:flex tw:flex-wrap tw:justify-end tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-3"><button type="button" className={ui.secondary} onClick={close}>Cancelar</button><button type="button" className={ui.primary} disabled={draft.length < 2 || sum !== totalCents || draft.some(part => part.amountCents <= 0)} onClick={() => { onApply(draft); close(); }}>Aplicar divisão</button></footer>
  </Modal>;
}
