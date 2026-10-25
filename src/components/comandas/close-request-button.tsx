"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestPortalComandaCloseAction } from "@/lib/actions/comanda";
export function CloseRequestButton({ arenaSlug, comandaId, requested }: { arenaSlug: string; comandaId: string; requested: boolean }) {
  const [pending, startTransition] = useTransition(); const [error, setError] = useState(""); const [sent, setSent] = useState(false); const router = useRouter();
  return <div className="tw:mt-4 tw:grid tw:gap-2 tw:border-t tw:border-[var(--portal-line)] tw:pt-3">
    {requested || sent ? <p role="status" className="tw:m-0 tw:text-xs tw:font-semibold tw:text-[#8a4b08] tw:dark:text-[#ffe1a3]">✓ Fechamento solicitado. A equipe vai conferir sua conta.</p> : <><button type="button" disabled={pending} className="tw:min-h-11 tw:cursor-pointer tw:rounded-xl tw:border tw:border-[#a7ceba] tw:bg-[#edf7ef] tw:px-4 tw:py-3 tw:text-sm tw:font-semibold tw:text-[#174c35] tw:disabled:opacity-60 tw:dark:border-[#477a5e] tw:dark:bg-[#234c38] tw:dark:text-[#daf2dd]" onClick={() => startTransition(async () => { setError(""); const data = new FormData(); data.set("arenaSlug", arenaSlug); data.set("comandaId", comandaId); try { await requestPortalComandaCloseAction(data); setSent(true); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível solicitar o fechamento."); } })}>{pending ? "Enviando..." : "Solicitar fechamento"}</button><small className="tw:text-xs tw:leading-relaxed tw:text-[var(--portal-muted)]">A equipe confere os itens e finaliza o pagamento no balcão.</small></>}
    {error ? <p role="alert" className="tw:m-0 tw:text-xs tw:text-red-700 tw:dark:text-red-300">{error}</p> : null}
  </div>;
}
