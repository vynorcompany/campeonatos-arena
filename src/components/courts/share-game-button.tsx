"use client";
import { useState, useTransition } from "react";
import { shareCheckinGameAction } from "@/lib/actions/checkin";

export function ShareGameButton({ arenaSlug, occurrenceId }: { arenaSlug: string; occurrenceId: string }) {
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const share = () => startTransition(async () => {
    setNotice(""); setManualUrl("");
    try {
      const form = new FormData(); form.set("arenaSlug", arenaSlug); form.set("occurrenceId", occurrenceId);
      const result = await shareCheckinGameAction(form);
      if (!("path" in result) || !result.path) { setNotice(result.error ?? "Não foi possível obter o link do jogo."); return; }
      const url = new URL(result.path, window.location.origin).href;
      if (navigator.share) {
        try { await navigator.share({ title: "Check-in do nosso jogo", text: "Confira a quadra e o horário e confirme sua presença.", url }); return; }
        catch (error) { if (error instanceof Error && error.name === "AbortError") return; }
      }
      try { await navigator.clipboard.writeText(url); setNotice("Link do jogo copiado."); }
      catch { setManualUrl(url); setNotice("Copie o link do jogo abaixo."); }
    } catch { setNotice("Não foi possível compartilhar agora. Tente novamente."); }
  });
  return <div className="tw:grid tw:min-w-0 tw:gap-2"><button type="button" disabled={pending} onClick={share} className="tw:flex tw:w-fit tw:items-center tw:gap-2 tw:rounded-md tw:border tw:border-[#c5d8ef] tw:bg-white tw:px-3 tw:py-2 tw:text-xs tw:font-normal tw:text-[#174983] tw:disabled:opacity-50 tw:dark:border-[#3b4e66] tw:dark:bg-[#15263c] tw:dark:text-[#9bc5ff]"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="tw:size-4"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></svg>{pending ? "Preparando link…" : "Compartilhar jogo"}</button>{notice ? <p role="status" className="tw:m-0 tw:text-xs tw:leading-relaxed">{notice}</p> : null}{manualUrl ? <label className="tw:grid tw:min-w-0 tw:gap-1 tw:text-xs">Link do jogo<input readOnly value={manualUrl} onFocus={event => event.currentTarget.select()} className="tw:w-full tw:min-w-0 tw:rounded-md tw:border tw:border-[#c5d8ef] tw:p-2 tw:text-xs"/></label> : null}</div>;
}
