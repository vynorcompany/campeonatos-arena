"use client";
import { useState, useTransition } from "react";
import { requestPortalComandaCloseAction } from "@/lib/actions/comanda";
export function CloseRequestButton({ arenaSlug, comandaId, requested }: { arenaSlug: string; comandaId: string; requested: boolean }) {
  const [pending, startTransition] = useTransition(); const [error, setError] = useState(""); const [sent, setSent] = useState(false);
  return <div className="tw:mt-3 tw:grid tw:justify-items-start tw:gap-2 tw:border-t tw:border-[var(--portal-line)] tw:pt-3">
    {requested || sent ? <p role="status" className="tw:m-0 tw:text-xs tw:font-semibold tw:text-[#8a4b08] tw:dark:text-[#ffe1a3]">✓ Fechamento solicitado. A equipe vai conferir sua conta.</p> : <><button type="button" disabled={pending} className="tw:min-h-9 tw:cursor-pointer tw:rounded-md tw:border tw:border-[#174983] tw:bg-[#174983] tw:px-3 tw:py-1.5 tw:text-xs tw:font-normal tw:text-white tw:disabled:opacity-60 tw:hover:bg-[#1e5ea8] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983]" onClick={() => startTransition(async () => { setError(""); const data = new FormData(); data.set("arenaSlug", arenaSlug); data.set("comandaId", comandaId); try { await requestPortalComandaCloseAction(data); setSent(true); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível solicitar o fechamento."); } })}>{pending ? "Enviando..." : "Solicitar fechamento"}</button><small className="tw:text-xs tw:leading-relaxed tw:text-[var(--portal-muted)]">A equipe confere os itens e finaliza o pagamento no balcão.</small></>}
    {error ? <p role="alert" className="tw:m-0 tw:text-xs tw:text-red-700 tw:dark:text-red-300">{error}</p> : null}
  </div>;
}
